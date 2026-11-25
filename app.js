/* Jetzt. — ein Planer, der die Selbststeuerung übernimmt.
   Leitprinzipien: ein nächster Schritt statt einer Liste · Zeit sichtbar · funktioniert am schlechtesten Tag ·
   kein Scheitern im System · die App plant um, du bestätigst nur.
   Alles bleibt lokal (localStorage). Keine Abhängigkeiten. */
(() => {
'use strict';

/* ================= Helfer ================= */
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Math.random().toString(36).slice(2, 10);
const pad = n => String(n).padStart(2, '0');
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const nowMin = () => { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); };
const hm = m => `${pad(Math.floor(((m % 1440) + 1440) % 1440 / 60))}:${pad(((m % 60) + 60) % 60)}`;
const parseHM = s => { const m = /^(\d{1,2}):(\d{2})$/.exec(s || ''); return m ? (+m[1]) * 60 + (+m[2]) : null; };
const dkey = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const dayKey = () => { const d = new Date(); if (d.getHours() < 4) d.setDate(d.getDate() - 1); return dkey(d); };
const addDays = (key, n) => { const [y, m, d] = key.split('-').map(Number); const x = new Date(y, m - 1, d + n); return dkey(x); };
const daysBetween = (a, b) => { const [y1, m1, d1] = a.split('-').map(Number); const [y2, m2, d2] = b.split('-').map(Number); return Math.round((new Date(y2, m2 - 1, d2) - new Date(y1, m1 - 1, d1)) / 864e5); };
const dur = m => { m = Math.max(0, Math.round(m)); if (m < 60) return `${m} Min`; const h = Math.floor(m / 60), r = m % 60; return r ? `${h} Std ${r} Min` : `${h} Std`; };
const pick = a => a[Math.floor(Math.random() * a.length)];
const WD = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
const MO = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
const niceDate = () => { const d = new Date(); return `${WD[d.getDay()]}, ${d.getDate()}. ${MO[d.getMonth()]}`; };
const inArtifact = (() => { try { return window.self !== window.top; } catch (e) { return true; } })();

/* ================= Icons ================= */
const P = {
  now: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="3.2" fill="currentColor" stroke="none"/>',
  day: '<path d="M7 3v18"/><path d="M11 6h8M11 12h5M11 18h8"/><circle cx="7" cy="12" r="1.6" fill="currentColor"/>',
  init: '<path d="M12 3l9 5-9 5-9-5 9-5z"/><path d="M3 12.5l9 5 9-5"/><path d="M3 17l9 5 9-5"/>',
  routine: '<path d="M17 2l3 3-3 3"/><path d="M4 11V9a4 4 0 014-4h12"/><path d="M7 22l-3-3 3-3"/><path d="M20 13v2a4 4 0 01-4 4H4"/>',
  later: '<path d="M4 13h4l2 3h4l2-3h4"/><path d="M6 5h12l2 8v6H4v-6z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0013 0M12 17.5V21"/>',
  settings: '<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>',
  play: '<path d="M8 5.5l10.5 6.5L8 18.5z" fill="currentColor"/>',
  pause: '<path d="M9 5v14M15 5v14"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  up: '<path d="M6 15l6-6 6 6"/>',
  down: '<path d="M6 9l6 6 6-6"/>',
  star: '<path d="M12 3.5l2.6 5.3 5.9.9-4.2 4.1 1 5.8L12 16.8 6.7 19.6l1-5.8L3.5 9.7l5.9-.9z"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
  refresh: '<path d="M20 11a8 8 0 10-2.3 5.7"/><path d="M20 4v7h-7"/>',
  sparkle: '<path d="M12 3c.6 4.2 2.8 6.4 7 7-4.2.6-6.4 2.8-7 7-.6-4.2-2.8-6.4-7-7 4.2-.6 6.4-2.8 7-7z"/>',
  leaf: '<path d="M5 19c0-8 5-14 15-14 0 10-6 15-14 15"/><path d="M5 19l7-7"/>',
  moon: '<path d="M20 14.5A8 8 0 019.5 4a8 8 0 1010.5 10.5z"/>',
  sunrise: '<path d="M3 19h18M7 19a5 5 0 0110 0M12 4v5M4.9 10.9l1.4 1.4M19.1 10.9l-1.4 1.4M9.5 6.5L12 4l2.5 2.5"/>',
  sound: '<path d="M4 10v4h4l5 4V6L8 10z"/><path d="M16.5 9a4 4 0 010 6M19 6.5a8 8 0 010 11"/>',
  split: '<path d="M4 6h7M4 12h11M4 18h5"/><path d="M17 15l3 3-3 3"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  feather: '<path d="M20 4C10 4 6 10 5 19"/><path d="M5 19c6 0 11-3 13-9"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  bell: '<path d="M6 16V11a6 6 0 0112 0v5l1.5 2h-15z"/><path d="M10 20a2 2 0 004 0"/>',
  door: '<path d="M6 21V4.5A1.5 1.5 0 017.5 3h9A1.5 1.5 0 0118 4.5V21"/><path d="M3.5 21h17"/><circle cx="14.5" cy="12.5" r="1" fill="currentColor"/>',
  hourglass: '<path d="M6 3h12M6 21h12"/><path d="M8 3v2.5c0 2.6 4 4 4 6.5s-4 3.9-4 6.5V21M16 3v2.5c0 2.6-4 4-4 6.5s4 3.9 4 6.5V21"/>',
  bubbles: '<circle cx="8.5" cy="14.5" r="4.5"/><circle cx="16.5" cy="7.5" r="3"/><circle cx="18" cy="17" r="1.8"/>',
  waves: '<path d="M3 8c2-2 4-2 6 0s4 2 6 0 4-2 6 0M3 13c2-2 4-2 6 0s4 2 6 0 4-2 6 0M3 18c2-2 4-2 6 0s4 2 6 0 4-2 6 0"/>',
  batLow: '<rect x="3" y="7" width="16" height="10" rx="2.5"/><path d="M21.5 10.5v3"/><rect x="5.5" y="9.5" width="3" height="5" rx="1" fill="currentColor" stroke="none"/>',
  batMid: '<rect x="3" y="7" width="16" height="10" rx="2.5"/><path d="M21.5 10.5v3"/><rect x="5.5" y="9.5" width="6.5" height="5" rx="1" fill="currentColor" stroke="none"/>',
  batHigh: '<rect x="3" y="7" width="16" height="10" rx="2.5"/><path d="M21.5 10.5v3"/><rect x="5.5" y="9.5" width="11" height="5" rx="1" fill="currentColor" stroke="none"/>',
  shuffle: '<path d="M3 7h3c4 0 6 10 10 10h5M3 17h3c1.6 0 2.8-1.6 3.9-3.5M14 9.5C15 8 16 7 17.5 7H21"/><path d="M18 4l3 3-3 3M18 14l3 3-3 3"/>',
  people: '<circle cx="9" cy="8" r="3.2"/><path d="M3 20a6 6 0 0112 0"/><path d="M16 4.6a3 3 0 010 6M21 20a6 6 0 00-4-5.6"/>',
  megaphone: '<path d="M3 10v4h3l9 5V5L6 10z"/><path d="M18.5 9a3.5 3.5 0 010 6"/>',
  scissors: '<circle cx="6" cy="6" r="2.8"/><circle cx="6" cy="18" r="2.8"/><path d="M8.2 7.8L20 19M8.2 16.2L20 5"/>',
  anchor: '<circle cx="12" cy="5" r="2"/><path d="M12 7v14M5 12H3a9 9 0 0018 0h-2M8 11h8"/>',
  heart: '<path d="M12 20s-7.5-4.6-7.5-10A4.2 4.2 0 0112 7.6 4.2 4.2 0 0119.5 10c0 5.4-7.5 10-7.5 10z"/>',
  briefcase: '<rect x="3" y="7" width="18" height="13" rx="2.5"/><path d="M9 7V5.5A1.5 1.5 0 0110.5 4h3A1.5 1.5 0 0115 5.5V7M3 12.5h18"/>',
  home: '<path d="M4 10.5L12 4l8 6.5V19a1 1 0 01-1 1h-4.5v-5.5h-5V20H5a1 1 0 01-1-1z"/>',
  doc: '<path d="M7 3h7l5 5v12a1 1 0 01-1 1H7a1 1 0 01-1-1V4a1 1 0 011-1z"/><path d="M14 3v5h5M9.5 13h6M9.5 16.5h6"/>',
  book: '<path d="M4 19V5.5A2.5 2.5 0 016.5 3H20v14H6.5A2.5 2.5 0 004 19.5 2.5 2.5 0 006.5 22H20v-5"/>',
  palette: '<path d="M12 3a9 9 0 100 18c1.2 0 1.8-.9 1.8-1.8 0-1.3-1-1.6-1-2.7 0-1 .8-1.7 1.8-1.7H17a4 4 0 004-4C21 6.6 17 3 12 3z"/><circle cx="7.5" cy="11" r="1.2" fill="currentColor"/><circle cx="10" cy="7" r="1.2" fill="currentColor"/><circle cx="15" cy="7" r="1.2" fill="currentColor"/>',
  chat: '<path d="M4 5h16v11H9l-5 4z"/><path d="M8 9.5h8M8 12.5h5"/>',
  music: '<path d="M9 18V5l11-2v13"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="17.5" cy="16" r="2.5"/>',
  run: '<circle cx="14.5" cy="4.5" r="1.8"/><path d="M6 20l3.5-5 3 2 1-5.5L9 10l-3 2.5M13.5 11.5l3 3H20"/>',
  lotus: '<path d="M12 20c-4 0-8-2-9-6 3 0 6 1 9 6zM12 20c4 0 8-2 9-6-3 0-6 1-9 6zM12 20c-3-3-3-9 0-14 3 5 3 11 0 14z"/>',
  coin: '<ellipse cx="12" cy="7" rx="7" ry="3"/><path d="M5 7v5c0 1.7 3.1 3 7 3s7-1.3 7-3V7M5 12v5c0 1.7 3.1 3 7 3s7-1.3 7-3v-5"/>',
  sprout: '<path d="M12 21v-9"/><path d="M12 12C12 7 8.5 5 4 5c0 4.5 3 7 8 7zM12 10c0-4 3-6 8-6 0 4-3 6-8 6z"/>',
  wrench: '<path d="M15 4a5 5 0 00-4.7 6.6L4 17v3h3l6.4-6.3A5 5 0 0020 9l-3 1-2-2 1-3z"/>',
  plane: '<path d="M3 12l18-8-6 17-3-7z"/><path d="M12 14l9-10"/>',
  pin: '<path d="M12 21s-6.5-6.2-6.5-11a6.5 6.5 0 0113 0c0 4.8-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.3"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 00-1-1H5a1 1 0 00-1 1v10a1 1 0 001 1h3"/>',
};
const INIT_ICONS = ['sparkle', 'briefcase', 'leaf', 'home', 'doc', 'book', 'palette', 'chat', 'music', 'run', 'lotus', 'coin', 'sprout', 'wrench', 'plane', 'heart'];
const LEGACY = { '✨': 'sparkle', '💼': 'briefcase', '🌿': 'leaf', '🏠': 'home', '📄': 'doc', '📚': 'book', '🎨': 'palette', '💬': 'chat', '🎵': 'music', '🏃': 'run', '🧘': 'lotus', '💰': 'coin', '🌱': 'sprout', '🔧': 'wrench', '✈️': 'plane', '❤️': 'heart' };
const iKey = i => (i && P[i.icon] ? i.icon : (i && LEGACY[i.icon]) || 'sparkle');
const iIcon = i => ic(iKey(i));
const illu = (n, label) => (window.ILLU ? window.ILLU(n, label) : '');
const ic = (n, cls = '') => `<svg class="i ${cls}" viewBox="0 0 24 24" aria-hidden="true">${P[n] || ''}</svg>`;
const MARK = `<svg class="brand-mark" viewBox="0 0 48 48" aria-hidden="true"><rect x="2" y="2" width="44" height="44" rx="13" style="fill:var(--ink)"/><circle cx="24" cy="24" r="12.5" fill="none" style="stroke:var(--bg)" stroke-opacity=".18" stroke-width="4.5"/><path d="M24 11.5A12.5 12.5 0 0136.5 24" fill="none" style="stroke:var(--now)" stroke-width="4.5" stroke-linecap="round"/><circle cx="24" cy="24" r="4" style="fill:var(--now)"/></svg>`;

/* ================= Konstanten ================= */
const COLORS = ['sage', 'sky', 'lav', 'sand', 'teal', 'clay'];
const cvar = c => `var(--i-${COLORS.includes(c) ? c : 'sage'})`;
const PRESETS = [
  { name: 'Job & Karriere', icon: 'briefcase', color: 'sky', kw: ['job', 'arbeit', 'chef', 'meeting', 'bericht', 'präsentation', 'kunde', 'mail', 'büro', 'bewerbung', 'projekt'] },
  { name: 'Gesundheit', icon: 'leaf', color: 'sage', kw: ['arzt', 'sport', 'laufen', 'yoga', 'tablette', 'schlaf', 'zahnarzt', 'training', 'therapie', 'spazier', 'medik'] },
  { name: 'Zuhause', icon: 'home', color: 'sand', kw: ['putzen', 'wäsche', 'aufräumen', 'einkauf', 'kochen', 'müll', 'küche', 'bad', 'spülmaschine', 'staubsaugen', 'reparier'] },
  { name: 'Finanzen & Papierkram', icon: 'doc', color: 'teal', kw: ['steuer', 'rechnung', 'überweis', 'bank', 'versicherung', 'formular', 'antrag', 'kündig', 'vertrag', 'elster'] },
  { name: 'Studium & Lernen', icon: 'book', color: 'lav', kw: ['lernen', 'kurs', 'lesen', 'prüfung', 'uni', 'hausarbeit', 'kapitel', 'vorlesung', 'thesis', 'masterarbeit'] },
  { name: 'Kreativprojekt', icon: 'palette', color: 'clay', kw: ['schreiben', 'malen', 'musik', 'zeichnen', 'portfolio', 'blog', 'video', 'foto', 'design'] },
  { name: 'Menschen & Beziehungen', icon: 'chat', color: 'clay', kw: ['mama', 'papa', 'freund', 'anruf', 'geburtstag', 'treffen', 'oma', 'schwester', 'bruder', 'geschenk'] },
];
const PROBLEMS = [
  { id: 'start', em: 'door', t: 'Anfangen', d: 'Ich weiß, was zu tun ist, komme aber nicht rein.' },
  { id: 'time', em: 'hourglass', t: 'Zeit verlieren', d: 'Plötzlich ist es Abend oder ich bin zu spät.' },
  { id: 'forget', em: 'bubbles', t: 'Vergessen', d: 'Vorhaben und Zwischenschritte rutschen mir weg.' },
  { id: 'overwhelm', em: 'waves', t: 'Überforderung', d: 'Alles wirkt gleich wichtig und zu viel.' },
];
const NOTIFY = {
  sanft: { t: 'Sanft', d: 'Wenige, leise Hinweise', budget: 4 },
  normal: { t: 'Normal', d: 'Übergänge 10 und 2 Min vorher', budget: 8 },
  hartnaeckig: { t: 'Hartnäckig', d: 'Erinnert nochmal, wenn nichts passiert', budget: 15 },
};
const ENERGY = { low: { em: 'batLow', t: 'Niedrig' }, mid: { em: 'batMid', t: 'Mittel' }, high: { em: 'batHigh', t: 'Hoch' } };
const REFLECT = ['Was hat dir heute geholfen?', 'Welcher Moment lief leichter als gedacht?', 'Was war heute ein kleiner Erfolg?', 'Was nimmst du mit in morgen?', 'Wann warst du heute am besten im Fluss?'];
const CHEER = ['Schritt geschafft.', 'Erledigt. Weiter geht\'s, wenn du magst.', 'Gut gemacht.', 'Ein Stück weiter.', 'Das zählt.', 'Abgehakt.'];

/* ================= Zerlegen (lokal, regelbasiert) =================
   [Detailgrad ab dem der Schritt erscheint, Text, Minuten]. Erster Schritt ist immer ein ≤2-Min-Start. */
const TPL = [
  { k: /steuer|elster|finanzamt/i, start: 'Laptop aufklappen und ELSTER öffnen', s: [[3, 'Belegordner auf den Tisch legen', 2], [1, 'Belege grob nach Art sortieren', 15], [4, 'Fehlende Belege notieren (nur notieren, nicht suchen)', 5], [2, 'Daten vom Vorjahr übernehmen', 10], [1, 'Einnahmen eintragen', 20], [2, 'Werbungskosten eintragen', 20], [5, 'Kurze Pause: Wasser holen', 3], [1, 'Prüfen und absenden oder als Entwurf speichern', 10]] },
  { k: /aufräum|putz|sauber|staubsaug|küche|bad\b|wohnung/i, start: 'Musik anmachen und einen Müllbeutel holen', s: [[1, 'Alles Müll in den Beutel', 5], [3, 'Geschirr in die Küche bringen', 5], [1, 'Eine Fläche frei räumen (nur eine!)', 10], [4, 'Wäsche in den Korb', 3], [2, 'Oberflächen abwischen', 10], [5, 'Kurz stehen bleiben und Fortschritt ansehen', 1], [2, 'Boden saugen oder fegen', 10]] },
  { k: /wäsche|waschen/i, start: 'Wäschekorb zur Maschine tragen', s: [[2, 'Hell und dunkel grob trennen', 4], [1, 'Maschine befüllen und starten', 4], [4, 'Wecker für Maschinenende stellen', 1], [1, 'Wäsche aufhängen', 12], [3, 'Trockene Wäsche abnehmen', 5], [2, 'Zusammenlegen und wegräumen', 12]] },
  { k: /mail|e-mail|nachricht|antwort/i, start: 'Postfach öffnen und nur die Mail anklicken', s: [[3, 'In einem Satz notieren, was die Antwort sagen soll', 2], [1, 'Erste Rohfassung schreiben (darf holprig sein)', 8], [2, 'Einmal lesen und glätten', 4], [1, 'Absenden', 1], [4, 'Mail archivieren', 1]] },
  { k: /anruf|anrufen|telefon|zurückruf|call/i, start: 'Telefon und Nummer heraussuchen', s: [[3, '2–3 Stichpunkte notieren, was du sagen willst', 3], [1, 'Anrufen', 10], [4, 'Wenn niemand rangeht: kurze Nachricht hinterlassen', 2], [2, 'Ergebnis in einem Satz notieren', 2]] },
  { k: /einkauf|supermarkt|besorgen|kaufen/i, start: 'Einkaufszettel-Notiz öffnen', s: [[2, 'Kühlschrank kurz checken', 3], [1, 'Liste schreiben', 5], [4, 'Taschen und Geldbeutel an die Tür legen', 2], [1, 'Einkaufen gehen', 30], [3, 'Einkäufe direkt wegräumen', 8]] },
  { k: /lern|prüfung|klausur|vokabel|üben/i, start: 'Unterlagen aufschlagen und Handy weglegen', s: [[2, 'Ziel für diese Session festlegen (eine Seite, ein Thema)', 2], [1, 'Erster Block lernen', 20], [4, '5 Minuten Pause, aufstehen', 5], [1, 'Zweiter Block lernen', 20], [3, '3 Fragen aufschreiben, die du jetzt beantworten kannst', 5], [5, 'Kurz notieren, wo du nächstes Mal weitermachst', 2]] },
  { k: /schreib|bericht|kapitel|hausarbeit|präsentation|text|thesis|arbeit/i, start: 'Dokument öffnen und Überschrift tippen', s: [[3, 'Stichpunkte sammeln, ohne zu sortieren', 8], [1, 'Gliederung in 3–5 Punkten', 10], [1, 'Ersten Abschnitt roh schreiben', 25], [4, 'Pause: aufstehen, Wasser', 5], [2, 'Zweiten Abschnitt roh schreiben', 25], [5, 'Notiz: Wo mache ich morgen weiter?', 2], [2, 'Einmal überfliegen und speichern', 5]] },
  { k: /sport|laufen|joggen|training|gym|yoga|fitness/i, start: 'Sportsachen anziehen (nur anziehen)', s: [[3, 'Wasserflasche füllen', 1], [2, 'Aufwärmen', 5], [1, 'Training', 25], [4, 'Dehnen', 5], [2, 'Duschen', 10]] },
  { k: /koch|essen machen|mittagessen|abendessen/i, start: 'Rezept oder Idee wählen', s: [[2, 'Zutaten rauslegen', 4], [1, 'Schnippeln und vorbereiten', 10], [1, 'Kochen', 20], [3, 'Nebenbei schon Geschirr wegräumen', 5], [2, 'Essen und hinsetzen', 20]] },
  { k: /bewerb|lebenslauf|anschreiben/i, start: 'Stellenanzeige öffnen', s: [[2, 'Drei Anforderungen markieren, die zu dir passen', 5], [1, 'Lebenslauf aktualisieren', 20], [1, 'Anschreiben roh schreiben', 25], [4, 'Pause', 5], [3, 'Jemanden bitten, drüberzulesen', 3], [1, 'Abschicken', 5]] },
  { k: /rechnung|überweis|bezahl|zahlen/i, start: 'Banking-App öffnen', s: [[2, 'Rechnung heraussuchen', 3], [1, 'Überweisung ausfüllen', 4], [1, 'Absenden', 1], [3, 'Rechnung als „bezahlt“ ablegen', 2]] },
  { k: /arzt|termin vereinbar|praxis/i, start: 'Nummer oder Online-Buchung heraussuchen', s: [[3, 'Zwei Zeitfenster überlegen, die passen', 2], [1, 'Anrufen oder online buchen', 8], [1, 'Termin direkt hier eintragen', 1], [4, 'Versichertenkarte in die Tasche legen', 1]] },
  { k: /pack|koffer|reise|urlaub/i, start: 'Koffer aufs Bett legen', s: [[2, 'Packliste öffnen oder schreiben', 8], [1, 'Kleidung einpacken', 15], [1, 'Bad-Sachen einpacken', 5], [3, 'Ladekabel, Dokumente, Medikamente', 5], [4, 'Koffer an die Tür stellen', 1]] },
];
const GENERIC = { start: 'Timer auf 2 Minuten stellen und Platz frei machen', s: [[3, 'In einem Satz klären: Wann ist es „fertig genug“?', 2], [2, 'Alles Nötige bereitlegen', 5], [1, 'Den ersten kleinen Teil machen', 10], [4, 'Kurz durchatmen und Stand ansehen', 1], [1, 'Den Hauptteil erledigen', 20], [5, 'Notieren, was noch offen ist', 2], [2, 'Abschließen und abhaken', 3]] };

function fitSteps(steps, minutes) {
  // angegebene Gesamtdauer respektieren: Schritte proportional anpassen, erster Schritt bleibt winzig
  if (!minutes || steps.length < 2) return steps;
  const rest = steps.slice(1), sum = rest.reduce((a, s) => a + s.min, 0), target = Math.max(rest.length, minutes - steps[0].min);
  rest.forEach(s => { s.min = Math.max(1, Math.round(s.min * target / sum)); });
  return steps;
}
function breakdown(title, level = 3) {
  const tpl = TPL.find(t => t.k.test(title)) || GENERIC;
  const steps = [{ id: uid(), text: tpl.start, min: 2, done: false }];
  tpl.s.forEach(([lv, text, min]) => { if (lv <= level) steps.push({ id: uid(), text, min, done: false }); });
  return steps;
}

/* ================= Zustand ================= */
const KEY = 'jetzt.app.v1';
const base = () => ({
  v: 1, onboarded: false, lastDay: null, lastSeen: Date.now(), growth: 0, bonus: 0, routinesDone: 0,
  profile: { problem: 'start', notify: 'normal', reizarm: false, sound: true, reward: 'garten', theme: 'system', dayStart: '07:00', dayEnd: '22:00', detail: 3, maxImp: 3 },
  initiatives: [], tasks: [], notes: [], routines: [], days: {},
  focus: null, notif: { day: null, count: 0, sent: {} }, ui: { view: 'jetzt' },
});
let S = base();
function load() {
  try { const raw = localStorage.getItem(KEY); if (raw) { const d = JSON.parse(raw); S = Object.assign(base(), d); S.profile = Object.assign(base().profile, d.profile || {}); S.ui = Object.assign({ view: 'jetzt' }, d.ui || {}); S.notif = Object.assign(base().notif, d.notif || {}); S.initiatives.forEach(i => { i.icon = iKey(i); }); } } catch (e) { /* frischer Start */ }
}
function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* Speicher blockiert – App läuft trotzdem */ } }

