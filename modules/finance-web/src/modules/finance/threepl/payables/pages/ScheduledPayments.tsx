import React, { useMemo, useState } from "react";
import { Wallet, CalendarClock, CheckCircle2, Banknote } from "lucide-react";
import { Card, Pill, Money, SectionTitle, Btn } from "@finance/components/primitives";
import { usePayables, type Payment } from "@finance/lib/payablesStore";

/* BRD 5.1 — approved bills are scheduled by due date; the finance person
   selects invoices due on the same date and processes them in one batch run. */
export default function ScheduledPayments({ toast }: any) {
  const { payments, processBatch } = usePayables();
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const scheduled = useMemo(() => payments.filter((p) => p.status === "scheduled"), [payments]);
  const paid = useMemo(() => payments.filter((p) => p.status === "paid"), [payments]);

  // Group scheduled payments by due date — a batch run pays everything on one date.
  const byDate = useMemo(() => {
    const m = new Map<string, Payment[]>();
    scheduled.forEach((p) => m.set(p.dueDate, [...(m.get(p.dueDate) || []), p]));
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [scheduled]);

  const toggle = (id: string) => setSelected((s) => {
    const next = new Set(s);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });
  const selectDate = (ps: Payment[]) => setSelected((s) => {
    const next = new Set(s);
    const allOn = ps.every((p) => next.has(p.id));
    ps.forEach((p) => (allOn ? next.delete(p.id) : next.add(p.id)));
    return next;
  });

  const selectedTotal = scheduled.filter((p) => selected.has(p.id)).reduce((s, p) => s + p.amount, 0);

  const runBatch = () => {
    const ids = [...selected];
    const batchId = processBatch(ids);
    setSelected(new Set());
    if (batchId) toast(`${ids.length} payment${ids.length > 1 ? "s" : ""} processed in one run · ${batchId}`);
  };

  return (
    <div>
      <SectionTitle sub="Approved vendor bills are scheduled by their payment-term due date. Select invoices due on the same date and process them in a single bank-transaction run.">Scheduled Payments</SectionTitle>

      <div className="mb-6 grid grid-cols-3 gap-4">
        {[
          { l: "Scheduled", v: scheduled.length, tone: "text-slate-800" },
          { l: "Payable (scheduled)", v: scheduled.reduce((s, p) => s + p.amount, 0), money: true, tone: "text-amber-600" },
          { l: "Paid", v: paid.length, tone: "text-emerald-600" },
        ].map((s) => (
          <Card key={s.l} className="p-4">
            <div className="text-xs text-slate-500">{s.l}</div>
            <div className={`mt-1 text-2xl font-bold ${s.tone}`}>{s.money ? <Money value={s.v as number} /> : s.v}</div>
          </Card>
        ))}
      </div>

      {selected.size > 0 && (
        <Card className="mb-4 flex flex-wrap items-center justify-between gap-3 p-4 ring-1 ring-blue-200">
          <div className="text-sm text-slate-600">{selected.size} selected · <span className="font-mono font-semibold text-slate-800"><Money value={selectedTotal} /></span></div>
          <Btn className="px-4 py-2" onClick={runBatch}><Wallet size={14} />Process batch payment</Btn>
        </Card>
      )}

      {byDate.length === 0 && (
        <Card className="p-12 text-center text-slate-400">
          <Banknote size={28} className="mx-auto mb-2 text-slate-300" />
          No scheduled payments. Approve a vendor bill on Vendor Match to schedule one.
        </Card>
      )}

      <div className="space-y-5">
        {byDate.map(([date, ps]) => {
          const dateTotal = ps.reduce((s, p) => s + p.amount, 0);
          const allOn = ps.every((p) => selected.has(p.id));
          return (
            <Card key={date} className="overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/60 px-5 py-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <CalendarClock size={15} className="text-slate-400" />Due {date}
                  <Pill tone="slate">{ps.length} invoice{ps.length > 1 ? "s" : ""}</Pill>
                </div>
                <div className="flex items-center gap-4">
                  <Money value={dateTotal} className="font-semibold text-slate-800" />
                  <Btn variant="ghost" onClick={() => selectDate(ps)}>{allOn ? "Clear" : "Select date"}</Btn>
                </div>
              </div>
              <table className="w-full text-sm">
                <tbody>
                  {ps.map((p) => (
                    <tr key={p.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                      <td className="px-5 py-3"><input type="checkbox" checked={selected.has(p.id)} onChange={() => toggle(p.id)} className="h-4 w-4 rounded border-slate-300" /></td>
                      <td className="px-5 py-3 font-mono text-xs text-slate-600">{p.billId}</td>
                      <td className="px-5 py-3 text-slate-700">{p.vendor}</td>
                      <td className="px-5 py-3 text-right"><Money value={p.amount} className="font-semibold text-slate-800" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          );
        })}
      </div>

      {paid.length > 0 && (
        <Card className="mt-6 overflow-hidden">
          <div className="border-b border-slate-100 px-5 py-3 font-semibold text-slate-800">Processed runs</div>
          <table className="w-full text-sm">
            <thead><tr className="border-b border-slate-200 bg-slate-50/80 text-left text-xs uppercase tracking-wide text-slate-500">
              {["Payment", "Bill", "Vendor", "Batch", "Amount"].map((h) => <th key={h} className="px-5 py-2.5 font-semibold">{h}</th>)}
            </tr></thead>
            <tbody>
              {paid.map((p) => (
                <tr key={p.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-5 py-3 font-mono text-xs text-slate-600"><CheckCircle2 size={12} className="mr-1 inline text-emerald-500" />{p.id}</td>
                  <td className="px-5 py-3 font-mono text-xs text-slate-500">{p.billId}</td>
                  <td className="px-5 py-3 text-slate-600">{p.vendor}</td>
                  <td className="px-5 py-3 font-mono text-xs text-slate-500">{p.batchId}</td>
                  <td className="px-5 py-3"><Money value={p.amount} className="text-slate-700" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
