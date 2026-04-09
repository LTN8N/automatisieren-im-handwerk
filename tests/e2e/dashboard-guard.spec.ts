import { test, expect } from "@playwright/test";

test.describe("Dashboard Auth-Guard", () => {
  test("Unauthentifizierter Zugriff auf Dashboard wird zu Login umgeleitet", async ({ page }) => {
    await page.goto("/de/dashboard");

    // Middleware leitet zu /de/login um mit callbackUrl
    await expect(page).toHaveURL(/\/de\/login/, { timeout: 10_000 });
    const url = new URL(page.url());
    expect(url.searchParams.get("callbackUrl")).toContain("/de/dashboard");
  });

  test("Unauthentifizierter Zugriff auf Angebote wird zu Login umgeleitet", async ({ page }) => {
    await page.goto("/de/dashboard/angebote");

    await expect(page).toHaveURL(/\/de\/login/, { timeout: 10_000 });
  });

  test("Unauthentifizierter Zugriff auf Kunden wird zu Login umgeleitet", async ({ page }) => {
    await page.goto("/de/dashboard/kunden");

    await expect(page).toHaveURL(/\/de\/login/, { timeout: 10_000 });
  });

  test("Oeffentliche Seiten sind ohne Login erreichbar", async ({ page }) => {
    // Marketing-Startseite
    const response = await page.goto("/de");
    expect(response?.status()).toBeLessThan(400);
    await expect(page).not.toHaveURL(/\/de\/login/);
  });

  test("Registrierungsseite ist ohne Login erreichbar", async ({ page }) => {
    const response = await page.goto("/de/register");
    expect(response?.status()).toBeLessThan(400);
    await expect(page).not.toHaveURL(/\/de\/login/);
  });

  test("Login-Seite ist ohne Login erreichbar", async ({ page }) => {
    const response = await page.goto("/de/login");
    expect(response?.status()).toBeLessThan(400);
    await expect(page.getByRole("heading", { name: "Anmelden" })).toBeVisible();
  });

  test("Authentifizierter Benutzer kann Dashboard erreichen", async ({ page, request }) => {
    // Benutzer anlegen
    const email = `guard-${Date.now()}@example.com`;
    await request.post("/api/auth/register", {
      data: {
        name: "Guard Tester",
        firmenname: "Guard Test GmbH",
        email,
        password: "GuardTest123!",
      },
    });

    // Login
    await page.goto("/de/login");
    await page.getByLabel("E-Mail").fill(email);
    await page.getByLabel("Passwort").fill("GuardTest123!");
    await page.getByRole("button", { name: "Anmelden" }).click();

    // Dashboard sollte erreichbar sein
    await expect(page).toHaveURL(/\/de\/dashboard/, { timeout: 10_000 });
  });
});
