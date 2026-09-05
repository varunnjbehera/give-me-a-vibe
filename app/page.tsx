"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import VibeSelector from "@/components/VibeSelector";
import GenerateButton from "@/components/GenerateButton";
import GenerationState from "@/components/GenerationState";
import IdeaView from "@/components/IdeaView";
import ShareActions from "@/components/ShareActions";
import ImageExportCard from "@/components/ImageExport";
import ErrorState from "@/components/ErrorState";
import BuildPromptPanel, { type BuildStatus } from "@/components/BuildPrompt";
import { VIBE_META, type Vibe } from "@/lib/vibes";
import type { Idea } from "@/lib/schema";
import type { BuildTarget } from "@/lib/targets";
import type { BuildPrompt as BuildPromptData } from "@/lib/buildSchema";
import { sourceKeyFor } from "@/lib/buildState";

/**
 * selectedVibe = what the user has picked for the NEXT generation.
 * ResultStatus["vibe"] = the vibe that GENERATED the current result (frozen).
 * build.sourceVibe / build.sourceKey / build.target = the identity of the
 * build-prompt request (frozen). All three layers stay separated: switching
 * the selectors post-result must not rewrite history, exports, or labels.
 * A new generation creates a new result and invalidates the old build prompt.
 */
type Status =
  | { name: "idle" }
  | { name: "generating" }
  | { name: "result"; idea: Idea; vibe: Vibe }
  | { name: "error"; code?: string; retryAfter?: number };

const MIN_SPIN_MS = 1100;

