import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, Navigate, Outlet, useLocation, useNavigate, useParams } from "react-router-dom";
import { PageHeader } from "../../../components/common/page-header";
import {
  TenantEmptyState,
  TenantFilterBar,
  TenantPanel,
  TenantSummaryCard,
} from "../../../components/tenant/tenant-primitives";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Select } from "../../../components/ui/select";
import { Tabs } from "../../../components/ui/tabs";
import { Textarea } from "../../../components/ui/textarea";
import { useTenantRouteContext } from "../../../hooks/useTenantRouteContext";
import { BookingStatusBadge } from "../booking/components/BookingStatusBadge";
import { useBookingAdminSources } from "../booking/hooks/useBookingAdminSources";
import type { BookingStatus } from "../booking/types";
import type { DriverExpenseType, DriverIncidentType, DriverPodFormInput } from "./types";
import { useDriverAppStore } from "./useDriverAppStore";

const incidentTypeOptions: Array<{ value: DriverIncidentType; label: string }> = [
  { value: "BREAKDOWN", label: "Breakdown" },
  { value: "DELAY", label: "Delay" },
  { value: "DAMAGE", label: "Damage" },
  { value: "ROUTE_ISSUE", label: "Route Issue" },
];

const expenseTypeOptions: Array<{ value: DriverExpenseType; label: string }> = [
  { value: "FUEL", label: "Fuel" },
  { value: "TOLL", label: "Toll" },
  { value: "PARKING", label: "Parking" },
];

export function DriverAppLayout() {
  const location = useLocation();
  const { tenant } = useTenantRouteContext();
  const store = useDriverAppStore(tenant.id);

  if (!store.session && !location.pathname.endsWith("/driver-app/login")) {
    return <Navigate to={`/tenant/${tenant.id}/driver-app/login`} replace />;
  }

  if (store.session && (location.pathname.endsWith("/driver-app") || location.pathname.endsWith("/driver-app/login"))) {
    return <Navigate to={`/tenant/${tenant.id}/driver-app/dashboard`} replace />;
  }

  const tabs = [
    { label: "Dashboard", to: `/tenant/${tenant.id}/driver-app/dashboard` },
    { label: "My Trips", to: `/tenant/${tenant.id}/driver-app/trips` },
    { label: "Incident Center", to: `/tenant/${tenant.id}/driver-app/incidents` },
    { label: "Profile", to: `/tenant/${tenant.id}/driver-app/profile` },
  ];

  return (
    <div className="space-y-4">
      {store.session ? (
        <div className="glass-panel rounded-[28px] p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">Driver App</p>
              <p className="text-xs text-muted-foreground">
                Logged in as {store.currentDriver?.name ?? "Driver"} • Sync {store.syncStatus}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {tabs.map((tab) => (
                <Button
                  key={tab.to}
                  asChild
                  variant={location.pathname.startsWith(tab.to) ? "default" : "outline"}
                  size="sm"
                >
                  <Link to={tab.to}>{tab.label}</Link>
                </Button>
              ))}
            </div>
          </div>
        </div>
      ) : null}
      <Outlet />
    </div>
  );
}

