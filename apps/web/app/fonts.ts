import { IBM_Plex_Mono, IBM_Plex_Sans, Literata, Playfair_Display } from "next/font/google";

// Every face loads the `vietnamese` subset: it carries the Latin Extended Additional range
// (ẹ, ọ, Ẹ, Ọ) and the combining marks Yoruba stacks on them (ẹ́, ọ̀). BUILD.md §12.
// next/font needs literal options, so the subset list is repeated rather than shared.

export const display = Playfair_Display({
  subsets: ["latin", "latin-ext", "vietnamese"],
  weight: ["500", "600"],
  variable: "--font-display",
  display: "swap",
});

export const ui = IBM_Plex_Sans({
  subsets: ["latin", "latin-ext", "vietnamese"],
  weight: ["400", "500", "600"],
  variable: "--font-ui",
  display: "swap",
});

export const mono = IBM_Plex_Mono({
  subsets: ["latin", "latin-ext", "vietnamese"],
  weight: ["400", "500"],
  variable: "--font-mono",
  display: "swap",
});

export const read = Literata({
  subsets: ["latin", "latin-ext", "vietnamese"],
  weight: ["400", "500"],
  style: ["normal", "italic"],
  variable: "--font-read",
  display: "swap",
});

export const fontVariables = [display.variable, ui.variable, mono.variable, read.variable].join(
  " ",
);
