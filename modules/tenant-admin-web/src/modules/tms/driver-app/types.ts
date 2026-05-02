import type { BookingRecord } from "../booking/types";
import type { TenantDriver, TenantVehicle } from "../../../types/fleet";

export type DriverAvailabilityStatus = "AVAILABLE" | "UNAVAILABLE";
export type DriverSyncStatus = "ONLINE" | "OFFLINE";
export type DriverIncidentType = "BREAKDOWN" | "DELAY" | "DAMAGE" | "ROUTE_ISSUE";
export type DriverExpenseType = "FUEL" | "TOLL" | "PARKING";

export type DriverChecklistRecord = {
  bookingId: string;
  vehicleConfirmed: boolean;
  loadingComplete: boolean;
  loadingPhotoName?: string;
  remarks?: string;
  completedAt?: string | null;
};

export type DriverPodFormInput = {
  photoName: string;
  recipientName: string;
  deliveredQuantity: string;
  acknowledgementMode: "OTP" | "SIGNATURE";
  remarks: string;
};

export type DriverIncidentRecord = {
  id: string;
  tenantId: string;
  bookingId: string;
  driverId: string;
  type: DriverIncidentType;
  description: string;
  photoName?: string;
  createdAt: string;
};

export type DriverExpenseRecord = {
  id: string;
  tenantId: string;
  bookingId: string;
  driverId: string;
  type: DriverExpenseType;
  amount: number;
  notes?: string;
  photoName?: string;
  createdAt: string;
};

export type DriverOfflineAction =
  | { id: string; type: "START_TRIP"; bookingId: string; createdAt: string }
  | { id: string; type: "MARK_ARRIVAL"; bookingId: string; createdAt: string }
  | {
      id: string;
      type: "CAPTURE_POD";
      bookingId: string;
      deliveryId: string;
      payload: DriverPodFormInput;
      createdAt: string;
    }
  | {
      id: string;
      type: "RAISE_INCIDENT";
      bookingId: string;
      payload: Pick<DriverIncidentRecord, "type" | "description" | "photoName">;
      createdAt: string;
    }
  | {
      id: string;
      type: "ADD_EXPENSE";
      bookingId: string;
      payload: Pick<DriverExpenseRecord, "type" | "amount" | "notes" | "photoName">;
      createdAt: string;
    };

export type DriverSession = {
  tenantId: string;
  driverId: string;
  phone: string;
  loggedInAt: string;
};

export type DriverTrip = {
  booking: BookingRecord;
  driver: TenantDriver;
  vehicle: TenantVehicle | null;
  destinations: string[];
  instructions: string;
  totalWeight: number;
  completedDeliveries: number;
  pendingDeliveries: number;
  lastStatusAt: string;
};
