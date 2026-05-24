import { useMemo } from "react";
import { useLocation } from "react-router-dom";
import { TenantAutoLRConfigPage } from "@/modules/tenant-admin/pages/lr/auto-lr-config-page";
import { LrModeTabs } from "@/modules/tenant-admin/pages/lr/lr-mode-tabs";
import { TenantManualLRConfigPage } from "@/modules/tenant-admin/pages/lr/manual-lr-config-page";

export function TenantLRConfigPage() {
  const location = useLocation();
  const mode = useMemo(() => new URLSearchParams(location.search).get("mode") === "auto" ? "auto" : "manual", [location.search]);

  return (
    <div className="space-y-4">
      <LrModeTabs manualLabel="Manual LR" autoLabel="Auto LR" />
      {mode === "auto" ? <TenantAutoLRConfigPage /> : <TenantManualLRConfigPage />}
    </div>
  );
}
