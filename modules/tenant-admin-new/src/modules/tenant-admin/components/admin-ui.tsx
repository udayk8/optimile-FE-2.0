import type { ComponentType, ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, type LucideIcon } from "lucide-react";

// ──────────────────────────────────────────────────────────────────────────
// Tenant Admin enterprise design primitives.
//
// The visual language is intentionally quiet: layered neutral surfaces,
// 1px slate-200 borders, compact spacing (16/20/24), no banner gradients.
// All hover and active states are subtle. Status accents are restricted to
// 11px uppercase chips so the page stays calm and data-first.
// ──────────────────────────────────────────────────────────────────────────

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-200/80 pb-3">
      <div className="min-w-0">
        <h1 className="text-[18px] font-semibold tracking-[-0.01em] text-slate-900">{title}</h1>
        {subtitle ? <p className="mt-0.5 text-[12px] text-slate-500">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}

export function SectionHeader({
  title,
  helper,
  action,
}: {
  title: string;
  helper?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-end justify-between gap-3 px-1">
      <div>
        <h2 className="text-[12px] font-semibold uppercase tracking-[0.08em] text-slate-700">{title}</h2>
        {helper ? <p className="mt-0.5 text-[11px] text-slate-500">{helper}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function KpiStrip({ items }: { items: Array<{ label: string; value: number | string; helper?: string; tone?: "default" | "warn" }> }) {
  return (
    <div className="grid divide-x divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white sm:grid-cols-2 xl:grid-cols-5">
      {items.map((item) => (
        <div key={item.label} className="px-4 py-3">
          <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-slate-500">{item.label}</p>
          <p className={`mt-1 text-[20px] font-semibold tracking-[-0.02em] ${
            item.tone === "warn" ? "text-amber-700" : "text-slate-900"
          }`}>
            {item.value}
          </p>
          {item.helper ? <p className="mt-0.5 text-[11px] text-slate-500">{item.helper}</p> : null}
        </div>
      ))}
    </div>
  );
}

export interface SetupCardProps {
  title: string;
  helper?: string;
  icon: ComponentType<{ className?: string }>;
  completionPercent: number;
  status: "complete" | "in_progress" | "pending";
  pendingAction?: string;
  to: string;
  cta?: string;
}

export function SetupCard({
  title,
  helper,
  icon: Icon,
  completionPercent,
  status,
  pendingAction,
  to,
  cta = "Continue",
}: SetupCardProps) {
  const statusColor =
    status === "complete"
      ? "bg-emerald-500"
      : status === "in_progress"
        ? "bg-amber-500"
        : "bg-slate-300";
  const statusLabel = status === "complete" ? "Complete" : status === "in_progress" ? "In progress" : "Not started";
  return (
    <Link
      to={to}
      className="group flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 transition hover:border-slate-300 hover:shadow-[0_1px_3px_rgba(15,23,42,0.06)]"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
            <Icon className="size-4" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-[13px] font-semibold text-slate-900">{title}</p>
            {helper ? <p className="truncate text-[11px] text-slate-500">{helper}</p> : null}
          </div>
        </div>
        <span className="inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-[0.06em] text-slate-500">
          <span className={`inline-block size-1.5 rounded-full ${statusColor}`} />
          {statusLabel}
        </span>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[11px] text-slate-500">
          <span>{completionPercent}% complete</span>
          {pendingAction ? <span className="truncate text-slate-600">{pendingAction}</span> : null}
        </div>
        <div className="h-1 overflow-hidden rounded-full bg-slate-100">
          <div
            className={`h-full ${status === "complete" ? "bg-emerald-500" : "bg-slate-700"}`}
            style={{ width: `${Math.max(0, Math.min(100, completionPercent))}%` }}
          />
        </div>
      </div>

      <div className="mt-auto inline-flex items-center gap-1 text-[11px] font-medium text-slate-700 group-hover:text-slate-900">
        {cta}
        <ArrowUpRight className="size-3.5 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
      </div>
    </Link>
  );
}

export function QuickActionsPanel({
  items,
}: {
  items: Array<{ label: string; icon: ComponentType<{ className?: string }>; to: string }>;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-4 py-2.5">
        <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-slate-700">Quick actions</p>
      </div>
      <ul className="divide-y divide-slate-100">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <li key={item.label}>
              <Link
                to={item.to}
                className="flex items-center justify-between gap-3 px-4 py-2 text-[13px] text-slate-700 transition hover:bg-slate-50 hover:text-slate-900"
              >
                <span className="inline-flex items-center gap-2">
                  <Icon className="size-3.5 text-slate-500" />
                  {item.label}
                </span>
                <ArrowUpRight className="size-3.5 text-slate-400" />
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function ActivityFeed({
  items,
  emptyLabel = "No recent activity.",
}: {
  items: Array<{ id: string; title: string; meta: string; icon?: LucideIcon }>;
  emptyLabel?: string;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-4 py-2.5">
        <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-slate-700">Recent activity</p>
      </div>
      {items.length === 0 ? (
        <p className="px-4 py-6 text-center text-[12px] text-slate-500">{emptyLabel}</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.id} className="flex items-start gap-3 px-4 py-2.5">
                <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-500">
                  {Icon ? <Icon className="size-3" /> : <span className="size-1.5 rounded-full bg-slate-400" />}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-[12px] font-medium text-slate-900">{item.title}</p>
                  <p className="text-[11px] text-slate-500">{item.meta}</p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export function EmptyState({
  title,
  helper,
  action,
}: {
  title: string;
  helper?: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-8 text-center">
      <p className="text-[13px] font-semibold text-slate-900">{title}</p>
      {helper ? <p className="mt-1 text-[12px] text-slate-500">{helper}</p> : null}
      {action ? <div className="mt-3 inline-flex">{action}</div> : null}
    </div>
  );
}

export function StatusDot({ tone }: { tone: "ok" | "warn" | "off" }) {
  const cls = tone === "ok" ? "bg-emerald-500" : tone === "warn" ? "bg-amber-500" : "bg-slate-300";
  return <span className={`inline-block size-1.5 rounded-full ${cls}`} />;
}
