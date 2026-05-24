import { useMemo, useState, type ComponentType, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Eye,
  KeyRound,
  Layers,
  Pencil,
  Plus,
  Search,
  Send,
  UserRoundCog,
} from "lucide-react";
import { z } from "zod";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Dialog } from "@/shared/components/ui/dialog";
import { Input } from "@/shared/components/ui/input";
import { Select } from "@/shared/components/ui/select";
import { usePlatformModules } from "@/modules/platform-admin/hooks/usePlatformModules";
import { usePlans } from "@/modules/platform-admin/hooks/usePlans";
import { useTenants } from "@/modules/platform-admin/hooks/useTenants";
import { usePlatformPaths } from "@platform-admin/hooks/usePlatformPaths";
import { displayModule, getModuleNameByCode } from "@/modules/platform-admin/lib/module-display";
import type { CreateTenantInput } from "@/types/tenant-workspace";

type BusinessType = "DIRECT_ENTERPRISE" | "THREE_PL" | "HYBRID";
type UiStatus = "active" | "onboarding";
type OnboardingMode = "temp_password" | "invite_link";

interface WizardForm {
  name: string;
  code: string;
  businessType: BusinessType;
  region: string;
  status: UiStatus;
  adminName: string;
  adminEmail: string;
  adminPhone: string;
  adminPassword: string;
  adminPasswordConfirm: string;
  onboardingMode: OnboardingMode;
  enabledModuleCodes: string[];
}

const businessTypeOptions: { value: BusinessType; label: string; helper: string }[] = [
  { value: "DIRECT_ENTERPRISE", label: "Direct Enterprise", helper: "Operates own transport workflows." },
  { value: "THREE_PL", label: "3PL", helper: "Operates for multiple customers." },
  { value: "HYBRID", label: "Hybrid", helper: "3PL with customer portal access." },
];

const wizardSchema = z.object({
  name: z.string().trim().min(2, "Tenant name is required"),
  code: z.string().trim().min(2, "Tenant code is required"),
  region: z.string().trim().min(2, "Region is required"),
  adminName: z.string().trim().min(2, "Admin name is required"),
  adminEmail: z.string().trim().email("Valid email required"),
  enabledModuleCodes: z.array(z.string()).min(1, "Pick at least one module"),
});

const initialForm: WizardForm = {
  name: "",
  code: "",
  businessType: "DIRECT_ENTERPRISE",
  region: "",
  status: "onboarding",
  adminName: "",
  adminEmail: "",
  adminPhone: "",
  adminPassword: "",
  adminPasswordConfirm: "",
  onboardingMode: "invite_link",
  enabledModuleCodes: [],
};

