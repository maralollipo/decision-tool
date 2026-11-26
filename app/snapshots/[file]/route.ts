import path from "node:path";
import { readSnapshot } from "@/lib/db";

const TYPES: Record<string, string> = { ".pdf": "application/pdf", ".txt": "text/plain; charset=utf-8", ".eml": "text/plain; charset=utf-8" };

export async function GET(_req: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  if (!/^[a-f0-9]{16}\.[a-z0-9]+$/.test(file)) return new Response("Ungültig", { status: 400 });
  const data = readSnapshot(file);
  if (!data) return new Response("Nicht gefunden", { status: 404 });
  const ext = path.extname(file);
  // HTML-Snapshots bewusst als Text ausliefern (kein Ausführen fremder Skripte)
  return new Response(new Uint8Array(data), {
    headers: { "Content-Type": TYPES[ext] ?? "text/plain; charset=utf-8", "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "sandbox" },
  });
}