export function DriverLoginPage() {
  const navigate = useNavigate();
  const { tenant } = useTenantRouteContext();
  const store = useDriverAppStore(tenant.id);
  const [mobile, setMobile] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");

  if (store.session) {
    return <Navigate to={`/tenant/${tenant.id}/driver-app/dashboard`} replace />;
  }

  function submit() {
    const result = store.login(mobile, otp);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setError("");
    navigate(`/tenant/${tenant.id}/driver-app/dashboard`);
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <PageHeader
        eyebrow="TMS"
        title="Driver App Login"
        description="Mock mobile + OTP login for assigned drivers only."
      />
      <TenantPanel title="Login" description="Use an active driver mobile number. Mock OTP is 123456.">
        <div className="grid gap-4">
          {error ? (
            <div className="rounded-2xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          ) : null}
          <Field label="Mobile Number">
            <Input value={mobile} onChange={(event) => setMobile(event.target.value)} placeholder="9876543210" />
          </Field>
          <Field label="OTP">
            <Input value={otp} onChange={(event) => setOtp(event.target.value)} placeholder="123456" />
          </Field>
          <div className="flex justify-end">
            <Button onClick={submit}>Login</Button>
          </div>
        </div>
      </TenantPanel>
    </div>
  );
}

export function DriverDashboardPage() {
  const { tenant } = useTenantRouteContext();
  const adminSources = useBookingAdminSources(tenant.id);
  const store = useDriverAppStore(tenant.id);
  const activeTrip = store.activeTrips[0] ?? null;
  const upcomingTrip = store.upcomingTrips[0] ?? null;
  const focusTrip = activeTrip ?? upcomingTrip;
  const assignedVehicle = focusTrip?.vehicle ?? null;
  const pendingActions = [
    ...(store.upcomingTrips.length ? ["Start Trip"] : []),
    ...(store.activeTrips.some((trip) => trip.pendingDeliveries > 0) ? ["Capture POD"] : []),
  ];

  if (!store.currentDriver) {
    return <Navigate to={`/tenant/${tenant.id}/driver-app/login`} replace />;
  }

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Driver App"
        title={`Welcome, ${store.currentDriver.name}`}
        description="Driver-facing trip execution dashboard linked directly to assigned bookings."
      />

      <div className="grid gap-3 md:grid-cols-5">
        <TenantSummaryCard label="Active Trips" value={String(store.activeTrips.length)} helper="In transit or arrived" />
        <TenantSummaryCard label="Upcoming Trips" value={String(store.upcomingTrips.length)} helper="Assigned and ready" />
        <TenantSummaryCard label="Pending Actions" value={String(pendingActions.length)} helper="Trip execution blockers" />
        <TenantSummaryCard label="Pending Sync" value={String(store.pendingSyncCount)} helper="Offline actions queued" />
        <TenantSummaryCard label="Sync Status" value={store.syncStatus} helper="Online or offline simulation" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <TenantPanel title="Active Trip Card" description="Current trip in focus for the logged-in driver.">
          {focusTrip ? (
            <TripSnapshotCard
              bookingId={focusTrip.booking.id}
              title={focusTrip.booking.bookingId}
              customer={adminSources.customerMap.get(focusTrip.booking.customerId)?.name ?? "Customer"}
              status={focusTrip.booking.status}
              vehicleLabel={assignedVehicle?.registrationNumber ?? focusTrip.booking.assignment?.vehicleLabel ?? "Vehicle pending"}
              destinations={focusTrip.destinations}
              helper={focusTrip.instructions}
              tenantId={tenant.id}
            />
          ) : (
            <div className="rounded-2xl border border-dashed px-4 py-6 text-sm text-muted-foreground">
              No assigned trips found for this driver yet.
            </div>
          )}
        </TenantPanel>

        <div className="space-y-4">
          <TenantPanel title="Assigned Vehicle" description="Vehicle mapped from booking assignment or driver master.">
            <div className="grid gap-3 sm:grid-cols-2">
              <DetailCard label="Vehicle" value={assignedVehicle?.registrationNumber ?? store.currentDriver.assignedVehicleId ?? "Not assigned"} />
              <DetailCard label="Availability" value={store.currentDriverAvailability} />
            </div>
          </TenantPanel>

          <TenantPanel title="Pending Actions" description="Quick execution items from current trips.">
            <div className="flex flex-wrap gap-2">
              {pendingActions.length ? (
                pendingActions.map((action) => (
                  <Badge key={action} variant="warning">{action}</Badge>
                ))
              ) : (
                <span className="text-sm text-muted-foreground">No pending driver actions.</span>
              )}
            </div>
          </TenantPanel>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_1fr_0.9fr]">
        <TenantPanel title="Upcoming Trips" description="Assigned trips queued for this driver.">
          <div className="space-y-3">
            {store.upcomingTrips.length ? (
              store.upcomingTrips.slice(0, 4).map((trip) => (
                <TripMiniCard key={trip.booking.id} tenantId={tenant.id} bookingId={trip.booking.id} title={trip.booking.bookingId} status={trip.booking.status} destinations={trip.destinations} />
              ))
            ) : (
              <EmptyHint text="No upcoming trips." />
            )}
          </div>
        </TenantPanel>

        <TenantPanel title="Compliance Alerts" description="Mock alerts from driver master records.">
          <div className="space-y-3">
            {store.complianceAlerts.length ? (
              store.complianceAlerts.map((alert) => (
                <div key={alert} className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  {alert}
                </div>
              ))
            ) : (
              <EmptyHint text="No compliance alerts." />
            )}
          </div>
        </TenantPanel>

        <TenantPanel title="Sync Status" description="Offline action queue state for the mock driver app.">
          <div className="space-y-3">
            <Badge variant={store.syncStatus === "ONLINE" ? "success" : "warning"}>{store.syncStatus}</Badge>
            <p className="text-sm text-muted-foreground">Pending Sync ({store.pendingSyncCount} actions)</p>
            {store.offlineQueue.length ? (
              <div className="space-y-2">
                {store.offlineQueue.map((action) => (
                  <div key={action.id} className="rounded-xl border border-border/60 bg-muted/20 px-3 py-3 text-sm">
                    {action.type.replace(/_/g, " ")} • {new Date(action.createdAt).toLocaleString()}
                  </div>
                ))}
              </div>
            ) : (
              <EmptyHint text="No pending offline actions." />
            )}
          </div>
        </TenantPanel>
      </div>
    </div>
  );
}

