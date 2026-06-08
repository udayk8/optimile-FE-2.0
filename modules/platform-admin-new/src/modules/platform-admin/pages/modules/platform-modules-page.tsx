import { useEffect, useMemo, useState, type ComponentType, type ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import { CheckCircle2, Layers, Package2, Pencil, Plus, Power, Search, Users } from "lucide-react";
import { z } from "zod";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Dialog } from "@/shared/components/ui/dialog";
import { Input } from "@/shared/components/ui/input";
import { Select } from "@/shared/components/ui/select";
import { Textarea } from "@/shared/components/ui/textarea";
import { usePlatformModules } from "@/modules/platform-admin/hooks/usePlatformModules";
import { useTenants } from "@/modules/platform-admin/hooks/useTenants";
import { displayModule, getModuleDisplayName, getModuleDisplayCode } from "@/modules/platform-admin/lib/module-display";
import { ConfirmDialog } from "@/modules/platform-admin/components/platform-primitives";
import type { PlatformModule } from "@/types/platform";

const moduleSchema = z.object({
  code: z.string().trim().min(2, "Module code is required"),
  name: z.string().trim().min(2, "Module name is required"),
  category: z.enum(["Administration", "Operations", "Fleet", "Procurement", "Finance"]),
  description: z.string().trim().min(4, "Description is required"),
  status: z.enum(["active", "inactive"]),
});

const initialForm: Omit<PlatformModule, "id"> = {
  code: "",
  name: "",
  category: "Operations",
  description: "",
  status: "active",
};

