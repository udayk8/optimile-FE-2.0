import React from "react";
import {
  CircleDollarSign, FileWarning, Clock, ReceiptText, Wallet, Truck, Ban,
} from "lucide-react";
import { Card, Pill, Money, SectionTitle } from "@finance/components/primitives";
import { fmtL } from "@finance/lib/format";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { CLIENTS, AGING, POD_FUNNEL } from "@finance/data/mock";
import { useReceivables } from "@finance/lib/receivablesStore";
import { usePayables } from "@finance/lib/payablesStore";
import EnterpriseCommandCenter from "@finance/modules/finance/threepl/analytics/pages/EnterpriseCommandCenter";

function Funnel() {
  const { tripsCompleted, podsReceived, invoicesGenerated } = POD_FUNNEL;
  const steps = [
    { label: "Trips Completed", v: tripsCompleted, tone: "bg-slate-800" },
    { label: "PODs Received", v: podsReceived, tone: "bg-blue-500", gap: tripsCompleted - podsReceived, gapLabel: "revenue at risk" },
    { label: "Invoices Generated", v: invoicesGenerated, tone: "bg-emerald-500", gap: podsReceived - invoicesGenerated, gapLabel: "process gap — close today" },
  ];
  return (
    <Card className="p-5">
      <h3 className="mb-1 font-semibold text-slate-800">Today's POD → Invoice funnel</h3>
      <p className="mb-4 text-xs text-slate-400">Three numbers that must converge every morning.</p>
      <div className="space-y-3">
        {steps.map((s) => (
          <div key={s.label}>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">{s.label}</span>
              <span className="font-mono font-semibold text-slate-800">{s.v}</span>
            </div>
            <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-slate-100">
              <div className={`h-full rounded-full ${s.tone}`} style={{ width: `${(s.v / steps[0].v) * 100}%` }} />
            </div>
            {(s.gap ?? 0) > 0 && (
              <div className="mt-1 text-xs text-amber-600">−{s.gap} {s.gapLabel}</div>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}

export default function Dashboard({ mode, toast }: any) {
  if (mode === "enterprise") return <EnterpriseCommandCenter toast={toast} />;

  const { trips, invoices } = useReceivables();
  const { bills, payments } = usePayables();
  const todayISO = new Date().toISOString().slice(0, 10);

  // Live KPI inputs
  const podTrips = trips.filter((t) => t.podStage !== "invoiced");
  const podRisk = podTrips.reduce((s, t) => s + t.revenue, 0);
  const approved = invoices.filter((i) => i.stage === "approved");
  const overdue = approved.filter((i) => (i.due ?? "") && (i.due as string) < todayISO).reduce((s, i) => s + i.amount, 0);
  const pendingBills = bills.filter((b) => b.stage === "pending").length;
  const scheduledCount = bills.filter((b) => b.stage === "scheduled").length;
  const payablesDue = bills.filter((b) => b.stage !== "paid").reduce((s, b) => s + b.billed, 0);

  // Today's collections — green (on track) / amber (partial) / red (nothing). (Demo received vs due.)
  const collectedToday = 62500, dueToday = 189500;
  const collTone = collectedToday >= dueToday ? "green" : collectedToday > 0 ? "amber" : "red";

  const kpis = [
    { label: "Today's Collections", value: collectedToday, sub: `of ${"₹" + dueToday.toLocaleString("en-IN")} due today`, tone: collTone, icon: CircleDollarSign },
    { label: "Revenue at Risk (No POD)", value: podRisk, sub: `${podTrips.length} trips pending POD`, tone: "red", icon: FileWarning },
    { label: "Overdue Receivables", value: overdue, sub: "past due from clients", tone: "red", icon: Clock },
    { label: "Invoices Pending Approval", value: null, count: pendingBills, sub: "vendor bills awaiting approval", tone: "amber", icon: ReceiptText },
    { label: "Today's Payables", value: payablesDue, sub: `${scheduledCount} scheduled · ${pendingBills} pending approval`, tone: "blue", icon: Wallet },
    { label: "Cash Position (7-day)", value: 642000, sub: "projected · bank-feed ready", tone: "green", icon: Truck },
  ];

  return (
    <div>
      <SectionTitle sub="Wednesday, 21 May 2026 · Priya Nair, Finance">Good morning, Priya 👋</SectionTitle>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {kpis.map((k, i) => {
          const toneRing = { red: "ring-red-200", amber: "ring-amber-200", green: "ring-emerald-200", blue: "ring-blue-200" }[k.tone];
          const toneBg = { red: "bg-red-50 text-red-600", amber: "bg-amber-50 text-amber-600", green: "bg-emerald-50 text-emerald-600", blue: "bg-blue-50 text-blue-600" }[k.tone];
          return (
            <Card key={i} className={`p-5 ring-1 ${toneRing} animate-[fadeUp_.5s_ease] [animation-fill-mode:both]`}>
              <div className="flex items-start justify-between">
                <div className={`grid h-10 w-10 place-items-center rounded-lg ${toneBg}`}><k.icon size={20} /></div>
                {k.label === "Today's Collections" && <Pill tone={k.tone as any}>{collTone === "green" ? "On track" : collTone === "amber" ? "Partial" : "Nothing in"}</Pill>}
              </div>
              <div className="mt-4 text-2xl font-bold text-slate-900">
                {k.value != null ? <Money value={k.value} /> : <span className="font-mono">{k.count}</span>}
              </div>
              <div className="mt-1 text-xs font-medium text-slate-500">{k.label}</div>
              <div className="mt-0.5 text-xs text-slate-400">{k.sub}</div>
            </Card>
          );
        })}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold text-slate-800">Receivables Aging</h3>
            <Pill tone="slate">Total ₹5.23L outstanding</Pill>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={AGING} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="bucket" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={(v) => `${v / 1000}k`} tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v) => `₹${Number(v).toLocaleString("en-IN")}`} contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }} />
              <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                {AGING.map((a, i) => <Cell key={i} fill={a.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Funnel />
      </div>

      <div className="mt-6">
        <Card className="p-5">
          <h3 className="mb-4 font-semibold text-slate-800">Credit Limit Alerts</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {CLIENTS.map((c) => {
              const pctUsed = Math.min((c.used / c.limit) * 100, 110);
              const tone = pctUsed >= 100 ? "red" : pctUsed >= 80 ? "amber" : "green";
              const bar = { red: "#ef4444", amber: "#f59e0b", green: "#10b981" }[tone];
              return (
                <div key={c.id}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-700">{c.name}</span>
                    <span className="font-mono text-xs text-slate-500">{pctUsed.toFixed(0)}% · {fmtL(c.used)}</span>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(pctUsed, 100)}%`, background: bar }} />
                  </div>
                  {c.status === "blocked" && <div className="mt-1 flex items-center gap-1 text-xs text-red-600"><Ban size={12} />Indents blocked</div>}
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}
