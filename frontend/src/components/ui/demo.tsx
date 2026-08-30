"use client";

import { LuminousTopography } from "./luminous-topography";

export default function LuminousTopographyDemo() {
  return (
    <div className="relative w-full overflow-hidden rounded-2xl">
      <LuminousTopography
        className="absolute inset-0"
        density={16}
        depth={0.9}
        drift={0.7}
        intensity={1}
        interactive
        safeArea={{ x: 0.08, y: 0.25, w: 0.84, h: 0.5 }}
      />

      <div className="relative flex min-h-[420px] flex-col items-center justify-center gap-4 px-8 text-center">
        <span className="rounded-full border border-[var(--motiq-border)] px-3 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--motiq-muted)]">
          Backgrounds
        </span>
        <h2 className="max-w-lg text-4xl font-semibold tracking-tight text-[var(--motiq-fg)]">
          Luminous Topography
        </h2>
        <p className="max-w-md text-sm text-[var(--motiq-fg-secondary)]">
          Drifting contour lines that brighten around the cursor. No canvas, no
          dependencies — and it parks itself when scrolled offscreen.
        </p>
      </div>
    </div>
  );
}
