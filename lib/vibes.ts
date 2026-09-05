export const VIBES = ["useful", "weird", "absurd", "satirical"] as const;

export type Vibe = (typeof VIBES)[number];

export const VIBE_META: Record<
  Vibe,
  { label: string; hint: string; microcopy: string }
> = {
  useful: {
    label: "Useful",
    hint: "Real problems, real workflows",
    microcopy: "Surely this will be useful.",
  },
  weird: {
    label: "Weird",
    hint: "Strange but buildable",
    microcopy: "This seemed normal five seconds ago.",
  },
  absurd: {
    label: "Absurd",
    hint: "Should not exist, but could",
    microcopy: "This seemed like a good idea five seconds ago.",
  },
  satirical: {
    label: "Satirical",
    hint: "Startups, VC, productivity lore",
    microcopy: "Strong alignment potential.",
  },
};

export function isVibe(value: unknown): value is Vibe {
  return typeof value === "string" && (VIBES as readonly string[]).includes(value);
}
