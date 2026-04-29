import { AlertTriangle, X } from 'lucide-react';
import { ReactNode } from 'react';
import { Button } from './Button';

interface ConfirmModalProps {
  children?: ReactNode;
  confirmLabel?: string;
  description: string;
  onClose: () => void;
  onConfirm: () => void;
  open: boolean;
  title: string;
}

export function ConfirmModal({ children, confirmLabel = 'Confirm', description, onClose, onConfirm, open, title }: ConfirmModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <section className="w-full max-w-md rounded-xl bg-white p-5 shadow-2xl animate-in fade-in duration-300">
        <div className="flex items-start justify-between gap-4">
          <div className="flex gap-3">
            <div className="rounded-xl bg-warning/10 p-2 text-warning">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-text">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-gray-600">{description}</p>
            </div>
          </div>
          <button className="rounded-lg p-1 text-gray-500 hover:bg-gray-100" onClick={onClose} type="button">
            <X className="h-5 w-5" />
          </button>
        </div>
        {children && <div className="mt-5">{children}</div>}
        <div className="mt-6 flex justify-end gap-2">
          <Button onClick={onClose} variant="secondary">Cancel</Button>
          <Button onClick={onConfirm} variant="primary">{confirmLabel}</Button>
        </div>
      </section>
    </div>
  );
}
