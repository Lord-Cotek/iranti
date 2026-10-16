import type { HTMLAttributes } from "react";
import { cx } from "../cx";
import type { EyebrowLabel } from "../tokens";

export interface EyebrowProps extends HTMLAttributes<HTMLParagraphElement> {
  children: EyebrowLabel | (string & {});
}

/** Small mono uppercase label above a heading: WHO, WHAT, WISHES, WORDS, PROTOCOL, EXECUTOR. */
export function Eyebrow({ className, ...rest }: EyebrowProps) {
  return (
    <p
      className={cx(
        "font-mono text-[13px] font-medium uppercase tracking-[0.14em] text-accent",
        className,
      )}
      {...rest}
    />
  );
}
