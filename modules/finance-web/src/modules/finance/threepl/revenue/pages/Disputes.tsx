import React, { useState } from "react";
import { AlertTriangle, Check, X, Clock } from "lucide-react";
import { Card, Pill, Money, SectionTitle, Stepper } from "@finance/components/primitives";
import { useDisputes } from "@finance/lib/disputesStore";

const STAGES = ["Raised", "Vendor Response", "Escalated (SLA)", "Resolved"];
const STAGE_IDX = { raised: 0, "vendor-response": 1, escalated: 2, resolved: 3 };
const KIND_LABEL = { customer: "Customer", subvendor: "Sub-vendor" };
const TABS = [["all", "All"], ["customer", "Customer"], ["subvendor", "Sub-vendor"]];

export default function Disputes({ toast }: any) {
  const { disputes, resolveDispute } = useDisputes();
  const [tab, setTab] = useState("all");

  const resolve = (id: any, how: any) => {
    resolveDispute(id, how);
    toast(how === "accept" ? "Dispute accepted — credit/debit note will be issued" : "Dispute rejected — invoice confirmed");
  };

  const items = disputes.filter((d) => tab === "all" || (d.kind || "customer") === tab);

  return (
    <div>
      <SectionTitle sub="Resolve billing disputes without stalling the rest of the collection cycle. 48h SLA, then auto-escalation. Includes customer and sub-vendor disputes.">Invoice Disputes</SectionTitle>

      <div className="mb-5 inline-flex rounded-lg bg-slate-100 p-1 text-sm">
        {TABS.map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} className={`rounded-md px-4 py-1.5 font-medium transition ${tab === k ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}>{l}</button>
        ))}
      </div>

      <div className="space-y-4">
        {items.map((d) => {
          const idx = STAGE_IDX[d.stage as keyof typeof STAGE_IDX];
          const overdue = d.slaHrs < 0;
          const kind = d.kind || "customer";
          return (
            <Card key={d.id} className={`p-5 ${overdue && d.stage !== "resolved" ? "ring-1 ring-red-200" : ""}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-sm font-semibold text-slate-800">{d.id}</span>
                    <Pill tone={kind === "subvendor" ? "violet" : "blue"}>{KIND_LABEL[kind]}</Pill>
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

              {d.resolution && <div className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700">{d.resolution}</div>}

              {d.stage !== "resolved" && (
                <div className="mt-4 flex justify-end gap-3">
                  <button onClick={() => resolve(d.id, "reject")} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"><X size={13} />Reject (confirm invoice)</button>
                  <button onClick={() => resolve(d.id, "accept")} className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-700"><Check size={13} />Accept ({kind === "subvendor" ? "issue debit note" : "issue credit note"})</button>
                </div>
              )}
            </Card>
          );
        })}
        {items.length === 0 && <Card className="p-12 text-center text-slate-400">No disputes in this view.</Card>}
      </div>
    </div>
  );
}
