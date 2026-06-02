import React, { useRef, useState } from "react";
import {
  ReceiptIndianRupee, ArrowLeft, Plus, Send, Check, AlertTriangle,
  ScrollText, FileText, Download, CheckCircle2, RefreshCw, ChevronRight, X, Package, Users,
} from "lucide-react";
import { Card, Pill, Money, SectionTitle, Modal, ModalHeader, Stepper, Btn } from "@finance/components/primitives";
import { fmtINR } from "@finance/lib/format";
import { ACCESSORIAL_LIBRARY, AR_TOLERANCE_PCT, OPTIMILE_BILL_TO, contractRateFor } from "@finance/data/mock";
import { useReceivables, type ARInvoice, type ARTrip } from "@finance/lib/receivablesStore";
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

/* Drop POD-stage chips (only uploaded/validated drops are billable here). */
const POD_STAGE: Record<string, { label: string; tone: any }> = {
  uploaded: { label: "POD uploaded", tone: "blue" },
  validated: { label: "POD validated", tone: "green" },
};

interface BookingGroup { bookingId: string; customer: string; truck: string; drops: ARTrip[]; freight: number; expense: number }
interface CustomerSummary { customer: string; bookings: BookingGroup[]; drops: number; freight: number; expense: number }

/* Group billable drops (POD uploaded) into bookings, then by customer — KPIs from the booking module. */
function buildCustomers(trips: ARTrip[]): CustomerSummary[] {
  const eligible = trips.filter((t) => t.podStage === "uploaded" || t.podStage === "validated");
  const byBooking = new Map<string, BookingGroup>();
  eligible.forEach((t) => {
    const bid = t.bookingId ?? t.id;
    const g = byBooking.get(bid) ?? { bookingId: bid, customer: t.client, truck: t.truck, drops: [], freight: 0, expense: 0 };
    g.drops.push(t);
    g.freight += contractRateFor(t.lane, t.truck, t.client).base;
    g.expense += t.expense ?? 0;
    byBooking.set(bid, g);
  });
  const byCust = new Map<string, CustomerSummary>();
  [...byBooking.values()].forEach((g) => {
    const c = byCust.get(g.customer) ?? { customer: g.customer, bookings: [], drops: 0, freight: 0, expense: 0 };
    c.bookings.push(g); c.drops += g.drops.length; c.freight += g.freight; c.expense += g.expense;
    byCust.set(g.customer, c);
  });
  return [...byCust.values()].sort((a, b) => b.freight - a.freight);
}

