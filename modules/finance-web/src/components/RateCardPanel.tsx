import { FileText } from "lucide-react";
import { Card, Pill } from "@finance/components/primitives";
import { fmtINR } from "@finance/lib/format";
import type { RateCardDescriptor } from "@finance/integration/finance-data-bridge";

const RATE_UNIT_LABEL: Record<RateCardDescriptor["rateType"], string> = {
  PER_TRIP: "per trip",
  PER_KM: "per km",
  PER_MT: "per MT",
};

const Cell = ({ k, v }: { k: string; v: React.ReactNode }) => (
  <div className="min-w-0">
    <div className="text-[10px] uppercase tracking-wide text-slate-400">{k}</div>
    <div className="mt-0.5 truncate text-sm text-slate-700">{v}</div>
  </div>
);

/**
 * Transparency panel for the contracted/awarded rate behind an invoice or vendor
 * bill — the source of the 3-way-match `Contract` baseline. Shown for contract /
 * spot bookings; renders nothing when no rate card was resolved.
 */
export default function RateCardPanel({
  rateCard,
  commercialType,
}: {
  rateCard?: RateCardDescriptor;
  commercialType?: "SPOT" | "CONTRACT";
}) {
  if (!rateCard) return null;
  const isSpot = rateCard.source === "SPOT";
  const validity =
    rateCard.validFrom || rateCard.validTo
      ? `${rateCard.validFrom ?? "—"} → ${rateCard.validTo ?? "—"}`
      : "—";
  // Auction-win provenance (AP/vendor side) — the contract the vendor *won*.
  const awarded = Boolean(rateCard.awarded);
  const rankLabel = rateCard.allocationRank
    ? `${rateCard.allocationRank}${rateCard.volumeAllocationPercent != null ? ` · ${rateCard.volumeAllocationPercent}%` : ""}`
    : null;
  const title = awarded ? "Awarded contract (auction)" : isSpot ? "Spot contract" : "Contract rate card";
  return (
    <Card className="mb-6 p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 font-semibold text-slate-800">
          <FileText size={16} className="text-slate-400" />
          {title}
        </div>
        <div className="flex items-center gap-2">
          {awarded && (
            <Pill tone="violet">
              Won via auction{rateCard.sourceAuctionId ? ` ${rateCard.sourceAuctionId}` : ""}
            </Pill>
          )}
          <Pill tone={isSpot ? "amber" : "blue"}>
            {isSpot ? "Spot" : commercialType === "CONTRACT" ? "Standing contract" : "Contract"}
          </Pill>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <Cell k={isSpot || awarded ? "Contract ID" : "Rate card"} v={<span className="font-mono">{rateCard.rateCardId ?? "—"}</span>} />
        <Cell k="Lane" v={rateCard.lane} />
        <Cell k="Vehicle" v={rateCard.vehicleType ?? "—"} />
        <Cell
          k={awarded ? "Awarded rate" : "Contracted rate"}
          v={<span className="font-mono">{fmtINR(rateCard.rate)} <span className="text-slate-400">{RATE_UNIT_LABEL[rateCard.rateType]}</span></span>}
        />
        {rankLabel && <Cell k="Allocation" v={<span className="font-mono">{rankLabel}</span>} />}
        <Cell k="Validity" v={<span className="font-mono text-xs">{validity}</span>} />
      </div>
    </Card>
  );
}
