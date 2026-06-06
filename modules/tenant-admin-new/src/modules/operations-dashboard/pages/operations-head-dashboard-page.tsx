import { Link, useParams } from "react-router-dom";
import { useState } from "react";
import type { ReactNode } from "react";
import { BarChart3, ChevronRight } from "lucide-react";
import { PageHeader } from "@/shared/components/common/page-header";
import { TenantPanel } from "@/modules/tenant-admin/components/tenant-primitives";
import { Button } from "@/shared/components/ui/button";
import { useTenantPaths } from "@platform-admin/hooks/useTenantPaths";

type DrillKey =
  | "total"
  | "active"
  | "inTransit"
  | "delayed"
  | "exception"
  | "completed"
  | "unassigned"
  | "details";
type TripFilters = {
  status: string;
  region: string;
  vendor: string;
  vehicleType: string;
  driver: string;
  customer: string;
  startDate: string;
  endDate: string;
  risk: string;
};
type DashboardSectionKey = "tripOverview" | "actionRequired" | "delayAnalysis" | "exceptionAnalysis" | "readiness" | "performanceHealth";

const reportDetailRows = [
  { trip: "TRP-2048", status: "Delayed", region: "North", vehicle: "Trailer", owner: "North Region", sla: "Overdue", date: "2026-06-04" },
  { trip: "TRP-1982", status: "Exception", region: "West", vehicle: "Truck", owner: "Fleet Desk", sla: "45m", date: "2026-06-03" },
  { trip: "TRP-2140", status: "In Transit", region: "South", vehicle: "LCV", owner: "Ops Desk", sla: "1h 05m", date: "2026-06-02" },
  { trip: "TRP-2216", status: "Unassigned", region: "East", vehicle: "Pending", owner: "Ops Support", sla: "3h 30m", date: "2026-06-01" },
  { trip: "TRP-2190", status: "Completed", region: "North", vehicle: "Truck", owner: "Delivery Desk", sla: "Met", date: "2026-06-04" },
  { trip: "TRP-2174", status: "Completed", region: "South", vehicle: "Trailer", owner: "South Region", sla: "Met", date: "2026-06-03" },
  { trip: "TRP-2138", status: "Completed", region: "West", vehicle: "LCV", owner: "West Region", sla: "Met", date: "2026-05-31" },
  { trip: "TRP-2081", status: "Completed", region: "East", vehicle: "Tanker", owner: "East Region", sla: "Met", date: "2026-05-27" },
];

function getReportDetailKey(label: string) {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "trip-details";
}