export function PlatformTenantsPage() {
  const navigate = useNavigate();
  const paths = usePlatformPaths();
  const { data: tenants, createTenant, updateTenant, getTenantPrimaryAdminUser } = useTenants();
  const { data: plans } = usePlans();
  const { data: modules } = usePlatformModules();
  const activeModules = useMemo(() => modules.filter((module) => module.status === "active"), [modules]);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "trial" | "paused">("all");

  const [wizardOpen, setWizardOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<WizardForm>(initialForm);
  const [wizardError, setWizardError] = useState("");
  const [createdId, setCreatedId] = useState<string | null>(null);

  const [moduleEditTenantId, setModuleEditTenantId] = useState<string | null>(null);
  const moduleEditTenant = tenants.find((tenant) => tenant.id === moduleEditTenantId) ?? null;
  const [moduleEditCodes, setModuleEditCodes] = useState<string[]>([]);

  const stats = useMemo(() => {
    const total = tenants.length;
    const active = tenants.filter((tenant) => tenant.status === "active").length;
    const onboarding = tenants.filter((tenant) => tenant.status === "trial").length;
    const inactive = tenants.filter((tenant) => tenant.status === "paused").length;
    return { total, active, onboarding, inactive };
  }, [tenants]);

  const visibleTenants = useMemo(() => {
    const query = search.trim().toLowerCase();
    return tenants
      .filter((tenant) => {
        if (query && !`${tenant.name} ${tenant.code} ${tenant.region}`.toLowerCase().includes(query)) {
          return false;
        }
        if (statusFilter !== "all" && tenant.status !== statusFilter) return false;
        return true;
      })
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  }, [search, statusFilter, tenants]);

  function openWizard() {
    setStep(0);
    setCreatedId(null);
    setWizardError("");
    setForm({
      ...initialForm,
      enabledModuleCodes: activeModules.slice(0, 3).map((module) => module.code),
    });
    setWizardOpen(true);
  }

  function update<K extends keyof WizardForm>(key: K, value: WizardForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function validateStep(): string | null {
    if (step === 0) {
      if (form.name.trim().length < 2) return "Tenant name is required";
      if (form.code.trim().length < 2) return "Tenant code is required";
      if (form.region.trim().length < 2) return "Country / region is required";
    } else if (step === 1) {
      if (form.adminName.trim().length < 2) return "Admin name is required";
      if (!form.adminEmail.trim().match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) return "Valid admin email required";
      if (form.adminPassword.length < 6) return "Password must be at least 6 characters";
      if (form.adminPassword !== form.adminPasswordConfirm) return "Passwords do not match";
    } else if (step === 2) {
      if (form.enabledModuleCodes.length === 0) return "Select at least one module";
    }
    return null;
  }

  function next() {
    const stepError = validateStep();
    if (stepError) {
      setWizardError(stepError);
      return;
    }
    setWizardError("");
    if (step === 3) {
      submitWizard();
      return;
    }
    setStep((current) => Math.min(current + 1, 3));
  }

  function submitWizard() {
    const parsed = wizardSchema.safeParse(form);
    if (!parsed.success) {
      setWizardError(parsed.error.issues[0]?.message ?? "Complete the form");
      return;
    }

    const tenantType: CreateTenantInput["tenantType"] =
      form.businessType === "DIRECT_ENTERPRISE" ? "DIRECT_CUSTOMER" : "LOGISTICS_PROVIDER_3PL";

    const payload: CreateTenantInput = {
      name: form.name.trim(),
      code: form.code.trim().toUpperCase(),
      status: form.status === "active" ? "active" : "trial",
      planId: plans[0]?.id ?? "",
      tenantType,
      customerPortalEnabled: form.businessType === "HYBRID",
      primaryContactName: form.adminName.trim(),
      primaryContactEmail: form.adminEmail.trim(),
      primaryContactPhone: form.adminPhone.trim() || undefined,
      // Demo only: plaintext password stored in mock/localStorage. Remove when backend auth is integrated.
      primaryContactPassword: form.adminPassword || undefined,
      starterRole: "tenant_admin",
      enabledModuleCodes: form.enabledModuleCodes,
      defaultHierarchyTemplate: "region-zone",
      notes: [
        form.region ? `Region: ${form.region}` : "",
        form.adminPhone ? `Phone: ${form.adminPhone}` : "",
        `Admin onboarding: ${form.onboardingMode === "invite_link" ? "Invite link" : "Temporary password"}`,
      ]
        .filter(Boolean)
        .join(" · "),
    };

    try {
      const created = createTenant(payload);
      if (form.region) {
        updateTenant(created.id, { region: form.region });
      }
      setCreatedId(created.id);
      setWizardError("");
    } catch (submitError) {
      setWizardError(submitError instanceof Error ? submitError.message : "Tenant could not be created");
    }
  }

  function openModulesEdit(tenantId: string) {
    const tenant = tenants.find((item) => item.id === tenantId);
    if (!tenant) return;
    setModuleEditTenantId(tenantId);
    setModuleEditCodes(tenant.enabledModuleCodes);
  }

  function saveModuleEdit() {
    if (!moduleEditTenantId) return;
    if (moduleEditCodes.length === 0) return;
    updateTenant(moduleEditTenantId, { enabledModuleCodes: moduleEditCodes });
    setModuleEditTenantId(null);
  }

  function openTenantAdmin(tenantId: string) {
    navigate(`/platform-admin/tenant-login?tenantId=${tenantId}`);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[20px] font-semibold tracking-[-0.01em] text-slate-900">Tenants</h1>
          <p className="mt-0.5 text-[13px] text-slate-500">Manage tenants and module enablement.</p>
        </div>
        <Button size="sm" onClick={openWizard}>
          <Plus className="size-4" />
          Add Tenant
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Total" value={stats.total} />
        <Stat label="Active" value={stats.active} tone="emerald" />
        <Stat label="Onboarding" value={stats.onboarding} tone="amber" />
        <Stat label="Inactive" value={stats.inactive} tone="slate" />
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-card px-3 py-2.5">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name, code, or region"
            className="h-9 pl-9"
          />
        </div>
        <Select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}
          className="h-9 w-auto min-w-[160px]"
        >
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="trial">Onboarding</option>
          <option value="paused">Inactive</option>
        </Select>
        <span className="ml-auto text-[12px] text-slate-500">{visibleTenants.length} of {tenants.length}</span>
      </div>

      <div className="overflow-hidden rounded-xl border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b bg-slate-50/60 text-left text-[11px] font-medium uppercase tracking-[0.08em] text-slate-500">
                <th className="px-4 py-2.5">Tenant Name</th>
                <th className="px-4 py-2.5">Code</th>
                <th className="px-4 py-2.5">Business Type</th>
                <th className="px-4 py-2.5">Status</th>
                <th className="px-4 py-2.5">Modules</th>
                <th className="px-4 py-2.5">Admin User</th>
                <th className="px-4 py-2.5">Created</th>
                <th className="px-4 py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleTenants.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-[13px] text-slate-500">
                    No tenants match the current filters.
                  </td>
                </tr>
              ) : (
                visibleTenants.map((tenant) => {
                  const admin = getTenantPrimaryAdminUser(tenant.id);
                  return (
                    <tr key={tenant.id} className="border-b last:border-0 hover:bg-slate-50/60">
                      <td className="px-4 py-2.5">
                        <Link to={paths.tenant(tenant.id)} className="font-medium text-slate-900 hover:underline">
                          {tenant.name}
                        </Link>
                      </td>
                      <td className="px-4 py-2.5 text-slate-700">{tenant.code}</td>
                      <td className="px-4 py-2.5 text-slate-700">{businessTypeLabel(tenant)}</td>
                      <td className="px-4 py-2.5">
                        <StatusBadge status={tenant.status} />
                      </td>
                      <td className="px-4 py-2.5 text-slate-700">{tenant.enabledModuleCodes.length}</td>
                      <td className="px-4 py-2.5 text-slate-700">{admin?.name ?? "—"}</td>
                      <td className="px-4 py-2.5 text-slate-600">{formatDate(tenant.createdAt)}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center justify-end gap-1">
                          <IconButton asChild title="View">
                            <Link to={paths.tenant(tenant.id)}>
                              <Eye className="size-4" />
                            </Link>
                          </IconButton>
                          <IconButton asChild title="Edit">
                            <Link to={paths.tenant(tenant.id)}>
                              <Pencil className="size-4" />
                            </Link>
                          </IconButton>
                          <IconButton title="Modules" onClick={() => openModulesEdit(tenant.id)}>
                            <Layers className="size-4" />
                          </IconButton>
                          <IconButton title="Open Tenant Admin" onClick={() => openTenantAdmin(tenant.id)}>
                            <UserRoundCog className="size-4" />
                          </IconButton>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Tenant Wizard */}
      <Dialog
        open={wizardOpen}
        onOpenChange={(open) => {
          setWizardOpen(open);
          if (!open) {
            setStep(0);
            setCreatedId(null);
            setWizardError("");
          }
        }}
        title={createdId ? "Tenant created" : "Add Tenant"}
        description={createdId ? "The tenant has been added to the platform." : `Step ${step + 1} of 4 · ${wizardSteps[step].title}`}
        widthClassName="max-w-2xl"
        footer={
          createdId ? (
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setWizardOpen(false)}>Close</Button>
              <Button asChild size="sm">
                <Link to={paths.tenant(createdId)}>View tenant</Link>
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-2">
              <span className="text-[12px] text-slate-500">Step {step + 1} of 4</span>
              <div className="flex gap-2">
                {step > 0 ? (
                  <Button variant="ghost" size="sm" onClick={() => setStep((current) => current - 1)}>
                    <ArrowLeft className="size-4" />
                    Back
                  </Button>
                ) : null}
                <Button size="sm" onClick={next}>
                  {step === 3 ? (<><CheckCircle2 className="size-4" />Create Tenant</>) : (<>Continue<ArrowRight className="size-4" /></>)}
                </Button>
              </div>
            </div>
          )
        }
      >
        {createdId ? (
          <CreatedSummary tenantName={form.name} />
        ) : (
          <div className="space-y-4">
            <Stepper steps={wizardSteps} current={step} />
            {wizardError ? (
              <div className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-[12px] text-rose-700">
                {wizardError}
              </div>
            ) : null}
            {step === 0 ? <StepBasics form={form} update={update} /> : null}
            {step === 1 ? <StepAdmin form={form} update={update} /> : null}
            {step === 2 ? <StepModules form={form} update={update} modules={activeModules} /> : null}
            {step === 3 ? <StepReview form={form} modules={activeModules} /> : null}
          </div>
        )}
      </Dialog>

      {/* Modules Edit Dialog */}
      <Dialog
        open={moduleEditTenant !== null}
        onOpenChange={(open) => {
          if (!open) setModuleEditTenantId(null);
        }}
        title={moduleEditTenant ? `Modules for ${moduleEditTenant.name}` : ""}
        description="Toggle modules enabled for this tenant."
        widthClassName="max-w-md"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setModuleEditTenantId(null)}>Cancel</Button>
            <Button size="sm" onClick={saveModuleEdit} disabled={moduleEditCodes.length === 0}>
              Save
            </Button>
          </div>
        }
      >
        <div className="space-y-1.5">
          {activeModules.map((module) => {
            const display = displayModule(module);
            const checked = moduleEditCodes.includes(module.code);
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
                    setModuleEditCodes((current) =>
                      checked ? current.filter((code) => code !== module.code) : [...current, module.code],
                    )
                  }
                />
              </label>
            );
          })}
          {moduleEditCodes.length === 0 ? (
            <p className="text-[11px] text-amber-700">Select at least one module.</p>
          ) : null}
        </div>
      </Dialog>
    </div>
  );
}

