import type { ReactNode } from "react";
import { ArrowRight, Search } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import { cn } from "@/shared/lib/utils";

export function PlatformPanel({
  title,
  description,
  action,
  children,
  className,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="flex flex-col gap-3 border-b border-border/70 bg-slate-50/70 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle>{title}</CardTitle>
          {description ? <CardDescription className="mt-1 max-w-3xl">{description}</CardDescription> : null}
        </div>
        {action}
      </CardHeader>
      <CardContent className="p-5 sm:p-6">{children}</CardContent>
    </Card>
  );
}

export function PlatformFilterBar({
  searchValue,
  searchPlaceholder,
  onSearchChange,
  filters,
  trailing,
}: {
  searchValue: string;
  searchPlaceholder: string;
  onSearchChange: (value: string) => void;
  filters?: ReactNode;
  trailing?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border/75 bg-card/95 p-3 shadow-panel lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-1 flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchValue}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={searchPlaceholder}
            className="pl-9"
          />
        </div>
        {filters ? <div className="flex flex-wrap gap-3">{filters}</div> : null}
      </div>
      {trailing}
    </div>
  );
}

export function PlatformEmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <Card className="border-dashed bg-card/80">
      <CardContent className="flex flex-col items-start gap-4 p-8">
        <div>
          <p className="text-[1.05rem] font-semibold tracking-[-0.01em]">{title}</p>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>
        </div>
        {action}
      </CardContent>
    </Card>
  );
}

export function PlatformInfoList({
  items,
}: {
  items: Array<{ label: string; value: ReactNode; helper?: string }>;
}) {
  return (
    <div className="grid gap-3">
      {items.map((item) => (
        <div
          key={item.label}
          className="flex flex-col gap-2 rounded-xl border border-border/75 bg-slate-50/65 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">{item.label}</p>
            {item.helper ? <p className="mt-1 text-xs leading-5 text-muted-foreground">{item.helper}</p> : null}
          </div>
          <div className="text-sm font-medium">{item.value}</div>
        </div>
      ))}
    </div>
  );
}

export function PlatformQuickLink({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border/75 bg-slate-50/65 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium tracking-[-0.01em]">{title}</p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
        </div>
        <ArrowRight className="mt-1 size-4 text-muted-foreground" />
      </div>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function PlatformTimeline({
  items,
}: {
  items: Array<{
    id: string;
    title: string;
    description: string;
    meta: string;
    badge?: ReactNode;
  }>;
}) {
  if (!items.length) {
    return <p className="text-sm text-muted-foreground">No platform activity is available yet.</p>;
  }

  return (
    <div className="space-y-4">
      {items.map((item) => (
        <div key={item.id} className="flex gap-4">
          <div className="mt-1 flex flex-col items-center">
            <div className="size-2.5 rounded-full bg-primary shadow-sm shadow-primary/30" />
            <div className="mt-2 h-full w-px bg-border/80" />
          </div>
          <div className="flex-1 rounded-xl border border-border/75 bg-slate-50/65 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-medium tracking-[-0.01em]">{item.title}</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.description}</p>
              </div>
              {item.badge}
            </div>
            <p className="mt-3 text-xs uppercase tracking-[0.18em] text-muted-foreground">{item.meta}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
