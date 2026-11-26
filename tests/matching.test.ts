import { test } from "node:test";
import assert from "node:assert/strict";
import { evaluateText, normalize } from "../lib/matching.ts";

const OLD = "5 Jahre Herstellergarantie bei Registrierung innerhalb von 30 Tagen nach Kauf.";
const NEW = "5 Jahre Herstellergarantie bei Registrierung innerhalb von 60 Tagen nach Kauf.";

test("neuer Wortlaut -> aktuell", () => {
  const r = evaluateText(`Footer: ${NEW} Impressum`, OLD, NEW);
  assert.equal(r.status, "aktuell");
  assert.ok(r.snippet?.includes("60 Tagen"));
});

test("alter Wortlaut -> altfassung", () => {
  assert.equal(evaluateText(`xx ${OLD} yy`, OLD, NEW).status, "altfassung");
});

test("beide Fassungen -> altfassung", () => {
  const r = evaluateText(`${NEW} ... ${OLD}`, OLD, NEW);
  assert.equal(r.status, "altfassung");
  assert.ok(r.foundNew && r.foundOld);
});

test("nichts gefunden -> ungeklärt, nie aktuell", () => {
  assert.equal(evaluateText("Ganz anderer Inhalt", OLD, NEW).status, "ungeklaert");
  assert.equal(evaluateText("", OLD, NEW).status, "ungeklaert");
});

test("neuer Text enthält alten Text (Ergänzung) -> kein Fehlalarm", () => {
  const o = "Preise inkl. MwSt.";
  const n = "Preise inkl. MwSt. zzgl. Versand.";
  assert.equal(evaluateText(`Hinweis: ${n}`, o, n).status, "aktuell");
  assert.equal(evaluateText(`Hinweis: ${o} Ende`, o, n).status, "altfassung");
});

test("Normalisierung: Umbrüche, NBSP, Anführungszeichen, Groß/klein", () => {
  assert.equal(normalize("„Die leiseste“\n  Waschmaschine –  Test"), '"die leiseste" waschmaschine - test');
  const r = evaluateText("5 JAHRE Herstellergarantie\nbei Registrierung innerhalb von 60 Tagen nach Kauf.", OLD, NEW);
  assert.equal(r.status, "aktuell");
});

test("Versions-ID wird erkannt", () => {
  const r = evaluateText(`Textversion PT-GAR-2026.1: ${OLD}`, OLD, NEW, { oldVersionId: "PT-GAR-2026.1", newVersionId: "PT-GAR-2026.2" });
  assert.equal(r.foundVersionId, "PT-GAR-2026.1");
});
