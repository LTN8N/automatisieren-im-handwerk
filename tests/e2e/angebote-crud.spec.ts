/**
 * Integrations-Tests: Angebots-CRUD und Statusübergänge (AUT-24)
 *
 * Testet über Playwright APIRequestContext (kein Browser nötig):
 * - POST /api/angebote: Validierung, Nummernkreis, Tenant-Isolation
 * - GET /api/angebote: Liste mit Filter und Pagination
 * - GET /api/angebote/[id]: Einzelabruf
 * - PUT /api/angebote/[id]: Positionen aktualisieren, USt-Berechnung
 * - PATCH /api/angebote/[id]: Statusübergänge (ENTWURF→GESENDET→ANGENOMMEN)
 * - DELETE /api/angebote/[id]: Soft-Delete (archivieren)
 * - Tenant-Isolation: Mandant A darf Angebote von Mandant B nicht sehen
 */

import { test, expect, APIRequestContext } from "@playwright/test";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function registriereUndLogin(
  request: APIRequestContext,
  suffix = Date.now().toString()
): Promise<{ email: string; password: string }> {
  const email = `angebote-${suffix}@example.com`;
  const password = "TestPasswort123!";

  const regRes = await request.post("/api/auth/register", {
    data: {
      name: "Test Handwerker",
      firmenname: `Test GmbH ${suffix}`,
      email,
      password,
    },
  });
  expect(regRes.status()).toBe(201);

  // Session-Cookie via NextAuth Credentials-Login
  await request.post("/api/auth/callback/credentials", {
    data: { email, password, redirect: "false", json: "true" },
  });

  return { email, password };
}

async function legeKundeAn(request: APIRequestContext): Promise<string> {
  const res = await request.post("/api/kunden", {
    data: {
      name: "Mustermann GmbH",
      email: `kunde-${Date.now()}@example.com`,
      adresse: "Musterstraße 1, 12345 Musterstadt",
    },
  });
  expect(res.status()).toBe(201);
  const kunde = await res.json();
  return kunde.id;
}

const STANDARD_POSITIONEN = [
  {
    beschreibung: "Rohrinstallation",
    menge: 2,
    einheit: "Std",
    einzelpreis: 85.0,
    ustSatz: 19,
    sortierung: 0,
  },
  {
    beschreibung: "Material Kupferrohr",
    menge: 5,
    einheit: "m",
    einzelpreis: 12.5,
    ustSatz: 19,
    sortierung: 1,
  },
];

// ---------------------------------------------------------------------------
// POST /api/angebote — Validierung & Erstellung
// ---------------------------------------------------------------------------

