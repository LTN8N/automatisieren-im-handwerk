## Beschreibung

<!-- Was wurde geaendert und warum? -->

## Typ der Aenderung

- [ ] Feature (neues Feature)
- [ ] Bugfix (Fehler behoben)
- [ ] Refactoring (Code umstrukturiert, keine Logik-Aenderung)
- [ ] Dokumentation
- [ ] Chore (Tooling, Config, Dependencies)

## Betroffene Bereiche

<!-- Welche Module/Bereiche sind betroffen? z.B. Kunden, Angebote, Auth -->

## Screenshots / Demos

<!-- Falls UI-Aenderungen: Vorher/Nachher Screenshots -->

## Tests

- [ ] Unit Tests geschrieben/aktualisiert
- [ ] Integration Tests geschrieben/aktualisiert
- [ ] E2E Tests geschrieben/aktualisiert (falls User Flow betroffen)
- [ ] Alle Tests bestehen lokal (`npm run test:all`)

## Review-Checkliste

### Code-Qualitaet
- [ ] Keine offenen Lint-Fehler (`npm run lint`)
- [ ] TypeScript-Pruefung bestanden (`npm run type-check`)
- [ ] Kein `console.log` oder Debug-Code
- [ ] Keine Secrets oder Zugangsdaten im Code

### Business-Logik
- [ ] Kein hardcodierter Steuersatz oder Waehrung (konfigurierbar pro Land)
- [ ] Berechnungen korrekt (Netto, MwSt, Brutto, Rundung)

### Sicherheit
- [ ] Multi-Tenant-sicher? (Tenant-Filter in allen DB-Queries)
- [ ] Auth-Pruefung auf allen geschuetzten Endpoints
- [ ] Keine SQL-Injection, XSS oder CSRF moeglich
- [ ] Input-Validierung vorhanden

### Reviews
- [ ] CTO-Review erhalten (Architektur-Aenderungen)
- [ ] CFO-Review erhalten (kaufmaennisch relevante Aenderungen)

## Offene Fragen

<!-- Gibt es Punkte, die im Review diskutiert werden sollten? -->