const T = () => dayKey();
const today = () => S.days[T()] || (S.days[T()] = { energy: null, checkin: false, steps: 0, review: false, reflection: '', ifthen: '' });
const initById = id => S.initiatives.find(i => i.id === id);
const taskById = id => S.tasks.find(t => t.id === id);
const focusInit = () => S.initiatives.find(i => i.focus);
const todayTasks = () => S.tasks.filter(t => t.type === 'task' && t.status === 'today' && t.date <= T());
const openToday = () => todayTasks().sort((a, b) => (b.important - a.important) || ((a.order ?? 0) - (b.order ?? 0)));
const eventsToday = () => S.tasks.filter(t => t.type === 'event' && t.date === T() && t.status !== 'done').sort((a, b) => parseHM(a.time) - parseHM(b.time));
const laterTasks = () => S.tasks.filter(t => t.type === 'task' && t.status === 'later');
const doneToday = () => S.tasks.filter(t => t.status === 'done' && t.doneDay === T());
const nextStep = t => (t.steps || []).find(s => !s.done);
const taskMin = t => { const st = (t.steps || []).filter(s => !s.done); return st.length ? st.reduce((a, s) => a + (+s.min || 0), 0) : (+t.minutes || 25); };
const remainingMin = t => { const st = (t.steps || []).filter(s => !s.done); return st.length ? st.reduce((a, s) => a + (+s.min || 0), 0) : (+t.minutes || 25); };

function newTask(o) {
  return Object.assign({ id: uid(), type: 'task', title: '', initiative: null, minutes: 25, energy: 'mid', steps: [], status: 'today', date: T(), important: false, deferrals: 0, asked: false, deadline: '', ifthen: '', order: Date.now(), created: Date.now() }, o);
}

/* ================= Tageswechsel & Neustart ohne Schuld ================= */
function rollover() {
  const t = T();
  if (S.lastDay === t) return;
  const prev = S.lastDay; S.lastDay = t;
  if (!prev) { save(); return; }
  const gap = daysBetween(prev, t);
  S.tasks = S.tasks.filter(x => !(x.type === 'event' && x.date < t));
  S.tasks.forEach(x => {
    if (x.type !== 'task' || x.status !== 'today' || x.date > t) return;
    if (x.date < t) {
      if (gap >= 3) { x.status = 'later'; x.important = false; }   // lange Pause: still in "Später"
      else { x.date = t; x.carried = true; }                        // gestern Offenes = Vorschlag für heute
    }
  });
  // Erledigtes älter als 60 Tage aufräumen (Wachstum bleibt erhalten)
  const cutoff = addDays(t, -60);
  Object.keys(S.days).forEach(k => { if (k < cutoff) delete S.days[k]; });
  S.tasks = S.tasks.filter(x => !(x.status === 'done' && (x.doneDay || t) < cutoff));
  if (gap >= 3 && S.onboarded) S.ui.welcomeBack = true;
  save();
}

function restartDay() {
  // Liegengebliebenes ohne Kommentar nach "Später", Rest realistisch neu aufbauen
  const open = openToday();
  const keep = open.filter(x => x.important).slice(0, S.profile.maxImp);
  open.forEach(x => { if (!keep.includes(x)) { x.status = 'later'; x.important = false; } });
  keep.forEach((x, i) => { x.order = Date.now() + i; });
  S.focus = null; save();
  openSheet('restart');
}

/* ================= Vorschläge ================= */
function suggest(n = 3, pool = null) {
  const en = today().energy;
  const fi = focusInit();
  const list = (pool || laterTasks()).map(t => {
    let s = Math.random() * 1.2;
    if (fi && t.initiative === fi.id) s += 3;
    if (t.carried) s += 1;
    if (t.deadline) { const d = daysBetween(T(), t.deadline); if (d <= 2) s += 4; else if (d <= 7) s += 2; }
    if (en === 'low') { if (taskMin(t) <= 20) s += 2; if (t.energy === 'low') s += 2; if (t.energy === 'high') s -= 2; }
    if (en === 'high' && t.energy === 'high') s += 1.5;
    return { t, s };
  }).sort((a, b) => b.s - a.s);
  return list.slice(0, n).map(x => x.t);
}

/* ================= Zeitplanung ================= */
function schedule() {
  const ds = parseHM(S.profile.dayStart) ?? 420, de = parseHM(S.profile.dayEnd) ?? 1320;
  const now = nowMin();
  const busy = eventsToday().map(e => ({ s: parseHM(e.time), e: parseHM(e.time) + (+e.minutes || 30), ev: e }));
  const blocks = [];
  busy.forEach(b => {
    if (b.s - 10 >= ds) blocks.push({ kind: 'buffer', s: b.s - 10, e: b.s, label: 'Übergang' });
    blocks.push({ kind: 'event', s: b.s, e: b.e, t: b.ev });
  });
  const isFree = (s, e) => busy.every(b => e <= b.s - 10 || s >= b.e);
  let cur = Math.max(ds, Math.ceil(now / 5) * 5);
  const f = S.focus && !S.focus.routine ? taskById(S.focus.taskId) : null;
  let overflow = 0;
  openToday().forEach(t => {
    const len = Math.max(5, remainingMin(t));
    let s = cur;
    if (f && f.id === t.id) s = Math.max(ds, Math.floor(now / 5) * 5);
    let guard = 0;
    while (!isFree(s, s + len) && guard++ < 300) s += 5;
    if (s + len > de) { overflow += len; blocks.push({ kind: 'task', s, e: s + len, t, over: true }); cur = s + len; return; }
    blocks.push({ kind: 'task', s, e: s + len, t });
    blocks.push({ kind: 'buffer', s: s + len, e: s + len + 10, label: 'Puffer' });
    cur = s + len + 10;
  });
  const planned = openToday().reduce((a, t) => a + remainingMin(t), 0);
  const from = Math.max(ds, now);
  const eventMin = busy.reduce((a, b) => a + Math.max(0, Math.min(b.e, de) - Math.max(b.s - 10, from)), 0);
  const available = Math.max(0, de - from - eventMin);
  return { ds, de, now, blocks, planned, available, overflow };
}

/* ================= Aktuelle Aufgabe ================= */
function currentTask() {
  if (S.focus && !S.focus.routine) { const t = taskById(S.focus.taskId); if (t && t.status === 'today') return t; }
  return openToday()[0] || null;
}
function nextUp(cur) {
  const now = nowMin();
  const ev = eventsToday().find(e => parseHM(e.time) + (+e.minutes || 30) > now);
  if (ev) return { kind: 'event', t: ev, at: parseHM(ev.time) };
  const rest = openToday().filter(t => t !== cur);
  if (rest[0]) return { kind: 'task', t: rest[0] };
  return null;
}

/* ================= Wachstum & Belohnung ================= */
let audioCtx = null;
function ctx() { try { audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)(); if (audioCtx.state === 'suspended') audioCtx.resume(); } catch (e) { audioCtx = null; } return audioCtx; }
function chime(kind = 'step') {
  if (!S.profile.sound || S.profile.reizarm) return;
  const a = ctx(); if (!a) return;
  const notes = kind === 'done' ? [523.25, 659.25, 783.99] : kind === 'soft' ? [440, 554.37] : [587.33, 880];
  notes.forEach((f, i) => {
    const o = a.createOscillator(), g = a.createGain(); o.type = 'sine'; o.frequency.value = f;
    const t0 = a.currentTime + i * 0.11; g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(0.12, t0 + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.9);
    o.connect(g).connect(a.destination); o.start(t0); o.stop(t0 + 1);
  });
}
function burst(el, color) {
  if (S.profile.reizarm || !el || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const r = el.getBoundingClientRect(); const b = document.createElement('div'); b.className = 'burst';
  b.style.left = r.left + r.width / 2 + 'px'; b.style.top = r.top + r.height / 2 + 'px';
  for (let i = 0; i < 12; i++) { const p = document.createElement('i'); const a = (i / 12) * Math.PI * 2; const d = 30 + Math.random() * 26; p.style.setProperty('--x', Math.cos(a) * d + 'px'); p.style.setProperty('--y', Math.sin(a) * d + 'px'); p.style.setProperty('--c', i % 2 ? 'var(--now)' : (color || 'var(--grow)')); b.appendChild(p); }
  document.body.appendChild(b); setTimeout(() => b.remove(), 800);
}
function grow(t, el) {
  S.growth++; today().steps++;
  const i = t && initById(t.initiative); if (i) i.grown = (i.grown || 0) + 1;
  try { navigator.vibrate && navigator.vibrate(18); } catch (e) { }
  burst(el, i ? cvar(i.color) : null);
  if (S.profile.reward === 'garten' && !S.profile.reizarm && Math.random() < 0.12) { S.bonus++; setTimeout(() => toast('Bonus: Ein Schmetterling hat sich in deinem Garten niedergelassen.', { gentle: true }), 500); }
}

function toggleStep(taskId, stepId, el) {
  const t = taskById(taskId); if (!t) return;
  const s = t.steps.find(x => x.id === stepId); if (!s) return;
  s.done = !s.done;
  if (s.done) {
    grow(t, el); chime('step');
    if (t.steps.every(x => x.done)) { completeTask(t, el, true); return; }
    toast(pick(CHEER), { gentle: true, ms: 1800 });
  }
  save(); render();
}
function completeTask(t, el, viaSteps = false) {
  if (!viaSteps) { grow(t, el); (t.steps || []).forEach(s => { s.done = true; }); }
  t.status = 'done'; t.doneDay = T(); t.doneAt = Date.now();
  if (S.focus && S.focus.taskId === t.id) { S.focus = null; stopNoise(); releaseWake(); }
  chime('done');
  const n = doneToday().length;
  toast(n === 1 ? `„${t.title}“ ist erledigt. Dein erster Haken heute.` : `„${t.title}“ ist erledigt. Heute geschafft: ${n} Dinge.`, { gentle: true });
  save(); render();
}

/* ================= Garten (wächst nur) ================= */
function rand(seed) { let x = Math.sin(seed * 9301 + 49297) * 233280; return x - Math.floor(x); }
function gardenSVG(points = S.growth, w = 640, h = 220) {
  const n = Math.min(40, Math.floor(points / 3) + 1);
  const cols = COLORS.map(cvar);
  let plants = '';
  for (let i = 0; i < n; i++) {
    const x = 26 + rand(i + 1) * (w - 52);
    const age = clamp(points - i * 3, 0, 18);
    const hgt = 18 + age * 5.2 + rand(i + 7) * 14;
    const base = h - 30 + rand(i + 3) * 10;
    const sway = (rand(i + 11) - 0.5) * 18;
    const col = cols[i % cols.length];
    const topX = x + sway, topY = base - hgt;
    plants += `<path d="M${x.toFixed(1)} ${base.toFixed(1)} Q ${(x + sway * 0.2).toFixed(1)} ${(base - hgt * 0.5).toFixed(1)} ${topX.toFixed(1)} ${topY.toFixed(1)}" style="stroke:var(--grow);fill:none" stroke-width="2.4" stroke-linecap="round"/>`;
    const leaves = Math.min(4, 1 + Math.floor(age / 4));
    for (let l = 0; l < leaves; l++) {
      const ly = base - hgt * (0.25 + l * 0.18), lx = x + sway * (0.15 + l * 0.15), dir = l % 2 ? 1 : -1;
      plants += `<path d="M${lx.toFixed(1)} ${ly.toFixed(1)} q ${dir * 10} -8 ${dir * 18} -2 q ${dir * -8} 8 ${dir * -18} 2z" style="fill:var(--grow);opacity:.75"/>`;
    }
    if (age >= 9) {
      const r = 5 + Math.min(6, (age - 9) * 0.8);
      for (let p = 0; p < 5; p++) { const a = p / 5 * Math.PI * 2; plants += `<circle cx="${(topX + Math.cos(a) * r).toFixed(1)}" cy="${(topY + Math.sin(a) * r).toFixed(1)}" r="${(r * 0.62).toFixed(1)}" style="fill:${col}"/>`; }
      plants += `<circle cx="${topX.toFixed(1)}" cy="${topY.toFixed(1)}" r="${(r * 0.5).toFixed(1)}" style="fill:var(--now)"/>`;
    } else if (age >= 4) {
      plants += `<circle cx="${topX.toFixed(1)}" cy="${topY.toFixed(1)}" r="4.5" style="fill:${col}"/>`;
    }
  }
  let bugs = '';
  for (let b = 0; b < Math.min(S.bonus, 8); b++) {
    const bx = 40 + rand(b + 101) * (w - 80), by = 30 + rand(b + 203) * (h * 0.4), c = cols[(b + 2) % cols.length];
    bugs += `<g transform="translate(${bx.toFixed(0)} ${by.toFixed(0)})"><ellipse cx="-5" cy="0" rx="6" ry="4.5" style="fill:${c}" transform="rotate(-25)"/><ellipse cx="5" cy="0" rx="6" ry="4.5" style="fill:${c}" transform="rotate(25)"/><rect x="-1" y="-4" width="2" height="9" rx="1" style="fill:var(--ink-2)"/></g>`;
  }
  return `<svg class="garden" viewBox="0 0 ${w} ${h}" role="img" aria-label="Dein Garten mit ${n} Pflanzen. Er wächst mit jedem erledigten Schritt und schrumpft nie.">
    <path d="M0 ${h - 26} Q ${w * 0.25} ${h - 38} ${w * 0.5} ${h - 28} T ${w} ${h - 30} V ${h} H 0z" style="fill:var(--soil);opacity:.55"/>${plants}${bugs}</svg>`;
}

/* ================= Benachrichtigungen ================= */
function notifyBudgetOk() {
  if (S.notif.day !== T()) { S.notif = { day: T(), count: 0, sent: {} }; }
  return S.notif.count < NOTIFY[S.profile.notify].budget;
}
function notify(key, text, actions) {
  if (S.notif.sent && S.notif.sent[key]) return;
  if (!notifyBudgetOk()) return;
  S.notif.sent[key] = 1; S.notif.count++; save();
  toast(text, { actions, gentle: S.profile.notify === 'sanft', ms: 9000 });
  if (S.profile.notify !== 'sanft') chime('soft');
  try {
    if (document.hidden && 'Notification' in window && Notification.permission === 'granted') new Notification('Jetzt.', { body: text, icon: 'icon.svg', tag: key });
  } catch (e) { }
}
function checkTransitions() {
  if (!S.onboarded) return;
  const now = nowMin();
  eventsToday().forEach(e => {
    const d = parseHM(e.time) - now;
    if (S.profile.notify !== 'sanft' && d <= 10 && d > 2) notify(`ev10-${e.id}`, `In ${d} Minuten: ${e.title}. Zeit für den Übergang.`, [['Okay', 'dismiss']]);
    if (d <= 2 && d >= 0) notify(`ev2-${e.id}`, `Gleich: ${e.title} um ${e.time}.`, [['Bin unterwegs', 'dismiss']]);
  });
  // Freundlicher Check-in, wenn eine Aufgabe angefangen und dann liegen gelassen wurde
  if (S.profile.notify === 'hartnaeckig' && !S.focus) {
    const t = currentTask();
    if (t && t.startedAt && Date.now() - t.startedAt > 30 * 60e3 && !t.nudged) { t.nudged = true; notify(`nudge-${t.id}`, `Noch dabei bei „${t.title}“? Weitermachen, Pause oder neu planen?`, [['Weiter', `focus:${t.id}`], ['Neu planen', 'view:tag']]); }
  }
}

/* ================= Geräuschkulisse & Wake Lock ================= */
let noise = null, wake = null;
function startNoise(kind) {
  stopNoise(); const a = ctx(); if (!a) return;
  const len = a.sampleRate * 4, buf = a.createBuffer(1, len, a.sampleRate), d = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; if (kind === 'brown') { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.2; } else { d[i] = w * 0.5; } }
  const src = a.createBufferSource(); src.buffer = buf; src.loop = true;
  const f = a.createBiquadFilter(); f.type = kind === 'brown' ? 'lowpass' : 'bandpass'; f.frequency.value = kind === 'brown' ? 700 : 1400; f.Q.value = 0.4;
  const g = a.createGain(); g.gain.value = kind === 'brown' ? 0.35 : 0.12;
  src.connect(f).connect(g).connect(a.destination); src.start();
  noise = { src, g };
}
function stopNoise() { if (noise) { try { noise.src.stop(); } catch (e) { } noise = null; } }
async function holdWake() { try { if ('wakeLock' in navigator) wake = await navigator.wakeLock.request('screen'); } catch (e) { wake = null; } }
function releaseWake() { try { wake && wake.release(); } catch (e) { } wake = null; }

