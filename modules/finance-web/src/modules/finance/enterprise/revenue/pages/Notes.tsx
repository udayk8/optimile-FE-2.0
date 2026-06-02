import React, { useState } from "react";
import { Check, FileMinus, FilePlus, ShieldCheck } from "lucide-react";
import { Card, Pill, Money, SectionTitle, Stepper } from "@finance/components/primitives";
import { DEBIT_NOTES, ENTERPRISE_CREDIT_NOTES } from "@finance/data/mock";

const DN_STAGES = ["Ops Raises", "Decision-maker Approves", "Issued", "Ledger Updated"];
const CN_STAGES = ["Vendor Raises", "Finance Review", "Approved", "Applied to Payable"];
const STAGE_IDX = { "pending-approval": 1, issued: 3 };

function NoteCard({ n, kind, stages, onApprove }: any) {
  const idx = n.stage === "issued" ? 3 : (STAGE_IDX as Record<string, any>)[n.stage] ?? 1;
  // Buyer mode: both debit (we charge vendor) and credit (vendor credits us) are vendor-side.
  const party = n.vendor;
  return (
    <Card className={`p-5 ${n.stage === "pending-approval" ? "ring-1 ring-amber-200" : ""}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-semibold text-slate-800">{n.id}</span>
            <span className="text-sm text-slate-400">·</span>
            <span className="text-sm text-slate-600">{party}</span>
            <Pill tone="slate">{n.trip}</Pill>
            <Money value={n.amount} className="text-sm font-semibold text-slate-800" />
          </div>
          <div className="mt-1 text-xs text-slate-500">{n.reason}</div>
          <div className="mt-1 text-xs text-slate-400">Raised by {n.raisedBy}{n.approvedBy && ` · Approved by ${n.approvedBy}`}</div>
        </div>
        {n.stage === "issued" ? <Pill tone="green"><Check size={11} />Issued</Pill> : <Pill tone="amber">Pending approval</Pill>}
      </div>
      <div className="mt-4"><Stepper steps={stages} current={idx} /></div>
      {n.stage === "pending-approval" && (
        <div className="mt-4 flex justify-end">
          <button onClick={() => onApprove(n.id)} className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-700">
            <ShieldCheck size={13} />Approve & issue (decision-maker)
          </button>
        </div>
      )}
    </Card>
  );
}

export default function Notes({ toast }: any) {
  const [tab, setTab] = useState("debit");
  const [debit, setDebit] = useState(DEBIT_NOTES);
  const [credit, setCredit] = useState(ENTERPRISE_CREDIT_NOTES);

  const approveDebit = (id: any) => { setDebit((xs) => xs.map((n) => (n.id === id ? { ...n, stage: "issued", approvedBy: "VP Ops" } : n))); toast(`Debit note ${id} approved & issued to vendor`); };
  const approveCredit = (id: any) => { setCredit((xs) => xs.map((n) => (n.id === id ? { ...n, stage: "issued", approvedBy: "Finance Head" } : n))); toast(`Credit note ${id} approved & applied to vendor payable`); };

  return (
    <div>
      <SectionTitle sub="Adjustments to invoices, tracked per-trip. Every note needs decision-maker approval before issue.">Credit & Debit Notes</SectionTitle>

      <div className="mb-5 inline-flex rounded-lg bg-slate-100 p-1 text-sm">
        <button onClick={() => setTab("debit")} className={`inline-flex items-center gap-1.5 rounded-md px-4 py-1.5 font-medium transition ${tab === "debit" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}><FileMinus size={14} />Debit notes (vs vendor)</button>
        <button onClick={() => setTab("credit")} className={`inline-flex items-center gap-1.5 rounded-md px-4 py-1.5 font-medium transition ${tab === "credit" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}><FilePlus size={14} />Credit notes (from vendor)</button>
      </div>

      <div className="space-y-4">
        {tab === "debit"
          ? debit.map((n) => <NoteCard key={n.id} n={n} kind="debit" stages={DN_STAGES} onApprove={approveDebit} />)
          : credit.map((n) => <NoteCard key={n.id} n={n} kind="credit" stages={CN_STAGES} onApprove={approveCredit} />)}
      </div>
    </div>
  );
}