/* The three booking-module KPIs the user asked for. */
function Kpis({ freight, bookings, drops, expense }: { freight: number; bookings: number; drops: number; expense: number }) {
  return (
    <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
      <Card className="p-5">
        <div className="text-xs font-medium text-slate-500">Freight rate</div>
        <Money value={freight} className="mt-1 block text-2xl font-bold text-slate-900" />
        <div className="mt-0.5 text-xs text-emerald-600">Margin <Money value={freight - expense} /></div>
      </Card>
      <Card className="p-5">
        <div className="text-xs font-medium text-slate-500">Booking details</div>
        <div className="mt-1 text-2xl font-bold text-slate-900">{bookings}<span className="text-sm font-normal text-slate-400"> booking{bookings === 1 ? "" : "s"}</span></div>
        <div className="mt-0.5 text-xs text-slate-400">{drops} drop{drops === 1 ? "" : "s"} (PODs)</div>
      </Card>
      <Card className="p-5">
        <div className="text-xs font-medium text-slate-500">Expenses</div>
        <Money value={expense} className="mt-1 block text-2xl font-bold text-slate-700" />
        <div className="mt-0.5 text-xs text-slate-400">cost from booking module</div>
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
            {["Invoice", "Customer", "Lane", "Invoiced", "Variance", "Stage", ""].map((h, i) => <th key={i} className="px-5 py-3 font-semibold">{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((inv) => (
            <tr key={inv.id} onClick={() => onOpen(inv.id)} className="cursor-pointer border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
              <td className="px-5 py-3.5 font-mono text-xs font-medium text-slate-700">{inv.id}</td>
              <td className="px-5 py-3.5 text-slate-700">{inv.client}</td>
              <td className="px-5 py-3.5 text-slate-500">{inv.lane}</td>
              <td className="px-5 py-3.5"><Money value={inv.invoiced} className="font-semibold text-slate-800" /></td>
              <td className="px-5 py-3.5"><VariancePill inv={inv} /></td>
              <td className="px-5 py-3.5"><Pill tone={STAGE_TONE[inv.stage]}>{STAGE_LABEL[inv.stage]}</Pill></td>
              <td className="px-5 py-3.5 text-right">
                <button onClick={() => onOpen(inv.id)} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">
                  {inv.stage === "submitted" ? "Review" : "Open"}<ChevronRight size={12} />
                </button>
              </td>
            </tr>
          ))}
          {rows.length === 0 && <tr><td colSpan={7} className="px-5 py-10 text-center text-slate-400">No drafts yet — generate one from a customer's bookings above.</td></tr>}
        </tbody>
      </table>
    </Card>
  );
}

export default function Invoicing({ toast }: any) {
  const { trips, invoices, generateConsolidatedInvoice } = useReceivables();
  const [openId, setOpenId] = useState<string | null>(null);
  const [cust, setCust] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const open = openId ? invoices.find((i) => i.id === openId) : null;
  if (open) return <InvoiceDetail inv={open} onBack={() => setOpenId(null)} toast={toast} />;

  const customers = buildCustomers(trips);
  const working = invoices.filter((i) => i.stage !== "approved");
  const c = cust ? customers.find((x) => x.customer === cust) : null;

  // ---------- Customer drill: all bookings for one customer + KPIs + bill ----------
  if (c) {
    const toggle = (bid: string) => setSelected((s) => { const n = new Set(s); n.has(bid) ? n.delete(bid) : n.add(bid); return n; });
    const genBooking = (g: BookingGroup) => {
      const id = generateConsolidatedInvoice(g.drops.map((d) => d.id));
      if (id) toast(`Draft ${id} generated for ${g.bookingId} (${g.drops.length} drop${g.drops.length > 1 ? "s" : ""})`);
      setSelected((s) => { const n = new Set(s); n.delete(g.bookingId); return n; });
    };
    const genSelected = () => {
      const chosen = c.bookings.filter((b) => selected.has(b.bookingId));
      const ids = chosen.flatMap((b) => b.drops.map((d) => d.id));
      const id = generateConsolidatedInvoice(ids);
      if (id) toast(`One invoice ${id} for ${c.customer} across ${chosen.length} booking${chosen.length > 1 ? "s" : ""}`);
      setSelected(new Set());
    };
    const custDrafts = working.filter((i) => i.client === c.customer);

    return (
      <div>
        <button onClick={() => { setCust(null); setSelected(new Set()); }} className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800">
          <ArrowLeft size={15} />Back to customers
        </button>
        <SectionTitle sub="All booked freight with POD uploaded, ready to bill. Generate one invoice per booking, or select several and raise a single consolidated invoice.">{c.customer}</SectionTitle>

        <Kpis freight={c.freight} bookings={c.bookings.length} drops={c.drops} expense={c.expense} />

        {selected.size > 0 && (
          <Card className="mb-4 flex flex-wrap items-center justify-between gap-3 p-4 ring-1 ring-blue-200">
            <div className="text-sm text-slate-600">{selected.size} booking{selected.size > 1 ? "s" : ""} selected</div>
            <Btn onClick={genSelected}><Users size={14} />Generate one invoice for {c.customer}</Btn>
          </Card>
        )}

        <div className="space-y-4">
          {c.bookings.map((g) => (
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
                    <div className="mt-0.5 text-xs text-slate-400">{g.truck} · freight <Money value={g.freight} /></div>
                  </div>
                </label>
                <Btn onClick={() => genBooking(g)}><ReceiptIndianRupee size={13} />Generate invoice</Btn>
              </div>
              <div className="mt-3 space-y-1.5">
                {g.drops.map((d) => (
                  <div key={d.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                    <span className="text-slate-600"><span className="font-mono text-xs text-slate-500">{d.id}</span> · {d.lane}{d.consignee && <span className="text-slate-400"> → {d.consignee}</span>}</span>
                    <span className="flex items-center gap-2">
                      <Pill tone={POD_STAGE[d.podStage]?.tone ?? "blue"}>{POD_STAGE[d.podStage]?.label ?? "POD uploaded"}</Pill>
                      <Money value={contractRateFor(d.lane, d.truck, d.client).base} className="font-semibold text-slate-800" />
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          ))}
          {c.bookings.length === 0 && <Card className="p-12 text-center text-slate-400">All bookings for {c.customer} have been invoiced.</Card>}
        </div>

        <div className="mt-6"><DraftsTable rows={custDrafts} onOpen={setOpenId} /></div>
      </div>
    );
  }

  // ---------- Customers list (default) ----------
  return (
    <div>
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
                  <div><div className="text-[11px] text-slate-500">Freight rate</div><Money value={cs.freight} className="mt-0.5 block font-bold text-slate-800" /></div>
                  <div><div className="text-[11px] text-slate-500">Bookings</div><div className="mt-0.5 font-bold text-slate-800">{cs.bookings.length}<span className="text-xs font-normal text-slate-400"> · {cs.drops}d</span></div></div>
                  <div><div className="text-[11px] text-slate-500">Expenses</div><Money value={cs.expense} className="mt-0.5 block font-bold text-slate-600" /></div>
                </div>
              </button>
            </Card>
          ))}
        </div>
      )}

      <div className="mt-6"><DraftsTable rows={working} onOpen={setOpenId} /></div>
    </div>
  );
}
