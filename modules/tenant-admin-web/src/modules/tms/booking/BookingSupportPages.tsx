import { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CircleCheckBig, RadioTower, TriangleAlert } from "lucide-react";
import { DataTable } from "../../../components/common/data-table";
import { PageHeader } from "../../../components/common/page-header";
import { TenantSummaryCard } from "../../../components/tenant/tenant-primitives";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { useTenantPaths } from "../../../hooks/useTenantPaths";
import { useTenantRouteContext } from "../../../hooks/useTenantRouteContext";
import { BookingStatusBadge } from "./components/BookingStatusBadge";
import { useBookingAdminSources } from "./hooks/useBookingAdminSources";
import { useTenantBookings } from "./hooks/useTenantBookings";
import { isBookingDelayCandidate } from "./services/booking-engine";
import {
  buildAddressLookup,
  buildCustomerLookup,
  buildDriverLookup,
} from "./services/booking-selectors";

export function LiveTrackingPlaceholderPage() {
  const navigate = useNavigate();
  const { tenant } = useTenantRouteContext();
  const paths = useTenantPaths();
  const { data: bookings } = useTenantBookings(tenant.id);
  const adminSources = useBookingAdminSources(tenant.id);
  const customerMap = useMemo(() => buildCustomerLookup(adminSources.customers), [adminSources.customers]);
  const addressMap = useMemo(
    () => buildAddressLookup(Array.from(adminSources.customerAddressMap.values()).flat()),
    [adminSources.customerAddressMap],
  );
  const driverMap = useMemo(() => buildDriverLookup(adminSources.drivers), [adminSources.drivers]);
  const controlTowerBookings = bookings.filter((booking) =>
    ["DOCUMENT_COMPLETED", "READY_FOR_DISPATCH", "DISPATCHED", "IN_TRANSIT", "DELAYED", "EXCEPTION"].includes(booking.status),
  );

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="TMS"
        title="In Transit / Control Tower"
        description="Operations board for active trips, delay signals, exception handling, and live execution visibility."
      />

      <div className="grid gap-3 md:grid-cols-4">
        <TenantSummaryCard label="Active Trips" value={String(controlTowerBookings.length)} helper="Ready for dispatch and moving" />
        <TenantSummaryCard label="In Transit" value={String(controlTowerBookings.filter((booking) => booking.status === "IN_TRANSIT").length)} helper="Moving bookings" />
        <TenantSummaryCard label="Exceptions" value={String(controlTowerBookings.filter((booking) => booking.status === "EXCEPTION").length)} helper="Need intervention" />
        <TenantSummaryCard label="Delay Candidates" value={String(controlTowerBookings.filter((booking) => isBookingDelayCandidate(booking)).length)} helper="Auto-flagged risk" />
      </div>

      <div className="grid gap-3 xl:grid-cols-3">
        <SignalCard icon={RadioTower} title="Track operationally" description="Use booking details as the command center for transit, expenses, and delivery." />
        <SignalCard icon={TriangleAlert} title="Raise fast exceptions" description="Delay and exception signals stay visible without cluttering the board." />
        <SignalCard icon={CircleCheckBig} title="Close cleanly" description="Delivered bookings continue to POD and finance with clear downstream steps." />
      </div>

      <DataTable
        title="Control Tower Board"
        description="Minimal high-signal table. Click row to open booking workspace."
        headers={["Booking", "Customer", "Lane", "Status", "Vehicle", "Driver", "Signals", "Action"]}
        rows={controlTowerBookings.map((booking) => {
          const customer = customerMap.get(booking.customerId);
          const source = addressMap.get(booking.sourceAddressId);
          const destination = addressMap.get(booking.destinationAddressId);
          const driver = booking.assignment?.driverId ? driverMap.get(booking.assignment.driverId) : null;

          return [
            booking.bookingId,
            customer?.name ?? "Unknown customer",
            `${source?.addressName ?? "Source"} → ${destination?.addressName ?? "Destination"}`,
            <BookingStatusBadge key={`${booking.id}-status`} status={booking.status} />,
            booking.assignment?.vehicleLabel ?? "Unassigned",
            booking.assignment?.driverName ?? driver?.name ?? "Unassigned",
            <Badge key={`${booking.id}-signal`} variant={isBookingDelayCandidate(booking) && booking.status !== "DELAYED" ? "warning" : "success"}>
              {isBookingDelayCandidate(booking) && booking.status !== "DELAYED" ? "Delay candidate" : "Normal"}
            </Badge>,
            <div key={`${booking.id}-actions`} onClick={(event) => event.stopPropagation()}>
              <Button asChild size="sm" variant="ghost">
                <Link to={paths.booking(booking.id)}>Open</Link>
              </Button>
            </div>,
          ];
        })}
        onRowClick={(rowIndex) => navigate(paths.booking(controlTowerBookings[rowIndex].id))}
        emptyMessage="No dispatched or in-transit bookings are active right now."
      />
    </div>
  );
}

