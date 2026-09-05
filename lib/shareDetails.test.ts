import { describe, expect, it } from "vitest";
import { pickShareDetails, shareTitleFontSize, truncateForCard } from "./shareDetails";
import type { Idea } from "./schema";

function ideaWith(over: Partial<Idea>): Idea {
  return {
    title: "T",
    premise: "P",
    sections: [
      { title: "S1", body: "First body sentence. Second sentence." },
      { title: "S2", body: "Another body here." },
    ],
    verdict: { summary: "V", reasoning: "R" },
    ...over,
  };
}

describe("truncateForCard", () => {
  it("leaves short text untouched", () => {
    expect(truncateForCard("Plip", 120)).toBe("Plip");
  });

  it("never ends mid-word on normal prose", () => {
    // Regression: share card once rendered "Migrate and Hoo…".
    const src =
      "TaxidermyForYourOldReactComponents: A Sentimental Preservation Society for Class Components Nobody Will Migrate and Hooks That Haunt the Hallways";
    const out = truncateForCard(src, 120);
    expect(out.endsWith("…")).toBe(true);
    const base = out.slice(0, -1);
    // The cut must land on a word boundary of the source…
    expect(src.startsWith(base)).toBe(true);
    expect(src[base.length]).toBe(" ");
    // …and must not dangle a glue word.
    expect(base).not.toMatch(/\s(and|or|the|a|to|with|for|of|in|on)$/i);
  });

  it("strips dangling glue words before the ellipsis", () => {
    expect(truncateForCard("Alpha beta gamma and delta epsilon", 24)).toBe("Alpha beta gamma…");
  });

  it("hard-cuts unbreakable tokens instead of returning empty", () => {
    const token = "a".repeat(200);
    const out = truncateForCard(token, 120);
    expect(out.length).toBeLessThanOrEqual(120);
    expect(out.endsWith("…")).toBe(true);
  });

  it("strips trailing punctuation before the ellipsis", () => {
    expect(truncateForCard("Velvet ropes, brass plaques, and more things here", 30)).toBe(
      "Velvet ropes, brass plaques…"
    );
  });
});

describe("pickShareDetails", () => {
  it("returns at most two details and strips backticks", () => {
    const idea = ideaWith({
      sections: [
        { title: "S1", body: "Body.", bullets: ["Run `git prune` on Fridays", "Second `code` bullet", "Third"] },
        { title: "S2", body: "Body two." },
      ],
    });
    const details = pickShareDetails(idea);
    expect(details.length).toBeLessThanOrEqual(2);
    expect(details.join(" ")).not.toContain("`");
  });

  it("falls back to section bodies when there are no bullets", () => {
    const details = pickShareDetails(ideaWith({}));
    expect(details.length).toBe(2);
  });
});

describe("shareTitleFontSize", () => {
  it("shrinks as titles grow so the 1200px card never clips", () => {
    const sizes = [10, 40, 60, 85, 105, 120].map((n) => shareTitleFontSize("x".repeat(n)));
    expect(sizes).toEqual([72, 72, 60, 52, 46, 40]);
    for (let i = 1; i < sizes.length; i++) expect(sizes[i]!).toBeLessThanOrEqual(sizes[i - 1]!);
  });
});
