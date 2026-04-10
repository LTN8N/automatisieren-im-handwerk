/**
 * E2E-Tests: E-Mail-Versand für Angebote und Rechnungen (AUT-20)
 *
 * Voraussetzungen:
 * - Nodemailer mit SMTP_HOST/PORT/USER/PASS konfiguriert
 * - In Tests: SMTP_HOST=localhost, SMTP_PORT=1025 (z.B. Mailpit/MailHog)
 * - AUT-19 (PDF-Generierung) muss für vollständigen Anhang implementiert sein
 */

import { test, expect } from "@playwright/test";

// -----------------------------------------------------------------------
// Helpers: Registrierung + Login + Testdaten anlegen
// -----------------------------------------------------------------------

async function registriereUndLogin(request: import("@playwright/test").APIRequestContext) {
  const email = `email-versand-${Date.now()}@example.com`;
  const password = "TestPasswort123!";

  await request.post("/api/auth/register", {
    data: {
      name: "Email Tester",
      firmenname: "Email Test GmbH",
      email,
      password,
    },
  });

  // Session-Cookie via credentials login
  const loginRes = await request.post("/api/auth/callback/credentials", {
    data: { email, password, redirect: "false", json: "true" },
  });

  return { email, password };
}

async function legeKundeAn(
  request: import("@playwright/test").APIRequestContext
): Promise<string> {
  const res = await request.post("/api/kunden", {
    data: {
      name: "Max Mustermann",
      email: "kunde@example.com",
      adresse: "Musterstraße 1, 12345 Musterstadt",
    },
  });
  expect(res.status()).toBe(201);
  const kunde = await res.json();
  return kunde.id;
}

async function legeAngebotAn(
  request: import("@playwright/test").APIRequestContext,
  kundeId: string
): Promise<string> {
  const res = await request.post("/api/angebote", {
    data: {
      kundeId,
      positionen: [
        {
          beschreibung: "Sanitärarbeiten",
          menge: 2,
          einheit: "Std",
          einzelpreis: 85.0,
          ustSatz: 19.0,
          sortierung: 0,
        },
      ],
    },
  });
  expect(res.status()).toBe(201);
  const angebot = await res.json();
  return angebot.id;
}

async function legeRechnungAn(
  request: import("@playwright/test").APIRequestContext,
  kundeId: string
): Promise<string> {
  const res = await request.post("/api/rechnungen", {
    data: {
      kundeId,
      positionen: [
        {
          beschreibung: "Heizungsinspektion",
          menge: 1,
          einheit: "Pauschal",
          einzelpreis: 250.0,
          ustSatz: 19.0,
          sortierung: 0,
        },
      ],
    },
  });
  expect(res.status()).toBe(201);
  const rechnung = await res.json();
  return rechnung.id;
}

// -----------------------------------------------------------------------
// API-Tests: POST /api/angebote/[id]/versenden
// -----------------------------------------------------------------------

