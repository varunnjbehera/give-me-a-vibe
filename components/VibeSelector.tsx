"use client";

import { VIBES, VIBE_META, type Vibe } from "@/lib/vibes";

export default function VibeSelector({
  value,
  onChange,
  disabled,
}: {
  value: Vibe;
  onChange: (v: Vibe) => void;
  disabled?: boolean;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Choose a vibe"
      className="grid w-full grid-cols-2 gap-2 sm:grid-cols-4"
    >
      {VIBES.map((v) => {
        const selected = v === value;
        return (
          <button
            key={v}
            role="radio"
            aria-checked={selected}
            disabled={disabled}
            onClick={() => onChange(v)}
            onKeyDown={(e) => {
              // Arrow-key navigation across the radio group (both axes).
              if (
                e.key !== "ArrowRight" &&
                e.key !== "ArrowLeft" &&
                e.key !== "ArrowDown" &&
                e.key !== "ArrowUp"
              )
                return;
              e.preventDefault();
              const i = VIBES.indexOf(v);
              const forward = e.key === "ArrowRight" || e.key === "ArrowDown";
              const next = VIBES[(i + (forward ? 1 : VIBES.length - 1)) % VIBES.length];
              onChange(next);
              document.getElementById(`vibe-${next}`)?.focus();
            }}
            id={`vibe-${v}`}
            className={[
              "group rounded-2xl border px-4 py-3 text-left backdrop-blur-xl transition-all duration-200",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white",
              selected
                ? "border-white/40 bg-white/[0.14] shadow-[0_8px_32px_rgba(0,0,0,0.35)]"
                : "border-white/12 bg-white/[0.05] hover:border-white/25 hover:bg-white/[0.09]",
              disabled ? "cursor-wait opacity-60" : "cursor-pointer",
            ].join(" ")}
          >
            <span
              className={`block text-[11px] font-semibold uppercase tracking-[0.18em] ${
                selected ? "text-white" : "text-white/60 group-hover:text-white/85"
              }`}
            >
              {VIBE_META[v].label}
            </span>
            <span className="mt-1 block text-[13px] leading-snug text-white/65">
              {VIBE_META[v].hint}
            </span>
          </button>
        );
      })}
    </div>
  );
}
