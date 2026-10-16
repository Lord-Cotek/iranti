import type { HTMLAttributes } from "react";
import { cx } from "../cx";

export function Card({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cx("rounded-[var(--radius-lg)] border border-line bg-surface p-5", className)}
      {...rest}
    />
  );
}
