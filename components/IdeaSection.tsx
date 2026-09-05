import type { IdeaSection as Section } from "@/lib/schema";

export default function IdeaSection({ section, index }: { section: Section; index: number }) {
  return (
    <section
      aria-labelledby={`section-${index}`}
      className="min-w-0 rounded-2xl border border-white/10 bg-white/[0.045] p-5 backdrop-blur-xl sm:p-6"
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/60">
        {String(index + 1).padStart(2, "0")}
      </p>
      <h3 id={`section-${index}`} className="mt-1 break-words text-lg font-semibold tracking-tight text-white">
        {section.title}
      </h3>
      <p className="mt-2 break-words text-[15px] leading-relaxed text-white/80">{section.body}</p>
      {section.bullets?.length ? (
        <ul className="mt-3 space-y-1.5">
          {section.bullets.map((b, i) => (
            <li key={i} className="flex gap-2.5 text-[14px] leading-relaxed text-white/70">
              <span aria-hidden className="mt-[9px] h-1 w-1 shrink-0 rounded-full bg-white/50" />
              <span className="min-w-0 break-words">{b}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
