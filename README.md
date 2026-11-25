# Jetzt.

Ein ruhiger Tagesplaner für Menschen mit ADHS, die sich auf mehrere **Initiativen** (Lebensbereiche, Projekte) konzentrieren wollen.
Grundlage ist das Konzept „Jetzt.“: Zeit, Aufgaben und Motivation werden nach außen verlagert und genau im Moment des Handelns sichtbar gemacht (Point of Performance nach Barkley).

## Leitprinzipien
1. **Ein nächster Schritt statt einer Liste:** Der Startbildschirm zeigt nur, was jetzt dran ist.
2. **Zeit ist sichtbar:** Zeitband, schrumpfender Ring-Timer, vertikale Tageszeitleiste mit Jetzt-Linie und Puffern.
3. **Funktioniert am schlechtesten Tag:** Jede Kernfunktion ist mit wenigen Tipps erreichbar.
4. **Kein Scheitern im System:** Es gibt keinen Status „überfällig“, kein Rot, keine Zähler für Versäumtes und keine Streaks, die auf null fallen.
5. **Die App plant um, du bestätigst nur.**

## Funktionen
| Bereich | Was es tut |
|---|---|
| **Jetzt** | Aktuelle Aufgabe groß, erster Mini-Schritt (≤ 2 Min), Ring-Timer, Buttons „Los“, „Zu schwer gerade“ und „Später“, „Als Nächstes“ mit Countdown, höchstens 3 „Heute wichtig“ |
| **Erfassen** | Brain-Dump per Text oder Sprache (wo der Browser es unterstützt). Erkennt Aufgabe, Termin („um 14:30“, „morgen“), Notiz („Notiz: …“) und Dauer („10 min“) und ordnet die Initiative per Stichwort zu |
| **Zerlegen** | Lokale, regelbasierte Zerlegung in Mini-Schritte mit Detailregler 1–5 und Zeitschätzung. Schritte sind editierbar, sortierbar und bleiben gespeichert |
| **Tag** | Zeitleiste mit Terminen (fest), Aufgaben (flexibel), Übergängen und Puffern (schraffiert), Realitätscheck „geplant vs. verfügbar“, „Ich räume auf“, „Tag neu starten“ |
| **Fokus** | Vollbild-Timer, Schritt-Checkliste, Geräuschkulisse (braunes Rauschen, Regen), stiller Avatar-Begleiter (Body Doubling), Bildschirm bleibt an |
| **Initiativen** | 2–6 Fokusbereiche mit Farbe, Symbol und „Warum ist mir das wichtig?“. Eine Fokus-Initiative steuert die Vorschläge. Ein Fortschritt, der nur wächst |
| **Routinen** | Wenn-Dann-Ketten mit eigenem Timer pro Schritt. Gezählt wird nur, wie oft es geklappt hat |
| **Später** | Gedämpfte Ablage ohne Zähler, dazu „Mir eins vorschlagen“ (passend zu Energie und Fokus) |
| **Morgen/Abend** | Energie-Check, Tagesvorschlag, Wenn-Dann-Anker. Abends ein Rückblick nur mit Erledigtem, ein Garten, der nie schrumpft, und eine Reflexionsfrage |
| **Schamfreier Neustart** | Liegengebliebenes wandert still in „Später“. Nach 3 oder mehr Tagen Pause gibt es „Willkommen zurück“ mit einem leeren Tag. Nach dreimaligem Verschieben fragt die App einmal: kleiner machen, jemanden fragen oder streichen? |
| **Benachrichtigungen** | Sanft, Normal oder Hartnäckig mit Tagesbudget. Übergangswarnungen 10 und 2 Min vor Terminen, jeweils mit direkten Aktionen |
| **Einstellungen** | Reizarm-Modus, Töne, Garten, Hell/Dunkel, Tageszeiten, Datensicherung per Zwischenablage |

Das Onboarding dauert unter 3 Minuten: eine Frage nach dem größten Problem, Initiativen wählen, Brain-Dump, Erinnerungsstil. Alternativ gibt es einen Beispieltag.

## Starten
Keine Abhängigkeiten, kein Build-Schritt. Alle Daten bleiben lokal im Browser (`localStorage`).

```bash
python3 -m http.server 8000   # dann http://localhost:8000 öffnen
```

Über einen Webserver ausgeliefert ist die App installierbar (PWA) und funktioniert offline (`sw.js`).
Tastatur: `n` öffnet „Erfassen“, `Leertaste` startet den Fokus, `Strg/Cmd + Enter` speichert, `Esc` schließt.

## Dateien
- `index.html`: Einstieg
- `styles.css`: Design-Tokens (Geist-Schrift) (hell/dunkel), Layout, reizarmer Modus
- `app.js`: gesamte App-Logik
- `manifest.webmanifest`, `sw.js`, `icon.svg`: PWA

> Jetzt. ist eine Alltagsstütze und ersetzt keine Diagnostik, Medikation oder Therapie.
