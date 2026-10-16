import { expect, type Page } from "@playwright/test";

export const API = "http://localhost:3001";

export async function readCode(page: Page, email: string): Promise<string> {
  for (let i = 0; i < 20; i++) {
    const res = await page.request.get(`${API}/api/dev/mail?to=${encodeURIComponent(email)}`);
    const { messages } = (await res.json()) as { messages: Array<{ text: string }> };
    const m = /code is (\d{6})/.exec(messages.at(-1)?.text ?? "");
    if (m) return m[1]!;
    await page.waitForTimeout(250);
  }
  throw new Error("no code arrived");
}

export async function signIn(page: Page, email: string) {
  await page.goto("/signin/");
  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: "Email me a code" }).click();
  await expect(page.getByRole("heading", { name: "Check your email" })).toBeVisible();
  await page.getByLabel("Six-digit code").fill(await readCode(page, email));
  await page.getByRole("button", { name: "Sign in" }).click();
}

/** Sign up and finish setup with the given passphrase; returns the recovery code groups. */
export async function signUpAndSetUp(page: Page, passphrase: string): Promise<string[]> {
  await signIn(page, `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@example.test`);
  await page.getByLabel("I am 18 or older.").check();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("Passphrase", { exact: true }).fill(passphrase);
  await page.getByLabel("Type it again").fill(passphrase);
  await page.getByRole("button", { name: "Make my keys" }).click();
  const code = (await page.getByTestId("recovery-code").innerText({ timeout: 30_000 }))
    .trim()
    .split(/\s+/);
  await page
    .getByLabel("To confirm you have it, type the last two groups of the code")
    .fill(code.slice(-2).join("-"));
  await page.getByRole("button", { name: "I've saved it. Continue" }).click();
  await page.getByRole("button", { name: "Not now" }).click();
  await page.getByRole("button", { name: "Go to your vault" }).click();
  await expect(page.getByText("Unlocked on this device.")).toBeVisible();
  return code;
}

/** Collect CSP violations reported by the page. */
export function watchCsp(page: Page): string[] {
  const violations: string[] = [];
  page.on("console", (m) => {
    if (/Content Security Policy|Refused to (execute|load|connect)/i.test(m.text()))
      violations.push(m.text());
  });
  return violations;
}
