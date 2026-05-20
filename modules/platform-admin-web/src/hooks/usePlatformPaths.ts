import { useMatch } from "react-router-dom";

export function usePlatformPaths() {
  const platformAdminMatch = useMatch("/platform-admin/*");
  const adminMatch = useMatch("/admin/*");
  const base = platformAdminMatch ? "/platform-admin" : adminMatch ? "/admin" : "";

  return {
    dashboard: `${base}/dashboard`,
    tenants: `${base}/tenants`,
    tenant: (id: string) => `${base}/tenants/${id}`,
    modules: `${base}/modules`,
    plans: `${base}/plans`,
    auditLogs: `${base}/audit-logs`,
    settings: `${base}/settings`,
    tenantWorkspace: (id: string) => `/tenant-admin/tenant/${id}/dashboard`,
  };
}
