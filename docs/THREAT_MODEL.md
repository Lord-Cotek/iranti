# Ìrántí threat model

**Status:** v0.2 · Phase 1 · 16 October 2026 · for external review with `CRYPTO.md`
**Scope:** the web/PWA client, the Capacitor apps (Phase 7), the API, the database, object
storage, KMS, jobs and messaging, and the people in BUILD.md §3.

Section references like "§8.4" are to BUILD.md; "C§5" is CRYPTO.md.

---

## 1. Assets

| Asset                                                     | Why it matters                                                        | Where it lives                                    |
| --------------------------------------------------------- | --------------------------------------------------------------------- | ------------------------------------------------- |
| A1 Vault contents (items, titles, files)                  | Financial, identity and family secrets                                | Ciphertext in Neon and R2                         |
| A2 Letters, audio, video, personal questions              | Irreplaceable last words                                              | Ciphertext in Neon and R2                         |
| A3 Claim evidence                                         | Death certificates, hospital and police letters                       | Ciphertext, sealed to trusted contacts            |
| A4 Keys: AK, VMK, UK, IDKs, private keys                  | Each unlocks some of A1–A3                                            | Devices only; wrapped copies on the server        |
| A5 Shares and Ìrántí's pieces                             | With each other, they rebuild the UK or VMK                           | Contacts' devices, paper, KMS-encrypted on server |
| A6 Unlock secrets: passphrase, recovery code, passkey PRF | Unwrap the AK                                                         | The owner; the Emergency Kit on paper             |
| A7 Release integrity                                      | A wrong release exposes a living person; a blocked one fails a family | API state machine, audit chain                    |
| A8 Account and contact metadata                           | Who trusts whom, timings, contact details for notices                 | Plaintext in Neon                                 |
| A9 Availability of the vault after death                  | The whole point of the product                                        | Neon, R2, KMS, the code, drand                    |
| A10 Client code integrity                                 | Malicious client code defeats zero-knowledge                          | Vercel (PWA), app stores (native)                 |

## 2. Trust assumptions

- The owner's, executors' and recipients' devices are not compromised at the time they use
  keys.
- The libraries in C§2 are correct; the platform CSPRNG is sound.
- TLS to `iranti.cotek.app` and `api.iranti.cotek.app` is intact.
- The native apps users install are the reviewed builds.
- drand's threshold network does not publish a round early (§4.11).
- COTEK is trusted for **availability and for enforcing release timing**, and **not trusted
  for confidentiality**. This split is deliberate and is stated in the privacy policy.

## 3. Adversaries

| ID  | Adversary                         | Capabilities                                                                                 |
| --- | --------------------------------- | -------------------------------------------------------------------------------------------- |
| T1  | Curious server operator / insider | Reads and writes the database, storage and logs; deploys code; can call KMS within IAM rules |
| T2  | Database or storage thief         | A full copy of Neon and R2, possibly old backups; no KMS access                              |
| T3  | Rogue trusted contact             | Holds one share; can open false claims, confirm or dispute; social access to the family      |
| T4  | Account takeover                  | Owns an owner's, contact's or executor's email and/or phone; phishing, SIM swap              |
| T5  | Coercer of the owner              | Forces the owner to unlock, export, add a contact or change settings                         |
| T6  | Malicious recipient               | Holds a recipient key or a letter card; wants letters early or letters meant for others      |
| T7  | Phisher of executors              | Fake "Ìrántí" messages during grief to harvest shares, OTPs or evidence                      |
| T8  | Legal compulsion                  | A court or authority orders COTEK to produce data or to release a vault                      |
| T9  | Malicious code delivery           | Compromised Vercel account, CI, dependency or CDN that ships altered client JS               |
| T10 | Network attacker                  | On-path; TLS assumed intact                                                                  |
| T11 | Colluding contacts                | Several contacts acting together without COTEK                                               |
| T12 | Abusive family member             | A contact or household member using the release flow to harm or surveil a living owner       |

## 4. Threats and mitigations

Each threat lists its adversary, the mitigation (with where it is specified), and what risk
remains.

### 4.1 T1 reads vault content

- **Mitigation:** client-side encryption of every item, title, file and letter (§5, C§3);
  the server holds only wrapped keys and Ìrántí's pieces (C§5.3). Zero-knowledge test in
  Phase 5 (C§10).
- **Residual:** T1 learns metadata (A8). T1 also controls code delivery for the PWA (§4.8).

### 4.2 T1 releases a vault early

- **Mitigation:** release needs `S_irn` **and** a contact share (C§5.2). T1 has `S_irn`, not
  contact shares. Every claim notifies the owner and all contacts at once on every channel
  (§9). Audit chain with client-pinned heads (C§8).
