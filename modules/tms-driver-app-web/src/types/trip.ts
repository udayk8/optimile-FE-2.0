import type { Delivery } from "./delivery";
import type { Expense, FuelSubmission } from "./expense";
import type { Incident } from "./incident";

export type TripStatus =
  | "ASSIGNED"
  | "DISPATCHED"
  | "READY_FOR_TRANSIT"
  | "IN_TRANSIT"
  | "ARRIVED"
  | "DELIVERED"
  | "EXCEPTION"
  | "COMPLETED"
  | "CANCELLED"
  | "REASSIGNED";

export interface TripMilestone {
  status: TripStatus;
  timestamp: string;
}

export interface TripVehicle {
  id: string;
  registrationNo: string;
  type: string;
  capacity: string;
}

export interface TripParty {
  name: string;
  phone: string;
}

export interface Checklist {
  vehicleConfirmed: boolean;
  loadingComplete: boolean;
  loadingPhotos: string[];
  cargoConditionRemark: string;
  sealNumber: string;
  odometerStart: string;
}

export interface RoutePoint {
  label: string;
  lat: number;
  lng: number;
  tone: "driver" | "pickup" | "drop";
}

export interface TripRemark {
  type: string;
  note: string;
  timestamp: string;
}

export interface Trip {
  id: string;
  bookingRef: string;
  status: TripStatus;
  origin: string;
  destination: string;
  eta: string;
  vehicle: TripVehicle;
  customer: TripParty;
  consignee: TripParty;
  pickupLocation: {
    label: string;
    lat: number;
    lng: number;
  };
  consignorName: string;
  consignorPhone: string;
  pickupDateTime: string;
  ewayBill: {
    number: string;
    validUntil: string;
  };
  checklist: Checklist;
  deliveries: Delivery[];
  expenses: Expense[];
  fuelSubmissions: FuelSubmission[];
  incidents: Incident[];
  milestoneHistory: TripMilestone[];
  instructions: string;
  routePoints: RoutePoint[];
  remarks: TripRemark[];
  linkedExceptions: string[];
  uploadedEvidence: string[];
}
