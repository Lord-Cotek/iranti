import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { fontVariables } from "./fonts";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://iranti.cotek.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Ìrántí · Leave your family clarity, not chaos",
    template: "%s · Ìrántí",
  },
  description:
    "Ìrántí keeps what your family would need if you died: who to call, what you own, what you want, and letters to the people you love. Locked on your device; nobody at COTEK can read it.",
  applicationName: "Ìrántí",
  openGraph: {
    type: "website",
    siteName: "Ìrántí",
    url: siteUrl,
  },
  twitter: { card: "summary_large_image" },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#0E0F14",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    // dir="ltr" today; layouts use logical properties so Arabic (Phase 9) can flip it.
    <html lang="en" dir="ltr" className={fontVariables}>
      <body>{children}</body>
    </html>
  );
}
