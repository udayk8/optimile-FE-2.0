import { useAppStore } from "@/store/useAppStore";
import { delay } from "./mockDelay";

export const notificationService = {
  getAll: async () => {
    await delay(120);
    return useAppStore.getState().notifications;
  },
  markRead: async (id: string) => {
    await delay(120);
    useAppStore.getState().markNotificationRead(id);
  },
};
