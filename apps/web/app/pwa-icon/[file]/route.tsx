import { ImageResponse } from "next/og";
import { tokens } from "@iranti/ui";

// PWA icons, generated at build time into the static export as real .png files.
export const dynamic = "force-static";

const FILES = {
  "192.png": { px: 192, maskable: false },
  "512.png": { px: 512, maskable: false },
  "maskable-512.png": { px: 512, maskable: true },
};

export function generateStaticParams() {
  return Object.keys(FILES).map((file) => ({ file }));
}

export async function GET(_req: Request, { params }: { params: Promise<{ file: string }> }) {
  const spec = FILES[(await params).file as keyof typeof FILES] ?? FILES["512.png"];
  const { px, maskable } = spec;
  const t = tokens.dark;
  // Maskable icons keep the mark inside the central safe zone.
  const markSize = Math.round(px * (maskable ? 0.56 : 0.74));
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: t.bg,
        borderRadius: maskable ? 0 : Math.round(px * 0.22),
      }}
    >
      <svg width={markSize} height={markSize} viewBox="0 0 32 32">
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
    { width: px, height: px },
  );
}
