import React, { useRef, useState, type ReactNode } from "react";
import {
  ReceiptIndianRupee, ArrowLeft, Plus, Send, Check, AlertTriangle,
  ScrollText, FileText, Download, CheckCircle2, RefreshCw, ChevronRight, ChevronDown, X, Package, Users, PackageCheck, Loader2, ShieldCheck,
} from "lucide-react";
import { Card, Pill, Money, SectionTitle, Modal, ModalHeader, Stepper, Btn } from "@finance/components/primitives";
import { fmtINR } from "@finance/lib/format";
import { computeGst, stateCodeOf } from "@shared-utils";
import { ACCESSORIAL_LIBRARY, OPTIMILE_BILL_TO, contractRateFor, TRIP_POD_META, vendorMeta, PENDING_POD_DETAILS } from "@finance/data/mock";
import { useReceivables, type ARInvoice, type ARTrip, type LedgerExpense } from "@finance/lib/receivablesStore";
import { useDisputes } from "@finance/lib/disputesStore";
import { Trace } from "@finance/modules/finance/threepl/payables/pages/VendorMatch";
import BookingDetailCard from "@finance/modules/finance/threepl/revenue/components/BookingDetailCard";
import ExpenseTable from "@finance/modules/finance/threepl/revenue/components/ExpenseTable";
import RateCardPanel from "@finance/components/RateCardPanel";
import MarginSummary from "@finance/components/MarginSummary";
import InvoiceDocument from "@finance/components/InvoiceDocument";
import PodDocument from "@finance/components/PodDocument";
import { downloadElementAsPdf } from "@finance/lib/pdf";

/* Real booking freight for a trip — falls back to the contract-rate lookup only
   for standalone mock trips that carry no revenue. */
function tripFreight(t: ARTrip): number {
  return t.revenue && t.revenue > 0 ? t.revenue : contractRateFor(t.lane, t.truck, t.client).base;
}

/* Collect every expense line behind a set of trips (for the expandable detail). */
function tripExpenses(trips: ARTrip[]): LedgerExpense[] {
  return trips.flatMap((t) => t.expenseItems ?? []);
}

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

/* Standard freight GST rate (%). The IGST vs CGST+SGST split is decided by place
   of supply via computeGst, not hardcoded. */
const AR_GST_RATE_PCT = 18;

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
  // Approved booking expenses billed on this invoice, bucketed by type so the
  // printable invoice itemises them alongside any manual accessorials.
  const billed = (inv.expenseItems ?? []).filter((e) => e.status === "Approved");
  const expDetention = billed.filter((e) => /detention/i.test(e.type)).reduce((s, e) => s + e.amount, 0);
  const expLoading = billed.filter((e) => /load|unload/i.test(e.type)).reduce((s, e) => s + e.amount, 0);
  const expOther = billed.filter((e) => !/detention|load|unload/i.test(e.type)).reduce((s, e) => s + e.amount, 0);
  const detention = inv.accessorials.filter((a) => a.code === "DET").reduce((s, a) => s + a.rate, 0) + expDetention;
  const loading = inv.accessorials.filter((a) => a.code === "LUL").reduce((s, a) => s + a.rate, 0) + expLoading;
  const other = inv.accessorials.filter((a) => a.code !== "DET" && a.code !== "LUL").reduce((s, a) => s + a.rate, 0) + expOther;
  const [origin, destination] = inv.lane.split("→").map((s) => s.trim());
  // GST split by place of supply: supplier = aggregator GSTIN state, place of
  // supply = customer GSTIN state. Falls back to inter-state (IGST) when the
  // customer GSTIN is unknown (standalone mock invoices).
  const tax = computeGst({
    taxableValue: inv.invoiced,
    ratePct: AR_GST_RATE_PCT,
    supplierStateCode: stateCodeOf(SELLER.gstin),
    placeOfSupplyStateCode: stateCodeOf(inv.customerGstin),
  });
  return {
    invoice: {
      invoiceNo: inv.id, billDate: inv.date, dueDate: inv.due ?? "On approval", terms: inv.terms,
      bookingId: inv.tripId, lrNo: "—", qty: 1, shippingDate: inv.date, deliveryDate: inv.date,
      truckNo: inv.truck, origin, destination,
      lineItems: { freight: inv.base, advance: 0, detention, loading, other, freightCost: inv.invoiced },
      taxableValue: tax.taxableValue,
      igstPct: tax.igstPct, igst: tax.igst,
      cgstPct: tax.cgstPct, cgst: tax.cgst,
      sgstPct: tax.sgstPct, sgst: tax.sgst,
      total: tax.total,
      amountInWords: `${fmtINR(tax.total)} only`,
    },
    billTo: { name: inv.client, address: "—", gstin: inv.customerGstin ?? "—", customerCode: "—" },
  };
}

