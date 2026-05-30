import React, { useState } from "react";
import {
  BarChart3, Download, Filter, Calendar, ChevronDown, ArrowLeft,
  Package, Users, Truck, FileText, IndianRupee, AlertTriangle,
  Clock, ShieldAlert, AlertCircle,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { Card, Pill } from "@finance/components/primitives";
import { ENTERPRISE_REPORTS } from "@finance/data/mock";

const ICONS = {
  package: Package, users: Users, truck: Truck, fileText: FileText,
  rupee: IndianRupee, alertTriangle: AlertTriangle, clock: Clock,
  shield: ShieldAlert, alertCircle: AlertCircle,
};

// Static tint classes so Tailwind JIT can see them
const TINT = {
  indigo: "bg-indigo-50 text-indigo-600",
  blue: "bg-blue-50 text-blue-600",
  emerald: "bg-emerald-50 text-emerald-600",
  amber: "bg-amber-50 text-amber-600",
  red: "bg-red-50 text-red-600",
  violet: "bg-violet-50 text-violet-600",
  orange: "bg-orange-50 text-orange-600",
  teal: "bg-teal-50 text-teal-600",
};

const DEFAULT_BAR = "#94a3b8";

/* ---- mini bar chart (lightweight divs) ---- */
function MiniBars({ bars }: any) {
  const max = Math.max(...bars.map((b: any) => b.value), 1);
  return (
    <div>
      <div className="flex h-20 items-end gap-1.5">
        {bars.map((b: any, i: number) => (
          <div key={i} className="flex flex-1 items-end justify-center" style={{ height: "100%" }}>
            <div className="w-full rounded-sm" style={{ height: `${(b.value / max) * 100}%`, background: b.color || DEFAULT_BAR }} />
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex gap-1.5">
        {bars.map((b: any, i: number) => (
          <div key={i} className="flex-1 truncate text-center text-[9px] text-slate-400">{b.label}</div>
        ))}
      </div>
    </div>
  );
}

/* ---- visual-only filter dropdown ---- */
const FilterBtn = ({ icon: Icon, children }: any) => (
  <button className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">
    {Icon && <Icon size={13} className="text-slate-400" />}{children}<ChevronDown size={13} className="text-slate-400" />
  </button>
);

/* ============================== GRID ============================== */
function ReportCard({ r, onOpen, toast }: any) {
  const Icon = ICONS[r.icon as keyof typeof ICONS] || BarChart3;
  return (
    <Card className="flex flex-col p-5">
      <div className="flex items-start gap-3">
        <div className={`grid h-9 w-9 flex-shrink-0 place-items-center rounded-lg ${TINT[r.tint as keyof typeof TINT]}`}><Icon size={18} /></div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-slate-800">{r.title}</h3>
            {r.badge && <Pill tone="blue">{r.badge}</Pill>}
          </div>
          <p className="mt-0.5 text-xs leading-snug text-slate-500">{r.desc}</p>
        </div>
      </div>

      <div className="mt-4"><MiniBars bars={r.bars} /></div>

      <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3">
        {r.stats.map((s: any, i: number) => (
          <div key={i}>
            <div className="text-[10px] uppercase tracking-wide text-slate-400">{s.label}</div>
            <div className="mt-0.5 text-sm font-bold text-slate-800">{s.value}</div>
          </div>
        ))}
      </div>

      <div className="mt-5 flex gap-2 border-t border-slate-100 pt-4">
        <button onClick={() => onOpen(r)} className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50">
          <BarChart3 size={13} />View Report
        </button>
        <button onClick={() => toast(`Exporting ${r.title}…`)} className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50">
          <Download size={13} />Export
        </button>
      </div>
    </Card>
  );
}

/* ============================== DETAIL ============================== */
function ReportDetail({ r, onBack, toast }: any) {
  const Icon = ICONS[r.icon as keyof typeof ICONS] || BarChart3;
  const total = r.bars.reduce((s: any, b: any) => s + b.value, 0);
  return (
    <div>
      <button onClick={onBack} className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800">
        <ArrowLeft size={15} />Back to Reports
      </button>

      <div className="mb-5 flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className={`grid h-11 w-11 place-items-center rounded-lg ${TINT[r.tint as keyof typeof TINT]}`}><Icon size={22} /></div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>{r.title}</h1>
              {r.badge && <Pill tone="blue">{r.badge}</Pill>}
            </div>
            <p className="mt-1 text-sm text-slate-500">{r.desc}</p>
          </div>
        </div>
        <button onClick={() => toast(`Exporting ${r.title}…`)} className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700">
          <Download size={15} />Export
        </button>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {r.stats.map((s: any, i: number) => (
          <Card key={i} className="p-4">
            <div className="text-[10px] uppercase tracking-wide text-slate-400">{s.label}</div>
            <div className="mt-1 text-lg font-bold text-slate-900">{s.value}</div>
          </Card>
        ))}
      </div>

      <Card className="mb-6 p-5">
        <h3 className="mb-4 font-semibold text-slate-800">Breakdown</h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={r.bars} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} interval={0} />
            <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
            <Tooltip cursor={{ fill: "#f1f5f9" }} contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }} />
            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
              {r.bars.map((b: any, i: number) => <Cell key={i} fill={b.color || DEFAULT_BAR} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-slate-200 bg-slate-50/80 text-left text-xs uppercase tracking-wide text-slate-500">
            {["Category", "Value (index)", "Share"].map((h) => <th key={h} className="px-5 py-3 font-semibold">{h}</th>)}
          </tr></thead>
          <tbody>
            {r.bars.map((b: any, i: number) => (
              <tr key={i} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                <td className="px-5 py-3.5 text-slate-700">{b.label}</td>
                <td className="px-5 py-3.5 font-mono text-slate-600">{b.value}</td>
                <td className="px-5 py-3.5 font-mono text-slate-500">{((b.value / total) * 100).toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

/* ============================== PAGE ============================== */
export default function EnterpriseReports({ toast }: any) {
  const [open, setOpen] = useState<any>(null);

  if (open) return <ReportDetail r={open} onBack={() => setOpen(null)} toast={toast} />;

  return (
    <div>
      <div className="mb-1 flex items-start justify-between gap-4">
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-slate-900" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
          <BarChart3 size={22} className="text-slate-400" />Reports
        </h1>
        <button onClick={() => toast("Exporting all reports…")} className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700">
          <Download size={15} />Export All
        </button>
      </div>
      <p className="mb-5 text-sm text-slate-500">Freight analytics for Bharat Cement &amp; Industries Ltd · Reports are computed from live operational data.</p>

      {/* Filter bar (visual only) */}
      <Card className="mb-6 flex flex-wrap items-center gap-2 p-3">
        <span className="inline-flex items-center gap-1.5 px-2 text-xs font-medium text-slate-500"><Filter size={13} className="text-slate-400" />Filters:</span>
        <FilterBtn icon={Calendar}>April 2025</FilterBtn>
        <FilterBtn>All Business Units</FilterBtn>
        <FilterBtn>All Plants</FilterBtn>
        <FilterBtn>All Vendors</FilterBtn>
        <FilterBtn>All Lanes</FilterBtn>
        <FilterBtn>All Vehicle Types</FilterBtn>
        <span className="ml-auto px-2 text-xs italic text-slate-400">Showing: April 2025</span>
      </Card>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        {ENTERPRISE_REPORTS.map((r) => (
          <ReportCard key={r.id} r={r} onOpen={setOpen} toast={toast} />
        ))}
      </div>
    </div>
  );
}
