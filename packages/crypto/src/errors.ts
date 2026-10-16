/**
 * Raised when an operation fails for a cryptographic reason (wrong key, tampered data,
 * mismatched associated data). Messages are fixed strings: they never include key
 * material, plaintext or ciphertext, so they are safe to surface or report.
 */
export class CryptoError extends Error {
  readonly code: CryptoErrorCode;

  constructor(code: CryptoErrorCode, message: string) {
    super(message);
    this.name = "CryptoError";
    this.code = code;
  }
}

export type CryptoErrorCode = "DECRYPT_FAILED" | "INVALID_KEY" | "INVALID_INPUT";
