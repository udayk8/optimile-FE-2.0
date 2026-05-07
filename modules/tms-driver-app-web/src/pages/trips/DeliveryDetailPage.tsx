import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { DeliveryBadge } from "@/components/trip/DeliveryBadge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useToast } from "@/components/ui/Toast";
import { routes } from "@/router/routes";
import { useAppStore } from "@/store/useAppStore";
import { tripService } from "@/services/tripService";

export function DeliveryDetailPage() {
  const { tripId, deliveryId } = useParams();
  const navigate = useNavigate();
  const { trips } = useAppStore();
  const { push } = useToast();

  const trip = useMemo(() => trips.find((item) => item.id === tripId) ?? null, [tripId, trips]);
  const delivery = trip?.deliveries.find((item) => item.id === deliveryId) ?? null;

  if (!trip || !delivery) {
    return <div className="page-shell"><EmptyState title="Delivery not found" description="The selected delivery is missing from mock state." /></div>;
  }

  return (
    <div className="page-shell stack">
      <div>
        <h1 className="page-title">Delivery {delivery.label.replace("D", "")}</h1>
        <p className="page-meta">{trip.id}</p>
      </div>

      <Card className="stack">
        <div className="space-between">
          <div className="row">
            <DeliveryBadge label={delivery.label} />
            <div>
              <div className="meta-label">{delivery.label} Location</div>
              <strong>{delivery.location}</strong>
            </div>
          </div>
          <StatusBadge status={delivery.status} />
        </div>
        <div className="trip-grid">
          <div>
            <div className="meta-label">Consignee name</div>
            <div>{delivery.consigneeName}</div>
          </div>
          <div>
            <div className="meta-label">Consignee phone</div>
            <div>{delivery.consigneePhone}</div>
          </div>
          <div>
            <div className="meta-label">Material type</div>
            <div>{delivery.materialType}</div>
          </div>
          <div>
            <div className="meta-label">Quantity</div>
            <div>{delivery.quantity}</div>
          </div>
        </div>
      </Card>

      <Card className="stack">
        <h2 className="heading">Sub-deliveries</h2>
        {delivery.subDeliveries.length ? (
          delivery.subDeliveries.map((item) => (
            <div key={item.id} className="list-row">
              <div>
                <strong>{item.label}</strong>
                <div className="muted">{item.startAddress}</div>
              </div>
              <div className="muted">{new Date(item.confirmedAt).toLocaleString()}</div>
            </div>
          ))
        ) : (
          <p className="subheading">No sub-deliveries created yet.</p>
        )}
      </Card>

      <div className="split-actions">
        <Button
          variant="ghost"
          onClick={async () => {
            if (delivery.status === "PENDING") {
              await tripService.startDelivery(trip.id, delivery.id);
              push("Delivery started", "success");
            }
            navigate(routes.subDelivery(trip.id, delivery.id));
          }}
        >
          Add sub-delivery
        </Button>
        <Button
          variant="primary"
          onClick={async () => {
            if (delivery.status === "PENDING") {
              await tripService.startDelivery(trip.id, delivery.id);
            }
            await tripService.endDelivery(trip.id, delivery.id);
            push("Delivery ended. POD required.", "success");
            navigate(routes.uploadPod(trip.id, delivery.id));
          }}
        >
          End delivery
        </Button>
      </div>
    </div>
  );
}
