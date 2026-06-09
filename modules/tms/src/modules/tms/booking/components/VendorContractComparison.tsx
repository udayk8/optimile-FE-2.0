import type { ReactNode } from "react";
import { Fragment, useState } from "react";
import { Button } from "@/shared/components/ui/button";
import type { VendorComparisonEntry } from "@/modules/tms/booking/services/booking-selectors";

/**
 * Vendor Recommendation Engine UI — header summary + a cheapest-first table of
 * vendors whose contract matches the booking. Shared by the Assignment Queue and
 * the booking workspace Assign Vehicle dialog so both render the same engine.
 *
 * When `enableRemark` is on (send-indent flow): the lowest-rate (L1) vendors can
 * be sent with one click (remark optional); every higher-rate vendor's Send
 * button stays disabled until a remark is added through the inline Remark
 * toggle (no modal). The captured remark is passed back through onSelect.
 */
export function VendorContractComparison({
  entries,
  selectedRateCardId,
  recommendedRateCardIds = [],
  onSelect,
  showMargin = true,
  showCustomerFreight = true,
  actionLabel = "Select",
  mutedVendorIds = [],
  enableRemark = false,
  header,
  deliverySummarySlot,
}: {
  entries: VendorComparisonEntry[];
  selectedRateCardId: string | null;
  /** Lowest-rate (L1) contract(s) — highlighted + badged as the default pick.
   *  More than one when vendors tie at the best rate. Action stays enabled
   *  (unlike selectedRateCardId's no-op). */
  recommendedRateCardIds?: string[];
  onSelect: (vendorId: string, rateCardId: string, remark?: string) => void;
  showMargin?: boolean;
  showCustomerFreight?: boolean;
  /** Label for the per-row action button (e.g. "Send Indent"). */
  actionLabel?: string;
  /** Vendors to grey out (e.g. already rejected); their action reads "Resend". */
  mutedVendorIds?: string[];
  /** Enables the inline per-row remark editor + the L1-only no-remark rule. */
  enableRemark?: boolean;
  header: { route: string; customerFreight: number; vehicleType: string; material: string };
  /** Optional compact delivery summary rendered between the header block and the vendor table. */
  deliverySummarySlot?: ReactNode;
}) {
  const muted = new Set(mutedVendorIds);
  const recommended = new Set(recommendedRateCardIds);
  const money = (value: number) => `Rs ${Math.round(value).toLocaleString()}`;

  // Inline remark state, keyed by rate card row. `remarkByRow` is the live draft
  // being typed; `savedRemarkByRow` is the committed remark (only a SAVED remark
  // counts — typing alone does not enable Send Indent for higher-rate vendors).
  const [remarkByRow, setRemarkByRow] = useState<Record<string, string>>({});
  const [savedRemarkByRow, setSavedRemarkByRow] = useState<Record<string, string>>({});
  const [openRow, setOpenRow] = useState<string | null>(null);

  // Vendor, Source, Volume, Est. Trips, Trips Left, Rate Type, Buying Rate,
  // [Customer Freight], [Margin], Action.
  const colCount = 8 + (showCustomerFreight ? 1 : 0) + (showMargin ? 1 : 0);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 rounded-xl border border-border/70 bg-muted/10 p-3 sm:grid-cols-5">
        <Summary label="Booking Route" value={header.route} />
        <Summary label="Customer Freight" value={money(header.customerFreight)} />
        <Summary label="Vehicle Type" value={header.vehicleType || "-"} />
        <Summary label="Material" value={header.material || "-"} />
        <Summary label="Matched Contracts" value={String(entries.length)} />
      </div>

      {deliverySummarySlot ?? null}

      {entries.length ? (
        <div className="overflow-x-auto rounded-xl border">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="bg-muted/20 text-left text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Vendor</th>
                <th className="px-3 py-2 font-medium">Source</th>
                <th className="px-3 py-2 font-medium">Volume</th>
                <th className="px-3 py-2 font-medium">Est. Trips</th>
                <th className="px-3 py-2 font-medium">Trips Left</th>
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
                const isRecommended = recommended.has(entry.rateCardId);
                const savedRemark = savedRemarkByRow[entry.rateCardId] ?? "";
                const hasRemark = savedRemark.trim().length > 0;
                // Draft seeds from the saved remark when editing.
                const draft = remarkByRow[entry.rateCardId] ?? savedRemark;
                // L1 rows: remark optional → always sendable. Others: need a SAVED
                // remark (typing alone is not enough — they must click Save).
                const sendDisabled = enableRemark && !isRecommended && !hasRemark;
                const isOpen = openRow === entry.rateCardId;
                return (
                  <Fragment key={entry.rateCardId}>
                    <tr
                      className={`${entry.rateCardId === selectedRateCardId || isRecommended ? "bg-primary/5" : ""} ${isMuted ? "opacity-50" : ""}`}
                    >
                      <td className="px-3 py-2 font-medium">
                        {entry.vendorName}
                        {isRecommended ? <span className="ml-2 inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">L1 · Lowest</span> : null}
                        {isMuted ? <span className="ml-2 text-[11px] font-normal text-rose-600">Rejected</span> : null}
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                            entry.source === "Auction" ? "bg-indigo-50 text-indigo-700" : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {entry.source}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        {entry.volumeAllocationPercent != null ? `${entry.volumeAllocationPercent}%` : "—"}
                        {entry.allocationRank ? <span className="ml-1 text-[11px] text-muted-foreground">({entry.allocationRank})</span> : null}
                      </td>
                      <td className="px-3 py-2">{entry.estimatedTrips ?? "—"}</td>
                      <td className="px-3 py-2">{entry.tripsRemaining ?? "—"}</td>
                      <td className="px-3 py-2">{entry.rateType === "PER_MT" ? "Per MT" : entry.rateType === "PER_KM" ? "Per KM" : "Per Trip"}</td>
                      <td className="px-3 py-2">{money(entry.vendorFreight)}</td>
                      {showCustomerFreight ? <td className="px-3 py-2">{money(entry.customerFreight)}</td> : null}
                      {showMargin ? (
                        <td className="px-3 py-2">
                          {money(entry.marginAmount)} ({entry.marginPercent}%)
                        </td>
                      ) : null}
                      <td className="px-3 py-2">
                        {entry.rateCardId === selectedRateCardId ? (
                          <Button size="sm" onClick={() => undefined}>Selected</Button>
                        ) : (
                          <div className="flex items-center gap-2">
                            {enableRemark ? (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  // Seed the draft from the saved remark when opening.
                                  setRemarkByRow((current) => ({ ...current, [entry.rateCardId]: current[entry.rateCardId] ?? savedRemark }))
                                  setOpenRow(isOpen ? null : entry.rateCardId)
                                }}
                              >
                                {hasRemark ? "View Remark" : "Add Remark"}
                              </Button>
                            ) : null}
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={sendDisabled}
                              title={sendDisabled ? "Add and save a remark to send the indent to this higher-rate vendor" : undefined}
                              onClick={() => onSelect(entry.vendorId, entry.rateCardId, savedRemark.trim() || undefined)}
                            >
                              {isMuted ? "Resend" : actionLabel}
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                    {enableRemark && isOpen ? (
                      <tr className="bg-muted/10">
                        <td colSpan={colCount} className="px-3 py-3">
                          <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                            Remark{isRecommended ? " (optional)" : " (required for higher-rate vendor)"}
                          </label>
                          <textarea
                            value={draft}
                            onChange={(event) =>
                              setRemarkByRow((current) => ({ ...current, [entry.rateCardId]: event.target.value }))
                            }
                            rows={2}
                            autoFocus
                            placeholder={
                              isRecommended
                                ? "Optional note for this indent…"
                                : "Why send the indent to this vendor instead of the lowest-rate (L1) contract?"
                            }
                            className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                          />
                          <div className="mt-2 flex items-center justify-end gap-2">
                            {hasRemark ? <span className="mr-auto text-[11px] font-medium text-emerald-600">Saved</span> : null}
                            <Button size="sm" variant="ghost" onClick={() => { setRemarkByRow((current) => ({ ...current, [entry.rateCardId]: savedRemark })); setOpenRow(null) }}>
                              Cancel
                            </Button>
                            <Button
                              size="sm"
                              disabled={draft.trim().length === 0}
                              onClick={() => {
                                setSavedRemarkByRow((current) => ({ ...current, [entry.rateCardId]: draft.trim() }))
                                setOpenRow(null)
                              }}
                            >
                              Save Remark
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          No matching vendor contract for this booking lane and rate type. Switch to Manual Assignment.
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
