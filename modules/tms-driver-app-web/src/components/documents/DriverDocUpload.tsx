import { CloudUpload } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { DriverDocument } from "@/types/document";

export function DriverDocUpload({
  doc,
  onUpload,
}: {
  doc: DriverDocument;
  onUpload: () => void;
}) {
  return (
    <Card className={`stack ${doc.isExpiring ? "doc-upload-expiring" : "doc-upload-valid"}`}>
      <div className="space-between">
        <div>
          <strong>
            {doc.label}
            {doc.mandatory ? " *" : ""}
          </strong>
          <div className="muted">{doc.uploaded ? "Uploaded" : "Not uploaded"}</div>
        </div>
        <Button variant="ghost" onClick={onUpload}>
          <CloudUpload size={16} />
          Upload
        </Button>
      </div>
      {doc.expiryDate ? <div className="muted">Expiry: {doc.expiryDate}</div> : null}
      {doc.isExpiring ? <div className="form-error">{doc.label} is set to expire, please extend validity.</div> : null}
    </Card>
  );
}
