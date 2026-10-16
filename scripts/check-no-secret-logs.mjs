#!/usr/bin/env node
// Belt-and-braces check alongside the ESLint rule: scan source for logging or error-reporting
// calls whose arguments mention sensitive material. BUILD.md §0: never log plaintext, keys,
// shares, passphrases or recovery codes, in console, Sentry, analytics or server logs.
//
// Usage: node scripts/check-no-secret-logs.mjs  (exit 1 on any finding)
// Escape hatch for a reviewed false positive: put `// secret-log-ok: <reason>` on the line.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const SCAN_DIRS = ["apps", "packages"];
const SKIP_DIRS = new Set([
  "node_modules",
  ".next",
  "out",
  "dist",
  "coverage",
  ".turbo",
  "generated",
  "playwright-report",
  "test-results",
]);
const EXTENSIONS = /\.(ts|tsx|js|mjs|cjs|jsx)$/;

// Calls that emit to a log sink or a third party.
const SINKS =
  /\b(console\.(log|info|warn|error|debug|trace)|Sentry\.(captureMessage|captureException|addBreadcrumb|setContext|setExtra)|logger\.(log|info|warn|error|debug)|posthog\.capture|plausible)\s*\(/;
const SENSITIVE =
  /(plaintext|passphrase|password|recovery|secret|share|seed|mnemonic|\bvmk\b|\bidk\b|privkey|privateKey|wrappingKey|\bkek\b|token|payload)/i;

function walk(dir, out) {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const path = join(dir, name);
    const st = statSync(path);
    if (st.isDirectory()) walk(path, out);
    else if (EXTENSIONS.test(name)) out.push(path);
  }
  return out;
}

const findings = [];
for (const d of SCAN_DIRS) {
  let files = [];
  try {
    files = walk(join(ROOT, d), []);
  } catch {
    continue;
  }
  for (const file of files) {
    const lines = readFileSync(file, "utf8").split("\n");
    lines.forEach((line, i) => {
      if (line.includes("secret-log-ok:")) return;
      const m = SINKS.exec(line);
      if (!m) return;
      // Only look at the text after the call opens, so `logger.info("ok")` next to an
      // unrelated variable name elsewhere on the line is not flagged.
      const args = line.slice(m.index + m[0].length);
      if (SENSITIVE.test(args)) {
        findings.push(`${relative(ROOT, file)}:${i + 1}: ${line.trim()}`);
      }
    });
  }
}

if (findings.length) {
  console.error("Possible sensitive data in a log or error-report call (BUILD.md §0):\n");
  for (const f of findings) console.error("  " + f);
  console.error(
    "\nRemove it, or mark a reviewed false positive with `// secret-log-ok: <reason>`.",
  );
  process.exit(1);
}
console.log("check-no-secret-logs: clean");
