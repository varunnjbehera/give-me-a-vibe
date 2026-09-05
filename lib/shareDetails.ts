import type { Idea } from "./schema";

/**
 * Curates 1–2 notable details from dynamic sections without assuming fixed
 * section names. Prefers concrete bullets, falls back to first-sentence
 * snippets of section bodies. Used by the share-image card.
 */
export function pickShareDetails(idea: Idea): string[] {
  const details: string[] = [];
  const push = (s: string) => {
    // Curated card copy: strip inline-code backticks (they read as clutter at
    // display sizes) and collapse whitespace.
    const t = s.replace(/`/g, "").trim().replace(/\s+/g, " ");
    if (t.length < 12) return;
    const truncated = t.length > 120 ? cutAtWord(t, 120) : t;
    if (!details.includes(truncated)) details.push(truncated);
  };

  // Prefer concrete bullets — usually the most shareable specifics.
  for (const section of idea.sections) {
    for (const b of section.bullets ?? []) {
      if (details.length >= 2) break;
      push(b);
    }
    if (details.length >= 2) break;
  }
  // Fall back to first-sentence snippets of section bodies.
  for (const section of idea.sections) {
    if (details.length >= 2) break;
    const firstSentence = section.body.split(/(?<=[.!?])\s+/)[0] ?? section.body;
    push(firstSentence.length > 24 ? firstSentence : section.body);
  }
  return details.slice(0, 2);
}

/** Dynamic title size for the 1200px share card: long titles shrink, never clip. */
export function shareTitleFontSize(title: string): number {
  const len = title.length;
  if (len <= 40) return 72;
  if (len <= 60) return 60;
  if (len <= 85) return 52;
  if (len <= 105) return 46;
  return 40;
}

export function truncateForCard(s: string, max: number): string {
  const t = s.trim().replace(/\s+/g, " ");
  if (t.length <= max) return t;
  return cutAtWord(t, max);
}

/**
 * Shorten to `max` chars at a word boundary so cards never end mid-word
 * ("Hoo…"). Falls back to a hard cut for unbreakable tokens, and strips
 * trailing punctuation before the ellipsis ("ropes,…" → "ropes…").
 */
function cutAtWord(t: string, max: number): string {
  const raw = t.slice(0, max - 1);
  const cut = raw.trimEnd();
  // Only retreat to the previous space when the cut lands mid-word (both the
  // cut's last char and the next source char are word chars). A cut that ends
  // exactly at a word end ("…plaques, and…") keeps the full word.
  const nextChar = t[raw.length];
  const lastChar = cut[cut.length - 1] ?? "";
  const midWord =
    nextChar !== undefined && /\S/.test(nextChar) && /[\p{L}\p{N}_]/u.test(lastChar);
  let base: string;
  if (!midWord) {
    base = cut;
  } else {
    const lastSpace = cut.lastIndexOf(" ");
    base = lastSpace > max * 0.4 ? cut.slice(0, lastSpace) : cut;
  }
  base = base.replace(/[,;:\s]+$/g, "");
  // Avoid dangling glue words ("Migrate and…" → "Migrate…").
  for (let i = 0; i < 3; i++) {
    const next = base.replace(
      /\s+(and|or|nor|yet|so|the|a|an|to|with|for|of|in|on|at|as|but|from|than|that)\s*$/i,
      ""
    );
    if (next === base) break;
    base = next;
  }
  return base + "…";
}
