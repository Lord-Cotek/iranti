import { z } from "zod";

/**
 * Plaintext metadata the server may see for a vault item (BUILD.md §5): section, type,
 * tier and timestamps. Everything else, titles included, is inside the encrypted payload.
 */
export const RELEASE_TIERS = ["URGENT", "FULL"] as const;
export const ReleaseTier = z.enum(RELEASE_TIERS);
export type ReleaseTier = z.infer<typeof ReleaseTier>;

export const SECTION_TYPES = {
  people: ["person"],
  assets: [
    "bank_account",
    "property",
    "vehicle",
    "investment",
    "pension_gratuity",
    "crypto",
    "business_interest",
    "receivable",
  ],
  obligations: ["loan", "credit_card", "lease", "subscription", "school_fees"],
  insurance: ["policy"],
  documents: ["identity_doc", "will", "power_of_attorney", "marriage_cert", "birth_certs", "other"],
  wishes: [
    "body_and_rites",
    "funeral",
    "organ_donation",
    "medical_incapacity",
    "guardianship",
    "belongings",
    "pets",
    "digital_life",
    "faith",
  ],
  digital: ["account", "password_manager"],
  sealed_note: ["sealed_note"],
} as const;

export type Section = keyof typeof SECTION_TYPES;
export type ItemType = (typeof SECTION_TYPES)[Section][number];

export const SECTIONS = Object.keys(SECTION_TYPES) as Section[];
export const Section = z.enum(SECTIONS as [Section, ...Section[]]);

export function isTypeInSection(section: Section, type: string): type is ItemType {
  return (SECTION_TYPES[section] as readonly string[]).includes(type);
}

/**
 * Default tier per item type (BUILD.md §5). The owner can move any item. Insurance and
 * documents default to FULL here; the UI promotes repatriation/life policies and will/POA
 * *locations* to URGENT when the owner marks them so.
 */
const URGENT_BY_DEFAULT: ReadonlySet<string> = new Set([
  "person",
  "body_and_rites",
  "funeral",
  "organ_donation",
  "guardianship",
]);

export function defaultTier(type: ItemType): ReleaseTier {
  return URGENT_BY_DEFAULT.has(type) ? "URGENT" : "FULL";
}

/** The server-visible envelope of an item. Ciphertext fields are opaque base64. */
export const VaultItemRecord = z.object({
  id: z.string().min(1),
  vaultId: z.string().min(1),
  section: Section,
  type: z.string().min(1),
  tier: ReleaseTier,
  wrappedIdk: z.string().min(1),
  ciphertext: z.string().min(1),
  nonce: z.string().min(1),
  schemaVer: z.number().int().positive(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type VaultItemRecord = z.infer<typeof VaultItemRecord>;
