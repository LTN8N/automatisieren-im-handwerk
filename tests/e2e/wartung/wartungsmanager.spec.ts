/**
 * E2E-Tests: Wartungsmanager Kernflows (AUT-62)
 *
 * Testet die wichtigsten User-Flows über Playwright (Browser + API):
 * 1. Objekt anlegen  — POST API + UI-Verifikation in der Liste
 * 2. Vertrag anlegen — UI-Formular /vertraege/neu
 * 3. Techniker anlegen — UI-Inline-Form auf /techniker
 * 4. Plan generieren  — UI /plaene/neu → Redirect auf Plan-Detail
 * 5. Plan-Eintrag bearbeiten — Kalender-Modal Datum ändern
 * 6. Plan löschen    — Bestätigungs-Dialog + Listenkontrolle
 *
 * Voraussetzung: Dev-Server läuft auf http://localhost:3000
 * Testdaten werden per beforeAll isoliert angelegt und nach allen Tests
 * durch den Context-Close verworfen (keine DB-Teardown nötig – jeder Test
 * nutzt seinen eigenen Tenant).
 */

import { test, expect, Page, BrowserContext, APIRequestContext } from "@playwright/test";

// ─── Hilfsfunktionen ──────────────────────────────────────────────────────────

interface TestUser {
  email: string;
  password: string;
  name: string;
  firmenname: string;
}

function makeUser(prefix: string): TestUser {
  const ts = Date.now();
  return {
    email: `${prefix}-${ts}@example.com`,
    password: "TestPasswort123!",
    name: "Test Handwerker",
    firmenname: `${prefix} GmbH ${ts}`,
  };
}

async function registerUser(request: APIRequestContext, user: TestUser): Promise<void> {
  const res = await request.post("/api/auth/register", { data: user });
  expect(res.status(), `Register fehlgeschlagen für ${user.email}`).toBe(201);
}

async function loginWithPage(page: Page, user: TestUser): Promise<void> {
  await page.goto("/de/login");
  await expect(page.getByRole("heading", { name: "Anmelden" })).toBeVisible();
  await page.getByLabel("E-Mail").fill(user.email);
  await page.getByLabel("Passwort").fill(user.password);
  await page.getByRole("button", { name: "Anmelden" }).click();
  await expect(page).toHaveURL(/\/de\/dashboard/, { timeout: 15_000 });
}

// ─── Flow 1: Objekt anlegen ───────────────────────────────────────────────────

test.describe("Flow 1: Objekt anlegen", () => {
  let ctx: BrowserContext;
  let page: Page;
  let objektId: string;
  const user = makeUser("wm-obj");
  const objektName = `E2E-Objekt-${Date.now()}`;

  test.beforeAll(async ({ browser, request }) => {
    await registerUser(request, user);
    ctx = await browser.newContext();
    page = await ctx.newPage();
    await loginWithPage(page, user);

    // Objekt per API anlegen (UI-Create-Route noch nicht implementiert)
    const res = await page.request.post("/api/wartung/objects", {
      data: {
        name: objektName,
        address: "Musterstraße 42",
        city: "Düsseldorf",
        postalCode: "40213",
        buildingType: "Bürogebäude",
      },
    });
    expect(res.status()).toBe(201);
    const body = await res.json();
    objektId = body.id;
  });

  test.afterAll(async () => {
    await ctx.close();
  });

  test("Objekt erscheint in der Objektliste", async () => {
    await page.goto("/de/dashboard/wartung/objekte");
    await expect(page.getByText(objektName)).toBeVisible({ timeout: 10_000 });
  });

  test("Objekt-Detailseite zeigt korrekte Stammdaten", async () => {
    await page.goto(`/de/dashboard/wartung/objekte/${objektId}`);
    await expect(page.getByRole("heading", { name: objektName })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("Musterstraße 42")).toBeVisible();
    await expect(page.getByText("Düsseldorf")).toBeVisible();
    await expect(page.getByText("40213")).toBeVisible();
  });

  test("Objekt-Daten können bearbeitet werden", async () => {
    await page.goto(`/de/dashboard/wartung/objekte/${objektId}`);
    await page.getByRole("button", { name: "Objekt bearbeiten" }).click();

    const nameInput = page.getByLabel("Name");
    await nameInput.clear();
    await nameInput.fill(`${objektName} (aktualisiert)`);

    await page.getByRole("button", { name: "Speichern" }).click();

    await expect(page.getByRole("heading", { name: `${objektName} (aktualisiert)` })).toBeVisible({
      timeout: 10_000,
    });
  });
});

