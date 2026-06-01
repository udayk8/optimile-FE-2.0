import { useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Activity, ArrowRight, Database, ExternalLink, Layers3, ShieldCheck, Workflow } from "lucide-react";
import type { TemplatedAnalyticsQuery } from "@shared-api";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { PageHeader } from "@/shared/components/common/page-header";
import { TenantPanel, TenantSummaryCard } from "@tms-booking/modules/tenant-admin/components/tenant-primitives";
import { useTenantRouteContext } from "@tms-booking/modules/tenant-admin/hooks/useTenantRouteContext";
import { tenantReportRegistry } from "@tms-booking/modules/tenant-admin/services/tenant-report-templates";
import { useBookingPaths } from "@tms-booking/hooks/useBookingPaths";
import { useTmsReporting } from "../hooks/useTmsReporting";

type DashboardInsight = "bookings" | "freight" | "approvals" | "assets";
type DashboardStatus = "ALL" | "PENDING_ASSIGNMENT" | "PENDING_RATE_APPROVAL" | "COMPLETED" | "EXCEPTION";

export function OperationsDashboardPage() {
  const { tenant } = useTenantRouteContext();
  const paths = useBookingPaths();
  const [templateKey, setTemplateKey] = useState<"tenant-booking-overview" | "tenant-booking-exceptions">(
    "tenant-booking-overview",
  );
  const [metric, setMetric] = useState<"booking_count" | "freight_value">("booking_count");
  const [insight, setInsight] = useState<DashboardInsight>("bookings");
  const [statusFocus, setStatusFocus] = useState<DashboardStatus>("ALL");
  const [customerFocus, setCustomerFocus] = useState<string | null>(null);
  const selectedTemplate = tenantReportRegistry.require(templateKey);

  const query = useMemo<TemplatedAnalyticsQuery>(
    () => ({
      templateKey,
      scope: "dashboard",
      domain: "tms",
      metric,
      groupBy: selectedTemplate.defaultGroupBy,
      filters: statusFocus === "ALL" ? [] : [{ field: "status", operator: "eq", value: statusFocus }],
      search: customerFocus ?? undefined,
      detailFields: [],
      page: 1,
      pageSize: 6,
    }),
    [customerFocus, metric, selectedTemplate.defaultGroupBy, statusFocus, templateKey],
  );

  const analytics = useTmsReporting(query);
  const trendMax = Math.max(...analytics.trend.map((item) => item.value), 1);
  const statusMax = Math.max(...analytics.statusBreakdown.map((item) => item.value), 1);
  const customerMax = Math.max(...analytics.customerBreakdown.map((item) => item.value), 1);

  function applyInsight(nextInsight: DashboardInsight) {
    setInsight(nextInsight);
    setCustomerFocus(null);

    if (nextInsight === "freight") {
      setTemplateKey("tenant-booking-overview");
      setMetric("freight_value");
      setStatusFocus("ALL");
      return;
    }

    if (nextInsight === "approvals") {
      setTemplateKey("tenant-booking-exceptions");
      setMetric("booking_count");
      setStatusFocus("PENDING_RATE_APPROVAL");
      return;
    }

    if (nextInsight === "assets") {
      setTemplateKey("tenant-booking-exceptions");
      setMetric("booking_count");
      setStatusFocus("PENDING_ASSIGNMENT");
      return;
    }

    setTemplateKey("tenant-booking-overview");
    setMetric("booking_count");
    setStatusFocus("ALL");
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="TMS Reporting"
        title="Operations Dashboard"
        description={`Live operational view for ${tenant.name} with booking volume, freight movement, queue health, and business-ready reporting access.`}
        action={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link to={paths.bookings}>Open bookings</Link>
            </Button>
            <Button asChild>
              <Link to={paths.reports}>Open reports</Link>
            </Button>
          </div>
        }
      />

      <section className="overflow-hidden rounded-[28px] border border-slate-800/60 bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.24),_transparent_28%),linear-gradient(135deg,_#0f172a_0%,_#18233b_45%,_#102a43_100%)] px-5 py-5 text-white shadow-[0_28px_70px_-40px_rgba(15,23,42,0.9)] sm:px-6">
        <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="border-white/15 bg-white/10 text-white" variant="outline">
                Live workspace
              </Badge>
              <Badge className="border-cyan-400/20 bg-cyan-400/10 text-cyan-100" variant="outline">
                {analytics.decision.source === "summary" ? "Fast summary path" : "Detailed record path"}
              </Badge>
            </div>
            <h2 className="mt-4 text-2xl font-semibold tracking-[-0.03em] sm:text-[2rem]">NorthStar booking control tower</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
              A manager-friendly surface for live booking movement, commercial value, approvals, and assignment readiness.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <FocusPill label="Overview" active={insight === "bookings"} onClick={() => applyInsight("bookings")} />
              <FocusPill label="Commercial" active={insight === "freight"} onClick={() => applyInsight("freight")} />
              <FocusPill label="Approvals" active={insight === "approvals"} onClick={() => applyInsight("approvals")} />
              <FocusPill label="Assets" active={insight === "assets"} onClick={() => applyInsight("assets")} />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
            <HeroStat label="Current metric" value={metric === "booking_count" ? "Booking count" : "Freight value"} />
            <HeroStat label="Template" value={analytics.meta.title} />
            <HeroStat label="Filter state" value={statusFocus === "ALL" ? "All queues" : formatStatusLabel(statusFocus)} />
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <InteractiveSummaryCard
          label="Bookings in scope"
          value={analytics.snapshot.totalBookings.toLocaleString("en-IN")}
          helper={`${analytics.snapshot.deliveredBookings} completed in the current view`}
          active={insight === "bookings"}
          onClick={() => applyInsight("bookings")}
        />
        <InteractiveSummaryCard
          label="Freight value"
          value={`INR ${analytics.snapshot.totalFreightValue.toLocaleString("en-IN")}`}
          helper={`${analytics.snapshot.deliveredFreightValue.toLocaleString("en-IN")} already delivered`}
          active={insight === "freight"}
          onClick={() => applyInsight("freight")}
        />
        <InteractiveSummaryCard
          label="Pending approvals"
          value={analytics.snapshot.approvalPendingBookings.toLocaleString("en-IN")}
          helper="Rate approvals and commercial blockers"
          active={insight === "approvals"}
          onClick={() => applyInsight("approvals")}
        />
        <InteractiveSummaryCard
          label="Live assets"
          value={`${analytics.snapshot.activeVehicles}V / ${analytics.snapshot.activeDrivers}D`}
          helper={`${analytics.snapshot.activeVendors} active vendors in tenant scope`}
          active={insight === "assets"}
          onClick={() => applyInsight("assets")}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <TenantPanel
          title="Active dashboard view"
          description="Switch between commercial overview and exception monitoring without leaving the workspace."
          action={
            <Badge variant={analytics.decision.source === "summary" ? "success" : "warning"}>
              {analytics.decision.source === "summary" ? "Summary source" : "Raw source"}
            </Badge>
          }
        >
          <div className="flex flex-wrap gap-2">
            {tenantReportRegistry.list().map((template) => {
              const isActive = template.key === templateKey;
              return (
                <button
                  key={template.key}
                  type="button"
                  onClick={() => {
                    setTemplateKey(template.key as typeof templateKey);
                    setMetric(template.defaultMetric as typeof metric);
                    setInsight(template.key === "tenant-booking-exceptions" ? "approvals" : "bookings");
                    setStatusFocus("ALL");
                  }}
                  className={[
                    "inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition",
                    isActive
                      ? "border-primary/25 bg-primary/[0.08] text-primary"
                      : "border-border bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-950",
                  ].join(" ")}
                >
                  {template.executionMode === "specialized" ? (
                    <ShieldCheck className="size-4" />
                  ) : (
                    <Workflow className="size-4" />
                  )}
                  {template.title}
                </button>
              );
            })}
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <RuleRow label="View" value={analytics.meta.title} />
            <RuleRow label="Mode" value={analytics.meta.executionMode === "specialized" ? "Focused investigation" : "Overview"} />
            <RuleRow label="Metric" value={metric === "booking_count" ? "Booking count" : "Freight value"} />
            <RuleRow label="Data source" value={analytics.decision.source === "summary" ? "Prepared summary" : "Detailed records"} />
          </div>
        </TenantPanel>

        <TenantPanel title="Live focus" description="Use the active focus summary below to explain what the dashboard is highlighting right now.">
          <div className="space-y-4">
            <div className="rounded-2xl border border-border/70 bg-background/80 px-4 py-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="info">Current focus</Badge>
                {statusFocus !== "ALL" ? <Badge variant="warning">{formatStatusLabel(statusFocus)}</Badge> : null}
                {customerFocus ? <Badge variant="secondary">{customerFocus}</Badge> : null}
              </div>
              <p className="mt-3 text-base font-semibold text-slate-950">{getDashboardFocusTitle(insight)}</p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">{getDashboardFocusDescription(insight)}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setStatusFocus("ALL")}>
                Reset queue filter
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => setCustomerFocus(null)}>
                Clear customer focus
              </Button>
              <Button asChild size="sm">
                <Link to={paths.reports}>
                  Continue in reports
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            </div>
          </div>
        </TenantPanel>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <TenantPanel title="Primary trend" description="Fast visual for the current grouping dimension and metric.">
          <div className="space-y-3">
            {analytics.trend.map((point) => (
              <BarRow
                key={point.key}
                label={point.label}
                value={point.value}
                max={trendMax}
                hint={metric === "freight_value" ? "Freight view" : "Booking view"}
              />
            ))}
          </div>
        </TenantPanel>

        <TenantPanel title="Queue health" description="Operational statuses show where the tenant needs attention right now.">
          <div className="space-y-3">
            {analytics.statusBreakdown.map((point) => (
              <BarRow
                key={point.key}
                label={formatStatusLabel(point.label)}
                value={point.value}
                max={statusMax}
                active={statusFocus === point.key}
                onClick={() => setStatusFocus((current) => (current === point.key ? "ALL" : (point.key as DashboardStatus)))}
                hint={statusFocus === point.key ? "Active queue filter" : "Click to focus records"}
              />
            ))}
          </div>
        </TenantPanel>

        <TenantPanel title="Top customers" description="Use this quick slice to focus the dashboard on a single customer.">
          <div className="space-y-3">
            {analytics.customerBreakdown.slice(0, 5).map((point) => (
              <BarRow
                key={point.key}
                label={point.label}
                value={point.value}
                max={customerMax}
                active={customerFocus === point.label}
                onClick={() => setCustomerFocus((current) => (current === point.label ? null : point.label))}
                hint={customerFocus === point.label ? "Customer spotlight active" : "Click to focus records"}
              />
            ))}
          </div>
        </TenantPanel>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <TenantPanel
          title={analytics.superset.title}
          description={analytics.superset.description}
          action={
            analytics.superset.embedUrl ? (
              <Button asChild variant="outline" size="sm">
                <a href={analytics.superset.embedUrl} target="_blank" rel="noreferrer">
                  Open in new tab
                  <ExternalLink className="size-4" />
                </a>
              </Button>
            ) : null
          }
        >
          {analytics.superset.embedUrl ? (
            <iframe
              title="Apache Superset dashboard"
              src={analytics.superset.embedUrl}
              className="h-[420px] w-full rounded-2xl border border-border/70 bg-white"
            />
          ) : (
            <div className="rounded-2xl border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">
              Configure `VITE_SUPERSET_URL` and `VITE_SUPERSET_TMS_DASHBOARD_PATH` to embed Apache Superset here.
            </div>
          )}
        </TenantPanel>
      </div>

      <TenantPanel
        title="Recent operational records"
        description={
          customerFocus
            ? `Showing bookings related to ${customerFocus}.`
            : statusFocus !== "ALL"
              ? `Showing bookings in ${formatStatusLabel(statusFocus)} status.`
              : "A short preview of current bookings behind the dashboard metrics."
        }
      >
        <div className="grid gap-3">
          {analytics.rows.slice(0, 6).map((row) => (
            <div key={row.id} className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-white px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-slate-950">{row.bookingId}</p>
                  <StatusBadge status={row.status} />
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {row.customer} | {row.assignedVendor} | {row.assignedDriver}
                </p>
              </div>
              <div className="grid gap-2 text-sm sm:grid-cols-3 lg:min-w-[360px]">
                <MetricPill icon={<Layers3 className="size-4" />} label="Freight" value={`INR ${row.freight.toLocaleString("en-IN")}`} />
                <MetricPill icon={<Database className="size-4" />} label="Weight" value={`${row.weight} MT`} />
                <MetricPill icon={<Activity className="size-4" />} label="Created" value={new Date(row.createdAt).toLocaleDateString("en-IN")} />
              </div>
            </div>
          ))}
        </div>
      </TenantPanel>
    </div>
  );
}

function RuleRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-background/80 px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-medium text-slate-950">{value}</p>
    </div>
  );
}

function FocusPill({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "rounded-full border px-3.5 py-2 text-sm font-medium transition",
        active
          ? "border-white/10 bg-white text-slate-950 shadow-sm"
          : "border-white/10 bg-white/5 text-slate-200 hover:bg-white/10 hover:text-white",
      ].join(" ")}
    >
      {label}
    </button>
  );
}

function HeroStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-sm">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">{label}</p>
      <p className="mt-2 text-sm font-semibold text-white">{value}</p>
    </div>
  );
}

function InteractiveSummaryCard({
  label,
  value,
  helper,
  active,
  onClick,
}: {
  label: string;
  value: string;
  helper: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "rounded-[28px] text-left transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20",
        active ? "ring-2 ring-primary/30 shadow-[0_18px_40px_-24px_rgba(15,23,42,0.35)]" : "hover:-translate-y-0.5 hover:shadow-lg",
      ].join(" ")}
    >
      <TenantSummaryCard label={label} value={value} helper={helper} />
    </button>
  );
}

function formatStatusLabel(status: string) {
  return status.split("_").join(" ");
}

function BarRow({
  label,
  value,
  max,
  active = false,
  onClick,
  hint,
}: {
  label: string;
  value: number;
  max: number;
  active?: boolean;
  onClick?: () => void;
  hint?: string;
}) {
  const width = `${Math.max(8, (value / max) * 100)}%`;
  const content = (
    <div
      className={[
        "space-y-2 rounded-2xl border px-3 py-3 transition",
        active ? "border-primary/25 bg-primary/[0.05]" : "border-transparent hover:border-border/70 hover:bg-slate-50/80",
      ].join(" ")}
    >
      <div className="flex items-center justify-between gap-4 text-sm">
        <div>
          <span className="font-medium text-slate-950">{label}</span>
          {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
        </div>
        <span className="text-muted-foreground">{value.toLocaleString("en-IN")}</span>
      </div>
      <div className="h-2 rounded-full bg-slate-100">
        <div className="h-2 rounded-full bg-primary" style={{ width }} />
      </div>
    </div>
  );

  if (!onClick) {
    return content;
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20"
    >
      {content}
    </button>
  );
}

function StatusBadge({ status }: { status: string }) {
  const variant =
    status === "COMPLETED" || status === "DELIVERED"
      ? "success"
      : status === "PENDING_ASSIGNMENT" || status === "PENDING_RATE_APPROVAL"
        ? "warning"
        : status === "EXCEPTION" || status === "DELAYED" || status === "DISPUTED"
          ? "danger"
          : "neutral";
  return <Badge variant={variant}>{formatStatusLabel(status)}</Badge>;
}

function MetricPill({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-border/70 bg-background/80 px-3 py-2">
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        <span className="text-[11px] font-semibold uppercase tracking-[0.16em]">{label}</span>
      </div>
      <p className="mt-1 text-sm font-medium text-slate-950">{value}</p>
    </div>
  );
}

function getDashboardFocusTitle(insight: DashboardInsight) {
  if (insight === "freight") return "Freight performance is in focus";
  if (insight === "approvals") return "Approval blockers are in focus";
  if (insight === "assets") return "Asset readiness is in focus";
  return "Booking movement is in focus";
}

function getDashboardFocusDescription(insight: DashboardInsight) {
  if (insight === "freight") {
    return "Use this view to speak about commercial value, delivered freight, and which customers are driving the freight mix.";
  }
  if (insight === "approvals") {
    return "Use this view to show which shipments are waiting on approvals before they can move forward.";
  }
  if (insight === "assets") {
    return "Use this view to highlight assignment readiness, active vendors, and where fleet-side action is needed.";
  }
  return "Use this view to walk through total booking volume, completed work, and the current flow of operational activity.";
}
