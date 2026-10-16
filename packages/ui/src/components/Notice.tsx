import type { HTMLAttributes } from "react";
import { cx } from "../cx";

/**
 * A boxed message. Tones follow the state colours (BUILD.md §12): `safe` (sage) means armed
 * and safe, `action` (candle) means something to do, `alert` is reserved for release states
 * and real errors. `plain` is neutral.
 */
export interface NoticeProps extends HTMLAttributes<HTMLDivElement> {
  tone?: "plain" | "safe" | "action" | "alert";
}

const TONES = {
  plain: "border-line bg-surface",
  safe: "border-accent2/40 bg-accent2-soft",
  action: "border-accent/40 bg-accent-soft",
  alert: "border-alert/50 bg-alert-soft",
};

export function Notice({ tone = "plain", className, ...rest }: NoticeProps) {
  return (
    <div
      role={tone === "alert" ? "alert" : undefined}
      className={cx("rounded-[var(--radius)] border px-4 py-3 text-[16px]", TONES[tone], className)}
      {...rest}
    />
  );
}
