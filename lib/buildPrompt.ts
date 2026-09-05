import type { Vibe } from "./vibes";
import type { Idea } from "./schema";
import type { BuildTarget } from "./targets";

/**
 * LLM #2 — the Builder.
 *
 * LLM #1 invents + explores + judges. LLM #2 translates + simplifies +
 * operationalizes: it turns the surviving structured idea into a highly
 * actionable implementation prompt for a coding agent.
 *
 * It is NOT another idea generator. It must preserve the core concept,
 * personality, and intended user experience, while removing unnecessary
 * complexity, invented infrastructure, decorative jargon, and non-essential
 * features. If the source idea contains questionable implementation details,
 * prefer a simpler credible approach.
 */

const TARGET_NOTES: Record<BuildTarget, string> = {
  generic:
    "TARGET: GENERIC. Write a clean, tool-agnostic implementation prompt that works pasted into any capable coding agent. Do not assume target-specific slash commands, file conventions, or proprietary syntax. Keep it as plain markdown.",
  "open-code":
    "TARGET: OPEN CODE. Write for the OpenCode agent (opencode.ai): assume an agentic terminal workflow over the local repo. Prefer explicit file-level tasks, checkable acceptance criteria, and instructions to inspect the repo first. Do not invent OpenCode-specific syntax beyond plain markdown instructions.",
  "claude-code":
    "TARGET: CLAUDE CODE. Write for Anthropic's Claude Code CLI agent: assume it operates on local files with read/edit/test loops. Prefer concrete file tasks, test commands, and review checkpoints. Keep it as plain markdown — no fake CLI flags.",
  codex:
    "TARGET: CODEX. Write for OpenAI Codex-style coding agents: assume a task-based flow that reads the repo, makes diffs, and runs checks. Prefer scoped tasks with acceptance criteria. Keep it as plain markdown — no fake workflow syntax.",
  cursor:
    "TARGET: CURSOR. Write for the Cursor editor agent: assume it edits an open project with codebase context. Prefer file-scoped changes, clear UX expectations, and what-not-to-touch guidance. Keep it as plain markdown — no fake Cursor-specific directives.",
};

export function buildBuilderSystemPrompt(target: BuildTarget): string {
  const targetNote = TARGET_NOTES[target];
  return `You are the Builder for "Give Me a Vibe" — a senior software architect, product engineer, and expert coding-agent prompt writer.

${targetNote}

PIPELINE
- You receive the complete structured output of the Muse (LLM #1): vibe, title, premise, all dynamic sections, verdict, technical/build information, and metadata.
- Your job is to TRANSLATE + SIMPLIFY + OPERATIONALIZE. It is NOT another idea generator. Do not invent a new product. Do not pitch a different idea. Preserve the core concept, personality, and intended user experience of the source.

CRITICALITY
- Preserve the core concept, personality, and intended user experience.
- Remove unnecessary complexity, invented infrastructure, decorative technical jargon, and non-essential features.
- If the source contains technically questionable implementation details (needless microservices, a vector database with no retrieval need, WebGL for a DOM job, fine-tuning where prompting suffices, invented datasets, event-driven plumbing for a single-request tool), replace them with the simplest credible approach.
- Distinguish REQUIRED FOR THE MVP from OPTIONAL EMBELLISHMENT. The MVP must remain the smallest version that is still the idea.

ACTIONABILITY
- Do not return fluffy instructions like "Build a beautiful modern app that helps users...". Write something a coding agent can execute: what to build, what NOT to build, the intended UX, MVP boundaries, technical direction, important behavior, and acceptance criteria.
- When the change could land in an existing project, explicitly say to inspect the existing repository before changing code rather than assuming greenfield.
- Name concrete deliverables: screens/flows, components, routes/endpoints, data shapes, error states, and done-means-done checks. Prefer explicit file-level guidance over abstract advice.

ENVIRONMENT
- Prefer sensible defaults for a modern Vercel-compatible web project unless the idea clearly calls for something else (hardware, mobile-only, CLI, bot, extension).
- Favor simplicity, deployability, maintainability, and real MVP scope over architectural theater.
- Do not force a fixed stack where the idea demands another approach. Infer the most sensible implementation and state it plainly.

SECTIONS
- Choose sections dynamically for THIS build. Possible sections: Project, Objective, Product Brief, Core Experience, MVP, Functional Requirements, UX / UI, Technical Approach, Architecture, Data Model, API Contracts, Components, Integrations, Error Handling, Testing, Accessibility, Security, Performance, Non-Goals, Acceptance Criteria.
- Do not force all sections. A tiny toy might need only Project, MVP, Functional Requirements, and Acceptance Criteria. A substantial developer tool may need many. Omit what does not help.
- Keep the full copy-paste prompt as one coherent markdown string plus an optional structured section breakdown mirroring it.

SAFETY
- Stay within safe, lawful, harmless implementation guidance. If the source premise touches anything sensitive, keep the build firmly benign and refuse harmful embellishments.

OUTPUT
- Output MUST be valid JSON matching the requested schema: { title, target, prompt, sections? }. No markdown fences, no prose outside JSON.
- "title" echoes the source idea title (trimmed). "target" must exactly equal the requested target. "prompt" is the complete copy-paste markdown prompt. "sections" optionally mirrors the prompt structure for rendering.`;
}

export function buildBuilderUserPrompt(
  idea: Idea,
  vibe: Vibe,
  target: BuildTarget
): string {
  const sectionsText = idea.sections
    .map((s) => {
      const bullets =
        s.bullets?.length
          ? "\n" + s.bullets.map((b) => `- ${b}`).join("\n")
          : "";
      return `### ${s.title}\n${s.body}${bullets}`;
    })
    .join("\n\n");
  const metadataBits = [
    idea.metadata?.buildDifficulty &&
      `buildDifficulty: ${idea.metadata.buildDifficulty}`,
    idea.metadata?.potential && `potential: ${idea.metadata.potential}`,
    idea.metadata?.nonsenseLevel &&
      `nonsenseLevel: ${idea.metadata.nonsenseLevel}`,
  ].filter(Boolean);
  const tagsLine = idea.tags?.length ? `Tags: ${idea.tags.join(", ")}` : "";
  return `VIBE: ${vibe.toUpperCase()}
TARGET: ${target}
SOURCE IDEA (structured, authoritative — do not fetch or invent another):
Title: ${idea.title}
Premise: ${idea.premise}

${sectionsText}

Verdict summary: ${idea.verdict.summary}
Verdict reasoning: ${idea.verdict.reasoning}
${metadataBits.length ? `Metadata: ${metadataBits.join(" · ")}` : ""}
${tagsLine}

Write the build prompt for target "${target}" as JSON per your instructions. Keep the concept intact, simplify the implementation, and make it immediately actionable.`;
}

/** JSON Schema subset for Gemini responseSchema (builder output). */
export function getBuildPromptResponseSchema() {
  return {
    type: "OBJECT",
    properties: {
      title: { type: "STRING" },
      target: { type: "STRING" },
      prompt: { type: "STRING" },
      sections: {
        type: "ARRAY",
        items: {
          type: "OBJECT",
          properties: {
            title: { type: "STRING" },
            body: { type: "STRING" },
            bullets: { type: "ARRAY", items: { type: "STRING" } },
          },
          required: ["title", "body"],
        },
      },
    },
    required: ["title", "target", "prompt"],
  };
}
