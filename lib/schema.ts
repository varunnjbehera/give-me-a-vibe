import { z } from "zod";

export const IdeaSectionSchema = z.object({
  title: z.string().min(1).max(80),
  body: z.string().min(1).max(2000),
  bullets: z.array(z.string().min(1).max(300)).max(8).optional(),
});

export const VerdictSchema = z.object({
  summary: z.string().min(1).max(200),
  reasoning: z.string().min(1).max(1200),
});

export const IdeaMetadataSchema = z.object({
  buildDifficulty: z.string().max(60).optional(),
  potential: z.string().max(60).optional(),
  nonsenseLevel: z.string().max(60).optional(),
});

export const IdeaSchema = z.object({
  title: z.string().min(1).max(120),
  premise: z.string().min(1).max(280),
  sections: z.array(IdeaSectionSchema).min(2).max(7),
  verdict: VerdictSchema,
  metadata: IdeaMetadataSchema.optional(),
  tags: z.array(z.string().min(1).max(30)).max(6).optional(),
});

export type IdeaSection = z.infer<typeof IdeaSectionSchema>;
export type IdeaVerdict = z.infer<typeof VerdictSchema>;
export type Idea = z.infer<typeof IdeaSchema>;

/** Lenient parse: trims, caps lengths, drops empty sections. Returns null if unrecoverable. */
export function parseIdeaLoose(raw: unknown): Idea | null {
  const parsed = IdeaSchema.safeParse(raw);
  if (parsed.success) return sanitizeIdea(parsed.data);

  // Attempt to salvage common model mistakes (e.g. verdict as string)
  try {
    if (typeof raw !== "object" || raw === null) return null;
    const r = raw as Record<string, unknown>;
    const normalized: Record<string, unknown> = { ...r };
    if (typeof normalized.verdict === "string") {
      normalized.verdict = {
        summary: (normalized.verdict as string).slice(0, 200),
        reasoning: normalized.verdict as string,
      };
    }
    if (typeof normalized.sections === "string") return null;
    const second = IdeaSchema.safeParse(normalized);
    if (second.success) return sanitizeIdea(second.data);
    return null;
  } catch {
    return null;
  }
}

function cleanText(s: string): string {
  // Normalize Unicode without stripping legitimate content (emoji, accents,
  // non-Latin scripts, punctuation all survive NFC + this filtering).
  // Only removes: U+FFFD replacement chars + C0/C1 controls (except \n \t).
  let out = s.normalize("NFC");
  out = out.replace(/�/g, "");
  // Strip C0 controls except \n (\x0A) and \t (\x09), plus DEL and C1 controls.
  out = out.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u0080-\u009F]/g, "");
  // Collapse stray "? ?" artifacts left behind where a replacement char sat
  // between word chars (e.g. "hashes??catching" from "hashes�??catching").
  out = out.replace(/(\w)\?{2,}(\w)/g, "$1 $2");
  // Tidy whitespace runs but preserve single newlines.
  out = out.replace(/[ \t\u00A0]{2,}/g, " ");
  out = out.replace(/\n{3,}/g, "\n\n");
  return out;
}

function sanitizeIdea(idea: Idea): Idea {
  return {
    ...idea,
    title: cleanText(idea.title).trim().slice(0, 120),
    premise: cleanText(idea.premise).trim().slice(0, 280),
    sections: idea.sections
      .filter((s) => cleanText(s.title).trim() && cleanText(s.body).trim())
      .slice(0, 7)
      .map((s) => ({
        title: cleanText(s.title).trim().slice(0, 80),
        body: cleanText(s.body).trim().slice(0, 2000),
        bullets: s.bullets
          ?.map((b) => cleanText(b).trim().slice(0, 300))
          .filter(Boolean)
          .slice(0, 8),
      })),
    verdict: {
      summary: cleanText(idea.verdict.summary).trim().slice(0, 200),
      reasoning: cleanText(idea.verdict.reasoning).trim().slice(0, 1200),
    },
    metadata: idea.metadata
      ? {
          buildDifficulty: idea.metadata.buildDifficulty
            ? cleanText(idea.metadata.buildDifficulty).trim().slice(0, 60) || undefined
            : undefined,
          potential: idea.metadata.potential
            ? cleanText(idea.metadata.potential).trim().slice(0, 60) || undefined
            : undefined,
          nonsenseLevel: idea.metadata.nonsenseLevel
            ? cleanText(idea.metadata.nonsenseLevel).trim().slice(0, 60) || undefined
            : undefined,
        }
      : undefined,
    tags: idea.tags
      ?.map((t) => cleanText(t).trim().slice(0, 30))
      .filter(Boolean)
      .slice(0, 6),
  };
}
