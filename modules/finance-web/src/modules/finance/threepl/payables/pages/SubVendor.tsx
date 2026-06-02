import React, { useMemo, useState } from "react";
import { FileText, Hash, AlertTriangle, ScrollText, Banknote, CheckCircle2 } from "lucide-react";
import { Card, Pill, Money, SectionTitle, Modal, ModalHeader, Btn } from "@finance/components/primitives";
import { useDisputes } from "@finance/lib/disputesStore";
import { usePayables, type SubvendorRow } from "@finance/lib/payablesStore";

const today = () => new Date().toISOString().slice(0, 10);
const disputeId = (ref: any) => `SVD-${ref}`;

function RaiseDisputeModal({ row, onClose, onSubmit }: any) {
  const [reason, setReason] = useState("");
  return (
    <Modal onClose={onClose}>
      <ModalHeader title="Raise dispute with sub-vendor" tone="amber" icon={AlertTriangle} onClose={onClose} />
      <div className="p-6">
        <div className="mb-4 space-y-1 text-sm">
          <div className="flex justify-between"><span className="text-slate-500">Accounting unit</span><span className="font-mono text-slate-800">{row.ref}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">Sub-vendor</span><span className="text-slate-800">{row.party}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">Trip · Lane</span><span className="text-slate-800">{row.trip} · {row.lane}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">Payable</span><Money value={row.payable} className="font-semibold text-slate-800" /></div>
        </div>
        <label className="text-xs font-medium text-slate-500">Reason for dispute</label>
        <textarea autoFocus value={reason} onChange={(e) => setReason(e.target.value)} rows={3}
          placeholder="e.g. Billed above agreed rate / short delivery / detention not authorised"
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

const statusTone = { matched: "green", variance: "red", "no-invoice": "amber" };
const statusLabel = { matched: "Matched", variance: "Variance", "no-invoice": "No invoice — vehicle-wise" };

export default function SubVendor({ toast }: any) {
  const { disputes, addDispute } = useDisputes();
  const { subvendorRows, recordSubvendorPayment } = usePayables();
  const [filter, setFilter] = useState("all");
  const [raising, setRaising] = useState<any>(null);

  const rows = subvendorRows.filter((r) => filter === "all" || r.mode === filter);
  const disputedIds = new Set(disputes.filter((d) => d.kind === "subvendor").map((d) => d.id));

  // BRD 5.2 — vehicle-number consolidation: what's owed per informal transporter,
  // summed across trips, when no formal invoice exists to account vendor-wise.
  const vehicleConsolidation = useMemo(() => {
    const m = new Map<string, { party: string; trips: number; payable: number; paid: number }>();
    subvendorRows.filter((r) => r.mode === "vehicle").forEach((r) => {
      const prev = m.get(r.party) || { party: r.party, trips: 0, payable: 0, paid: 0 };
      m.set(r.party, { party: r.party, trips: prev.trips + 1, payable: prev.payable + r.payable, paid: prev.paid + (r.stage === "paid" ? r.payable : 0) });
    });
    return [...m.values()];
  }, [subvendorRows]);

  const submitDispute = (reason: any) => {
    const r = raising;
    addDispute({ id: disputeId(r.ref), client: r.party, amount: r.payable, reason, stage: "raised", raised: today(), slaHrs: 48, owner: "Aggregator", kind: "subvendor" });
    setRaising(null);
    toast(`Dispute raised with ${r.party} — tracked on the Disputes page`);
  };

  const pay = (r: SubvendorRow) => {
    recordSubvendorPayment(r.ref);
    toast(r.mode === "vehicle" ? `Vehicle-number payment recorded for ${r.ref}` : `Vendor payment recorded for ${r.ref}`);
  };

  return (
    <div>
      <SectionTitle sub="When a sub-vendor issues no invoice, the system falls back to vehicle-number accounting — essential for India's informal market.">Sub-Vendor &amp; Vehicle-Number Accounting</SectionTitle>

      <div className="mb-5 inline-flex rounded-lg bg-slate-100 p-1 text-sm">
        {[["all", "All"], ["invoice", "Vendor invoice"], ["vehicle", "Vehicle-number fallback"]].map(([k, l]) => (
          <button key={k} onClick={() => setFilter(k)} className={`rounded-md px-4 py-1.5 font-medium transition ${filter === k ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}>{l}</button>
        ))}
      </div>

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-slate-200 bg-slate-50/80 text-left text-xs uppercase tracking-wide text-slate-500">
            {["Accounting unit", "Party", "Trip · Lane", "Agreed", "Payable", "Status"].map((h) => <th key={h} className="px-5 py-3 font-semibold">{h}</th>)}
            <th className="px-5 py-3 text-right font-semibold">Action</th>
          </tr></thead>
          <tbody>
            {rows.map((r, i) => {
              const disputed = disputedIds.has(disputeId(r.ref));
              return (
                <tr key={i} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-1.5 font-mono text-xs font-medium text-slate-700">
                      {r.mode === "invoice" ? <FileText size={13} className="text-blue-500" /> : <Hash size={13} className="text-amber-500" />}{r.ref}
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-slate-600">{r.party}</td>
                  <td className="px-5 py-3.5 text-slate-500">{r.trip}<div className="text-xs text-slate-400">{r.lane}</div></td>
                  <td className="px-5 py-3.5"><Money value={r.agreed} /></td>
                  <td className="px-5 py-3.5"><Money value={r.payable} className="font-semibold text-slate-800" /></td>
                  <td className="px-5 py-3.5"><Pill tone={statusTone[r.status as keyof typeof statusTone] as any}>{r.status === "variance" && <AlertTriangle size={11} />}{statusLabel[r.status as keyof typeof statusLabel]}</Pill></td>
                  <td className="px-5 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {r.stage === "paid" ? (
                        <Pill tone="green"><CheckCircle2 size={11} />Paid</Pill>
                      ) : (
                        <>
                          {disputed ? (
                            <Pill tone="amber"><AlertTriangle size={11} />Disputed</Pill>
                          ) : (
                            <button onClick={() => setRaising(r)} className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 hover:bg-amber-100"><ScrollText size={12} />Dispute</button>
                          )}
                          <Btn onClick={() => pay(r)}><Banknote size={12} />{r.mode === "vehicle" ? "Pay (vehicle-wise)" : "Pay (vendor-wise)"}</Btn>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      {/* BRD 5.2 — consolidated payable per vehicle owner across trips */}
      {vehicleConsolidation.length > 0 && (
        <Card className="mt-6 p-5">
          <h3 className="mb-1 flex items-center gap-2 font-semibold text-slate-800"><Hash size={16} className="text-amber-500" />Vehicle-number consolidation</h3>
          <p className="mb-4 text-xs text-slate-400">Informal transporters who never submit an invoice — what's owed, consolidated by registration across trips.</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {vehicleConsolidation.map((v) => (
              <div key={v.party} className="flex items-center justify-between rounded-lg border border-slate-200 p-3 text-sm">
                <div><div className="text-slate-700">{v.party}</div><div className="text-xs text-slate-400">{v.trips} trip{v.trips > 1 ? "s" : ""}</div></div>
                <div className="text-right">
                  <Money value={v.payable} className="font-semibold text-slate-800" />
                  {v.paid > 0 && <div className="text-xs text-emerald-600">{<Money value={v.paid} />} paid</div>}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <p className="mt-3 text-xs text-slate-400">Vehicle-number rows track what's owed to informal transporters who never submit a formal invoice — consolidated by registration number across trips. As a customer to your sub-vendors, you can raise a dispute against any line — it is tracked on the <span className="font-medium text-slate-500">Disputes</span> page.</p>

      {raising && <RaiseDisputeModal row={raising} onClose={() => setRaising(null)} onSubmit={submitDispute} />}
    </div>
  );
}
