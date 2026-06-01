import type { ReportTemplateDefinition } from "@shared-api";
import { tenantReportRegistry } from "./tenant-report-templates";

export function listReportTemplates() {
  return tenantReportRegistry.list();
}

export function resolveReportTemplate(templateKey: string): ReportTemplateDefinition {
  return tenantReportRegistry.require(templateKey);
}
