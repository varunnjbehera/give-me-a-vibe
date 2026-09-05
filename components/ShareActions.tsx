"use client";

import { useState } from "react";
import type { Idea } from "@/lib/schema";
import { ideaToMarkdown, shareText } from "@/lib/markdown";
import { canNativeShare, copyToClipboard, nativeShare } from "@/lib/share";
import type { Vibe } from "@/lib/vibes";

export default function ShareActions({
  idea,
  vibe,
  onExportImage,
  exporting,
}: {
  idea: Idea;
  vibe: Vibe;
  onExportImage: () => void;
  exporting: boolean;
}) {
  const [note, setNote] = useState<string | null>(null);

  async function flash(msg: string) {
    setNote(msg);
    setTimeout(() => setNote(null), 2200);
  }

  async function handleCopyMarkdown() {
    const ok = await copyToClipboard(ideaToMarkdown(idea, vibe));
    await flash(ok ? "Copied as Markdown." : "Copy failed — select and copy manually.");
  }

  async function handleShare() {
    if (!canNativeShare()) {
      const ok = await copyToClipboard(shareText(idea));
      await flash(ok ? "Share unavailable — summary copied." : "Share unavailable on this device.");
      return;
    }
    try {
      const res = await nativeShare({
        title: idea.title,
        text: shareText(idea),
      });
      if (res === "shared") await flash("Shared.");
    } catch {
      await flash("Share failed. Try copying instead.");
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <button
          onClick={handleCopyMarkdown}
          className="action-btn"
        >
          Copy Markdown
        </button>
        <button onClick={handleShare} className="action-btn">
          Share
        </button>
        <button onClick={onExportImage} disabled={exporting} className="action-btn disabled:opacity-60">
          {exporting ? "Rendering…" : "Save image"}
        </button>
      </div>
      <p role="status" aria-live="polite" className="min-h-[1.25rem] text-center text-[13px] text-white/65">
        {note ?? ""}
      </p>
    </div>
  );
}