/* ================= Toasts ================= */
function toast(text, o = {}) {
  let box = $('.toasts'); if (!box) { box = document.createElement('div'); box.className = 'toasts'; box.setAttribute('role', 'status'); document.body.appendChild(box); }
  const el = document.createElement('div'); el.className = 'toast' + (o.gentle ? ' gentle' : '');
  el.innerHTML = `<div>${esc(text)}</div>${o.actions ? `<div class="row">${o.actions.map(([l, a], i) => `<button class="btn small ${i === 0 && !o.gentle ? 'now' : ''}" data-a="toast" data-do="${esc(a)}">${esc(l)}</button>`).join('')}</div>` : ''}`;
  box.appendChild(el);
  while (box.children.length > 3) box.firstChild.remove();
  setTimeout(() => el.remove(), o.ms || 4200);
}

/* ================= Erfassen: Text verstehen ================= */
function guessInit(text) {
  const low = text.toLowerCase();
  let best = null, score = 0;
  S.initiatives.forEach(i => {
    const kws = (i.kw || []).concat(i.name.toLowerCase().split(/[^a-zäöüß]+/).filter(w => w.length > 3));
    const s = kws.reduce((a, k) => a + (low.includes(k) ? 1 : 0), 0);
    if (s > score) { score = s; best = i.id; }
  });
  return best;
}
function parseItem(raw) {
  let t = raw.trim().replace(/\s+/g, ' ');
  const it = { type: 'task', title: '', time: null, date: T(), minutes: null, initiative: null };
  if (/^(notiz|idee|merken|info)\s*[:\-]/i.test(t)) { it.type = 'note'; t = t.replace(/^(notiz|idee|merken|info)\s*[:\-]\s*/i, ''); }
  let m = t.match(/\b(?:um\s+|ab\s+)?([01]?\d|2[0-3]):([0-5]\d)(?:\s*uhr)?\b/i) || t.match(/\b(?:um|ab)\s+([01]?\d|2[0-3])[.]([0-5]\d)(?:\s*uhr)?\b/i) || t.match(/\b([01]?\d|2[0-3])[.]([0-5]\d)\s*uhr\b/i) || t.match(/\b(?:um\s+)?([01]?\d|2[0-3])\s*uhr\b/i) || t.match(/\bum\s+([01]?\d|2[0-3])\b(?![.:]\d)/i);
  if (m && it.type !== 'note') { it.time = `${pad(+m[1])}:${pad(+(m[2] || 0))}`; it.type = 'event'; t = t.replace(m[0], ' '); }
  if (/\bübermorgen\b/i.test(t)) { it.date = addDays(T(), 2); t = t.replace(/\bübermorgen\b/i, ' '); }
  else if (/\bmorgen\b/i.test(t)) { it.date = addDays(T(), 1); t = t.replace(/\bmorgen\b/i, ' '); }
  t = t.replace(/\bheute\b/i, ' ');
  const dm = t.match(/\b(\d+(?:[.,]5)?)\s*(min(?:uten)?|std|stunden?|h)\b/i);
  if (dm) { const v = parseFloat(dm[1].replace(',', '.')); it.minutes = /^m/i.test(dm[2]) ? Math.round(v) : Math.round(v * 60); t = t.replace(dm[0], ' '); }
  t = t.replace(/\s+(für|ca\.?|etwa)\s*$/i, '').replace(/\s{2,}/g, ' ').replace(/^[\s,.\-–]+|[\s,.\-–]+$/g, '').trim();
  it.title = t ? t[0].toUpperCase() + t.slice(1) : raw.trim();
  it.initiative = guessInit(it.title);
  return it;
}
function splitDump(text) {
  return text.split(/\n|;|,(?![^(]*\))|\.\s+(?=[A-ZÄÖÜ])/).map(s => s.trim()).filter(s => s.length > 1);
}

/* ================= Rendering ================= */
const app = () => $('#app');
let sheet = null;          // { name, data }
let animSheet = false, animFocus = false;
let capture = { text: '', items: [] };
let recog = null;

function applyTheme() {
  const r = document.documentElement;
  r.classList.toggle('calm', !!S.profile.reizarm);
  if (S.profile.theme === 'light' || S.profile.theme === 'dark') r.dataset.theme = S.profile.theme;
  else if (S._themeTouched) delete r.dataset.theme;
}

function render() {
  applyTheme();
  if (!S.onboarded) { app().innerHTML = onboarding(); bindAfter(); return; }
  const v = S.ui.view;
  const tabs = [['jetzt', 'now', 'Jetzt'], ['tag', 'day', 'Tag'], ['initiativen', 'init', 'Initiativen'], ['routinen', 'routine', 'Routinen'], ['spaeter', 'later', 'Später']];
  const nav = tabs.map(([id, i, l]) => `<button class="tab" data-a="view" data-v="${id}" ${v === id ? 'aria-current="page"' : ''}>${ic(i)}<span>${l}</span></button>`).join('');
  const scrollY = window.scrollY;
  app().innerHTML = `
  <div class="shell">
    <aside class="side">
      <div class="brand">${MARK}<span>Jetzt<i>.</i></span></div>
      <button class="btn now block" data-a="capture">${ic('mic')} Erfassen <kbd>N</kbd></button>
      <nav class="side-nav" aria-label="Bereiche"><span class="side-label">Planen</span>${nav}</nav>
      <div class="side-foot">
        <div class="garden-card">${gardenSVG(S.growth, 320, 120)}<div class="garden-cap"><span>Dein Garten</span><span class="num">${S.growth} Schritte</span></div></div>
        <button class="side-link" data-a="sheet" data-s="settings">${ic('settings')} Einstellungen</button>
      </div>
    </aside>
    <main class="main view-${v}" id="main">${views[v] ? views[v]() : views.jetzt()}</main>
  </div>
  <nav class="tabbar" aria-label="Bereiche">${nav}</nav>
  <button class="fab" data-a="capture" aria-label="Erfassen">${ic('mic')}<span>Erfassen</span></button>
  ${sheet ? `<div class="scrim ${animSheet ? 'anim' : ''}" data-a="close"></div><section class="sheet ${animSheet ? 'anim' : ''}" role="dialog" aria-modal="true" aria-label="${esc(sheet.name)}">${sheets[sheet.name] ? sheets[sheet.name](sheet.data || {}) : ''}</section>` : ''}
  ${S.focus ? focusView() : ''}`;
  animSheet = false; animFocus = false;
  if (!sheet && !S.focus) window.scrollTo(0, scrollY);
  bindAfter();
}

function bindAfter() {
  const ta = $('#cap-text'); if (ta && document.activeElement !== ta && sheet && sheet.name === 'capture' && !sheet.data.noFocus) { ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length); }
}

function initChip(id) {
  const i = initById(id); if (!i) return '';
  return `<span class="chip" style="--c:${cvar(i.color)}">${iIcon(i)}${esc(i.name)}</span>`;
}
let ringN = 0;
function ringSVG(frac, o) {
  // Ring mit Verlauf und Minutenstrichen; frac = verbleibender Anteil
  const { r, w, tickR } = o; const id = o.id + '-' + (++ringN); const C = 2 * Math.PI * r; const cx = 70;
  let ticks = '';
  for (let k = 0; k < 60; k++) { const a = k / 60 * Math.PI * 2, r1 = tickR, r2 = tickR + (k % 5 ? 3 : 6); ticks += `<line class="tick" x1="${(cx + Math.cos(a) * r1).toFixed(2)}" y1="${(cx + Math.sin(a) * r1).toFixed(2)}" x2="${(cx + Math.cos(a) * r2).toFixed(2)}" y2="${(cx + Math.sin(a) * r2).toFixed(2)}" stroke-width="${k % 5 ? 0.8 : 1.3}"/>`; }
  return `<svg viewBox="0 0 140 140"><defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" style="stop-color:var(--now-2)"/><stop offset="1" style="stop-color:var(--c, var(--now))"/></linearGradient></defs>${ticks}<circle class="track" cx="${cx}" cy="${cx}" r="${r}" fill="none" stroke-width="${w}"/><circle class="fill" ${o.fillId ? `id="${o.fillId}"` : ''} cx="${cx}" cy="${cx}" r="${r}" fill="none" stroke="url(#${id})" stroke-width="${w}" stroke-linecap="round" stroke-dasharray="${C.toFixed(2)}" stroke-dashoffset="${(C * (1 - clamp(frac, 0, 1))).toFixed(2)}" data-c="${C.toFixed(2)}"/></svg>`;
}
function ring(minLeft, total, size = 156) {
  const frac = total > 0 ? minLeft / total : 1;
  return `<div class="ring" style="width:${size}px;height:${size}px">${ringSVG(frac, { r: 50, w: 9, id: 'rg-now', tickR: 59 })}<div class="ring-label"><b>${Math.round(minLeft)}</b><small>Minuten</small></div></div>`;
}

function zeitband() {
  const sc = schedule(); const span = sc.de - sc.ds;
  const X = m => clamp((m - sc.ds) / span * 100, 0, 100);
  const blocks = sc.blocks.filter(b => b.kind !== 'buffer' && b.e > sc.ds && b.s < sc.de).map(b => {
    const i = b.t && initById(b.t.initiative);
    return `<i class="band-block ${b.kind === 'event' ? 'event' : ''}" style="left:${X(b.s)}%;width:${Math.max(0.8, X(b.e) - X(b.s))}%;--c:${i ? cvar(i.color) : 'var(--ink-2)'}" title="${esc(b.t.title)} ${hm(b.s)}–${hm(b.e)}"></i>`;
  }).join('');
  const ticks = []; for (let h = Math.ceil(sc.ds / 60); h <= Math.floor(sc.de / 60); h += 3) ticks.push(`<span style="left:${X(h * 60)}%">${pad(h)}</span>`);
  const left = sc.de - sc.now;
  return `<section class="card band" aria-label="Dein Tag als Zeitstreifen">
    <div class="band-head"><div><span class="eyebrow">Heute</span><b class="band-time num">${hm(sc.now)}</b></div><div class="band-left">${left > 0 ? `noch <b>${dur(left)}</b><br>bis ${S.profile.dayEnd}` : 'Zeit für Feierabend'}</div></div>
    <div class="band-track"><i class="band-past" style="width:${X(sc.now)}%"></i>${blocks}<i class="band-now" style="left:${X(sc.now)}%"></i></div>
    <div class="band-ticks">${ticks.join('')}</div></section>`;
}

const views = {};

