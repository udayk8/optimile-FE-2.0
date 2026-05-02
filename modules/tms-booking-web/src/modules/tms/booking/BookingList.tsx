import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Plus } from "lucide-react";
import { DataTable } from "../../../components/common/data-table";
import { PageHeader } from "../../../components/common/page-header";
import { TenantFilterBar } from "../../../components/tenant/tenant-primitives";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Select } from "../../../components/ui/select";
import { useTenantRouteContext } from "../../../hooks/useTenantRouteContext";
import { useBookingPaths } from "../../../hooks/useBookingPaths";
import { BookingStatusBadge } from "./components/BookingStatusBadge";
import { useBookingAdminSources } from "./hooks/useBookingAdminSources";
import { useTenantBookings } from "./hooks/useTenantBookings";
import {
  buildAddressLookup,
  buildCustomerLookup,
  buildDriverLookup,
} from "./services/booking-selectors";
import type { BookingRecord, BookingStatus } from "./types";

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

  const paths = useBookingPaths();
  const customerMap = useMemo(() => buildCustomerLookup(adminSources.customers), [adminSources.customers]);
  const addressMap = useMemo(
    () => buildAddressLookup(Array.from(adminSources.customerAddressMap.values()).flat()),
    [adminSources.customerAddressMap],
  );
  const driverMap = useMemo(() => buildDriverLookup(adminSources.drivers), [adminSources.drivers]);

  useEffect(() => {
    const currentView = searchParams.get("view");
    const currentStatus = searchParams.get("status");
    const targetStatus = statusFilter !== "all" ? statusFilter : null;
    if (currentView === viewMode && currentStatus === targetStatus) return;

    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.set("view", viewMode);
      if (statusFilter !== "all") {
        next.set("status", statusFilter);
      } else {
        next.delete("status");
      }
      return next;
    }, { replace: true });
  }, [searchParams, setSearchParams, statusFilter, viewMode]);

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
    navigate(paths.booking(bookingId));
  }

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="TMS"
        title="Booking Management"
        description="Compact list and pipeline views for fast operational scanning."
        action={
          <Button asChild>
            <Link to={paths.createBooking}>
              <Plus className="size-4" />
              Create Booking
            </Link>
          </Button>
        }
      />

      <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex rounded-xl border border-gray-200 bg-gray-50 p-1">
          <button
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${viewMode === "list" ? "bg-white text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            onClick={() => setViewMode("list")}
            type="button"
          >
            List
          </button>
          <button
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${viewMode === "pipeline" ? "bg-white text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
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
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
          <div className="grid min-w-[1260px] grid-cols-7 gap-2.5">
            {pipelineGroups.map((column) => (
              <div key={column.key} className={`flex flex-col rounded-xl border ${getPipelineColumnClass(column.key)}`}>
                {/* Column header */}
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-2 rounded-t-xl px-3 py-2.5 text-left transition hover:bg-white/60"
                  onClick={() => {
                    setStatusFilter(column.statuses[0] ?? "all");
                    setViewMode("list");
                  }}
                >
                  <span className="truncate text-[11px] font-extrabold uppercase tracking-wide text-gray-600">{column.label}</span>
                  <span className="shrink-0 rounded-full bg-white/80 px-1.5 py-0.5 text-[10px] font-bold text-gray-500 ring-1 ring-gray-200">
                    {column.bookings.length}
                  </span>
                </button>
                {/* Freight total */}
                <div className="border-b border-dashed border-gray-200/80 px-3 pb-2">
                  <span className="text-[11px] font-semibold text-gray-500">
                    ₹{column.totalFreight > 0 ? column.totalFreight.toLocaleString("en-IN") : "0"}
                  </span>
                </div>
                {/* Cards */}
                <div className="flex-1 space-y-2 p-2">
                  {column.bookings.length ? (
                    column.bookings.map((booking) => (
                      <PipelineCard
                        key={booking.id}
                        booking={booking}
                        customerName={customerMap.get(booking.customerId)?.name ?? "—"}
                        onClick={() => openBooking(booking.id)}
                      />
                    ))
                  ) : (
                    <div className="flex min-h-[80px] items-center justify-center rounded-lg border border-dashed border-gray-300/70 bg-white/50">
                      <span className="text-[11px] text-gray-400">Empty</span>
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
  const dateLabel = new Date(booking.createdAt).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
  });
  const freightLabel = booking.pricing.calculatedFreight > 0
    ? `₹${booking.pricing.calculatedFreight.toLocaleString("en-IN")}`
    : "₹0";
  const isContract = booking.commercialType === "CONTRACT";
  const vehicleLabel = booking.assignment?.vehicleLabel;

  return (
    <button
      type="button"
      onClick={onClick}
      className="group block w-full rounded-lg border border-gray-200 bg-white p-2.5 text-left shadow-sm transition hover:border-primary/40 hover:shadow-md active:scale-[0.98]"
    >
      {/* Top row: booking ID + status */}
      <div className="flex items-start justify-between gap-1.5">
        <p className="truncate text-[12px] font-bold leading-tight text-text">{booking.bookingId}</p>
        <BookingStatusBadge status={booking.status} />
      </div>

      {/* Customer */}
      <p className="mt-0.5 truncate text-[11px] text-gray-500">{customerName}</p>

      {/* Divider */}
      <div className="my-2 border-t border-gray-100" />

      {/* Bottom row: type | date | value */}
      <div className="flex items-center justify-between gap-1 text-[10px]">
        <span className={`rounded px-1.5 py-0.5 font-bold ${isContract ? "bg-blue-50 text-blue-600" : "bg-violet-50 text-violet-600"}`}>
          {isContract ? "CTR" : "SPOT"}
        </span>
        <span className="text-gray-400">{dateLabel}</span>
        <span className="font-bold text-text">{freightLabel}</span>
      </div>

      {/* Vehicle chip — only when assigned */}
      {vehicleLabel ? (
        <p className="mt-1.5 truncate rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-600">
          {vehicleLabel}
        </p>
      ) : null}
    </button>
  );
}

function getPipelineColumnClass(columnKey: string) {
  switch (columnKey) {
    case "draft":
      return "border-gray-200 bg-gray-50";
    case "approval":
      return "border-amber-200 bg-amber-50/70";
    case "assignment":
      return "border-sky-200 bg-sky-50/70";
    case "assigned":
      return "border-indigo-200 bg-indigo-50/70";
    case "transit":
      return "border-cyan-200 bg-cyan-50/70";
    case "completed":
      return "border-emerald-200 bg-emerald-50/70";
    case "cancelled":
      return "border-rose-200 bg-rose-50/70";
    default:
      return "border-gray-200 bg-white";
  }
}
