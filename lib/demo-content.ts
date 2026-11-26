// Inhalte der eingebauten Demo-Ausspielorte (/demo/...). Sie simulieren eine lokale
// Herstellerseite, Partnerportal-PDFs und ein login-geschütztes Portal, damit der
// Prüf-Workflow ohne externe Systeme getestet werden kann.

export const TEXTS = {
  gar: {
    de: {
      old: "5 Jahre Herstellergarantie bei Registrierung innerhalb von 30 Tagen nach Kauf. Es gelten die Garantiebedingungen unter nordhaven.example/garantie.",
      new: "5 Jahre Herstellergarantie bei Registrierung innerhalb von 60 Tagen nach Kauf. Es gelten die Garantiebedingungen in der Fassung vom 01.12.2026 unter nordhaven.example/garantie.",
    },
    fr: {
      old: "Garantie fabricant de 5 ans sous réserve d'enregistrement dans les 30 jours suivant l'achat. Conditions de garantie sur nordhaven.example/fr/garantie.",
      new: "Garantie fabricant de 5 ans sous réserve d'enregistrement dans les 60 jours suivant l'achat. Conditions de garantie en vigueur au 01/12/2026 sur nordhaven.example/fr/garantie.",
    },
    oldVersion: "PT-GAR-2026.1",
    newVersion: "PT-GAR-2026.2",
  },
  claim: {
    de: {
      old: "Die leiseste Waschmaschine ihrer Klasse.",
      new: "Eine der leisesten Waschmaschinen ihrer Klasse.¹",
    },
    oldVersion: "CL-LEISE-v3",
    newVersion: "CL-LEISE-v4",
  },
} as const;

export type DemoDoc =
  | { kind: "html"; title: string; lang: string; body: string }
  | { kind: "pdf"; title: string; body: string }
  | { kind: "forbidden"; title: string };

export const DEMO_PATHS = {
  deSite: "/demo/de/w7",
  dePdf: "/demo/de/partnerportal/datenblatt-w7.pdf",
  frSite: "/demo/fr/w7",
  frPdf: "/demo/fr/portail-partenaires/fiche-w7.pdf",
} as const;

export const DEMO_DEFAULT_STATE: Record<string, "alt" | "neu"> = {
  [DEMO_PATHS.deSite]: "neu",
  [DEMO_PATHS.dePdf]: "alt",
  [DEMO_PATHS.frSite]: "alt",
  [DEMO_PATHS.frPdf]: "alt",
};

export function demoDocument(path: string, state: "alt" | "neu"): DemoDoc | null {
  const g = TEXTS.gar;
  const c = TEXTS.claim;
  const isNew = state === "neu";
  switch (path) {
    case DEMO_PATHS.deSite:
      return {
        kind: "html",
        lang: "de",
        title: "Nordhaven W7 Waschmaschine – Produktdetails",
        body: `<h1>Nordhaven W7 – 9 kg Frontlader</h1>
<p class="claim">${isNew ? c.de.new : c.de.old}</p>
<ul><li>Energieeffizienzklasse A</li><li>1.400 U/min</li><li>Dampfprogramm &amp; Nachlegefunktion</li></ul>
<p>Jetzt bei teilnehmenden Händlern erhältlich. UVP 899&nbsp;€.</p>
<footer><p class="legal">${isNew ? g.de.new : g.de.old}</p>
${isNew ? "<p class=\"legal\">¹ Geräuschpegel Schleudern 69 dB(A), Vergleich mit 9-kg-Frontladern der Energieeffizienzklasse A, Stand 10/2026.</p>" : ""}</footer>`,
      };
    case DEMO_PATHS.dePdf:
      return {
        kind: "pdf",
        title: "Händler-Datenblatt Nordhaven W7 (DE)",
        body: `Produkt: Nordhaven W7, 9 kg Frontlader, Artikelnr. NH-W7-9.
${isNew ? c.de.new : c.de.old}
Technische Daten: Energieeffizienzklasse A, 1.400 U/min, Schleudergeräusch 69 dB(A).

Pflichthinweis Garantie (Textversion ${isNew ? g.newVersion : g.oldVersion}):
${isNew ? g.de.new : g.de.old}

Stand Datenblatt: ${isNew ? "12/2026" : "09/2026"} - nur für Handelspartner.`,
      };
    case DEMO_PATHS.frSite:
      return {
        kind: "html",
        lang: "fr",
        title: "Nordhaven W7 – Lave-linge hublot 9 kg",
        body: `<h1>Nordhaven W7 – Lave-linge hublot 9 kg</h1>
<p>Classe énergétique A, 1&nbsp;400 tr/min, programme vapeur.</p>
<p>Disponible chez nos revendeurs partenaires.</p>
<footer><p class="legal">${isNew ? g.fr.new : g.fr.old}</p></footer>`,
      };
    case DEMO_PATHS.frPdf:
      return { kind: "forbidden", title: "Portail partenaires – connexion requise" };
    default:
      return null;
  }
}
