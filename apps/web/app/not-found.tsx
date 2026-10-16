import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center px-4 py-16">
      <p className="font-mono text-[13px] uppercase tracking-[0.14em] text-muted">Not found</p>
      <h1 className="mt-2 font-display text-4xl font-medium">This page isn&apos;t here.</h1>
      <p className="mt-4 text-muted">
        <Link href="/" className="text-accent underline-offset-4 hover:underline">
          Go to the home page
        </Link>
      </p>
    </main>
  );
}
