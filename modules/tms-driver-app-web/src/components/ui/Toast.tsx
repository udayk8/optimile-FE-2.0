import { createContext, useContext, useMemo, useState } from "react";

type ToastType = "success" | "error" | "warning";
type ToastState = { message: string; type: ToastType } | null;

const ToastContext = createContext<{ push: (message: string, type?: ToastType) => void } | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<ToastState>(null);

  const value = useMemo(
    () => ({
      push: (message: string, type: ToastType = "success") => {
        setToast({ message, type });
        window.setTimeout(() => setToast(null), 2400);
      },
    }),
    []
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toast ? <div className={`toast toast-${toast.type}`}>{toast.message}</div> : null}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within ToastProvider");
  return context;
}
