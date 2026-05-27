import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Building2, ChevronRight, LogIn, ShieldCheck, UserRound } from "lucide-react";
import { useAuth } from "@shared-auth";
import { MockStoreProvider, useMockStore } from "@/shared/store/mock-store";
import { SessionProvider, useSessionContext } from "@/shared/auth/session-context";
import { useTenants } from "@/modules/platform-admin/hooks/useTenants";
import { isTenantAdminRole } from "@/modules/tenant-admin/lib/tenant-modules";
import { storageKeys, writeStoredValue } from "@/shared/lib/storage/browser-storage";
import { Button } from "@/shared/components/ui/button";
import type { UserRecord } from "@/types/access";

// Demo-only gate credential. Both cards authenticate the host AuthProvider with
// the platform-admin demo user — RouteGuard bridges platform-admin -> tenant-admin,
// so this single credential unlocks both /platform-admin/* and /tenant-admin/*.
// The real actor (platform vs. tenant user) is set in the shared session context.
const PLATFORM_ADMIN_DEMO_EMAIL = "platform-admin@optimile.com";
const DEMO_PASSWORD = "testing";
const TENANT_ADMIN_SESSION_KEY = "optimile.tenantAdmin.session";
const ROLE_PERMISSION_MATRIX_KEY = "optimile.tenant.rolePermissionMatrix";

export default function UnifiedLoginPage() {
  return (
    <MockStoreProvider>
      <SessionProvider>
        <UnifiedLoginInner />
      </SessionProvider>
    </MockStoreProvider>
  );
}

function loadPermissionsForRole(roleId: string) {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(ROLE_PERMISSION_MATRIX_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed[roleId] ?? {};
  } catch {
    return {};
  }
}

