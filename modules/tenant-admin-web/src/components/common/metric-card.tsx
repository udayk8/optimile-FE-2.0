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
      card: "border-primary/20",
      icon: "bg-primary/10 text-primary",
    },
    success: {
      card: "border-success/20",
      icon: "bg-success/10 text-success",
    },
    warning: {
      card: "border-warning/20",
      icon: "bg-warning/10 text-warning",
    },
    danger: {
      card: "border-danger/20",
      icon: "bg-danger/10 text-danger",
    },
    neutral: {
      card: "border-gray-200",
      icon: "bg-gray-100 text-gray-600",
    },
    info: {
      card: "border-primary/20",
      icon: "bg-primary/10 text-primary",
    },
  } satisfies Record<string, { card: string; icon: string }>;

  return (
    <Card className={`${toneClasses[tone].card} p-5`}>
      <CardContent className="flex items-center justify-between gap-4 p-0">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
          <p className="mt-2 text-3xl font-extrabold text-text">{value}</p>
          {note ? <p className="mt-2 text-sm text-gray-600">{note}</p> : null}
        </div>
        <div className={`rounded-xl p-3 ${toneClasses[tone].icon}`}>
          <Icon className="size-5" />
        </div>
      </CardContent>
    </Card>
  );
}