test.describe("API: Angebot per E-Mail versenden", () => {
  test("Angebot erfolgreich versenden – Status 200 und Historie-Eintrag", async ({
    page,
    request,
  }) => {
    const { email, password } = await registriereUndLogin(request);

    // Login über UI für Session-Cookie
    await page.goto("/de/login");
    await page.getByLabel("E-Mail").fill(email);
    await page.getByLabel("Passwort").fill(password);
    await page.getByRole("button", { name: "Anmelden" }).click();
    await expect(page).toHaveURL(/\/de\/dashboard/, { timeout: 10_000 });

    const kundeId = await legeKundeAn(request);
    const angebotId = await legeAngebotAn(request, kundeId);

    // E-Mail versenden
    const res = await request.post(`/api/angebote/${angebotId}/versenden`);
    expect(res.status()).toBe(200);

    const body = await res.json();
    expect(body).toHaveProperty("success", true);
    expect(body).toHaveProperty("messageId"); // Nodemailer messageId

    // Historie-Eintrag prüfen
    const angebotRes = await request.get(`/api/angebote/${angebotId}`);
    const angebot = await angebotRes.json();
    const versandHistorie = angebot.historie.find(
      (h: { wasGeaendert: string }) => h.wasGeaendert === "email_versandt"
    );
    expect(versandHistorie).toBeDefined();
    expect(versandHistorie.neuerWert).toContain("@");
  });

  test("Angebot versenden setzt Status auf GESENDET", async ({
    page,
    request,
  }) => {
    const { email, password } = await registriereUndLogin(request);

    await page.goto("/de/login");
    await page.getByLabel("E-Mail").fill(email);
    await page.getByLabel("Passwort").fill(password);
    await page.getByRole("button", { name: "Anmelden" }).click();
    await expect(page).toHaveURL(/\/de\/dashboard/, { timeout: 10_000 });

    const kundeId = await legeKundeAn(request);
    const angebotId = await legeAngebotAn(request, kundeId);

    await request.post(`/api/angebote/${angebotId}/versenden`);

    const angebotRes = await request.get(`/api/angebote/${angebotId}`);
    const angebot = await angebotRes.json();
    expect(angebot.status).toBe("GESENDET");
  });

  test("Angebot versenden ohne Authentifizierung → 401", async ({ request }) => {
    const res = await request.post("/api/angebote/nicht-existent/versenden");
    expect(res.status()).toBe(401);
  });

  test("Nicht-existierendes Angebot versenden → 404", async ({
    page,
    request,
  }) => {
    const { email, password } = await registriereUndLogin(request);

    await page.goto("/de/login");
    await page.getByLabel("E-Mail").fill(email);
    await page.getByLabel("Passwort").fill(password);
    await page.getByRole("button", { name: "Anmelden" }).click();
    await expect(page).toHaveURL(/\/de\/dashboard/, { timeout: 10_000 });

    const res = await request.post("/api/angebote/unbekannte-id-xyz/versenden");
    expect(res.status()).toBe(404);
  });

  test("Angebot eines anderen Tenants kann nicht versendet werden → 404 (Multi-Tenant)", async ({
    page,
    request,
  }) => {
    // Tenant A anlegen und Angebot erstellen
    const emailA = `tenant-a-${Date.now()}@example.com`;
    await request.post("/api/auth/register", {
      data: {
        name: "Tenant A",
        firmenname: "Tenant A GmbH",
        email: emailA,
        password: "TestPasswort123!",
      },
    });

    // Mit Tenant A einloggen und Angebot erstellen
    await page.goto("/de/login");
    await page.getByLabel("E-Mail").fill(emailA);
    await page.getByLabel("Passwort").fill("TestPasswort123!");
    await page.getByRole("button", { name: "Anmelden" }).click();
    await expect(page).toHaveURL(/\/de\/dashboard/, { timeout: 10_000 });

    const kundeId = await legeKundeAn(request);
    const angebotIdA = await legeAngebotAn(request, kundeId);

    // Tenant B anlegen und mit B einloggen
    const emailB = `tenant-b-${Date.now()}@example.com`;
    await request.post("/api/auth/register", {
      data: {
        name: "Tenant B",
        firmenname: "Tenant B GmbH",
        email: emailB,
        password: "TestPasswort123!",
      },
    });

    await page.goto("/de/login");
    await page.getByLabel("E-Mail").fill(emailB);
    await page.getByLabel("Passwort").fill("TestPasswort123!");
    await page.getByRole("button", { name: "Anmelden" }).click();
    await expect(page).toHaveURL(/\/de\/dashboard/, { timeout: 10_000 });

    // Tenant B versucht Angebot von A zu versenden
    const res = await request.post(`/api/angebote/${angebotIdA}/versenden`);
    expect(res.status()).toBe(404);
  });
});

// -----------------------------------------------------------------------
// API-Tests: POST /api/rechnungen/[id]/versenden
// -----------------------------------------------------------------------

