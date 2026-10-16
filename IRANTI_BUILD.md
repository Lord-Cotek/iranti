# Ìrántí
### Claude Code build document · standalone product · Phase 0 → Final
COTEK App FZ-LLC · v1.1 · 16 October 2026 (zero-knowledge everywhere; two-tier release) · Yoruba: *remembrance*

---

## 0. How to run this document

This is a new product in a new repository. Claude Code builds it phase by phase.

**Setup (Temi does this once):**
1. Create an empty repo `cotek-iranti`, clone it, and save this file at `docs/BUILD.md`.
2. Start Claude Code in the repo root with:

> Read `docs/BUILD.md` in full. Execute **Phase 0 only**, then stop and show me `docs/THREAT_MODEL.md`, `docs/CRYPTO.md`, and the repo tree.

3. After each phase: review → *"Phase N approved. Execute Phase N+1."*

**Operating rules for Claude Code (all phases):**
- One phase at a time. Each phase ends with: typecheck clean, lint clean, tests passing, a commit (`feat: phase N — <summary>`), an updated `docs/PROGRESS.md` (built / skipped and why / open questions), then **STOP**.
- **Cryptography lives only in `packages/crypto`.** No crypto code anywhere else. No hand-rolled primitives — use the audited libraries named here. Every crypto function has unit tests, including negative tests (tampered ciphertext must fail).
- **Never log plaintext, keys, shares, passphrases, or recovery codes** — not in console, Sentry, analytics, or server logs. Add a lint rule or test that greps for obvious violations.
- No secrets in code; every secret goes in `.env.example` with a comment.
- Check current docs for every third-party SDK, plugin, and price before integrating. This document was written in October 2026.
- Ask before destructive actions (data-dropping migrations, deleting files, force pushes).
- Where this document and a library's current best practice conflict on security, follow the safer option and record it in `PROGRESS.md`.

---

## 1. What Ìrántí is

When someone dies — especially far from home — the people they love are left with a locked phone, unknown passwords, frozen accounts, insurance policies nobody can find, a will that may or may not exist, and, for expatriates, a repatriation process of police papers, death certificates, NOCs, embalming, cargo bookings and consulate stamps, all in a language and system they don't know. In the UAE, a widow can wait days with a body in a mortuary while she pieces this together from strangers.

**Ìrántí is the "if I die tomorrow" system.** Over a few quiet evenings, a person gathers everything their family would need — who to call first, what they own and where, what they want done with their body and their children, the documents, the digital life — and writes letters to the people they love, to be delivered after they're gone or on a future day they choose: a child's eighteenth birthday, a wedding day. When the worst happens, a protocol the person designed in advance releases exactly the right things to exactly the right people, with a guided path for the first days.

**Relationship to Ìdílé.** Ìdílé already keeps blessings sealed "until I am gone" and a testimony per person. It says plainly that nothing there happens automatically when someone dies; a living person releases it. Ìrántí does not replace or absorb any of that. Ìdílé is a Christian household's discipleship record. Ìrántí is a universal, zero-knowledge estate-and-letters vault with a designed release protocol. A future, optional link (owner-initiated only) might point an executor to "blessings are also kept in Ìdílé"; nothing is shared automatically.

It is universal: for Christians, Muslims, Hindus, and people of no faith. Faith appears in the person's own wishes, never as the product's content. The stewardship ethic is in the design: you are preparing your house so the people you love are not left in chaos (Isaiah 38:1 is the private inspiration; it is not printed in the app).

**In one line:** *Leave your family clarity, not chaos.*

**Market context (for landing copy; verify before publishing):** most expatriates in the UAE have no registered will; non-Muslims can register wills through the DIFC Wills Service, the Abu Dhabi Judicial Department (ADJD), ADGM Courts, or the Dubai Courts notary; repatriation requires a chain of documents from hospital, police, health authority, consulate, embalmer and airline cargo; some consulates now require that only a blood relative or a person with a valid power of attorney may sign repatriation paperwork.

---

## 2. Non-negotiables

1. **The vault is zero-knowledge.** COTEK cannot read a person's financial details, accounts, documents or private wishes. Encryption and decryption happen on the user's device. The server stores ciphertext.
2. **No single party can release the vault.** Not the server, not one trusted contact, not COTEK staff. Release requires a quorum the owner configured (§8).
3. **The owner can always stop a release while alive.** Every release path has a waiting period, never shorter than 24 hours, during which the owner is contacted on every channel and can cancel with one tap. Owners choose how long; confirmations from trusted people can shorten it, never remove it (§9).
4. **Ìrántí is not a will and not legal advice.** It says so plainly, helps people *get* a proper registered will, and stores a copy and its location. It never generates a "will" document.
5. **Nobody at COTEK can read anything, ever.** No escrow, no master key, no support backdoor, no "sealed key held for delivery". Every item, file and letter is encrypted on a person's device to keys COTEK does not hold. Ìrántí holds one *piece* of each release key, and a piece on its own opens nothing (§8). If a feature would need COTEK to read content, the feature changes; the rule does not.
6. **Export always.** The owner can export everything, decrypted, at any time, in open formats.
7. **The continuity pledge.** If COTEK ever ceases operations, owners are notified, given an export window, and letters still waiting for delivery are handed back to owners or their executors. Because letters are locked to their recipients, a custodian could carry them without being able to read them (§13). Build the tooling, not just the promise.
8. **Gentle, never morbid, never gamified.** No streaks, scores, or "completion %" badges. Use descriptive coverage ("Your family would know who to call and where your accounts are. Your digital life isn't covered yet.").
9. **Safety first.** End-of-life planning can surface suicidal thoughts. The AI companion and the app copy follow the safety protocol in §11.4.
10. **Adults only (18+).**

---

## 3. People and roles

| Role | Description |
|---|---|
| **Owner** | The person preparing their Ìrántí. Has the vault. |
| **Trusted contact** | Someone who holds a key share and confirms a release. Usually 2–5 people. Needs an Ìrántí account (free, forever) to hold a digital share, or can hold a printed paper share. |
| **Executor** | A trusted contact the owner designates to receive the released vault and lead the practical work. One or more. |
| **Recipient** | Someone a letter or time capsule is addressed to. Needs no account until delivery. |
| **Guardian (designation only)** | The person the owner wants to care for minor children. Recorded as a wish; not a system role. |
| **Partner (household plan, Phase 9)** | Spouse with a mirrored vault and reciprocal roles. |

A trusted contact sees only: that they have been chosen, their role, and how the release protocol works. They never see the vault before release.

---

## 4. The experience

### 4.1 Onboarding — the four evenings
After sign-up and vault creation (§8), the owner is offered a gentle path, not a form marathon. Each "evening" is 20–40 minutes and can be done in any order. Coverage is shown descriptively.

**Evening 1 — Who.** The people: who to call first (in order), executors, trusted contacts, guardians for children, who should *not* be contacted, employer HR contact, religious leader, lawyer, accountant. Invite trusted contacts.

