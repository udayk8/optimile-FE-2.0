import { Download } from "lucide-react";
import { Card } from "@/components/ui/Card";

export function DocViewItem({ label, url }: { label: string; url: string | null }) {
  return (
    <Card className="doc-row">
      <div>
        <strong>{label}</strong>
        <div className="muted">{url ? url : "No document uploaded"}</div>
      </div>
      <div className="row muted">
        <Download size={16} />
        Download
      </div>
    </Card>
  );
}
