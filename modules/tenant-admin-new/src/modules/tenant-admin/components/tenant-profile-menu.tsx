import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, LogOut, User as UserIcon, X } from "lucide-react";
import { clearAuthState, clearStoredAuthSession } from "@shared-auth";
import { useSessionContext } from "@/shared/auth/session-context";
import { storageKeys, writeStoredValue } from "@/shared/lib/storage/browser-storage";
import { useTenantRolePermissions } from "@/modules/tenant-admin/hooks/useTenantRolePermissions";
import { useTenantRoles } from "@/modules/tenant-admin/hooks/useTenantRoles";
import { useTenantRouteContext } from "@/modules/tenant-admin/hooks/useTenantRouteContext";
import { useTenantOrgUnits } from "@/modules/tenant-admin/hooks/useTenantOrgUnits";
import { useTenantUsers } from "@/modules/tenant-admin/hooks/useTenantUsers";
import { usePlatformModules } from "@/modules/platform-admin/hooks/usePlatformModules";
import { getSessionPortalModule, resolveSessionRoleContext } from "@/shared/lib/tenant-rbac";
import { displayModule } from "@/modules/platform-admin/lib/module-display";

const TENANT_ADMIN_SESSION_KEY = "optimile.tenantAdmin.session";

export function TenantProfileMenu() {
  const { tenant } = useTenantRouteContext();
  const { session } = useSessionContext();
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
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

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

  // Close the profile popup on Escape.
  useEffect(() => {
    if (!drawerOpen) return;
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") setDrawerOpen(false);
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [drawerOpen]);

  // Move focus into the dialog when it opens and restore it to the trigger on close.
  useEffect(() => {
    if (!drawerOpen) return;
    dialogRef.current?.focus();
    return () => triggerRef.current?.focus();
  }, [drawerOpen]);

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

  const status = currentTenantUser?.status ?? "active";
  const isActive = String(status).toLowerCase() === "active";

  // Render fields appropriate to WHO is signed in. External-party portal logins
  // (vendor/customer) are not tenant employees, so the employee/RBAC fields
  // (email/role/assigned place/modules/status) don't apply — show their own
  // identity instead (name, phone, id). Internal/platform sessions keep the
  // full employee profile.
  const portalModule = getSessionPortalModule(session); // 'VENDOR' | 'CUSTOMER' | null
  const tenantLabel = `${tenant.name} (${tenant.code})`;

  const headerRole =
    portalModule === "CUSTOMER" ? "Customer" : portalModule === "VENDOR" ? "Vendor" : roleName;

  const profileRows: Array<{ label: string; value: string }> =
    portalModule === "CUSTOMER"
      ? [
          { label: "Phone", value: session.phone || "—" },
          { label: "Customer ID", value: session.customerId || "—" },
          { label: "Tenant", value: tenantLabel },
        ]
      : portalModule === "VENDOR"
        ? [
            { label: "Phone", value: session.phone || "—" },
            { label: "Vendor ID", value: session.vendorId || "—" },
            { label: "Tenant", value: tenantLabel },
          ]
        : [
            { label: "Email", value: userEmail || "—" },
            { label: "Tenant", value: tenantLabel },
            {
              label: "Assigned Place",
              value: assignedOrgUnits.length ? assignedOrgUnits.join(", ") : "—",
            },
            {
              label: "Assigned Modules",
              value: assignedModules.length ? assignedModules.join(", ") : "—",
            },
          ];

  // Only internal tenant employees carry a real status; don't show a fabricated
  // "active" badge for vendor/customer portal logins.
  const showStatus = !portalModule;

  function handleLogout() {
    setOpen(false);
    setDrawerOpen(false);

    const loggedOutSession = {
      actorType: "platform_admin" as const,
      actorName: "",
      previewTenantRoleId: null,
      activeTenantOrgUnitId: null,
    };

    // Clear the shared @shared-auth session (tokens + auth-state flags + demo
    // session). Done at the storage level rather than via the useAuth() hook so
    // this works even where no AuthProvider wraps the tenant shell (embedded mounts).
    clearStoredAuthSession();
    clearAuthState();

    if (typeof window !== "undefined") {
      // Tenant-admin session.
      window.localStorage.removeItem(TENANT_ADMIN_SESSION_KEY);
      // Reset the shared session context to its logged-out default, flushing
      // synchronously so it survives the hard reload below, and drop the backup
      // copy so the previous identity (e.g. an embedded customer) can't be
      // recovered from `<key>_backup` on next load.
      writeStoredValue(storageKeys.sessionContext, loggedOutSession);
      window.localStorage.removeItem(`${storageKeys.sessionContext}_backup`);
    }

    // No setSession() here: the logged-out session is already flushed to storage
    // above, and a setState would re-render the shell (and flash) before the hard
    // reload below destroys all in-memory state anyway.
    window.location.assign(`/login?tenantId=${tenant.id}`);
  }

  return (
    <div className="relative" data-tenant-profile-menu>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-2 py-1 text-left transition hover:bg-slate-50"
      >
        <span className="flex size-7 items-center justify-center rounded-full bg-slate-900 text-[11px] font-semibold text-white">
          {initials}
        </span>
        <span className="hidden text-[12px] leading-tight md:flex md:flex-col">
          <span className="font-medium text-slate-900">{userName}</span>
          <span className="text-slate-500">{headerRole}</span>
        </span>
        <ChevronDown className="size-3.5 text-slate-500" />
      </button>

      {open ? (
        <div className="absolute right-0 z-40 mt-1 w-44 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-md">
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] text-slate-700 transition hover:bg-slate-50"
          >
            <LogOut className="size-3.5 text-slate-500" />
            Logout
          </button>
        </div>
      ) : null}

      {drawerOpen
        ? createPortal(
            // Read-only profile popup, centered over the whole screen (incl. the
            // embedded customer-web content). Portaled to <body> so it can't be
            // trapped by an ancestor's transform/overflow. Dismiss via backdrop
            // click, ✕, or Escape.
            <div
              role="presentation"
              onClick={() => setDrawerOpen(false)}
              className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
            >
              <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-label="Profile"
                tabIndex={-1}
                onClick={(event) => event.stopPropagation()}
                className="w-full max-w-sm overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl outline-none"
              >
                {/* Header: avatar + name + role */}
                <div className="flex items-start justify-between gap-3 border-b border-gray-200 px-5 py-4">
                  <div className="flex items-center gap-3">
                    <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-base font-bold text-primary">
                      {initials}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-[15px] font-bold text-text">{userName}</p>
                      <span className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary ring-1 ring-primary/20">
                        <UserIcon className="size-3" />
                        {headerRole}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDrawerOpen(false)}
                    aria-label="Close"
                    className="-mr-1 rounded-md p-1 text-gray-500 transition hover:bg-gray-100 hover:text-gray-700"
                  >
                    <X className="size-4" />
                  </button>
                </div>

                {/* Details */}
                <div className="px-5 py-4">
                  <dl className="space-y-3.5">
                    {profileRows.map((row) => (
                      <ProfileRow key={row.label} label={row.label} value={row.value} />
                    ))}
                    {showStatus ? (
                      <div className="flex items-center justify-between gap-4">
                        <dt className="shrink-0 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                          Status
                        </dt>
                        <dd>
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-bold capitalize ring-1 ${
                              isActive
                                ? "bg-success/10 text-success ring-success/20"
                                : "bg-gray-100 text-gray-600 ring-gray-200"
                            }`}
                          >
                            <span className={`size-1.5 rounded-full ${isActive ? "bg-success" : "bg-gray-400"}`} />
                            {status}
                          </span>
                        </dd>
                      </div>
                    ) : null}
                  </dl>
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-2 border-t border-gray-200 px-5 py-3">
                  <button
                    type="button"
                    onClick={() => setDrawerOpen(false)}
                    className="inline-flex h-9 items-center rounded-lg border border-transparent px-4 text-[13px] font-semibold text-gray-700 transition hover:bg-gray-100"
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="inline-flex h-9 items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 text-[13px] font-semibold text-primary transition hover:bg-gray-50"
                  >
                    <LogOut className="size-4" />
                    Logout
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

function ProfileRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="shrink-0 text-[11px] font-semibold uppercase tracking-wide text-gray-500">{label}</dt>
      <dd className="text-right text-[13px] font-semibold text-text">{value}</dd>
    </div>
  );
}
