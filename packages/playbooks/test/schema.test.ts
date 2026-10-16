import { describe, expect, it } from "vitest";
import { isDraft, Playbook } from "../src";

const base = {
  id: "uae-first-72-hours",
  jurisdiction: "AE",
  title: "The first 72 hours in the UAE",
  version: 1,
  status: "draft",
  reviewedBy: null,
  reviewedAt: null,
  steps: [{ id: "death-notification", title: "Get the death notification" }],
};

describe("playbook schema", () => {
  it("accepts a draft and reports it as draft", () => {
    const p = Playbook.parse(base);
    expect(isDraft(p)).toBe(true);
    expect(p.steps[0]?.documentsNeeded).toEqual([]);
  });

  it("refuses a 'reviewed' playbook without a reviewer and date", () => {
    expect(() => Playbook.parse({ ...base, status: "reviewed" })).toThrow();
  });

  it("refuses a draft that claims a review date", () => {
    expect(() =>
      Playbook.parse({ ...base, reviewedBy: "Counsel", reviewedAt: "2026-10-01" }),
    ).toThrow();
  });
});
