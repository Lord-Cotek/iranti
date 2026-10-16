import { expect, test } from "@playwright/test";

test("marketing placeholder renders from the static export", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/Ìrántí/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Leave your family clarity, not chaos." }),
  ).toBeVisible();
  for (const label of ["WHO", "WHAT", "WISHES", "WORDS"]) {
    await expect(page.getByText(label, { exact: true })).toBeVisible();
  }
  await expect(page.getByText("Ìrántí is not a will and not legal advice.")).toBeVisible();
});

test("no horizontal scroll at phone width", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 });
  await page.goto("/");
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});

for (const selector of ["h1", "p.font-mono", "body"]) {
  test(`self-hosted face for ${selector} covers Yoruba letters and stacked marks`, async ({
    page,
  }) => {
    await page.goto("/");
    // next/font splits each family by unicode-range; loading this text must pull in a face
    // that covers ẹ ọ Ẹ Ọ and the combining acute/grave (the vietnamese subset).
    const faces = await page.evaluate(async (sel) => {
      const family = getComputedStyle(document.querySelector(sel)!).fontFamily.split(",")[0]!;
      const loaded = await document.fonts.load(`40px ${family}`, "ẹ́ ọ̀ Ẹ Ọ");
      return loaded.map((f) => f.unicodeRange);
    }, selector);
    expect(faces.length).toBeGreaterThan(0);
    expect(faces.join(",")).toMatch(/U\+1EA0-1EF9/i);
  });
}
