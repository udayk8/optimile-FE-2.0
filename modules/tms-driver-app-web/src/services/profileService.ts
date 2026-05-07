import { useAppStore } from "@/store/useAppStore";
import { delay } from "./mockDelay";

export const profileService = {
  getProfile: async () => {
    await delay(120);
    return useAppStore.getState().driver;
  },
};
