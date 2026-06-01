import type {
  AnalyticsRoutingDecision,
  AnalyticsScope,
  ReportExecutionMeta,
  TemplatedAnalyticsQuery,
} from "@shared-api";
import type { AuditLogRecord } from "@/types/abac";
import type { TenantCustomer } from "@/types/customer";
import type { TenantDriver, TenantVehicle } from "@/types/fleet";
import type { TenantVendor } from "@/types/vendor";
import type { BookingRecord, BookingStatus } from "@/modules/tms/booking/types";

export interface TenantAnalyticsSnapshot {
  totalBookings: number;
  deliveredBookings: number;
  approvalPendingBookings: number;
  activeVehicles: number;
  activeDrivers: number;
  activeVendors: number;
  totalFreightValue: number;
  deliveredFreightValue: number;
}

export interface TenantAnalyticsSeriesPoint {
  key: string;
  label: string;
  value: number;
}

export interface TenantAnalyticsTableRow {
  id: string;
  bookingId: string;
  customer: string;
  status: BookingStatus;
  serviceType: string;
  commercialType: string;
  freight: number;
  weight: number;
  createdAt: string;
  assignedVendor: string;
  assignedDriver: string;
}

export interface TenantAnalyticsInput {
  tenantId: string;
  bookings: BookingRecord[];
  vehicles: TenantVehicle[];
  drivers: TenantDriver[];
  vendors: TenantVendor[];
  customers: TenantCustomer[];
  auditLogs: AuditLogRecord[];
}

export interface ReportingExecutionRequest {
  scope: AnalyticsScope;
  query: TemplatedAnalyticsQuery;
  dataset: TenantAnalyticsInput;
}

export interface ReportQueryEngineResult {
  decision: AnalyticsRoutingDecision;
  sql: string;
  bookings: BookingRecord[];
  executionMode: "generic" | "specialized";
}

export interface SupersetEmbedConfig {
  title: string;
  description: string;
  status: "configured" | "missing_config";
  embedUrl?: string;
  siteUrl?: string;
}

export interface ReportingExecutionTrace {
  controller: string;
  middleware: string;
  service: string;
  templateService: string;
  executor: string;
  queryEngine: string;
  database: string;
  cache: string;
  cacheStatus: "hit" | "miss";
  sql: string;
}

export interface TenantAnalyticsResult {
  meta: ReportExecutionMeta;
  decision: AnalyticsRoutingDecision;
  cacheKey: string;
  snapshot: TenantAnalyticsSnapshot;
  trend: TenantAnalyticsSeriesPoint[];
  statusBreakdown: TenantAnalyticsSeriesPoint[];
  customerBreakdown: TenantAnalyticsSeriesPoint[];
  rows: TenantAnalyticsTableRow[];
  trace: ReportingExecutionTrace;
  superset: SupersetEmbedConfig;
}
