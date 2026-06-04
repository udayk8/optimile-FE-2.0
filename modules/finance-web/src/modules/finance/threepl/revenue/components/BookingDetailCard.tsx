import React from "react";
import { Package, Truck, ReceiptIndianRupee } from "lucide-react";
import { Card, Money } from "@finance/components/primitives";
import type { ARTrip } from "@finance/lib/receivablesStore";

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50/60 px-3 py-2">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</div>
      <div className="mt-0.5 text-sm font-medium text-slate-800">{value ?? "—"}</div>
    </div>
  );
}

const RATE_TYPE_LABEL: Record<string, string> = {
  PER_TRIP: "Per trip", PER_KM: "Per km", PER_MT: "Per MT",
};

/* Full booking/trip detail for the finance team — mirrors the booking workspace
   Overview (booking · vehicle · commercial) so a biller sees everything behind
   the freight. Reads the ARTrip the bridge surfaces; every field guards for
   missing data so standalone/mock trips degrade gracefully. */
export default function BookingDetailCard({ trip }: { trip: ARTrip }) {
  const [origin, destination] = (trip.lane ?? "").split("→").map((s) => s.trim());
  const qtyWeight = [
    trip.qty != null ? `${trip.qty}${trip.uom ? ` ${trip.uom}` : ""}` : null,
    trip.weight != null ? `${trip.weight}${trip.weightUom ? ` ${trip.weightUom}` : ""}` : null,
  ].filter(Boolean).join(" / ") || null;

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <Card className="p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800">
          <Package size={15} className="text-slate-400" />Booking Information
        </div>
        <div className="grid grid-cols-1 gap-2">
          <Field label="Booking No" value={trip.bookingId ?? trip.id} />
          <Field label="Customer" value={trip.client} />
          <Field label="Lane" value={origin && destination ? `${origin} → ${destination}` : trip.lane} />
          <Field label="Pickup" value={trip.pickupAddress ?? origin} />
          <Field label="Drop" value={trip.dropAddress ?? destination} />
          <Field label="Consignee" value={trip.consigneeName ?? trip.consignee} />
          <Field label="Qty / Weight" value={qtyWeight} />
          <Field label="Commodity" value={trip.commodity} />
        </div>
      </Card>

      <Card className="p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800">
          <Truck size={15} className="text-slate-400" />Vehicle & Vendor
        </div>
        <div className="grid grid-cols-1 gap-2">
          <Field label="Vehicle" value={(trip as any).vehicle ?? trip.truck} />
          <Field label="Driver" value={trip.driver} />
          <Field label="Vendor" value={trip.vendor} />
          <Field label="Delivered" value={trip.delivered} />
        </div>
      </Card>

      <Card className="p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800">
          <ReceiptIndianRupee size={15} className="text-slate-400" />Commercial Information
        </div>
        <div className="grid grid-cols-1 gap-2">
          <Field label="Commercial Type" value={trip.commercialType} />
          <Field label="Rate Type" value={trip.rateType ? (RATE_TYPE_LABEL[trip.rateType] ?? trip.rateType) : null} />
          <Field label="Selling Freight" value={<Money value={trip.revenue} />} />
          <Field label="Buying Freight" value={trip.buyingFreight != null ? <Money value={trip.buyingFreight} /> : null} />
          <Field label="Margin" value={trip.margin != null ? <Money value={trip.margin} /> : null} />
        </div>
      </Card>
    </div>
  );
}
