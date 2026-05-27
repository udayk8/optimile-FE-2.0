import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Building2, ChevronRight, LogIn, ShieldCheck, UserRound } from "lucide-react";
import { OptimileLogo, useAuth } from "@shared-auth";
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
    <div className="relative min-h-screen overflow-hidden bg-slate-950">
      {/* Premium dark backdrop: layered gradient + colored glow */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950" />
      <div className="pointer-events-none absolute -right-32 -top-40 size-[28rem] rounded-full bg-sky-500/20 blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-48 -left-32 size-[30rem] rounded-full bg-indigo-500/20 blur-[120px]" />
      <div className="pointer-events-none absolute left-1/2 top-1/3 size-[24rem] -translate-x-1/2 rounded-full bg-violet-500/10 blur-[120px]" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-5xl flex-col justify-center gap-9 px-4 py-12">
        {/* Brand */}
        <div className="flex flex-col items-center text-center">
          <OptimileLogo className="text-white" style={{ height: 48, width: "auto", display: "block" }} />
          <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-500">
            Logistics ERP
          </p>
          <h1 className="mt-5 text-[22px] font-semibold tracking-[-0.01em] text-white">
            Welcome back
          </h1>
          <p className="mt-1.5 text-[13px] text-slate-400">Choose how you want to sign in</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* SECTION 1 — Optimile Admin */}
          <section className="group relative flex flex-col overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] p-7 shadow-2xl backdrop-blur-xl transition duration-200 hover:-translate-y-0.5 hover:border-sky-400/40 hover:bg-white/[0.06]">
            <span className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-sky-400 to-cyan-400" />
            <div className="flex items-center gap-3.5">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-cyan-500 text-white shadow-lg shadow-sky-500/25 ring-1 ring-white/20">
                <ShieldCheck className="size-6" />
              </div>
              <div>
                <h2 className="text-[16px] font-semibold text-white">Optimile Admin</h2>
                <p className="text-[12px] text-slate-400">Platform administration</p>
              </div>
            </div>

            <p className="mt-5 text-[13px] leading-relaxed text-slate-300">
              Manage tenant onboarding, the module registry, plans and platform settings.
            </p>

            <ul className="mt-4 space-y-2 text-[12.5px] text-slate-300">
              <li className="flex items-center gap-2.5"><span className="size-1.5 shrink-0 rounded-full bg-sky-400" />Onboard and configure tenants</li>
              <li className="flex items-center gap-2.5"><span className="size-1.5 shrink-0 rounded-full bg-sky-400" />Enable / disable modules per tenant</li>
              <li className="flex items-center gap-2.5"><span className="size-1.5 shrink-0 rounded-full bg-sky-400" />Plans &amp; platform-wide settings</li>
            </ul>

            <div className="mt-auto pt-7">
              <Button
                type="button"
                className="h-11 w-full border-0 bg-gradient-to-r from-sky-500 to-cyan-500 text-[13px] font-semibold text-white shadow-lg shadow-sky-500/25 hover:from-sky-400 hover:to-cyan-400"
                disabled={busy}
                onClick={enterPlatformAdmin}
              >
                <ShieldCheck className="size-4" />
                Enter Optimile Admin
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </section>

          {/* SECTION 2 — Tenant Admin */}
          <section className="group relative flex flex-col overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] p-7 shadow-2xl backdrop-blur-xl transition duration-200 hover:-translate-y-0.5 hover:border-indigo-400/40 hover:bg-white/[0.06]">
            <span className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-indigo-500 to-violet-500" />
            <div className="flex items-center gap-3.5">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 text-white shadow-lg shadow-indigo-500/25 ring-1 ring-white/20">
                <Building2 className="size-6" />
              </div>
              <div>
                <h2 className="text-[16px] font-semibold text-white">Tenant Admin</h2>
                <p className="text-[12px] text-slate-400">Sign in to a tenant workspace</p>
              </div>
            </div>

            <form className="mt-5 flex flex-1 flex-col gap-4" onSubmit={enterTenant}>
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">Select Tenant</label>
                <select
                  value={selectedTenantId}
                  onChange={(event) => setSelectedTenantId(event.target.value)}
                  className="h-11 w-full rounded-xl border border-white/10 bg-slate-900/60 px-3 text-[13px] text-slate-100 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/30 [&_option]:bg-slate-900 [&_option]:text-slate-100"
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
                <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">Select User</label>
                <select
                  value={selectedUserId}
                  onChange={(event) => setSelectedUserId(event.target.value)}
                  disabled={!selectedTenant || loginUsers.length === 0}
                  className="h-11 w-full rounded-xl border border-white/10 bg-slate-900/60 px-3 text-[13px] text-slate-100 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/30 disabled:cursor-not-allowed disabled:bg-slate-900/30 disabled:text-slate-500 [&_option]:bg-slate-900 [&_option]:text-slate-100"
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
                <div className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5">
                  <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 text-white ring-1 ring-white/20">
                    <UserRound className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-[12.5px] font-medium text-slate-100">{selectedUser.email}</p>
                    <p className="text-[11px] text-slate-400">
                      {selectedUser.isOwner ? "Tenant Admin" : selectedUser.roleName}
                    </p>
                  </div>
                </div>
              ) : null}

              <div className="mt-auto">
                <Button
                  type="submit"
                  className="h-11 w-full border-0 bg-gradient-to-r from-indigo-500 to-violet-500 text-[13px] font-semibold text-white shadow-lg shadow-indigo-500/25 hover:from-indigo-400 hover:to-violet-400 disabled:opacity-50"
                  disabled={busy || !selectedTenant || !selectedUserId}
                >
                  <LogIn className="size-4" />
                  Continue
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </form>
          </section>
        </div>

        {error ? (
          <div className="mx-auto w-full max-w-md rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2.5 text-center text-[12px] font-medium text-rose-300">
            {error}
          </div>
        ) : null}

        <p className="mx-auto max-w-md text-center text-[11px] leading-relaxed text-slate-500">
          Demo login · tenants &amp; users come from the shared store — anything created in Optimile Admin appears here automatically.
        </p>
      </div>
    </div>
  );
}
