export const BUILD_TARGETS = [
  "generic",
  "open-code",
  "claude-code",
  "codex",
  "cursor",
] as const;

export type BuildTarget = (typeof BUILD_TARGETS)[number];

export const BUILD_TARGET_META: Record<BuildTarget, { label: string }> = {
  generic: { label: "Generic" },
  "open-code": { label: "Open Code" },
  "claude-code": { label: "Claude Code" },
  codex: { label: "Codex" },
  cursor: { label: "Cursor" },
};

export function isBuildTarget(value: unknown): value is BuildTarget {
  return (
    typeof value === "string" &&
    (BUILD_TARGETS as readonly string[]).includes(value)
  );
}
