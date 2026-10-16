import { z } from "zod";
import type { ItemType, ReleaseTier, Section } from "./model";

/**
 * One registry for every vault item type (BUILD.md §5). Each type lists its fields once;
 * the Zod payload schema and the edit form are both generated from that list, so they
 * cannot drift apart. Payloads are validated on the device; the server never sees them.
 */

export type FieldKind =
  | "text"
  | "longtext"
  | "email"
  | "phones"
  | "country"
  | "currency"
  | "last4"
  | "date"
  | "number"
  | "select"
  | "multiselect"
  | "boolean"
  | "list";

export interface FieldDef {
  key: string;
  label: string;
  kind: FieldKind;
  required?: boolean;
  help?: string;
  options?: ReadonlyArray<{ value: string; label: string }>;
  placeholder?: string;
}

export interface ItemTypeDef {
  type: ItemType;
  section: Section;
  label: string;
  /** One line under the label in the "add" picker. */
  hint: string;
  /** Field used as the item's title in lists; falls back to the type label. */
  titleKey: string;
  defaultTier: ReleaseTier;
  fields: readonly FieldDef[];
  /** Extra warning shown on the form (sealed notes, crypto). */
  warning?: string;
}

const opt = (...pairs: Array<[string, string]>) =>
  pairs.map(([value, label]) => ({ value, label }));

const notes: FieldDef = { key: "notes", label: "Notes", kind: "longtext" };
const country: FieldDef = { key: "country", label: "Country", kind: "country" };
const location = (label = "Where the original is kept"): FieldDef => ({
  key: "location",
  label,
  kind: "longtext",
});

