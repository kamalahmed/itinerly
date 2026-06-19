import { test, expect } from "@playwright/test";

/**
 * Full booking flow: search → select → passenger details → mock payment →
 * confirmation → download the itinerary PDF.
 */
test("books a flight and downloads a valid itinerary PDF", async ({ page }) => {
  // Deterministic pre-filled search (skips the autocomplete typing).
  await page.goto(
    "/search?origin=DAC&destination=DXB&departDate=2026-08-15&adults=1&tripType=one_way&cabin=economy"
  );

  // Results render; pick the first flight.
  const select = page.getByRole("button", { name: "Select" }).first();
  await expect(select).toBeVisible({ timeout: 30_000 });
  await select.click();

  // Passenger details.
  await expect(page).toHaveURL(/\/booking\/[a-z0-9]+$/);
  await page.getByPlaceholder("MD RAHMAN AHMED").fill("MD RAHMAN AHMED");
  await page.locator('input[name="passengers.0.dob"]').fill("1990-04-12");
  await page.getByPlaceholder("Bangladeshi").fill("Bangladeshi");
  await page.getByPlaceholder("A01234567").fill("A01234567");
  await page
    .locator('input[name="passengers.0.passportExpiry"]')
    .fill("2030-08-20");
  await page.getByRole("button", { name: /continue to payment/i }).click();

  // Mock payment.
  await expect(page).toHaveURL(/\/payment$/);
  await page.getByRole("button", { name: /pay & generate/i }).click();

  // Confirmation with a booking reference.
  await expect(page).toHaveURL(/\/confirmation$/, { timeout: 20_000 });
  await expect(
    page.getByRole("heading", { name: /itinerary generated/i })
  ).toBeVisible();
  await expect(page.getByText(/booking reference/i)).toBeVisible();

  // Download the PDF.
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("link", { name: /download pdf/i }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/itinerly-.*\.pdf/i);

  // It's a real PDF.
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const c of stream) chunks.push(c as Buffer);
  const buf = Buffer.concat(chunks);
  expect(buf.subarray(0, 5).toString()).toBe("%PDF-");
  expect(buf.length).toBeGreaterThan(1000);
});
