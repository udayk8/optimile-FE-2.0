import { create } from "zustand";
import { persist } from "zustand/middleware";
import { mockDriver } from "@/mocks/driver";
import { mockDriverDocuments } from "@/mocks/documents";
import { mockExpenses, mockFuelSubmissions } from "@/mocks/expenses";
import { mockIncidents } from "@/mocks/incidents";
import { mockNotifications } from "@/mocks/notifications";
import { mockSettlements } from "@/mocks/settlements";
import { mockTrips } from "@/mocks/trips";
import type { POD, SubDelivery } from "@/types/delivery";
import type { Driver } from "@/types/driver";
import type { DriverDocumentStore } from "@/types/document";
import type { Expense, FuelSubmission, Settlement } from "@/types/expense";
import type { Incident } from "@/types/incident";
import type { AppNotification } from "@/types/notification";
import type { Checklist, Trip, TripMilestone, TripRemark, TripStatus } from "@/types/trip";

export type NetworkStatus = "ONLINE" | "OFFLINE";
export type SyncStatus = "PENDING" | "SYNCING" | "SYNCED" | "FAILED" | "ATTENTION_REQUIRED";

export interface OfflineEvent {
  id: string;
  eventType: "TRIP_STATUS" | "SUB_DELIVERY" | "END_DELIVERY" | "POD" | "FUEL" | "EXPENSE" | "INCIDENT";
  tripId: string;
  deliveryId?: string;
  deviceTimestamp: string;
  syncStatus: SyncStatus;
  retryCount: number;
  payloadHash: string;
  attachmentReferences: string[];
}

export type AppLanguage = "en" | "hi" | "ta" | "kn";

type AppStore = {
  driver: Driver;
  trips: Trip[];
  expenses: Expense[];
  fuelSubmissions: FuelSubmission[];
  incidents: Incident[];
  notifications: AppNotification[];
  settlements: Settlement[];
  driverDocuments: DriverDocumentStore;
  offlineQueue: OfflineEvent[];
  networkStatus: NetworkStatus;
  language: AppLanguage;
  onDuty: boolean;
  setLanguage: (language: AppLanguage) => void;
  toggleOnDuty: () => void;
  uploadDriverDocument: (docType: keyof DriverDocumentStore, fileUrl: string) => void;
  acknowledgeTrip: (tripId: string) => void;
  updateChecklist: (tripId: string, checklist: Partial<Checklist>) => void;
  markReadyForTransit: (tripId: string) => void;
  markInTransit: (tripId: string) => void;
  markArrival: (tripId: string) => void;
  addSubDelivery: (tripId: string, deliveryId: string, subDelivery: SubDelivery) => void;
  startDelivery: (tripId: string, deliveryId: string) => void;
  endDelivery: (tripId: string, deliveryId: string) => void;
  submitPOD: (tripId: string, deliveryId: string, pod: POD) => void;
  completeTrip: (tripId: string) => void;
  submitFuel: (fuel: FuelSubmission) => void;
  submitExpense: (expense: Expense) => void;
  raiseIncident: (incident: Incident) => void;
  addTripRemark: (tripId: string, remark: TripRemark) => void;
  toggleNetwork: () => void;
  syncOfflineQueue: () => void;
  markNotificationRead: (notificationId: string) => void;
};

const appendMilestone = (trip: Trip, status: TripStatus): Trip => ({
  ...trip,
  status,
  milestoneHistory: [
    ...trip.milestoneHistory,
    {
      status,
      timestamp: new Date().toISOString(),
    } satisfies TripMilestone,
  ],
});

const queueEvent = (
  queue: OfflineEvent[],
  eventType: OfflineEvent["eventType"],
  tripId: string,
  deliveryId?: string,
  attachmentReferences: string[] = []
): OfflineEvent[] => [
  ...queue,
  {
    id: `EVT-${queue.length + 1}`,
    eventType,
    tripId,
    deliveryId,
    deviceTimestamp: new Date().toISOString(),
    syncStatus: "PENDING",
    retryCount: 0,
    payloadHash: `${eventType}-${tripId}-${deliveryId ?? "na"}-${Date.now()}`,
    attachmentReferences,
  },
];

const withTripUpdate = (trips: Trip[], tripId: string, mutate: (trip: Trip) => Trip): Trip[] =>
  trips.map((trip) => (trip.id === tripId ? mutate(trip) : trip));

