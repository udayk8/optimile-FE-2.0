import React, { useState, useRef } from "react";
import {
  AlertTriangle, Clock, CheckCircle2, XCircle, Check, X,
  ArrowLeft, Download, FileText, Loader2, PackageCheck,
} from "lucide-react";
import { Card, Pill, SectionTitle, Modal, ModalHeader } from "@finance/components/primitives";
import { fmtINR } from "@finance/lib/format";
import { VENDOR_BILL_DETAILS, OPTIMILE_BILL_TO, vendorMeta, VENDOR_DISPUTE_RESPONSES, DEFAULT_VENDOR_DISPUTE_RESPONSE } from "@finance/data/mock";
import { useDisputes } from "@finance/lib/disputesStore";
import { usePayables, computeMatch } from "@finance/lib/payablesStore";
import InvoiceDocument from "@finance/components/InvoiceDocument";
import PodDocument from "@finance/components/PodDocument";
import { downloadElementAsPdf } from "@finance/lib/pdf";

const today = () => new Date().toISOString().slice(0, 10);

function RaiseDisputeModal({ bill, onClose, onSubmit }: any) {
  const [reason, setReason] = useState("");
  return (
    <Modal onClose={onClose}>
      <ModalHeader title="Raise dispute with vendor" tone="amber" icon={AlertTriangle} onClose={onClose} />
      <div className="p-6">
        <div className="mb-4 space-y-1 text-sm">
          <div className="flex justify-between"><span className="text-slate-500">Vendor bill</span><span className="font-mono text-slate-800">{bill.id}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">Vendor</span><span className="text-slate-800">{bill.vendor}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">Trip · Lane</span><span className="text-slate-800">{bill.trip} · {bill.lane}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">Billed</span><span className="font-mono font-semibold text-slate-800">{fmtINR(bill.billed)}</span></div>
        </div>
        <label className="text-xs font-medium text-slate-500">Reason for dispute</label>
        <textarea autoFocus value={reason} onChange={(e) => setReason(e.target.value)} rows={3}
          placeholder="e.g. Billed above contract rate / accessorial not authorised / short delivery"
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

const Match = ({ label, v, ok }: any) => (
  <div className="text-center">
    <div className="text-[10px] uppercase tracking-wide text-slate-400">{label}</div>
    <div className={`mt-0.5 flex items-center gap-1 font-mono text-sm ${ok ? "text-slate-700" : "text-red-600"}`}>
      {ok ? <Check size={12} className="text-emerald-500" /> : <X size={12} className="text-red-500" />}{v}
    </div>
  </div>
);

/* Vertical shipment-trace timeline (reused by Pending POD too) */
export function Trace({ steps }: any) {
  return (
    <ol className="relative ml-2">
      {steps.map((s: any, i: number) => {
        const last = i === steps.length - 1;
        const tone = s.warn ? "amber" : s.done ? "emerald" : "slate";
        const dot = { emerald: "bg-emerald-500", amber: "bg-amber-500", slate: "bg-slate-200" }[tone];
        return (
          <li key={i} className="relative flex gap-3 pb-5 last:pb-0">
            {!last && <span className={`absolute left-[7px] top-4 h-full w-px ${s.done ? "bg-emerald-200" : "bg-slate-200"}`} />}
            <span className={`relative z-10 mt-1 grid h-3.5 w-3.5 flex-shrink-0 place-items-center rounded-full ${dot}`} />
            <div className="min-w-0">
              <div className={`text-sm font-medium ${s.done ? "text-slate-800" : "text-slate-400"}`}>{s.label}{s.warn && <AlertTriangle size={12} className="ml-1 inline text-amber-500" />}</div>
              <div className="text-xs text-slate-400">{s.ts} · {s.actor}</div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export function VendorBillDetail({ bill, onBack, onAct, onDispute, disputed, dispute, onNavigate, toast, backLabel = "Back to vendor bills" }: any) {
  const detail = (VENDOR_BILL_DETAILS as Record<string, any>)[bill.id];
  const invoiceRef = useRef(null);
  const podRef = useRef(null);
  const [dl, setDl] = useState(false);
  const [dlPod, setDlPod] = useState(false);
  const seller = { name: bill.vendor, ...vendorMeta(bill.vendor) };
  const noPod = bill.status === "no-pod";

  const download = async () => {
    setDl(true);
    try {
      await downloadElementAsPdf(invoiceRef.current, `${detail.invoice.invoiceNo}.pdf`);
      toast(`Downloaded ${detail.invoice.invoiceNo}.pdf`);
    } catch {
      toast("Could not generate PDF");
    } finally {
      setDl(false);
    }
  };

  const downloadPod = async () => {
    setDlPod(true);
    try {
      await downloadElementAsPdf(podRef.current, `POD-${detail.invoice.lrNo}.pdf`);
      toast(`Downloaded POD-${detail.invoice.lrNo}.pdf`);
    } catch {
      toast("Could not generate PDF");
    } finally {
      setDlPod(false);
    }
  };

  const contractedTotal = detail.comparison.reduce((s: any, r: any) => s + r.contracted, 0);
  const invoicedTotal = detail.comparison.reduce((s: any, r: any) => s + r.invoiced, 0);

  return (
    <div>
      <button onClick={onBack} className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800">
        <ArrowLeft size={15} />{backLabel}
      </button>

      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>{bill.id}</h1>
            <Pill tone={bill.status === "matched" ? "green" : bill.status === "variance" ? "red" : "amber"}>
              {bill.status === "matched" ? "Matched" : bill.status === "variance" ? `Variance +${bill.variance}%` : "POD pending"}
            </Pill>
          </div>
          <p className="mt-1 text-sm text-slate-500">{bill.vendor} · {bill.trip} · {bill.lane} · {bill.terms} (due {bill.due})</p>
        </div>
        <div className="flex gap-2">
          {disputed ? (
            <Pill tone="amber"><AlertTriangle size={12} />Disputed — vendor responded</Pill>
          ) : dispute ? (
            dispute.stage === "resolved" ? (
              <button onClick={() => onNavigate?.("disputes")} className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-100"><Check size={14} />Dispute closed</button>
            ) : (
              <button onClick={() => onNavigate?.("disputes")} className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-700 hover:bg-amber-100"><AlertTriangle size={14} />In Dispute</button>
            )
          ) : (
            <>
              {!noPod && <button onClick={() => onDispute(bill)} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"><XCircle size={14} />Dispute</button>}
              <button onClick={() => onAct(bill.id, "approve")} disabled={noPod} className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"><Check size={14} />{bill.status === "variance" ? "Approve anyway" : "Approve & schedule"}</button>
            </>
          )}
        </div>
      </div>

      {/* 3-way summary */}
      <Card className="mb-6 flex flex-wrap items-center justify-center gap-10 p-5">
        <Match label="Contract" v={fmtINR(bill.contractRate)} ok />
        <Match label="POD" v={bill.pod ? "Verified" : "Missing"} ok={bill.pod} />
        <Match label="Billed" v={fmtINR(bill.billed)} ok={bill.status !== "variance"} />
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Validation: contract vs invoice */}
        <Card className="overflow-hidden">
          <div className="border-b border-slate-100 px-5 py-3 font-semibold text-slate-800">Validation · Contract vs Invoice</div>
          <table className="w-full text-sm">
            <thead><tr className="border-b border-slate-200 bg-slate-50/80 text-left text-xs uppercase tracking-wide text-slate-500">
              {["Head", "Contracted", "Invoiced", "Variance"].map((h) => <th key={h} className="px-5 py-2.5 font-semibold">{h}</th>)}
            </tr></thead>
            <tbody>
              {detail.comparison.map((r: any, i: number) => {
                const d = r.invoiced - r.contracted;
                return (
                  <tr key={i} className={`border-b border-slate-100 last:border-0 ${d !== 0 ? "bg-red-50/40" : ""}`}>
                    <td className="px-5 py-2.5 text-slate-700">{r.head}</td>
                    <td className="px-5 py-2.5 font-mono text-slate-600">{fmtINR(r.contracted)}</td>
                    <td className="px-5 py-2.5 font-mono text-slate-800">{fmtINR(r.invoiced)}</td>
                    <td className="px-5 py-2.5 font-mono">{d === 0 ? <span className="text-emerald-600">—</span> : <span className="text-red-600">+{fmtINR(d)}</span>}</td>
                  </tr>
                );
              })}
              <tr className="bg-slate-50 font-semibold">
                <td className="px-5 py-2.5 text-slate-800">Total</td>
                <td className="px-5 py-2.5 font-mono text-slate-700">{fmtINR(contractedTotal)}</td>
                <td className="px-5 py-2.5 font-mono text-slate-900">{fmtINR(invoicedTotal)}</td>
                <td className="px-5 py-2.5 font-mono">{invoicedTotal === contractedTotal ? <span className="text-emerald-600">0</span> : <span className="text-red-600">+{fmtINR(invoicedTotal - contractedTotal)}</span>}</td>
              </tr>
            </tbody>
          </table>
          <div className="border-t border-slate-100 px-5 py-3 text-xs text-slate-500">
            POD facts: {detail.invoice.origin} → {detail.invoice.destination} · shipped {detail.invoice.shippingDate} · delivered {detail.invoice.deliveryDate} · qty {detail.invoice.qty} · LR {detail.invoice.lrNo}
          </div>
        </Card>

        {/* Shipment trace */}
        <Card className="p-5">
          <div className="mb-4 font-semibold text-slate-800">Shipment trace</div>
          <Trace steps={detail.trace} />
        </Card>
      </div>

      {/* Invoice document + download */}
      <div className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="flex items-center gap-2 font-semibold text-slate-800"><FileText size={16} className="text-slate-400" />Vendor invoice</h3>
          <button onClick={download} disabled={dl} className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-60">
            {dl ? <><Loader2 size={14} className="animate-spin" />Generating…</> : <><Download size={14} />Download PDF</>}
          </button>
        </div>
        <div className="overflow-auto rounded-xl bg-slate-100 p-4 ring-1 ring-slate-200">
          <div className="mx-auto w-fit shadow-lg">
            <InvoiceDocument ref={invoiceRef} invoice={detail.invoice} seller={seller} billTo={OPTIMILE_BILL_TO} />
          </div>
        </div>
      </div>

      {/* Proof of Delivery + download */}
      <div className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="flex items-center gap-2 font-semibold text-slate-800"><PackageCheck size={16} className="text-emerald-500" />Proof of Delivery</h3>
          {bill.pod && (
            <button onClick={downloadPod} disabled={dlPod} className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-60">
              {dlPod ? <><Loader2 size={14} className="animate-spin" />Generating…</> : <><Download size={14} />Download PDF</>}
            </button>
          )}
        </div>
        {bill.pod ? (
          <div className="overflow-auto rounded-xl bg-slate-100 p-4 ring-1 ring-slate-200">
            <div className="mx-auto w-fit shadow-lg">
              <PodDocument ref={podRef} invoice={detail.invoice} seller={seller} billTo={OPTIMILE_BILL_TO} />
            </div>
          </div>
        ) : (
          <Card className="flex items-center gap-3 p-5 ring-1 ring-amber-200">
            <div className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-lg bg-amber-50 text-amber-600"><Clock size={20} /></div>
            <div className="text-sm text-slate-600">POD not yet uploaded by the vendor — approval is gated until delivery is proven.</div>
          </Card>
        )}
      </div>
    </div>
  );
}

export default function VendorMatch({ toast, onNavigate }: any) {
  const { disputes, addDispute } = useDisputes();
  const { bills, tolerancePct, setTolerance, approveBill, autoApproveMatched, disputeBill } = usePayables();
  const [open, setOpen] = useState<string | null>(null);
  const [raising, setRaising] = useState<any>(null);

  const disputeOf = (id: any) => disputes.find((d) => d.id === id && d.kind === "subvendor");

  // Live 3-way match computed against the configurable tolerance. Show only the
  // actionable queue (pending / disputed); approved bills move to Scheduled Payments.
  const view = bills
    .filter((b) => b.stage === "pending" || b.stage === "disputed")
    .map((b) => {
      const m = computeMatch(b, tolerancePct);
      return { ...b, status: m.status, variancePct: m.variancePct, variance: Number(Math.abs(m.variancePct).toFixed(1)), autoEligible: m.autoEligible };
    });
  const matchedCount = view.filter((b) => b.status === "matched" && b.stage === "pending").length;

  const act = (id: any) => { approveBill(id); setOpen(null); toast(`${id} approved — payment scheduled`); };

  const submitDispute = (reason: any) => {
    const b = raising;
    const reply = VENDOR_DISPUTE_RESPONSES[b.vendor] ?? DEFAULT_VENDOR_DISPUTE_RESPONSE;
    addDispute({
      id: b.id, client: b.vendor, amount: b.billed, reason, kind: "subvendor",
      stage: "vendor-response", raised: today(), slaHrs: 48, owner: b.vendor,
      notifiedAt: today(), respondedAt: today(),
      vendorResponseType: reply.type, vendorResponse: reply.message, vendorDocs: reply.docs,
    });
    disputeBill(b.id);
    setRaising(null);
    setOpen(null);
    toast(`Dispute raised on ${b.id} — vendor notified & responded · see the Disputes page`);
  };

  const autoApprove = () => {
    const n = autoApproveMatched();
    toast(n ? `${n} matched bill${n > 1 ? "s" : ""} auto-approved & scheduled` : "No matched bills eligible");
  };

  if (open) {
    const bill = view.find((b) => b.id === open);
    if (bill) return (
      <>
        <VendorBillDetail bill={bill} onBack={() => setOpen(null)} onAct={act} onDispute={setRaising} dispute={disputeOf(bill.id)} onNavigate={onNavigate} toast={toast} />
        {raising && <RaiseDisputeModal bill={raising} onClose={() => setRaising(null)} onSubmit={submitDispute} />}
      </>
    );
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <SectionTitle sub="Auto-checks Contract Rate = POD = Invoice. Within tolerance auto-approves; outside it needs manual approval. Approving schedules the payment.">Vendor Bills · 3-Way Match</SectionTitle>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 text-xs text-slate-500">Tolerance ±
            <input type="number" min={0} step={0.5} value={tolerancePct} onChange={(e) => setTolerance(Number(e.target.value))}
              className="w-16 rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm text-slate-700 outline-none focus:border-slate-300" />%
          </label>
          <button onClick={autoApprove} disabled={matchedCount === 0}
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50">
            <CheckCircle2 size={15} />Auto-approve matched ({matchedCount})
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {view.map((b) => {
          const ok = b.status === "matched";
          const variance = b.status === "variance";
          const noPod = b.status === "no-pod";
          const dz = disputeOf(b.id);
          return (
            <Card key={b.id} className={`p-5 ${variance ? "ring-1 ring-red-200" : noPod ? "ring-1 ring-amber-200" : ""}`}>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-semibold text-slate-800">{b.id}</span>
                    <span className="text-sm text-slate-400">·</span>
                    <span className="text-sm text-slate-600">{b.vendor}</span>
                    {b.stage === "disputed" && <Pill tone="amber"><AlertTriangle size={11} />Disputed</Pill>}
                  </div>
                  <div className="mt-0.5 text-xs text-slate-400">{b.trip} · {b.lane} · {b.terms} (due {b.due})</div>
                </div>
                <div className="flex items-center gap-6 text-sm">
                  <Match label="Contract" v={fmtINR(b.contractRate)} ok />
                  <Match label="POD" v={b.pod ? "Verified" : "Missing"} ok={b.pod} />
                  <Match label="Billed" v={fmtINR(b.billed)} ok={!variance} />
                </div>
              </div>

              {variance && (
                <div className="mt-4 flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                  <AlertTriangle size={15} />
                  <span>Invoice shows <b className="font-mono">{fmtINR(b.billed)}</b> but contract is <b className="font-mono">{fmtINR(b.contractRate)}</b> — variance of <b>{b.variancePct > 0 ? "+" : ""}{b.variancePct.toFixed(1)}%</b>. Manual approval required.</span>
                </div>
              )}
              {noPod && <div className="mt-4 flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700"><Clock size={15} />POD not yet uploaded — approval gated until delivery is proven.</div>}
              {ok && <div className="mt-4 flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700"><CheckCircle2 size={15} />All three match within ±{tolerancePct}% — eligible for auto-approval.</div>}

              <div className="mt-4 flex items-center justify-end gap-3">
                <button onClick={() => setOpen(b.id)} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"><FileText size={13} />View invoice &amp; trace</button>
                {dz?.stage === "resolved" ? (
                  <button onClick={() => onNavigate?.("disputes")} className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100"><Check size={13} />Dispute closed</button>
                ) : dz ? (
                  <button onClick={() => onNavigate?.("disputes")} className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-100"><AlertTriangle size={13} />In Dispute</button>
                ) : (
                  <>
                    {!noPod && <button onClick={() => setRaising(b)} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"><XCircle size={13} />Dispute</button>}
                    <button onClick={() => act(b.id)} disabled={noPod}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-700 disabled:opacity-50">
                      <Check size={13} />{variance ? "Approve anyway" : "Approve & schedule"}
                    </button>
                  </>
                )}
              </div>
            </Card>
          );
        })}
        {view.length === 0 && <Card className="p-12 text-center text-slate-400">All vendor bills actioned — approved payments are on Scheduled Payments. 🎉</Card>}
      </div>

      {raising && <RaiseDisputeModal bill={raising} onClose={() => setRaising(null)} onSubmit={submitDispute} />}
    </div>
  );
}