test.describe("API: Rechnung per E-Mail versenden", () => {
  test("Rechnung erfolgreich versenden – Status 200 und Historie-Eintrag", async ({
    page,
    request,
  }) => {
    const { email, password } = await registriereUndLogin(request);

    await page.goto("/de/login");
    await page.getByLabel("E-Mail").fill(email);
    await page.getByLabel("Passwort").fill(password);
    await page.getByRole("button", { name: "Anmelden" }).click();
    await expect(page).toHaveURL(/\/de\/dashboard/, { timeout: 10_000 });

    const kundeId = await legeKundeAn(request);
    const rechnungId = await legeRechnungAn(request, kundeId);

    const res = await request.post(`/api/rechnungen/${rechnungId}/versenden`);
    expect(res.status()).toBe(200);

    const body = await res.json();
    expect(body).toHaveProperty("success", true);
    expect(body).toHaveProperty("messageId");

    // Historie-Eintrag prüfen
    const rechnungRes = await request.get(`/api/rechnungen/${rechnungId}`);
    const rechnung = await rechnungRes.json();
    const versandHistorie = rechnung.historie.find(
      (h: { wasGeaendert: string }) => h.wasGeaendert === "email_versandt"
    );
    expect(versandHistorie).toBeDefined();
  });

  test("Rechnung versenden setzt Status auf GESENDET", async ({
    page,
    request,
  }) => {
    const { email, password } = await registriereUndLogin(request);

    await page.goto("/de/login");
    await page.getByLabel("E-Mail").fill(email);
    await page.getByLabel("Passwort").fill(password);
    await page.getByRole("button", { name: "Anmelden" }).click();
    await expect(page).toHaveURL(/\/de\/dashboard/, { timeout: 10_000 });

    const kundeId = await legeKundeAn(request);
    const rechnungId = await legeRechnungAn(request, kundeId);

    await request.post(`/api/rechnungen/${rechnungId}/versenden`);

    const rechnungRes = await request.get(`/api/rechnungen/${rechnungId}`);
    const rechnung = await rechnungRes.json();
    expect(rechnung.status).toBe("GESENDET");
  });

  test("Rechnung versenden ohne Authentifizierung → 401", async ({ request }) => {
    const res = await request.post("/api/rechnungen/nicht-existent/versenden");
    expect(res.status()).toBe(401);
  });

  test("Nicht-existierende Rechnung versenden → 404", async ({
    page,
    request,
  }) => {
    const { email, password } = await registriereUndLogin(request);

    await page.goto("/de/login");
    await page.getByLabel("E-Mail").fill(email);
    await page.getByLabel("Passwort").fill(password);
    await page.getByRole("button", { name: "Anmelden" }).click();
    await expect(page).toHaveURL(/\/de\/dashboard/, { timeout: 10_000 });

    const res = await request.post("/api/rechnungen/unbekannte-id-xyz/versenden");
    expect(res.status()).toBe(404);
  });

  test("Rechnung eines anderen Tenants kann nicht versendet werden → 404 (Multi-Tenant)", async ({
    page,
    request,
  }) => {
    // Tenant A: Rechnung erstellen
    const emailA = `rech-a-${Date.now()}@example.com`;
    await request.post("/api/auth/register", {
      data: {
        name: "Rechnungs Tenant A",
        firmenname: "Rechnungs A GmbH",
        email: emailA,
        password: "TestPasswort123!",
      },
    });

    await page.goto("/de/login");
    await page.getByLabel("E-Mail").fill(emailA);
    await page.getByLabel("Passwort").fill("TestPasswort123!");
    await page.getByRole("button", { name: "Anmelden" }).click();
    await expect(page).toHaveURL(/\/de\/dashboard/, { timeout: 10_000 });

    const kundeId = await legeKundeAn(request);
    const rechnungIdA = await legeRechnungAn(request, kundeId);

    // Tenant B: versucht Rechnung von A zu versenden
    const emailB = `rech-b-${Date.now()}@example.com`;
    await request.post("/api/auth/register", {
      data: {
        name: "Rechnungs Tenant B",
        firmenname: "Rechnungs B GmbH",
        email: emailB,
        password: "TestPasswort123!",
      },
    });

    await page.goto("/de/login");
    await page.getByLabel("E-Mail").fill(emailB);
    await page.getByLabel("Passwort").fill("TestPasswort123!");
    await page.getByRole("button", { name: "Anmelden" }).click();
    await expect(page).toHaveURL(/\/de\/dashboard/, { timeout: 10_000 });

    const res = await request.post(`/api/rechnungen/${rechnungIdA}/versenden`);
    expect(res.status()).toBe(404);
  });
});

// -----------------------------------------------------------------------
// UI-Tests: Versenden-Button in der Detailansicht
// -----------------------------------------------------------------------

