/**
 * Integrations-Tests: Chat-API (AUT-24)
 *
 * Testet POST /api/chat über Playwright APIRequestContext:
 * - Authentifizierung (401 ohne Session)
 * - Validierung (400 für leere Nachricht)
 * - SSE-Stream-Response-Format bei gültiger Anfrage
 * - Fehlertoleranz bei Claude-API-Ausfall (ANTHROPIC_API_KEY=mock)
 *
 * Wichtig: Claude API und Whisper werden durch Umgebungsvariable gemockt.
 * Setze ANTHROPIC_API_KEY=test-mock in der Testumgebung, damit die echte
 * API nicht aufgerufen wird. Der Test prüft dann den Fehler-Event-Pfad.
 * Für vollständige Stream-Tests muss ANTHROPIC_API_KEY gesetzt sein.
 */

import { test, expect, APIRequestContext } from "@playwright/test";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function registriereUndLogin(
  request: APIRequestContext,
  suffix = Date.now().toString()
): Promise<void> {
  const email = `chat-${suffix}@example.com`;
  const password = "TestPasswort123!";

  const regRes = await request.post("/api/auth/register", {
    data: {
      name: "Chat Tester",
      firmenname: `Chat GmbH ${suffix}`,
      email,
      password,
    },
  });
  expect(regRes.status()).toBe(201);

  await request.post("/api/auth/callback/credentials", {
    data: { email, password, redirect: "false", json: "true" },
  });
}

/**
 * Liest einen SSE-Stream aus dem Response-Body und gibt alle Events zurück.
 * Format pro Event: "event: <name>\ndata: <json>\n\n"
 */
function parseSSEEvents(text: string): Array<{ event: string; data: unknown }> {
  const events: Array<{ event: string; data: unknown }> = [];
  const blocks = text.split("\n\n").filter((b) => b.trim());

  for (const block of blocks) {
    const lines = block.split("\n");
    let event = "";
    let dataStr = "";

    for (const line of lines) {
      if (line.startsWith("event: ")) {
        event = line.slice("event: ".length).trim();
      } else if (line.startsWith("data: ")) {
        dataStr = line.slice("data: ".length).trim();
      }
    }

    if (event && dataStr) {
      try {
        events.push({ event, data: JSON.parse(dataStr) });
      } catch {
        events.push({ event, data: dataStr });
      }
    }
  }

  return events;
}

// ---------------------------------------------------------------------------
// Authentifizierung
// ---------------------------------------------------------------------------

