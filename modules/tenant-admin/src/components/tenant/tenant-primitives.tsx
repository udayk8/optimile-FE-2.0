import type { ReactNode } from "react";
import { Search } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";

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
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-col gap-3 border-b border-gray-200 bg-white sm:flex-row sm:items-start sm:justify-between">
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
    <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
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
      {trailing ? <div className="text-sm text-gray-600">{trailing}</div> : null}
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
    <Card className="border-dashed border-gray-300">
      <CardContent className="flex flex-col items-start gap-4 p-8">
        <div>
          <p className="text-base font-bold text-text">{title}</p>
          <p className="mt-2 max-w-2xl text-sm text-gray-500">{description}</p>
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
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-2 text-3xl font-extrabold text-text">{value}</p>
      {helper ? <p className="mt-2 text-sm text-gray-600">{helper}</p> : null}
    </div>
  );
}
