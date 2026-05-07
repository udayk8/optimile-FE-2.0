import type { Settlement } from "@/types/expense";

export const mockSettlements: Settlement[] = [
  {
    driverId: "DRV-001",
    tripId: "TRIP-1001",
    advanceAmount: 5000,
    approvedExpenseTotal: 6200,
    pendingExpenseTotal: 1400,
    rejectedExpenseTotal: 300,
    netSettlementAmount: 1200,
    status: "PENDING",
  },
];
