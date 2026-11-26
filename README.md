# Claim- & Pflichttext-Tracker (Pilot-Prototyp)

Interne Web-App, mit der ein Team nachverfolgt, wo eine freigegebene **Claim- oder Pflichttext-Änderung** schon ausgetauscht wurde und wo nicht. Für jeden Ausspielort zeigt sie:

* welche Märkte und Kanäle betroffen sind,
* wo die **alte Fassung noch ausgeliefert** wird,
* **wer** für den Austausch zuständig ist,
* ob der Austausch **belegt** ist (Beleg-Log, verkettet per SHA-256).

Technik: Next.js 16 (App Router, Server Actions), TypeScript, Tailwind CSS 4 und eine lokale JSON-Datenbank (`data/db.json`). PDFs werden mit `unpdf` ausgelesen.

## Schnellstart

```bash
npm install
npm run dev          # http://localhost:3000
# oder produktiv:
npm run build && npm start
```

Beim ersten Aufruf legt die App automatisch Beispieldaten an. Zurücksetzen geht entweder über **„Demo zurücksetzen“** oben rechts oder mit `npm run seed`, wenn die App nicht läuft.

```bash
npm test             # Unit-Tests der Textauswertung
npm run typecheck
```

## Funktionen

| Bereich | Was er kann |
|---|---|
| **Änderungen** (`/`) | Change Log mit Fortschrittsbalken (aktuell / Altfassung / ungeklärt / ausstehend) und Kennzahlen. Neue Änderung anlegen mit Titel, Typ, altem und neuem Wortlaut, alter und neuer Versions-ID, Gültigkeitsdatum, Owner und Märkten. Der Wortlaut kann pro Markt lokalisiert werden. |
| **Änderungsdetail** (`/changes/:id`) | Wort-Diff je Markt und Zuordnungstabelle der Ausspielorte. „Prüfen“ einzeln oder „Alle abrufbaren prüfen“. Detail-Drawer pro Ausspielort mit Abruf, manueller Prüfung, Snapshot-Upload, Zuständigkeit/Frist und Beleg-Log. Eine Änderung lässt sich erst abschließen, wenn alle Orte **nachweislich aktuell** sind. |
| **Ausspielorte** (`/targets`) | Ausspielorte pro Markt und Kanal verwalten, mit Quelle (abrufbare URL oder „nicht automatisiert lesbar“), Kanal-Verantwortlichen und Zugriffshinweis. Dazu eine Demo-Steuerung, die den Austausch simuliert. |
| **Aufgaben & Eskalation** (`/tasks`) | Offene Orte, filterbar nach Markt, Kanal, Status, Verantwortlichem und Änderung. Überfällige Orte sind markiert; zu jedem gibt es einen Hinweis auf den nächsten Schritt und einen Mail-Link an die zuständige Person. |
| **Prüfprotokoll** (`/changes/:id/protokoll`) | Druckbare Zusammenfassung (auch als PDF speicherbar) mit Integritätsprüfung. CSV-Export als Übersicht oder als vollständiges Beleg-Log (`?art=log`), mit Semikolon und BOM, damit es in deutschem Excel korrekt öffnet. |
| **Beleg-Log** (`/audit`) | Gesamtes Log aller Einträge. Die Hash-Kette wird beim Aufruf geprüft, sodass nachträgliche Änderungen an `db.json` sichtbar werden. |

## Status-Logik (bewusst konservativ)

| Status | Wann er gesetzt wird |
|---|---|
| **Ausstehend** | Zuordnung angelegt, aber noch nicht geprüft |
| **Altfassung erkannt** | Der alte Wortlaut wurde gefunden, auch wenn der neue zusätzlich vorkommt |
| **Ausgetauscht / Aktuell** | Nur der neue Wortlaut wurde gefunden. Bei manueller Prüfung ist eine **Beleg-Referenz Pflicht**. |
| **Ungeklärt** | Timeout, HTTP 4xx/5xx, DNS- oder TLS-Fehler, Login-Seite erkannt, clientseitig gerenderte Seite, PDF ohne Textebene, nicht unterstütztes Format, oder keiner der beiden Wortlaute gefunden |

„Ungeklärt“ zählt **nie** als erledigt und verhindert den Abschluss der Änderung. Fehler beim Abruf lassen die App nicht abstürzen, sondern werden mit Fehlertext ins Beleg-Log geschrieben.

Für den Textabgleich wird zuerst normalisiert: Groß-/Kleinschreibung, Leerraum und geschützte Leerzeichen, typografische Anführungszeichen und Striche sowie weiche Trennzeichen werden vereinheitlicht. Danach folgt eine exakte Suche nach dem alten und dem neuen Wortlaut. Ist der alte Text Teil des neuen (der neue ergänzt ihn nur), werden die Fundstellen des neuen vorher ausgeblendet. Zusätzlich erkennt die Suche die Versions-IDs im Dokument.

