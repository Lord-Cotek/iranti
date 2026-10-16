# Ìrántí Privacy Policy

**Draft for legal review — not yet in force.** Items in [square brackets] must be confirmed before publication. This draft describes Ìrántí as designed in `IRANTI_BUILD.md` v1.1; every sentence must remain true of the shipped product.

Effective date: [date]
Last updated: [date]

---

## The short version

Ìrántí keeps the things your family would need if you died: who to call, what you own, what you want, and letters to the people you love.

**We cannot read any of it.** Not now, not after you die, not if we're asked to, not if we wanted to. Everything you put in your vault is locked on your own device before it reaches us, with keys we never have. What we store is scrambled data we can't unscramble.

That's a real promise with a real cost. If you lose every way of unlocking your vault (your passkey, your passphrase and your recovery code), we can't get it back for you. Neither can anyone else.

We don't sell your data, we don't show ads, and we don't use anything you write to train AI.

---

## 1. Who we are

Ìrántí is made by **Cotek App FZ-LLC**, a company registered in the Ras Al Khaimah Economic Zone (RAKEZ), United Arab Emirates, licence number 47031236 ("COTEK", "we", "us").

Registered address: [address]
Privacy contact: [privacy email — e.g. privacy@cotek.live] or support@cotek.live

For people in the European Economic Area or the United Kingdom, our representative is: [name and address, if required].

---

## 2. What we can never see

Because of how Ìrántí is built, the following are locked on your device, or on your trusted people's devices, before they reach us. We hold them only in a form we cannot read:

- everything in your vault: people, accounts, property, insurance, documents, wishes, digital accounts, sealed notes, and their titles;
- files and photos you add;
- your letters, audio and video, and any personal question you set for a recipient;
- the evidence a trusted person uploads when they open a claim (for example, a death certificate);
- your passphrase, recovery code and the private parts of your keys.

**No one at COTEK can open your vault, including our engineers and support team.** There is no master key and no back door. A complete copy of our databases and file storage, together with every key COTEK holds, is not enough to read any of the above. We test for this before every release [confirm process].

---

## 3. How your vault opens, and what we can see when it does

Your vault can only be opened by the people you chose, following rules you set.

When you set up Ìrántí, your device splits the keys to your vault into pieces. Your trusted people each hold a piece on their own device, or on a printed paper key. We hold one piece too. **A piece on its own opens nothing.** Opening your vault needs our piece together with one of your executors' pieces, and we only release ours when the steps you chose have happened: a claim, a waiting period, and confirmation from your trusted people. The opening then happens on your executor's own device, not on our servers.

Your vault opens in two stages. Urgent details first (such as who to call and your funeral wishes), and everything else later. Each stage has its own key, so the first never reveals the second.

During this process we can see:
- that a claim was opened, by whom, and when;
- who confirmed or disputed it, and when;
- when each stage opened, and to whom we released our piece.

We cannot see the evidence they upload or anything in your vault. If you respond while a claim is open, it stops.

If you choose the advanced setting that lets your trusted people open your vault without us, our piece isn't needed at all.

---

## 4. Letters

Each letter is locked to the person it's for, in one of three ways you choose:

- **Their own Ìrántí key.** Only they can open it.
- **A printed letter card.** Only whoever holds the card can open it.
- **Hand-over by your executor.** Your executor's device prepares it for the recipient. **This means your executor could open it.** We tell you this when you choose this option.

Dated letters are also timelocked to their date using a public timelock service (drand). That means no one can open them early, including the recipient and us. The timelock service never receives your letters or any personal information.

To let someone know a letter is waiting, we need an email address or phone number for them, or for their guardian. **That contact detail is the only part of a letter we can read.** The message we send says only that someone left them a letter through Ìrántí.

---

## 5. What we do hold

To run Ìrántí we hold some information we *can* read. We keep it to the minimum the service needs.

| What | Why |
|---|---|
| **Your account:** email address, phone number (if you add one), country, time zone, sign-in records | To let you sign in, contact you, and protect your account |
| **Your vault in locked form:** the scrambled data, its size, how many items are in each section, which stage each item opens in, and when items were added or changed | To store and sync your vault. We can't read it |
| **Your trusted people:** the email or phone you use to invite them, their Ìrántí account once they accept, their role (executor or confirmer), and their locked key pieces | To invite them, run the release process and reach them during it |
| **Letter notices:** the contact detail for each recipient or their guardian, and when a letter becomes available or is opened | To tell people a letter is waiting |
| **Release records:** claims, confirmations, disputes, timings, and the history of each step | To run the process you chose and keep a tamper-evident record of it |
| **Check-ins** (if you turn them on): when we asked and when you answered | To check in on you as you asked |
| **Payments:** your plan and billing status. Card details are handled by our payment provider or app store; we never see your card number | To manage your subscription |
| **Technical data:** IP address, device type, operating system, app version, and error reports, with vault contents excluded by design | To keep the service working and secure |
| **Support messages** you send us | To help you |

What this means plainly: even though we can't read your vault, some facts are visible to us. These include that you have an Ìrántí account, who your trusted people are, roughly how much you've stored, and when things happen. We protect these with the same care as everything else.

---

## 6. Ìtàn, the writing companion

Ìtàn is optional and only runs when you open it. When you use it, what you type in that conversation is sent through our servers to our AI provider, [Anthropic], to produce a reply.
- We don't store or log those conversations on our servers.
- Ìtàn never receives anything from your vault unless you paste it in yourself.
- If you choose to keep your Ìtàn history, it's locked in your vault like everything else.

Our AI provider processes this text under a commercial agreement that does not allow it to use your content to train its models. [Confirm current provider terms and retention, and describe them accurately here.]

---

## 7. How we use information

