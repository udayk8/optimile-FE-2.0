import { Outlet, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Building2, Files, LayoutDashboard, Package2, ReceiptText, Settings2 } from "lucide-react";
import { WorkspaceShell } from "@layouts/shared/workspace-shell";
import { usePlatformPaths } from "@platform-admin/hooks/usePlatformPaths";

export function PlatformLayout() {
  const location = useLocation();
  const paths = usePlatformPaths();
  const platformNav = [
    { to: paths.dashboard, label: "Platform Dashboard", icon: LayoutDashboard },
    { to: paths.tenants, label: "Tenants", icon: Building2 },
    { to: paths.modules, label: "Module Catalog", icon: Package2 },
    { to: paths.plans, label: "Plans", icon: ReceiptText },
    { to: paths.auditLogs, label: "Platform Audit Logs", icon: Files },
    { to: paths.settings, label: "Platform Settings", icon: Settings2 },
  ];

  return (
    <WorkspaceShell
      title="Optimile Super Admin"
      subtitle="Platform governance and tenant oversight"
      navItems={platformNav}
      actorLabel="Platform login"
      searchPlaceholder="Search tenants, plans, modules, and platform events"
    >
      <motion.main
        key={location.pathname}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
        className="flex-1 p-5 xl:p-6"
      >
        <Outlet />
      </motion.main>
    </WorkspaceShell>
  );
}
