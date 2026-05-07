import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import type { FuelSubmission } from "@/types/expense";
import type { Trip } from "@/types/trip";
import type { Driver } from "@/types/driver";

export function FuelForm({
  trip,
  driver,
  previousOdometer,
  onSubmit,
}: {
  trip: Trip;
  driver: Driver;
  previousOdometer: number;
  onSubmit: (fuel: FuelSubmission) => void;
}) {
  const [odometerReading, setOdometerReading] = useState("");
  const [litres, setLitres] = useState("");
  const [pricePerLitre, setPricePerLitre] = useState("");
  const [pumpName, setPumpName] = useState("");
  const [notes, setNotes] = useState("");

  const totalAmount = (Number(litres) || 0) * (Number(pricePerLitre) || 0);
  const odometerOk = Number(odometerReading) > previousOdometer;
  const litresOk = Number(litres) > 0 && Number(litres) <= driver.assignedVehicle.tankCapacityLitres;
  const receiptRequired = totalAmount > 5000;
  const valid = odometerOk && litresOk && Number(pricePerLitre) > 0 && pumpName.trim().length > 0;

  return (
    <div className="stack">
      <div className="grid-2">
        <label>
          <span className="field-label">Trip</span>
          <Input value={trip.id} disabled />
        </label>
        <label>
          <span className="field-label">Vehicle</span>
          <Input value={trip.vehicle.registrationNo} disabled />
        </label>
      </div>
      <div className="grid-3">
        <label>
          <span className="field-label">Odometer Reading</span>
          <Input type="number" value={odometerReading} onChange={(event) => setOdometerReading(event.target.value)} />
        </label>
        <label>
          <span className="field-label">Litres</span>
          <Input type="number" value={litres} onChange={(event) => setLitres(event.target.value)} />
        </label>
        <label>
          <span className="field-label">Price per litre</span>
          <Input type="number" value={pricePerLitre} onChange={(event) => setPricePerLitre(event.target.value)} />
        </label>
      </div>
      <div className="grid-2">
        <label>
          <span className="field-label">Pump name</span>
          <Input value={pumpName} onChange={(event) => setPumpName(event.target.value)} />
        </label>
        <label>
          <span className="field-label">Total Amount</span>
          <Input value={String(totalAmount)} disabled />
        </label>
      </div>
      <label>
        <span className="field-label">Notes</span>
        <Textarea value={notes} onChange={(event) => setNotes(event.target.value)} />
      </label>
      {!odometerOk ? <p className="form-error">Odometer must be greater than previous reading.</p> : null}
      {!litresOk ? <p className="form-error">Litres must be greater than 0 and within tank capacity.</p> : null}
      {receiptRequired ? <p className="muted">Receipt required above policy threshold. Mock receipt will be attached.</p> : null}
      <Button
        variant="primary"
        disabled={!valid}
        onClick={() =>
          onSubmit({
            id: `FUEL-${Date.now()}`,
            tripId: trip.id,
            vehicleId: trip.vehicle.id,
            driverId: driver.id,
            odometerReading: Number(odometerReading),
            litres: Number(litres),
            pricePerLitre: Number(pricePerLitre),
            totalAmount,
            pumpName,
            receiptPhotoUrl: "/mock/fuel-receipt.jpg",
            notes,
            timestamp: new Date().toISOString(),
            gpsLocation: { lat: 12.9716, lng: 77.5946 },
            status: "PENDING",
          })
        }
      >
        Submit Fuel Entry
      </Button>
    </div>
  );
}
