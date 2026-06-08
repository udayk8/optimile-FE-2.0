import React, { useMemo, useState } from "react";
import { Download, Bell, ScrollText, X, ArrowRight } from "lucide-react";
import { Card, Pill, Money, SectionTitle, Modal, ModalHeader, Btn } from "@finance/components/primitives";
import { exportCsv } from "@finance/lib/csv";
import { useReceivables, type ARInvoice } from "@finance/lib/receivablesStore";
import { useDisputes } from "@finance/lib/disputesStore";
import { useAuditLogger } from "@finance/lib/auditStore";

/* BRD 8.1 — Collections / Accounts Receivable Report.
   Aging summary strip + detailed trip-row table with filters, export, drill-down. */

const dayMs = 86400000;
const daysTo = (due?: string) => (due ? Math.round((new Date(due + "T00:00:00").getTime() - Date.now()) / dayMs) : 0);

type BucketKey = "current" | "due7" | "od7" | "od15" | "od30" | "od60" | "od60p";
const BUCKETS: { key: BucketKey; label: string; chip: string; bar: string }[] = [
  { key: "current", label: "Current", chip: "bg-emerald-50 text-emerald-700 ring-emerald-600/20", bar: "bg-emerald-500" },
  { key: "due7", label: "Due 1–7d", chip: "bg-amber-50 text-amber-700 ring-amber-500/30", bar: "bg-amber-500" },
  { key: "od7", label: "Overdue 1–7d", chip: "bg-red-50 text-red-600 ring-red-400/30", bar: "bg-red-400" },
  { key: "od15", label: "Overdue 8–15d", chip: "bg-red-50 text-red-700 ring-red-500/30", bar: "bg-red-500" },
  { key: "od30", label: "Overdue 16–30d", chip: "bg-red-100 text-red-700 ring-red-500/30", bar: "bg-red-600" },
  { key: "od60", label: "Overdue 31–60d", chip: "bg-red-100 text-red-800 ring-red-600/30", bar: "bg-red-700" },
  { key: "od60p", label: "Overdue >60d", chip: "bg-red-200 text-red-900 ring-red-700/30", bar: "bg-red-900" },
];
const bucketOf = (delta: number): BucketKey =>
  delta > 7 ? "current" : delta >= 0 ? "due7" : delta >= -7 ? "od7" : delta >= -15 ? "od15" : delta >= -30 ? "od30" : delta >= -60 ? "od60" : "od60p";

const ageLabel = (delta: number) => (delta >= 0 ? `in ${delta}d` : `${-delta}d overdue`);

