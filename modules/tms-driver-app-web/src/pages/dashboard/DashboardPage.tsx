import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Compass, LocateFixed } from "lucide-react";
import { ComplianceAlert } from "@/components/ComplianceAlert";
import { NetworkSyncBar } from "@/components/NetworkSyncBar";
import { RouteMap } from "@/components/trip/RouteMap";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useAppStore } from "@/store/useAppStore";
import { routes } from "@/router/routes";

export function DashboardPage() {
  const navigate = useNavigate();
  const { trips, driver } = useAppStore();
  const activeTrip = useMemo(
    () =>
      trips.find((trip) =>
        ["ASSIGNED", "DISPATCHED", "READY_FOR_TRANSIT", "IN_TRANSIT", "ARRIVED", "DELIVERED", "EXCEPTION"].includes(trip.status)
      ) ?? null,
    [trips]
  );

  if (!activeTrip) {
    return <div className="page-shell stack"><Card>No active trip available.</Card></div>;
  }

  return (
    <div className="page-shell stack home-page">
      <NetworkSyncBar />
      <Card className="stack map-stage">
        <div className="space-between">
          <Button variant="ghost">
            <Compass size={16} />
          </Button>
          <Button variant="ghost">
            <LocateFixed size={16} />
          </Button>
        </div>
        <RouteMap trip={activeTrip} />
        <div className="eta-strip">
          <div className="eta-speed">
            <div className="eta-speed-value">0</div>
            <div className="muted">Km/hr</div>
          </div>
          <div className="eta-details">
            <strong>Arrive in Delivery 1 6 h 15 m (308 km)</strong>
            <div className="muted">{driver.assignedVehicle.registrationNo}</div>
          </div>
        </div>
      </Card>

      <Card className="stack">
        <div className="space-between">
          <div>
            <h1 className="page-title">Home</h1>
            <p className="page-meta">Primary driver map view with the active execution trip.</p>
          </div>
          <Button variant="primary" onClick={() => navigate(routes.tripDetail(activeTrip.id))}>
            Open trip
          </Button>
        </div>
        <div className="trip-grid">
          <div>
            <div className="meta-label">Pickup location</div>
            <div>{activeTrip.pickupLocation.label}</div>
          </div>
          <div>
            <div className="meta-label">Consignor</div>
            <div>{activeTrip.consignorName}</div>
          </div>
          <div>
            <div className="meta-label">Deliveries</div>
            <div>{activeTrip.deliveries.length}</div>
          </div>
          <div>
            <div className="meta-label">Status</div>
            <div>{activeTrip.status}</div>
          </div>
        </div>
      </Card>

      <Card className="stack">
        <h2 className="heading">Compliance alerts</h2>
        {driver.complianceDocs.map((doc) => (
          <ComplianceAlert key={doc.label} doc={doc} />
        ))}
      </Card>
    </div>
  );
}