export function DriverTripsPage() {
  const { tenant } = useTenantRouteContext();
  const adminSources = useBookingAdminSources(tenant.id);
  const store = useDriverAppStore(tenant.id);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"Active" | "Upcoming" | "Completed" | "Exception Trips">("Active");

  if (!store.currentDriver) {
    return <Navigate to={`/tenant/${tenant.id}/driver-app/login`} replace />;
  }

  const tripsForTab =
    tab === "Active"
      ? store.activeTrips
      : tab === "Upcoming"
        ? store.upcomingTrips
        : tab === "Completed"
          ? store.completedTrips
          : store.exceptionTrips;

  const filteredTrips = tripsForTab.filter((trip) => {
    const haystack = `${trip.booking.bookingId} ${trip.destinations.join(" ")} ${trip.instructions}`.toLowerCase();
    return haystack.includes(search.trim().toLowerCase());
  });

  return (
    <div className="space-y-4">
      <PageHeader eyebrow="Driver App" title="My Trips" description="Driver sees only assigned trips from booking data." />
      <TenantFilterBar
        searchValue={search}
        searchPlaceholder="Search trip ID, destination, or instructions"
        onSearchChange={setSearch}
        filters={<Tabs tabs={["Active", "Upcoming", "Completed", "Exception Trips"]} active={tab} onChange={(value) => setTab(value as typeof tab)} />}
      />
      <div className="grid gap-4 lg:grid-cols-2">
        {filteredTrips.length ? (
          filteredTrips.map((trip) => (
            <TripSnapshotCard
              key={trip.booking.id}
              tenantId={tenant.id}
              bookingId={trip.booking.id}
              title={trip.booking.bookingId}
              customer={adminSources.customerMap.get(trip.booking.customerId)?.name ?? "Customer"}
              status={trip.booking.status}
              vehicleLabel={trip.vehicle?.registrationNumber ?? trip.booking.assignment?.vehicleLabel ?? "Vehicle pending"}
              destinations={trip.destinations}
              helper={`${trip.completedDeliveries}/${trip.completedDeliveries + trip.pendingDeliveries} deliveries completed`}
            />
          ))
        ) : (
          <TenantEmptyState title="No trips found" description="No driver trips matched the current tab and search." />
        )}
      </div>
    </div>
  );
}

