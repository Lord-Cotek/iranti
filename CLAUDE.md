# Working on Ìrántí

Read `docs/BUILD.md` before any phase; it is the plan. `docs/PROGRESS.md` says where we are.

- Work directly on `main` and push to `main` (Temi's instruction, 16 Oct 2026). No feature
  branches unless asked.
- One phase at a time. A phase ends with typecheck, lint, tests and build clean, a commit
  `feat: phase N — <summary>`, an updated `docs/PROGRESS.md`, then stop for review.
- Cryptography lives only in `packages/crypto` and follows `docs/CRYPTO.md`. No hand-rolled
  primitives. Every crypto function gets tests, including tamper tests. ESLint enforces the
  boundary.
- Never log plaintext, keys, shares, passphrases, recovery codes or tokens (ESLint rule +
  `pnpm check:secrets`).
- Every secret goes in `.env.example` with a comment; never in code.
- `docs/PRIVACY_POLICY.md` must stay true of the code.
- Ask before destructive actions (data-dropping migrations, deleting files, force pushes).

Commands: `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`,
`pnpm --filter @iranti/web e2e`. In the cloud dev container, set
`NODE_EXTRA_CA_CERTS=/root/.ccr/ca-bundle.crt` so next/font can fetch Google Fonts.
