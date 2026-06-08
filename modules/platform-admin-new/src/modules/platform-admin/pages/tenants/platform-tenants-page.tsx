import { useEffect, useMemo, useState, type ComponentType, type ReactNode } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Ban,
  Building2,
  CheckCircle2,
  Eye,
  Hourglass,
  Layers,
  Pencil,
  Plus,
  Search,
  UserRoundCog,
} from "lucide-react";
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

type BusinessType = "DIRECT_ENTERPRISE" | "THREE_PL" | "FLEET_MANAGEMENT";

interface WizardForm {
  name: string;
  code: string;
  businessType: BusinessType;
  region: string;
  defaultTimezone: string;
  adminName: string;
  adminEmail: string;
  adminPhone: string;
  adminPassword: string;
  adminPasswordConfirm: string;
  enabledModuleCodes: string[];
}

type WizardField = keyof WizardForm;
type WizardErrors = Partial<Record<WizardField, string>>;

interface ModuleCardData {
  id: string;
  code: string;
  name: string;
  description: string;
  required: boolean;
}

const REQUIRED_MODULE_CODE = "ADMIN";
const BOOKING_MODULE_CODE = "TMS";

const businessTypeOptions: { value: BusinessType; label: string; helper: string }[] = [
  { value: "DIRECT_ENTERPRISE", label: "Direct Enterprise", helper: "Operates its own booking and logistics workflows." },
  { value: "THREE_PL", label: "3PL / Logistics Provider", helper: "Runs logistics operations for multiple customers." },
  { value: "FLEET_MANAGEMENT", label: "Fleet Management", helper: "Focuses on fleet, drivers, dispatch, and compliance." },
];

const defaultTimezoneOptions = [
  "Asia/Kolkata",
  "Asia/Dubai",
  "Asia/Singapore",
  "Europe/London",
  "Europe/Berlin",
  "America/New_York",
  "America/Chicago",
  "America/Los_Angeles",
];

const moduleOrder = [REQUIRED_MODULE_CODE, BOOKING_MODULE_CODE, "FLEET", "AUCTION", "CUSTOMER", "VENDOR", "TRACKING", "DRIVER_APP"];

const initialForm: WizardForm = {
  name: "",
  code: "",
  businessType: "DIRECT_ENTERPRISE",
  region: "",
  defaultTimezone: "Asia/Kolkata",
  adminName: "",
  adminEmail: "",
  adminPhone: "",
  adminPassword: "",
  adminPasswordConfirm: "",
  enabledModuleCodes: [],
};

