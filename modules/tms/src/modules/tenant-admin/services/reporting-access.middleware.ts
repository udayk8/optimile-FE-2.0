import type { AnalyticsScope, TemplatedAnalyticsQuery } from "@shared-api";
import { resolveReportTemplate } from "./template-registry.service";

export function validateReportingAccess(scope: AnalyticsScope, query: TemplatedAnalyticsQuery) {
  if (!scope.tenantId) {
    throw new Error("Tenant scope is required for tenant reporting.");
  }

  const template = resolveReportTemplate(query.templateKey);
  if (template.domain !== query.domain) {
    throw new Error(`Template ${template.key} does not belong to domain ${query.domain}.`);
  }

  if (scope.allowedModuleCodes?.length && !scope.allowedModuleCodes.includes("TMS")) {
    throw new Error("The active session is not allowed to access TMS reporting.");
  }
}
