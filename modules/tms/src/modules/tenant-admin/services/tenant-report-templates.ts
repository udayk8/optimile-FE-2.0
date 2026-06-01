import { createTemplateRegistry, type ReportTemplateDefinition } from "@shared-api";

const tenantReportTemplates: ReportTemplateDefinition[] = [
  {
    key: "tenant-booking-overview",
    domain: "tms",
    title: "Booking Overview",
    description:
      "Executive booking summary with fast KPI cards, queue movement, and high-level operational trends.",
    defaultMetric: "booking_count",
    defaultGroupBy: ["month"],
    allowedMetrics: ["booking_count", "freight_value"],
    allowedFilters: ["status", "customerId", "serviceType", "commercialType"],
    drillFields: ["bookingId", "assignedVendor", "assignedDriver"],
    executionMode: "generic",
    summaryCapabilities: {
      metrics: ["booking_count", "freight_value"],
      dimensions: ["month", "status", "customer", "serviceType", "commercialType"],
      filterFields: ["status", "customerId", "serviceType", "commercialType"],
    },
  },
  {
    key: "tenant-booking-exceptions",
    domain: "tms",
    title: "Approval and Exception Focus",
    description:
      "Specialized report for approvals, assignment blockers, and drilldown-heavy operational investigation.",
    defaultMetric: "booking_count",
    defaultGroupBy: ["status"],
    allowedMetrics: ["booking_count", "freight_value"],
    allowedFilters: ["status", "customerId", "serviceType", "commercialType"],
    drillFields: ["bookingId", "assignedVendor", "assignedDriver"],
    executionMode: "specialized",
    summaryCapabilities: {
      metrics: ["booking_count"],
      dimensions: ["status", "customer", "serviceType", "commercialType"],
      filterFields: ["status", "customerId", "serviceType", "commercialType"],
    },
  },
];

export const tenantReportRegistry = createTemplateRegistry(tenantReportTemplates);
