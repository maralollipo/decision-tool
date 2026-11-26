import "server-only";

// Textextraktion aus HTML, Klartext und PDF.

const ENTITIES: Record<string, string> = {
  nbsp: " ", amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", shy: "­",
  laquo: "«", raquo: "»", bdquo: "„", ldquo: "“", rdquo: "”", lsquo: "‘", rsquo: "’", sbquo: "‚",
  ndash: "–", mdash: "—", hellip: "…", euro: "€", copy: "©", reg: "®", trade: "™", sup1: "¹", sup2: "²", sup3: "³",
  auml: "ä", ouml: "ö", uuml: "ü", Auml: "Ä", Ouml: "Ö", Uuml: "Ü", szlig: "ß",
  eacute: "é", egrave: "è", ecirc: "ê", agrave: "à", acirc: "â", ccedil: "ç", ocirc: "ô", ucirc: "û", icirc: "î", iuml: "ï", euml: "ë",
  Eacute: "É", Egrave: "È", Agrave: "À", Ccedil: "Ç",
};

export function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z0-9]+);/gi, (m, code: string) => {
    if (code[0] === "#") {
      const n = code[1].toLowerCase() === "x" ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(n) ? String.fromCodePoint(n) : m;
    }
    return ENTITIES[code] ?? m;
  });
}

export function htmlToText(html: string): string {
  const withoutHidden = html
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(script|style|noscript|template|svg)[\s\S]*?<\/\1>/gi, " ");
  const text = withoutHidden
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6]|tr|section|footer|header)>/gi, "\n")
    .replace(/<[^>]+>/g, " ");
  return decodeEntities(text);
}

/** Heuristik: Login-/SSO-Seite statt Inhalt ausgeliefert? */
export function looksLikeLogin(html: string, finalUrl: string): boolean {
  if (/\/(login|signin|sign-in|anmelden|connexion|sso|auth|oauth)(\/|\?|$)/i.test(new URL(finalUrl).pathname + new URL(finalUrl).search)) return true;
  return /<input[^>]+type=["']?password/i.test(html);
}

export function looksClientRendered(html: string, text: string): boolean {
  const scripts = (html.match(/<script/gi) ?? []).length;
  return scripts >= 3 && text.replace(/\s+/g, " ").trim().length < 300;
}

export async function pdfToText(buf: Uint8Array): Promise<string> {
  const { extractText, getDocumentProxy } = await import("unpdf");
  const pdf = await getDocumentProxy(new Uint8Array(buf));
  const { text } = await extractText(pdf, { mergePages: true });
  return Array.isArray(text) ? text.join("\n") : text;
}

export function isPdf(buf: Uint8Array, contentType: string, url: string): boolean {
  if (/application\/pdf/i.test(contentType)) return true;
  if (buf.length > 4 && buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46) return true; // %PDF
  return /\.pdf($|\?)/i.test(url) && !/html/i.test(contentType);
}