/* ---------- Jetzt ---------- */
views.jetzt = () => {
  const d = today(); const cur = currentTask(); const nx = nextUp(cur);
  const hour = new Date().getHours();
  const greet = hour < 11 ? 'Guten Morgen' : hour < 17 ? 'Guten Tag' : 'Guten Abend';
  const en = d.energy ? ENERGY[d.energy] : null;
  const top = `<header class="top"><div><div class="date">${niceDate()}</div><h1>${greet}</h1></div>
    <div class="top-actions"><button class="energy-chip" data-a="sheet" data-s="morning" aria-label="Energie ändern">${en ? `${ic(en.em)} Energie: ${en.t}` : `${ic('sunrise')} Check-in`}</button>
    <button class="icon-btn" data-a="sheet" data-s="settings" aria-label="Einstellungen">${ic('settings')}</button></div></header>`;
  let main = '';
  if (cur) {
    const i = initById(cur.initiative); const st = nextStep(cur);
    const inFocus = S.focus && S.focus.taskId === cur.id;
    const left = inFocus ? Math.ceil(focusLeft() / 60) : remainingMin(cur);
    const total = inFocus ? S.focus.total / 60 : remainingMin(cur);
    const idx = st ? cur.steps.indexOf(st) : -1;
    const first = idx === 0;
    main = `<article class="now-card" style="--c:${i ? cvar(i.color) : 'var(--now)'}">
      <div class="now-head"><span class="live"><i></i>Jetzt dran</span>${cur.important ? `<span class="chip now">${ic('star')} Heute wichtig</span>` : ''}${initChip(cur.initiative)}</div>
      <h2 class="now-title">${esc(cur.title)}</h2>
      <div class="now-body">
        <div class="step-panel">${st ? `
          <div class="step-top"><span class="eyebrow">${first ? 'Erster Schritt' : `Schritt ${idx + 1} von ${cur.steps.length}`}</span><span class="step-min num">≈ ${st.min} Min</span></div>
          <p class="step-text">${esc(st.text)}</p>
          <div class="seg-bar" aria-hidden="true">${cur.steps.map(s => `<i class="${s.done ? 'd' : ''} ${s === st ? 'c' : ''}"></i>`).join('')}</div>
          ${first && st.min <= 2 ? '<p class="step-hint">So klein, dass es fast nicht zählt. Genau richtig zum Anfangen.</p>' : ''}`
        : `<span class="eyebrow">Noch nicht zerlegt</span><p class="step-text">Einfach anfangen oder in Mini-Schritte zerlegen.</p><div><button class="btn small" data-a="breakdown" data-id="${cur.id}">${ic('split')} Zerlegen</button></div>`}
        </div>
        ${ring(left, Math.max(total, left))}
      </div>
      ${cur.ifthen || (i && i.why) ? `<div class="anchors">${cur.ifthen ? `<p class="anchor">${ic('anchor')}<span>Wenn <b>${esc(cur.ifthen)}</b>, dann fange ich an.</span></p>` : ''}${i && i.why ? `<p class="anchor">${ic('heart')}<span>${esc(i.why)}</span></p>` : ''}</div>` : ''}
      <div class="now-actions">
        <button class="btn now big" data-a="focus" data-id="${cur.id}">${ic('play')} ${inFocus ? 'Weiter' : 'Los geht\'s'}</button>
        <button class="btn big" data-a="sheet" data-s="tooHard" data-id="${cur.id}">Zu schwer</button>
        <button class="btn big" data-a="defer" data-id="${cur.id}">Später</button>
      </div>
    </article>`;
  } else {
    const done = doneToday().length;
    const sg = suggest(3);
    main = `<section class="empty">
      ${done ? `${illu('summit')}<span class="chip grow">${ic('check')} Heute geschafft: ${done}</span><h2>Alles für jetzt erledigt.</h2><p>Du darfst aufhören. Oder dir noch etwas Kleines holen, wenn du Lust hast.</p>`
      : `${illu('desk')}<span class="chip now">${ic('sparkle')} Frischer Start</span><h2>Womit fangen wir an?</h2><p>Such dir eins aus. Es muss nicht das Wichtigste sein, nur ein Anfang.</p>`}
      ${sg.length ? `<div class="sugg">${sg.map(t => { const i = initById(t.initiative); return `<button data-a="takeToday" data-id="${t.id}"><span class="em" style="--c:${i ? cvar(i.color) : 'var(--ink-3)'}">${i ? iIcon(i) : ic('sparkle')}</span><span>${esc(t.title)}</span><span class="m">${taskMin(t)} Min</span></button>`; }).join('')}</div>` : ''}
      <div class="row" style="justify-content:center"><button class="btn primary" data-a="capture">${ic('mic')} Etwas erfassen</button>${S.routines.length ? `<button class="btn" data-a="view" data-v="routinen">${ic('routine')} Routine starten</button>` : ''}</div>
    </section>`;
  }
  let nxt = '';
  if (nx) {
    if (nx.kind === 'event') { const d2 = nx.at - nowMin(); const ni = initById(nx.t.initiative); nxt = `<div class="next-up"><span class="tile" style="--c:${ni ? cvar(ni.color) : 'var(--ink-2)'}">${ic('clock')}</span><span class="tx"><small>Als Nächstes · ${nx.t.time}</small><b>${esc(nx.t.title)}</b></span><span class="when">${d2 > 0 ? 'in ' + dur(d2) : 'läuft'}</span></div>`; }
    else { const ni = initById(nx.t.initiative); nxt = `<div class="next-up"><span class="tile" style="--c:${ni ? cvar(ni.color) : 'var(--ink-3)'}">${ic('arrow')}</span><span class="tx"><small>Danach</small><b>${esc(nx.t.title)}</b></span><span class="when">${remainingMin(nx.t)} Min</span></div>`; }
  }
  const imps = todayTasks().filter(t => t.important).concat(doneToday().filter(t => t.important && t.type === 'task'));
  const impDone = imps.filter(t => t.status === 'done').length;
  const impList = `<section class="card"><div class="card-h"><h3>Heute wichtig</h3><span class="muted num">${imps.length ? `${impDone}/${imps.length}` : `max. ${S.profile.maxImp}`}</span></div>
    ${imps.length ? `<div class="important">${imps.map(t => `<div class="imp-row ${t.status === 'done' ? 'done' : ''}"><button class="check ${t.status === 'done' ? 'on' : ''}" data-a="complete" data-id="${t.id}" aria-label="${t.status === 'done' ? 'Erledigt' : 'Als erledigt markieren'}">${ic('check')}</button><span class="t">${esc(t.title)}</span><span class="d">${t.status === 'done' ? ic('check') : remainingMin(t) + '′'}</span></div>`).join('')}</div>` : `<p class="muted" style="font-size:14px">Noch nichts markiert. Im Tag mit dem Stern wählen. Eins reicht schon.</p>`}</section>`;
  const hour2 = new Date().getHours();
  const evening = hour2 >= 18 && !d.review ? `<div class="banner grow"><span class="tile" style="--c:var(--grow)">${ic('moon')}</span><div class="tx"><b>Feierabend in Sicht</b><span>Eine Minute Rückblick, nur was geklappt hat.</span></div><button class="btn small" data-a="sheet" data-s="evening">Abschließen</button></div>` : '';
  const morning = !d.checkin && hour2 < 14 ? `<div class="banner now"><span class="tile" style="--c:var(--now)">${ic('sunrise')}</span><div class="tx"><b>Morgen-Check-in</b><span>Zwei Minuten: Energie wählen, Tag bestätigen.</span></div><button class="btn small" data-a="sheet" data-s="morning">Starten</button></div>` : '';
  const garden = S.profile.reward === 'garten' ? `<section class="card"><div class="card-h"><h3>Dein Garten</h3><span class="muted">wächst mit jedem Schritt</span></div><div class="garden-wrap">${gardenSVG(S.growth, 640, 200)}<div class="garden-cap"><span>Heute +${d.steps}</span><span class="num">${S.growth} insgesamt</span></div></div></section>` : '';
  return `${top}${morning}<div class="jetzt-grid"><div class="col-main">${main}${nxt}</div><aside class="col-side">${zeitband()}${impList}${evening}${garden}</aside></div>`;
};

/* ---------- Tag ---------- */
views.tag = () => {
  const sc0 = schedule(); const PX = 1.15;
  const firstEv = sc0.blocks.filter(b => b.kind === 'event').reduce((m, b) => Math.min(m, b.s - 10), 1440);
  const vs = Math.max(sc0.ds, Math.min(Math.floor((sc0.now - 60) / 60) * 60, Math.floor(firstEv / 60) * 60));
  const lastEnd = sc0.blocks.reduce((m, b) => Math.max(m, b.e), 0);
  const ve = Math.min(1440, Math.max(sc0.de, Math.ceil(lastEnd / 60) * 60));
  const sc = Object.assign({}, sc0, { ds: Math.min(vs, ve - 120), de: ve });
  const H = (sc.de - sc.ds) * PX;
  const y = m => (m - sc.ds) * PX;
  const endLine = sc0.de < sc.de ? `<div class="tl-end" style="top:${y(sc0.de)}px"><span>Tagesende ${S.profile.dayEnd}</span></div>` : '';
  let hours = ''; for (let h = Math.ceil(sc.ds / 60); h <= Math.floor(sc.de / 60); h++) hours += `<div class="tl-hour" style="top:${y(h * 60)}px"><span>${pad(h)}:00</span></div>`;
  const blocks = sc.blocks.filter(b => b.e > sc.ds && b.s < sc.de).map(b => {
    const top = y(Math.max(b.s, sc.ds)), hgt = Math.max(14, (Math.min(b.e, sc.de) - Math.max(b.s, sc.ds)) * PX - 3);
    if (b.kind === 'buffer') return `<div class="tl-block buffer" style="top:${top}px;height:${Math.max(8, hgt)}px">${hgt > 13 && b.label === 'Übergang' ? b.label : ''}</div>`;
    const i = initById(b.t.initiative);
    return `<button class="tl-block ${b.kind} ${b.over ? 'over' : ''} ${b.t.important ? 'important' : ''} ${hgt < 34 ? 'compact' : ''}" style="top:${top}px;height:${hgt}px;--c:${i ? cvar(i.color) : 'var(--ink-3)'}" data-a="sheet" data-s="edit" data-id="${b.t.id}"><span class="tt">${b.kind === 'event' ? ic('pin') : ''}${esc(b.t.title)}</span><span class="tm">${hm(b.s)}${hgt >= 34 ? '–' + hm(b.e) : ''}</span></button>`;
  }).join('');
  const pastH = clamp(y(sc.now), 0, H);
  const nowLine = sc.now >= sc.ds && sc.now <= sc.de ? `<div class="tl-now" style="top:${y(sc.now)}px"><span>Jetzt ${hm(sc.now)}</span></div>` : '';
  const over = sc.planned > sc.available;
  const pct = sc.available ? clamp(sc.planned / sc.available * 100, 0, 100) : 100;
  const open = openToday(); const imp = open.filter(t => t.important); const rest = open.filter(t => !t.important);
  const row = (t, idx, arr) => { const i = initById(t.initiative); return `<div class="task-row ${t.important ? '' : 'muted'}" style="--c:${i ? cvar(i.color) : 'var(--line)'}">
    <button class="check" data-a="complete" data-id="${t.id}" aria-label="Erledigt">${ic('check')}</button>
    <div><div class="t">${esc(t.title)}</div><div class="meta"><span>${remainingMin(t)} Min</span>${t.steps.length ? `<span>· ${t.steps.filter(s => s.done).length}/${t.steps.length} Schritte</span>` : ''}${i ? `<span>· ${esc(i.name)}</span>` : ''}${t.deadline ? `<span>· bis ${esc(fmtDate(t.deadline))}</span>` : ''}</div></div>
    <div class="acts">
      <button class="icon-btn sm star" data-a="star" data-id="${t.id}" aria-pressed="${t.important}" aria-label="Heute wichtig">${ic('star')}</button>
      <button class="icon-btn sm" data-a="move" data-id="${t.id}" data-d="-1" aria-label="Nach oben" ${idx === 0 ? 'disabled' : ''}>${ic('up')}</button>
      <button class="icon-btn sm" data-a="move" data-id="${t.id}" data-d="1" aria-label="Nach unten" ${idx === arr.length - 1 ? 'disabled' : ''}>${ic('down')}</button>
      <button class="icon-btn sm" data-a="breakdown" data-id="${t.id}" aria-label="Zerlegen">${ic('split')}</button>
      <button class="icon-btn sm" data-a="sheet" data-s="edit" data-id="${t.id}" aria-label="Bearbeiten">${ic('edit')}</button>
    </div></div>`; };
  const done = doneToday();
  return `<header class="top"><div><div class="date">${niceDate()}</div><h1>Dein Tag</h1></div>
    <div class="top-actions"><button class="btn small" data-a="sheet" data-s="edit" data-new="event">${ic('plus')} Termin</button></div></header>
  <section class="reality" aria-label="Realitätscheck">
    <div class="nums"><span>Geplant: <b>${dur(sc.planned)}</b></span><span>Noch frei bis ${S.profile.dayEnd}: <b>${dur(sc.available)}</b></span></div>
    <div class="reality-bar"><i class="${over ? 'over' : ''}" style="width:${pct}%"></i></div>
    ${over ? `<div class="hint">${ic('sparkle')}<span>Mehr geplant, als der Tag hergibt. Das ist normal, nicht dein Fehler.</span><button class="btn small" data-a="trim">Ich räume auf</button></div>` : `<div class="muted" style="font-size:15px">Passt. Mit Puffern zwischen allem.</div>`}
  </section>
  <div class="timeline"><div class="tl-inner" style="height:${H}px"><div class="tl-past" style="height:${pastH}px"></div>${hours}${blocks}${endLine}${nowLine}</div></div>
  <section class="sec"><div class="sec-h"><h2>Heute wichtig</h2><span class="muted">${imp.length ? `${imp.length} von höchstens ${S.profile.maxImp}` : 'Tippe auf den Stern, um etwas zu wählen'}</span></div>
    <div class="task-list">${imp.map(row).join('') || '<p class="muted">Noch nichts markiert. Eins reicht schon.</p>'}</div></section>
  <section class="sec"><div class="sec-h"><h2>Wenn Zeit bleibt</h2></div>
    <div class="task-list">${rest.map(row).join('') || '<p class="muted">Leer. Auch gut.</p>'}</div></section>
  ${done.length ? `<section class="sec"><div class="sec-h"><h2>Geschafft</h2><span class="chip grow">${done.length}</span></div><div class="important">${done.map(t => `<div class="imp-row done"><span class="check on">${ic('check')}</span><span class="t">${esc(t.title)}</span></div>`).join('')}</div></section>` : ''}
  <div class="row"><button class="btn" data-a="restart">${ic('refresh')} Tag neu starten</button><button class="btn" data-a="sheet" data-s="evening">${ic('moon')} Tag abschließen</button></div>`;
};
const fmtDate = k => { if (!k) return ''; const [y, m, d] = k.split('-').map(Number); const dd = daysBetween(T(), k); if (dd === 0) return 'heute'; if (dd === 1) return 'morgen'; return `${d}.${m}.`; };

/* ---------- Initiativen ---------- */
views.initiativen = () => {
  const cards = S.initiatives.map(i => {
    const tasks = S.tasks.filter(t => t.initiative === i.id && t.type === 'task' && t.status !== 'done');
    const nt = tasks.find(t => t.status === 'today') || tasks[0];
    const st = nt && nextStep(nt);
    const g = i.grown || 0;
    const sprouts = Array.from({ length: Math.min(24, g) }, (_, k) => `<i style="height:${Math.round(8 + rand(k + i.name.length) * 18)}px"></i>`).join('');
    return `<article class="init-card ${i.focus ? 'is-focus' : ''}" style="--c:${cvar(i.color)}">
      ${i.focus ? `<span class="chip focus-badge" style="--c:${cvar(i.color)}">${ic('star')} Fokus</span>` : ''}
      <div class="init-top"><div class="init-icon">${iIcon(i)}</div><div><h3>${esc(i.name)}</h3></div></div>
      ${i.why ? `<p class="why">„${esc(i.why)}“</p>` : `<button class="btn ghost small" data-a="sheet" data-s="initEdit" data-id="${i.id}" style="justify-self:start">${ic('feather')} Warum ist mir das wichtig?</button>`}
      <div class="init-next">${nt ? `<span class="eyebrow">Nächster Schritt</span><span class="t">${esc(st ? st.text : nt.title)}</span>${st ? `<span class="muted" style="font-size:14px">aus „${esc(nt.title)}“</span>` : ''}` : `<span class="muted">Hier liegt gerade nichts an. Das darf so sein.</span>`}</div>
      <div class="sprouts" aria-hidden="true">${sprouts}</div>
      <div class="init-foot"><span>${g ? `${g} Schritte gewachsen` : 'Wächst mit jedem Schritt'}</span>
        <span class="row">${nt ? `<button class="btn small" data-a="initGo" data-id="${i.id}">${ic('play')} Jetzt das</button>` : `<button class="btn small" data-a="capture" data-init="${i.id}">${ic('plus')} Erfassen</button>`}
        <button class="icon-btn sm" data-a="sheet" data-s="initEdit" data-id="${i.id}" aria-label="${esc(i.name)} bearbeiten">${ic('edit')}</button></span></div>
    </article>`;
  }).join('');
  return `<section class="page-hero"><div class="ph-text"><div class="date">Deine Fokusbereiche</div><h1>Initiativen</h1>
  <p class="lead">Wenige Bereiche, die dir wichtig sind. Keine Ordner, keine Unterprojekte. Wähle eine Initiative als Fokus, dann schlägt dir die App zuerst Schritte daraus vor.</p></div>${illu('paths')}</section>
  <div class="init-grid">${cards}${S.initiatives.length < 6 ? `<button class="init-add" data-a="sheet" data-s="initEdit">${ic('plus')}<span>Initiative hinzufügen</span><small class="muted">höchstens 6</small></button>` : ''}</div>`;
};

/* ---------- Routinen ---------- */
views.routinen = () => {
  const list = S.routines.map(r => `<article class="routine"><div class="row between"><h3 style="font-size:21px">${esc(r.name)}</h3><span class="muted" style="font-size:14px">${r.count ? `schon ${r.count}× gemacht` : 'noch neu'}</span></div>
    <div class="chain"><span class="lnk trig">Wenn ${esc(r.trigger)}</span>${r.steps.map(s => `<span class="arr">→</span><span class="lnk">${esc(s.text)} <small>${s.min}′</small></span>`).join('')}</div>
    <div class="row"><button class="btn now" data-a="runRoutine" data-id="${r.id}">${ic('play')} Starten</button><button class="btn ghost small" data-a="sheet" data-s="routineEdit" data-id="${r.id}">${ic('edit')} Bearbeiten</button><span class="muted" style="margin-left:auto;font-size:14px">≈ ${r.steps.reduce((a, s) => a + (+s.min || 0), 0)} Min</span></div></article>`).join('');
  return `<section class="page-hero"><div class="ph-text"><div class="date">Wenn-Dann-Ketten</div><h1>Routinen</h1>
  <p class="lead">Eine Handlung wird an einen festen Auslöser gekoppelt, damit es nicht an Willenskraft hängt. Ein ausgelassener Tag ändert nichts: Hier zählt nur, wie oft es schon geklappt hat.</p>
  <div><button class="btn" data-a="sheet" data-s="routineEdit">${ic('plus')} Neue Routine</button></div></div>${illu('steps')}</section>
  <div class="stack">${list || '<p class="muted">Noch keine Routine.</p>'}</div>`;
};

/* ---------- Später ---------- */
views.spaeter = () => {
  const lt = laterTasks();
  const items = lt.map(t => { const i = initById(t.initiative); return `<div class="later-item" style="--c:${i ? cvar(i.color) : 'var(--ink-3)'}"><span class="dot"></span><span class="t">${esc(t.title)}</span>
    <button class="btn ghost small" data-a="takeToday" data-id="${t.id}">Heute</button>
    <button class="icon-btn sm" data-a="sheet" data-s="edit" data-id="${t.id}" aria-label="Bearbeiten">${ic('edit')}</button>
    <button class="icon-btn sm" data-a="drop" data-id="${t.id}" aria-label="Brauch ich nicht mehr">${ic('x')}</button></div>`; }).join('');
  const notes = S.notes.map(n => `<div class="note">${ic('feather')}<p>${esc(n.text)}</p><button class="icon-btn sm" data-a="dropNote" data-id="${n.id}" aria-label="Notiz löschen">${ic('x')}</button></div>`).join('');
  return `<section class="page-hero"><div class="ph-text"><div class="date">Ablage ohne Druck</div><h1>Später</h1>
  <p class="lead">Hier liegt alles, was gerade nicht dran ist. Kein Zähler, keine Reihenfolge, nichts ist überfällig.</p></div>${illu('box')}</section>
  ${lt.length ? `<button class="btn primary big" data-a="sheet" data-s="suggestOne">${ic('sparkle')} Mir eins vorschlagen</button>` : ''}
  <div class="later-list">${items || '<p class="muted">Leer. Neues landet hier, sobald du es erfasst und nicht für heute einplanst.</p>'}</div>
  ${notes ? `<section class="sec"><div class="sec-h"><h2>Notizen</h2></div><div class="later-list">${notes}</div></section>` : ''}`;
};

