import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { DataTable } from "@/shared/components/common/data-table";
import { PageHeader } from "@/shared/components/common/page-header";
import {
  TenantEmptyState,
  TenantFilterBar,
  TenantPanel,
} from "@/modules/tenant-admin/components/tenant-primitives";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Dialog } from "@/shared/components/ui/dialog";
import { Input } from "@/shared/components/ui/input";
import { Select } from "@/shared/components/ui/select";
import { useTenantAuditLogs } from "@/modules/tenant-admin/hooks/useTenantAuditLogs";
import { useTenantCustomers } from "@/modules/tenant-admin/hooks/useTenantCustomers";
import { useTenantHierarchy } from "@/modules/tenant-admin/hooks/useTenantHierarchy";
import { useTenantModules } from "@/modules/tenant-admin/hooks/useTenantModules";
import { useTenantOrgTypes } from "@/modules/tenant-admin/hooks/useTenantOrgTypes";
import { useTenantOrgUnits } from "@/modules/tenant-admin/hooks/useTenantOrgUnits";
import { useTenantDrivers } from "@/modules/tenant-admin/hooks/useTenantFleet";
import { usePlatformModules } from "@/modules/platform-admin/hooks/usePlatformModules";
import { useTenantRolePermissions } from "@/modules/tenant-admin/hooks/useTenantRolePermissions";
import { useTenantRoles } from "@/modules/tenant-admin/hooks/useTenantRoles";
import { useTenantRouteContext } from "@/modules/tenant-admin/hooks/useTenantRouteContext";
import { useTenantUsers } from "@/modules/tenant-admin/hooks/useTenantUsers";
import { useTenantVendors } from "@/modules/tenant-admin/hooks/useTenantVendors";
import {
  TENANT_ADMIN_MODULE_CODE,
  TENANT_PERMISSION_ACTIONS,
  buildTenantModuleEntries,
  isBusinessHierarchyLevel,
  isTenantAdminRole,
  type TenantPermissionAction,
} from "@/modules/tenant-admin/lib/tenant-modules";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Eye,
  KeyRound,
  Pencil,
  Plus,
  Power,
  Search,
  ShieldCheck as ShieldCheckIcon,
  Trash2,
} from "lucide-react";
import { getHierarchyTemplateLabel } from "@/shared/lib/hierarchy-templates";
import {
  getAccessibleModuleCodes,
  normalizeModuleKey,
  normalizeModuleKeys,
  getUserTypeBadgeVariant,
  getUserTypeLabel,
  getUserTypeScopeLabel,
  hierarchyLabelSuggestions,
} from "@/shared/lib/tenant-admin";
import { getRoleBrdHoverText } from "@/shared/lib/role-brd-meta";
import { sortOrgUnitsByHierarchy, sortRolesByHierarchy } from "@/shared/lib/hierarchy-order";
import { getRoleScopeLevelLabel, isTenantLevelRole } from "@/shared/lib/role-scope-label";
import { formatRoleUserPlaceSummary } from "@/shared/lib/role-user-summary";
import { getRoleSuggestionLabel, sortRolesForUserType } from "@/shared/lib/tenant-rbac";
import type { OrgUnit, RolePermission, UserRecord, UserStatus, UserType } from "@/types/access";

const DEFAULT_HIERARCHY_LEVEL_NAMES = ["Region", "Zone", "Branch", "Sub-Branch", "Hub"] as const;
const MAX_HIERARCHY_LEVELS = 5;

