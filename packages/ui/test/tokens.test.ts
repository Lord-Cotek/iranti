import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { tokens } from "../src/tokens";

const css = readFileSync(new URL("../src/tokens.css", import.meta.url), "utf8");

function block(selector: string): string {
  const start = css.indexOf(`${selector} {`);
  expect(start, `${selector} block present`).toBeGreaterThanOrEqual(0);
  return css.slice(start, css.indexOf("}", start));
}

describe("tokens.css matches tokens.ts (BUILD.md §12)", () => {
  for (const [theme, selector] of [
    ["dark", ":root"],
    ["light", ':root[data-theme="light"]'],
  ] as const) {
    it(`${theme} theme`, () => {
      const body = block(selector);
      for (const [name, hex] of Object.entries(tokens[theme])) {
        expect(body.toLowerCase()).toContain(`--${name}: ${hex.toLowerCase()};`);
      }
    });
  }
});
