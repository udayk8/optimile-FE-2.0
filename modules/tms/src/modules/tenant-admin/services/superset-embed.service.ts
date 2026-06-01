import type { AnalyticsScope, TemplatedAnalyticsQuery } from "@shared-api";
import type { ReportTemplateDefinition } from "@shared-api";
import type { SupersetEmbedConfig } from "./reporting-types";

function trimTrailingSlash(value: string) {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

export function buildSupersetEmbedConfig(
  scope: AnalyticsScope,
  query: TemplatedAnalyticsQuery,
  template: ReportTemplateDefinition,
): SupersetEmbedConfig {
  const siteUrl = import.meta.env.VITE_SUPERSET_URL?.trim();
  const dashboardPath =
    import.meta.env.VITE_SUPERSET_TMS_DASHBOARD_PATH?.trim() ??
    "/superset/dashboard/tms-ops/?standalone=1";

  if (!siteUrl) {
    return {
      title: "Apache Superset",
      description:
        "Set VITE_SUPERSET_URL and VITE_SUPERSET_TMS_DASHBOARD_PATH to embed your Superset dashboard here.",
      status: "missing_config",
    };
  }

  const baseUrl = trimTrailingSlash(siteUrl);
  const separator = dashboardPath.includes("?") ? "&" : "?";
  const embedUrl =
    `${baseUrl}${dashboardPath}${separator}` +
    new URLSearchParams({
      tenant: scope.tenantId ?? "",
      template: template.key,
      metric: query.metric,
    }).toString();

  return {
    title: "Apache Superset",
    description:
      "Embedded analytical canvas for business users who need richer slice-and-dice dashboards beside the native reporting flow.",
    status: "configured",
    embedUrl,
    siteUrl: baseUrl,
  };
}
