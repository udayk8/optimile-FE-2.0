import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { useTenantRouteContext } from "@/modules/tenant-admin/hooks/useTenantRouteContext";
import { useTenantPaths } from "@platform-admin/hooks/useTenantPaths";
import { useBookingAdminSources } from "../../../tms/booking/hooks/useBookingAdminSources";
import { useTenantBookings } from "../../../tms/booking/hooks/useTenantBookings";
import { buildAddressLookup, buildCustomerLookup } from "../../../tms/booking/services/booking-selectors";
import { getPrimaryBookingStatus } from "../../../tms/booking/services/booking-engine";
import { BookingStatusBadge } from "../../../tms/booking/components/BookingStatusBadge";

const PAGE_SIZE = 8;

export function ShipmentDocumentsListPage() {
  const { tenant } = useTenantRouteContext();
  const paths = useTenantPaths();
  const { data: bookings } = useTenantBookings(tenant.id);
  const adminSources = useBookingAdminSources(tenant.id);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const customerMap = useMemo(() => buildCustomerLookup(adminSources.customers), [adminSources.customers]);
  const addressMap = useMemo(
    () => buildAddressLookup(Array.from(adminSources.customerAddressMap.values()).flat()),
    [adminSources.customerAddressMap],
  );

  // Show IN_TRANSIT bookings where invoice OR e-waybill has not yet been uploaded.
  // Bookings that already have both documents uploaded are excluded.
  const rows = useMemo(
    () =>
      bookings.filter((b) => {
        if (getPrimaryBookingStatus(b.status) !== "IN_TRANSIT") return false;
        const docs = b.shipmentDocuments?.deliveries ?? [];
        const invoiceCount = docs.reduce((sum, d) => sum + (d.invoices?.length ?? 0), 0);
        const hasEwayBill = docs.some((d) => Boolean(d.ewayBill)) || Boolean(b.ewayBillNumber);
        // Show only if at least one document type is still missing
        return invoiceCount === 0 || !hasEwayBill;
      }),
    [bookings],
  );

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((b) => {
      const cust = customerMap.get(b.customerId);
      return `${b.bookingId} ${cust?.name ?? ""}`.toLowerCase().includes(q);
    });
  }, [rows, search, customerMap]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const pagedRows = filteredRows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-[14px] font-semibold text-slate-900">Shipment Documents</h1>
        <span className="text-[12px] text-slate-500">{filteredRows.length} bookings</span>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-md border border-slate-200 bg-white px-2 py-1.5 shadow-sm">
        <Input
          value={search}
          onChange={(event) => { setSearch(event.target.value); setCurrentPage(1); }}
          placeholder="Search booking or customer"
          className="h-8 min-w-[180px] flex-1 text-[12px]"
        />
        {search ? (
          <Button size="sm" variant="ghost" onClick={() => { setSearch(""); setCurrentPage(1); }} className="h-8 text-[12px]">Clear</Button>
        ) : null}
      </div>

      <div className="rounded-md border border-slate-200 bg-white p-2 shadow-sm">
        <div className="space-y-1.5">
          {pagedRows.length ? (
            pagedRows.map((booking) => {
              const customerName = customerMap.get(booking.customerId)?.name ?? "—";
              const srcAddr = addressMap.get(booking.sourceAddressId);
              const dstAddr = addressMap.get(booking.destinationAddressId);
              const origin = srcAddr?.city ?? srcAddr?.addressName ?? "—";
              const dest = dstAddr?.city ?? dstAddr?.addressName ?? "—";
              const docs = booking.shipmentDocuments?.deliveries ?? [];
              const invoiceCount = docs.reduce((sum, d) => sum + (d.invoices?.length ?? 0), 0);
              const hasEwayBill = docs.some((d) => Boolean(d.ewayBill)) || Boolean(booking.ewayBillNumber);

              return (
                <div
                  key={booking.id}
                  className="grid items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-[12px] lg:grid-cols-[130px_minmax(0,1.3fr)_80px_80px_110px_auto]"
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-900">{booking.bookingId}</p>
                    <p className="mt-0.5 truncate text-[10.5px] text-slate-500">{new Date(booking.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-900">{customerName}</p>
                    <p className="mt-0.5 truncate text-[11px] text-slate-500">{origin} → {dest}</p>
                    <p className="mt-0.5 text-[10.5px] text-slate-400">Rs {booking.pricing.calculatedFreight.toLocaleString()}</p>
                  </div>
                  <div>
                    {invoiceCount > 0 ? (
                      <Badge variant="success">{invoiceCount} inv</Badge>
                    ) : (
                      <Badge variant="warning">No inv</Badge>
                    )}
                  </div>
                  <div>
                    {hasEwayBill ? (
                      <Badge variant="success">eWB ✓</Badge>
                    ) : (
                      <Badge variant="warning">No eWB</Badge>
                    )}
                  </div>
                  <div><BookingStatusBadge status={booking.status} /></div>
                  <div className="flex items-center gap-1.5">
                    <Button asChild size="sm">
                      <Link to={`${paths.root}/bookings/${booking.id}/documents`}>Upload Invoice / eWB</Link>
                    </Button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="rounded-md border border-dashed bg-slate-50/40 px-4 py-8 text-center">
              <p className="text-[13px] font-semibold text-slate-800">No in-transit bookings pending documents</p>
            </div>
          )}
        </div>

        {totalPages > 1 ? (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-3 text-[12px]">
            <p className="text-slate-600">
              {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filteredRows.length)} of {filteredRows.length}
            </p>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}>
                <ChevronLeft className="size-4" />Previous
              </Button>
              <Button variant="outline" size="sm" disabled={currentPage === totalPages} onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}>
                Next<ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
