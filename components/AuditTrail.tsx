import { AUDIT_KIND_LABEL, STATUS_LABEL, fmtDateTime } from "@/lib/labels";
import type { AuditEntry } from "@/lib/types";

function SourceLink({ src }: { src: string }) {
  if (/^(https?:\/\/|\/demo\/|\/snapshots\/)/.test(src))
    return (
      <a href={src} target="_blank" rel="noreferrer" className="break-all text-sky-700 hover:underline">
        {src}
      </a>
    );
  return <span className="break-all">{src}</span>;
}

export function AuditTrail({ entries, showTarget }: { entries: AuditEntry[]; showTarget?: (e: AuditEntry) => React.ReactNode }) {
  if (!entries.length) return <p className="text-sm text-slate-500">Keine Einträge.</p>;
  return (
    <ol className="space-y-3">
      {[...entries].reverse().map((e) => (
        <li key={e.id} className="rounded-md border border-slate-200 bg-white p-3 text-sm">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="font-mono text-xs text-slate-400">#{e.seq}</span>
            <span className="font-medium">{AUDIT_KIND_LABEL[e.kind]}</span>
            {e.statusTo && e.statusTo !== e.statusFrom && (
              <span className="text-xs text-slate-600">
                {e.statusFrom ? STATUS_LABEL[e.statusFrom] : "–"} → <strong>{STATUS_LABEL[e.statusTo]}</strong>
              </span>
            )}
            {e.statusTo && e.statusTo === e.statusFrom && <span className="text-xs text-slate-500">Status bestätigt: {STATUS_LABEL[e.statusTo]}</span>}
            <span className="ml-auto text-xs text-slate-500">
              {fmtDateTime(e.timestamp)} · {e.actorName}
            </span>
          </div>
          {showTarget && <div className="mt-1 text-xs text-slate-500">{showTarget(e)}</div>}
          <dl className="mt-2 grid grid-cols-[8rem_1fr] gap-x-2 gap-y-1 text-xs">
            {e.source && (
              <>
                <dt className="text-slate-500">Quelle</dt>
                <dd><SourceLink src={e.source} /></dd>
              </>
            )}
            {(e.httpStatus !== null || e.durationMs !== null) && (
              <>
                <dt className="text-slate-500">Abruf</dt>
                <dd>
                  {e.httpStatus !== null ? `HTTP ${e.httpStatus}` : "keine Antwort"}
                  {e.durationMs !== null && ` · ${e.durationMs} ms`}
                </dd>
              </>
            )}
            {e.error && (
              <>
                <dt className="text-slate-500">Fehler</dt>
                <dd className="text-amber-800">{e.error}</dd>
              </>
            )}
            {(e.foundOld !== null || e.foundNew !== null) && (
              <>
                <dt className="text-slate-500">Fund</dt>
                <dd>
                  alter Wortlaut: <strong>{e.foundOld === null ? "?" : e.foundOld ? "ja" : "nein"}</strong> · neuer Wortlaut:{" "}
                  <strong>{e.foundNew === null ? "?" : e.foundNew ? "ja" : "nein"}</strong>
                  {e.foundVersionId && <> · Versions-ID im Dokument: <span className="font-mono">{e.foundVersionId}</span></>}
                </dd>
              </>
            )}
            {e.snippet && (
              <>
                <dt className="text-slate-500">Textausschnitt</dt>
                <dd className="rounded bg-slate-50 p-1.5 font-mono text-[11px] leading-snug text-slate-700">{e.snippet}</dd>
              </>
            )}
            {e.note && (
              <>
                <dt className="text-slate-500">Notiz</dt>
                <dd>{e.note}</dd>
              </>
            )}
            {e.evidenceRef && (
              <>
                <dt className="text-slate-500">Beleg</dt>
                <dd><SourceLink src={e.evidenceRef} /></dd>
              </>
            )}
            {e.contentHash && (
              <>
                <dt className="text-slate-500">Inhalts-Hash</dt>
                <dd className="font-mono text-[11px] text-slate-500">sha256:{e.contentHash.slice(0, 24)}…</dd>
              </>
            )}
            <dt className="text-slate-500">Eintrags-Hash</dt>
            <dd className="font-mono text-[11px] text-slate-400" title={`prev: ${e.prevHash}`}>
              {e.hash.slice(0, 24)}…
            </dd>
          </dl>
        </li>
      ))}
    </ol>
  );
}
