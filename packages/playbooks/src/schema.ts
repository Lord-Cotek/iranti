import { z } from "zod";

/**
 * Playbook schema (BUILD.md §10). Playbooks are data: frontmatter plus ordered steps. The
 * engine (Phase 6) personalises steps from the owner's wishes. Until `reviewedAt` is set a
 * playbook is a draft, and every surface that shows it must say so.
 */
export const PlaybookStatus = z.enum(["draft", "reviewed"]);

/** A condition on the owner's wishes, e.g. { field: "restingPlace", equals: "repatriate" }. */
export const AppliesWhen = z.object({
  field: z.string().min(1),
  equals: z.union([z.string(), z.boolean()]).optional(),
  in: z.array(z.string()).optional(),
});

export const PlaybookStep = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  title: z.string().min(1),
  who: z.string().optional(),
  documentsNeeded: z.array(z.string()).default([]),
  whereToGo: z.string().optional(),
  typicalTime: z.string().optional(),
  costNotes: z.string().optional(),
  gotchas: z.array(z.string()).default([]),
  appliesWhen: z.array(AppliesWhen).default([]),
});

export const Playbook = z
  .object({
    id: z.string().regex(/^[a-z0-9-]+$/),
    jurisdiction: z.string().regex(/^[A-Z]{2}$/),
    title: z.string().min(1),
    version: z.number().int().positive(),
    status: PlaybookStatus,
    reviewedBy: z.string().nullable(),
    reviewedAt: z.string().nullable(),
    sources: z.array(z.object({ title: z.string(), url: z.string().url() })).default([]),
    appliesWhen: z.array(AppliesWhen).default([]),
    steps: z.array(PlaybookStep).min(1),
  })
  .refine((p) => (p.status === "reviewed") === (p.reviewedAt !== null && p.reviewedBy !== null), {
    message: "A playbook is 'reviewed' exactly when reviewedBy and reviewedAt are set",
  });

export type Playbook = z.infer<typeof Playbook>;
export type PlaybookStep = z.infer<typeof PlaybookStep>;

export function isDraft(p: Pick<Playbook, "reviewedAt">): boolean {
  return p.reviewedAt === null;
}
