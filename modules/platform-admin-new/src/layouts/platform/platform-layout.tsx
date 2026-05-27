import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Building2, LayoutDashboard, LogOut, Package2 } from "lucide-react";
import { useAuth } from "@shared-auth";
import { WorkspaceShell } from "@layouts/shared/workspace-shell";
import { usePlatformPaths } from "@platform-admin/hooks/usePlatformPaths";

export function PlatformLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const paths = usePlatformPaths();
  const platformNav = [
    { to: paths.dashboard, label: "Dashboard", icon: LayoutDashboard },
    { to: paths.tenants, label: "Tenants", icon: Building2 },
    { to: paths.modules, label: "Modules", icon: Package2 },
  ];

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <WorkspaceShell
      title="Optimile Admin"
      subtitle="Tenants & modules"
      navItems={platformNav}
      actorLabel="Super Admin"
      headerRight={
        <button
          type="button"
          onClick={handleLogout}
          className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1.5 text-[12px] font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
        >
          <LogOut className="size-3.5" />
          Log out
        </button>
      }
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

