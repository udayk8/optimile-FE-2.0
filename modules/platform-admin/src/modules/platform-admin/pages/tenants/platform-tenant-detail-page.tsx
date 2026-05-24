import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ClipboardCopy, ExternalLink, Layers, Pencil, Phone, Power } from "lucide-react";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Dialog } from "@/shared/components/ui/dialog";
import { Input } from "@/shared/components/ui/input";
import { Select } from "@/shared/components/ui/select";
import { usePlatformModules } from "@/modules/platform-admin/hooks/usePlatformModules";
import { useTenants } from "@/modules/platform-admin/hooks/useTenants";
import { useMockStore } from "@/shared/store/mock-store";
import { usePlatformPaths } from "@platform-admin/hooks/usePlatformPaths";
import { displayModule } from "@/modules/platform-admin/lib/module-display";
import { UserPlus } from "lucide-react";

type BusinessType = "DIRECT_ENTERPRISE" | "THREE_PL" | "HYBRID";
type UiStatus = "active" | "trial" | "paused";

const businessTypeOptions: { value: BusinessType; label: string }[] = [
  { value: "DIRECT_ENTERPRISE", label: "Direct Enterprise" },
  { value: "THREE_PL", label: "3PL" },
  { value: "HYBRID", label: "Hybrid" },
];

