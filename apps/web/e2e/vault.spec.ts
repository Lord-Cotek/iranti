import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { strFromU8, unzipSync } from "fflate";
import { watchCsp } from "./helpers";

const API = "http://localhost:3001";
const PASSPHRASE = "lantern quietly river mango harbour";

// Runs once (desktop) to keep the suite quick; the mobile project covers layout elsewhere.
test.skip(({ isMobile }) => isMobile, "full flow runs on desktop");

async function readCode(page: Page, email: string): Promise<string> {
  for (let i = 0; i < 20; i++) {
    const res = await page.request.get(`${API}/api/dev/mail?to=${encodeURIComponent(email)}`);
    const { messages } = (await res.json()) as { messages: Array<{ text: string }> };
    const m = /code is (\d{6})/.exec(messages.at(-1)?.text ?? "");
    if (m) return m[1]!;
    await page.waitForTimeout(250);
  }
  throw new Error("no code arrived");
}

async function signIn(page: Page, email: string) {
  await page.goto("/signin/");
  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: "Email me a code" }).click();
  await expect(page.getByRole("heading", { name: "Check your email" })).toBeVisible();
  await page.getByLabel("Six-digit code").fill(await readCode(page, email));
  await page.getByRole("button", { name: "Sign in" }).click();
}

test("the locked vault: sign up, set up, add, attach, lock, unlock, export, delete", async ({
  page,
}) => {
  const violations = watchCsp(page);

  const email = `e2e-${Date.now()}@example.test`;
  await signIn(page, email);

  // ── Setup ────────────────────────────────────────────────────────────────
  await expect(page).toHaveURL(/\/app\/setup\/$/);
  await expect(
    page.getByRole("heading", { name: "Your vault is locked with keys only you hold" }),
  ).toBeVisible();
  await page.getByLabel("I am 18 or older.").check();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("Passphrase", { exact: true }).fill("short");
  await page.getByLabel("Type it again").fill("short");
  await page.getByRole("button", { name: "Make my keys" }).click();
  await expect(page.locator("main").getByRole("alert")).toContainText("at least 12 characters");
  await page.getByLabel("Passphrase", { exact: true }).fill(PASSPHRASE);
  await page.getByLabel("Type it again").fill(PASSPHRASE);
  await page.getByRole("button", { name: "Make my keys" }).click();

  await expect(page.getByRole("heading", { name: "Save your Emergency Kit" })).toBeVisible({
    timeout: 30_000,
  });
  const code = (await page.getByTestId("recovery-code").innerText()).trim().split(/\s+/);
  expect(code).toHaveLength(9);
  const continueBtn = page.getByRole("button", { name: "I've saved it. Continue" });
  await expect(continueBtn).toBeDisabled();

  const kit = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download Emergency Kit (PDF)" }).click();
  const kitFile = await kit;
  expect(kitFile.suggestedFilename()).toBe("Iranti-Emergency-Kit.pdf");
  expect(
    readFileSync((await kitFile.path())!)
      .subarray(0, 5)
      .toString(),
  ).toBe("%PDF-");

  await page
    .getByLabel("To confirm you have it, type the last two groups of the code")
    .fill(code.slice(-2).join("-"));
  await continueBtn.click();
  await expect(page.getByRole("heading", { name: "Unlock with a passkey" })).toBeVisible();
  await page.getByRole("button", { name: "Not now" }).click();
  await page.getByRole("button", { name: "Go to your vault" }).click();

  // ── Add a person ─────────────────────────────────────────────────────────
  await expect(page.getByText("Unlocked on this device.")).toBeVisible();
  await page.getByRole("link", { name: "Add a person" }).click();
  await page.getByLabel("Name").fill("Funmi Bello");
  await page.getByLabel("Relationship (optional)").fill("Sister, executor");
  await page.getByLabel("Phone numbers (optional)").fill("+971 50 000 0000");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Saved and locked.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Funmi Bello" })).toBeVisible();

  // ── Add a bank account with a file ───────────────────────────────────────
  // Navigate inside the app: a full page load would (correctly) forget the keys.
  await page.getByRole("link", { name: "Vault" }).click();
  await page.getByRole("link", { name: "What you own" }).click();
  await page.getByRole("button", { name: "Add to what you own" }).click();
  await page.getByRole("link", { name: /Bank account/ }).click();
  await page.getByLabel("Bank", { exact: true }).fill("Zenith Bank");
  await page.getByLabel("Last four digits (optional)").fill("12ab");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Last four digits only")).toBeVisible();
  await page.getByLabel("Last four digits (optional)").fill("4417");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Saved and locked.")).toBeVisible();

  await page.locator('input[type="file"]').setInputFiles({
    name: "statement-ọ̀.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("Account ending 4417. Branch: Ikoyi."),
  });
  await expect(page.getByText("statement-ọ̀.txt")).toBeVisible({ timeout: 20_000 });
  const fileDl = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download" }).click();
  const dl = await fileDl;
  expect(readFileSync((await dl.path())!).toString()).toBe("Account ending 4417. Branch: Ikoyi.");

  // ── Lock, then unlock with the passphrase and with the recovery code ─────
  await page.getByRole("button", { name: "Lock" }).click();
  await expect(page.getByRole("heading", { name: "Unlock your vault" })).toBeVisible();
  await page.getByLabel("Passphrase").fill("wrong passphrase entirely");
  await page.getByRole("button", { name: "Unlock", exact: true }).click();
  await expect(page.locator("main").getByRole("alert")).toContainText("didn't unlock");
  await page.getByLabel("Passphrase").fill(PASSPHRASE);
  await page.getByRole("button", { name: "Unlock", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Zenith Bank" })).toBeVisible({ timeout: 20_000 });

  // A reload forgets every key.
  await page.reload();
  await expect(page.getByRole("heading", { name: "Unlock your vault" })).toBeVisible();
  await page.getByRole("tab", { name: "Recovery code" }).click();
  await page.getByLabel("Recovery code").fill(code.join(" ").toLowerCase());
  await page.getByRole("button", { name: "Unlock", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Zenith Bank" })).toBeVisible({ timeout: 20_000 });

  // ── Export ───────────────────────────────────────────────────────────────
  await page.getByRole("link", { name: "Settings" }).click();
  const exp = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download export" }).click();
  const zip = unzipSync(new Uint8Array(readFileSync((await (await exp).path())!)));
  const bundle = JSON.parse(strFromU8(zip["vault.json"]!)) as {
    items: Array<{ title: string; payload: Record<string, unknown> }>;
  };
  expect(bundle.items.map((i) => i.title).sort()).toEqual(["Funmi Bello", "Zenith Bank"]);
  expect(strFromU8(zip["summary.html"]!)).toContain("Funmi Bello");
  expect(Object.keys(zip).some((k) => k.startsWith("files/statement"))).toBe(true);

  // ── Delete the account ───────────────────────────────────────────────────
  await page.getByLabel('Type "delete my account" to confirm').fill("delete my account");
  await page.getByRole("button", { name: "Delete my account" }).click();
  await expect(page).toHaveURL("http://localhost:4173/");
  await expect(
    page.getByRole("heading", { level: 1, name: "Leave your family clarity, not chaos." }),
  ).toBeVisible();
  const me = await page.request.get(`${API}/api/me`);
  expect(me.status()).toBe(401);

  expect(violations).toEqual([]);
});

test("signed-out visitors are sent to sign in", async ({ page }) => {
  await page.goto("/app/vault/");
  await expect(page).toHaveURL(/\/signin\/$/);
});
