import _sodium from "libsodium-wrappers-sumo";

export type Sodium = typeof _sodium;

let instance: Sodium | null = null;

/**
 * Initialise libsodium (WASM). Must be awaited once before any other function in this
 * package is called. Safe to call repeatedly.
 */
export async function ready(): Promise<Sodium> {
  if (instance) return instance;
  await _sodium.ready;
  instance = _sodium;
  return instance;
}

/** The initialised libsodium instance. Throws if `ready()` has not completed. */
export function sodium(): Sodium {
  if (!instance) {
    throw new Error("@iranti/crypto: call and await ready() before using crypto functions");
  }
  return instance;
}
