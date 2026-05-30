import React, { useState } from "react";
import { Building2, AlertTriangle, Ban, Check, ShieldCheck } from "lucide-react";
import { Card, Pill, SectionTitle } from "@finance/components/primitives";
import { fmtL } from "@finance/lib/format";
import { CLIENTS } from "@finance/data/mock";

export default function CreditLimits({ toast }: any) {
  const [clients, setClients] = useState(CLIENTS);

  const toggleBlock = (id: any) => {
    setClients((cs) => cs.map((c) => {
      if (c.id !== id) return c;
      const blocked = c.status === "blocked";
      toast(blocked ? `Indents unblocked for ${c.name}` : `New indents blocked for ${c.name}`);
      return { ...c, status: blocked ? "warning" : "blocked" };
    }));
  };
  const override = (c: any) => toast(`Override logged — one indent allowed for ${c.name} (Finance Head)`);

  return (
    <div>
      <SectionTitle sub="Your circuit breaker. When a client over-extends, block new orders to protect working capital.">Credit Limit Control</SectionTitle>
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {clients.map((c) => {
          const pct = Math.min((c.used / c.limit) * 100, 115);
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
                  <span className="font-semibold">Block reason:</span> {c.blockReason}<div className="mt-0.5 text-red-400">by {c.blockedBy}</div>
                </div>
              )}
              <div className="mt-4 flex gap-2">
                <button onClick={() => toggleBlock(c.id)}
                  className={`inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition ${blocked ? "border border-slate-200 text-slate-600 hover:bg-slate-50" : "bg-red-600 text-white hover:bg-red-700"}`}>
                  {blocked ? <><Check size={14} />Unblock indents</> : <><Ban size={14} />Block new indents</>}
                </button>
                {blocked && (
                  <button onClick={() => override(c)} title="Authorised override (e.g. VP Ops / Finance Head)"
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-700 hover:bg-amber-100">
                    <ShieldCheck size={14} />Override
                  </button>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
