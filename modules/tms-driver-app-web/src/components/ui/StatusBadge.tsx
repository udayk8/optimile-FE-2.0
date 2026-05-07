import { StatusChip } from "./StatusChip";

export function StatusBadge({ status }: { status: string }) {
  return <StatusChip status={status} />;
}
