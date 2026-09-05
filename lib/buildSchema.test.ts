import { describe, expect, it } from "vitest";
import { parseBuildPromptLoose } from "./buildSchema";
import { IdeaSchema } from "./schema";

const sourceIdea = {
  title: "Plant Confessional",
  premise: "Plants confess neglect through drama.",
  sections: [
    { title: "Core flow", body: "Take a plant photo." },
    { title: "MVP", body: "Photo, verdict, share." },
  ],
  verdict: { summary: "Silly but buildable.", reasoning: "Weekend project." },
};

const validBuild = {
  title: "Plant Confessional",
  target: "generic",
  prompt: "# Plant Confessional\n\n## MVP\nBuild photo flow.",
  sections: [{ title: "MVP", body: "Build photo flow." }],
};

describe("build-prompt source validation (LLM #1 output as input)", () => {
  it("accepts a valid structured source result", () => {
    expect(IdeaSchema.safeParse(sourceIdea).success).toBe(true);
  });

  it("rejects malformed source results instead of trusting the client", () => {
    expect(IdeaSchema.safeParse(null).success).toBe(false);
    expect(IdeaSchema.safeParse({}).success).toBe(false);
    expect(
      IdeaSchema.safeParse({ ...sourceIdea, sections: [] }).success
    ).toBe(false);
    expect(
      IdeaSchema.safeParse({ ...sourceIdea, verdict: "great!" }).success
    ).toBe(false);
  });
});

describe("parseBuildPromptLoose (LLM #2 output)", () => {
  it("accepts a valid build prompt", () => {
    const bp = parseBuildPromptLoose(validBuild);
    expect(bp?.title).toBe("Plant Confessional");
    expect(bp?.target).toBe("generic");
    expect(bp?.prompt).toContain("MVP");
  });

  it("accepts all five targets without faking differences", () => {
    for (const target of [
      "generic",
      "open-code",
      "claude-code",
      "codex",
      "cursor",
    ] as const) {
      const bp = parseBuildPromptLoose({ ...validBuild, target });
      expect(bp?.target).toBe(target);
    }
  });

  it("rejects invalid model output", () => {
    expect(parseBuildPromptLoose(null)).toBeNull();
    expect(parseBuildPromptLoose({})).toBeNull();
    expect(
      parseBuildPromptLoose({ title: "T", target: "generic" })
    ).toBeNull();
    expect(
      parseBuildPromptLoose({
        title: "T",
        target: "not-a-target",
        prompt: "P",
      })
    ).toBeNull();
  });

  it("salvages a prompt nested under an alternate key", () => {
    const bp = parseBuildPromptLoose({
      title: "T",
      target: "cursor",
      buildPrompt: "# Build it",
    });
    expect(bp?.prompt).toContain("Build it");
    expect(bp?.target).toBe("cursor");
  });

  it("joins sections into a prompt when the string is missing", () => {
    const bp = parseBuildPromptLoose({
      title: "T",
      target: "generic",
      sections: [
        { title: "MVP", body: "Do the smallest thing." },
        { title: "Scope", body: "Not that.", bullets: ["a", "b"] },
      ],
    });
    expect(bp?.prompt).toContain("Do the smallest thing");
  });

  it("scrubs mojibake like the idea path does", () => {
    const bp = parseBuildPromptLoose({
      ...validBuild,
      prompt: "hashes�??catching fire",
    });
    expect(bp?.prompt).not.toContain("�");
    expect(bp?.prompt).toContain("hashes catching fire");
  });
});
