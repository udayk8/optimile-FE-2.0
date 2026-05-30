import React, { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Card, SectionTitle, Money } from "@finance/components/primitives";
import { AreaChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { CASHFLOW } from "@finance/data/mock";

export default function CashFlow() {
  const [horizon, setHorizon] = useState(30);
  const [stress, setStress] = useState(false);
  const data = CASHFLOW.slice(0, horizon).map((d) => ({ ...d, balance: stress ? d.balance - 145000 : d.balance }));
  const minBal = Math.min(...data.map((d) => d.balance));

  return (
    <div>
      <SectionTitle sub="Projected daily balance. Days going negative are flagged in red — plan vendor payments around them.">Cash Flow Forecast</SectionTitle>

      <Card className="p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex rounded-lg bg-slate-100 p-1 text-sm">
            {[30, 60, 90].map((h) => (
              <button key={h} onClick={() => setHorizon(h)}
                className={`rounded-md px-3 py-1 font-medium transition ${horizon === h ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}>
                {h} days
              </button>
            ))}
          </div>
          <label className="flex items-center gap-2 text-xs text-slate-500">
            <input type="checkbox" checked={stress} onChange={(e) => setStress(e.target.checked)} className="h-4 w-4 rounded border-slate-300" />
            Scenario: major client delays payment 15 days
          </label>
        </div>

        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="cf" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0ea5e9" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} label={{ value: "Days ahead", position: "insideBottom", offset: -2, fontSize: 11, fill: "#94a3b8" }} />
            <YAxis tickFormatter={(v) => `${(v / 100000).toFixed(1)}L`} tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
            <Tooltip formatter={(v) => `₹${v.toLocaleString("en-IN")}`} contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }} />
            <Area type="monotone" dataKey="balance" stroke="#0ea5e9" strokeWidth={2} fill="url(#cf)" />
            <Line type="monotone" dataKey={() => 0} stroke="#ef4444" strokeDasharray="4 4" dot={false} />
          </AreaChart>
        </ResponsiveContainer>

        <div className={`mt-3 flex items-center gap-2 rounded-lg px-3 py-2 text-xs ${minBal < 0 ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"}`}>
          <AlertTriangle size={13} />
          {minBal < 0
            ? <span>Projected balance goes negative (low: <Money value={minBal} className="font-semibold" />). Consider invoice factoring or dynamic discounting.</span>
            : <span>Lowest projected balance over {horizon} days: <Money value={minBal} className="font-semibold" />. Tight around day 22 — watch Britannia collection.</span>}
        </div>
      </Card>
    </div>
  );
}
