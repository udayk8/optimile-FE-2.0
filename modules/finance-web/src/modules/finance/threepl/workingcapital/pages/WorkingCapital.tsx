import React from "react";
import { Zap, Landmark, CreditCard } from "lucide-react";
import { Card, Pill, Money, SectionTitle } from "@finance/components/primitives";
import { fmtL } from "@finance/lib/format";
import { DISCOUNT_OFFERS, FACTORING, CREDIT_LINE } from "@finance/data/mock";

export default function WorkingCapital({ toast }: any) {
  const linePct = (CREDIT_LINE.used / CREDIT_LINE.limit) * 100;
  return (
    <div>
      <SectionTitle sub="Bridge the gap between paying sub-vendors (short cycle) and collecting from clients (long cycle).">Working Capital Optimisation</SectionTitle>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <div className="mb-3 flex items-center gap-2 font-semibold text-slate-800"><Zap size={16} className="text-amber-500" />Dynamic discounting</div>
          <p className="mb-4 text-xs text-slate-500">Offer vendors early payment in exchange for a discount.</p>
          <div className="space-y-3">
            {DISCOUNT_OFFERS.map((o) => (
              <div key={o.invoice} className="flex items-center justify-between rounded-lg border border-slate-200 p-3 text-sm">
                <div>
                  <div className="font-medium text-slate-700">{o.vendor}</div>
                  <div className="text-xs text-slate-400">{o.invoice} · pay in {o.payIn}d for {o.discount}% off</div>
                </div>
                <div className="text-right">
                  <Money value={o.saving} className="font-semibold text-emerald-600" />
                  <button onClick={() => toast(`Early-payment offer sent for ${o.invoice}`)} className="mt-1 block rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50">Offer</button>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <div className="mb-3 flex items-center gap-2 font-semibold text-slate-800"><Landmark size={16} className="text-blue-500" />Invoice factoring</div>
          <p className="mb-4 text-xs text-slate-500">Unlock cash from outstanding client invoices via NBFC partners.</p>
          <div className="space-y-3">
            {FACTORING.map((f) => (
              <div key={f.invoice} className="flex items-center justify-between rounded-lg border border-slate-200 p-3 text-sm">
                <div>
                  <div className="font-medium text-slate-700">{f.client}</div>
                  <div className="text-xs text-slate-400">{f.invoice} · {f.advance}% advance @ {f.fee}% fee</div>
                </div>
                <div className="text-right">
                  <Money value={Math.round(f.amount * f.advance / 100)} className="font-semibold text-blue-600" />
                  <button onClick={() => toast(`Factoring requested for ${f.invoice}`)} className="mt-1 block rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50">Factor</button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="mt-6 p-5">
        <div className="mb-3 flex items-center justify-between">
          <span className="flex items-center gap-2 font-semibold text-slate-800"><CreditCard size={16} className="text-violet-500" />Credit-line utilisation</span>
          <Pill tone={linePct >= 80 ? "amber" : "green"}>{linePct.toFixed(0)}% used</Pill>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-violet-500" style={{ width: `${linePct}%` }} />
        </div>
        <div className="mt-2 flex justify-between text-xs text-slate-400">
          <span>Used {fmtL(CREDIT_LINE.used)}</span><span>Limit {fmtL(CREDIT_LINE.limit)}</span>
        </div>
      </Card>
    </div>
  );
}
