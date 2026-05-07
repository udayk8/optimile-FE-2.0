import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import type { Driver } from "@/types/driver";
import type { Incident, IncidentType, Severity } from "@/types/incident";
import type { Trip } from "@/types/trip";

const types: IncidentType[] = [
  "Breakdown",
  "Accident / Emergency",
  "Route Deviation",
  "Unauthorized Stoppage",
  "Consignee Refusal",
  "Goods Damage",
  "Delay",
  "Document Issue",
  "Driver Unreachable",
  "E-Way Bill Expiring",
];

const severities: Severity[] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

export function IncidentForm({
  trips,
  driver,
  onSubmit,
}: {
  trips: Trip[];
  driver: Driver;
  onSubmit: (incident: Incident) => void;
}) {
  const eligibleTrips = trips.filter((trip) =>
    ["ASSIGNED", "DISPATCHED", "READY_FOR_TRANSIT", "IN_TRANSIT", "ARRIVED", "DELIVERED", "EXCEPTION"].includes(trip.status)
  );
  const [tripId, setTripId] = useState(eligibleTrips[0]?.id ?? "");
  const [type, setType] = useState<IncidentType>("Breakdown");
  const [severity, setSeverity] = useState<Severity>("HIGH");
  const [description, setDescription] = useState("");
  const [immediateAssistanceRequired, setImmediateAssistanceRequired] = useState(true);

  const selectedTrip = eligibleTrips.find((trip) => trip.id === tripId) ?? eligibleTrips[0];
  const valid = Boolean(selectedTrip) && description.trim().length > 0;

  return (
    <div className="stack">
      {!eligibleTrips.length ? <p className="subheading">No active trip is available for incident reporting.</p> : null}
      <div className="grid-2">
        <label>
          <span className="field-label">Trip</span>
          <select className="select" value={tripId} onChange={(event) => setTripId(event.target.value)} disabled={!eligibleTrips.length}>
            {eligibleTrips.map((trip) => (
              <option key={trip.id} value={trip.id}>
                {trip.id}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="field-label">Incident Type</span>
          <select className="select" value={type} onChange={(event) => setType(event.target.value as IncidentType)}>
            {types.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="grid-2">
        <label>
          <span className="field-label">Severity</span>
          <select className="select" value={severity} onChange={(event) => setSeverity(event.target.value as Severity)}>
            {severities.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
        <label>
          <span className="field-label">Trip Vehicle</span>
          <Input value={selectedTrip?.vehicle.registrationNo ?? driver.assignedVehicle.registrationNo} disabled />
        </label>
      </div>
      <label>
        <span className="field-label">Description</span>
        <Textarea value={description} onChange={(event) => setDescription(event.target.value)} />
      </label>
      <label className="checkline">
        <input
          type="checkbox"
          checked={immediateAssistanceRequired}
          onChange={(event) => setImmediateAssistanceRequired(event.target.checked)}
        />
        <span>Immediate assistance required</span>
      </label>
      <Button
        variant="primary"
        disabled={!valid}
        onClick={() =>
          onSubmit({
            id: `INC-${Date.now()}`,
            tripId: selectedTrip.id,
            driverId: driver.id,
            vehicleId: selectedTrip.vehicle.id,
            type,
            severity,
            description,
            immediateAssistanceRequired,
            photoUrls: ["/mock/breakdown.jpg"],
            timestamp: new Date().toISOString(),
            gpsLocation: { lat: 12.2958, lng: 76.6394 },
            status: "OPEN",
          })
        }
      >
        Raise Incident
      </Button>
    </div>
  );
}
