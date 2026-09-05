import type { Idea } from "@/lib/schema";
import type { Vibe } from "@/lib/vibes";
import { VIBE_META } from "@/lib/vibes";
import { pickShareDetails, shareTitleFontSize, truncateForCard } from "@/lib/shareDetails";

/**
 * Curated, off-screen editorial card for image export.
 * Deliberately NOT a screenshot: branding + title + premise + 1–2 notable
 * details (curated from the dynamic sections) + verdict + vibe.
 * Rendered at 1200px-wide social-card proportions for html-to-image.
 *
 * `vibe` must be the vibe that GENERATED the idea (pinned at generation
 * time), never the live selector value — see page.tsx result state.
 */

export default function ImageExportCard({
  idea,
  vibe,
  innerRef,
}: {
  idea: Idea;
  vibe: Vibe;
  innerRef: React.Ref<HTMLDivElement>;
}) {
  const details = pickShareDetails(idea);
  const titleSize = shareTitleFontSize(idea.title);

  return (
    <div aria-hidden className="pointer-events-none absolute -left-[9999px] top-0">
      <div
        ref={innerRef}
        style={{
          width: 1200,
          minHeight: 630,
          boxSizing: "border-box",
          padding: 64,
          paddingBottom: 56,
          background: "#0b0d13",
          color: "#fff",
          overflow: "hidden",
          wordWrap: "break-word",
          overflowWrap: "break-word",
        }}
      >
        <div style={{ fontSize: 22, letterSpacing: "0.35em", opacity: 0.6, fontWeight: 700 }}>
          GIVE ME A VIBE
        </div>
        <div
          style={{
            display: "inline-block",
            marginTop: 20,
            fontSize: 20,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            // Short label pill must never wrap: the card root sets
            // break-word wrapping for long titles, which html-to-image's
            // SVG pipeline can otherwise apply mid-word here ("WEIR"+"D").
            whiteSpace: "nowrap",
            border: "1px solid rgba(255,255,255,0.3)",
            borderRadius: 999,
            padding: "8px 20px",
            opacity: 0.9,
          }}
        >
          {VIBE_META[vibe].label}
        </div>
        <div
          style={{
            marginTop: 28,
            fontSize: titleSize,
            fontWeight: 800,
            lineHeight: 1.05,
            letterSpacing: "-0.03em",
            display: "-webkit-box",
            WebkitLineClamp: 3,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {truncateForCard(idea.title, 120)}
        </div>
        <div
          style={{
            marginTop: 20,
            fontSize: 30,
            lineHeight: 1.35,
            opacity: 0.82,
            maxWidth: 1000,
            display: "-webkit-box",
            WebkitLineClamp: 3,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {truncateForCard(idea.premise, 200)}
        </div>
        {details.length > 0 && (
          <div style={{ marginTop: 28, display: "flex", flexDirection: "column", gap: 10 }}>
            {details.map((d, i) => (
              <div key={i} style={{ display: "flex", gap: 12, fontSize: 24, lineHeight: 1.4 }}>
                <span style={{ opacity: 0.5 }}>•</span>
                <span
                  style={{
                    opacity: 0.88,
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}
                >
                  {d}
                </span>
              </div>
            ))}
          </div>
        )}
        <div
          style={{
            marginTop: 36,
            borderTop: "1px solid rgba(255,255,255,0.18)",
            paddingTop: 28,
          }}
        >
          <div style={{ fontSize: 20, letterSpacing: "0.3em", opacity: 0.6, fontWeight: 700 }}>
            VERDICT
          </div>
          <div
            style={{
              marginTop: 10,
              fontSize: 32,
              fontWeight: 700,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {truncateForCard(idea.verdict.summary, 140)}
          </div>
          <div
            style={{
              marginTop: 8,
              fontSize: 23,
              opacity: 0.75,
              lineHeight: 1.4,
              display: "-webkit-box",
              WebkitLineClamp: 3,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {truncateForCard(idea.verdict.reasoning, 260)}
          </div>
        </div>
      </div>
    </div>
  );
}
