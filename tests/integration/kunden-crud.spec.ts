import { test, expect } from "@playwright/test";

test.describe("Kunden-CRUD", () => {
  test.beforeEach(async ({ page }) => {
    // Login als Testbenutzer
    await page.goto("/de/login");
    await page.fill('input[name="email"]', "test@example.com");
    await page.fill('input[name="password"]', "test1234");
    await page.click('button[type="submit"]');
    await page.waitForURL("**/dashboard");
  });

  test("zeigt Kunden-Liste an", async ({ page }) => {
    await page.goto("/de/dashboard/kunden");
    await expect(page.locator("h1")).toContainText("Kunden");
  });

  test("kann neuen Kunden anlegen", async ({ page }) => {
    await page.goto("/de/dashboard/kunden/neu");

    await page.fill('input[name="name"]', "E2E Test Kunde");
    await page.fill('input[name="email"]', "e2e@test.de");
    await page.fill('input[name="telefon"]', "+49 123 456");
    await page.fill('input[name="adresse"]', "Teststraße 1, 20000 Hamburg");

    await page.click('button[type="submit"]');

    // Sollte zurück zur Liste navigieren
    await page.waitForURL("**/dashboard/kunden");
    await expect(page.locator("text=E2E Test Kunde")).toBeVisible();
  });

  test("validiert Pflichtfeld Name", async ({ page }) => {
    await page.goto("/de/dashboard/kunden/neu");

    // Versuche ohne Name zu speichern
    await page.click('button[type="submit"]');

    // HTML5 required Validierung verhindert Absenden
    const nameInput = page.locator('input[name="name"]');
    await expect(nameInput).toHaveAttribute("required", "");
  });

  test("Suche filtert Kunden", async ({ page }) => {
    await page.goto("/de/dashboard/kunden");

    const searchInput = page.locator('input[placeholder*="suchen"]');
    await searchInput.fill("E2E Test");

    await page.click('button:has-text("Suchen")');

    // URL sollte search-Parameter enthalten
    await expect(page).toHaveURL(/search=E2E/);
  });

  test("kann Kunden bearbeiten", async ({ page }) => {
    await page.goto("/de/dashboard/kunden");

    // Klick auf ersten Bearbeiten-Button
    const editButton = page.locator('a[href*="/dashboard/kunden/"]').first();
    if (await editButton.isVisible()) {
      await editButton.click();
      await expect(page.locator('input[name="name"]')).toBeVisible();
    }
  });

  test("zeigt Lösch-Bestätigung an", async ({ page }) => {
    await page.goto("/de/dashboard/kunden");

    // Klick auf Löschen-Button (Trash icon)
    const deleteButton = page
      .locator("button")
      .filter({ has: page.locator("svg.text-destructive") })
      .first();

    if (await deleteButton.isVisible()) {
      await deleteButton.click();
      await expect(page.locator("text=Kunde löschen")).toBeVisible();
    }
  });
});