test.describe("POST /api/angebote", () => {
  test("erstellt Angebot mit korrekter USt-Berechnung", async ({ request }) => {
    await registriereUndLogin(request);
    const kundeId = await legeKundeAn(request);

    const res = await request.post("/api/angebote", {
      data: {
        kundeId,
        betreff: "Sanitärinstallation Badezimmer",
        positionen: STANDARD_POSITIONEN,
      },
    });

    expect(res.status()).toBe(201);
    const angebot = await res.json();

    // Grundstruktur
    expect(angebot.id).toBeDefined();
    expect(angebot.status).toBe("ENTWURF");
    expect(angebot.kundeId).toBe(kundeId);

    // Nummernkreis-Format: AG-YYYY-XXXX
    expect(angebot.nummer).toMatch(/^AG-\d{4}-\d{4}$/);

    // USt-Berechnung prüfen (kaufmännisch, pro Position)
    // Position 1: 2 × 85,00 = 170,00 netto, 19% = 32,30 USt
    // Position 2: 5 × 12,50 = 62,50 netto, 19% = 11,88 USt
    // Gesamt: netto=232,50, USt=44,18, brutto=276,68
    expect(angebot.netto).toBe(232.5);
    expect(angebot.ust).toBe(44.18);
    expect(angebot.brutto).toBe(276.68);

    // Positionen vorhanden
    expect(angebot.positionen).toHaveLength(2);
    expect(angebot.positionen[0].beschreibung).toBe("Rohrinstallation");
    expect(angebot.positionen[0].gesamtpreis).toBe(170.0);
    expect(angebot.positionen[0].ustBetrag).toBe(32.3);
  });

  test("gibt 400 zurück ohne Kunde", async ({ request }) => {
    await registriereUndLogin(request, `val-kunde-${Date.now()}`);

    const res = await request.post("/api/angebote", {
      data: {
        positionen: STANDARD_POSITIONEN,
      },
    });

    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("Kunde");
  });

  test("gibt 400 zurück ohne Positionen", async ({ request }) => {
    await registriereUndLogin(request, `val-pos-${Date.now()}`);
    const kundeId = await legeKundeAn(request);

    const res = await request.post("/api/angebote", {
      data: { kundeId, positionen: [] },
    });

    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("Position");
  });

  test("gibt 401 zurück ohne Authentifizierung", async ({ request }) => {
    // Neuer unauthentifizierter Request-Kontext
    const res = await request.post("/api/angebote", {
      data: { kundeId: "any", positionen: STANDARD_POSITIONEN },
    });

    // Unauthentifiziert → 401
    expect(res.status()).toBe(401);
  });

  test("vergibt aufsteigende Nummern (Nummernkreis)", async ({ request }) => {
    await registriereUndLogin(request, `nk-${Date.now()}`);
    const kundeId = await legeKundeAn(request);

    const [res1, res2] = await Promise.all([
      request.post("/api/angebote", {
        data: { kundeId, positionen: STANDARD_POSITIONEN },
      }),
      request.post("/api/angebote", {
        data: { kundeId, positionen: STANDARD_POSITIONEN },
      }),
    ]);

    expect(res1.status()).toBe(201);
    expect(res2.status()).toBe(201);

    const a1 = await res1.json();
    const a2 = await res2.json();

    const nr1 = parseInt(a1.nummer.split("-")[2], 10);
    const nr2 = parseInt(a2.nummer.split("-")[2], 10);

    // Nummern müssen verschieden und positiv sein
    expect(nr1).toBeGreaterThan(0);
    expect(nr2).toBeGreaterThan(0);
    expect(nr1).not.toBe(nr2);
  });
});

// ---------------------------------------------------------------------------
// GET /api/angebote — Liste
// ---------------------------------------------------------------------------

