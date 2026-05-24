import { useMatch } from "react-router-dom";

export function usePlatformPaths() {
  const embedded = useMatch("/platform-admin/*");
  const base = embedded ? "/platform-admin" : "";

  return {
    dashboard: `${base}/dashboard`,
    tenants: `${base}/tenants`,
    tenant: (id: string) => `${base}/tenants/${id}`,
    modules: `${base}/modules`,
    plans: `${base}/plans`,
    auditLogs: `${base}/audit-logs`,
    settings: `${base}/settings`,
    tenantWorkspace: (id: string) => `${base}/tenant/${id}/dashboard`,
  };
}


