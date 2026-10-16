// Shared flat config for the whole monorepo. Each workspace runs `eslint .` and ESLint
// walks up to this file.
import js from "@eslint/js";
import nextPlugin from "@next/eslint-plugin-next";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import tseslint from "typescript-eslint";

// Identifiers that must never reach a log line (BUILD.md §0: never log plaintext, keys,
// shares, passphrases or recovery codes). Matched case-insensitively against any
// identifier or member name used as an argument to console.* calls.
const SENSITIVE =
  "/(plaintext|passphrase|password|recovery|secret|share|seed|mnemonic|vmk|idk|privkey|privateKey|wrappingKey|kek|token|payload|key)/i";

const noSensitiveLogging = [
  {
    selector: `CallExpression[callee.object.name='console'] Identifier[name=${SENSITIVE}]`,
    message:
      "Never log keys, shares, passphrases, recovery codes, tokens or plaintext (BUILD.md §0).",
  },
  {
    selector: `CallExpression[callee.object.name='console'] MemberExpression > Identifier.property[name=${SENSITIVE}]`,
    message:
      "Never log keys, shares, passphrases, recovery codes, tokens or plaintext (BUILD.md §0).",
  },
];

// Cryptography lives only in packages/crypto (BUILD.md §0).
const CRYPTO_LIBS = [
  "libsodium-wrappers",
  "libsodium-wrappers-sumo",
  "shamir-secret-sharing",
  "tlock-js",
  "tweetnacl",
  "crypto-js",
  "node-forge",
  "crypto",
  "node:crypto",
];
const noCryptoOutsidePackage = {
  "no-restricted-imports": [
    "error",
    {
      paths: CRYPTO_LIBS.map((name) => ({
        name,
        message: "Cryptography lives only in packages/crypto. Import from @iranti/crypto.",
      })),
      patterns: [
        {
          group: ["@noble/*", "@stablelib/*"],
          message: "Cryptography lives only in packages/crypto. Import from @iranti/crypto.",
        },
      ],
    },
  ],
};
const noSubtleOutsidePackage = {
  selector: "MemberExpression[property.name='subtle']",
  message: "WebCrypto (crypto.subtle) is only used inside packages/crypto.",
};

export default tseslint.config(
  {
    ignores: [
      "**/node_modules/**",
      "**/.next/**",
      "**/out/**",
      "**/dist/**",
      "**/coverage/**",
      "**/.turbo/**",
      "**/playwright-report/**",
      "**/test-results/**",
      "**/src/generated/**",
      "**/next-env.d.ts",
      "docs/**",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      "no-console": ["error", { allow: ["warn", "error"] }],
      "no-restricted-syntax": ["error", ...noSensitiveLogging, noSubtleOutsidePackage],
      ...noCryptoOutsidePackage,
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/consistent-type-imports": "error",
    },
  },
  {
    // The crypto package is the one place primitives may be used, and it never logs.
    files: ["packages/crypto/**/*.ts"],
    rules: {
      "no-console": "error",
      "no-restricted-imports": "off",
      "no-restricted-syntax": ["error", ...noSensitiveLogging],
    },
  },
  {
    files: ["apps/web/**/*.{ts,tsx}", "packages/ui/**/*.{ts,tsx}"],
    plugins: { "react-hooks": reactHooks, "@next/next": nextPlugin },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs["core-web-vitals"].rules,
      // Static export: there is no image optimiser. App Router only: no pages directory.
      "@next/next/no-img-element": "off",
      "@next/next/no-html-link-for-pages": "off",
    },
  },
  {
    files: [
      "**/*.config.{js,mjs,ts}",
      "scripts/**/*.mjs",
      "**/scripts/**/*.mjs",
      "**/e2e/**/*.mjs",
    ],
    rules: { "no-console": "off" },
  },
  {
    // Build tooling, not vault cryptography: SHA-256 of shipped inline scripts for the CSP
    // and a cache version for the service worker. Never runs in the app.
    files: ["apps/web/scripts/postbuild.mjs"],
    rules: { "no-restricted-imports": "off" },
  },
);
