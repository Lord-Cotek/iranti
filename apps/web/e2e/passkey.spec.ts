import { expect, test, type Page } from "@playwright/test";

const API = "http://localhost:3001";
const PASSPHRASE = "orchard velvet compass lagoon ninety";

test.skip(({ isMobile }) => isMobile, "passkey flow runs on desktop");

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

test("a PRF passkey signs in and unlocks in one step", async ({ page }) => {
  // A virtual platform authenticator with the PRF extension (CTAP 2.1 hmac-secret).
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("WebAuthn.enable");
  await cdp.send("WebAuthn.addVirtualAuthenticator", {
    options: {
      protocol: "ctap2",
      ctap2Version: "ctap2_1",
      transport: "internal",
      hasResidentKey: true,
      hasUserVerification: true,
      isUserVerified: true,
      hasPrf: true,
      automaticPresenceSimulation: true,
    },
  });

  const email = `passkey-${Date.now()}@example.test`;
  await page.goto("/signin/");
  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: "Email me a code" }).click();
  await page.getByLabel("Six-digit code").fill(await readCode(page, email));
  await page.getByRole("button", { name: "Sign in" }).click();

  await page.getByLabel("I am 18 or older.").check();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("Passphrase", { exact: true }).fill(PASSPHRASE);
  await page.getByLabel("Type it again").fill(PASSPHRASE);
  await page.getByRole("button", { name: "Make my keys" }).click();
  const code = (await page.getByTestId("recovery-code").innerText({ timeout: 30_000 }))
    .trim()
    .split(/\s+/);
  await page
    .getByLabel("To confirm you have it, type the last two groups of the code")
    .fill(code.slice(-2).join("-"));
  await page.getByRole("button", { name: "I've saved it. Continue" }).click();

  await page.getByRole("button", { name: "Add a passkey" }).click();
  await expect(
    page.locator("main").getByText("Passkey added. You can sign in and unlock with it."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Go to your vault" }).click();

  // Lock, then unlock with the passkey alone.
  await page.getByRole("button", { name: "Lock" }).click();
  await expect(page.getByRole("tab", { name: "Passkey" })).toHaveAttribute("aria-selected", "true");
  await page.getByRole("button", { name: "Unlock with passkey" }).click();
  await expect(page.getByText("Unlocked on this device.")).toBeVisible();

  // Sign out completely, then sign in with the passkey: one ceremony signs in and unlocks.
  await page.getByRole("link", { name: "Settings" }).click();
  await page.getByRole("button", { name: "Sign out of this device" }).click();
  await expect(page).toHaveURL(/\/signin\/$/);
  await page.getByRole("button", { name: "Sign in with a passkey" }).click();
  await expect(page.getByText("Unlocked on this device.")).toBeVisible({ timeout: 20_000 });
});
