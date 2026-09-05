import { NextResponse } from "next/server";
import { isVibe } from "@/lib/vibes";
import { buildSystemPrompt, buildUserPrompt, getResponseSchema } from "@/lib/prompt";
import { parseIdeaLoose } from "@/lib/schema";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const maxDuration = 30;

type ErrorCode =
  | "BAD_REQUEST"
  | "MISSING_API_KEY"
  | "UPSTREAM_ERROR"
  | "RATE_LIMITED"
  | "TIMEOUT"
  | "BAD_MODEL_OUTPUT";

function error(status: number, code: ErrorCode, detail?: string, headers?: Record<string, string>) {
  return NextResponse.json({ error: code, detail }, { status, headers });
}

export async function POST(req: Request) {
  // Best-effort throttle FIRST, before touching paid quota or doing work.
  const ip = getClientIp(req);
  const limit = checkRateLimit(ip);
  if (!limit.allowed) {
    return error(429, "RATE_LIMITED", undefined, { "Retry-After": String(limit.retryAfter) });
  }

  let vibe: unknown;
  let recentTitles: unknown;
  try {
    const body = await req.json();
    vibe = body?.vibe;
    recentTitles = body?.recentTitles;
  } catch {
    return error(400, "BAD_REQUEST", "Expected JSON body { vibe }.");
  }
  if (!isVibe(vibe)) return error(400, "BAD_REQUEST", "Vibe must be useful, weird, absurd, or satirical.");

  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";
  if (!apiKey) {
    console.error("[vibe] missing GEMINI_API_KEY");
    return error(500, "MISSING_API_KEY");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25000);

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      model
    )}:generateContent?key=${encodeURIComponent(apiKey)}`;

    // Per-request novelty: unique seed + rotating variation lens + slight
    // temperature jitter. No idea list, no templates — just entropy the model
    // can feel, plus an optional short-lived session avoid-list from the client.
    const seed =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID().slice(0, 8)
        : `${Date.now().toString(36)}-${Math.floor(Math.random() * 0xffff).toString(16)}`;
    const avoidTitles = Array.isArray(recentTitles)
      ? recentTitles
          .filter((t): t is string => typeof t === "string")
          .map((t) => t.slice(0, 120))
          .filter(Boolean)
          .slice(0, 3)
      : [];
    const temperature = 1.0 + Math.random() * 0.2;

    const upstream = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        system_instruction: { parts: [{ text: buildSystemPrompt(vibe) }] },
        contents: [{ role: "user", parts: [{ text: buildUserPrompt(vibe, { seed, avoidTitles }) }] }],
        generationConfig: {
          temperature,
          topP: 0.95,
          maxOutputTokens: 2200,
          responseMimeType: "application/json",
          responseSchema: getResponseSchema(),
        },
      }),
    });

    if (upstream.status === 429)
      return error(429, "RATE_LIMITED", undefined, { "Retry-After": "30" });
    if (!upstream.ok) {
      const text = await upstream.text().catch(() => "");
      console.error("[vibe] upstream error", upstream.status, text.slice(0, 500));
      return error(502, "UPSTREAM_ERROR");
    }

    const data = await upstream.json();
    const textPart: string | undefined =
      data?.candidates?.[0]?.content?.parts
        ?.map((p: { text?: string }) => p?.text ?? "")
        .join("") ?? undefined;

    if (!textPart) {
      console.error("[vibe] empty upstream response");
      return error(502, "BAD_MODEL_OUTPUT");
    }

    let json: unknown;
    try {
      // Model is instructed to return raw JSON; strip fences defensively.
      const cleaned = textPart.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
      json = JSON.parse(cleaned);
    } catch (e) {
      console.error("[vibe] JSON parse failed", String(e).slice(0, 300));
      return error(502, "BAD_MODEL_OUTPUT");
    }

    const idea = parseIdeaLoose(json);
    if (!idea) {
      console.error("[vibe] schema validation failed");
      return error(502, "BAD_MODEL_OUTPUT");
    }

    return NextResponse.json({ vibe, idea });
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") return error(504, "TIMEOUT");
    if (e instanceof Error && e.name === "AbortError") return error(504, "TIMEOUT");
    console.error("[vibe] handler failed", e);
    return error(502, "UPSTREAM_ERROR");
  } finally {
    clearTimeout(timeout);
  }
}