- **Residual:** timing is enforced by the server. T1 plus one colluding contact can open
  under the default `k_c = 1`. Owners can raise `k_c` (C§5.2). Stated in the privacy policy §3.

### 4.3 T1 substitutes a contact's public key

- **Mitigation:** invite-secret MAC delivered through the owner's own channel, key pinning
  under the VMK, optional fingerprint comparison (C§6.1).
- **Residual:** weaker when the owner lets COTEK deliver the invite; the UI says so.

### 4.4 T1 rolls back or swaps ciphertext

- **Mitigation:** AD binds ciphertext to vault, item, revision, tier and purpose (C§4).
- **Residual:** rollback to an older revision of the same item (C§4.5); manifest proposed.

### 4.5 T2 steals the database and storage

- **Mitigation:** everything sensitive is ciphertext under keys not in the database. AK
  envelopes need the passphrase (Argon2id, C§3.2.2), the recovery code (160-bit), or a passkey
  PRF. Ìrántí's pieces are KMS-encrypted; T2 has no KMS access.
- **Residual:** offline guessing of weak passphrases. Mitigated by a minimum strength check
  and Argon2id; users are nudged to passkeys. Metadata (A8) is exposed.

### 4.6 T3 opens a false claim

- **Mitigation:** owner contacted immediately on every channel and daily during the wait;
  one tap cancels (§9). Waiting periods never under 24 hours. Other contacts can dispute,
  which freezes the claim for human review (`RUNBOOK_RELEASE.md`). Inactivity alone never
  opens anything. Inactivity claims never fast-track and use longer floors.
- **Residual:** an owner who is unreachable for longer than the urgent wait (hospitalised,
  travelling) could have the urgent tier opened. The urgent tier is designed to be what
  the family needs in the first days, and the owner is shown exactly what was opened and
  can rotate the UK.

### 4.7 T3 rebuilds keys alone; T11 contacts collude

- **Mitigation:** composite quorum: contacts alone never hold `S_irn` (C§5.2). The
  `CONTACTS_ONLY` option is off by default and explained when enabled.
- **Residual:** if the owner enables `CONTACTS_ONLY`, `k'` colluding contacts can open.

### 4.8 T9 ships malicious client code

- **Mitigation:** native apps bundle the reviewed client (§6.1); store review; signed builds.
  For the PWA: strict CSP (baseline in `apps/web/vercel.json`, tightened in Phase 1), no
  third-party scripts on vault screens, pinned dependency versions with a lockfile, CI on every
  change, Vercel access with 2FA and least privilege. Proposed for Phase 8: publish build
  hashes per release so the bundle can be checked.
- **Residual:** a user of the hosted PWA trusts each page load. This is true of every web
  end-to-end encrypted product and is listed honestly in the security page.

### 4.9 T4 takes over an account

- **Mitigation:** signing in does not unlock (C§3.2). An attacker with only email/phone
  reaches ciphertext they cannot decrypt. Passkeys preferred. **Every write** (items, files,
  unlock methods, account deletion) requires a proof-of-unlock signature from a key derived
  from the Account Key (C§3.4), so a stolen session can read ciphertext but cannot alter,
  delete or lock the owner out. Adding or removing an unlock method emails the owner. One-time
  codes are stored hashed, expire in 10 minutes, allow 5 attempts, and sending is rate-limited
  per IP (5 per 10 minutes).
- **Residual:** taking over a **contact's** account gives the attacker the ability to open
  or confirm claims, but not to open the contact's share (it needs the contact's AK). A
  takeover of an executor's account **and** unlock secret is equivalent to T3.

### 4.10 T5 coerces the owner

- **Mitigation:** none cryptographic can stop a coerced unlock. Settings changes that weaken
  release (shorter waits, lower `k_c`, enabling `CONTACTS_ONLY`) take effect after a
  delay (proposed 72 hours) with notices to existing contacts.
- **Residual:** accepted. Ìrántí is not designed to resist an attacker with the owner in the
  room.

### 4.11 T6 opens letters early or reads others' letters

- **Mitigation:** each letter is sealed per recipient (C§7.1). `FIXED_DATE` letters are
  timelocked to a drand round (C§7.3). Release-gated letters are withheld by the server until
  release. Letter card fingerprints prevent a card being used for the wrong letter.
- **Residual:** a recipient who holds a card could open a release-gated letter early if the
  server wrongly released its ciphertext (server-enforced timing). drand round publication is
  trusted not to happen early.

### 4.12 T7 phishes executors

- **Mitigation:** Ìrántí never asks for a share, recovery code or passphrase by email,
  SMS or WhatsApp. Notices contain no links that accept secrets; they say to open the app.
  Shares are only ever opened inside the app. Messaging uses a verified sender, consistent
  wording, and the public guide explains what Ìrántí will never ask for.
