import React, { useState } from "react";
import { AlertTriangle, Check, Clock, Bell, FileText, RefreshCw, MessageSquare, Send } from "lucide-react";
import { Card, Pill, Money, SectionTitle, Stepper, Modal, ModalHeader } from "@finance/components/primitives";
import { useDisputes } from "@finance/lib/disputesStore";
import { VENDOR_BILLS, VENDOR_BILL_DETAILS } from "@finance/data/mock";
import { VendorBillDetail } from "@finance/modules/finance/enterprise/payables/pages/VendorMatch";

const STAGES = ["Raised", "Vendor Response", "Escalated (SLA)", "Resolved"];
const STAGE_IDX = { raised: 0, "vendor-response": 1, escalated: 2, resolved: 3 };
// Enterprise (buyer) only ever disputes a vendor's invoice — no customer disputes.
const KIND_LABEL = { customer: "Vendor", subvendor: "Vendor" };

// Conversation thread between admin and vendor on a disputed invoice (mock).
function DisputeChatModal({ dispute, onClose, onSend }: any) {
  const [text, setText] = useState("");
  const closed = dispute.stage === "resolved";
  const msgs = [
    { from: "vendor", text: dispute.vendorResponse, at: dispute.respondedAt, docs: dispute.vendorDocs },
    ...(dispute.thread ?? []),
  ];
  const send = () => { if (text.trim()) { onSend(text.trim()); setText(""); } };
  return (
    <Modal onClose={onClose} maxW="max-w-xl">
      <ModalHeader title={`Dispute conversation · ${dispute.id}`} tone="slate" icon={MessageSquare} onClose={onClose} />
      <div className="max-h-[55vh] space-y-3 overflow-y-auto bg-slate-50 px-5 py-4">
        {msgs.map((m: any, i: number) => {
          const admin = m.from === "admin";
          return (
            <div key={i} className={`flex ${admin ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm ${admin ? "bg-slate-900 text-white" : "border border-slate-200 bg-white text-slate-700"}`}>
                <div className={`mb-0.5 text-[10px] font-semibold uppercase tracking-wide ${admin ? "text-slate-300" : "text-slate-400"}`}>{admin ? "You (finance)" : dispute.client}{m.at ? ` · ${m.at}` : ""}</div>
                <div>{m.text}</div>
                {m.docs && m.docs.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {m.docs.map((doc: any) => <span key={doc} className="inline-flex items-center gap-1 rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[11px] text-slate-500"><FileText size={10} />{doc}</span>)}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {closed ? (
        <div className="border-t border-slate-200 px-5 py-3 text-center text-xs text-slate-400">This dispute is closed — conversation is read-only.</div>
      ) : (
        <div className="flex items-center gap-2 border-t border-slate-200 px-4 py-3">
          <input autoFocus value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="Reply to the vendor…"
            className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-slate-300 focus:bg-white" />
          <button onClick={send} disabled={!text.trim()} className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"><Send size={14} />Send</button>
        </div>
      )}
    </Modal>
  );
}

// A dispute id may match a live vendor bill; otherwise synthesise a minimal bill
// object so the shared invoice/trace viewer can render from VENDOR_BILL_DETAILS.
const billFor = (d: any) =>
  VENDOR_BILLS.find((b) => b.id === d.id) ??
  { id: d.id, vendor: d.client, billed: d.amount, contractRate: d.amount, pod: true, status: "variance", variance: 0, terms: "—", due: "—" };

export default function Disputes({ toast }: any) {
  const { disputes, resolveDispute, escalateDispute, replyToDispute } = useDisputes();
  const [viewing, setViewing] = useState<any>(null);
  const [chatId, setChatId] = useState<any>(null);
  const chatDispute = disputes.find((x) => x.id === chatId);

  const resolve = (id: any, how: any) => {
    resolveDispute(id, how);
    toast(how === "approve" ? "Invoice approved — dispute closed" : "Vendor to resubmit corrected invoice — dispute closed");
  };

  const escalate = (id: any) => {
    escalateDispute(id);
    toast(`${id} escalated to finance heads (SLA breached)`);
  };

  const items = disputes;

  if (viewing) {
    const d = disputes.find((x) => x.id === viewing);
    if (d) return <VendorBillDetail bill={billFor(d)} disputed onBack={() => setViewing(null)} onAct={() => {}} onDispute={() => {}} backLabel="Back to disputes" toast={toast} />;
  }

  return (
    <div>
      <SectionTitle sub="Resolve vendor-invoice disputes before they stall a payment — rate mismatch vs contract, unauthorised detention/accessorials, wrong trip reference, duplicate bills. 48h SLA, then auto-escalation.">Invoice Disputes</SectionTitle>

      <div className="space-y-4">
        {items.map((d) => {
          const idx = STAGE_IDX[d.stage as keyof typeof STAGE_IDX];
          const overdue = d.slaHrs < 0;
          const kind = d.kind || "subvendor";
          const hasDetail = !!(VENDOR_BILL_DETAILS as Record<string, any>)[d.id];
          return (
            <Card key={d.id} className={`p-5 ${overdue && d.stage !== "resolved" ? "ring-1 ring-red-200" : ""}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-sm font-semibold text-slate-800">{d.id}</span>
                    <Pill tone="violet">{KIND_LABEL[kind]}</Pill>
                    <span className="text-sm text-slate-400">·</span>
                    <span className="text-sm text-slate-600">{d.client}</span>
                    <Money value={d.amount} className="text-sm font-semibold text-slate-800" />
                  </div>
                  <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500"><AlertTriangle size={12} className="text-amber-500" />{d.reason}</div>
                </div>
                {d.stage !== "resolved" && (
                  <Pill tone={overdue ? "red" : "amber"}><Clock size={11} />{overdue ? `SLA breached ${-d.slaHrs}h` : `${d.slaHrs}h to SLA`}</Pill>
                )}
                {d.stage === "resolved" && <Pill tone="green"><Check size={11} />Resolved</Pill>}
              </div>

              <div className="mt-4"><Stepper steps={STAGES} current={idx} /></div>

              {d.notifiedAt && <div className="mt-3 flex items-center gap-1.5 text-[11px] text-slate-400"><Bell size={11} />Vendor notified {d.notifiedAt}</div>}

              {d.vendorResponse && (
                <div className={`mt-3 rounded-lg border px-3 py-2 ${d.vendorResponseType === "accept" ? "border-emerald-100 bg-emerald-50/60" : "border-red-100 bg-red-50/60"}`}>
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide">
                    {d.vendorResponseType === "accept" ? <span className="text-emerald-700">Vendor accepted</span> : <span className="text-red-700">Vendor rejected — counter-argument</span>}
                    {d.respondedAt && <span className="font-normal text-slate-400">· {d.respondedAt}</span>}
                  </div>
                  <div className="mt-1 text-xs text-slate-600">“{d.vendorResponse}”</div>
                  {d.vendorDocs && d.vendorDocs.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-2">
                      {d.vendorDocs.map((doc: any) => <span key={doc} className="inline-flex items-center gap-1 rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[11px] text-slate-500"><FileText size={10} />{doc}</span>)}
                    </div>
                  )}
                  {d.vendorResponseType === "reject" && (
                    <div className="mt-2 flex items-center gap-2">
                      <button onClick={() => setChatId(d.id)} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-50"><MessageSquare size={12} />Reply</button>
                      {d.thread && d.thread.length > 0 && <span className="text-[11px] text-slate-400">{d.thread.length} message{d.thread.length > 1 ? "s" : ""} in thread</span>}
                    </div>
                  )}
                </div>
              )}

              {d.resolution && <div className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700">{d.resolution}</div>}

              <div className="mt-4 flex flex-wrap items-center justify-end gap-3">
                {hasDetail && (
                  <button onClick={() => setViewing(d.id)} className="mr-auto inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"><FileText size={13} />View invoice &amp; trace</button>
                )}
                {d.stage !== "resolved" && (
                  <>
                    {d.slaHrs < 0 && d.stage !== "escalated" && (
                      <button onClick={() => escalate(d.id)} className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-100"><AlertTriangle size={13} />Escalate to finance heads</button>
                    )}
                    <button onClick={() => resolve(d.id, "approve")} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"><Check size={13} />Approve invoice &amp; close dispute</button>
                    <button onClick={() => resolve(d.id, "resubmit")} className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-700"><RefreshCw size={13} />Resubmit invoice &amp; close dispute</button>
                  </>
                )}
              </div>
            </Card>
          );
        })}
        {items.length === 0 && <Card className="p-12 text-center text-slate-400">No disputes in this view.</Card>}
      </div>

      {chatDispute && <DisputeChatModal dispute={chatDispute} onClose={() => setChatId(null)} onSend={(text: string) => replyToDispute(chatDispute.id, text)} />}
    </div>
  );
}
