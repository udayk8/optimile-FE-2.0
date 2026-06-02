import React, { useMemo, useState } from "react";
import { Download, AlertTriangle, Fuel as FuelIcon } from "lucide-react";
import { Card, Pill, Money, SectionTitle, Btn } from "@finance/components/primitives";
import { exportCsv } from "@finance/lib/csv";
import { FUEL, VEHICLES } from "@finance/data/mock";

/* BRD 8.4 — Daily Fuel Expense Report (own fleet).
   Per-fill cost + efficiency, with anomaly flagged when km/L deviates >15% from
   the vehicle's 30-day average. */

const typeOf = (vehicle: string) => VEHICLES.find((v) => v.id === vehicle)?.type ?? "—";
const deviation = (f: any) => (f.avg30Kmpl ? ((f.kmpl - f.avg30Kmpl) / f.avg30Kmpl) * 100 : 0);

export default function FuelReport({ toast }: any) {
  const [vehicle, setVehicle] = useState("all");
  const [anomalyOnly, setAnomalyOnly] = useState(false);

  const vehicles = useMemo(() => [...new Set(FUEL.map((f) => f.vehicle))], []);
  const rows = FUEL.filter((f) => (vehicle === "all" || f.vehicle === vehicle) && (!anomalyOnly || f.anomaly));

  const totalCost = rows.reduce((s, f) => s + Math.round(f.litres * f.rate), 0);
  const totalLitres = rows.reduce((s, f) => s + f.litres, 0);
  const anomalies = rows.filter((f) => f.anomaly).length;

  const COLUMNS = [
    { key: "vehicle", label: "Vehicle" },
    { label: "Type", value: (f: any) => typeOf(f.vehicle) },
    { key: "driver", label: "Driver", value: (f: any) => f.driver ?? "" },
    { key: "date", label: "Fill Date" },
    { key: "loc", label: "Location" },
    { key: "litres", label: "Litres" },
    { key: "rate", label: "Rate/L" },
    { label: "Total Cost", value: (f: any) => Math.round(f.litres * f.rate) },
    { key: "odoStart", label: "Odometer Before" },
    { key: "odoEnd", label: "Odometer After" },
    { key: "kmCovered", label: "Km Covered" },
    { key: "kmpl", label: "Km/L" },
    { label: "Anomaly", value: (f: any) => (f.anomaly ? "Yes" : "No") },
  ];
  const download = () => { exportCsv("daily-fuel-report.csv", COLUMNS, rows); toast(`Downloaded daily-fuel-report.csv (${rows.length} fills)`); };

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <SectionTitle sub="Fuel is the single biggest operating cost. Each fill's cost and efficiency — anomalies flagged when km/L drops >15% below the vehicle's 30-day average.">Daily Fuel Expense Report</SectionTitle>
        <Btn className="px-4 py-2" onClick={download}><Download size={15} />Export to Excel (CSV)</Btn>
      </div>

      <div className="mb-6 grid grid-cols-3 gap-4">
        <Card className="p-4"><div className="text-xs text-slate-500">Total fuel cost</div><div className="mt-1 text-2xl font-bold text-slate-800"><Money value={totalCost} /></div></Card>
        <Card className="p-4"><div className="text-xs text-slate-500">Litres filled</div><div className="mt-1 text-2xl font-bold text-slate-800">{totalLitres} L</div></Card>
        <Card className="p-4"><div className="text-xs text-slate-500">Anomalies</div><div className={`mt-1 text-2xl font-bold ${anomalies ? "text-red-600" : "text-emerald-600"}`}>{anomalies}</div></Card>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <select value={vehicle} onChange={(e) => setVehicle(e.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 outline-none focus:border-slate-300">
          <option value="all">All vehicles</option>
          {vehicles.map((v) => <option key={v} value={v}>{v}</option>)}
        </select>
        <label className="flex items-center gap-2 text-xs text-slate-500"><input type="checkbox" checked={anomalyOnly} onChange={(e) => setAnomalyOnly(e.target.checked)} className="h-4 w-4 rounded border-slate-300" />Anomalies only</label>
      </div>

      <Card className="overflow-x-auto">
        <table className="w-full min-w-[920px] text-sm">
          <thead><tr className="border-b border-slate-200 bg-slate-50/80 text-left text-xs uppercase tracking-wide text-slate-500">
            {["Vehicle", "Driver", "Date · Location", "Litres", "Rate", "Cost", "Odometer", "Km", "Km/L", "Anomaly"].map((h, i) => <th key={i} className="px-4 py-3 font-semibold">{h}</th>)}
          </tr></thead>
          <tbody>
            {rows.map((f, i) => {
              const dev = deviation(f);
              return (
                <tr key={i} className={`border-b border-slate-100 last:border-0 ${f.anomaly ? "bg-red-50/40" : "hover:bg-slate-50/50"}`}>
                  <td className="px-4 py-3 font-mono text-xs text-slate-700">{f.vehicle}<div className="text-slate-400">{typeOf(f.vehicle)}</div></td>
                  <td className="px-4 py-3 text-slate-600">{(f as any).driver ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-600">{f.date}<div className="text-xs text-slate-400">{f.loc}</div></td>
                  <td className="px-4 py-3 font-mono text-slate-600">{f.litres} L</td>
                  <td className="px-4 py-3 font-mono text-slate-600">₹{f.rate}</td>
                  <td className="px-4 py-3"><Money value={Math.round(f.litres * f.rate)} className="font-semibold text-slate-800" /></td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">{(f as any).odoStart?.toLocaleString("en-IN")} → {(f as any).odoEnd?.toLocaleString("en-IN")}</td>
                  <td className="px-4 py-3 font-mono text-slate-600">{(f as any).kmCovered} km</td>
                  <td className="px-4 py-3 font-mono text-slate-600">{f.kmpl}<div className="text-[11px] text-slate-400">avg {(f as any).avg30Kmpl}</div></td>
                  <td className="px-4 py-3">{f.anomaly
                    ? <Pill tone="red"><AlertTriangle size={11} />{dev.toFixed(0)}% vs avg</Pill>
                    : <span className="inline-flex items-center gap-1 text-xs text-emerald-600"><FuelIcon size={11} />Normal</span>}</td>
                </tr>
              );
            })}
            {rows.length === 0 && <tr><td colSpan={10} className="px-5 py-12 text-center text-slate-400">No fuel fills match the current filter.</td></tr>}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
