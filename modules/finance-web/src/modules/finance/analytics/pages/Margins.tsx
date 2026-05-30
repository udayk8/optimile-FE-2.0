import React from "react";
import { Card, Pill, Money, SectionTitle } from "@finance/components/primitives";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { MARGINS } from "@finance/data/mock";

export default function Margins() {
  const data = MARGINS.map((m) => ({ ...m, margin: m.charged - m.paid, pct: (((m.charged - m.paid) / m.charged) * 100).toFixed(1) }));
  return (
    <div>
      <SectionTitle sub="The aggregator's lifeblood: what you charged the client minus what you paid the sub-vendor.">Margin Tracker</SectionTitle>
      <Card className="mb-6 p-5">
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={data} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis dataKey="lane" tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={(v) => `${v / 1000}k`} tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
            <Tooltip formatter={(v) => `₹${v.toLocaleString("en-IN")}`} contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }} />
            <Bar dataKey="charged" name="Charged to client" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
            <Bar dataKey="paid" name="Paid to vendor" fill="#94a3b8" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>
      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-slate-200 bg-slate-50/80 text-left text-xs uppercase tracking-wide text-slate-500">
            {["Trip", "Lane", "Charged", "Paid", "Margin", "Margin %"].map((h) => <th key={h} className="px-5 py-3 font-semibold">{h}</th>)}
          </tr></thead>
          <tbody>
            {data.map((m) => (
              <tr key={m.trip} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                <td className="px-5 py-3.5 font-mono text-xs text-slate-700">{m.trip}</td>
                <td className="px-5 py-3.5 text-slate-600">{m.lane}</td>
                <td className="px-5 py-3.5"><Money value={m.charged} /></td>
                <td className="px-5 py-3.5 text-slate-500"><Money value={m.paid} /></td>
                <td className="px-5 py-3.5"><Money value={m.margin} className="font-semibold text-emerald-600" /></td>
                <td className="px-5 py-3.5"><Pill tone={Number(m.pct) > 20 ? "green" : "amber"}>{m.pct}%</Pill></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
