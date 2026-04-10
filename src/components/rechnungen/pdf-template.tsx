import "server-only";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";

// Keine externen Fonts – System-Fonts reichen fuer Server-Side-Rendering
Font.register({
  family: "Helvetica",
  fonts: [],
});

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 10,
    paddingTop: 40,
    paddingBottom: 60,
    paddingHorizontal: 50,
    color: "#1a1a1a",
  },
  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 30,
  },
  firmenname: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 4,
  },
  firmenInfo: {
    fontSize: 9,
    color: "#555",
    lineHeight: 1.5,
  },
  // Empfaenger
  empfaengerBlock: {
    marginBottom: 20,
  },
  empfaengerLabel: {
    fontSize: 8,
    color: "#888",
    marginBottom: 3,
  },
  empfaengerName: {
    fontSize: 11,
    fontWeight: "bold",
  },
  empfaengerAdresse: {
    fontSize: 9,
    color: "#555",
    lineHeight: 1.5,
  },
  // Dokumentkopf
  dokumentKopf: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
    paddingBottom: 12,
    borderBottom: "1 solid #e5e7eb",
  },
  dokumentTitel: {
    fontSize: 16,
    fontWeight: "bold",
  },
  dokumentNummer: {
    fontSize: 12,
    color: "#555",
    marginTop: 2,
  },
  metaGrid: {
    textAlign: "right",
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 2,
  },
  metaLabel: {
    fontSize: 9,
    color: "#888",
    width: 100,
    textAlign: "right",
    marginRight: 8,
  },
  metaValue: {
    fontSize: 9,
    width: 80,
    textAlign: "right",
  },
  // Positionen-Tabelle
  tabelleHeader: {
    flexDirection: "row",
    backgroundColor: "#f3f4f6",
    padding: "6 8",
    marginBottom: 2,
  },
  tabelleRow: {
    flexDirection: "row",
    padding: "5 8",
    borderBottom: "0.5 solid #e5e7eb",
  },
  colBeschreibung: { flex: 3 },
  colMenge: { width: 50, textAlign: "right" },
  colEinheit: { width: 40, textAlign: "center" },
  colEinzelpreis: { width: 75, textAlign: "right" },
  colGesamt: { width: 75, textAlign: "right" },
  tabelleHeaderText: {
    fontSize: 9,
    fontWeight: "bold",
    color: "#555",
  },
  // Summen
  summenBlock: {
    marginTop: 16,
    alignItems: "flex-end",
  },
  summenRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 3,
  },
  summenLabel: {
    fontSize: 10,
    color: "#555",
    width: 120,
    textAlign: "right",
    marginRight: 12,
  },
  summenValue: {
    fontSize: 10,
    width: 80,
    textAlign: "right",
  },
  summenTotal: {
    flexDirection: "row",
    justifyContent: "flex-end",
    borderTop: "1 solid #1a1a1a",
    paddingTop: 5,
    marginTop: 5,
  },
  summenTotalLabel: {
    fontSize: 12,
    fontWeight: "bold",
    width: 120,
    textAlign: "right",
    marginRight: 12,
  },
  summenTotalValue: {
    fontSize: 12,
    fontWeight: "bold",
    width: 80,
    textAlign: "right",
  },
  // Hinweise / Footer
  hinweise: {
    marginTop: 24,
    fontSize: 9,
    color: "#555",
    lineHeight: 1.6,
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 50,
    right: 50,
    fontSize: 8,
    color: "#aaa",
    flexDirection: "row",
    justifyContent: "space-between",
    borderTop: "0.5 solid #e5e7eb",
    paddingTop: 8,
  },
});

function formatEur(n: number) {
  return `${n.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} EUR`;
}

