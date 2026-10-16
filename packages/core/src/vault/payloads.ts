import { payloadSchema } from "./types";

// Named schemas for the most used types. Every type's schema comes from the registry in
// types.ts; these are conveniences, not a second source of truth.
export const PersonPayload = payloadSchema("person");
export const BankAccountPayload = payloadSchema("bank_account");
export const WillPayload = payloadSchema("will");
export const SealedNotePayload = payloadSchema("sealed_note");
