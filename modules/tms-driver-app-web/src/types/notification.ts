export type NotificationPriority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  priority: NotificationPriority;
  seen: boolean;
  timestamp: string;
  relatedTripId?: string;
}