export function PlatformTenantsPage() {
  const navigate = useNavigate();
  const paths = usePlatformPaths();
  const { data: tenants, createTenant, updateTenant, getTenantPrimaryAdminUser } = useTenants();
  const { data: plans } = usePlans();
  const { data: modules } = usePlatformModules();

  const activeModules = useMemo(() => modules.filter((module) => module.status === "active"), [modules]);
  const wizardModules = useMemo(() => buildWizardModules(activeModules), [activeModules]);

  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "trial" | "paused">(
    parseStatusParam(searchParams.get("status")),
  );

  // Keep the filter in sync when arriving from a dashboard stat-card deep link.
  useEffect(() => {
    setStatusFilter(parseStatusParam(searchParams.get("status")));
  }, [searchParams]);

  const [wizardOpen, setWizardOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<WizardForm>(initialForm);
  const [fieldErrors, setFieldErrors] = useState<WizardErrors>({});
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
        if (query) {
          const admin = getTenantPrimaryAdminUser(tenant.id);
          const haystack = `${tenant.name} ${tenant.code} ${tenant.region} ${businessTypeLabel(tenant)} ${admin?.name ?? ""} ${admin?.email ?? ""}`.toLowerCase();
          if (!haystack.includes(query)) return false;
        }
        if (statusFilter !== "all" && tenant.status !== statusFilter) return false;
        return true;
      })
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  }, [search, statusFilter, tenants, getTenantPrimaryAdminUser]);

  function openWizard() {
    setStep(0);
    setCreatedId(null);
    setWizardError("");
    setFieldErrors({});
    setForm({
      ...initialForm,
      enabledModuleCodes: getDefaultEnabledModuleCodes(activeModules),
    });
    setWizardOpen(true);
  }

  function update<K extends WizardField>(key: K, value: WizardForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setFieldErrors((current) => ({ ...current, [key]: undefined }));
    setWizardError("");
  }

  function validateCurrentStep() {
    const errors = getStepErrors(step, form, tenants);
    setFieldErrors(errors);
    return errors;
  }

  function next() {
    const errors = validateCurrentStep();
    if (Object.keys(errors).length > 0) {
      setWizardError(firstError(errors));
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
    const errors = getAllErrors(form, tenants);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setWizardError(firstError(errors));
      return;
    }

    const businessType = businessTypeOptions.find((option) => option.value === form.businessType);
    const tenantType: CreateTenantInput["tenantType"] =
      form.businessType === "THREE_PL" ? "LOGISTICS_PROVIDER_3PL" : "DIRECT_CUSTOMER";
    const enabledModuleCodes = ensureRequiredModuleCodes(form.enabledModuleCodes);

    const payload: CreateTenantInput = {
      name: form.name.trim(),
      code: form.code.trim().toUpperCase(),
      status: "active",
      planId: plans[0]?.id ?? "",
      defaultTimezone: form.defaultTimezone.trim(),
      tenantType,
      customerPortalEnabled: form.businessType === "FLEET_MANAGEMENT",
      primaryContactName: form.adminName.trim(),
      primaryContactEmail: form.adminEmail.trim(),
      primaryContactPhone: form.adminPhone.trim(),
      primaryContactPassword: form.adminPassword,
      starterRole: "tenant_admin",
      enabledModuleCodes,
      defaultHierarchyTemplate: "region-zone",
      notes: `Country / Region: ${form.region.trim()} | Default Timezone: ${form.defaultTimezone.trim()} | Phone: ${form.adminPhone.trim()}`,
    };

    try {
      const created = createTenant(payload);
      // defaultTimezone is already persisted via the createTenant payload above;
      // updateTenant only accepts the fields below.
      updateTenant(created.id, {
        region: form.region.trim(),
        industry: businessType?.label ?? "Logistics",
        enabledModuleCodes,
      });
      setCreatedId(created.id);
      setFieldErrors({});
      setWizardError("");
    } catch (submitError) {
      setWizardError(submitError instanceof Error ? submitError.message : "Tenant could not be created");
    }
  }

  function openModulesEdit(tenantId: string) {
    const tenant = tenants.find((item) => item.id === tenantId);
    if (!tenant) return;
    setModuleEditTenantId(tenantId);
    setModuleEditCodes(ensureRequiredModuleCodes(tenant.enabledModuleCodes));
  }

  function saveModuleEdit() {
    if (!moduleEditTenantId) return;
    updateTenant(moduleEditTenantId, { enabledModuleCodes: ensureRequiredModuleCodes(moduleEditCodes) });
    setModuleEditTenantId(null);
  }

  function openTenantAdmin(tenantId: string) {
    navigate(`/login?tenantId=${tenantId}`);
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
        <Stat
          label="Total"
          value={stats.total}
          hint="All tenants"
          icon={Building2}
          tone="slate"
          active={statusFilter === "all"}
          onClick={() => setStatusFilter("all")}
        />
        <Stat
          label="Active"
          value={stats.active}
          hint={`${formatShare(stats.active, stats.total)} of total`}
          icon={CheckCircle2}
          tone="emerald"
          active={statusFilter === "active"}
          onClick={() => setStatusFilter("active")}
        />
        <Stat
          label="Onboarding"
          value={stats.onboarding}
          hint={stats.onboarding === 0 ? "All set up" : "Awaiting activation"}
          icon={Hourglass}
          tone="amber"
          active={statusFilter === "trial"}
          onClick={() => setStatusFilter("trial")}
        />
        <Stat
          label="Inactive"
          value={stats.inactive}
          hint="Paused tenants"
          icon={Ban}
          tone="slate"
          active={statusFilter === "paused"}
          onClick={() => setStatusFilter("paused")}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-card px-3 py-2.5">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name, code, region, type, or admin"
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
        <span className="ml-auto text-[12px] text-slate-500">
          {visibleTenants.length} of {tenants.length}
        </span>
      </div>

      <div className="overflow-hidden rounded-xl border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b bg-slate-50/60 text-left text-[11px] font-medium uppercase tracking-[0.08em] text-slate-500">
                <th className="px-4 py-2.5">Tenant</th>
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
                  <td colSpan={7} className="px-4 py-10 text-center text-[13px] text-slate-500">
                    No tenants match the current filters.
                    {search || statusFilter !== "all" ? (
                      <button
                        type="button"
                        onClick={() => {
                          setSearch("");
                          setStatusFilter("all");
                        }}
                        className="ml-2 font-medium text-primary hover:underline"
                      >
                        Clear filters
                      </button>
                    ) : null}
                  </td>
                </tr>
              ) : (
                visibleTenants.map((tenant) => {
                  const admin = getTenantPrimaryAdminUser(tenant.id);
                  return (
                    <tr key={tenant.id} className="border-b last:border-0 hover:bg-slate-50/60">
                      <td className="px-4 py-2.5">
                        <Link to={paths.tenant(tenant.id)} className="group flex items-center gap-3">
                          <Avatar name={tenant.name} />
                          <div className="min-w-0">
                            <p className="font-medium text-slate-900 group-hover:underline">{tenant.name}</p>
                            <p className="text-[11px] text-slate-500">{tenant.code}</p>
                          </div>
                        </Link>
                      </td>
                      <td className="px-4 py-2.5 text-slate-700">{businessTypeLabel(tenant)}</td>
                      <td className="px-4 py-2.5">
                        <StatusBadge status={tenant.status} />
                      </td>
                      <td className="px-4 py-2.5">
                        <Badge variant="neutral">{ensureRequiredModuleCodes(tenant.enabledModuleCodes).length}</Badge>
                      </td>
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

      <Dialog
        open={wizardOpen}
        onOpenChange={(open) => {
          setWizardOpen(open);
          if (!open) {
            setStep(0);
            setCreatedId(null);
            setWizardError("");
            setFieldErrors({});
          }
        }}
        title={createdId ? "Tenant created" : "Create Tenant"}
        description={createdId ? "The tenant is now available in Platform Admin, Tenant Admin, and the unified login." : `Step ${step + 1} of 4 | ${wizardSteps[step].title}`}
        widthClassName="max-w-4xl"
        footer={
          createdId ? (
            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setWizardOpen(false)}>
                Close
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link to={paths.tenant(createdId)}>View Tenant</Link>
              </Button>
              <Button size="sm" asChild>
                <Link to={paths.tenantWorkspace(createdId)}>Open Tenant Admin Workspace</Link>
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-2">
              <span className="text-[12px] text-slate-500">Step {step + 1} of 4</span>
              <div className="flex gap-2">
                {step > 0 ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setStep((current) => current - 1);
                      setWizardError("");
                    }}
                  >
                    <ArrowLeft className="size-4" />
                    Back
                  </Button>
                ) : null}
                <Button size="sm" onClick={next}>
                  {step === 3 ? (
                    <>
                      <CheckCircle2 className="size-4" />
                      Create Tenant
                    </>
                  ) : (
                    <>
                      Continue
                      <ArrowRight className="size-4" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          )
        }
      >
        {createdId ? (
          <CreatedSummary tenantName={form.name} />
        ) : (
          <div className="space-y-5">
            <Stepper steps={wizardSteps} current={step} />
            {wizardError ? (
              <div className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-[12px] text-rose-700">
                {wizardError}
              </div>
            ) : null}
            {step === 0 ? <StepBasics form={form} update={update} errors={fieldErrors} /> : null}
            {step === 1 ? <StepAdmin form={form} update={update} errors={fieldErrors} /> : null}
            {step === 2 ? <StepModules form={form} update={update} modules={wizardModules} errors={fieldErrors} /> : null}
            {step === 3 ? <StepReview form={form} modules={activeModules} /> : null}
          </div>
        )}
      </Dialog>

      <Dialog
        open={moduleEditTenant !== null}
        onOpenChange={(open) => {
          if (!open) setModuleEditTenantId(null);
        }}
        title={moduleEditTenant ? `Modules for ${moduleEditTenant.name}` : ""}
        description="Only active registered Optimile Admin business modules are available here."
        widthClassName="max-w-2xl"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setModuleEditTenantId(null)}>
              Cancel
            </Button>
            <Button size="sm" onClick={saveModuleEdit}>
              Save
            </Button>
          </div>
        }
      >
        <div className="grid gap-3 md:grid-cols-2">
          {wizardModules.map((module) => {
            const checked = moduleEditCodes.includes(module.code);
            return (
              <ModuleCard
                key={module.id}
                module={module}
                checked={checked}
                onToggle={() =>
                  setModuleEditCodes((current) =>
                    toggleModuleCode(current, module.code, module.required),
                  )
                }
              />
            );
          })}
        </div>
      </Dialog>
    </div>
  );
}

