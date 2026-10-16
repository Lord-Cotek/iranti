import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, rgb, type PDFFont, type PDFPage } from "pdf-lib";

/**
 * The Emergency Kit (BUILD.md §8.2): a one-page PDF made on this device, never uploaded.
 * It holds the recovery code and plain instructions. Fonts are embedded (IBM Plex Sans,
 * subset) so names with Yoruba marks print correctly.
 */
export interface EmergencyKitInput {
  email: string;
  recoveryCode: string;
  signInUrl: string;
  createdAt: Date;
  fonts: { regular: Uint8Array; semibold: Uint8Array };
}

const INK = rgb(0.137, 0.129, 0.114);
const MUTED = rgb(0.43, 0.416, 0.388);
const ACCENT = rgb(0.722, 0.525, 0.18);
const LINE = rgb(0.886, 0.859, 0.812);

function wrap(text: string, font: PDFFont, size: number, width: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (font.widthOfTextAtSize(next, size) > width && line) {
      lines.push(line);
      line = w;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

export async function buildEmergencyKit(input: EmergencyKitInput): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  pdf.setTitle("Ìrántí Emergency Kit");
  pdf.setCreator("Ìrántí");
  pdf.setProducer("Ìrántí");
  const regular = await pdf.embedFont(input.fonts.regular, { subset: true });
  const bold = await pdf.embedFont(input.fonts.semibold, { subset: true });
  const page: PDFPage = pdf.addPage([595.28, 841.89]); // A4
  const left = 56;
  const width = 595.28 - left * 2;
  let y = 841.89 - 64;

  const text = (
    s: string,
    opts: { size?: number; font?: PDFFont; color?: ReturnType<typeof rgb>; gap?: number } = {},
  ) => {
    const size = opts.size ?? 11.5;
    const font = opts.font ?? regular;
    for (const line of wrap(s, font, size, width)) {
      page.drawText(line, { x: left, y, size, font, color: opts.color ?? INK });
      y -= size * 1.45;
    }
    y -= opts.gap ?? 6;
  };
  const rule = () => {
    page.drawLine({
      start: { x: left, y },
      end: { x: left + width, y },
      thickness: 0.8,
      color: LINE,
    });
    y -= 20;
  };

  text("ÌRÁNTÍ · EMERGENCY KIT", { size: 9.5, font: bold, color: ACCENT, gap: 10 });
  text("Keep this safe. It can open your vault.", { size: 22, font: bold, gap: 8 });
  text(`For ${input.email}. Made on ${input.createdAt.toISOString().slice(0, 10)}.`, {
    color: MUTED,
    gap: 18,
  });
  rule();

  text("Your recovery code", { size: 13, font: bold, gap: 10 });
  const groups = input.recoveryCode.split("-");
  const rows = [groups.slice(0, 5).join("  "), groups.slice(5).join("  ")];
  for (const row of rows) {
    page.drawText(row, { x: left, y, size: 19, font: bold, color: INK });
    y -= 30;
  }
  y -= 6;
  text("Letters are not case sensitive. The last group is a check that catches typing mistakes.", {
    size: 10,
    color: MUTED,
    gap: 18,
  });

  text("Sign in at", { size: 13, font: bold, gap: 4 });
  text(input.signInUrl, { size: 12, gap: 18 });

  text("Your passphrase (optional, write it by hand)", { size: 13, font: bold, gap: 26 });
  page.drawLine({
    start: { x: left, y: y + 8 },
    end: { x: left + width, y: y + 8 },
    thickness: 0.8,
    color: LINE,
  });
  y -= 22;
  rule();

  text("How to use this", { size: 13, font: bold, gap: 8 });
  const steps = [
    "Print this page, or save it somewhere offline. Keep it with your will, in a safe, or with someone you trust.",
    "If you forget your passphrase and lose your passkeys, sign in with your email, choose “Use recovery code”, and type the code above.",
    "Nobody at COTEK can open your vault or recover it for you. Without this code, a forgotten passphrase means your vault cannot be opened, by anyone.",
    "Anyone with this code and access to your email could open your vault. Don't photograph it, email it or keep it in cloud notes.",
    "If this kit is lost or seen by someone else, sign in and make a new recovery code. The old one stops working.",
  ];
  steps.forEach((s, i) => text(`${i + 1}.  ${s}`, { gap: 6 }));
  y -= 10;
  rule();
  text(
    "Ìrántí is not a will and not legal advice. Made by Cotek App FZ-LLC, Ras Al Khaimah, UAE.",
    {
      size: 9.5,
      color: MUTED,
    },
  );

  return pdf.save();
}

/** Browser helper: fetch the bundled fonts. */
export async function loadKitFonts(): Promise<EmergencyKitInput["fonts"]> {
  const get = async (path: string) => new Uint8Array(await (await fetch(path)).arrayBuffer());
  const [regular, semibold] = await Promise.all([
    get("/fonts/IBMPlexSans-Regular.woff"),
    get("/fonts/IBMPlexSans-SemiBold.woff"),
  ]);
  return { regular, semibold };
}
