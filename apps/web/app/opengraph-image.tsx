import { ImageResponse } from "next/og";
import { tokens } from "@iranti/ui";

export const dynamic = "force-static";
export const alt = "Ìrántí. Leave your family clarity, not chaos.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  const t = tokens.dark;
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 80,
        background: t.bg,
        color: t.ink,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
        <svg width="88" height="88" viewBox="0 0 32 32">
          <path
            d="M20.1 5.4A12 12 0 1 1 11.9 5.4"
            fill="none"
            stroke={t.accent2}
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          <path
            d="M16 8.5c2.6 3.2 3.9 5.4 3.9 7.7a3.9 3.9 0 0 1-7.8 0c0-2.3 1.3-4.5 3.9-7.7z"
            fill={t.accent}
          />
        </svg>
        <div style={{ fontSize: 56 }}>Ìrántí</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div style={{ fontSize: 76, lineHeight: 1.05, maxWidth: 900 }}>
          Leave your family clarity, not chaos.
        </div>
        <div style={{ fontSize: 30, color: t.muted }}>
          Locked on your device. Opened only by the people you chose.
        </div>
      </div>
    </div>,
    size,
  );
}
