import type { Expense, FuelSubmission } from "@/types/expense";

export const mockFuelSubmissions: FuelSubmission[] = [
  {
    id: "FUEL-001",
    tripId: "TRIP-1001",
    vehicleId: "VEH-101",
    driverId: "DRV-001",
    odometerReading: 45210,
    litres: 80,
    pricePerLitre: 96,
    totalAmount: 7680,
    pumpName: "Indian Oil Highway Fuel Station",
    receiptPhotoUrl: "/mock/fuel-receipt.jpg",
    notes: "Filled before entering state border stretch.",
    timestamp: "2026-05-06T12:00:00",
    gpsLocation: {
      lat: 12.9716,
      lng: 77.5946,
    },
    status: "PENDING",
  },
];

export const mockExpenses: Expense[] = [
  {
    id: "EXP-001",
    tripId: "TRIP-1001",
    category: "Toll",
    amount: 650,
    receiptPhotoUrl: "/mock/toll-receipt.jpg",
    description: "Toll paid at highway plaza",
    timestamp: "2026-05-06T13:15:00",
    gpsLocation: {
      lat: 13.0827,
      lng: 80.2707,
    },
    status: "PENDING",
    rejectionReason: null,
  },
  {
    id: "EXP-002",
    tripId: "TRIP-1001",
    category: "Parking",
    amount: 300,
    receiptPhotoUrl: "/mock/parking.jpg",
    description: "Night halt parking",
    timestamp: "2026-05-05T22:00:00",
    gpsLocation: {
      lat: 12.972,
      lng: 77.58,
    },
    status: "REJECTED",
    rejectionReason: "Receipt image not readable",
  },
];