const wizardSteps: { title: string; helper: string }[] = [
  { title: "Basic Details", helper: "Basic tenant information" },
  { title: "Tenant Admin User", helper: "Create the primary admin account" },
  { title: "Modules", helper: "Enable active registered modules" },
  { title: "Review", helper: "Confirm and create" },
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
              <span className={`hidden text-[12px] font-medium md:inline ${isCurrent ? "text-slate-900" : "text-slate-500"}`}>
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
  errors,
}: {
  form: WizardForm;
  update: <K extends WizardField>(key: K, value: WizardForm[K]) => void;
  errors: WizardErrors;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Field label="Tenant Name" required error={errors.name}>
        <Input value={form.name} onChange={(event) => update("name", event.target.value)} />
      </Field>
      <Field label="Tenant Code" required error={errors.code} helper="Must be unique across all tenants.">
        <Input value={form.code} onChange={(event) => update("code", event.target.value.toUpperCase())} />
      </Field>
      <Field label="Business Type" required error={errors.businessType}>
        <Select value={form.businessType} onChange={(event) => update("businessType", event.target.value as BusinessType)}>
          {businessTypeOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
        <p className="text-[11px] text-slate-500">
          {businessTypeOptions.find((option) => option.value === form.businessType)?.helper}
        </p>
      </Field>
      <Field label="Country / Region" required error={errors.region}>
        <Input value={form.region} onChange={(event) => update("region", event.target.value)} placeholder="e.g. India" />
      </Field>
      <Field label="Default Timezone" required error={errors.defaultTimezone} className="md:col-span-2">
        <Select value={form.defaultTimezone} onChange={(event) => update("defaultTimezone", event.target.value)}>
          {defaultTimezoneOptions.map((timezone) => (
            <option key={timezone} value={timezone}>
              {timezone}
            </option>
          ))}
        </Select>
      </Field>
    </div>
  );
}

