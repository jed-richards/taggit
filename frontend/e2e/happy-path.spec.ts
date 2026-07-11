import { expect, test, type Page } from "@playwright/test";
import { createHmac, randomUUID } from "node:crypto";
import { E2E_JWT_SECRET } from "../playwright.config";

// ---- auth seeding -----------------------------------------------------------

function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64url");
}

function signHs256Jwt(payload: Record<string, unknown>, secret: string): string {
  const header = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = b64url(JSON.stringify(payload));
  const sig = createHmac("sha256", secret).update(`${header}.${body}`).digest("base64url");
  return `${header}.${body}.${sig}`;
}

/** Seed the supabase-js localStorage session so the app believes we're signed in. */
async function signIn(page: Page): Promise<void> {
  const userId = randomUUID();
  // Unique per run: in production an email maps to one stable Supabase sub;
  // reusing an email with a fresh uuid would trip the users.email unique key.
  const email = `e2e-${userId.slice(0, 8)}@example.com`;
  const expiresAt = Math.floor(Date.now() / 1000) + 6 * 3600;
  const accessToken = signHs256Jwt(
    {
      sub: userId,
      email,
      aud: "authenticated",
      exp: expiresAt,
      user_metadata: { full_name: "E2E Tester" },
    },
    E2E_JWT_SECRET,
  );
  const session = {
    access_token: accessToken,
    token_type: "bearer",
    expires_in: 6 * 3600,
    expires_at: expiresAt,
    refresh_token: "e2e-refresh",
    user: {
      id: userId,
      aud: "authenticated",
      email,
      user_metadata: { full_name: "E2E Tester" },
      app_metadata: { provider: "google" },
      created_at: new Date().toISOString(),
    },
  };
  // Project ref "e2e" comes from VITE_SUPABASE_URL=https://e2e.supabase.co
  await page.addInitScript((value) => {
    window.localStorage.setItem("sb-e2e-auth-token", value);
  }, JSON.stringify(session));
}

// 1x1 red pixel PNG
const PNG_FIXTURE = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

async function addItem(page: Page, name: string, tags: string[], withPhoto: boolean) {
  await page.getByLabel("Add item").click();
  await page.getByPlaceholder("Name").fill(name);
  if (withPhoto) {
    await page.getByLabel("Add photo").setInputFiles({
      name: "photo.png",
      mimeType: "image/png",
      buffer: PNG_FIXTURE,
    });
    await expect(page.getByText("Photo uploaded · tap to retake")).toBeVisible();
  }
  for (const tag of tags) {
    await page.getByPlaceholder("Type to add tags…").fill(tag);
    const existing = page.getByRole("button", { name: new RegExp(`^${tag}\\s?\\d*$`) }).first();
    const createRow = page.getByText(`Create “${tag}”`);
    if (await createRow.isVisible().catch(() => false)) {
      await createRow.click();
    } else {
      await existing.click();
    }
    // the tag appears as an active pill in the selected list
    await expect(page.getByRole("button", { name: tag, exact: true })).toBeVisible();
  }
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText(name)).toBeVisible();
}

test("the whole loop: create, add, filter, inspect, delete", async ({ page }) => {
  await signIn(page);

  // Land signed-in on collections
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Collections" })).toBeVisible();

  // Create a collection (unique name per run — the e2e DB accumulates)
  const collName = `Snoopy Mugs ${Date.now()}`;
  const newCollection = page.getByLabel("New collection");
  const firstButton = page.getByText("Create your first collection");
  if (await firstButton.isVisible().catch(() => false)) {
    await firstButton.click();
  } else {
    await newCollection.click();
  }
  await page.getByPlaceholder(/Name — e.g./).fill(collName);
  await page.getByRole("button", { name: "Create", exact: true }).click();
  await expect(page.getByText(collName)).toBeVisible(); // detail header

  // Add an item with a photo and two tags (both created inline)
  await addItem(page, "Red Christmas Snoopy", ["red", "christmas"], true);

  // The uploaded photo is actually served by the stub
  const img = page.locator(`img[alt="Red Christmas Snoopy"]`).first();
  await expect(img).toBeVisible();
  const src = await img.getAttribute("src");
  expect(src).toContain("http://localhost:9999/taggit-images/");

  // Second item sharing one tag
  await addItem(page, "Plain Red Mug", ["red"], false);

  // Filter: red matches both
  await page.getByRole("button", { name: /^red\s?\d+$/ }).click();
  await expect(page.getByText("Red Christmas Snoopy")).toBeVisible();
  await expect(page.getByText("Plain Red Mug")).toBeVisible();

  // AND with christmas: only the first
  await page.getByRole("button", { name: /^christmas\s?\d+$/ }).click();
  await expect(page.getByText("All tags")).toBeVisible();
  await expect(page.getByText("Red Christmas Snoopy")).toBeVisible();
  await expect(page.getByText("Plain Red Mug")).not.toBeVisible();

  // OR brings both back
  await page.getByRole("button", { name: "Any tag" }).click();
  await expect(page.getByText("Plain Red Mug")).toBeVisible();

  // Clear, open item detail
  await page.getByRole("button", { name: "Clear" }).click();
  await page.getByText("Red Christmas Snoopy").click();
  await expect(page.getByRole("heading", { name: "Red Christmas Snoopy" })).toBeVisible();
  await expect(page.getByText(/Added by E2E Tester/)).toBeVisible();

  // Tag pill navigates to the pre-filtered collection
  await page.getByRole("button", { name: "christmas", exact: true }).click();
  await expect(page).toHaveURL(/tags=christmas/);
  await expect(page.getByText("Red Christmas Snoopy")).toBeVisible();
  await expect(page.getByText("Plain Red Mug")).not.toBeVisible();

  // Delete the item from its detail screen
  await page.getByText("Red Christmas Snoopy").click();
  await page.getByLabel("Delete item").click();
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  // Back on the collection with one item left, the deleted one gone
  await expect(page.getByText("1 item", { exact: true })).toBeVisible();
  await expect(page.getByText("Plain Red Mug")).toBeVisible();
  await expect(page.getByText("Red Christmas Snoopy")).not.toBeVisible();
});
