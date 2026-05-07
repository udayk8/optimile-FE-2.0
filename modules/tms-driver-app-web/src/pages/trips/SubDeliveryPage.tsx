import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { MapPin } from "lucide-react";
import { DeliveryBadge } from "@/components/trip/DeliveryBadge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";
import { routes } from "@/router/routes";
import { useAppStore } from "@/store/useAppStore";
import { tripService } from "@/services/tripService";

const mockSubDeliveryAddress = {
  label:
    "XMCJ+9PC, Basavanagar Main Rd, Sector C, BTM Dollars Scheme, Doddanekkundi, Bengaluru, Karnataka 560037, India",
  lat: 12.9784,
  lng: 77.6408,
};

export function SubDeliveryPage() {
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
        <h1 className="page-title">Sub-delivery</h1>
        <p className="page-meta">{delivery.label}</p>
      </div>

      <Card className="stack">
        <div className="row">
          <DeliveryBadge label={delivery.label} />
          <div>
            <div className="meta-label">{delivery.label} Location</div>
            <strong>{delivery.location}</strong>
          </div>
        </div>
      </Card>

      <Card className="stack">
        <div className="meta-label">Sub-delivery {delivery.subDeliveries.length + 1}</div>
        <div className="row">
          <div className="pickup-pin pickup-pin-blue">
            <MapPin size={18} />
          </div>
          <div>
            <div className="muted">Started in</div>
            <strong>{mockSubDeliveryAddress.label}</strong>
          </div>
        </div>
      </Card>

      <Button
        variant="primary"
        onClick={async () => {
          await tripService.addSubDelivery(trip.id, delivery.id, {
            id: `SUB-${Date.now()}`,
            label: `Sub-delivery ${delivery.subDeliveries.length + 1}`,
            startAddress: mockSubDeliveryAddress.label,
            startLat: mockSubDeliveryAddress.lat,
            startLng: mockSubDeliveryAddress.lng,
            confirmedAt: new Date().toISOString(),
          });
          push("Sub-delivery added", "success");
          navigate(routes.deliveryDetail(trip.id, delivery.id));
        }}
      >
        Confirm address
      </Button>
    </div>
  );
}
