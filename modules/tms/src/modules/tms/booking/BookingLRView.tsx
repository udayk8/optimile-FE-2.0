import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { PageHeader } from "../../../components/common/page-header";
import { TenantEmptyState, TenantPanel, TenantSummaryCard } from "../../../components/tenant/tenant-primitives";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Select } from "../../../components/ui/select";
import { useTenantRouteContext } from "../../../hooks/useTenantRouteContext";
import { useBookingPaths } from "../../../hooks/useBookingPaths";
import { useBookingAdminSources } from "./hooks/useBookingAdminSources";
import { useTenantBookings } from "./hooks/useTenantBookings";
import { normalizeBookingId } from "./services/booking-engine";
import {
  ensureShipmentDocuments,
  getDeliveryActualQuantity,
  getDeliveryActualWeight,
  sumDeliveryInvoiceTotals,
} from "./services/shipment-documents";
import {
  buildAddressLookup,
  buildCustomerLookup,
  buildDriverLookup,
  buildMaterialLookup,
  buildVehicleLookup,
} from "./services/booking-selectors";

export function BookingLRViewPage() {
  const { bookingId } = useParams();
  const { tenant } = useTenantRouteContext();
  const paths = useBookingPaths();
  const { getBookingById, updateBooking } = useTenantBookings(tenant.id);
  const adminSources = useBookingAdminSources(tenant.id);

  const booking = bookingId ? getBookingById(normalizeBookingId(bookingId)) : null;
  const customerMap = useMemo(() => buildCustomerLookup(adminSources.customers), [adminSources.customers]);
  const addressMap = useMemo(
    () => buildAddressLookup(Array.from(adminSources.customerAddressMap.values()).flat()),
    [adminSources.customerAddressMap],
  );
  const driverMap = useMemo(() => buildDriverLookup(adminSources.drivers), [adminSources.drivers]);
  const vehicleMap = useMemo(() => buildVehicleLookup(adminSources.vehicles), [adminSources.vehicles]);
  const materialMap = useMemo(() => buildMaterialLookup(adminSources.materials), [adminSources.materials]);

  if (!booking) {
    return (
      <TenantEmptyState
        title="LR not found"
        description="The selected booking or LR record is unavailable."
        action={
          <Button asChild>
            <Link to={paths.bookings}>Back to bookings</Link>
          </Button>
        }
      />
    );
  }

  const bookingRecord = booking;
  const shipmentDocuments = ensureShipmentDocuments(bookingRecord);
  const customer = customerMap.get(bookingRecord.customerId) ?? null;
  const source = addressMap.get(bookingRecord.sourceAddressId) ?? null;
  const destination = addressMap.get(bookingRecord.destinationAddressId) ?? null;
  const driver = bookingRecord.assignment?.driverId ? driverMap.get(bookingRecord.assignment.driverId) ?? null : null;
  const vehicle = bookingRecord.assignment?.vehicleId ? vehicleMap.get(bookingRecord.assignment.vehicleId) ?? null : null;
  const lr = shipmentDocuments.lr;

  const invoiceNumbers = shipmentDocuments.deliveries.flatMap((delivery) =>
    delivery.invoices.map((invoice) => invoice.invoiceNumber).filter(Boolean),
  );
  const ewayNumbers = shipmentDocuments.deliveries
    .map((delivery) => delivery.ewayBill?.ewayBillNumber ?? "")
    .filter(Boolean);
  const shipmentSummary = shipmentDocuments.deliveries.reduce(
    (summary, delivery) => {
      const invoiceTotals = sumDeliveryInvoiceTotals(delivery);
      return {
        invoiceValue: summary.invoiceValue + invoiceTotals.invoiceValue,
        quantity: summary.quantity + getDeliveryActualQuantity(delivery),
        weight: summary.weight + getDeliveryActualWeight(delivery),
        materials: [
          ...summary.materials,
          delivery.actuals.material || delivery.invoices[0]?.material || materialMap.get(
          bookingRecord.deliveries?.find((item) => item.id === delivery.deliveryId)?.materialId ?? "",
          )?.materialCode || "Material",
        ],
      };
    },
    { invoiceValue: 0, quantity: 0, weight: 0, materials: [] as string[] },
  );
  const uniqueMaterials = Array.from(new Set(shipmentSummary.materials.filter(Boolean)));
  const extraCharges = lr?.extraCharges ?? 0;
  const advance = lr?.advance ?? 0;
  const freightRate = shipmentDocuments.totalFreightRate ?? bookingRecord.pricing.calculatedFreight;
  const totalDue = Math.max(freightRate + extraCharges - advance, 0);

  function updateLRField(updates: {
    viewMode?: "COMBINED" | "ROW_WISE";
    extraCharges?: number;
    advance?: number;
  }) {
    if (!lr) {
      return;
    }
    updateBooking(bookingRecord.id, {
      shipmentDocuments: {
        ...shipmentDocuments,
        lr: {
          ...lr,
          viewMode: updates.viewMode ?? lr.viewMode,
          extraCharges: updates.extraCharges ?? lr.extraCharges,
          advance: updates.advance ?? lr.advance,
        },
      },
    });
  }

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="TMS"
        title={lr?.number ?? "LR Preview"}
        description={`Printable LR view for booking ${bookingRecord.bookingId}.`}
        action={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link to={paths.booking(bookingRecord.id)}>Back to booking</Link>
            </Button>
            <Button variant="outline" onClick={() => window.print()}>
              Print LR
            </Button>
          </div>
        }
      />

      <div className="grid gap-3 md:grid-cols-4">
        <TenantSummaryCard label="Booking" value={bookingRecord.bookingId} helper="Source transaction" />
        <TenantSummaryCard label="LR Date" value={lr?.generatedAt?.slice(0, 10) ?? bookingRecord.updatedAt.slice(0, 10)} helper="Generation date" />
        <TenantSummaryCard label="Vehicle" value={vehicle?.registrationNumber ?? booking.assignment?.vehicleLabel ?? "-"} helper="Assigned vehicle" />
        <TenantSummaryCard label="Total Due" value={`Rs ${totalDue.toLocaleString()}`} helper="Freight + extras - advance" />
      </div>

      <TenantPanel title="LR Configuration" description="Preview can be combined or row-wise.">
        <div className="grid gap-3 md:grid-cols-3">
          <label className="space-y-1.5">
            <span className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">Summary mode</span>
            <Select
              value={lr?.viewMode ?? "COMBINED"}
              onChange={(event) => updateLRField({ viewMode: event.target.value as "COMBINED" | "ROW_WISE" })}
              disabled={!lr}
            >
              <option value="COMBINED">Combined</option>
              <option value="ROW_WISE">Row Wise</option>
            </Select>
          </label>
          <label className="space-y-1.5">
            <span className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">Extra charges</span>
            <Input
              type="number"
              value={extraCharges}
              onChange={(event) => updateLRField({ extraCharges: Number(event.target.value) || 0 })}
              disabled={!lr}
            />
          </label>
          <label className="space-y-1.5">
            <span className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">Advance</span>
            <Input
              type="number"
              value={advance}
              onChange={(event) => updateLRField({ advance: Number(event.target.value) || 0 })}
              disabled={!lr}
            />
          </label>
        </div>
      </TenantPanel>

      <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <TenantPanel title="Header" description="Core LR header fields from booking assignment and document submission.">
          <div className="grid gap-3 md:grid-cols-2">
            <DetailRow label="LR Number" value={lr?.number ?? "-"} />
            <DetailRow label="Booking ID" value={bookingRecord.bookingId} />
            <DetailRow label="Date" value={lr?.generatedAt ? new Date(lr.generatedAt).toLocaleDateString() : "-"} />
            <DetailRow label="Vehicle Number" value={vehicle?.registrationNumber ?? bookingRecord.assignment?.vehicleLabel ?? "-"} />
            <DetailRow label="Driver Name" value={driver?.name ?? bookingRecord.assignment?.driverName ?? "-"} />
            <DetailRow label="Mobile Number" value={driver?.phone ?? "-"} />
          </div>
        </TenantPanel>

        <TenantPanel title="Parties & Documents" description="Consignor, consignee, invoice numbers, and e-way bill numbers.">
          <div className="grid gap-3 md:grid-cols-2">
            <DetailRow label="Consignor" value={source?.addressName ?? "-"} />
            <DetailRow label="Consignee" value={destination?.addressName ?? "-"} />
            <DetailRow label="Customer" value={customer?.name ?? "-"} />
            <DetailRow label="Invoice Number(s)" value={invoiceNumbers.join(", ") || "-"} />
            <DetailRow label="E-Way Bill Number(s)" value={ewayNumbers.join(", ") || "-"} />
          </div>
        </TenantPanel>
      </div>

      <TenantPanel title="Shipment Summary" description="Derived from saved invoice and actual shipment details.">
        {lr?.viewMode === "ROW_WISE" ? (
          <div className="space-y-3">
            {shipmentDocuments.deliveries.map((delivery) => {
              const deliveryRecord = bookingRecord.deliveries?.find((item) => item.id === delivery.deliveryId);
              const deliveryDestination = addressMap.get(deliveryRecord?.destinationAddressId ?? "");
              const invoiceTotals = sumDeliveryInvoiceTotals(delivery);
              return (
                <div key={delivery.deliveryId} className="rounded-xl border border-gray-200 bg-white p-4">
                  <div className="grid gap-3 md:grid-cols-5">
                    <DetailRow label="Delivery" value={deliveryRecord?.trackingId ?? delivery.deliveryId} />
                    <DetailRow label="Destination" value={deliveryDestination?.addressName ?? "-"} />
                    <DetailRow label="Material" value={delivery.actuals.material || delivery.invoices[0]?.material || "-"} />
                    <DetailRow label="Quantity" value={`${getDeliveryActualQuantity(delivery)} ${delivery.actuals.quantityUOM ?? delivery.invoices[0]?.quantityUOM ?? ""}`.trim()} />
                    <DetailRow label="Weight" value={`${getDeliveryActualWeight(delivery)} ${delivery.actuals.weightUOM ?? delivery.invoices[0]?.weightUOM ?? ""}`.trim()} />
                    <DetailRow label="Invoice Value" value={`Rs ${invoiceTotals.invoiceValue.toLocaleString()}`} />
                    <DetailRow label="Invoices" value={delivery.invoices.map((invoice) => invoice.invoiceNumber).join(", ") || "-"} />
                    <DetailRow label="E-Way Bill" value={delivery.ewayBill?.ewayBillNumber ?? "-"} />
                    <DetailRow label="Freight" value={delivery.freightRate != null ? `Rs ${delivery.freightRate.toLocaleString()}` : "-"} />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-4">
            <DetailRow label="Total Packages" value={String(shipmentDocuments.deliveries.length)} />
            <DetailRow label="Material" value={uniqueMaterials.join(", ") || "-"} />
            <DetailRow label="Total Quantity" value={String(shipmentSummary.quantity)} />
            <DetailRow label="Total Weight" value={`${shipmentSummary.weight} MT`} />
            <DetailRow label="Total Invoice Value" value={`Rs ${shipmentSummary.invoiceValue.toLocaleString()}`} />
          </div>
        )}
      </TenantPanel>

      <TenantPanel title="Freight" description="Booking freight summary after document-stage recalculation.">
        <div className="grid gap-3 md:grid-cols-4">
          <DetailRow label="Freight Rate" value={`Rs ${freightRate.toLocaleString()}`} />
          <DetailRow label="Extra Charges" value={`Rs ${extraCharges.toLocaleString()}`} />
          <DetailRow label="Advance" value={`Rs ${advance.toLocaleString()}`} />
          <DetailRow label="Total Due" value={`Rs ${totalDue.toLocaleString()}`} />
        </div>
      </TenantPanel>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/55 bg-white/75 px-3 py-3">
      <p className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-medium">{value}</p>
    </div>
  );
}
