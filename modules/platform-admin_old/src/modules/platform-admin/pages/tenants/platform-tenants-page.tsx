import { useMemo, useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CheckCircle2, ExternalLink, Plus, UserRoundCog } from "lucide-react";
import { z } from "zod";
import { useSessionContext } from "@/shared/auth/session-context";
import { PageHeader } from "@/shared/components/common/page-header";
import {
  PlatformEmptyState,
  PlatformFilterBar,
  PlatformPanel,
} from "@/modules/platform-admin/components/platform-primitives";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Dialog } from "@/shared/components/ui/dialog";
import { Input } from "@/shared/components/ui/input";
import { Select } from "@/shared/components/ui/select";
import { Switch } from "@/shared/components/ui/switch";
import { Textarea } from "@/shared/components/ui/textarea";
import { usePlatformModules } from "@/modules/platform-admin/hooks/usePlatformModules";
import { usePlatformSettings } from "@/modules/platform-admin/hooks/usePlatformSettings";
import { usePlans } from "@/modules/platform-admin/hooks/usePlans";
import { useTenants } from "@/modules/platform-admin/hooks/useTenants";
import { usePlatformPaths } from "@platform-admin/hooks/usePlatformPaths";
import { hierarchyTemplateOptions } from "@/shared/lib/hierarchy-templates";
import {
  getCommercialModeLabel,
  getDefaultAssignmentMode,
  getDefaultCommercialMode,
  getAssignmentModeLabel,
  getTenantOperationalSummary,
  getTenantOwnershipSummary,
  getTenantTypeLabel,
  getTenantTypeMeta,
  tenantTypeOptions,
} from "@/shared/lib/tenant-config";
import type { CreateTenantInput, HierarchyTemplateCode } from "@/types/tenant-workspace";

const tenantSchema = z.object({
  name: z.string().min(2),
  code: z.string().min(2),
  status: z.enum(["active", "trial", "paused"]),
  planId: z.string().min(1),
  tenantType: z.enum(["DIRECT_CUSTOMER", "LOGISTICS_PROVIDER_3PL"]),
  customerPortalEnabled: z.boolean(),
  primaryContactName: z.string().min(2),
  primaryContactEmail: z.string().email(),
  starterRole: z.enum(["tenant_admin", "ceo"]),
  enabledModuleCodes: z.array(z.string()).min(1),
  defaultHierarchyTemplate: z.enum([
    "region-zone",
    "region-branch",
    "region-zone-branch-subbranch",
    "custom",
  ]),
  notes: z.string(),
});

const wizardSteps = [
  "Tenant Basic Details",
  "Tenant Type Selection",
  "Customer Portal Configuration",
  "Enabled Modules",
  "Initial Admin User",
  "Confirmation & Operational Summary",
] as const;

const initialForm: CreateTenantInput = {
  name: "",
  code: "",
  status: "trial",
  planId: "",
  tenantType: "DIRECT_CUSTOMER",
  customerPortalEnabled: false,
  primaryContactName: "",
  primaryContactEmail: "",
  starterRole: "tenant_admin",
  enabledModuleCodes: [],
  defaultHierarchyTemplate: "region-zone",
  notes: "",
};