**Evening 2 — What.** Assets and obligations: bank accounts (bank, country, type, last four digits — never full numbers unless the owner chooses to store them), property, vehicles, investments, pensions/end-of-service gratuity, insurance policies (life, medical, employer repatriation cover), debts and loans, safe-deposit boxes, crypto (hardware wallet location and instructions — never seed phrases in plain fields; offer a sealed note), business ownership, money owed to them. Upload documents: passport, residence/Emirates ID copies, title deeds, policies, registered will (or note that there isn't one, with a guided "how to register a will" checklist).

**Evening 3 — Wishes.** Body and rites: burial or cremation, where (in the UAE or repatriated — and to where), faith rites and who should lead them, organ donation, the funeral the owner would want, music, readings (owner's own choice of text), dress, what to do with belongings, pets, digital life (accounts to memorialise, delete, or hand over; where the password manager emergency kit is), children (guardianship wishes, how they'd want them raised, school), medical wishes if incapacitated.

**Evening 4 — Words.** Letters and time capsules: text, audio, or video, to individuals or groups, delivered on release, a fixed delay after release, a future date, or a life milestone the executor confirms (wedding, graduation, first child). Optional help from the AI companion to find words.

**Country playbook.** Based on where the owner lives and where they'd want to be laid to rest, Ìrántí attaches the relevant playbooks (UAE first, §10) and asks the questions those playbooks raise: "Does your employer's insurance cover repatriation?", "Have you given anyone power of attorney?", "Is your will registered in the UAE?".

### 4.2 Living with Ìrántí
- **Annual review** (gentle reminder on a date the owner picks): "Anything changed this year? New child, new home, new bank?"
- **Life-event nudges** (owner-triggered): moving country, new baby, marriage, divorce, new job — each opens a short review of affected sections.
- **Check-ins** (if the owner enables the inactivity path): periodic "Are you okay?" ping at an owner-chosen interval (30/60/90/180 days), answered with one tap or by opening the app.

### 4.3 When the worst happens — the executor's path
1. A trusted contact opens a claim and uploads evidence (§9). **The owner and every other trusted contact are notified at once.**
2. Other trusted contacts confirm or dispute in their own app.
3. **Urgent details open first** — who to call, body and rites, funeral wishes, repatriation cover, where the power of attorney is — after confirmation and a short wait the owner chose (default 48 hours, never under 24).
4. **The full vault opens next** — after the owner's full waiting period, or sooner on the fast-track when enough people confirm and a death certificate is uploaded (default: two confirmations, certificate, at least 72 hours).
5. Each opening happens on the executor's own device; Ìrántí never sees the contents.
6. The executor lands in **the executor workspace**: a calm, ordered "first 72 hours" playbook generated from the owner's wishes and country playbook, a contact list in the owner's chosen order, the documents needed for each step, task assignment to other family members, and the owner's letters to the executor.
7. Letters reach their recipients as the owner arranged (§7).

Throughout, the public UAE guide ("what to do when someone dies in the UAE") is available to the family from the first minute, before anything is unlocked.

---

## 5. Vault content model

Every vault item is a typed record whose *payload* is encrypted client-side. Only minimal, non-sensitive metadata is plaintext on the server (item type, section, created/updated timestamps, release tier). Even item titles are encrypted.

**Release tiers.** Every item belongs to one of two tiers, each locked under its own key (§8.1), so opening the first never exposes the second:
- **Urgent:** what the family needs in the first days. Defaults: people and call order; body and rites; funeral; organ donation; guardianship wishes; insurance policies the owner marks as repatriation or life cover; where the power of attorney and will are kept (the location, not the documents); employer HR contact.
- **Full:** everything else: accounts, documents, sealed notes, digital life, and anything the owner moves here.

The owner sees and can change the tier on every item ("Open in the first days" / "Open with everything else").

Sections and item types (payload fields are encrypted JSON validated by Zod schemas in `packages/core`):

- **people**: person (name, relationship, phones, email, country, roles, notes, call order)
- **assets**: bank_account (institution, country, type, currency, last4, online access notes, joint holders), property (address, ownership, title deed doc), vehicle, investment, pension_gratuity, crypto (custody type, location of device/instructions — seed phrase only in a `sealed_note`), business_interest, receivable
- **obligations**: loan, credit_card (issuer, last4), lease, subscription, dependents' school fees
- **insurance**: policy (insurer, type, number, beneficiaries, claim contact, document)
- **documents**: identity_doc, will (registry: DIFC / ADJD / ADGM / Dubai Courts / home country / none; registration number; lawyer; physical location; file), power_of_attorney, marriage_cert, birth_certs, other
- **wishes**: body_and_rites, funeral, organ_donation, medical_incapacity, guardianship, belongings, pets, digital_life, faith (free text, owner's own words)
- **digital**: account (service, handle, wish: memorialise/delete/transfer, instructions), password_manager (provider, where the emergency kit is)
- **sealed_note**: free-form secret text (e.g. crypto seed, safe combination) with an extra warning
- **letters**: see §7

Attachments: files are encrypted client-side (chunked for large video), uploaded as opaque blobs to R2.

---

## 6. Architecture

### 6.1 Why this shape
Ìrántí must run as a **PWA** and as **iOS/Android apps via Capacitor**. Capacitor bundles static web assets; Next.js API routes, server components, and middleware don't run inside a Capacitor bundle. So the product is split:

- a **static client** (Next.js App Router with `output: 'export'`) used *both* as the hosted PWA and as the Capacitor bundle — one UI codebase;
- a separate **API** (Next.js route handlers on Vercel) holding the database, auth, jobs, and integrations.

This deviates from the single-app COTEK scaffold on purpose.

**Why not Ìdílé's pattern.** Ìdílé ships to the stores as a thin Capacitor shell that loads the live site (`server.url` → `idile.cotek.app`), so every web deploy reaches phones immediately. That suits Ìdílé. It does not suit Ìrántí, for three reasons:
- **Offline access.** An executor in a hospital corridor must be able to open the vault offline, so the client must be bundled.
- **Trust in the code.** A zero-knowledge client whose code can be swapped by any server deploy is a weaker trust story than a reviewed, versioned bundle.
- **Store review.** Apple scrutinises remote-URL wrappers under guideline 4.2, and a vault app should not be fighting that.

So Ìrántí bundles the static client. Web-only fixes still ship instantly to the PWA, while native releases go through the stores.

### 6.2 Monorepo layout (pnpm + Turborepo)

```
apps/
  web/              Next.js 14 App Router, output:'export' → PWA + Capacitor bundle
    app/(marketing)/   landing, pricing, how-it-works, security page, FAQ
    app/(app)/         the product (client components only)
    app/(executor)/    executor workspace
    app/r/             recipient delivery pages (client-side decrypt)
    public/            manifest, icons, service worker
    ios/ android/      Capacitor native projects (Phase 7)
  api/              Next.js 14 route handlers only (app/api/**), Prisma, jobs
packages/
  crypto/           ALL cryptography. Pure TS. No React. 100% unit-tested.
  core/             Zod schemas for vault payloads, shared types, API client (typed fetch)
  ui/               design system: tokens, Eyebrow, Card, Button, Field, Sheet, Stepper, etc.
  playbooks/        playbook content (MDX/JSON) + schema
docs/
  BUILD.md THREAT_MODEL.md CRYPTO.md PROGRESS.md RUNBOOK_RELEASE.md RUNBOOK_CONTINUITY.md
```

### 6.3 Stack

| Concern | Choice | Notes |
|---|---|---|
| Language | TypeScript strict everywhere | |
| Client | Next.js 14 App Router, `output: 'export'`, `images.unoptimized: true`, Tailwind | Next 15 acceptable if COTEK has moved; record the choice |
| PWA | Service worker (Workbox or `@serwist/next`, verify current) caching the app shell; ciphertext cached in IndexedDB for offline read after unlock | |
| Native | **Capacitor 8** (current major at time of writing; verify) | Phase 7 |
| API | Next.js 14 route handlers on Vercel (`apps/api`), Node runtime | |
| DB | Neon Postgres + Prisma (pooled connection string at runtime) | |
| Auth | **Better Auth** (email OTP + passkeys; cookie sessions for web, bearer tokens for Capacitor) — verify current plugins; if unsuitable, implement short-lived access JWT + rotating refresh token | NextAuth's cookie-first model is brittle inside a Capacitor webview; record the decision |
| Crypto | `libsodium-wrappers-sumo` (XChaCha20-Poly1305, X25519 sealed boxes, Argon2id, BLAKE2b), `shamir-secret-sharing` (audited TS implementation; verify current package), WebAuthn PRF extension for passkey-derived keys, **`tlock-js`** (drand timelock encryption) for date-gated letters (verify current package and network) | §8 |
| Server-side key management (Ìrántí's key pieces only) | **AWS KMS** or **Google Cloud KMS** (audit logs, IAM separation) | Protects only Ìrántí's Shamir piece of each release key. A piece opens nothing on its own. There is no other server-side key, and none for letters |
| File storage | Cloudflare R2, private bucket, presigned URLs, **encrypted blobs only** | |
| Jobs | Trigger.dev (check-in scheduler, release timers, letter-delivery notifications, reminder emails) | |
| Email | Resend (or COTEK's existing provider) | |
| SMS / WhatsApp | Twilio or Meta WhatsApp Cloud API for check-ins and release notifications | |
| Push | Capacitor Push Notifications + APNs/FCM | Phase 7 |
| AI | Anthropic SDK, streaming. Copy Ìdílé's `lib/anthropic.ts` pattern: tiers (`default` / `cheap` / `hard`) resolved from env, plus a `modelChain()` fallback so a mistyped or retired model id still yields a reply. Suggested defaults: `claude-sonnet-5-5`, `claude-haiku-5-5`, `claude-opus-5-5` | §11 |
| Monitoring | Sentry with aggressive scrubbing (allow-list of fields), no session replay on vault screens | |
| Analytics | Privacy-first (Plausible or PostHog with IP anonymisation), never on vault content | |
| Testing | Vitest (unit), Playwright (e2e), crypto test vectors | |

Domains: `iranti.cotek.app` (web/PWA) and `api.iranti.cotek.app` (API) — same site, so web can use secure httpOnly cookies with `SameSite=Lax`; Capacitor uses bearer tokens. Vercel domains scoped per project (no wildcard overrides).

---

## 7. Letters and time capsules

- **Formats:** text (rich text, limited formatting), audio (recorded in app), video (recorded or uploaded, chunked encryption, size cap configurable), attached files/photos.
- **Recipients:** one or many people from the owner's people list.
- **When it arrives (the gate):**
  - `ON_RELEASE`: when the vault opens;
  - `RELEASE_PLUS`: N days or months after release (e.g. the first anniversary);
  - `FIXED_DATE`: a calendar date, whether or not the owner has died (birthday letters while alive are allowed and lovely);
  - `MILESTONE`: "on Tobi's wedding day". After release, the executor or another named person confirms the day; until then the letter waits.

### 7.1 How a letter stays private (one rule: only the recipient can open it)
Each letter is encrypted on the owner's device with its own key. That key is wrapped to the owner's vault key (so the owner can read and edit it) and **locked to the recipient** in one of three ways the owner chooses, per recipient:

1. **The recipient's own Ìrántí key.** Recipients can have a free recipient account at any age the law allows. Their phone makes their key, and the letter is locked to it the moment it's written. It delivers itself on its date with no one in between. *Best privacy; fully automatic.*
2. **A letter card.** For a child, or anyone without an account, the owner prints a **letter card** for that person: a recipient key generated on the owner's device, printed as a QR code and words, then erased from the device. The letter is locked to the card. The card is kept with the will, in a safe, or with a guardian. On the day, the recipient (or their guardian) is told a letter is waiting and scans the card to open it. *Only whoever holds the card can ever read it.*
3. **Hand-over by the executor.** The letter is locked under the full vault key. After release, the executor's device re-locks it to the recipient when they're ready. *Simplest, but the executor's device could open it.* The owner is told this plainly when choosing it.

**Date gate.** Letters with a date are additionally wrapped in **timelock encryption** (drand `tlock`) to that date, so not even the recipient can open them early. No one holds a key that opens a timelock before its time, COTEK included. **Release gate.** Letters gated on release are held back by the server until release, and they're unreadable to the server either way.

**Delivery notice.** To tell a recipient a letter is waiting, Ìrántí needs somewhere to send the notice: an email or phone the owner provides for that recipient (or their guardian, for card holders). That contact detail is the only part of a letter Ìrántí can read, and the owner sees exactly what's held. The notice says only: "Someone who loved you left a letter for you through Ìrántí."

- **Opening:** the recipient opens it in the app or at `/r/[id]` by verifying their contact (one-time code) and using their key or card. They can download it permanently (PDF for text, original audio and video files).
- **Previews:** the owner can preview exactly what each recipient will see.
- **Edits:** letters can be revised any time before delivery; previous versions are discarded unless the owner pins one.

---

## 8. Cryptography (write `docs/CRYPTO.md` in Phase 0 from this section, for external review)

### 8.1 Keys
- **Vault Master Key (VMK):** 256-bit random, generated on the owner's device at vault creation. Encrypts per-item Data Keys.
- **Urgent Key (UK):** 256-bit random, generated with the VMK. Wraps the IDKs of **Urgent**-tier items (§5). The UK is itself wrapped by the VMK so the owner reaches everything with one unlock, and it is split for release separately from the VMK (§8.4), so opening the urgent tier never exposes the full vault.
- **Item Data Key (IDK):** 256-bit random per vault item, file and letter; encrypts the payload with XChaCha20-Poly1305. Full-tier IDKs are wrapped by the VMK; urgent-tier IDKs by the UK.
- **Recipient keys (X25519):** a recipient account's key (made on the recipient's device), or a **letter card** key generated on the owner's device, printed, and erased (§7.1).
- **Owner keypair (X25519):** for receiving things encrypted to the owner; private key wrapped by the VMK.
- **Trusted contact keypair (X25519):** generated on each contact's device at their onboarding; private key wrapped by that contact's own account key (same envelope approach as an owner).

### 8.2 Unlocking the VMK (envelopes)
The VMK is stored server-side only in wrapped form, in one or more **envelopes**:
1. **Passkey envelope:** key derived via WebAuthn **PRF** extension → HKDF → wrapping key. Preferred where supported.
2. **Passphrase envelope:** Argon2id (libsodium `crypto_pwhash`, MODERATE or SENSITIVE params; benchmark on low-end phones and record chosen params) → wrapping key.
3. **Recovery code envelope:** 128-bit+ random recovery code shown once, printed in the **Emergency Kit** PDF generated client-side (never sent to the server).
4. **Device envelope (native only, Phase 7):** VMK wrapped by a device key in iOS Keychain / Android Keystore, gated by biometrics.

Authentication (logging in) and decryption (unlocking) are separate. Logging in never reveals the VMK. Losing all envelopes means the vault is unrecoverable by design — the onboarding must make the Emergency Kit impossible to skip without an explicit "I understand" step.

### 8.3 One class only: zero-knowledge
There is no escrowed class. Everything (vault items, files, letters, evidence) is encrypted on a person's device to keys COTEK does not hold:
- vault items and files → IDKs under the UK or VMK;
- letters → their IDK wrapped to the VMK (owner) and to the recipient's key or letter card, optionally timelocked to a date (§7.1);
- release evidence → sealed to the trusted contacts' public keys (§9).

The server holds ciphertext, wrapped keys it can't unwrap, Ìrántí's key pieces, and operational metadata (accounts, timings, contact details for notices). **A complete copy of COTEK's database and storage, together with all of COTEK's keys, must not be enough to read any user content.** Phase 5 includes a test that proves it.

### 8.4 Release by quorum (Shamir)
At setup, the client splits **each release key separately**, the Urgent Key and the VMK, with Shamir secret sharing into **n shares, threshold k**, where:
- **one share is Ìrántí's piece**, encrypted to a KMS key and released by the API only when the release protocol (§9) reaches that tier's opening: `URGENT_OPEN` for the UK, `FULL_OPEN` for the VMK;
- **the remaining n−1 shares go to trusted contacts**, each encrypted to that contact's X25519 public key (sealed box), or printed as a **paper share** (QR + human-readable words) for contacts who won't use the app.

Default configuration: **k = 2** for each tier, with Ìrántí's piece counting as one. So opening a tier requires Ìrántí's piece (released only when the protocol in §9 allows) **plus at least one executor's share**. Ìrántí alone cannot decrypt; a single rogue contact alone cannot decrypt; contacts colluding without Ìrántí can decrypt only if the owner chose k such that contacts alone suffice (offer an "allow contacts to release without Ìrántí, k-of-contacts" advanced option for continuity — off by default, explained).

Re-sharing: whenever trusted contacts change, generate fresh shares (same VMK) and revoke old share records server-side. If a contact is removed for cause, offer "rotate vault key" (new VMK, re-wrap all IDKs — feasible because IDKs, not payloads, are re-wrapped).

Pending contacts: a contact who hasn't onboarded yet has no public key; their share is not created until they accept. The owner sees "waiting for Ada to accept" and the effective quorum is computed from accepted contacts only (warn if quorum is unreachable).

### 8.5 At release (executor's device)
1. When the urgent tier opens, the API releases Ìrántí's UK piece (KMS decrypt in the API, returned over TLS to an authenticated executor session only, single-use, audit-logged). The executor's device decrypts its own UK share, rebuilds the UK in memory, and shows the urgent items.
2. When the full tier opens, the same happens for the VMK.
3. Keys exist only in memory on the executor's device and are never uploaded unwrapped.
4. Letters locked to recipient keys or cards need nothing from the executor. **Hand-over** letters (§7.1, option 3) are re-locked on the executor's device to the recipient's key when the recipient is ready.

### 8.6 Libraries and rules
- Use libsodium for AEAD, key exchange, sealed boxes, Argon2id, HKDF-equivalent (or WebCrypto HKDF).
- Use an audited Shamir implementation over GF(256); do not write one.
- Associated data (AD) on every AEAD call binds ciphertext to `vaultId | itemId | version` to prevent swap attacks.
- Constant-time comparisons for any secret comparisons.
- Test vectors committed; property-based tests for split/combine; tamper tests.
- Commission an **external cryptography review** before public launch (Phase 8). Budget for it.

---

## 9. Release protocol (state machine)

Two tiers open in turn. Owners choose the timings; the defaults below are what a new vault gets.

**States:** `ARMED → CLAIM_OPEN → URGENT_WAIT → URGENT_OPEN → FULL_WAIT → FULL_OPEN → CLOSED`, plus `CANCELLED` and `DISPUTED`.

**Opening a claim (`CLAIM_OPEN`)**
- **Death claim:** any trusted contact opens a claim, states the date and place, uploads evidence (death certificate or death notification, hospital or police letter) and confirms their identity (account + one-time code). Evidence is encrypted on their device to every trusted contact's public key; Ìrántí can't read it.
- **Inactivity path (optional, owner-enabled):** missed check-ins escalate (reminder → second channel → "we haven't heard from Ade, please check on him" to trusted contacts). A claim opens only when a trusted contact confirms concern. Inactivity alone never opens anything.
- **Immediately on any claim:** the owner is contacted on every channel (email, SMS/WhatsApp, push), and so is every other trusted contact, who can confirm or dispute in their own app.

**Owner settings and defaults**

| Setting | Default | Owner can choose |
|---|---|---|
| Urgent wait | 48 hours | 24 hours – 7 days |
| Confirmations needed for urgent tier | 1 other contact | 1 – all |
| Full wait | 14 days | 3 – 30 days |
| Fast-track for full tier | On: 2 confirmations + death certificate + at least 72 hours | On/off; confirmations 2 – all; minimum 72 hours – full wait |
| Inactivity path | Off | On, with check-in every 30 / 60 / 90 / 180 days |

**Rules**
- **Urgent tier opens** when the urgent wait has passed *and* the required confirmations are in, with no word from the owner.
- **Full tier opens** at the earlier of: the full wait passing with at least one confirmation, or the fast-track conditions being met.
- **Hard floor:** nothing opens in under 24 hours from the claim, whatever the settings.
- **Inactivity claims never fast-track** and use at least 7 days (urgent) and 21 days (full).
- **If the owner has fewer contacts than the fast-track needs,** the fast-track is off and the setup screen says so.
- **Owner response stops everything not yet opened** (`CANCELLED`) and tells every trusted contact. If the urgent tier had already opened, the owner is told exactly what was opened and by whom, and is offered a one-tap Urgent Key rotation.
- **Disputes:** if any trusted contact marks the claim as wrong, it freezes (`DISPUTED`) for human review under `docs/RUNBOOK_RELEASE.md`. Reviewers see only what contacts choose to share with support, re-encrypted for that purpose by the contact's device; they never see vault content. Never auto-resolve.
- **Visible to all trusted contacts:** where the claim stands, what has opened, and when the next step could happen, as a calm countdown.

**`FULL_OPEN`:** designated executors can open the full vault; release-gated letters become available to their recipients. The owner's account is locked against changes.

**`CLOSED`:** the executor marks the estate work complete. The vault stays readable to executors for a retention period the owner chose (default 2 years), then a final export reminder and deletion.

**When a trusted person can no longer act.** If a trusted contact's own Ìrántí reaches `FULL_OPEN`, or they delete their account or decline, every owner who relied on them gets a gentle notice: "Funmi can no longer act as one of your trusted people. Please choose someone else." The notice never says why. Contacts agree to this notice when they accept the role.

**Audit:** every transition is written to an append-only, hash-chained log, visible to the owner while alive and to executors after release.

**Incapacity mode** (Phase 9): a separate, narrower release of only `medical_incapacity` and selected `obligations` items, with its own quorum, for coma or serious illness. The owner can reclaim on recovery.

---

## 10. Playbooks

Playbooks are data, not code: `packages/playbooks/<jurisdiction>/<playbook>.mdx` with frontmatter (jurisdiction, applies-when conditions, version, reviewedBy, reviewedAt, sources) and ordered steps (title, who does it, documents needed, where to go, typical time, cost notes, gotchas). The engine personalises steps from the owner's wishes (e.g. repatriation to Nigeria vs local burial) and attaches the owner's documents to the steps that need them.

**Launch content — UAE (all marked `status: draft — requires legal review`).** Claude Code writes the engine and a draft skeleton only; Temi supplies or approves the substance, and a qualified UAE lawyer reviews before launch. Do not present draft content as authoritative.

UAE draft skeleton (to be verified and completed by research and review):
1. Immediately: who to call (ambulance/police as appropriate; hospital death notification; employer HR; consulate/embassy).
2. Death certificate path (death notification → police report where applicable → death certificate from the health authority; English translation for repatriation/insurance; authenticated copies).
3. Decision: local burial/cremation vs repatriation (per owner's wishes).
4. Repatriation chain: consulate/embassy (NOC, passport cancellation as required), embalming certificate, coffin requirements, airline cargo booking, multiple copies of every document, consignee at destination.
5. Power of attorney and who may sign (some consulates require a blood relative or valid POA).
6. Employer obligations (e.g. some repatriation costs may fall on the employer for certain workers) and insurance claims.
7. Residence visa / Emirates ID cancellation; tenancy; utilities; vehicle.
8. Banks and estate: account freezing, the registered will route (DIFC / ADJD / ADGM / Dubai Courts) or intestacy route; what a registered will changes.
9. Children: guardianship wishes and the importance of a registered will for guardianship of minors.

Receiving-country playbooks (Phase 9): Nigeria, India (Kerala first), Philippines, UK, Pakistan. Faith wishes templates (owner-authored, app-provided prompts only): Christian, Muslim (e.g. timing of burial), Hindu (e.g. cremation rites), Sikh, none.

**Pre-need prompts** generated from playbooks (shown to the owner during Evening 2–3): "Does your employer insurance cover repatriation?", "Is your will registered in the UAE?", "Who holds power of attorney for you?", "Does anyone know your phone passcode?".

---

## 11. The AI companion

### 11.1 Name
Working name **Ìtàn** (Yoruba: *story*) — confirm with Temi. It helps people tell their story and order their house.

### 11.2 What it does
- Guides the four evenings conversationally ("Let's start with who your family should call first").
- Helps write letters: asks questions, offers structure, suggests gentle openings — the owner writes; Ìtàn never writes a whole letter unprompted and labels any drafted text as a draft.
- Explains playbook steps and terms in plain language.
- For executors: helps triage the first 72 hours from the playbook, drafts notification emails to banks/employers (from the released vault data the executor chooses to share in the chat).

### 11.3 Data boundaries (hard rules)
- Ìtàn **never receives vault content automatically.** Context sent to the model is only what the user types or explicitly attaches in that chat turn. Show a one-line notice in the chat: "Ìtàn sees only what you share in this conversation."
- Ìtàn is optional and off until the person opens it. What they type passes through Ìrántí's API to the AI provider for that reply only; the API does not log or store it.
- Conversations are not stored server-side by default (stateless; history kept in the device's encrypted local storage). If the owner opts to keep history, it is stored encrypted under their vault key like any other item.
- Disclose AI processing in the privacy policy, per Anthropic's commercial terms.
- No legal, tax, or financial advice: explain and point to a qualified professional (lawyer, wills service, financial adviser).

### 11.4 Safety protocol
End-of-life planning can coincide with suicidal thinking, terminal diagnosis, or acute grief.
- Ìtàn's system prompt includes detection guidance for suicidal ideation or intent (e.g. planning "for next week," expressions of hopelessness, method references) and responds with warmth, does not continue planning in that moment, and offers crisis resources appropriate to the user's country (UAE and others; keep a maintained resources table in `packages/core/safety/resources.ts`, reviewed regularly; do not make categorical claims about confidentiality of helplines).
- Grief-aware tone for executors; never rushes; never upsells.
- Terminal illness: practical, gentle, prioritises what matters most first.
- Write eval cases for each of these in Phase 6.

---

## 12. Design

**Brand direction — "dusk and candle."** Calm, warm, unhurried. Not funereal black; not cheerful. The COTEK editorial grain, generous spacing, one accent that earns its place.

| Token | Dark (default) | Light |
|---|---|---|
| `--bg` | `#0E0F14` (dusk) | `#F5F1EA` (parchment) |
| `--surface` | `#16181F` | `#FFFFFF` |
| `--ink` | `#ECE7DD` | `#23211D` |
| `--muted` | `#8C8A85` | `#6E6A63` |
| `--border` | `#262833` | `#E2DBCF` |
| `--accent` (candle) | `#E2B65A` | `#B8862E` |
| `--accent2` (sage — "armed/safe") | `#7E9C8A` | `#5F7E6C` |
| `--alert` (release states only) | `#D9735B` | `#B85A44` |

- **State colours carry state only** (lesson from Ẹ̀rí): sage = armed and safe; candle = action needed; alert = a release is in progress. Never decorative.
- Type:
  - **Display:** Playfair Display.
  - **UI labels and eyebrows:** IBM Plex Mono.
  - **Long-form reading and letters:** Literata or IBM Plex Serif.
  - Load every face with its `vietnamese` subset in `next/font`. That subset carries ẹ, ọ, Ẹ, Ọ; DM Mono lacks them, which is why Ìdílé's mono text breaks on Yoruba. Test stacked marks (ẹ́, ọ̀) at real sizes.
  - Body text minimum 17 px; generous line height.
- Mark (to design separately): an open ring (COTEK family) cradling a small flame — remembrance kept. Generate favicon/OG via `next/og` at build time in the static export.
- Eyebrow labels: `WHO`, `WHAT`, `WISHES`, `WORDS`, `PROTOCOL`, `EXECUTOR`.
- Copy voice: plain, kind, never euphemistic to the point of confusion ("when you die," not "when you pass on to glory"; the owner may write their own faith language in their wishes).
- RTL readiness from day one (Arabic in Phase 9): logical CSS properties (`ms-`, `me-`), no hard-coded left/right.

---

## 13. Continuity pledge (build it)
- `docs/RUNBOOK_CONTINUITY.md`: the wind-down procedure if COTEK ceases operating: notice to all owners (≥ 90 days), export tooling, and letters still awaiting delivery handed back to owners or executors, or transferred as ciphertext to a custodian (e.g. a UAE law firm). Because each letter is locked to its recipient's key, letter card or the owner's vault key, a custodian can carry letters without being able to read them. Ìrántí's key pieces are handed to the custodian under the same agreement, so release can still complete.
- An admin-only "continuity mode" switch (two-person approval) that: stops new sign-ups, banners every owner, emails export links, and schedules custodian transfer.
- Public page explaining the pledge in plain language.

---

## 14. Compliance and platform
- UAE PDPL (Federal Decree-Law No. 45 of 2021) and GDPR for EU residents: privacy policy, sub-processor list, data processing records, data subject rights (export and delete in-app).
- **Privacy policy:** the draft is in `docs/PRIVACY_POLICY.md` (supplied alongside this document). Publish it at `/privacy` in Phase 8 after legal review. Every statement in it must stay true of the code; if a change would make any sentence false, change the code or update the policy before shipping.
- In-app account deletion (App Store requirement), with clear consequences explained (trusted-contact roles revoked, letters not yet delivered cancelled).
- Data region: choose Neon, R2, and KMS regions deliberately and document them in the privacy policy. Offer an EU region later if there's demand.
- Terms: Ìrántí is not a will, not legal advice; limitation of liability; release protocol described; DISPUTED handling.
- App Store review: emphasise native value (biometric unlock, secure enclave storage, push, document scanner) to avoid "web wrapper" rejection.

---

## 15. Data model (Prisma — core tables; Claude Code completes in Phase 0/1)

```prisma
enum ContactStatus { INVITED ACCEPTED DECLINED REMOVED }
enum ShareKind { DIGITAL PAPER SERVER }
enum ReleaseTier { URGENT FULL }
enum LetterLock { RECIPIENT_KEY LETTER_CARD HANDOVER }
enum LetterGate { ON_RELEASE RELEASE_PLUS FIXED_DATE MILESTONE }
enum ReleaseState { ARMED CLAIM_OPEN URGENT_WAIT URGENT_OPEN FULL_WAIT FULL_OPEN CLOSED CANCELLED DISPUTED }
enum EnvelopeKind { PASSKEY PASSPHRASE RECOVERY DEVICE }

model User {
  id            String   @id @default(cuid())
  email         String   @unique
  phoneE164     String?
  country       String?
  timezone      String   @default("Asia/Dubai")
  publicKey     String?                 // X25519 public key (base64)
  wrappedPrivKey String?                // private key wrapped by this user's account/vault key
  createdAt     DateTime @default(now())
  vault         Vault?
  contactRoles  TrustedContact[] @relation("ContactUser")
}

model Vault {
  id            String   @id @default(cuid())
  ownerId       String   @unique
  version       Int      @default(1)    // bumps on VMK rotation
  wrappedUrgentKey String               // UK wrapped by the VMK
  threshold     Int      @default(2)    // k (includes Ìrántí's piece), per tier
  urgentWaitHours   Int  @default(48)   // 24 – 168
  urgentConfirmations Int @default(1)
  fullWaitDays      Int  @default(14)   // 3 – 30
  fastTrackOn       Boolean @default(true)
  fastTrackConfirmations Int @default(2)
  fastTrackMinHours Int  @default(72)
  fastTrackNeedsCertificate Boolean @default(true)
  checkInDays   Int?                    // null = inactivity path disabled
  lastCheckInAt DateTime?
  envelopes     VaultEnvelope[]
  items         VaultItem[]
  files         VaultFile[]
  contacts      TrustedContact[]
  shares        KeyShare[]
  letters       Letter[]
  releases      ReleaseCase[]
  owner         User     @relation(fields: [ownerId], references: [id])
}

model VaultEnvelope {
  id         String       @id @default(cuid())
  vaultId    String
  kind       EnvelopeKind
  wrappedVmk String                    // ciphertext
  params     Json                      // KDF params, PRF salt, credential id, etc. (no secrets)
  label      String?                   // "iPhone 15", "Passphrase"
  createdAt  DateTime     @default(now())
  revokedAt  DateTime?
  vault      Vault        @relation(fields: [vaultId], references: [id], onDelete: Cascade)
}

model VaultItem {
  id          String   @id @default(cuid())
  vaultId     String
  section     String                   // people | assets | obligations | insurance | documents | wishes | digital | sealed_note
  type        String                   // bank_account | will | body_and_rites | ...
  tier        ReleaseTier @default(FULL)
  wrappedIdk  String                   // IDK wrapped by the UK (URGENT) or VMK (FULL)
  ciphertext  String                   // XChaCha20-Poly1305(payload JSON)
  nonce       String
  schemaVer   Int      @default(1)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  vault       Vault    @relation(fields: [vaultId], references: [id], onDelete: Cascade)
  @@index([vaultId, section])
}

model VaultFile {
  id          String   @id @default(cuid())
  vaultId     String
  itemId      String?
  r2Key       String
  wrappedIdk  String
  chunkSize   Int
  chunks      Int
  sizeBytes   Int
  mimeEnc     String                   // encrypted mime type
  createdAt   DateTime @default(now())
  vault       Vault    @relation(fields: [vaultId], references: [id], onDelete: Cascade)
}

model TrustedContact {
  id           String        @id @default(cuid())
  vaultId      String
  userId       String?                 // set on acceptance
  inviteEmail  String
  invitePhone  String?
  displayNameEnc String               // encrypted with VMK (owner-only label)
  isExecutor   Boolean       @default(false)
  canConfirm   Boolean       @default(true)
  status       ContactStatus @default(INVITED)
  invitedAt    DateTime      @default(now())
  acceptedAt   DateTime?
  vault        Vault         @relation(fields: [vaultId], references: [id], onDelete: Cascade)
  user         User?         @relation("ContactUser", fields: [userId], references: [id])
}

model KeyShare {
  id          String    @id @default(cuid())
  vaultId     String
  vaultVersion Int
  secret      ReleaseTier              // which key this is a piece of: URGENT (UK) or FULL (VMK)
  kind        ShareKind
  contactId   String?                  // null for SERVER
  shareIndex  Int
  sealedShare String?                  // sealed box to contact pubkey (DIGITAL) or KMS-encrypted (SERVER: Ìrántí's piece); null for PAPER
  paperFingerprint String?             // hash to verify a paper share when presented
  createdAt   DateTime  @default(now())
  revokedAt   DateTime?
  vault       Vault     @relation(fields: [vaultId], references: [id], onDelete: Cascade)
}

model Letter {
  id           String     @id @default(cuid())
  vaultId      String
  gate         LetterGate
  fireAt       DateTime?               // FIXED_DATE
  offsetDays   Int?                    // RELEASE_PLUS
  milestoneEnc String?                 // encrypted milestone description
  wrappedIdkVmk String                 // owner access
  ciphertext   String                  // or pointer to VaultFile for audio/video
  nonce        String
  status       String  @default("draft") // draft | armed | available | delivered | cancelled
  recipients   LetterRecipient[]
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  vault        Vault    @relation(fields: [vaultId], references: [id], onDelete: Cascade)
}

model LetterRecipient {
  id            String     @id @default(cuid())
  letterId      String
  lock          LetterLock
  recipientUserId String?              // RECIPIENT_KEY: their recipient account
  cardFingerprint String?              // LETTER_CARD: hash of the card's public key, to verify a scanned card
  wrappedIdk    String?                // IDK sealed to the recipient key or card public key (null for HANDOVER until re-locked)
  tlockRound    Int?                   // drand round for date-gated letters; the wrapped key is timelocked to it
  noticeContact String?                // email or phone for the "a letter is waiting" notice; the only letter field Ìrántí can read
  questionEnc   String?                // optional personal question, sealed with the letter
  availableAt   DateTime?
  openedAt      DateTime?
  letter        Letter     @relation(fields: [letterId], references: [id], onDelete: Cascade)
}

model ReleaseCase {
  id          String       @id @default(cuid())
  vaultId     String
  state       ReleaseState @default(CLAIM_OPEN)
  path        String                   // death_claim | inactivity
  openedById  String?
  evidenceSealed Json?                 // evidence sealed to each trusted contact's public key; unreadable by Ìrántí
  urgentEligibleAt DateTime?
  fullEligibleAt   DateTime?
  fastTrackEligibleAt DateTime?
  urgentOpenedAt DateTime?
  fullOpenedAt   DateTime?
  createdAt   DateTime     @default(now())
  events      ReleaseEvent[]
  vault       Vault        @relation(fields: [vaultId], references: [id], onDelete: Cascade)
}

model ReleaseEvent {
  id          String   @id @default(cuid())
  caseId      String
  type        String                   // opened | evidence_added | owner_notified | contacts_notified | owner_cancelled | confirmed | disputed | urgent_opened | full_opened | piece_issued | closed
  actorId     String?
  data        Json?                    // never secrets
  prevHash    String?
  hash        String                   // sha256(prevHash | type | actorId | data | createdAt)
  createdAt   DateTime @default(now())
  case        ReleaseCase @relation(fields: [caseId], references: [id], onDelete: Cascade)
}

model ContactNotice {                 // "Funmi can no longer act as one of your trusted people"
  id          String   @id @default(cuid())
  vaultId     String                   // the owner who relied on this contact
  contactId   String
  reason      String                   // internal only: contact_released | contact_deleted | contact_declined — never shown
  sentAt      DateTime @default(now())
  acknowledgedAt DateTime?
}

model CheckIn {
  id        String   @id @default(cuid())
  vaultId   String
  sentAt    DateTime
  channel   String
  answeredAt DateTime?
}
```

---

## 16. Phases

Every phase: typecheck · lint · tests · commit · PROGRESS.md · **STOP**.

### Phase 0 — Foundations (no product features)
1. Monorepo: pnpm workspaces, Turborepo, shared tsconfig/eslint/prettier, Vitest, Playwright, GitHub Actions CI (typecheck, lint, test on PR).
2. `apps/web` (Next.js 14, `output: 'export'`, Tailwind, design tokens from §12, base layout, marketing placeholder) and `apps/api` (Next.js route handlers only, health route, Prisma + Neon wiring).
3. `packages/crypto` skeleton with library choices installed and a first test (round-trip AEAD with AD); `packages/core`, `packages/ui`, `packages/playbooks` skeletons.
4. Write `docs/THREAT_MODEL.md` (assets, adversaries: curious server operator, database thief, rogue trusted contact, account takeover, coerced owner, malicious recipient, phishing of executors; mitigations mapped to §8/§9).
5. Write `docs/CRYPTO.md` from §8 with diagrams (Mermaid) of key hierarchy, envelopes, Shamir split, release.
6. `.env.example` complete.
**Acceptance:** `pnpm build` builds both apps; `apps/web` produces `out/`; CI green; the two docs are specific and reviewable by an outside cryptographer.

### Phase 1 — Accounts and the locked vault (web/PWA)
1. Auth (Better Auth or fallback per §6.3): email OTP sign-up/sign-in, passkey registration, session handling for web; rate limits; account deletion.
2. Vault creation flow: generate VMK and owner keypair client-side; create passkey (PRF) and passphrase envelopes; generate recovery code; **Emergency Kit PDF generated client-side** (name, email, recovery code, instructions, sign-in URL) with an enforced "I've saved/printed it" step.
3. Unlock flow (passkey → passphrase → recovery code fallbacks); auto-lock after inactivity (default 5 min, configurable); lock on tab hide (configurable).
4. Vault items: generic encrypted CRUD with Zod-validated payloads for all §5 types; encrypted file upload (chunked) to R2 via presigned URLs; encrypted download and in-browser preview.
5. PWA: manifest, icons, service worker caching app shell; offline read of previously synced ciphertext after unlock.
6. Data export (decrypted, client-side zip: JSON + files + a readable HTML summary).
**Acceptance:** DB inspection shows no plaintext for any vault content; tamper tests fail decryption; passphrase and recovery code each unlock independently; export round-trips; Lighthouse PWA installable.

### Phase 2 — The four evenings
1. Guided flows for Who / What / Wishes / Words (letters UI stub until Phase 4) using the §5 types, with templates and helpful examples.
2. Descriptive coverage summary (no percentages, no badges).
3. Life-event review flows; annual review reminder (job + email).
4. "How to register a will in the UAE" guided checklist (content as draft data in `packages/playbooks`).
5. Faith-wishes prompt sets (Christian, Muslim, Hindu, Sikh, none) — prompts only; the owner writes.
**Acceptance:** a new owner can complete all four evenings on a phone in under two hours total; every screen works offline after unlock (sync when online).

### Phase 3 — People and keys
1. Trusted contact invitations (email/SMS), acceptance flow, contact account + keypair creation (free tier forever).
2. Urgent Key and tier assignment on items; Shamir split of **both** the UK and the VMK; share distribution (DIGITAL sealed to contact pubkey; Ìrántí's piece via KMS; PAPER share kit PDF with QR and words + fingerprint stored).
3. Role assignment (executor, confirmer), quorum configuration with plain-language explanation and an unreachable-quorum warning.
4. Re-share on contact changes; "rotate vault key" flow.
5. Contact-side view: "You've been trusted by Ade. Here's what that means." (no vault access), including consent to the "can no longer act" notice.
6. "My Ìrántí" and "Trusted by others" as two clear areas for people who are both owners and contacts; their own vault and the pieces they hold for others never mix.
7. `ContactNotice`: when a contact's own vault reaches `FULL_OPEN`, or they delete their account or decline, notify every owner who relied on them, gently and without the reason; recompute and warn on unreachable quorums.
**Acceptance:** property tests: any k valid shares reconstruct; k−1 never do; removed contacts' shares are revoked and new shares issued; paper share verification works by scanning the QR.

### Phase 4 — Letters and time capsules
1. Letter editor (text), in-app audio recorder, video recorder/upload with chunked encryption and size limits.
2. Recipients, gates (§7), and a per-recipient lock choice (own key, letter card, hand-over) with a one-line plain explanation of each.
3. The three letter locks (§7.1): recipient accounts and their keys; **letter cards** (generate on device, print, erase, verify fingerprint on scan); hand-over (re-lock on the executor's device). Timelock date gates with `tlock-js`; a notice job for letters becoming available (works while the owner is alive).
4. Recipient delivery page `/r/[id]`: OTP verification, optional personal question, in-browser decryption, permanent download.
5. Owner preview of each recipient's experience.
**Acceptance:** a FIXED_DATE letter timelocked to "in 5 minutes" in staging can't be opened before then by anyone, opens for the recipient after; a letter-card letter opens only with the printed card; a test with full database, storage and every COTEK key confirms no letter can be decrypted server-side.

### Phase 5 — Check-ins and the release protocol
1. Check-in scheduler (optional per owner) with multi-channel escalation per §9.
2. Release state machine (§9) with both tiers, owner settings and fast-track, every transition as a hash-chained `ReleaseEvent`; immediate notification of the owner and all trusted contacts on a claim; evidence sealed to trusted contacts' public keys only.
3. Waiting period with daily owner contact on all channels; one-tap cancel by unlocking.
4. Confirmations; DISPUTED freeze with an internal support console (two-person rule) and `docs/RUNBOOK_RELEASE.md`.
5. Issuing Ìrántí's pieces per tier (single-use, executor-only, audit-logged); executor-device reconstruction of the UK then the VMK; executor workspace shell; hand-over letter re-locking.
6. CLOSED and retention/deletion schedule.
**Acceptance:** e2e tests with a fake clock for:
- claim → owner cancels within the urgent wait;
- claim → confirmation → urgent tier opens at 48 h → owner responds → full tier never opens, Urgent Key rotation offered;
- claim → two confirmations + certificate → fast-track opens the full tier at 72 h;
- claim → one confirmation → full tier opens at 14 days;
- inactivity claim never fast-tracks;
- nothing ever opens under 24 h.

The audit chain verifies. **The zero-knowledge test:** with a full copy of the database and storage plus every COTEK key including KMS, no vault item, file, letter or evidence can be decrypted.

### Phase 6 — Playbooks and Ìtàn
1. Playbook engine: MDX/JSON schema, personalisation by owner wishes and jurisdiction, document attachment per step, executor task assignment to family members.
2. UAE draft playbook skeleton (§10) flagged as draft; a visible "Draft — under legal review" banner until `reviewedAt` is set.
3. Public (no-login) UAE "What to do when someone dies in the UAE" guide page from the playbook — useful to everyone, good for SEO, and the top of the funnel.
4. Ìtàn: streaming chat in the four evenings and executor workspace, data boundaries (§11.3), safety protocol (§11.4), eval suite (letter help, legal-advice deflection, suicidal ideation, grief, terminal illness, prompt injection via pasted documents).
**Acceptance:** all Ìtàn eval cases pass; public guide renders statically with full SEO metadata; no vault plaintext is ever sent to the model without an explicit user action (test with request interception).

### Phase 7 — Native apps (Capacitor)
1. Add Capacitor 8 to `apps/web` (`webDir: 'out'`), iOS and Android projects, app id `app.cotek.iranti` (confirm), splash and icons.
2. Native plugins (verify current maintained options): biometric authentication, secure storage (Keychain/Keystore) for the device envelope, push notifications, camera, document scanner, filesystem/share for exports, app lifecycle (auto-lock on background), privacy screen (blur in app switcher).
3. Bearer-token auth path for native; deep links/universal links for invites, recipient pages, and release notifications.
4. Store assets and metadata drafts; privacy nutrition labels; account deletion in-app.
5. Build scripts: `pnpm mobile:build` (static export → `cap sync`), `pnpm mobile:ios`, `pnpm mobile:android`.
**Acceptance:** on physical iPhone and Android devices: biometric unlock, push for check-ins, document scan → encrypted upload, background auto-lock, privacy screen. (Claude Code prepares; Temi runs Xcode/Android Studio builds and device tests.)

### Phase 8 — Hardening and launch readiness
1. External cryptography review and penetration test (Temi commissions; Claude Code prepares the review pack: CRYPTO.md, THREAT_MODEL.md, code map, test vectors).
2. Fix findings; add regression tests.
3. Privacy policy, terms, sub-processor list, PDPL/GDPR records, cookie-less analytics.
4. Continuity pledge tooling and runbook (§13).
5. Load test (scheduled delivery burst; release events), backup/restore drill (Neon PITR, R2 versioning), incident response runbook.
6. Accessibility (WCAG 2.2 AA), large-text mode, reduced motion.
7. App Store / Play submission.
**Acceptance:** review findings resolved or accepted in writing; restore drill documented; both stores approved.

### Phase 9 — Final: growth and depth
1. **Household plan:** mirrored vaults for couples, reciprocal roles, shared people list.
2. **Incapacity mode** (§9).
3. **Localisation:** Arabic (RTL), Hindi, Malayalam, Tagalog, Yoruba, French; country playbooks for Nigeria, India, Philippines, UK, Pakistan (each with local legal review).
4. **Partner channel:** referral links for registered-will services and law firms; employer HR benefit edition (bulk seats, zero access to employee vaults); insurer partnerships (repatriation cover prompts).
5. **COTEK links:** optional sign-in with a COTEK account; document hand-off to Ilé's family vault (only on the owner's explicit action).
6. Pricing and billing (Stripe or a UAE-suitable processor; in-app purchase rules for iOS/Android digital subscriptions).
**Acceptance:** each sub-feature ships behind a flag with its own tests; Arabic RTL passes visual review.

---

## 17. Pricing (suggested — Temi decides)
- **Free:** vault with core sections, 2 trusted contacts, 3 text letters, UAE playbook, Emergency Kit.
- **Ìrántí Plus (annual):** unlimited items and contacts, audio/video letters, date-gated letters and letter cards, inactivity path, all playbooks, priority support.
- **Household:** two mirrored vaults.
- **Trusted contacts and recipients are always free.**
- Consider a one-time "lifetime" plan only once the continuity custodian is contracted.

---

## 18. Environment variables (`.env.example`)

```
# API
DATABASE_URL=                 # Neon pooled
DIRECT_URL=                   # Neon direct (migrations)
AUTH_SECRET=
AUTH_URL=https://api.iranti.cotek.app
WEB_ORIGIN=https://iranti.cotek.app
CAPACITOR_ORIGINS=capacitor://localhost,https://localhost

# Storage
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET=iranti-vault

# KMS — protects only Ìrántí's key pieces (choose one provider)
AWS_REGION=
AWS_KMS_KEY_ID_PIECES=
# GCP_KMS_KEY_PIECES=

# Timelock (drand)
DRAND_CHAIN_URL=              # e.g. the drand quicknet endpoint; verify current

# Jobs / messaging
TRIGGER_SECRET_KEY=
RESEND_API_KEY=
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_FROM=
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_ACCESS_TOKEN=

# AI
ANTHROPIC_API_KEY=
ANTHROPIC_MODEL_DEFAULT=claude-sonnet-5-5
ANTHROPIC_MODEL_FAST=claude-haiku-5-5

# Monitoring
SENTRY_DSN=

# Web (public)
NEXT_PUBLIC_API_URL=https://api.iranti.cotek.app
NEXT_PUBLIC_SITE_URL=https://iranti.cotek.app
```

---

## 19. Open decisions for Temi
1. Companion name: Ìtàn, or another.
2. KMS provider: AWS or Google Cloud.
3. Default quorum (k = 2 with Ìrántí's piece) and default timings: urgent tier 48 hours, full tier 14 days, fast-track 2 confirmations + certificate + 72 hours.
8. Reliance on the public drand network for date-gated letters (it can only stop letters opening early; it can never read them). Confirm comfort with that dependency.
4. Who reviews the UAE playbook legally, and which receiving-country playbook comes first (Nigeria?).
5. Continuity custodian (a UAE law firm?) before any lifetime plan.
6. Brand mark commission (open ring + flame direction).
7. Budget and timing for the external crypto review — non-optional before public launch.
