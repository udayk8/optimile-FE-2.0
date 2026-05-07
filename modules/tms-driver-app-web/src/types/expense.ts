export type ExpenseCategory =
  | "Toll"
  | "Parking"
  | "Detention"
  | "Loading / Unloading Support"
  | "Emergency Repair"
  | "Miscellaneous";

export type SubmissionStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface FuelSubmission {
  id: string;
  tripId: string;
  vehicleId: string;
  driverId: string;
  odometerReading: number;
  litres: number;
  pricePerLitre: number;
  totalAmount: number;
  pumpName: string;
  receiptPhotoUrl: string;
  notes: string;
  timestamp: string;
  gpsLocation: {
    lat: number;
    lng: number;
  };
  status: SubmissionStatus;
}

export interface Expense {
  id: string;
  tripId: string;
  category: ExpenseCategory;
  amount: number;
  receiptPhotoUrl: string;
  description: string;
  timestamp: string;
  gpsLocation: {
    lat: number;
    lng: number;
  };
  status: SubmissionStatus;
  rejectionReason: string | null;
}

export interface Settlement {
  driverId: string;
  tripId: string;
  advanceAmount: number;
  approvedExpenseTotal: number;
  pendingExpenseTotal: number;
  rejectedExpenseTotal: number;
  netSettlementAmount: number;
  status: "PENDING" | "APPROVED" | "PAID" | "RECOVERABLE";
}