/* ---------- Fokus ---------- */
function focusLeft() {
  const f = S.focus; if (!f) return 0;
  const el = f.elapsed + (f.paused ? 0 : (Date.now() - f.since) / 1000);
  return Math.max(0, f.total - el);
}
function focusView() {
  const f = S.focus;
  if (f.routine) return routineView();
  const t = taskById(f.taskId); if (!t) { S.focus = null; return ''; }
  const i = initById(t.initiative);
  const left = focusLeft(); const C = 2 * Math.PI * 54;
  const st = nextStep(t);
  const mm = Math.floor(left / 60), ss = Math.floor(left % 60);
  return `<section class="focus ${animFocus ? 'anim' : ''}" role="dialog" aria-label="Fokusmodus" style="--c:${i ? cvar(i.color) : 'var(--now)'}">
    <div class="focus-top"><span class="eyebrow">Fokus${i ? ' · ' + esc(i.name) : ''}</span>
      <div class="row"><button class="btn ghost small" data-a="noise" aria-pressed="${!!f.noise}">${ic('sound')} <span>${f.noise === 'brown' ? 'Rauschen' : f.noise === 'rain' ? 'Regen' : 'Ton aus'}</span></button>
      <button class="btn ghost small" data-a="buddy" aria-pressed="${!!f.buddy}">${ic('feather')} Begleiter</button>
      <button class="icon-btn" data-a="exitFocus" aria-label="Fokus verlassen">${ic('x')}</button></div></div>
    <div class="focus-in">
      <div class="focus-grid">
        <div class="focus-ring">${ringSVG(left / f.total, { r: 54, w: 6, id: 'rg-focus', tickR: 61, fillId: 'f-fill' })}
          <div class="lbl"><b id="f-time">${pad(mm)}:${pad(ss)}</b><small id="f-sub">${f.paused ? 'pausiert' : 'bleibt dir'}</small></div></div>
        <div class="stack loose" style="min-width:0">
          <h2 class="focus-title">${esc(t.title)}</h2>
          ${left <= 0 ? `<div class="timeup"><b>Zeit ist um. Gut, dass du drangeblieben bist.</b><div class="row"><button class="btn primary small" data-a="addTime" data-m="10">+10 Min</button><button class="btn small" data-a="complete" data-id="${t.id}">${ic('check')} Fertig</button><button class="btn small" data-a="exitFocus">Pause machen</button><button class="btn ghost small" data-a="exitPlan">Neu planen</button></div></div>` : ''}
          ${st ? `<div class="focus-step">${esc(st.text)}</div>` : `<div class="focus-step">Einfach weitermachen. Du bist dran.</div>`}
          ${t.steps.length ? `<div class="focus-steps">${t.steps.map(s => `<div class="fs-row ${s.done ? 'done' : ''} ${s === st ? 'cur' : ''}"><button class="check ${s.done ? 'on' : ''}" data-a="step" data-id="${t.id}" data-s="${s.id}" aria-label="${esc(s.text)} abhaken">${ic('check')}</button><span>${esc(s.text)}</span><small class="muted num">${s.min}′</small></div>`).join('')}</div>` : ''}
          ${i && i.why ? `<p class="focus-why">Darum: ${esc(i.why)}</p>` : ''}
          ${f.buddy ? `<div class="buddy"><svg viewBox="0 0 64 52" aria-hidden="true"><rect x="4" y="38" width="56" height="4" rx="2" style="fill:var(--surface-3)"/><g class="breath"><circle cx="24" cy="14" r="7" style="fill:var(--c)"/><path d="M12 38c0-10 5-16 12-16s12 6 12 16z" style="fill:var(--c);opacity:.8"/></g><rect x="36" y="30" width="18" height="8" rx="1.5" style="fill:var(--ink-3)"/><path class="pen" d="M34 35l8-6" style="stroke:var(--ink-2)" stroke-width="2" stroke-linecap="round"/></svg><span>Dein Begleiter arbeitet still mit dir, so lange wie dein Timer läuft. Ein Avatar, keine echte Person.</span></div>` : ''}
        </div>
      </div>
    </div>
    <div class="focus-bar">
      <button class="btn" data-a="pause">${f.paused ? ic('play') + ' Weiter' : ic('pause') + ' Pause'}</button>
      <button class="btn" data-a="addTime" data-m="5">+5 Min</button>
      <button class="btn" data-a="smaller" data-id="${t.id}">Zu schwer gerade</button>
      <button class="btn primary" data-a="complete" data-id="${t.id}">${ic('check')} Ganze Aufgabe fertig</button>
    </div></section>`;
}
function routineView() {
  const f = S.focus; const r = S.routines.find(x => x.id === f.routineId); if (!r) { S.focus = null; return ''; }
  const s = r.steps[f.idx]; const left = focusLeft(); const C = 2 * Math.PI * 54;
  return `<section class="focus" role="dialog" aria-label="Routine">
    <div class="focus-top"><span class="eyebrow">Routine · ${esc(r.name)}</span><button class="icon-btn" data-a="exitFocus" aria-label="Routine beenden">${ic('x')}</button></div>
    <div class="focus-in"><div class="focus-grid">
      <div class="focus-ring" style="--c:var(--now)">${ringSVG(left / f.total, { r: 54, w: 6, id: 'rg-focus', tickR: 61, fillId: 'f-fill' })}
        <div class="lbl"><b id="f-time">${pad(Math.floor(left / 60))}:${pad(Math.floor(left % 60))}</b><small id="f-sub">Schritt ${f.idx + 1} von ${r.steps.length}</small></div></div>
      <div class="stack loose" style="min-width:0"><span class="chip now" style="justify-self:start">Wenn ${esc(r.trigger)}</span>
        <h2 class="focus-title">${esc(s.text)}</h2>
        <div class="focus-steps">${r.steps.map((x, k) => `<div class="fs-row ${k < f.idx ? 'done' : ''} ${k === f.idx ? 'cur' : ''}"><span class="check ${k < f.idx ? 'on' : ''}">${ic('check')}</span><span>${esc(x.text)}</span><small class="muted num">${x.min}′</small></div>`).join('')}</div>
      </div></div></div>
    <div class="focus-bar"><button class="btn" data-a="rSkip">Überspringen</button><button class="btn now big" data-a="rNext">${ic('check')} ${f.idx === r.steps.length - 1 ? 'Routine fertig' : 'Erledigt, weiter'}</button></div></section>`;
}
function startFocus(id) {
  const t = taskById(id); if (!t) return;
  if (t.status !== 'today') { t.status = 'today'; t.date = T(); }
  if (!(S.focus && S.focus.taskId === id)) {
    const st = nextStep(t); const min = st ? Math.max(remainingMin(t), 5) : (+t.minutes || 25);
    S.focus = { taskId: id, total: Math.min(min, 90) * 60, elapsed: 0, since: Date.now(), paused: false, noise: null, buddy: S.profile.problem === 'start' };
  } else if (S.focus.paused) { S.focus.paused = false; S.focus.since = Date.now(); }
  t.startedAt = Date.now(); t.nudged = false; animFocus = true;
  ctx(); holdWake(); save(); render();
}
function exitFocus() { S.focus = null; stopNoise(); releaseWake(); save(); render(); }

/* ================= Sheets ================= */
const sheets = {};
const sheetHead = (title, sub = '') => `<div class="sheet-h"><div><h2>${title}</h2>${sub ? `<p>${sub}</p>` : ''}</div><button class="icon-btn" data-a="close" aria-label="Schließen">${ic('x')}</button></div>`;
function openSheet(name, data = {}) { animSheet = !sheet; sheet = { name, data }; render(); setTimeout(() => { const f = $('.sheet [autofocus]'); f && f.focus(); }, 30); }
function closeSheet() { if (recog) { try { recog.stop(); } catch (e) { } recog = null; } sheet = null; render(); }

sheets.capture = d => {
  const hasSpeech = !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  const items = capture.items;
  const initOpts = (it, k) => S.initiatives.map(i => `<button class="chip" style="--c:${cvar(i.color)}" aria-pressed="${it.initiative === i.id}" data-a="capInit" data-k="${k}" data-id="${i.id}" aria-label="${esc(i.name)}">${iIcon(i)}${esc(i.name.split(' ')[0])}</button>`).join('');
  return `${sheetHead('Was schwirrt dir im Kopf?', 'Einfach alles raus. Mehrere Dinge mit Komma oder neuer Zeile trennen. Ich sortiere.')}
  <div class="row" style="align-items:flex-start;flex-wrap:nowrap">
    <textarea id="cap-text" class="input" placeholder="z. B. Steuer anfangen, Zahnarzt morgen um 9:30, Mama anrufen 10 min, Notiz: Geschenkidee Buch" aria-label="Gedanken erfassen">${esc(capture.text)}</textarea>
    ${hasSpeech ? `<button class="mic ${recog ? 'rec' : ''}" data-a="mic" aria-label="${recog ? 'Aufnahme stoppen' : 'Per Sprache erfassen'}">${ic(recog ? 'pause' : 'mic')}</button>` : ''}
  </div>
  ${items.length ? `<div class="cap-preview"><span class="eyebrow">Vorschau · ${items.length === 1 ? '1 Eintrag' : items.length + ' Einträge'}</span>${items.map((it, k) => `<div class="cap-item">
      <div class="row between"><span class="t">${esc(it.title)}</span><span class="muted" style="font-size:14px">${it.type === 'event' ? `${ic('pin')} ${it.time}${it.date !== T() ? ' · ' + fmtDate(it.date) : ''}` : it.type === 'note' ? 'Notiz' : `${it.minutes ? it.minutes + ' Min' : ''}${it.date !== T() ? ' · ' + fmtDate(it.date) : ''}`}</span></div>
      <div class="opts">
        ${[['task', 'Aufgabe'], ['event', 'Termin'], ['note', 'Notiz']].map(([v, l]) => `<button class="chip plain" aria-pressed="${it.type === v}" data-a="capType" data-k="${k}" data-v="${v}" style="${it.type === v ? 'background:var(--ink);color:var(--bg)' : ''}">${l}</button>`).join('')}
        ${it.type === 'task' ? `<button class="chip plain" data-a="capWhen" data-k="${k}" style="${it.when === 'later' ? '' : 'background:var(--now-soft);color:var(--now-ink)'}">${it.when === 'later' ? 'Später' : 'Heute'}</button>` : ''}
        ${it.type !== 'note' ? initOpts(it, k) : ''}
      </div></div>`).join('')}</div>` : ''}
  <div class="row end"><button class="btn ghost" data-a="close">Abbrechen</button><button class="btn primary" data-a="capSave" ${items.length ? '' : 'disabled'}>${ic('check')} Speichern</button></div>`;
};
function refreshCapture(text) {
  capture.text = text;
  const prev = capture.items;
  capture.items = splitDump(text).map((s, k) => {
    const it = parseItem(s); const p = prev[k];
    if (p && p.src === s) return p;
    it.src = s; it.when = 'today';
    if (sheet && sheet.data.init && it.type !== 'note') it.initiative = sheet.data.init;
    return it;
  });
}
function saveCapture() {
  let tasks = 0, events = 0, notes = 0, lastTask = null;
  capture.items.forEach(it => {
    if (it.type === 'note') { S.notes.unshift({ id: uid(), text: it.title, created: Date.now() }); notes++; return; }
    if (it.type === 'event') { S.tasks.push(newTask({ type: 'event', title: it.title, time: it.time || hm(Math.ceil((nowMin() + 60) / 15) * 15), minutes: it.minutes || 45, date: it.date, initiative: it.initiative })); events++; return; }
    const t = newTask({ title: it.title, initiative: it.initiative, minutes: it.minutes || 25, date: it.date, status: it.when === 'later' ? 'later' : 'today' });
    t.steps = fitSteps(breakdown(t.title, S.profile.detail), it.minutes);
    t.minutes = t.steps.reduce((a, s) => a + s.min, 0);
    S.tasks.push(t); tasks++; lastTask = t;
  });
  capture = { text: '', items: [] };
  save();
  sheet = null; render();
  const parts = []; if (tasks) parts.push(tasks === 1 ? '1 Aufgabe' : tasks + ' Aufgaben'); if (events) parts.push(events === 1 ? '1 Termin' : events + ' Termine'); if (notes) parts.push(notes === 1 ? '1 Notiz' : notes + ' Notizen');
  toast(`Aus dem Kopf: ${parts.join(', ')}. Schon in Mini-Schritte zerlegt.`, { gentle: true, actions: lastTask && tasks === 1 ? [['Schritte ansehen', `breakdown:${lastTask.id}`]] : null, ms: 6000 });
}
function toggleMic() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (recog) { try { recog.stop(); } catch (e) { } recog = null; render(); return; }
  if (!SR) return;
  try {
    recog = new SR(); recog.lang = 'de-DE'; recog.interimResults = true; recog.continuous = true;
    const base = capture.text ? capture.text.replace(/\s*$/, '') + '\n' : '';
    recog.onresult = e => { let txt = ''; for (let k = 0; k < e.results.length; k++) txt += e.results[k][0].transcript + (e.results[k].isFinal ? '\n' : ''); refreshCapture(base + txt.trim()); const ta = $('#cap-text'); if (ta) ta.value = capture.text; renderCapturePreview(); };
    recog.onerror = () => { recog = null; toast('Das Mikrofon ist hier nicht verfügbar. Tippen klappt genauso.', { gentle: true }); render(); };
    recog.onend = () => { recog = null; render(); };
    recog.start(); render();
  } catch (e) { recog = null; toast('Spracheingabe ist in diesem Browser nicht verfügbar.', { gentle: true }); }
}
function renderCapturePreview() {
  if (!sheet || sheet.name !== 'capture') return;
  const ta = $('#cap-text'); const pos = ta ? ta.selectionStart : 0;
  sheet.data.noFocus = false; render();
  const nt = $('#cap-text'); if (nt) { nt.focus(); try { nt.setSelectionRange(pos, pos); } catch (e) { } }
}

sheets.breakdown = d => {
  const t = taskById(d.id); if (!t) return '';
  const steps = d.steps;
  const total = steps.reduce((a, s) => a + (+s.min || 0), 0);
  return `${sheetHead('In Mini-Schritte zerlegen', esc(t.title))}
  <div class="field"><div class="row between"><span class="lbl" id="lvl-l">Detailgrad</span><span class="muted">${['', 'grob', 'locker', 'mittel', 'fein', 'ganz fein'][d.level]}</span></div>
    <input type="range" id="bd-level" min="1" max="5" step="1" value="${d.level}" aria-labelledby="lvl-l"><span class="help">Ein Vorschlag, den du frei anpassen kannst. Der erste Schritt bleibt immer winzig.</span></div>
  <div class="steps-ed">${steps.map((s, k) => `<div class="step-ed ${k === 0 ? 'first' : ''}">
      <span class="n">${k + 1}</span>
      <input class="txt" data-k="${k}" data-f="text" value="${esc(s.text)}" aria-label="Schritt ${k + 1}">
      <span class="row" style="gap:4px;flex-wrap:nowrap"><input class="min" type="number" min="1" max="120" data-k="${k}" data-f="min" value="${s.min}" aria-label="Minuten"><small class="muted">Min</small></span>
      <span class="ops"><button class="icon-btn sm" data-a="bdMove" data-k="${k}" data-d="-1" aria-label="Nach oben" ${k === 0 ? 'disabled' : ''}>${ic('up')}</button><button class="icon-btn sm" data-a="bdMove" data-k="${k}" data-d="1" aria-label="Nach unten" ${k === steps.length - 1 ? 'disabled' : ''}>${ic('down')}</button><button class="icon-btn sm" data-a="bdDel" data-k="${k}" aria-label="Schritt entfernen">${ic('trash')}</button></span>
    </div>`).join('')}</div>
  <div class="row between"><button class="btn ghost small" data-a="bdAdd">${ic('plus')} Schritt</button><span class="muted">Zusammen ≈ <b class="num">${dur(total)}</b>${steps[0] && steps[0].min <= 2 ? ' · erster Schritt ≤ 2 Min' : ''}</span></div>
  <div class="row end"><button class="btn ghost" data-a="close">Abbrechen</button><button class="btn primary" data-a="bdSave">${ic('check')} Übernehmen</button></div>`;
};
function openBreakdown(id, level) {
  const t = taskById(id); if (!t) return;
  const lv = level || S.profile.detail;
  const steps = t.steps && t.steps.length && !level ? t.steps.map(s => ({ ...s })) : breakdown(t.title, lv).map(s => { const old = (t.steps || []).find(o => o.text === s.text); return old ? { ...s, done: old.done } : s; });
  openSheet('breakdown', { id, level: lv, steps });
}

sheets.tooHard = d => {
  const t = taskById(d.id); if (!t) return '';
  const st = nextStep(t);
  return `${sheetHead('Okay. Machen wir es leichter.', 'Kein Problem, das passiert. Such dir aus, was jetzt hilft.')}
  <div class="sugg" style="max-width:none">
    <button data-a="smaller" data-id="${t.id}"><span class="em">${ic('feather')}</span><span>Noch kleinerer Schritt${st ? `<br><small class="muted" style="font-weight:400">statt „${esc(st.text)}“</small>` : ''}</span></button>
    <button data-a="breakdown" data-id="${t.id}" data-lv="5"><span class="em">${ic('scissors')}</span><span>Ganz fein zerlegen</span></button>
    <button data-a="swap" data-id="${t.id}"><span class="em">${ic('shuffle')}</span><span>Etwas anderes vorschlagen</span></button>
    <button data-a="defer" data-id="${t.id}"><span class="em">${ic('moon')}</span><span>Auf später legen</span><span class="m">ohne Kommentar</span></button>
  </div>`;
};
function makeSmaller(id) {
  const t = taskById(id); if (!t) return;
  const st = nextStep(t);
  const tiny = { id: uid(), text: st ? `Nur 2 Minuten: „${st.text}“ vorbereiten. Danach darfst du aufhören.` : 'Nur 2 Minuten anfangen. Danach darfst du aufhören.', min: 2, done: false };
  const idx = st ? t.steps.indexOf(st) : 0;
  if (st && st.min > 6) { const half = Math.ceil(st.min / 2); st.min = half; t.steps.splice(idx + 1, 0, { id: uid(), text: `${st.text} (zweite Hälfte)`, min: half, done: false }); }
  t.steps.splice(idx, 0, tiny);
  if (S.focus && S.focus.taskId === id) { S.focus.total = Math.max(S.focus.total, focusLeft() + 120); }
  sheet = null; save(); render(); toast('Neuer erster Schritt: 2 Minuten. Mehr nicht.', { gentle: true });
}
function defer(id) {
  const t = taskById(id); if (!t) return;
  t.status = 'later'; t.important = false; t.deferrals = (t.deferrals || 0) + 1; t.carried = false;
  if (S.focus && S.focus.taskId === id) { S.focus = null; stopNoise(); releaseWake(); }
  save();
  if (t.deferrals >= 3 && !t.asked) { t.asked = true; save(); openSheet('avoid', { id }); return; }
  sheet = null; render(); toast('Liegt jetzt in „Später“.', { gentle: true, ms: 2600 });
}
sheets.avoid = d => {
  const t = taskById(d.id); if (!t) return '';
  return `${sheetHead('Diese Aufgabe kommt immer wieder zurück.', `„${esc(t.title)}“ wurde ein paar Mal verschoben. Das ist ein Hinweis, kein Vorwurf. Was würde helfen?`)}
  <div class="sugg" style="max-width:none">
    <button data-a="breakdown" data-id="${t.id}" data-lv="5"><span class="em">${ic('scissors')}</span><span>Kleiner machen</span></button>
    <button data-a="askSomeone" data-id="${t.id}"><span class="em">${ic('people')}</span><span>Jemanden um Hilfe fragen</span></button>
    <button data-a="drop" data-id="${t.id}"><span class="em">${ic('leaf')}</span><span>Streichen, brauch ich nicht mehr</span></button>
    <button data-a="close"><span class="em">${ic('later')}</span><span>Einfach liegen lassen</span></button>
  </div>`;
};

