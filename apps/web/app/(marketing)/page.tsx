import { Card, Eyebrow, Mark } from "@iranti/ui";
import type { EyebrowLabel } from "@iranti/ui";

// Marketing placeholder (Phase 0). Copy here must stay true of the product as built; market
// statistics from BUILD.md §1 are deliberately left out until verified.

const evenings: Array<{ label: EyebrowLabel; title: string; body: string }> = [
  {
    label: "WHO",
    title: "Who to call",
    body: "The people your family should reach first, in your order, and the people you trust to act for you.",
  },
  {
    label: "WHAT",
    title: "What you have",
    body: "Accounts, policies, property and documents, and where your will is kept.",
  },
  {
    label: "WISHES",
    title: "What you want",
    body: "Your body and rites, your funeral, your children and your digital life, in your own words.",
  },
  {
    label: "WORDS",
    title: "What you'd say",
    body: "Letters to the people you love, delivered after you've gone or on a day you choose.",
  },
];

export default function HomePage() {
  return (
    <main className="mx-auto max-w-5xl px-4 pb-20 pt-8 sm:px-6">
      <header className="flex items-center gap-3">
        <Mark size={30} />
        <span className="font-display text-xl font-medium">Ìrántí</span>
      </header>

      <section className="pb-14 pt-16 sm:pt-24" aria-labelledby="hero-title">
        <Eyebrow>Remembrance</Eyebrow>
        <h1
          id="hero-title"
          className="mt-3 max-w-[18ch] font-display text-[clamp(2.4rem,6vw,4.2rem)] font-medium leading-[1.05]"
        >
          Leave your family clarity, not chaos.
        </h1>
        <p className="mt-6 max-w-[60ch] font-read text-[19px] leading-relaxed text-ink/90">
          When someone dies, the people they love are left with a locked phone, accounts nobody can
          find and decisions nobody knows how to make. Over a few quiet evenings, Ìrántí helps you
          gather what your family would need, and opens it to the people you chose, only when the
          steps you set have happened.
        </p>
        <p className="mt-8 inline-flex items-center gap-2 rounded-full border border-line bg-surface px-4 py-2 text-[15px] text-muted">
          <span className="size-2 rounded-full bg-accent" aria-hidden />
          In preparation. Not yet open for sign-up.
        </p>
      </section>

      <section aria-labelledby="evenings-title" className="border-t border-line pt-12">
        <h2 id="evenings-title" className="font-display text-3xl font-medium">
          Four quiet evenings
        </h2>
        <p className="mt-2 max-w-[60ch] text-muted">
          Twenty to forty minutes each, in any order. Nothing to finish in one sitting.
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {evenings.map((e) => (
            <Card key={e.label}>
              <Eyebrow>{e.label}</Eyebrow>
              <h3 className="mt-2 text-lg font-medium">{e.title}</h3>
              <p className="mt-1 text-[16px] text-muted">{e.body}</p>
            </Card>
          ))}
        </div>
      </section>

      <section aria-labelledby="private-title" className="mt-16 border-t border-line pt-12">
        <Eyebrow>Protocol</Eyebrow>
        <h2 id="private-title" className="mt-2 font-display text-3xl font-medium">
          Nobody at COTEK can read it
        </h2>
        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          <p className="text-ink/90">
            Everything you add is locked on your own device before it reaches us, with keys we never
            hold. What we store is scrambled data we cannot unscramble, and there is no master key.
          </p>
          <p className="text-ink/90">
            Your key is split between the people you trust and Ìrántí, so opening it always takes
            more than one. While you&apos;re alive, any claim waits at least a day, you&apos;re
            contacted on every channel, and opening the app stops it.
          </p>
        </div>
      </section>

      <footer className="mt-20 border-t border-line pt-8 text-[15px] text-muted">
        <p>
          Ìrántí is not a will and not legal advice. It helps you get a proper registered will and
          keeps a note of where it is.
        </p>
        <p className="mt-2">Made by Cotek App FZ-LLC, Ras Al Khaimah, United Arab Emirates.</p>
      </footer>
    </main>
  );
}
