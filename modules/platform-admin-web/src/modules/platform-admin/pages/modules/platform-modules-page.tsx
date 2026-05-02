import { useMemo, useState, type ReactNode } from "react";
import { Boxes, Layers3, PencilLine, Plus } from "lucide-react";
import { z } from "zod";
import { PageHeader } from "../../../../components/common/page-header";
import { PlatformEmptyState, PlatformFilterBar, PlatformPanel } from "../../../../components/platform/platform-primitives";
import { Badge } from "../../../../components/ui/badge";
import { Button } from "../../../../components/ui/button";
import { Dialog } from "../../../../components/ui/dialog";
import { Input } from "../../../../components/ui/input";
import { Select } from "../../../../components/ui/select";
import { Textarea } from "../../../../components/ui/textarea";
import { usePlatformModules } from "../../hooks/usePlatformModules";
import { useTenants } from "../../hooks/useTenants";
import type { PlatformModule } from "../../../../types/platform";

const moduleSchema = z.object({
  code: z.string().trim().min(2, "Module code is required."),
  name: z.string().trim().min(2, "Module name is required."),
  category: z.enum(["Operations", "Fleet", "Procurement", "Finance"]),
  description: z.string().trim().min(8, "Module description is required."),
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
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [editingModule, setEditingModule] = useState<PlatformModule | null>(null);
  const [form, setForm] = useState(initialForm);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const enrichedModules = useMemo(
    () =>
      modules.map((module) => ({
        ...module,
        tenantCount: tenants.filter((tenant) => tenant.enabledModuleCodes.includes(module.code)).length,
      })),
    [modules, tenants],
  );

  const visibleModules = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return enrichedModules.filter((module) => {
      if (
        normalizedSearch &&
        !`${module.name} ${module.description} ${module.code}`.toLowerCase().includes(normalizedSearch)
      ) {
        return false;
      }
      if (categoryFilter !== "all" && module.category !== categoryFilter) {
        return false;
      }
      if (statusFilter !== "all" && module.status !== statusFilter) {
        return false;
      }
      return true;
    });
  }, [categoryFilter, enrichedModules, search, statusFilter]);

  function openCreate() {
    setEditingModule(null);
    setForm(initialForm);
    setError("");
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
    setError("");
    setOpen(true);
  }

  function submitModule() {
    const parsed = moduleSchema.safeParse(form);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Complete the required module fields.");
      return;
    }
    try {
      if (editingModule) {
        updateModule(editingModule.id, parsed.data);
        setMessage("Platform module updated successfully.");
      } else {
        createModule(parsed.data);
        setMessage("Platform module created successfully.");
      }
      setOpen(false);
      setError("");
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "Module could not be saved.");
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Platform Modules"
        title="Module Catalog"
        description="Manage the platform-owned module master used for tenant enablement, role mapping, and tenant access control."
        action={
          <Button onClick={openCreate}>
            <Plus className="size-4" />
            Add Module
          </Button>
        }
      />

      {message ? (
        <div className="rounded-xl border border-success/20 bg-success/10 px-4 py-3 text-sm text-success">
          {message}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        <SummaryCard label="Catalog modules" value={String(modules.length)} icon={<Boxes className="size-4" />} tone="accent" />
        <SummaryCard
          label="Active modules"
          value={String(modules.filter((module) => module.status === "active").length)}
          icon={<Layers3 className="size-4" />}
          tone="success"
        />
        <SummaryCard
          label="Tenant enablements"
          value={String(enrichedModules.reduce((total, module) => total + module.tenantCount, 0))}
          icon={<Boxes className="size-4" />}
          tone="info"
        />
      </div>

      <PlatformFilterBar
        searchValue={search}
        searchPlaceholder="Search modules by name, code, or description"
        onSearchChange={setSearch}
        filters={
          <>
            <Select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
              <option value="all">All categories</option>
              <option value="Operations">Operations</option>
              <option value="Fleet">Fleet</option>
              <option value="Procurement">Procurement</option>
              <option value="Finance">Finance</option>
            </Select>
            <Select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </Select>
          </>
        }
        trailing={<div className="text-sm text-muted-foreground">{visibleModules.length} modules shown</div>}
      />

      {visibleModules.length ? (
        <PlatformPanel
          title="Module catalog"
          description="Platform-owned module master with tenant enablement visibility and lifecycle controls."
        >
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-left text-muted-foreground">
                <tr>
                  {["Module", "Category", "Status", "Enabled by", "Actions"].map((header) => (
                    <th key={header} className="border-b border-gray-200 bg-gray-50 px-4 py-3 text-xs font-bold uppercase tracking-wide text-gray-500">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visibleModules.map((module, index) => (
                  <tr key={module.id} className={`${index ? "border-t border-gray-200" : ""} transition-colors hover:bg-gray-50`}>
                    <td className="px-4 py-3.5">
                      <div className="min-w-[240px]">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{module.name}</p>
                          <Badge variant="outline">{module.code}</Badge>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">{module.description}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <Badge variant={categoryVariant(module.category)}>{module.category}</Badge>
                    </td>
                    <td className="px-4 py-3.5">
                      <Badge variant={module.status === "active" ? "success" : "warning"}>{module.status}</Badge>
                    </td>
                    <td className="px-4 py-3.5">{module.tenantCount} tenants</td>
                    <td className="px-4 py-3.5">
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="ghost" onClick={() => openEdit(module)}>
                          <PencilLine className="size-4" />
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            updateModule(module.id, {
                              status: module.status === "active" ? "inactive" : "active",
                            });
                            setMessage(
                              `${module.name} marked as ${module.status === "active" ? "inactive" : "active"}.`,
                            );
                          }}
                        >
                          {module.status === "active" ? "Deactivate" : "Activate"}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </PlatformPanel>
      ) : (
        <PlatformEmptyState
          title="No modules match the current filters"
          description="Adjust the module search or filters to widen the catalog view."
          action={<Button onClick={openCreate}>Add Module</Button>}
        />
      )}

      <Dialog
        open={open}
        onOpenChange={setOpen}
        title={editingModule ? "Edit Module" : "Add Module"}
        description="Platform modules define what can be enabled per tenant and mapped to tenant roles."
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={submitModule}>{editingModule ? "Save Changes" : "Create Module"}</Button>
          </div>
        }
      >
        <div className="grid gap-4 md:grid-cols-2">
          {error ? (
            <div className="md:col-span-2 rounded-xl border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-danger">
              {error}
            </div>
          ) : null}
          <Field label="Module code" helper="Must be unique platform-wide.">
            <Input value={form.code} onChange={(event) => setForm((current) => ({ ...current, code: event.target.value.toUpperCase() }))} />
          </Field>
          <Field label="Module name">
            <Input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
          </Field>
          <Field label="Category">
            <Select value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value as PlatformModule["category"] }))}>
              <option value="Operations">Operations</option>
              <option value="Fleet">Fleet</option>
              <option value="Procurement">Procurement</option>
              <option value="Finance">Finance</option>
            </Select>
          </Field>
          <Field label="Status">
            <Select value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as PlatformModule["status"] }))}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </Select>
          </Field>
          <div className="md:col-span-2">
            <Field label="Description">
              <Textarea value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} className="min-h-[120px]" />
            </Field>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: string;
  icon: ReactNode;
  tone: "accent" | "success" | "info";
}) {
  return (
    <div
      className={`rounded-xl border bg-white p-5 shadow-sm ${
        tone === "accent" ? "border-primary/20" : tone === "success" ? "border-success/20" : "border-primary/20"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
        <div
          className={`rounded-xl p-3 ${
            tone === "accent"
              ? "bg-primary/10 text-primary"
              : tone === "success"
                ? "bg-success/10 text-success"
                : "bg-primary/10 text-primary"
          }`}
        >
          {icon}
        </div>
      </div>
      <p className="mt-3 text-3xl font-extrabold text-text">{value}</p>
    </div>
  );
}

function Field({
  label,
  helper,
  children,
}: {
  label: string;
  helper?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</label>
      {children}
      {helper ? <p className="text-xs text-muted-foreground">{helper}</p> : null}
    </div>
  );
}

function categoryVariant(category: PlatformModule["category"]) {
  switch (category) {
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
