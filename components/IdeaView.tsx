import type { Idea } from "@/lib/schema";
import type { Vibe } from "@/lib/vibes";
import IdeaSection from "./IdeaSection";
import Verdict from "./Verdict";

export default function IdeaView({ idea, vibe }: { idea: Idea; vibe: Vibe }) {
  const metaBits = [
    idea.metadata?.buildDifficulty && `Build · ${idea.metadata.buildDifficulty}`,
    idea.metadata?.potential && `Potential · ${idea.metadata.potential}`,
    idea.metadata?.nonsenseLevel && `Nonsense · ${idea.metadata.nonsenseLevel}`,
  ].filter(Boolean) as string[];

  return (
    <article
      aria-label={`Generated idea: ${idea.title}`}
      className="reveal flex w-full min-w-0 flex-col gap-4"
    >
      <header className="glass w-full min-w-0 rounded-[28px] p-6 sm:p-10">
        <p className="text-balance text-[10px] font-semibold uppercase tracking-[0.22em] text-white/65 sm:text-[11px] sm:tracking-[0.3em]">
          {vibe} vibe · fresh from the muse
        </p>
        <h2
          id="vibe-result-title"
          tabIndex={-1}
          className="mt-3 min-w-0 scroll-mt-8 break-words text-[clamp(1.9rem,5.5vw,3.4rem)] font-extrabold leading-[1.02] tracking-tight text-white outline-none"
        >
          {idea.title}
        </h2>
        <p className="mt-3 max-w-2xl break-words text-[clamp(1rem,2.5vw,1.25rem)] leading-relaxed text-white/75">
          {idea.premise}
        </p>
        {(metaBits.length > 0 || idea.tags?.length) && (
          <div className="mt-5 flex min-w-0 flex-wrap gap-2">
            {metaBits.map((m) => (
              <span
                key={m}
                className="max-w-full break-words rounded-full border border-white/15 bg-white/[0.07] px-3.5 py-1.5 text-[12.5px] font-medium text-white/70"
              >
                {m}
              </span>
            ))}
            {idea.tags?.map((t) => (
              <span
                key={t}
                className="max-w-full break-words rounded-full px-3.5 py-1.5 text-[12.5px] text-white/60"
              >
                #{t}
              </span>
            ))}
          </div>
        )}
      </header>

      <div className="grid min-w-0 gap-3 sm:gap-4">
        {idea.sections.map((s, i) => (
          <IdeaSection key={`${s.title}-${i}`} section={s} index={i} />
        ))}
      </div>

      <Verdict verdict={idea.verdict} />
    </article>
  );
}
