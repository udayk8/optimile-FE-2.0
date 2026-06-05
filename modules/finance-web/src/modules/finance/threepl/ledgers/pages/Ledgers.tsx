import React, { useMemo, useState } from "react";
import { Card, SectionTitle, LedgerStatementTable, formatLedgerBalance, type LedgerKind } from "@finance/components/primitives";
import { CLIENT_LEDGER } from "@finance/data/mock";
import { usePayables, type LedgerEntry } from "@finance/lib/payablesStore";

/* Filter AR rows by client, sort by date, and recompute the running balance
   so the column + outstanding stay correct for any selection. */
function arRowsFor(client: string): LedgerEntry[] {
  const filtered = (client === "all" ? CLIENT_LEDGER : CLIENT_LEDGER.filter((e) => e.client === client))
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date));
  let bal = 0;
  return filtered.map((e) => { bal += e.amt; return { ...e, bal }; });
}

function LedgerTable({ rows, outstanding, kind }: { rows: LedgerEntry[]; outstanding: number; kind: LedgerKind }) {
  return (
    <Card className="overflow-hidden">
      <LedgerStatementTable rows={rows} kind={kind} />
      <div className="border-t border-slate-200 bg-slate-50/60 px-5 py-3 text-right text-sm">
        <span className="text-slate-500">Outstanding balance: </span>
        <span className="font-mono font-bold text-slate-900">{formatLedgerBalance(outstanding, kind)}</span>
      </div>
    </Card>
  );
}

export default function Ledgers() {
  const { apLedger } = usePayables();
  const [tab, setTab] = useState<"ar" | "ap">("ar");
  const [client, setClient] = useState("all");

  const clients = useMemo(() => [...new Set(CLIENT_LEDGER.map((e) => e.client))].sort(), []);
  const arRows = useMemo(() => arRowsFor(client), [client]);
  const arOutstanding = arRows.length ? arRows[arRows.length - 1].bal : 0;
  const apOutstanding = apLedger.length ? apLedger[apLedger.length - 1].bal : 0;

  return (
    <div>
      <SectionTitle sub="Append-only running balance. Every financial event adds a row — never edited, fully auditable.">Ledgers</SectionTitle>

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-lg bg-slate-100 p-1 text-sm">
          {[["ar", "Client (AR)"], ["ap", "Vendor (AP)"]].map(([k, l]) => (
            <button key={k} onClick={() => setTab(k as "ar" | "ap")} className={`rounded-md px-4 py-1.5 font-medium transition ${tab === k ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}>{l}</button>
          ))}
        </div>
        {tab === "ar" && (
          <select value={client} onChange={(e) => setClient(e.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 outline-none focus:border-slate-300">
            <option value="all">All clients</option>
            {clients.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        )}
      </div>

      {tab === "ar"
        ? <LedgerTable rows={arRows} outstanding={arOutstanding} kind="AR" />
        : <LedgerTable rows={apLedger} outstanding={apOutstanding} kind="AP" />}
    </div>
  );
}
