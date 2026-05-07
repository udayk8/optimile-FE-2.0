export function NotificationBadge({ count }: { count: number }) {
  if (!count) return null;
  return <span className="notification-badge">{count}</span>;
}
