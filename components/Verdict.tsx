import type { IdeaVerdict } from "@/lib/schema";

export default function Verdict({ verdict }: { verdict: IdeaVerdict }) {
  return (
    <section
      aria-labelledby="verdict-heading"
      className="relative min-w-0 overflow-hidden rounded-2xl border border-amber-200/20 bg-gradient-to-b from-amber-100/[0.12] to-white/[0.04] p-5 backdrop-blur-xl sm:p-7"
    >
      <p
        id="verdict-heading"
        className="text-[11px] font-semibold uppercase tracking-[0.28em] text-amber-100/70"
      >
        Verdict
      </p>
      <p className="mt-2 break-words text-xl font-bold tracking-tight text-white sm:text-2xl">
        {verdict.summary}
      </p>
      <p className="mt-2 max-w-2xl break-words text-[15px] leading-relaxed text-white/80">
        {verdict.reasoning}
      </p>
    </section>
  );
}
