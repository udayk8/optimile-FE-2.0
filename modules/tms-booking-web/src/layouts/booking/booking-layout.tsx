import { Outlet, useLocation } from "react-router-dom";
import { CirclePlus, ClipboardList, FileDigit, Truck, Waypoints } from "lucide-react";
import { WorkspaceShell } from "../shared/workspace-shell";
import { useTenantRouteContext } from "../../hooks/useTenantRouteContext";
import { useBookingPaths } from "../../hooks/useBookingPaths";

export function BookingLayout() {
  const location = useLocation();
  const { tenant } = useTenantRouteContext();
  const paths = useBookingPaths();

  const bookingNav = [
    { to: paths.createBooking, label: "Create Booking", icon: CirclePlus, matchMode: "exact" as const },
    { to: paths.bookings, label: "Booking List", icon: ClipboardList, matchMode: "exact" as const },
    { to: paths.rateApproval, label: "Rate Approval Queue", icon: FileDigit, matchMode: "exact" as const },
    { to: paths.assignment, label: "Assignment Queue", icon: Truck, matchMode: "exact" as const },
    { to: paths.liveTracking, label: "In Transit / Control Tower", icon: Waypoints, matchMode: "exact" as const },
    { to: paths.completed, label: "Completed / POD", icon: ClipboardList, matchMode: "exact" as const },
  ];

  return (
    <WorkspaceShell
      title={tenant.name}
      subtitle="TMS Booking Workspace"
      navItems={bookingNav}
      actorLabel="TMS login"
      searchPlaceholder="Search bookings, customers, vendors, drivers"
    >
      <div key={location.pathname} className="min-w-0 overflow-x-hidden px-4 py-6 sm:px-6 lg:px-8">
        <Outlet />
      </div>
    </WorkspaceShell>
  );
}
