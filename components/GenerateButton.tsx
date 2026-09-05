"use client";

export default function GenerateButton({
  loading,
  onPress,
}: {
  loading: boolean;
  onPress: () => void;
}) {
  return (
    <button
      onClick={onPress}
      disabled={loading}
      aria-busy={loading}
      className={[
        "relative w-full overflow-hidden rounded-[28px] px-8 py-7 sm:py-8",
        "text-center transition-transform duration-200 active:scale-[0.985]",
        "focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white",
        loading ? "cursor-wait" : "cursor-pointer hover:scale-[1.005]",
        "border border-white/25 bg-gradient-to-b from-white/[0.22] to-white/[0.08]",
        "shadow-[0_20px_80px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.35)] backdrop-blur-2xl",
      ].join(" ")}
    >
      {/* sheen sweep while generating */}
      {loading && (
        <span
          aria-hidden
          className="sheen pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent"
        />
      )}
      <span className="block text-[12px] font-semibold uppercase tracking-[0.32em] text-white/65">
        {loading ? "Finding your vibe" : "Press for destiny"}
      </span>
      <span className="mt-2 block text-balance text-[clamp(1.65rem,7vw,3.75rem)] font-bold leading-[1.02] tracking-tight text-white">
        {loading ? (
          <span className="pulse-soft inline-block">SURPRISE ME</span>
        ) : (
          "SURPRISE ME"
        )}
      </span>
      <span className="sr-only">{loading ? "Generating, please wait" : "Get a new idea to build"}</span>
    </button>
  );
}