export default function ARReport({ toast }: any) {
  const { invoices } = useReceivables();
  const { disputes } = useDisputes();
  const logAudit = useAuditLogger();
  const remind = (id: string, client: string) => {
    logAudit({ user: "Finance", action: "Payment reminder sent", entity: id, type: "Invoice", to: client });
    toast(`Reminder email sent to ${client}`);
  };
  const [client, setClient] = useState("all");
  const [status, setStatus] = useState("all");
  const [bucket, setBucket] = useState<"all" | BucketKey>("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [drill, setDrill] = useState<any>(null);

  const disputedIds = useMemo(
    () => new Set(disputes.filter((d) => d.kind === "customer" && d.stage !== "resolved").map((d) => d.id)),
    [disputes],
  );

  // Raised & unpaid invoices = the live receivables position (submitted or approved,
  // not yet paid). Paid invoices drop out of outstanding.
  const all = useMemo(() => invoices.filter((i) => (i.stage === "submitted" || i.stage === "approved") && i.paymentStatus !== "paid").map((i) => {
    const delta = daysTo(i.due);
    const disputed = disputedIds.has(i.id);
    return {
      ...i,
      delta,
      bucket: bucketOf(delta),
      statusLabel: disputed ? "Disputed" : delta < 0 ? "Overdue" : "Current",
    };
  }), [invoices, disputedIds]);

  const clients = useMemo(() => [...new Set(all.map((i) => i.client))], [all]);

  const rows = all.filter((i) =>
    (client === "all" || i.client === client) &&
    (status === "all" || i.statusLabel === status) &&
    (bucket === "all" || i.bucket === bucket) &&
    (!from || (i.date ?? "") >= from) &&
    (!to || (i.date ?? "") <= to),
  );

  // Aging summary across the (filter-respecting, minus bucket) set so the strip stays a true overview.
  const agingBase = all.filter((i) =>
    (client === "all" || i.client === client) &&
    (!from || (i.date ?? "") >= from) && (!to || (i.date ?? "") <= to),
  );
  const summary = BUCKETS.map((b) => {
    const items = agingBase.filter((i) => i.bucket === b.key);
    return { ...b, count: items.length, amount: items.reduce((s, i) => s + i.amount, 0) };
  });
  const totalOutstanding = agingBase.reduce((s, i) => s + i.amount, 0);

  const COLUMNS = [
    { key: "client", label: "Client" },
    { key: "id", label: "Invoice Number" },
    { key: "date", label: "Invoice Date" },
    { key: "amount", label: "Amount" },
    { key: "tripId", label: "Trip ID", value: (r: any) => r.tripId ?? "" },
    { key: "lane", label: "Origin → Destination" },
    { key: "due", label: "Due Date" },
    { label: "Days Until / Overdue", value: (r: any) => ageLabel(r.delta) },
    { key: "terms", label: "Payment Terms" },
    { key: "statusLabel", label: "Status" },
  ];
  const download = () => { exportCsv("ar-collections-report.csv", COLUMNS, rows); toast(`Downloaded ar-collections-report.csv (${rows.length} invoices)`); };

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <SectionTitle sub="Money owed by clients — aging at a glance, then every invoice with days to due / overdue. Chase what's approaching and what's late.">Collections / AR Report</SectionTitle>
        <Btn className="px-4 py-2" onClick={download}><Download size={15} />Export to Excel (CSV)</Btn>
      </div>

      {/* Aging summary */}
      <Card className="mb-6 p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-semibold text-slate-800">Aging summary</h3>
          <span className="text-sm text-slate-500">Outstanding <Money value={totalOutstanding} className="font-semibold text-slate-800" /></span>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          {summary.map((b) => (
            <button key={b.key} onClick={() => setBucket(bucket === b.key ? "all" : b.key)}
              className={`rounded-lg p-3 text-left ring-1 ring-inset transition ${b.chip} ${bucket === b.key ? "outline outline-2 outline-slate-900/30" : ""}`}>
              <div className="text-[11px] font-medium">{b.label}</div>
              <div className="mt-1 text-sm font-bold"><Money value={b.amount} /></div>
              <div className="text-[11px] opacity-70">{b.count} inv</div>
            </button>
          ))}
        </div>
      </Card>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <select value={client} onChange={(e) => setClient(e.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 outline-none focus:border-slate-300">
          <option value="all">All clients</option>
          {clients.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 outline-none focus:border-slate-300">
          {["all", "Current", "Overdue", "Disputed"].map((s) => <option key={s} value={s}>{s === "all" ? "All statuses" : s}</option>)}
        </select>
        <select value={bucket} onChange={(e) => setBucket(e.target.value as any)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 outline-none focus:border-slate-300">
          <option value="all">All aging buckets</option>
          {BUCKETS.map((b) => <option key={b.key} value={b.key}>{b.label}</option>)}
        </select>
        <label className="flex items-center gap-1 text-xs text-slate-500">From <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-slate-300" /></label>
        <label className="flex items-center gap-1 text-xs text-slate-500">To <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-slate-300" /></label>
      </div>

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-slate-200 bg-slate-50/80 text-left text-xs uppercase tracking-wide text-slate-500">
            {["Client", "Invoice", "Date", "Amount", "Trip", "Lane", "Due", "Days", "Terms", "Status", ""].map((h, i) => <th key={i} className="px-4 py-3 font-semibold">{h}</th>)}
          </tr></thead>
          <tbody>
            {rows.map((r) => {
              const tone = r.statusLabel === "Disputed" ? "amber" : r.statusLabel === "Overdue" ? "red" : "green";
              const rowBg = r.bucket === "due7" ? "bg-amber-50/40" : r.bucket === "od7" ? "bg-red-50/30" : r.bucket === "od60p" ? "bg-red-100/40" : "";
              return (
                <tr key={r.id} className={`border-b border-slate-100 last:border-0 hover:bg-slate-50/50 ${rowBg}`}>
                  <td className="px-4 py-3 text-slate-700">{r.client}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-700">{r.id}</td>
                  <td className="px-4 py-3 text-slate-500">{r.date}</td>
                  <td className="px-4 py-3"><Money value={r.amount} className="font-semibold text-slate-800" /></td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">{r.tripId ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-500">{r.lane}</td>
                  <td className="px-4 py-3 text-slate-600">{r.due}</td>
                  <td className="px-4 py-3"><span className={r.delta < 0 ? "text-red-600" : "text-slate-600"}>{ageLabel(r.delta)}</span></td>
                  <td className="px-4 py-3 text-slate-500">{r.terms}</td>
                  <td className="px-4 py-3"><Pill tone={tone as any}>{r.statusLabel}</Pill></td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {r.delta < 0 && <button onClick={() => remind(r.id, r.client)} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"><Bell size={11} />Remind</button>}
                      <button onClick={() => setDrill(r)} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50">Trip<ArrowRight size={11} /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && <tr><td colSpan={11} className="px-5 py-12 text-center text-slate-400">No invoices match the current filters.</td></tr>}
          </tbody>
        </table>
      </Card>

      {drill && <DrillModal inv={drill} onClose={() => setDrill(null)} toast={toast} />}
    </div>
  );
}

function DrillModal({ inv, onClose, toast }: { inv: ARInvoice & any; onClose: () => void; toast: (m: string) => void }) {
  const logAudit = useAuditLogger();
  const field = (k: string, v: React.ReactNode) => (
    <div className="flex justify-between border-b border-slate-100 py-2 text-sm last:border-0"><span className="text-slate-500">{k}</span><span className="text-slate-800">{v}</span></div>
  );
  return (
    <Modal onClose={onClose}>
      <ModalHeader title={`Trip detail · ${inv.id}`} tone="blue" icon={ScrollText} onClose={onClose} />
      <div className="p-6">
        {field("Client", inv.client)}
        {field("Trip ID", inv.tripId ?? "—")}
        {field("Lane", inv.lane)}
        {field("Invoice date", inv.date)}
        {field("Due date", inv.due)}
        {field("Days until / overdue", ageLabel(inv.delta))}
        {field("Payment terms", inv.terms)}
        {field("Amount", <Money value={inv.amount} className="font-semibold" />)}
        {field("Status", inv.statusLabel)}
        <div className="mt-5 flex gap-3">
          <Btn variant="ghost" className="flex-1 py-2.5" onClick={onClose}><X size={14} />Close</Btn>
          {inv.delta < 0 && <Btn className="flex-1 py-2.5" onClick={() => { logAudit({ user: "Finance", action: "Payment reminder sent", entity: inv.id, type: "Invoice", to: inv.client }); toast(`Reminder email sent to ${inv.client}`); onClose(); }}><Bell size={14} />Send reminder</Btn>}
        </div>
      </div>
    </Modal>
  );
}
