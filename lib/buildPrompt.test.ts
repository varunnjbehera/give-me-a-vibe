import { describe, expect, it } from "vitest";
import {
  buildBuilderSystemPrompt,
  buildBuilderUserPrompt,
  getBuildPromptResponseSchema,
} from "./buildPrompt";
import { BUILD_TARGETS, isBuildTarget } from "./targets";

const idea = {
  title: "Plant Confessional",
  premise: "Plants confess neglect through drama.",
  sections: [
    { title: "Core flow", body: "Take a plant photo." },
    { title: "MVP", body: "Photo, verdict, share.", bullets: ["snap", "judge"] },
  ],
  verdict: { summary: "Silly but buildable.", reasoning: "Weekend project." },
  metadata: { buildDifficulty: "Easy", potential: "Low", nonsenseLevel: "High" },
  tags: ["plants", "comedy"],
};

describe("builder targets", () => {
  it("supports exactly the five documented targets, defaulting to generic", () => {
    expect([...BUILD_TARGETS]).toEqual([
      "generic",
      "open-code",
      "claude-code",
      "codex",
      "cursor",
    ]);
    expect(isBuildTarget("generic")).toBe(true);
    expect(isBuildTarget("spicy")).toBe(false);
    expect(isBuildTarget(undefined)).toBe(false);
  });
});

describe("buildBuilderSystemPrompt (LLM #2 role)", () => {
  it("names the architect/translator role, never another inventor", () => {
    const sys = buildBuilderSystemPrompt("generic");
    expect(sys).toMatch(/translate/i);
    expect(sys).toMatch(/simplif/i);
    expect(sys).toMatch(/operation/i);
    expect(sys).toMatch(/NOT another idea generator/);
  });

  it("demands simplification over invented infrastructure", () => {
    const sys = buildBuilderSystemPrompt("generic");
    expect(sys).toMatch(/simplest credible/);
    expect(sys).toMatch(/REQUIRED FOR THE MVP/);
  });

  it("requires actionable output with acceptance criteria", () => {
    const sys = buildBuilderSystemPrompt("generic");
    expect(sys).toMatch(/Acceptance Criteria/);
    expect(sys).toMatch(/what NOT to build/);
  });

  it("carries a target note per agent without faking syntax", () => {
    for (const t of BUILD_TARGETS) {
      const sys = buildBuilderSystemPrompt(t);
      expect(sys).toContain(t === "generic" ? "GENERIC" : t.toUpperCase().replace("-", " "));
      expect(sys).toMatch(/plain markdown/i);
    }
  });

  it("requires valid JSON matching the schema", () => {
    expect(buildBuilderSystemPrompt("cursor")).toMatch(/valid JSON/);
  });
});

describe("buildBuilderUserPrompt (structured handoff, no raw HTML)", () => {
  it("serializes the full structured idea for every target", () => {
    for (const t of BUILD_TARGETS) {
      const user = buildBuilderUserPrompt(idea as never, "absurd", t);
      expect(user).toContain("Plant Confessional");
      expect(user).toContain("Take a plant photo");
      expect(user).toContain("Silly but buildable");
      expect(user).toContain("ABSURD");
      expect(user).toContain(`"${t}"`);
      expect(user).not.toContain("<div");
      expect(user).not.toContain("dangerouslySetInnerHTML");
    }
  });

  it("switching target changes the request without changing the idea", () => {
    const a = buildBuilderUserPrompt(idea as never, "useful", "generic");
    const b = buildBuilderUserPrompt(idea as never, "useful", "cursor");
    expect(a).toContain("Plant Confessional");
    expect(b).toContain("Plant Confessional");
    expect(a).not.toEqual(b);
    expect(b).toContain("cursor");
  });
});

describe("getBuildPromptResponseSchema", () => {
  it("requires title, target, and prompt for reliable rendering", () => {
    const schema = getBuildPromptResponseSchema();
    expect(schema.required).toEqual(
      expect.arrayContaining(["title", "target", "prompt"])
    );
  });
});
