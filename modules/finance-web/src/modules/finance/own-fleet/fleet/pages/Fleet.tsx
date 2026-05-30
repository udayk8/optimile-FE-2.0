import React, { useState } from "react";
import { Truck, ArrowUpRight, ArrowDownRight, AlertTriangle, X } from "lucide-react";
import { Card, Pill, Money, SectionTitle, Modal, ModalHeader } from "@finance/components/primitives";
import { VEHICLES, FUEL } from "@finance/data/mock";

const CostRow = ({ k, v, bold, warn }: any) => (
  <div className="flex items-center justify-between">
    <span className={`${bold ? "font-medium text-slate-700" : "text-slate-500"} ${warn ? "text-amber-600" : ""}`}>{k}{warn ? " ⚠" : ""}</span>
    <Money value={v} className={`${bold ? "font-semibold text-slate-800" : v < 0 ? "text-slate-500" : "text-slate-700"}`} />
  </div>
);

function VehicleLedger({ v, onClose }: any) {
  const cost = v.fuel + v.driver + v.maint + v.emi + v.toll;
  const profit = v.revenue - cost;
  const rows = [
    { type: "Revenue", ref: "Trip earnings (MTD)", amt: v.revenue },
    { type: "Cost", ref: "Fuel", amt: -v.fuel },
    { type: "Cost", ref: "Driver salary allocation", amt: -v.driver },
    { type: "Cost", ref: "Maintenance & repairs", amt: -v.maint },
    { type: "Cost", ref: "Loan EMI", amt: -v.emi },
    { type: "Cost", ref: "Toll & misc", amt: -v.toll },
  ];
  return (
    <Modal onClose={onClose} maxW="max-w-md">
      <ModalHeader title={`Vehicle ledger · ${v.id}`} tone="slate" icon={Truck} onClose={onClose} />
      <div className="p-6">
        <div className="space-y-2 text-sm">
          {rows.map((r, i) => (
            <div key={i} className="flex items-center justify-between">
              <span className="text-slate-500">{r.ref}</span>
              <Money value={r.amt} className={r.amt < 0 ? "text-slate-500" : "font-medium text-slate-800"} />
            </div>
          ))}
          <div className="my-3 border-t border-slate-200" />
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-800">Net vehicle profit</span>
            <Money value={profit} className="text-lg font-bold text-emerald-600" />
          </div>
        </div>
        <div className="mt-4 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">Each owned vehicle is its own profit-and-loss centre. Append-only — fully auditable.</div>
      </div>
    </Modal>
  );
}

export default function Fleet() {
  const [drill, setDrill] = useState<any>(null);
  return (
    <div>
      <SectionTitle sub="Each owned vehicle is a mini profit-and-loss centre. Click a card to open its ledger.">Fleet · Vehicle Cost Centres</SectionTitle>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {VEHICLES.map((v) => {
          const cost = v.fuel + v.driver + v.maint + v.emi + v.toll;
          const profit = v.revenue - cost;
          const margin = ((profit / v.revenue) * 100).toFixed(0);
          const good = profit > 50000;
          return (
            <Card key={v.id} className="cursor-pointer overflow-hidden transition hover:ring-slate-300" >
              <button onClick={() => setDrill(v)} className="w-full text-left">
                <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/60 px-5 py-3">
                  <div className="flex items-center gap-2"><Truck size={16} className="text-slate-400" /><span className="font-mono text-sm font-semibold text-slate-800">{v.id}</span></div>
                  <Pill tone="slate">{v.type}</Pill>
                </div>
                <div className="p-5">
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs text-slate-400">Net profit</span>
                    <span className={`flex items-center gap-1 text-xl font-bold ${good ? "text-emerald-600" : "text-amber-600"}`}>
                      {good ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}<Money value={profit} />
                    </span>
                  </div>
                  <div className="mt-1 text-right text-xs text-slate-400">{margin}% margin</div>
                  <div className="mt-4 space-y-1.5 text-sm">
                    <CostRow k="Revenue" v={v.revenue} bold />
                    <CostRow k="Fuel" v={-v.fuel} />
                    <CostRow k="Driver" v={-v.driver} />
                    <CostRow k="Maintenance" v={-v.maint} warn={v.maint > 50000} />
                    <CostRow k="Loan EMI" v={-v.emi} />
                    <CostRow k="Toll & misc" v={-v.toll} />
                  </div>
                  <div className="mt-3 text-center text-xs text-slate-400">Open ledger →</div>
                </div>
              </button>
            </Card>
          );
        })}
      </div>

      <SectionTitle sub="Track fuel — the single biggest operating cost. Anomalies flagged automatically.">{<span className="mt-8 inline-block">Daily Fuel Log</span>}</SectionTitle>
      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-slate-200 bg-slate-50/80 text-left text-xs uppercase tracking-wide text-slate-500">
            {["Vehicle", "Date · Location", "Litres", "Rate", "Cost", "Km/L", ""].map((h) => <th key={h} className="px-5 py-3 font-semibold">{h}</th>)}
          </tr></thead>
          <tbody>
            {FUEL.map((f, i) => (
              <tr key={i} className={`border-b border-slate-100 last:border-0 ${f.anomaly ? "bg-red-50/40" : "hover:bg-slate-50/50"}`}>
                <td className="px-5 py-3.5 font-mono text-xs text-slate-700">{f.vehicle}</td>
                <td className="px-5 py-3.5 text-slate-600">{f.date}<div className="text-xs text-slate-400">{f.loc}</div></td>
                <td className="px-5 py-3.5 font-mono text-slate-600">{f.litres} L</td>
                <td className="px-5 py-3.5 font-mono text-slate-600">₹{f.rate}</td>
                <td className="px-5 py-3.5"><Money value={Math.round(f.litres * f.rate)} className="font-semibold text-slate-800" /></td>
                <td className="px-5 py-3.5 font-mono text-slate-600">{f.kmpl}</td>
                <td className="px-5 py-3.5">{f.anomaly && <Pill tone="red"><AlertTriangle size={11} />Anomaly</Pill>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {drill && <VehicleLedger v={drill} onClose={() => setDrill(null)} />}
    </div>
  );
}
