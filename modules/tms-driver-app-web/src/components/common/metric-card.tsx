import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "../ui/card";

export function MetricCard({
  label,
  value,
  icon: Icon,
  note,
  tone = "accent",
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  note?: string;
  tone?: "accent" | "success" | "warning" | "danger" | "neutral" | "info";
}) {
  const toneClasses = {
    accent: {
      card: "border-l-primary/70",
      icon: "border-primary/10 bg-primary/[0.08] text-primary",
    },
    success: {
      card: "border-l-emerald-600/70",
      icon: "border-emerald-600/10 bg-emerald-600/[0.08] text-emerald-800",
    },
    warning: {
      card: "border-l-amber-500/70",
      icon: "border-amber-500/10 bg-amber-500/[0.10] text-amber-900",
    },
    danger: {
      card: "border-l-rose-600/70",
      icon: "border-rose-600/10 bg-rose-600/[0.08] text-rose-800",
    },
    neutral: {
      card: "border-l-slate-500/60",
      icon: "border-slate-500/10 bg-slate-500/[0.08] text-slate-800",
    },
    info: {
      card: "border-l-sky-600/70",
      icon: "border-sky-600/10 bg-sky-600/[0.08] text-sky-800",
    },
  } satisfies Record<string, { card: string; icon: string }>;

  return (
    <Card className={`border-l-[3px] ${toneClasses[tone].card}`}>
      <CardContent className="flex items-center justify-between gap-4 p-5 sm:p-6">
        <div>
          <p className="text-[12px] font-medium uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
          <p className="mt-2 text-[1.9rem] font-semibold tracking-[-0.02em]">{value}</p>
          {note ? <p className="mt-2 text-xs leading-5 text-muted-foreground">{note}</p> : null}
        </div>
        <div className={`rounded-2xl border p-3 ${toneClasses[tone].icon}`}>
          <Icon className="size-5" />
        </div>
      </CardContent>
    </Card>
  );
}
