export type IncidentType =
  | "Breakdown"
  | "Accident / Emergency"
  | "Route Deviation"
  | "Unauthorized Stoppage"
  | "Consignee Refusal"
  | "Goods Damage"
  | "Delay"
  | "Document Issue"
  | "Driver Unreachable"
  | "E-Way Bill Expiring";

export type Severity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type IncidentStatus = "OPEN" | "ACKNOWLEDGED" | "RESOLVED";

export interface Incident {
  id: string;
  tripId: string;
  driverId: string;
  vehicleId: string;
  type: IncidentType;
  severity: Severity;
  description: string;
  immediateAssistanceRequired: boolean;
  photoUrls: string[];
  timestamp: string;
  gpsLocation: {
    lat: number;
    lng: number;
  };
  status: IncidentStatus;
}