const wizardSteps: { title: string; helper: string }[] = [
  { title: "Basic Details", helper: "Name, code, type" },
  { title: "Admin User", helper: "Primary admin contact" },
  { title: "Modules", helper: "Enable modules" },
  { title: "Review", helper: "Confirm & create" },
];

function Stepper({ steps, current }: { steps: { title: string; helper: string }[]; current: number }) {
  return (
    <ol className="flex items-center gap-1">
      {steps.map((step, index) => {
        const isComplete = index < current;
        const isCurrent = index === current;
        const isLast = index === steps.length - 1;
        return (
          <li key={step.title} className="flex flex-1 items-center gap-1.5">
            <div className="flex items-center gap-2">
              <span
                className={`flex size-6 items-center justify-center rounded-full text-[11px] font-semibold ${
                  isCurrent
                    ? "bg-primary text-primary-foreground"
                    : isComplete
                      ? "bg-emerald-500 text-white"
                      : "bg-slate-200 text-slate-600"
                }`}
              >
                {isComplete ? <CheckCircle2 className="size-3.5" /> : index + 1}
              </span>
              <span
                className={`hidden text-[12px] font-medium md:inline ${
                  isCurrent ? "text-slate-900" : "text-slate-500"
                }`}
              >
                {step.title}
              </span>
            </div>
            {!isLast ? <div className={`h-px flex-1 ${isComplete ? "bg-emerald-400" : "bg-slate-200"}`} /> : null}
          </li>
        );
      })}
    </ol>
  );
}

