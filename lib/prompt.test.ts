import { describe, expect, it } from "vitest";
import { buildSystemPrompt, buildUserPrompt } from "./prompt";
import { VIBES } from "./vibes";

describe("buildSystemPrompt (LLM #1 doctrine)", () => {
  it("covers all four vibes with materially different instructions", () => {
    const prompts = VIBES.map((v) => buildSystemPrompt(v));
    for (const [i, v] of VIBES.entries()) {
      expect(prompts[i]).toContain(`MODE: ${v.toUpperCase()}`);
    }
    const unique = new Set(prompts);
    expect(unique.size).toBe(4);
  });

  it("frames output as a concrete build brief, not a pitch", () => {
    const sys = buildSystemPrompt("useful");
    expect(sys).toMatch(/concrete build brief/);
    expect(sys).toMatch(/begin an MVP/);
  });

  it("states the minimum information contract without fixed titles", () => {
    const sys = buildSystemPrompt("weird");
    for (const concept of [
      "THE CONCEPT",
      "THE EXPERIENCE",
      "THE AUDIENCE",
      "THE MVP",
      "THE BUILD PATH",
      "THE VERDICT",
    ]) {
      expect(sys).toContain(concept);
    }
    expect(sys).toMatch(/NOT mandatory section titles/);
  });

  it("encourages dynamic technical detail with example vocab", () => {
    const sys = buildSystemPrompt("useful");
    expect(sys).toMatch(/whenever it materially helps/);
    for (const name of ["Technical Spine", "Data Model", "Prototype Plan"]) {
      expect(sys).toContain(name);
    }
  });

  it("demands an MVP answering the smallest-version question", () => {
    const sys = buildSystemPrompt("absurd");
    expect(sys).toMatch(/smallest version/);
    expect(sys).toMatch(/ten-feature roadmap/);
  });

  it("enforces technical honesty over architectural theater", () => {
    const sys = buildSystemPrompt("useful");
    expect(sys).toMatch(/simplest credible implementation/);
    expect(sys).toMatch(/microservices for a tiny toy/);
    expect(sys).toMatch(/REQUIRED FOR THE MVP/);
  });

  it("bans hollow praise including the newly listed words", () => {
    const sys = buildSystemPrompt("satirical");
    for (const banned of [
      "Great idea!",
      "Amazing!",
      "Brilliant!",
      "Exciting!",
      "Innovative!",
      "huge potential",
    ]) {
      expect(sys).toContain(banned);
    }
    expect(sys).toMatch(/Good ≠ viable/);
  });

  it("keeps dynamic sections dynamic (2-7, never forced)", () => {
    const sys = buildSystemPrompt("weird");
    expect(sys).toMatch(/2-7 sections/);
    expect(sys).toMatch(/Do not force the same template/);
  });
});

describe("buildUserPrompt (entropy + semantic novelty)", () => {
  it("embeds a seed and a variation lens on every request", () => {
    const a = buildUserPrompt("useful", { seed: "abc123" });
    expect(a).toContain("abc123");
    expect(a).toMatch(/Variation lens/);
    expect(a).toContain("MODE: USEFUL");
  });

  it("treats recent titles as semantic repeats, not just title repeats", () => {
    const withAvoid = buildUserPrompt("useful", {
      seed: "s1",
      avoidTitles: ["StaleBranch Exorcist"],
    });
    expect(withAvoid).toMatch(/semantic novelty/);
    expect(withAvoid).toContain("StaleBranch Exorcist");
    const withoutAvoid = buildUserPrompt("useful", { seed: "s2" });
    expect(withoutAvoid).not.toContain("StaleBranch Exorcist");
  });
});
