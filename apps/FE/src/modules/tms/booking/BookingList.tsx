import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Plus } from "lucide-react";
import { DataTable } from "@/components/common/data-table";
import { PageHeader } from "@/components/common/page-header";
import { TenantFilterBar } from "@/components/tenant/tenant-primitives";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useTenantRouteContext } from "@/hooks/useTenantRouteContext";
import { BookingStatusBadge } from "@/modules/tms/booking/components/BookingStatusBadge";
import { useBookingAdminSources } from "@/modules/tms/booking/hooks/useBookingAdminSources";
import { useTenantBookings } from "@/modules/tms/booking/hooks/useTenantBookings";
import {
  buildAddressLookup,
  buildCustomerLookup,
  buildDriverLookup,
} from "@/modules/tms/booking/services/booking-selectors";
import type { BookingRecord, BookingStatus } from "@/modules/tms/booking/types";

const pipelineColumns: Array<{
  key: string;
  label: string;
  statuses: BookingStatus[];
}> = [
  { key: "draft", label: "Draft", statuses: ["DRAFT"] },
  { key: "approval", label: "Pending Rate Approval", statuses: ["PENDING_RATE_APPROVAL"] },
  { key: "assignment", label: "Pending Assignment", statuses: ["PENDING_ASSIGNMENT"] },
  {
    key: "assigned",
    label: "Assigned / Documents",
    statuses: [
      "VEHICLE_ASSIGNED",
      "LOADING_STARTED",
      "LOADING_COMPLETED",
      "DOCUMENT_PENDING",
      "DOCUMENT_COMPLETED",
      "ASSIGNED",
      "LOADING",
      "LOADED",
      "READY_FOR_DISPATCH",
      "DISPATCHED",
    ],
  },
  { key: "transit", label: "In Transit", statuses: ["IN_TRANSIT", "DELAYED", "EXCEPTION"] },
  { key: "completed", label: "Delivered / Finance", statuses: ["DELIVERED", "INVOICED", "PAID", "DISPUTED"] },
  { key: "cancelled", label: "Cancelled", statuses: ["CANCELLED"] },
];