## Keine Schein-Automatisierung

* Bei Ausspielorten mit der Quelle **„nicht automatisiert lesbar“** (E-Mail-Templates im ESP, Agentur-Systeme usw.) gibt es keinen Abruf-Button. Das UI weist darauf hin, dass eine manuelle Bestätigung oder ein Snapshot nötig ist.
* Eine **manuelle Prüfung** wird mit handelnder Person, Erfassungszeitpunkt, optionalem Prüfzeitpunkt, Prüfer-Notiz (Pflicht) und Beleg-Referenz (Pflicht bei „Aktuell“) gespeichert.
* Ein **Snapshot oder Export** (HTML, PDF, TXT, EML oder eingefügter Text) wird inhaltsadressiert per SHA-256 abgelegt und mit derselben Textsuche ausgewertet wie der Abruf.
* Jeder Eintrag im Beleg-Log hält fest: Zeitstempel, geprüfte Quelle, HTTP-Status und Dauer, Fund alt/neu, gefundene Versions-ID, Textausschnitt, Statuswechsel, Person, Notiz, Beleg und Inhalts-Hash. Einträge werden nur angehängt; Bearbeiten oder Löschen ist nicht möglich.

## Beispieldaten

Die Beispieldaten beschreiben eine fiktive Marke „Nordhaven“ mit zwei Änderungen:

1. **Pflichttext Garantie** (`PT-GAR-2026.1 → 2026.2`) für die Märkte DE und FR:
   * DE-Herstellerseite: **aktuell**
   * DE-Partnerportal-PDF: **Altfassung** (echtes PDF, ausgelesen)
   * FR-Herstellerseite: **ausstehend**; die Prüfung erkennt dort die Altfassung
   * FR-Partnerportal-PDF: **ungeklärt** (HTTP 403, Login)
   * DE-E-Mail-Template: **ausstehend** (nur manuell prüfbar)
   * FR-E-Mail-Template: **ungeklärt** (manuell, kein Zugriff)
2. **Claim** „leiseste Waschmaschine“ (DE): Herstellerseite **aktuell**, PDF **Altfassung**

Die Demo-Ausspielorte liefert die App selbst unter `/demo/...` aus. Über „Ausspielorte → Demo-Steuerung“ lässt sich der Austausch simulieren; danach erneut „Prüfen“.

## Grenzen des Prototyps

* **Keine Authentifizierung:** Die handelnde Person wird oben rechts gewählt und in jedem Beleg gespeichert.
* **JSON-Datenbank** mit serialisierten, atomaren Schreibzugriffen. Sie reicht für einen Pilot mit wenigen Personen; für den Produktivbetrieb sollte sie durch SQLite/Postgres (z. B. mit Prisma) ersetzt werden. Das Datenmodell steht in `lib/types.ts`.
* **Die Hash-Kette zeigt Manipulationen an, verhindert sie aber nicht.** Für echte Revisionssicherheit braucht es zusätzlich WORM-Speicher oder externe Zeitstempel.
* **Seiten, die per JavaScript gerendert werden,** sieht der Server-Abruf nicht. Sie werden als „Ungeklärt“ markiert; eine Headless-Browser-Prüfung wäre eine mögliche Erweiterung.
* **Server-Abrufe gehen an beliebige URLs.** Vor einem Betrieb außerhalb des internen Netzes braucht es SSRF-Schutz, z. B. eine Allowlist von Domains.
* **Proxy:** In Umgebungen, in denen ausgehende Verbindungen nur über einen Proxy laufen, muss Node mit `NODE_USE_ENV_PROXY=1` gestartet werden. Sonst landen externe URLs als „Host nicht auflösbar“ unter „Ungeklärt“.

## Struktur

```
app/                 Seiten (Change Log, Detail + Drawer, Aufgaben, Ausspielorte, Beleg-Log, Protokoll)
app/demo/[...path]   eingebaute Demo-Ausspielorte (HTML, PDF, 403)
lib/actions.ts       Server Actions (Anlegen, Prüfen, manuelle Prüfung, Snapshot, Zuständigkeit)
lib/checker.ts       Abruf mit Timeout/Größenlimit, Fehlerklassifikation, Inhaltsauswertung
lib/matching.ts      Normalisierung + Textabgleich (unit-getestet)
lib/db.ts            JSON-DB, Beleg-Log (nur Anhängen)
lib/seed.ts          Beispieldaten
```
