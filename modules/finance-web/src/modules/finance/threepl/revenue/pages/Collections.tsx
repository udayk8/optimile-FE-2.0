import React, { useState, useMemo } from "react";
import { Bell, Download, ScrollText, AlertTriangle } from "lucide-react";
import { Card, Pill, Money, SectionTitle, Modal, ModalHeader } from "@finance/components/primitives";
import { exportCsv } from "@finance/lib/csv";
import { useDisputes } from "@finance/lib/disputesStore";
import { useReceivables } from "@finance/lib/receivablesStore";

const STATUS_LABEL = { overdue: "Overdue", "due-soon": "Due soon", current: "Current" };
const STATUS_TONE = { overdue: "red", "due-soon": "amber", current: "green" };
const today = () => new Date().toISOString().slice(0, 10);

const REPORT_COLUMNS = [
  { key: "id", label: "Invoice" },
  { key: "client", label: "Customer" },
  { key: "lane", label: "Lane" },
  { key: "amount", label: "Amount" },
  { key: "due", label: "Due Date" },
  { key: "status", label: "Status", value: (i: any) => STATUS_LABEL[i.status as keyof typeof STATUS_LABEL] },
  { key: "ageing", label: "Ageing", value: (i: any) => (i.status === "overdue" ? `${i.daysOverdue}d overdue` : `in ${i.daysUntil}d`) },
];

