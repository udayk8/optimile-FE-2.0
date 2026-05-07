import { ChevronRight, FileText } from "lucide-react";
import { Card } from "@/components/ui/Card";
import type { Delivery } from "@/types/delivery";

const entries = [
  { key: "invoiceCopy", label: "Invoice Copy" },
  { key: "ewayBill", label: "E-Way Bill" },
  { key: "lrCopy", label: "LR Copy" },
] as const;

export function DeliveryDocList({ deliveries }: { deliveries: Delivery[] }) {
  return (
    <div className="stack">
      {deliveries.map((delivery) => (
        <div key={delivery.id} className="stack">
          <h2 className="heading">{delivery.label.replace("D", "Delivery ")}</h2>
          {entries.map((entry) => (
            <Card key={entry.key} className="doc-row">
              <div className="row">
                <div className="doc-icon">
                  <FileText size={18} />
                </div>
                <div>{entry.label}</div>
              </div>
              <div className="row muted">
                <span>Preview mock</span>
                <ChevronRight size={16} />
              </div>
            </Card>
          ))}
        </div>
      ))}
    </div>
  );
}