export const ITEM_TYPE_DEFS: readonly ItemTypeDef[] = [
  // ── people ────────────────────────────────────────────────────────────────
  {
    type: "person",
    section: "people",
    label: "Person",
    hint: "Someone to call, or someone with a role",
    titleKey: "name",
    defaultTier: "URGENT",
    fields: [
      { key: "name", label: "Name", kind: "text", required: true },
      {
        key: "relationship",
        label: "Relationship",
        kind: "text",
        placeholder: "Sister, friend, lawyer",
      },
      { key: "phones", label: "Phone numbers", kind: "phones" },
      { key: "email", label: "Email", kind: "email" },
      country,
      {
        key: "roles",
        label: "Roles",
        kind: "multiselect",
        options: opt(
          ["call_first", "Call first"],
          ["executor", "Executor"],
          ["trusted_contact", "Trusted contact"],
          ["guardian", "Guardian for my children"],
          ["do_not_contact", "Do not contact"],
          ["employer_hr", "Employer HR"],
          ["religious_leader", "Religious leader"],
          ["lawyer", "Lawyer"],
          ["accountant", "Accountant"],
        ),
      },
      { key: "callOrder", label: "Call order", kind: "number", help: "1 is the first call." },
      notes,
    ],
  },
  // ── assets ────────────────────────────────────────────────────────────────
  {
    type: "bank_account",
    section: "assets",
    label: "Bank account",
    hint: "Bank, country, last four digits",
    titleKey: "institution",
    defaultTier: "FULL",
    fields: [
      { key: "institution", label: "Bank", kind: "text", required: true },
      country,
      {
        key: "accountType",
        label: "Type",
        kind: "select",
        options: opt(
          ["current", "Current"],
          ["savings", "Savings"],
          ["fixed_deposit", "Fixed deposit"],
          ["other", "Other"],
        ),
      },
      { key: "currency", label: "Currency", kind: "currency" },
      {
        key: "last4",
        label: "Last four digits",
        kind: "last4",
        help: "Only the last four. If you must keep a full number, use a sealed note.",
      },
      { key: "onlineAccessNotes", label: "How online access works", kind: "longtext" },
      { key: "jointHolders", label: "Joint holders", kind: "list" },
    ],
  },
  {
    type: "property",
    section: "assets",
    label: "Property",
    hint: "Home, land or building",
    titleKey: "description",
    defaultTier: "FULL",
    fields: [
      {
        key: "description",
        label: "What it is",
        kind: "text",
        required: true,
        placeholder: "Land, Ibadan",
      },
      { key: "address", label: "Address", kind: "longtext" },
      country,
      {
        key: "ownership",
        label: "Ownership",
        kind: "select",
        options: opt(
          ["sole", "In my name"],
          ["joint", "Joint"],
          ["company", "Through a company"],
          ["other", "Other"],
        ),
      },
      location("Where the title deed is kept"),
      notes,
    ],
  },
  {
    type: "vehicle",
    section: "assets",
    label: "Vehicle",
    hint: "Car or other vehicle",
    titleKey: "description",
    defaultTier: "FULL",
    fields: [
      { key: "description", label: "Vehicle", kind: "text", required: true },
      { key: "registration", label: "Registration", kind: "text" },
      country,
      { key: "finance", label: "Finance or loan", kind: "longtext" },
      notes,
    ],
  },
  {
    type: "investment",
    section: "assets",
    label: "Investment",
    hint: "Shares, funds, bonds, gold",
    titleKey: "provider",
    defaultTier: "FULL",
    fields: [
      { key: "provider", label: "Provider", kind: "text", required: true },
      {
        key: "kind",
        label: "Kind",
        kind: "select",
        options: opt(
          ["shares", "Shares"],
          ["fund", "Fund"],
          ["bonds", "Bonds"],
          ["gold", "Gold"],
          ["other", "Other"],
        ),
      },
      country,
      { key: "last4", label: "Account, last four digits", kind: "last4" },
      notes,
    ],
  },
  {
    type: "pension_gratuity",
    section: "assets",
    label: "Pension or gratuity",
    hint: "End-of-service gratuity, pension, provident fund",
    titleKey: "provider",
    defaultTier: "FULL",
    fields: [
      { key: "provider", label: "Employer or scheme", kind: "text", required: true },
      {
        key: "kind",
        label: "Kind",
        kind: "select",
        options: opt(
          ["gratuity", "End-of-service gratuity"],
          ["pension", "Pension"],
          ["provident_fund", "Provident fund"],
          ["other", "Other"],
        ),
      },
      country,
      { key: "contact", label: "Who to contact", kind: "longtext" },
      notes,
    ],
  },
  {
    type: "crypto",
    section: "assets",
    label: "Crypto",
    hint: "Where it is held and how to reach it",
    titleKey: "label",
    defaultTier: "FULL",
    warning: "Never put a seed phrase here. If one must be kept, use a sealed note.",
    fields: [
      {
        key: "label",
        label: "Name",
        kind: "text",
        required: true,
        placeholder: "Bitcoin, hardware wallet",
      },
      {
        key: "custody",
        label: "Held in",
        kind: "select",
        options: opt(
          ["hardware_wallet", "Hardware wallet"],
          ["exchange", "Exchange"],
          ["software_wallet", "Software wallet"],
          ["other", "Other"],
        ),
      },
      { key: "deviceLocation", label: "Where the device or instructions are", kind: "longtext" },
      { key: "instructions", label: "Instructions", kind: "longtext" },
    ],
  },
  {
    type: "business_interest",
    section: "assets",
    label: "Business",
    hint: "A company or share you own",
    titleKey: "name",
    defaultTier: "FULL",
    fields: [
      { key: "name", label: "Business", kind: "text", required: true },
      country,
      { key: "share", label: "Your share", kind: "text" },
      { key: "partners", label: "Partners", kind: "list" },
      { key: "contact", label: "Who to contact", kind: "longtext" },
      notes,
    ],
  },
  {
    type: "receivable",
    section: "assets",
    label: "Money owed to you",
    hint: "Who owes you, and how much",
    titleKey: "who",
    defaultTier: "FULL",
    fields: [
      { key: "who", label: "Who owes it", kind: "text", required: true },
      { key: "amount", label: "Amount", kind: "text" },
      { key: "currency", label: "Currency", kind: "currency" },
      { key: "evidence", label: "Evidence or agreement", kind: "longtext" },
      notes,
    ],
  },
  // ── obligations ───────────────────────────────────────────────────────────
  {
    type: "loan",
    section: "obligations",
    label: "Loan",
    hint: "Personal, mortgage or car loan",
    titleKey: "lender",
    defaultTier: "FULL",
    fields: [
      { key: "lender", label: "Lender", kind: "text", required: true },
      {
        key: "kind",
        label: "Kind",
        kind: "select",
        options: opt(
          ["personal", "Personal"],
          ["mortgage", "Mortgage"],
          ["car", "Car"],
          ["other", "Other"],
        ),
      },
      country,
      { key: "last4", label: "Account, last four digits", kind: "last4" },
      notes,
    ],
  },
  {
    type: "credit_card",
    section: "obligations",
    label: "Credit card",
    hint: "Issuer and last four digits",
    titleKey: "issuer",
    defaultTier: "FULL",
    fields: [
      { key: "issuer", label: "Issuer", kind: "text", required: true },
      { key: "last4", label: "Last four digits", kind: "last4" },
      country,
      notes,
    ],
  },
  {
    type: "lease",
    section: "obligations",
    label: "Lease",
    hint: "A home or car you rent",
    titleKey: "what",
    defaultTier: "FULL",
    fields: [
      { key: "what", label: "What is leased", kind: "text", required: true },
      { key: "landlord", label: "Landlord or company", kind: "text" },
      { key: "endDate", label: "Ends", kind: "date" },
      notes,
    ],
  },
  {
    type: "subscription",
    section: "obligations",
    label: "Subscription",
    hint: "Something that bills you regularly",
    titleKey: "service",
    defaultTier: "FULL",
    fields: [
      { key: "service", label: "Service", kind: "text", required: true },
      { key: "howToCancel", label: "How to cancel", kind: "longtext" },
    ],
  },
  {
    type: "school_fees",
    section: "obligations",
    label: "School fees",
    hint: "A child's school and how fees are paid",
    titleKey: "school",
    defaultTier: "FULL",
    fields: [
      { key: "school", label: "School", kind: "text", required: true },
      { key: "child", label: "Child", kind: "text" },
      { key: "terms", label: "Fees and how they are paid", kind: "longtext" },
    ],
  },
  // ── insurance ─────────────────────────────────────────────────────────────
  {
    type: "policy",
    section: "insurance",
    label: "Insurance policy",
    hint: "Life, medical, repatriation or other cover",
    titleKey: "insurer",
    defaultTier: "FULL",
    fields: [
      { key: "insurer", label: "Insurer", kind: "text", required: true },
      {
        key: "policyType",
        label: "Type",
        kind: "select",
        options: opt(
          ["life", "Life"],
          ["medical", "Medical"],
          ["repatriation", "Repatriation"],
          ["employer_group", "Employer group cover"],
          ["property", "Property"],
          ["vehicle", "Vehicle"],
          ["other", "Other"],
        ),
      },
      {
        key: "coversRepatriation",
        label: "Covers repatriation",
        kind: "boolean",
        help: "Policies that cover repatriation or life are worth opening in the first days.",
      },
      { key: "policyNumber", label: "Policy number", kind: "text" },
      { key: "beneficiaries", label: "Beneficiaries", kind: "list" },
      { key: "claimContact", label: "How to claim", kind: "longtext" },
      notes,
    ],
  },
  // ── documents ─────────────────────────────────────────────────────────────
  {
    type: "identity_doc",
    section: "documents",
    label: "Identity document",
    hint: "Passport, Emirates ID, visa",
    titleKey: "kind",
    defaultTier: "FULL",
    fields: [
      {
        key: "kind",
        label: "Document",
        kind: "select",
        required: true,
        options: opt(
          ["passport", "Passport"],
          ["emirates_id", "Emirates ID"],
          ["residence_visa", "Residence visa"],
          ["national_id", "National ID"],
          ["driving_licence", "Driving licence"],
          ["other", "Other"],
        ),
      },
      { key: "holder", label: "Whose", kind: "text" },
      country,
      { key: "expiry", label: "Expires", kind: "date" },
      location(),
    ],
  },
  {
    type: "will",
    section: "documents",
    label: "Will",
    hint: "Where it is registered and kept",
    titleKey: "registry",
    defaultTier: "URGENT",
    fields: [
      {
        key: "registry",
        label: "Registered with",
        kind: "select",
        required: true,
        options: opt(
          ["DIFC", "DIFC Wills Service"],
          ["ADJD", "Abu Dhabi Judicial Department"],
          ["ADGM", "ADGM Courts"],
          ["DUBAI_COURTS", "Dubai Courts notary"],
          ["HOME_COUNTRY", "In my home country"],
          ["NONE", "I don't have a registered will"],
        ),
      },
      { key: "registrationNumber", label: "Registration number", kind: "text" },
      { key: "lawyer", label: "Lawyer", kind: "text" },
      location(),
    ],
  },
  {
    type: "power_of_attorney",
    section: "documents",
    label: "Power of attorney",
    hint: "Who holds it and where it is",
    titleKey: "holder",
    defaultTier: "URGENT",
    fields: [
      { key: "holder", label: "Who holds it", kind: "text", required: true },
      { key: "scope", label: "What it covers", kind: "longtext" },
      { key: "issuedIn", label: "Issued in", kind: "country" },
      location(),
    ],
  },
  {
    type: "marriage_cert",
    section: "documents",
    label: "Marriage certificate",
    hint: "Where it is kept",
    titleKey: "spouse",
    defaultTier: "FULL",
    fields: [
      { key: "spouse", label: "Spouse", kind: "text" },
      { key: "issuedIn", label: "Issued in", kind: "country" },
      location(),
    ],
  },
  {
    type: "birth_certs",
    section: "documents",
    label: "Birth certificate",
    hint: "Yours or a child's",
    titleKey: "person",
    defaultTier: "FULL",
    fields: [
      { key: "person", label: "Whose", kind: "text", required: true },
      { key: "issuedIn", label: "Issued in", kind: "country" },
      location(),
    ],
  },
  {
    type: "other",
    section: "documents",
    label: "Other document",
    hint: "Anything else your family will need",
    titleKey: "title",
    defaultTier: "FULL",
    fields: [
      { key: "title", label: "Title", kind: "text", required: true },
      { key: "description", label: "Description", kind: "longtext" },
      location(),
    ],
  },
  // ── wishes ────────────────────────────────────────────────────────────────
  {
    type: "body_and_rites",
    section: "wishes",
    label: "Body and rites",
    hint: "Where you'd like to be laid to rest, and how",
    titleKey: "restingPlace",
    defaultTier: "URGENT",
    fields: [
      {
        key: "restingPlace",
        label: "Where would you like to be laid to rest?",
        kind: "select",
        required: true,
        options: opt(
          ["local", "Here, where I live"],
          ["repatriate", "Taken home to another country"],
          ["family_decides", "Let my family decide"],
        ),
      },
      {
        key: "repatriateTo",
        label: "Taken home to",
        kind: "text",
        placeholder: "Ibadan, Oyo State, Nigeria",
      },
      {
        key: "method",
        label: "Burial or cremation",
        kind: "select",
        options: opt(
          ["burial", "Burial"],
          ["cremation", "Cremation"],
          ["family_decides", "Let my family decide"],
          ["other", "Other"],
        ),
      },
      { key: "rites", label: "Faith and rites, in your own words", kind: "longtext" },
      { key: "leader", label: "Who should lead it", kind: "text" },
    ],
  },
  {
    type: "funeral",
    section: "wishes",
    label: "Funeral",
    hint: "The funeral you would want",
    titleKey: "wishes",
    defaultTier: "URGENT",
    fields: [
      { key: "wishes", label: "What you'd want", kind: "longtext", required: true },
      { key: "music", label: "Music", kind: "longtext" },
      { key: "readings", label: "Readings", kind: "longtext" },
      { key: "dress", label: "Dress", kind: "text" },
    ],
  },
  {
    type: "organ_donation",
    section: "wishes",
    label: "Organ donation",
    hint: "Your choice about donation",
    titleKey: "choice",
    defaultTier: "URGENT",
    fields: [
      {
        key: "choice",
        label: "Your choice",
        kind: "select",
        required: true,
        options: opt(
          ["yes_all", "Yes, any"],
          ["yes_some", "Yes, some"],
          ["no", "No"],
          ["family_decides", "Let my family decide"],
        ),
      },
      { key: "details", label: "Details", kind: "longtext" },
    ],
  },
  {
    type: "medical_incapacity",
    section: "wishes",
    label: "If I can't decide for myself",
    hint: "Medical wishes if you are incapacitated",
    titleKey: "decisionMaker",
    defaultTier: "FULL",
    fields: [
      { key: "wishes", label: "Your wishes", kind: "longtext", required: true },
      { key: "decisionMaker", label: "Who should decide", kind: "text" },
    ],
  },
  {
    type: "guardianship",
    section: "wishes",
    label: "Children",
    hint: "Who should care for them, and how",
    titleKey: "children",
    defaultTier: "URGENT",
    fields: [
      { key: "children", label: "Children", kind: "text", required: true },
      { key: "guardian", label: "Guardian", kind: "text" },
      { key: "alternate", label: "If they can't", kind: "text" },
      { key: "upbringing", label: "How you'd want them raised", kind: "longtext" },
      { key: "school", label: "School", kind: "longtext" },
    ],
  },
  {
    type: "belongings",
    section: "wishes",
    label: "Belongings",
    hint: "What should happen to your things",
    titleKey: "wishes",
    defaultTier: "FULL",
    fields: [{ key: "wishes", label: "Your wishes", kind: "longtext", required: true }],
  },
  {
    type: "pets",
    section: "wishes",
    label: "Pets",
    hint: "Who should care for them",
    titleKey: "pets",
    defaultTier: "FULL",
    fields: [
      { key: "pets", label: "Pets", kind: "text", required: true },
      { key: "carer", label: "Who should care for them", kind: "text" },
      { key: "instructions", label: "Instructions", kind: "longtext" },
    ],
  },
  {
    type: "digital_life",
    section: "wishes",
    label: "Digital life",
    hint: "What should happen online",
    titleKey: "wishes",
    defaultTier: "FULL",
    fields: [{ key: "wishes", label: "Your wishes", kind: "longtext", required: true }],
  },
  {
    type: "faith",
    section: "wishes",
    label: "Faith",
    hint: "In your own words",
    titleKey: "words",
    defaultTier: "FULL",
    fields: [{ key: "words", label: "In your own words", kind: "longtext", required: true }],
  },
  // ── digital ───────────────────────────────────────────────────────────────
  {
    type: "account",
    section: "digital",
    label: "Online account",
    hint: "Memorialise, delete or hand over",
    titleKey: "service",
    defaultTier: "FULL",
    fields: [
      { key: "service", label: "Service", kind: "text", required: true },
      { key: "handle", label: "Username or handle", kind: "text" },
      {
        key: "wish",
        label: "What should happen",
        kind: "select",
        options: opt(
          ["memorialise", "Memorialise"],
          ["delete", "Delete"],
          ["transfer", "Hand over"],
          ["family_decides", "Let my family decide"],
        ),
      },
      { key: "instructions", label: "Instructions", kind: "longtext" },
    ],
  },
  {
    type: "password_manager",
    section: "digital",
    label: "Password manager",
    hint: "Where the emergency kit is",
    titleKey: "provider",
    defaultTier: "FULL",
    fields: [
      { key: "provider", label: "Provider", kind: "text", required: true },
      {
        key: "emergencyKitLocation",
        label: "Where the emergency kit is",
        kind: "longtext",
        required: true,
      },
    ],
  },
  // ── sealed note ───────────────────────────────────────────────────────────
  {
    type: "sealed_note",
    section: "sealed_note",
    label: "Sealed note",
    hint: "A secret: a safe combination, a seed phrase",
    titleKey: "title",
    defaultTier: "FULL",
    warning:
      "Anyone who opens the full vault after release can read this. Keep only what they will need.",
    fields: [
      { key: "title", label: "Title", kind: "text", required: true },
      { key: "body", label: "The secret", kind: "longtext", required: true },
    ],
  },
];