export function TenantHierarchyPage() {
  const { tenantId } = useTenantRouteContext();
  const { data: hierarchyState, saveHierarchy } = useTenantHierarchy(tenantId);
  const { data: orgUnits } = useTenantOrgUnits(tenantId);
  const { data: roles } = useTenantRoles(tenantId);

  const storedLevels = useMemo(
    () => [...hierarchyState.hierarchy.levels].sort((a, b) => a.order - b.order),
    [hierarchyState.hierarchy.levels],
  );

  const [customEnabled, setCustomEnabled] = useState(storedLevels.length > 0);
  const [levelCount, setLevelCount] = useState(Math.max(1, Math.min(MAX_HIERARCHY_LEVELS, storedLevels.length || 3)));
  const [levelNames, setLevelNames] = useState<string[]>(() => {
    const names = storedLevels.map((level) => level.name);
    const padded = [...names];
    while (padded.length < MAX_HIERARCHY_LEVELS) {
      padded.push(DEFAULT_HIERARCHY_LEVEL_NAMES[padded.length] ?? `Level ${padded.length + 1}`);
    }
    return padded;
  });
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!feedback) return;
    const timer = window.setTimeout(() => setFeedback(""), 2500);
    return () => window.clearTimeout(timer);
  }, [feedback]);

  function updateName(index: number, value: string) {
    setLevelNames((current) => current.map((name, i) => (i === index ? value : name)));
  }

  function resetToDefault() {
    setLevelCount(3);
    setLevelNames([...DEFAULT_HIERARCHY_LEVEL_NAMES]);
    setError("");
  }

  function save() {
    const trimmed = levelNames.slice(0, levelCount).map((name) => name.trim());
    if (trimmed.some((name) => name.length < 1)) {
      setError("Every level needs a name.");
      return;
    }
    const lowercased = trimmed.map((name) => name.toLowerCase());
    if (new Set(lowercased).size !== lowercased.length) {
      setError("Level names must be unique.");
      return;
    }

    // Reuse existing level ids by order so org units stay linked to the same
    // level when names change.
    const nextLevels = trimmed.map((name, index) => {
      const existing = storedLevels[index];
      return {
        id: existing?.id ?? `level-${tenantId}-${index + 1}-${Date.now()}`,
        tenantId,
        order: index + 1,
        name,
        active: true,
      };
    });

    // Reject if shrinking would orphan org units / roles tied to dropped levels.
    if (storedLevels.length > nextLevels.length) {
      const droppedIds = new Set(storedLevels.slice(nextLevels.length).map((level) => level.id));
      const orphanUnit = orgUnits.some((unit) => droppedIds.has(unit.hierarchyLevelId));
      const orphanRole = roles.some((role) => droppedIds.has(role.hierarchyLevelId));
      if (orphanUnit || orphanRole) {
        setError(
          "Cannot shrink: there are org units or roles bound to the levels being removed. Reassign or delete those first.",
        );
        return;
      }
    }

    saveHierarchy({
      ...hierarchyState.hierarchy,
      levels: nextLevels,
      lastUpdated: new Date().toISOString(),
    });
    setError("");
    setFeedback("Hierarchy saved.");
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[20px] font-semibold tracking-[-0.01em] text-slate-900">Hierarchy Setup</h1>
          <p className="mt-0.5 text-[13px] text-slate-500">Define tenant business structure.</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={resetToDefault}>Reset to Default</Button>
          <Button size="sm" onClick={save}>Save Hierarchy</Button>
        </div>
      </div>

      {feedback ? (
        <div className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-[12px] text-emerald-800">
          {feedback}
        </div>
      ) : null}
      {error ? (
        <div className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-[12px] text-rose-700">
          {error}
        </div>
      ) : null}

      <div className="rounded-xl border bg-card p-4">
        <label className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[13px] font-semibold text-slate-900">Enable Custom Hierarchy</p>
            <p className="text-[12px] text-slate-500">Customize level names. When off, defaults are used.</p>
          </div>
          <input
            type="checkbox"
            className="size-4 accent-primary"
            checked={customEnabled}
            onChange={(event) => {
              const value = event.target.checked;
              setCustomEnabled(value);
              if (!value) {
                setLevelNames([...DEFAULT_HIERARCHY_LEVEL_NAMES]);
              }
            }}
          />
        </label>
      </div>

      <div className="rounded-xl border bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[13px] font-semibold text-slate-900">Number of Levels</p>
            <p className="text-[12px] text-slate-500">1 to {MAX_HIERARCHY_LEVELS} levels (tenant itself is not a level).</p>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={1}
              max={MAX_HIERARCHY_LEVELS}
              value={levelCount}
              onChange={(event) => setLevelCount(Number(event.target.value))}
              className="w-48 accent-primary"
            />
            <span className="min-w-[2ch] text-center text-[13px] font-semibold text-slate-900">{levelCount}</span>
          </div>
        </div>
      </div>

      <div className="rounded-xl border bg-card">
        <div className="border-b px-4 py-2.5">
          <h2 className="text-[13px] font-semibold text-slate-900">Level Names</h2>
        </div>
        <div className="space-y-2 p-3">
          {Array.from({ length: levelCount }).map((_, index) => (
            <div key={index} className="flex items-center gap-3">
              <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-md bg-slate-100 text-[11px] font-semibold text-slate-700">
                {index}
              </span>
              <div className="flex flex-1 items-center gap-2">
                <label className="w-[120px] text-[12px] text-slate-500">Level {index} Name</label>
                <Input
                  value={levelNames[index] ?? ""}
                  disabled={!customEnabled}
                  onChange={(event) => updateName(index, event.target.value)}
                  placeholder={DEFAULT_HIERARCHY_LEVEL_NAMES[index] ?? `Level ${index + 1}`}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border bg-card">
        <div className="border-b px-4 py-2.5">
          <h2 className="text-[13px] font-semibold text-slate-900">Preview</h2>
        </div>
        <div className="px-4 py-3 text-[13px] text-slate-700">
          {levelNames.slice(0, levelCount).map((name) => name.trim() || "—").join(" → ")}
        </div>
      </div>
    </div>
  );
}

export function TenantOrgUnitsPage() {
  const { tenantId } = useTenantRouteContext();
  const { data: levels } = useTenantOrgTypes(tenantId);
  const { data: orgUnits, createOrgUnit, updateOrgUnit, deleteOrgUnit } = useTenantOrgUnits(tenantId);

  const orderedLevels = useMemo(() => [...levels].sort((a, b) => a.order - b.order), [levels]);
  const levelMap = useMemo(() => new Map(orderedLevels.map((level) => [level.id, level.name])), [orderedLevels]);

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [form, setForm] = useState({
    name: "",
    hierarchyLevelId: orderedLevels[0]?.id ?? "",
    parentOrgUnitId: "",
    status: "active" as OrgUnit["status"],
  });

  useEffect(() => {
    if (!feedback) return;
    const timer = window.setTimeout(() => setFeedback(""), 2500);
    return () => window.clearTimeout(timer);
  }, [feedback]);

  const selectedLevelIndex = orderedLevels.findIndex((level) => level.id === form.hierarchyLevelId);
  const previousLevelId = selectedLevelIndex > 0 ? orderedLevels[selectedLevelIndex - 1]?.id ?? "" : "";
  const isRootLevel = selectedLevelIndex <= 0;
  const validParents = orgUnits.filter((unit) => unit.hierarchyLevelId === previousLevelId);

  const filteredOrgUnits = useMemo(() => {
    const q = search.trim().toLowerCase();
    return orgUnits.filter((unit) => {
      if (levelFilter !== "all" && unit.hierarchyLevelId !== levelFilter) return false;
      if (statusFilter !== "all" && unit.status !== statusFilter) return false;
      if (q) {
        const path = buildOrgUnitPath(unit.id, orgUnits);
        if (!`${unit.name} ${path} ${levelMap.get(unit.hierarchyLevelId) ?? ""}`.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [levelFilter, levelMap, orgUnits, search, statusFilter]);

  const activeCount = orgUnits.filter((unit) => unit.status === "active").length;
  const levelsUsed = new Set(orgUnits.map((unit) => unit.hierarchyLevelId)).size;

  function openCreate(parentOrgUnitId = "") {
    setEditingId(null);
    setError("");
    setForm({
      name: "",
      hierarchyLevelId: orderedLevels[0]?.id ?? "",
      parentOrgUnitId,
      status: "active",
    });
    setOpen(true);
  }

  function openEdit(unit: OrgUnit) {
    setEditingId(unit.id);
    setError("");
    setForm({
      name: unit.name,
      hierarchyLevelId: unit.hierarchyLevelId,
      parentOrgUnitId: unit.parentOrgUnitId ?? "",
      status: unit.status,
    });
    setOpen(true);
  }

  function save() {
    if (form.name.trim().length < 2) { setError("Name is required."); return; }
    if (!form.hierarchyLevelId) { setError("Choose a level."); return; }
    if (!isRootLevel && !form.parentOrgUnitId) { setError("Choose a parent org unit."); return; }
    const payload = {
      tenantId,
      name: form.name.trim(),
      hierarchyLevelId: form.hierarchyLevelId,
      parentOrgUnitId: isRootLevel ? null : form.parentOrgUnitId || null,
      status: form.status,
    };
    try {
      if (editingId) {
        updateOrgUnit(editingId, payload);
        setFeedback("Org unit updated.");
      } else {
        createOrgUnit(payload);
        setFeedback("Org unit created.");
      }
      setOpen(false);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save org unit.");
    }
  }

  function toggleStatus(unit: OrgUnit) {
    updateOrgUnit(unit.id, { status: unit.status === "active" ? "planned" : "active" });
    setFeedback(unit.status === "active" ? "Org unit disabled." : "Org unit enabled.");
  }

  function confirmDelete() {
    if (!confirmDeleteId) return;
    try {
      deleteOrgUnit(confirmDeleteId);
      setFeedback("Org unit deleted.");
    } catch (deleteError) {
      setFeedback(deleteError instanceof Error ? deleteError.message : "Could not delete.");
    }
    setConfirmDeleteId(null);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[20px] font-semibold tracking-[-0.01em] text-slate-900">Org Units</h1>
          <p className="mt-0.5 text-[13px] text-slate-500">Manage business locations and reporting structure.</p>
        </div>
        <Button size="sm" onClick={() => openCreate()}>
          <Plus className="size-4" />
          Add Org Unit
        </Button>
      </div>

      {feedback ? (
        <div className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-[12px] text-emerald-800">
          {feedback}
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-3">
        <CompactStat label="Total Org Units" value={orgUnits.length} />
        <CompactStat label="Active" value={activeCount} tone="emerald" />
        <CompactStat label="Levels Used" value={levelsUsed} tone="indigo" />
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-card px-3 py-2.5">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search org units"
            className="h-9 pl-9"
          />
        </div>
        <Select value={levelFilter} onChange={(event) => setLevelFilter(event.target.value)} className="h-9 w-auto min-w-[140px]">
          <option value="all">All levels</option>
          {orderedLevels.map((level) => (
            <option key={level.id} value={level.id}>{level.name}</option>
          ))}
        </Select>
        <Select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="h-9 w-auto min-w-[120px]">
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="planned">Planned</option>
        </Select>
        <span className="ml-auto text-[12px] text-slate-500">{filteredOrgUnits.length} of {orgUnits.length}</span>
      </div>

      <div className="overflow-hidden rounded-xl border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b bg-slate-50/60 text-left text-[11px] font-medium uppercase tracking-[0.08em] text-slate-500">
                <th className="px-4 py-2.5">Org Unit</th>
                <th className="px-4 py-2.5">Level</th>
                <th className="px-4 py-2.5">Parent</th>
                <th className="px-4 py-2.5">Path</th>
                <th className="px-4 py-2.5">Status</th>
                <th className="px-4 py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrgUnits.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-[13px] text-slate-500">
                    {orgUnits.length === 0 ? "No org units created yet." : "No org units match the current filters."}
                  </td>
                </tr>
              ) : (
                filteredOrgUnits.map((unit) => {
                  const parent = orgUnits.find((parentUnit) => parentUnit.id === unit.parentOrgUnitId);
                  return (
                    <tr key={unit.id} className="border-b last:border-0 hover:bg-slate-50/60">
                      <td className="px-4 py-2.5 font-medium text-slate-900">{unit.name}</td>
                      <td className="px-4 py-2.5 text-slate-700">{levelMap.get(unit.hierarchyLevelId) ?? "—"}</td>
                      <td className="px-4 py-2.5 text-slate-700">{parent?.name ?? "—"}</td>
                      <td className="px-4 py-2.5 text-slate-600">{buildOrgUnitPath(unit.id, orgUnits) || "—"}</td>
                      <td className="px-4 py-2.5">
                        <Badge variant={unit.status === "active" ? "success" : "warning"}>{unit.status}</Badge>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="sm" title="Add Child" className="h-7 w-7 p-0" onClick={() => openCreate(unit.id)}>
                            <Plus className="size-4" />
                          </Button>
                          <Button variant="ghost" size="sm" title="Edit" className="h-7 w-7 p-0" onClick={() => openEdit(unit)}>
                            <Pencil className="size-4" />
                          </Button>
                          <Button variant="ghost" size="sm" title={unit.status === "active" ? "Disable" : "Enable"} className="h-7 w-7 p-0" onClick={() => toggleStatus(unit)}>
                            <Power className="size-4" />
                          </Button>
                          <Button variant="ghost" size="sm" title="Delete" className="h-7 w-7 p-0" onClick={() => setConfirmDeleteId(unit.id)}>
                            <Trash2 className="size-4" />
                          </Button>
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

      {orgUnits.length > 0 ? (
        <section className="rounded-xl border bg-card">
          <div className="border-b px-4 py-2.5">
            <h2 className="text-[13px] font-semibold text-slate-900">Org Tree</h2>
          </div>
          <div className="p-3">
            <OrgTree units={orgUnits} levelMap={levelMap} />
          </div>
        </section>
      ) : null}

      <Dialog
        open={open}
        onOpenChange={(value) => { setOpen(value); if (!value) setError(""); }}
        title={editingId ? "Edit Org Unit" : "Add Org Unit"}
        widthClassName="max-w-md"
        footer={
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={save}>{editingId ? "Save" : "Create"}</Button>
          </div>
        }
      >
        <div className="grid gap-3">
          {error ? (
            <div className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-[12px] text-rose-700">{error}</div>
          ) : null}
          <div className="space-y-1.5">
            <label className="text-[12px] font-medium text-slate-700">Name</label>
            <Input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <label className="text-[12px] font-medium text-slate-700">Level</label>
            <Select
              value={form.hierarchyLevelId}
              onChange={(event) => setForm((current) => ({ ...current, hierarchyLevelId: event.target.value, parentOrgUnitId: "" }))}
            >
              {orderedLevels.map((level) => (
                <option key={level.id} value={level.id}>{level.name}</option>
              ))}
            </Select>
          </div>
          {!isRootLevel ? (
            <div className="space-y-1.5">
              <label className="text-[12px] font-medium text-slate-700">Parent</label>
              <Select
                value={form.parentOrgUnitId}
                onChange={(event) => setForm((current) => ({ ...current, parentOrgUnitId: event.target.value }))}
              >
                <option value="">Select parent</option>
                {validParents.map((parent) => (
                  <option key={parent.id} value={parent.id}>{parent.name}</option>
                ))}
              </Select>
            </div>
          ) : null}
          <div className="space-y-1.5">
            <label className="text-[12px] font-medium text-slate-700">Status</label>
            <Select
              value={form.status}
              onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as OrgUnit["status"] }))}
            >
              <option value="active">Active</option>
              <option value="planned">Planned</option>
            </Select>
          </div>
        </div>
      </Dialog>

      <Dialog
        open={!!confirmDeleteId}
        onOpenChange={(value) => { if (!value) setConfirmDeleteId(null); }}
        title="Delete Org Unit"
        widthClassName="max-w-sm"
        footer={
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="outline" onClick={() => setConfirmDeleteId(null)}>Cancel</Button>
            <Button size="sm" onClick={confirmDelete}>Delete</Button>
          </div>
        }
      >
        <p className="text-[13px] text-slate-600">Removing an org unit also removes its descendants.</p>
      </Dialog>
    </div>
  );
}

function OrgTree({
  units,
  levelMap,
}: {
  units: OrgUnit[];
  levelMap: Map<string, string>;
}) {
  const roots = units.filter((unit) => !unit.parentOrgUnitId);
  function renderNode(unit: OrgUnit, depth = 0): ReactNode {
    const children = units.filter((child) => child.parentOrgUnitId === unit.id);
    return (
      <div key={unit.id}>
        <div className="flex items-center gap-2 py-1 text-[12px]" style={{ paddingLeft: `${depth * 14}px` }}>
          <span className="font-medium text-slate-900">{unit.name}</span>
          <span className="text-slate-400">·</span>
          <span className="text-slate-500">{levelMap.get(unit.hierarchyLevelId) ?? ""}</span>
        </div>
        {children.map((child) => renderNode(child, depth + 1))}
      </div>
    );
  }
  return <div>{roots.map((root) => renderNode(root))}</div>;
}

function CompactStat({ label, value, tone }: { label: string; value: number; tone?: "emerald" | "indigo" | "amber" }) {
  const accent = tone === "emerald" ? "text-emerald-700" : tone === "indigo" ? "text-indigo-700" : tone === "amber" ? "text-amber-700" : "text-slate-900";
  return (
    <div className="rounded-xl border bg-card px-4 py-3">
      <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-slate-500">{label}</p>
      <p className={`mt-1 text-[22px] font-semibold tracking-[-0.02em] ${accent}`}>{value}</p>
    </div>
  );
}

export function TenantUsersPage() {
  const { tenantId } = useTenantRouteContext();
  const { data: users, createUser, updateUser } = useTenantUsers(tenantId);
  const { data: orgUnits } = useTenantOrgUnits(tenantId);
  const { data: roles } = useTenantRoles(tenantId);
  const { data: levels } = useTenantOrgTypes(tenantId);

  const roleMap = useMemo(() => new Map(roles.map((role) => [role.id, role])), [roles]);
  const levelMap = useMemo(() => new Map(levels.map((level) => [level.id, level.name])), [levels]);
  const orgUnitMap = useMemo(() => new Map(orgUnits.map((unit) => [unit.id, unit])), [orgUnits]);

  type UserFormState = {
    name: string;
    email: string;
    phone: string;
    userType: UserType;
    roleId: string;
    orgUnitIds: string[];
    status: UserStatus;
    password: string;
  };

  const initialUserForm: UserFormState = {
    name: "",
    email: "",
    phone: "",
    userType: "INTERNAL",
    roleId: roles[0]?.id ?? "",
    orgUnitIds: [],
    status: "active",
    password: "",
  };

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [form, setForm] = useState<UserFormState>(initialUserForm);

  useEffect(() => {
    if (!feedback) return;
    const timer = window.setTimeout(() => setFeedback(""), 2500);
    return () => window.clearTimeout(timer);
  }, [feedback]);

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((user) => {
      if (statusFilter !== "all" && user.status !== statusFilter) return false;
      if (typeFilter !== "all" && user.userType !== typeFilter) return false;
      if (roleFilter !== "all" && user.roleId !== roleFilter) return false;
      if (q && !`${user.name} ${user.email}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [roleFilter, search, statusFilter, typeFilter, users]);

  const activeUsers = users.filter((user) => user.status === "active").length;
  const invitedUsers = users.filter((user) => user.status === "invited").length;
  const userTypes = new Set(users.map((user) => user.userType)).size;

  const selectedRole = roleMap.get(form.roleId);
  const scopeLevelId = selectedRole?.hierarchyLevelId ?? "";
  const scopeOrgUnits = orgUnits.filter((unit) => unit.hierarchyLevelId === scopeLevelId && unit.status === "active");

  function openCreate() {
    setEditingId(null);
    setError("");
    setForm({ ...initialUserForm, roleId: roles[0]?.id ?? "" });
    setOpen(true);
  }

  function openEdit(user: UserRecord) {
    setEditingId(user.id);
    setError("");
    setForm({
      name: user.name,
      email: user.email,
      phone: user.phone ?? "",
      userType: user.userType,
      roleId: user.roleId,
      orgUnitIds: user.orgUnitIds,
      status: user.status,
      password: "",
    });
    setOpen(true);
  }

  function save() {
    if (form.name.trim().length < 2) { setError("Name is required."); return; }
    if (!form.email.trim().match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) { setError("Valid email required."); return; }
    if (!form.roleId) { setError("Choose a role."); return; }
    if (form.userType === "INTERNAL" && scopeOrgUnits.length > 0 && form.orgUnitIds.length === 0) {
      setError("Choose at least one access-scope org unit.");
      return;
    }
    if (!editingId && form.password.length > 0 && form.password.length < 6) {
      setError("Temporary password must be at least 6 characters.");
      return;
    }

    try {
      if (editingId) {
        updateUser(editingId, {
          name: form.name.trim(),
          email: form.email.trim(),
          userType: form.userType,
          roleId: form.roleId,
          orgUnitIds: form.orgUnitIds,
          status: form.status,
        });
        setFeedback("User updated.");
      } else {
        createUser({
          tenantId,
          name: form.name.trim(),
          email: form.email.trim(),
          userType: form.userType,
          roleId: form.roleId,
          orgUnitIds: form.orgUnitIds,
          linkedVendorId: null,
          linkedCustomerId: null,
          linkedDriverId: null,
          driverName: "",
          driverCode: "",
          status: form.status,
          phone: form.phone.trim() || undefined,
          // Demo only: plaintext password persisted in mock/localStorage.
          password: form.password || undefined,
        });
        setFeedback("User created.");
      }
      setOpen(false);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save user.");
    }
  }

  function toggleStatus(user: UserRecord) {
    const nextStatus: UserStatus = user.status === "active" ? "inactive" : "active";
    updateUser(user.id, { status: nextStatus });
    setFeedback(nextStatus === "active" ? "User enabled." : "User disabled.");
  }

  function resetPassword(user: UserRecord) {
    const newPassword = `Reset@${Math.floor(Math.random() * 9000 + 1000)}`;
    if (typeof window !== "undefined") {
      window.prompt("Share this temporary password with the user (demo only):", newPassword);
    }
    setFeedback(`Password reset prompted for ${user.name}.`);
  }

  function toggleOrgUnit(unitId: string) {
    setForm((current) => {
      const has = current.orgUnitIds.includes(unitId);
      return {
        ...current,
        orgUnitIds: has
          ? current.orgUnitIds.filter((id) => id !== unitId)
          : [...current.orgUnitIds, unitId],
      };
    });
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[20px] font-semibold tracking-[-0.01em] text-slate-900">Users</h1>
          <p className="mt-0.5 text-[13px] text-slate-500">Manage tenant users and access.</p>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="size-4" />
          Add User
        </Button>
      </div>

      {feedback ? (
        <div className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-[12px] text-emerald-800">
          {feedback}
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <CompactStat label="Total Users" value={users.length} />
        <CompactStat label="Active Users" value={activeUsers} tone="emerald" />
        <CompactStat label="Invited Users" value={invitedUsers} tone="amber" />
        <CompactStat label="User Types" value={userTypes} tone="indigo" />
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-card px-3 py-2.5">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search users"
            className="h-9 pl-9"
          />
        </div>
        <Select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="h-9 w-auto min-w-[130px]">
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="invited">Invited</option>
        </Select>
        <Select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} className="h-9 w-auto min-w-[130px]">
          <option value="all">All types</option>
          <option value="INTERNAL">Internal</option>
          <option value="VENDOR">Vendor</option>
          <option value="DRIVER">Driver</option>
          <option value="CUSTOMER">Customer</option>
        </Select>
        <Select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)} className="h-9 w-auto min-w-[160px]">
          <option value="all">All roles</option>
          {roles.filter((role) => !isTenantAdminRole(role)).map((role) => (
            <option key={role.id} value={role.id}>{role.name}</option>
          ))}
        </Select>
        <span className="ml-auto text-[12px] text-slate-500">{filteredUsers.length} of {users.length}</span>
      </div>

      <div className="overflow-hidden rounded-xl border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b bg-slate-50/60 text-left text-[11px] font-medium uppercase tracking-[0.08em] text-slate-500">
                <th className="px-4 py-2.5">User</th>
                <th className="px-4 py-2.5">Email</th>
                <th className="px-4 py-2.5">Type</th>
                <th className="px-4 py-2.5">Role</th>
                <th className="px-4 py-2.5">Access Scope</th>
                <th className="px-4 py-2.5">Status</th>
                <th className="px-4 py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-[13px] text-slate-500">
                    {users.length === 0 ? "No users found." : "No users match the current filters."}
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const role = roleMap.get(user.roleId);
                  const scopeLabel = user.orgUnitIds
                    .map((id) => orgUnitMap.get(id)?.name ?? id)
                    .slice(0, 2)
                    .join(", ");
                  const extra = user.orgUnitIds.length > 2 ? ` +${user.orgUnitIds.length - 2}` : "";
                  return (
                    <tr key={user.id} className="border-b last:border-0 hover:bg-slate-50/60">
                      <td className="px-4 py-2.5 font-medium text-slate-900">{user.name}</td>
                      <td className="px-4 py-2.5 text-slate-700">{user.email}</td>
                      <td className="px-4 py-2.5 text-slate-700">{user.userType.toLowerCase()}</td>
                      <td className="px-4 py-2.5 text-slate-700">{role?.name ?? "—"}</td>
                      <td className="px-4 py-2.5 text-slate-600">
                        {scopeLabel ? `${scopeLabel}${extra}` : (role ? levelMap.get(role.hierarchyLevelId) ?? "—" : "—")}
                      </td>
                      <td className="px-4 py-2.5">
                        <Badge variant={user.status === "active" ? "success" : user.status === "invited" ? "info" : "warning"}>
                          {user.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="sm" title="View" className="h-7 w-7 p-0" onClick={() => openEdit(user)}>
                            <Eye className="size-4" />
                          </Button>
                          <Button variant="ghost" size="sm" title="Edit" className="h-7 w-7 p-0" onClick={() => openEdit(user)}>
                            <Pencil className="size-4" />
                          </Button>
                          <Button variant="ghost" size="sm" title={user.status === "active" ? "Disable" : "Enable"} className="h-7 w-7 p-0" onClick={() => toggleStatus(user)}>
                            <Power className="size-4" />
                          </Button>
                          <Button variant="ghost" size="sm" title="Reset Password" className="h-7 w-7 p-0" onClick={() => resetPassword(user)}>
                            <KeyRound className="size-4" />
                          </Button>
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
        open={open}
        onOpenChange={(value) => { setOpen(value); if (!value) setError(""); }}
        title={editingId ? "Edit User" : "Add User"}
        widthClassName="max-w-xl"
        footer={
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={save}>{editingId ? "Save" : "Create"}</Button>
          </div>
        }
      >
        <div className="grid gap-3 md:grid-cols-2">
          {error ? (
            <div className="md:col-span-2 rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-[12px] text-rose-700">{error}</div>
          ) : null}
          <SmallField label="Name">
            <Input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
          </SmallField>
          <SmallField label="Email">
            <Input value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} />
          </SmallField>
          <SmallField label="Phone">
            <Input value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} />
          </SmallField>
          <SmallField label="User Type">
            <Select value={form.userType} onChange={(event) => setForm((current) => ({ ...current, userType: event.target.value as UserType }))}>
              <option value="INTERNAL">Internal</option>
              <option value="VENDOR">Vendor</option>
              <option value="DRIVER">Driver</option>
              <option value="CUSTOMER">Customer</option>
            </Select>
          </SmallField>
          <SmallField label="Role">
            <Select value={form.roleId} onChange={(event) => setForm((current) => ({ ...current, roleId: event.target.value, orgUnitIds: [] }))}>
              <option value="">Select role</option>
              {roles.filter((role) => role.active && !isTenantAdminRole(role)).map((role) => (
                <option key={role.id} value={role.id}>{role.name}</option>
              ))}
            </Select>
          </SmallField>
          <SmallField label="Status">
            <Select value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as UserStatus }))}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="invited">Invited</option>
            </Select>
          </SmallField>
          <div className="md:col-span-2 space-y-1.5">
            <label className="text-[12px] font-medium text-slate-700">
              Access Scope
              {selectedRole ? <span className="ml-1 text-slate-500">(role level: {levelMap.get(selectedRole.hierarchyLevelId) ?? "—"})</span> : null}
            </label>
            {scopeOrgUnits.length === 0 ? (
              <p className="text-[12px] text-slate-500">No org units exist at this role's level yet.</p>
            ) : (
              <div className="grid gap-1.5 sm:grid-cols-2">
                {scopeOrgUnits.map((unit) => {
                  const checked = form.orgUnitIds.includes(unit.id);
                  return (
                    <label key={unit.id} className={`flex cursor-pointer items-center justify-between rounded-lg border px-3 py-1.5 text-[12px] transition ${checked ? "border-primary bg-primary/5" : "border-border hover:bg-slate-50"}`}>
                      <span>{unit.name}</span>
                      <input type="checkbox" className="size-3.5 accent-primary" checked={checked} onChange={() => toggleOrgUnit(unit.id)} />
                    </label>
                  );
                })}
              </div>
            )}
          </div>
          {!editingId ? (
            <div className="md:col-span-2">
              <SmallField label="Temporary Password (optional)">
                <Input
                  type="password"
                  value={form.password}
                  onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                  placeholder="Min 6 characters"
                />
              </SmallField>
            </div>
          ) : null}
        </div>
      </Dialog>
    </div>
  );
}

function SmallField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[12px] font-medium text-slate-700">{label}</label>
      {children}
    </div>
  );
}

const PERMISSION_STORAGE_KEY = "optimile.tenant.rolePermissionMatrix";

function loadPermissionMatrix(): Record<string, Record<string, Record<string, Record<TenantPermissionAction, boolean>>>> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(PERMISSION_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function savePermissionMatrix(
  roleId: string,
  permissions: Record<string, Record<string, Record<TenantPermissionAction, boolean>>>,
) {
  if (typeof window === "undefined") return;
  const current = loadPermissionMatrix();
  current[roleId] = permissions;
  window.localStorage.setItem(PERMISSION_STORAGE_KEY, JSON.stringify(current));
}

export function TenantRolesPage() {
  const { tenantId, tenant } = useTenantRouteContext();
  const { data: roles, createRole, updateRole } = useTenantRoles(tenantId);
  const { data: levels } = useTenantOrgTypes(tenantId);
  const { data: users } = useTenantUsers(tenantId);
  const { data: modules } = usePlatformModules();

  const tenantModuleEntries = useMemo(
    () => buildTenantModuleEntries(tenant.enabledModuleCodes, modules),
    [tenant.enabledModuleCodes, modules],
  );
  const moduleEntryByCode = useMemo(
    () => new Map(tenantModuleEntries.map((entry) => [entry.code, entry])),
    [tenantModuleEntries],
  );
  const levelMap = useMemo(() => new Map(levels.map((level) => [level.id, level.name])), [levels]);

  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(0);
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [confirmRoleState, setConfirmRoleState] = useState<ConfirmRoleState>(null);
  const [feedback, setFeedback] = useState("");
  const [wizardError, setWizardError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [form, setForm] = useState<WizardForm>({
    name: "",
    description: "",
    active: true,
    hierarchyLevelId: "",
    moduleCodes: [],
    permissions: {},
  });

  useEffect(() => {
    if (!feedback) return;
    const timer = window.setTimeout(() => setFeedback(""), 2500);
    return () => window.clearTimeout(timer);
  }, [feedback]);

  // Tenant Admin is the system-managed tenant owner account: never shown as
  // an editable role row.
  const editableRoles = useMemo(() => roles.filter((role) => !isTenantAdminRole(role)), [roles]);
  const tenantAdminRole = useMemo(() => roles.find(isTenantAdminRole) ?? null, [roles]);
  const tenantOwner = useMemo(
    () => (tenantAdminRole ? users.find((user) => user.roleId === tenantAdminRole.id) ?? null : null),
    [tenantAdminRole, users],
  );

  const filteredRoles = useMemo(() => {
    const q = search.trim().toLowerCase();
    return sortRolesByHierarchy(editableRoles, levels).filter((role) => {
      if (statusFilter !== "all" && (role.active ? "active" : "inactive") !== statusFilter) return false;
      if (q && !`${role.name} ${role.description}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [editableRoles, levels, search, statusFilter]);

  const activeRoles = editableRoles.filter((role) => role.active).length;
  const totalPermissionSets = Object.keys(loadPermissionMatrix()).length;

  function openCreate() {
    setEditingRoleId(null);
    setWizardStep(0);
    setWizardError("");
    setForm({
      name: "",
      description: "",
      active: true,
      hierarchyLevelId: levels[0]?.id ?? "",
      moduleCodes: [TENANT_ADMIN_MODULE_CODE],
      permissions: {},
    });
    setWizardOpen(true);
  }

  function openEdit(roleId: string, startStep = 0) {
    const role = roles.find((item) => item.id === roleId);
    if (!role) return;
    setEditingRoleId(role.id);
    setWizardStep(startStep);
    setWizardError("");
    const matrix = loadPermissionMatrix()[role.id] ?? {};
    setForm({
      name: role.name,
      description: role.description,
      active: role.active,
      hierarchyLevelId: role.hierarchyLevelId,
      moduleCodes: role.moduleCodes.length ? role.moduleCodes : [TENANT_ADMIN_MODULE_CODE],
      permissions: matrix,
    });
    setWizardOpen(true);
  }

  function validateStep(step: number): string | null {
    if (step === 0) {
      if (form.name.trim().length < 2) return "Role name is required.";
    } else if (step === 1) {
      if (!form.hierarchyLevelId) return "Choose a hierarchy level.";
    } else if (step === 2) {
      if (!form.moduleCodes.length) return "Select at least one module.";
    }
    return null;
  }

  function next() {
    const stepError = validateStep(wizardStep);
    if (stepError) { setWizardError(stepError); return; }
    setWizardError("");
    if (wizardStep === 3) { submitWizard(); return; }
    setWizardStep((c) => Math.min(c + 1, 3));
  }

  function submitWizard() {
    try {
      let savedId = editingRoleId;
      if (editingRoleId) {
        updateRole(editingRoleId, {
          name: form.name.trim(),
          description: form.description.trim(),
          hierarchyLevelId: form.hierarchyLevelId,
          moduleCodes: form.moduleCodes,
          active: form.active,
        });
      } else {
        const created = createRole({
          tenantId,
          name: form.name.trim(),
          description: form.description.trim(),
          hierarchyLevelId: form.hierarchyLevelId,
          moduleCodes: form.moduleCodes,
          active: form.active,
        });
        savedId = created.id;
      }
      // Prune permissions for any module the role no longer has.
      const prunedPermissions: WizardForm["permissions"] = {};
      form.moduleCodes.forEach((code) => {
        if (form.permissions[code]) prunedPermissions[code] = form.permissions[code];
      });
      if (savedId) savePermissionMatrix(savedId, prunedPermissions);

      setWizardOpen(false);
      setFeedback(editingRoleId ? "Role updated." : "Role created.");
    } catch (error) {
      setWizardError(error instanceof Error ? error.message : "Role could not be saved.");
    }
  }

  function toggleModule(code: string) {
    setForm((current) => {
      const has = current.moduleCodes.includes(code);
      const moduleCodes = has
        ? current.moduleCodes.filter((c) => c !== code)
        : [...current.moduleCodes, code];
      const permissions = { ...current.permissions };
      if (has) delete permissions[code];
      return { ...current, moduleCodes, permissions };
    });
  }

  function togglePermission(moduleCode: string, featureCode: string, action: TenantPermissionAction) {
    setForm((current) => {
      const modulePerm = { ...(current.permissions[moduleCode] ?? {}) };
      const featurePerm = { ...(modulePerm[featureCode] ?? buildEmptyActions()) };
      featurePerm[action] = !featurePerm[action];
      modulePerm[featureCode] = featurePerm;
      return { ...current, permissions: { ...current.permissions, [moduleCode]: modulePerm } };
    });
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[20px] font-semibold tracking-[-0.01em] text-slate-900">Roles</h1>
          <p className="mt-0.5 text-[13px] text-slate-500">Manage tenant roles, module access, and permissions.</p>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="size-4" />
          Add Role
        </Button>
      </div>

      {feedback ? (
        <div className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-[12px] text-emerald-800">
          {feedback}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-indigo-200 bg-indigo-50/60 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700">
            <ShieldCheckIcon className="size-4" />
          </div>
          <div>
            <p className="text-[13px] font-semibold text-slate-900">
              {tenantOwner?.name ?? "—"} <span className="font-normal text-slate-500">(Tenant Admin)</span>
            </p>
            <p className="text-[11px] text-slate-600">Tenant Owner Access · Full tenant governance · System-managed account.</p>
          </div>
        </div>
        <Badge variant="info">System Role</Badge>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <RoleStat label="Total Roles" value={editableRoles.length} />
        <RoleStat label="Active Roles" value={activeRoles} tone="emerald" />
        <RoleStat label="Enabled Modules" value={tenantModuleEntries.length} tone="indigo" />
        <RoleStat label="Permission Sets" value={totalPermissionSets} tone="amber" />
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-card px-3 py-2.5">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search roles"
            className="h-9 pl-9"
          />
        </div>
        <Select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          className="h-9 w-auto min-w-[140px]"
        >
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </Select>
        <span className="ml-auto text-[12px] text-slate-500">{filteredRoles.length} of {roles.length}</span>
      </div>

      <div className="overflow-hidden rounded-xl border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b bg-slate-50/60 text-left text-[11px] font-medium uppercase tracking-[0.08em] text-slate-500">
                <th className="px-4 py-2.5">Role Name</th>
                <th className="px-4 py-2.5">Assigned Modules</th>
                <th className="px-4 py-2.5">Hierarchy Level</th>
                <th className="px-4 py-2.5">Users</th>
                <th className="px-4 py-2.5">Status</th>
                <th className="px-4 py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRoles.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-[13px] text-slate-500">
                    No roles match the current filters.
                  </td>
                </tr>
              ) : (
                filteredRoles.map((role) => {
                  const assignedUsers = users.filter((user) => user.roleId === role.id).length;
                  const moduleNames = role.moduleCodes.map(
                    (code) => moduleEntryByCode.get(code)?.name ?? code,
                  );
                  return (
                    <tr key={role.id} className="border-b last:border-0 hover:bg-slate-50/60">
                      <td className="px-4 py-2.5 font-medium text-slate-900">{role.name}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex flex-wrap gap-1">
                          {moduleNames.length === 0 ? (
                            <span className="text-slate-500">—</span>
                          ) : (
                            moduleNames.map((name) => (
                              <Badge key={`${role.id}-${name}`} variant="accent">{name}</Badge>
                            ))
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-slate-700">
                        {levelMap.get(role.hierarchyLevelId) ?? "—"}
                      </td>
                      <td className="px-4 py-2.5 text-slate-700">{assignedUsers}</td>
                      <td className="px-4 py-2.5">
                        <Badge variant={role.active ? "success" : "warning"}>
                          {role.active ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center justify-end gap-1">
                          <Button asChild variant="ghost" size="sm" title="View" className="h-7 w-7 p-0">
                            <Link to={`/platform-admin/tenant/${tenant.id}/roles/${role.id}`}>
                              <Eye className="size-4" />
                            </Link>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Edit"
                            className="h-7 w-7 p-0"
                            onClick={() => openEdit(role.id, 0)}
                          >
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Permissions"
                            className="h-7 w-7 p-0"
                            onClick={() => openEdit(role.id, 3)}
                          >
                            <ShieldCheckIcon className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            title={role.active ? "Disable" : "Enable"}
                            className="h-7 w-7 p-0"
                            onClick={() => setConfirmRoleState({ id: role.id, nextActive: !role.active })}
                          >
                            <Power className="size-4" />
                          </Button>
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

      {/* Wizard */}
      <Dialog
        open={wizardOpen}
        onOpenChange={(open) => {
          setWizardOpen(open);
          if (!open) setWizardError("");
        }}
        title={editingRoleId ? "Edit Role" : "Add Role"}
        description={`Step ${wizardStep + 1} of 4 · ${ROLE_WIZARD_STEPS[wizardStep].title}`}
        widthClassName="max-w-3xl"
        footer={
          <div className="flex items-center justify-between gap-2">
            <span className="text-[12px] text-slate-500">Step {wizardStep + 1} of 4</span>
            <div className="flex gap-2">
              {wizardStep > 0 ? (
                <Button variant="ghost" size="sm" onClick={() => setWizardStep((c) => c - 1)}>
                  <ArrowLeft className="size-4" />
                  Back
                </Button>
              ) : null}
              <Button size="sm" onClick={next}>
                {wizardStep === 3 ? (<><CheckCircle2 className="size-4" />{editingRoleId ? "Save Role" : "Create Role"}</>) : (<>Continue<ArrowRight className="size-4" /></>)}
              </Button>
            </div>
          </div>
        }
      >
        <div className="space-y-4">
          <RoleStepper current={wizardStep} />
          {wizardError ? (
            <div className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-[12px] text-rose-700">
              {wizardError}
            </div>
          ) : null}

          {wizardStep === 0 ? (
            <div className="grid gap-3">
              <RoleField label="Role Name">
                <Input
                  value={form.name}
                  onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                />
              </RoleField>
              <RoleField label="Description">
                <Input
                  value={form.description}
                  onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                />
              </RoleField>
              <RoleField label="Status">
                <Select
                  value={form.active ? "active" : "inactive"}
                  onChange={(event) => setForm((current) => ({ ...current, active: event.target.value === "active" }))}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </Select>
              </RoleField>
            </div>
          ) : null}

          {wizardStep === 1 ? (
            <div className="grid gap-3">
              <RoleField label="Mapped Level Type">
                <Select
                  value={form.hierarchyLevelId}
                  onChange={(event) => setForm((current) => ({ ...current, hierarchyLevelId: event.target.value }))}
                >
                  <option value="">Select level</option>
                  {levels.filter(isBusinessHierarchyLevel).map((level) => (
                    <option key={level.id} value={level.id}>{level.name}</option>
                  ))}
                </Select>
              </RoleField>
              <p className="text-[12px] text-slate-500">
                Business levels only (Region / Zone / Branch / Hub / etc). The role stores the level type; specific org units are assigned when a user is mapped to this role.
              </p>
            </div>
          ) : null}

          {wizardStep === 2 ? (
            <div className="grid gap-2">
              {tenantModuleEntries.map((entry) => {
                const checked = form.moduleCodes.includes(entry.code);
                return (
                  <label
                    key={entry.code}
                    className={`flex cursor-pointer items-center justify-between rounded-lg border px-3 py-2 transition ${
                      checked ? "border-primary bg-primary/5" : "border-border hover:bg-slate-50"
                    }`}
                  >
                    <div>
                      <p className="text-[13px] font-medium text-slate-900">{entry.name}</p>
                      <p className="text-[11px] text-slate-500">{entry.isVirtual ? "Tenant governance" : entry.code}</p>
                    </div>
                    <input
                      type="checkbox"
                      className="size-4 accent-primary"
                      checked={checked}
                      onChange={() => toggleModule(entry.code)}
                    />
                  </label>
                );
              })}
            </div>
          ) : null}

          {wizardStep === 3 ? (
            <div className="space-y-4">
              {form.moduleCodes.length === 0 ? (
                <p className="text-[13px] text-slate-500">Select at least one module in Step 3 to set permissions.</p>
              ) : (
                form.moduleCodes.map((moduleCode) => {
                  const entry = moduleEntryByCode.get(moduleCode);
                  if (!entry) return null;
                  return (
                    <div key={moduleCode} className="overflow-hidden rounded-lg border">
                      <div className="border-b bg-slate-50/60 px-3 py-2 text-[12px] font-semibold text-slate-700">
                        {entry.name}
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-[12px]">
                          <thead>
                            <tr className="border-b text-left text-[10px] uppercase tracking-[0.08em] text-slate-500">
                              <th className="px-3 py-2">Feature</th>
                              {TENANT_PERMISSION_ACTIONS.map((action) => (
                                <th key={action} className="px-3 py-2 text-center capitalize">{action}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {entry.features.map((feature) => {
                              const featurePerm = form.permissions[moduleCode]?.[feature.code] ?? buildEmptyActions();
                              return (
                                <tr key={feature.code} className="border-b last:border-0">
                                  <td className="px-3 py-2 text-slate-900">{feature.name}</td>
                                  {TENANT_PERMISSION_ACTIONS.map((action) => (
                                    <td key={action} className="px-3 py-2 text-center">
                                      <input
                                        type="checkbox"
                                        className="size-3.5 accent-primary"
                                        checked={featurePerm[action]}
                                        onChange={() => togglePermission(moduleCode, feature.code, action)}
                                      />
                                    </td>
                                  ))}
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          ) : null}
        </div>
      </Dialog>

      {/* Confirm disable/enable */}
      <Dialog
        open={!!confirmRoleState}
        onOpenChange={(open) => setConfirmRoleState(open ? confirmRoleState : null)}
        title={confirmRoleState?.nextActive ? "Enable role" : "Disable role"}
        widthClassName="max-w-sm"
        footer={
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="outline" onClick={() => setConfirmRoleState(null)}>Cancel</Button>
            <Button
              size="sm"
              onClick={() => {
                if (!confirmRoleState) return;
                updateRole(confirmRoleState.id, { active: confirmRoleState.nextActive });
                setFeedback(confirmRoleState.nextActive ? "Role enabled." : "Role disabled.");
                setConfirmRoleState(null);
              }}
            >
              Confirm
            </Button>
          </div>
        }
      >
        <p className="text-[13px] text-slate-600">
          {confirmRoleState?.nextActive
            ? "Re-enable this role for user assignment."
            : "Disabling prevents new user assignments. Existing user-role links remain."}
        </p>
      </Dialog>
    </div>
  );
}

const ROLE_WIZARD_STEPS = [
  { title: "Role Details" },
  { title: "Hierarchy Level" },
  { title: "Module Access" },
  { title: "Permissions" },
];

function buildEmptyActions(): Record<TenantPermissionAction, boolean> {
  return TENANT_PERMISSION_ACTIONS.reduce(
    (accumulator, action) => ({ ...accumulator, [action]: false }),
    {} as Record<TenantPermissionAction, boolean>,
  );
}

function RoleStepper({ current }: { current: number }) {
  return (
    <ol className="flex items-center gap-1">
      {ROLE_WIZARD_STEPS.map((step, index) => {
        const isComplete = index < current;
        const isCurrent = index === current;
        const isLast = index === ROLE_WIZARD_STEPS.length - 1;
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

function RoleStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "emerald" | "indigo" | "amber";
}) {
  const accent =
    tone === "emerald" ? "text-emerald-700" : tone === "indigo" ? "text-indigo-700" : tone === "amber" ? "text-amber-700" : "text-slate-900";
  return (
    <div className="rounded-xl border bg-card px-4 py-3">
      <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-slate-500">{label}</p>
      <p className={`mt-1 text-[22px] font-semibold tracking-[-0.02em] ${accent}`}>{value}</p>
    </div>
  );
}

function RoleField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[12px] font-medium text-slate-700">{label}</label>
      {children}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Role Permissions — grouped enterprise RBAC editor.
//
// The on-disk permission matrix is keyed by the ACTUAL underlying feature
// codes (CUSTOMERS, VENDORS, BOOKING_DASHBOARD, etc.) so the sidebar and
// route gates keep working unchanged. The UI groups several feature codes
// under a single label (e.g. "Master Data" → CUSTOMERS/VENDORS/...) and
// derives the group's check state from the underlying feature codes.
// ──────────────────────────────────────────────────────────────────────────

const ACTION_COLORS: Record<TenantPermissionAction, { header: string; chip: string }> = {
  view: { header: "bg-blue-50 text-blue-700", chip: "bg-blue-500" },
  create: { header: "bg-emerald-50 text-emerald-700", chip: "bg-emerald-500" },
  edit: { header: "bg-amber-50 text-amber-700", chip: "bg-amber-500" },
  delete: { header: "bg-rose-50 text-rose-700", chip: "bg-rose-500" },
  approve: { header: "bg-violet-50 text-violet-700", chip: "bg-violet-500" },
  export: { header: "bg-slate-100 text-slate-700", chip: "bg-slate-500" },
};

interface PermissionGroupRow {
  label: string;
  helper: string;
  moduleCode: string;
  featureCodes: string[];
}

interface PermissionGroupCard {
  key: string;
  title: string;
  badge: string;
  rows: PermissionGroupRow[];
}

// Permission dependencies — granting `trigger` automatically grants every
// entry in `grant`; revoking any entry in `grant` revokes the trigger.
// Used to enforce real-world workflow prerequisites (e.g. you can't create
// a booking without being able to see the booking list).
const GRANT_DEPENDENCIES: Array<{
  trigger: { moduleCode: string; featureCode: string; action: TenantPermissionAction };
  grant: Array<{ moduleCode: string; featureCode: string; action: TenantPermissionAction }>;
}> = [
  {
    trigger: { moduleCode: "TMS", featureCode: "CREATE_BOOKING", action: "create" },
    grant: [{ moduleCode: "TMS", featureCode: "BOOKING_DASHBOARD", action: "view" }],
  },
];

const PERMISSION_GROUPS: PermissionGroupCard[] = [
  {
    key: "ADMIN",
    title: "Administration",
    badge: "Tenant governance & setup",
    rows: [
      { label: "Org Units", helper: "Hierarchy Setup, Org Units", moduleCode: "ADMIN", featureCodes: ["ORG_UNITS"] },
      { label: "Users", helper: "Tenant user management", moduleCode: "ADMIN", featureCodes: ["USERS"] },
      { label: "Roles & Permissions", helper: "Roles and Role Permissions", moduleCode: "ADMIN", featureCodes: ["ROLES", "PERMISSIONS"] },
      { label: "Master Data", helper: "Customers, vendors, vehicle types, materials, UOM, address book", moduleCode: "TMS", featureCodes: ["CUSTOMERS", "VENDORS", "VEHICLE_TYPES", "MATERIALS", "UOM", "ADDRESS_BOOK"] },
      { label: "Rules Configuration", helper: "Assignment, document, and POD rules", moduleCode: "TMS", featureCodes: ["ASSIGNMENT_RULES", "DOCUMENT_RULES", "POD_RULES"] },
      { label: "LR Configuration", helper: "LR ownership, numbering, governance", moduleCode: "TMS", featureCodes: ["LR_CONFIGURATION"] },
    ],
  },
  {
    key: "BOOKING_OPS",
    title: "Booking",
    badge: "Day-to-day workflows",
    rows: [
      { label: "Booking Dashboard", helper: "Booking lists and overview", moduleCode: "TMS", featureCodes: ["BOOKING_DASHBOARD"] },
      { label: "Create Booking", helper: "Booking creation workflows", moduleCode: "TMS", featureCodes: ["CREATE_BOOKING"] },
      { label: "Assignment", helper: "Vendor, vehicle, and driver assignment", moduleCode: "TMS", featureCodes: ["BOOKING_ASSIGNMENT"] },
      { label: "Shipment Documents", helper: "Invoice, e-waybill, supporting docs", moduleCode: "TMS", featureCodes: ["SHIPMENT_DOCUMENTS"] },
      { label: "LR Management", helper: "LR inventory and runtime operations", moduleCode: "TMS", featureCodes: ["LR_MANAGEMENT"] },
      { label: "POD", helper: "Proof of delivery capture", moduleCode: "TMS", featureCodes: ["POD"] },
      { label: "Reports", helper: "Booking analytics and exports", moduleCode: "TMS", featureCodes: ["BOOKING_REPORTS"] },
    ],
  },
  {
    key: "TRACKING",
    title: "Track and Trace",
    badge: "modules/track-trace-web — /tracking/*",
    rows: [
      { label: "Tracking Dashboard", helper: "Tracking home", moduleCode: "TRACKING", featureCodes: ["TRACKING_DASHBOARD"] },
      { label: "Active Trips", helper: "Trip list with live status", moduleCode: "TRACKING", featureCodes: ["TRACKING_TRIPS"] },
      { label: "Live Map", helper: "Real-time fleet map", moduleCode: "TRACKING", featureCodes: ["TRACKING_LIVE_MAP"] },
      { label: "Alerts", helper: "Tracking alerts and exceptions", moduleCode: "TRACKING", featureCodes: ["TRACKING_ALERTS"] },
      { label: "Geofences", helper: "Geofence management", moduleCode: "TRACKING", featureCodes: ["TRACKING_GEOFENCES"] },
      { label: "Analytics", helper: "Route, driver behaviour, performance analytics", moduleCode: "TRACKING", featureCodes: ["TRACKING_ANALYTICS"] },
    ],
  },
  {
    key: "CUSTOMER",
    title: "Customer Portal",
    badge: "modules/customer-web — /customer/*",
    rows: [
      { label: "Customer Dashboard", helper: "Customer-facing dashboard", moduleCode: "CUSTOMER", featureCodes: ["CUSTOMER_DASHBOARD"] },
    ],
  },
  {
    key: "VENDOR",
    title: "Vendor Portal",
    badge: "modules/vendor-web — /vendor/*",
    rows: [
      { label: "Vendor Dashboard", helper: "Vendor workspace home", moduleCode: "VENDOR", featureCodes: ["VENDOR_DASHBOARD"] },
      { label: "Vendor Trips", helper: "Assigned trips, acceptance, status", moduleCode: "VENDOR", featureCodes: ["VENDOR_TRIPS"] },
      { label: "Sourcing", helper: "Bid on auctions / RFQs", moduleCode: "VENDOR", featureCodes: ["VENDOR_SOURCING"] },
      { label: "Vendor Contracts", helper: "Active vendor contracts", moduleCode: "VENDOR", featureCodes: ["VENDOR_CONTRACTS"] },
      { label: "Invoices", helper: "Vendor invoices", moduleCode: "VENDOR", featureCodes: ["VENDOR_INVOICES"] },
      { label: "Ledger", helper: "Vendor ledger", moduleCode: "VENDOR", featureCodes: ["VENDOR_LEDGER"] },
      { label: "Payments", helper: "Payment records and reconciliation", moduleCode: "VENDOR", featureCodes: ["VENDOR_PAYMENTS"] },
      { label: "Vendor Fleet", helper: "Vehicles and drivers", moduleCode: "VENDOR", featureCodes: ["VENDOR_FLEET"] },
      { label: "Vendor Support", helper: "Disputes and queries", moduleCode: "VENDOR", featureCodes: ["VENDOR_SUPPORT"] },
    ],
  },
  {
    key: "FLEET",
    title: "Fleet Management",
    badge: "modules/fleet-web — /fleet/*",
    rows: [
      { label: "Fleet Dashboard", helper: "Fleet home", moduleCode: "FLEET", featureCodes: ["FLEET_DASHBOARD"] },
      { label: "Ops Intelligence", helper: "Ops summary & KPIs", moduleCode: "FLEET", featureCodes: ["FLEET_OPS_INTEL"] },
      { label: "Exception Center", helper: "Fleet exceptions", moduleCode: "FLEET", featureCodes: ["FLEET_EXCEPTIONS"] },
      { label: "Live Map", helper: "Fleet live map", moduleCode: "FLEET", featureCodes: ["FLEET_LIVE_MAP"] },
      { label: "Dispatch", helper: "Dispatch workspace", moduleCode: "FLEET", featureCodes: ["FLEET_DISPATCH"] },
      { label: "Vehicles", helper: "Vehicles and availability", moduleCode: "FLEET", featureCodes: ["FLEET_VEHICLES"] },
      { label: "Drivers", helper: "Drivers and behaviour", moduleCode: "FLEET", featureCodes: ["FLEET_DRIVERS"] },
      { label: "Compliance", helper: "Fleet compliance", moduleCode: "FLEET", featureCodes: ["FLEET_COMPLIANCE"] },
      { label: "Maintenance", helper: "Vehicle maintenance", moduleCode: "FLEET", featureCodes: ["FLEET_MAINTENANCE"] },
      { label: "Garage", helper: "Garage operations", moduleCode: "FLEET", featureCodes: ["FLEET_GARAGE"] },
      { label: "Tyres", helper: "Tyre inventory and tracking", moduleCode: "FLEET", featureCodes: ["FLEET_TYRES"] },
      { label: "Fuel", helper: "Fuel records", moduleCode: "FLEET", featureCodes: ["FLEET_FUEL"] },
      { label: "Cost Health", helper: "Cost health workspace", moduleCode: "FLEET", featureCodes: ["FLEET_COST"] },
      { label: "Fleet Settings", helper: "Fleet configuration", moduleCode: "FLEET", featureCodes: ["FLEET_SETTINGS"] },
    ],
  },
  {
    key: "AUCTION",
    title: "Auction / AMS",
    badge: "modules/auction-web — /auction/*",
    rows: [
      { label: "Auction Dashboard", helper: "Auction home", moduleCode: "AUCTION", featureCodes: ["AUCTION_DASHBOARD"] },
      { label: "Auctions", helper: "RFI/RFQ and auction list", moduleCode: "AUCTION", featureCodes: ["AUCTION_AUCTIONS"] },
      { label: "Contracts", helper: "Auction contracts", moduleCode: "AUCTION", featureCodes: ["AUCTION_CONTRACTS"] },
    ],
  },
];

type PermissionMatrix = Record<string, Record<TenantPermissionAction, boolean>>;
type RoleMatrix = Record<string, PermissionMatrix>;
type StoreMatrix = Record<string, RoleMatrix>;

function loadPermissionStore(): StoreMatrix {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem("optimile.tenant.rolePermissionMatrix");
    return raw ? (JSON.parse(raw) as StoreMatrix) : {};
  } catch {
    return {};
  }
}

function writePermissionStore(store: StoreMatrix) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem("optimile.tenant.rolePermissionMatrix", JSON.stringify(store));
  window.dispatchEvent(new Event("optimile-permission-matrix-changed"));
}

function cloneActions(map: Partial<Record<TenantPermissionAction, boolean>> | undefined): Record<TenantPermissionAction, boolean> {
  const next: Record<TenantPermissionAction, boolean> = {} as Record<TenantPermissionAction, boolean>;
  TENANT_PERMISSION_ACTIONS.forEach((action) => { next[action] = Boolean(map?.[action]); });
  return next;
}

function isFeatureActionOn(matrix: RoleMatrix, moduleCode: string, featureCode: string, action: TenantPermissionAction): boolean {
  return Boolean(matrix?.[moduleCode]?.[featureCode]?.[action]);
}

function isFeatureFullyOn(matrix: RoleMatrix, moduleCode: string, featureCode: string): boolean {
  return TENANT_PERMISSION_ACTIONS.every((action) => isFeatureActionOn(matrix, moduleCode, featureCode, action));
}

export function TenantRolePermissionsPage() {
  const { tenantId, tenant } = useTenantRouteContext();
  const { data: roles } = useTenantRoles(tenantId);
  const { data: orgTypes } = useTenantOrgTypes(tenantId);

  const editableRoles = useMemo(() => roles.filter((role) => !isTenantAdminRole(role)), [roles]);
  const [selectedRoleId, setSelectedRoleId] = useState<string>(editableRoles[0]?.id ?? "");
  const [working, setWorking] = useState<RoleMatrix>({});
  const [baseline, setBaseline] = useState<RoleMatrix>({});
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    if (!feedback) return;
    const timer = window.setTimeout(() => setFeedback(""), 2500);
    return () => window.clearTimeout(timer);
  }, [feedback]);

  useEffect(() => {
    if (!selectedRoleId) {
      setWorking({});
      setBaseline({});
      return;
    }
    const store = loadPermissionStore();
    const next = (store[selectedRoleId] ?? {}) as RoleMatrix;
    const snapshot = JSON.parse(JSON.stringify(next)) as RoleMatrix;
    setWorking(snapshot);
    setBaseline(JSON.parse(JSON.stringify(next)) as RoleMatrix);
  }, [selectedRoleId]);

  const selectedRole = roles.find((role) => role.id === selectedRoleId);
  const dirty = useMemo(() => JSON.stringify(working) !== JSON.stringify(baseline), [working, baseline]);

  const visibleGroups = useMemo(() => {
    if (!selectedRole) return [] as PermissionGroupCard[];
    const codes = new Set(selectedRole.moduleCodes ?? []);
    return PERMISSION_GROUPS.filter((group) => {
      if (group.key === "ADMIN") return codes.has("ADMIN") || codes.has("TMS");
      if (group.key === "BOOKING_OPS") return codes.has("TMS");
      if (group.key === "FLEET") return codes.has("FLEET");
      if (group.key === "AUCTION") return codes.has("AUCTION") || codes.has("PROCUREMENT");
      if (group.key === "CUSTOMER") return codes.has("CUSTOMER");
      if (group.key === "VENDOR") return codes.has("VENDOR") || codes.has("PROCUREMENT");
      if (group.key === "TRACKING") return codes.has("TRACKING");
      return false;
    });
  }, [selectedRole]);

  function applyPermissionDependencies(
    matrix: RoleMatrix,
    moduleCode: string,
    featureCode: string,
    action: TenantPermissionAction,
    value: boolean,
  ): RoleMatrix {
    // Grant cascade: ticking a row implies its prerequisite rows.
    // (e.g. Create Booking requires Booking Dashboard view — you cannot
    // create without seeing the list.)
    if (value) {
      const grants = GRANT_DEPENDENCIES.filter(
        (dep) =>
          dep.trigger.moduleCode === moduleCode &&
          dep.trigger.featureCode === featureCode &&
          dep.trigger.action === action,
      );
      grants.forEach((dep) => {
        dep.grant.forEach((target) => {
          const modulePerm: PermissionMatrix = { ...(matrix[target.moduleCode] ?? {}) };
          const featurePerm = cloneActions(modulePerm[target.featureCode]);
          featurePerm[target.action] = true;
          modulePerm[target.featureCode] = featurePerm;
          matrix[target.moduleCode] = modulePerm;
        });
      });
    } else {
      // Revoke cascade: unticking a prerequisite revokes everything that
      // depended on it.
      const revokes = GRANT_DEPENDENCIES.filter((dep) =>
        dep.grant.some(
          (target) =>
            target.moduleCode === moduleCode &&
            target.featureCode === featureCode &&
            target.action === action,
        ),
      );
      revokes.forEach((dep) => {
        const modulePerm: PermissionMatrix = { ...(matrix[dep.trigger.moduleCode] ?? {}) };
        const featurePerm = cloneActions(modulePerm[dep.trigger.featureCode]);
        TENANT_PERMISSION_ACTIONS.forEach((act) => {
          featurePerm[act] = false;
        });
        modulePerm[dep.trigger.featureCode] = featurePerm;
        matrix[dep.trigger.moduleCode] = modulePerm;
      });
    }
    return matrix;
  }

  function setActionForFeatures(moduleCode: string, featureCodes: string[], action: TenantPermissionAction, value: boolean) {
    setWorking((current) => {
      const next: RoleMatrix = { ...current };
      const modulePerm: PermissionMatrix = { ...(next[moduleCode] ?? {}) };
      featureCodes.forEach((code) => {
        const featurePerm = cloneActions(modulePerm[code]);
        featurePerm[action] = value;
        modulePerm[code] = featurePerm;
      });
      next[moduleCode] = modulePerm;
      featureCodes.forEach((code) => {
        applyPermissionDependencies(next, moduleCode, code, action, value);
      });
      return next;
    });
  }
  function setAllForFeatures(moduleCode: string, featureCodes: string[], value: boolean) {
    setWorking((current) => {
      const next: RoleMatrix = { ...current };
      const modulePerm: PermissionMatrix = { ...(next[moduleCode] ?? {}) };
      featureCodes.forEach((code) => {
        const featurePerm = cloneActions(modulePerm[code]);
        TENANT_PERMISSION_ACTIONS.forEach((action) => { featurePerm[action] = value; });
        modulePerm[code] = featurePerm;
      });
      next[moduleCode] = modulePerm;
      return next;
    });
  }
  function setActionForModule(group: PermissionGroupCard, action: TenantPermissionAction, value: boolean) {
    setWorking((current) => {
      const next: RoleMatrix = { ...current };
      group.rows.forEach((row) => {
        const modulePerm: PermissionMatrix = { ...(next[row.moduleCode] ?? {}) };
        row.featureCodes.forEach((code) => {
          const featurePerm = cloneActions(modulePerm[code]);
          featurePerm[action] = value;
          modulePerm[code] = featurePerm;
        });
        next[row.moduleCode] = modulePerm;
      });
      return next;
    });
  }
  function grantAll(group: PermissionGroupCard, value: boolean) {
    setWorking((current) => {
      const next: RoleMatrix = { ...current };
      group.rows.forEach((row) => {
        const modulePerm: PermissionMatrix = { ...(next[row.moduleCode] ?? {}) };
        row.featureCodes.forEach((code) => {
          const featurePerm = cloneActions(modulePerm[code]);
          TENANT_PERMISSION_ACTIONS.forEach((action) => { featurePerm[action] = value; });
          modulePerm[code] = featurePerm;
        });
        next[row.moduleCode] = modulePerm;
      });
      return next;
    });
  }

  function isRowActionOn(row: PermissionGroupRow, action: TenantPermissionAction): boolean {
    return row.featureCodes.every((code) => isFeatureActionOn(working, row.moduleCode, code, action));
  }
  function isRowAllOn(row: PermissionGroupRow): boolean {
    return row.featureCodes.every((code) => isFeatureFullyOn(working, row.moduleCode, code));
  }
  function isColumnAllOn(group: PermissionGroupCard, action: TenantPermissionAction): boolean {
    return group.rows.every((row) => isRowActionOn(row, action));
  }
  function isGroupAllOn(group: PermissionGroupCard): boolean {
    return group.rows.every(isRowAllOn);
  }
  function groupCoverage(group: PermissionGroupCard) {
    let granted = 0;
    let total = 0;
    group.rows.forEach((row) => {
      row.featureCodes.forEach((code) => {
        TENANT_PERMISSION_ACTIONS.forEach((action) => {
          total += 1;
          if (isFeatureActionOn(working, row.moduleCode, code, action)) granted += 1;
        });
      });
    });
    return { granted, total, percent: total > 0 ? Math.round((granted / total) * 100) : 0 };
  }

  const overallCoverage = useMemo(() => {
    let granted = 0;
    let total = 0;
    visibleGroups.forEach((group) => {
      const cov = groupCoverage(group);
      granted += cov.granted;
      total += cov.total;
    });
    return total > 0 ? Math.round((granted / total) * 100) : 0;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [working, visibleGroups]);

  function save() {
    if (!selectedRoleId) return;
    const store = loadPermissionStore();
    store[selectedRoleId] = working;
    writePermissionStore(store);
    setBaseline(JSON.parse(JSON.stringify(working)) as RoleMatrix);
    setFeedback("Permissions saved.");
  }
  function reset() {
    setWorking(JSON.parse(JSON.stringify(baseline)) as RoleMatrix);
  }

  if (editableRoles.length === 0) {
    return (
      <div className="space-y-5">
        <div>
          <h1 className="text-[20px] font-semibold tracking-[-0.01em] text-slate-900">Role Permissions</h1>
          <p className="mt-0.5 text-[13px] text-slate-500">Configure feature access for each role.</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
          <p className="text-[14px] font-medium text-slate-900">Create a role first</p>
          <p className="mt-1 text-[13px] text-slate-500">Roles must exist before permissions can be assigned.</p>
          <div className="mt-4">
            <Button asChild size="sm">
              <Link to={`/platform-admin/tenant/${tenant.id}/roles`}>
                <Plus className="size-4" />
                Add Role
              </Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const levelName = (selectedRole && orgTypes.find((level) => level.id === selectedRole.hierarchyLevelId)?.name) ?? "—";
  const roleModuleNames = selectedRole
    ? (selectedRole.moduleCodes ?? []).map((code) => (code === "ADMIN" ? "Admin" : code === "TMS" ? "Booking" : code))
    : [];

  return (
    <div className="space-y-5">
      {/* Role selector header */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
          <div className="flex flex-wrap items-center gap-3">
            <div>
              <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-slate-500">Role</p>
              <Select
                value={selectedRoleId}
                onChange={(event) => setSelectedRoleId(event.target.value)}
                className="mt-1 h-9 min-w-[220px]"
              >
                {editableRoles.map((role) => (
                  <option key={role.id} value={role.id}>{role.name}</option>
                ))}
              </Select>
            </div>
            {selectedRole ? (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                  {selectedRole.active ? "Active" : "Inactive"}
                </span>
                <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                  Level: {levelName}
                </span>
                {roleModuleNames.length > 0 ? (
                  <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                    Modules: {roleModuleNames.join(", ")}
                  </span>
                ) : null}
                <span className="inline-flex items-center rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-700">
                  Coverage: {overallCoverage}%
                </span>
                {dirty ? (
                  <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800">
                    Unsaved changes
                  </span>
                ) : null}
              </div>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="outline" onClick={reset} disabled={!dirty}>Reset</Button>
            <Button size="sm" onClick={save} disabled={!dirty}>
              <CheckCircle2 className="size-4" />
              Save Changes
            </Button>
          </div>
        </div>
        {feedback ? (
          <div className="border-b border-emerald-200 bg-emerald-50 px-4 py-1.5 text-[12px] text-emerald-800">
            {feedback}
          </div>
        ) : null}
      </div>

      {/* Module cards */}
      {visibleGroups.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-8 text-center text-[13px] text-slate-500">
          This role has no modules assigned. Edit the role to assign at least one module.
        </div>
      ) : (
        visibleGroups.map((group) => {
          const cov = groupCoverage(group);
          const groupAllOn = isGroupAllOn(group);
          const totalPermissions = group.rows.reduce(
            (accumulator, row) => accumulator + row.featureCodes.length * TENANT_PERMISSION_ACTIONS.length,
            0,
          );
          return (
            <section key={group.key} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-[14px] font-semibold text-slate-900">{group.title}</h2>
                    <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.06em] text-slate-600">
                      {group.badge}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[11px] text-slate-500">
                    {group.rows.length} features · {totalPermissions} permissions · {cov.percent}% granted
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="ghost" onClick={() => grantAll(group, false)}>Clear</Button>
                  <Button size="sm" variant={groupAllOn ? "default" : "outline"} onClick={() => grantAll(group, !groupAllOn)}>
                    {groupAllOn ? "Granted all" : "Grant all"}
                  </Button>
                </div>
              </header>

              <div className="border-b border-slate-200 bg-slate-50/40 px-4 py-1.5">
                <div className="h-1 overflow-hidden rounded-full bg-slate-200">
                  <div className="h-full bg-indigo-500" style={{ width: `${cov.percent}%` }} />
                </div>
              </div>

              <div className="overflow-x-auto">
                <div className="min-w-[920px]">
                  {/* Header row */}
                  <div className={`${PERMISSION_GRID_CLASS} border-b border-slate-200 bg-slate-50/60`}>
                    <div className="flex h-12 items-center px-4 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                      Feature
                    </div>
                    <div className="flex h-12 items-center justify-center text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                      All
                    </div>
                    {TENANT_PERMISSION_ACTIONS.map((action) => (
                      <div key={action} className="flex h-12 items-center justify-center">
                        <PermissionColumnHeader
                          label={action}
                          checked={isColumnAllOn(group, action)}
                          onChange={(value) => setActionForModule(group, action, value)}
                        />
                      </div>
                    ))}
                  </div>
                  {/* Feature rows */}
                  {group.rows.map((row) => (
                    <div
                      key={row.label}
                      className={`${PERMISSION_GRID_CLASS} border-b border-slate-100 last:border-0 transition-colors hover:bg-slate-50/60`}
                    >
                      <div className="flex h-14 flex-col justify-center px-4">
                        <p className="text-[13px] font-medium leading-tight text-slate-900">{row.label}</p>
                        <p className="mt-0.5 text-[11px] leading-snug text-slate-500">{row.helper}</p>
                      </div>
                      <RbacMatrixCell
                        checked={isRowAllOn(row)}
                        onChange={(value) => setAllForFeatures(row.moduleCode, row.featureCodes, value)}
                        tone="view"
                      />
                      {TENANT_PERMISSION_ACTIONS.map((action) => (
                        <RbacMatrixCell
                          key={action}
                          checked={isRowActionOn(row, action)}
                          onChange={(value) => setActionForFeatures(row.moduleCode, row.featureCodes, action, value)}
                          tone={action}
                        />
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </section>
          );
        })
      )}
    </div>
  );
}

// Strict grid: feature column flexes, all other columns are fixed-width so
// every header and row cell line up pixel-perfect.
const PERMISSION_GRID_CLASS =
  "grid grid-cols-[minmax(280px,1fr)_80px_96px_96px_96px_96px_96px_96px] items-stretch";

function PermissionColumnHeader({
  label,
  checked,
  onChange,
}: {
  label: TenantPermissionAction;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  const { header } = ACTION_COLORS[label];
  return (
    <div className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] ${header}`}>
      <RbacCheckbox checked={checked} onChange={onChange} tone={label} />
      <span>{label}</span>
    </div>
  );
}

function RbacMatrixCell({
  checked,
  onChange,
  tone,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  tone: TenantPermissionAction;
}) {
  return (
    <div className="flex h-14 items-center justify-center">
      <RbacCheckbox checked={checked} onChange={onChange} tone={tone} />
    </div>
  );
}

function RbacCheckbox({
  checked,
  onChange,
  tone,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  tone: TenantPermissionAction;
}) {
  const { chip } = ACTION_COLORS[tone];
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`flex h-[18px] w-[18px] flex-none items-center justify-center rounded-[5px] border transition focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 ${
        checked ? `${chip} border-transparent` : "border-slate-300 bg-white hover:border-slate-400"
      }`}
    >
      {checked ? <CheckCircle2 className="h-3 w-3 text-white" /> : null}
    </button>
  );
}

export function TenantModulesPage() {
  const { tenantId, tenant } = useTenantRouteContext();
  const { data: moduleFeatures } = useTenantModules(tenantId);
  const { data: modules } = usePlatformModules();
  const moduleMap = new Map(modules.map((module) => [module.code, module]));
  const enabledModuleCodes = getAccessibleModuleCodes(tenant.enabledModuleCodes, modules);
  const disabledModules = modules.filter(
    (module) =>
      normalizeModuleKeys(tenant.enabledModuleCodes).includes(normalizeModuleKey(module.code)) &&
      !enabledModuleCodes.includes(normalizeModuleKey(module.code)),
  );
  const groupedModules = Array.from(
    moduleFeatures.reduce((map, moduleFeature) => {
      const current = map.get(moduleFeature.moduleCode) ?? [];
      current.push(moduleFeature);
      map.set(moduleFeature.moduleCode, current);
      return map;
    }, new Map<string, typeof moduleFeatures>()),
  );
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Tenant Admin"
        title="Modules"
        description="Review enabled tenant modules and the module features currently available inside each one."
      />
      <WorkspaceStatsBar
        items={[
          { label: "Enabled modules", value: String(groupedModules.length) },
          { label: "Module features", value: String(moduleFeatures.length) },
          { label: "Active features", value: String(moduleFeatures.filter((item) => item.status === "active").length) },
          { label: "Pilot features", value: String(moduleFeatures.filter((item) => item.status !== "active").length) },
        ]}
      />
      <WorkspaceNote>
        Enabled modules: {enabledModuleCodes.join(", ") || "None"}. Access removed immediately on module disable. Data is retained.
      </WorkspaceNote>
      {disabledModules.length ? (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Some tenant modules are currently unavailable in the UI: {disabledModules.map((module) => module.name).join(", ")}.
        </div>
      ) : null}
      {groupedModules.map(([moduleCode, moduleRows]) => (
        <TenantPanel
          key={moduleCode}
          title={moduleMap.get(moduleCode)?.name ?? moduleCode}
          description="Tenant-visible module catalog for this enabled module."
        >
          <DataTable
            title={`${moduleMap.get(moduleCode)?.name ?? moduleCode} module features`}
            description="Module actions are the basis for role-permission configuration."
            headers={["Feature", "Description", "Status", "Supported actions"]}
            rows={moduleRows.map((item) => [
              item.name,
              item.description,
              <Badge key={`${item.id}-status`} variant={item.status === "active" ? "success" : "warning"}>
                {item.status}
              </Badge>,
              <div key={`${item.id}-actions`} className="flex flex-wrap gap-1.5">
                {item.actions.map((action) => (
                  <Badge key={action} variant="secondary">
                    {action}
                  </Badge>
                ))}
              </div>,
            ])}
          />
        </TenantPanel>
      ))}
    </div>
  );
}

export const TenantCapabilitiesPage = TenantModulesPage;

export function TenantAuditLogsPage() {
  const { tenantId } = useTenantRouteContext();
  const { data } = useTenantAuditLogs(tenantId);
  const [search, setSearch] = useState("");
  const filteredLogs = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    if (!normalizedSearch) {
      return data;
    }
    return data.filter((item) =>
      `${item.actor} ${item.action} ${item.entityName} ${item.entityType} ${item.summary} ${item.changeType}`
        .toLowerCase()
        .includes(normalizedSearch),
    );
  }, [data, search]);
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Tenant Admin"
        title="Tenant Audit Logs"
        description="Tenant-scoped operational and administrative events with clear chronology and actor visibility."
      />
      <TenantFilterBar
        searchValue={search}
        searchPlaceholder="Search audit events by actor, action, or entity"
        onSearchChange={setSearch}
        trailing={<div className="text-sm text-muted-foreground">{filteredLogs.length} events shown</div>}
      />
      {filteredLogs.length ? (
        <DataTable
          title="Tenant events"
          description="Chronological tenant activity summary with entity and before/after placeholders."
          headers={["Timestamp", "Actor", "Action", "Entity", "Change type", "Result"]}
          rows={filteredLogs.map((item) => [
            new Date(item.timestamp).toLocaleString(),
            item.actor,
            item.action,
            `${item.entityType}: ${item.entityName}`,
            item.changeType,
            item.result,
          ])}
        />
      ) : (
        <TenantEmptyState
          title="No audit events match the current view"
          description="Adjust the search to widen the tenant audit list."
        />
      )}
    </div>
  );
}

export function TenantSettingsPage() {
  const { tenant } = useTenantRouteContext();
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Tenant Admin" title="Tenant Settings" description={`Manage tenant-scoped settings and know which controls remain platform-owned for ${tenant.name}.`} />
      <WorkspaceStatsBar
        items={[
          { label: "Workspace", value: tenant.name },
          { label: "Scope", value: "Tenant-owned administration" },
          { label: "Platform controls", value: "Handled by Optimile Admin" },
        ]}
      />
      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <TenantPanel title="Tenant-owned settings" description="These controls remain isolated inside this tenant workspace.">
          <div className="space-y-3">
            <SettingsRow
              label="Operational identity"
              value="Tenant name, structure, users, roles, and org-unit setup remain tenant-scoped."
            />
            <SettingsRow
              label="Role and access model"
              value="Role permissions and role-to-level mapping are maintained here and do not affect other tenants."
            />
            <SettingsRow
              label="Module deactivation UX"
              value="Access removed immediately on module disable. Data is retained and can be restored on re-enablement."
            />
          </div>
        </TenantPanel>
        <TenantPanel title="Platform-owned settings" description="These controls remain intentionally outside the tenant workspace.">
          <div className="space-y-3">
            <SettingsRow
              label="Commercial controls"
              value="Plan assignment and module enablement defaults are managed by Optimile Super Admin."
            />
            <SettingsRow
              label="Provisioning controls"
              value="This route is ready for future tenant-side settings without changing the existing data model."
            />
          </div>
        </TenantPanel>
      </div>
    </div>
  );
}

function SimpleTablePage({
  eyebrow,
  title,
  description,
  headers,
  rows,
}: {
  eyebrow: string;
  title: string;
  description: string;
  headers: string[];
  rows: ReactNode[][];
}) {
  return (
    <div className="space-y-6">
      <PageHeader eyebrow={eyebrow} title={title} description={description} />
      <DataTable title={title} description={description} headers={headers} rows={rows} />
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-sky-200/70 bg-sky-50/45 p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 font-medium">{value}</p>
    </div>
  );
}

function WorkspaceNote({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-sky-200/70 bg-sky-50/55 px-4 py-3 text-sm text-slate-700 shadow-sm">
      {children}
    </div>
  );
}

function WorkspaceStatsBar({
  items,
}: {
  items: Array<{ label: string; value: string }>;
}) {
  return (
    <div className="grid gap-3 rounded-3xl border border-border/75 bg-card/96 p-3 shadow-panel md:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="rounded-2xl border border-indigo-200/60 bg-indigo-50/45 px-4 py-4">
          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">{item.label}</p>
          <p className="mt-2 text-[0.95rem] font-semibold tracking-[-0.01em] text-foreground">{item.value}</p>
        </div>
      ))}
    </div>
  );
}

function SettingsRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/75 bg-slate-50/70 px-4 py-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <p className="font-medium tracking-[-0.01em]">{label}</p>
        <p className="max-w-[360px] text-sm leading-6 text-muted-foreground sm:text-right">{value}</p>
      </div>
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
    <div className="grid gap-2">
      <label className="text-sm font-medium">{label}</label>
      {children}
      {helper ? <p className="text-xs text-muted-foreground">{helper}</p> : null}
    </div>
  );
}

function PermissionCell({
  label,
  value,
  onToggle,
  withDivider,
}: {
  label: string;
  value: boolean;
  onToggle: () => void;
  withDivider?: boolean;
}) {
  return (
    <div className={`flex justify-center px-3 ${withDivider ? "border-r border-border/55" : ""}`}>
      <button
        type="button"
        onClick={onToggle}
        className={`group flex min-w-[82px] flex-col items-center rounded-2xl border px-3 py-2.5 text-center transition ${
          value
            ? "border-emerald-300 bg-emerald-50 text-emerald-900 shadow-sm hover:border-emerald-400 hover:bg-emerald-100"
            : "border-slate-200 bg-slate-50/75 text-slate-600 hover:border-indigo-200 hover:bg-indigo-50/65 hover:text-slate-900"
        }`}
        aria-pressed={value}
        aria-label={`${label} permission ${value ? "enabled" : "disabled"}`}
      >
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em]">{label}</span>
        <span className="mt-1 text-xs font-medium">{value ? "Enabled" : "Disabled"}</span>
      </button>
    </div>
  );
}

function swapItems<T>(items: T[], sourceIndex: number, targetIndex: number) {
  if (targetIndex < 0 || targetIndex >= items.length) {
    return items;
  }
  const next = [...items];
  [next[sourceIndex], next[targetIndex]] = [next[targetIndex], next[sourceIndex]];
  return next;
}

function buildOrgUnitPath(orgUnitId: string, orgUnits: OrgUnit[]) {
  const unitMap = new Map(orgUnits.map((unit) => [unit.id, unit]));
  const parts: string[] = [];
  let current = unitMap.get(orgUnitId);

  while (current) {
    parts.unshift(current.name);
    current = current.parentOrgUnitId ? unitMap.get(current.parentOrgUnitId) : undefined;
  }

  return parts.join(" / ");
}

function buildPathPreview(name: string, parentOrgUnitId: string | null, orgUnits: OrgUnit[]) {
  if (!parentOrgUnitId) {
    return name.trim() || "The new org unit will be saved at the top/root level.";
  }

  const parentPath = buildOrgUnitPath(parentOrgUnitId, orgUnits);
  return `${parentPath} / ${name.trim() || "New org unit"}`;
}

function buildOrgUnitTreeRows(orgUnits: OrgUnit[], levelMap: Map<string, string>) {
  const rows: ReactNode[] = [];
  const roots = orgUnits.filter((unit) => !unit.parentOrgUnitId);

  function walk(unit: OrgUnit, depth: number) {
    rows.push(
      <div key={unit.id} style={{ paddingLeft: `${depth * 18}px` }}>
        <span className="font-medium">{levelMap.get(unit.hierarchyLevelId) ?? unit.hierarchyLevelId}</span>
        {": "}
        {unit.name}
      </div>,
    );

    orgUnits
      .filter((child) => child.parentOrgUnitId === unit.id)
      .forEach((child) => walk(child, depth + 1));
  }

  roots.forEach((root) => walk(root, 0));

  if (!rows.length) {
    rows.push("No org units created yet.");
  }

  return rows;
}

function isRoleAssignableToUserType(role: { name: string; dataScope?: string }, userType: UserType) {
  const normalizedName = role.name.trim().toLowerCase();

  if (userType === "CUSTOMER") {
    return role.dataScope === "CUSTOMER" || normalizedName.includes("customer");
  }
  if (userType === "VENDOR") {
    return role.dataScope === "VENDOR" || normalizedName.includes("vendor");
  }
  if (userType === "DRIVER") {
    return role.dataScope === "DRIVER" || normalizedName.includes("driver");
  }

  return !(
    role.dataScope === "CUSTOMER" ||
    role.dataScope === "VENDOR" ||
    role.dataScope === "DRIVER" ||
    normalizedName.includes("customer") ||
    normalizedName.includes("vendor") ||
    normalizedName.includes("driver")
  );
}

function buildOrgUnitLabel(
  orgUnitId: string,
  orgUnits: OrgUnit[],
  levelMap: Map<string, string>,
) {
  const unitMap = new Map(orgUnits.map((unit) => [unit.id, unit]));
  const parts: string[] = [];
  let current = unitMap.get(orgUnitId);

  while (current) {
    parts.unshift(current.name);
    current = current.parentOrgUnitId ? unitMap.get(current.parentOrgUnitId) : undefined;
  }

  const leaf = unitMap.get(orgUnitId);
  return `${leaf ? levelMap.get(leaf.hierarchyLevelId) ?? leaf.hierarchyLevelId : ""} / ${parts.join(" / ")}`;
}