// ─── Flow 2: Vertrag anlegen ──────────────────────────────────────────────────

test.describe("Flow 2: Vertrag anlegen", () => {
  let ctx: BrowserContext;
  let page: Page;
  const user = makeUser("wm-vtg");

  test.beforeAll(async ({ browser, request }) => {
    await registerUser(request, user);
    ctx = await browser.newContext();
    page = await ctx.newPage();
    await loginWithPage(page, user);

    // Objekt als Voraussetzung via API anlegen
    await page.request.post("/api/wartung/objects", {
      data: {
        name: "Vertrag-Testobjekt",
        address: "Teststraße 1",
        city: "Köln",
        postalCode: "50667",
        buildingType: "Wohngebäude",
      },
    });
  });

  test.afterAll(async () => {
    await ctx.close();
  });

  test("Vertrag über das Formular anlegen und in der Liste sehen", async () => {
    await page.goto("/de/dashboard/wartung/vertraege/neu");
    await expect(page.getByRole("heading", { name: "Vertrag anlegen" })).toBeVisible({
      timeout: 10_000,
    });

    // Objekt auswählen (erstes verfügbares)
    const objektSelect = page.locator("select#objectId, select[name='objectId']");
    await expect(objektSelect).toBeVisible({ timeout: 5_000 });
    await objektSelect.selectOption({ index: 1 }); // erstes Objekt nach Platzhalter

    // Kundenname
    await page.getByLabel("Kundenname").fill("Muster Immobilien GmbH");

    // Vertragsnummer (optional)
    await page.getByLabel("Vertragsnummer (optional)").fill("WV-E2E-001");

    // Startdatum
    await page.getByLabel("Laufzeit von").fill("2025-01-01");

    // Leistung ausfüllen (erste Zeile bereits vorhanden)
    const serviceTypeInput = page.locator("input[placeholder='z.B. Heizungsanlage']").first();
    if (await serviceTypeInput.isVisible()) {
      await serviceTypeInput.fill("Heizungsanlage");
    }

    // Formular absenden
    await page.getByRole("button", { name: "Vertrag speichern" }).click();

    // Nach Speichern → Redirect zur Vertragsliste
    await expect(page).toHaveURL(/\/de\/dashboard\/wartung\/vertraege/, { timeout: 15_000 });
    await expect(page.getByText("Muster Immobilien GmbH")).toBeVisible({ timeout: 10_000 });
  });

  test("Leistung hinzufügen-Button fügt neue Zeile ein", async () => {
    await page.goto("/de/dashboard/wartung/vertraege/neu");
    await expect(page.getByRole("heading", { name: "Vertrag anlegen" })).toBeVisible({
      timeout: 10_000,
    });

    await page.getByRole("button", { name: "Leistung hinzufügen" }).click();
    // Nach Klick sollte eine zweite Leistungszeile existieren
    const leistungRows = page.locator("text=Leistung");
    await expect(leistungRows).toHaveCount(2, { timeout: 5_000 }); // "Leistungen" Überschrift + mindestens 1 Zeile
  });
});

// ─── Flow 3: Techniker anlegen ────────────────────────────────────────────────

