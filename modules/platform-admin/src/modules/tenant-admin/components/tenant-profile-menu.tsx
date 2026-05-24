import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown, LogOut, User as UserIcon, X } from "lucide-react";
import { useSessionContext } from "@/shared/auth/session-context";
import { useTenantRolePermissions } from "@/modules/tenant-admin/hooks/useTenantRolePermissions";
import { useTenantRoles } from "@/modules/tenant-admin/hooks/useTenantRoles";
import { useTenantRouteContext } from "@/modules/tenant-admin/hooks/useTenantRouteContext";
import { useTenantOrgUnits } from "@/modules/tenant-admin/hooks/useTenantOrgUnits";
import { useTenantUsers } from "@/modules/tenant-admin/hooks/useTenantUsers";
import { usePlatformModules } from "@/modules/platform-admin/hooks/usePlatformModules";
import { resolveSessionRoleContext } from "@/shared/lib/tenant-rbac";
import { displayModule } from "@/modules/platform-admin/lib/module-display";

const TENANT_ADMIN_SESSION_KEY = "optimile.tenantAdmin.session";

export function TenantProfileMenu() {
  const navigate = useNavigate();
  const { tenant } = useTenantRouteContext();
  const { session, setSession } = useSessionContext();
  const { data: users } = useTenantUsers(tenant.id);
  const { data: roles } = useTenantRoles(tenant.id);
  const { data: rolePermissions } = useTenantRolePermissions(tenant.id);
  const { data: orgUnits } = useTenantOrgUnits(tenant.id);
  const { data: platformModules } = usePlatformModules();

  const { activeRole, currentTenantUser } = resolveSessionRoleContext({
    tenant,
    session,
    users,
    roles,
    rolePermissions,
  });

  const [open, setOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Close dropdown when clicking outside.
  useEffect(() => {
    if (!open) return;
    function handleClick(event: MouseEvent) {
      const target = event.target as HTMLElement | null;
      if (target?.closest("[data-tenant-profile-menu]")) return;
      setOpen(false);
    }
    window.addEventListener("mousedown", handleClick);
    return () => window.removeEventListener("mousedown", handleClick);
  }, [open]);

  const userName = currentTenantUser?.name ?? session.actorName ?? "User";
  const userEmail = currentTenantUser?.email ?? session.actorName ?? "";
  const roleName = activeRole?.name ?? "User";
  const initials = useMemo(
    () =>
      userName
        .split(/\s+/)
        .map((part) => part[0]?.toUpperCase() ?? "")
        .filter(Boolean)
        .slice(0, 2)
        .join("") || "U",
    [userName],
  );

  const assignedOrgUnits = (currentTenantUser?.orgUnitIds ?? []).map(
    (id) => orgUnits.find((unit) => unit.id === id)?.name ?? id,
  );
  const assignedModules = (activeRole?.moduleCodes ?? []).map((code) => {
    if (code === "ADMIN") return "Admin";
    const module = platformModules.find((item) => item.code === code);
    return module ? displayModule(module).name : code;
  });

  function handleLogout() {
    setOpen(false);
    setDrawerOpen(false);
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(TENANT_ADMIN_SESSION_KEY);
    }
    setSession({
      actorType: "platform_admin",
      actorName: "",
      previewTenantRoleId: null,
      activeTenantOrgUnitId: null,
    });
    navigate(`/platform-admin/tenant-login?tenantId=${tenant.id}`);
  }

  return (
    <div className="relative" data-tenant-profile-menu>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-2 py-1 text-left transition hover:bg-slate-50"
      >
        <span className="flex size-7 items-center justify-center rounded-full bg-slate-900 text-[11px] font-semibold text-white">
          {initials}
        </span>
        <span className="hidden text-[12px] leading-tight md:flex md:flex-col">
          <span className="font-medium text-slate-900">{userName}</span>
          <span className="text-slate-500">{roleName}</span>
        </span>
        <ChevronDown className="size-3.5 text-slate-500" />
      </button>

      {open ? (
        <div className="absolute right-0 z-40 mt-1 w-44 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-md">
          <button
            type="button"
            onClick={() => {
              setDrawerOpen(true);
              setOpen(false);
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] text-slate-700 transition hover:bg-slate-50"
          >
            <UserIcon className="size-3.5 text-slate-500" />
            View Profile
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-2 border-t border-slate-100 px-3 py-2 text-left text-[12px] text-slate-700 transition hover:bg-slate-50"
          >
            <LogOut className="size-3.5 text-slate-500" />
            Logout
          </button>
        </div>
      ) : null}

      {drawerOpen ? (
        <div className="fixed inset-0 z-50 flex items-start justify-end bg-slate-950/30">
          <aside className="flex h-full w-full max-w-sm flex-col border-l border-slate-200 bg-white">
            <header className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <h2 className="text-[14px] font-semibold text-slate-900">Profile</h2>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="rounded-md p-1 text-slate-500 hover:bg-slate-100"
                aria-label="Close"
              >
                <X className="size-4" />
              </button>
            </header>
            <div className="flex-1 overflow-y-auto px-4 py-4">
              <dl className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-slate-50/40">
                <ProfileRow label="Name" value={userName} />
                <ProfileRow label="Email" value={userEmail} />
                <ProfileRow label="Role" value={roleName} />
                <ProfileRow label="Tenant" value={`${tenant.name} (${tenant.code})`} />
                <ProfileRow
                  label="Assigned Place"
                  value={assignedOrgUnits.length ? assignedOrgUnits.join(", ") : "—"}
                />
                <ProfileRow
                  label="Assigned Modules"
                  value={assignedModules.length ? assignedModules.join(", ") : "—"}
                />
                <ProfileRow label="Status" value={currentTenantUser?.status ?? "active"} />
              </dl>

              <div className="mt-4">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  <LogOut className="size-3.5" />
                  Logout
                </button>
              </div>
            </div>
          </aside>
        </div>
      ) : null}
    </div>
  );
}

function ProfileRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 px-3 py-2">
      <dt className="text-[11px] uppercase tracking-[0.06em] text-slate-500">{label}</dt>
      <dd className="text-right text-[12px] font-medium text-slate-900">{value}</dd>
    </div>
  );
}
