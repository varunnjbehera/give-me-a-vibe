import type { Idea } from "./schema";
import type { Vibe } from "./vibes";

/**
 * Identity helpers for the three-layer pinning model:
 * selectedVibe (next) vs generatedResult.vibe (frozen) vs
 * buildPrompt.sourceVibe+sourceKey+target (frozen).
 * Pure functions so the rules are unit-testable without React.
 */

export function sourceKeyFor(idea: Idea, vibe: Vibe): string {
  return `${vibe}::${idea.title}::${idea.premise}`.slice(0, 300);
}

/** A build artifact is stale when its source no longer matches the live result. */
export function isBuildStale(
  buildSourceKey: string | null,
  liveSourceKey: string | null
): boolean {
  if (buildSourceKey === null) return false;
  if (liveSourceKey === null) return true;
  return buildSourceKey !== liveSourceKey;
}

/** Build prompt may only be requested when a result exists. */
export function canRequestBuild(statusName: string): boolean {
  return statusName === "result";
}

/** Regenerating an idea always invalidates the old build prompt. */
export function nextBuildAfterRegenerate(): { name: "idle" } {
  return { name: "idle" };
}