sheets.edit = d => {
  const isNew = !d.id; const t = isNew ? newTask({ type: d.new || 'task', status: 'today', time: d.new === 'event' ? hm(Math.ceil((nowMin() + 60) / 15) * 15) : null, minutes: d.new === 'event' ? 45 : 25 }) : taskById(d.id);
  if (!t) return '';
  const ev = t.type === 'event';
  return `${sheetHead(isNew ? (ev ? 'Neuer Termin' : 'Neue Aufgabe') : (ev ? 'Termin' : 'Aufgabe'))}
  <form id="edit-form" class="stack" data-id="${isNew ? '' : t.id}" data-type="${t.type}">
    <div class="field"><label for="e-title">Was?</label><input id="e-title" class="input" name="title" value="${esc(t.title)}" required ${isNew ? 'autofocus' : ''}></div>
    <div class="two">
      ${ev ? `<div class="field"><label for="e-time">Uhrzeit</label><input id="e-time" class="input" type="time" name="time" value="${esc(t.time || '')}" required></div>` : `<div class="field"><label for="e-en">Energie nötig</label><select id="e-en" class="input" name="energy">${[['low', 'Wenig'], ['mid', 'Mittel'], ['high', 'Viel']].map(([v, l]) => `<option value="${v}" ${t.energy === v ? 'selected' : ''}>${l}</option>`).join('')}</select></div>`}
      <div class="field"><label for="e-min">Dauer (Min)</label><input id="e-min" class="input" type="number" min="5" max="480" step="5" name="minutes" value="${t.minutes || 25}"></div>
    </div>
    <div class="field"><span class="lbl">Initiative</span><div class="row" style="gap:6px">${S.initiatives.map(i => `<label class="chip" style="--c:${cvar(i.color)};cursor:pointer"><input type="radio" name="initiative" value="${i.id}" ${t.initiative === i.id ? 'checked' : ''} style="accent-color:${cvar(i.color)}">${iIcon(i)} ${esc(i.name)}</label>`).join('')}<label class="chip plain" style="cursor:pointer"><input type="radio" name="initiative" value="" ${!t.initiative ? 'checked' : ''}>Keine</label></div></div>
    ${ev ? `<div class="field"><label for="e-date">Tag</label><input id="e-date" class="input" type="date" name="date" value="${esc(t.date)}"></div>` : `
    <div class="field"><label for="e-if">Wenn-Dann-Anker <span class="muted" style="font-weight:400">(optional)</span></label><input id="e-if" class="input" name="ifthen" value="${esc(t.ifthen || '')}" placeholder="z. B. ich vom Mittagessen zurück bin"><span class="help">„Wenn …, dann fange ich an.“ Das koppelt den Start an einen Moment statt an Willenskraft.</span></div>
    <div class="field"><label for="e-dl">Echte Frist <span class="muted" style="font-weight:400">(nur wenn es eine gibt)</span></label><input id="e-dl" class="input" type="date" name="deadline" value="${esc(t.deadline || '')}"></div>`}
    <div class="row between">
      ${isNew ? '<span></span>' : `<button type="button" class="btn ghost small" data-a="drop" data-id="${t.id}">${ic('trash')} ${ev ? 'Termin löschen' : 'Brauch ich nicht mehr'}</button>`}
      <div class="row">${!isNew && !ev ? `<button type="button" class="btn small" data-a="breakdown" data-id="${t.id}">${ic('split')} Schritte</button>` : ''}<button class="btn primary" type="submit">${ic('check')} Speichern</button></div>
    </div>
  </form>`;
};

sheets.morning = () => {
  const d = today();
  const open = openToday(); const imp = open.filter(t => t.important);
  const sg = suggest(4).filter(t => !open.includes(t));
  return `${sheetHead('Guten Morgen.', 'Zwei Fragen, dann bist du fertig. Alles optional.')}
  <div class="field"><span class="lbl">Wie ist deine Energie gerade?</span>
    <div class="seg">${Object.entries(ENERGY).map(([k, v]) => `<button data-a="energy" data-v="${k}" aria-pressed="${d.energy === k}"><span class="em">${ic(v.em)}</span>${v.t}<small>${k === 'low' ? 'leichte Sachen zuerst' : k === 'mid' ? 'normaler Tag' : 'gut für Schweres'}</small></button>`).join('')}</div></div>
  <div class="field"><span class="lbl">Mein Vorschlag für heute</span><span class="help">Stern = heute wichtig (höchstens ${S.profile.maxImp}). Wegtippen legt es auf später.</span>
    <div class="task-list">${open.map(t => { const i = initById(t.initiative); return `<div class="task-row ${t.important ? '' : 'muted'}" style="--c:${i ? cvar(i.color) : 'var(--line)'}"><button class="icon-btn sm star" data-a="star" data-id="${t.id}" aria-pressed="${t.important}" aria-label="Heute wichtig">${ic('star')}</button><div><div class="t">${esc(t.title)}</div><div class="meta"><span>${remainingMin(t)} Min</span>${t.carried ? '<span>· von gestern mitgenommen</span>' : ''}</div></div><div class="acts"><button class="icon-btn sm" data-a="toLater" data-id="${t.id}" aria-label="Auf später">${ic('x')}</button></div></div>`; }).join('') || '<p class="muted">Noch nichts für heute.</p>'}</div>
    ${sg.length ? `<span class="help" style="margin-top:6px">Passt vielleicht${d.energy === 'low' ? ' (leicht)' : ''}:</span><div class="row" style="gap:6px">${sg.map(t => `<button class="chip plain" data-a="takeToday" data-id="${t.id}" data-stay="1">${ic('plus')} ${esc(t.title)}</button>`).join('')}</div>` : ''}
  </div>
  ${imp[0] ? `<div class="field"><label for="m-if">Wenn-Dann-Anker für „${esc(imp[0].title)}“</label><input id="m-if" class="input" value="${esc(imp[0].ifthen || '')}" placeholder="z. B. ich meinen Kaffee in der Hand habe" data-id="${imp[0].id}"></div>` : ''}
  <div class="row end"><button class="btn primary big" data-a="morningDone">${ic('check')} Passt so</button></div>`;
};

sheets.evening = () => {
  const d = today(); const done = doneToday(); const q = REFLECT[new Date().getDate() % REFLECT.length];
  const left = openToday().slice(0, 3);
  return `${sheetHead('Heute geschafft', done.length ? `${done.length === 1 ? '1 Sache' : done.length + ' Dinge'} und ${d.steps} kleine Schritte. Das zählt.` : `${d.steps ? d.steps + ' kleine Schritte. ' : ''}Auch Tage, an denen wenig ging, gehören dazu.`)}
  <div class="sheet-illu">${illu('night')}</div>
  ${S.profile.reward === 'garten' ? `<div class="garden-wrap">${gardenSVG()}<div class="garden-cap"><span>Dein Garten ist heute um ${d.steps} gewachsen</span><span class="num">insgesamt ${S.growth}</span></div></div>` : ''}
  ${done.length ? `<div class="important">${done.map(t => `<div class="imp-row done"><span class="check on">${ic('check')}</span><span class="t">${esc(t.title)}</span></div>`).join('')}</div>` : ''}
  <div class="field"><label for="ev-r">${q}</label><textarea id="ev-r" class="input" style="min-height:80px" placeholder="Ein Satz reicht.">${esc(d.reflection || '')}</textarea></div>
  ${left.length ? `<div class="field"><span class="lbl">Morgen schlage ich vor …</span><div class="task-list">${left.map(t => `<div class="task-row muted"><span></span><div class="t">${esc(t.title)}</div><div class="acts"><button class="btn ghost small" data-a="drop" data-id="${t.id}" data-stay="1">Brauch ich nicht mehr</button></div></div>`).join('')}</div></div>` : ''}
  <div class="row end"><button class="btn primary big" data-a="eveningDone">${ic('moon')} Gute Nacht</button></div>`;
};

sheets.restart = () => {
  const sg = suggest(3);
  const open = openToday();
  return `${sheetHead('Neuer Start.', 'Der Rest des Tages ist frisch aufgebaut. Was liegen geblieben ist, wartet still in „Später“.')}
  <div class="sheet-illu">${illu('sunrise')}</div>
  <div class="sugg" style="max-width:none">
    ${open.map(t => `<button data-a="focusClose" data-id="${t.id}"><span class="em" style="--c:var(--now)">${ic('star')}</span><span>${esc(t.title)}</span><span class="m">${remainingMin(t)} Min</span></button>`).join('')}
    ${sg.map(t => { const i = initById(t.initiative); return `<button data-a="takeToday" data-id="${t.id}"><span class="em" style="--c:${i ? cvar(i.color) : 'var(--ink-3)'}">${i ? iIcon(i) : ic('sparkle')}</span><span>${esc(t.title)}</span><span class="m">${taskMin(t)} Min</span></button>`; }).join('')}
  </div>
  <div class="row end"><button class="btn ghost" data-a="capture">${ic('mic')} Etwas Neues</button><button class="btn primary" data-a="close">Gut so</button></div>`;
};

sheets.welcome = () => {
  const sg = suggest(3);
  return `${sheetHead('Schön, dass du wieder da bist.', 'Kein Rückstau, keine Liste von Verpasstem. Heute ist ein frischer, leerer Tag.')}
  <div class="sheet-illu">${illu('sunrise')}</div>
  <div class="field"><span class="lbl">Womit fangen wir an?</span>
  <div class="sugg" style="max-width:none">${sg.map(t => { const i = initById(t.initiative); return `<button data-a="takeToday" data-id="${t.id}"><span class="em" style="--c:${i ? cvar(i.color) : 'var(--ink-3)'}">${i ? iIcon(i) : ic('sparkle')}</span><span>${esc(t.title)}</span><span class="m">${taskMin(t)} Min</span></button>`; }).join('') || '<p class="muted">Alles leer. Fang mit dem an, was gerade im Kopf ist.</p>'}</div></div>
  <div class="row end"><button class="btn" data-a="capture">${ic('mic')} Was ist gerade im Kopf?</button><button class="btn primary" data-a="close">Los geht's</button></div>`;
};

sheets.suggestOne = () => {
  const t = sheet.data.tid ? taskById(sheet.data.tid) : suggest(1)[0];
  if (!t) return sheetHead('Gerade nichts da.');
  sheet.data.tid = t.id; const i = initById(t.initiative); const st = (t.steps || [])[0];
  return `${sheetHead('Wie wär’s damit?')}
  <div class="soft-card" style="--c:${i ? cvar(i.color) : 'var(--ink-3)'}">${initChip(t.initiative)}<h3 style="font-size:26px">${esc(t.title)}</h3>${st ? `<p>Erster Schritt: <b>${esc(st.text)}</b></p>` : ''}<p class="muted">≈ ${taskMin(t)} Min</p></div>
  <div class="row end"><button class="btn ghost" data-a="suggestAnother">Andere</button><button class="btn now" data-a="takeToday" data-id="${t.id}" data-go="1">${ic('play')} Jetzt machen</button></div>`;
};

sheets.initEdit = d => {
  const i = d.id ? initById(d.id) : { name: '', icon: 'sparkle', color: COLORS[S.initiatives.length % COLORS.length], why: '' };
  const cur = iKey(i);
  return `${sheetHead(d.id ? 'Initiative bearbeiten' : 'Neue Initiative', 'Ein Bereich, der dir wichtig ist. Kein Projektplan nötig.')}
  <form id="init-form" class="stack" data-id="${d.id || ''}">
    <div class="field"><label for="i-name">Name</label><input id="i-name" class="input" name="name" value="${esc(i.name)}" required placeholder="z. B. Masterarbeit" ${d.id ? '' : 'autofocus'}></div>
    <div class="field"><span class="lbl">Symbol</span><div class="row" style="gap:4px">${INIT_ICONS.map(e => `<label class="icon-pick" style="--c:${cvar(i.color)}"><input type="radio" name="icon" value="${e}" ${cur === e ? 'checked' : ''} class="sr" aria-label="${e}">${ic(e)}</label>`).join('')}</div></div>
    <div class="field"><span class="lbl">Farbe</span><div class="row" style="gap:8px">${COLORS.map(c => `<label style="cursor:pointer"><input type="radio" name="color" value="${c}" ${i.color === c ? 'checked' : ''} class="sr"><span class="color-sw" style="display:inline-block;width:34px;height:34px;border-radius:50%;background:${cvar(c)};box-shadow:${i.color === c ? '0 0 0 3px var(--surface),0 0 0 5px var(--ink)' : 'none'}"></span></label>`).join('')}</div></div>
    <div class="field"><label for="i-why">Warum ist mir das wichtig?</label><input id="i-why" class="input" name="why" value="${esc(i.why || '')}" placeholder="z. B. Damit ich im Sommer fertig bin und reisen kann"><span class="help">Wird im Fokusmodus angezeigt. Ein fernes Ziel motiviert besser, wenn man es sieht.</span></div>
    <label class="toggle"><span class="tx"><b>Fokus-Initiative</b><small>Vorschläge kommen zuerst von hier. Nur eine gleichzeitig.</small></span><input type="checkbox" class="switch" name="focus" ${i.focus ? 'checked' : ''}></label>
    <div class="row between">${d.id ? `<button type="button" class="btn ghost small" data-a="delInit" data-id="${d.id}">${ic('trash')} Entfernen</button>` : '<span></span>'}<button class="btn primary" type="submit">${ic('check')} Speichern</button></div>
  </form>`;
};

sheets.routineEdit = d => {
  const r = d.draft;
  return `${sheetHead(d.id ? 'Routine bearbeiten' : 'Neue Routine', 'Wenn ein Moment eintritt, dann folgt eine kurze Kette.')}
  <div class="field"><label for="r-name">Name</label><input id="r-name" class="input" data-rf="name" value="${esc(r.name)}" placeholder="z. B. Morgen-Start"></div>
  <div class="field"><label for="r-trig">Wenn …</label><input id="r-trig" class="input" data-rf="trigger" value="${esc(r.trigger)}" placeholder="z. B. ich aufgestanden bin"></div>
  <div class="field"><span class="lbl">… dann</span><div class="steps-ed">${r.steps.map((s, k) => `<div class="step-ed"><span class="n">${k + 1}</span><input class="txt" data-rk="${k}" data-f="text" value="${esc(s.text)}" aria-label="Schritt ${k + 1}"><span class="row" style="gap:4px;flex-wrap:nowrap"><input class="min" type="number" min="1" max="60" data-rk="${k}" data-f="min" value="${s.min}" aria-label="Minuten"><small class="muted">Min</small></span><span class="ops"><button class="icon-btn sm" data-a="rMove" data-k="${k}" data-d="-1" aria-label="Nach oben" ${k === 0 ? 'disabled' : ''}>${ic('up')}</button><button class="icon-btn sm" data-a="rMove" data-k="${k}" data-d="1" aria-label="Nach unten" ${k === r.steps.length - 1 ? 'disabled' : ''}>${ic('down')}</button><button class="icon-btn sm" data-a="rDel" data-k="${k}" aria-label="Entfernen">${ic('trash')}</button></span></div>`).join('')}</div>
  <button class="btn ghost small" data-a="rAdd" style="justify-self:start">${ic('plus')} Schritt</button></div>
  <div class="row between">${d.id ? `<button class="btn ghost small" data-a="rRemove" data-id="${d.id}">${ic('trash')} Routine löschen</button>` : '<span></span>'}<button class="btn primary" data-a="rSave">${ic('check')} Speichern</button></div>`;
};

sheets.settings = () => {
  const p = S.profile;
  const perm = 'Notification' in window ? Notification.permission : 'unsupported';
  return `${sheetHead('Einstellungen', 'Nur das Nötigste.')}
  <div class="field"><span class="lbl">Benachrichtigungen</span><div class="seg">${Object.entries(NOTIFY).map(([k, v]) => `<button data-a="setNotify" data-v="${k}" aria-pressed="${p.notify === k}">${v.t}<small>${v.d}</small></button>`).join('')}</div>
    <div class="row"><button class="btn ghost small" data-a="previewNotify">${ic('bell')} Vorschau</button>${perm === 'default' ? `<button class="btn ghost small" data-a="askPerm">Auch bei geschlossenem Tab erinnern</button>` : perm === 'granted' ? '<span class="muted" style="font-size:14px">System-Benachrichtigungen sind an.</span>' : ''}</div>
    <span class="help">Höchstens ${NOTIFY[p.notify].budget} pro Tag. Im Fokus bleibt alles still außer echten Terminen.</span></div>
  <div>
    <label class="toggle"><span class="tx"><b>Reizarm-Modus</b><small>Keine Animationen, gedämpfte Farben, keine Überraschungen</small></span><input type="checkbox" class="switch" data-a="setBool" data-k="reizarm" ${p.reizarm ? 'checked' : ''}></label>
    <label class="toggle"><span class="tx"><b>Töne</b><small>Sanfter Klang bei erledigten Schritten</small></span><input type="checkbox" class="switch" data-a="setBool" data-k="sound" ${p.sound ? 'checked' : ''}></label>
    <label class="toggle"><span class="tx"><b>Garten als Belohnung</b><small>Wächst mit jedem Schritt, schrumpft nie</small></span><input type="checkbox" class="switch" data-a="setReward" ${p.reward === 'garten' ? 'checked' : ''}></label>
  </div>
  <div class="field"><span class="lbl">Darstellung</span><div class="seg">${[['system', 'System'], ['light', 'Hell'], ['dark', 'Dunkel']].map(([k, l]) => `<button data-a="setTheme" data-v="${k}" aria-pressed="${p.theme === k}">${l}</button>`).join('')}</div></div>
  <div class="two"><div class="field"><label for="s-ds">Tag beginnt</label><input id="s-ds" class="input" type="time" data-set="dayStart" value="${p.dayStart}"></div><div class="field"><label for="s-de">Tag endet</label><input id="s-de" class="input" type="time" data-set="dayEnd" value="${p.dayEnd}"></div></div>
  <div class="field"><span class="lbl">Mein größtes Problem gerade</span><div class="seg">${PROBLEMS.map(x => `<button data-a="setProblem" data-v="${x.id}" aria-pressed="${p.problem === x.id}"><span class="em">${ic(x.em)}</span>${x.t}</button>`).join('')}</div><span class="help">Passt Startansicht, Detailgrad der Zerlegung und Anzahl der wichtigen Aufgaben an.</span></div>
  <div class="field"><span class="lbl">Datenschutz</span><p class="muted" style="font-size:15px">Alles bleibt auf diesem Gerät, in deinem Browser. Kein Konto, kein Server, kein Tracking.</p>
    <div class="row"><button class="btn small" data-a="export">${ic('copy')} Daten kopieren</button><button class="btn small" data-a="sheet" data-s="importData">Daten einfügen</button><button class="btn ghost small" data-a="sheet" data-s="reset">${ic('trash')} Alles löschen</button></div></div>
  <p class="muted" style="font-size:13.5px">Jetzt. ist eine Alltagsstütze und ersetzt keine Diagnostik, Medikation oder Therapie.</p>`;
};
sheets.importData = () => `${sheetHead('Daten einfügen', 'Füge hier eine zuvor kopierte Sicherung ein. Das ersetzt die aktuellen Daten.')}
  <textarea id="imp-text" class="input" placeholder="{ ... }" aria-label="Sicherung"></textarea>
  <div class="row end"><button class="btn ghost" data-a="close">Abbrechen</button><button class="btn primary" data-a="doImport">Einfügen</button></div>`;