function getReportDetailTitle(detailKey?: string) {
  if (!detailKey) return "Trip Details";
  return detailKey
    .split("-")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function getReportRowsForDetail(detailKey?: string) {
  if (detailKey === "completed-trips") {
    return reportDetailRows.filter((row) => row.status === "Completed");
  }
  return reportDetailRows;
}

function filterRowsByDate<T extends { date: string }>(rows: readonly T[], startDate: string, endDate: string) {
  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();
  if (Number.isNaN(start) || Number.isNaN(end)) return rows;
  return rows.filter((row) => {
    const rowDate = new Date(row.date).getTime();
    return rowDate >= start && rowDate <= end;
  });
}

const defaultSectionVisibility: Record<DashboardSectionKey, boolean> = {
  tripOverview: true,
  actionRequired: true,
  delayAnalysis: true,
  exceptionAnalysis: true,
  readiness: true,
  performanceHealth: true,
};

function loadSectionVisibility() {
  if (typeof window === "undefined") return defaultSectionVisibility;

  try {
    const stored = window.localStorage.getItem("optimile.operationsDashboard.sections");
    return stored ? { ...defaultSectionVisibility, ...JSON.parse(stored) } : defaultSectionVisibility;
  } catch {
    return defaultSectionVisibility;
  }
}

function scaleRows<T extends { value: number }>(rows: readonly T[], multiplier: number) {
  return rows.map((row) => ({ ...row, value: Math.max(1, Math.round(row.value * multiplier)) }));
}

function getDateRangeDays(startDate: string, endDate: string) {
  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();
  if (Number.isNaN(start) || Number.isNaN(end)) return 30;
  return Math.max(1, Math.ceil((end - start) / 86400000) + 1);
}

export function BookingReportsPage() {
  const supersetBaseUrl = import.meta.env.VITE_SUPERSET_URL?.trim()?.replace(/\/$/, "");
  const [activeDrill, setActiveDrill] = useState<DrillKey>("total");
  const [detailContext, setDetailContext] = useState("Trip Details");
  const [selectedReportDetail, setSelectedReportDetail] = useState<{ key: string; title: string } | null>(null);
  const [showConfig, setShowConfig] = useState(false);
  const [sectionVisibility, setSectionVisibility] = useState<Record<DashboardSectionKey, boolean>>(loadSectionVisibility);
  const [filters, setFilters] = useState<TripFilters>({
    status: "all",
    region: "all",
    vendor: "all",
    vehicleType: "all",
    driver: "all",
    customer: "all",
    startDate: "2026-05-01",
    endDate: "2026-06-04",
    risk: "all",
  });
  const drillLevels = {
    total: {
      title: "Total Trips",
      subtitle: "Complete trip pool split by active, completed, and unassigned movements",
      chartTitle: "Trips by Status",
      chartId: 121,
      tone: "blue",
      segments: [
        { id: "active" as const, label: "Active Trips", value: 324, color: "bg-teal-600", percent: "81%" },
        { id: "completed" as const, label: "Completed Trips", value: 58, color: "bg-teal-400", percent: "14%" },
        { id: "unassigned" as const, label: "Unassigned Trips", value: 20, color: "bg-slate-500", percent: "5%" },
      ],
    },
    active: {
      title: "Active Trips",
      subtitle: "Live trips split into movement, risk, and exception states",
      chartTitle: "Daily Trip Trend",
      chartId: 115,
      tone: "emerald",
      segments: [
        { id: "inTransit" as const, label: "In Transit Trips", value: 226, color: "bg-teal-500", percent: "70%" },
        { id: "delayed" as const, label: "Delayed Trips", value: 67, color: "bg-amber-500", percent: "21%" },
        { id: "exception" as const, label: "Exception Trips", value: 31, color: "bg-rose-500", percent: "9%" },
      ],
    },
    completed: {
      title: "Completed Trips",
      subtitle: "Completed movement split by operational reporting period",
      chartTitle: "Completed Trips",
      chartId: 115,
      tone: "green",
      segments: [
        { id: "details" as const, label: "Today", value: 12, color: "bg-teal-400", percent: "21%" },
        { id: "details" as const, label: "This Week", value: 31, color: "bg-teal-500", percent: "53%" },
        { id: "details" as const, label: "This Month", value: 58, color: "bg-teal-600", percent: "100%" },
      ],
    },
    unassigned: {
      title: "Unassigned Trips",
      subtitle: "Trips waiting for vehicle, driver, approval, or rate closure",
      chartTitle: "Unassigned Trips",
      chartId: 121,
      tone: "slate",
      segments: [
        { id: "details" as const, label: "No Vehicle", value: 8, color: "bg-slate-500", percent: "40%" },
        { id: "details" as const, label: "No Driver", value: 5, color: "bg-zinc-500", percent: "25%" },
        { id: "details" as const, label: "Approval Pending", value: 4, color: "bg-slate-400", percent: "20%" },
        { id: "details" as const, label: "Rate Pending", value: 3, color: "bg-slate-600", percent: "15%" },
      ],
    },
    inTransit: {
      title: "In Transit Trips",
      subtitle: "Trips currently moving, ready for region and ETA analysis",
      chartTitle: "Daily Trip Trend",
      chartId: 115,
      tone: "cyan",
      segments: [
        { id: "details" as const, label: "By Region", value: 96, color: "bg-teal-600", percent: "42%" },
        { id: "details" as const, label: "By Vehicle Type", value: 82, color: "bg-teal-500", percent: "36%" },
        { id: "details" as const, label: "ETA Watchlist", value: 48, color: "bg-slate-500", percent: "22%" },
      ],
    },
    delayed: {
      title: "Delayed Trips",
      subtitle: "Delay concentration split by operational region",
      chartTitle: "Delays by Region",
      chartId: 113,
      tone: "amber",
      segments: [
        { id: "details" as const, label: "By Region", value: 24, color: "bg-amber-500", percent: "36%" },
        { id: "details" as const, label: "By Delay Reason", value: 19, color: "bg-amber-600", percent: "28%" },
        { id: "details" as const, label: "By Delay Duration", value: 14, color: "bg-amber-400", percent: "21%" },
      ],
    },
    exception: {
      title: "Exception Trips",
      subtitle: "Operational issues split by exception type",
      chartTitle: "Exceptions by Type",
      chartId: 114,
      tone: "rose",
      segments: [
        { id: "details" as const, label: "Vehicle Issue", value: 11, color: "bg-rose-500", percent: "35%" },
        { id: "details" as const, label: "Route Deviation", value: 8, color: "bg-rose-500", percent: "26%" },
        { id: "details" as const, label: "Document Hold", value: 7, color: "bg-rose-400", percent: "23%" },
        { id: "details" as const, label: "Driver Escalation", value: 5, color: "bg-rose-400", percent: "16%" },
      ],
    },
    details: {
      title: detailContext,
      subtitle: "Operational records for the selected drill-down item",
      chartTitle: "Trips by Status",
      chartId: 121,
      tone: "violet",
      segments: [],
    },
  } as const;
  const actionRows = [
    {
      priority: "Critical",
      trip: "TRP-2048",
      issue: "SLA breach",
      lifecycle: "ESCALATED_TO_OPS_HEAD",
      owner: "North Region",
      sla: "Overdue",
      tone: "rose",
      nextAction: "Approve escalation / assign recovery owner",
    },
    {
      priority: "High",
      trip: "TRP-1982",
      issue: "Breakdown",
      lifecycle: "IN_RESOLUTION",
      owner: "Fleet Desk",
      sla: "45m",
      tone: "amber",
      nextAction: "Confirm replacement vehicle ETA",
    },
    {
      priority: "High",
      trip: "TRP-2140",
      issue: "Route deviation",
      lifecycle: "ASSIGNED_TO_SUPERVISOR",
      owner: "Ops Desk",
      sla: "1h 05m",
      tone: "amber",
      nextAction: "Verify route correction and customer update",
    },
    {
      priority: "Medium",
      trip: "TRP-2216",
      issue: "Document hold",
      lifecycle: "RAISED",
      owner: "Ops Support",
      sla: "3h 30m",
      tone: "slate",
      nextAction: "Follow up for pending document clearance",
    },
  ];
  const performanceRows = [
    { label: "North Region", primary: "89%", secondary: "24 delayed", color: "bg-teal-600" },
    { label: "South Region", primary: "84%", secondary: "19 delayed", color: "bg-teal-500" },
    { label: "West Region", primary: "78%", secondary: "14 delayed", color: "bg-amber-500" },
    { label: "East Region", primary: "74%", secondary: "10 delayed", color: "bg-rose-500" },
  ];
  const delayRows = [
    { label: "Traffic / Route Congestion", value: 28, color: "bg-amber-500" },
    { label: "Loading / Unloading Hold", value: 19, color: "bg-amber-500" },
    { label: "Vehicle Breakdown", value: 12, color: "bg-amber-600" },
    { label: "Document Clearance", value: 8, color: "bg-amber-400" },
  ];
  const exceptionRows = [
    { label: "Vehicle Issue", value: 11, color: "bg-rose-500" },
    { label: "Route Deviation", value: 8, color: "bg-rose-500" },
    { label: "Document Hold", value: 7, color: "bg-rose-400" },
    { label: "Driver Escalation", value: 5, color: "bg-rose-400" },
  ];
  const readinessRows = [
    { label: "Vehicles Assigned", value: 324, color: "bg-teal-600" },
    { label: "Drivers Available", value: 286, color: "bg-teal-400" },
    { label: "Vehicles Under Maintenance", value: 18, color: "bg-slate-400" },
    { label: "Assignment Gaps", value: 31, color: "bg-rose-500" },
  ];
  const trendRows = [
    { label: "On-time Delivery", value: 86, color: "bg-teal-600" },
    { label: "Delay Risk", value: 21, color: "bg-slate-500" },
    { label: "Exception Rate", value: 9, color: "bg-slate-600" },
    { label: "SLA Breach Risk", value: 14, color: "bg-rose-500" },
  ];
  const filterOptions = {
    status: [
      { value: "all", label: "All Status" },
      { value: "active", label: "Active" },
      { value: "inTransit", label: "In Transit" },
      { value: "delayed", label: "Delayed" },
      { value: "exception", label: "Exception" },
      { value: "completed", label: "Completed" },
      { value: "unassigned", label: "Unassigned" },
    ],
    region: [
      { value: "all", label: "All Regions" },
      { value: "north", label: "North Region" },
      { value: "south", label: "South Region" },
      { value: "west", label: "West Region" },
      { value: "east", label: "East Region" },
    ],
    vendor: [
      { value: "all", label: "All Vendors" },
      { value: "primary", label: "Primary Vendors" },
      { value: "spot", label: "Spot Vendors" },
      { value: "contract", label: "Contract Vendors" },
    ],
    vehicleType: [
      { value: "all", label: "All Vehicle Types" },
      { value: "truck", label: "Truck" },
      { value: "trailer", label: "Trailer" },
      { value: "lcv", label: "LCV" },
      { value: "tanker", label: "Tanker" },
    ],
    driver: [
      { value: "all", label: "All Drivers" },
      { value: "available", label: "Available Drivers" },
      { value: "assigned", label: "Assigned Drivers" },
      { value: "unreachable", label: "Driver Unreachable" },
    ],
    customer: [
      { value: "all", label: "All Customers" },
      { value: "enterprise", label: "Enterprise Customers" },
      { value: "priority", label: "Priority Customers" },
      { value: "standard", label: "Standard Customers" },
    ],
    risk: [
      { value: "all", label: "All Risk" },
      { value: "delay", label: "Delay Risk" },
      { value: "exception", label: "Exception Risk" },
      { value: "sla", label: "SLA Risk" },
    ],
  };
  const activeDrillLevel = drillLevels[activeDrill];
  const filterMultiplier =
    (filters.status === "all" ? 1 : filters.status === "active" ? 0.8 : filters.status === "completed" ? 0.18 : filters.status === "unassigned" ? 0.08 : 0.28) *
    (filters.region === "all" ? 1 : filters.region === "north" ? 0.34 : filters.region === "south" ? 0.28 : filters.region === "west" ? 0.22 : 0.16) *
    (filters.vendor === "all" ? 1 : filters.vendor === "primary" ? 0.52 : filters.vendor === "spot" ? 0.21 : 0.27) *
    (filters.vehicleType === "all" ? 1 : filters.vehicleType === "truck" ? 0.42 : filters.vehicleType === "trailer" ? 0.28 : filters.vehicleType === "lcv" ? 0.2 : 0.1) *
    (filters.driver === "all" ? 1 : filters.driver === "available" ? 0.62 : filters.driver === "assigned" ? 0.76 : 0.09) *
    (filters.customer === "all" ? 1 : filters.customer === "enterprise" ? 0.58 : filters.customer === "priority" ? 0.26 : 0.16) *
    (getDateRangeDays(filters.startDate, filters.endDate) <= 7 ? 0.32 : getDateRangeDays(filters.startDate, filters.endDate) > 60 ? 1.85 : 1) *
    (filters.risk === "all" ? 1 : filters.risk === "delay" ? 0.48 : filters.risk === "exception" ? 0.31 : 0.26);
  const filteredSegments = activeDrillLevel.segments.map((segment) => ({
    ...segment,
    value: Math.max(1, Math.round(segment.value * filterMultiplier)),
  }));
  const filteredTotal = filteredSegments.reduce((sum, segment) => sum + segment.value, 0);
  const filteredDrillSegments = filteredSegments.map((segment) => ({
    ...segment,
    percent: `${Math.round((segment.value / Math.max(filteredTotal, 1)) * 100)}%`,
  }));
  const filteredDelayRows = scaleRows(delayRows, filterMultiplier);
  const filteredExceptionRows = scaleRows(exceptionRows, filterMultiplier);
  const filteredReadinessRows = scaleRows(readinessRows, filterMultiplier);
  const filteredTrendRows = scaleRows(trendRows, filters.risk === "all" ? 1 : filters.risk === "delay" ? 1.18 : filters.risk === "exception" ? 1.12 : 1.25);
  const drillTrail =
    activeDrill === "total"
      ? ["Total Trips"]
      : activeDrill === "active" || activeDrill === "completed" || activeDrill === "unassigned"
        ? ["Total Trips", activeDrillLevel.title]
      : activeDrill === "details"
          ? ["Total Trips", "Active Trips", detailContext]
          : ["Total Trips", "Active Trips", activeDrillLevel.title];
  const handleDrillSelect = (id: DrillKey, label: string) => {
    if (id === "completed") {
      setSelectedReportDetail({ key: "completed-trips", title: "Completed Trips" });
      return;
    }
    if (id === "details") {
      setSelectedReportDetail({ key: getReportDetailKey(label), title: label });
      return;
    }
    setActiveDrill(id);
  };
  const updateSectionVisibility = (key: DashboardSectionKey, value: boolean) => {
    setSectionVisibility((current) => {
      const next = { ...current, [key]: value };
      window.localStorage.setItem("optimile.operationsDashboard.sections", JSON.stringify(next));
      return next;
    });
  };
  const resetSectionVisibility = () => {
    setSectionVisibility(defaultSectionVisibility);
    window.localStorage.setItem("optimile.operationsDashboard.sections", JSON.stringify(defaultSectionVisibility));
  };
  const colorLegend = [
    { label: "Healthy / Active / Available", color: "bg-teal-600" },
    { label: "Delay / Warning", color: "bg-amber-500" },
    { label: "Exception / Risk", color: "bg-rose-500" },
    { label: "Neutral / Pending", color: "bg-slate-500" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <PageHeader eyebrow="TMS" title="Optimile Operations Head Dashboard" />
        <button
          type="button"
          onClick={() => setShowConfig((current) => !current)}
          className="w-fit rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-500 hover:bg-slate-50"
        >
          Configure Dashboard
        </button>
      </div>
      <ColorLegend items={colorLegend} />

      {supersetBaseUrl ? (
        <>
          {showConfig ? (
            <DashboardConfigurator
              visibility={sectionVisibility}
              onChange={updateSectionVisibility}
              onReset={resetSectionVisibility}
            />
          ) : null}

          {sectionVisibility.tripOverview ? <ReportSection title="Trip Overview">
            <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 bg-slate-950 px-4 py-3 text-white">
                {drillTrail.length > 1 ? (
                  <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-300">
                    {drillTrail.map((item, index) => (
                      <span key={item} className="flex items-center gap-2">
                        <span className={index === drillTrail.length - 1 ? "text-white" : undefined}>{item}</span>
                        {index < drillTrail.length - 1 ? <ChevronRight className="h-3.5 w-3.5 text-slate-500" /> : null}
                      </span>
                    ))}
                  </div>
                ) : null}
                <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <h3 className="text-xl font-semibold">{activeDrillLevel.title}</h3>
                    <p className="mt-0.5 text-xs leading-5 text-slate-300">{activeDrillLevel.subtitle}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4 p-4">
                <TripFilterBar
                  filters={filters}
                  options={filterOptions}
                  onChange={(key, value) => {
                    setFilters((current) => ({ ...current, [key]: value }));
                    setActiveDrill("total");
                  }}
                  onReset={() => {
                    setFilters({
                      status: "all",
                      region: "all",
                      vendor: "all",
                      vehicleType: "all",
                      driver: "all",
                      customer: "all",
                      startDate: "2026-05-01",
                      endDate: "2026-06-04",
                      risk: "all",
                    });
                    setActiveDrill("total");
                  }}
                />
                {activeDrill === "details" ? (
                  <DrillDetailTable
                      title={detailContext}
                      rows={reportDetailRows}
                      onBackToMain={() => {
                        setActiveDrill("total");
                        setDetailContext("Trip Details");
                      }}
                  />
                ) : (
                  <DrillExplorer
                    title={activeDrillLevel.title}
                    segments={filteredDrillSegments}
                    onBackToMain={
                      activeDrill !== "total"
                        ? () => {
                            setActiveDrill("total");
                            setDetailContext("Trip Details");
                          }
                        : undefined
                    }
                    onSelect={handleDrillSelect}
                  />
                )}
              </div>
            </div>
          </ReportSection> : null}

          {sectionVisibility.actionRequired ? <ReportSection title="Action Required">
            <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
              <div className="grid border-b border-slate-200 bg-slate-950 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-300 md:grid-cols-[88px_96px_minmax(0,1fr)_170px_88px_110px_minmax(180px,1.4fr)]">
                <span>Priority</span>
                <span>Trip</span>
                <span>Exception</span>
                <span>Lifecycle</span>
                <span>SLA</span>
                <span>Owner</span>
                <span>Next Action</span>
              </div>
              {actionRows.map((row) => (
                <div
                  key={row.trip}
                  className="grid items-center gap-2 border-b border-slate-100 px-3 py-2 text-xs transition last:border-b-0 hover:bg-slate-50 md:grid-cols-[88px_96px_minmax(0,1fr)_170px_88px_110px_minmax(180px,1.4fr)]"
                >
                  <span
                    className={`w-fit rounded-md px-2 py-0.5 text-[11px] font-semibold ${
                      row.tone === "rose"
                        ? "bg-rose-50 text-rose-700"
                        : row.tone === "amber"
                          ? "bg-amber-50 text-amber-700"
                          : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {row.priority}
                  </span>
                  <span className="font-semibold text-slate-950">{row.trip}</span>
                  <span className="text-slate-700">{row.issue}</span>
                  <span className="font-semibold text-slate-700">{row.lifecycle.replace(/_/g, " ")}</span>
                  <span className="font-semibold text-slate-950">{row.sla}</span>
                  <span className="text-slate-600">{row.owner}</span>
                  <span className="font-semibold leading-5 text-slate-700">{row.nextAction}</span>
                </div>
              ))}
            </div>
          </ReportSection> : null}

          <div className="grid gap-4 xl:grid-cols-2">
            {sectionVisibility.delayAnalysis ? <ReportSection title="Delay Analysis">
              <IssueBreakdownPanel rows={filteredDelayRows} />
            </ReportSection> : null}

            {sectionVisibility.exceptionAnalysis ? <ReportSection title="Exception Analysis">
              <IssueBreakdownPanel rows={filteredExceptionRows} />
            </ReportSection> : null}
            
            {sectionVisibility.readiness ? <ReportSection title="Fleet / Driver Readiness">
              <StackedReadinessPanel rows={filteredReadinessRows} />
            </ReportSection> : null}

            {sectionVisibility.performanceHealth ? <ReportSection title="Performance Health">
              <GaugePanel rows={filteredTrendRows} />
            </ReportSection> : null}
          </div>

        </>
      ) : (
        <TenantPanel title="Dashboard unavailable">
          <p className="py-6 text-sm text-muted-foreground">
            Reporting is not configured. Add VITE_SUPERSET_URL and VITE_SUPERSET_TMS_DASHBOARD_PATH in .env.local.
          </p>
        </TenantPanel>
      )}
      {selectedReportDetail ? (
        <ReportDetailOverlay
          detailKey={selectedReportDetail.key}
          title={selectedReportDetail.title}
          onClose={() => setSelectedReportDetail(null)}
        />
      ) : null}
    </div>
  );
}

export function BookingReportDetailPage() {
  const { detailKey } = useParams();
  const paths = useTenantPaths();
  const title = getReportDetailTitle(detailKey);
  const [dateFilters, setDateFilters] = useState({
    startDate: "2026-05-01",
    endDate: "2026-06-04",
  });
  const rows = filterRowsByDate(getReportRowsForDetail(detailKey), dateFilters.startDate, dateFilters.endDate);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <PageHeader eyebrow="Operations Report Data" title={title} />
        <Button asChild variant="outline">
          <Link to={`${paths.root}/booking-reports`}>Back to Main</Link>
        </Button>
      </div>

      <TenantPanel title="Trip Records">
        <div className="mb-3 grid gap-2 rounded-lg border border-slate-200 bg-white p-3 md:grid-cols-[180px_180px_auto]">
          <label>
            <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Start Date</span>
            <input
              type="date"
              value={dateFilters.startDate}
              onChange={(event) => setDateFilters((current) => ({ ...current, startDate: event.target.value }))}
              className="h-9 w-full rounded-md border border-slate-200 bg-slate-50 px-2 text-xs font-semibold text-slate-800 outline-none transition hover:border-slate-300 focus:border-slate-500 focus:bg-white"
            />
          </label>
          <label>
            <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">End Date</span>
            <input
              type="date"
              value={dateFilters.endDate}
              onChange={(event) => setDateFilters((current) => ({ ...current, endDate: event.target.value }))}
              className="h-9 w-full rounded-md border border-slate-200 bg-slate-50 px-2 text-xs font-semibold text-slate-800 outline-none transition hover:border-slate-300 focus:border-slate-500 focus:bg-white"
            />
          </label>
          <button
            type="button"
            onClick={() => setDateFilters({ startDate: "2026-05-01", endDate: "2026-06-04" })}
            className="h-9 self-end rounded-md border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:border-slate-500 hover:bg-slate-50"
          >
            Reset
          </button>
        </div>
        <DrillDetailTable title={`${title} (${rows.length})`} rows={rows} />
      </TenantPanel>
    </div>
  );
}

function ReportDetailOverlay({
  detailKey,
  title,
  onClose,
}: {
  detailKey: string;
  title: string;
  onClose: () => void;
}) {
  const [dateFilters, setDateFilters] = useState({
    startDate: "2026-05-01",
    endDate: "2026-06-04",
  });
  const rows = filterRowsByDate(getReportRowsForDetail(detailKey), dateFilters.startDate, dateFilters.endDate);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/35 px-4 py-8 backdrop-blur-[2px]">
      <div className="w-full max-w-6xl overflow-hidden rounded-lg border border-slate-200 bg-white shadow-2xl">
        <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-950 px-4 py-3 text-white sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-300">Drill Down Data</p>
            <h3 className="mt-1 text-lg font-semibold">{title}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-fit rounded-md border border-white/20 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/10"
          >
            Back to Main
          </button>
        </div>
        <div className="p-4">
          <div className="mb-3 grid gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 md:grid-cols-[180px_180px_auto]">
            <label>
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Start Date</span>
              <input
                type="date"
                value={dateFilters.startDate}
                onChange={(event) => setDateFilters((current) => ({ ...current, startDate: event.target.value }))}
                className="h-9 w-full rounded-md border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-800 outline-none transition hover:border-slate-300 focus:border-slate-500"
              />
            </label>
            <label>
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">End Date</span>
              <input
                type="date"
                value={dateFilters.endDate}
                onChange={(event) => setDateFilters((current) => ({ ...current, endDate: event.target.value }))}
                className="h-9 w-full rounded-md border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-800 outline-none transition hover:border-slate-300 focus:border-slate-500"
              />
            </label>
            <button
              type="button"
              onClick={() => setDateFilters({ startDate: "2026-05-01", endDate: "2026-06-04" })}
              className="h-9 self-end rounded-md border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:border-slate-500 hover:bg-slate-50"
            >
              Reset
            </button>
          </div>
          <DrillDetailTable title={`${title} (${rows.length})`} rows={rows} />
        </div>
      </div>
    </div>
  );
}

function ColorLegend({
  items,
}: {
  items: readonly {
    label: string;
    color: string;
  }[];
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 shadow-sm">
      <span className="uppercase tracking-[0.12em] text-slate-500">Color Meaning</span>
      {items.map((item) => (
        <span key={item.label} className="flex items-center gap-2">
          <span className={`h-2.5 w-2.5 rounded-full ${item.color}`} />
          {item.label}
        </span>
      ))}
    </div>
  );
}

function ReportSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
        <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function DashboardConfigurator({
  visibility,
  onChange,
  onReset,
}: {
  visibility: Record<DashboardSectionKey, boolean>;
  onChange: (key: DashboardSectionKey, value: boolean) => void;
  onReset: () => void;
}) {
  const sections: { key: DashboardSectionKey; label: string }[] = [
    { key: "tripOverview", label: "Trip Overview" },
    { key: "actionRequired", label: "Action Required" },
    { key: "delayAnalysis", label: "Delay Analysis" },
    { key: "exceptionAnalysis", label: "Exception Analysis" },
    { key: "readiness", label: "Fleet / Driver Readiness" },
    { key: "performanceHealth", label: "Performance Health" },
  ];

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">Dashboard Configuration</h2>
          <p className="mt-1 text-xs text-slate-500">Choose the sections visible for the Operations Head view.</p>
        </div>
        <button
          type="button"
          onClick={onReset}
          className="w-fit rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-500 hover:bg-slate-50"
        >
          Reset Layout
        </button>
      </div>
      <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
        {sections.map((section) => (
          <label
            key={section.key}
            className="flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700"
          >
            <span>{section.label}</span>
            <input
              type="checkbox"
              checked={visibility[section.key]}
              onChange={(event) => onChange(section.key, event.target.checked)}
              className="h-4 w-4 accent-slate-950"
            />
          </label>
        ))}
      </div>
    </div>
  );
}

function DrillDetailTable({
  title,
  rows,
  onBackToMain,
}: {
  title: string;
  rows: readonly {
    trip: string;
    date: string;
    status: string;
    region: string;
    vehicle: string;
    owner: string;
    sla: string;
  }[];
  onBackToMain?: () => void;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-950 px-3 py-2 text-white">
        <h3 className="text-xs font-semibold uppercase tracking-[0.12em]">{title}</h3>
        {onBackToMain ? (
          <button
            type="button"
            onClick={onBackToMain}
            className="rounded-md border border-white/20 px-3 py-1 text-[11px] font-semibold text-white transition hover:bg-white/10"
          >
            Back to Main
          </button>
        ) : null}
      </div>
      <div className="grid border-b border-slate-200 bg-slate-50 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 md:grid-cols-[110px_110px_110px_100px_120px_minmax(0,1fr)_90px]">
        <span>Trip</span>
        <span>Date</span>
        <span>Status</span>
        <span>Region</span>
        <span>Vehicle</span>
        <span>Owner</span>
        <span>SLA</span>
      </div>
      {rows.map((row) => (
        <div
          key={`${title}-${row.trip}`}
          className="grid items-center gap-2 border-b border-slate-100 px-3 py-2 text-xs last:border-b-0 hover:bg-slate-50 md:grid-cols-[110px_110px_110px_100px_120px_minmax(0,1fr)_90px]"
        >
          <span className="font-semibold text-slate-950">{row.trip}</span>
          <span className="text-slate-600">{row.date}</span>
          <span className="text-slate-700">{row.status}</span>
          <span className="text-slate-600">{row.region}</span>
          <span className="text-slate-600">{row.vehicle}</span>
          <span className="text-slate-600">{row.owner}</span>
          <span className="font-semibold text-slate-950">{row.sla}</span>
        </div>
      ))}
    </div>
  );
}

function TripFilterBar({
  filters,
  options,
  onChange,
  onReset,
}: {
  filters: TripFilters;
  options: Record<keyof TripFilters, readonly { value: string; label: string }[]>;
  onChange: (key: keyof TripFilters, value: string) => void;
  onReset: () => void;
}) {
  const fields: { key: keyof TripFilters; label: string }[] = [
    { key: "status", label: "Status" },
    { key: "vendor", label: "Vendor" },
    { key: "vehicleType", label: "Vehicle Type" },
    { key: "customer", label: "Customer" },
    { key: "risk", label: "Risk" },
  ];
  const dateFields: { key: "startDate" | "endDate"; label: string }[] = [
    { key: "startDate", label: "Start Date" },
    { key: "endDate", label: "End Date" },
  ];
  return (
    <div className="border-b border-slate-200 pb-4">
      <div className="mb-2 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Trip Filters</h3>
        </div>
      </div>
      <div className="grid gap-2 md:grid-cols-4 xl:grid-cols-[repeat(8,minmax(0,1fr))_auto]">
        {fields.map((field) => (
          <label key={field.key} className="min-w-0">
            <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">{field.label}</span>
            <select
              value={filters[field.key]}
              onChange={(event) => onChange(field.key, event.target.value)}
              className="h-9 w-full rounded-md border border-slate-200 bg-slate-50 px-2 text-xs font-semibold text-slate-800 outline-none transition hover:border-slate-300 focus:border-slate-500 focus:bg-white"
            >
              {options[field.key].map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        ))}
        {dateFields.map((field) => (
          <label key={field.key} className="min-w-0">
            <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">{field.label}</span>
            <input
              type="date"
              value={filters[field.key]}
              onChange={(event) => onChange(field.key, event.target.value)}
              className="h-9 w-full rounded-md border border-slate-200 bg-slate-50 px-2 text-xs font-semibold text-slate-800 outline-none transition hover:border-slate-300 focus:border-slate-500 focus:bg-white"
            />
          </label>
        ))}
        <button
          type="button"
          onClick={onReset}
          className="h-9 self-end rounded-md border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:border-slate-500 hover:bg-slate-50"
        >
          Reset
        </button>
      </div>
    </div>
  );
}

function DrillExplorer({
  title,
  segments,
  onBackToMain,
  onSelect,
}: {
  title: string;
  segments: readonly {
    id: DrillKey;
    label: string;
    value: number;
    color: string;
    percent: string;
  }[];
  onBackToMain?: () => void;
  onSelect: (id: DrillKey, label: string) => void;
}) {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);

  return (
    <div aria-label={title} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Click a bar to drill down</p>
        <div className="flex items-center gap-2">
          {onBackToMain ? (
            <button
              type="button"
              onClick={onBackToMain}
              className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-500 hover:bg-slate-50"
            >
              Back to Main
            </button>
          ) : null}
          <BarChart3 className="h-5 w-5 text-slate-500" />
        </div>
      </div>
      <div>
        <div className="flex min-h-52 items-end gap-2">
          {segments.map((segment) => (
            <button
              key={`${segment.label}-${segment.id}`}
              type="button"
              onClick={() => onSelect(segment.id, segment.label)}
              className="group relative flex min-h-48 flex-1 flex-col justify-end rounded-md border border-transparent bg-white p-2 text-left shadow-sm transition hover:-translate-y-1 hover:border-slate-300 hover:shadow-md"
              aria-label={`Open ${segment.label}`}
            >
              <span className="pointer-events-none absolute left-1/2 top-3 z-10 -translate-x-1/2 rounded-md bg-slate-950 px-3 py-1.5 text-sm font-semibold text-white opacity-0 shadow-lg transition group-hover:opacity-100">
                {segment.value}
              </span>
              <span
                className={`block w-full rounded-t-md ${segment.color} transition group-hover:brightness-110`}
                style={{ height: `${Math.max(28, (segment.value / Math.max(total, 1)) * 160)}px` }}
              />
              <span className="mt-2 block text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">{segment.percent}</span>
              <span className="mt-0.5 block text-xs font-semibold leading-4 text-slate-950">{segment.label}</span>
            </button>
          ))}
        </div>
      </div>

    </div>
  );
}

function IssueBreakdownPanel({
  rows,
}: {
  rows: readonly {
    label: string;
    value: number;
    color: string;
  }[];
}) {
  const maxValue = Math.max(...rows.map((row) => row.value), 1);
  const total = rows.reduce((sum, row) => sum + row.value, 0);
  const topIssue = rows.reduce<(typeof rows)[number] | null>((highest, row) => (!highest || row.value > highest.value ? row : highest), null);

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <p className="text-2xl font-semibold text-slate-950">{total}</p>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Total Issues</p>
        </div>
        <div className="text-right">
          <p className="max-w-48 truncate text-sm font-semibold text-slate-900">{topIssue?.label ?? "No issues"}</p>
          <p className="text-xs text-slate-500">Top contributor</p>
        </div>
      </div>
      <div className="space-y-3">
        {rows.map((row) => (
          <div
            key={row.label}
            className="group grid items-center gap-3 text-xs md:grid-cols-[minmax(150px,210px)_1fr_72px]"
            title={`${row.label}: ${row.value} trips, ${Math.round((row.value / Math.max(total, 1)) * 100)}% of issues`}
          >
            <div className="flex min-w-0 items-center gap-2 font-semibold text-slate-700">
              <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${row.color}`} />
              <span className="truncate">{row.label}</span>
            </div>
            <div className="h-8 overflow-hidden rounded-md bg-slate-100">
              <div
                className={`flex h-full items-center justify-end rounded-md pr-2 text-[11px] font-semibold text-white ${row.color} transition-all group-hover:brightness-110`}
                style={{ width: `${Math.max(8, (row.value / maxValue) * 100)}%` }}
              >
                {Math.round((row.value / Math.max(total, 1)) * 100)}%
              </div>
            </div>
            <div className="text-right font-semibold text-slate-950">{row.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StackedReadinessPanel({
  rows,
}: {
  rows: readonly {
    label: string;
    value: number;
    color: string;
  }[];
}) {
  const assigned = rows.find((row) => row.label === "Vehicles Assigned")?.value ?? 0;
  const drivers = rows.find((row) => row.label === "Drivers Available")?.value ?? 0;
  const maintenance = rows.find((row) => row.label === "Vehicles Under Maintenance")?.value ?? 0;
  const gaps = rows.find((row) => row.label === "Assignment Gaps")?.value ?? 0;
  const readyCapacity = Math.min(100, Math.round((drivers / Math.max(assigned, 1)) * 100));

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-3xl font-semibold text-slate-950">{readyCapacity}%</p>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Ready Capacity</p>
        </div>
        <div className="text-sm font-semibold text-slate-700">
          {drivers} drivers for {assigned} assigned vehicles
        </div>
      </div>

      <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-teal-600" style={{ width: `${readyCapacity}%` }} />
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {[
          { label: "Vehicles Assigned", value: assigned, color: "bg-teal-600" },
          { label: "Drivers Available", value: drivers, color: "bg-teal-400" },
          { label: "Under Maintenance", value: maintenance, color: "bg-slate-400" },
          { label: "Assignment Gaps", value: gaps, color: "bg-rose-500" },
        ].map((row) => (
          <div key={row.label} className="rounded-md border border-slate-100 bg-slate-50 px-3 py-2">
            <span className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">
              <span className={`h-2 w-2 rounded-full ${row.color}`} />
              {row.label}
            </span>
            <p className="mt-1 text-lg font-semibold text-slate-950">{row.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function GaugePanel({
  rows,
}: {
  rows: readonly {
    label: string;
    value: number;
    color: string;
  }[];
}) {
  const onTime = rows.find((row) => row.label === "On-time Delivery") ?? rows[0] ?? { label: "On-time Delivery", value: 0, color: "bg-teal-600" };
  const riskRows = rows.filter((row) => row.label !== "On-time Delivery");
  const highestRisk = riskRows.reduce<(typeof riskRows)[number] | null>((highest, row) => (!highest || row.value > highest.value ? row : highest), null);

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-3xl font-semibold text-slate-950">{onTime.value}%</p>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{onTime.label}</p>
        </div>
        <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-right">
          <p className="text-sm font-semibold text-slate-950">{highestRisk?.value ?? 0}%</p>
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">Highest Risk</p>
        </div>
      </div>

      <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-teal-600" style={{ width: `${Math.min(onTime.value, 100)}%` }} />
      </div>

      <div className="mt-4 space-y-3">
        {riskRows.map((row) => (
          <div key={row.label} className="grid items-center gap-3 text-xs md:grid-cols-[140px_1fr_48px]">
            <span className="font-semibold text-slate-700">{row.label}</span>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
              <div className={`h-full rounded-full ${row.color}`} style={{ width: `${Math.min(row.value, 100)}%` }} />
            </div>
            <span className="text-right font-semibold text-slate-950">{row.value}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
