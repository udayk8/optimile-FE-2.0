import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ImagePlus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input, Textarea } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { routes } from "@/router/routes";
import { useAppStore } from "@/store/useAppStore";
import { tripService } from "@/services/tripService";

export function UploadPODPage() {
  const { tripId, deliveryId } = useParams();
  const navigate = useNavigate();
  const { trips } = useAppStore();
  const { push } = useToast();

  const trip = useMemo(() => trips.find((item) => item.id === tripId) ?? null, [tripId, trips]);
  const delivery = trip?.deliveries.find((item) => item.id === deliveryId) ?? null;

  const [photos, setPhotos] = useState<string[]>([]);
  const [recipientName, setRecipientName] = useState("");
  const [deliveredQuantity, setDeliveredQuantity] = useState(String(delivery?.quantity ?? ""));
  const [otpConfirmed, setOtpConfirmed] = useState(true);
  const [signatureCaptured, setSignatureCaptured] = useState(false);
  const [remark, setRemark] = useState("Delivered successfully");

  if (!trip || !delivery) {
    return <div className="page-shell"><EmptyState title="Delivery not found" description="The selected delivery is missing from mock state." /></div>;
  }

  const valid =
    photos.length > 0 &&
    recipientName.trim().length > 0 &&
    Number(deliveredQuantity) > 0 &&
    (otpConfirmed || signatureCaptured);

  return (
    <div className="page-shell stack">
      <div>
        <h1 className="page-title">Upload POD</h1>
        <p className="page-meta">{delivery.label}</p>
      </div>

      <Card className="stack pod-card">
        {!photos.length ? (
          <EmptyState title="No photos" description="Add at least one POD photo to continue." />
        ) : (
          <div className="pod-grid">
            {photos.map((photo) => (
              <div key={photo} className="pod-thumb">{photo}</div>
            ))}
          </div>
        )}
        <Button variant="primary" onClick={() => setPhotos((current) => [...current, `/mock/pod-photo-${current.length + 1}.jpg`])}>
          <ImagePlus size={16} />
          Add photo
        </Button>
      </Card>

      <Card className="stack">
        <label>
          <span className="field-label">Recipient name</span>
          <Input value={recipientName} onChange={(event) => setRecipientName(event.target.value)} />
        </label>
        <label>
          <span className="field-label">Delivered quantity</span>
          <Input type="number" value={deliveredQuantity} onChange={(event) => setDeliveredQuantity(event.target.value)} />
        </label>
        <label className="checkline">
          <input type="checkbox" checked={otpConfirmed} onChange={(event) => setOtpConfirmed(event.target.checked)} />
          <span>OTP confirmation</span>
        </label>
        <label className="checkline">
          <input type="checkbox" checked={signatureCaptured} onChange={(event) => setSignatureCaptured(event.target.checked)} />
          <span>Signature captured</span>
        </label>
        <label>
          <span className="field-label">POD remark</span>
          <Textarea value={remark} onChange={(event) => setRemark(event.target.value)} />
        </label>
        {!valid ? <div className="form-error">Add at least 1 photo, recipient name, quantity, and OTP or signature.</div> : null}
        <Button
          variant="primary"
          disabled={!valid}
          onClick={async () => {
            await tripService.submitPOD(trip.id, delivery.id, {
              recipientName,
              deliveredQuantity: Number(deliveredQuantity),
              uom: "Bags",
              otpConfirmed,
              signatureCaptured,
              photos,
              timestamp: new Date().toISOString(),
              gpsLocation: { lat: 12.9716, lng: 77.5946 },
              remark,
            });
            push("POD submitted", "success");
            navigate(routes.tripDetail(trip.id));
          }}
        >
          Submit POD
        </Button>
      </Card>
    </div>
  );
}
