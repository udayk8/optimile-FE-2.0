import React, { useState, useMemo } from "react";
import { Truck, User, Package } from "lucide-react";
import { Card, Pill, Money, SectionTitle } from "@finance/components/primitives";
import { FLEET_LEDGERS } from "@finance/data/mock";

const TODAY = new Date("2026-05-22");

const TABS = [
  { key: "vehicles", label: "Vehicle", icon: Truck, entityLabel: "vehicle" },
  { key: "drivers", label: "Driver", icon: User, entityLabel: "driver" },
  { key: "trips", label: "Trip", icon: Package, entityLabel: "trip" },
];

const PERIODS = [
  { key: "month", label: "This month" },
  { key: "week", label: "This week" },
  { key: "all", label: "All" },
];

// Colour pills by event type
const typeTone = (t: any) => {
  if (/revenue/i.test(t)) return "green";
  if (/salary|expenses settled|balance/i.test(t)) return "blue";
  if (/advance|fuel|toll|maintenance|emi|depreciation|allocated/i.test(t)) return "amber";
  return "slate";
};

function inPeriod(dateStr: any, period: any) {
  if (period === "all") return true;
  const d = new Date(dateStr);
  if (period === "month") return d.getUTCFullYear() === 2026 && d.getUTCMonth() === 4; // May 2026
  if (period === "week") {
    const diff = (TODAY.getTime() - d.getTime()) / 86400000;
    return diff >= 0 && diff <= 7;
  }
  return true;
}

export default function FleetLedgers() {
  const [tab, setTab] = useState("vehicles");
  const [period, setPeriod] = useState("month");
  const entities = Object.keys((FLEET_LEDGERS as Record<string, any>)[tab]);
  const [entity, setEntity] = useState(entities[0]);

  // Keep a valid entity when switching tabs
  const activeEntity = (FLEET_LEDGERS as Record<string, any>)[tab][entity] ? entity : entities[0];

  const allRows = (FLEET_LEDGERS as Record<string, any>)[tab][activeEntity] || [];
  const rows = useMemo(() => allRows.filter((r: any) => inPeriod(r.date, period)), [allRows, period]);

  // Running balance computed across the FILTERED set (chronological)
  const withBalance = useMemo(() => {
    let bal = 0;
    return rows.map((r: any) => {
      bal += (r.credit || 0) - (r.debit || 0);
      return { ...r, balance: bal };
    });
  }, [rows]);

  const totalIn = rows.reduce((s: any, r: any) => s + (r.credit || 0), 0);
  const totalOut = rows.reduce((s: any, r: any) => s + (r.debit || 0), 0);
  const net = totalIn - totalOut;

  const tabMeta = TABS.find((t) => t.key === tab)!;
  const netLabel = tab === "vehicles" ? "Net (P&L)" : tab === "drivers" ? "Net balance" : "Trip P&L";

  return (
    <div>
      <SectionTitle sub="Every vehicle, driver and trip keeps its own event-level ledger. Filter by period; running balance recomputes.">Fleet Ledgers</SectionTitle>

      {/* Tabs */}
      <div className="mb-4 inline-flex rounded-lg bg-slate-100 p-1 text-sm">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => { setTab(t.key); setEntity(Object.keys((FLEET_LEDGERS as Record<string, any>)[t.key])[0]); }}
            className={`inline-flex items-center gap-1.5 rounded-md px-4 py-1.5 font-medium transition ${tab === t.key ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}>
            <t.icon size={14} />{t.label}
          </button>
        ))}
      </div>

      {/* Entity selector + period toggle */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {entities.map((e) => (
            <button key={e} onClick={() => setEntity(e)}
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${activeEntity === e ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 text-slate-600 hover:bg-slate-50"} ${tab === "vehicles" ? "font-mono" : ""}`}>
              {e}
            </button>
          ))}
        </div>
        <div className="inline-flex rounded-lg bg-slate-100 p-1 text-xs">
          {PERIODS.map((p) => (
            <button key={p.key} onClick={() => setPeriod(p.key)}
              className={`rounded-md px-3 py-1 font-medium transition ${period === p.key ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary tiles */}
      <div className="mb-6 grid grid-cols-3 gap-4">
        <Card className="p-4"><div className="text-xs text-slate-500">Total in</div><Money value={totalIn} className="mt-1 block text-lg font-bold text-emerald-600" /></Card>
        <Card className="p-4"><div className="text-xs text-slate-500">Total out</div><Money value={totalOut} className="mt-1 block text-lg font-bold text-red-600" /></Card>
        <Card className="p-4"><div className="text-xs text-slate-500">{netLabel}</div><Money value={net} className={`mt-1 block text-lg font-bold ${net < 0 ? "text-red-600" : "text-slate-900"}`} /></Card>
      </div>

      {/* Ledger table */}
      <Card className="overflow-hidden">
        <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-3">
          <tabMeta.icon size={15} className="text-slate-400" />
          <span className="font-semibold text-slate-800">{activeEntity}</span>
          <Pill tone="slate">{tabMeta.label} ledger</Pill>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/80 text-left text-xs uppercase tracking-wide text-slate-500">
              {["Date", "Type", "Reference", "Description", "Debit", "Credit", "Running Balance"].map((h) => <th key={h} className="px-5 py-3 font-semibold">{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {withBalance.map((r: any, i: number) => (
              <tr key={i} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                <td className="px-5 py-3 font-mono text-xs text-slate-500">{r.date}</td>
                <td className="px-5 py-3"><Pill tone={typeTone(r.type)}>{r.type}</Pill></td>
                <td className="px-5 py-3 font-mono text-xs text-slate-600">{r.ref}</td>
                <td className="px-5 py-3 text-slate-600">{r.desc}</td>
                <td className="px-5 py-3">{r.debit ? <Money value={-r.debit} className="text-red-600" /> : <span className="text-slate-300">—</span>}</td>
                <td className="px-5 py-3">{r.credit ? <Money value={r.credit} className="text-emerald-600" /> : <span className="text-slate-300">—</span>}</td>
                <td className="px-5 py-3"><Money value={r.balance} className={`font-semibold ${r.balance < 0 ? "text-red-600" : "text-slate-900"}`} /></td>
              </tr>
            ))}
            {withBalance.length === 0 && (
              <tr><td colSpan={7} className="px-5 py-12 text-center text-slate-400">No ledger entries for {activeEntity} in this period.</td></tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