export function PlatformTenantDetailPage() {
  const { tenantId = "" } = useParams();
  const navigate = useNavigate();
  const paths = usePlatformPaths();
  const { data: modules } = usePlatformModules();
  const { getTenantById, getTenantPrimaryAdminUser, updateTenant } = useTenants();
  const {
    listTenantUsers,
    listTenantRoles,
    createTenantRole,
    listTenantLevels,
    createTenantUser,
    updatePlatformTenant,
  } = useMockStore();
  const tenant = getTenantById(tenantId);
  const tenantUsers = tenant ? listTenantUsers(tenant.id) : [];
  // Fall back to any INTERNAL active user if the recorded primaryAdminUserId
  // has been removed (e.g. by an earlier cleanup pass).
  const primaryAdmin =
    (tenant ? getTenantPrimaryAdminUser(tenant.id) : null) ??
    tenantUsers.find((user) => user.userType === "INTERNAL" && user.status === "active") ??
    null;

  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    code: "",
    region: "",
    industry: "",
    status: "trial" as UiStatus,
    businessType: "DIRECT_ENTERPRISE" as BusinessType,
  });
  const [editError, setEditError] = useState("");

  const [modulesOpen, setModulesOpen] = useState(false);
  const [moduleCodes, setModuleCodes] = useState<string[]>([]);
  const [copiedAt, setCopiedAt] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [adminOpen, setAdminOpen] = useState(false);
  const [adminForm, setAdminForm] = useState({ name: "", email: "", phone: "", password: "" });
  const [adminError, setAdminError] = useState("");

  useEffect(() => {
    if (!tenant) return;
    setEditForm({
      name: tenant.name,
      code: tenant.code,
      region: tenant.region,
      industry: tenant.industry,
      status: tenant.status,
      businessType: deriveBusinessType(tenant),
    });
    setModuleCodes(tenant.enabledModuleCodes);
  }, [tenant]);

  useEffect(() => {
    if (!feedback) return;
    const timer = window.setTimeout(() => setFeedback(""), 2500);
    return () => window.clearTimeout(timer);
  }, [feedback]);

  const enabledModules = useMemo(() => {
    if (!tenant) return [];
    return modules.filter((module) => tenant.enabledModuleCodes.includes(module.code));
  }, [modules, tenant]);

  if (!tenant) {
    return (
      <div className="rounded-xl border bg-card p-8 text-center">
        <p className="text-[14px] font-medium text-slate-900">Tenant not found</p>
        <p className="mt-1 text-[13px] text-slate-500">This tenant record is not available.</p>
        <div className="mt-4 flex justify-center">
          <Button asChild size="sm" variant="outline">
            <Link to={paths.tenants}>
              <ArrowLeft className="size-4" />
              Back to Tenants
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  function openTenantAdmin() {
    navigate(`/platform-admin/tenant-login?tenantId=${tenant!.id}`);
  }

  async function copyLoginCredentials() {
    if (!tenant || !primaryAdmin) return;
    // Demo only: prefilled password must be removed when backend auth is integrated.
    const password = primaryAdmin.password ?? "Admin@123";
    const text = `Tenant Code: ${tenant.code}\nEmail: ${primaryAdmin.email}\nPassword: ${password}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedAt(Date.now());
    } catch {
      window.prompt("Copy these credentials:", text);
    }
  }

  function saveEdit() {
    if (editForm.name.trim().length < 2) {
      setEditError("Tenant name is required");
      return;
    }
    if (editForm.code.trim().length < 2) {
      setEditError("Tenant code is required");
      return;
    }

    const tenantType: "DIRECT_CUSTOMER" | "LOGISTICS_PROVIDER_3PL" =
      editForm.businessType === "DIRECT_ENTERPRISE" ? "DIRECT_CUSTOMER" : "LOGISTICS_PROVIDER_3PL";

    try {
      updateTenant(tenant!.id, {
        name: editForm.name.trim(),
        code: editForm.code.trim().toUpperCase(),
        region: editForm.region.trim(),
        industry: editForm.industry.trim(),
        status: editForm.status,
        tenantType,
        customerPortalEnabled: editForm.businessType === "HYBRID",
      });
      setEditError("");
      setEditOpen(false);
      setFeedback("Tenant updated.");
    } catch (saveError) {
      setEditError(saveError instanceof Error ? saveError.message : "Could not save tenant");
    }
  }

  function saveModules() {
    if (!tenant) return;
    if (moduleCodes.length === 0) {
      setFeedback("Select at least one module before saving.");
      return;
    }
    updateTenant(tenant.id, { enabledModuleCodes: moduleCodes });
    setModulesOpen(false);
    setFeedback(`Modules updated for ${tenant.name}. Enabled: ${moduleCodes.length}.`);
  }

  function openAdminDialog() {
    setAdminError("");
    setAdminForm({ name: "", email: "", phone: "", password: "" });
    // Pre-provision a Tenant Admin role if none exists so the Save click later
    // doesn't race React state batching when assigning the user's roleId.
    if (tenant) {
      const tenantRoles = listTenantRoles(tenant.id);
      const hasUsableRole = tenantRoles.some((role) => role.active);
      if (!hasUsableRole) {
        const tenantLevels = [...listTenantLevels(tenant.id)].sort((a, b) => a.order - b.order);
        const rootLevelId = tenantLevels[0]?.id;
        if (rootLevelId) {
          try {
            createTenantRole({
              tenantId: tenant.id,
              name: "Tenant Admin",
              description: "Auto-created default tenant administrator role.",
              hierarchyLevelId: rootLevelId,
              moduleCodes: ["ADMIN", ...tenant.enabledModuleCodes],
              dataScope: "ALL_TENANT",
              active: true,
            });
          } catch {
            /* fall through; Save handler will surface the underlying error */
          }
        }
      }
    }
    setAdminOpen(true);
  }

  function savePrimaryAdmin() {
    if (!tenant) return;
    if (adminForm.name.trim().length < 2) { setAdminError("Name is required."); return; }
    if (!adminForm.email.trim().match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) { setAdminError("Valid email is required."); return; }
    if (adminForm.password.length > 0 && adminForm.password.length < 6) {
      setAdminError("Password must be at least 6 characters.");
      return;
    }

    // Role was pre-provisioned in openAdminDialog so state has flushed by now.
    const tenantRoles = listTenantRoles(tenant.id);
    const adminRole =
      tenantRoles.find((role) => role.active && role.name.toLowerCase().includes("tenant admin")) ??
      tenantRoles.find((role) => role.active && role.name.toLowerCase().includes("admin")) ??
      tenantRoles.find((role) => role.active);

    if (!adminRole) {
      setAdminError("Could not auto-provision a tenant admin role. Try closing the dialog and reopening it.");
      return;
    }

    try {
      const created = createTenantUser({
        tenantId: tenant.id,
        name: adminForm.name.trim(),
        email: adminForm.email.trim().toLowerCase(),
        userType: "INTERNAL",
        roleId: adminRole.id,
        orgUnitIds: [],
        linkedVendorId: null,
        linkedCustomerId: null,
        linkedDriverId: null,
        driverName: "",
        driverCode: "",
        status: "active",
        phone: adminForm.phone.trim() || undefined,
        // Demo only: plaintext password persisted in mock/localStorage.
        password: adminForm.password || undefined,
      });
      updatePlatformTenant(tenant.id, {});
      // Repoint the tenant's primaryAdminUserId via a direct write since
      // updatePlatformTenant doesn't expose that field.
      if (typeof window !== "undefined") {
        try {
          const raw = window.localStorage.getItem("optimile.platform.tenants");
          if (raw) {
            const tenants = JSON.parse(raw);
            const next = tenants.map((item: { id: string }) =>
              item.id === tenant.id ? { ...item, primaryAdminUserId: created.id } : item,
            );
            window.localStorage.setItem("optimile.platform.tenants", JSON.stringify(next));
          }
        } catch {
          /* best-effort */
        }
      }
      setAdminOpen(false);
      setFeedback(`Primary admin set: ${created.name}. Reload to see updated linkage.`);
    } catch (saveError) {
      setAdminError(saveError instanceof Error ? saveError.message : "Could not save admin.");
    }
  }

  function toggleModule(code: string) {
    if (!tenant) return;
    const has = tenant.enabledModuleCodes.includes(code);
    const next = has
      ? tenant.enabledModuleCodes.filter((existing) => existing !== code)
      : [...tenant.enabledModuleCodes, code];
    if (next.length === 0) {
      setFeedback("At least one module must remain enabled.");
      return;
    }
    updateTenant(tenant.id, { enabledModuleCodes: next });
    setFeedback(has ? `${code} disabled.` : `${code} enabled.`);
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-[20px] font-semibold tracking-[-0.01em] text-slate-900">{tenant.name}</h1>
            <StatusBadge status={tenant.status} />
          </div>
          <p className="mt-0.5 text-[13px] text-slate-500">{tenant.code}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => setEditOpen(true)}>
            <Pencil className="size-4" />
            Edit Tenant
          </Button>
          <Button size="sm" onClick={openTenantAdmin}>
            <ExternalLink className="size-4" />
            Open Tenant Admin
          </Button>
          <Button asChild size="sm" variant="ghost">
            <Link to={paths.tenants}>
              <ArrowLeft className="size-4" />
              Back
            </Link>
          </Button>
        </div>
      </div>

      {feedback ? (
        <div className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-[12px] text-emerald-800">
          {feedback}
        </div>
      ) : null}

      {/* Summary cards */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <SummaryStat label="Business Type" value={businessTypeLabel(tenant)} />
        <SummaryStat label="Region" value={tenant.region || "—"} />
        <SummaryStat label="Industry" value={tenant.industry || "—"} />
        <SummaryStat label="Enabled Modules" value={String(tenant.enabledModuleCodes.length)} />
        <SummaryStat label="Primary Admin" value={primaryAdmin?.name ?? "—"} />
      </div>

      {/* Two-column main layout */}
      <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <Section title="Tenant Details">
          <DetailRow label="Tenant Name" value={tenant.name} />
          <DetailRow label="Tenant Code" value={tenant.code} />
          <DetailRow label="Business Type" value={businessTypeLabel(tenant)} />
          <DetailRow label="Region" value={tenant.region || "—"} />
          <DetailRow label="Industry" value={tenant.industry || "—"} />
          <DetailRow label="Status" value={<StatusBadge status={tenant.status} />} />
          <DetailRow label="Created" value={formatDate(tenant.createdAt)} />
        </Section>

        <Section
          title="Primary Admin"
          action={
            primaryAdmin ? (
              <Button size="sm" variant="ghost" onClick={copyLoginCredentials} title="Copy login credentials">
                <ClipboardCopy className="size-4" />
                {copiedAt ? "Copied" : "Copy Credentials"}
              </Button>
            ) : (
              <Button size="sm" variant="outline" onClick={openAdminDialog} title="Set primary admin">
                <UserPlus className="size-4" />
                Set Primary Admin
              </Button>
            )
          }
        >
          {primaryAdmin ? (
            <>
              <DetailRow label="Name" value={primaryAdmin.name} />
              <DetailRow label="Email" value={primaryAdmin.email} />
              {primaryAdmin.phone ? (
                <DetailRow
                  label="Phone"
                  value={
                    <span className="inline-flex items-center gap-1.5">
                      <Phone className="size-3.5 text-slate-500" />
                      {primaryAdmin.phone}
                    </span>
                  }
                />
              ) : null}
            </>
          ) : (
            <div className="px-3 py-3 text-[13px] text-slate-600">
              <p>No primary admin on record.</p>
              <p className="mt-1 text-[12px] text-slate-500">Use Set Primary Admin to provision login credentials.</p>
            </div>
          )}
        </Section>
      </div>

      <Section
        title="Enabled Modules"
        action={
          <Button size="sm" variant="outline" onClick={() => setModulesOpen(true)}>
            <Layers className="size-4" />
            Manage Modules
          </Button>
        }
      >
        {enabledModules.length === 0 ? (
          <p className="px-3 py-2 text-[13px] text-slate-500">No modules enabled. Click Manage Modules to add some.</p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {enabledModules.map((module) => {
              const display = displayModule(module);
              return (
                <div
                  key={module.id}
                  className="flex items-center justify-between rounded-lg border bg-slate-50/40 px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium text-slate-900">{display.name}</p>
                    <div className="mt-0.5 flex items-center gap-2">
                      <span className="text-[11px] text-slate-500">{display.code}</span>
                      <Badge variant={module.status === "active" ? "success" : "warning"}>{module.status}</Badge>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    title="Disable"
                    className="h-7 w-7 p-0"
                    onClick={() => toggleModule(module.code)}
                  >
                    <Power className="size-4" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </Section>

      <Section title="Quick Actions">
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => setEditOpen(true)}>
            <Pencil className="size-4" />
            Edit Tenant
          </Button>
          <Button size="sm" variant="outline" onClick={() => setModulesOpen(true)}>
            <Layers className="size-4" />
            Manage Modules
          </Button>
          <Button size="sm" onClick={openTenantAdmin}>
            <ExternalLink className="size-4" />
            Open Tenant Admin
          </Button>
        </div>
      </Section>

      {/* Edit Tenant Dialog */}
      <Dialog
        open={editOpen}
        onOpenChange={(open) => {
          setEditOpen(open);
          if (!open) setEditError("");
        }}
        title="Edit Tenant"
        widthClassName="max-w-2xl"
        footer={
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={saveEdit}>Save Changes</Button>
          </div>
        }
      >
        <div className="grid gap-3 md:grid-cols-2">
          {editError ? (
            <div className="md:col-span-2 rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-[12px] text-rose-700">
              {editError}
            </div>
          ) : null}
          <EditField label="Tenant Name">
            <Input value={editForm.name} onChange={(event) => setEditForm((current) => ({ ...current, name: event.target.value }))} />
          </EditField>
          <EditField label="Tenant Code">
            <Input
              value={editForm.code}
              onChange={(event) => setEditForm((current) => ({ ...current, code: event.target.value.toUpperCase() }))}
            />
          </EditField>
          <EditField label="Business Type">
            <Select
              value={editForm.businessType}
              onChange={(event) =>
                setEditForm((current) => ({ ...current, businessType: event.target.value as BusinessType }))
              }
            >
              {businessTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </EditField>
          <EditField label="Status">
            <Select
              value={editForm.status}
              onChange={(event) => setEditForm((current) => ({ ...current, status: event.target.value as UiStatus }))}
            >
              <option value="active">Active</option>
              <option value="trial">Onboarding</option>
              <option value="paused">Inactive</option>
            </Select>
          </EditField>
          <EditField label="Region">
            <Input value={editForm.region} onChange={(event) => setEditForm((current) => ({ ...current, region: event.target.value }))} />
          </EditField>
          <EditField label="Industry">
            <Input value={editForm.industry} onChange={(event) => setEditForm((current) => ({ ...current, industry: event.target.value }))} />
          </EditField>
        </div>
      </Dialog>

      {/* Manage Modules Dialog */}
      <Dialog
        open={modulesOpen}
        onOpenChange={(open) => {
          if (!open) setModuleCodes(tenant.enabledModuleCodes);
          setModulesOpen(open);
        }}
        title="Manage Modules"
        description="Toggle modules enabled for this tenant."
        widthClassName="max-w-md"
        footer={
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="outline" onClick={() => setModulesOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={saveModules} disabled={moduleCodes.length === 0}>Save</Button>
          </div>
        }
      >
        <div className="space-y-1.5">
          {modules.filter((module) => module.status === "active").map((module) => {
            const display = displayModule(module);
            const checked = moduleCodes.includes(module.code);
            return (
              <label
                key={module.id}
                className="flex cursor-pointer items-center justify-between rounded-lg border px-3 py-2 hover:bg-slate-50"
              >
                <div>
                  <p className="text-[13px] font-medium text-slate-900">{display.name}</p>
                  <p className="text-[11px] text-slate-500">{display.code}</p>
                </div>
                <input
                  type="checkbox"
                  className="size-4 accent-primary"
                  checked={checked}
                  onChange={() =>
                    setModuleCodes((current) =>
                      checked ? current.filter((code) => code !== module.code) : [...current, module.code],
                    )
                  }
                />
              </label>
            );
          })}
          {moduleCodes.length === 0 ? (
            <p className="text-[11px] text-amber-700">Select at least one module.</p>
          ) : null}
        </div>
      </Dialog>

      {/* Set Primary Admin Dialog */}
      <Dialog
        open={adminOpen}
        onOpenChange={(value) => { setAdminOpen(value); if (!value) setAdminError(""); }}
        title="Set Primary Admin"
        description="Provision login credentials for this tenant."
        widthClassName="max-w-md"
        footer={
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="outline" onClick={() => setAdminOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={savePrimaryAdmin}>Save</Button>
          </div>
        }
      >
        <div className="grid gap-3">
          {adminError ? (
            <div className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-[12px] text-rose-700">
              {adminError}
            </div>
          ) : null}
          <div className="space-y-1.5">
            <label className="text-[12px] font-medium text-slate-700">Admin Name</label>
            <Input value={adminForm.name} onChange={(event) => setAdminForm((current) => ({ ...current, name: event.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <label className="text-[12px] font-medium text-slate-700">Admin Email</label>
            <Input value={adminForm.email} onChange={(event) => setAdminForm((current) => ({ ...current, email: event.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <label className="text-[12px] font-medium text-slate-700">Phone (optional)</label>
            <Input value={adminForm.phone} onChange={(event) => setAdminForm((current) => ({ ...current, phone: event.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <label className="text-[12px] font-medium text-slate-700">Temporary Password</label>
            <Input
              type="password"
              value={adminForm.password}
              onChange={(event) => setAdminForm((current) => ({ ...current, password: event.target.value }))}
              placeholder="Min 6 characters"
            />
          </div>
        </div>
      </Dialog>
    </div>
  );
}

function Section({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-xl border bg-card">
      <div className="flex items-center justify-between border-b px-4 py-2.5">
        <h2 className="text-[13px] font-semibold text-slate-900">{title}</h2>
        {action}
      </div>
      <div className="p-3">{children}</div>
    </section>
  );
}

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b px-3 py-2 text-[13px] last:border-0">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium text-slate-900">{value}</span>
    </div>
  );
}

function EditField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[12px] font-medium text-slate-700">{label}</label>
      {children}
    </div>
  );
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-card px-4 py-3">
      <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-slate-500">{label}</p>
      <p className="mt-1 truncate text-[15px] font-semibold text-slate-900" title={value}>{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: "active" | "trial" | "paused" }) {
  if (status === "active") return <Badge variant="success">Active</Badge>;
  if (status === "trial") return <Badge variant="info">Onboarding</Badge>;
  return <Badge variant="warning">Inactive</Badge>;
}

function businessTypeLabel(tenant: { tenantType: string; customerPortalEnabled: boolean }) {
  if (tenant.tenantType === "DIRECT_CUSTOMER") return "Direct Enterprise";
  if (tenant.customerPortalEnabled) return "Hybrid";
  return "3PL";
}

function deriveBusinessType(tenant: { tenantType: string; customerPortalEnabled: boolean }): BusinessType {
  if (tenant.tenantType === "DIRECT_CUSTOMER") return "DIRECT_ENTERPRISE";
  return tenant.customerPortalEnabled ? "HYBRID" : "THREE_PL";
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString();
}
