import React from "react";
import { Wrench, Paperclip, AlertTriangle } from "lucide-react";
import { Card, Pill, Money, SectionTitle } from "@finance/components/primitives";
import { MAINTENANCE, VEHICLES } from "@finance/data/mock";

export default function Maintenance() {
  const byVehicle = VEHICLES.map((v) => ({
    id: v.id,
    total: MAINTENANCE.filter((m) => m.vehicle === v.id).reduce((s, m) => s + m.cost, 0),
  }));
  const high = Math.max(...byVehicle.map((v) => v.total));

  return (
    <div>
      <SectionTitle sub="Every maintenance event captured per vehicle with workshop bill attached. High-cost vehicles flagged for review.">Maintenance &amp; Repairs</SectionTitle>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {byVehicle.map((v) => {
          const flag = v.total === high && high > 50000;
          return (
            <Card key={v.id} className={`p-4 ${flag ? "ring-1 ring-amber-200" : ""}`}>
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-semibold text-slate-700">{v.id}</span>
                {flag && <Pill tone="amber"><AlertTriangle size={11} />High</Pill>}
              </div>
              <Money value={v.total} className="mt-2 block text-lg font-bold text-slate-900" />
              <div className="text-xs text-slate-400">maintenance spend (MTD)</div>
            </Card>
          );
        })}
      </div>

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-slate-200 bg-slate-50/80 text-left text-xs uppercase tracking-wide text-slate-500">
            {["Vehicle", "Date", "Category", "Workshop", "Cost", "Bill"].map((h) => <th key={h} className="px-5 py-3 font-semibold">{h}</th>)}
          </tr></thead>
          <tbody>
            {MAINTENANCE.map((m, i) => (
              <tr key={i} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                <td className="px-5 py-3.5 font-mono text-xs text-slate-700">{m.vehicle}</td>
                <td className="px-5 py-3.5 text-slate-500">{m.date}</td>
                <td className="px-5 py-3.5"><span className="flex items-center gap-1.5 text-slate-700"><Wrench size={13} className="text-slate-400" />{m.category}</span></td>
                <td className="px-5 py-3.5 text-slate-600">{m.workshop}</td>
                <td className="px-5 py-3.5"><Money value={m.cost} className="font-semibold text-slate-800" /></td>
                <td className="px-5 py-3.5">{m.bill ? <Pill tone="green"><Paperclip size={11} />Attached</Pill> : <Pill tone="amber">Pending</Pill>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
