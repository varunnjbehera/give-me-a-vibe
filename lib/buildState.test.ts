import { describe, expect, it } from "vitest";
import {
  canRequestBuild,
  isBuildStale,
  nextBuildAfterRegenerate,
  sourceKeyFor,
} from "./buildState";

const ideaA = {
  title: "Plant Confessional",
  premise: "Plants confess neglect.",
  sections: [
    { title: "A", body: "b" },
    { title: "C", body: "d" },
  ],
  verdict: { summary: "s", reasoning: "r" },
};

const ideaB = {
  ...ideaA,
  title: "Inbox Exorcist",
  premise: "Email but haunted.",
};

describe("three-layer pinning (selected vs generated vs build source)", () => {
  it("pins a stable identity per generated result", () => {
    const k1 = sourceKeyFor(ideaA as never, "absurd");
    const k2 = sourceKeyFor(ideaA as never, "absurd");
    expect(k1).toBe(k2);
    expect(k1).toContain("absurd");
    expect(k1).toContain("Plant Confessional");
  });

  it("changing the selector vibe does not mutate the existing idea key", () => {
    const frozen = sourceKeyFor(ideaA as never, "absurd");
    const liveReselect = sourceKeyFor(ideaA as never, "useful");
    expect(frozen).not.toBe(liveReselect);
    // The displayed artifact keeps `frozen`; the selector only affects next.
    expect(frozen).toContain("absurd");
  });

  it("changing the selector does not mutate the existing build prompt key", () => {
    const buildKey = sourceKeyFor(ideaA as never, "absurd");
    expect(isBuildStale(buildKey, buildKey)).toBe(false);
    // Selector moved on, live key differs, build is now stale-relative but
    // the stored artifact itself is untouched (caller keeps frozen copy).
    expect(isBuildStale(buildKey, sourceKeyFor(ideaA as never, "weird"))).toBe(true);
  });

  it("a new idea clears the old build prompt", () => {
    expect(nextBuildAfterRegenerate()).toEqual({ name: "idle" });
    const oldKey = sourceKeyFor(ideaA as never, "absurd");
    const newKey = sourceKeyFor(ideaB as never, "absurd");
    expect(isBuildStale(oldKey, newKey)).toBe(true);
  });

  it("a build prompt cannot be requested without a result", () => {
    expect(canRequestBuild("result")).toBe(true);
    expect(canRequestBuild("idle")).toBe(false);
    expect(canRequestBuild("generating")).toBe(false);
    expect(canRequestBuild("error")).toBe(false);
  });
});
