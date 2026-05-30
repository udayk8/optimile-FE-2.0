import React, { useState } from "react";
import { Lock, Unlock, Ban } from "lucide-react";
import { Card, Pill, Money, SectionTitle } from "@finance/components/primitives";
import { RETENTION } from "@finance/data/mock";

export default function Retention({ toast }: any) {
  const [rows, setRows] = useState(RETENTION);
  const release = (vendor: any) => {
    setRows((xs) => xs.map((r) => (r.vendor === vendor ? { ...r, released: r.released + r.retained, retained: 0 } : r)));
    toast(`Retention released to ${vendor} — performance condition met`);
  };

  return (
    <div>
      <SectionTitle sub="A percentage of each payment is withheld until performance conditions are met — released or forfeited per the contract.">Retention &amp; Withholding</SectionTitle>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {rows.map((r) => {
          const met = r.otd >= 95;
          return (
            <Card key={r.vendor} className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-semibold text-slate-800">{r.vendor}</div>
                  <div className="mt-0.5 text-xs text-slate-400">{r.condition}</div>
                </div>
                <Pill tone={met ? "green" : "red"}>{r.otd}% OTD</Pill>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                {[["Total earned", r.earned, "text-slate-800"], ["Retained", r.retained, "text-amber-600"], ["Released", r.released, "text-emerald-600"], ["Forfeited", r.forfeited, "text-red-600"]].map(([l, v, c]) => (
                  <div key={l} className="rounded-lg border border-slate-200 p-3">
                    <div className="text-xs text-slate-500">{l}</div>
                    <Money value={v as number} className={`mt-0.5 block font-semibold ${c}`} />
                  </div>
                ))}
              </div>

              <div className="mt-4">
                {r.retained > 0 ? (
                  met ? (
                    <button onClick={() => release(r.vendor)} className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"><Unlock size={14} />Release retention ({<Money value={r.retained} />})</button>
                  ) : (
                    <div className="flex items-center justify-center gap-1.5 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600"><Ban size={14} />Condition not met — at risk of forfeiture</div>
                  )
                ) : (
                  <div className="flex items-center justify-center gap-1.5 rounded-lg bg-slate-50 px-4 py-2 text-sm text-slate-400"><Lock size={14} />No retention currently held</div>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