function StepBasics({
  form,
  update,
}: {
  form: WizardForm;
  update: <K extends keyof WizardForm>(key: K, value: WizardForm[K]) => void;
}) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <Field label="Tenant Name">
        <Input value={form.name} onChange={(event) => update("name", event.target.value)} />
      </Field>
      <Field label="Tenant Code">
        <Input
          value={form.code}
          onChange={(event) => update("code", event.target.value.toUpperCase())}
        />
      </Field>
      <Field label="Business Type">
        <Select
          value={form.businessType}
          onChange={(event) => update("businessType", event.target.value as BusinessType)}
        >
          {businessTypeOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Country / Region">
        <Input
          value={form.region}
          onChange={(event) => update("region", event.target.value)}
          placeholder="e.g. India · APAC"
        />
      </Field>
      <Field label="Status" className="md:col-span-2">
        <Select value={form.status} onChange={(event) => update("status", event.target.value as UiStatus)}>
          <option value="onboarding">Onboarding</option>
          <option value="active">Active</option>
        </Select>
      </Field>
    </div>
  );
}

function StepAdmin({
  form,
  update,
}: {
  form: WizardForm;
  update: <K extends keyof WizardForm>(key: K, value: WizardForm[K]) => void;
}) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <Field label="Admin Name">
        <Input value={form.adminName} onChange={(event) => update("adminName", event.target.value)} />
      </Field>
      <Field label="Admin Email">
        <Input
          value={form.adminEmail}
          onChange={(event) => update("adminEmail", event.target.value)}
          placeholder="admin@company.com"
        />
      </Field>
      <Field label="Phone (optional)" className="md:col-span-2">
        <Input value={form.adminPhone} onChange={(event) => update("adminPhone", event.target.value)} />
      </Field>
      <Field label="Password">
        <Input
          type="password"
          value={form.adminPassword}
          onChange={(event) => update("adminPassword", event.target.value)}
          placeholder="Minimum 6 characters"
        />
      </Field>
      <Field label="Confirm Password">
        <Input
          type="password"
          value={form.adminPasswordConfirm}
          onChange={(event) => update("adminPasswordConfirm", event.target.value)}
        />
      </Field>
      <div className="md:col-span-2 space-y-2">
        <p className="text-[12px] font-medium text-slate-700">Onboarding Method</p>
        <div className="grid gap-2 md:grid-cols-2">
          <RadioCard
            icon={Send}
            label="Invite Link"
            helper="Email a link to set password."
            selected={form.onboardingMode === "invite_link"}
            onClick={() => update("onboardingMode", "invite_link")}
          />
          <RadioCard
            icon={KeyRound}
            label="Temporary Password"
            helper="Generate a one-time password."
            selected={form.onboardingMode === "temp_password"}
            onClick={() => update("onboardingMode", "temp_password")}
          />
        </div>
      </div>
    </div>
  );
}

