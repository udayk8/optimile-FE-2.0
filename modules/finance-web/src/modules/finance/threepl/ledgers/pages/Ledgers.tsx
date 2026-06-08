import React, { useMemo, useState } from "react";
import { Card, Money, Pill, SectionTitle, LedgerStatementTable, formatLedgerBalance, type LedgerKind } from "@finance/components/primitives";
import { CLIENT_LEDGER, MARGINS } from "@finance/data/mock";
import { usePayables, type LedgerEntry } from "@finance/lib/payablesStore";
import { useReceivables } from "@finance/lib/receivablesStore";

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

/* Per-booking profit register: selling (customer) − buying (vendor) = margin.
   Sourced from real bridged bookings (assigned only); falls back to the MARGINS
   mock so the tab is never blank in the standalone build. */
interface ProfitRow { booking: string; client: string; lane: string; selling: number; buying: number; margin: number }

function ProfitTable({ rows }: { rows: ProfitRow[] }) {
  const totalMargin = rows.reduce((s, r) => s + r.margin, 0);
  return (
    <Card className="overflow-hidden">
      <table className="w-full text-sm">
        <thead><tr className="border-b border-slate-200 bg-slate-50/80 text-left text-xs uppercase tracking-wide text-slate-500">
          {["Booking", "Client", "Lane", "Selling", "Buying", "Margin", "Margin %"].map((h) => <th key={h} className="px-5 py-3 font-semibold">{h}</th>)}
        </tr></thead>
        <tbody>
          {rows.map((r) => {
            const pct = r.selling > 0 ? (r.margin / r.selling) * 100 : 0;
            return (
              <tr key={r.booking} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                <td className="px-5 py-3.5 font-mono text-xs text-slate-700">{r.booking}</td>
                <td className="px-5 py-3.5 text-slate-600">{r.client}</td>
                <td className="px-5 py-3.5 text-slate-600">{r.lane}</td>
                <td className="px-5 py-3.5"><Money value={r.selling} /></td>
                <td className="px-5 py-3.5 text-slate-500"><Money value={r.buying} /></td>
                <td className="px-5 py-3.5"><Money value={r.margin} className={`font-semibold ${r.margin < 0 ? "text-red-600" : "text-emerald-600"}`} /></td>
                <td className="px-5 py-3.5"><Pill tone={pct < 0 ? "red" : pct < 15 ? "amber" : "green"}>{pct.toFixed(1)}%</Pill></td>
              </tr>
            );
          })}
          {rows.length === 0 && <tr><td colSpan={7} className="px-5 py-8 text-center text-slate-400">No assigned bookings yet.</td></tr>}
        </tbody>
      </table>
      <div className="border-t border-slate-200 bg-slate-50/60 px-5 py-3 text-right text-sm">
        <span className="text-slate-500">Total margin: </span>
        <Money value={totalMargin} className="font-bold text-emerald-600" />
      </div>
    </Card>
  );
}

export default function Ledgers() {
  const { apLedger } = usePayables();
  const { trips } = useReceivables();
  const [tab, setTab] = useState<"ar" | "ap" | "profit">("ar");
  const [client, setClient] = useState("all");

  const clients = useMemo(() => [...new Set(CLIENT_LEDGER.map((e) => e.client))].sort(), []);
  const arRows = useMemo(() => arRowsFor(client), [client]);
  const arOutstanding = arRows.length ? arRows[arRows.length - 1].bal : 0;
  const apOutstanding = apLedger.length ? apLedger[apLedger.length - 1].bal : 0;

  // Profit register from real bridged bookings (vendor assigned), else mock.
  const profitRows: ProfitRow[] = useMemo(() => {
    const assigned = trips.filter((t) => t.buyingFreight != null && t.margin != null);
    if (assigned.length) {
      return assigned.map((t) => ({
        booking: t.bookingId ?? t.id,
        client: t.client,
        lane: t.lane,
        selling: t.revenue ?? 0,
        buying: t.buyingFreight ?? 0,
        margin: t.margin ?? 0,
      }));
    }
    return MARGINS.map((m) => ({ booking: m.trip, client: "—", lane: m.lane, selling: m.charged, buying: m.paid, margin: m.charged - m.paid }));
  }, [trips]);

  return (
    <div>
      <SectionTitle sub="Append-only running balance. Every financial event adds a row — never edited, fully auditable.">Ledgers</SectionTitle>

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-lg bg-slate-100 p-1 text-sm">
          {[["ar", "Client (AR)"], ["ap", "Vendor (AP)"], ["profit", "Profit"]].map(([k, l]) => (
            <button key={k} onClick={() => setTab(k as "ar" | "ap" | "profit")} className={`rounded-md px-4 py-1.5 font-medium transition ${tab === k ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}>{l}</button>
          ))}
        </div>
        {tab === "ar" && (
          <select value={client} onChange={(e) => setClient(e.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 outline-none focus:border-slate-300">
            <option value="all">All clients</option>
            {clients.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        )}
      </div>

      {tab === "ar" && <LedgerTable rows={arRows} outstanding={arOutstanding} kind="AR" />}
      {tab === "ap" && <LedgerTable rows={apLedger} outstanding={apOutstanding} kind="AP" />}
      {tab === "profit" && <ProfitTable rows={profitRows} />}
    </div>
  );
}
