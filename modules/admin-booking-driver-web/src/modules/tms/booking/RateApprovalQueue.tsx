import { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { DataTable } from "@/components/common/data-table";
import { PageHeader } from "@/components/common/page-header";
import { TenantSummaryCard } from "@/components/tenant/tenant-primitives";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useTenantRouteContext } from "@/hooks/useTenantRouteContext";
import { BookingStatusBadge } from "@/modules/tms/booking/components/BookingStatusBadge";
import { useBookingAdminSources } from "@/modules/tms/booking/hooks/useBookingAdminSources";
import { useTenantBookings } from "@/modules/tms/booking/hooks/useTenantBookings";
import { buildCustomerLookup } from "@/modules/tms/booking/services/booking-selectors";

export function RateApprovalQueuePage() {
  const navigate = useNavigate();
  const { tenant } = useTenantRouteContext();
  const { data: bookings, transitionBooking } = useTenantBookings(tenant.id);
  const adminSources = useBookingAdminSources(tenant.id);
  const customerMap = useMemo(() => buildCustomerLookup(adminSources.customers), [adminSources.customers]);
  const queue = bookings.filter((booking) => booking.status === "PENDING_RATE_APPROVAL");

  function approveBooking(bookingId: string) {
    const remark = window.prompt("Approval remark");
    if (!remark?.trim()) {
      return;
    }
    transitionBooking(bookingId, {
      status: "PENDING_ASSIGNMENT",
      actor: "Rate Approver",
      note: remark.trim(),
    });
  }

  function rejectBooking(bookingId: string) {
    const remark = window.prompt("Rejection remark");
    if (!remark?.trim()) {
      return;
    }
    transitionBooking(bookingId, {
      status: "DRAFT",
      actor: "Rate Approver",
      note: remark.trim(),
    });
  }

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="TMS"
        title="Rate Approval Queue"
        description="Review deviations with clear commercial context before releasing bookings to assignment."
      />

      <div className="grid gap-3 md:grid-cols-4">
        <TenantSummaryCard label="Pending" value={String(queue.length)} helper="Bookings waiting for approval" />
        <TenantSummaryCard label="Manager" value={String(queue.filter((booking) => booking.pricing.approvalLevel === "MANAGER").length)} helper="Manager approval required" />
        <TenantSummaryCard label="HO" value={String(queue.filter((booking) => booking.pricing.approvalLevel === "HO").length)} helper="Head office approval required" />
        <TenantSummaryCard label="Avg Deviation" value={queue.length ? `${(queue.reduce((sum, booking) => sum + Math.abs(booking.pricing.deviationPercent), 0) / queue.length).toFixed(1)}%` : "0%"} helper="Absolute deviation" />
      </div>

      <div className="grid gap-3 xl:grid-cols-3">
        <ApprovalGuideCard icon={AlertTriangle} title="Check deviation" description="Highlight high-risk bookings first and compare against base rate." />
        <ApprovalGuideCard icon={CheckCircle2} title="Approve with remark" description="Approved bookings move directly to assignment queue." />
        <ApprovalGuideCard icon={XCircle} title="Reject to draft" description="Rejected bookings return to draft with immutable commercial remark." />
      </div>

      <DataTable
        title="Deviation Review Board"
        description="Compact approval table. Click row to inspect booking details."
        headers={["Booking", "Customer", "Commercial", "Deviation", "Approval", "Status", "Actions"]}
        rows={queue.map((booking) => [
          <div key={`${booking.id}-booking`} className="min-w-[140px]">
            <p className="font-medium">{booking.bookingId}</p>
            <p className="mt-1 text-xs text-muted-foreground">{new Date(booking.createdAt).toLocaleString()}</p>
          </div>,
          customerMap.get(booking.customerId)?.name ?? "Unknown customer",
          <div key={`${booking.id}-commercial`} className="space-y-1">
            <p className="font-medium">Rs {booking.pricing.calculatedFreight.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">{booking.pricing.rateType.replace(/_/g, " ")}</p>
          </div>,
          <Badge key={`${booking.id}-deviation`} variant={Math.abs(booking.pricing.deviationPercent) > 10 ? "warning" : "accent"}>
            {booking.pricing.deviationPercent}%
          </Badge>,
          booking.pricing.approvalLevel ?? "AUTO",
          <BookingStatusBadge key={`${booking.id}-status`} status={booking.status} />,
          <div key={`${booking.id}-actions`} className="flex flex-wrap gap-2" onClick={(event) => event.stopPropagation()}>
            <Button size="sm" onClick={() => approveBooking(booking.id)}>
              Approve
            </Button>
            <Button size="sm" variant="outline" onClick={() => rejectBooking(booking.id)}>
              Reject
            </Button>
            <Button asChild size="sm" variant="ghost">
              <Link to={`/tenant/${tenant.id}/bookings/${booking.id}`}>View</Link>
            </Button>
          </div>,
        ])}
        onRowClick={(rowIndex) => navigate(`/tenant/${tenant.id}/bookings/${queue[rowIndex].id}`)}
        emptyMessage="No bookings are waiting for rate approval."
      />
    </div>
  );
}

function ApprovalGuideCard({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof AlertTriangle;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-[24px] border border-border/80 bg-gradient-to-br from-white to-slate-50/90 p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="rounded-2xl bg-primary/[0.08] p-2 text-primary">
          <Icon className="size-4" />
        </div>
        <p className="font-semibold">{title}</p>
      </div>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">{description}</p>
    </div>
  );
}