/* Build the PodDocument props for one trip (shared by preview + download). */
function podDocProps(trip: ARTrip) {
  const meta = TRIP_POD_META[trip.id];
  const [origin, destination] = trip.lane.split("→").map((s) => s.trim());
  const vm = vendorMeta(trip.vendor);
  const invoice = {
    lrNo: meta?.lrNo ?? `LR-${trip.id.replace("TR-", "")}`,
    bookingId: trip.bookingId ?? trip.id,
    truckNo: meta?.truckNo ?? (trip as any).vehicle ?? trip.truck ?? "—",
    shippingDate: meta?.shippingDate ?? trip.delivered,
    deliveryDate: trip.delivered,
    qty: 1,
    origin,
    destination,
  };
  const seller = { name: trip.vendor, address: vm.address, gstin: vm.gstin, pan: vm.pan };
  const billTo = { name: (trip as any).consignee ?? trip.client, address: "—" };
  return { invoice, seller, billTo };
}

/* Resolve every trip behind an invoice — consolidated invoices carry many drops. */
function invoiceTrips(inv: ARInvoice, trips: ARTrip[]): ARTrip[] {
  const ids = inv.drops?.length ? inv.drops.map((d) => d.trip) : inv.tripId ? [inv.tripId] : [];
  return ids.map((id) => trips.find((t) => t.id === id)).filter(Boolean) as ARTrip[];
}

type TraceStep = { label: string; ts: string; actor: string; done: boolean; warn?: boolean };

/* Customer-side shipment trace: booking → delivery → POD → invoice lifecycle.
   Reuses the AR-side seeded timeline (PENDING_POD_DETAILS) for accurate timestamps
   up to delivery when available, else synthesises from the trip; always works for
   generated/bridged invoices that have no seeded data. */
function buildArTrace(inv: ARInvoice, trip?: ARTrip | null): TraceStep[] {
  const steps: TraceStep[] = [];
  const seeded = trip ? (PENDING_POD_DETAILS as Record<string, any>)[trip.id]?.trace : null;

  if (seeded) {
    const idx = seeded.findIndex((s: any) => /delivered/i.test(s.label));
    const upstream = idx >= 0 ? seeded.slice(0, idx + 1) : seeded.filter((s: any) => s.done);
    steps.push(...upstream.map((s: any) => ({ label: s.label, ts: s.ts, actor: s.actor, done: true })));
  } else if (trip) {
    const [origin, destination] = trip.lane.split("→").map((s) => s.trim());
    const veh = (trip as any).vehicle ?? trip.truck;
    const driver = trip.driver ? ` · ${trip.driver}` : "";
    steps.push(
      { label: "Booking created", ts: "—", actor: `TMS · ${trip.bookingId ?? trip.id}`, done: true },
      { label: "Indent assigned to vendor", ts: "—", actor: trip.vendor, done: true },
      { label: "Dispatched from origin", ts: "—", actor: `${origin} hub`, done: true },
      { label: "In transit", ts: "—", actor: `${veh}${driver}`, done: true },
      { label: "Delivered at destination", ts: trip.delivered, actor: `${destination}${trip.consignee ? ` · ${trip.consignee}` : ""} · consignee signed`, done: true },
    );
  } else {
    const [, destination] = inv.lane.split("→").map((s) => s.trim());
    steps.push(
      { label: "Booking created", ts: inv.date ?? "—", actor: `TMS · ${inv.tripId ?? inv.client}`, done: true },
      { label: "Delivered at destination", ts: inv.date ?? "—", actor: destination, done: true },
    );
  }

  const podDone = !trip || trip.podStage === "uploaded" || trip.podStage === "validated";
  steps.push(
    { label: "POD uploaded", ts: trip?.delivered ?? inv.date ?? "—", actor: "e-POD via driver app", done: podDone },
    { label: "POD verified", ts: "—", actor: "Ops desk", done: !trip || trip.podStage === "validated" },
    { label: "Invoice raised", ts: inv.date ?? "—", actor: `${inv.id} · ${fmtINR(inv.invoiced)}`, done: true },
  );

  const submitted = inv.stage !== "draft" && inv.stage !== "correction";
  steps.push({ label: "Submitted to client", ts: "—", actor: inv.client, done: submitted });
  if (inv.stage === "disputed") {
    steps.push({ label: "Disputed by client", ts: "—", actor: "Tracked on Disputes", done: true, warn: true });
  } else if (inv.stage === "correction") {
    steps.push({ label: "Correction requested", ts: "—", actor: inv.client, done: true, warn: true });
  } else {
    steps.push({ label: "Approved · posted to AR ledger", ts: inv.due ? `due ${inv.due}` : "—", actor: "Client finance", done: inv.stage === "approved" });
  }
  return steps;
}


