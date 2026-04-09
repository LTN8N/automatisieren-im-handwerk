import { test, expect } from "@playwright/test";

const TEST_USER = {
  name: "Test Handwerker",
  firmenname: "Test Sanitaer GmbH",
  email: `test-${Date.now()}@example.com`,
  password: "TestPasswort123!",
};

test.describe("Registrierung", () => {
  test("Neuen Benutzer registrieren", async ({ page }) => {
    await page.goto("/de/register");

    await expect(page.getByRole("heading", { name: "Registrieren" })).toBeVisible();

    await page.getByLabel("Ihr Name").fill(TEST_USER.name);
    await page.getByLabel("Firmenname").fill(TEST_USER.firmenname);
    await page.getByLabel("E-Mail").fill(TEST_USER.email);
    await page.getByLabel("Passwort").fill(TEST_USER.password);

    await page.getByRole("button", { name: "Konto erstellen" }).click();

    // Nach erfolgreicher Registrierung wird auf Login weitergeleitet
    await expect(page).toHaveURL(/\/de\/login/, { timeout: 10_000 });
  });

  test("Duplikat-E-Mail zeigt Fehler", async ({ page }) => {
    // Erst registrieren
    const email = `dup-${Date.now()}@example.com`;

    await page.goto("/de/register");
    await page.getByLabel("Ihr Name").fill("Duplikat Test");
    await page.getByLabel("Firmenname").fill("Duplikat GmbH");
    await page.getByLabel("E-Mail").fill(email);
    await page.getByLabel("Passwort").fill("TestPasswort123!");
    await page.getByRole("button", { name: "Konto erstellen" }).click();
    await expect(page).toHaveURL(/\/de\/login/, { timeout: 10_000 });

    // Nochmal mit gleicher E-Mail registrieren
    await page.goto("/de/register");
    await page.getByLabel("Ihr Name").fill("Duplikat Test 2");
    await page.getByLabel("Firmenname").fill("Duplikat GmbH 2");
    await page.getByLabel("E-Mail").fill(email);
    await page.getByLabel("Passwort").fill("TestPasswort123!");
    await page.getByRole("button", { name: "Konto erstellen" }).click();

    await expect(page.getByText("E-Mail wird bereits verwendet")).toBeVisible({ timeout: 5_000 });
  });
});

test.describe("Login", () => {
  const loginUser = {
    name: "Login Tester",
    firmenname: "Login Test GmbH",
    email: `login-${Date.now()}@example.com`,
    password: "LoginPasswort123!",
  };

  test.beforeAll(async ({ request }) => {
    // Benutzer per API anlegen
    await request.post("/api/auth/register", {
      data: loginUser,
    });
  });

  test("Erfolgreicher Login leitet zum Dashboard weiter", async ({ page }) => {
    await page.goto("/de/login");

    await expect(page.getByRole("heading", { name: "Anmelden" })).toBeVisible();

    await page.getByLabel("E-Mail").fill(loginUser.email);
    await page.getByLabel("Passwort").fill(loginUser.password);
    await page.getByRole("button", { name: "Anmelden" }).click();

    // Nach Login zum Dashboard weitergeleitet
    await expect(page).toHaveURL(/\/de\/dashboard/, { timeout: 10_000 });
  });

  test("Falsches Passwort zeigt Fehlermeldung", async ({ page }) => {
    await page.goto("/de/login");

    await page.getByLabel("E-Mail").fill(loginUser.email);
    await page.getByLabel("Passwort").fill("falschesPasswort");
    await page.getByRole("button", { name: "Anmelden" }).click();

    await expect(page.getByText("E-Mail oder Passwort ist falsch")).toBeVisible({ timeout: 5_000 });
  });

  test("Session bleibt nach Seitenneuladen erhalten", async ({ page }) => {
    await page.goto("/de/login");
    await page.getByLabel("E-Mail").fill(loginUser.email);
    await page.getByLabel("Passwort").fill(loginUser.password);
    await page.getByRole("button", { name: "Anmelden" }).click();
    await expect(page).toHaveURL(/\/de\/dashboard/, { timeout: 10_000 });

    // Seite neu laden und pruefen, ob Session erhalten bleibt
    await page.reload();
    await expect(page).toHaveURL(/\/de\/dashboard/, { timeout: 5_000 });
    await expect(page).not.toHaveURL(/\/de\/login/);
  });
});