test.describe("GET /api/angebote", () => {
  test("gibt eigene Angebote zurück", async ({ request }) => {
    await registriereUndLogin(request, `list-${Date.now()}`);
    const kundeId = await legeKundeAn(request);

    await request.post("/api/angebote", {
      data: { kundeId, positionen: STANDARD_POSITIONEN },
    });

    const res = await request.get("/api/angebote");
    expect(res.status()).toBe(200);

    const body = await res.json();
    expect(body.angebote).toBeDefined();
    expect(Array.isArray(body.angebote)).toBe(true);
    expect(body.angebote.length).toBeGreaterThanOrEqual(1);
    expect(body.gesamt).toBeGreaterThanOrEqual(1);
  });

  test("filtert nach Status", async ({ request }) => {
    await registriereUndLogin(request, `filter-${Date.now()}`);
    const kundeId = await legeKundeAn(request);

    await request.post("/api/angebote", {
      data: { kundeId, positionen: STANDARD_POSITIONEN },
    });

    const res = await request.get("/api/angebote?status=ENTWURF");
    expect(res.status()).toBe(200);

    const body = await res.json();
    for (const angebot of body.angebote) {
      expect(angebot.status).toBe("ENTWURF");
    }
  });

  test("gibt 401 zurück ohne Authentifizierung", async ({ request }) => {
    const res = await request.get("/api/angebote");
    expect(res.status()).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// GET /api/angebote/[id] — Einzelabruf
// ---------------------------------------------------------------------------

test.describe("GET /api/angebote/[id]", () => {
  test("gibt Angebot mit Positionen zurück", async ({ request }) => {
    await registriereUndLogin(request, `get-${Date.now()}`);
    const kundeId = await legeKundeAn(request);

    const createRes = await request.post("/api/angebote", {
      data: { kundeId, positionen: STANDARD_POSITIONEN },
    });
    const angebot = await createRes.json();

    const res = await request.get(`/api/angebote/${angebot.id}`);
    expect(res.status()).toBe(200);

    const detail = await res.json();
    expect(detail.id).toBe(angebot.id);
    expect(detail.positionen).toBeDefined();
    expect(detail.historie).toBeDefined();
  });

  test("gibt 404 zurück für unbekannte ID", async ({ request }) => {
    await registriereUndLogin(request, `404-${Date.now()}`);

    const res = await request.get("/api/angebote/unbekannte-id-xxx");
    expect(res.status()).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// PUT /api/angebote/[id] — Aktualisierung
// ---------------------------------------------------------------------------

test.describe("PUT /api/angebote/[id]", () => {
  test("aktualisiert Positionen und berechnet Summen neu", async ({ request }) => {
    await registriereUndLogin(request, `put-${Date.now()}`);
    const kundeId = await legeKundeAn(request);

    const createRes = await request.post("/api/angebote", {
      data: { kundeId, positionen: STANDARD_POSITIONEN },
    });
    const angebot = await createRes.json();

    // Nur eine Position mit anderen Werten
    const neuePositionen = [
      {
        beschreibung: "Heizungsinstallation",
        menge: 4,
        einheit: "Std",
        einzelpreis: 90.0,
        ustSatz: 19,
        sortierung: 0,
      },
    ];

    const res = await request.put(`/api/angebote/${angebot.id}`, {
      data: { kundeId, positionen: neuePositionen },
    });

    expect(res.status()).toBe(200);
    const aktualisiert = await res.json();

    // 4 × 90 = 360 netto, 19% = 68,40 USt, brutto = 428,40
    expect(aktualisiert.netto).toBe(360.0);
    expect(aktualisiert.ust).toBe(68.4);
    expect(aktualisiert.brutto).toBe(428.4);
    expect(aktualisiert.positionen).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// PATCH /api/angebote/[id] — Statusübergänge
// ---------------------------------------------------------------------------

test.describe("PATCH /api/angebote/[id] — Statusübergänge", () => {
  test("ENTWURF → GESENDET ist erlaubt", async ({ request }) => {
    await registriereUndLogin(request, `patch1-${Date.now()}`);
    const kundeId = await legeKundeAn(request);

    const createRes = await request.post("/api/angebote", {
      data: { kundeId, positionen: STANDARD_POSITIONEN },
    });
    const angebot = await createRes.json();
    expect(angebot.status).toBe("ENTWURF");

    const res = await request.patch(`/api/angebote/${angebot.id}`, {
      data: { status: "GESENDET" },
    });
    expect(res.status()).toBe(200);
    const aktualisiert = await res.json();
    expect(aktualisiert.status).toBe("GESENDET");
  });

  test("GESENDET → ANGENOMMEN ist erlaubt", async ({ request }) => {
    await registriereUndLogin(request, `patch2-${Date.now()}`);
    const kundeId = await legeKundeAn(request);

    const createRes = await request.post("/api/angebote", {
      data: { kundeId, positionen: STANDARD_POSITIONEN },
    });
    const angebot = await createRes.json();

    await request.patch(`/api/angebote/${angebot.id}`, {
      data: { status: "GESENDET" },
    });

    const res = await request.patch(`/api/angebote/${angebot.id}`, {
      data: { status: "ANGENOMMEN" },
    });
    expect(res.status()).toBe(200);
    const aktualisiert = await res.json();
    expect(aktualisiert.status).toBe("ANGENOMMEN");
  });

  test("GESENDET → ABGELEHNT ist erlaubt", async ({ request }) => {
    await registriereUndLogin(request, `patch3-${Date.now()}`);
    const kundeId = await legeKundeAn(request);

    const createRes = await request.post("/api/angebote", {
      data: { kundeId, positionen: STANDARD_POSITIONEN },
    });
    const angebot = await createRes.json();

    await request.patch(`/api/angebote/${angebot.id}`, {
      data: { status: "GESENDET" },
    });

    const res = await request.patch(`/api/angebote/${angebot.id}`, {
      data: { status: "ABGELEHNT" },
    });
    expect(res.status()).toBe(200);
    const aktualisiert = await res.json();
    expect(aktualisiert.status).toBe("ABGELEHNT");
  });

  test("ENTWURF → ANGENOMMEN ist NICHT erlaubt", async ({ request }) => {
    await registriereUndLogin(request, `patch4-${Date.now()}`);
    const kundeId = await legeKundeAn(request);

    const createRes = await request.post("/api/angebote", {
      data: { kundeId, positionen: STANDARD_POSITIONEN },
    });
    const angebot = await createRes.json();

    const res = await request.patch(`/api/angebote/${angebot.id}`, {
      data: { status: "ANGENOMMEN" },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("Statusübergang");
  });

  test("Statusübergang schreibt Änderungshistorie", async ({ request }) => {
    await registriereUndLogin(request, `hist-${Date.now()}`);
    const kundeId = await legeKundeAn(request);

    const createRes = await request.post("/api/angebote", {
      data: { kundeId, positionen: STANDARD_POSITIONEN },
    });
    const angebot = await createRes.json();

    await request.patch(`/api/angebote/${angebot.id}`, {
      data: { status: "GESENDET" },
    });

    const detailRes = await request.get(`/api/angebote/${angebot.id}`);
    const detail = await detailRes.json();

    expect(detail.historie.length).toBeGreaterThanOrEqual(1);
    const statusEintrag = detail.historie.find(
      (h: { wasGeaendert: string }) => h.wasGeaendert === "status"
    );
    expect(statusEintrag).toBeDefined();
    expect(statusEintrag.alterWert).toBe("ENTWURF");
    expect(statusEintrag.neuerWert).toBe("GESENDET");
  });
});

// ---------------------------------------------------------------------------
// DELETE /api/angebote/[id] — Soft-Delete
// ---------------------------------------------------------------------------

test.describe("DELETE /api/angebote/[id]", () => {
  test("archiviert das Angebot (GoBD-konformer Soft-Delete)", async ({ request }) => {
    await registriereUndLogin(request, `del-${Date.now()}`);
    const kundeId = await legeKundeAn(request);

    const createRes = await request.post("/api/angebote", {
      data: { kundeId, positionen: STANDARD_POSITIONEN },
    });
    const angebot = await createRes.json();

    const delRes = await request.delete(`/api/angebote/${angebot.id}`);
    expect(delRes.status()).toBe(200);
    const body = await delRes.json();
    expect(body.success).toBe(true);

    // Archiviertes Angebot erscheint nicht mehr in der Liste
    const listRes = await request.get("/api/angebote");
    const list = await listRes.json();
    const gefunden = list.angebote.find(
      (a: { id: string }) => a.id === angebot.id
    );
    expect(gefunden).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Tenant-Isolation
// ---------------------------------------------------------------------------

test.describe("Tenant-Isolation", () => {
  test("Mandant B sieht Angebote von Mandant A nicht", async ({ browser }) => {
    // Mandant A: eigene Session
    const contextA = await browser.newContext();
    const requestA = contextA.request;

    await registriereUndLogin(requestA, `tenant-a-${Date.now()}`);
    const kundeIdA = await legeKundeAn(requestA);

    const createRes = await requestA.post("/api/angebote", {
      data: { kundeId: kundeIdA, positionen: STANDARD_POSITIONEN },
    });
    expect(createRes.status()).toBe(201);
    const angebotA = await createRes.json();

    // Mandant B: eigene Session
    const contextB = await browser.newContext();
    const requestB = contextB.request;

    await registriereUndLogin(requestB, `tenant-b-${Date.now()}`);

    // Mandant B versucht, Angebot von Mandant A abzurufen
    const getRes = await requestB.get(`/api/angebote/${angebotA.id}`);
    expect(getRes.status()).toBe(404);

    // Mandant B sieht in seiner Liste kein Angebot von A
    const listRes = await requestB.get("/api/angebote");
    const list = await listRes.json();
    const gefunden = list.angebote.find(
      (a: { id: string }) => a.id === angebotA.id
    );
    expect(gefunden).toBeUndefined();

    await contextA.close();
    await contextB.close();
  });
});
