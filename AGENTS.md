# AGENTS.md — Give Me a Vibe (baseline)

## What this is

Single-purpose internet toy: pick a vibe, press one button, get one Gemini-generated product concept with a critical verdict. Ephemeral — no accounts, DB, history, or idea repository.

## Commands

```bash
npm install
npm run dev      # http://localhost:3000
npm run lint
npm run build
npm test         # vitest run
```

Needs `GEMINI_API_KEY` (+ optional `GEMINI_MODEL`) in `.env` for local generation. Never commit `.env`.

## Architecture

- `app/page.tsx` — `IDLE → GENERATING → RESULT | ERROR` state machine.
- `app/api/vibe/route.ts` — core generation (server-side Gemini, JSON mode + Zod via `lib/schema.ts`).
- `app/api/build-prompt/route.ts` — opt-in second call, revalidates the idea, returns a coding-agent prompt.
- `lib/prompt.ts` / `lib/buildPrompt.ts` — system prompts. `lib/rateLimit.ts` — shared in-memory per-IP throttle.
- `components/` — `VibeSelector, GenerateButton, GenerationState, IdeaView, IdeaSection, Verdict, BuildPrompt, ShareActions, ImageExport, ErrorState`.

## Rules for future work

- Keep the Gemini key server-side only (never `NEXT_PUBLIC_`). Validate model output with Zod before rendering; render as text, never `dangerouslySetInnerHTML`.
- Never add a hardcoded idea list, topic list, or templates to "fix" variety — use prompt seed material only.
- Keep the generating vibe pinned to the result (`{ name: "result", idea, vibe }`); selector changes must not rewrite frozen artifacts.
- No accounts, DB, history, or persistent share links. Share/export stays client-side.
- Match the deadpan error states (`The vibe escaped.`, `The muse needs a breather.`, `The image refused to cooperate.`); never surface raw API errors.
- Deployment hygiene: `.env*`, `.next/`, `.visual-qa/`, and `INIT-PROMPT.txt` / `GAP-REPORT.md` / `VISUAL-QA-REPORT.md` stay out of git.