function StepModules({
  form,
  update,
  modules,
}: {
  form: WizardForm;
  update: <K extends keyof WizardForm>(key: K, value: WizardForm[K]) => void;
  modules: ReturnType<typeof usePlatformModules>["data"];
}) {
  function toggle(code: string) {
    update(
      "enabledModuleCodes",
      form.enabledModuleCodes.includes(code)
        ? form.enabledModuleCodes.filter((item) => item !== code)
        : [...form.enabledModuleCodes, code],
    );
  }

  return (
    <div className="grid gap-2 md:grid-cols-2">
      {modules.map((module) => {
        const display = displayModule(module);
        const checked = form.enabledModuleCodes.includes(module.code);
        return (
          <label
            key={module.id}
            className={`flex cursor-pointer items-center justify-between rounded-lg border px-3 py-2 transition ${
              checked ? "border-primary bg-primary/5" : "border-border hover:bg-slate-50"
            }`}
          >
            <div>
              <p className="text-[13px] font-medium text-slate-900">{display.name}</p>
              <p className="text-[11px] text-slate-500">{display.code}</p>
            </div>
            <input
              type="checkbox"
              className="size-4 accent-primary"
              checked={checked}
              onChange={() => toggle(module.code)}
            />
          </label>
        );
      })}
    </div>
  );
}

