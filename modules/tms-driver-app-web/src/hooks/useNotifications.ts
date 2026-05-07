import { useEffect, useState } from "react";
import { notificationService } from "@/services/notificationService";
import type { AppNotification } from "@/types/notification";

export function useNotifications() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  useEffect(() => {
    notificationService.getAll().then(setNotifications);
  }, []);

  return notifications;
}
