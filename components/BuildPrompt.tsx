"use client";

import { useState } from "react";
import type { BuildPrompt as BuildPromptData } from "@/lib/buildSchema";
import {
  BUILD_TARGETS,
  BUILD_TARGET_META,
  type BuildTarget,
} from "@/lib/targets";
import type { Vibe } from "@/lib/vibes";
import { copyToClipboard } from "@/lib/share";

export type BuildStatus =
  | { name: "idle" }
  | {
      name: "loading";
      target: BuildTarget;
      sourceVibe: Vibe;
      sourceKey: string;
    }
  | {
      name: "ready";
      target: BuildTarget;
      sourceVibe: Vibe;
      sourceKey: string;
      data: BuildPromptData;
    }
  | {
      name: "error";
      target: BuildTarget;
      sourceVibe: Vibe;
      sourceKey: string;
      code?: string;
      retryAfter?: number;
    };

/**
 * Optional second-stage Builder panel.
 *
 * Sits after the verdict, deliberately secondary to GIVE ME ANOTHER VIBE:
 * ghost styling, compact target picker, no brand repetition. Preserves the
 * idea on screen in all states; loading/error never replace the result.
 * Displayed target/vibe are frozen at request time — changing the selectors
 * afterwards never rewrites this artifact.
 */
export default function BuildPromptPanel({
  build,
  selectedTarget,
  onTargetChange,
  onRequest,
  canRequest,
}: {
  build: BuildStatus;
  selectedTarget: BuildTarget;
  onTargetChange: (t: BuildTarget) => void;
  onRequest: () => void;
  canRequest: boolean;
}) {
  const [note, setNote] = useState<string | null>(null);

  async function handleCopyPrompt(prompt: string) {
    const ok = await copyToClipboard(prompt);
    setNote(ok ? "Copied." : "Copy failed — select and copy manually.");
    setTimeout(() => setNote(null), 2200);
  }

  const loading = build.name === "loading";
  const ready =
    build.name === "ready" ? (build as Extract<BuildStatus, { name: "ready" }>) : null;
  const failed =
    build.name === "error" ? (build as Extract<BuildStatus, { name: "error" }>) : null;
  const throttled = failed?.code === "RATE_LIMITED";
  const targetStale =
    ready !== null && selectedTarget !== ready.data.target;

  return (
    <section
      aria-labelledby="build-prompt-heading"
      className="glass w-full min-w-0 rounded-[28px] p-5 sm:p-6"
    >
      <p
        id="build-prompt-heading"
        className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/65"
      >
        Still want it?
      </p>

      {build.name === "idle" && (
        <>
          <div className="mt-3 flex min-w-0 flex-col gap-3">
            <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
              <label
                htmlFor="build-target"
                className="shrink-0 text-[12px] font-semibold uppercase tracking-[0.18em] text-white/60"
              >
                Target
              </label>
              <select
                id="build-target"
                value={selectedTarget}
                onChange={(e) => {
                  const v = e.target.value;
                  if (
                    v === "generic" ||
                    v === "open-code" ||
                    v === "claude-code" ||
                    v === "codex" ||
                    v === "cursor"
                  ) {
                    onTargetChange(v);
                  }
                }}
                disabled={!canRequest || loading}
                className="min-w-0 w-full cursor-pointer rounded-full border border-white/16 bg-white/[0.07] px-4 py-2.5 text-[13px] font-semibold text-white/90 backdrop-blur-xl transition hover:bg-white/[0.12] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:min-w-[180px]"
              >
                {BUILD_TARGETS.map((t) => (
                  <option key={t} value={t} className="bg-[#14161d] text-white">
                    {BUILD_TARGET_META[t].label}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={onRequest}
              disabled={!canRequest || loading}
              className="action-btn w-full disabled:opacity-60"
            >
              Get the build prompt
            </button>
            <p className="text-center text-[13px] leading-relaxed text-white/60">
              Turn this vibe into instructions for your coding agent.
            </p>
          </div>
        </>
      )}

      {build.name === "loading" && (
        <div
          role="status"
          aria-label="Generating build prompt"
          className="mt-3 flex w-full min-w-0 flex-col items-center gap-3 py-4 text-center"
        >
          <div className="flex gap-2" aria-hidden>
            {[0, 1, 2].map((d) => (
              <span
                key={d}
                className="orb-dot h-2 w-2 rounded-full bg-white/80"
                style={{ animationDelay: `${d * 0.22}s` }}
              />
            ))}
          </div>
          <p className="text-[13px] font-semibold uppercase tracking-[0.22em] text-white/70">
            Drafting the build prompt
          </p>
          <p className="max-w-sm text-[13px] leading-relaxed text-white/60">
            Translating {BUILD_TARGET_META[build.target].label} instructions.
            The idea stays put.
          </p>
          <div className="flex min-w-0 w-full flex-col gap-2 sm:flex-row sm:items-center">
            <label
              htmlFor="build-target-loading"
              className="shrink-0 text-[12px] font-semibold uppercase tracking-[0.18em] text-white/60"
            >
              Target
            </label>
            <select
              id="build-target-loading"
              value={selectedTarget}
              onChange={(e) => {
                const v = e.target.value;
                if (
                  v === "generic" ||
                  v === "open-code" ||
                  v === "claude-code" ||
                  v === "codex" ||
                  v === "cursor"
                ) {
                  onTargetChange(v);
                }
              }}
              className="min-w-0 w-full rounded-full border border-white/16 bg-white/[0.07] px-4 py-2.5 text-[13px] font-semibold text-white/90 disabled:opacity-60 sm:w-auto sm:min-w-[180px]"
              disabled
            >
              {BUILD_TARGETS.map((t) => (
                <option key={t} value={t} className="bg-[#14161d] text-white">
                  {BUILD_TARGET_META[t].label}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {ready && (
        <div className="mt-3 flex min-w-0 flex-col gap-3">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <span className="max-w-full break-words rounded-full border border-white/15 bg-white/[0.07] px-3.5 py-1.5 text-[12.5px] font-medium text-white/70">
              {BUILD_TARGET_META[ready.data.target].label}
            </span>
            <span className="min-w-0 break-words text-[13px] text-white/60">
              {ready.data.title}
            </span>
          </div>
          <div
            className="max-h-[50vh] min-w-0 overflow-y-auto rounded-2xl border border-white/10 bg-black/30 p-4 text-left sm:p-5"
          >
            <p className="min-w-0 whitespace-pre-wrap break-words text-[14px] leading-relaxed text-white/85">
              {ready.data.prompt}
            </p>
          </div>
          <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
            <button
              onClick={() => handleCopyPrompt(ready.data.prompt)}
              className="action-btn w-full sm:w-auto sm:flex-1"
            >
              Copy prompt
            </button>
            <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
              <label
                htmlFor="build-target-ready"
                className="sr-only"
              >
                Coding-agent target for next build prompt
              </label>
              <select
                id="build-target-ready"
                value={selectedTarget}
                onChange={(e) => {
                  const v = e.target.value;
                  if (
                    v === "generic" ||
                    v === "open-code" ||
                    v === "claude-code" ||
                    v === "codex" ||
                    v === "cursor"
                  ) {
                    onTargetChange(v);
                  }
                }}
                disabled={loading || !canRequest}
                className="min-w-0 w-full cursor-pointer rounded-full border border-white/16 bg-white/[0.07] px-4 py-2.5 text-[13px] font-semibold text-white/90 backdrop-blur-xl transition hover:bg-white/[0.12] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
              >
                {BUILD_TARGETS.map((t) => (
                  <option key={t} value={t} className="bg-[#14161d] text-white">
                    {BUILD_TARGET_META[t].label}
                  </option>
                ))}
              </select>
              <button
                onClick={onRequest}
                disabled={!canRequest || loading}
                className="w-full rounded-full border border-white/16 bg-transparent px-4 py-2.5 text-[13px] font-bold uppercase tracking-[0.14em] text-white/80 transition hover:bg-white/[0.08] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:opacity-60 sm:w-auto"
              >
                {targetStale
                  ? `Get ${BUILD_TARGET_META[selectedTarget].label} version`
                  : "Regenerate"}
              </button>
            </div>
          </div>
          {targetStale && (
            <p className="text-center text-[13px] text-white/60">
              Target is now {BUILD_TARGET_META[selectedTarget].label} — showing
              the {BUILD_TARGET_META[ready.data.target].label} version.
            </p>
          )}
          <p
            role="status"
            aria-live="polite"
            className="min-h-[1.25rem] text-center text-[13px] text-white/65"
          >
            {note ?? ""}
          </p>
        </div>
      )}

      {failed && (
        <div
          role="alert"
          className="mt-3 flex w-full min-w-0 flex-col items-center gap-3 py-2 text-center"
        >
          <p className="min-w-0 break-words text-[15px] leading-relaxed text-white/75">
            {throttled ? (
              <>
                Too many build prompts, too fast.
                {typeof failed.retryAfter === "number" && failed.retryAfter > 0
                  ? ` Give it ${failed.retryAfter}s, then try again.`
                  : ` Give it a moment, then try again.`}
              </>
            ) : (
              <>
                The build prompt got lost somewhere between ambition and
                implementation.
              </>
            )}
          </p>
          <button
            onClick={onRequest}
            disabled={!canRequest || loading}
            className="action-btn disabled:opacity-60"
          >
            Try again
          </button>
        </div>
      )}
    </section>
  );
}