export function PlatformTenantsPage() {
  const navigate = useNavigate();
  const paths = usePlatformPaths();
  const { setSession } = useSessionContext();
  const { data: tenants, createSampleTenant, createTenant, getTenantPrimaryAdminUser } = useTenants();
  const { data: plans } = usePlans();
  const { data: modules } = usePlatformModules();
  const { data: platformSettings } = usePlatformSettings();
  const activeModules = useMemo(() => modules.filter((module) => module.status === "active"), [modules]);
  const defaultModuleCodes = useMemo(() => {
    const activeModuleCodes = new Set(activeModules.map((module) => module.code));
    const fromSettings = platformSettings.defaultModuleCodes.filter((moduleCode) =>
      activeModuleCodes.has(moduleCode),
    );
    return fromSettings.length ? fromSettings : activeModules.slice(0, 2).map((item) => item.code);
  }, [activeModules, platformSettings.defaultModuleCodes]);

  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<CreateTenantInput>({
    ...initialForm,
    planId: plans[0]?.id ?? "",
  });
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [planFilter, setPlanFilter] = useState("all");
  const [sortBy, setSortBy] = useState("created_desc");
  const [createdTenantId, setCreatedTenantId] = useState<string | null>(null);

  const createdTenant = useMemo(
    () => tenants.find((tenant) => tenant.id === createdTenantId) ?? null,
    [createdTenantId, tenants],
  );
  const planMap = useMemo(() => new Map(plans.map((plan) => [plan.id, plan])), [plans]);
  const moduleMap = useMemo(() => new Map(modules.map((module) => [module.code, module])), [modules]);

  const tenantRows = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    const filtered = tenants.filter((tenant) => {
      if (
        normalizedSearch &&
        !`${tenant.name} ${tenant.code} ${tenant.region} ${tenant.industry}`
          .toLowerCase()
          .includes(normalizedSearch)
      ) {
        return false;
      }
      if (statusFilter !== "all" && tenant.status !== statusFilter) {
        return false;
      }
      if (planFilter !== "all" && tenant.planId !== planFilter) {
        return false;
      }
      return true;
    });

    return filtered.sort((left, right) => {
      switch (sortBy) {
        case "name_asc":
          return left.name.localeCompare(right.name);
        case "name_desc":
          return right.name.localeCompare(left.name);
        case "created_asc":
          return left.createdAt.localeCompare(right.createdAt);
        default:
          return right.createdAt.localeCompare(left.createdAt);
      }
    });
  }, [planFilter, search, sortBy, statusFilter, tenants]);

  const activeTenants = tenants.filter((tenant) => tenant.status === "active").length;
  const trialTenants = tenants.filter((tenant) => tenant.status === "trial").length;
  const pausedTenants = tenants.filter((tenant) => tenant.status === "paused").length;
  const attentionTenants = tenants.filter(
    (tenant) => tenant.status !== "active" || tenant.health.auditEvents24h >= 20,
  ).length;

  function update<K extends keyof CreateTenantInput>(key: K, value: CreateTenantInput[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  const formAssignmentMode = getDefaultAssignmentMode(form.tenantType);
  const formCommercialMode = getDefaultCommercialMode(form.tenantType);

  function openTenantWorkspace(tenantId: string, tenantName: string) {
    setSession({
      actorType: "tenant_admin",
      tenantId,
      actorName: `${tenantName} Admin`,
    });
    navigate(paths.tenantWorkspace(tenantId));
  }

  function handleQuickCreate(template: HierarchyTemplateCode) {
    const tenant = createSampleTenant(template);
    setCreatedTenantId(tenant.id);
    setFeedback(`${tenant.name} was created using the ${templateLabel(template)} template.`);
  }

  function nextStep() {
    if (step === 5) {
      const parsed = tenantSchema.safeParse(form);
      if (!parsed.success) {
        setError("Complete all required fields before creating the tenant.");
        return;
      }

      try {
        const created = createTenant(parsed.data);
        setCreatedTenantId(created.id);
        setFeedback(`${created.name} was provisioned successfully and is now visible in the tenant directory.`);
        setStep(5);
        setError("");
      } catch (submissionError) {
        setError(submissionError instanceof Error ? submissionError.message : "Tenant could not be created.");
      }
      return;
    }

    setStep((current) => Math.min(current + 1, 5));
  }

  function openWizard() {
    setForm({
      ...initialForm,
      planId: plans[0]?.id ?? "",
      enabledModuleCodes: defaultModuleCodes,
    });
    setStep(0);
    setCreatedTenantId(null);
    setError("");
    setOpen(true);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Optimile Super Admin"
        title="Tenants"
        description="Provision tenants, review commercial setup, inspect health signals, and open the tenant admin portal."
        action={
          <div className="flex flex-wrap gap-3">
            <Button onClick={openWizard}>
              <Plus className="size-4" />
              Add Tenant
            </Button>
            <Button asChild variant="outline">
              <Link to={paths.dashboard}>Back to dashboard</Link>
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Active" value={String(activeTenants)} helper="Production tenants" tone="success" />
        <SummaryCard label="Trial" value={String(trialTenants)} helper="New or evaluating accounts" tone="info" />
        <SummaryCard label="Paused" value={String(pausedTenants)} helper="Commercial or ops review needed" tone="warning" />
        <SummaryCard
          label="Needs attention"
          value={String(attentionTenants)}
          helper="Paused or high-activity tenants"
          tone="danger"
        />
      </div>

      {feedback ? (
        <div className="rounded-2xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {feedback}
        </div>
      ) : null}

      <PlatformPanel title="Provisioning shortcuts" description="Use sample tenants only for mock setup and demos.">
        <div className="flex flex-wrap items-center gap-3">
          {[
            { label: "Sample: Region -> Zone", code: "region-zone" as const },
            { label: "Sample: Region -> Branch", code: "region-branch" as const },
            { label: "Sample: Region -> Zone -> Branch -> SubBranch", code: "region-zone-branch-subbranch" as const },
          ].map((item) => (
            <Button key={item.code} variant="outline" size="sm" onClick={() => handleQuickCreate(item.code)}>
              {item.label}
            </Button>
          ))}
          <p className="text-sm text-muted-foreground">
            Each sample tenant includes a bootstrap user, starter role, and persisted platform records.
          </p>
        </div>
      </PlatformPanel>

      <PlatformFilterBar
        searchValue={search}
        searchPlaceholder="Search by tenant name, code, region, or industry"
        onSearchChange={setSearch}
        filters={
          <>
            <Select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="trial">Trial</option>
              <option value="paused">Paused</option>
            </Select>
            <Select value={planFilter} onChange={(event) => setPlanFilter(event.target.value)}>
              <option value="all">All plans</option>
              {plans.map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.name}
                </option>
              ))}
            </Select>
            <Select value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
              <option value="created_desc">Newest first</option>
              <option value="created_asc">Oldest first</option>
              <option value="name_asc">Name A-Z</option>
              <option value="name_desc">Name Z-A</option>
            </Select>
          </>
        }
        trailing={
          <div className="text-sm text-muted-foreground">
            {tenantRows.length} of {tenants.length} tenants shown
          </div>
        }
      />

      {tenantRows.length ? (
        <PlatformPanel
          title="Tenant directory"
          description="Platform-owned identity, commercial plan, bootstrap context, starting hierarchy, and operational health."
        >
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-[0.16em] text-muted-foreground">
                <tr>
                  {["Tenant", "Commercial", "Bootstrap", "Hierarchy", "Health", "Actions"].map((header) => (
                    <th key={header} className="border-b border-border/70 bg-muted/[0.38] px-4 py-3 font-semibold">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tenantRows.map((tenant) => {
                  const primaryAdmin = getTenantPrimaryAdminUser(tenant.id);
                  const plan = planMap.get(tenant.planId);
                  const topModules = tenant.enabledModuleCodes
                    .slice(0, 3)
                    .map((code) => moduleMap.get(code)?.name ?? code);

                  return (
                    <tr
                      key={tenant.id}
                      className={`border-t border-border/65 align-top transition-colors hover:bg-primary/[0.03] ${
                        tenant.status === "paused"
                          ? "bg-rose-50/45"
                          : tenant.status === "trial"
                            ? "bg-sky-50/45"
                            : tenant.health.auditEvents24h >= 20
                              ? "bg-amber-50/45"
                              : ""
                      }`}
                    >
                      <td className="px-4 py-4 align-top">
                        <div
                          className={`min-w-[220px] border-l-2 pl-3 ${
                            tenant.status === "active"
                              ? "border-emerald-400/70"
                              : tenant.status === "trial"
                                ? "border-sky-400/70"
                                : "border-rose-400/70"
                          }`}
                        >
                          <Link
                            to={paths.tenant(tenant.id)}
                            className="font-medium tracking-[-0.01em] hover:underline"
                          >
                            {tenant.name}
                          </Link>
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <Badge variant="outline">{tenant.code}</Badge>
                            <Badge
                              variant={
                                tenant.status === "active"
                                  ? "success"
                                  : tenant.status === "trial"
                                    ? "info"
                                    : "danger"
                              }
                            >
                              {tenant.status}
                            </Badge>
                            <Badge variant="secondary">{getTenantTypeLabel(tenant.tenantType)}</Badge>
                            {tenant.customerPortalEnabled ? <Badge variant="info">Customer portal</Badge> : null}
                          </div>
                          <p className="mt-2 text-xs leading-5 text-muted-foreground">
                            {tenant.region} - {tenant.industry}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-4 align-top">
                        <div className="min-w-[200px]">
                          <p className="font-medium">{plan?.name ?? tenant.planId}</p>
                          <p className="mt-1 text-xs leading-5 text-muted-foreground">
                            {getTenantTypeMeta(tenant.tenantType).operatingStyle}
                          </p>
                          <p className="mt-1 text-xs leading-5 text-muted-foreground">
                            {getAssignmentModeLabel(tenant.assignmentMode)} - {getCommercialModeLabel(tenant.commercialMode)}
                          </p>
                          <p className="mt-1 text-xs leading-5 text-muted-foreground">
                            {tenant.enabledModuleCodes.length} modules enabled
                          </p>
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {topModules.map((name) => (
                              <Badge key={`${tenant.id}-${name}`} variant="accent">
                                {name}
                              </Badge>
                            ))}
                            {tenant.enabledModuleCodes.length > 3 ? (
                              <Badge variant="outline">+{tenant.enabledModuleCodes.length - 3}</Badge>
                            ) : null}
                          </div>
                          <p className="mt-3 text-xs leading-5 text-muted-foreground">
                            {getTenantOwnershipSummary(tenant)}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-4 align-top">
                        <div className="min-w-[220px]">
                          <p className="font-medium">{primaryAdmin?.name ?? "Bootstrap user unavailable"}</p>
                          <p className="mt-1 text-xs leading-5 text-muted-foreground">
                            {primaryAdmin?.email ?? "No email available"}
                          </p>
                          <p className="mt-2 text-xs leading-5 text-muted-foreground">
                            Created {formatDate(tenant.createdAt)}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-4 align-top">
                        <div className="min-w-[190px]">
                          <p className="font-medium">
                            {templateLabel(tenant.initialHierarchyTemplate as HierarchyTemplateCode)}
                          </p>
                          <p className="mt-1 text-xs leading-5 text-muted-foreground">
                            Starting blueprint only. Ongoing hierarchy remains tenant-owned.
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-4 align-top">
                        <div className="min-w-[180px] space-y-1.5 text-xs text-muted-foreground">
                          <p>
                            <span className="font-medium text-foreground">{tenant.health.activeUsers}</span> active
                            users
                          </p>
                          <p>
                            <span className="font-medium text-foreground">
                              {tenant.health.monthlyBookings.toLocaleString()}
                            </span>{" "}
                            monthly bookings
                          </p>
                          <p>
                            <span
                              className={
                                tenant.health.auditEvents24h >= 20
                                  ? "font-medium text-amber-700"
                                  : "font-medium text-foreground"
                              }
                            >
                              {tenant.health.auditEvents24h}
                            </span>{" "}
                            audit events / 24h
                          </p>
                          {tenant.status !== "active" || tenant.health.auditEvents24h >= 20 ? (
                            <Badge variant={tenant.status === "paused" ? "danger" : "warning"}>
                              Needs review
                            </Badge>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-4 py-4 align-top">
                        <div className="flex min-w-[220px] flex-wrap gap-2">
                          <Button asChild size="sm" variant="ghost">
                            <Link to={paths.tenant(tenant.id)}>View details</Link>
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openTenantWorkspace(tenant.id, tenant.name)}
                          >
                            <ExternalLink className="size-4" />
                            Tenant admin
                          </Button>
                          <Button size="sm" onClick={() => openTenantWorkspace(tenant.id, tenant.name)}>
                            <UserRoundCog className="size-4" />
                            Impersonate
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </PlatformPanel>
      ) : (
        <PlatformEmptyState
          title="No tenants match the current view"
          description={
            tenants.length
              ? "Adjust the search or filters to widen the platform tenant directory."
              : "Create the first tenant to start using the platform control plane."
          }
          action={
            !tenants.length ? (
              <Button onClick={openWizard}>
                <Plus className="size-4" />
                Create first tenant
              </Button>
            ) : null
          }
        />
      )}

      <Dialog
        open={open}
        onOpenChange={setOpen}
        title="Tenant Setup Wizard"
        description={`Step ${step + 1} of 6 - ${wizardSteps[step]}`}
        footer={
          <div className="flex w-full flex-wrap items-center justify-between gap-3">
            <div className="flex gap-2">
              {wizardSteps.map((wizardStep, index) => (
                <Badge key={wizardStep} variant={index === step ? "default" : "outline"}>
                  {index + 1}
                </Badge>
              ))}
            </div>
            <div className="flex gap-3">
              {step > 0 && !createdTenant ? (
                <Button variant="ghost" onClick={() => setStep((current) => current - 1)}>
                  Back
                </Button>
              ) : null}
              {!createdTenant ? <Button onClick={nextStep}>{step === 5 ? "Create Tenant" : "Next"}</Button> : null}
            </div>
          </div>
        }
      >
        <div className="space-y-5">
          {error ? (
            <div className="rounded-2xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          ) : null}

          {step === 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Tenant name" helper="Platform-facing tenant identity label.">
                <Input value={form.name} onChange={(event) => update("name", event.target.value)} />
              </Field>
              <Field label="Tenant code / slug" helper="Used as the stable tenant reference in platform operations.">
                <Input value={form.code} onChange={(event) => update("code", event.target.value)} />
              </Field>
              <Field label="Status">
                <Select
                  value={form.status}
                  onChange={(event) => update("status", event.target.value as CreateTenantInput["status"])}
                >
                  <option value="active">Active</option>
                  <option value="trial">Trial</option>
                  <option value="paused">Paused</option>
                </Select>
              </Field>
              <Field label="Plan">
                <Select value={form.planId} onChange={(event) => update("planId", event.target.value)}>
                  {plans.map((plan) => (
                    <option key={plan.id} value={plan.id}>
                      {plan.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <div className="md:col-span-2">
                <Field label="Notes" helper="Optional internal notes for the provisioning workflow.">
                  <Textarea value={form.notes} onChange={(event) => update("notes", event.target.value)} />
                </Field>
              </div>
            </div>
          ) : null}

          {step === 1 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {tenantTypeOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => update("tenantType", option.value)}
                  className={`rounded-3xl border px-5 py-5 text-left transition ${
                    form.tenantType === option.value ? "border-primary/40 bg-primary/8" : "bg-muted/35"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{option.label}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{option.description}</p>
                    </div>
                    <Badge variant={form.tenantType === option.value ? "default" : "outline"}>{option.value}</Badge>
                  </div>
                  <p className="mt-4 text-sm text-foreground/85">{option.instruction}</p>
                  <p className="mt-3 text-xs uppercase tracking-[0.14em] text-muted-foreground">Examples</p>
                  <p className="mt-1 text-sm text-muted-foreground">{option.examples.join(", ")}</p>
                </button>
              ))}
            </div>
          ) : null}

          {step === 2 ? (
            <div className="space-y-4">
              <div className="rounded-3xl border bg-background/80 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-medium">Enable Customer Portal Access</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Allow customer users under this tenant to login and participate in booking/tracking workflows.
                    </p>
                  </div>
                  <Switch
                    checked={form.customerPortalEnabled}
                    onCheckedChange={(checked) => update("customerPortalEnabled", checked)}
                  />
                </div>
                <div className="mt-4 rounded-2xl border border-sky-200/70 bg-sky-50/60 p-4 text-sm text-sky-900">
                  {form.tenantType === "LOGISTICS_PROVIDER_3PL"
                    ? form.customerPortalEnabled
                      ? "Hybrid behavior enabled: customer portal users can access only their linked-customer bookings, invoices, LR, POD, and documents while tenant internal users retain operational control."
                      : "Standard 3PL behavior: internal tenant users manage customer bookings and operations without customer portal logins."
                    : "This toggle is primarily intended for 3PL tenants. Existing routes and modules remain unchanged."}
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <div className="rounded-2xl border bg-background/80 p-4">
                    <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Assignment Mode</p>
                    <p className="mt-2 font-medium">{getAssignmentModeLabel(formAssignmentMode)}</p>
                  </div>
                  <div className="rounded-2xl border bg-background/80 p-4">
                    <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Commercial Mode</p>
                    <p className="mt-2 font-medium">{getCommercialModeLabel(formCommercialMode)}</p>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {step === 3 ? (
            <div className="grid gap-4">
              <div className="rounded-2xl border bg-background/80 p-4">
                <p className="text-sm font-medium">Enabled modules</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  These platform-level module assignments are provisioned immediately for the new tenant.
                </p>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  {activeModules.map((module) => {
                    const checked = form.enabledModuleCodes.includes(module.code);
                    return (
                      <button
                        key={module.id}
                        type="button"
                        onClick={() =>
                          update(
                            "enabledModuleCodes",
                            checked
                              ? form.enabledModuleCodes.filter((code) => code !== module.code)
                              : [...form.enabledModuleCodes, module.code],
                          )
                        }
                        className={`rounded-2xl border px-4 py-4 text-left transition ${
                          checked ? "border-primary/40 bg-primary/8" : "bg-muted/35"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-medium">{module.name}</p>
                            <p className="mt-1 text-sm text-muted-foreground">{module.description}</p>
                          </div>
                          <Badge variant={module.status === "active" ? "success" : "warning"}>{module.status}</Badge>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="rounded-2xl border bg-background/80 p-4">
                <p className="text-sm font-medium">Starting hierarchy template</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Existing hierarchy architecture remains unchanged. This only chooses the bootstrap blueprint.
                </p>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  {hierarchyTemplateOptions.map((option) => (
                    <button
                      key={option.code}
                      type="button"
                      onClick={() => update("defaultHierarchyTemplate", option.code)}
                      className={`rounded-2xl border px-4 py-4 text-left transition ${
                        form.defaultHierarchyTemplate === option.code ? "border-primary/40 bg-primary/8" : "bg-muted/35"
                      }`}
                    >
                      <p className="font-medium">{option.label}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{option.path}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : null}

          {step === 4 ? (
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Primary contact name">
                <Input
                  value={form.primaryContactName}
                  onChange={(event) => update("primaryContactName", event.target.value)}
                />
              </Field>
              <Field label="Primary contact email">
                <Input
                  value={form.primaryContactEmail}
                  onChange={(event) => update("primaryContactEmail", event.target.value)}
                />
              </Field>
              <Field label="Starter role" helper="Bootstrap role for the first tenant login user.">
                <Select
                  value={form.starterRole}
                  onChange={(event) => update("starterRole", event.target.value as CreateTenantInput["starterRole"])}
                >
                  <option value="tenant_admin">Tenant Admin</option>
                  <option value="ceo">CEO</option>
                </Select>
              </Field>
              <div className="md:col-span-2 rounded-2xl border border-amber-200 bg-amber-50/70 p-4 text-sm text-amber-900">
                Internal users, customer portal users, vendor users, and driver users continue to use the same shared user architecture.
              </div>
            </div>
          ) : null}

          {step === 5 && !createdTenant ? (
            <div className="space-y-4">
              <ReviewItem label="Tenant Name">{form.name || "-"}</ReviewItem>
              <ReviewItem label="Tenant Type">{getTenantTypeLabel(form.tenantType)}</ReviewItem>
              <ReviewItem label="Operating Style">{getTenantTypeMeta(form.tenantType).operatingStyle}</ReviewItem>
              <ReviewItem label="Assignment Mode">{getAssignmentModeLabel(formAssignmentMode)}</ReviewItem>
              <ReviewItem label="Commercial Mode">{getCommercialModeLabel(formCommercialMode)}</ReviewItem>
              <ReviewItem label="Customer Portal Status">{form.customerPortalEnabled ? "Enabled" : "Disabled"}</ReviewItem>
              <ReviewItem label="Enabled Modules">
                {form.enabledModuleCodes.length
                  ? form.enabledModuleCodes.map((code) => moduleMap.get(code)?.name ?? code).join(", ")
                  : "No modules selected"}
              </ReviewItem>
              <ReviewItem label="Initial Admin User">
                {form.primaryContactName || "-"} {form.primaryContactEmail ? `- ${form.primaryContactEmail}` : ""}
              </ReviewItem>
              <div className="rounded-3xl border bg-card/95 p-5 shadow-panel">
                <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                  Operational Ownership Summary
                </p>
                <p className="mt-3 text-base font-medium">
                  {getTenantOperationalSummary({
                    name: form.name || "This tenant",
                    tenantType: form.tenantType,
                    customerPortalEnabled: form.customerPortalEnabled,
                  })}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">{getTenantOwnershipSummary(form)}</p>
              </div>
            </div>
          ) : null}

          {step === 5 && createdTenant ? (
            <div className="space-y-5">
              <div className="rounded-3xl border border-emerald-300 bg-emerald-50 p-6 text-emerald-800">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="size-5" />
                  <div>
                    <p className="font-medium">Tenant created successfully</p>
                    <p className="text-sm">
                      {getTenantOperationalSummary(createdTenant)}
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button
                  onClick={() => {
                    setOpen(false);
                    openTenantWorkspace(createdTenant.id, createdTenant.name);
                  }}
                >
                  Open Tenant Admin
                </Button>
                <Button asChild variant="outline">
                  <Link to={paths.tenant(createdTenant.id)}>Review tenant detail</Link>
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setCreatedTenantId(null);
                    setStep(0);
                    setForm({
                      ...initialForm,
                      planId: plans[0]?.id ?? "",
                      enabledModuleCodes: defaultModuleCodes,
                    });
                  }}
                >
                  Create Another Tenant
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </Dialog>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  helper,
  tone,
}: {
  label: string;
  value: string;
  helper: string;
  tone: "success" | "info" | "warning" | "danger";
}) {
  return (
    <div
      className={`rounded-3xl border-l-4 bg-card/96 p-4 shadow-panel ${
        tone === "success"
          ? "border-l-emerald-500"
          : tone === "info"
            ? "border-l-sky-500"
            : tone === "warning"
              ? "border-l-amber-500"
              : "border-l-rose-500"
      }`}
    >
      <p className="text-[12px] font-medium uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-[1.8rem] font-semibold tracking-[-0.02em]">{value}</p>
      <p className="mt-2 text-xs leading-5 text-muted-foreground">{helper}</p>
    </div>
  );
}

function Field({
  label,
  children,
  helper,
}: {
  label: string;
  children: ReactNode;
  helper?: string;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      {children}
      {helper ? <p className="text-xs text-muted-foreground">{helper}</p> : null}
    </div>
  );
}

function ReviewItem({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl border bg-background/80 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{children}</span>
    </div>
  );
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString();
}

function templateLabel(template: HierarchyTemplateCode) {
  return hierarchyTemplateOptions.find((item) => item.code === template)?.label ?? template;
}