const markTripCompletedIfReady = (trip: Trip): Trip => {
  const allDelivered = trip.deliveries.length > 0 && trip.deliveries.every((delivery) => delivery.status === "DELIVERED");
  return allDelivered ? appendMilestone(appendMilestone(trip, "DELIVERED"), "COMPLETED") : trip;
};

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      driver: mockDriver,
      trips: mockTrips.map((trip) =>
        trip.id === "TRIP-1005"
          ? { ...trip, incidents: mockIncidents.filter((incident) => incident.tripId === trip.id) }
          : trip
      ),
      expenses: mockExpenses,
      fuelSubmissions: mockFuelSubmissions,
      incidents: mockIncidents,
      notifications: mockNotifications,
      settlements: mockSettlements,
      driverDocuments: mockDriverDocuments,
      offlineQueue: [
        {
          id: "EVT-001",
          eventType: "POD",
          tripId: "TRIP-1001",
          deliveryId: "DEL-001",
          deviceTimestamp: new Date().toISOString(),
          syncStatus: "PENDING",
          retryCount: 0,
          payloadHash: "mock-hash-123",
          attachmentReferences: ["/mock/pod-photo.jpg"],
        },
      ],
      networkStatus: "ONLINE",
      language: "en",
      onDuty: true,
      setLanguage: (language) => set({ language }),
      toggleOnDuty: () => set((state) => ({ onDuty: !state.onDuty })),
      uploadDriverDocument: (docType, fileUrl) =>
        set((state) => ({
          driverDocuments: {
            ...state.driverDocuments,
            [docType]: {
              ...state.driverDocuments[docType],
              uploaded: true,
              url: fileUrl,
              isExpiring: false,
            },
          },
        })),
      acknowledgeTrip: (tripId) =>
        set((state) => ({
          trips: withTripUpdate(state.trips, tripId, (trip) => appendMilestone(trip, "DISPATCHED")),
          offlineQueue:
            state.networkStatus === "OFFLINE"
              ? queueEvent(state.offlineQueue, "TRIP_STATUS", tripId)
              : state.offlineQueue,
        })),
      updateChecklist: (tripId, checklist) =>
        set((state) => ({
          trips: withTripUpdate(state.trips, tripId, (trip) => ({
            ...trip,
            checklist: { ...trip.checklist, ...checklist },
          })),
        })),
      markReadyForTransit: (tripId) =>
        set((state) => ({
          trips: withTripUpdate(state.trips, tripId, (trip) => appendMilestone(trip, "READY_FOR_TRANSIT")),
          offlineQueue:
            state.networkStatus === "OFFLINE"
              ? queueEvent(state.offlineQueue, "TRIP_STATUS", tripId)
              : state.offlineQueue,
        })),
      markInTransit: (tripId) =>
        set((state) => ({
          trips: withTripUpdate(state.trips, tripId, (trip) => appendMilestone(trip, "IN_TRANSIT")),
          offlineQueue:
            state.networkStatus === "OFFLINE"
              ? queueEvent(state.offlineQueue, "TRIP_STATUS", tripId)
              : state.offlineQueue,
        })),
      markArrival: (tripId) =>
        set((state) => ({
          trips: withTripUpdate(state.trips, tripId, (trip) => appendMilestone(trip, "ARRIVED")),
          offlineQueue:
            state.networkStatus === "OFFLINE"
              ? queueEvent(state.offlineQueue, "TRIP_STATUS", tripId)
              : state.offlineQueue,
        })),
      addSubDelivery: (tripId, deliveryId, subDelivery) =>
        set((state) => ({
          trips: withTripUpdate(state.trips, tripId, (trip) => ({
            ...trip,
            deliveries: trip.deliveries.map((delivery) =>
              delivery.id === deliveryId
                ? {
                    ...delivery,
                    status: "SUB_DELIVERY_ACTIVE",
                    subDeliveries: [...delivery.subDeliveries, subDelivery],
                  }
                : delivery
            ),
          })),
          offlineQueue:
            state.networkStatus === "OFFLINE"
              ? queueEvent(state.offlineQueue, "SUB_DELIVERY", tripId, deliveryId)
              : state.offlineQueue,
        })),
      startDelivery: (tripId, deliveryId) =>
        set((state) => ({
          trips: withTripUpdate(state.trips, tripId, (trip) => ({
            ...trip,
            deliveries: trip.deliveries.map((delivery) =>
              delivery.id === deliveryId && delivery.status === "PENDING"
                ? { ...delivery, status: "IN_PROGRESS" }
                : delivery
            ),
          })),
        })),
      endDelivery: (tripId, deliveryId) =>
        set((state) => ({
          trips: withTripUpdate(state.trips, tripId, (trip) => ({
            ...trip,
            deliveries: trip.deliveries.map((delivery) =>
              delivery.id === deliveryId ? { ...delivery, status: "POD_PENDING" } : delivery
            ),
          })),
          offlineQueue:
            state.networkStatus === "OFFLINE"
              ? queueEvent(state.offlineQueue, "END_DELIVERY", tripId, deliveryId)
              : state.offlineQueue,
        })),
      submitPOD: (tripId, deliveryId, pod) =>
        set((state) => {
          const trips = withTripUpdate(state.trips, tripId, (trip) => {
            const deliveries = trip.deliveries.map((delivery) =>
              delivery.id === deliveryId
                ? {
                    ...delivery,
                    pod,
                    status: "DELIVERED" as const,
                  }
                : delivery
            );
            const tripWithDelivery = {
              ...trip,
              deliveries,
              uploadedEvidence: [...trip.uploadedEvidence, ...pod.photos],
            };
            return markTripCompletedIfReady(tripWithDelivery);
          });

          return {
            trips,
            notifications: [
              {
                id: `n-${Date.now()}`,
                title: "POD submitted",
                body: `POD submitted for ${deliveryId} on ${tripId}.`,
                priority: "MEDIUM",
                seen: false,
                timestamp: new Date().toISOString(),
                relatedTripId: tripId,
              },
              ...state.notifications,
            ],
            offlineQueue:
              state.networkStatus === "OFFLINE"
                ? queueEvent(state.offlineQueue, "POD", tripId, deliveryId, pod.photos)
                : state.offlineQueue,
          };
        }),
      completeTrip: (tripId) =>
        set((state) => ({
          trips: withTripUpdate(state.trips, tripId, (trip) => appendMilestone(trip, "COMPLETED")),
        })),
      submitFuel: (fuel) =>
        set((state) => ({
          fuelSubmissions: [fuel, ...state.fuelSubmissions],
          trips: withTripUpdate(state.trips, fuel.tripId, (trip) => ({
            ...trip,
            fuelSubmissions: [fuel, ...trip.fuelSubmissions],
          })),
          offlineQueue:
            state.networkStatus === "OFFLINE"
              ? queueEvent(state.offlineQueue, "FUEL", fuel.tripId, undefined, [fuel.receiptPhotoUrl])
              : state.offlineQueue,
        })),
      submitExpense: (expense) =>
        set((state) => ({
          expenses: [expense, ...state.expenses],
          trips: withTripUpdate(state.trips, expense.tripId, (trip) => ({
            ...trip,
            expenses: [expense, ...trip.expenses],
          })),
          offlineQueue:
            state.networkStatus === "OFFLINE"
              ? queueEvent(state.offlineQueue, "EXPENSE", expense.tripId, undefined, [expense.receiptPhotoUrl])
              : state.offlineQueue,
        })),
      raiseIncident: (incident) =>
        set((state) => ({
          incidents: [incident, ...state.incidents],
          trips: withTripUpdate(state.trips, incident.tripId, (trip) => {
            const nextTrip = {
              ...trip,
              incidents: [incident, ...trip.incidents],
              linkedExceptions: [incident.id, ...trip.linkedExceptions],
            };
            const exceptionEligibleStatuses: TripStatus[] = [
              "ASSIGNED",
              "DISPATCHED",
              "READY_FOR_TRANSIT",
              "IN_TRANSIT",
              "ARRIVED",
              "DELIVERED",
              "EXCEPTION",
            ];
            return incident.severity === "HIGH" || incident.severity === "CRITICAL"
              ? exceptionEligibleStatuses.includes(trip.status)
                ? appendMilestone(nextTrip, "EXCEPTION")
                : nextTrip
              : nextTrip;
          }),
          notifications: [
            {
              id: `n-${Date.now()}`,
              title: `${incident.type} reported`,
              body: incident.description,
              priority:
                incident.severity === "CRITICAL"
                  ? "CRITICAL"
                  : incident.severity === "HIGH"
                    ? "HIGH"
                    : "MEDIUM",
              seen: false,
              timestamp: new Date().toISOString(),
              relatedTripId: incident.tripId,
            },
            ...state.notifications,
          ],
          offlineQueue:
            state.networkStatus === "OFFLINE"
              ? queueEvent(state.offlineQueue, "INCIDENT", incident.tripId, undefined, incident.photoUrls)
              : state.offlineQueue,
        })),
      addTripRemark: (tripId, remark) =>
        set((state) => ({
          trips: withTripUpdate(state.trips, tripId, (trip) => ({
            ...trip,
            remarks: [...trip.remarks, remark],
          })),
        })),
      toggleNetwork: () => {
        const next = get().networkStatus === "ONLINE" ? "OFFLINE" : "ONLINE";
        set({ networkStatus: next });
        if (next === "ONLINE") get().syncOfflineQueue();
      },
      syncOfflineQueue: () =>
        set((state) => ({
          offlineQueue:
            state.networkStatus === "ONLINE"
              ? state.offlineQueue.map((event) => ({ ...event, syncStatus: "SYNCED", retryCount: 0 }))
              : state.offlineQueue,
        })),
      markNotificationRead: (notificationId) =>
        set((state) => ({
          notifications: state.notifications.map((notification) =>
            notification.id === notificationId ? { ...notification, seen: true } : notification
          ),
        })),
    }),
    {
      name: "driver-web-app-store",
      partialize: (state) => ({
        trips: state.trips,
        expenses: state.expenses,
        fuelSubmissions: state.fuelSubmissions,
        incidents: state.incidents,
        notifications: state.notifications,
        settlements: state.settlements,
        driverDocuments: state.driverDocuments,
        offlineQueue: state.offlineQueue,
        networkStatus: state.networkStatus,
        language: state.language,
        onDuty: state.onDuty,
      }),
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<AppStore>;
        return {
          ...currentState,
          ...persisted,
          driver: currentState.driver,
          driverDocuments: currentState.driverDocuments,
        };
      },
    }
  )
);
