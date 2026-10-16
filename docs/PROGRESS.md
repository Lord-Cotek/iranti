# Progress

## Phase 0: Foundations · 16 October 2026 · awaiting review

### Built

- **Monorepo:** pnpm 10 workspaces + Turborepo 2; shared `tsconfig.base.json` (strict,
  `noUncheckedIndexedAccess`), ESLint 9 flat config, Prettier, Vitest 4, Playwright, GitHub
  Actions CI (typecheck, lint, secret-log check, format, unit tests, build, e2e).
- **`apps/web`:** Next.js 15.5 App Router, `output: 'export'` → `out/`, `images.unoptimized`,
  Tailwind 4 with the §12 tokens, next/font with the `vietnamese` subset for Playfair Display,
  IBM Plex Sans, IBM Plex Mono and Literata. Marketing placeholder at `/`. Favicon and Open
  Graph image generated with `next/og` at build time. robots/sitemap (product, executor and
  recipient paths disallowed). Baseline security headers and CSP in `vercel.json`.
  Playwright e2e on the exported site: content, no horizontal scroll at 360 px, and a check
  that each self-hosted face actually covers ẹ ọ Ẹ Ọ and the combining marks.
- **`apps/api`:** Next.js 15.5, route handlers only. `GET /api/health` (DB probe, 503 when the
  DB errors), exact-match CORS allowlist (web origin and Capacitor origins, credentials, no
  wildcard), security headers, lazily validated env. Prisma 7 + Neon driver adapter (pooled
  `DATABASE_URL` at runtime, `DIRECT_URL` for migrations). Full schema from §15 with the
  refinements below. No migration yet (no database connected).
- **`packages/crypto`:** libsodium-wrappers-sumo, shamir-secret-sharing, tlock-js installed.
  `encrypt`/`decrypt` (XChaCha20-Poly1305 with mandatory AD), `encodeAd` (length-prefixed,
  purpose-separated), base64/UTF-8 helpers, `constantTimeEqual`, `wipe`, `CryptoError` with
  fixed messages. 19 tests: round trip, property round trip through base64, every-bit tamper
  of ciphertext and tag, nonce tamper, truncation, wrong key, AD swap across item, vault,
  revision and purpose, committed AD vector (independently recomputed), AD injectivity
  property, library smoke tests.
- **`packages/core`:** vault sections and item types (§5), default tiers, server-visible item
  record schema, first payload schemas (person, bank account, will, sealed note), typed API
  client with Zod-parsed responses and bearer-token support.
- **`packages/ui`:** tokens (CSS + TS mirror, kept in sync by a test), Eyebrow, Card, Button,
  placeholder Mark (open ring + flame).
- **`packages/playbooks`:** playbook schema; "reviewed" is only valid with a reviewer and date.
- **Guards:** ESLint blocks crypto library imports and `crypto.subtle` outside
  `packages/crypto`; ESLint and `scripts/check-no-secret-logs.mjs` block logging of
  identifiers that look like keys, shares, passphrases, tokens or plaintext (both verified
  against a planted violation).
- **Docs:** `THREAT_MODEL.md`, `CRYPTO.md`, root `.env.example`.

### Decisions (recorded per BUILD.md §0)

| Decision                                                          | Why                                                                                                                         |
| ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Next.js **15.5.28** (not 14)                                      | §6.3 allows 15. The 15.5 line still receives security backports; 14 is near end of support. Next 16 left for a later phase. |
| React **19.2.9**                                                  | Patched against the late-2025 React Server Components advisories.                                                           |
| TypeScript **5.9.3** (not 7.x)                                    | TS 7 (native) is new; Next 15 and typescript-eslint are verified against 5.x.                                               |
| ESLint **9** (not 10)                                             | `@next/eslint-plugin-next` 15 and react-hooks plugin are verified against 9.                                                |
| Prisma **7.10.1**                                                 | Current stable (8.0 is RC). Rust-free client with the Neon adapter suits Vercel. URLs live in `prisma.config.ts`.           |
| Tailwind **4**                                                    | Tokens map cleanly through `@theme inline`; no JS config.                                                                   |
| Dark theme is the default; light is opt-in (`data-theme="light"`) | §12 says dark is default. Following the OS setting is an open question below.                                               |
| Internal packages ship TypeScript source                          | No package build step; Next transpiles them (`transpilePackages`).                                                          |
| Non-secret config committed in `apps/*/.env.production`           | Web needs no Vercel env vars; API needs only secrets.                                                                       |

### Refinements to BUILD.md that need your approval

These follow the rule "where this document and best practice conflict on security, follow the
safer option and record it". Details in `CRYPTO.md` §12.

1. **Account Key above the VMK.** Envelopes wrap a per-user Account Key, which wraps the VMK
   and the identity private key. Without this, releasing someone's own vault would expose the
   key shares they hold for other people. Schema: `AccountEnvelope` replaces `VaultEnvelope`;
   `Vault.wrappedVmk` added.
2. **Composite quorum.** A single Shamir split with k = 2 lets any two contacts open a vault
   without Ìrántí once there are two or more contacts. Proposed: split each key 2-of-2 into
   Ìrántí's piece and a contact half, then share the contact half `k_c`-of-m (default
   `k_c = 1`, i.e. "Ìrántí + one executor"). Schema: `Vault.contactThreshold`,
   `Vault.contactsOnlyThreshold`, `KeyShare.scheme`.
3. **Unambiguous AD with item revisions.** `VaultItem.revision`, `Letter.revision`.
4. **Share commitments and key-check values.** `KeyShare.shareCommitment` (replaces
   `paperFingerprint`), `Vault.kcvVmk`, `Vault.kcvUrgentKey`.
5. **Contact key verification.** Invite secret in the link fragment plus pinned key:
   `TrustedContact.pinnedPublicKeyEnc`, `keyVerification`.
6. Smaller schema additions: `Vault` vault keypair columns and `retentionDays`;
   `VaultFile.tier`; `ReleaseEvent.seq` with unique `(caseId, seq)` and `(caseId, prevHash)`;
   indexes on foreign keys; `updatedAt` where rows change.

### Skipped, and why

- **Database migration:** no Neon database is connected yet. The first migration is created
  in Phase 1 together with the Better Auth tables, so it lands once.
- **PWA manifest and service worker:** Phase 1 per §16.
- **Strict CSP:** the static export inlines bootstrap scripts, so `script-src` still allows
  `'unsafe-inline'`. Phase 1 replaces it with hashes or a nonce-free strategy before any vault
  screen exists.
- **`/r/[id]` route shape:** static export cannot pre-render unknown ids. Phase 4 will use a
  single `/r/` page that reads the id from the URL fragment (which also keeps it out of server
  logs).

### Open questions

1. Approve the five refinements above (or tell me which to drop).
2. Dark-only by default, or follow the OS light/dark setting?
3. Companion name: Ìtàn? (§19.1)
4. KMS provider: AWS or Google Cloud; asymmetric (preferred) or symmetric key for Ìrántí's
   pieces (CRYPTO.md §5.3)?
5. Defaults: `k_c = 1`, urgent 48 h, full 14 days, fast-track 2 confirmations + certificate +
   72 h (§19.3).
6. Data region for Neon, R2 and KMS (privacy policy §9).
7. Comfort with the public drand dependency for dated letters (§19.8).

### How to verify Phase 0

```bash
pnpm install
pnpm typecheck && pnpm lint && pnpm test && pnpm build
test -f apps/web/out/index.html
pnpm --filter @iranti/web e2e
```
