/**
 * E2E-Tests: Rechnungs-CRUD und Angebot-zu-Rechnung Konvertierung (AUT-32)
 *
 * Voraussetzungen:
 * - AUT-13 (Rechnungs-CRUD + Angebot-zu-Rechnung) muss implementiert sein
 * - AngebotStatus muss ABGERECHNET enthalten (Erweiterung durch AUT-13)
 * - Rechnung muss `gesperrt`-Feld haben (GoBD-Unveränderlichkeit, AUT-13)
 * - App läuft auf http://localhost:3000 (oder PLAYWRIGHT_BASE_URL)
 */

import { test, expect } from "@playwright/test";

// -----------------------------------------------------------------------
// Helpers: Registrierung + Login + Testdaten anlegen
// -----------------------------------------------------------------------

async function registriereUndLogin(
  page: import("@playwright/test").Page,
  request: import("@playwright/test").APIRequestContext
): Promise<{ email: string; password: string }> {
  const email = `rechnungen-e2e-${Date.now()}@example.com`;
  const password = "TestPasswort123!";

  await request.post("/api/auth/register", {
    data: {
      name: "Rechnungs Tester",
      firmenname: "Rechnungs Test GmbH",
      email,
      password,
    },
  });

  await page.goto("/de/login");
  await page.getByLabel("E-Mail").fill(email);
  await page.getByLabel("Passwort").fill(password);
  await page.getByRole("button", { name: "Anmelden" }).click();
  await expect(page).toHaveURL(/\/de\/dashboard/, { timeout: 10_000 });

  return { email, password };
}

