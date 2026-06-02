import React, { useState } from "react";
import { AlertTriangle, Download, ArrowRight } from "lucide-react";
import { Card, Pill, Money, SectionTitle, Modal, ModalHeader, Btn } from "@finance/components/primitives";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { PROFIT_CLIENT, PROFIT_LANE, PROFIT_VEHICLE, PROFIT_TRIPS } from "@finance/data/mock";
import { exportCsv } from "@finance/lib/csv";

const TABS = { client: PROFIT_CLIENT, lane: PROFIT_LANE, vehicle: PROFIT_VEHICLE };
const withMargin = (r: any) => ({ ...r, margin: r.revenue - r.cost, pct: ((r.revenue - r.cost) / r.revenue) * 100 });

export default function Profitability({ toast }: any) {
  const [tab, setTab] = useState<"client" | "lane" | "vehicle">("client");
  const [drill, setDrill] = useState<string | null>(null);
  const data = TABS[tab].map(withMargin);

  const download = () => {
    const cols = [
      { key: "name", label: tab[0].toUpperCase() + tab.slice(1) },
      { key: "revenue", label: "Revenue" },
      { key: "cost", label: "Cost" },
      { key: "margin", label: "Margin" },
      { label: "Margin %", value: (r: any) => `${r.pct.toFixed(1)}%` },
    ];
    exportCsv(`profitability-by-${tab}.csv`, cols, data);
    toast(`Downloaded profitability-by-${tab}.csv`);
  };

  const drillTrips = drill
    ? PROFIT_TRIPS.filter((t) => (t as any)[tab] === drill).map(withMargin)
    : [];

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <SectionTitle sub="Which clients, lanes and vehicles actually make money. Negative margins are flagged for review — drill any row into its trips.">Profitability Analysis</SectionTitle>
        <Btn className="px-4 py-2" onClick={download}><Download size={15} />Export to Excel (CSV)</Btn>
      </div>

      <div className="mb-5 inline-flex rounded-lg bg-slate-100 p-1 text-sm">
        {[["client", "By client"], ["lane", "By lane"], ["vehicle", "By vehicle"]].map(([k, l]) => (
          <button key={k} onClick={() => setTab(k as any)} className={`rounded-md px-4 py-1.5 font-medium transition ${tab === k ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}>{l}</button>
        ))}
      </div>

      <Card className="mb-6 p-5">
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={data} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={(v) => `${v / 1000}k`} tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
            <Tooltip formatter={(v) => `₹${Number(v).toLocaleString("en-IN")}`} contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }} />
            <Bar dataKey="margin" radius={[4, 4, 0, 0]}>
              {data.map((d: any, i: number) => <Cell key={i} fill={d.margin < 0 ? "#ef4444" : "#10b981"} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-slate-200 bg-slate-50/80 text-left text-xs uppercase tracking-wide text-slate-500">
            {["Name", "Revenue", "Cost", "Margin", "Margin %", ""].map((h) => <th key={h} className="px-5 py-3 font-semibold">{h}</th>)}
          </tr></thead>
          <tbody>
            {data.map((r: any) => (
              <tr key={r.name} onClick={() => setDrill(r.name)} className="cursor-pointer border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                <td className="px-5 py-3.5 text-slate-700">{r.name}</td>
                <td className="px-5 py-3.5"><Money value={r.revenue} /></td>
                <td className="px-5 py-3.5 text-slate-500"><Money value={r.cost} /></td>
                <td className="px-5 py-3.5"><Money value={r.margin} className={`font-semibold ${r.margin < 0 ? "text-red-600" : "text-emerald-600"}`} /></td>
                <td className="px-5 py-3.5"><Pill tone={r.pct < 0 ? "red" : r.pct < 15 ? "amber" : "green"}>{r.pct.toFixed(1)}%</Pill></td>
                <td className="px-5 py-3.5 text-right">
                  {r.margin < 0
                    ? <span className="flex items-center justify-end gap-1 text-xs text-red-600"><AlertTriangle size={12} />Loss-making</span>
                    : <span className="inline-flex items-center gap-1 text-xs text-slate-400">Trips<ArrowRight size={11} /></span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {drill && (
        <Modal onClose={() => setDrill(null)} maxW="max-w-2xl">
          <ModalHeader title={`Trip-level detail · ${drill}`} tone="blue" onClose={() => setDrill(null)} />
          <div className="max-h-[60vh] overflow-auto p-2">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                {["Trip", "Lane", "Revenue", "Cost", "Margin", "%"].map((h) => <th key={h} className="px-4 py-2 font-semibold">{h}</th>)}
              </tr></thead>
              <tbody>
                {drillTrips.map((t: any) => (
                  <tr key={t.trip} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-2.5 font-mono text-xs text-slate-700">{t.trip}</td>
                    <td className="px-4 py-2.5 text-slate-500">{t.lane}</td>
                    <td className="px-4 py-2.5"><Money value={t.revenue} /></td>
                    <td className="px-4 py-2.5 text-slate-500"><Money value={t.cost} /></td>
                    <td className="px-4 py-2.5"><Money value={t.margin} className={`font-semibold ${t.margin < 0 ? "text-red-600" : "text-emerald-600"}`} /></td>
                    <td className="px-4 py-2.5"><Pill tone={t.pct < 0 ? "red" : t.pct < 15 ? "amber" : "green"}>{t.pct.toFixed(0)}%</Pill></td>
                  </tr>
                ))}
                {drillTrips.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">No trip-level rows for this {tab}.</td></tr>}
              </tbody>
            </table>
          </div>
        </Modal>
      )}
    </div>
  );
}
