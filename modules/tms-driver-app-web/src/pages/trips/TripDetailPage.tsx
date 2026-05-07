import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { MapPin } from "lucide-react";
import { DeliveryCard } from "@/components/trip/DeliveryCard";
import { PreDepartureChecklist } from "@/components/trip/PreDepartureChecklist";
import { RemarksModal } from "@/components/trip/RemarksModal";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useToast } from "@/components/ui/Toast";
import { routes } from "@/router/routes";
import { useAppStore } from "@/store/useAppStore";
import { tripService } from "@/services/tripService";

export function TripDetailPage() {
  const { tripId } = useParams();
  const navigate = useNavigate();
  const { trips, updateChecklist } = useAppStore();
  const { push } = useToast();
  const [remarksOpen, setRemarksOpen] = useState(false);

  const trip = useMemo(() => trips.find((item) => item.id === tripId) ?? null, [tripId, trips]);
  const checklistReady = Boolean(
    trip?.checklist.vehicleConfirmed &&
      trip.checklist.loadingComplete &&
      trip.checklist.odometerStart.trim().length > 0
  );

  if (!trip) {
    return (
      <div className="page-shell">
        <EmptyState title="Trip not found" description="This trip does not exist in the mock store." />
      </div>
    );
  }

  const progressionDisabled = trip.status === "EXCEPTION";

  return (
    <div className="page-shell stack">
      <RemarksModal tripId={trip.id} open={remarksOpen} onClose={() => setRemarksOpen(false)} />

      <div className="space-between">
        <div>
          <h1 className="page-title">Trip Details</h1>
          <p className="page-meta">
            {trip.id} · {trip.bookingRef}
          </p>
        </div>
        <StatusBadge status={trip.status} />
      </div>

      {trip.status === "EXCEPTION" ? (
        <div className="emergency-banner">
          <strong>Exception active.</strong> Normal progression is blocked until ops reviews the linked incident.
        </div>
      ) : null}

      <Card className="stack">
        <div className="space-between">
          <div className="row">
            <div className="pickup-pin pickup-pin-blue">
              <MapPin size={18} />
            </div>
            <div>
              <div className="meta-label">Pickup location</div>
              <strong>{trip.pickupLocation.label}</strong>
            </div>
          </div>
          <Link className="link-action" to={routes.tripDocuments(trip.id)}>
            View Documents
          </Link>
        </div>
        <div className="trip-grid">
          <div>
            <div className="meta-label">Consignor name</div>
            <div>{trip.consignorName}</div>
          </div>
          <div>
            <div className="meta-label">Consignor phone</div>
            <div>{trip.consignorPhone}</div>
          </div>
          <div>
            <div className="meta-label">Pickup date & time</div>
            <div>{new Date(trip.pickupDateTime).toLocaleString()}</div>
          </div>
          <div>
            <div className="meta-label">Deliveries</div>
            <div>{trip.deliveries.length}</div>
          </div>
        </div>
      </Card>

      <Card className="stack">
        <div className="space-between">
          <div>
            <h2 className="heading">Pre-Departure Checklist</h2>
            <p className="subheading">Vehicle confirmation, loading, and odometer are mandatory.</p>
          </div>
          <StatusBadge status={checklistReady ? "READY" : "PENDING"} />
        </div>
        <PreDepartureChecklist checklist={trip.checklist} onChange={(next) => updateChecklist(trip.id, next)} />
      </Card>

      <Card className="stack">
        <h2 className="heading">Trip progression</h2>
        <div className="row wrap-row">
          {trip.status === "ASSIGNED" ? (
            <Button
              variant="primary"
              onClick={async () => {
                await tripService.acknowledgeTrip(trip.id);
                push("Trip acknowledged", "success");
              }}
            >
              Acknowledge Trip
            </Button>
          ) : null}
          {trip.status === "DISPATCHED" ? (
            <Button
              variant="primary"
              disabled={!checklistReady || progressionDisabled}
              onClick={async () => {
                await tripService.transitionTrip(trip.id, "READY_FOR_TRANSIT");
                push("Checklist completed", "success");
              }}
            >
              Mark Ready For Transit
            </Button>
          ) : null}
          {trip.status === "READY_FOR_TRANSIT" ? (
            <Button
              variant="primary"
              disabled={progressionDisabled}
              onClick={async () => {
                await tripService.transitionTrip(trip.id, "IN_TRANSIT");
                push("Trip marked in transit", "success");
              }}
            >
              Mark In Transit
            </Button>
          ) : null}
          {trip.status === "IN_TRANSIT" ? (
            <Button
              variant="primary"
              disabled={progressionDisabled}
              onClick={async () => {
                await tripService.transitionTrip(trip.id, "ARRIVED");
                push("Arrival marked", "success");
              }}
            >
              Mark Arrival
            </Button>
          ) : null}
          <Button variant="ghost" onClick={() => setRemarksOpen(true)}>
            Add remarks
          </Button>
        </div>
      </Card>

      <div className="stack">
        {trip.deliveries.map((delivery) => (
          <DeliveryCard key={delivery.id} tripId={trip.id} delivery={delivery} />
        ))}
      </div>

      <Card className="space-between">
        <Button variant="ghost" onClick={() => navigate(routes.tripDocuments(trip.id))}>
          Manage delivery documents
        </Button>
        <Button variant="ghost" onClick={() => setRemarksOpen(true)}>
          Add remarks
        </Button>
      </Card>
    </div>
  );
}
