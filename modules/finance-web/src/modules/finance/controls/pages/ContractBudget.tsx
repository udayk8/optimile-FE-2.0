import React, { useState } from "react";
import { Building2, Wallet, ArrowRight, Check } from "lucide-react";
import { Card, Money, SectionTitle } from "@finance/components/primitives";
import { CONTRACT_BUDGET } from "@finance/data/mock";

export default function ContractBudget({ toast }: any) {
  const [committed, setCommitted] = useState(false);
  const total = CONTRACT_BUDGET.breakdown.reduce((s, b) => s + b.amount, 0);

  return (
    <div>
      <SectionTitle sub="Before a contract goes live, plan the working-capital budget. This becomes the client's credit limit.">Contract Closure &amp; Budget Planning</SectionTitle>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <div className="mb-4 flex items-center gap-2 font-semibold text-slate-800"><Building2 size={16} className="text-slate-400" />{CONTRACT_BUDGET.client}</div>
          <div className="mb-4 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-lg border border-slate-200 p-3"><div className="text-xs text-slate-500">Contracted lanes</div><div className="mt-0.5 font-semibold text-slate-800">{CONTRACT_BUDGET.lanes}</div></div>
            <div className="rounded-lg border border-slate-200 p-3"><div className="text-xs text-slate-500">Est. monthly volume</div><div className="mt-0.5 font-semibold text-slate-800">{CONTRACT_BUDGET.monthlyVolume}</div></div>
          </div>

          <h3 className="mb-2 text-sm font-semibold text-slate-700">Working-capital budget</h3>
          <div className="space-y-2 text-sm">
            {CONTRACT_BUDGET.breakdown.map((b) => (
              <div key={b.head} className="flex items-center justify-between border-b border-slate-100 pb-2 last:border-0">
                <span className="text-slate-600">{b.head}</span>
                <Money value={b.amount} className="font-medium text-slate-800" />
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2.5">
            <span className="font-semibold text-slate-800">Total budget = proposed credit limit</span>
            <Money value={total} className="text-lg font-bold text-slate-900" />
          </div>
        </Card>

        <Card className="flex flex-col p-5">
          <div className="flex items-center gap-2 font-semibold text-slate-800"><Wallet size={16} className="text-slate-400" />Set as credit limit</div>
          <p className="mt-2 text-xs text-slate-500">Once committed, the system tracks actual spend against this limit in real time and alerts at 80% / 100% utilisation.</p>
          <div className="mt-auto pt-5">
            {committed ? (
              <div className="flex items-center justify-center gap-1.5 rounded-lg bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-700"><Check size={15} />Credit limit set · {<Money value={total} />}</div>
            ) : (
              <button onClick={() => { setCommitted(true); toast(`Credit limit of ${(total / 100000).toFixed(1)}L set for ${CONTRACT_BUDGET.client}`); }}
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-700">
                Commit budget<ArrowRight size={14} />
              </button>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
