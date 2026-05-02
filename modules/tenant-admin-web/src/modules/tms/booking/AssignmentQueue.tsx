import { useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { DataTable } from "../../../components/common/data-table";
import { PageHeader } from "../../../components/common/page-header";
import { TenantSummaryCard } from "../../../components/tenant/tenant-primitives";
import { Button } from "../../../components/ui/button";
import { Dialog } from "../../../components/ui/dialog";
import { Input } from "../../../components/ui/input";
import { Select } from "../../../components/ui/select";
import { useTenantRouteContext } from "../../../hooks/useTenantRouteContext";
import { BookingStatusBadge } from "./components/BookingStatusBadge";
import { useBookingAdminSources } from "./hooks/useBookingAdminSources";
import { useTenantBookings } from "./hooks/useTenantBookings";
import { calculateMarginPercent } from "./services/booking-engine";
import {
  buildCustomerLookup,
  buildVendorLookup,
  buildVehicleLookup,
} from "./services/booking-selectors";

const OWN_FLEET_VENDOR = "__OWN_FLEET__";

export function AssignmentQueuePage() {
  const { tenant } = useTenantRouteContext();
  const { data: bookings, assignBooking } = useTenantBookings(tenant.id);
  const adminSources = useBookingAdminSources(tenant.id);
  const customerMap = useMemo(() => buildCustomerLookup(adminSources.customers), [adminSources.customers]);
  const vehicleMap = useMemo(() => buildVehicleLookup(adminSources.vehicles), [adminSources.vehicles]);
  const vendorMap = useMemo(() => buildVendorLookup(adminSources.vendors), [adminSources.vendors]);
  const queue = bookings.filter((booking) => booking.status === "PENDING_ASSIGNMENT");
  const [assigningBookingId, setAssigningBookingId] = useState<string | null>(null);
  const [vendorId, setVendorId] = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const [driverId, setDriverId] = useState("");
  const [vendorFreight, setVendorFreight] = useState("");

  const assigningBooking = queue.find((booking) => booking.id === assigningBookingId) ?? null;
  const selectedVehicle = vehicleId ? vehicleMap.get(vehicleId) ?? null : null;
  const customerFreight = assigningBooking?.pricing.calculatedFreight ?? 0;
  const normalizedVendorId = vendorId === OWN_FLEET_VENDOR ? null : vendorId || null;
  const availableVehicles = adminSources.vehicles.filter((vehicle) => {
    if (!vehicle.isActive || !vendorId) {
      return false;
    }
    return vendorId === OWN_FLEET_VENDOR ? !vehicle.vendorId : vehicle.vendorId === vendorId;
  });
  const availableDrivers = adminSources.drivers.filter((driver) => {
    if (!driver.isActive || !vendorId || !selectedVehicle) {
      return false;
    }
    const driverVendorId = driver.vendorId ?? null;
    return vendorId === OWN_FLEET_VENDOR ? driverVendorId === null : driverVendorId === vendorId;
  });
  const marginPercent = calculateMarginPercent(customerFreight, Number(vendorFreight || 0));

  function resetDialog() {
    setAssigningBookingId(null);
    setVendorId("");
    setVehicleId("");
    setDriverId("");
    setVendorFreight("");
  }

  function submitAssignment() {
    const selectedDriver = adminSources.drivers.find((driver) => driver.id === driverId);
    if (!assigningBooking || !selectedVehicle || !selectedDriver || !vendorId || Number(vendorFreight) <= 0) {
      return;
    }

    assignBooking(assigningBooking.id, {
      vendorId: normalizedVendorId,
      vendorName: vendorId === OWN_FLEET_VENDOR ? "Own Fleet" : vendorMap.get(vendorId)?.name ?? "Vendor",
      vehicleId: selectedVehicle.id,
      vehicleLabel:
        selectedVehicle.ownershipType === "OWN"
          ? `${selectedVehicle.registrationNumber} (OWN)`
          : `${selectedVehicle.registrationNumber} (Vendor: ${vendorMap.get(selectedVehicle.vendorId ?? "")?.name ?? "Vendor"})`,
      driverId: selectedDriver.id,
      driverName: selectedDriver.name,
      vendorFreight: Number(vendorFreight),
      marginPercent,
      actor: "Dispatcher",
    });
    resetDialog();
  }

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="TMS"
        title="Assignment Queue"
        description="Assign vendor, vehicle, driver, and commercial margin before loading starts."
      />

      <div className="grid gap-3 md:grid-cols-3">
        <TenantSummaryCard label="Pending" value={String(queue.length)} helper="Bookings waiting for assignment" />
        <TenantSummaryCard label="Vehicles" value={String(adminSources.vehicles.filter((vehicle) => vehicle.isActive).length)} helper="Active own and vendor vehicles" />
        <TenantSummaryCard label="Drivers" value={String(adminSources.drivers.filter((driver) => driver.isActive).length)} helper="Active driver master records" />
      </div>

      <DataTable
        title="Assignment Queue"
        description="Vendor is mandatory. Customer freight stays visible before assigning vendor freight and margin."
        headers={["Booking", "Customer", "Service", "Commercial", "Freight", "Status", "Actions"]}
        rows={queue.map((booking) => [
          booking.bookingId,
          customerMap.get(booking.customerId)?.name ?? "Unknown customer",
          booking.serviceType,
          booking.commercialType,
          `Rs ${booking.pricing.calculatedFreight.toLocaleString()}`,
          <BookingStatusBadge key={`${booking.id}-status`} status={booking.status} />,
          <div key={`${booking.id}-actions`} className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => setAssigningBookingId(booking.id)}>
              Assign
            </Button>
            <Button asChild size="sm" variant="ghost">
              <Link to={`/tenant/${tenant.id}/bookings/${booking.id}`}>View</Link>
            </Button>
          </div>,
        ])}
        emptyMessage="No bookings are waiting for assignment."
      />

      <Dialog
        open={Boolean(assigningBooking)}
        onOpenChange={(open) => {
          if (!open) {
            resetDialog();
          }
        }}
        title="Assign Booking"
        description="Select vendor first. Vehicle and driver stay scoped to same ownership."
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={resetDialog}>
              Cancel
            </Button>
            <Button onClick={submitAssignment} disabled={!vendorId || !vehicleId || !driverId || Number(vendorFreight) <= 0}>
              Assign
            </Button>
          </div>
        }
      >
        <div className="grid gap-3 md:grid-cols-2">
          <CompactField label="Vendor">
            <Select
              value={vendorId}
              onChange={(event) => {
                setVendorId(event.target.value);
                setVehicleId("");
                setDriverId("");
              }}
            >
              <option value="">Select vendor</option>
              <option value={OWN_FLEET_VENDOR}>Own Fleet</option>
              {adminSources.vendors.filter((vendor) => vendor.status === "active").map((vendor) => (
                <option key={vendor.id} value={vendor.id}>
                  {vendor.name}
                </option>
              ))}
            </Select>
          </CompactField>
          <CompactField label="Customer Freight">
            <Input value={customerFreight ? customerFreight.toLocaleString() : ""} disabled />
          </CompactField>
          <CompactField label="Vehicle">
            <Select
              value={vehicleId}
              onChange={(event) => {
                setVehicleId(event.target.value);
                setDriverId("");
              }}
              disabled={!vendorId}
            >
              <option value="">Select vehicle</option>
              {availableVehicles.map((vehicle) => (
                <option key={vehicle.id} value={vehicle.id}>
                  {vehicle.ownershipType === "OWN"
                    ? `${vehicle.registrationNumber} (OWN)`
                    : `${vehicle.registrationNumber} (${vendorMap.get(vehicle.vendorId ?? "")?.name ?? "Vendor"})`}
                </option>
              ))}
            </Select>
          </CompactField>
          <CompactField label="Driver">
            <Select value={driverId} onChange={(event) => setDriverId(event.target.value)} disabled={!selectedVehicle}>
              <option value="">Select driver</option>
              {availableDrivers.map((driver) => (
                <option key={driver.id} value={driver.id}>
                  {driver.name}
                </option>
              ))}
            </Select>
          </CompactField>
          <CompactField label="Vendor Freight">
            <Input value={vendorFreight} onChange={(event) => setVendorFreight(event.target.value)} placeholder="Enter vendor freight" />
          </CompactField>
          <CompactField label="Margin %">
            <Input value={Number.isFinite(marginPercent) ? String(marginPercent) : ""} disabled />
          </CompactField>
        </div>
      </Dialog>
    </div>
  );
}

function CompactField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}