function StepAdmin({
  form,
  update,
  errors,
}: {
  form: WizardForm;
  update: <K extends WizardField>(key: K, value: WizardForm[K]) => void;
  errors: WizardErrors;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Field label="Tenant Admin Name" required error={errors.adminName}>
        <Input value={form.adminName} onChange={(event) => update("adminName", event.target.value)} />
      </Field>
      <Field label="Tenant Admin Email" required error={errors.adminEmail}>
        <Input
          value={form.adminEmail}
          onChange={(event) => update("adminEmail", event.target.value)}
          placeholder="admin@company.com"
        />
      </Field>
      <Field label="Phone Number" required error={errors.adminPhone} helper="10 digits only.">
        <Input
          value={form.adminPhone}
          onChange={(event) => update("adminPhone", sanitizePhoneNumber(event.target.value))}
          inputMode="numeric"
          maxLength={10}
          placeholder="9876543210"
        />
      </Field>
      <div />
      <Field label="Password" required error={errors.adminPassword}>
        <Input
          type="password"
          value={form.adminPassword}
          onChange={(event) => update("adminPassword", event.target.value)}
          placeholder="Minimum 6 characters"
        />
      </Field>
      <Field label="Confirm Password" required error={errors.adminPasswordConfirm}>
        <Input
          type="password"
          value={form.adminPasswordConfirm}
          onChange={(event) => update("adminPasswordConfirm", event.target.value)}
        />
      </Field>
    </div>
  );
}

