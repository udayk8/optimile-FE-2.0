import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowRight, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { PageHeader } from "@/shared/components/common/page-header";
import { TenantFilterBar } from "@/modules/tenant-admin/components/tenant-primitives";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Select } from "@/shared/components/ui/select";
import { useTenantRouteContext } from "@/modules/tenant-admin/hooks/useTenantRouteContext";
import { useTenantAccess } from "@/modules/tenant-admin/hooks/useTenantAccess";
import { BookingStatusBadge } from "@/modules/tms/booking/components/BookingStatusBadge";
import { useBookingAdminSources } from "./hooks/useBookingAdminSources";
import { useTenantBookings } from "./hooks/useTenantBookings";
import { formatCurrency } from "@/shared/lib/format-currency";
import {
  buildAddressLookup,
  buildCustomerLookup,
  buildDriverLookup,
} from "@/modules/tms/booking/services/booking-selectors";
import { getPrimaryBookingStatus } from "@/modules/tms/booking/services/booking-engine";
import type { BookingRecord, BookingStatus } from "@/modules/tms/booking/types";

const pipelineColumns: Array<{
  key: string;
  label: string;
  statuses: BookingStatus[];
}> = [
  // ERP Bookings — placeholder pipeline for bookings sourced from an
  // upstream ERP. Add the dedicated BookingStatus to the statuses array
  // once it's wired in the engine.
  { key: "erp", label: "ERP Bookings", statuses: [] },
  { key: "draft", label: "Draft", statuses: ["DRAFT"] },
  { key: "approval", label: "Rate Approval", statuses: ["PENDING_RATE_APPROVAL"] },
  { key: "assignment", label: "Assignment", statuses: ["PENDING_ASSIGNMENT"] },
  { key: "transit", label: "In Transit", statuses: ["IN_TRANSIT"] },
  { key: "pod", label: "POD Pending", statuses: ["POD_PENDING"] },
  { key: "completed", label: "Completed", statuses: ["COMPLETED"] },
  { key: "invoiced", label: "Invoiced", statuses: ["INVOICED"] },
  { key: "exception", label: "Exception", statuses: ["EXCEPTION"] },
  { key: "cancelled", label: "Cancelled", statuses: ["CANCELLED"] },
];

const PAGE_SIZE = 8;

