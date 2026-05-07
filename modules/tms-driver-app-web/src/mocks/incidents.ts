import type { Incident } from "@/types/incident";

export const mockIncidents: Incident[] = [
  {
    id: "INC-001",
    tripId: "TRIP-1005",
    driverId: "DRV-001",
    vehicleId: "VEH-101",
    type: "Breakdown",
    severity: "HIGH",
    description: "Vehicle tyre burst near highway toll plaza",
    immediateAssistanceRequired: true,
    photoUrls: ["/mock/breakdown.jpg"],
    timestamp: "2026-05-05T10:15:00",
    gpsLocation: {
      lat: 12.2958,
      lng: 76.6394,
    },
    status: "OPEN",
  },
];
