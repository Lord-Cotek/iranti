import type { SVGAttributes } from "react";

export interface MarkProps extends SVGAttributes<SVGSVGElement> {
  size?: number;
  ring?: string;
  flame?: string;
  title?: string;
}

/**
 * Placeholder mark: an open ring (COTEK family) cradling a small flame, remembrance kept.
 * The commissioned mark replaces this (BUILD.md §19.6).
 */
export function Mark({
  size = 32,
  ring = "var(--accent2)",
  flame = "var(--accent)",
  title,
  ...rest
}: MarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      {...rest}
    >
      {title ? <title>{title}</title> : null}
      {/* Ring open at the top: an arc from about 1 o'clock round to 11 o'clock. */}
      <path
        d="M20.1 5.4A12 12 0 1 1 11.9 5.4"
        fill="none"
        stroke={ring}
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d="M16 8.5c2.6 3.2 3.9 5.4 3.9 7.7a3.9 3.9 0 0 1-7.8 0c0-2.3 1.3-4.5 3.9-7.7z"
        fill={flame}
      />
    </svg>
  );
}