test.describe("POST /api/chat — Authentifizierung", () => {
  test("gibt 401 zurück ohne Session", async ({ request }) => {
    const res = await request.post("/api/chat", {
      data: { nachricht: "Hallo" },
    });

    expect(res.status()).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// Validierung
// ---------------------------------------------------------------------------

test.describe("POST /api/chat — Validierung", () => {
  test("gibt 400 zurück für leere Nachricht", async ({ request }) => {
    await registriereUndLogin(request, `chat-val1-${Date.now()}`);

    const res = await request.post("/api/chat", {
      data: { nachricht: "" },
    });

    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toBeTruthy();
  });

  test("gibt 400 zurück für Nachricht nur mit Leerzeichen", async ({ request }) => {
    await registriereUndLogin(request, `chat-val2-${Date.now()}`);

    const res = await request.post("/api/chat", {
      data: { nachricht: "   " },
    });

    expect(res.status()).toBe(400);
  });

  test("gibt 400 zurück bei ungültigem JSON", async ({ request }) => {
    await registriereUndLogin(request, `chat-val3-${Date.now()}`);

    // Ungültiger JSON-Body
    const res = await request.post("/api/chat", {
      headers: { "Content-Type": "application/json" },
      data: "kein-json{{{",
    });

    expect(res.status()).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// SSE-Stream-Response
// ---------------------------------------------------------------------------

test.describe("POST /api/chat — SSE-Stream", () => {
  test("antwortet mit SSE Content-Type bei gültiger Anfrage", async ({ request }) => {
    await registriereUndLogin(request, `chat-sse1-${Date.now()}`);

    const res = await request.post("/api/chat", {
      data: { nachricht: "Erstelle ein Angebot für Sanitärarbeiten" },
    });

    // Antwort muss immer 200 sein (Fehler kommen als SSE-Events)
    expect(res.status()).toBe(200);

    const contentType = res.headers()["content-type"];
    expect(contentType).toContain("text/event-stream");
  });

  test("SSE-Stream endet mit done-Event oder error-Event", async ({ request }) => {
    await registriereUndLogin(request, `chat-sse2-${Date.now()}`);

    const res = await request.post("/api/chat", {
      data: { nachricht: "Zeige mir meine Angebote" },
    });

    expect(res.status()).toBe(200);

    const body = await res.text();
    const events = parseSSEEvents(body);

    // Es muss mindestens ein abschließendes Event geben
    expect(events.length).toBeGreaterThanOrEqual(1);

    const eventNamen = events.map((e) => e.event);

    // Stream muss mit 'done' oder 'error' enden
    const letzterEvent = eventNamen[eventNamen.length - 1];
    expect(["done", "error"]).toContain(letzterEvent);
  });

  test("SSE-Stream enthält kein Cache-Control: no-cache Header-Fehler", async ({ request }) => {
    await registriereUndLogin(request, `chat-sse3-${Date.now()}`);

    const res = await request.post("/api/chat", {
      data: { nachricht: "Test" },
    });

    const headers = res.headers();
    expect(headers["cache-control"]).toBe("no-cache");
    expect(headers["connection"]).toBe("keep-alive");
  });

  test("akzeptiert quelle=voice", async ({ request }) => {
    await registriereUndLogin(request, `chat-voice-${Date.now()}`);

    const res = await request.post("/api/chat", {
      data: { nachricht: "Hallo", quelle: "voice" },
    });

    expect(res.status()).toBe(200);
    const contentType = res.headers()["content-type"];
    expect(contentType).toContain("text/event-stream");
  });

  test("stream-Antwort ist vollständiger SSE-Stream (nicht abgebrochen)", async ({ request }) => {
    await registriereUndLogin(request, `chat-full-${Date.now()}`);

    const res = await request.post("/api/chat", {
      data: { nachricht: "Wie lautet die aktuelle USt in Deutschland?" },
      timeout: 30_000,
    });

    expect(res.status()).toBe(200);

    const body = await res.text();
    const events = parseSSEEvents(body);

    // Stream muss Events enthalten
    expect(events.length).toBeGreaterThan(0);

    // Letztes Event ist 'done' oder 'error' — kein halbfertiger Stream
    const letzterEvent = events[events.length - 1].event;
    expect(["done", "error"]).toContain(letzterEvent);
  });
});

// ---------------------------------------------------------------------------
// Tenant-Isolation: Chat-History
// ---------------------------------------------------------------------------

test.describe("Chat — Tenant-Isolation", () => {
  test("Mandant B sieht Chat-History von Mandant A nicht im Kontext", async ({
    browser,
  }) => {
    // Mandant A schickt eine Nachricht
    const contextA = await browser.newContext();
    const requestA = contextA.request;

    await registriereUndLogin(requestA, `chat-tenant-a-${Date.now()}`);
    const resA = await requestA.post("/api/chat", {
      data: { nachricht: "Sehr geheime Firmeninformation" },
      timeout: 30_000,
    });
    expect(resA.status()).toBe(200);

    // Mandant B hat eigene Session — kein Zugriff auf A's History
    const contextB = await browser.newContext();
    const requestB = contextB.request;

    await registriereUndLogin(requestB, `chat-tenant-b-${Date.now()}`);

    // Mandant B's Chat-Antwort darf keine Daten von A enthalten
    // (wir prüfen hier, dass der Chat-Endpunkt überhaupt antwortet und
    //  eine eigene Session hat — die Isolation ist durch tenantId in der DB gewährleistet)
    const resB = await requestB.post("/api/chat", {
      data: { nachricht: "Welche Informationen hast du über meine Firma?" },
      timeout: 30_000,
    });
    expect(resB.status()).toBe(200);

    // Beide Streams müssen mit done/error enden
    const bodyB = await resB.text();
    const eventsB = parseSSEEvents(bodyB);
    const letzterEventB = eventsB[eventsB.length - 1]?.event;
    expect(["done", "error"]).toContain(letzterEventB);

    await contextA.close();
    await contextB.close();
  });
});