export function DriverTripDetailsPage() {
  const { bookingId = "" } = useParams();
  const { tenant } = useTenantRouteContext();
  const adminSources = useBookingAdminSources(tenant.id);
  const store = useDriverAppStore(tenant.id);
  const navigate = useNavigate();
  const trip = store.getTripByBookingId(bookingId);
  const [message, setMessage] = useState("");
  const [checklist, setChecklist] = useState(() => store.checklists[bookingId] ?? {
    bookingId,
    vehicleConfirmed: false,
    loadingComplete: false,
    loadingPhotoName: "",
    remarks: "",
    completedAt: null,
  });
  const [podForms, setPodForms] = useState<Record<string, DriverPodFormInput>>({});
  const [incidentType, setIncidentType] = useState<DriverIncidentType>("BREAKDOWN");
  const [incidentDescription, setIncidentDescription] = useState("");
  const [incidentPhotoName, setIncidentPhotoName] = useState("");
  const [expenseType, setExpenseType] = useState<DriverExpenseType>("FUEL");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseNotes, setExpenseNotes] = useState("");
  const [expensePhotoName, setExpensePhotoName] = useState("");

  useEffect(() => {
    if (!trip) {
      return;
    }
    setChecklist(
      store.checklists[trip.booking.id] ?? {
        bookingId: trip.booking.id,
        vehicleConfirmed: false,
        loadingComplete: false,
        loadingPhotoName: "",
        remarks: "",
        completedAt: null,
      },
    );
    setPodForms(
      Object.fromEntries(
        (trip.booking.deliveries ?? []).map((delivery) => [
          delivery.id,
          {
            photoName: delivery.pod?.photoName ?? "",
            recipientName: delivery.pod?.consigneeName ?? "",
            deliveredQuantity: delivery.pod?.deliveredQuantity != null ? String(delivery.pod.deliveredQuantity) : String(delivery.quantity ?? ""),
            acknowledgementMode: delivery.pod?.acknowledgementMode ?? "OTP",
            remarks: delivery.pod?.podRemark ?? "",
          },
        ]),
      ),
    );
  }, [store.checklists, trip]);

  if (!store.currentDriver) {
    return <Navigate to={`/tenant/${tenant.id}/driver-app/login`} replace />;
  }

  if (!trip) {
    return (
      <TenantEmptyState
        title="Trip not found"
        description="This trip is either unavailable or not assigned to the logged-in driver."
        action={<Button onClick={() => navigate(`/tenant/${tenant.id}/driver-app/trips`)}>Back to My Trips</Button>}
      />
    );
  }

  const tripRecord = trip;

  const addressMap = new Map(adminSources.addresses.map((address) => [address.id, address]));
  const customer = adminSources.customerMap.get(tripRecord.booking.customerId) ?? null;
  const source = addressMap.get(tripRecord.booking.sourceAddressId) ?? null;

  function saveChecklist() {
    const completed = checklist.vehicleConfirmed && checklist.loadingComplete;
    store.saveChecklist(tripRecord.booking.id, {
      ...checklist,
      completedAt: completed ? new Date().toISOString() : null,
    });
    setMessage(completed ? "Checklist saved. Trip can now be started." : "Checklist saved as incomplete.");
  }

  function startTrip() {
    const result = store.startTrip(tripRecord.booking.id);
    setMessage(result.ok ? (result.queued ? "Start trip queued for sync." : "Trip started.") : result.error);
  }

  function markArrival() {
    const result = store.markArrival(tripRecord.booking.id);
    setMessage(result.ok ? (result.queued ? "Arrival queued for sync." : "Arrival marked.") : result.error);
  }

  function savePod(deliveryId: string) {
    const result = store.capturePod(tripRecord.booking.id, deliveryId, podForms[deliveryId]);
    setMessage(result.ok ? (result.queued ? "POD queued for sync." : "POD captured.") : result.error);
  }

  function submitIncident() {
    const result = store.raiseIncident(tripRecord.booking.id, incidentType, incidentDescription, incidentPhotoName);
    setMessage(result.ok ? (result.queued ? "Incident queued for sync." : "Incident raised.") : result.error);
    if (result.ok) {
      setIncidentDescription("");
      setIncidentPhotoName("");
    }
  }

  function submitExpense() {
    const result = store.addExpense(
      tripRecord.booking.id,
      expenseType,
      Number(expenseAmount),
      expenseNotes,
      expensePhotoName,
    );
    setMessage(result.ok ? (result.queued ? "Expense queued for sync." : "Expense saved.") : result.error);
    if (result.ok) {
      setExpenseAmount("");
      setExpenseNotes("");
      setExpensePhotoName("");
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Driver App"
        title={trip.booking.bookingId}
        description={`${customer?.name ?? "Customer"} • ${source?.addressName ?? "Source"} → ${tripRecord.destinations.join(", ")}`}
        action={<BookingStatusBadge status={tripRecord.booking.status} />}
      />

      {message ? (
        <div className="rounded-2xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {message}
        </div>
      ) : null}

      <div className="grid gap-3 md:grid-cols-5">
        <TenantSummaryCard label="Vehicle" value={tripRecord.vehicle?.registrationNumber ?? "Pending"} helper="Assigned vehicle" />
        <TenantSummaryCard label="Destinations" value={String(tripRecord.destinations.length)} helper="Multi-delivery aware" />
        <TenantSummaryCard label="Weight" value={`${tripRecord.totalWeight} ${tripRecord.booking.weightUom ?? "KG"}`} helper="Booking weight" />
        <TenantSummaryCard label="Completed POD" value={String(tripRecord.completedDeliveries)} helper="Deliveries completed" />
        <TenantSummaryCard label="Pending Sync" value={String(store.pendingSyncCount)} helper="Offline queue size" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <TenantPanel title="Trip Details" description="Operational context visible to the driver only.">
          <div className="grid gap-3 md:grid-cols-2">
            <DetailCard label="Trip ID" value={tripRecord.booking.bookingId} />
            <DetailCard label="Customer" value={customer?.name ?? "Unknown"} />
            <DetailCard label="Source" value={source?.addressName ?? "Unknown"} />
            <DetailCard label="Destinations" value={tripRecord.destinations.join(", ")} />
            <DetailCard label="Vehicle" value={tripRecord.vehicle?.registrationNumber ?? tripRecord.booking.assignment?.vehicleLabel ?? "Pending"} />
            <DetailCard label="Instructions" value={tripRecord.instructions} />
          </div>
        </TenantPanel>

        <TenantPanel title="Actions" description="Checklist, trip start, arrival, POD, and incidents.">
          <div className="flex flex-wrap gap-2">
            <Button onClick={saveChecklist} variant="outline">Save Checklist</Button>
            <Button
              onClick={startTrip}
              disabled={
                !(checklist.vehicleConfirmed && checklist.loadingComplete) ||
                !["DOCUMENT_COMPLETED", "READY_FOR_DISPATCH", "DISPATCHED"].includes(tripRecord.booking.status)
              }
            >
              Start Trip
            </Button>
            <Button onClick={markArrival} variant="outline" disabled={tripRecord.booking.status !== "IN_TRANSIT"}>
              Mark Arrival
            </Button>
            <Button asChild variant="outline">
              <Link to={`/tenant/${tenant.id}/driver-app/incidents`}>Incident Center</Link>
            </Button>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Trip cannot start without checklist completion. Trip cannot complete until all delivery PODs are captured.
          </p>
        </TenantPanel>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <TenantPanel title="Pre-Departure Checklist" description="Mandatory before trip start.">
          <div className="grid gap-4">
            <label className="flex items-center gap-3 rounded-2xl border px-4 py-3">
              <input type="checkbox" checked={checklist.vehicleConfirmed} onChange={(event) => setChecklist((current) => ({ ...current, vehicleConfirmed: event.target.checked }))} />
              <span className="text-sm font-medium">Vehicle confirmed</span>
            </label>
            <label className="flex items-center gap-3 rounded-2xl border px-4 py-3">
              <input type="checkbox" checked={checklist.loadingComplete} onChange={(event) => setChecklist((current) => ({ ...current, loadingComplete: event.target.checked }))} />
              <span className="text-sm font-medium">Loading complete</span>
            </label>
            <Field label="Loading Photo (Optional)">
              <Input value={checklist.loadingPhotoName ?? ""} onChange={(event) => setChecklist((current) => ({ ...current, loadingPhotoName: event.target.value }))} placeholder="loading-photo.jpg" />
            </Field>
            <Field label="Remarks (Optional)">
              <Textarea value={checklist.remarks ?? ""} onChange={(event) => setChecklist((current) => ({ ...current, remarks: event.target.value }))} className="min-h-[84px]" />
            </Field>
          </div>
        </TenantPanel>

        <TenantPanel title="Timeline" description="Trip timeline from booking status history.">
          <div className="space-y-3">
            {tripRecord.booking.statusTimeline
              .slice()
              .sort((left, right) => right.timestamp.localeCompare(left.timestamp))
              .map((event) => (
                <div key={event.id} className="rounded-2xl border border-border/60 bg-muted/20 px-4 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Badge variant="outline">{event.status.replace(/_/g, " ")}</Badge>
                    <span className="text-xs text-muted-foreground">{new Date(event.timestamp).toLocaleString()}</span>
                  </div>
                  <p className="mt-2 text-sm">{event.note ?? "Status updated."}</p>
                  <p className="mt-1 text-xs text-muted-foreground">Actor: {event.actor}</p>
                </div>
              ))}
          </div>
        </TenantPanel>
      </div>

      <TenantPanel title="Deliveries & POD" description="Every delivery needs POD. Multi-delivery trips complete only after all PODs are captured.">
        <div className="space-y-4">
          {(tripRecord.booking.deliveries ?? []).map((delivery) => {
            const destination = addressMap.get(delivery.destinationAddressId) ?? null;
            return (
              <div key={delivery.id} className="rounded-[24px] border border-white/80 bg-white/90 p-4 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">Delivery {delivery.deliveryNo}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{destination?.addressName ?? "Destination"}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant={delivery.pod?.capturedAt ? "success" : "warning"}>{delivery.pod?.capturedAt ? "POD Captured" : "POD Pending"}</Badge>
                    <Badge variant="outline">{delivery.quantity ?? "-"} {delivery.uom ?? ""}</Badge>
                  </div>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                  <Field label="Delivery Photo">
                    <Input value={podForms[delivery.id]?.photoName ?? ""} onChange={(event) => setPodForms((current) => ({ ...current, [delivery.id]: { ...current[delivery.id], photoName: event.target.value } }))} />
                  </Field>
                  <Field label="Recipient Name">
                    <Input value={podForms[delivery.id]?.recipientName ?? ""} onChange={(event) => setPodForms((current) => ({ ...current, [delivery.id]: { ...current[delivery.id], recipientName: event.target.value } }))} />
                  </Field>
                  <Field label="Delivered Quantity">
                    <Input value={podForms[delivery.id]?.deliveredQuantity ?? ""} onChange={(event) => setPodForms((current) => ({ ...current, [delivery.id]: { ...current[delivery.id], deliveredQuantity: event.target.value } }))} />
                  </Field>
                  <Field label="OTP / Signature">
                    <Select value={podForms[delivery.id]?.acknowledgementMode ?? "OTP"} onChange={(event) => setPodForms((current) => ({ ...current, [delivery.id]: { ...current[delivery.id], acknowledgementMode: event.target.value as DriverPodFormInput["acknowledgementMode"] } }))}>
                      <option value="OTP">OTP</option>
                      <option value="SIGNATURE">Signature</option>
                    </Select>
                  </Field>
                  <Field label="Remarks">
                    <Input value={podForms[delivery.id]?.remarks ?? ""} onChange={(event) => setPodForms((current) => ({ ...current, [delivery.id]: { ...current[delivery.id], remarks: event.target.value } }))} />
                  </Field>
                </div>
                <div className="mt-4 flex justify-end">
                  <Button onClick={() => savePod(delivery.id)} disabled={!["ARRIVED", "DELIVERED"].includes(tripRecord.booking.status)}>
                    Capture POD
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </TenantPanel>

      <div className="grid gap-4 xl:grid-cols-2">
        <TenantPanel title="Raise Incident" description="Breakdown, delay, damage, or route issue.">
          <div className="grid gap-3">
            <Field label="Type">
              <Select value={incidentType} onChange={(event) => setIncidentType(event.target.value as DriverIncidentType)}>
                {incidentTypeOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </Select>
            </Field>
            <Field label="Description">
              <Textarea value={incidentDescription} onChange={(event) => setIncidentDescription(event.target.value)} className="min-h-[96px]" />
            </Field>
            <Field label="Photo (Optional)">
              <Input value={incidentPhotoName} onChange={(event) => setIncidentPhotoName(event.target.value)} placeholder="incident.jpg" />
            </Field>
            <div className="flex justify-end">
              <Button variant="outline" onClick={submitIncident}>Raise Incident</Button>
            </div>
          </div>
        </TenantPanel>

        <TenantPanel title="Expense & Fuel" description="UI-only expense capture stored locally for the driver app.">
          <div className="grid gap-3">
            <Field label="Type">
              <Select value={expenseType} onChange={(event) => setExpenseType(event.target.value as DriverExpenseType)}>
                {expenseTypeOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </Select>
            </Field>
            <Field label="Amount">
              <Input value={expenseAmount} onChange={(event) => setExpenseAmount(event.target.value)} placeholder="0" />
            </Field>
            <Field label="Notes">
              <Textarea value={expenseNotes} onChange={(event) => setExpenseNotes(event.target.value)} className="min-h-[84px]" />
            </Field>
            <Field label="Photo">
              <Input value={expensePhotoName} onChange={(event) => setExpensePhotoName(event.target.value)} placeholder="fuel-slip.jpg" />
            </Field>
            <div className="flex justify-end">
              <Button variant="outline" onClick={submitExpense}>Save Expense</Button>
            </div>
          </div>
        </TenantPanel>
      </div>
    </div>
  );
}

export function DriverIncidentCenterPage() {
  const { tenant } = useTenantRouteContext();
  const store = useDriverAppStore(tenant.id);
  const [bookingId, setBookingId] = useState("");
  const [type, setType] = useState<DriverIncidentType>("BREAKDOWN");
  const [description, setDescription] = useState("");
  const [photoName, setPhotoName] = useState("");
  const [message, setMessage] = useState("");

  if (!store.currentDriver) {
    return <Navigate to={`/tenant/${tenant.id}/driver-app/login`} replace />;
  }

  function submit() {
    const targetBookingId = bookingId || store.activeTrips[0]?.booking.id || store.upcomingTrips[0]?.booking.id || "";
    if (!targetBookingId) {
      setMessage("Select a trip before raising an incident.");
      return;
    }
    const result = store.raiseIncident(targetBookingId, type, description, photoName);
    setMessage(result.ok ? (result.queued ? "Incident queued for sync." : "Incident raised.") : result.error);
    if (result.ok) {
      setDescription("");
      setPhotoName("");
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader eyebrow="Driver App" title="Incident Center" description="Driver-side incident reporting linked to the assigned trip." />
      {message ? (
        <div className="rounded-2xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div>
      ) : null}
      <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <TenantPanel title="Raise New Incident" description="Marks the related booking as exception.">
          <div className="grid gap-3">
            <Field label="Trip">
              <Select value={bookingId} onChange={(event) => setBookingId(event.target.value)}>
                <option value="">Select trip</option>
                {[...store.activeTrips, ...store.upcomingTrips, ...store.exceptionTrips].map((trip) => (
                  <option key={trip.booking.id} value={trip.booking.id}>{trip.booking.bookingId}</option>
                ))}
              </Select>
            </Field>
            <Field label="Type">
              <Select value={type} onChange={(event) => setType(event.target.value as DriverIncidentType)}>
                {incidentTypeOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </Select>
            </Field>
            <Field label="Description">
              <Textarea value={description} onChange={(event) => setDescription(event.target.value)} className="min-h-[96px]" />
            </Field>
            <Field label="Photo (Optional)">
              <Input value={photoName} onChange={(event) => setPhotoName(event.target.value)} placeholder="incident-photo.jpg" />
            </Field>
            <div className="flex justify-end">
              <Button onClick={submit}>Submit Incident</Button>
            </div>
          </div>
        </TenantPanel>

        <TenantPanel title="Incident Log" description="Only incidents raised by the logged-in driver are visible here.">
          <div className="space-y-3">
            {store.incidents.length ? (
              store.incidents.map((incident) => (
                <div key={incident.id} className="rounded-2xl border border-border/60 bg-muted/20 px-4 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Badge variant="warning">{incident.type.replace(/_/g, " ")}</Badge>
                    <span className="text-xs text-muted-foreground">{new Date(incident.createdAt).toLocaleString()}</span>
                  </div>
                  <p className="mt-2 text-sm font-medium">{incident.bookingId}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{incident.description}</p>
                </div>
              ))
            ) : (
              <EmptyHint text="No incidents logged." />
            )}
          </div>
        </TenantPanel>
      </div>
    </div>
  );
}

export function DriverProfilePage() {
  const { tenant } = useTenantRouteContext();
  const store = useDriverAppStore(tenant.id);
  const navigate = useNavigate();
  const adminSources = useBookingAdminSources(tenant.id);
  const vehicleMap = useMemo(
    () => new Map(adminSources.vehicles.map((vehicle) => [vehicle.id, vehicle])),
    [adminSources.vehicles],
  );

  if (!store.currentDriver) {
    return <Navigate to={`/tenant/${tenant.id}/driver-app/login`} replace />;
  }

  const assignedVehicle = store.currentDriver.assignedVehicleId
    ? vehicleMap.get(store.currentDriver.assignedVehicleId) ?? null
    : null;

  return (
    <div className="space-y-4">
      <PageHeader eyebrow="Driver App" title="Profile" description="Driver session, availability, and compliance view." />
      <div className="grid gap-3 md:grid-cols-5">
        <TenantSummaryCard label="Driver" value={store.currentDriver.name} helper="Logged-in driver" />
        <TenantSummaryCard label="Mobile" value={store.currentDriver.phone} helper="Login mobile" />
        <TenantSummaryCard label="Availability" value={store.currentDriverAvailability} helper="Mock availability state" />
        <TenantSummaryCard label="Assigned Vehicle" value={assignedVehicle?.registrationNumber ?? "Not mapped"} helper="Driver master mapping" />
        <TenantSummaryCard label="Pending Sync" value={String(store.pendingSyncCount)} helper="Queued actions" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <TenantPanel title="Availability" description="Simulated availability used during driver login validation.">
          <div className="flex flex-wrap gap-2">
            <Button variant={store.currentDriverAvailability === "AVAILABLE" ? "default" : "outline"} onClick={() => store.updateAvailability("AVAILABLE")}>
              Mark Available
            </Button>
            <Button variant={store.currentDriverAvailability === "UNAVAILABLE" ? "default" : "outline"} onClick={() => store.updateAvailability("UNAVAILABLE")}>
              Mark Unavailable
            </Button>
          </div>
        </TenantPanel>

        <TenantPanel title="Driver Details" description="Driver-specific details only. No admin setup data is exposed here.">
          <div className="grid gap-3 md:grid-cols-2">
            <DetailCard label="License Number" value={store.currentDriver.licenseNumber} />
            <DetailCard label="License Expiry" value={store.currentDriver.licenseExpiry} />
            <DetailCard label="Medical Expiry" value={store.currentDriver.medicalExpiry} />
            <DetailCard label="Drug Test" value={store.currentDriver.drugTestStatus} />
            <DetailCard label="Blood Group" value={store.currentDriver.bloodGroup} />
            <DetailCard label="Endorsements" value={store.currentDriver.endorsements.join(", ") || "-"} />
          </div>
        </TenantPanel>
      </div>

      <TenantPanel title="Session Controls" description="Ends only the simulated driver session stored in local storage.">
        <div className="flex justify-end">
          <Button
            variant="outline"
            onClick={() => {
              store.logout();
              navigate(`/tenant/${tenant.id}/driver-app/login`);
            }}
          >
            Logout
          </Button>
        </div>
      </TenantPanel>
    </div>
  );
}

function TripSnapshotCard({
  tenantId,
  bookingId,
  title,
  customer,
  status,
  vehicleLabel,
  destinations,
  helper,
}: {
  tenantId: string;
  bookingId: string;
  title: string;
  customer: string;
  status: BookingStatus;
  vehicleLabel: string;
  destinations: string[];
  helper: string;
}) {
  return (
    <div className="rounded-[24px] border border-white/80 bg-gradient-to-br from-white to-sky-50/70 p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">{title}</p>
          <p className="mt-1 text-xs text-muted-foreground">{customer}</p>
        </div>
        <BookingStatusBadge status={status} />
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <DetailCard label="Vehicle" value={vehicleLabel} />
        <DetailCard label="Destinations" value={destinations.join(", ")} />
      </div>
      <p className="mt-3 text-sm text-muted-foreground">{helper}</p>
      <div className="mt-4 flex justify-end">
        <Button asChild size="sm">
          <Link to={`/tenant/${tenantId}/driver-app/trips/${bookingId}`}>Open Trip</Link>
        </Button>
      </div>
    </div>
  );
}

function TripMiniCard({
  tenantId,
  bookingId,
  title,
  status,
  destinations,
}: {
  tenantId: string;
  bookingId: string;
  title: string;
  status: BookingStatus;
  destinations: string[];
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-muted/20 px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold">{title}</p>
        <BookingStatusBadge status={status} />
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{destinations.join(", ")}</p>
      <div className="mt-3 flex justify-end">
        <Button asChild size="sm" variant="outline">
          <Link to={`/tenant/${tenantId}/driver-app/trips/${bookingId}`}>View</Link>
        </Button>
      </div>
    </div>
  );
}

function DetailCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/60 bg-white/75 px-3 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-medium">{value}</p>
    </div>
  );
}

function EmptyHint({ text }: { text: string }) {
  return <div className="rounded-xl border border-dashed px-3 py-4 text-sm text-muted-foreground">{text}</div>;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}
