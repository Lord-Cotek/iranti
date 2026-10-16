"use client";

/**
 * Passphrase strength (CRYPTO.md §3.2.2). Argon2id slows an attacker who has the database;
 * it cannot save a weak passphrase. zxcvbn is loaded only on the screens that need it.
 */
export interface Strength {
  ok: boolean;
  score: 0 | 1 | 2 | 3 | 4;
  message: string;
}

export const MIN_PASSPHRASE_LENGTH = 12;

type Check = (pw: string) => { score: 0 | 1 | 2 | 3 | 4; feedback: { warning: string | null } };
let loader: Promise<Check> | null = null;

function load(): Promise<Check> {
  loader ??= (async () => {
    const [{ ZxcvbnFactory }, common, en] = await Promise.all([
      import("@zxcvbn-ts/core"),
      import("@zxcvbn-ts/language-common"),
      import("@zxcvbn-ts/language-en"),
    ]);
    const factory = new ZxcvbnFactory({
      dictionary: { ...common.dictionary, ...en.dictionary },
      graphs: common.adjacencyGraphs,
      translations: en.translations,
    });
    return (pw: string) => factory.check(pw) as ReturnType<Check>;
  })();
  return loader;
}

export async function checkStrength(passphrase: string): Promise<Strength> {
  if (passphrase.length < MIN_PASSPHRASE_LENGTH) {
    return {
      ok: false,
      score: 0,
      message: `Use at least ${MIN_PASSPHRASE_LENGTH} characters. Four or five unrelated words work well.`,
    };
  }
  const result = (await load())(passphrase);
  if (result.score < 3) {
    return {
      ok: false,
      score: result.score,
      message: result.feedback.warning || "Too easy to guess. Add another unrelated word.",
    };
  }
  return { ok: true, score: result.score, message: result.score === 4 ? "Strong." : "Good." };
}
