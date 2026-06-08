import React, { useMemo, useState } from "react";
import { Building2, AlertTriangle, Ban, Check, ShieldCheck } from "lucide-react";
import { Card, Pill, SectionTitle, Modal, ModalHeader } from "@finance/components/primitives";
import { fmtL } from "@finance/lib/format";
import { CLIENTS } from "@finance/data/mock";
import { useFinanceBridge } from "@finance/integration/finance-data-bridge";
import { useAuditLogger } from "@finance/lib/auditStore";

/* A client row the page renders — normalised so the bridge customers and the
   standalone CLIENTS mock share one shape. */
interface CreditRow {
  id: string;
  name: string;
  limit: number;
  used: number;
  status: "healthy" | "warning" | "blocked";
  blockReason?: string;
  blockedBy?: string;
}

export default function CreditLimits({ toast }: any) {
  const bridge = useFinanceBridge();
  const logAudit = useAuditLogger();

  // Real per-customer credit from the bridge when embedded; else the demo mock.
  const rows: CreditRow[] = useMemo(() => {
    if (bridge?.customers && bridge.customers.length > 0) {
      return bridge.customers.map((c) => ({
        id: c.customerId,
        name: c.name,
        limit: c.creditLimit,
        used: c.used,
        status: c.blocked ? "blocked" : c.utilizationPercent >= 80 ? "warning" : "healthy",
        blockReason: c.blockReason,
        blockedBy: c.blockedBy,
      }));
    }
    return CLIENTS.map((c) => ({ id: c.id, name: c.name, limit: c.limit, used: c.used, status: c.status as CreditRow["status"], blockReason: (c as any).blockReason, blockedBy: (c as any).blockedBy }));
  }, [bridge?.customers]);

  // Local mirror so the standalone mock stays interactive (bridge mode re-derives
  // from the shared store on the next render, so we only keep local state for mock).
  const [mockRows, setMockRows] = useState<CreditRow[]>(rows);
  const usingBridge = Boolean(bridge?.customers && bridge.customers.length > 0);
  const data = usingBridge ? rows : mockRows;

  // Modal state: blocking needs a mandatory note; override needs a justification.
  const [blockTarget, setBlockTarget] = useState<CreditRow | null>(null);
  const [note, setNote] = useState("");
  const [overrideTarget, setOverrideTarget] = useState<CreditRow | null>(null);
  const [justification, setJustification] = useState("");

  const confirmBlock = () => {
    const c = blockTarget;
    if (!c || !note.trim()) return;
    if (usingBridge) bridge?.setIndentBlock?.(c.id, true, note.trim());
    else setMockRows((cs) => cs.map((x) => (x.id === c.id ? { ...x, status: "blocked", blockReason: note.trim(), blockedBy: "Finance" } : x)));
    logAudit({ user: "Finance", action: "Indents blocked", entity: c.name, type: "Customer", amount: c.used, from: "Active", to: "Blocked" });
    toast(`New indents blocked for ${c.name}`);
    setBlockTarget(null);
    setNote("");
  };

  const unblock = (c: CreditRow) => {
    if (usingBridge) bridge?.setIndentBlock?.(c.id, false, "");
    else setMockRows((cs) => cs.map((x) => (x.id === c.id ? { ...x, status: "warning", blockReason: undefined } : x)));
    logAudit({ user: "Finance", action: "Indents unblocked", entity: c.name, type: "Customer", from: "Blocked", to: "Active" });
    toast(`Indents unblocked for ${c.name}`);
  };

  const confirmOverride = () => {
    const c = overrideTarget;
    if (!c || !justification.trim()) return;
    if (usingBridge) bridge?.overrideIndentBlock?.(c.id, justification.trim());
    logAudit({ user: "Finance", action: "Indent block override", entity: c.name, type: "Customer", from: "Blocked", to: "Override allowed" });
    toast(`Override logged — one indent allowed for ${c.name}`);
    setOverrideTarget(null);
    setJustification("");
  };

  return (
    <div>
      <SectionTitle sub="Your circuit breaker. When a client over-extends, block new orders to protect working capital.">Credit Limit Control</SectionTitle>
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {data.map((c) => {
          const pct = c.limit > 0 ? Math.min((c.used / c.limit) * 100, 115) : 0;
          const tone = pct >= 100 ? "red" : pct >= 80 ? "amber" : "green";
          const bar = { red: "#ef4444", amber: "#f59e0b", green: "#10b981" }[tone];
          const blocked = c.status === "blocked";
          return (
            <Card key={c.id} className={`p-5 ${blocked ? "ring-2 ring-red-300" : ""}`}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 font-semibold text-slate-800"><Building2 size={16} className="text-slate-400" />{c.name}</div>
                  <div className="mt-1 text-xs text-slate-400">Limit {fmtL(c.limit)} · Used {fmtL(c.used)}</div>
                </div>
                <Pill tone={tone}>{pct.toFixed(0)}% used</Pill>
              </div>
              <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(pct, 100)}%`, background: bar }} />
              </div>
              {pct >= 80 && pct < 100 && <div className="mt-2 flex items-center gap-1 text-xs text-amber-600"><AlertTriangle size={12} />80% threshold crossed — KAM notified</div>}
              {pct >= 100 && <div className="mt-2 flex items-center gap-1 text-xs text-red-600"><AlertTriangle size={12} />Over limit — review required</div>}
              {blocked && c.blockReason && (
                <div className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
                  <span className="font-semibold">Block reason:</span> {c.blockReason}{c.blockedBy && <div className="mt-0.5 text-red-400">by {c.blockedBy}</div>}
                </div>
              )}
              <div className="mt-4 flex gap-2">
                <button onClick={() => (blocked ? unblock(c) : (setBlockTarget(c), setNote("")))}
                  className={`inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition ${blocked ? "border border-slate-200 text-slate-600 hover:bg-slate-50" : "bg-red-600 text-white hover:bg-red-700"}`}>
                  {blocked ? <><Check size={14} />Unblock indents</> : <><Ban size={14} />Block new indents</>}
                </button>
                {blocked && (
                  <button onClick={() => (setOverrideTarget(c), setJustification(""))} title="Authorised override (e.g. VP Ops / Finance Head)"
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-700 hover:bg-amber-100">
                    <ShieldCheck size={14} />Override
                  </button>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Block modal — mandatory note documenting the internal discussion (BRD 3.5). */}
      {blockTarget && (
        <Modal onClose={() => setBlockTarget(null)}>
          <ModalHeader title={`Block new indents · ${blockTarget.name}`} tone="red" icon={Ban} onClose={() => setBlockTarget(null)} />
          <div className="space-y-4 p-6">
            <p className="text-sm text-slate-500">This stops new indents for this client. Record the reason and the stakeholder alignment (KAM / sales) that took place.</p>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder="e.g. Payments overdue 45+ days. Aligned with KAM on 6-Jun."
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400" />
            <div className="flex justify-end gap-2">
              <button onClick={() => setBlockTarget(null)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">Cancel</button>
              <button onClick={confirmBlock} disabled={!note.trim()} className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"><Ban size={14} />Block indents</button>
            </div>
          </div>
        </Modal>
      )}

      {/* Override modal — documented justification for allowing a specific indent. */}
      {overrideTarget && (
        <Modal onClose={() => setOverrideTarget(null)}>
          <ModalHeader title={`Override block · ${overrideTarget.name}`} tone="amber" icon={ShieldCheck} onClose={() => setOverrideTarget(null)} />
          <div className="space-y-4 p-6">
            <p className="text-sm text-slate-500">Authorised exception (e.g. VP Operations / Finance Head). The client stays blocked; this documents why an indent is being allowed.</p>
            <textarea value={justification} onChange={(e) => setJustification(e.target.value)} rows={3} placeholder="Justification for the override…"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400" />
            <div className="flex justify-end gap-2">
              <button onClick={() => setOverrideTarget(null)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">Cancel</button>
              <button onClick={confirmOverride} disabled={!justification.trim()} className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"><ShieldCheck size={14} />Log override</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
