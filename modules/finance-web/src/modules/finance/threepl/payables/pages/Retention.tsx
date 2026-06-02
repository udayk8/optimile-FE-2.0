import React from "react";
import { Lock, Unlock, Ban, FileMinus } from "lucide-react";
import { Card, Pill, Money, SectionTitle, Btn } from "@finance/components/primitives";
import { usePayables } from "@finance/lib/payablesStore";

export default function Retention({ toast }: any) {
  const { retention, releaseRetention, forfeitRetention } = usePayables();

  const release = (vendor: string) => {
    releaseRetention(vendor);
    toast(`Retention released to ${vendor} — performance condition met`);
  };
  const forfeit = (vendor: string) => {
    forfeitRetention(vendor);
    toast(`Retention forfeited for ${vendor} — debit note raised, payables ledger updated`);
  };

  return (
    <div>
      <SectionTitle sub="A percentage of each payment is withheld until performance conditions are met — released on success, or forfeited and converted to a debit note.">Retention &amp; Withholding</SectionTitle>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {retention.map((r) => {
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
                  <div key={l as string} className="rounded-lg border border-slate-200 p-3">
                    <div className="text-xs text-slate-500">{l}</div>
                    <Money value={v as number} className={`mt-0.5 block font-semibold ${c}`} />
                  </div>
                ))}
              </div>

              {r.debitNote && (
                <div className="mt-3 flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
                  <FileMinus size={13} />Forfeiture converted to debit note <span className="font-mono font-semibold">{r.debitNote}</span>.
                </div>
              )}

              <div className="mt-4">
                {r.retained > 0 ? (
                  met ? (
                    <Btn variant="primary" className="w-full bg-emerald-600 py-2 hover:bg-emerald-700" onClick={() => release(r.vendor)}>
                      <Unlock size={14} />Release retention (<Money value={r.retained} />)
                    </Btn>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center justify-center gap-1.5 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600"><Ban size={14} />Condition not met — eligible for forfeiture</div>
                      <Btn variant="danger" className="w-full py-2" onClick={() => forfeit(r.vendor)}>
                        <FileMinus size={14} />Forfeit &amp; raise debit note (<Money value={r.retained} />)
                      </Btn>
                    </div>
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