export function BookingListPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { tenant } = useTenantRouteContext();
  const access = useTenantAccess();
  const canCreateBooking = access.hasFeaturePermission("TMS", "CREATE_BOOKING", "create");
  const { data: bookings } = useTenantBookings(tenant.id);
  const adminSources = useBookingAdminSources(tenant.id);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [customerFilter, setCustomerFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedPipelineKey, setSelectedPipelineKey] = useState(searchParams.get("pipeline") ?? "assignment");
  const [currentPage, setCurrentPage] = useState(1);

  const customerMap = useMemo(() => buildCustomerLookup(adminSources.customers), [adminSources.customers]);
  const addressMap = useMemo(
    () => buildAddressLookup(Array.from(adminSources.customerAddressMap.values()).flat()),
    [adminSources.customerAddressMap],
  );
  const driverMap = useMemo(() => buildDriverLookup(adminSources.drivers), [adminSources.drivers]);

  useEffect(() => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      if (selectedPipelineKey) {
        next.set("pipeline", selectedPipelineKey);
      } else {
        next.delete("pipeline");
      }
      return next;
    });
  }, [selectedPipelineKey, setSearchParams]);

  const baseFilteredBookings = useMemo(() => {
    const query = search.trim().toLowerCase();
    return bookings.filter((booking) => {
      const customer = customerMap.get(booking.customerId);
      const source = addressMap.get(booking.sourceAddressId);
      const destination = addressMap.get(booking.destinationAddressId);
      const driverName = booking.assignment?.driverName ?? "";
      const vehicleName = booking.assignment?.vehicleLabel ?? "";
      const haystack =
        `${booking.bookingId} ${customer?.name ?? ""} ${source?.addressName ?? ""} ${source?.city ?? ""} ${destination?.addressName ?? ""} ${destination?.city ?? ""} ${driverName} ${vehicleName}`
          .toLowerCase();

      if (query && !haystack.includes(query)) {
        return false;
      }
      if (customerFilter !== "all" && booking.customerId !== customerFilter) {
        return false;
      }
      if (dateFrom && booking.createdAt.slice(0, 10) < dateFrom) {
        return false;
      }
      if (dateTo && booking.createdAt.slice(0, 10) > dateTo) {
        return false;
      }
      return true;
    });
  }, [addressMap, bookings, customerFilter, customerMap, dateFrom, dateTo, search]);

  const pipelineGroups = useMemo(
    () =>
      pipelineColumns.map((column) => {
        const columnBookings = baseFilteredBookings
          .filter((booking) => column.statuses.includes(getPrimaryBookingStatus(booking.status)))
          .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());

        return {
          ...column,
          bookings: columnBookings,
          previewBookings: columnBookings.slice(0, 5),
          totalFreight: columnBookings.reduce((sum, booking) => sum + booking.pricing.calculatedFreight, 0),
        };
      }),
    [baseFilteredBookings],
  );

  const activePipelineGroup =
    pipelineGroups.find((column) => column.key === selectedPipelineKey) ??
    pipelineGroups.find((column) => column.key === "assignment") ??
    pipelineGroups[0];

  const listBookings = useMemo(() => {
    const stateScopedBookings = activePipelineGroup?.bookings ?? [];
    if (statusFilter === "all") {
      return stateScopedBookings;
    }
    return stateScopedBookings.filter((booking) => booking.status === statusFilter);
  }, [activePipelineGroup, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(listBookings.length / PAGE_SIZE));
  const pagedBookings = useMemo(
    () => listBookings.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [currentPage, listBookings],
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, customerFilter, dateFrom, dateTo, selectedPipelineKey]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  function openBooking(bookingId: string) {
    navigate(`/tenant/${tenant.id}/bookings/${bookingId}`);
  }

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="TMS"
        title="Booking Dashboard"
        description="Compact state-first workspace with short previews and a bounded full list."
        action={
          canCreateBooking ? (
            <Button asChild>
              <Link to={`/tenant/${tenant.id}/bookings/create`}>
                <Plus className="size-4" />
                Create Booking
              </Link>
            </Button>
          ) : null
        }
      />

      <div className="glass-panel overflow-x-auto p-3">
        <div className="flex min-w-max gap-3">
          {pipelineGroups.map((column) => {
            const isActive = selectedPipelineKey === column.key;
            return (
              <div
                key={column.key}
                className={`flex h-[290px] w-[220px] shrink-0 flex-col rounded-[24px] border p-3 transition lg:w-[230px] xl:w-[240px] ${getPipelineColumnClass(column.key)} ${isActive ? "border-primary/45 ring-2 ring-primary/20" : "border-white/80"}`}
              >
                <button
                  type="button"
                  className="flex items-start justify-between gap-3 rounded-[18px] px-1 py-1 text-left"
                  onClick={() => {
                    setSelectedPipelineKey(column.key);
                    setStatusFilter("all");
                  }}
                >
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">State</p>
                    <p className="mt-1 text-sm font-semibold">{column.label}</p>
                  </div>
                  <Badge variant={isActive ? "accent" : "outline"}>{column.bookings.length}</Badge>
                </button>

                <div className="mt-3 flex-1 overflow-y-auto pr-1">
                  <div className="space-y-2">
                    {column.previewBookings.length ? (
                      column.previewBookings.map((booking) => (
                        <button
                          key={booking.id}
                          type="button"
                          className="flex w-full items-center justify-between gap-2 rounded-2xl border border-white/80 bg-white/85 px-3 py-2 text-left transition hover:border-primary/25 hover:bg-white"
                          onClick={() => openBooking(booking.id)}
                        >
                          <div className="min-w-0">
                            <p className="truncate text-xs font-semibold">{booking.bookingId}</p>
                            <p className="truncate text-[11px] text-muted-foreground">
                              {customerMap.get(booking.customerId)?.name ?? "Unknown customer"}
                            </p>
                          </div>
                          <ArrowRight className="size-3.5 shrink-0 text-muted-foreground" />
                        </button>
                      ))
                    ) : (
                      <div className="flex h-full min-h-[120px] items-center justify-center rounded-2xl border border-dashed border-border/60 bg-white/45 px-3 text-center text-xs text-muted-foreground">
                        No bookings
                      </div>
                    )}
                  </div>
                </div>

                <Button
                  variant={isActive ? "default" : "outline"}
                  className="mt-3 w-full"
                  onClick={() => {
                    setSelectedPipelineKey(column.key);
                    setStatusFilter("all");
                  }}
                >
                  View All
                </Button>
              </div>
            );
          })}
        </div>
      </div>

      <TenantFilterBar
        searchValue={search}
        searchPlaceholder="Search booking ID or customer"
        onSearchChange={setSearch}
        filters={
          <>
            <Select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="all">All execution statuses</option>
              {Array.from(new Set((activePipelineGroup?.bookings ?? []).map((booking) => booking.status))).map((status) => (
                <option key={status} value={status}>
                  {status.replace(/_/g, " ")}
                </option>
              ))}
            </Select>
            <Select value={customerFilter} onChange={(event) => setCustomerFilter(event.target.value)}>
              <option value="all">All customers</option>
              {adminSources.customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}
                </option>
              ))}
            </Select>
            <Input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
            <Input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
          </>
        }
      />

      <div className="glass-panel p-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 pb-4">
          <div>
            <p className="text-lg font-semibold">{activePipelineGroup?.label ?? "Bookings"}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {listBookings.length} bookings · {formatCurrency(activePipelineGroup?.totalFreight ?? 0)}
            </p>
          </div>
          <Badge variant="outline">
            Page {currentPage} / {totalPages}
          </Badge>
        </div>

        <div className="mt-4 h-[430px] overflow-y-auto pr-1">
          {pagedBookings.length ? (
            <div className="space-y-2">
              {pagedBookings.map((booking) => (
                <CompactBookingRow
                  key={booking.id}
                  booking={booking}
                  customerName={customerMap.get(booking.customerId)?.name ?? "Unknown customer"}
                  sourceLabel={getLanePoint(addressMap.get(booking.sourceAddressId))}
                  destinationLabel={getLanePoint(addressMap.get(booking.destinationAddressId))}
                  driverName={booking.assignment?.driverName ?? (booking.assignment?.driverId ? driverMap.get(booking.assignment.driverId)?.name ?? "Unassigned" : "Unassigned")}
                  onOpen={() => openBooking(booking.id)}
                />
              ))}
            </div>
          ) : (
            <div className="flex h-full items-center justify-center rounded-[28px] border border-dashed border-border/70 bg-white/45 px-6 text-center text-sm text-muted-foreground">
              No bookings match this state and filter combination.
            </div>
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border/70 pt-4">
          <p className="text-sm text-muted-foreground">
            Showing {pagedBookings.length ? (currentPage - 1) * PAGE_SIZE + 1 : 0}-
            {Math.min(currentPage * PAGE_SIZE, listBookings.length)} of {listBookings.length}
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}>
              <ChevronLeft className="size-4" />
              Previous
            </Button>
            <Button variant="outline" size="sm" disabled={currentPage === totalPages} onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}>
              Next
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CompactBookingRow({
  booking,
  customerName,
  sourceLabel,
  destinationLabel,
  driverName,
  onOpen,
}: {
  booking: BookingRecord;
  customerName: string;
  sourceLabel: string;
  destinationLabel: string;
  driverName: string;
  onOpen: () => void;
}) {
  const hasRevisionPending = (booking.destinationChangeRequests ?? []).some((request) =>
    ["SUBMITTED", "UNDER_REVIEW", "APPROVED"].includes(request.status),
  );
  const isRevised = (booking.deliveries ?? []).some((delivery) => (delivery.revisions?.length ?? 0) > 0);
  return (
    <button
      type="button"
      onClick={onOpen}
      className={`grid w-full gap-3 rounded-[22px] border px-4 py-3 text-left transition hover:border-primary/25 hover:bg-white lg:grid-cols-[140px_minmax(0,1fr)_170px_140px_90px_auto] ${hasRevisionPending || isRevised ? "border-amber-300 bg-amber-50/70" : "border-white/80 bg-white/85"}`}
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold">{booking.bookingId}</p>
        <p className="mt-1 truncate text-xs text-muted-foreground">{new Date(booking.createdAt).toLocaleDateString()}</p>
        {hasRevisionPending ? <Badge variant="warning">EDITED BOOKING</Badge> : null}
        {!hasRevisionPending && isRevised ? <Badge variant="accent">DESTINATION REVISED</Badge> : null}
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{customerName}</p>
        <p className="mt-1 truncate text-xs text-muted-foreground">
          {sourceLabel} → {destinationLabel}
        </p>
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{booking.assignment?.vehicleLabel ?? "Pending vehicle"}</p>
        <p className="mt-1 truncate text-xs text-muted-foreground">{driverName}</p>
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium">{formatCurrency(booking.pricing.calculatedFreight)}</p>
        <p className="mt-1 text-xs text-muted-foreground">{getDeliveryProgressLabel(booking)}</p>
      </div>
      <div className="flex items-center lg:justify-center">
        <BookingStatusBadge status={booking.status} />
      </div>
      <div className="flex items-center justify-end">
        <ArrowRight className="size-4 text-muted-foreground" />
      </div>
    </button>
  );
}