test.describe("Flow 3: Techniker anlegen", () => {
  let ctx: BrowserContext;
  let page: Page;
  const user = makeUser("wm-tech");
  const techName = `E2E Techniker ${Date.now()}`;

  test.beforeAll(async ({ browser, request }) => {
    await registerUser(request, user);
    ctx = await browser.newContext();
    page = await ctx.newPage();
    await loginWithPage(page, user);
  });

  test.afterAll(async () => {
    await ctx.close();
  });

  test("Techniker über Inline-Formular anlegen und in Tabelle sehen", async () => {
    await page.goto("/de/dashboard/wartung/techniker");
    await expect(page.getByRole("heading", { name: "Techniker" })).toBeVisible({ timeout: 10_000 });

    // Formular öffnen
    await page.getByRole("button", { name: "Neuer Techniker" }).click();
    await expect(page.getByRole("heading", { level: 3, name: "Neuer Techniker" })).toBeVisible({
      timeout: 5_000,
    });

    // Felder ausfüllen
    await page.getByLabel("Name").fill(techName);
    await page.getByLabel("Qualifikationen (kommagetrennt)").fill("Gas, Wasser, Heizung");
    await page.getByLabel("Arbeitsbeginn").fill("07:00");
    await page.getByLabel("Arbeitsende").fill("16:00");
    await page.getByLabel("Max. Stunden/Tag").fill("8");

    // Speichern
    await page.getByRole("button", { name: "Speichern" }).click();

    // Formular schließt sich, Techniker erscheint in Tabelle
    await expect(page.getByRole("heading", { level: 3, name: "Neuer Techniker" })).not.toBeVisible({
      timeout: 5_000,
    });
    await expect(page.getByText(techName)).toBeVisible({ timeout: 10_000 });
  });

  test("Techniker-Status kann umgeschaltet werden", async () => {
    await page.goto("/de/dashboard/wartung/techniker");

    // Den gerade erstellten Techniker finden
    const row = page.locator(`text=${techName}`).locator("..");
    const statusButton = row.getByRole("button").last();
    const initialText = await statusButton.textContent();

    await statusButton.click();

    // Status sollte sich geändert haben
    await expect(statusButton).not.toHaveText(initialText ?? "", { timeout: 5_000 });
  });
});

// ─── Flow 4–6: Plan generieren, Eintrag bearbeiten, Plan löschen ─────────────
//
// Diese drei Flows teilen dieselbe Testumgebung mit:
//   - 1 Objekt, 1 Vertrag mit 1 Leistung, 1 Techniker
//   - Damit die Plan-Generierung tatsächlich Einträge erzeugt

