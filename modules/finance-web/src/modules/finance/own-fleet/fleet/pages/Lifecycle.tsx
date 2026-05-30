import React from "react";
import { Shield, FileCheck, BadgeCheck, Banknote, TrendingDown, AlertTriangle } from "lucide-react";
import { Card, Pill, Money, SectionTitle } from "@finance/components/primitives";
import { LIFECYCLE } from "@finance/data/mock";

const TODAY = new Date("2026-05-21");
const daysTo = (d: any) => Math.round((new Date(d).getTime() - TODAY.getTime()) / 86400000);

function Expiry({ icon: Icon, label, date }: any) {
  const days = daysTo(date);
  const alert = days <= 30;
  return (
    <div className={`flex items-center justify-between rounded-lg border p-3 ${alert ? "border-amber-200 bg-amber-50" : "border-slate-200"}`}>
      <span className="flex items-center gap-1.5 text-xs text-slate-600"><Icon size={14} className={alert ? "text-amber-500" : "text-slate-400"} />{label}</span>
      <span className="text-right text-xs">
        <span className="font-mono text-slate-700">{date}</span>
        <span className={`block ${alert ? "text-amber-600" : "text-slate-400"}`}>{alert && <AlertTriangle size={9} className="mr-0.5 inline" />}{days}d</span>
      </span>
    </div>
  );
}

export default function Lifecycle() {
  return (
    <div>
      <SectionTitle sub="Periodic and lifecycle costs that don't hit every trip but define true cost of ownership. Alerts 30 days before expiry.">Vehicle Lifecycle Costs</SectionTitle>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {LIFECYCLE.map((v) => (
          <Card key={v.vehicle} className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <span className="font-mono text-sm font-semibold text-slate-800">{v.vehicle}</span>
              <Pill tone="violet">Insurance {<Money value={v.insurance.amount} />}</Pill>
            </div>
            <div className="space-y-2">
              <Expiry icon={Shield} label="Insurance renewal" date={v.insurance.expiry} />
              <Expiry icon={FileCheck} label="Permit renewal" date={v.permit.expiry} />
              <Expiry icon={BadgeCheck} label="Fitness certificate" date={v.fitness.expiry} />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
              <div className="rounded-lg border border-slate-200 p-3">
                <div className="flex items-center gap-1 text-xs text-slate-500"><Banknote size={12} />Loan EMI</div>
                <Money value={v.emi.monthly} className="mt-0.5 block font-semibold text-slate-800" />
                <div className="text-xs text-slate-400">{v.emi.remaining} EMIs left</div>
              </div>
              <div className="rounded-lg border border-slate-200 p-3">
                <div className="flex items-center gap-1 text-xs text-slate-500"><TrendingDown size={12} />Depreciation</div>
                <Money value={v.depreciation} className="mt-0.5 block font-semibold text-slate-800" />
                <div className="text-xs text-slate-400">annual (SLM 8yr)</div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
