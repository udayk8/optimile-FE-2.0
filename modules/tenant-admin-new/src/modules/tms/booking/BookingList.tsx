import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowRight, ChevronLeft, ChevronRight, MapPin, Plus } from "lucide-react";
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
  buildMaterialLookup,
} from "@/modules/tms/booking/services/booking-selectors";
import { areAllDeliveryPodsCaptured, getPrimaryBookingStatus } from "@/modules/tms/booking/services/booking-engine";
import type { BookingRecord, BookingSource, BookingStatus } from "@/modules/tms/booking/types";
import type { TenantCustomerAddress } from "@/types/customer";

const pipelineColumns: Array<{
  key: string;
  label: string;
  statuses: BookingStatus[];
}> = [
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

// Default operational stages shown on the dashboard. Users can add/remove via
// the "Customize" selector; the choice persists per tenant in localStorage.
const DEFAULT_VISIBLE_KEYS = ["assignment", "transit", "pod", "completed"] as const;

// Map URL ?pipeline= slugs to internal keys so /bookings?pipeline=in-transit
// and /bookings?pipeline=pod-pending land on the right column.
const URL_SLUG_TO_KEY: Record<string, string> = {
  "assignment": "assignment",
  "in-transit": "transit",
  "transit": "transit",
  "pod-pending": "pod",
  "pod": "pod",
  "rate-approval": "approval",
  "approval": "approval",
  "draft": "draft",
  "erp": "erp",
  "completed": "completed",
  "invoiced": "invoiced",
  "exception": "exception",
  "cancelled": "cancelled",
};
const KEY_TO_URL_SLUG: Record<string, string> = {
  assignment: "assignment",
  transit: "in-transit",
  pod: "pod-pending",
  approval: "rate-approval",
  draft: "draft",
  erp: "erp",
  completed: "completed",
  invoiced: "invoiced",
  exception: "exception",
  cancelled: "cancelled",
};

const PAGE_SIZE = 8;

export function BookingListPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { tenant } = useTenantRouteContext();
  const access = useTenantAccess();
  const canCreateBooking = access.hasFeaturePermission("TMS", "CREATE_BOOKING", "create");

  // Redirect ERP pipeline URL to the dedicated ERP Bookings page so users
  // who bookmark /bookings?pipeline=erp land on the right screen.
  const pipelineParam = searchParams.get("pipeline");
  if (pipelineParam === "erp") {
    navigate(`/tenant/${tenant.id}/bookings/erp`, { replace: true });
    return null;
  }
  const { data: bookings } = useTenantBookings(tenant.id);
  const adminSources = useBookingAdminSources(tenant.id);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [customerFilter, setCustomerFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // URL slug → internal key (falls through to first default if missing/unknown).
  const initialSelectedKey = (() => {
    const slug = searchParams.get("pipeline");
    if (!slug) return DEFAULT_VISIBLE_KEYS[0];
    return URL_SLUG_TO_KEY[slug] ?? DEFAULT_VISIBLE_KEYS[0];
  })();
  const [selectedPipelineKey, setSelectedPipelineKey] = useState(initialSelectedKey);

  // Visible pipeline chips, persisted per tenant in localStorage. Default
  // to Assignment + In Transit per the operational spec. If the URL is
  // pointing at a state outside the saved selection we include it so the
  // requested column is always visible.
  const visiblePipelinesStorageKey = `optimile.tenant.${tenant.id}.bookings.visiblePipelines`;
  const [visiblePipelineKeys, setVisiblePipelineKeys] = useState<string[]>(() => {
    if (typeof window === "undefined") return [...DEFAULT_VISIBLE_KEYS];
    try {
      const raw = window.localStorage.getItem(visiblePipelinesStorageKey);
      const parsed = raw ? (JSON.parse(raw) as unknown) : null;
      if (Array.isArray(parsed) && parsed.every((k) => typeof k === "string")) {
        return parsed as string[];
      }
    } catch {
      // fall through to defaults
    }
    return [...DEFAULT_VISIBLE_KEYS];
  });

  // Always include the URL-pointed pipeline in the visible set so the
  // requested view never appears hidden after a redirect.
  useEffect(() => {
    if (!visiblePipelineKeys.includes(selectedPipelineKey)) {
      setVisiblePipelineKeys((current) => [...current, selectedPipelineKey]);
    }
  }, [selectedPipelineKey, visiblePipelineKeys]);

  // Persist chip selection.
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(visiblePipelinesStorageKey, JSON.stringify(visiblePipelineKeys));
    } catch {
      // localStorage may be unavailable in some sessions — silently ignore.
    }
  }, [visiblePipelineKeys, visiblePipelinesStorageKey]);

  const [currentPage, setCurrentPage] = useState(1);

  const customerMap = useMemo(() => buildCustomerLookup(adminSources.customers), [adminSources.customers]);
  const addressMap = useMemo(
    () => buildAddressLookup(Array.from(adminSources.customerAddressMap.values()).flat()),
    [adminSources.customerAddressMap],
  );
  const driverMap = useMemo(() => buildDriverLookup(adminSources.drivers), [adminSources.drivers]);
  const materialMap = useMemo(() => buildMaterialLookup(adminSources.materials), [adminSources.materials]);

  // "view=full" means the user clicked View All on a state card and wants
  // the dedicated, paginated single-state page (no pipeline row). Anything
  // else (default) shows the dashboard with pipeline cards + a top-10 list.
  const isFullView = searchParams.get("view") === "full";

  // Sync ?pipeline= to the selected key (slug form).
  useEffect(() => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      const slug = KEY_TO_URL_SLUG[selectedPipelineKey];
      if (slug) {
        next.set("pipeline", slug);
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
      if (sourceFilter !== "all" && (booking.bookingSource ?? "WEB") !== sourceFilter) {
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
  }, [addressMap, bookings, customerFilter, customerMap, dateFrom, dateTo, search, sourceFilter]);

  const pipelineGroups = useMemo(
    () =>
      pipelineColumns.map((column) => {
        const columnBookings = baseFilteredBookings
          .filter((booking) =>
            column.key === "erp"
              ? booking.bookingSource === "ERP"
              : column.statuses.includes(getPrimaryBookingStatus(booking.status)),
          )
          .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());

        return {
          ...column,
          bookings: columnBookings,
          previewBookings: columnBookings.slice(0, 4),
          totalFreight: columnBookings.reduce((sum, booking) => sum + booking.pricing.calculatedFreight, 0),
        };
      }),
    [baseFilteredBookings],
  );

  const visiblePipelineGroups = useMemo(
    () => pipelineGroups.filter((group) => visiblePipelineKeys.includes(group.key)),
    [pipelineGroups, visiblePipelineKeys],
  );

  const activePipelineGroup =
    pipelineGroups.find((column) => column.key === selectedPipelineKey) ??
    visiblePipelineGroups[0] ??
    pipelineGroups.find((column) => column.key === "assignment") ??
    pipelineGroups[0];

  const listBookings = useMemo(() => {
    // Dashboard mode (view !== "full"): show up to 10 most recent bookings
    // across every visible pipeline column. Full mode: scope to the
    // focused pipeline only and paginate it. Status filter still applies.
    let source: BookingRecord[];
    if (isFullView) {
      source = activePipelineGroup?.bookings ?? [];
    } else {
      const visibleSet = new Set(
        visiblePipelineGroups.flatMap((group) => group.bookings.map((booking) => booking.id)),
      );
      source = baseFilteredBookings
        .filter((booking) => visibleSet.has(booking.id))
        .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
    }
    const filtered = statusFilter === "all"
      ? source
      : source.filter((booking) => booking.status === statusFilter);
    return isFullView ? filtered : filtered.slice(0, 10);
  }, [activePipelineGroup, baseFilteredBookings, isFullView, statusFilter, visiblePipelineGroups]);

  const totalPages = Math.max(1, Math.ceil(listBookings.length / PAGE_SIZE));
  const pagedBookings = useMemo(
    () => listBookings.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [currentPage, listBookings],
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, customerFilter, sourceFilter, dateFrom, dateTo, selectedPipelineKey]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  function openBooking(bookingId: string) {
    navigate(`/tenant/${tenant.id}/bookings/${bookingId}`);
  }

  // Track-and-Trace: open the trip for this booking number (booking-wise).
  function openTrack(bookingNo: string) {
    navigate(`/tenant/${tenant.id}/track-and-trace/trips/${encodeURIComponent(bookingNo)}`);
  }

  function togglePipelineKey(key: string) {
    setVisiblePipelineKeys((current) => {
      if (current.includes(key)) {
        // Don't allow removing the currently focused column — switch focus
        // to whichever chip remains visible first.
        if (key === selectedPipelineKey) {
          const remaining = current.filter((k) => k !== key);
          const nextFocus = remaining[0] ?? DEFAULT_VISIBLE_KEYS[0];
          if (nextFocus) setSelectedPipelineKey(nextFocus);
          return remaining.length ? remaining : [...DEFAULT_VISIBLE_KEYS];
        }
        return current.filter((k) => k !== key);
      }
      return [...current, key];
    });
  }

  function emptyMessageForPipeline(key: string): { title: string; description: string } {
    switch (key) {
      case "assignment":
        return { title: "No bookings in Assignment", description: "All pending assignments are clear." };
      case "transit":
        return { title: "No bookings in In Transit", description: "No active trips currently in movement." };
      case "pod":
        return { title: "No bookings in POD Pending", description: "All deliveries have POD captured." };
      case "approval":
        return { title: "No bookings in Rate Approval", description: "No rates waiting for approval." };
      case "draft":
        return { title: "No drafts", description: "No bookings sit in draft state." };
      case "exception":
        return { title: "No exceptions", description: "No bookings flagged as exceptions." };
      case "cancelled":
        return { title: "No cancellations", description: "No bookings cancelled in this window." };
      case "completed":
        return { title: "No completed bookings", description: "Nothing has hit Completed yet." };
      case "invoiced":
        return { title: "No invoiced bookings", description: "No bookings have been invoiced yet." };
      case "erp":
        return { title: "No ERP bookings", description: "No ERP-sourced bookings to show." };
      default:
        return { title: "No bookings", description: "Nothing to show in this state." };
    }
  }

  return (
    <div className="space-y-2">
      {/* Single-line top bar — title + (selector or back) + Create. Saves
          vertical space versus stacking each strip on its own row. The
          "TMS" eyebrow is dropped because the tenant shell already shows
          the breadcrumb. */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-[14px] font-semibold text-slate-900">Booking Workspace</h1>
          {isFullView && activePipelineGroup ? (
            <>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-[12px]"
                onClick={() => {
                  setSearchParams((current) => {
                    const next = new URLSearchParams(current);
                    next.delete("view");
                    return next;
                  });
                }}
              >
                ← Back
              </Button>
              <span className="text-[12px] text-slate-600">
                <span className="font-semibold text-slate-900">{activePipelineGroup.label}</span>
                {" · "}{activePipelineGroup.bookings.length}{" "}
                {activePipelineGroup.bookings.length === 1 ? "booking" : "bookings"}
                {activePipelineGroup.totalFreight ? <> · {formatCurrency(activePipelineGroup.totalFreight)}</> : null}
              </span>
            </>
          ) : (
            <PipelineSelector
              columns={pipelineColumns}
              visibleKeys={visiblePipelineKeys}
              onToggle={togglePipelineKey}
            />
          )}
        </div>
        <div className="flex items-center gap-2">
          {canCreateBooking ? (
            <Button asChild size="sm" variant="outline">
              <Link to={`/tenant/${tenant.id}/bookings/erp`}>
                ERP Orders →
              </Link>
            </Button>
          ) : null}
          {canCreateBooking ? (
            <Button asChild size="sm">
              <Link to={`/tenant/${tenant.id}/bookings/create`}>
                <Plus className="size-4" />
                Create Booking
              </Link>
            </Button>
          ) : (
            <span title="Permission not granted — ask your Tenant Admin to enable Create Booking" className="inline-block">
              <Button size="sm" disabled aria-disabled="true">
                <Plus className="size-4" />
                Create Booking
              </Button>
            </span>
          )}
        </div>
      </div>

      {/* Horizontal sliding pipeline board. Idle cards = soft slate border;
          selected card = slate-400 border + slate-50 inner tint + subtle
          shadow. No dark/black accents anywhere. */}
      {!isFullView ? (
        visiblePipelineGroups.length ? (
          <div className="-mx-1 overflow-x-auto pb-2 pl-1">
            <div className="flex min-w-max gap-2">
              {visiblePipelineGroups.map((column) => {
                const isActive = selectedPipelineKey === column.key;
                const tone = getPipelineTone(column.key);
                return (
                  <div
                    key={column.key}
                    className={`flex h-[156px] w-[230px] shrink-0 flex-col overflow-hidden rounded-xl border bg-white shadow-sm transition ${
                      isActive ? `border-transparent ring-2 ${tone.ring}` : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        if (column.key === "erp") {
                          navigate(`/tenant/${tenant.id}/bookings/erp`);
                          return;
                        }
                        setSelectedPipelineKey(column.key);
                        setStatusFilter("all");
                      }}
                      className={`flex items-center justify-between gap-2 px-3 py-2 text-left ${tone.cardBg}`}
                    >
                      <span className={`truncate text-[13px] font-semibold ${tone.headline}`}>{column.label}</span>
                      <span className={`inline-flex h-5 min-w-[22px] items-center justify-center rounded-full px-1.5 text-[11px] font-bold ${tone.countChip}`}>
                        {column.bookings.length}
                      </span>
                    </button>

                    <div className="flex-1 space-y-1 overflow-y-auto px-2.5 py-2">
                      <p className={`text-[12px] font-bold ${tone.headline}`}>{column.totalFreight ? formatCurrency(column.totalFreight) : "—"}</p>
                      {column.previewBookings.length ? (
                        column.previewBookings.slice(0, 2).map((booking) => (
                          <button
                            key={booking.id}
                            type="button"
                            onClick={() => openBooking(booking.id)}
                            className="flex w-full items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white px-2 py-1 text-left transition hover:bg-gray-50"
                          >
                            <div className="min-w-0">
                              <p className="truncate text-[11px] font-semibold text-gray-800">{booking.bookingId}</p>
                              <p className="truncate text-[10px] text-gray-500">
                                {customerMap.get(booking.customerId)?.name ?? "Unknown customer"}
                              </p>
                            </div>
                            <ArrowRight className="size-3 shrink-0 text-gray-400" />
                          </button>
                        ))
                      ) : (
                        <p className="px-1 py-0.5 text-[11px] text-gray-400">No bookings</p>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        if (column.key === "erp") {
                          navigate(`/tenant/${tenant.id}/bookings/erp`);
                          return;
                        }
                        setSelectedPipelineKey(column.key);
                        setStatusFilter("all");
                        setSearchParams((current) => {
                          const next = new URLSearchParams(current);
                          next.set("pipeline", KEY_TO_URL_SLUG[column.key] ?? column.key);
                          next.set("view", "full");
                          return next;
                        });
                      }}
                      className={`py-1.5 text-[11px] font-semibold transition ${isActive ? tone.viewAllActive : tone.viewAll}`}
                    >
                      View All →
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="rounded-md border border-dashed bg-slate-50/40 px-4 py-3 text-center text-[12px] text-slate-500">
            Pick at least one pipeline stage above to see its column.
          </div>
        )
      ) : null}

      {/* Single-line filter strip — soft slate border + subtle shadow so it
          doesn't blend into the page bg. */}
      <div className="flex flex-wrap items-center gap-2 rounded-md border border-slate-200 bg-white px-2 py-1.5 shadow-sm">
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search booking ID or customer"
          className="h-8 min-w-[180px] flex-1 text-[12px]"
        />
        <Select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          className="h-8 w-auto min-w-[120px] text-[12px]"
        >
          <option value="all">All statuses</option>
          {Array.from(new Set((activePipelineGroup?.bookings ?? []).map((booking) => booking.status))).map((status) => (
            <option key={status} value={status}>
              {status.replace(/_/g, " ")}
            </option>
          ))}
        </Select>
        <Select
          value={customerFilter}
          onChange={(event) => setCustomerFilter(event.target.value)}
          className="h-8 w-auto min-w-[120px] text-[12px]"
        >
          <option value="all">All customers</option>
          {adminSources.customers.map((customer) => (
            <option key={customer.id} value={customer.id}>
              {customer.name}
            </option>
          ))}
        </Select>
        <Select
          value={sourceFilter}
          onChange={(event) => setSourceFilter(event.target.value)}
          className="h-8 w-auto min-w-[100px] text-[12px]"
        >
          <option value="all">All sources</option>
          <option value="WEB">Web</option>
          <option value="MOBILE">Mobile</option>
          <option value="ERP">ERP</option>
        </Select>
        <Input
          type="date"
          value={dateFrom}
          onChange={(event) => setDateFrom(event.target.value)}
          className="h-8 w-auto min-w-[130px] text-[12px]"
        />
        <Input
          type="date"
          value={dateTo}
          onChange={(event) => setDateTo(event.target.value)}
          className="h-8 w-auto min-w-[130px] text-[12px]"
        />
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            setSearch("");
            setStatusFilter("all");
            setCustomerFilter("all");
            setSourceFilter("all");
            setDateFrom("");
            setDateTo("");
          }}
          className="h-8 text-[12px]"
        >
          Clear
        </Button>
      </div>

      {/* Bookings list — dashboard mode shows top 10 across visible
          pipelines (no pagination), full-view mode shows the focused
          state's full list paginated. Header lives in the top bar now;
          this panel only needs a count line + page indicator. */}
      <div className="rounded-md border border-slate-200 bg-white p-2 shadow-sm">
        <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-2 text-[12px]">
          <p className="text-slate-700">
            <span className="font-semibold text-slate-900">
              {isFullView ? `${activePipelineGroup?.label ?? "Bookings"} — full list` : "Recent bookings"}
            </span>
            <span className="ml-2 text-slate-500">
              {listBookings.length} {listBookings.length === 1 ? "booking" : "bookings"}
              {isFullView
                ? <> · {formatCurrency(activePipelineGroup?.totalFreight ?? 0)}</>
                : <> · top {Math.min(10, listBookings.length)} across visible stages</>}
            </span>
          </p>
          {isFullView ? (
            <Badge variant="outline">Page {currentPage} / {totalPages}</Badge>
          ) : null}
        </div>

        <div className={`mt-2 ${isFullView ? "max-h-[60vh] overflow-y-auto pr-1" : ""}`}>
          {(isFullView ? pagedBookings : listBookings).length ? (
            <div className="space-y-2">
              {(isFullView ? pagedBookings : listBookings).map((booking) => (
                <BookingSummaryRow
                  key={booking.id}
                  booking={booking}
                  customerName={customerMap.get(booking.customerId)?.name ?? "Unknown customer"}
                  firstOriginLabel={getFirstOriginLabel(booking, addressMap)}
                  lastDestinationLabel={getLastDestinationLabel(booking, addressMap)}
                  materialSummary={getMaterialSummary(booking, materialMap)}
                  vehicleLabel={booking.assignment?.vehicleLabel ?? "Pending vehicle"}
                  driverName={booking.assignment?.driverName ?? (booking.assignment?.driverId ? driverMap.get(booking.assignment.driverId)?.name ?? "Unassigned" : "Unassigned")}
                  lrNumbersLabel={getLrNumbersLabel(booking)}
                  onOpen={() => openBooking(booking.id)}
                  onTrack={() => openTrack(booking.bookingId)}
                  onInvoice={() => navigate(`/tenant/${tenant.id}/finance/invoicing`)}
                  showActions={isFullView}
                />
              ))}
            </div>
          ) : (
            (() => {
              const empty = isFullView
                ? emptyMessageForPipeline(activePipelineGroup?.key ?? "")
                : { title: "No bookings to show", description: "All visible pipelines are empty for the current filters." };
              return (
                <div className="rounded-md border border-dashed bg-slate-50/40 px-4 py-8 text-center">
                  <p className="text-[13px] font-semibold text-slate-800">{empty.title}</p>
                  <p className="mt-1 text-[12px] text-slate-600">{empty.description}</p>
                </div>
              );
            })()
          )}
        </div>

        {isFullView ? (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-3 text-[12px]">
            <p className="text-slate-600">
              Showing {pagedBookings.length ? (currentPage - 1) * PAGE_SIZE + 1 : 0}-
              {Math.min(currentPage * PAGE_SIZE, listBookings.length)} of {listBookings.length}
            </p>
            <div className="flex items-center gap-1">
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
        ) : null}
      </div>
    </div>
  );
}

function PipelineSelector({
  columns,
  visibleKeys,
  onToggle,
}: {
  columns: Array<{ key: string; label: string }>;
  visibleKeys: string[];
  onToggle: (key: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex flex-wrap items-center gap-2 text-[12px] text-slate-700">
      <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
        Visible Pipeline Stages
      </span>
      <span className="text-slate-500">
        {visibleKeys.length} of {columns.length}
      </span>
      <div className="relative">
        <Button size="sm" variant="outline" onClick={() => setOpen((value) => !value)}>
          Customize
        </Button>
        {open ? (
          <>
            {/* Click-away overlay */}
            <button
              type="button"
              aria-label="Close pipeline selector"
              className="fixed inset-0 z-10 cursor-default bg-transparent"
              onClick={() => setOpen(false)}
            />
            <div className="absolute left-0 top-full z-20 mt-1 w-[240px] rounded-md border bg-white p-2 shadow-lg">
              <p className="px-1 pb-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                Pipeline stages
              </p>
              <div className="flex max-h-[280px] flex-col gap-0.5 overflow-y-auto">
                {columns.map((column) => {
                  const active = visibleKeys.includes(column.key);
                  return (
                    <label
                      key={column.key}
                      className="flex cursor-pointer items-center justify-between gap-2 rounded px-2 py-1.5 text-[12px] text-slate-700 hover:bg-slate-50"
                    >
                      <span>{column.label}</span>
                      <input
                        type="checkbox"
                        checked={active}
                        onChange={() => onToggle(column.key)}
                        className="size-3.5 accent-slate-900"
                      />
                    </label>
                  );
                })}
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}

function BookingSummaryRow({
  booking,
  customerName,
  firstOriginLabel,
  lastDestinationLabel,
  materialSummary,
  vehicleLabel,
  driverName,
  lrNumbersLabel,
  onOpen,
  onTrack,
  onInvoice,
  showActions = false,
}: {
  booking: BookingRecord;
  customerName: string;
  firstOriginLabel: string;
  lastDestinationLabel: string;
  materialSummary: string;
  vehicleLabel: string;
  driverName: string;
  lrNumbersLabel: string;
  onOpen: () => void;
  onTrack: () => void;
  onInvoice?: () => void;
  showActions?: boolean;
}) {
  const primaryStatus = getPrimaryBookingStatus(booking.status);
  const rowAction = (label: string, handler: () => void, tone: string) => (
    <span
      role="button"
      tabIndex={0}
      onClick={(event) => { event.stopPropagation(); handler(); }}
      onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); event.stopPropagation(); handler(); } }}
      className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-semibold transition ${tone}`}
    >
      {label}
    </span>
  );
  const hasRevisionPending = (booking.destinationChangeRequests ?? []).some((request) =>
    ["SUBMITTED", "UNDER_REVIEW", "APPROVED"].includes(request.status),
  );
  const isRevised = (booking.deliveries ?? []).some((delivery) => (delivery.revisions?.length ?? 0) > 0);
  return (
    <button
      type="button"
      onClick={onOpen}
      className={`grid w-full gap-2 rounded-md border px-3 py-2 text-left text-[12px] transition hover:border-slate-400 hover:bg-slate-50 lg:grid-cols-[140px_minmax(0,1.3fr)_minmax(0,1fr)_120px_110px_auto] ${
        hasRevisionPending || isRevised ? "border-amber-300 bg-amber-50/60" : "border-slate-200 bg-white"
      }`}
    >
      <div className="min-w-0">
        <p className="truncate text-[12px] font-semibold text-slate-900">{booking.bookingId}</p>
        <p className="mt-0.5 truncate text-[10.5px] text-slate-500">{new Date(booking.createdAt).toLocaleDateString()}</p>
        <div className="mt-0.5 flex flex-wrap gap-1">
          {hasRevisionPending ? <Badge variant="warning">EDITED</Badge> : null}
          {!hasRevisionPending && isRevised ? <Badge variant="accent">REVISED</Badge> : null}
          {booking.bookingSource ? <BookingSourceBadge source={booking.bookingSource} /> : null}
        </div>
      </div>

      <div className="min-w-0">
        <p className="truncate text-[12px] font-semibold text-slate-900">{customerName}</p>
        <p className="mt-0.5 truncate text-[11px] text-slate-700">
          {firstOriginLabel} <span className="text-slate-400">→</span> {lastDestinationLabel}
        </p>
        {materialSummary ? (
          <p className="mt-0.5 truncate text-[10.5px] text-slate-500">{materialSummary}</p>
        ) : null}
      </div>

      <div className="min-w-0">
        <p className="truncate text-[12px] text-slate-900"><span className="text-slate-400">Vehicle:</span> <span className="font-semibold">{vehicleLabel}</span></p>
        {lrNumbersLabel ? (
          <p className="truncate text-[11px] text-slate-700"><span className="text-slate-400">LR:</span> {lrNumbersLabel}</p>
        ) : null}
        <p className="mt-0.5 truncate text-[10.5px] text-slate-500"><span className="text-slate-400">Driver:</span> {driverName}</p>
      </div>

      <div className="min-w-0">
        <p className="text-[12px] font-semibold text-slate-900">{formatCurrency(booking.pricing.calculatedFreight)}</p>
        <p className="mt-0.5 text-[10.5px] text-slate-500">{getDeliveryProgressLabel(booking)}</p>
      </div>

      <div className="flex items-center lg:justify-center">
        {booking.status === "POD_PENDING" && areAllDeliveryPodsCaptured(booking.deliveries) ? (
          <Badge variant="success">POD UPLOADED</Badge>
        ) : (
          <BookingStatusBadge status={booking.status} />
        )}
      </div>

      <div className="flex flex-wrap items-center justify-end gap-1.5">
        {booking.status === "IN_TRANSIT" ? (
          // Non-button (row is itself a <button>): avoids invalid nested buttons.
          rowAction(
            "Track",
            onTrack,
            "border-sky-200 bg-sky-50 text-sky-700 hover:border-sky-300 hover:bg-sky-100",
          )
        ) : null}
        {showActions && primaryStatus === "PENDING_ASSIGNMENT"
          ? rowAction("Assign", onOpen, "border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100")
          : null}
        {showActions && primaryStatus === "POD_PENDING"
          ? areAllDeliveryPodsCaptured(booking.deliveries)
            ? rowAction("Move To Completed", onOpen, "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100")
            : rowAction("Upload POD", onOpen, "border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100")
          : null}
        {showActions && primaryStatus === "COMPLETED" && onInvoice
          ? rowAction("Create Invoice", onInvoice, "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100")
          : null}
        <ArrowRight className="size-4 text-slate-400" />
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

// First leg origin — the booking's own sourceAddressId, falling back to
// the first delivery's origin city if the address isn't in the lookup.
function getFirstOriginLabel(booking: BookingRecord, addressMap: Map<string, TenantCustomerAddress>) {
  const direct = addressMap.get(booking.sourceAddressId);
  if (direct?.city) return direct.city;
  if (direct?.addressName) return direct.addressName;
  const firstDelivery = booking.deliveries?.[0];
  return (
    addressMap.get(firstDelivery?.originAddressId ?? "")?.city
    ?? addressMap.get(firstDelivery?.originAddressId ?? "")?.addressName
    ?? firstDelivery?.originCity
    ?? "—"
  );
}

// Last leg destination — last delivery's destination, falling back to the
// booking-level destination address.
function getLastDestinationLabel(booking: BookingRecord, addressMap: Map<string, TenantCustomerAddress>) {
  const deliveries = booking.deliveries ?? [];
  const lastDelivery = deliveries[deliveries.length - 1] ?? null;
  if (lastDelivery) {
    return (
      addressMap.get(lastDelivery.destinationAddressId ?? "")?.city
      ?? addressMap.get(lastDelivery.destinationAddressId ?? "")?.addressName
      ?? lastDelivery.destinationCity
      ?? "—"
    );
  }
  const direct = addressMap.get(booking.destinationAddressId);
  return direct?.city ?? direct?.addressName ?? "—";
}

// Distinct materials across all deliveries. "CEMENT" / "CEMENT, STEEL" /
// "3 materials" once it gets long, so the row stays tidy.
function getMaterialSummary(booking: BookingRecord, materialMap: Map<string, { materialCode: string; name?: string }>) {
  const codes = new Set<string>();
  (booking.deliveries ?? []).forEach((delivery) => {
    if (!delivery.materialId) return;
    const material = materialMap.get(delivery.materialId);
    if (material?.materialCode) codes.add(material.materialCode);
    else if (material?.name) codes.add(material.name);
  });
  (booking.materialIds ?? []).forEach((id) => {
    const material = materialMap.get(id);
    if (material?.materialCode) codes.add(material.materialCode);
    else if (material?.name) codes.add(material.name);
  });
  if (codes.size === 0) return "";
  if (codes.size <= 2) return Array.from(codes).join(", ");
  return `${codes.size} materials`;
}

// LR numbers — assignment-level + any delivery-level LR. Returned as a
// comma-separated string for use in "(LR-2026-001, LR-2026-002)" suffix.
function getLrNumbersLabel(booking: BookingRecord) {
  const lrs = new Set<string>();
  if (booking.assignment?.lrNumber) lrs.add(booking.assignment.lrNumber);
  (booking.deliveries ?? []).forEach((delivery) => {
    if (delivery.lrNumber) lrs.add(delivery.lrNumber);
  });
  if (lrs.size === 0) return "";
  if (lrs.size <= 2) return Array.from(lrs).join(", ");
  return `${lrs.size} LRs`;
}

// Standard per-pipeline colour palette. Soft tinted card + matching count
// chip + ring colour for the active state, with two variants for the
// View-All button (active vs idle). One tone per pipeline key keeps the
// dashboard readable at a glance.
function getPipelineTone(key: string) {
  switch (key) {
    case "draft":
      return {
        cardBg: "bg-slate-50",
        headline: "text-slate-700",
        countChip: "bg-slate-200 text-slate-700",
        ring: "ring-slate-300",
        viewAll: "border border-slate-200 bg-white text-slate-700 hover:bg-slate-100",
        viewAllActive: "bg-slate-900 text-white",
      };
    case "approval":
      return {
        cardBg: "bg-amber-50",
        headline: "text-amber-800",
        countChip: "bg-amber-200 text-amber-900",
        ring: "ring-amber-300",
        viewAll: "border border-amber-200 bg-white text-amber-800 hover:bg-amber-100",
        viewAllActive: "bg-amber-600 text-white",
      };
    case "assignment":
      return {
        cardBg: "bg-sky-50",
        headline: "text-sky-800",
        countChip: "bg-sky-200 text-sky-900",
        ring: "ring-sky-300",
        viewAll: "border border-sky-200 bg-white text-sky-800 hover:bg-sky-100",
        viewAllActive: "bg-sky-600 text-white",
      };
    case "transit":
      return {
        cardBg: "bg-indigo-50",
        headline: "text-indigo-800",
        countChip: "bg-indigo-200 text-indigo-900",
        ring: "ring-indigo-300",
        viewAll: "border border-indigo-200 bg-white text-indigo-800 hover:bg-indigo-100",
        viewAllActive: "bg-indigo-600 text-white",
      };
    case "pod":
      return {
        cardBg: "bg-violet-50",
        headline: "text-violet-800",
        countChip: "bg-violet-200 text-violet-900",
        ring: "ring-violet-300",
        viewAll: "border border-violet-200 bg-white text-violet-800 hover:bg-violet-100",
        viewAllActive: "bg-violet-600 text-white",
      };
    case "completed":
      return {
        cardBg: "bg-emerald-50",
        headline: "text-emerald-800",
        countChip: "bg-emerald-200 text-emerald-900",
        ring: "ring-emerald-300",
        viewAll: "border border-emerald-200 bg-white text-emerald-800 hover:bg-emerald-100",
        viewAllActive: "bg-emerald-600 text-white",
      };
    case "invoiced":
      return {
        cardBg: "bg-teal-50",
        headline: "text-teal-800",
        countChip: "bg-teal-200 text-teal-900",
        ring: "ring-teal-300",
        viewAll: "border border-teal-200 bg-white text-teal-800 hover:bg-teal-100",
        viewAllActive: "bg-teal-600 text-white",
      };
    case "exception":
      return {
        cardBg: "bg-rose-50",
        headline: "text-rose-800",
        countChip: "bg-rose-200 text-rose-900",
        ring: "ring-rose-300",
        viewAll: "border border-rose-200 bg-white text-rose-800 hover:bg-rose-100",
        viewAllActive: "bg-rose-600 text-white",
      };
    case "cancelled":
      return {
        cardBg: "bg-zinc-100",
        headline: "text-zinc-700",
        countChip: "bg-zinc-300 text-zinc-800",
        ring: "ring-zinc-400",
        viewAll: "border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100",
        viewAllActive: "bg-zinc-700 text-white",
      };
    case "erp":
      return {
        cardBg: "bg-violet-50",
        headline: "text-violet-800",
        countChip: "bg-violet-200 text-violet-900",
        ring: "ring-violet-300",
        viewAll: "border border-violet-200 bg-white text-violet-800 hover:bg-violet-100",
        viewAllActive: "bg-violet-600 text-white",
      };
    default:
      return {
        cardBg: "bg-slate-50",
        headline: "text-slate-700",
        countChip: "bg-slate-200 text-slate-700",
        ring: "ring-slate-300",
        viewAll: "border border-slate-200 bg-white text-slate-700 hover:bg-slate-100",
        viewAllActive: "bg-slate-900 text-white",
      };
  }
}

function BookingSourceBadge({ source }: { source: BookingSource }) {
  if (source === "ERP") {
    return (
      <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide bg-violet-100 text-violet-700 border border-violet-200">
        ERP
      </span>
    );
  }
  if (source === "MOBILE") {
    return (
      <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide bg-sky-100 text-sky-700 border border-sky-200">
        MOBILE
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide bg-slate-100 text-slate-600 border border-slate-200">
      WEB
    </span>
  );
}