function RaiseDisputeModal({ invoice, onClose, onSubmit }: any) {
  const [reason, setReason] = useState("");
  return (
    <Modal onClose={onClose}>
      <ModalHeader title="Raise dispute" tone="amber" icon={AlertTriangle} onClose={onClose} />
      <div className="p-6">
        <div className="mb-4 space-y-1 text-sm">
          <div className="flex justify-between"><span className="text-slate-500">Invoice</span><span className="font-mono text-slate-800">{invoice.id}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">Customer</span><span className="text-slate-800">{invoice.client}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">Amount</span><Money value={invoice.amount} className="font-semibold text-slate-800" /></div>
        </div>
        <label className="text-xs font-medium text-slate-500">Reason raised by customer</label>
        <textarea autoFocus value={reason} onChange={(e) => setReason(e.target.value)} rows={3}
          placeholder="e.g. Rate mismatch — billed higher than agreed contract rate"
          className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-slate-300 focus:bg-white" />
        <div className="mt-5 flex gap-3">
          <button onClick={onClose} className="flex-1 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50">Cancel</button>
          <button onClick={() => onSubmit(reason.trim())} disabled={!reason.trim()}
            className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50">
            <AlertTriangle size={14} />Raise dispute
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default function Collections({ toast }: any) {
  const { disputes, addDispute } = useDisputes();
  const { invoices } = useReceivables();
  const [customer, setCustomer] = useState("all");
  const [raising, setRaising] = useState<any>(null);

  // Debtors = invoices the client has approved (now outstanding in the AR ledger).
  const approved = useMemo(() => invoices.filter((i) => i.stage === "approved"), [invoices]);
  const customers = useMemo(() => [...new Set(approved.map((i) => i.client))], [approved]);
  const rows = approved.filter((i) => customer === "all" || i.client === customer);

  // Live dispute summary (customer-raised, still open)
  const openDisputes = disputes.filter((d) => d.kind === "customer" && d.stage !== "resolved");
  const inDispute = openDisputes.reduce((s, d) => s + d.amount, 0);
  const byCustomer = openDisputes.reduce((m: Record<string, any>, d) => ({ ...m, [d.client]: (m[d.client] || 0) + d.amount }), {});
  const disputedIds = new Set(disputes.filter((d) => d.kind === "customer").map((d) => d.id));

  const downloadReport = () => {
    exportCsv("debtors-report.csv", REPORT_COLUMNS, rows);
    toast(`Downloaded debtors-report.csv (${rows.length} invoices)`);
  };

  const submitDispute = (reason: any) => {
    const inv = raising;
    addDispute({ id: inv.id, client: inv.client, amount: inv.amount, reason, stage: "raised", raised: today(), slaHrs: 48, owner: "—", kind: "customer" });
    setRaising(null);
    toast(`Dispute raised on ${inv.id} by ${inv.client}`);
  };

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <SectionTitle sub="Money owed by your customers (debtors). Chase overdue invoices and track disputes in real time.">Debtors</SectionTitle>
        <div className="flex items-center gap-2">
          <select value={customer} onChange={(e) => setCustomer(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 outline-none focus:border-slate-300">
            <option value="all">All customers</option>
            {customers.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <button onClick={downloadReport} className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700">
            <Download size={15} />Download report
          </button>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { l: "Invoiced (MTD)", v: 1245000, tone: "slate" },
          { l: "Collected (MTD)", v: 722000, tone: "green" },
          { l: "Overdue", v: 344000, tone: "red" },
          { l: "Collection Efficiency", v: "58%", tone: "amber", raw: true },
        ].map((s, i) => (
          <Card key={i} className="p-4">
            <div className="text-xs text-slate-500">{s.l}</div>
            <div className={`mt-1 text-lg font-bold ${s.tone === "red" ? "text-red-600" : s.tone === "green" ? "text-emerald-600" : "text-slate-800"}`}>
              {s.raw ? s.v : <Money value={s.v as number} />}
            </div>
          </Card>
        ))}
      </div>

      {/* Real-time dispute summary */}
      <Card className="mb-6 p-5 ring-1 ring-amber-200">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h3 className="flex items-center gap-2 font-semibold text-slate-800"><ScrollText size={17} className="text-amber-500" />Dispute summary <span className="text-xs font-normal text-slate-400">· live</span></h3>
          <div className="flex items-center gap-6 text-sm">
            <div><span className="font-bold text-slate-900">{openDisputes.length}</span> <span className="text-slate-500">open</span></div>
            <div><Money value={inDispute} className="font-bold text-amber-600" /> <span className="text-slate-500">in dispute</span></div>
          </div>
        </div>
        {openDisputes.length === 0 ? (
          <div className="text-sm text-slate-400">No open customer disputes.</div>
        ) : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {Object.entries(byCustomer).map(([name, amt]) => (
              <div key={name} className="flex items-center justify-between rounded-lg bg-amber-50/60 px-3 py-2 text-sm">
                <span className="text-slate-700">{name}</span>
                <Money value={amt as number} className="font-semibold text-amber-700" />
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/80 text-left text-xs uppercase tracking-wide text-slate-500">
              {["Invoice", "Customer", "Lane", "Amount", "Due Date", "Status", ""].map((h, i) => <th key={i} className="px-5 py-3 font-semibold">{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((inv) => {
              const disputed = disputedIds.has(inv.id);
              return (
                <tr key={inv.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                  <td className="px-5 py-3.5 font-mono text-xs text-slate-700">{inv.id}</td>
                  <td className="px-5 py-3.5 text-slate-700">{inv.client}</td>
                  <td className="px-5 py-3.5 text-slate-500">{inv.lane}</td>
                  <td className="px-5 py-3.5"><Money value={inv.amount} className="font-semibold text-slate-800" /></td>
                  <td className="px-5 py-3.5 text-slate-600">{inv.due}
                    <div className="text-xs text-slate-400">{inv.status === "overdue" ? `${inv.daysOverdue}d overdue` : `in ${inv.daysUntil}d`}</div>
                  </td>
                  <td className="px-5 py-3.5"><Pill tone={STATUS_TONE[inv.status as keyof typeof STATUS_TONE] as any}>{STATUS_LABEL[inv.status as keyof typeof STATUS_LABEL]}</Pill></td>
                  <td className="px-5 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {inv.status === "overdue" && (
                        <button onClick={() => toast("Reminder email sent to " + inv.client)}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50">
                          <Bell size={12} />Remind
                        </button>
                      )}
                      {disputed ? (
                        <Pill tone="amber"><AlertTriangle size={11} />Disputed</Pill>
                      ) : (
                        <button onClick={() => setRaising(inv)}
                          className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 hover:bg-amber-100">
                          <ScrollText size={12} />Raise dispute
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      {raising && <RaiseDisputeModal invoice={raising} onClose={() => setRaising(null)} onSubmit={submitDispute} />}
    </div>
  );
}
