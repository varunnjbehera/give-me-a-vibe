import { describe, expect, it } from "vitest";
import { parseIdeaLoose } from "./schema";

const valid = {
  title: "StaleBranch Pruner",
  premise: "A calm git janitor.",
  sections: [
    { title: "Core mechanic", body: "Scans branches." },
    { title: "Challenge", body: "Safe deletion." },
  ],
  verdict: { summary: "Real utility, zero business.", reasoning: "Nobody will pay." },
};

describe("parseIdeaLoose", () => {
  it("accepts a valid idea unchanged", () => {
    expect(parseIdeaLoose(valid)?.title).toBe("StaleBranch Pruner");
  });

  it("accepts dynamic section counts from 2 to 7", () => {
    const two = parseIdeaLoose(valid);
    expect(two?.sections.length).toBe(2);
    const seven = parseIdeaLoose({
      ...valid,
      sections: Array.from({ length: 7 }, (_, i) => ({ title: `S${i}`, body: "b" })),
    });
    expect(seven?.sections.length).toBe(7);
  });

  it("rejects a single-section idea and section-less output", () => {
    expect(
      parseIdeaLoose({ ...valid, sections: [{ title: "Only", body: "one" }] })
    ).toBeNull();
    expect(parseIdeaLoose({ ...valid, sections: [] })).toBeNull();
  });

  it("salvages a verdict delivered as a plain string", () => {
    const idea = parseIdeaLoose({ ...valid, verdict: "Honestly fine." });
    expect(idea?.verdict.summary).toContain("Honestly fine.");
  });

  it("scrubs model mojibake instead of rendering it", () => {
    // Regression: a live response once shipped "hashes�??catching".
    const idea = parseIdeaLoose({
      ...valid,
      sections: [
        { title: "Core mechanic", body: "hashes�??catching fire" },
        { title: "Challenge", body: "Safe deletion." },
      ],
    });
    expect(idea?.sections[0]?.body).not.toContain("�");
    expect(idea?.sections[0]?.body).not.toContain("??");
    expect(idea?.sections[0]?.body).toContain("hashes catching fire");
  });

  it("returns null for unrecoverable output", () => {
    expect(parseIdeaLoose(null)).toBeNull();
    expect(parseIdeaLoose("just a string")).toBeNull();
    expect(parseIdeaLoose({})).toBeNull();
  });
});
