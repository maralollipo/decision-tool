// Setzt die lokale Datenbank zurück. Beim nächsten Seitenaufruf legt die App
// die Beispieldaten (lib/seed.ts) automatisch neu an.
import fs from "node:fs";
import path from "node:path";

const dir = process.env.DATA_DIR ?? path.join(process.cwd(), "data");
fs.rmSync(path.join(dir, "db.json"), { force: true });
fs.rmSync(path.join(dir, "snapshots"), { recursive: true, force: true });
console.log("Datenbank zurückgesetzt – Beispieldaten werden beim nächsten Aufruf neu angelegt.");
