import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, ChevronRight, LogIn, ShieldCheck, UserRound } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { useSessionContext } from "@/shared/auth/session-context";
import { useTenants } from "@/modules/platform-admin/hooks/useTenants";
import { useMockStore } from "@/shared/store/mock-store";
import { usePlatformPaths } from "@platform-admin/hooks/usePlatformPaths";
import { writeStoredValue } from "@/shared/lib/storage/browser-storage";
import { isTenantAdminRole } from "@/modules/tenant-admin/lib/tenant-modules";
import type { UserRecord } from "@/types/access";

const TENANT_ADMIN_SESSION_KEY = "optimile.tenantAdmin.session";
const ROLE_PERMISSION_MATRIX_KEY = "optimile.tenant.rolePermissionMatrix";

export function TenantAdminLoginPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const paths = usePlatformPaths();
  const { setSession } = useSessionContext();
  const { getTenantById, getTenantPrimaryAdminUser } = useTenants();
  const { listTenantUsers, listTenantRoles, listTenantOrgUnits } = useMockStore();

  const tenantId = params.get("tenantId") ?? "";
  const tenant = tenantId ? getTenantById(tenantId) : null;
  const tenantUsers = tenant ? listTenantUsers(tenant.id) : [];
  const tenantRoles = tenant ? listTenantRoles(tenant.id) : [];
  const tenantOrgUnits = tenant ? listTenantOrgUnits(tenant.id) : [];

  const ownerUser = useMemo<UserRecord | null>(() => {
    if (!tenant) return null;
    const explicit = getTenantPrimaryAdminUser(tenant.id);
    if (explicit) return explicit;
    const systemRole = tenantRoles.find(isTenantAdminRole);
    return (
      (systemRole && tenantUsers.find((user) => user.roleId === systemRole.id)) ||
      tenantUsers.find((user) => user.userType === "INTERNAL" && user.status === "active") ||
      tenantUsers[0] ||
      null
    );
  }, [getTenantPrimaryAdminUser, tenant, tenantRoles, tenantUsers]);

  const operationalRoles = useMemo(
    () => tenantRoles.filter((role) => !isTenantAdminRole(role)),
    [tenantRoles],
  );

  const usersByRole = useMemo(() => {
    const grouped = new Map<string, UserRecord[]>();
    operationalRoles.forEach((role) => grouped.set(role.id, []));
    tenantUsers.forEach((user) => {
      if (ownerUser && user.id === ownerUser.id) return;
      const bucket = grouped.get(user.roleId);
      if (bucket) bucket.push(user);
    });
    return grouped;
  }, [operationalRoles, ownerUser, tenantUsers]);

  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const selectedUser = useMemo(
    () => tenantUsers.find((user) => user.id === selectedUserId) ?? ownerUser ?? null,
    [ownerUser, selectedUserId, tenantUsers],
  );

  useEffect(() => {
    if (!selectedUser) return;
    setEmail(selectedUser.email);
    // Demo only: prefilled password must be removed when backend auth is integrated.
    setPassword(selectedUser.password ?? "Admin@123");
    setError("");
  }, [selectedUser]);

  if (!tenant) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-md rounded-2xl border bg-card p-6 text-center shadow-sm">
          <p className="text-[14px] font-medium text-slate-900">Tenant not found</p>
          <p className="mt-1 text-[13px] text-slate-500">The tenant link is invalid or expired.</p>
          <div className="mt-4">
            <Button asChild size="sm" variant="outline">
              <Link to={paths.tenants}>
                <ArrowLeft className="size-4" />
                Back to Platform Admin
              </Link>
            </Button>
          </div>
        </div>
      </div>
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

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!tenant) {
      setError("Tenant admin is not provisioned.");
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    const matchedUser = tenantUsers.find((user) => user.email.toLowerCase() === normalizedEmail) ?? selectedUser;
    if (!matchedUser) {
      setError("No user matches this email for the tenant.");
      return;
    }

    // Demo only: plaintext credential check against mock/localStorage.
    const expectedPassword = matchedUser.password ?? "Admin@123";
    if (password !== expectedPassword) {
      setError("Incorrect password.");
      return;
    }

    const role = tenantRoles.find((roleRecord) => roleRecord.id === matchedUser.roleId);
    const isTenantOwner = role ? isTenantAdminRole(role) : false;
    const assignedModules = role?.moduleCodes ?? [];
    const permissions = role ? loadPermissionsForRole(role.id) : {};
    const assignedOrgUnits = matchedUser.orgUnitIds
      .map((unitId) => {
        const unit = tenantOrgUnits.find((item) => item.id === unitId);
        return unit ? { id: unit.id, name: unit.name } : null;
      })
      .filter(Boolean);

    // Set the active session to the picked user. The layout/permission gate
    // resolves the role via `currentTenantUser` (matched on email), so no
    // preview state is needed — this IS the user's real role.
    setSession({
      actorType: "tenant_admin",
      tenantId: tenant.id,
      actorName: matchedUser.email,
      previewTenantRoleId: null,
      activeTenantOrgUnitId: matchedUser.orgUnitIds[0] ?? null,
    });

    writeStoredValue(TENANT_ADMIN_SESSION_KEY, {
      tenantId: tenant.id,
      tenantCode: tenant.code,
      tenantName: tenant.name,
      userId: matchedUser.id,
      userName: matchedUser.name,
      userEmail: matchedUser.email,
      roleId: matchedUser.roleId,
      roleName: role?.name ?? "",
      isTenantOwner,
      assignedOrgUnits,
      assignedModules,
      permissions,
    });

    setError("");
    navigate(paths.tenantWorkspace(tenant.id));
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col gap-5 px-4 py-6">
        <div className="flex items-center justify-between">
          <Link
            to={paths.tenants}
            className="inline-flex items-center gap-1.5 text-[12px] text-slate-500 hover:text-slate-800"
          >
            <ArrowLeft className="size-3.5" />
            Back to Platform Admin
          </Link>
          <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400">
            Tenant Admin Login
          </span>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-md bg-slate-100 text-slate-700">
              <ShieldCheck className="size-4" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-[15px] font-semibold tracking-[-0.01em] text-slate-900">{tenant.name}</h1>
              <p className="text-[12px] text-slate-500">{tenant.code} · Tenant Admin Login</p>
            </div>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
          {/* User picker */}
          <div className="space-y-4">
            <section className="rounded-xl border bg-card">
              <div className="border-b px-4 py-2.5">
                <h2 className="text-[13px] font-semibold text-slate-900">Tenant Owner</h2>
                <p className="text-[11px] text-slate-500">Default system-managed admin account.</p>
              </div>
              <div className="p-3">
                {ownerUser ? (
                  <UserPickRow
                    user={ownerUser}
                    selected={selectedUserId === ownerUser.id || (!selectedUserId && true)}
                    badge="Tenant Admin"
                    onSelect={() => setSelectedUserId(ownerUser.id)}
                  />
                ) : (
                  <p className="text-[12px] text-slate-500">No tenant owner provisioned.</p>
                )}
              </div>
            </section>

            <section className="rounded-xl border bg-card">
              <div className="border-b px-4 py-2.5">
                <h2 className="text-[13px] font-semibold text-slate-900">Tenant Roles & Users</h2>
                <p className="text-[11px] text-slate-500">Pick a user to autofill credentials.</p>
              </div>
              <div className="space-y-3 p-3">
                {operationalRoles.length === 0 ? (
                  <p className="rounded-lg border border-dashed bg-slate-50 px-3 py-2 text-[12px] text-slate-500">
                    No tenant roles created yet. Add roles inside Tenant Admin → Roles.
                  </p>
                ) : (
                  operationalRoles.map((role) => {
                    const users = usersByRole.get(role.id) ?? [];
                    return (
                      <div key={role.id} className="rounded-lg border bg-slate-50/40">
                        <div className="flex items-center justify-between border-b px-3 py-2 text-[12px]">
                          <span className="font-semibold text-slate-900">{role.name}</span>
                          <span className="text-slate-500">{users.length} user{users.length === 1 ? "" : "s"}</span>
                        </div>
                        <div className="space-y-1 p-2">
                          {users.length === 0 ? (
                            <p className="px-2 py-1 text-[11px] text-slate-500">No users assigned to this role.</p>
                          ) : (
                            users.map((user) => (
                              <UserPickRow
                                key={user.id}
                                user={user}
                                selected={selectedUserId === user.id}
                                onSelect={() => setSelectedUserId(user.id)}
                              />
                            ))
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </section>
          </div>

          {/* Credentials */}
          <div className="space-y-4">
            <section className="rounded-2xl border bg-card p-5 shadow-sm">
              <h2 className="text-[14px] font-semibold text-slate-900">Sign in</h2>
              <p className="mt-0.5 text-[12px] text-slate-500">
                {selectedUser ? `Signing in as ${selectedUser.name}.` : "Pick a user from the list."}
              </p>

              <form className="mt-4 space-y-3" onSubmit={submit}>
                <div className="space-y-1.5">
                  <label className="text-[12px] font-medium text-slate-700">Tenant Code</label>
                  <Input value={tenant.code} disabled />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[12px] font-medium text-slate-700">Email</label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    autoComplete="username"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[12px] font-medium text-slate-700">Password</label>
                  <Input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    autoComplete="current-password"
                  />
                </div>

                {error ? (
                  <div className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-[12px] text-rose-700">
                    {error}
                  </div>
                ) : null}

                <Button type="submit" size="sm" className="w-full">
                  <LogIn className="size-4" />
                  Login
                </Button>
              </form>
            </section>

            {/* Demo only: prefilled password must be removed when backend auth is integrated. */}
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
              Demo: credentials are auto-filled from mock/localStorage. Replace this page with real auth before production.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function UserPickRow({
  user,
  selected,
  badge,
  onSelect,
}: {
  user: UserRecord;
  selected: boolean;
  badge?: string;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex w-full items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left transition ${
        selected ? "border-primary bg-primary/5" : "border-border bg-white hover:bg-slate-50"
      }`}
    >
      <div className="flex min-w-0 items-center gap-2">
        <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-indigo-100 text-indigo-700">
          <UserRound className="size-3.5" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-[13px] font-medium text-slate-900">{user.name}</p>
          <p className="truncate text-[11px] text-slate-500">{user.email}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {badge ? (
          <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.04em] text-indigo-700">
            {badge}
          </span>
        ) : null}
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.04em] ${
            user.status === "active"
              ? "bg-emerald-100 text-emerald-700"
              : user.status === "invited"
                ? "bg-sky-100 text-sky-700"
                : "bg-slate-200 text-slate-600"
          }`}
        >
          {user.status}
        </span>
        <ChevronRight className="size-4 text-slate-400" />
      </div>
    </button>
  );
}
