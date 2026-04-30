// ============================================================
// Global Toast / Notification System
// ============================================================
// Mounted once at the root of the app (App.tsx) so every module
// (TMS, Finance, Fleet, AMS) can call useToast() without needing
// its own local provider.
// ============================================================

import React, { createContext, useContext, useState } from 'react';
import { X, AlertCircle, CheckCircle, AlertTriangle, Info } from 'lucide-react';

export interface Toast {
  id?: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number; // ms — pass 0 to make persistent
}

export interface ToastContextType {
  toasts: Toast[];
  showToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const showToast = (toast: Omit<Toast, 'id'>) => {
    const id = crypto.randomUUID();
    setToasts(prev => [...prev, { ...toast, id }]);
    if (toast.duration !== 0) {
      setTimeout(() => removeToast(id), toast.duration ?? 3500);
    }
  };

  return (
    <ToastContext.Provider value={{ toasts, showToast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextType {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within <ToastProvider>');
  return ctx;
}

// ── Toast Container ──────────────────────────────────────────
function ToastContainer({ toasts, onRemove }: { toasts: Toast[]; onRemove: (id: string) => void }) {
  return (
    <div className="fixed bottom-4 right-4 space-y-2 z-[9999] pointer-events-none">
      {toasts.map(t => (
        <div
          key={t.id}
          className={`flex items-start gap-3 p-4 rounded-lg shadow-xl max-w-sm w-full pointer-events-auto
            animate-in fade-in slide-in-from-right-4 duration-200 ${COLOR[t.type]}`}
        >
          <span className="shrink-0 mt-0.5">{ICON[t.type]}</span>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm leading-snug">{t.title}</p>
            {t.message && <p className="text-xs opacity-90 mt-0.5 leading-relaxed">{t.message}</p>}
          </div>
          <button
            onClick={() => onRemove(t.id!)}
            className="shrink-0 opacity-70 hover:opacity-100 transition-opacity"
          >
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}

const COLOR: Record<Toast['type'], string> = {
  success: 'bg-emerald-600 text-white',
  error:   'bg-red-600 text-white',
  warning: 'bg-amber-500 text-white',
  info:    'bg-blue-600 text-white',
};

const ICON: Record<Toast['type'], React.ReactNode> = {
  success: <CheckCircle size={18} />,
  error:   <AlertCircle size={18} />,
  warning: <AlertTriangle size={18} />,
  info:    <Info size={18} />,
};
