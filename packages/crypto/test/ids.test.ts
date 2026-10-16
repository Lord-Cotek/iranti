import { beforeAll, describe, expect, it } from "vitest";
import { ID_PATTERN, newId, ready } from "../src";

beforeAll(async () => {
  await ready();
});

describe("newId", () => {
  it("produces unique 26-character base32 ids", () => {
    const ids = new Set(Array.from({ length: 1000 }, () => newId()));
    expect(ids.size).toBe(1000);
    for (const id of ids) expect(id).toMatch(ID_PATTERN);
  });
});
