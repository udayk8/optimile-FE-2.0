import { useMemo } from "react";
import { useLocation } from "react-router-dom";
import { TenantAutoLrOperationsPage } from "@/modules/tenant-admin/pages/lr/auto-lr-operations-page";
import { LrModeTabs } from "@/modules/tenant-admin/pages/lr/lr-mode-tabs";
import { TenantManualLrOperationsPage } from "@/modules/tenant-admin/pages/lr/manual-lr-operations-page";

export function TenantLrOperationsPage() {
  const location = useLocation();
  const mode = useMemo(() => new URLSearchParams(location.search).get("mode") === "auto" ? "auto" : "manual", [location.search]);

  return (
    <div className="space-y-4">
      <LrModeTabs manualLabel="Manual LR" autoLabel="Auto LR" />
      {mode === "auto" ? <TenantAutoLrOperationsPage /> : <TenantManualLrOperationsPage />}
    </div>
  );
}
