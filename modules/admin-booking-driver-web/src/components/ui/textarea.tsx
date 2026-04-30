import * as React from "react";
import { cn } from "@/lib/utils";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "min-h-[100px] w-full rounded-xl border border-border/85 bg-background px-3 py-2 text-sm shadow-sm ring-offset-background transition-all duration-200 placeholder:text-muted-foreground hover:border-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/25 focus-visible:border-blue-600 focus-visible:ring-offset-2",
      className,
    )}
    {...props}
  />
));

Textarea.displayName = "Textarea";