function StepModules({
  form,
  update,
  modules,
  errors,
}: {
  form: WizardForm;
  update: <K extends WizardField>(key: K, value: WizardForm[K]) => void;
  modules: ModuleCardData[];
  errors: WizardErrors;
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-[12px] text-slate-600">
        Only active registered business modules from the Optimile Admin module registry are shown here. Administration stays enabled for every tenant.
      </div>
      {errors.enabledModuleCodes ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[12px] text-rose-700">
          {errors.enabledModuleCodes}
        </div>
      ) : null}
      <div className="grid gap-3 md:grid-cols-2">
        {modules.map((module) => (
          <ModuleCard
            key={module.id}
            module={module}
            checked={form.enabledModuleCodes.includes(module.code)}
            onToggle={() =>
              update(
                "enabledModuleCodes",
                toggleModuleCode(form.enabledModuleCodes, module.code, module.required),
              )
            }
          />
        ))}
      </div>
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
  const moduleNames = ensureRequiredModuleCodes(form.enabledModuleCodes).map((code) => getModuleNameByCode(code, modules));
  const businessType = businessTypeOptions.find((option) => option.value === form.businessType)?.label ?? "-";

  return (
    <div className="space-y-4">
      <ReviewSection
        title="Tenant Summary"
        rows={[
          ["Tenant Name", form.name],
          ["Tenant Code", form.code],
          ["Business Type", businessType],
          ["Country / Region", form.region],
          ["Default Timezone", form.defaultTimezone],
        ]}
      />
      <ReviewSection
        title="Tenant Admin"
        rows={[
          ["Tenant Admin Name", form.adminName],
          ["Tenant Admin Email", form.adminEmail],
          ["Phone Number", form.adminPhone],
        ]}
      />
      <div className="rounded-xl border bg-slate-50/50 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-[13px] font-semibold text-slate-900">Enabled Modules</h3>
            <p className="mt-1 text-[12px] text-slate-500">Only active registered Optimile modules will be provisioned.</p>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {moduleNames.map((name) => (
            <Badge key={name} variant={name === "Administration" ? "accent" : "secondary"}>
              {name}
            </Badge>
          ))}
        </div>
      </div>
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-[12px] text-emerald-800">
        <p>Tenant Admin login will be available from the unified login page after creation.</p>
        <p className="mt-1">The new tenant will also be visible in the Tenant Admin tenant selector immediately.</p>
      </div>
    </div>
  );
}

function CreatedSummary({ tenantName }: { tenantName: string }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
      <CheckCircle2 className="mt-0.5 size-5 text-emerald-600" />
      <div>
        <p className="text-[13px] font-medium text-emerald-900">{tenantName} has been created.</p>
        <p className="mt-1 text-[12px] text-emerald-800">
          The tenant is saved in the shared admin store and is ready in Platform Admin and Tenant Admin.
        </p>
      </div>
    </div>
  );
}

