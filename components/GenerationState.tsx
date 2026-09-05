"use client";

import { useEffect, useState } from "react";
import type { Vibe } from "@/lib/vibes";

const PHRASES: Record<Vibe, string[]> = {
  useful: ["auditing workflows…", "checking moats…", "deleting dashboards…", "finding the annoyance…"],
  weird: ["combining odd domains…", "tilting the premise…", "questioning normal…", "wiring strange inputs…"],
  absurd: ["inflating nonsense…", "cursing the UX…", "escalating pointlessly…", "ignoring restraint…"],
  satirical: ["scheduling alignment…", "decking the pitch…", "disrupting synergy…", "circling back…"],
};

export default function GenerationState({ vibe }: { vibe: Vibe }) {
  const [i, setI] = useState(0);
  const phrases = PHRASES[vibe];

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => setI((v) => (v + 1) % phrases.length), 900);
    return () => clearInterval(t);
  }, [phrases.length]);

  return (
    <div
      role="status"
      aria-label="Generating idea"
      className="glass flex w-full flex-col items-center gap-5 rounded-[28px] px-8 py-12 text-center"
    >
      <div className="flex gap-2" aria-hidden>
        {[0, 1, 2].map((d) => (
          <span
            key={d}
            className="orb-dot h-2.5 w-2.5 rounded-full bg-white/80"
            style={{ animationDelay: `${d * 0.22}s` }}
          />
        ))}
      </div>
      <p className="text-sm uppercase tracking-[0.28em] text-white/65">Finding a vibe</p>
      <p key={i} className="fade-swap text-2xl font-semibold tracking-tight text-white sm:text-3xl">
        {phrases[i]}
      </p>
      <p className="max-w-sm text-sm leading-relaxed text-white/65">
        Consulting the muse. Judging your future startup. No forms were harmed.
      </p>
    </div>
  );
}
