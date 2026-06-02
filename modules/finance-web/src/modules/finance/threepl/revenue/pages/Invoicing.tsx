import React, { useMemo, useRef, useState } from "react";
import {
  ReceiptIndianRupee, ArrowLeft, Plus, Send, Check, AlertTriangle,
  ScrollText, FileText, Download, CheckCircle2, RefreshCw, ChevronRight, X,
} from "lucide-react";
import { Card, Pill, Money, SectionTitle, Modal, ModalHeader, Stepper, Btn } from "@finance/components/primitives";
import { fmtINR } from "@finance/lib/format";
import { ACCESSORIAL_LIBRARY, AR_TOLERANCE_PCT, OPTIMILE_BILL_TO } from "@finance/data/mock";
import { useReceivables, type ARInvoice } from "@finance/lib/receivablesStore";
import { useDisputes } from "@finance/lib/disputesStore";
import InvoiceDocument from "@finance/components/InvoiceDocument";
import { downloadElementAsPdf } from "@finance/lib/pdf";

const today = () => new Date().toISOString().slice(0, 10);

const STAGE_LABEL: Record<string, string> = {
  draft: "Draft", submitted: "Awaiting client", approved: "Approved",
  disputed: "Disputed", correction: "Correction requested",
};
const STAGE_TONE: Record<string, any> = {
  draft: "slate", submitted: "blue", approved: "green", disputed: "amber", correction: "amber",
};
const WORKFLOW_STEPS = ["Draft", "Submitted", "Client approval", "Ledger"];
const stepIndex = (s: string) => (s === "draft" || s === "correction" ? 0 : s === "submitted" ? 1 : s === "approved" ? 3 : 2);

/* Aggregator letterhead for the printable draft (BRD step: review & submit). */
const SELLER = {
  name: OPTIMILE_BILL_TO.name,
  address: OPTIMILE_BILL_TO.address,
  gstin: OPTIMILE_BILL_TO.gstin,
  pan: "AABCO1234F",
  bank: { holder: OPTIMILE_BILL_TO.name, acc: "5010 2233 4456", branch: "HDFC Bank, Bengaluru", ifsc: "HDFC0000456", type: "Current" },
};

/* Map an AR invoice into the shape InvoiceDocument expects. */
function toInvoiceDoc(inv: ARInvoice) {
  const detention = inv.accessorials.filter((a) => a.code === "DET").reduce((s, a) => s + a.rate, 0);
  const loading = inv.accessorials.filter((a) => a.code === "LUL").reduce((s, a) => s + a.rate, 0);
  const other = inv.accessorials.filter((a) => a.code !== "DET" && a.code !== "LUL").reduce((s, a) => s + a.rate, 0);
  const [origin, destination] = inv.lane.split("→").map((s) => s.trim());
  const taxableValue = inv.invoiced;
  const igst = Math.round(taxableValue * 0.18);
  const total = taxableValue + igst;
  return {
    invoice: {
      invoiceNo: inv.id, billDate: inv.date, dueDate: inv.due ?? "On approval", terms: inv.terms,
      bookingId: inv.tripId, lrNo: "—", qty: 1, shippingDate: inv.date, deliveryDate: inv.date,
      truckNo: inv.truck, origin, destination,
      lineItems: { freight: inv.base, advance: 0, detention, loading, other, freightCost: inv.invoiced },
      taxableValue, igstPct: 18, igst, cgst: 0, sgst: 0, total,
      amountInWords: `${fmtINR(total)} only`,
    },
    billTo: { name: inv.client, address: "—", gstin: "—", customerCode: "—" },
  };
}

function VariancePill({ inv }: { inv: ARInvoice }) {
  if (inv.contracted === inv.invoiced) return <Pill tone="green"><Check size={11} />Matches contract</Pill>;
  const sign = inv.variancePct > 0 ? "+" : "";
  return (
    <Pill tone={inv.flagged ? "red" : "amber"}>
      {inv.flagged && <AlertTriangle size={11} />}{sign}{inv.variancePct.toFixed(1)}% vs contract
    </Pill>
  );
}

