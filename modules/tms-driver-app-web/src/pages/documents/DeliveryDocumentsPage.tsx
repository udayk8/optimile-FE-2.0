import { useMemo } from "react";
import { useParams } from "react-router-dom";
import { DeliveryDocList } from "@/components/documents/DeliveryDocList";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { useAppStore } from "@/store/useAppStore";

export function DeliveryDocumentsPage() {
  const { tripId } = useParams();
  const { trips } = useAppStore();
  const trip = useMemo(() => trips.find((item) => item.id === tripId) ?? null, [tripId, trips]);

  if (!trip) {
    return <div className="page-shell"><EmptyState title="Trip not found" description="Unable to load delivery documents for this trip." /></div>;
  }

  return (
    <div className="page-shell stack">
      <div>
        <h1 className="page-title">Documents</h1>
        <p className="page-meta">{trip.id}</p>
      </div>
      <Card className="stack">
        <DeliveryDocList deliveries={trip.deliveries} />
      </Card>
    </div>
  );
}
