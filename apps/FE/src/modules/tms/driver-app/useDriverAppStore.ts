import { useEffect, useEffectEvent, useMemo, useState } from "react";
import { useBookingAdminSources } from "@/modules/tms/booking/hooks/useBookingAdminSources";
import { useTenantBookings } from "@/modules/tms/booking/hooks/useTenantBookings";
import type { BookingInput, BookingRecord } from "@/modules/tms/booking/types";
import type { TenantDriver } from "@/types/fleet";
import type {
  DriverAvailabilityStatus,
  DriverChecklistRecord,
  DriverExpenseRecord,
  DriverIncidentRecord,
  DriverOfflineAction,
  DriverPodFormInput,
  DriverSession,
  DriverTrip,
} from "@/modules/tms/driver-app/types";

type DriverOfflineActionInput =
  | { type: "START_TRIP"; bookingId: string }
  | { type: "MARK_ARRIVAL"; bookingId: string }
  | { type: "CAPTURE_POD"; bookingId: string; deliveryId: string; payload: DriverPodFormInput }
  | {
      type: "RAISE_INCIDENT";
      bookingId: string;
      payload: Pick<DriverIncidentRecord, "type" | "description" | "photoName">;
    }
  | {
      type: "ADD_EXPENSE";
      bookingId: string;
      payload: Pick<DriverExpenseRecord, "type" | "amount" | "notes" | "photoName">;
    };

function usePersistedState<T>(key: string, fallback: T) {
  const [value, setValue] = useState<T>(() => {
    if (typeof window === "undefined") {
      return fallback;
    }
    try {
      const rawValue = window.localStorage.getItem(key);
      return rawValue ? (JSON.parse(rawValue) as T) : fallback;
    } catch {
      return fallback;
    }
  });

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    window.localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);

  return [value, setValue] as const;
}

function resolveDriverAvailability(
  driver: TenantDriver,
  availabilityMap: Record<string, DriverAvailabilityStatus>,
) {
  return driver.isActive ? availabilityMap[driver.id] ?? "AVAILABLE" : "UNAVAILABLE";
}

function buildDriverActorLabel(driver: TenantDriver) {
  return `${driver.name} (Driver App)`;
}

