import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import type { POD } from "@/types/delivery";

export function PODForm({
  onSubmit,
}: {
  onSubmit: (pod: POD) => void;
}) {
  const [form, setForm] = useState({
    recipientName: "",
    deliveredQuantity: "",
    otpConfirmed: false,
    signatureCaptured: false,
    photos: ["/mock/pod-photo.jpg"],
    shortDeliveryNote: "",
    damageNote: "",
    remark: "",
  });

  const isValid =
    Boolean(form.recipientName.trim()) &&
    Boolean(form.deliveredQuantity) &&
    Boolean(form.photos.length) &&
    (form.otpConfirmed || form.signatureCaptured);

  return (
    <div className="stack">
      <div className="grid-2">
        <label>
          <span className="field-label">Recipient name</span>
          <Input value={form.recipientName} onChange={(event) => setForm((current) => ({ ...current, recipientName: event.target.value }))} />
        </label>
        <label>
          <span className="field-label">Delivered quantity</span>
          <Input
            type="number"
            value={form.deliveredQuantity}
            onChange={(event) => setForm((current) => ({ ...current, deliveredQuantity: event.target.value }))}
          />
        </label>
      </div>
      <div className="grid-2">
        <label className="checkline">
          <input
            type="checkbox"
            checked={form.otpConfirmed}
            onChange={(event) => setForm((current) => ({ ...current, otpConfirmed: event.target.checked }))}
          />
          <span>OTP confirmation</span>
        </label>
        <label className="checkline">
          <input
            type="checkbox"
            checked={form.signatureCaptured}
            onChange={(event) => setForm((current) => ({ ...current, signatureCaptured: event.target.checked }))}
          />
          <span>Signature captured</span>
        </label>
      </div>
      <label>
        <span className="field-label">Short delivery note</span>
        <Textarea value={form.shortDeliveryNote} onChange={(event) => setForm((current) => ({ ...current, shortDeliveryNote: event.target.value }))} />
      </label>
      <label>
        <span className="field-label">Damage note</span>
        <Textarea value={form.damageNote} onChange={(event) => setForm((current) => ({ ...current, damageNote: event.target.value }))} />
      </label>
      <label>
        <span className="field-label">POD remark</span>
        <Textarea value={form.remark} onChange={(event) => setForm((current) => ({ ...current, remark: event.target.value }))} />
      </label>
      <Button
        variant="primary"
        disabled={!isValid}
        onClick={() =>
          onSubmit({
            recipientName: form.recipientName,
            deliveredQuantity: Number(form.deliveredQuantity),
            uom: "Boxes",
            otpConfirmed: form.otpConfirmed,
            signatureCaptured: form.signatureCaptured,
            photos: form.photos,
            timestamp: new Date().toISOString(),
            gpsLocation: {
              lat: 12.9716,
              lng: 77.5946,
            },
            shortDeliveryNote: form.shortDeliveryNote,
            damageNote: form.damageNote,
            remark: form.remark || "Delivered successfully",
          })
        }
      >
        Submit POD
      </Button>
    </div>
  );
}
