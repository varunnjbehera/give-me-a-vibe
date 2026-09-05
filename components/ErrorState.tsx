"use client";

export default function ErrorState({
  onRetry,
  loading,
  code,
  retryAfter,
}: {
  onRetry: () => void;
  loading: boolean;
  code?: string;
  retryAfter?: number;
}) {
  const throttled = code === "RATE_LIMITED";
  return (
    <div
      role="alert"
      className="glass flex w-full flex-col items-center gap-4 rounded-[28px] px-8 py-12 text-center"
    >
      <p className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
        {throttled ? "The muse needs a breather." : "The vibe escaped."}
      </p>
      <p className="max-w-sm text-[15px] leading-relaxed text-white/65">
        {throttled ? (
          <>
            Too many vibes, too fast.
            {typeof retryAfter === "number" && retryAfter > 0
              ? ` Give it ${retryAfter}s, then try again.`
              : ` Give it a moment, then try again.`}{" "}
            No quota was harmed beyond this warning.
          </>
        ) : (
          <>The generator failed. No idea was harmed. Try again — the muse is unreliable but persistent.</>
        )}
      </p>
      <button
        onClick={onRetry}
        disabled={loading}
        className="mt-2 rounded-full border border-white/25 bg-white/[0.12] px-8 py-3.5 text-sm font-bold uppercase tracking-[0.2em] text-white backdrop-blur-xl transition hover:bg-white/[0.2] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:opacity-60"
      >
        {loading ? "Retrying…" : "Try again"}
      </button>
    </div>
  );
}
