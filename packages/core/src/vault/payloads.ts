import { z } from "zod";

/**
 * Decrypted payload schemas. These are validated on the device after decryption and before
 * encryption; the server never sees them. Phase 0 defines a first few to fix the pattern;
 * Phase 1 completes every §5 type.
 */
const text = z.string().trim().max(10_000);
const shortText = z.string().trim().max(500);
const countryCode = z
  .string()
  .regex(/^[A-Z]{2}$/, "ISO 3166-1 alpha-2 country code")
  .optional();

export const PersonPayload = z.object({
  name: shortText.min(1),
  relationship: shortText.optional(),
  phones: z.array(z.string().max(40)).max(5).default([]),
  email: z.string().email().optional(),
  country: countryCode,
  roles: z
    .array(
      z.enum([
        "call_first",
        "executor",
        "trusted_contact",
        "guardian",
        "do_not_contact",
        "employer_hr",
        "religious_leader",
        "lawyer",
        "accountant",
      ]),
    )
    .default([]),
  callOrder: z.number().int().min(1).optional(),
  notes: text.optional(),
});
export type PersonPayload = z.infer<typeof PersonPayload>;

export const BankAccountPayload = z.object({
  institution: shortText.min(1),
  country: countryCode,
  accountType: z.enum(["current", "savings", "fixed_deposit", "other"]).optional(),
  currency: z
    .string()
    .regex(/^[A-Z]{3}$/)
    .optional(),
  // Last four digits only by default (§4.1). A full number goes in a sealed note if at all.
  last4: z
    .string()
    .regex(/^\d{4}$/)
    .optional(),
  onlineAccessNotes: text.optional(),
  jointHolders: z.array(shortText).default([]),
});
export type BankAccountPayload = z.infer<typeof BankAccountPayload>;

export const WILL_REGISTRIES = [
  "DIFC",
  "ADJD",
  "ADGM",
  "DUBAI_COURTS",
  "HOME_COUNTRY",
  "NONE",
] as const;

export const WillPayload = z.object({
  registry: z.enum(WILL_REGISTRIES),
  registrationNumber: shortText.optional(),
  lawyer: shortText.optional(),
  physicalLocation: text.optional(),
  fileId: z.string().optional(),
});
export type WillPayload = z.infer<typeof WillPayload>;

export const SealedNotePayload = z.object({
  title: shortText.min(1),
  body: text.min(1),
});
export type SealedNotePayload = z.infer<typeof SealedNotePayload>;

/** Registry of payload schemas by item type. Phase 1 fills in the rest. */
export const PAYLOAD_SCHEMAS = {
  person: PersonPayload,
  bank_account: BankAccountPayload,
  will: WillPayload,
  sealed_note: SealedNotePayload,
} as const satisfies Record<string, z.ZodType>;
