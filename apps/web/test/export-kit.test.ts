import { readFileSync } from "node:fs";
import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { buildEmergencyKit } from "../lib/emergency-kit";
import { buildExportZip, parseExportZip, type ExportItem } from "../lib/export";

const font = (name: string) =>
  new Uint8Array(readFileSync(new URL(`../public/fonts/${name}`, import.meta.url)));

describe("Emergency Kit PDF", () => {
  it("builds a one-page PDF with embedded fonts, offline", async () => {
    const bytes = await buildEmergencyKit({
      email: "ọlá.adébáyọ̀@example.com",
      recoveryCode: "7K2M-AB3D-9QX4-PPRT-0ZZ1-HJKM-NNPQ-RSTV-W3XY",
      signInUrl: "https://iranti.cotek.app/signin/",
      createdAt: new Date("2026-10-16T00:00:00Z"),
      fonts: {
        regular: font("IBMPlexSans-Regular.woff"),
        semibold: font("IBMPlexSans-SemiBold.woff"),
      },
    });
    expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe("%PDF-");
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBe(1);
    expect(doc.getTitle()).toBe("Ìrántí Emergency Kit");
  });
});

describe("decrypted export", () => {
  it("round-trips items and files", () => {
    const items: ExportItem[] = [
      {
        id: "aaaaaaaaaaaaaaaaaaaaaaaaaa",
        section: "assets",
        type: "bank_account",
        tier: "FULL",
        title: "Zenith Bank",
        payload: { institution: "Zenith Bank", last4: "4417", jointHolders: ["Funmi"] },
        updatedAt: "2026-10-16T00:00:00.000Z",
      },
      {
        id: "bbbbbbbbbbbbbbbbbbbbbbbbbb",
        section: "wishes",
        type: "body_and_rites",
        tier: "URGENT",
        title: "Taken home",
        payload: { restingPlace: "repatriate", rites: "Psalm 23 <read> by my brother" },
        updatedAt: "2026-10-16T00:00:00.000Z",
      },
    ];
    const data = new Uint8Array([1, 2, 3, 250]);
    const zip = buildExportZip("ade@example.com", items, [
      { id: "f1", itemId: items[0]!.id, name: "deed/ìbàdàn.pdf", type: "application/pdf", data },
      { id: "f2", itemId: null, name: "deed/ìbàdàn.pdf", type: "application/pdf", data },
    ]);
    const { bundle, files } = parseExportZip(zip);
    expect(bundle.items).toEqual(items);
    expect(bundle.files.map((f) => f.path)).toEqual([
      "files/deed_ìbàdàn.pdf",
      "files/2-deed_ìbàdàn.pdf",
    ]);
    expect(Array.from(files["files/deed_ìbàdàn.pdf"]!)).toEqual([1, 2, 3, 250]);
  });
});