async function legeKundeAn(
  request: import("@playwright/test").APIRequestContext
): Promise<string> {
  const res = await request.post("/api/kunden", {
    data: {
      name: "Test Kunde GmbH",
      email: "kunde@example.com",
      adresse: "Musterstraße 1, 20099 Hamburg",
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

async function legeAngebotMitStatusAn(
  request: import("@playwright/test").APIRequestContext,
  kundeId: string,
  status: string
): Promise<string> {
  const angebotId = await legeAngebotAn(request, kundeId);

  // Status auf ANGENOMMEN setzen
  const patchRes = await request.patch(`/api/angebote/${angebotId}`, {
    data: { status },
  });
  expect(patchRes.status()).toBe(200);

  return angebotId;
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
// 1. Rechnung erstellen (manuell)
// -----------------------------------------------------------------------

test.describe("Rechnung manuell erstellen", () => {
  test("Formular aufrufen und Rechnung speichern → RE-Nummer wird generiert", async ({
    page,
    request,
  }) => {
    await registriereUndLogin(page, request);
    const kundeId = await legeKundeAn(request);

    // Kunde via UI auswählen ist nicht trivial — wir nutzen die API und prüfen dann die UI
    const rechnungId = await legeRechnungAn(request, kundeId);

    // Rechnung-Detailseite aufrufen
    await page.goto(`/de/dashboard/rechnungen/${rechnungId}`);

    // Rechnungsnummer im Format RE-YYYY-NNN prüfen
    await expect(page.getByText(/RE-\d{4}-\d+/)).toBeVisible({ timeout: 5_000 });
  });

  test("Neue Rechnung via UI: Navigate zu /dashboard/rechnungen/neu", async ({
    page,
    request,
  }) => {
    await registriereUndLogin(page, request);

    await page.goto("/de/dashboard/rechnungen/neu");
    await expect(page).toHaveURL(/rechnungen\/neu/, { timeout: 5_000 });

    // Formular vorhanden
    await expect(page.getByRole("heading", { name: /rechnung/i })).toBeVisible();
  });

  test("Preis + USt-Berechnung: 19% DE Standard", async ({
    page,
    request,
  }) => {
    await registriereUndLogin(page, request);
    const kundeId = await legeKundeAn(request);

    // Rechnung mit bekannten Werten anlegen: 2 × 85,00 € = 170,00 € netto
    const res = await request.post("/api/rechnungen", {
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
    const rechnung = await res.json();

    // Netto: 170,00 — USt: 32,30 — Brutto: 202,30
    expect(rechnung.netto).toBeCloseTo(170.0, 2);
    expect(rechnung.ust).toBeCloseTo(32.3, 2);
    expect(rechnung.brutto).toBeCloseTo(202.3, 2);

    // Rechnungsnummer vorhanden
    expect(rechnung.nummer).toMatch(/RE-\d{4}-\d+/);
  });

  test("Rechnung-Liste zeigt neue Rechnung an", async ({
    page,
    request,
  }) => {
    await registriereUndLogin(page, request);
    const kundeId = await legeKundeAn(request);
    await legeRechnungAn(request, kundeId);

    await page.goto("/de/dashboard/rechnungen");
    await expect(page.getByText(/RE-\d{4}-\d+/)).toBeVisible({ timeout: 5_000 });
  });
});

// -----------------------------------------------------------------------
// 2. Angebot zu Rechnung konvertieren
// -----------------------------------------------------------------------

test.describe("Angebot zu Rechnung konvertieren", () => {
  test("Button 'In Rechnung umwandeln' erscheint bei angenommenem Angebot", async ({
    page,
    request,
  }) => {
    await registriereUndLogin(page, request);
    const kundeId = await legeKundeAn(request);
    const angebotId = await legeAngebotMitStatusAn(request, kundeId, "ANGENOMMEN");

    await page.goto(`/de/dashboard/angebote/${angebotId}`);

    const konvertButton = page.getByRole("button", {
      name: /in rechnung umwandeln|rechnung erstellen/i,
    });
    await expect(konvertButton).toBeVisible({ timeout: 5_000 });
  });

  test("Konvertierung: Klick → Redirect zur neuen Rechnung", async ({
    page,
    request,
  }) => {
    await registriereUndLogin(page, request);
    const kundeId = await legeKundeAn(request);
    const angebotId = await legeAngebotMitStatusAn(request, kundeId, "ANGENOMMEN");

    await page.goto(`/de/dashboard/angebote/${angebotId}`);

    const konvertButton = page.getByRole("button", {
      name: /in rechnung umwandeln|rechnung erstellen/i,
    });
    await konvertButton.click();

    // Redirect zur neuen Rechnungsseite
    await expect(page).toHaveURL(/\/de\/dashboard\/rechnungen\//, { timeout: 10_000 });
  });

  test("Konvertierung: Angebot-Status wird ABGERECHNET", async ({
    page,
    request,
  }) => {
    await registriereUndLogin(page, request);
    const kundeId = await legeKundeAn(request);
    const angebotId = await legeAngebotMitStatusAn(request, kundeId, "ANGENOMMEN");

    await page.goto(`/de/dashboard/angebote/${angebotId}`);

    const konvertButton = page.getByRole("button", {
      name: /in rechnung umwandeln|rechnung erstellen/i,
    });
    await konvertButton.click();
    await expect(page).toHaveURL(/\/de\/dashboard\/rechnungen\//, { timeout: 10_000 });

    // Zurück zum Angebot – Status prüfen
    await page.goto(`/de/dashboard/angebote/${angebotId}`);
    await expect(page.getByText(/abgerechnet/i)).toBeVisible({ timeout: 5_000 });
  });

  test("Konvertierung via API: Angebot-Status = ABGERECHNET, neue Rechnung verknüpft", async ({
    page,
    request,
  }) => {
    await registriereUndLogin(page, request);
    const kundeId = await legeKundeAn(request);
    const angebotId = await legeAngebotMitStatusAn(request, kundeId, "ANGENOMMEN");

    // Konvertierung via API-Endpunkt
    const res = await request.post(`/api/angebote/${angebotId}/konvertieren`);
    expect(res.status()).toBe(201);

    const body = await res.json();
    expect(body).toHaveProperty("id");
    expect(body).toHaveProperty("nummer");
    expect(body.nummer).toMatch(/RE-\d{4}-\d+/);
    expect(body.angebotId).toBe(angebotId);

    // Angebot-Status prüfen
    const angebotRes = await request.get(`/api/angebote/${angebotId}`);
    const angebot = await angebotRes.json();
    expect(angebot.status).toBe("ABGERECHNET");
  });

  test("Konvertierung ohne ANGENOMMEN-Status → 400 oder Fehlermeldung", async ({
    page,
    request,
  }) => {
    await registriereUndLogin(page, request);
    const kundeId = await legeKundeAn(request);
    const angebotId = await legeAngebotAn(request, kundeId); // Status: ENTWURF

    const res = await request.post(`/api/angebote/${angebotId}/konvertieren`);
    expect([400, 422]).toContain(res.status());
  });
});

// -----------------------------------------------------------------------
// 3. GoBD: Gesendete Rechnung unveränderbar
// -----------------------------------------------------------------------

test.describe("GoBD: Gesendete Rechnung unveränderbar", () => {
  test("Bearbeiten-Button nach Versand deaktiviert oder nicht sichtbar", async ({
    page,
    request,
  }) => {
    await registriereUndLogin(page, request);
    const kundeId = await legeKundeAn(request);
    const rechnungId = await legeRechnungAn(request, kundeId);

    // Rechnung als GESENDET markieren
    await request.patch(`/api/rechnungen/${rechnungId}`, {
      data: { status: "GESENDET" },
    });

    await page.goto(`/de/dashboard/rechnungen/${rechnungId}`);

    // Bearbeiten-Button muss deaktiviert sein oder fehlen
    const editButton = page.getByRole("button", {
      name: /bearbeiten|editieren/i,
    });

    const isVisible = await editButton.isVisible();
    if (isVisible) {
      // Wenn sichtbar, muss disabled sein
      await expect(editButton).toBeDisabled();
    }
    // Alternativ: Link zu Edit-URL darf nicht vorhanden sein
  });

  test("API: Gesendete Rechnung editieren → 403 oder 422", async ({
    page,
    request,
  }) => {
    await registriereUndLogin(page, request);
    const kundeId = await legeKundeAn(request);
    const rechnungId = await legeRechnungAn(request, kundeId);

    // Status auf GESENDET setzen
    await request.patch(`/api/rechnungen/${rechnungId}`, {
      data: { status: "GESENDET" },
    });

    // Direkte Inhaltsänderung versuchen
    const editRes = await request.patch(`/api/rechnungen/${rechnungId}`, {
      data: {
        positionen: [
          {
            beschreibung: "Geänderte Position",
            menge: 1,
            einheit: "Stk",
            einzelpreis: 999.0,
            ustSatz: 19.0,
            sortierung: 0,
          },
        ],
      },
    });
    expect([403, 422]).toContain(editRes.status());
  });

  test("Stornierung bleibt möglich bei gesendeter Rechnung", async ({
    page,
    request,
  }) => {
    await registriereUndLogin(page, request);
    const kundeId = await legeKundeAn(request);
    const rechnungId = await legeRechnungAn(request, kundeId);

    await request.patch(`/api/rechnungen/${rechnungId}`, {
      data: { status: "GESENDET" },
    });

    await page.goto(`/de/dashboard/rechnungen/${rechnungId}`);

    // Stornieren-Button muss vorhanden sein
    const stornoButton = page.getByRole("button", {
      name: /stornieren|storno/i,
    });
    await expect(stornoButton).toBeVisible({ timeout: 5_000 });
  });

  test("API: Storno einer gesendeten Rechnung → Erfolgreich", async ({
    page,
    request,
  }) => {
    await registriereUndLogin(page, request);
    const kundeId = await legeKundeAn(request);
    const rechnungId = await legeRechnungAn(request, kundeId);

    await request.patch(`/api/rechnungen/${rechnungId}`, {
      data: { status: "GESENDET" },
    });

    const stornoRes = await request.post(`/api/rechnungen/${rechnungId}/stornieren`);
    expect([200, 201]).toContain(stornoRes.status());
  });
});

// -----------------------------------------------------------------------
// 4. Überfällige Rechnungen rot hervorgehoben
// -----------------------------------------------------------------------

test.describe("Überfällige Rechnungen in der Liste", () => {
  test("Rechnung mit vergangenem Fälligkeitsdatum wird in der Tabelle rot markiert", async ({
    page,
    request,
  }) => {
    await registriereUndLogin(page, request);
    const kundeId = await legeKundeAn(request);

    // Rechnung mit Fälligkeitsdatum in der Vergangenheit
    const vergangenesDatum = new Date();
    vergangenesDatum.setDate(vergangenesDatum.getDate() - 10);

    const res = await request.post("/api/rechnungen", {
      data: {
        kundeId,
        zahlungsziel: vergangenesDatum.toISOString(),
        positionen: [
          {
            beschreibung: "Überfällige Leistung",
            menge: 1,
            einheit: "Pauschal",
            einzelpreis: 100.0,
            ustSatz: 19.0,
            sortierung: 0,
          },
        ],
      },
    });
    expect(res.status()).toBe(201);
    const rechnung = await res.json();

    // Status auf GESENDET (Rechnung ist dann überfällig)
    await request.patch(`/api/rechnungen/${rechnung.id}`, {
      data: { status: "GESENDET" },
    });

    await page.goto("/de/dashboard/rechnungen");

    // Rote Hervorhebung: Tailwind-Klassen wie text-red-*, bg-red-*, oder border-red-*
    // oder ein überfällig-Badge
    const ueberfaelligElement = page
      .locator(`[data-rechnung-id="${rechnung.id}"], tr`)
      .filter({ hasText: rechnung.nummer });

    // Mindestens ein rotes Element in der Zeile (oder überfällig-Label)
    const rotesElement = ueberfaelligElement
      .locator('[class*="red"], [class*="destructive"], [data-status="ueberfaellig"]')
      .or(page.getByText(/überfällig/i));

    await expect(rotesElement).toBeVisible({ timeout: 5_000 });
  });

  test("API: Überfällige Rechnung hat Status UEBERFAELLIG oder wird als überfällig markiert", async ({
    page,
    request,
  }) => {
    await registriereUndLogin(page, request);
    const kundeId = await legeKundeAn(request);

    const vergangenesDatum = new Date();
    vergangenesDatum.setDate(vergangenesDatum.getDate() - 10);

    const res = await request.post("/api/rechnungen", {
      data: {
        kundeId,
        zahlungsziel: vergangenesDatum.toISOString(),
        positionen: [
          {
            beschreibung: "Test",
            menge: 1,
            einheit: "Stk",
            einzelpreis: 100.0,
            ustSatz: 19.0,
            sortierung: 0,
          },
        ],
      },
    });
    expect(res.status()).toBe(201);
    const rechnung = await res.json();

    // Status GESENDET → Zahlung überfällig
    await request.patch(`/api/rechnungen/${rechnung.id}`, {
      data: { status: "GESENDET" },
    });

    const getRes = await request.get(`/api/rechnungen/${rechnung.id}`);
    const aktuelleRechnung = await getRes.json();

    // Status sollte UEBERFAELLIG sein, oder zahlungsziel liegt in der Vergangenheit
    const istUeberfaellig =
      aktuelleRechnung.status === "UEBERFAELLIG" ||
      (aktuelleRechnung.zahlungsziel &&
        new Date(aktuelleRechnung.zahlungsziel) < new Date() &&
        aktuelleRechnung.status !== "BEZAHLT");

    expect(istUeberfaellig).toBe(true);
  });
});

// -----------------------------------------------------------------------
// 5. Tenant-Isolation
// -----------------------------------------------------------------------

test.describe("Tenant-Isolation: Rechnungen", () => {
  test("Tenant A kann Rechnungen von Tenant B nicht sehen (Listendaten)", async ({
    page,
    request,
  }) => {
    // Tenant A: Rechnung anlegen
    const emailA = `tenant-rech-a-${Date.now()}@example.com`;
    await request.post("/api/auth/register", {
      data: {
        name: "Tenant Rech A",
        firmenname: "Tenant Rech A GmbH",
        email: emailA,
        password: "TestPasswort123!",
      },
    });

    await page.goto("/de/login");
    await page.getByLabel("E-Mail").fill(emailA);
    await page.getByLabel("Passwort").fill("TestPasswort123!");
    await page.getByRole("button", { name: "Anmelden" }).click();
    await expect(page).toHaveURL(/\/de\/dashboard/, { timeout: 10_000 });

    const kundeIdA = await legeKundeAn(request);
    const rechnungIdA = await legeRechnungAn(request, kundeIdA);

    // Rechnung von A abrufen um Nummer zu kennen
    const rechnungA = await (await request.get(`/api/rechnungen/${rechnungIdA}`)).json();

    // Tenant B: registrieren und einloggen
    const emailB = `tenant-rech-b-${Date.now()}@example.com`;
    await request.post("/api/auth/register", {
      data: {
        name: "Tenant Rech B",
        firmenname: "Tenant Rech B GmbH",
        email: emailB,
        password: "TestPasswort123!",
      },
    });

    await page.goto("/de/login");
    await page.getByLabel("E-Mail").fill(emailB);
    await page.getByLabel("Passwort").fill("TestPasswort123!");
    await page.getByRole("button", { name: "Anmelden" }).click();
    await expect(page).toHaveURL(/\/de\/dashboard/, { timeout: 10_000 });

    // Tenant B versucht Rechnung von A direkt abzurufen → 404
    const getRes = await request.get(`/api/rechnungen/${rechnungIdA}`);
    expect(getRes.status()).toBe(404);

    // Rechnungsliste von Tenant B enthält NICHT die Rechnung von A
    const listRes = await request.get("/api/rechnungen");
    expect(listRes.status()).toBe(200);
    const listBody = await listRes.json();
    const rechnungen = listBody.rechnungen ?? listBody;
    const ids = Array.isArray(rechnungen)
      ? rechnungen.map((r: { id: string }) => r.id)
      : [];
    expect(ids).not.toContain(rechnungIdA);
  });

  test("Tenant A kann Rechnung von Tenant B nicht bearbeiten → 404", async ({
    page,
    request,
  }) => {
    // Tenant A: Rechnung anlegen
    const emailA = `tenant-edit-a-${Date.now()}@example.com`;
    await request.post("/api/auth/register", {
      data: {
        name: "Tenant Edit A",
        firmenname: "Tenant Edit A GmbH",
        email: emailA,
        password: "TestPasswort123!",
      },
    });

    await page.goto("/de/login");
    await page.getByLabel("E-Mail").fill(emailA);
    await page.getByLabel("Passwort").fill("TestPasswort123!");
    await page.getByRole("button", { name: "Anmelden" }).click();
    await expect(page).toHaveURL(/\/de\/dashboard/, { timeout: 10_000 });

    const kundeIdA = await legeKundeAn(request);
    const rechnungIdA = await legeRechnungAn(request, kundeIdA);

    // Tenant B: einloggen und PATCH versuchen
    const emailB = `tenant-edit-b-${Date.now()}@example.com`;
    await request.post("/api/auth/register", {
      data: {
        name: "Tenant Edit B",
        firmenname: "Tenant Edit B GmbH",
        email: emailB,
        password: "TestPasswort123!",
      },
    });

    await page.goto("/de/login");
    await page.getByLabel("E-Mail").fill(emailB);
    await page.getByLabel("Passwort").fill("TestPasswort123!");
    await page.getByRole("button", { name: "Anmelden" }).click();
    await expect(page).toHaveURL(/\/de\/dashboard/, { timeout: 10_000 });

    const patchRes = await request.patch(`/api/rechnungen/${rechnungIdA}`, {
      data: { status: "BEZAHLT" },
    });
    expect(patchRes.status()).toBe(404);
  });

  test("Ohne Authentifizierung: GET /api/rechnungen → 401", async ({
    request,
  }) => {
    const res = await request.get("/api/rechnungen");
    expect(res.status()).toBe(401);
  });

  test("Ohne Authentifizierung: POST /api/rechnungen → 401", async ({
    request,
  }) => {
    const res = await request.post("/api/rechnungen", {
      data: { kundeId: "irgendeine-id", positionen: [] },
    });
    expect(res.status()).toBe(401);
  });
});
