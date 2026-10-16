import type { ButtonHTMLAttributes } from "react";
import { cx } from "../cx";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "line" | "danger";
}

const VARIANTS: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary: "bg-accent text-accent-ink font-semibold hover:brightness-105",
  line: "border border-line text-ink hover:bg-raise",
  danger: "border border-alert/50 text-alert hover:bg-alert-soft",
};

export function Button({ variant = "primary", className, type = "button", ...rest }: ButtonProps) {
  return (
    <button
      type={type}
      className={cx(
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--radius-sm)] px-4 py-2 text-[15px] transition disabled:opacity-40",
        VARIANTS[variant],
        className,
      )}
      {...rest}
    />
  );
}