function StepReview({
  form,
  modules,
}: {
  form: WizardForm;
  modules: ReturnType<typeof usePlatformModules>["data"];
}) {
  const moduleNames = form.enabledModuleCodes
    .map((code) => getModuleNameByCode(code, modules))
    .join(", ");
  const businessTypeLabel = businessTypeOptions.find((option) => option.value === form.businessType)?.label ?? "—";

  return (
    <div className="divide-y rounded-lg border bg-slate-50/40 text-[13px]">
      <ReviewRow label="Tenant Name" value={form.name} />
      <ReviewRow label="Tenant Code" value={form.code} />
      <ReviewRow label="Business Type" value={businessTypeLabel} />
      <ReviewRow label="Country / Region" value={form.region} />
      <ReviewRow label="Status" value={form.status === "active" ? "Active" : "Onboarding"} />
      <ReviewRow label="Admin" value={`${form.adminName} · ${form.adminEmail}`} />
      <ReviewRow label="Admin Onboarding" value={form.onboardingMode === "invite_link" ? "Invite link" : "Temporary password"} />
      <ReviewRow label="Modules" value={moduleNames} />
    </div>
  );
}

function CreatedSummary({ tenantName }: { tenantName: string }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
      <CheckCircle2 className="mt-0.5 size-5 text-emerald-600" />
      <div>
        <p className="text-[13px] font-medium text-emerald-900">{tenantName} has been created.</p>
        <p className="mt-1 text-[12px] text-emerald-800">You can view the tenant or close this dialog.</p>
      </div>
    </div>
  );
}

function RadioCard({
  icon: Icon,
  label,
  helper,
  selected,
  onClick,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  helper: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-left transition ${
        selected ? "border-primary bg-primary/5" : "border-border hover:bg-slate-50"
      }`}
    >
      <Icon className="mt-0.5 size-4 text-slate-700" />
      <div>
        <p className="text-[13px] font-medium text-slate-900">{label}</p>
        <p className="text-[11px] text-slate-500">{helper}</p>
      </div>
    </button>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
      <span className="text-[12px] text-slate-500">{label}</span>
      <span className="text-[13px] font-medium text-slate-900">{value || "—"}</span>
    </div>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`space-y-1.5 ${className ?? ""}`}>
      <label className="text-[12px] font-medium text-slate-700">{label}</label>
      {children}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: "emerald" | "amber" | "slate" }) {
  const accent = tone === "emerald"
    ? "text-emerald-700"
    : tone === "amber"
      ? "text-amber-700"
      : tone === "slate"
        ? "text-slate-700"
        : "text-slate-900";
  return (
    <div className="rounded-xl border bg-card px-4 py-3">
      <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-slate-500">{label}</p>
      <p className={`mt-1 text-[22px] font-semibold tracking-[-0.02em] ${accent}`}>{value}</p>
    </div>
  );
}

function IconButton({
  asChild,
  title,
  onClick,
  children,
}: {
  asChild?: boolean;
  title: string;
  onClick?: () => void;
  children: ReactNode;
}) {
  return (
    <Button asChild={asChild} variant="ghost" size="sm" onClick={onClick} title={title} className="h-7 w-7 p-0">
      {children}
    </Button>
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

function formatDate(value: string) {
  return new Date(value).toLocaleDateString();
}