export function PODCompletedPage() {
  const navigate = useNavigate();
  const { tenant } = useTenantRouteContext();
  const paths = useTenantPaths();
  const { data: bookings } = useTenantBookings(tenant.id);
  const adminSources = useBookingAdminSources(tenant.id);
  const customerMap = buildCustomerLookup(adminSources.customers);
  const completedBookings = bookings.filter((booking) =>
    ["DELIVERED", "INVOICED", "PAID"].includes(booking.status),
  );

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="TMS"
        title="Completed / POD"
        description="Post-delivery workspace for POD completion, invoice readiness, and finance closure."
      />

      <div className="grid gap-3 md:grid-cols-4">
        <TenantSummaryCard label="Delivered" value={String(completedBookings.filter((booking) => booking.status === "DELIVERED").length)} helper="Awaiting POD capture" />
        <TenantSummaryCard label="Invoiced" value={String(completedBookings.filter((booking) => booking.status === "INVOICED").length)} helper="Ready for closure" />
        <TenantSummaryCard label="Paid" value={String(completedBookings.filter((booking) => booking.status === "PAID").length)} helper="Commercially closed" />
        <TenantSummaryCard label="POD Complete" value={String(completedBookings.filter((booking) => (booking.deliveries ?? []).every((delivery) => Boolean(delivery.pod?.capturedAt))).length)} helper="All delivery PODs saved" />
      </div>

      <DataTable
        title="POD Closure Board"
        description="Click row to open booking and finish POD or finance actions."
        headers={["Booking", "Customer", "Status", "POD Progress", "e-Sign", "Action"]}
        rows={completedBookings.map((booking) => {
          const deliveryCount = booking.deliveries?.length ?? 0;
          const completedCount = (booking.deliveries ?? []).filter((delivery) => Boolean(delivery.pod?.capturedAt)).length;

          return [
            booking.bookingId,
            customerMap.get(booking.customerId)?.name ?? "Unknown customer",
            <BookingStatusBadge key={`${booking.id}-status`} status={booking.status} />,
            deliveryCount ? `${completedCount}/${deliveryCount} deliveries` : booking.pod?.capturedAt ? "Completed" : "Pending",
            booking.pod?.eSignRequested || (booking.deliveries ?? []).some((delivery) => delivery.pod?.eSignRequested) ? "Requested" : "Ready",
            <div key={`${booking.id}-actions`} onClick={(event) => event.stopPropagation()}>
              <Button asChild size="sm" variant="ghost">
                <Link to={paths.booking(booking.id)}>Open</Link>
              </Button>
            </div>,
          ];
        })}
        onRowClick={(rowIndex) => navigate(paths.booking(completedBookings[rowIndex].id))}
        emptyMessage="No delivered or completed bookings are available yet."
      />
    </div>
  );
}

function SignalCard({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof RadioTower;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-primary/10 p-2 text-primary">
          <Icon className="size-4" />
        </div>
        <p className="font-bold text-text">{title}</p>
      </div>
      <p className="mt-3 text-sm text-gray-600">{description}</p>
    </div>
  );
}
