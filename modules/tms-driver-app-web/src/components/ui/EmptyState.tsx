import { Button } from "./Button";

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
}: {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="empty-state card panel">
      <h3 className="heading">{title}</h3>
      <p className="subheading">{description}</p>
      {actionLabel && onAction ? (
        <div style={{ marginTop: 16 }}>
          <Button variant="primary" onClick={onAction}>
            {actionLabel}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
