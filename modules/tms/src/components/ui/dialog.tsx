import type { ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "../../lib/utils";

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  widthClassName?: string;
}

export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  widthClassName,
}: DialogProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className={cn("flex max-h-[calc(100vh-2rem)] w-full max-w-3xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl", widthClassName)}>
        <div className="sticky top-0 z-10 flex items-start justify-between border-b border-gray-200 bg-white p-5">
          <div>
            <h2 className="text-lg font-bold text-text">{title}</h2>
            {description ? <p className="mt-2 text-sm text-gray-600">{description}</p> : null}
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-100 hover:text-primary"
            aria-label="Close dialog"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-5">{children}</div>
        {footer ? <div className="sticky bottom-0 border-t border-gray-200 bg-white p-5">{footer}</div> : null}
      </div>
    </div>
  );
}
