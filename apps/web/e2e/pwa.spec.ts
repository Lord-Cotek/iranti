import { expect, test } from "@playwright/test";
import { signUpAndSetUp, watchCsp } from "./helpers";

test("installable: manifest, icons and a controlling service worker", async ({ page }) => {
  const csp = watchCsp(page);
  await page.goto("/");
  const href = await page.locator('link[rel="manifest"]').getAttribute("href");
  expect(href).toBeTruthy();
  const manifest = await (await page.request.get(href!)).json();
  expect(manifest).toMatchObject({ name: "Ìrántí", display: "standalone", start_url: "/app/" });
  for (const icon of manifest.icons as Array<{ src: string }>) {
    const res = await page.request.get(icon.src);
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toBe("image/png");
  }
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  expect(await page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  expect(csp).toEqual([]);
});

test("every page ships a hash-based script CSP", async ({ request }) => {
  // Checked in the served HTML: the browser applies a meta CSP as it parses, even if React
  // later re-renders <head>.
  for (const path of ["/", "/signin/", "/app/", "/app/setup/", "/app/settings/"]) {
    const html = await (await request.get(path)).text();
    const policy = /<head><meta http-equiv="Content-Security-Policy" content="([^"]+)">/.exec(
      html,
    )?.[1];
    expect(policy, path).toBeTruthy();
    const scriptSrc = policy!
      .split(";")
      .map((d) => d.trim())
      .find((d) => d.startsWith("script-src"))!;
    expect(scriptSrc).toMatch(/^script-src 'self' 'wasm-unsafe-eval'( 'sha256-[A-Za-z0-9+/=]+')+$/);
    expect(policy).toContain("object-src 'none'");
  }
});

test("offline: unlock and read the vault from the cached ciphertext", async ({
  page,
  context,
  isMobile,
}) => {
  test.skip(isMobile, "runs on desktop");
  const csp = watchCsp(page);
  const passphrase = "meadow ferry tangerine quartz";
  await signUpAndSetUp(page, passphrase);
  await page.getByRole("link", { name: "Add a person" }).click();
  await page.getByLabel("Name").fill("Kayode Ajayi");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Saved and locked.")).toBeVisible();
  await page.evaluate(() => navigator.serviceWorker.ready);

  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Unlock your vault" })).toBeVisible();
  await expect(page.getByText("You're offline.")).toBeVisible();
  await page.getByLabel("Passphrase").fill(passphrase);
  await page.getByRole("button", { name: "Unlock", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Kayode Ajayi" })).toBeVisible({
    timeout: 20_000,
  });
  await expect(page.getByText("Offline. Showing what was last synced")).toBeVisible();
  await context.setOffline(false);
  expect(csp).toEqual([]);
});