function UnifiedLoginInner() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { login } = useAuth();
  const { setSession } = useSessionContext();
  const { data: tenants } = useTenants();
  const { listTenantUsers, listTenantRoles, listTenantOrgUnits, getTenantPrimaryAdminUser } = useMockStore();

  const presetTenantId = params.get("tenantId") ?? "";
  const [selectedTenantId, setSelectedTenantId] = useState(presetTenantId);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Preselect tenant from ?tenantId= when it exists in the shared store.
  useEffect(() => {
    if (presetTenantId && tenants.some((tenant) => tenant.id === presetTenantId)) {
      setSelectedTenantId(presetTenantId);
    }
  }, [presetTenantId, tenants]);

  const selectedTenant = tenants.find((tenant) => tenant.id === selectedTenantId) ?? null;
  const tenantUsers = selectedTenant ? listTenantUsers(selectedTenant.id) : [];
  const tenantRoles = selectedTenant ? listTenantRoles(selectedTenant.id) : [];
  const tenantOrgUnits = selectedTenant ? listTenantOrgUnits(selectedTenant.id) : [];

  const ownerUser = useMemo<UserRecord | null>(() => {
    if (!selectedTenant) return null;
    const explicit = getTenantPrimaryAdminUser(selectedTenant.id);
    if (explicit) return explicit;
    const systemRole = tenantRoles.find(isTenantAdminRole);
    return (
      (systemRole && tenantUsers.find((user) => user.roleId === systemRole.id)) ||
      tenantUsers.find((user) => user.userType === "INTERNAL" && user.status === "active") ||
      tenantUsers[0] ||
      null
    );
  }, [getTenantPrimaryAdminUser, selectedTenant, tenantRoles, tenantUsers]);

  // Tenant Admin (owner) first, then the rest — each labelled with its role.
  const loginUsers = useMemo(() => {
    if (!selectedTenant) return [] as Array<{ id: string; name: string; email: string; roleName: string; isOwner: boolean }>;
    const roleNameById = new Map(tenantRoles.map((role) => [role.id, role.name]));
    return [...tenantUsers]
      .sort((a, b) => {
        if (ownerUser && a.id === ownerUser.id) return -1;
        if (ownerUser && b.id === ownerUser.id) return 1;
        return a.name.localeCompare(b.name);
      })
      .map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        roleName: roleNameById.get(user.roleId) ?? "—",
        isOwner: Boolean(ownerUser && user.id === ownerUser.id),
      }));
  }, [ownerUser, selectedTenant, tenantRoles, tenantUsers]);

  // Default the user picker to the tenant owner whenever the tenant changes.
  useEffect(() => {
    setSelectedUserId(ownerUser?.id ?? "");
    setError("");
  }, [selectedTenant?.id, ownerUser?.id]);

  async function enterPlatformAdmin() {
    setBusy(true);
    setError("");
    try {
      await login(PLATFORM_ADMIN_DEMO_EMAIL, DEMO_PASSWORD);
      const session = {
        actorType: "platform_admin" as const,
        actorName: "Optimile Platform Admin",
        tenantId: undefined,
        previewTenantRoleId: null,
        activeTenantOrgUnitId: null,
      };
      // Persist synchronously: the target app mounts a fresh SessionProvider
      // that hydrates from localStorage, so we cannot rely on this page's
      // provider effect (it unmounts on navigate).
      writeStoredValue(storageKeys.sessionContext, session);
      setSession(session);
      // Push (not replace) so the browser Back button returns to /login.
      navigate("/platform-admin/dashboard");
    } catch {
      setError("Unable to sign in to Optimile Admin.");
      setBusy(false);
    }
  }

  async function enterTenant(event: React.FormEvent) {
    event.preventDefault();
    if (!selectedTenant) {
      setError("Select a tenant to continue.");
      return;
    }
    const user = tenantUsers.find((candidate) => candidate.id === selectedUserId) ?? ownerUser;
    if (!user) {
      setError("This tenant has no users to sign in as.");
      return;
    }

    setBusy(true);
    setError("");
    try {
      // Authenticate the host gate (platform-admin demo bridges to tenant-admin).
      await login(PLATFORM_ADMIN_DEMO_EMAIL, DEMO_PASSWORD);

      const role = tenantRoles.find((roleRecord) => roleRecord.id === user.roleId);
      const isTenantOwner = role ? isTenantAdminRole(role) : false;
      const assignedModules = role?.moduleCodes ?? [];
      const permissions = role ? loadPermissionsForRole(role.id) : {};
      const assignedOrgUnits = user.orgUnitIds
        .map((unitId) => {
          const unit = tenantOrgUnits.find((item) => item.id === unitId);
          return unit ? { id: unit.id, name: unit.name } : null;
        })
        .filter(Boolean);

      const session = {
        actorType: "tenant_admin" as const,
        tenantId: selectedTenant.id,
        actorName: user.email,
        previewTenantRoleId: null,
        activeTenantOrgUnitId: user.orgUnitIds[0] ?? null,
      };
      // Persist synchronously so the tenant app's fresh SessionProvider hydrates it.
      writeStoredValue(storageKeys.sessionContext, session);
      setSession(session);

      writeStoredValue(TENANT_ADMIN_SESSION_KEY, {
        tenantId: selectedTenant.id,
        tenantCode: selectedTenant.code,
        tenantName: selectedTenant.name,
        userId: user.id,
        userName: user.name,
        userEmail: user.email,
        roleId: user.roleId,
        roleName: role?.name ?? "",
        isTenantOwner,
        assignedOrgUnits,
        assignedModules,
        permissions,
      });

      // Push (not replace) so the browser Back button returns to /login.
      navigate(`/tenant-admin/tenant/${selectedTenant.id}/dashboard`);
    } catch {
      setError("Unable to sign in to the tenant workspace.");
      setBusy(false);
    }
  }

  const selectedUser = loginUsers.find((user) => user.id === selectedUserId) ?? null;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col justify-center gap-6 px-4 py-10">
        <div className="text-center">
          <h1 className="text-[22px] font-semibold tracking-[-0.01em] text-slate-900">Optimile</h1>
          <p className="mt-1 text-[13px] text-slate-500">Choose how you want to sign in</p>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          {/* SECTION 1 — Optimile Admin */}
          <section className="flex flex-col rounded-2xl border bg-card p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-sky-100 text-sky-700">
                <ShieldCheck className="size-5" />
              </div>
              <div>
                <h2 className="text-[15px] font-semibold text-slate-900">Optimile Admin</h2>
                <p className="text-[12px] text-slate-500">Platform administration</p>
              </div>
            </div>

            <p className="mt-4 text-[13px] leading-relaxed text-slate-600">
              Manage tenant onboarding, the module registry, plans and platform settings.
            </p>

            <ul className="mt-3 space-y-1.5 text-[12px] text-slate-500">
              <li>· Onboard and configure tenants</li>
              <li>· Enable / disable modules per tenant</li>
              <li>· Plans &amp; platform-wide settings</li>
            </ul>

            <div className="mt-auto pt-6">
              <Button type="button" className="w-full" disabled={busy} onClick={enterPlatformAdmin}>
                <ShieldCheck className="size-4" />
                Enter Optimile Admin
              </Button>
            </div>
          </section>

          {/* SECTION 2 — Tenant Admin */}
          <section className="flex flex-col rounded-2xl border bg-card p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700">
                <Building2 className="size-5" />
              </div>
              <div>
                <h2 className="text-[15px] font-semibold text-slate-900">Tenant Admin</h2>
                <p className="text-[12px] text-slate-500">Tenant workspace</p>
              </div>
            </div>

            <form className="mt-4 flex flex-1 flex-col gap-4" onSubmit={enterTenant}>
              <div className="space-y-1.5">
                <label className="text-[12px] font-medium text-slate-700">Select Tenant</label>
                <select
                  value={selectedTenantId}
                  onChange={(event) => setSelectedTenantId(event.target.value)}
                  className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-[13px] text-slate-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">— Choose a tenant —</option>
                  {tenants.map((tenant) => (
                    <option key={tenant.id} value={tenant.id}>
                      {tenant.name} ({tenant.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[12px] font-medium text-slate-700">Select User</label>
                <select
                  value={selectedUserId}
                  onChange={(event) => setSelectedUserId(event.target.value)}
                  disabled={!selectedTenant || loginUsers.length === 0}
                  className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-[13px] text-slate-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
                >
                  {!selectedTenant ? (
                    <option value="">Select a tenant first</option>
                  ) : loginUsers.length === 0 ? (
                    <option value="">No users for this tenant</option>
                  ) : (
                    loginUsers.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name} — {user.isOwner ? "Tenant Admin" : user.roleName}
                      </option>
                    ))
                  )}
                </select>
              </div>

              {selectedUser ? (
                <div className="flex items-center gap-2.5 rounded-lg border bg-slate-50/70 px-3 py-2">
                  <div className="flex size-7 items-center justify-center rounded-md bg-indigo-100 text-indigo-700">
                    <UserRound className="size-3.5" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-[12px] font-medium text-slate-900">{selectedUser.email}</p>
                    <p className="text-[11px] text-slate-500">
                      {selectedUser.isOwner ? "Tenant Admin" : selectedUser.roleName}
                    </p>
                  </div>
                </div>
              ) : null}

              <div className="mt-auto">
                <Button type="submit" className="w-full" disabled={busy || !selectedTenant || !selectedUserId}>
                  <LogIn className="size-4" />
                  Continue
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </form>
          </section>
        </div>

        {error ? (
          <div className="mx-auto w-full max-w-md rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-center text-[12px] text-rose-700">
            {error}
          </div>
        ) : null}

        <p className="mx-auto w-full max-w-md rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-center text-[11px] text-amber-800">
          Demo login. Tenants and users come from the shared store — anything created in Optimile Admin appears here automatically.
        </p>
      </div>
    </div>
  );
}
