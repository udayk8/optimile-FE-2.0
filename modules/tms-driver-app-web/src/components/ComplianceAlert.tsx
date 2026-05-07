import type { ComplianceDoc } from "@/types/driver";
import { StatusBadge } from "./ui/StatusBadge";

export function ComplianceAlert({ doc }: { doc: ComplianceDoc }) {
  return (
    <div className="compliance-alert">
      <div>
        <strong>{doc.label}</strong>
        <div className="muted">Expires {doc.expiresOn}</div>
      </div>
      <StatusBadge status={doc.status} />
    </div>
  );
}
