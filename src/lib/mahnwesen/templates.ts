/**
 * E-Mail-Templates für Mahnschreiben je Mahnstufe.
 * Texte gemäß CFO-Spezifikation (docs/specs/mahnwesen.md).
 */

import type { Mahnstufe } from "@prisma/client";

export interface MahnTemplateVars {
  kundenname: string;
  nummer: string;
  rechnungsdatum: string;
  zahlungsziel: string;
  brutto: string;
  tenantname: string;
  iban?: string;
  neue_frist_datum?: string;
  inkasso_datum?: string;
  mahngebuehr?: string;
  schadenspauschale?: string;
  verzugszinsen?: string;
  gesamtbetrag?: string;
}

function formatEuro(betrag: number): string {
  return betrag.toFixed(2).replace(".", ",") + " EUR";
}

export interface MahnEmail {
  betreff: string;
  html: string;
  text: string;
}

export function erstelleMahnEmail(
  stufe: Mahnstufe,
  vars: MahnTemplateVars
): MahnEmail {
  switch (stufe) {
    case "ERINNERUNG":
      return erstelleErinnerungEmail(vars);
    case "MAHNUNG_1":
      return erstelleMahnung1Email(vars);
    case "MAHNUNG_2":
      return erstelleMahnung2Email(vars);
    case "INKASSO":
      return erstelleInkassoEmail(vars);
  }
}

function erstelleErinnerungEmail(vars: MahnTemplateVars): MahnEmail {
  const betreff = `Erinnerung: Offene Rechnung ${vars.nummer} — Fälligkeit ${vars.zahlungsziel}`;
  const text = `Guten Tag ${vars.kundenname},

wir möchten Sie freundlich daran erinnern, dass unsere Rechnung ${vars.nummer}
über ${vars.brutto} am ${vars.zahlungsziel} fällig war.

Falls die Zahlung bereits veranlasst wurde, betrachten Sie diese Nachricht
bitte als gegenstandslos.

Für Rückfragen stehen wir Ihnen jederzeit gerne zur Verfügung.

Mit freundlichen Grüßen
${vars.tenantname}`;

  return { betreff, html: textZuHtml(text), text };
}

function erstelleMahnung1Email(vars: MahnTemplateVars): MahnEmail {
  const betreff = `1. Mahnung — Rechnung ${vars.nummer} vom ${vars.rechnungsdatum}`;
  const text = `Sehr geehrte/r ${vars.kundenname},

leider mussten wir feststellen, dass unsere Rechnung ${vars.nummer}
über ${vars.brutto} vom ${vars.rechnungsdatum} trotz Fälligkeit am ${vars.zahlungsziel}
noch nicht beglichen wurde.

Wir bitten Sie, den ausstehenden Betrag von ${vars.brutto} bis zum
${vars.neue_frist_datum ?? "so bald wie möglich"} auf unser Konto zu überweisen:

  IBAN: ${vars.iban ?? "siehe Rechnung"}
  Verwendungszweck: ${vars.nummer}

Sollte die Zahlung bereits unterwegs sein, betrachten Sie diese Mahnung
bitte als gegenstandslos.

Mit freundlichen Grüßen
${vars.tenantname}`;

  return { betreff, html: textZuHtml(text), text };
}

function erstelleMahnung2Email(vars: MahnTemplateVars): MahnEmail {
  const betreff = `2. Mahnung — Rechnung ${vars.nummer} — Letzte Zahlungsaufforderung`;
  const text = `Sehr geehrte/r ${vars.kundenname},

trotz unserer ersten Mahnung ist die Zahlung unserer Rechnung ${vars.nummer}
über ${vars.brutto} bisher nicht eingegangen.

Wir fordern Sie hiermit letztmalig auf, den folgenden Gesamtbetrag bis zum
${vars.inkasso_datum ?? "so bald wie möglich"} zu begleichen:

  Offener Rechnungsbetrag: ${vars.brutto}
  Mahngebühr:              ${vars.mahngebuehr ?? "5,00 EUR"}
  Verzugszinsen:           ${vars.verzugszinsen ?? "0,00 EUR"}
  ───────────────────────────────────────
  Gesamtbetrag:            ${vars.gesamtbetrag ?? vars.brutto}

  IBAN: ${vars.iban ?? "siehe Rechnung"}
  Verwendungszweck: ${vars.nummer}

Bei Nichtbegleichung sehen wir uns gezwungen, die Forderung an ein
Inkassounternehmen zu übergeben. Dies würde zusätzliche Kosten für Sie verursachen.

Mit freundlichen Grüßen
${vars.tenantname}`;

  return { betreff, html: textZuHtml(text), text };
}

function erstelleInkassoEmail(vars: MahnTemplateVars): MahnEmail {
  const betreff = `Inkasso-Ankündigung — Rechnung ${vars.nummer}`;
  const text = `Sehr geehrte/r ${vars.kundenname},

da Sie trotz mehrfacher Aufforderung die Zahlung unserer Rechnung ${vars.nummer}
nicht geleistet haben, werden wir die Forderung an ein Inkassounternehmen übergeben.

Offene Forderung:
  Rechnungsbetrag:         ${vars.brutto}
  Schadenspauschale §288:  ${vars.schadenspauschale ?? "40,00 EUR"}
  Verzugszinsen:           ${vars.verzugszinsen ?? "0,00 EUR"}
  ───────────────────────────────────────
  Gesamtforderung:         ${vars.gesamtbetrag ?? vars.brutto}

Bitte überweisen Sie den Gesamtbetrag umgehend, um weitere Kosten zu vermeiden.

Mit freundlichen Grüßen
${vars.tenantname}`;

  return { betreff, html: textZuHtml(text), text };
}

function textZuHtml(text: string): string {
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return `<html><body><pre style="font-family: Arial, sans-serif; white-space: pre-wrap;">${escaped}</pre></body></html>`;
}

export function berechneNeueFrist(faelligkeitsdatum: Date, extraTage: number): string {
  const datum = new Date(faelligkeitsdatum);
  datum.setDate(datum.getDate() + extraTage);
  return datum.toLocaleDateString("de-DE");
}