test.describe("UI: Versenden-Button in Detailansichten", () => {
  test("Angebot-Detailansicht zeigt 'Versenden'-Button", async ({
    page,
    request,
  }) => {
    const { email, password } = await registriereUndLogin(request);

    await page.goto("/de/login");
    await page.getByLabel("E-Mail").fill(email);
    await page.getByLabel("Passwort").fill(password);
    await page.getByRole("button", { name: "Anmelden" }).click();
    await expect(page).toHaveURL(/\/de\/dashboard/, { timeout: 10_000 });

    const kundeId = await legeKundeAn(request);
    const angebotId = await legeAngebotAn(request, kundeId);

    await page.goto(`/de/dashboard/angebote/${angebotId}`);

    const versendButton = page.getByRole("button", { name: /versenden|per e-mail/i });
    await expect(versendButton).toBeVisible({ timeout: 5_000 });
  });

  test("Rechnung-Detailansicht zeigt 'Versenden'-Button", async ({
    page,
    request,
  }) => {
    const { email, password } = await registriereUndLogin(request);

    await page.goto("/de/login");
    await page.getByLabel("E-Mail").fill(email);
    await page.getByLabel("Passwort").fill(password);
    await page.getByRole("button", { name: "Anmelden" }).click();
    await expect(page).toHaveURL(/\/de\/dashboard/, { timeout: 10_000 });

    const kundeId = await legeKundeAn(request);
    const rechnungId = await legeRechnungAn(request, kundeId);

    await page.goto(`/de/dashboard/rechnungen/${rechnungId}`);

    const versendButton = page.getByRole("button", { name: /versenden|per e-mail/i });
    await expect(versendButton).toBeVisible({ timeout: 5_000 });
  });

  test("Klick auf Versenden-Button zeigt Bestätigung/Toast", async ({
    page,
    request,
  }) => {
    const { email, password } = await registriereUndLogin(request);

    await page.goto("/de/login");
    await page.getByLabel("E-Mail").fill(email);
    await page.getByLabel("Passwort").fill(password);
    await page.getByRole("button", { name: "Anmelden" }).click();
    await expect(page).toHaveURL(/\/de\/dashboard/, { timeout: 10_000 });

    const kundeId = await legeKundeAn(request);
    const angebotId = await legeAngebotAn(request, kundeId);

    await page.goto(`/de/dashboard/angebote/${angebotId}`);

    const versendButton = page.getByRole("button", { name: /versenden|per e-mail/i });
    await versendButton.click();

    // Erfolgs-Toast oder Bestätigungsmeldung
    await expect(
      page.getByText(/erfolgreich|versendet|e-mail.*gesendet/i)
    ).toBeVisible({ timeout: 10_000 });
  });

  test("Nach Versenden zeigt Angebot-Status 'GESENDET' in der UI", async ({
    page,
    request,
  }) => {
    const { email, password } = await registriereUndLogin(request);

    await page.goto("/de/login");
    await page.getByLabel("E-Mail").fill(email);
    await page.getByLabel("Passwort").fill(password);
    await page.getByRole("button", { name: "Anmelden" }).click();
    await expect(page).toHaveURL(/\/de\/dashboard/, { timeout: 10_000 });

    const kundeId = await legeKundeAn(request);
    const angebotId = await legeAngebotAn(request, kundeId);

    await page.goto(`/de/dashboard/angebote/${angebotId}`);

    const versendButton = page.getByRole("button", { name: /versenden|per e-mail/i });
    await versendButton.click();

    // Status-Badge aktualisiert sich
    await expect(page.getByText(/gesendet/i)).toBeVisible({ timeout: 10_000 });
  });
});

// -----------------------------------------------------------------------
// Hinweis: PDF-Anhang (AUT-19)
// -----------------------------------------------------------------------
// Diese Tests setzen aktuell voraus, dass AUT-19 (PDF-Generierung) implementiert
// ist ODER der E-Mail-Service den PDF-Anhang im ENTWURF-Modus mockt.
// Sobald AUT-19 fertig ist, sollten folgende zusätzliche Assertions ergänzt werden:
//   - expect(body.attachments[0].filename).toMatch(/angebot.*\.pdf/)
//   - expect(body.attachments[0].contentType).toBe("application/pdf")