function PreviewModal({ inv, onClose, toast, onConfirm, confirmLabel }: { inv: ARInvoice; onClose: () => void; toast: (m: string) => void; onConfirm?: () => void; confirmLabel?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const { trips } = useReceivables();
  const doc = toInvoiceDoc(inv);

  // Every POD behind this invoice — a consolidated invoice carries one per drop.
  const podTrips = invoiceTrips(inv, trips);

  const podSection: React.ReactNode = podTrips.length ? (
    <div style={{ marginTop: 24 }}>
      <div className="mb-3 flex items-center gap-2 font-semibold text-slate-700">
        <PackageCheck size={16} className="text-emerald-600" />Proof of Delivery
      </div>
      <div className="space-y-6">
        {podTrips.map((t) => {
          const p = podDocProps(t);
          return <PodDocument key={t.id} invoice={p.invoice} seller={p.seller} billTo={p.billTo} />;
        })}
      </div>
    </div>
  ) : null;

  const download = async () => {
    await downloadElementAsPdf(ref.current, `${inv.id}.pdf`);
    toast(`Downloaded ${inv.id}.pdf`);
  };
  return (
    <Modal onClose={onClose} maxW="max-w-4xl">
      <ModalHeader title={onConfirm ? "Preview invoice" : `Draft invoice ${inv.id}`} tone="blue" icon={FileText} onClose={onClose} />
      <div className="max-h-[70vh] overflow-auto bg-slate-100 p-6">
        <div ref={ref} className="mx-auto w-fit">
          <InvoiceDocument invoice={doc.invoice} seller={SELLER} billTo={doc.billTo} />
          {podSection}
        </div>
      </div>
      <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4">
        <Btn variant="ghost" onClick={onClose}>{onConfirm ? "Cancel" : "Close"}</Btn>
        {onConfirm
          ? <Btn onClick={onConfirm}><Check size={14} />{confirmLabel ?? "Confirm & generate invoice"}</Btn>
          : <Btn onClick={download}><Download size={14} />Download PDF</Btn>}
      </div>
    </Modal>
  );
}

/* Synthesize a draft ARInvoice from the booking drops to preview BEFORE writing
   anything — feeds the same toInvoiceDoc/InvoiceDocument the real invoice uses. */
function previewInvoiceFromDrops(drops: ARTrip[]): ARInvoice {
  const freight = drops.reduce((s, d) => s + tripFreight(d), 0);
  const expenseItems = drops.flatMap((d) => d.expenseItems ?? []);
  const approved = expenseItems.filter((e) => e.status === "Approved").reduce((s, e) => s + e.amount, 0);
  const invoiced = freight + approved;
  const first = drops[0];
  return {
    id: "Draft preview",
    tripId: first?.bookingId ?? first?.id,
    client: first?.client ?? "—",
    lane: first?.lane ?? "—",
    truck: first?.truck,
    date: today(),
    terms: "Net 30",
    base: freight,
    accessorials: [],
    contracted: freight,
    invoiced,
    amount: invoiced + 2 * Math.round(invoiced * 0.09),
    variancePct: 0,
    flagged: false,
    stage: "draft",
    drops: drops.length > 1 ? drops.map((d) => ({ trip: d.id, lane: d.lane, amount: tripFreight(d) })) : undefined,
    bookingIds: [...new Set(drops.map((d) => d.bookingId ?? d.id))],
    expenseItems,
  };
}

function InvoiceDetail({ inv, onBack, toast }: { inv: ARInvoice; onBack: () => void; toast: (m: string) => void }) {
  const { trips, addAccessorial, removeAccessorial, submitInvoice, clientDecision, recordPayment } = useReceivables();
  const { addDispute } = useDisputes();
  const paid = inv.paymentStatus === "paid";
  const markPaid = () => { recordPayment?.(inv.id); toast(`Payment recorded for ${inv.id} — credit released`); };
  const [adding, setAdding] = useState(false);
  const [preview, setPreview] = useState(false);
  const [dl, setDl] = useState(false);
  const [dlPod, setDlPod] = useState(false);
  const invoiceRef = useRef<HTMLDivElement>(null);
  const podRef = useRef<HTMLDivElement>(null);
  const editable = inv.stage === "draft" || inv.stage === "correction";

  const doc = toInvoiceDoc(inv);
  const podTrips = invoiceTrips(inv, trips);
  const trace = buildArTrace(inv, podTrips[0]);

  const download = async () => {
    setDl(true);
    try {
      await downloadElementAsPdf(invoiceRef.current, `${inv.id}.pdf`);
      toast(`Downloaded ${inv.id}.pdf`);
    } catch {
      toast("Could not generate PDF");
    } finally {
      setDl(false);
    }
  };
  const downloadPod = async () => {
    setDlPod(true);
    try {
      await downloadElementAsPdf(podRef.current, `POD-${inv.id}.pdf`);
      toast(`Downloaded POD-${inv.id}.pdf`);
    } catch {
      toast("Could not generate PDF");
    } finally {
      setDlPod(false);
    }
  };

  const submit = () => { submitInvoice(inv.id); toast(`${inv.id} submitted to ${inv.client} for approval`); };
  const approve = () => { clientDecision(inv.id, "approve"); toast(`${inv.id} approved — posted to AR ledger`); onBack(); };
  const requestCorrection = () => { clientDecision(inv.id, "correction"); toast(`Correction requested on ${inv.id}`); };
  const dispute = () => {
    clientDecision(inv.id, "dispute");
    addDispute({
      id: inv.id, client: inv.client, amount: inv.invoiced,
      reason: "Client disputed the submitted invoice",
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
            {inv.commercialType && (
              <Pill tone={inv.commercialType === "SPOT" ? "amber" : "blue"}>{inv.commercialType === "SPOT" ? "Spot" : "Contract"}</Pill>
            )}
            {inv.flagged && (
              <Pill tone="red">Variance {inv.variancePct > 0 ? "+" : ""}{inv.variancePct.toFixed(1)}% vs contract</Pill>
            )}
            {paid && <Pill tone="green">Paid</Pill>}
          </div>
          <p className="mt-1 text-sm text-slate-500">{inv.client} · {inv.lane} · {inv.truck} {inv.tripId && <>· trip {inv.tripId}</>}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Btn variant="ghost" onClick={() => setPreview(true)}><FileText size={14} />Preview invoice</Btn>
          <Btn variant="ghost" onClick={download} disabled={dl}>
            {dl ? <><Loader2 size={14} className="animate-spin" />Generating…</> : <><Download size={14} />Download invoice</>}
          </Btn>
          {podTrips.length > 0 && (
            <Btn variant="ghost" onClick={downloadPod} disabled={dlPod}>
              {dlPod ? <><Loader2 size={14} className="animate-spin" />Generating…</> : <><Download size={14} />Download POD</>}
            </Btn>
          )}
        </div>
      </div>

      <Card className="mb-6 p-5">
        <Stepper steps={WORKFLOW_STEPS} current={stepIndex(inv.stage)} />
      </Card>

      {/* Contract rate card behind this invoice's `contracted` baseline — shown for
          contract / spot bookings so the client sees what the rate was matched on. */}
      {inv.rateCard && <RateCardPanel rateCard={inv.rateCard} commercialType={inv.commercialType} />}

      {/* 3PL profit on this invoice — selling (customer) vs buying (vendor) freight. */}
      <MarginSummary selling={inv.sellingFreight} buying={inv.buyingFreight} margin={inv.margin} />

      {podTrips.length > 1 ? (
        /* Consolidated invoice — show expenses grouped per booking. */
        (() => {
          const groups = podTrips.filter((t) => (t.expenseItems ?? []).length > 0);
          return groups.length > 0 ? (
            <div className="mb-6 space-y-3">
              <div className="font-semibold text-slate-800">Booking expenses</div>
              {groups.map((t) => (
                <ExpenseTable key={t.id} items={t.expenseItems!} title={`${t.bookingId ?? t.id} · ${t.lane}`} toast={toast} />
              ))}
            </div>
          ) : null;
        })()
      ) : (
        inv.expenseItems && inv.expenseItems.length > 0 && (
          <div className="mb-6">
            <ExpenseTable items={inv.expenseItems} title="Booking expenses (approved charges billed on this invoice)" toast={toast} />
          </div>
        )
      )}

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
            {/* Approved booking expenses billed on this invoice (toll, loading, …) */}
            {(inv.expenseItems ?? []).filter((e) => e.status === "Approved").map((e, i) => (
              <div key={`exp-${i}`} className="flex items-center justify-between rounded-lg bg-emerald-50/60 px-3 py-2 text-sm">
                <span className="flex items-center gap-2 text-slate-600">
                  {e.type}
                  <Pill tone="green">Booking expense</Pill>
                </span>
                <Money value={e.amount} className="font-semibold text-emerald-700" />
              </div>
            ))}
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
            {inv.accessorials.length === 0 && (inv.expenseItems ?? []).filter((e) => e.status === "Approved").length === 0 && (
              <div className="px-3 text-xs text-slate-400">No accessorial charges added.</div>
            )}
          </div>
        </Card>

        {/* Contracted vs invoiced — BRD step: client-side approval (±tolerance) */}
        <Card className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <span className="font-semibold text-slate-800">Invoice summary</span>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-slate-500">Base freight</span><Money value={inv.base} className="text-slate-800" /></div>
            {inv.invoiced - inv.base > 0 && (
              <div className="flex justify-between"><span className="text-slate-500">Approved expenses</span><Money value={inv.invoiced - inv.base} className="text-emerald-700" /></div>
            )}
            <div className="flex justify-between border-t border-slate-100 pt-2"><span className="text-slate-500">Total invoiced</span><Money value={inv.invoiced} className="font-semibold text-slate-800" /></div>
            <div className="flex justify-between"><span className="text-slate-500">Payment terms</span><span className="text-slate-700">{inv.terms}</span></div>
          </div>
        </Card>
      </div>

      {/* Booking details — collapsible, one per booking (consolidated invoices carry many). */}
      {podTrips.length > 0 && (
        <div className="mt-6 space-y-3">
          <div className="font-semibold text-slate-800">Booking details{podTrips.length > 1 ? ` (${podTrips.length} bookings)` : ""}</div>
          {podTrips.map((t) => (
            <details key={t.id} className="group rounded-xl bg-white ring-1 ring-slate-200/80 shadow-sm">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-3 text-sm font-medium text-slate-700">
                <span className="font-mono text-xs text-slate-500">{t.bookingId ?? t.id}</span>
                <span className="flex items-center gap-2 text-slate-500">{t.lane}<ChevronDown size={15} className="transition group-open:rotate-180" /></span>
              </summary>
              <div className="border-t border-slate-100 p-4"><BookingDetailCard trip={t} bare /></div>
            </details>
          ))}
        </div>
      )}

      {/* Shipment trace — customer-side lineage, mirrors the vendor-bill match view */}
      <Card className="mt-6 p-5">
        <div className="mb-4 font-semibold text-slate-800">Shipment trace</div>
        <Trace steps={trace} />
      </Card>

      {/* Consolidated booking drops — BRD: a booking with multiple drops = multiple PODs */}
      {inv.drops && inv.drops.length > 1 && (
        <Card className="mt-6 p-5">
          <div className="mb-3 flex items-center gap-2 font-semibold text-slate-800"><Package size={16} className="text-slate-400" />Drops / PODs on this invoice ({inv.drops.length})</div>
          <div className="space-y-2">
            {inv.drops.map((d, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                <span className="text-slate-600"><span className="font-mono text-xs text-slate-500">{d.trip}</span> · {d.lane}</span>
                <Money value={d.amount} className="font-semibold text-slate-800" />
              </div>
            ))}
          </div>
        </Card>
      )}

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
        {/* Customer payment (AR) — records the receipt so the client's credit
            utilisation is released (BRD 3.5). Available on bridged invoices. */}
        {recordPayment && !editable && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
            {paid ? (
              <span className="flex items-center gap-2 text-sm text-emerald-700"><CheckCircle2 size={16} />Payment received{inv.paidAt ? ` on ${inv.paidAt.slice(0, 10)}` : ""} — credit released.</span>
            ) : (
              <>
                <span className="text-sm text-slate-500">Once the customer settles this invoice, record the receipt to free up their credit limit.</span>
                <Btn onClick={markPaid}><Check size={14} />Mark payment received</Btn>
              </>
            )}
          </div>
        )}
      </Card>

      {/* Off-screen source documents captured by the Download buttons (laid out, not display:none, so html2canvas can render them) */}
      <div aria-hidden style={{ position: "fixed", left: -9999, top: 0, pointerEvents: "none", opacity: 0 }}>
        <InvoiceDocument ref={invoiceRef} invoice={doc.invoice} seller={SELLER} billTo={doc.billTo} />
        <div ref={podRef}>
          {podTrips.map((t) => {
            const p = podDocProps(t);
            return <PodDocument key={t.id} invoice={p.invoice} seller={p.seller} billTo={p.billTo} />;
          })}
        </div>
      </div>

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

/* Drop POD-stage chips (only uploaded/validated drops are billable here). */
const POD_STAGE: Record<string, { label: string; tone: any }> = {
  uploaded: { label: "POD uploaded", tone: "blue" },
  validated: { label: "POD validated", tone: "green" },
};

/* Optional POD validation on the Ready-to-invoice side — confirm origin /
   destination / date / consignee match the trip. Uploaded drops are already
   billable; validating just stamps them green (a mismatch flags for review). */
function ValidateModal({ trip, onClose, onValidate }: { trip: ARTrip; onClose: () => void; onValidate: (ok: boolean) => void }) {
  const [origin, destination] = trip.lane.split("→").map((s) => s.trim());
  const [mismatch, setMismatch] = useState(false);
  const checks = [
    { label: "Origin", value: origin },
    { label: "Destination", value: destination },
    { label: "Delivery date", value: trip.delivered },
    { label: "Consignee", value: trip.client },
  ];
  return (
    <Modal onClose={onClose}>
      <ModalHeader title={`Validate POD · ${trip.id}`} tone="blue" icon={ShieldCheck} onClose={onClose} />
      <div className="p-6">
        <p className="mb-3 text-xs text-slate-500">The system checks the uploaded POD against the trip. A mismatch is rejected and flagged for review.</p>
        <div className="space-y-2">
          {checks.map((c) => (
            <div key={c.label} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
              <span className="text-slate-500">{c.label}</span>
              <span className={`flex items-center gap-1.5 ${mismatch && c.label === "Consignee" ? "text-red-600" : "text-slate-800"}`}>
                {mismatch && c.label === "Consignee" ? <X size={13} className="text-red-500" /> : <Check size={13} className="text-emerald-500" />}
                {c.value}
              </span>
            </div>
          ))}
        </div>
        <label className="mt-4 flex items-center gap-2 text-xs text-slate-500">
          <input type="checkbox" checked={mismatch} onChange={(e) => setMismatch(e.target.checked)} className="rounded border-slate-300" />
          Simulate a mismatch (consignee on POD differs)
        </label>
        <div className="mt-5 flex gap-3">
          <Btn variant="ghost" className="flex-1 py-2.5" onClick={onClose}>Cancel</Btn>
          {mismatch ? (
            <Btn variant="danger" className="flex-1 py-2.5" onClick={() => onValidate(false)}><AlertTriangle size={14} />Reject & flag</Btn>
          ) : (
            <Btn className="flex-1 py-2.5" onClick={() => onValidate(true)}><Check size={14} />Confirm match</Btn>
          )}
        </div>
      </div>
    </Modal>
  );
}

interface BookingGroup { bookingId: string; customer: string; truck: string; drops: ARTrip[]; freight: number; expense: number; approvedExpenses: number; pendingExpenses: number }
interface CustomerSummary { customer: string; bookings: BookingGroup[]; drops: number; freight: number; expense: number; approvedExpenses: number; pendingExpenses: number }

/* Group billable drops (POD uploaded) into bookings, then by customer — KPIs from the booking module. */
function buildCustomers(trips: ARTrip[]): CustomerSummary[] {
  const eligible = trips.filter((t) => t.podStage === "uploaded" || t.podStage === "validated");
  const byBooking = new Map<string, BookingGroup>();
  eligible.forEach((t) => {
    const bid = t.bookingId ?? t.id;
    const g = byBooking.get(bid) ?? { bookingId: bid, customer: t.client, truck: t.truck, drops: [], freight: 0, expense: 0, approvedExpenses: 0, pendingExpenses: 0 };
    g.drops.push(t);
    // Prefer the real booking freight when present (embedded mode); fall back to
    // the contract-rate lookup for standalone mock trips.
    g.freight += (t.revenue && t.revenue > 0) ? t.revenue : contractRateFor(t.lane, t.truck, t.client).base;
    g.approvedExpenses += t.approvedExpenses ?? 0;
    g.pendingExpenses += t.pendingExpenses ?? 0;
    g.expense += t.expense ?? 0;
    byBooking.set(bid, g);
  });
  const byCust = new Map<string, CustomerSummary>();
  [...byBooking.values()].forEach((g) => {
    const c = byCust.get(g.customer) ?? { customer: g.customer, bookings: [], drops: 0, freight: 0, expense: 0, approvedExpenses: 0, pendingExpenses: 0 };
    c.bookings.push(g); c.drops += g.drops.length; c.freight += g.freight; c.expense += g.expense; c.approvedExpenses += g.approvedExpenses; c.pendingExpenses += g.pendingExpenses;
    byCust.set(g.customer, c);
  });
  return [...byCust.values()].sort((a, b) => b.freight - a.freight);
}

/* The three booking-module KPIs the user asked for. */
export function Kpis({ freight, bookings, drops, approvedExpenses = 0, pendingExpenses = 0 }: { freight: number; bookings: number; drops: number; expense?: number; approvedExpenses?: number; pendingExpenses?: number }) {
  return (
    <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Card className="p-5">
        <div className="text-xs font-medium text-slate-500">Freight Amount</div>
        <Money value={freight} className="mt-1 block text-2xl font-bold text-slate-900" />
        <div className="mt-0.5 text-xs text-slate-400">{bookings} booking{bookings === 1 ? "" : "s"} · {drops} POD{drops === 1 ? "" : "s"}</div>
      </Card>
      <Card className="p-5">
        <div className="text-xs font-medium text-slate-500">Approved Expenses</div>
        <Money value={approvedExpenses} className="mt-1 block text-2xl font-bold text-emerald-700" />
        <div className="mt-0.5 text-xs text-slate-400">added to invoice</div>
      </Card>
      <Card className="p-5">
        <div className="text-xs font-medium text-slate-500">Pending Expenses</div>
        <Money value={pendingExpenses} className="mt-1 block text-2xl font-bold text-amber-600" />
        <div className="mt-0.5 text-xs text-slate-400">not added to total</div>
      </Card>
      <Card className="p-5 ring-1 ring-blue-200">
        <div className="text-xs font-medium text-slate-500">Total Invoice Amount</div>
        <Money value={freight + approvedExpenses} className="mt-1 block text-2xl font-bold text-blue-700" />
        <div className="mt-0.5 text-xs text-slate-400">freight + approved expenses</div>
      </Card>
    </div>
  );
}

function DraftsTable({ rows, onOpen }: { rows: ARInvoice[]; onOpen: (id: string) => void }) {
  return (
    <Card className="overflow-hidden">
      <div className="border-b border-slate-100 px-5 py-3 font-semibold text-slate-800">Drafts &amp; in progress</div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50/80 text-left text-xs uppercase tracking-wide text-slate-500">
            {["Invoice", "Customer", "Lane", "Invoiced", "Stage", ""].map((h, i) => <th key={i} className="px-5 py-3 font-semibold">{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((inv) => (
            <tr key={inv.id} onClick={() => onOpen(inv.id)} className="cursor-pointer border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
              <td className="px-5 py-3.5 font-mono text-xs font-medium text-slate-700">{inv.id}</td>
              <td className="px-5 py-3.5 text-slate-700">{inv.client}</td>
              <td className="px-5 py-3.5 text-slate-500">{inv.lane}</td>
              <td className="px-5 py-3.5"><Money value={inv.invoiced} className="font-semibold text-slate-800" /></td>
              <td className="px-5 py-3.5"><Pill tone={STAGE_TONE[inv.stage]}>{STAGE_LABEL[inv.stage]}</Pill></td>
              <td className="px-5 py-3.5 text-right">
                <button onClick={() => onOpen(inv.id)} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">
                  {inv.stage === "submitted" ? "Review" : "Open"}<ChevronRight size={12} />
                </button>
              </td>
            </tr>
          ))}
          {rows.length === 0 && <tr><td colSpan={6} className="px-5 py-10 text-center text-slate-400">No drafts yet — generate one from a customer's bookings above.</td></tr>}
        </tbody>
      </table>
    </Card>
  );
}

export default function Invoicing({ toast, toggle }: { toast: (m: string) => void; toggle?: ReactNode }) {
  const { trips, invoices, generateConsolidatedInvoice, validatePod } = useReceivables();
  const [openId, setOpenId] = useState<string | null>(null);
  const [cust, setCust] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [validating, setValidating] = useState<ARTrip | null>(null);
  const [openBooking, setOpenBooking] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<{ ids: string[]; drops: ARTrip[]; label: string } | null>(null);
  const [draftClient, setDraftClient] = useState("all");

  const open = openId ? invoices.find((i) => i.id === openId) : null;
  if (open) return <InvoiceDetail inv={open} onBack={() => setOpenId(null)} toast={toast} />;

  const customers = buildCustomers(trips);
  // Drafts & in-progress = not yet approved and not yet paid.
  const working = invoices.filter((i) => i.stage !== "approved" && i.paymentStatus !== "paid");
  const c = cust ? customers.find((x) => x.customer === cust) : null;

  // ---------- Customer drill: all bookings for one customer + KPIs + bill ----------
  if (c) {
    const toggle = (bid: string) => setSelected((s) => { const n = new Set(s); n.has(bid) ? n.delete(bid) : n.add(bid); return n; });
    // Preview first — the invoice is only created on Confirm in the modal.
    const genBooking = (g: BookingGroup) => {
      setConfirming({ ids: g.drops.map((d) => d.id), drops: g.drops, label: g.bookingId });
    };
    const genSelected = () => {
      const chosen = c.bookings.filter((b) => selected.has(b.bookingId));
      const drops = chosen.flatMap((b) => b.drops);
      setConfirming({ ids: drops.map((d) => d.id), drops, label: `${chosen.length} booking${chosen.length > 1 ? "s" : ""} · ${c.customer}` });
    };
    const confirmGenerate = () => {
      if (!confirming) return;
      const id = generateConsolidatedInvoice(confirming.ids);
      if (id) toast(`Invoice ${id} generated for ${confirming.label}`);
      setSelected(new Set());
      setConfirming(null);
    };
    const custDrafts = working.filter((i) => i.client === c.customer);

    return (
      <div>
        <button onClick={() => { setCust(null); setSelected(new Set()); }} className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800">
          <ArrowLeft size={15} />Back to customers
        </button>
        <SectionTitle sub="All booked freight with POD uploaded, ready to bill. Generate one invoice per booking, or select several and raise a single consolidated invoice.">{c.customer}</SectionTitle>

        <Kpis freight={c.freight} bookings={c.bookings.length} drops={c.drops} approvedExpenses={c.approvedExpenses} pendingExpenses={c.pendingExpenses} />

        {selected.size > 0 && (
          <Card className="mb-4 flex flex-wrap items-center justify-between gap-3 p-4 ring-1 ring-blue-200">
            <div className="text-sm text-slate-600">{selected.size} booking{selected.size > 1 ? "s" : ""} selected</div>
            <Btn onClick={genSelected}><Users size={14} />Generate one invoice for {c.customer}</Btn>
          </Card>
        )}

        <div className="space-y-4">
          {c.bookings.map((g) => {
            const expanded = openBooking === g.bookingId;
            const expenses = tripExpenses(g.drops);
            return (
            <Card key={g.bookingId} className="p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <label className="flex items-center gap-3">
                  <input type="checkbox" checked={selected.has(g.bookingId)} onChange={() => toggle(g.bookingId)} className="h-4 w-4 rounded border-slate-300" />
                  <div>
                    <div className="flex items-center gap-2">
                      <Package size={14} className="text-slate-400" />
                      <span className="font-mono text-sm font-semibold text-slate-800">{g.bookingId}</span>
                      <Pill tone="slate">{g.drops.length} drop{g.drops.length > 1 ? "s" : ""}</Pill>
                    </div>
                    <div className="mt-0.5 text-xs text-slate-400">
                      {g.truck} · Freight <Money value={g.freight} />
                      {g.approvedExpenses > 0 ? <> · Approved exp <Money value={g.approvedExpenses} /></> : null}
                      {g.pendingExpenses > 0 ? <span className="text-amber-600"> · Pending exp <Money value={g.pendingExpenses} /></span> : null}
                      {" · "}<span className="font-semibold text-blue-700">Invoice <Money value={g.freight + g.approvedExpenses} /></span>
                    </div>
                  </div>
                </label>
                <div className="flex items-center gap-2">
                  <button onClick={() => setOpenBooking(expanded ? null : g.bookingId)} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">
                    {expanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}{expanded ? "Hide details" : "View details"}
                  </button>
                  <Btn onClick={() => genBooking(g)}><ReceiptIndianRupee size={13} />Generate invoice</Btn>
                </div>
              </div>
              <div className="mt-3 space-y-1.5">
                {g.drops.map((d) => (
                  <div key={d.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                    <span className="text-slate-600"><span className="font-mono text-xs text-slate-500">{d.id}</span> · {d.lane}{d.consignee && <span className="text-slate-400"> → {d.consignee}</span>}</span>
                    <span className="flex items-center gap-2">
                      {d.podStage === "uploaded" && (
                        <button onClick={() => setValidating(d)} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"><ShieldCheck size={12} />Validate</button>
                      )}
                      <Pill tone={POD_STAGE[d.podStage]?.tone ?? "blue"}>{POD_STAGE[d.podStage]?.label ?? "POD uploaded"}</Pill>
                      <Money value={tripFreight(d)} className="font-semibold text-slate-800" />
                    </span>
                  </div>
                ))}
              </div>
              {expanded && (
                <div className="mt-4 space-y-4 border-t border-slate-100 pt-4">
                  <BookingDetailCard trip={g.drops[0]} />
                  {expenses.length > 0 && <ExpenseTable items={expenses} title="Booking expenses" toast={toast} />}
                </div>
              )}
            </Card>
            );
          })}
          {c.bookings.length === 0 && <Card className="p-12 text-center text-slate-400">All bookings for {c.customer} have been invoiced.</Card>}
        </div>

        <div className="mt-6"><DraftsTable rows={custDrafts} onOpen={setOpenId} /></div>

        {validating && (
          <ValidateModal trip={validating} onClose={() => setValidating(null)}
            onValidate={(ok) => {
              validatePod(validating.id, ok);
              toast(ok ? `POD validated for ${validating.id}` : `POD rejected for ${validating.id} — flagged for review`);
              setValidating(null);
            }} />
        )}

        {confirming && (
          <PreviewModal
            inv={previewInvoiceFromDrops(confirming.drops)}
            onClose={() => setConfirming(null)}
            onConfirm={confirmGenerate}
            confirmLabel="Confirm & generate invoice"
            toast={toast}
          />
        )}
      </div>
    );
  }

  // ---------- Customers list (default) ----------
  return (
    <div>
      {toggle}
      <SectionTitle sub="Customer-wise invoicing — pick a customer to see all their booked freight (POD uploaded) and bill it. Freight rate, bookings and expenses come from the booking module.">Generate Invoice</SectionTitle>

      {customers.length === 0 ? (
        <Card className="p-12 text-center text-slate-400">
          <ReceiptIndianRupee size={28} className="mx-auto mb-2 text-slate-300" />
          No bookings with uploaded PODs yet. Upload a POD on the Pending POD page and the customer appears here.
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {customers.map((cs) => (
            <Card key={cs.customer} className="overflow-hidden transition hover:ring-slate-300">
              <button onClick={() => { setCust(cs.customer); setSelected(new Set()); }} className="w-full p-5 text-left">
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-slate-800">{cs.customer}</div>
                  <ChevronRight size={16} className="text-slate-400" />
                </div>
                <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
                  <div><div className="text-[11px] text-slate-500">Freight</div><Money value={cs.freight} className="mt-0.5 block font-bold text-slate-800" /></div>
                  <div><div className="text-[11px] text-slate-500">Approved exp</div><Money value={cs.approvedExpenses} className="mt-0.5 block font-bold text-emerald-700" /></div>
                  <div><div className="text-[11px] text-slate-500">Total invoice</div><Money value={cs.freight + cs.approvedExpenses} className="mt-0.5 block font-bold text-blue-700" /></div>
                </div>
              </button>
            </Card>
          ))}
        </div>
      )}

      <div className="mt-6">
        {working.length > 0 && (
          <div className="mb-3 flex items-center gap-2">
            <span className="text-xs font-medium text-slate-500">Filter drafts by client</span>
            <select value={draftClient} onChange={(e) => setDraftClient(e.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 outline-none focus:border-slate-300">
              <option value="all">All clients</option>
              {[...new Set(working.map((i) => i.client))].sort().map((cl) => <option key={cl} value={cl}>{cl}</option>)}
            </select>
          </div>
        )}
        <DraftsTable rows={working.filter((i) => draftClient === "all" || i.client === draftClient)} onOpen={setOpenId} />
      </div>
    </div>
  );
}
