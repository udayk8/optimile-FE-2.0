import { TrendingUp } from "lucide-react";
import { Card, Money, Pill } from "@finance/components/primitives";

/**
 * 3PL profit headline for an invoice / vendor bill: what was billed to the
 * customer (selling), what is paid to the vendor (buying) and the margin
 * between them. Renders nothing unless both sides are known (i.e. a vendor is
 * assigned) — keeps half-computed rows off the operational views.
 */
export default function MarginSummary({
  selling,
  buying,
  margin,
}: {
  selling?: number;
  buying?: number;
  margin?: number;
}) {
  if (selling == null || buying == null || margin == null) return null;
  const pct = selling > 0 ? (margin / selling) * 100 : 0;
  const tone = pct < 0 ? "red" : pct < 15 ? "amber" : "green";
  return (
    <Card className="mb-6 p-5">
      <div className="mb-3 flex items-center gap-2 font-semibold text-slate-800">
        <TrendingUp size={16} className="text-slate-400" />
        3PL profit
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <div className="text-[10px] uppercase tracking-wide text-slate-400">Selling (customer)</div>
          <div className="mt-0.5"><Money value={selling} /></div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wide text-slate-400">Buying (vendor)</div>
          <div className="mt-0.5"><Money value={buying} className="text-slate-500" /></div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wide text-slate-400">Margin</div>
          <div className="mt-0.5 flex items-center gap-2">
            <Money value={margin} className={`font-semibold ${margin < 0 ? "text-red-600" : "text-emerald-600"}`} />
            <Pill tone={tone}>{pct.toFixed(1)}%</Pill>
          </div>
        </div>
      </div>
    </Card>
  );
}
