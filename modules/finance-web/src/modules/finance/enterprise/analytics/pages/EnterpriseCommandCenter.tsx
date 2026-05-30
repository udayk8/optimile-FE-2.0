import React from "react";
import {
  IndianRupee, Truck, CheckCircle2, Clock, AlertOctagon, AlertTriangle,
  Zap, BarChart3, ArrowUp, ArrowDown, Minus, Building2,
} from "lucide-react";
import { Card, Pill } from "@finance/components/primitives";
import { ENTERPRISE_COMMAND } from "@finance/data/mock";

const ICONS = {
  rupee: IndianRupee, truck: Truck, check: CheckCircle2, clock: Clock,
  alert: AlertOctagon, warning: AlertTriangle, zap: Zap, bars: BarChart3,
};

// Static tone class maps so Tailwind JIT keeps them
const TONE_RING = { red: "ring-red-200", amber: "ring-amber-200", green: "ring-emerald-200", blue: "ring-blue-200", slate: "ring-slate-200" };
const TONE_BG = { red: "bg-red-50 text-red-600", amber: "bg-amber-50 text-amber-600", green: "bg-emerald-50 text-emerald-600", blue: "bg-blue-50 text-blue-600", slate: "bg-slate-100 text-slate-500" };
const SCORE_BAR = { green: "#34d399", amber: "#fbbf24", red: "#f87171" };
const SCORE_TEXT = { green: "text-emerald-600", amber: "text-amber-600", red: "text-red-600" };
const STATUS_TONE = { PAID: "green", INVOICED: "violet", EXCEPTION: "red" };

const { org, asOf, badge, kpis, delayed, plantExceptions, vendorScorecard, topLanes } = ENTERPRISE_COMMAND;

function KpiCard({ k }: any) {
  const Icon = (ICONS as Record<string, any>)[k.icon] || BarChart3;
  return (
    <Card className={`p-5 ring-1 ${(TONE_RING as Record<string, any>)[k.tone]} animate-[fadeUp_.5s_ease] [animation-fill-mode:both]`}>
      <div className="flex items-start justify-between">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{k.label}</div>
        <div className={`grid h-9 w-9 flex-shrink-0 place-items-center rounded-lg ${(TONE_BG as Record<string, any>)[k.tone]}`}><Icon size={18} /></div>
      </div>
      <div className="mt-3 text-3xl font-bold text-slate-900">{k.value}</div>
      <div className="mt-1 text-xs text-slate-400">{k.sub}</div>
      {k.trend && (
        <div className={`mt-1.5 flex items-center gap-1 text-xs font-medium ${k.trend.dir === "up" ? "text-emerald-600" : "text-red-600"}`}>
          {k.trend.dir === "up" ? <ArrowUp size={12} /> : <ArrowDown size={12} />}{k.trend.text}
        </div>
      )}
    </Card>
  );
}

function TrendIcon({ trend }: any) {
  if (trend === "up") return <ArrowUp size={14} className="text-emerald-500" />;
  if (trend === "down") return <ArrowDown size={14} className="text-red-500" />;
  return <Minus size={14} className="text-slate-400" />;
}

export default function EnterpriseCommandCenter(_props: any) {
  return (
    <div>
      {/* HEADER */}
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>Command Center</h1>
          <p className="mt-1 text-sm text-slate-500">{org} · {asOf}</p>
        </div>
        <Pill tone="blue"><Building2 size={13} />{badge}</Pill>
      </div>

      {/* KPI GRID */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k, i) => <KpiCard key={i} k={k} />)}
      </div>

      {/* DELAYED SHIPMENTS + EXCEPTIONS BY PLANT */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <h3 className="mb-4 flex items-center gap-2 font-semibold text-slate-800"><AlertTriangle size={17} className="text-red-500" />Delayed Shipments</h3>
          <div className="space-y-2.5">
            {delayed.map((s) => (
              <div key={s.id} className="rounded-lg bg-red-50/60 px-4 py-3 ring-1 ring-red-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-800">{s.id}</span>
                    <Pill tone={(STATUS_TONE as Record<string, any>)[s.status]}>{s.status}</Pill>
                  </div>
                  <span className="text-xs font-semibold text-red-600">{s.delay}</span>
                </div>
                <div className="mt-1 text-xs text-slate-500">{s.route} · {s.vehicle}</div>
                <div className="text-xs text-slate-400">{s.vendor}</div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="mb-4 flex items-center gap-2 font-semibold text-slate-800"><Building2 size={17} className="text-slate-500" />Exceptions by Plant</h3>
          <div className="space-y-5">
            {plantExceptions.map((p) => (
              <div key={p.plant}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-slate-700">{p.plant}</div>
                    <div className="text-[10px] uppercase tracking-wide text-slate-400">{p.code}</div>
                  </div>
                  <div className="text-xs text-slate-500"><span className="font-semibold text-red-600">{p.open} open</span> / {p.total} total</div>
                </div>
                <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-red-400" style={{ width: `${(p.open / p.total) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* VENDOR SCORECARD + TOP LANES */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <h3 className="mb-4 flex items-center gap-2 font-semibold text-slate-800"><BarChart3 size={17} className="text-slate-500" />Vendor Scorecard (Q1 2025)</h3>
          <div className="space-y-3.5">
            {vendorScorecard.map((v) => (
              <div key={v.vendor} className="flex items-center gap-3">
                <div className="w-44 flex-shrink-0 truncate text-sm text-slate-600">{v.vendor}</div>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full" style={{ width: `${v.score}%`, background: (SCORE_BAR as Record<string, any>)[v.tone] }} />
                </div>
                <div className={`w-7 text-right text-sm font-semibold ${(SCORE_TEXT as Record<string, any>)[v.tone]}`}>{v.score}</div>
                <TrendIcon trend={v.trend} />
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="mb-4 flex items-center gap-2 font-semibold text-slate-800"><BarChart3 size={17} className="text-slate-500" />Top Lanes by Freight Spend</h3>
          <div className="space-y-3.5">
            {topLanes.map((l) => (
              <div key={l.lane} className="flex items-center gap-3">
                <div className="w-40 flex-shrink-0">
                  <div className="truncate text-sm font-medium text-slate-700">{l.lane}</div>
                  <div className="text-[11px] text-slate-400">{l.shipments} shipment{l.shipments === 1 ? "" : "s"} · {l.type}</div>
                </div>
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full" style={{ width: `${l.pct}%`, background: "#1e293b" }} />
                </div>
                <div className="w-16 flex-shrink-0 text-right font-mono text-sm font-semibold text-slate-800">{l.spend}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