export const ITEM_TYPES: Readonly<Record<ItemType, ItemTypeDef>> = Object.fromEntries(
  ITEM_TYPE_DEFS.map((d) => [d.type, d]),
) as Record<ItemType, ItemTypeDef>;

// ── Schema generation ──────────────────────────────────────────────────────

const SHORT = 500;
const LONG = 10_000;

function fieldSchema(f: FieldDef): z.ZodType {
  switch (f.kind) {
    case "text":
      return z
        .string()
        .trim()
        .min(f.required ? 1 : 0)
        .max(SHORT);
    case "longtext":
      return z
        .string()
        .trim()
        .min(f.required ? 1 : 0)
        .max(LONG);
    case "email":
      return z.string().trim().email();
    case "phones":
      return z.array(z.string().trim().min(1).max(40)).max(5);
    case "country":
      return z.string().regex(/^[A-Z]{2}$/, "Use a two-letter country code");
    case "currency":
      return z.string().regex(/^[A-Z]{3}$/, "Use a three-letter currency code");
    case "last4":
      return z.string().regex(/^\d{4}$/, "Last four digits only");
    case "date":
      return z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use a date");
    case "number":
      return z.number().int().min(0).max(1000);
    case "boolean":
      return z.boolean();
    case "select": {
      const values = (f.options ?? []).map((o) => o.value) as [string, ...string[]];
      return z.enum(values);
    }
    case "multiselect": {
      const values = (f.options ?? []).map((o) => o.value) as [string, ...string[]];
      return z.array(z.enum(values)).max(values.length);
    }
    case "list":
      return z.array(z.string().trim().min(1).max(SHORT)).max(50);
  }
}