function formatDatum(iso: string) {
  return new Date(iso).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

interface Tenant {
  name: string;
  adresse?: string | null;
  steuernummer?: string | null;
  ustId?: string | null;
  bankName?: string | null;
  bankIban?: string | null;
  bankBic?: string | null;
}

interface Kunde {
  name: string;
  adresse?: string | null;
  email?: string | null;
}

interface Position {
  beschreibung: string;
  menge: number;
  einheit: string;
  einzelpreis: number;
  gesamtpreis: number;
}

interface RechnungPdfProps {
  tenant: Tenant;
  kunde: Kunde;
  nummer: string;
  createdAt: string;
  zahlungsziel?: string | null;
  netto: number;
  ust: number;
  brutto: number;
  positionen: Position[];
  angebotNummer?: string | null;
}

export function RechnungPdfDocument({
  tenant,
  kunde,
  nummer,
  createdAt,
  zahlungsziel,
  netto,
  ust,
  brutto,
  positionen,
  angebotNummer,
}: RechnungPdfProps) {
  return (
    <Document
      title={`Rechnung ${nummer}`}
      author={tenant.name}
      creator="KI Handwerk"
    >
      <Page size="A4" style={styles.page}>
        {/* Header: Absender */}
        <View style={styles.header}>
          <View>
            <Text style={styles.firmenname}>{tenant.name}</Text>
            {tenant.adresse && (
              <Text style={styles.firmenInfo}>{tenant.adresse}</Text>
            )}
            {tenant.steuernummer && (
              <Text style={styles.firmenInfo}>
                Steuernummer: {tenant.steuernummer}
              </Text>
            )}
            {tenant.ustId && (
              <Text style={styles.firmenInfo}>
                USt-IdNr.: {tenant.ustId}
              </Text>
            )}
          </View>
        </View>

        {/* Empfaenger */}
        <View style={styles.empfaengerBlock}>
          <Text style={styles.empfaengerLabel}>Rechnungsempfänger</Text>
          <Text style={styles.empfaengerName}>{kunde.name}</Text>
          {kunde.adresse && (
            <Text style={styles.empfaengerAdresse}>{kunde.adresse}</Text>
          )}
          {kunde.email && (
            <Text style={styles.empfaengerAdresse}>{kunde.email}</Text>
          )}
        </View>

        {/* Dokumentkopf */}
        <View style={styles.dokumentKopf}>
          <View>
            <Text style={styles.dokumentTitel}>Rechnung</Text>
            <Text style={styles.dokumentNummer}>{nummer}</Text>
            {angebotNummer && (
              <Text style={{ fontSize: 9, color: "#888", marginTop: 2 }}>
                Bezug: Angebot {angebotNummer}
              </Text>
            )}
          </View>
          <View style={styles.metaGrid}>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Rechnungsdatum</Text>
              <Text style={styles.metaValue}>{formatDatum(createdAt)}</Text>
            </View>
            {zahlungsziel && (
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Zahlungsziel</Text>
                <Text style={styles.metaValue}>
                  {formatDatum(zahlungsziel)}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Positionen */}
        <View style={styles.tabelleHeader}>
          <Text style={[styles.tabelleHeaderText, styles.colBeschreibung]}>
            Beschreibung
          </Text>
          <Text style={[styles.tabelleHeaderText, styles.colMenge]}>
            Menge
          </Text>
          <Text style={[styles.tabelleHeaderText, styles.colEinheit]}>
            Einheit
          </Text>
          <Text style={[styles.tabelleHeaderText, styles.colEinzelpreis]}>
            Einzelpreis
          </Text>
          <Text style={[styles.tabelleHeaderText, styles.colGesamt]}>
            Gesamt
          </Text>
        </View>

        {positionen.map((p, idx) => (
          <View key={idx} style={styles.tabelleRow}>
            <Text style={styles.colBeschreibung}>{p.beschreibung}</Text>
            <Text style={styles.colMenge}>
              {p.menge.toLocaleString("de-DE")}
            </Text>
            <Text style={styles.colEinheit}>{p.einheit}</Text>
            <Text style={styles.colEinzelpreis}>
              {formatEur(p.einzelpreis)}
            </Text>
            <Text style={styles.colGesamt}>{formatEur(p.gesamtpreis)}</Text>
          </View>
        ))}

        {/* Summen */}
        <View style={styles.summenBlock}>
          <View style={styles.summenRow}>
            <Text style={styles.summenLabel}>Nettobetrag</Text>
            <Text style={styles.summenValue}>{formatEur(netto)}</Text>
          </View>
          <View style={styles.summenRow}>
            <Text style={styles.summenLabel}>MwSt. 19%</Text>
            <Text style={styles.summenValue}>{formatEur(ust)}</Text>
          </View>
          <View style={styles.summenTotal}>
            <Text style={styles.summenTotalLabel}>Gesamtbetrag</Text>
            <Text style={styles.summenTotalValue}>{formatEur(brutto)}</Text>
          </View>
        </View>

        {/* Bankverbindung + Pflichtangaben §14 UStG */}
        <View style={styles.hinweise}>
          {zahlungsziel && (
            <Text>
              Bitte überweisen Sie den Betrag von {formatEur(brutto)} bis zum{" "}
              {formatDatum(zahlungsziel)} auf unser Konto.
            </Text>
          )}
          {tenant.bankIban && (
            <Text style={{ marginTop: 6 }}>
              IBAN: {tenant.bankIban}
              {tenant.bankBic ? `  ·  BIC: ${tenant.bankBic}` : ""}
              {tenant.bankName ? `  ·  Bank: ${tenant.bankName}` : ""}
            </Text>
          )}
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text>{tenant.name}</Text>
          <Text>Rechnung {nummer}</Text>
          <Text
            render={({ pageNumber, totalPages }) =>
              `Seite ${pageNumber} / ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  );
}