function getLanePoint(address?: { city?: string | null; addressName?: string | null }) {
  return address?.city ?? address?.addressName ?? "Unknown";
}

function getDeliveryProgressLabel(booking: BookingRecord) {
  const deliveries = booking.deliveries ?? [];
  const total = deliveries.length || booking.numberOfDeliveries || 0;
  const completed = deliveries.filter((delivery) => delivery.status === "COMPLETED").length;
  return `${completed}/${total} deliveries done`;
}

function getPipelineColumnClass(columnKey: string) {
  switch (columnKey) {
    case "draft":
      return "bg-gradient-to-b from-slate-100/95 to-blue-50/70";
    case "approval":
      return "bg-gradient-to-b from-amber-100/95 to-orange-50/75";
    case "assignment":
      return "bg-gradient-to-b from-sky-100/95 to-cyan-50/75";
    case "transit":
      return "bg-gradient-to-b from-cyan-100/95 to-blue-50/75";
    case "pod":
      return "bg-gradient-to-b from-violet-100/95 to-fuchsia-50/75";
    case "completed":
      return "bg-gradient-to-b from-emerald-100/95 to-lime-50/75";
    case "invoiced":
      return "bg-gradient-to-b from-green-100/95 to-emerald-50/75";
    case "exception":
      return "bg-gradient-to-b from-rose-100/95 to-orange-50/75";
    case "cancelled":
      return "bg-gradient-to-b from-rose-100/95 to-pink-50/75";
    default:
      return "bg-background/95";
  }
}