export default function Home() {
  const [selectedVibe, setSelectedVibe] = useState<Vibe>("absurd");
  const [status, setStatus] = useState<Status>({ name: "idle" });
  const [buildTarget, setBuildTarget] = useState<BuildTarget>("generic");
  const [build, setBuild] = useState<BuildStatus>({ name: "idle" });
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const exportRef = useRef<HTMLDivElement>(null);
  // Short-lived, in-memory anti-repetition signal only: last few titles from
  // THIS session, sent as an "avoid" hint. Never persisted, never displayed
  // as history, never stored remotely.
  const recentTitlesRef = useRef<string[]>([]);
  // Monotonic result identity for race protection: incremented on every new
  // generation start. Build-prompt responses carrying an older seq are stale
  // and must never attach to the newer result.
  const resultSeqRef = useRef(0);

  const generating = status.name === "generating";
  // Compact states (landing / loading / error) have short content: center the
  // group vertically so tall viewports don't pool empty space above the footer.
  // Result state keeps top alignment so long ideas read naturally while scrolling.
  const compact = status.name !== "result";

  const generate = useCallback(
    async (nextVibe: Vibe = selectedVibe) => {
      resultSeqRef.current += 1;
      setStatus({ name: "generating" });
      // New generation invalidates the old build prompt (identity changes).
      // The target preference itself is kept — only the artifact is cleared.
      setBuild({ name: "idle" });
      setExportError(null);
      const started = Date.now();
      try {
        const res = await fetch("/api/vibe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ vibe: nextVibe, recentTitles: recentTitlesRef.current }),
        });
        const data = await res.json().catch(() => null);
        const elapsed = Date.now() - started;
        if (elapsed < MIN_SPIN_MS) {
          await new Promise((r) => setTimeout(r, MIN_SPIN_MS - elapsed));
        }
        if (!res.ok || !data?.idea) {
          const code: string | undefined =
            typeof data?.error === "string" ? data.error : res.status === 429 ? "RATE_LIMITED" : undefined;
          const retryHeader = res.headers.get("Retry-After");
          const retryAfter = retryHeader ? Number.parseInt(retryHeader, 10) : undefined;
          throw { code, retryAfter: Number.isFinite(retryAfter) ? retryAfter : undefined };
        }
        const idea = data.idea as Idea;
        // Freeze the generating vibe into the result — downstream components
        // only ever see this pinned value, never the live selector.
        setStatus({ name: "result", idea, vibe: nextVibe });
        recentTitlesRef.current = [idea.title, ...recentTitlesRef.current].slice(0, 3);
      } catch (e) {
        const elapsed = Date.now() - started;
        if (elapsed < MIN_SPIN_MS) {
          await new Promise((r) => setTimeout(r, MIN_SPIN_MS - elapsed));
        }
        console.error("generate failed", e);
        const code =
          e && typeof e === "object" && "code" in e && typeof e.code === "string" ? e.code : undefined;
        const retryAfter =
          e && typeof e === "object" && "retryAfter" in e && typeof e.retryAfter === "number"
            ? e.retryAfter
            : undefined;
        setStatus({ name: "error", code, retryAfter });
      }
    },
    [selectedVibe]
  );

  /**
   * Opt-in second LLM call. Only runs on explicit user action, never
   * automatically. Preserves the idea + verdict on failure; carries the
   * source result identity so a stale response can never attach to a new idea.
   */
  const requestBuildPrompt = useCallback(async () => {
    if (status.name !== "result") return;
    const idea = status.idea;
    const sourceVibe = status.vibe;
    const target = buildTarget;
    const sourceKey = sourceKeyFor(idea, sourceVibe);
    const seq = resultSeqRef.current;
    setBuild({ name: "loading", target, sourceVibe, sourceKey });
    try {
      const res = await fetch("/api/build-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idea, vibe: sourceVibe, target }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.buildPrompt) {
        const code: string | undefined =
          typeof data?.error === "string"
            ? data.error
            : res.status === 429
              ? "RATE_LIMITED"
              : undefined;
        const retryHeader = res.headers.get("Retry-After");
        const retryAfter = retryHeader
          ? Number.parseInt(retryHeader, 10)
          : undefined;
        throw {
          code,
          retryAfter: Number.isFinite(retryAfter) ? retryAfter : undefined,
        };
      }
      // Discard stale responses: a newer generation started while we were
      // in flight (generate() bumps resultSeqRef and resets build to idle).
      if (resultSeqRef.current !== seq) return;
      const buildPrompt = data.buildPrompt as BuildPromptData;
      setBuild({
        name: "ready",
        target,
        sourceVibe,
        sourceKey,
        data: buildPrompt,
      });
    } catch (e) {
      // A newer generation already invalidated this request — stay idle.
      if (resultSeqRef.current !== seq) return;
      console.error("build prompt failed", e);
      const code =
        e && typeof e === "object" && "code" in e && typeof e.code === "string"
          ? e.code
          : undefined;
      const retryAfter =
        e && typeof e === "object" && "retryAfter" in e && typeof e.retryAfter === "number"
          ? e.retryAfter
          : undefined;
      setBuild({
        name: "error",
        target,
        sourceVibe,
        sourceKey,
        code,
        retryAfter,
      });
    }
  }, [status, buildTarget]);

  // G-01: on success, move attention to the result — scroll it into view and
  // park keyboard focus on the idea title. Respects reduced motion, avoids
  // double-scroll jank via preventScroll on focus, runs once per result.
  useEffect(() => {
    if (status.name !== "result") return;
    const el = document.getElementById("vibe-result-title");
    if (!el) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const raf = requestAnimationFrame(() => {
      try {
        el.scrollIntoView({
          behavior: reduced ? "auto" : "smooth",
          block: "start",
        });
      } catch {
        el.scrollIntoView();
      }
      // Focus without re-scrolling (we already scrolled deliberately).
      try {
        (el as HTMLElement).focus({ preventScroll: true });
      } catch {
        (el as HTMLElement).focus();
      }
    });
    return () => cancelAnimationFrame(raf);
  }, [status]);

  async function handleExportImage() {
    const idea = status.name === "result" ? status.idea : null;
    if (!idea || !exportRef.current) return;
    setExporting(true);
    setExportError(null);
    try {
      const { toPng } = await import("html-to-image");
      const dataUrl = await toPng(exportRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: "#0b0d13",
      });
      const a = document.createElement("a");
      const slug = idea.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 48) || "vibe";
      a.download = `give-me-a-vibe-${slug}.png`;
      a.href = dataUrl;
      a.click();
    } catch (e) {
      console.error("image export failed", e);
      setExportError("The image refused to cooperate.");
    } finally {
      setExporting(false);
    }
  }

  return (
    <div data-vibe={selectedVibe} className="flex min-h-full flex-1 flex-col">
      <div aria-hidden className="ambient">
        <span className="ambient-a" />
        <span className="ambient-b" />
        <span className="ambient-c" />
        <span className="ambient-grain" />
      </div>

      <header className="mx-auto flex w-full max-w-3xl items-center justify-between px-5 pt-6 sm:px-8">
        <p className="text-[11px] font-bold uppercase tracking-[0.32em] text-white/70">
          Give me a vibe
        </p>
        <p className="hidden text-[12px] text-white/60 sm:block">An expensive button for indecision.</p>
      </header>

      <main
        className={`mx-auto flex w-full max-w-3xl flex-1 flex-col items-center gap-5 px-5 pb-16 pt-8 sm:px-8 sm:pt-12 ${
          compact ? "justify-center" : "justify-start"
        }`}
      >
        {/* Hero — always visible, keeps the one-button promise */}
        <div className="w-full text-center">
          <h1 className="text-[clamp(2.6rem,9vw,5.2rem)] font-extrabold leading-[0.95] tracking-tighter text-white">
            GIVE ME
            <br />A VIBE
          </h1>
          <p className="mt-3 text-[clamp(1rem,3vw,1.2rem)] text-white/70">
            Give me something to build.{" "}
            <span className="text-white/60">{VIBE_META[selectedVibe].microcopy}</span>
          </p>
        </div>

        <GenerateButton loading={generating} onPress={() => generate()} />

        <VibeSelector value={selectedVibe} onChange={setSelectedVibe} disabled={generating} />

        {/* State machine body */}
        <div aria-live="polite" className="flex w-full min-w-0 flex-col items-center gap-5">
          {status.name === "generating" && <GenerationState vibe={selectedVibe} />}

          {status.name === "error" && (
            <ErrorState
              onRetry={() => generate()}
              loading={generating}
              code={status.code}
              retryAfter={status.retryAfter}
            />
          )}

          {status.name === "result" && (
            <>
              <IdeaView idea={status.idea} vibe={status.vibe} />
              <BuildPromptPanel
                build={build}
                selectedTarget={buildTarget}
                onTargetChange={setBuildTarget}
                onRequest={requestBuildPrompt}
                canRequest={status.name === "result"}
              />
              <div className="glass w-full min-w-0 rounded-[28px] p-5 sm:p-6">
                <ShareActions
                  idea={status.idea}
                  vibe={status.vibe}
                  onExportImage={handleExportImage}
                  exporting={exporting}
                />
                {exportError && (
                  <p
                    role="status"
                    className="mt-1 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-center text-[13px] text-white/70"
                  >
                    <span>{exportError}</span>
                    <button
                      onClick={handleExportImage}
                      disabled={exporting}
                      className="font-bold uppercase tracking-[0.18em] text-white underline decoration-white/40 underline-offset-4 hover:decoration-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:opacity-60"
                    >
                      Try again
                    </button>
                  </p>
                )}
                <button
                  onClick={() => generate()}
                  disabled={generating}
                  className="mt-2 w-full rounded-2xl border border-white/25 bg-white px-6 py-4 text-sm font-extrabold uppercase tracking-[0.2em] text-black transition hover:bg-white/85 active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:opacity-60"
                >
                  Give me another vibe
                </button>
              </div>
              {/* Curated export card (off-screen, for image generation only) */}
              <ImageExportCard idea={status.idea} vibe={status.vibe} innerRef={exportRef} />
            </>
          )}

          {status.name === "idle" && (
            <p className="max-w-md text-center text-[13.5px] leading-relaxed text-white/60">
              No inputs. No accounts. No history. One button, four moods, and a critic who has
              seen too many dashboards.
            </p>
          )}
        </div>
      </main>

      <footer className="mx-auto w-full max-w-3xl px-5 pb-8 text-center sm:px-8">
        <p className="text-[12px] text-white/60">
          Ideas are generated fresh by Gemini. Good ≠ viable. Bad ≠ not worth building.
        </p>
      </footer>
    </div>
  );
}
