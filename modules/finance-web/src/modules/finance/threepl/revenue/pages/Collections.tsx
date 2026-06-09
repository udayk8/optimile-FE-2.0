import React, { useState, useMemo } from "react";
import { Bell, Download, ScrollText } from "lucide-react";
import { Card, Pill, Money, SectionTitle } from "@finance/components/primitives";
import { exportCsv } from "@finance/lib/csv";
import { useReceivables } from "@finance/lib/receivablesStore";
import { useAuditLogger } from "@finance/lib/auditStore";

const STATUS_LABEL = { overdue: "Overdue", "due-soon": "Due soon", current: "Current" };
const STATUS_TONE = { overdue: "red", "due-soon": "amber", current: "green" };

const REPORT_COLUMNS = [
  { key: "id", label: "Invoice" },
  { key: "client", label: "Customer" },
  { key: "lane", label: "Lane" },
  { key: "amount", label: "Amount" },
  { key: "due", label: "Due Date" },
  { key: "status", label: "Status", value: (i: any) => STATUS_LABEL[i.status as keyof typeof STATUS_LABEL] },
  { key: "ageing", label: "Ageing", value: (i: any) => (i.status === "overdue" ? `${i.daysOverdue}d overdue` : `in ${i.daysUntil}d`) },
];

export default function Collections({ toast }: any) {
  const { invoices } = useReceivables();
  const logAudit = useAuditLogger();
  const remind = (inv: { id: string; client: string }) => {
    logAudit({ user: "Finance", action: "Payment reminder sent", entity: inv.id, type: "Invoice", to: inv.client });
    toast(`Reminder email sent to ${inv.client}`);
  };
  const [customer, setCustomer] = useState("all");

  // Debtors = customers who owe money = APPROVED invoices not yet paid.
  // (Submitted/awaiting-client isn't owed yet; disputed/closed/paid aren't debtors.)
  const owed = useMemo(() => invoices.filter((i) => i.stage === "approved" && i.paymentStatus !== "paid"), [invoices]);
  const customers = useMemo(() => [...new Set(owed.map((i) => i.client))], [owed]);
  const rows = owed.filter((i) => customer === "all" || i.client === customer);

  // KPIs from the live AR invoices.
  const accepted = useMemo(() => invoices.filter((i) => i.stage === "approved" || i.paymentStatus === "paid"), [invoices]);
  const invoicedTotal = accepted.reduce((s, i) => s + i.amount, 0);
  const collectedTotal = invoices.filter((i) => i.paymentStatus === "paid").reduce((s, i) => s + i.amount, 0);
  const overdueTotal = owed.filter((i) => i.status === "overdue").reduce((s, i) => s + i.amount, 0);
  const efficiency = invoicedTotal > 0 ? Math.round((collectedTotal / invoicedTotal) * 100) : 0;

  // Live dispute summary — customer-raised disputes, straight from the bridged invoices.
  const openDisputes = useMemo(() => invoices.filter((i) => i.stage === "disputed"), [invoices]);
  const inDispute = openDisputes.reduce((s, i) => s + i.amount, 0);
  const byCustomer = openDisputes.reduce((m: Record<string, number>, i) => ({ ...m, [i.client]: (m[i.client] || 0) + i.amount }), {});

  const downloadReport = () => {
    exportCsv("debtors-report.csv", REPORT_COLUMNS, rows);
    toast(`Downloaded debtors-report.csv (${rows.length} invoices)`);
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
          { l: "Invoiced", v: invoicedTotal, tone: "slate" },
          { l: "Collected", v: collectedTotal, tone: "green" },
          { l: "Overdue", v: overdueTotal, tone: "red" },
          { l: "Collection Efficiency", v: `${efficiency}%`, tone: "amber", raw: true },
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
            {rows.map((inv) => (
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
                  {inv.status === "overdue" && (
                    <button onClick={() => remind(inv)}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50">
                      <Bell size={12} />Remind
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={7} className="px-5 py-10 text-center text-slate-400">No outstanding invoices — nothing owed right now.</td></tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
