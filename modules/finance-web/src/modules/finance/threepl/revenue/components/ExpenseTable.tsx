import React from "react";
import { Download, ReceiptText } from "lucide-react";
import { Card, Pill, Money } from "@finance/components/primitives";
import type { LedgerExpense } from "@finance/lib/receivablesStore";

const STATUS_TONE: Record<LedgerExpense["status"], any> = {
  Approved: "green",
  Pending: "amber",
  Rejected: "red",
};

/* Itemised booking expenses — every charge recorded on the booking, surfaced
   from the booking module. Approved expenses bill into the invoice; Pending are
   shown for visibility; Rejected are excluded from the total. */
export default function ExpenseTable({
  items,
  title = "Booking expenses",
  toast,
}: {
  items: LedgerExpense[];
  title?: string;
  toast?: (m: string) => void;
}) {
  const approved = items.filter((e) => e.status === "Approved").reduce((s, e) => s + e.amount, 0);
  const pending = items.filter((e) => e.status === "Pending").reduce((s, e) => s + e.amount, 0);

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-5 py-3">
        <span className="flex items-center gap-2 font-semibold text-slate-800">
          <ReceiptText size={16} className="text-slate-400" />
          {title}
        </span>
        <span className="text-xs text-slate-500">
          Approved <Money value={approved} className="font-semibold text-emerald-700" />
          <span className="mx-1.5 text-slate-300">·</span>
          Pending <Money value={pending} className="font-semibold text-amber-600" />
        </span>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50/80 text-left text-xs uppercase tracking-wide text-slate-500">
            {["Expense type", "Payment mode", "Paid by", "Status", "Bill / Receipt"].map((h) => (
              <th key={h} className="px-5 py-3 font-semibold">{h}</th>
            ))}
            <th className="px-5 py-3 text-right font-semibold">Amount</th>
          </tr>
        </thead>
        <tbody>
          {items.map((e, i) => (
            <tr key={i} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
              <td className="px-5 py-3.5 font-medium text-slate-700">{e.type}</td>
              <td className="px-5 py-3.5 text-slate-600">{e.paymentMode ?? "—"}</td>
              <td className="px-5 py-3.5 text-slate-600">{e.paidBy ?? "—"}</td>
              <td className="px-5 py-3.5"><Pill tone={STATUS_TONE[e.status]}>{e.status}</Pill></td>
              <td className="px-5 py-3.5">
                {e.billReceipt ? (
                  <button
                    onClick={() => toast?.(`Downloading ${e.type} bill/receipt`)}
                    className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline"
                  >
                    <Download size={12} />Download
                  </button>
                ) : (
                  <span className="text-xs text-slate-400">—</span>
                )}
              </td>
              <td className="px-5 py-3.5 text-right">
                <Money value={e.amount} className={`font-semibold ${e.status === "Rejected" ? "text-slate-400 line-through" : "text-slate-800"}`} />
              </td>
            </tr>
          ))}
          {items.length === 0 && (
            <tr><td colSpan={6} className="px-5 py-8 text-center text-slate-400">No expenses recorded on this booking.</td></tr>
          )}
        </tbody>
      </table>
    </Card>
  );
}
