import type { ReactNode } from "react";
import { Search } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../components/ui/card";
import { Input } from "../../../components/ui/input";

export function TenantPanel({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <CardHeader className="flex flex-col gap-2 border-b border-gray-200 bg-gray-50 py-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle className="text-[1.05rem]">{title}</CardTitle>
          {description ? <CardDescription className="mt-1 max-w-3xl text-[13px] leading-6">{description}</CardDescription> : null}
        </div>
        {action}
      </CardHeader>
      <CardContent className="p-4 sm:p-5">{children}</CardContent>
    </Card>
  );
}

export function TenantFilterBar({
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
    <div className="flex flex-col gap-2 rounded-xl border border-gray-200 bg-white p-3 shadow-sm lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-1 flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchValue}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) => onSearchChange(event.target.value)}
            placeholder={searchPlaceholder}
            className="pl-9"
          />
        </div>
        {filters ? <div className="flex flex-wrap gap-2">{filters}</div> : null}
      </div>
      {trailing}
    </div>
  );
}

export function TenantEmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <Card className="rounded-xl border border-dashed border-gray-300 bg-white shadow-sm">
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

export function TenantSummaryCard({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper?: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <p className="text-[12px] font-medium uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-[1.65rem] font-semibold tracking-[-0.03em] text-text">{value}</p>
      {helper ? <p className="mt-1.5 text-xs leading-5 text-muted-foreground">{helper}</p> : null}
    </div>
  );
}
