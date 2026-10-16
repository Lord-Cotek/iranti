import { sodium } from "./sodium";

const utf8Encoder = new TextEncoder();
const utf8Decoder = new TextDecoder("utf-8", { fatal: true });

export function utf8ToBytes(text: string): Uint8Array {
  return utf8Encoder.encode(text);
}

export function bytesToUtf8(bytes: Uint8Array): string {
  return utf8Decoder.decode(bytes);
}

/** Standard base64 with padding: the storage encoding for every binary DB column. */
export function toBase64(bytes: Uint8Array): string {
  const s = sodium();
  return s.to_base64(bytes, s.base64_variants.ORIGINAL);
}

export function fromBase64(text: string): Uint8Array {
  const s = sodium();
  return s.from_base64(text, s.base64_variants.ORIGINAL);
}
