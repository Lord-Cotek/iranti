# Progress

## Phase 1: Accounts and the locked vault · 16 October 2026 · awaiting review

Phase 0 was approved by Temi ("we can move on… let's continue"). The five crypto refinements
proposed in Phase 0 were not objected to and are built as designed; say if any should change.

### Built

- **Auth (Better Auth 1.7, decided over the JWT fallback):** email one-time codes (6 digits,
  stored hashed, 10-minute expiry, 5 attempts) and passkeys. httpOnly `SameSite=Lax` session
  cookies on the API; trusted-origin checks; rate limits in the database (codes: 5 per 10
  minutes per IP); no passwords. Telemetry off. Sign-up allowlist for the pre-launch period
  (`SIGNUP_ALLOWLIST`; closed in production when unset). Account deletion in-app.
- **Vault creation, on the device:** Account Key, identity keypair, VMK, Urgent Key, vault
  keypair, key-check values, passphrase envelope (Argon2id, target 256 MiB with a 64 MiB floor
  fallback), recovery-code envelope, proof-of-unlock key. One atomic `POST /api/setup`.
  Passphrase strength enforced (12+ characters and zxcvbn score ≥ 3). 18+ confirmation.
- **Emergency Kit:** one-page PDF made on the device (pdf-lib, IBM Plex Sans embedded so Yoruba
  marks print), never uploaded. Setup cannot continue until the person types the last two
  groups of the code back, or ticks an explicit "I understand" to skip.
- **Unlock:** passkey (WebAuthn PRF) → passphrase → recovery code. A passkey sign-in signs in
  and unlocks in one ceremony. Keys live only in memory: auto-lock after 1/5/15/30 minutes
  (default 5), optional lock when the tab is hidden, and a reload forgets everything.
- **Proof of unlock (new, CRYPTO.md §3.4):** every write is signed with an Ed25519 key derived
  from the Account Key. A stolen session can read ciphertext but cannot change or delete
  anything. Promised in THREAT_MODEL.md §4.9; now enforced.
- **Vault items:** all §5 types from one registry (`packages/core/src/vault/types.ts`): the
  field list generates both the Zod schema and the form. Encrypted CRUD with per-revision IDKs,
  length-bucket padding, optimistic concurrency (revision must be stored + 1), tier choice per
  item ("Open in the first days" / "Open with everything else").
- **Files:** encrypted on the device in 1 MiB chunks bound to their position, uploaded straight
  to R2 with presigned URLs (aws4fetch), checked complete server-side, downloaded and decrypted
  in the browser, image preview and PDF open. Names are encrypted too. Deleting an item
  deletes its files.
- **PWA:** manifest, icons generated at build, service worker precaching the app shell; the
  vault's ciphertext and wrapped keys cached in IndexedDB so a device can unlock and read
  offline.
- **Strict CSP:** every exported page gets a per-page CSP with SHA-256 hashes of its inline
  scripts (`apps/web/scripts/postbuild.mjs`); `'unsafe-inline'` is gone from `script-src`.
  `'wasm-unsafe-eval'` is allowed for libsodium.
- **Export:** a zip made on the device: `vault.json` (every item decrypted), `files/` (the
  originals) and `summary.html` (readable, with a warning that it is not encrypted).
- **Migrations:** first Prisma migration (all tables including Better Auth's). Applied
  automatically during Vercel production builds only (`apps/api/scripts/migrate.mjs`).

### Tests

- `packages/crypto`: 51 (envelopes, recovery codes, vault/tier separation, items, files,
  padding, proof of unlock, plus Phase 0's AEAD/AD suite).
- `apps/api`: 19 including **integration tests against Postgres** through the real route
  handlers and Better Auth: sign-in by emailed code, setup-once, independent passphrase and
  recovery unlocks, proof-of-unlock enforcement, revision conflicts, vault isolation, passkey
  envelope and revocation rules, encrypted file round trip through S3, account deletion, OTP
  rate limiting, and **a full `pg_dump` that contains no vault content, passphrase, recovery
  code or raw key**.
- `apps/web` e2e (Playwright, full stack: static export + API + Postgres + fake S3): the whole
  owner journey; passkey with PRF via a virtual authenticator (sign in + unlock in one step);
  installable PWA with a controlling service worker; offline unlock and read; hash-based CSP on
  every page and zero CSP violations during the flows; 360 px layout.
- CI now runs the integration tests (Postgres service) and the full-stack e2e job.

### Acceptance (BUILD.md §16 Phase 1)

| Criterion                                              | Status                                                                                                 |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| DB inspection shows no plaintext for any vault content | Automated: `pg_dump` test                                                                              |
| Tamper tests fail decryption                           | Automated (crypto suite)                                                                               |
| Passphrase and recovery code each unlock independently | Automated (unit, integration, e2e)                                                                     |
| Export round-trips                                     | Automated (unit + e2e reads the zip back)                                                              |
| Lighthouse PWA installable                             | Manifest, icons and controlling SW verified in e2e; a Lighthouse run on the live domain is still to do |

### Decisions

| Decision                                            | Why                                                                                                                                                                   |
| --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Better Auth over the JWT fallback                   | Email OTP + passkey plugins fit; its client strips WebAuthn extension results before posting, so PRF output never reaches the server. Bearer plugin added in Phase 7. |
| Constant PRF salt                                   | Lets one passkey ceremony sign in and unlock. Safe: the authenticator mixes it with a per-credential secret (CRYPTO.md §3.2.1).                                       |
| HKDF via WebCrypto                                  | libsodium-wrappers does not expose HKDF; WebCrypto HKDF is standard and lives inside packages/crypto.                                                                 |
| Client-generated ids                                | So associated data can bind ciphertext to its id before upload.                                                                                                       |
| Hand-written service worker                         | Small, readable, and generated after the CSP step so precache matches the shipped HTML; Serwist/Workbox add a build plugin for little gain here.                      |
| "Lock when I switch tabs" off by default            | Locking on every tab switch makes copying details from other tabs painful; the 5-minute idle lock stays on. Owners can turn it on.                                    |
| Sessions record IP and user agent                   | Better Auth default; covered by "sign-in records" in the privacy policy §5.                                                                                           |
| `pg` adapter locally/CI, Neon adapter in production | Chosen by URL in `apps/api/src/lib/db.ts`.                                                                                                                            |

### Not done in this phase

- Sentry: listed for Phase 1 in `.env.example`, not in the Phase 1 build list. Deferred so it
  lands with the scrubbing allow-list designed properly.
- Offline **writes** (Phase 2 acceptance). Phase 1 reads offline.
- A Lighthouse run against the live domain (needs the domain and a deploy).
- Rollback manifest (CRYPTO.md §4.5) is still a proposal.

### What Temi needs to set for production

- Vercel **api** project: `EMAIL_FROM` (domain verified in Resend), `SIGNUP_ALLOWLIST` (your
  address or `@yourdomain`), R2 (`R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`,
  `R2_BUCKET`) plus the bucket CORS policy in the README.
- Vercel **web** project: add the domain `iranti.cotek.app` (the API only accepts that origin,
  and passkeys are bound to it).

### Open questions

1. Anything in the Phase 0 refinements you want changed now that they are built?
2. `SIGNUP_ALLOWLIST`: who should be able to create accounts before launch?
3. Default auto-lock 5 minutes, "lock on tab switch" off: right defaults?
4. Phase 0 questions 2–7 still stand (theme, Ìtàn name, KMS provider, defaults, data region, drand).

---

## Phase 0: Foundations · 16 October 2026 · approved

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