- **Residual:** grieving people are vulnerable; copy and support training matter.

### 4.13 T8 compels COTEK

- **Mitigation:** COTEK can produce only what it can read (A8; privacy policy §8). It cannot
  decrypt vaults, and cannot release a vault without an executor's share.
- **Residual:** COTEK could be compelled to release `S_irn` to someone who already holds a
  contact share, or to ship altered PWA code (§4.8). Transparency reporting is proposed.

### 4.14 T12 abusive family member

- **Mitigation:** claims notify the owner first and always; the owner can remove a contact
  and rotate keys; contacts never see the vault before release; the owner sees an audit of
  every claim.
- **Residual:** an owner who cannot safely use their own phone. Support runbook covers this.

### 4.15 Availability (A9)

- **Threats:** COTEK stops operating; KMS key deleted; drand stops; Neon or R2 data loss.
- **Mitigation:** continuity pledge and runbook (§13), custodian transfer of ciphertext and
  pieces; `CONTACTS_ONLY` option for owners who want independence from COTEK; Neon PITR and R2
  versioning with restore drills (Phase 8); KMS key deletion protection with a waiting period
  and two-person approval; owner export at any time.
- **Residual:** if the owner loses every envelope, the vault is unrecoverable by design.

### 4.15a Pre-launch exposure

- **Threat:** the product is reachable before the external cryptography review (BUILD.md
  Phase 8).
- **Mitigation:** in Vercel production, account creation is closed unless the address or
  domain is on `SIGNUP_ALLOWLIST`; codes are not even sent to unknown addresses, and the
  response does not reveal the allowlist.

### 4.16 Leakage through logs, monitoring, analytics and AI

- **Mitigation:** never log secrets (ESLint rule and CI grep); Sentry with an allow-list and
  no replay on vault screens; analytics never on vault content; Ìtàn receives only what the
  user types in that turn, and nothing is stored server-side (§11.3).
- **Residual:** what a user chooses to paste into Ìtàn reaches the AI provider under its
  commercial terms.

## 5. Mitigation map

| Threat                | §8 (crypto) / C§                              | §9 (protocol)                             | Other                                 |
| --------------------- | --------------------------------------------- | ----------------------------------------- | ------------------------------------- |
| 4.1 T1 reads content  | Client-side AEAD, C§3, C§4                    | —                                         | Zero-knowledge test (Phase 5)         |
| 4.2 T1 early release  | Composite quorum, C§5.2                       | Notices, waits, audit chain               | Privacy policy honesty                |
| 4.3 Key substitution  | Invite MAC, pinning, C§6.1                    | —                                         | UI warning on server-delivered invite |
| 4.4 Swap / rollback   | AD binding, C§4                               | —                                         | Manifest (proposed)                   |
| 4.5 DB theft          | Envelopes, Argon2id, KMS, C§3.2               | —                                         | Passphrase strength, passkeys         |
| 4.6 False claim       | —                                             | 24 h floor, owner cancel, disputes        | RUNBOOK_RELEASE.md                    |
| 4.7 Contact collusion | Composite quorum, C§5.2                       | —                                         | `CONTACTS_ONLY` off by default        |
| 4.8 Malicious code    | —                                             | —                                         | Native bundle, CSP, build hashes      |
| 4.9 Account takeover  | Login ≠ unlock; proof of unlock, C§3.2, C§3.4 | Every write signed by the unlocked device | Passkeys, notices, OTP limits         |
| 4.10 Coercion         | —                                             | Delayed weakening of settings             | Accepted                              |
| 4.11 Early letters    | Per-recipient seal, tlock, C§7                | Server gating                             | —                                     |
| 4.12 Phishing         | Shares opened only in-app                     | —                                         | Copy, public guide                    |
| 4.13 Compulsion       | Zero-knowledge, C§1                           | Release needs a contact share             | Transparency report                   |
| 4.15 Availability     | `CONTACTS_ONLY`, export                       | —                                         | Continuity runbook, backups           |
| 4.16 Logs / AI        | —                                             | —                                         | Lint + CI grep, Sentry allow-list     |

## 6. Out of scope

- Compromised end-user devices, malware, keyloggers.
- An attacker physically present with the owner (§4.10).
- Side channels on end-user hardware.
- Quantum adversaries. X25519 and the BLS12-381 timelock are not post-quantum; long-lived
  letters are therefore exposed to a future "harvest now, decrypt later" attacker who has the
  ciphertext. Revisit when a vetted post-quantum KEM is available in libsodium or WebCrypto.

## 7. Review triggers

Update this document when: a new adversary or asset appears; any change to CRYPTO.md; a
new third party receives data; release protocol rules change; before Phase 8 external review.
