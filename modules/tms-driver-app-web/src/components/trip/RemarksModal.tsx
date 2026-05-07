import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { remarkTypes } from "@/mocks/remarks";
import { tripService } from "@/services/tripService";

export function RemarksModal({
  tripId,
  open,
  onClose,
}: {
  tripId: string;
  open: boolean;
  onClose: () => void;
}) {
  const [type, setType] = useState(remarkTypes[0]);
  const [note, setNote] = useState("");

  return (
    <Modal open={open} title="Add remark" onClose={onClose}>
      <div className="stack">
        <label>
          <span className="field-label">Remark type</span>
          <select className="select" value={type} onChange={(event) => setType(event.target.value)}>
            {remarkTypes.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
        <label>
          <span className="field-label">Note</span>
          <Textarea value={note} onChange={(event) => setNote(event.target.value)} />
        </label>
        <div className="row" style={{ justifyContent: "flex-end" }}>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={async () => {
              if (!note.trim()) return;
              await tripService.addRemark(tripId, { type, note });
              setNote("");
              onClose();
            }}
          >
            Submit
          </Button>
        </div>
      </div>
    </Modal>
  );
}