sheets.reset = () => `${sheetHead('Alles löschen?', 'Aufgaben, Initiativen, Routinen und dein Garten werden von diesem Gerät entfernt. Das lässt sich nicht rückgängig machen.')}
  <div class="row end"><button class="btn" data-a="close">Lieber nicht</button><button class="btn primary" data-a="doReset">${ic('trash')} Ja, alles löschen</button></div>`;

/* ================= Onboarding (< 3 Min) ================= */
let onb = { step: 0, problem: null, picks: [], dump: '', notify: 'normal' };
function onbArt() {
  const cols = COLORS.map(cvar);
  let dots = '';
  [[150, 0.3], [150, 2.2], [150, 4.1], [112, 1.2], [112, 3.6], [112, 5.4]].forEach(([r, a], k) => { dots += `<circle cx="${(210 + Math.cos(a) * r).toFixed(1)}" cy="${(210 + Math.sin(a) * r).toFixed(1)}" r="${k < 3 ? 9 : 6}" style="fill:${cols[k]}"/>`; });
  return `<svg class="art" viewBox="0 0 420 420" aria-hidden="true"><defs><linearGradient id="oa" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFD27A"/><stop offset="1" stop-color="#F09A1A"/></linearGradient></defs>
    <circle cx="210" cy="210" r="190" fill="none" stroke="rgba(255,255,255,.05)" stroke-width="1"/>
    <g class="orbit"><circle cx="210" cy="210" r="150" fill="none" stroke="rgba(255,255,255,.09)" stroke-width="1" stroke-dasharray="2 6"/><circle cx="210" cy="210" r="112" fill="none" stroke="rgba(255,255,255,.08)" stroke-width="1"/>${dots}</g>
    <circle cx="210" cy="210" r="70" fill="none" stroke="rgba(255,255,255,.08)" stroke-width="14"/>
    <path d="M210 140a70 70 0 0170 70" fill="none" stroke="url(#oa)" stroke-width="14" stroke-linecap="round"/>
    <circle cx="210" cy="210" r="20" fill="url(#oa)"/></svg>`;
}
function onboarding() {
  const dots = `<div class="onb-steps" aria-label="Schritt ${onb.step + 1} von 4">${[0, 1, 2, 3].map(k => `<i class="${k <= onb.step ? 'on' : ''}"></i>`).join('')}</div>`;
  let body = '';
  if (onb.step === 0) body = `<div class="onb-hero"><h1>Ein nächster Schritt.<br><em>Nicht vierzig.</em></h1><p>Ein ruhiger Planer für Köpfe mit ADHS. Er merkt sich, plant um und schlägt vor. Du bestätigst nur.</p></div>
    <div class="field"><span class="lbl" style="font-size:15px">Was ist gerade dein größtes Problem?</span>
    <div class="choice">${PROBLEMS.map(x => `<button data-a="onbProblem" data-v="${x.id}" aria-pressed="${onb.problem === x.id}"><span class="em">${ic(x.em)}</span><b>${x.t}</b><small>${x.d}</small></button>`).join('')}</div></div>
    <div class="row between"><button class="btn ghost" data-a="demo">${ic('sparkle')} Beispieltag ansehen</button><button class="btn primary big" data-a="onbNext" ${onb.problem ? '' : 'disabled'}>Weiter ${ic('arrow')}</button></div>`;
  if (onb.step === 1) body = `<div class="onb-hero"><span class="eyebrow">Initiativen</span><h2>Worauf willst du dich konzentrieren?</h2><p>Wähle 2 bis 4 Bereiche. Keine Ordner, keine Unterprojekte. Du kannst sie später umbenennen.</p></div>
    <div class="preset-grid">${PRESETS.map((x, k) => `<button data-a="onbPick" data-k="${k}" aria-pressed="${onb.picks.includes(k)}" style="--c:${cvar(x.color)}"><span class="em" style="--c:${cvar(x.color)}">${ic(x.icon)}</span>${esc(x.name)}</button>`).join('')}</div>
    <div class="row between"><button class="btn ghost" data-a="onbBack">Zurück</button><button class="btn primary big" data-a="onbNext" ${onb.picks.length ? '' : 'disabled'}>Weiter ${ic('arrow')}</button></div>`;
  if (onb.step === 2) body = `<div class="onb-hero"><span class="eyebrow">Brain-Dump</span><h2>Sag mir alles, was dir im Kopf herumschwirrt.</h2><p>Durcheinander ist okay. Komma oder neue Zeile trennt die Dinge. Ich sortiere und zerlege in kleine Schritte.</p></div>
    <textarea id="onb-dump" class="input" style="min-height:160px" placeholder="Steuer anfangen, Zahnarzt um 16:30, Wäsche, Mama zurückrufen 10 min, Bewerbung schreiben">${esc(onb.dump)}</textarea>
    <div class="row between"><button class="btn ghost" data-a="onbBack">Zurück</button><div class="row"><button class="btn ghost" data-a="onbNext" data-skip="1">Überspringen</button><button class="btn primary big" data-a="onbNext">Sortieren ${ic('arrow')}</button></div></div>`;
  if (onb.step === 3) body = `<div class="onb-hero"><span class="eyebrow">Erinnerungen</span><h2>Wie soll ich dich erinnern?</h2><p>Wenige, dafür verlässliche Hinweise, jeder mit einer direkten Aktion. Jederzeit änderbar.</p></div>
    <div class="choice">${Object.entries(NOTIFY).map(([k, v]) => `<button data-a="onbNotify" data-v="${k}" aria-pressed="${onb.notify === k}"><span class="em">${ic(k === 'sanft' ? 'leaf' : k === 'normal' ? 'bell' : 'megaphone')}</span><b>${v.t}</b><small>${v.d} · höchstens ${v.budget} pro Tag</small></button>`).join('')}</div>
    <div class="onb-preview ${onb.notify === 'sanft' ? 'gentle' : ''}"><span class="eyebrow">Vorschau</span><div>${onb.notify === 'sanft' ? 'Bereit für den nächsten kleinen Schritt?' : onb.notify === 'normal' ? 'In 10 Minuten: Zahnarzt. Zeit für den Übergang.' : 'Noch dabei bei „Steuer“? Weitermachen, Pause oder neu planen?'}</div><div class="row"><button class="btn small ${onb.notify === 'sanft' ? '' : 'now'}" tabindex="-1">Starten</button><button class="btn small" tabindex="-1">5 Min später</button></div></div>
    <div class="row between"><button class="btn ghost" data-a="onbBack">Zurück</button><button class="btn now big" data-a="onbFinish">${ic('play')} Los geht's</button></div>`;
  return `<div class="onb">
    <aside class="onb-art"><div class="brand">${MARK}<span>Jetzt<i>.</i></span></div>${onb.step === 0 ? onbArt() : `<div class="art-wrap">${illu(['', 'paths', 'dump', 'bell'][onb.step])}</div>`}
      <div><blockquote>Die App übernimmt die Selbststeuerung. Du bestätigst nur.</blockquote>
      <ul><li>${ic('check')} Ein nächster Schritt statt einer Liste</li><li>${ic('check')} Zeit wird sichtbar, nicht abstrakt</li><li>${ic('check')} Neustart ohne Schuld, kein „überfällig“</li></ul></div></aside>
    <div class="onb-main"><div class="onb-card"><div class="onb-top"><div class="brand">${MARK}<span>Jetzt<i>.</i></span></div>${dots}</div><div class="onb-illu">${illu(['sunrise', 'paths', 'dump', 'bell'][onb.step])}</div>${body}</div></div></div>`;
}
function applyProblem(p) {
  S.profile.problem = p;
  S.profile.detail = p === 'start' ? 4 : p === 'overwhelm' ? 5 : 3;
  S.profile.maxImp = p === 'overwhelm' ? 1 : 3;
  if (p === 'forget' && S.profile.notify === 'sanft') S.profile.notify = 'normal';
}
function finishOnboarding() {
  applyProblem(onb.problem || 'start');
  S.profile.notify = onb.notify;
  S.initiatives = onb.picks.map((k, n) => ({ id: uid(), name: PRESETS[k].name, icon: PRESETS[k].icon, color: PRESETS[k].color, kw: PRESETS[k].kw, why: '', focus: n === 0, grown: 0 }));
  if (onb.dump.trim()) {
    const items = splitDump(onb.dump).map(parseItem);
    let imp = 0, count = 0;
    items.forEach(it => {
      if (it.type === 'note') { S.notes.push({ id: uid(), text: it.title, created: Date.now() }); return; }
      if (it.type === 'event') { S.tasks.push(newTask({ type: 'event', title: it.title, time: it.time, minutes: it.minutes || 45, date: it.date, initiative: it.initiative })); return; }
      const t = newTask({ title: it.title, initiative: it.initiative, date: it.date });
      t.steps = fitSteps(breakdown(t.title, S.profile.detail), it.minutes); t.minutes = t.steps.reduce((a, s) => a + s.min, 0);
      if (it.date === T()) { count++; if (imp < S.profile.maxImp) { t.important = true; imp++; } else if (count > S.profile.maxImp + 2) t.status = 'later'; }
      S.tasks.push(t);
    });
  }
  S.routines = defaultRoutines();
  S.onboarded = true; S.lastDay = T(); today().checkin = true;
  S.ui.view = S.profile.problem === 'time' ? 'tag' : 'jetzt';
  save(); render();
  toast('Fertig eingerichtet. Oben steht immer nur, was jetzt dran ist.', { gentle: true, ms: 5000 });
}
function defaultRoutines() {
  return [
    { id: uid(), name: 'Morgen-Start', trigger: 'ich aufgestanden bin', count: 0, steps: [{ text: 'Ein Glas Wasser', min: 1 }, { text: 'Tabletten nehmen', min: 1 }, { text: 'Anziehen', min: 6 }, { text: 'Kurz in „Jetzt.“ schauen', min: 2 }] },
    { id: uid(), name: 'Feierabend', trigger: 'ich den Laptop zuklappe', count: 0, steps: [{ text: 'Notieren, wo ich morgen weitermache', min: 2 }, { text: 'Schreibtisch grob frei räumen', min: 3 }, { text: 'Tag abschließen', min: 1 }] },
  ];
}
function loadDemo() {
  applyProblem('start');
  const I = (k, why, focus) => ({ id: uid(), name: PRESETS[k].name, icon: PRESETS[k].icon, color: PRESETS[k].color, kw: PRESETS[k].kw, why, focus, grown: 0 });
  const study = I(4, 'Damit ich im Sommer fertig bin und reisen kann', true); study.name = 'Masterarbeit';
  const health = I(1, 'Mehr Energie für alles andere', false);
  const home = I(2, '', false);
  const money = I(3, 'Kein Brief-Stapel mehr, der mich nervös macht', false);
  study.grown = 14; health.grown = 6; home.grown = 9; money.grown = 3;
  S.initiatives = [study, health, home, money];
  const now = nowMin();
  const mk = (o, lv) => { const t = newTask(o); t.steps = breakdown(t.title, lv || 4); t.minutes = t.steps.reduce((a, s) => a + s.min, 0); return t; };
  const a = mk({ title: 'Kapitel 2 gliedern und anfangen', initiative: study.id, important: true, ifthen: 'ich vom Mittagessen zurück bin', order: 1 }, 3);
  a.steps[0].done = true;
  const b = mk({ title: 'Steuererklärung anfangen', initiative: money.id, important: true, order: 2, deadline: addDays(T(), 9) }, 3);
  const c = mk({ title: 'Wäsche aufhängen', initiative: home.id, energy: 'low', order: 3 }, 2);
  const e = mk({ title: 'Mama zurückrufen', initiative: null, energy: 'low', order: 4 }, 2);
  const evT = Math.ceil((now + 75) / 15) * 15;
  const tasks = [a, b, c, e];
  if (evT < 21 * 60) tasks.push(newTask({ type: 'event', title: 'Zahnarzt Dr. Ahmadi', time: hm(evT), minutes: 45, initiative: health.id }));
  const l1 = mk({ title: 'Laufschuhe kaufen', initiative: health.id, status: 'later', energy: 'mid' }, 2);
  const l2 = mk({ title: 'Fahrrad reparieren', initiative: home.id, status: 'later' }, 2);
  const l3 = mk({ title: 'Literaturliste ordnen', initiative: study.id, status: 'later', energy: 'low' }, 3);
  const l4 = mk({ title: 'Handyvertrag kündigen', initiative: money.id, status: 'later' }, 2);
  const d1 = newTask({ title: 'Spülmaschine ausräumen', initiative: home.id, status: 'done', doneDay: T(), doneAt: Date.now() - 3600e3 });
  S.tasks = tasks.concat([l1, l2, l3, l4, d1]);
  S.notes = [{ id: uid(), text: 'Geschenkidee für Jana: das Buch über Pilze', created: Date.now() }];
  S.routines = defaultRoutines(); S.routines[0].count = 11; S.routines[1].count = 4;
  S.growth = 32; S.bonus = 2; S.onboarded = true; S.lastDay = T();
  today().steps = 4; today().checkin = true; today().energy = 'mid';
  S.ui.view = 'jetzt'; save(); render();
  toast('Das ist ein Beispieltag. Unter Einstellungen kannst du alles löschen und neu anfangen.', { gentle: true, ms: 6500 });
}