We use the information in section 5 only to:
- provide Ìrántí: storing your vault, syncing devices, running the release process, sending letter notices and check-ins;
- keep accounts and the service secure, and prevent abuse such as false claims;
- provide support;
- meet our legal obligations.

We do not:
- sell or rent personal information;
- use it for advertising, or show ads;
- build profiles of you;
- use your content to train AI, which we couldn't do anyway since we can't read it.

**Our legal bases** (for people protected by the UAE Personal Data Protection Law or the GDPR):
- **providing the service you asked for** (contract), for most of the above;
- **our legitimate interest** in keeping Ìrántí secure and preventing abuse;
- **legal obligation**, where the law requires us to keep or disclose something;
- **your consent**, where we ask for it, for example optional notifications. You can withdraw consent at any time.

---

## 8. Who we share information with

We use trusted service providers to run Ìrántí. They process information only on our instructions and under contracts that require them to protect it. **None of them can read your vault either;** they only ever handle it in locked form.

| Provider | Purpose | Location |
|---|---|---|
| [Vercel] | Hosting the app and API | [region] |
| [Neon] | Database | [region] |
| [Cloudflare R2] | Storing locked files | [region] |
| [Amazon Web Services or Google Cloud] | Protecting our key pieces in a key-management service | [region] |
| [Resend] | Email | [region] |
| [Twilio / Meta WhatsApp] | SMS and WhatsApp messages | [region] |
| [Apple, Google] | Push notifications | [region] |
| [Anthropic] | Ìtàn replies, only when you use Ìtàn | [region] |
| [Sentry] | Error reports, with vault contents excluded | [region] |
| [Plausible / PostHog] | Privacy-focused usage statistics, never vault content | [region] |
| [Stripe / Apple App Store / Google Play] | Payments | [region] |

We may share information if we're legally required to, to protect someone's safety, or as part of a sale or reorganisation of COTEK. In that last case this policy, and the fact that we can't read your vault, continues to apply.

**Requests from authorities.** If we receive a valid legal order, we can only provide what we hold in readable form (section 5). We cannot provide the contents of a vault, letters or evidence, because we cannot read them. Unless the law forbids it, we'll tell you about any request concerning your account.

---

## 9. Where your information is kept

Our main data is stored in [region(s)]. Some providers may process information in other countries. When information leaves the UAE, the EEA or the UK, we use the safeguards the law requires, such as standard contractual clauses. [Confirm data region and transfer mechanisms.]

Your locked vault can be stored anywhere without risk to its contents, because only your devices and your trusted people's devices can unlock it.

---

## 10. How long we keep information

- **While your account is open:** as long as you use Ìrántí.
- **After your vault is opened:** your executors can reach it for the period you chose (2 years by default). After that we remind them to save what they need, then delete it.
- **If you delete your account:** we delete your vault, letters not yet delivered, and your account details within [30] days. Copies in backups are erased within a further [35] days. Your trusted people are told they no longer hold a role for you.
- **Release records:** kept for [X years] after a process ends, so that a family dispute can be checked against what actually happened. These records never contain vault contents.
- **Legal obligations:** some records, such as billing, are kept for as long as the law requires.

---

## 11. How we protect information

- Your vault is encrypted on your device with modern, audited methods before it's sent.
- Keys are split so no single person or company can open a vault.
- Our key pieces are held in a dedicated key-management service with access logging.
- Every step of a release is recorded in a tamper-evident log.
- We commission independent security and cryptography reviews [before launch and periodically].

No system is perfectly secure. Your own device matters too: use a screen lock, keep your recovery code somewhere safe, and choose trusted people you'd trust with your life's paperwork.

---

## 12. Your rights

Depending on where you live, you have the right to:
- access the personal information we hold about you;
- correct it if it's wrong;
- delete it;
- receive it in a portable format;
- restrict or object to some uses of it;
- withdraw consent you've given;
- complain to a data protection authority. In the UAE, that's the UAE Data Office. In the EEA or UK, it's your local supervisory authority.

Because we can't read your vault, a request for "your data" covers what's in section 5. **You can export your entire vault yourself, at any time, from the app,** fully readable, because your device unlocks it. You can delete your account from the app.

To exercise any right, contact us at [privacy email]. We'll respond within the time the law requires, usually [30] days.

---

## 13. Trusted people and letter recipients

If someone has chosen you as a trusted person, we hold the email or phone they invited you with. Once you accept, we hold your Ìrántí account, your role, and a locked piece of their key that only your device can use. You can't see their vault unless and until the release process they chose completes.

If you accept a trusted-person role, you agree that if your own Ìrántí is ever opened, or you delete your account, the people who rely on you will be told you can no longer act for them. They won't be told why.

If someone has written you a letter, we hold only the contact detail they gave us so we can tell you when it's ready.

You can ask us to stop contacting you, or decline a role, at any time.

---

## 14. Children

Ìrántí accounts that hold a vault are for adults aged 18 and over. A parent may write letters to a child and print a letter card for them, and may give us a guardian's contact so we can say when a letter is ready. Recipient accounts for younger people are offered only where local law allows [confirm minimum age per market].

---

## 15. If COTEK ever closes

We've committed to giving everyone at least 90 days' notice, time to export their vaults, and a way for letters still waiting to reach the people they're for. Because letters are locked to their recipients, they can be handed over without anyone being able to read them.

---

## 16. Changes to this policy

If we change this policy, we'll update the date at the top. If a change materially affects how we handle your information, we'll tell you in the app or by email before it takes effect.

We will never change Ìrántí so that we can read your vault.

---

## 17. Contact

Cotek App FZ-LLC
[Registered address], Ras Al Khaimah, United Arab Emirates
[privacy email] · support@cotek.live