export function useDriverAppStore(tenantId: string) {
  const adminSources = useBookingAdminSources(tenantId);
  const { data: bookings, getBookingById, updateBooking, transitionBooking } = useTenantBookings(tenantId);
  const [session, setSession] = usePersistedState<DriverSession | null>(
    `optimile.driver-app.session.${tenantId}`,
    null,
  );
  const [availabilityMap, setAvailabilityMap] = usePersistedState<Record<string, DriverAvailabilityStatus>>(
    `optimile.driver-app.availability.${tenantId}`,
    {},
  );
  const [checklists, setChecklists] = usePersistedState<Record<string, DriverChecklistRecord>>(
    `optimile.driver-app.checklists.${tenantId}`,
    {},
  );
  const [incidents, setIncidents] = usePersistedState<DriverIncidentRecord[]>(
    `optimile.driver-app.incidents.${tenantId}`,
    [],
  );
  const [expenses, setExpenses] = usePersistedState<DriverExpenseRecord[]>(
    `optimile.driver-app.expenses.${tenantId}`,
    [],
  );
  const [offlineQueue, setOfflineQueue] = usePersistedState<DriverOfflineAction[]>(
    `optimile.driver-app.queue.${tenantId}`,
    [],
  );
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator === "undefined" ? true : navigator.onLine,
  );

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const addressMap = useMemo(
    () => new Map(adminSources.addresses.map((address) => [address.id, address])),
    [adminSources.addresses],
  );
  const vehicleMap = useMemo(
    () => new Map(adminSources.vehicles.map((vehicle) => [vehicle.id, vehicle])),
    [adminSources.vehicles],
  );
  const driverMap = useMemo(
    () => new Map(adminSources.drivers.map((driver) => [driver.id, driver])),
    [adminSources.drivers],
  );

  const currentDriver = session?.driverId ? driverMap.get(session.driverId) ?? null : null;

  const trips = useMemo<DriverTrip[]>(() => {
    if (!currentDriver) {
      return [];
    }

    return bookings
      .filter((booking) => booking.assignment?.driverId === currentDriver.id)
      .map((booking) => {
        const vehicle = booking.assignment?.vehicleId
          ? vehicleMap.get(booking.assignment.vehicleId) ?? null
          : currentDriver.assignedVehicleId
            ? vehicleMap.get(currentDriver.assignedVehicleId) ?? null
            : null;
        const destinations = (booking.deliveries ?? [])
          .map((delivery) => addressMap.get(delivery.destinationAddressId)?.addressName ?? "Destination")
          .filter(Boolean);
        const completedDeliveries = (booking.deliveries ?? []).filter((delivery) => delivery.pod?.capturedAt).length;
        const pendingDeliveries = Math.max((booking.deliveries ?? []).length - completedDeliveries, 0);

        return {
          booking,
          driver: currentDriver,
          vehicle,
          destinations,
          instructions: booking.opsRemark ?? booking.remarks.at(-1)?.message ?? "No special instructions.",
          totalWeight: booking.weight,
          completedDeliveries,
          pendingDeliveries,
          lastStatusAt: booking.statusTimeline.at(-1)?.timestamp ?? booking.updatedAt,
        };
      })
      .sort((left, right) => right.booking.updatedAt.localeCompare(left.booking.updatedAt));
  }, [addressMap, bookings, currentDriver, vehicleMap]);

  const upcomingTrips = trips.filter((trip) =>
    ["VEHICLE_ASSIGNED", "LOADING_STARTED", "LOADING_COMPLETED", "DOCUMENT_PENDING", "DOCUMENT_COMPLETED", "READY_FOR_DISPATCH", "DISPATCHED"].includes(
      trip.booking.status,
    ),
  );
  const activeTrips = trips.filter((trip) => ["IN_TRANSIT", "ARRIVED"].includes(trip.booking.status));
  const completedTrips = trips.filter((trip) => trip.booking.status === "DELIVERED");
  const exceptionTrips = trips.filter((trip) => trip.booking.status === "EXCEPTION");

  const currentDriverIncidents = currentDriver
    ? incidents.filter((incident) => incident.driverId === currentDriver.id)
    : [];
  const currentDriverExpenses = currentDriver
    ? expenses.filter((expense) => expense.driverId === currentDriver.id)
    : [];

  const complianceAlerts = useMemo(() => {
    if (!currentDriver) {
      return [] as string[];
    }

    const alerts: string[] = [];
    const today = Date.now();
    const licenseTime = new Date(currentDriver.licenseExpiry).getTime();
    const medicalTime = new Date(currentDriver.medicalExpiry).getTime();
    const daysUntilLicense = Math.ceil((licenseTime - today) / (1000 * 60 * 60 * 24));
    const daysUntilMedical = Math.ceil((medicalTime - today) / (1000 * 60 * 60 * 24));

    if (daysUntilLicense <= 30) {
      alerts.push(`License expires in ${Math.max(daysUntilLicense, 0)} day(s).`);
    }
    if (daysUntilMedical <= 30) {
      alerts.push(`Medical certificate expires in ${Math.max(daysUntilMedical, 0)} day(s).`);
    }
    if (currentDriver.drugTestStatus !== "CLEAR") {
      alerts.push(`Drug test status is ${currentDriver.drugTestStatus}.`);
    }

    return alerts;
  }, [currentDriver]);

  function login(phone: string, otp: string) {
    const normalizedPhone = phone.trim();
    const driver = adminSources.drivers.find((item) => item.phone.trim() === normalizedPhone);
    if (!driver) {
      return { ok: false as const, error: "Driver not found for this mobile number." };
    }
    if (!driver.isActive) {
      return { ok: false as const, error: "Driver is inactive." };
    }
    if (resolveDriverAvailability(driver, availabilityMap) !== "AVAILABLE") {
      return { ok: false as const, error: "Driver is not available." };
    }
    if (otp.trim() !== "123456") {
      return { ok: false as const, error: "Invalid OTP. Use 123456 for mock login." };
    }

    setSession({
      tenantId,
      driverId: driver.id,
      phone: normalizedPhone,
      loggedInAt: new Date().toISOString(),
    });
    return { ok: true as const };
  }

  function logout() {
    setSession(null);
  }

  function updateAvailability(status: DriverAvailabilityStatus) {
    if (!currentDriver) {
      return;
    }
    setAvailabilityMap((current) => ({
      ...current,
      [currentDriver.id]: status,
    }));
  }

  function saveChecklist(bookingId: string, checklist: Omit<DriverChecklistRecord, "bookingId">) {
    setChecklists((current) => ({
      ...current,
      [bookingId]: {
        bookingId,
        ...checklist,
      },
    }));
  }

  const runQueuedAction = useEffectEvent((action: DriverOfflineAction) => {
    if (!currentDriver) {
      throw new Error("Driver session not found.");
    }

    if (action.type === "START_TRIP") {
      transitionBooking(action.bookingId, {
        status: "IN_TRANSIT",
        actor: buildDriverActorLabel(currentDriver),
        note: "Trip started from Driver App.",
      });
      return;
    }

    if (action.type === "MARK_ARRIVAL") {
      transitionBooking(action.bookingId, {
        status: "ARRIVED",
        actor: buildDriverActorLabel(currentDriver),
        note: "Driver marked trip arrival.",
      });
      return;
    }

    if (action.type === "CAPTURE_POD") {
      applyPodCapture(action.bookingId, action.deliveryId, action.payload);
      return;
    }

    if (action.type === "RAISE_INCIDENT") {
      applyIncident(action.bookingId, action.payload.type, action.payload.description, action.payload.photoName);
      return;
    }

    applyExpense(action.bookingId, action.payload.type, action.payload.amount, action.payload.notes, action.payload.photoName);
  });

  useEffect(() => {
    if (!isOnline || !offlineQueue.length || !currentDriver) {
      return;
    }

    const pending = [...offlineQueue];
    const remaining: DriverOfflineAction[] = [];
    pending.forEach((action) => {
      try {
        runQueuedAction(action);
      } catch {
        remaining.push(action);
      }
    });
    if (remaining.length !== offlineQueue.length) {
      setOfflineQueue(remaining);
    }
  }, [currentDriver, isOnline, offlineQueue, runQueuedAction]);

  function queueAction(action: DriverOfflineActionInput) {
    setOfflineQueue((current) => [
      ...current,
      {
        ...action,
        id: `driver-queue-${Math.random().toString(36).slice(2, 9)}`,
        createdAt: new Date().toISOString(),
      } as DriverOfflineAction,
    ]);
  }

  function requireChecklistCompletion(bookingId: string) {
    const checklist = checklists[bookingId];
    return Boolean(checklist?.vehicleConfirmed && checklist?.loadingComplete);
  }

  function startTrip(bookingId: string) {
    if (!currentDriver) {
      return { ok: false as const, error: "Driver session not found." };
    }
    if (!requireChecklistCompletion(bookingId)) {
      return { ok: false as const, error: "Complete the checklist before starting the trip." };
    }

    if (!isOnline) {
      queueAction({ type: "START_TRIP", bookingId });
      return { ok: true as const, queued: true as const };
    }

    runQueuedAction({
      id: `driver-action-${Date.now()}`,
      type: "START_TRIP",
      bookingId,
      createdAt: new Date().toISOString(),
    });
    return { ok: true as const, queued: false as const };
  }

  function markArrival(bookingId: string) {
    if (!currentDriver) {
      return { ok: false as const, error: "Driver session not found." };
    }
    if (!isOnline) {
      queueAction({ type: "MARK_ARRIVAL", bookingId });
      return { ok: true as const, queued: true as const };
    }
    runQueuedAction({
      id: `driver-action-${Date.now()}`,
      type: "MARK_ARRIVAL",
      bookingId,
      createdAt: new Date().toISOString(),
    });
    return { ok: true as const, queued: false as const };
  }

  function applyPodCapture(bookingId: string, deliveryId: string, payload: DriverPodFormInput) {
    if (!currentDriver) {
      throw new Error("Driver session not found.");
    }
    const booking = getBookingById(bookingId);
    if (!booking) {
      throw new Error("Booking not found.");
    }

    const capturedAt = new Date().toISOString();
    const nextDeliveries = (booking.deliveries ?? []).map((delivery) =>
      delivery.id === deliveryId
        ? {
            ...delivery,
            status: "DELIVERED" as const,
            pod: {
              photoName: payload.photoName.trim(),
              consigneeName: payload.recipientName.trim(),
              deliveredQuantity: Number(payload.deliveredQuantity),
              acknowledgementMode: payload.acknowledgementMode,
              podRemark: payload.remarks.trim() || null,
              eSignRequested: payload.acknowledgementMode === "SIGNATURE",
              capturedAt,
            },
          }
        : delivery,
    );

    updateBooking(bookingId, {
      deliveries: nextDeliveries,
      pod: nextDeliveries.find((delivery) => delivery.id === deliveryId)?.pod ?? booking.pod ?? null,
    });

    if (nextDeliveries.every((delivery) => Boolean(delivery.pod?.capturedAt))) {
      transitionBooking(bookingId, {
        status: "DELIVERED",
        actor: buildDriverActorLabel(currentDriver),
        note: "All delivery PODs captured from Driver App.",
      });
    }
  }

  function capturePod(bookingId: string, deliveryId: string, payload: DriverPodFormInput) {
    if (!payload.photoName.trim() || !payload.recipientName.trim() || Number(payload.deliveredQuantity) <= 0) {
      return { ok: false as const, error: "Delivery photo, recipient name, and delivered quantity are required." };
    }
    if (!isOnline) {
      queueAction({ type: "CAPTURE_POD", bookingId, deliveryId, payload });
      return { ok: true as const, queued: true as const };
    }
    applyPodCapture(bookingId, deliveryId, payload);
    return { ok: true as const, queued: false as const };
  }

  function applyIncident(
    bookingId: string,
    type: DriverIncidentRecord["type"],
    description: string,
    photoName?: string,
  ) {
    if (!currentDriver) {
      throw new Error("Driver session not found.");
    }
    const booking = getBookingById(bookingId);
    if (!booking) {
      throw new Error("Booking not found.");
    }

    const nextIncident: DriverIncidentRecord = {
      id: `driver-incident-${Math.random().toString(36).slice(2, 9)}`,
      tenantId,
      bookingId,
      driverId: currentDriver.id,
      type,
      description: description.trim(),
      photoName: photoName?.trim() || undefined,
      createdAt: new Date().toISOString(),
    };
    setIncidents((current) => [nextIncident, ...current]);

    updateBooking(bookingId, {
      remarks: [
        {
          id: `booking-remark-${Date.now()}`,
          timestamp: nextIncident.createdAt,
          actor: buildDriverActorLabel(currentDriver),
          type: "EXCEPTION_REMARK",
          message: `${type.replace(/_/g, " ")}: ${description.trim()}`,
        },
        ...booking.remarks,
      ],
    } satisfies Partial<BookingInput>);

    transitionBooking(bookingId, {
      status: "EXCEPTION",
      actor: buildDriverActorLabel(currentDriver),
      note: `${type.replace(/_/g, " ")} reported from Driver App.`,
    });
  }

  function raiseIncident(
    bookingId: string,
    type: DriverIncidentRecord["type"],
    description: string,
    photoName?: string,
  ) {
    if (!description.trim()) {
      return { ok: false as const, error: "Incident description is required." };
    }
    if (!isOnline) {
      queueAction({
        type: "RAISE_INCIDENT",
        bookingId,
        payload: {
          type,
          description,
          photoName,
        },
      });
      return { ok: true as const, queued: true as const };
    }
    applyIncident(bookingId, type, description, photoName);
    return { ok: true as const, queued: false as const };
  }

  function applyExpense(
    bookingId: string,
    type: DriverExpenseRecord["type"],
    amount: number,
    notes?: string,
    photoName?: string,
  ) {
    if (!currentDriver) {
      throw new Error("Driver session not found.");
    }

    const nextExpense: DriverExpenseRecord = {
      id: `driver-expense-${Math.random().toString(36).slice(2, 9)}`,
      tenantId,
      bookingId,
      driverId: currentDriver.id,
      type,
      amount,
      notes: notes?.trim() || undefined,
      photoName: photoName?.trim() || undefined,
      createdAt: new Date().toISOString(),
    };
    setExpenses((current) => [nextExpense, ...current]);
  }

  function addExpense(
    bookingId: string,
    type: DriverExpenseRecord["type"],
    amount: number,
    notes?: string,
    photoName?: string,
  ) {
    if (!Number.isFinite(amount) || amount <= 0) {
      return { ok: false as const, error: "Enter a valid expense amount." };
    }
    if (!isOnline) {
      queueAction({
        type: "ADD_EXPENSE",
        bookingId,
        payload: {
          type,
          amount,
          notes,
          photoName,
        },
      });
      return { ok: true as const, queued: true as const };
    }
    applyExpense(bookingId, type, amount, notes, photoName);
    return { ok: true as const, queued: false as const };
  }

  return {
    isOnline,
    syncStatus: isOnline ? ("ONLINE" as const) : ("OFFLINE" as const),
    session,
    currentDriver,
    currentDriverAvailability:
      currentDriver ? resolveDriverAvailability(currentDriver, availabilityMap) : "UNAVAILABLE",
    trips,
    activeTrips,
    upcomingTrips,
    completedTrips,
    exceptionTrips,
    complianceAlerts,
    incidents: currentDriverIncidents,
    expenses: currentDriverExpenses,
    checklists,
    offlineQueue,
    pendingSyncCount: offlineQueue.length,
    login,
    logout,
    updateAvailability,
    saveChecklist,
    startTrip,
    markArrival,
    capturePod,
    raiseIncident,
    addExpense,
    getTripByBookingId: (bookingId: string) => trips.find((trip) => trip.booking.id === bookingId) ?? null,
  };
}
