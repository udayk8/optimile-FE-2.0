import type { ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

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
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-950/45 p-4 backdrop-blur-sm">
      <div className={cn("flex h-full w-full max-w-3xl flex-col overflow-hidden rounded-[28px] border border-border/80 bg-card shadow-[0_24px_64px_rgba(15,23,42,0.18)]", widthClassName)}>
        <div className="sticky top-0 z-10 flex items-start justify-between border-b bg-card/96 p-5 backdrop-blur-sm sm:p-6">
          <div>
            <h2 className="text-xl font-semibold tracking-[-0.02em]">{title}</h2>
            {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-full p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground"
            aria-label="Close dialog"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-6">{children}</div>
        {footer ? <div className="sticky bottom-0 border-t bg-card/96 p-5 backdrop-blur-sm sm:p-6">{footer}</div> : null}
      </div>
    </div>
  );
}
