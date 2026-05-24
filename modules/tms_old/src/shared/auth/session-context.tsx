import { createContext, useContext, useEffect, useState, type PropsWithChildren } from "react";
import { readStoredValue, storageKeys, writeStoredValue } from "@/shared/lib/storage/browser-storage";
import type { SessionContext } from "@/types/platform";

const defaultSession: SessionContext = {
  actorType: "platform_admin",
  actorName: "Optimile Platform Admin",
};

const SessionContextValue = createContext<{
  session: SessionContext;
  setSession: (session: SessionContext) => void;
} | null>(null);

export function SessionProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<SessionContext>(() =>
    readStoredValue(storageKeys.sessionContext, defaultSession),
  );

  useEffect(() => {
    writeStoredValue(storageKeys.sessionContext, session);
  }, [session]);

  return (
    <SessionContextValue.Provider value={{ session, setSession }}>
      {children}
    </SessionContextValue.Provider>
  );
}

export function useSessionContext() {
  const context = useContext(SessionContextValue);
  if (!context) {
    throw new Error("useSessionContext must be used within SessionProvider");
  }
  return context;
}
