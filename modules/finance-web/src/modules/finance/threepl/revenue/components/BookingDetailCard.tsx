import React from "react";
import { Package, Truck, ReceiptIndianRupee, type LucideIcon } from "lucide-react";
import { Card, Money } from "@finance/components/primitives";
import type { ARTrip } from "@finance/lib/receivablesStore";

/* Compact label/value cell — no per-field border/background, so a full booking
   fits in a few rows instead of a tall stack. `wide` spans the section width. */
function Field({ label, value, wide }: { label: string; value: React.ReactNode; wide?: boolean }) {
  return (
    <div className={wide ? "col-span-2" : ""}>
      <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</div>
      <div className="mt-0.5 text-sm font-medium text-slate-800 break-words">{value ?? "—"}</div>
    </div>
  );
}

function Section({ icon: Icon, title, children }: { icon: LucideIcon; title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
        <Icon size={14} className="text-slate-400" />{title}
      </div>
      <div className="grid grid-cols-2 gap-x-5 gap-y-2.5">{children}</div>
    </div>
  );
}

const RATE_TYPE_LABEL: Record<string, string> = {
  PER_TRIP: "Per trip", PER_KM: "Per km", PER_MT: "Per MT",
};

/* Full booking/trip detail for the finance team — mirrors the booking workspace
   Overview but in a compact density grid. Every field guards for missing data.
   `bare` drops the outer Card so it nests inside a collapsible disclosure. */
export default function BookingDetailCard({ trip, bare = false }: { trip: ARTrip; bare?: boolean }) {
  const [origin, destination] = (trip.lane ?? "").split("→").map((s) => s.trim());
  const qtyWeight = [
    trip.qty != null ? `${trip.qty}${trip.uom ? ` ${trip.uom}` : ""}` : null,
    trip.weight != null ? `${trip.weight}${trip.weightUom ? ` ${trip.weightUom}` : ""}` : null,
  ].filter(Boolean).join(" / ") || null;

  const body = (
    <div className="grid gap-x-8 gap-y-5 md:grid-cols-3">
      <Section icon={Package} title="Booking">
        <Field label="Booking No" value={trip.bookingId ?? trip.id} />
        <Field label="Customer" value={trip.client} />
        <Field label="Lane" wide value={origin && destination ? `${origin} → ${destination}` : trip.lane} />
        <Field label="Pickup" wide value={trip.pickupAddress ?? origin} />
        <Field label="Drop" wide value={trip.dropAddress ?? destination} />
        <Field label="Consignee" value={trip.consigneeName ?? trip.consignee} />
        <Field label="Qty / Weight" value={qtyWeight} />
        <Field label="Commodity" value={trip.commodity} />
      </Section>

      <Section icon={Truck} title="Vehicle & Vendor">
        <Field label="Vehicle" value={(trip as any).vehicle ?? trip.truck} />
        <Field label="Driver" value={trip.driver} />
        <Field label="Vendor" wide value={trip.vendor} />
        <Field label="Delivered" value={trip.delivered} />
      </Section>

      <Section icon={ReceiptIndianRupee} title="Commercial">
        <Field label="Commercial Type" value={trip.commercialType} />
        <Field label="Rate Type" value={trip.rateType ? (RATE_TYPE_LABEL[trip.rateType] ?? trip.rateType) : null} />
        <Field label="Selling Freight" value={<Money value={trip.revenue} />} />
        <Field label="Buying Freight" value={trip.buyingFreight != null ? <Money value={trip.buyingFreight} /> : null} />
        <Field label="Margin" value={trip.margin != null ? <Money value={trip.margin} /> : null} />
      </Section>
    </div>
  );

  return bare ? body : <Card className="p-4">{body}</Card>;
}
