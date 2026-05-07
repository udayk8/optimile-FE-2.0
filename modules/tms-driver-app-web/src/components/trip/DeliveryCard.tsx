import { MapPinned, Phone } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { DeliveryBadge } from "./DeliveryBadge";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Card } from "@/components/ui/Card";
import { routes } from "@/router/routes";
import type { Delivery } from "@/types/delivery";

export function DeliveryCard({
  tripId,
  delivery,
  compact = false,
}: {
  tripId: string;
  delivery: Delivery;
  compact?: boolean;
}) {
  const navigate = useNavigate();

  return (
    <Card className="stack delivery-card">
      <button className="trip-card-button delivery-card-button" onClick={() => navigate(routes.deliveryDetail(tripId, delivery.id))}>
        <div className="space-between">
          <div className="row">
            <DeliveryBadge label={delivery.label} />
            <div>
              <div className="meta-label">{compact ? "Delivery" : `${delivery.label} Location`}</div>
              <strong>{delivery.location}</strong>
            </div>
          </div>
          <StatusBadge status={delivery.status} />
        </div>
        {!compact ? (
          <>
            <div className="trip-grid">
              <div>
                <div className="meta-label">Consignee</div>
                <div>{delivery.consigneeName}</div>
              </div>
              <div>
                <div className="meta-label">Phone</div>
                <div>{delivery.consigneePhone}</div>
              </div>
              <div>
                <div className="meta-label">Material</div>
                <div>{delivery.materialType}</div>
              </div>
              <div>
                <div className="meta-label">Quantity</div>
                <div>{delivery.quantity}</div>
              </div>
            </div>
            <div className="space-between">
              <span className="muted row">
                <MapPinned size={14} />
                Navigate to delivery
              </span>
              <span className="muted row">
                <Phone size={14} />
                Call consignee
              </span>
            </div>
          </>
        ) : null}
      </button>
    </Card>
  );
}