/* ================= Events ================= */
document.addEventListener('click', e => {
  const el = e.target.closest('[data-a]'); if (!el) return;
  const a = el.dataset.a, id = el.dataset.id;
  if (el.tagName === 'INPUT') return; // Schalter laufen über change
  switch (a) {
    case 'view': S.ui.view = el.dataset.v; sheet = null; save(); render(); window.scrollTo(0, 0); break;
    case 'capture': capture = { text: '', items: [] }; openSheet('capture', { init: el.dataset.init || null }); break;
    case 'sheet': {
      const s = el.dataset.s;
      if (s === 'routineEdit') { const r = id ? S.routines.find(x => x.id === id) : null; openSheet(s, { id, draft: r ? JSON.parse(JSON.stringify(r)) : { name: '', trigger: '', steps: [{ text: '', min: 2 }] } }); }
      else openSheet(s, { id, new: el.dataset.new });
      break;
    }
    case 'close': closeSheet(); break;
    case 'focus': sheet = null; startFocus(id); break;
    case 'focusClose': sheet = null; startFocus(id); break;
    case 'defer': defer(id); break;
    case 'smaller': makeSmaller(id); break;
    case 'swap': { const t = taskById(id); const alt = suggest(1, laterTasks().filter(x => x.id !== id))[0]; if (t) { t.order = Date.now() + 1e6; } if (alt) { alt.status = 'today'; alt.date = T(); alt.order = 0; } sheet = null; save(); render(); toast(alt ? `Wie wär’s stattdessen mit „${alt.title}“?` : 'Ich habe die Reihenfolge getauscht.', { gentle: true }); break; }
    case 'breakdown': openBreakdown(id, el.dataset.lv ? +el.dataset.lv : null); break;
    case 'complete': { const t = taskById(id); if (!t) break; if (t.status === 'done') break; sheet = null; completeTask(t, el); break; }
    case 'step': toggleStep(id, el.dataset.s, el); break;
    case 'star': {
      const t = taskById(id); if (!t) break;
      if (!t.important && todayTasks().filter(x => x.important).length >= S.profile.maxImp) { toast(`Höchstens ${S.profile.maxImp} wichtige Dinge pro Tag. Nimm erst eins raus, wenn du tauschen willst.`, { gentle: true }); break; }
      t.important = !t.important; save(); render(); break;
    }
    case 'move': {
      const list = openToday(); const t = taskById(id); const grp = list.filter(x => x.important === t.important); const k = grp.indexOf(t); const j = k + (+el.dataset.d);
      if (j < 0 || j >= grp.length) break; grp.forEach((x, n) => x.order = n); const o = grp[j]; [t.order, o.order] = [o.order, t.order]; save(); render(); break;
    }
    case 'trim': { const rest = openToday().filter(t => !t.important); const sc = schedule(); let over = sc.planned - sc.available; const moved = []; for (const t of rest.reverse()) { if (over <= 0) break; t.status = 'later'; over -= remainingMin(t); moved.push(t.title); } if (over > 0) { const imp = openToday().filter(t => t.important); const last = imp[imp.length - 1]; if (last && imp.length > 1) { last.status = 'later'; last.important = false; moved.push(last.title); } } save(); render(); toast(moved.length ? `In „Später“ gelegt: ${moved.join(', ')}. Der Tag passt jetzt besser.` : 'Der Rest ist schon das Wichtigste. Plane großzügig, nicht perfekt.', { gentle: true, ms: 5500 }); break; }
    case 'restart': restartDay(); break;
    case 'takeToday': {
      const t = taskById(id); if (!t) break; t.status = 'today'; t.date = T(); t.order = el.dataset.go || !el.dataset.stay ? -Date.now() : Date.now();
      if (!t.steps.length) t.steps = breakdown(t.title, S.profile.detail);
      save();
      if (el.dataset.stay) { render(); break; }
      sheet = null; S.ui.welcomeBack = false; S.ui.view = 'jetzt'; save();
      if (el.dataset.go) startFocus(id); else { render(); window.scrollTo(0, 0); }
      break;
    }
    case 'toLater': { const t = taskById(id); if (t) { t.status = 'later'; t.important = false; } save(); render(); break; }
    case 'drop': {
      const t = taskById(id); if (!t) break;
      S.tasks = S.tasks.filter(x => x.id !== id);
      if (S.focus && S.focus.taskId === id) S.focus = null;
      save(); if (!el.dataset.stay) sheet = null; render(); toast(t.type === 'event' ? 'Termin entfernt.' : 'Weg damit. Ein Gedanke weniger.', { gentle: true, ms: 2500 }); break;
    }
    case 'dropNote': S.notes = S.notes.filter(n => n.id !== id); save(); render(); break;
    case 'askSomeone': { const t = taskById(id); if (t) { t.steps.unshift({ id: uid(), text: `Kurze Nachricht schreiben: „Kannst du mir bei ${t.title} helfen?“`, min: 3, done: false }); t.status = 'today'; t.date = T(); t.order = -Date.now(); } sheet = null; save(); render(); toast('Neuer erster Schritt: um Hilfe fragen. Das ist kein Aufgeben, das ist klug.', { gentle: true }); break; }
    case 'initGo': { const i = initById(id); const tasks = S.tasks.filter(t => t.initiative === id && t.type === 'task' && t.status !== 'done'); const t = tasks.find(x => x.status === 'today') || tasks[0]; if (t) { t.status = 'today'; t.date = T(); t.order = -Date.now(); if (!t.steps.length) t.steps = breakdown(t.title, S.profile.detail); S.ui.view = 'jetzt'; save(); render(); window.scrollTo(0, 0); toast(`${i.name}: „${t.title}“ steht jetzt oben.`, { gentle: true }); } break; }
    case 'delInit': S.initiatives = S.initiatives.filter(i => i.id !== id); S.tasks.forEach(t => { if (t.initiative === id) t.initiative = null; }); sheet = null; save(); render(); break;
    case 'runRoutine': { const r = S.routines.find(x => x.id === id); if (!r || !r.steps.length) break; S.focus = { routine: true, routineId: id, idx: 0, total: r.steps[0].min * 60, elapsed: 0, since: Date.now(), paused: false }; ctx(); holdWake(); save(); render(); break; }
    case 'rNext': case 'rSkip': {
      const f = S.focus; const r = S.routines.find(x => x.id === f.routineId); if (!r) break;
      if (a === 'rNext') { S.growth++; today().steps++; chime('step'); burst(el); }
      if (f.idx >= r.steps.length - 1) { r.count = (r.count || 0) + 1; S.routinesDone++; S.focus = null; releaseWake(); chime('done'); save(); render(); toast(`${r.name} geschafft. Schon ${r.count}× insgesamt.`, { gentle: true }); break; }
      f.idx++; f.total = r.steps[f.idx].min * 60; f.elapsed = 0; f.since = Date.now(); f.paused = false; save(); render(); break;
    }
    case 'exitFocus': exitFocus(); break;
    case 'exitPlan': exitFocus(); S.ui.view = 'tag'; save(); render(); break;
    case 'pause': { const f = S.focus; if (!f) break; if (f.paused) { f.paused = false; f.since = Date.now(); } else { f.elapsed += (Date.now() - f.since) / 1000; f.paused = true; } save(); render(); break; }
    case 'addTime': { const f = S.focus; if (!f) break; const left = focusLeft(); if (left <= 0) { f.elapsed = 0; f.total = (+el.dataset.m) * 60; f.since = Date.now(); f.paused = false; f.chimed = false; } else f.total += (+el.dataset.m) * 60; save(); render(); break; }
    case 'noise': { const f = S.focus; const order = [null, 'brown', 'rain']; f.noise = order[(order.indexOf(f.noise) + 1) % 3]; if (f.noise) startNoise(f.noise); else stopNoise(); save(); render(); break; }
    case 'buddy': S.focus.buddy = !S.focus.buddy; save(); render(); break;
    case 'toast': { const d = el.dataset.do; el.closest('.toast').remove(); if (d.startsWith('focus:')) startFocus(d.slice(6)); else if (d.startsWith('view:')) { S.ui.view = d.slice(5); render(); } else if (d.startsWith('breakdown:')) openBreakdown(d.slice(10)); break; }
    // Erfassen
    case 'mic': toggleMic(); break;
    case 'capType': { const it = capture.items[+el.dataset.k]; it.type = el.dataset.v; if (it.type === 'event' && !it.time) it.time = hm(Math.ceil((nowMin() + 60) / 15) * 15); sheet.data.noFocus = true; render(); break; }
    case 'capWhen': { const it = capture.items[+el.dataset.k]; it.when = it.when === 'later' ? 'today' : 'later'; sheet.data.noFocus = true; render(); break; }
    case 'capInit': { const it = capture.items[+el.dataset.k]; it.initiative = it.initiative === id ? null : id; sheet.data.noFocus = true; render(); break; }
    case 'capSave': saveCapture(); break;
    // Zerlegen
    case 'bdMove': { const st = sheet.data.steps; const k = +el.dataset.k, j = k + (+el.dataset.d); [st[k], st[j]] = [st[j], st[k]]; render(); break; }
    case 'bdDel': sheet.data.steps.splice(+el.dataset.k, 1); render(); break;
    case 'bdAdd': sheet.data.steps.push({ id: uid(), text: 'Neuer Schritt', min: 5, done: false }); render(); setTimeout(() => { const ins = document.querySelectorAll('.step-ed input.txt'); const l = ins[ins.length - 1]; l && (l.focus(), l.select()); }, 20); break;
    case 'bdSave': { const t = taskById(sheet.data.id); if (t) { t.steps = sheet.data.steps.filter(s => s.text.trim()); t.minutes = t.steps.reduce((x, s) => x + (+s.min || 0), 0) || t.minutes; if (t.status === 'later' && sheet.data.fromAvoid) { t.status = 'today'; } } sheet = null; save(); render(); toast('Schritte gespeichert.', { gentle: true, ms: 2000 }); break; }
    // Routinen-Editor
    case 'rMove': { const st = sheet.data.draft.steps; const k = +el.dataset.k, j = k + (+el.dataset.d); [st[k], st[j]] = [st[j], st[k]]; render(); break; }
    case 'rDel': sheet.data.draft.steps.splice(+el.dataset.k, 1); render(); break;
    case 'rAdd': sheet.data.draft.steps.push({ text: '', min: 2 }); render(); setTimeout(() => { const ins = document.querySelectorAll('.step-ed input.txt'); const l = ins[ins.length - 1]; l && l.focus(); }, 20); break;
    case 'rSave': { const d = sheet.data.draft; d.steps = d.steps.filter(s => s.text.trim()); if (!d.name.trim() || !d.steps.length) { toast('Ein Name und mindestens ein Schritt, dann passt es.', { gentle: true }); break; } if (!d.trigger.trim()) d.trigger = 'es Zeit ist'; if (sheet.data.id) { const k = S.routines.findIndex(r => r.id === sheet.data.id); S.routines[k] = d; } else { d.id = uid(); d.count = 0; S.routines.push(d); } sheet = null; save(); render(); break; }
    case 'rRemove': S.routines = S.routines.filter(r => r.id !== id); sheet = null; save(); render(); break;
    // Morgen & Abend
    case 'energy': today().energy = el.dataset.v; save(); render(); break;
    case 'morningDone': { const inp = $('#m-if'); if (inp && inp.value.trim()) { const t = taskById(inp.dataset.id); if (t) t.ifthen = inp.value.trim(); } today().checkin = true; S.tasks.forEach(t => { t.carried = false; }); sheet = null; save(); render(); toast('Dein Tag steht. Oben ist immer nur das Nächste.', { gentle: true }); break; }
    case 'eveningDone': { const r = $('#ev-r'); today().reflection = r ? r.value.trim() : ''; today().review = true; sheet = null; save(); render(); toast('Schönen Abend. Morgen geht es frisch weiter.', { gentle: true }); break; }
    case 'suggestAnother': { const cur = sheet.data.tid; const alt = suggest(3).filter(t => t.id !== cur); sheet.data.tid = alt.length ? pick(alt).id : cur; render(); break; }
    // Einstellungen
    case 'setNotify': S.profile.notify = el.dataset.v; save(); render(); break;
    case 'previewNotify': { const st = S.profile.notify; toast(st === 'sanft' ? 'Bereit für den nächsten kleinen Schritt?' : st === 'normal' ? 'In 10 Minuten: Termin. Zeit für den Übergang.' : 'Noch dabei? Weitermachen, Pause oder neu planen?', { gentle: st === 'sanft', actions: [['Starten', 'dismiss'], ['5 Min später', 'dismiss']] }); if (st !== 'sanft') chime('soft'); break; }
    case 'askPerm': try { Notification.requestPermission().then(() => render()); } catch (err) { } break;
    case 'setTheme': S.profile.theme = el.dataset.v; S._themeTouched = true; save(); render(); break;
    case 'setProblem': applyProblem(el.dataset.v); save(); render(); break;
    case 'export': { const data = JSON.stringify(S); const done = () => toast('Sicherung in die Zwischenablage kopiert.', { gentle: true }); try { navigator.clipboard.writeText(data).then(done, () => showExport(data)); } catch (err) { showExport(data); } break; }
    case 'doImport': { try { const d = JSON.parse($('#imp-text').value); if (!d || !Array.isArray(d.tasks)) throw new Error('x'); localStorage.setItem(KEY, JSON.stringify(d)); load(); sheet = null; render(); toast('Daten eingefügt.', { gentle: true }); } catch (err) { toast('Das sieht nicht nach einer Jetzt.-Sicherung aus. Bitte den ganzen kopierten Text einfügen.', { gentle: true }); } break; }
    case 'doReset': try { localStorage.removeItem(KEY); } catch (err) { } S = base(); onb = { step: 0, problem: null, picks: [], dump: '', notify: 'normal' }; sheet = null; render(); break;
    // Onboarding
    case 'onbProblem': onb.problem = el.dataset.v; render(); break;
    case 'onbPick': { const k = +el.dataset.k; const i = onb.picks.indexOf(k); if (i >= 0) onb.picks.splice(i, 1); else if (onb.picks.length < 4) onb.picks.push(k); render(); break; }
    case 'onbNext': { const ta = $('#onb-dump'); if (ta) onb.dump = el.dataset.skip ? '' : ta.value; onb.step++; render(); window.scrollTo(0, 0); const n = $('#onb-dump'); n && n.focus(); break; }
    case 'onbBack': { const ta = $('#onb-dump'); if (ta) onb.dump = ta.value; onb.step = Math.max(0, onb.step - 1); render(); break; }
    case 'onbNotify': onb.notify = el.dataset.v; render(); break;
    case 'onbFinish': finishOnboarding(); break;
    case 'demo': loadDemo(); break;
  }
});
function showExport(data) { openSheet('importData'); setTimeout(() => { const ta = $('#imp-text'); if (ta) { ta.value = data; ta.select(); } toast('Text ist markiert. Kopiere ihn mit Strg/Cmd + C.', { gentle: true }); }, 50); }

document.addEventListener('input', e => {
  const el = e.target;
  if (el.id === 'cap-text') { refreshCapture(el.value); clearTimeout(window.__capT); window.__capT = setTimeout(renderCapturePreview, 450); return; }
  if (el.id === 'bd-level') { const d = sheet.data; d.level = +el.value; const t = taskById(d.id); d.steps = breakdown(t.title, d.level); render(); const r = $('#bd-level'); r && r.focus(); return; }
  if (sheet && sheet.name === 'breakdown' && el.dataset.k != null && el.dataset.f) { const s = sheet.data.steps[+el.dataset.k]; s[el.dataset.f] = el.dataset.f === 'min' ? clamp(+el.value || 1, 1, 240) : el.value; return; }
  if (sheet && sheet.name === 'routineEdit') { const d = sheet.data.draft; if (el.dataset.rf) d[el.dataset.rf] = el.value; if (el.dataset.rk != null) { const s = d.steps[+el.dataset.rk]; s[el.dataset.f] = el.dataset.f === 'min' ? clamp(+el.value || 1, 1, 120) : el.value; } }
});
document.addEventListener('change', e => {
  const el = e.target;
  if (el.dataset.a === 'setBool') { S.profile[el.dataset.k] = el.checked; save(); render(); }
  if (el.dataset.a === 'setReward') { S.profile.reward = el.checked ? 'garten' : 'ruhig'; save(); render(); }
  if (el.dataset.set) { if (parseHM(el.value) != null) { S.profile[el.dataset.set] = el.value; save(); } }
  if (el.closest('#init-form') && (el.name === 'icon' || el.name === 'color')) {
    const f = el.closest('#init-form'); f.querySelectorAll('.color-sw').forEach(sw => { const inp = sw.previousElementSibling; sw.style.boxShadow = inp.checked ? '0 0 0 3px var(--surface),0 0 0 5px var(--ink)' : 'none'; });
    f.querySelectorAll('input[name=icon]').forEach(inp => { inp.parentElement.classList.toggle('on', inp.checked); });
  }
});
document.addEventListener('submit', e => {
  e.preventDefault();
  const f = e.target; const fd = new FormData(f);
  if (f.id === 'edit-form') {
    const id = f.dataset.id; const type = f.dataset.type;
    let t = id ? taskById(id) : null;
    const title = (fd.get('title') || '').trim(); if (!title) return;
    if (!t) { t = newTask({ type, title }); if (type === 'task') t.steps = breakdown(title, S.profile.detail); S.tasks.push(t); }
    t.title = title; t.minutes = clamp(+fd.get('minutes') || 25, 5, 480); t.initiative = fd.get('initiative') || null;
    if (type === 'event') { t.time = fd.get('time') || t.time; t.date = fd.get('date') || T(); }
    else { t.energy = fd.get('energy') || 'mid'; t.ifthen = (fd.get('ifthen') || '').trim(); t.deadline = fd.get('deadline') || ''; }
    sheet = null; save(); render(); toast('Gespeichert.', { gentle: true, ms: 1800 });
  }
  if (f.id === 'init-form') {
    const id = f.dataset.id; const name = (fd.get('name') || '').trim(); if (!name) return;
    let i = id ? initById(id) : null;
    if (!i) { i = { id: uid(), grown: 0, kw: [] }; S.initiatives.push(i); }
    i.name = name; i.icon = fd.get('icon') || 'sparkle'; i.color = fd.get('color') || 'sage'; i.why = (fd.get('why') || '').trim();
    const foc = !!fd.get('focus'); if (foc) S.initiatives.forEach(x => { x.focus = false; }); i.focus = foc;
    const pre = PRESETS.find(p => name.toLowerCase().includes(p.name.split(' ')[0].toLowerCase())); if (pre && !(i.kw || []).length) i.kw = pre.kw;
    sheet = null; save(); render();
  }
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { if (sheet) closeSheet(); else if (S.focus) exitFocus(); return; }
  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && sheet && sheet.name === 'capture' && capture.items.length) { e.preventDefault(); saveCapture(); return; }
  const tag = (e.target.tagName || '').toLowerCase();
  if (tag === 'input' || tag === 'textarea' || tag === 'select' || sheet || S.focus || !S.onboarded) return;
  if (e.key === 'n' || e.key === '+') { e.preventDefault(); capture = { text: '', items: [] }; openSheet('capture', {}); }
  if (e.key === ' ' && S.ui.view === 'jetzt') { const t = currentTask(); if (t) { e.preventDefault(); startFocus(t.id); } }
});

/* ================= Takt ================= */
let hiddenAt = null;
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { hiddenAt = Date.now(); if (S.focus) save(); return; }
  if (S.focus && !S.focus.routine && hiddenAt && Date.now() - hiddenAt > 45e3) {
    const t = taskById(S.focus.taskId); const st = t && nextStep(t);
    if (t) toast(`Willkommen zurück. Weiter mit: ${st ? st.text : t.title}`, { gentle: true });
    if (S.focus.paused === false) holdWake();
  }
  hiddenAt = null;
  const before = S.lastDay; rollover(); if (before !== S.lastDay) render();
});
setInterval(() => {
  const f = S.focus; if (!f || f.paused) return;
  const left = focusLeft(); const tEl = $('#f-time'), fill = $('#f-fill');
  if (tEl) tEl.textContent = `${pad(Math.floor(left / 60))}:${pad(Math.floor(left % 60))}`;
  if (fill) { const C = +fill.dataset.c; fill.style.strokeDashoffset = (C * (1 - left / f.total)).toFixed(2); }
  if (left <= 0 && !f.chimed) {
    f.chimed = true; save(); chime('done');
    if (f.routine) { toast('Zeit für diesen Schritt ist um. Weiter, wenn du so weit bist.', { gentle: true }); }
    else { render(); try { if (document.hidden && 'Notification' in window && Notification.permission === 'granted') new Notification('Jetzt.', { body: 'Deine Fokuszeit ist um. Weitermachen, Pause oder neu planen?', icon: 'icon.svg' }); } catch (e) { } }
  }
}, 1000);
setInterval(() => {
  if (!S.onboarded) return;
  const before = S.lastDay; rollover();
  checkTransitions();
  const busy = sheet || S.focus || ['input', 'textarea', 'select'].includes((document.activeElement || {}).tagName?.toLowerCase());
  if (before !== S.lastDay || (!busy && (S.ui.view === 'jetzt' || S.ui.view === 'tag'))) render();
}, 30e3);

/* ================= Start ================= */
load();
rollover();
render();
if (S.onboarded) {
  if (S.ui.welcomeBack) { S.ui.welcomeBack = false; save(); openSheet('welcome'); }
  else if (!today().checkin && new Date().getHours() >= 4 && new Date().getHours() < 13 && todayTasks().length + laterTasks().length > 0) openSheet('morning');
}
S.lastSeen = Date.now(); save();
if ('serviceWorker' in navigator && !inArtifact && location.protocol.startsWith('http')) { navigator.serviceWorker.register('sw.js').catch(() => { }); }
window.addEventListener('beforeunload', () => { if (S.focus) save(); });
})();
