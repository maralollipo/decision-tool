import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { UserSwitcher } from "@/components/UserSwitcher";
import { readDb } from "@/lib/db";
import { currentUser } from "@/lib/session";
import { ResetDemoButton } from "@/components/ResetDemoButton";

export const metadata: Metadata = {
  title: "Claim- & Pflichttext-Tracker (Pilot)",
  description: "Nachverfolgung von Claim- und Pflichttext-Änderungen über Märkte und Ausspielorte",
};

export const dynamic = "force-dynamic";

const NAV = [
  { href: "/", label: "Änderungen" },
  { href: "/tasks", label: "Aufgaben & Eskalation" },
  { href: "/targets", label: "Ausspielorte" },
  { href: "/audit", label: "Beleg-Log" },
];

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const db = readDb();
  const user = await currentUser(db);
  return (
    <html lang="de">
      <body className="min-h-screen antialiased">
        <header className="no-print bg-slate-900 text-white">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-2.5">
            <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
              <span className="rounded bg-white/10 px-1.5 py-0.5 text-xs">PILOT</span>
              Claim- &amp; Pflichttext-Tracker
            </Link>
            <nav className="flex flex-wrap gap-1 text-sm">
              {NAV.map((n) => (
                <Link key={n.href} href={n.href} className="rounded px-2.5 py-1 text-slate-300 hover:bg-white/10 hover:text-white">
                  {n.label}
                </Link>
              ))}
            </nav>
            <div className="ml-auto flex items-center gap-3">
              <UserSwitcher people={db.people} currentId={user.id} />
              <ResetDemoButton />
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
