import { ImageResponse } from "next/og";
import { tokens } from "@iranti/ui";

// Generated at build time into the static export (BUILD.md §12).
export const dynamic = "force-static";
export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon() {
  const t = tokens.dark;
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: t.bg,
        borderRadius: 112,
      }}
    >
      <svg width="380" height="380" viewBox="0 0 32 32">
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
    </div>,
    size,
  );
}
