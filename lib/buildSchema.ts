import { z } from "zod";
import { BUILD_TARGETS } from "./targets";

export const BuildPromptSectionSchema = z.object({
  title: z.string().min(1).max(80),
  body: z.string().min(1).max(2000),
  bullets: z.array(z.string().min(1).max(300)).max(8).optional(),
});

export const BuildPromptSchema = z.object({
  title: z.string().min(1).max(140),
  target: z.enum(BUILD_TARGETS),
  prompt: z.string().min(1).max(15000),
  sections: z.array(BuildPromptSectionSchema).max(12).optional(),
});

export type BuildPromptSection = z.infer<typeof BuildPromptSectionSchema>;
export type BuildPrompt = z.infer<typeof BuildPromptSchema>;

function cleanBuildText(s: string): string {
  let out = s.normalize("NFC");
  out = out.replace(/�/g, "");
  out = out.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, "");
  out = out.replace(/(\w)\?{2,}(\w)/g, "$1 $2");
  out = out.replace(/[ \t\u00A0]{2,}/g, " ");
  out = out.replace(/\n{3,}/g, "\n\n");
  return out;
}

function sanitizeBuildPrompt(bp: BuildPrompt): BuildPrompt {
  return {
    title: cleanBuildText(bp.title).trim().slice(0, 140),
    target: bp.target,
    prompt: cleanBuildText(bp.prompt).trim().slice(0, 15000),
    sections: bp.sections
      ?.filter((s) => cleanBuildText(s.title).trim() && cleanBuildText(s.body).trim())
      .slice(0, 12)
      .map((s) => ({
        title: cleanBuildText(s.title).trim().slice(0, 80),
        body: cleanBuildText(s.body).trim().slice(0, 2000),
        bullets: s.bullets
          ?.map((b) => cleanBuildText(b).trim().slice(0, 300))
          .filter(Boolean)
          .slice(0, 8),
      })),
  };
}

/** Lenient parse for model output. Returns null if unrecoverable. */
export function parseBuildPromptLoose(raw: unknown): BuildPrompt | null {
  const parsed = BuildPromptSchema.safeParse(raw);
  if (parsed.success) {
    const clean = sanitizeBuildPrompt(parsed.data);
    if (!clean.title || !clean.prompt) return null;
    return clean;
  }
  try {
    if (typeof raw !== "object" || raw === null) return null;
    const r = raw as Record<string, unknown>;
    const candidate: Record<string, unknown> = { ...r };
    if (typeof candidate.prompt !== "string") {
      const alt =
        candidate.buildPrompt ?? candidate.content ?? candidate.text ?? null;
      if (typeof alt === "string") candidate.prompt = alt;
    }
    if (
      typeof candidate.prompt !== "string" &&
      Array.isArray(candidate.sections)
    ) {
      const joined = (candidate.sections as Array<Record<string, unknown>>)
        .map((s) => {
          const t = typeof s.title === "string" ? `# ${s.title}\n` : "";
          const b = typeof s.body === "string" ? s.body : "";
          const bullets = Array.isArray(s.bullets)
            ? "\n" +
              (s.bullets as unknown[])
                .filter((x): x is string => typeof x === "string")
                .map((x) => `- ${x}`)
                .join("\n")
            : "";
          return `${t}${b}${bullets}`.trim();
        })
        .filter(Boolean)
        .join("\n\n");
      if (joined) candidate.prompt = joined;
    }
    const second = BuildPromptSchema.safeParse(candidate);
    if (second.success) {
      const clean = sanitizeBuildPrompt(second.data);
      if (!clean.title || !clean.prompt) return null;
      return clean;
    }
    return null;
  } catch {
    return null;
  }
}


