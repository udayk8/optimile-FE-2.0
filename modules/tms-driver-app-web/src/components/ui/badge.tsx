import type { HTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold tracking-[0.02em] transition-colors duration-150",
  {
    variants: {
      variant: {
        default: "border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700",
        info: "border-blue-200 bg-gradient-to-r from-blue-50 to-sky-50 text-blue-700",
        accent: "border-indigo-200 bg-gradient-to-r from-indigo-50 to-violet-50 text-indigo-700",
        neutral: "border-slate-200 bg-slate-100 text-slate-700",
        secondary: "border-slate-200 bg-slate-100 text-slate-600",
        outline: "border-border bg-background text-foreground",
        success: "border-emerald-200 bg-gradient-to-r from-emerald-50 to-green-50 text-emerald-700",
        warning: "border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 text-amber-700",
        danger: "border-red-200 bg-gradient-to-r from-red-50 to-rose-50 text-red-700",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}