function PreviewModal({ inv, onClose, toast }: { inv: ARInvoice; onClose: () => void; toast: (m: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const doc = toInvoiceDoc(inv);
  const download = async () => {
    await downloadElementAsPdf(ref.current, `${inv.id}.pdf`);
    toast(`Downloaded ${inv.id}.pdf`);
  };
  return (
    <Modal onClose={onClose} maxW="max-w-4xl">
      <ModalHeader title={`Draft invoice ${inv.id}`} tone="blue" icon={FileText} onClose={onClose} />
      <div className="max-h-[70vh] overflow-auto bg-slate-100 p-6">
        <div className="mx-auto w-fit">
          <InvoiceDocument ref={ref} invoice={doc.invoice} seller={SELLER} billTo={doc.billTo} />
        </div>
      </div>
      <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4">
        <Btn variant="ghost" onClick={onClose}>Close</Btn>
        <Btn onClick={download}><Download size={14} />Download PDF</Btn>
      </div>
    </Modal>
  );
}

function InvoiceDetail({ inv, onBack, toast }: { inv: ARInvoice; onBack: () => void; toast: (m: string) => void }) {
  const { addAccessorial, removeAccessorial, submitInvoice, clientDecision } = useReceivables();
  const { addDispute } = useDisputes();
  const [adding, setAdding] = useState(false);
  const [preview, setPreview] = useState(false);
  const editable = inv.stage === "draft" || inv.stage === "correction";

  const submit = () => { submitInvoice(inv.id); toast(`${inv.id} submitted to ${inv.client} for approval`); };
  const approve = () => { clientDecision(inv.id, "approve"); toast(`${inv.id} approved — posted to AR ledger`); onBack(); };
  const requestCorrection = () => { clientDecision(inv.id, "correction"); toast(`Correction requested on ${inv.id}`); };
  const dispute = () => {
    clientDecision(inv.id, "dispute");
    addDispute({
      id: inv.id, client: inv.client, amount: inv.invoiced,
      reason: inv.flagged
        ? `Invoiced ${fmtINR(inv.invoiced)} exceeds contracted ${fmtINR(inv.contracted)} by ${inv.variancePct.toFixed(1)}% (beyond ±${AR_TOLERANCE_PCT}% tolerance)`
        : "Client disputed the submitted invoice",
      stage: "raised", raised: today(), slaHrs: 48, owner: "—", kind: "customer",
    });
    toast(`${inv.id} disputed — sent to Disputes`);
    onBack();
  };

  return (
    <div>
      <button onClick={onBack} className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800">
        <ArrowLeft size={15} />Back to invoices
      </button>

      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>{inv.id}</h1>
            <Pill tone={STAGE_TONE[inv.stage]}>{STAGE_LABEL[inv.stage]}</Pill>
          </div>
          <p className="mt-1 text-sm text-slate-500">{inv.client} · {inv.lane} · {inv.truck} {inv.tripId && <>· trip {inv.tripId}</>}</p>
        </div>
        <Btn variant="ghost" onClick={() => setPreview(true)}><FileText size={14} />Preview invoice</Btn>
      </div>

      <Card className="mb-6 p-5">
        <Stepper steps={WORKFLOW_STEPS} current={stepIndex(inv.stage)} />
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Accessorials — BRD step: accessorial addition */}
        <Card className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <span className="font-semibold text-slate-800">Accessorial charges</span>
            {editable && <Btn variant="ghost" onClick={() => setAdding(true)}><Plus size={13} />Add charge</Btn>}
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
              <span className="text-slate-600">Base freight (contract rate)</span>
              <Money value={inv.base} className="font-semibold text-slate-800" />
            </div>
            {inv.accessorials.map((a, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg bg-amber-50/60 px-3 py-2 text-sm">
                <span className="text-slate-600">{a.label}</span>
                <span className="flex items-center gap-2">
                  <Money value={a.rate} className="font-semibold text-amber-700" />
                  {editable && (
                    <button onClick={() => removeAccessorial(inv.id, i)} className="text-slate-400 hover:text-red-500"><X size={13} /></button>
                  )}
                </span>
              </div>
            ))}
            {inv.accessorials.length === 0 && <div className="px-3 text-xs text-slate-400">No accessorial charges added.</div>}
          </div>
        </Card>

        {/* Contracted vs invoiced — BRD step: client-side approval (±tolerance) */}
        <Card className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <span className="font-semibold text-slate-800">Contracted vs invoiced</span>
            <VariancePill inv={inv} />
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-slate-500">Contracted rate</span><Money value={inv.contracted} className="text-slate-800" /></div>
            <div className="flex justify-between"><span className="text-slate-500">Invoiced amount</span><Money value={inv.invoiced} className="font-semibold text-slate-800" /></div>
            <div className="flex justify-between border-t border-slate-100 pt-2"><span className="text-slate-500">Variance</span>
              <Money value={inv.invoiced - inv.contracted} className={inv.flagged ? "font-semibold text-red-600" : "text-slate-600"} />
            </div>
            <div className="flex justify-between"><span className="text-slate-500">Payment terms</span><span className="text-slate-700">{inv.terms}</span></div>
          </div>
          {inv.flagged && inv.stage === "submitted" && (
            <div className="mt-3 flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
              <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
              Variance exceeds the ±{AR_TOLERANCE_PCT}% tolerance — flagged for the client's finance team.
            </div>
          )}
        </Card>
      </div>

      {/* Stage-driven actions */}
      <Card className="mt-6 p-5">
        {editable && (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-sm text-slate-500">Review the draft, add any accessorials, then submit to the client for approval.</span>
            <Btn onClick={submit}><Send size={14} />Submit to client</Btn>
          </div>
        )}
        {inv.stage === "submitted" && (
          <div>
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800"><ScrollText size={16} className="text-blue-500" />Client-side approval</div>
            <p className="mb-4 text-xs text-slate-500">The client's finance team reviews the side-by-side comparison above and decides.</p>
            <div className="flex flex-wrap gap-3">
              <Btn onClick={approve}><Check size={14} />Approve</Btn>
              <Btn variant="ghost" onClick={requestCorrection}><RefreshCw size={14} />Request correction</Btn>
              <Btn variant="danger" onClick={dispute}><AlertTriangle size={14} />Dispute</Btn>
            </div>
          </div>
        )}
        {inv.stage === "approved" && (
          <div className="flex items-center gap-2 text-sm text-emerald-700"><CheckCircle2 size={16} />Approved — recorded in the AR ledger, due {inv.due}.</div>
        )}
        {inv.stage === "disputed" && (
          <div className="flex items-center gap-2 text-sm text-amber-700"><AlertTriangle size={16} />Disputed — tracked on the Disputes page.</div>
        )}
      </Card>

      {preview && <PreviewModal inv={inv} onClose={() => setPreview(false)} toast={toast} />}

      {adding && (
        <Modal onClose={() => setAdding(false)}>
          <ModalHeader title="Add accessorial charge" tone="amber" icon={Plus} onClose={() => setAdding(false)} />
          <div className="p-6">
            <p className="mb-3 text-xs text-slate-500">Standard charges with pre-configured rates (BRD 4.1).</p>
            <div className="space-y-2">
              {ACCESSORIAL_LIBRARY.map((a) => (
                <button key={a.code} onClick={() => { addAccessorial(inv.id, a.code); setAdding(false); toast(`Added ${a.label}`); }}
                  className="flex w-full items-center justify-between rounded-lg border border-slate-200 px-3 py-2.5 text-sm hover:bg-slate-50">
                  <span className="text-slate-700">{a.label}</span>
                  <Money value={a.rate} className="font-semibold text-slate-800" />
                </button>
              ))}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default function Invoicing({ toast }: any) {
  const { invoices } = useReceivables();
  const [openId, setOpenId] = useState<string | null>(null);

  const working = useMemo(() => invoices.filter((i) => i.stage !== "approved"), [invoices]);
  const counts = useMemo(() => ({
    draft: invoices.filter((i) => i.stage === "draft" || i.stage === "correction").length,
    submitted: invoices.filter((i) => i.stage === "submitted").length,
    flagged: invoices.filter((i) => i.flagged && i.stage !== "approved").length,
  }), [invoices]);

  const open = openId ? invoices.find((i) => i.id === openId) : null;
  if (open) return <InvoiceDetail inv={open} onBack={() => setOpenId(null)} toast={toast} />;

  return (
    <div>
      <SectionTitle sub="Drafts generated from validated PODs. Add accessorials, submit to the client, and approve to post to the AR ledger.">POD → Invoice</SectionTitle>

      <div className="mb-6 grid grid-cols-3 gap-4">
        {[
          { l: "Draft / correction", v: counts.draft, tone: "text-slate-800" },
          { l: "Awaiting client", v: counts.submitted, tone: "text-blue-600" },
          { l: "Flagged (variance)", v: counts.flagged, tone: "text-red-600" },
        ].map((s) => (
          <Card key={s.l} className="p-4">
            <div className="text-xs text-slate-500">{s.l}</div>
            <div className={`mt-1 text-2xl font-bold ${s.tone}`}>{s.v}</div>
          </Card>
        ))}
      </div>

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/80 text-left text-xs uppercase tracking-wide text-slate-500">
              {["Invoice", "Customer", "Lane", "Invoiced", "Variance", "Stage", ""].map((h, i) => <th key={i} className="px-5 py-3 font-semibold">{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {working.map((inv) => (
              <tr key={inv.id} onClick={() => setOpenId(inv.id)} className="cursor-pointer border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                <td className="px-5 py-3.5 font-mono text-xs font-medium text-slate-700">{inv.id}</td>
                <td className="px-5 py-3.5 text-slate-700">{inv.client}</td>
                <td className="px-5 py-3.5 text-slate-500">{inv.lane}</td>
                <td className="px-5 py-3.5"><Money value={inv.invoiced} className="font-semibold text-slate-800" /></td>
                <td className="px-5 py-3.5"><VariancePill inv={inv} /></td>
                <td className="px-5 py-3.5"><Pill tone={STAGE_TONE[inv.stage]}>{STAGE_LABEL[inv.stage]}</Pill></td>
                <td className="px-5 py-3.5 text-right">
                  <button onClick={() => setOpenId(inv.id)} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">
                    Open<ChevronRight size={12} />
                  </button>
                </td>
              </tr>
            ))}
            {working.length === 0 && (
              <tr><td colSpan={7} className="px-5 py-12 text-center text-slate-400">
                <ReceiptIndianRupee size={28} className="mx-auto mb-2 text-slate-300" />
                No draft invoices. Validate a POD on the Pending POD page to generate one.
              </td></tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
