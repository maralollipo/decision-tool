import { readDb } from "@/lib/db";
import { demoDocument } from "@/lib/demo-content";
import { buildPdf } from "@/lib/demo-pdf";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const p = "/demo/" + path.join("/");
  const state = readDb().demo.pages[p] ?? "alt";
  const doc = demoDocument(p, state);
  if (!doc) return new Response("<h1>404 – Seite nicht gefunden</h1>", { status: 404, headers: { "Content-Type": "text/html; charset=utf-8" } });

  if (doc.kind === "forbidden") {
    return new Response(
      `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>${doc.title}</title></head><body style="font-family:sans-serif;padding:2rem">
<h1>${doc.title}</h1><p>Accès réservé aux revendeurs agréés.</p>
<form><label>Identifiant <input name="u"></label> <label>Mot de passe <input type="password" name="p"></label> <button>Connexion</button></form>
<p style="color:#888;font-size:12px">Demo-Ziel des Claim-Trackers: liefert absichtlich HTTP 403.</p></body></html>`,
      { status: 403, headers: { "Content-Type": "text/html; charset=utf-8" } },
    );
  }
  if (doc.kind === "pdf") {
    return new Response(new Uint8Array(buildPdf(doc.title, doc.body)), {
      headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${path.at(-1)}"`, "Cache-Control": "no-store" },
    });
  }
  return new Response(
    `<!doctype html><html lang="${doc.lang}"><head><meta charset="utf-8"><title>${doc.title}</title>
<style>body{font-family:Georgia,serif;max-width:46rem;margin:2rem auto;padding:0 1rem;color:#222}.claim{font-size:1.3rem;font-style:italic}.legal{font-size:.8rem;color:#555}.demo{background:#fef3c7;padding:.4rem .6rem;font:12px sans-serif}</style></head>
<body><div class="demo">Demo-Ausspielort des Claim-Trackers · ausgelieferte Fassung: <b>${state}</b></div>${doc.body}</body></html>`,
    { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } },
  );
}
