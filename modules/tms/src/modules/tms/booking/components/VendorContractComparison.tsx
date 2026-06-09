import type { ReactNode } from "react";
import { Button } from "@/shared/components/ui/button";
import type { VendorComparisonEntry } from "@/modules/tms/booking/services/booking-selectors";

/**
 * Vendor Recommendation Engine UI — header summary + a cheapest-first table of
 * vendors whose contract matches the booking. Shared by the Assignment Queue and
 * the booking workspace Assign Vehicle dialog so both render the same engine.
 */
export function VendorContractComparison({
  entries,
  selectedVendorId,
  onSelect,
  showMargin = true,
  showCustomerFreight = true,
  actionLabel = "Select",
  mutedVendorIds = [],
  header,
  deliverySummarySlot,
}: {
  entries: VendorComparisonEntry[];
  selectedVendorId: string;
  onSelect: (vendorId: string) => void;
  showMargin?: boolean;
  showCustomerFreight?: boolean;
  /** Label for the per-row action button (e.g. "Send Indent"). */
  actionLabel?: string;
  /** Vendors to grey out (e.g. already rejected); their action reads "Resend". */
  mutedVendorIds?: string[];
  header: { route: string; customerFreight: number; vehicleType: string; material: string };
  /** Optional compact delivery summary rendered between the header block and the vendor table. */
  deliverySummarySlot?: ReactNode;
}) {
  const muted = new Set(mutedVendorIds);
  const money = (value: number) => `Rs ${Math.round(value).toLocaleString()}`;
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 rounded-xl border border-border/70 bg-muted/10 p-3 sm:grid-cols-5">
        <Summary label="Booking Route" value={header.route} />
        <Summary label="Customer Freight" value={money(header.customerFreight)} />
        <Summary label="Vehicle Type" value={header.vehicleType || "-"} />
        <Summary label="Material" value={header.material || "-"} />
        <Summary label="Matched Vendors" value={String(entries.length)} />
      </div>

      {deliverySummarySlot ?? null}

      {entries.length ? (
        <div className="overflow-x-auto rounded-xl border">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="bg-muted/20 text-left text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Vendor</th>
                <th className="px-3 py-2 font-medium">Rate Type</th>
                <th className="px-3 py-2 font-medium">Buying Rate</th>
                {showCustomerFreight ? <th className="px-3 py-2 font-medium">Customer Freight</th> : null}
                {showMargin ? <th className="px-3 py-2 font-medium">Margin</th> : null}
                <th className="px-3 py-2 font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/70">
              {entries.map((entry) => {
                const isMuted = muted.has(entry.vendorId);
                return (
                  <tr
                    key={entry.vendorId}
                    className={`${entry.vendorId === selectedVendorId ? "bg-primary/5" : ""} ${isMuted ? "opacity-50" : ""}`}
                  >
                    <td className="px-3 py-2 font-medium">
                      {entry.vendorName}
                      {isMuted ? <span className="ml-2 text-[11px] font-normal text-rose-600">Rejected</span> : null}
                    </td>
                    <td className="px-3 py-2">{entry.rateType === "PER_MT" ? "Per MT" : entry.rateType === "PER_KM" ? "Per KM" : "Per Trip"}</td>
                    <td className="px-3 py-2">{money(entry.vendorFreight)}</td>
                    {showCustomerFreight ? <td className="px-3 py-2">{money(entry.customerFreight)}</td> : null}
                    {showMargin ? (
                      <td className="px-3 py-2">
                        {money(entry.marginAmount)} ({entry.marginPercent}%)
                      </td>
                    ) : null}
                    <td className="px-3 py-2">
                      {entry.vendorId === selectedVendorId ? (
                        <Button size="sm" onClick={() => undefined}>Selected</Button>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => onSelect(entry.vendorId)}>
                          {isMuted ? "Resend" : actionLabel}
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          No vendor contract found for this booking. Switch to Manual Assignment.
        </div>
      )}
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}