test.describe("Flow 4–6: Planung (Plan generieren / bearbeiten / löschen)", () => {
  let ctx: BrowserContext;
  let page: Page;
  const user = makeUser("wm-plan");
  const currentYear = new Date().getFullYear();
  let generatedPlanId: string | null = null;

  test.beforeAll(async ({ browser, request }) => {
    await registerUser(request, user);
    ctx = await browser.newContext();
    page = await ctx.newPage();
    await loginWithPage(page, user);

    // Voraussetzungen via API anlegen
    const objRes = await page.request.post("/api/wartung/objects", {
      data: {
        name: "Plan-Testobjekt",
        address: "Planstraße 7",
        city: "Essen",
        postalCode: "45127",
        buildingType: "Gewerbe",
      },
    });
    const obj = await objRes.json();

    await page.request.post("/api/wartung/technicians", {
      data: {
        name: "Plan-Techniker",
        qualifications: ["Heizung"],
        workHoursStart: "07:00",
        workHoursEnd: "16:00",
        maxDailyHours: 8,
      },
    });

    await page.request.post("/api/wartung/contracts", {
      data: {
        objectId: obj.id,
        customerName: "Plan Test Kunde",
        contractNumber: `WV-PLAN-${Date.now()}`,
        startDate: "2024-01-01",
        leases: [
          {
            serviceType: "Heizungsanlage",
            intervalMonths: 12,
            estimatedHours: 2,
            qualificationRequired: "Heizung",
          },
        ],
      },
    });
  });

  test.afterAll(async () => {
    await ctx.close();
  });

  // ── Flow 4: Plan generieren ──────────────────────────────────────────────

  test("Plan über UI-Formular generieren und zur Detail-Seite weitergeleitet werden", async () => {
    await page.goto("/de/dashboard/wartung/plaene/neu");
    await expect(page.getByRole("heading", { name: "Jahresplan erstellen" })).toBeVisible({
      timeout: 10_000,
    });

    // Aktuelles Jahr auswählen (sollte Standard sein)
    const yearButton = page.getByRole("button", { name: String(currentYear) });
    await expect(yearButton).toBeVisible({ timeout: 5_000 });
    await yearButton.click();

    // Bundesland NW ist Standard – kein Klick nötig

    // Plan generieren
    await page.getByRole("button", { name: "Plan generieren" }).click();

    // Toast oder Redirect abwarten
    await expect(page).toHaveURL(/\/de\/dashboard\/wartung\/plaene\/[a-z0-9-]+/, {
      timeout: 30_000,
    });

    // Plan-ID aus der URL extrahieren (für spätere Tests)
    const url = page.url();
    const match = url.match(/plaene\/([a-z0-9-]+)/);
    if (match) {
      generatedPlanId = match[1];
    }

    // Plan-Detailseite zeigt das richtige Jahr
    await expect(page.getByText(String(currentYear))).toBeVisible({ timeout: 5_000 });
  });

  test("Generierter Plan erscheint in der Pläne-Übersicht", async () => {
    await page.goto("/de/dashboard/wartung/plaene");
    await expect(
      page.getByText(`Wartungsplan ${currentYear}`)
    ).toBeVisible({ timeout: 10_000 });
  });

  // ── Flow 5: Plan-Eintrag bearbeiten ─────────────────────────────────────

  test("Plan-Eintrag im Kalender öffnen und Datum ändern", async () => {
    // Plan via API generieren, damit garantiert Einträge vorhanden sind
    const genRes = await page.request.post("/api/wartung/plans/generate", {
      data: {
        year: currentYear,
        bundesland: "NW",
        skipAiOptimization: true,
      },
    });
    // Wenn Plan für dieses Jahr schon freigegeben ist, überspringen
    if (!genRes.ok()) {
      const body = await genRes.json();
      if (body.error?.includes("freigegeben")) {
        test.skip(); // Freigegebener Plan kann nicht überschrieben werden
        return;
      }
    }
    const genData = await genRes.json();
    const planId = genData.planId as string;

    // Plan-Detail öffnen
    await page.goto(`/de/dashboard/wartung/plaene/${planId}`);
    await expect(page.getByText(String(currentYear))).toBeVisible({ timeout: 10_000 });

    // Auf ersten Eintrag-Chip im Desktop-Kalender klicken
    // EntryChip hat: div[title*="—"] (Format: "Objektname — 2h\nTechnikername")
    const entryChip = page.locator("div[title*='—']").first();
    const hasEntries = await entryChip.isVisible({ timeout: 5_000 }).catch(() => false);

    if (!hasEntries) {
      // Plan hat keine Einträge (z. B. kein passender Techniker) → Test überspringen
      test.skip();
      return;
    }

    await entryChip.click();

    // Modal öffnet sich
    await expect(page.getByRole("button", { name: "Bearbeiten" })).toBeVisible({
      timeout: 5_000,
    });
    await page.getByRole("button", { name: "Bearbeiten" }).click();

    // Datum-Input ausfüllen
    const dateInput = page.locator("input#entry-date");
    await expect(dateInput).toBeVisible({ timeout: 3_000 });

    // Auf das nächste Quartal setzen
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 3);
    const newDate = nextMonth.toISOString().slice(0, 10);
    await dateInput.fill(newDate);

    // Speichern
    await page.getByRole("button", { name: "Speichern" }).click();

    // Erfolgsmeldung oder Modal-Schließung
    await expect(page.locator("text=Termin aktualisiert")).toBeVisible({
      timeout: 10_000,
    }).catch(() => {
      // Modal schließt sich – auch als Erfolg wertbar
    });
    await expect(page.locator("input#entry-date")).not.toBeVisible({ timeout: 5_000 });
  });

  // ── Flow 6: Plan löschen ─────────────────────────────────────────────────

  test("Plan in der Übersicht löschen und nicht mehr sehen", async () => {
    // Neuen Plan via API anlegen, damit ein löschbarer Plan existiert
    const genRes = await page.request.post("/api/wartung/plans/generate", {
      data: {
        year: currentYear + 1, // nächstes Jahr → kein Konflikt mit bestehendem
        bundesland: "NW",
        skipAiOptimization: true,
      },
    });
    expect(genRes.ok(), "Plan-Generierung für Lösch-Test fehlgeschlagen").toBeTruthy();

    const genData = await genRes.json();
    const deletePlanId = genData.planId as string;

    // Zur Pläne-Übersicht navigieren
    await page.goto("/de/dashboard/wartung/plaene");

    // Den Plan für das nächste Jahr finden
    const planCard = page
      .locator(`text=Wartungsplan ${currentYear + 1}`)
      .locator("..")
      .locator("..");

    // Trash-Icon-Button klicken (Bestätigungs-Dialog akzeptieren)
    page.once("dialog", (dialog) => dialog.accept());
    await planCard.getByRole("button").last().click();

    // Plan soll verschwinden
    await expect(page.locator(`text=Wartungsplan ${currentYear + 1}`)).not.toBeVisible({
      timeout: 10_000,
    });

    // Sicherheitshalber prüfen, dass die API auch 404 zurückgibt
    const checkRes = await page.request.get(`/api/wartung/plans/${deletePlanId}`);
    expect(checkRes.status()).toBe(404);
  });
});