function ModuleCard({
  module,
  checked,
  onToggle,
}: {
  module: ModuleCardData;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <div className={`rounded-xl border p-4 transition ${checked ? "border-primary bg-primary/5" : "border-border bg-card"}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[14px] font-semibold text-slate-900">{module.name}</p>
            <Badge variant="neutral">{module.code}</Badge>
            {module.required ? <Badge variant="accent">Required</Badge> : null}
          </div>
          <p className="mt-2 text-[12px] leading-relaxed text-slate-600">{module.description}</p>
        </div>
        <label className="flex items-center gap-2 text-[12px] font-medium text-slate-700">
          <input
            type="checkbox"
            className="size-4 accent-primary"
            checked={checked}
            disabled={module.required}
            onChange={onToggle}
          />
          Enabled
        </label>
      </div>
    </div>
  );
}

function ReviewSection({ title, rows }: { title: string; rows: Array<[string, string]> }) {
  return (
    <div className="rounded-xl border bg-slate-50/50 p-4">
      <h3 className="text-[13px] font-semibold text-slate-900">{title}</h3>
      <div className="mt-3 divide-y rounded-lg border bg-white">
        {rows.map(([label, value]) => (
          <ReviewRow key={label} label={label} value={value} />
        ))}
      </div>
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
      <span className="text-[12px] text-slate-500">{label}</span>
      <span className="text-[13px] font-medium text-slate-900">{value || "-"}</span>
    </div>
  );
}

function Field({
  label,
  children,
  className,
  required,
  helper,
  error,
}: {
  label: string;
  children: ReactNode;
  className?: string;
  required?: boolean;
  helper?: string;
  error?: string;
}) {
  return (
    <div className={`space-y-1.5 ${className ?? ""}`}>
      <label className="text-[12px] font-medium text-slate-700">
        {label}
        {required ? <span className="ml-1 text-rose-600">*</span> : null}
      </label>
      {children}
      {error ? <p className="text-[11px] text-rose-600">{error}</p> : helper ? <p className="text-[11px] text-slate-500">{helper}</p> : null}
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
  icon: Icon,
  tone,
  active,
  onClick,
}: {
  label: string;
  value: number;
  hint: string;
  icon: ComponentType<{ className?: string }>;
  tone: "emerald" | "amber" | "slate" | "indigo";
  active?: boolean;
  onClick?: () => void;
}) {
  const palette = {
    slate: "bg-slate-100 text-slate-700",
    emerald: "bg-emerald-100 text-emerald-700",
    amber: "bg-amber-100 text-amber-700",
    indigo: "bg-indigo-100 text-indigo-700",
  }[tone];
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      title={`Filter by ${label}`}
      className={`flex flex-col rounded-xl border bg-card px-4 py-3.5 text-left transition hover:-translate-y-0.5 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
        active ? "border-primary ring-1 ring-primary/40" : "hover:border-primary/40"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-slate-500">{label}</p>
        <div className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${palette}`}>
          <Icon className="size-4" />
        </div>
      </div>
      <p className="mt-2 text-[26px] font-semibold leading-none tracking-[-0.02em] text-slate-900">{value}</p>
      <p className="mt-1.5 text-[11px] text-slate-500">{hint}</p>
    </button>
  );
}

function Avatar({ name }: { name: string }) {
  return (
    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-[11px] font-semibold uppercase text-slate-600">
      {initials(name)}
    </span>
  );
}

function initials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "—";
  if (words.length === 1) return words[0].slice(0, 2);
  return `${words[0][0]}${words[words.length - 1][0]}`;
}

function formatShare(value: number, total: number) {
  if (total === 0) return "0%";
  return `${Math.round((value / total) * 100)}%`;
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
  if (tenant.tenantType === "DIRECT_CUSTOMER") {
    return tenant.customerPortalEnabled ? "Fleet Management" : "Direct Enterprise";
  }
  return "3PL / Logistics Provider";
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString();
}

function sanitizePhoneNumber(value: string) {
  return value.replace(/\D/g, "").slice(0, 10);
}

function parseStatusParam(value: string | null): "all" | "active" | "trial" | "paused" {
  return value === "active" || value === "trial" || value === "paused" ? value : "all";
}

function ensureRequiredModuleCodes(moduleCodes: string[]) {
  const unique = Array.from(new Set(moduleCodes));
  return unique.includes(REQUIRED_MODULE_CODE) ? unique : [REQUIRED_MODULE_CODE, ...unique];
}

function toggleModuleCode(currentCodes: string[], moduleCode: string, required: boolean) {
  if (required) return ensureRequiredModuleCodes(currentCodes);
  const nextCodes = currentCodes.includes(moduleCode)
    ? currentCodes.filter((code) => code !== moduleCode)
    : [...currentCodes, moduleCode];
  return ensureRequiredModuleCodes(nextCodes);
}

function getDefaultEnabledModuleCodes(
  modules: Array<{ code: string; status: "active" | "inactive" }>,
) {
  const activeCodes = modules.filter((module) => module.status === "active").map((module) => module.code);
  const defaults = [REQUIRED_MODULE_CODE];
  if (activeCodes.includes(BOOKING_MODULE_CODE)) {
    defaults.push(BOOKING_MODULE_CODE);
  }
  return ensureRequiredModuleCodes(defaults.filter((code) => activeCodes.includes(code) || code === REQUIRED_MODULE_CODE));
}

function buildWizardModules(modules: ReturnType<typeof usePlatformModules>["data"]): ModuleCardData[] {
  return [...modules]
    .sort((left, right) => moduleSortIndex(left.code) - moduleSortIndex(right.code) || left.name.localeCompare(right.name))
    .map((module) => {
      const display = displayModule(module);
      return {
        id: module.id,
        code: module.code,
        name: display.name,
        description: module.description,
        required: module.code === REQUIRED_MODULE_CODE,
      };
    });
}

function moduleSortIndex(code: string) {
  const index = moduleOrder.indexOf(code);
  return index === -1 ? moduleOrder.length + 1 : index;
}

function getStepErrors(step: number, form: WizardForm, tenants: Array<{ code: string }>) {
  if (step === 0) return validateBasicDetails(form, tenants);
  if (step === 1) return validateAdminDetails(form);
  if (step === 2) return validateModuleSelection(form);
  return {};
}

function getAllErrors(form: WizardForm, tenants: Array<{ code: string }>) {
  return {
    ...validateBasicDetails(form, tenants),
    ...validateAdminDetails(form),
    ...validateModuleSelection(form),
  };
}

function validateBasicDetails(form: WizardForm, tenants: Array<{ code: string }>) {
  const errors: WizardErrors = {};
  if (form.name.trim().length < 2) errors.name = "Tenant name is required.";
  const normalizedCode = form.code.trim().toUpperCase();
  if (normalizedCode.length < 2) {
    errors.code = "Tenant code is required.";
  } else if (tenants.some((tenant) => tenant.code.trim().toUpperCase() === normalizedCode)) {
    errors.code = "Tenant code must be unique.";
  }
  if (!form.businessType) errors.businessType = "Business type is required.";
  if (form.region.trim().length < 2) errors.region = "Country / Region is required.";
  if (!form.defaultTimezone.trim()) errors.defaultTimezone = "Default timezone is required.";
  return errors;
}

function validateAdminDetails(form: WizardForm) {
  const errors: WizardErrors = {};
  if (form.adminName.trim().length < 2) errors.adminName = "Tenant admin name is required.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.adminEmail.trim())) {
    errors.adminEmail = "Enter a valid tenant admin email.";
  }
  if (!/^\d{10}$/.test(form.adminPhone.trim())) {
    errors.adminPhone = "Phone number must be exactly 10 digits.";
  }
  if (form.adminPassword.length < 6) {
    errors.adminPassword = "Password must be at least 6 characters.";
  }
  if (form.adminPasswordConfirm !== form.adminPassword) {
    errors.adminPasswordConfirm = "Confirm password must match password.";
  }
  return errors;
}

function validateModuleSelection(form: WizardForm) {
  const errors: WizardErrors = {};
  const enabledCodes = ensureRequiredModuleCodes(form.enabledModuleCodes);
  if (enabledCodes.length === 0) {
    errors.enabledModuleCodes = "Select at least one module.";
  } else if (!enabledCodes.includes(REQUIRED_MODULE_CODE)) {
    errors.enabledModuleCodes = "Administration must remain enabled.";
  }
  return errors;
}

function firstError(errors: WizardErrors) {
  const firstKey = Object.keys(errors)[0] as WizardField | undefined;
  return firstKey ? errors[firstKey] ?? "Please complete the form." : "Please complete the form.";
}
