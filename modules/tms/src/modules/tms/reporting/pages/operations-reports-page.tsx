import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ExternalLink, Sparkles, Workflow } from "lucide-react";
import type { TemplatedAnalyticsQuery } from "@shared-api";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { PageHeader } from "@/shared/components/common/page-header";
import { DataTable } from "@/shared/components/common/data-table";
import { TenantFilterBar, TenantPanel } from "@tms-booking/modules/tenant-admin/components/tenant-primitives";
import { useTenantRouteContext } from "@tms-booking/modules/tenant-admin/hooks/useTenantRouteContext";
import { useBookingPaths } from "@tms-booking/hooks/useBookingPaths";
import { tenantReportRegistry } from "@tms-booking/modules/tenant-admin/services/tenant-report-templates";
import { useTmsReporting } from "../hooks/useTmsReporting";

export function OperationsReportsPage() {
  const { tenant } = useTenantRouteContext();
  const paths = useBookingPaths();
  const [templateKey, setTemplateKey] = useState<"tenant-booking-overview" | "tenant-booking-exceptions">(
    "tenant-booking-overview",
  );
  const [metric, setMetric] = useState<"booking_count" | "freight_value">("booking_count");
  const [status, setStatus] = useState<"ALL" | "PENDING_ASSIGNMENT" | "PENDING_RATE_APPROVAL" | "COMPLETED" | "EXCEPTION">("ALL");
  const [search, setSearch] = useState("");
  const [detailMode, setDetailMode] = useState(false);
  const selectedTemplate = tenantReportRegistry.require(templateKey);

  const query = useMemo<TemplatedAnalyticsQuery>(() => {
    const filters = status === "ALL" ? [] : [{ field: "status", operator: "eq" as const, value: status }];

    return {
      templateKey,
      scope: "report",
      domain: "tms",
      metric,
      groupBy: selectedTemplate.defaultGroupBy,
      filters,
      search,
      detailFields: detailMode ? ["bookingId", "assignedVendor", "assignedDriver"] : [],
      page: 1,
      pageSize: 12,
    };
  }, [detailMode, metric, search, selectedTemplate.defaultGroupBy, status, templateKey]);

  const analytics = useTmsReporting(query);
  const activeSummary =
    search.trim().length > 0
      ? `Filtered by search term "${search.trim()}"`
      : status !== "ALL"
        ? `Filtered to ${formatStatusLabel(status)} records`
        : "Showing all reportable records in the active template";

  const tableRows = analytics.rows.map((row) => [
    <div key={`${row.id}-booking`}>
      <p className="font-semibold text-slate-950">{row.bookingId}</p>
      <p className="mt-1 text-xs text-muted-foreground">
        {row.serviceType} | {row.commercialType}
      </p>
    </div>,
    <div key={`${row.id}-customer`}>
      <p className="font-medium text-slate-950">{row.customer}</p>
      <p className="mt-1 text-xs text-muted-foreground">{row.assignedVendor}</p>
    </div>,
    <StatusBadge key={`${row.id}-status`} status={row.status} />,
    <span key={`${row.id}-freight`} className="font-medium text-slate-950">
      INR {row.freight.toLocaleString("en-IN")}
    </span>,
    <span key={`${row.id}-weight`} className="font-medium text-slate-950">
      {row.weight} MT
    </span>,
    <div key={`${row.id}-driver`}>
      <p className="font-medium text-slate-950">{row.assignedDriver}</p>
      <p className="mt-1 text-xs text-muted-foreground">
        {new Date(row.createdAt).toLocaleDateString("en-IN")}
      </p>
    </div>,
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="TMS Reporting"
        title="Operational Reports"
        description={`Detailed reporting workspace for ${tenant.name} with business filters, searchable rows, and export-friendly operational visibility.`}
        action={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link to={paths.dashboard}>Back to dashboard</Link>
            </Button>
            <Button asChild>
              <Link to={paths.bookings}>Open bookings</Link>
            </Button>
          </div>
        }
      />

      <section className="overflow-hidden rounded-[28px] border border-slate-800/60 bg-[radial-gradient(circle_at_top_left,_rgba(96,165,250,0.22),_transparent_26%),linear-gradient(135deg,_#0f172a_0%,_#1e1b4b_48%,_#172554_100%)] px-5 py-5 text-white shadow-[0_28px_70px_-40px_rgba(15,23,42,0.9)] sm:px-6">
        <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="border-white/15 bg-white/10 text-white" variant="outline">
                Operational reporting
              </Badge>
              <Badge className="border-violet-400/20 bg-violet-400/10 text-violet-100" variant="outline">
                {analytics.meta.executionMode === "specialized" ? "Focused investigation" : "Standard view"}
              </Badge>
            </div>
            <h2 className="mt-4 text-2xl font-semibold tracking-[-0.03em] sm:text-[2rem]">Report studio for booking operations</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
              Use report templates, filters, and quick slices to move from executive review into row-level operational detail.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <ReportModePill
                label="Overview"
                active={templateKey === "tenant-booking-overview"}
                onClick={() => {
                  setTemplateKey("tenant-booking-overview");
                  setMetric("booking_count");
                }}
              />
              <ReportModePill
                label="Exceptions"
                active={templateKey === "tenant-booking-exceptions"}
                onClick={() => {
                  setTemplateKey("tenant-booking-exceptions");
                  setMetric("booking_count");
                }}
              />
              <ReportModePill
                label="Freight"
                active={metric === "freight_value"}
                onClick={() => {
                  setTemplateKey("tenant-booking-overview");
                  setMetric("freight_value");
                }}
              />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
            <HeroStat label="Tenant" value={tenant.name} />
            <HeroStat label="Data mode" value={analytics.decision.source === "summary" ? "Prepared summary" : "Detailed records"} />
            <HeroStat label="Active state" value={detailMode ? "Detail mode on" : "Standard mode"} />
          </div>
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[1.18fr_0.82fr]">
        <TenantPanel
          title="Active report template"
          description="Choose the reporting lens that best matches the business conversation."
          action={
            <Badge variant={analytics.meta.executionMode === "specialized" ? "warning" : "info"}>
              {analytics.meta.executionMode === "specialized" ? "Focused view" : "Standard view"}
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
                  }}
                  className={[
                    "inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition",
                    isActive
                      ? "border-primary/25 bg-primary/[0.08] text-primary"
                      : "border-border bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-950",
                  ].join(" ")}
                >
                  {template.executionMode === "specialized" ? (
                    <Sparkles className="size-4" />
                  ) : (
                    <Workflow className="size-4" />
                  )}
                  {template.title}
                </button>
              );
            })}
          </div>
          <p className="mt-4 text-sm leading-6 text-muted-foreground">{selectedTemplate.description}</p>
        </TenantPanel>

        <TenantPanel
          title="Workspace context"
          description="Current business context for the selected report."
          action={
            <Badge variant={analytics.decision.source === "summary" ? "success" : "warning"}>
              {analytics.decision.source === "summary" ? "Summary source" : "Raw source"}
            </Badge>
          }
        >
          <div className="space-y-3">
            <RuleRow label="Tenant" value={tenant.name} />
            <RuleRow label="Report view" value={selectedTemplate.title} />
            <RuleRow label="Metric" value={metric === "booking_count" ? "Booking count" : "Freight value"} />
            <RuleRow label="Data source" value={analytics.decision.source === "summary" ? "Prepared summary" : "Detailed records"} />
          </div>
        </TenantPanel>
      </div>

      <TenantFilterBar
        searchValue={search}
        searchPlaceholder="Search booking, customer, vendor, or status"
        onSearchChange={setSearch}
        filters={
          <>
            <LabeledSelect
              label="Metric"
              value={metric}
              onChange={(value) => setMetric(value as typeof metric)}
              options={[
                { value: "booking_count", label: "Booking count" },
                { value: "freight_value", label: "Freight value" },
              ]}
            />
            <LabeledSelect
              label="Status"
              value={status}
              onChange={(value) => setStatus(value as typeof status)}
              options={[
                { value: "ALL", label: "All statuses" },
                { value: "PENDING_ASSIGNMENT", label: "Pending assignment" },
                { value: "PENDING_RATE_APPROVAL", label: "Pending rate approval" },
                { value: "COMPLETED", label: "Completed" },
                { value: "EXCEPTION", label: "Exception" },
              ]}
            />
          </>
        }
        trailing={
          <Button type="button" variant={detailMode ? "secondary" : "outline"} onClick={() => setDetailMode((current) => !current)}>
            {detailMode ? "Disable detail mode" : "Enable detail mode"}
          </Button>
        }
      />

      <TenantPanel title="Quick report slices" description="Use these shortcuts to move the report into the most common business views.">
        <div className="flex flex-wrap gap-2">
          <QuickSliceButton
            label="All records"
            active={status === "ALL" && !detailMode && search.trim().length === 0}
            onClick={() => {
              setStatus("ALL");
              setSearch("");
              setDetailMode(false);
            }}
          />
          <QuickSliceButton
            label="Pending approvals"
            active={status === "PENDING_RATE_APPROVAL"}
            onClick={() => {
              setTemplateKey("tenant-booking-exceptions");
              setMetric("booking_count");
              setStatus("PENDING_RATE_APPROVAL");
              setDetailMode(true);
            }}
          />
          <QuickSliceButton
            label="Assignment queue"
            active={status === "PENDING_ASSIGNMENT"}
            onClick={() => {
              setTemplateKey("tenant-booking-exceptions");
              setMetric("booking_count");
              setStatus("PENDING_ASSIGNMENT");
              setDetailMode(true);
            }}
          />
          <QuickSliceButton
            label="Completed bookings"
            active={status === "COMPLETED"}
            onClick={() => {
              setTemplateKey("tenant-booking-overview");
              setMetric("booking_count");
              setStatus("COMPLETED");
              setDetailMode(false);
            }}
          />
          <QuickSliceButton
            label="Freight view"
            active={metric === "freight_value"}
            onClick={() => {
              setTemplateKey("tenant-booking-overview");
              setMetric("freight_value");
              setStatus("ALL");
            }}
          />
        </div>
        <p className="mt-4 text-sm text-muted-foreground">{activeSummary}</p>
      </TenantPanel>

      <TenantPanel
        title={analytics.superset.title}
        description={analytics.superset.description}
        action={
          analytics.superset.embedUrl ? (
            <Button asChild variant="outline" size="sm">
              <a href={analytics.superset.embedUrl} target="_blank" rel="noreferrer">
                Open Superset
                <ExternalLink className="size-4" />
              </a>
            </Button>
          ) : null
        }
      >
        {analytics.superset.embedUrl ? (
          <iframe
            title="Apache Superset report"
            src={analytics.superset.embedUrl}
            className="h-[420px] w-full rounded-2xl border border-border/70 bg-white"
          />
        ) : (
          <div className="rounded-2xl border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">
            Configure `VITE_SUPERSET_URL` and `VITE_SUPERSET_TMS_DASHBOARD_PATH` to add Apache Superset into this reports workspace.
          </div>
        )}
      </TenantPanel>

      <DataTable
        title="Detailed report output"
        description={activeSummary}
        headers={["Booking", "Customer / Vendor", "Status", "Freight", "Weight", "Driver / Created"]}
        rows={tableRows}
        emptyMessage="No report rows match the active filters."
      />
    </div>
  );
}

function QuickSliceButton({
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
          ? "border-primary/25 bg-primary/[0.08] text-primary"
          : "border-border bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-950",
      ].join(" ")}
    >
      {label}
    </button>
  );
}

function ReportModePill({
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

function RuleRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-background/80 px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-medium text-slate-950">{value}</p>
    </div>
  );
}

function formatStatusLabel(status: string) {
  return status.split("_").join(" ");
}

function LabeledSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <label className="flex min-w-[180px] flex-col gap-1">
      <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 rounded-2xl border border-border/80 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/15"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
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