function buildSchema(def: ItemTypeDef) {
  const shape: Record<string, z.ZodType> = {};
  for (const f of def.fields) {
    shape[f.key] = f.required ? fieldSchema(f) : fieldSchema(f).optional();
  }
  // strict: unknown keys are a bug, not data to carry silently.
  return z.object(shape).strict();
}

const SCHEMAS = Object.fromEntries(ITEM_TYPE_DEFS.map((d) => [d.type, buildSchema(d)])) as Record<
  ItemType,
  z.ZodObject<Record<string, z.ZodType>>
>;

export function payloadSchema(type: ItemType) {
  return SCHEMAS[type];
}

/** Validate a payload for its type, removing empty optional values first. */
export function parsePayload(type: ItemType, raw: Record<string, unknown>) {
  const cleaned: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (v === "" || v === undefined || v === null) continue;
    if (Array.isArray(v) && v.length === 0) continue;
    cleaned[k] = v;
  }
  return SCHEMAS[type].safeParse(cleaned);
}

/** Display title for an item, from its decrypted payload. */
export function itemTitle(type: ItemType, payload: Record<string, unknown>): string {
  const def = ITEM_TYPES[type];
  const raw = payload[def.titleKey];
  if (typeof raw === "string" && raw.trim()) {
    const field = def.fields.find((f) => f.key === def.titleKey);
    const option = field?.options?.find((o) => o.value === raw);
    const text = option ? option.label : raw.trim();
    return text.length > 80 ? `${text.slice(0, 77)}…` : text;
  }
  return def.label;
}

export function typesInSection(section: Section): ItemTypeDef[] {
  return ITEM_TYPE_DEFS.filter((d) => d.section === section);
}

export function defaultTier(type: ItemType): ReleaseTier {
  return ITEM_TYPES[type].defaultTier;
}
