/**
 * Design tokens, "dusk and candle" (BUILD.md §12). tokens.css is the runtime source; this
 * mirror exists for places CSS variables cannot reach (next/og images, native splash,
 * tests). A test keeps the two in sync.
 *
 * State colours carry state only: sage = armed and safe, candle = action needed,
 * alert = a release is in progress. Never decorative.
 */
export const tokens = {
  dark: {
    bg: "#0E0F14",
    surface: "#16181F",
    ink: "#ECE7DD",
    muted: "#8C8A85",
    border: "#262833",
    accent: "#E2B65A",
    accent2: "#7E9C8A",
    alert: "#D9735B",
  },
  light: {
    bg: "#F5F1EA",
    surface: "#FFFFFF",
    ink: "#23211D",
    muted: "#6E6A63",
    border: "#E2DBCF",
    accent: "#B8862E",
    accent2: "#5F7E6C",
    alert: "#B85A44",
  },
} as const;

export type Theme = keyof typeof tokens;
export type TokenName = keyof (typeof tokens)["dark"];

/** Section eyebrows (§12). */
export const EYEBROWS = ["WHO", "WHAT", "WISHES", "WORDS", "PROTOCOL", "EXECUTOR"] as const;
export type EyebrowLabel = (typeof EYEBROWS)[number];
