import { Outlet, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Building2, LayoutDashboard, Package2 } from "lucide-react";
import { WorkspaceShell } from "@layouts/shared/workspace-shell";
import { usePlatformPaths } from "@platform-admin/hooks/usePlatformPaths";

export function PlatformLayout() {
  const location = useLocation();
  const paths = usePlatformPaths();
  const platformNav = [
    { to: paths.dashboard, label: "Dashboard", icon: LayoutDashboard },
    { to: paths.tenants, label: "Tenants", icon: Building2 },
    { to: paths.modules, label: "Modules", icon: Package2 },
  ];

  return (
    <WorkspaceShell
      title="Optimile Admin"
      subtitle="Tenants & modules"
      navItems={platformNav}
      actorLabel="Super Admin"
    >
      <motion.main
        key={location.pathname}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18, ease: "easeOut" }}
        className="flex-1 px-5 py-5 xl:px-6"
      >
        <Outlet />
      </motion.main>
    </WorkspaceShell>
  );
}

