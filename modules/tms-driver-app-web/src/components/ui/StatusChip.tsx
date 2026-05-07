export function StatusChip({ status }: { status: string }) {
  const lower = status.toLowerCase();
  const tone =
    lower.includes("complete") ||
    lower.includes("approved") ||
    lower.includes("valid") ||
    lower.includes("excellent") ||
    lower === "delivered" ||
    lower === "ready"
      ? "chip-success"
      : lower.includes("cancel") ||
          lower.includes("reject") ||
          lower.includes("expired") ||
          lower.includes("critical") ||
          lower.includes("exception") ||
          lower.includes("coaching")
        ? "chip-danger"
        : lower.includes("soon") ||
            lower.includes("pending") ||
            lower.includes("loading") ||
            lower.includes("high") ||
            lower.includes("assigned") ||
            lower.includes("dispatched") ||
            lower.includes("transit") ||
            lower.includes("arrived") ||
            lower.includes("good")
          ? "chip-warning"
          : "chip-neutral";

  return <span className={`chip ${tone}`}>{status.replace(/_/g, " ")}</span>;
}
