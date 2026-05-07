import { useEffect } from "react";
import { useAppStore } from "@/store/useAppStore";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { notificationService } from "@/services/notificationService";
import { useToast } from "@/components/ui/Toast";

export function NotificationsPage() {
  const { notifications } = useAppStore();
  const { push } = useToast();

  useEffect(() => {
    if (notifications.some((item) => !item.seen)) {
      push("Unread notifications loaded", "success");
    }
  }, []);

  return (
    <div className="page-shell stack">
      <div>
        <h1 className="page-title">Notifications</h1>
        <p className="page-meta">Trip, compliance, POD, and settlement updates with read state.</p>
      </div>
      <div className="stack">
        {notifications.map((item) => (
          <Card key={item.id} className={item.priority === "CRITICAL" ? "notification-card-critical" : ""}>
            <div className="space-between">
              <div>
                <div className="heading">{item.title}</div>
                <div className="subheading">{item.body}</div>
                <div className="muted">
                  {new Date(item.timestamp).toLocaleString()}
                  {item.relatedTripId ? ` · ${item.relatedTripId}` : ""}
                  {item.seen ? " · Read" : " · Unread"}
                </div>
              </div>
              <StatusBadge status={item.priority} />
            </div>
            <div className="row" style={{ marginTop: 12 }}>
              <button
                className="btn btn-ghost"
                disabled={item.seen}
                onClick={async () => {
                  await notificationService.markRead(item.id);
                  push("Notification marked as read", "success");
                }}
              >
                Mark as read
              </button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
