import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "flex h-10 w-full rounded-xl border border-border/85 bg-background px-3 py-2 text-sm shadow-sm ring-offset-background transition-all duration-200 placeholder:text-muted-foreground hover:border-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/25 focus-visible:border-blue-600 focus-visible:ring-offset-2",
        className,
      )}
      {...props}
    />
  ),
);

Input.displayName = "Input";