export function PlatformModulesPage() {
  const { data: modules, createModule, updateModule } = usePlatformModules();
  const { data: tenants } = useTenants();
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState(parseModuleStatusParam(searchParams.get("status")));

  // Apply the status filter when arriving from a dashboard stat-card deep link.
  useEffect(() => {
    setStatusFilter(parseModuleStatusParam(searchParams.get("status")));
  }, [searchParams]);
  const [open, setOpen] = useState(false);
  const [editingModule, setEditingModule] = useState<PlatformModule | null>(null);
  const [form, setForm] = useState(initialForm);
  const [formError, setFormError] = useState("");
  const [tenantListModule, setTenantListModule] = useState<PlatformModule | null>(null);
  const [pendingDeactivate, setPendingDeactivate] = useState<PlatformModule | null>(null);

  const enriched = useMemo(
    () =>
      modules.map((module) => {
        const display = displayModule(module);
        return {
          ...module,
          displayName: display.name,
          displayCode: display.code,
          tenantCount: tenants.filter((tenant) => tenant.enabledModuleCodes.includes(module.code)).length,
        };
      }),
    [modules, tenants],
  );

  const visibleModules = useMemo(() => {
    const query = search.trim().toLowerCase();
    return enriched.filter((module) => {
      if (query) {
        const haystack = `${module.displayName} ${module.displayCode} ${module.name} ${module.code} ${module.description} ${module.category} ${module.folderPath ?? ""} ${module.startRoute ?? ""}`.toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      if (categoryFilter !== "all" && module.category !== categoryFilter) return false;
      if (statusFilter !== "all" && module.status !== statusFilter) return false;
      return true;
    });
  }, [categoryFilter, enriched, search, statusFilter]);

  const totalModules = modules.length;
  const totalTenants = tenants.length;
  const activeModulesCount = modules.filter((module) => module.status === "active").length;
  const totalEnablements = enriched.reduce((total, module) => total + module.tenantCount, 0);

  function openCreate() {
    setEditingModule(null);
    setForm(initialForm);
    setFormError("");
    setOpen(true);
  }

  function openEdit(module: PlatformModule) {
    setEditingModule(module);
    setForm({
      code: module.code,
      name: module.name,
      category: module.category,
      description: module.description,
      status: module.status,
    });
    setFormError("");
    setOpen(true);
  }

  function submitModule() {
    const parsed = moduleSchema.safeParse(form);
    if (!parsed.success) {
      setFormError(parsed.error.issues[0]?.message ?? "Complete the form");
      return;
    }
    try {
      if (editingModule) {
        updateModule(editingModule.id, parsed.data);
      } else {
        createModule(parsed.data);
      }
      setOpen(false);
    } catch (submitError) {
      setFormError(submitError instanceof Error ? submitError.message : "Module could not be saved");
    }
  }

  function requestToggleStatus(module: PlatformModule) {
    // Deactivating is platform-wide and affects every tenant using the module,
    // so confirm it. Activating is benign and applies immediately.
    if (module.status === "active") {
      setPendingDeactivate(module);
    } else {
      updateModule(module.id, { status: "active" });
    }
  }

  function confirmDeactivate() {
    if (!pendingDeactivate) return;
    updateModule(pendingDeactivate.id, { status: "inactive" });
    setPendingDeactivate(null);
  }

  const pendingDeactivateTenantCount = pendingDeactivate
    ? tenants.filter((tenant) => tenant.enabledModuleCodes.includes(pendingDeactivate.code)).length
    : 0;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[20px] font-semibold tracking-[-0.01em] text-slate-900">Modules</h1>
          <p className="mt-0.5 text-[13px] text-slate-500">Catalog of platform modules.</p>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="size-4" />
          Add Module
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat
          label="Total Modules"
          value={totalModules}
          hint="In catalog"
          icon={Package2}
          tone="slate"
          active={statusFilter === "all"}
          onClick={() => setStatusFilter("all")}
        />
        <Stat
          label="Active Modules"
          value={activeModulesCount}
          hint={`${activeModulesCount} of ${totalModules} enabled`}
          icon={CheckCircle2}
          tone="emerald"
          active={statusFilter === "active"}
          onClick={() => setStatusFilter("active")}
        />
        <Stat
          label="Tenant Enablements"
          value={totalEnablements}
          hint="Module activations across tenants"
          icon={Layers}
          tone="indigo"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-card px-3 py-2.5">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name, code, description, or route"
            className="h-9 pl-9"
          />
        </div>
        <Select
          value={categoryFilter}
          onChange={(event) => setCategoryFilter(event.target.value)}
          className="h-9 w-auto min-w-[150px]"
        >
          <option value="all">All categories</option>
          <option value="Administration">Administration</option>
          <option value="Operations">Operations</option>
          <option value="Fleet">Fleet</option>
          <option value="Procurement">Procurement</option>
          <option value="Finance">Finance</option>
        </Select>
        <Select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}
          className="h-9 w-auto min-w-[140px]"
        >
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </Select>
        <span className="ml-auto text-[12px] text-slate-500">{visibleModules.length} of {modules.length}</span>
      </div>

      <div className="overflow-hidden rounded-xl border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b bg-slate-50/60 text-left text-[11px] font-medium uppercase tracking-[0.08em] text-slate-500">
                <th className="px-4 py-2.5">Module</th>
                <th className="px-4 py-2.5">Source</th>
                <th className="px-4 py-2.5">Category</th>
                <th className="px-4 py-2.5">Status</th>
                <th className="px-4 py-2.5">Adoption</th>
                <th className="px-4 py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleModules.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-[13px] text-slate-500">
                    No modules match the current filters.
                    {search || categoryFilter !== "all" || statusFilter !== "all" ? (
                      <button
                        type="button"
                        onClick={() => {
                          setSearch("");
                          setCategoryFilter("all");
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
                visibleModules.map((module) => (
                  <tr key={module.id} className="border-b last:border-0 hover:bg-slate-50/60">
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-3">
                        <ModuleAvatar code={module.displayCode} />
                        <div className="min-w-0">
                          <p className="font-medium text-slate-900">{module.displayName}</p>
                          <p className="text-[11px] text-slate-500">{module.displayCode}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <p className="font-mono text-[11px] text-slate-500">{module.folderPath ?? "—"}</p>
                      <p className="font-mono text-[11px] text-slate-400">{module.startRoute ?? "—"}</p>
                    </td>
                    <td className="px-4 py-2.5">
                      <Badge variant={categoryVariant(module.category)}>{module.category}</Badge>
                    </td>
                    <td className="px-4 py-2.5">
                      <Badge variant={module.status === "active" ? "success" : "warning"}>{module.status}</Badge>
                    </td>
                    <td className="px-4 py-2.5">
                      <AdoptionCell count={module.tenantCount} total={totalTenants} />
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Edit"
                          className="h-7 w-7 p-0"
                          onClick={() => openEdit(module)}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          title={module.status === "active" ? "Deactivate" : "Activate"}
                          className="h-7 w-7 p-0"
                          onClick={() => requestToggleStatus(module)}
                        >
                          <Power className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          title="View Tenants"
                          className="h-7 w-7 p-0"
                          onClick={() => setTenantListModule(module)}
                        >
                          <Users className="size-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog
        open={open}
        onOpenChange={setOpen}
        title={editingModule ? "Edit Module" : "Add Module"}
        widthClassName="max-w-lg"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={submitModule}>
              {editingModule ? "Save Changes" : "Create Module"}
            </Button>
          </div>
        }
      >
        <div className="grid gap-3 md:grid-cols-2">
          {formError ? (
            <div className="md:col-span-2 rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-[12px] text-rose-700">
              {formError}
            </div>
          ) : null}
          <Field label="Module Code">
            <Input
              value={form.code}
              onChange={(event) => setForm((current) => ({ ...current, code: event.target.value.toUpperCase() }))}
            />
          </Field>
          <Field label="Module Name">
            <Input
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            />
          </Field>
          <Field label="Category">
            <Select
              value={form.category}
              onChange={(event) =>
                setForm((current) => ({ ...current, category: event.target.value as PlatformModule["category"] }))
              }
            >
              <option value="Administration">Administration</option>
              <option value="Operations">Operations</option>
              <option value="Fleet">Fleet</option>
              <option value="Procurement">Procurement</option>
              <option value="Finance">Finance</option>
            </Select>
          </Field>
          <Field label="Status">
            <Select
              value={form.status}
              onChange={(event) =>
                setForm((current) => ({ ...current, status: event.target.value as PlatformModule["status"] }))
              }
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </Select>
          </Field>
          <div className="md:col-span-2">
            <Field label="Description">
              <Textarea
                value={form.description}
                onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                className="min-h-[80px]"
              />
            </Field>
          </div>
        </div>
      </Dialog>

      <Dialog
        open={tenantListModule !== null}
        onOpenChange={(value) => {
          if (!value) setTenantListModule(null);
        }}
        title={tenantListModule ? `Tenants using ${getModuleDisplayName(tenantListModule.name, tenantListModule.code)}` : ""}
        widthClassName="max-w-md"
        footer={
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={() => setTenantListModule(null)}>Close</Button>
          </div>
        }
      >
        {tenantListModule ? <TenantList moduleCode={tenantListModule.code} /> : null}
      </Dialog>

      <ConfirmDialog
        open={pendingDeactivate !== null}
        tone="danger"
        title="Deactivate module?"
        confirmLabel="Deactivate"
        onCancel={() => setPendingDeactivate(null)}
        onConfirm={confirmDeactivate}
        body={
          pendingDeactivate ? (
            <>
              <span className="font-medium">{getModuleDisplayName(pendingDeactivate.name, pendingDeactivate.code)}</span> will
              be deactivated platform-wide. It will no longer be available for provisioning
              {pendingDeactivateTenantCount > 0 ? (
                <>
                  {" "}and is currently enabled for{" "}
                  <span className="font-medium">
                    {pendingDeactivateTenantCount} {pendingDeactivateTenantCount === 1 ? "tenant" : "tenants"}
                  </span>
                  .
                </>
              ) : (
                <>. No tenants currently enable it.</>
              )}
            </>
          ) : null
        }
      />
    </div>
  );
}

function TenantList({ moduleCode }: { moduleCode: string }) {
  const { data: tenants } = useTenants();
  const linked = tenants.filter((tenant) => tenant.enabledModuleCodes.includes(moduleCode));
  if (linked.length === 0) {
    return <p className="text-[13px] text-slate-500">No tenants currently enable this module.</p>;
  }
  return (
    <ul className="divide-y rounded-lg border">
      {linked.map((tenant) => (
        <li key={tenant.id} className="flex items-center justify-between px-3 py-2 text-[13px]">
          <span className="font-medium text-slate-900">{tenant.name}</span>
          <span className="text-[11px] text-slate-500">{tenant.code}</span>
        </li>
      ))}
    </ul>
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
  tone: "slate" | "emerald" | "indigo";
  active?: boolean;
  onClick?: () => void;
}) {
  const palette = {
    slate: "bg-slate-100 text-slate-700",
    emerald: "bg-emerald-100 text-emerald-700",
    indigo: "bg-indigo-100 text-indigo-700",
  }[tone];

  const content = (
    <>
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-slate-500">{label}</p>
        <div className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${palette}`}>
          <Icon className="size-4" />
        </div>
      </div>
      <p className="mt-2 text-[26px] font-semibold leading-none tracking-[-0.02em] text-slate-900">{value}</p>
      <p className="mt-1.5 text-[11px] text-slate-500">{hint}</p>
    </>
  );

  if (!onClick) {
    return <div className="flex flex-col rounded-xl border bg-card px-4 py-3.5">{content}</div>;
  }

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
      {content}
    </button>
  );
}

function ModuleAvatar({ code }: { code: string }) {
  return (
    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-[11px] font-semibold uppercase text-slate-600">
      {code.slice(0, 2)}
    </span>
  );
}

function AdoptionCell({ count, total }: { count: number; total: number }) {
  const pct = total === 0 ? 0 : Math.round((count / total) * 100);
  return (
    <div className="flex items-center gap-2.5">
      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
      </div>
      <span className="whitespace-nowrap text-[12px] text-slate-600">
        {count} {count === 1 ? "tenant" : "tenants"}
      </span>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[12px] font-medium text-slate-700">{label}</label>
      {children}
    </div>
  );
}

function parseModuleStatusParam(value: string | null): "all" | "active" | "inactive" {
  return value === "active" || value === "inactive" ? value : "all";
}

function categoryVariant(category: PlatformModule["category"]) {
  switch (category) {
    case "Administration":
      return "success" as const;
    case "Operations":
      return "accent" as const;
    case "Fleet":
      return "info" as const;
    case "Procurement":
      return "neutral" as const;
    default:
      return "warning" as const;
  }
}
