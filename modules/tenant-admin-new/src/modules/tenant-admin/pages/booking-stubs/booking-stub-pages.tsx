import { Link } from "react-router-dom";
import { PageHeader } from "@/shared/components/common/page-header";
import { TenantPanel } from "@/modules/tenant-admin/components/tenant-primitives";
import { Button } from "@/shared/components/ui/button";
import { useTenantRouteContext } from "@/modules/tenant-admin/hooks/useTenantRouteContext";
import { useTenantPaths } from "@platform-admin/hooks/useTenantPaths";
import { useTenantBookings } from "../../../tms/booking/hooks/useTenantBookings";

export function ShipmentDocumentsListPage() {
  const { tenant } = useTenantRouteContext();
  const paths = useTenantPaths();
  const { data: bookings } = useTenantBookings(tenant.id);

  const rows = bookings.filter((booking) =>
    ["IN_TRANSIT", "POD_PENDING", "COMPLETED", "INVOICED"].includes(booking.status),
  );

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="TMS"
        title="Shipment Documents"
        description="Invoices, e-waybills, and supporting documents per booking."
      />
      <TenantPanel title={`${rows.length} bookings with document activity`}>
        {rows.length === 0 ? (
          <p className="py-6 text-sm text-muted-foreground">No bookings are in a document-eligible state yet.</p>
        ) : (
          <div className="divide-y">
            {rows.map((booking) => (
              <div key={booking.id} className="flex items-center justify-between py-3 text-sm">
                <div>
                  <div className="font-medium text-slate-900">{booking.bookingId}</div>
                  <div className="text-xs text-muted-foreground">{booking.status.replace(/_/g, " ")}</div>
                </div>
                <Button asChild size="sm" variant="outline">
                  <Link to={`${paths.root}/bookings/${booking.id}/documents`}>Open documents</Link>
                </Button>
              </div>
            ))}
          </div>
        )}
      </TenantPanel>
    </div>
  );
}