export function BookingListPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { tenant } = useTenantRouteContext();
  const { data: bookings } = useTenantBookings(tenant.id);
  const adminSources = useBookingAdminSources(tenant.id);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState(searchParams.get("status") ?? "all");
  const [customerFilter, setCustomerFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "pipeline">((searchParams.get("view") as "list" | "pipeline") ?? "pipeline");

  const customerMap = useMemo(() => buildCustomerLookup(adminSources.customers), [adminSources.customers]);
  const addressMap = useMemo(
    () => buildAddressLookup(Array.from(adminSources.customerAddressMap.values()).flat()),
    [adminSources.customerAddressMap],
  );
  const driverMap = useMemo(() => buildDriverLookup(adminSources.drivers), [adminSources.drivers]);

  useEffect(() => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.set("view", viewMode);
      if (statusFilter !== "all") {
        next.set("status", statusFilter);
      } else {
        next.delete("status");
      }
      return next;
    });
  }, [setSearchParams, statusFilter, viewMode]);

  const filteredBookings = useMemo(() => {
    const query = search.trim().toLowerCase();
    return bookings.filter((booking) => {
      const customer = customerMap.get(booking.customerId);
      const source = addressMap.get(booking.sourceAddressId);
      const destination = addressMap.get(booking.destinationAddressId);
      const driverName = booking.assignment?.driverName ?? "";
      const vehicleName = booking.assignment?.vehicleLabel ?? "";
      const haystack =
        `${booking.bookingId} ${customer?.name ?? ""} ${source?.addressName ?? ""} ${destination?.addressName ?? ""} ${driverName} ${vehicleName}`
          .toLowerCase();

      if (query && !haystack.includes(query)) {
        return false;
      }
      if (statusFilter !== "all" && booking.status !== statusFilter) {
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
  }, [addressMap, bookings, customerFilter, customerMap, dateFrom, dateTo, search, statusFilter]);

  const pipelineGroups = useMemo(
    () =>
      pipelineColumns.map((column) => {
        const columnBookings = filteredBookings.filter((booking) => column.statuses.includes(booking.status));
        return {
          ...column,
          bookings: columnBookings,
          totalFreight: columnBookings.reduce((sum, booking) => sum + booking.pricing.calculatedFreight, 0),
        };
      }),
    [filteredBookings],
  );

  function openBooking(bookingId: string) {
    navigate(`/tenant/${tenant.id}/bookings/${bookingId}`);
  }

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="TMS"
        title="Booking Management"
        description="Compact list and pipeline views for fast operational scanning."
        action={
          <Button asChild>
            <Link to={`/tenant/${tenant.id}/bookings/create`}>
              <Plus className="size-4" />
              Create Booking
            </Link>
          </Button>
        }
      />

      <div className="glass-panel flex flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="rounded-full border border-white/80 bg-white/80 p-1 shadow-sm">
          <button
            className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${viewMode === "list" ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md" : "text-muted-foreground hover:text-foreground"}`}
            onClick={() => setViewMode("list")}
            type="button"
          >
            List
          </button>
          <button
            className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${viewMode === "pipeline" ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md" : "text-muted-foreground hover:text-foreground"}`}
            onClick={() => setViewMode("pipeline")}
            type="button"
          >
            Pipeline
          </button>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Badge variant="accent">{filteredBookings.length} bookings</Badge>
          <span>Click a row or card to open booking</span>
        </div>
      </div>

      {viewMode === "list" ? (
        <div className="space-y-4">
          <TenantFilterBar
            searchValue={search}
            searchPlaceholder="Search booking, customer, lane, vehicle, or driver"
            onSearchChange={setSearch}
            filters={
              <>
                <Select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                  <option value="all">All statuses</option>
                  {Array.from(new Set(bookings.map((booking) => booking.status))).map((status) => (
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

          <DataTable
            title="Bookings"
            description="Entire row is clickable."
            headers={["Booking ID", "Customer", "Lane", "Status", "Vehicle", "Driver", "Date"]}
            rows={filteredBookings.map((booking) => {
              const customer = customerMap.get(booking.customerId);
              const source = addressMap.get(booking.sourceAddressId);
              const destination = addressMap.get(booking.destinationAddressId);
              const driver = booking.assignment?.driverId ? driverMap.get(booking.assignment.driverId) : null;

              return [
                <span key={`${booking.id}-id`} className="font-semibold">{booking.bookingId}</span>,
                customer?.name ?? "Unknown customer",
                `${source?.city ?? source?.addressName ?? "Origin"} → ${destination?.city ?? destination?.addressName ?? "Destination"}`,
                <BookingStatusBadge key={`${booking.id}-status`} status={booking.status} />,
                booking.assignment?.vehicleLabel ?? "Unassigned",
                booking.assignment?.driverName ?? driver?.name ?? "Unassigned",
                new Date(booking.createdAt).toLocaleDateString(),
              ];
            })}
            onRowClick={(rowIndex) => openBooking(filteredBookings[rowIndex].id)}
            emptyMessage="No bookings found."
          />
        </div>
      ) : (
        <div className="glass-panel overflow-x-auto p-3">
          <div className="grid min-w-[1320px] grid-cols-7 gap-3">
            {pipelineGroups.map((column) => (
              <div key={column.key} className={`min-h-[420px] rounded-[28px] border p-3 ${getPipelineColumnClass(column.key)}`}>
                <button
                  type="button"
                  className="flex w-full items-start justify-between gap-3 rounded-2xl text-left transition hover:bg-white/45"
                  onClick={() => {
                    setStatusFilter(column.statuses[0] ?? "all");
                    setViewMode("list");
                  }}
                >
                  <div>
                    <p className="text-sm font-semibold">{column.label}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{column.bookings.length} bookings</p>
                  </div>
                  <Badge variant="outline">Rs {column.totalFreight.toLocaleString()}</Badge>
                </button>
                <div className="mt-3 space-y-2.5">
                  {column.bookings.length ? (
                    column.bookings.map((booking) => (
                      <PipelineCard
                        key={booking.id}
                        booking={booking}
                        customerName={customerMap.get(booking.customerId)?.name ?? "Unknown customer"}
                        onClick={() => openBooking(booking.id)}
                      />
                    ))
                  ) : (
                    <div className="rounded-2xl border border-dashed bg-white/45 px-3 py-6 text-center text-xs text-muted-foreground">
                      No bookings
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PipelineCard({
  booking,
  customerName,
  onClick,
}: {
  booking: BookingRecord;
  customerName: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="block w-full rounded-[24px] border border-white/85 bg-gradient-to-br from-white via-sky-100/80 to-indigo-100/80 p-4 text-left shadow-[0_14px_36px_rgba(59,130,246,0.12)] transition duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-[0_24px_54px_rgba(79,70,229,0.18)]"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">{booking.bookingId}</p>
          <p className="mt-1 text-xs text-muted-foreground">{customerName}</p>
        </div>
        <BookingStatusBadge status={booking.status} />
      </div>
      <div className="mt-3 space-y-1.5 text-xs text-muted-foreground">
        <div className="flex items-center justify-between gap-3">
          <span>Commercial</span>
          <span className="font-medium text-foreground">{booking.commercialType}</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span>Vehicle</span>
          <span className="font-medium text-foreground">{booking.assignment?.vehicleLabel ?? "Pending"}</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span>Date</span>
          <span className="font-medium text-foreground">{new Date(booking.createdAt).toLocaleDateString()}</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span>Value</span>
          <span className="font-medium text-foreground">Rs {booking.pricing.calculatedFreight.toLocaleString()}</span>
        </div>
      </div>
    </button>
  );
}

function getPipelineColumnClass(columnKey: string) {
  switch (columnKey) {
    case "draft":
      return "bg-gradient-to-b from-slate-100/95 to-blue-50/70";
    case "approval":
      return "bg-gradient-to-b from-amber-100/95 to-orange-50/75";
    case "assignment":
      return "bg-gradient-to-b from-sky-100/95 to-cyan-50/75";
    case "assigned":
      return "bg-gradient-to-b from-indigo-100/95 to-violet-50/75";
    case "transit":
      return "bg-gradient-to-b from-cyan-100/95 to-blue-50/75";
    case "completed":
      return "bg-gradient-to-b from-emerald-100/95 to-lime-50/75";
    case "cancelled":
      return "bg-gradient-to-b from-rose-100/95 to-pink-50/75";
    default:
      return "bg-background/95";
  }
}
