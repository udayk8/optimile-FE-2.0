import { mockTrips } from "@/mocks/trips";
import { useAppStore } from "@/store/useAppStore";
import { delay } from "./mockDelay";
import type { POD, SubDelivery } from "@/types/delivery";
import type { Checklist, TripRemark, TripStatus } from "@/types/trip";

export const tripService = {
  getAllTrips: async () => {
    await delay(250);
    return useAppStore.getState().trips.length ? useAppStore.getState().trips : mockTrips;
  },
  getTripById: async (tripId: string) => {
    await delay(180);
    return useAppStore.getState().trips.find((trip) => trip.id === tripId) ?? null;
  },
  getActiveTrip: async () => {
    await delay(180);
    return (
      useAppStore
        .getState()
        .trips.find((trip) =>
          ["ASSIGNED", "DISPATCHED", "READY_FOR_TRANSIT", "IN_TRANSIT", "ARRIVED", "DELIVERED", "EXCEPTION"].includes(trip.status)
        ) ?? null
    );
  },
  acknowledgeTrip: async (tripId: string) => {
    await delay(180);
    useAppStore.getState().acknowledgeTrip(tripId);
  },
  updateChecklist: async (tripId: string, checklist: Partial<Checklist>) => {
    await delay(120);
    useAppStore.getState().updateChecklist(tripId, checklist);
  },
  transitionTrip: async (tripId: string, nextStatus: TripStatus) => {
    await delay(160);
    const store = useAppStore.getState();
    if (nextStatus === "READY_FOR_TRANSIT") store.markReadyForTransit(tripId);
    if (nextStatus === "IN_TRANSIT") store.markInTransit(tripId);
    if (nextStatus === "ARRIVED") store.markArrival(tripId);
    if (nextStatus === "COMPLETED") store.completeTrip(tripId);
  },
  startDelivery: async (tripId: string, deliveryId: string) => {
    await delay(150);
    useAppStore.getState().startDelivery(tripId, deliveryId);
  },
  addSubDelivery: async (tripId: string, deliveryId: string, subDelivery: SubDelivery) => {
    await delay(200);
    useAppStore.getState().addSubDelivery(tripId, deliveryId, subDelivery);
  },
  endDelivery: async (tripId: string, deliveryId: string) => {
    await delay(180);
    useAppStore.getState().endDelivery(tripId, deliveryId);
  },
  submitPOD: async (tripId: string, deliveryId: string, pod: POD) => {
    await delay(220);
    useAppStore.getState().submitPOD(tripId, deliveryId, pod);
  },
  addRemark: async (tripId: string, remark: Omit<TripRemark, "timestamp">) => {
    await delay(150);
    useAppStore.getState().addTripRemark(tripId, { ...remark, timestamp: new Date().toISOString() });
  },
};
