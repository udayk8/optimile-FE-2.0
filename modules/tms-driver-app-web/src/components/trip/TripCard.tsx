import { useNavigate } from "react-router-dom";
import type { Trip } from "@/types/trip";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { routes } from "@/router/routes";

export function TripCard({ trip }: { trip: Trip }) {
  const navigate = useNavigate();
  const nextDelivery = trip.deliveries.find((delivery) => delivery.status !== "DELIVERED");

  return (
    <Card className="trip-card">
      <button className="trip-card-button" onClick={() => navigate(routes.tripDetail(trip.id))}>
        <div className="space-between">
          <div>
            <div className="trip-id">{trip.id}</div>
            <div className="muted">{trip.bookingRef}</div>
          </div>
          <StatusBadge status={trip.status} />
        </div>
        <div className="trip-grid" style={{ marginBottom: 12 }}>
          <div>
            <div className="meta-label">Pickup</div>
            <div>{trip.consignorName}</div>
            <div className="muted">{trip.vehicle.registrationNo}</div>
          </div>
          <div>
            <div className="meta-label">Deliveries</div>
            <div>{trip.deliveries.length}</div>
            <div className="muted">{nextDelivery ? `Next ${nextDelivery.label}` : "All delivered"}</div>
          </div>
        </div>
        <div className="space-between">
          <div className="muted">ETA {new Date(trip.eta).toLocaleString()}</div>
          <span className="btn btn-ghost">View Details</span>
        </div>
      </button>
    </Card>
  );
}
