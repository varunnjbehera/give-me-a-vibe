import { NextResponse } from "next/server";
import { isVibe } from "@/lib/vibes";
import { IdeaSchema } from "@/lib/schema";
import { isBuildTarget } from "@/lib/targets";
import {
  buildBuilderSystemPrompt,
  buildBuilderUserPrompt,
  getBuildPromptResponseSchema,
} from "@/lib/buildPrompt";
import { parseBuildPromptLoose } from "@/lib/buildSchema";
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

function error(
  status: number,
  code: ErrorCode,
  detail?: string,
  headers?: Record<string, string>
) {
  return NextResponse.json({ error: code, detail }, { status, headers });
}

/**
 * POST /api/build-prompt { idea, vibe, target? }
 *
 * Second, opt-in Gemini call. Accepts the STRUCTURED output of the first
 * generation (never raw HTML, never free user text), revalidates it against
 * the Idea schema, and returns a structured, copyable coding-agent prompt.
 * Shares the same per-IP throttle, key handling, and error taxonomy as
 * /api/vibe. Never called automatically — only on explicit user action.
 */
export async function POST(req: Request) {
  // Same throttle budget as /api/vibe: best-effort, before paid quota.
  const ip = getClientIp(req);
  const limit = checkRateLimit(ip);
  if (!limit.allowed) {
    return error(429, "RATE_LIMITED", undefined, {
      "Retry-After": String(limit.retryAfter),
    });
  }

  let rawIdea: unknown;
  let rawVibe: unknown;
  let rawTarget: unknown;
  try {
    const body = await req.json();
    rawIdea = body?.idea;
    rawVibe = body?.vibe;
    rawTarget = body?.target;
  } catch {
    return error(400, "BAD_REQUEST", "Expected JSON body { idea, vibe, target }.");
  }

  if (!isVibe(rawVibe))
    return error(
      400,
      "BAD_REQUEST",
      "Vibe must be useful, weird, absurd, or satirical."
    );

  // Target is optional for the caller; default to generic so the feature
  // works without requiring a choice.
  const target =
    rawTarget === undefined || rawTarget === null ? "generic" : rawTarget;
  if (!isBuildTarget(target))
    return error(
      400,
      "BAD_REQUEST",
      "Target must be generic, open-code, claude-code, codex, or cursor."
    );

  // Revalidate the structured idea — never trust client-provided shapes.
  const ideaParsed = IdeaSchema.safeParse(rawIdea);
  if (!ideaParsed.success)
    return error(400, "BAD_REQUEST", "Idea must be a valid generated result.");
  const idea = ideaParsed.data;

  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";
  if (!apiKey) {
    console.error("[build-prompt] missing GEMINI_API_KEY");
    return error(500, "MISSING_API_KEY");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25000);

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      model
    )}:generateContent?key=${encodeURIComponent(apiKey)}`;

    const upstream = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: buildBuilderSystemPrompt(target) }],
        },
        contents: [
          {
            role: "user",
            parts: [{ text: buildBuilderUserPrompt(idea, rawVibe, target) }],
          },
        ],
        generationConfig: {
          temperature: 0.7,
          topP: 0.9,
          maxOutputTokens: 3500,
          responseMimeType: "application/json",
          responseSchema: getBuildPromptResponseSchema(),
        },
      }),
    });

    if (upstream.status === 429)
      return error(429, "RATE_LIMITED", undefined, { "Retry-After": "30" });
    if (!upstream.ok) {
      const text = await upstream.text().catch(() => "");
      console.error(
        "[build-prompt] upstream error",
        upstream.status,
        text.slice(0, 500)
      );
      return error(502, "UPSTREAM_ERROR");
    }

    const data = await upstream.json();
    const textPart: string | undefined =
      data?.candidates?.[0]?.content?.parts
        ?.map((p: { text?: string }) => p?.text ?? "")
        .join("") ?? undefined;

    if (!textPart) {
      console.error("[build-prompt] empty upstream response");
      return error(502, "BAD_MODEL_OUTPUT");
    }

    let json: unknown;
    try {
      const cleaned = textPart
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```$/, "")
        .trim();
      json = JSON.parse(cleaned);
    } catch (e) {
      console.error(
        "[build-prompt] JSON parse failed",
        String(e).slice(0, 300)
      );
      return error(502, "BAD_MODEL_OUTPUT");
    }

    // The model must echo the requested target; enforce it server-side so
    // the frontend can rely on target identity regardless of model output.
    if (
      typeof json === "object" &&
      json !== null &&
      (json as Record<string, unknown>).target !== target
    ) {
      (json as Record<string, unknown>).target = target;
    }

    const buildPrompt = parseBuildPromptLoose(json);
    if (!buildPrompt) {
      console.error("[build-prompt] schema validation failed");
      return error(502, "BAD_MODEL_OUTPUT");
    }
    // Authoritative pinning: requested target + source vibe always win.
    buildPrompt.target = target;

    return NextResponse.json({ vibe: rawVibe, target, buildPrompt });
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError")
      return error(504, "TIMEOUT");
    if (e instanceof Error && e.name === "AbortError")
      return error(504, "TIMEOUT");
    console.error("[build-prompt] handler failed", e);
    return error(502, "UPSTREAM_ERROR");
  } finally {
    clearTimeout(timeout);
  }
}
