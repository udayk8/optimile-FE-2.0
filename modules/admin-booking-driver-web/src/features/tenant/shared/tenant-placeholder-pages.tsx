import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { DataTable } from "@/components/common/data-table";
import { PageHeader } from "@/components/common/page-header";
import {
  TenantEmptyState,
  TenantFilterBar,
  TenantPanel,
} from "@/components/tenant/tenant-primitives";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useTenantAuditLogs } from "@/hooks/useTenantAuditLogs";
import { useTenantCustomers } from "@/hooks/useTenantCustomers";
import { useTenantHierarchy } from "@/hooks/useTenantHierarchy";
import { useTenantModules } from "@/hooks/useTenantModules";
import { useTenantOrgTypes } from "@/hooks/useTenantOrgTypes";
import { useTenantOrgUnits } from "@/hooks/useTenantOrgUnits";
import { usePlatformModules } from "@/hooks/usePlatformModules";
import { useTenantRolePermissions } from "@/hooks/useTenantRolePermissions";
import { useTenantRoles } from "@/hooks/useTenantRoles";
import { useTenantRouteContext } from "@/hooks/useTenantRouteContext";
import { useTenantUsers } from "@/hooks/useTenantUsers";
import { useTenantVendors } from "@/hooks/useTenantVendors";
import { getHierarchyTemplateLabel } from "@/lib/hierarchy-templates";
import {
  getAccessibleModuleCodes,
  normalizeModuleKey,
  normalizeModuleKeys,
  getUserTypeBadgeVariant,
  getUserTypeLabel,
  getUserTypeScopeLabel,
  hierarchyLabelSuggestions,
} from "@/lib/tenant-admin";
import type { OrgUnit, RolePermission, UserRecord, UserStatus, UserType } from "@/types/access";

export function TenantHierarchyPage() {
  const { tenantId } = useTenantRouteContext();
  const { data: hierarchyState, saveHierarchy } = useTenantHierarchy(tenantId);
  const { data: orgUnits } = useTenantOrgUnits(tenantId);
  const { data: roles } = useTenantRoles(tenantId);
  const [levels, setLevels] = useState(
    [...hierarchyState.hierarchy.levels].sort((a, b) => a.order - b.order).map((level) => ({ ...level })),
  );
  const [message, setMessage] = useState("");

  function updateLevels(updater: (current: typeof levels) => typeof levels) {
    setLevels((current) =>
      updater(current).map((level, index) => ({
        ...level,
        order: index + 1,
      })),
    );
  }

  function saveLevels() {
    const nextLevels = levels
      .map((level, index) => ({
        ...level,
        name: level.name.trim() || `Level ${index + 1}`,
        order: index + 1,
      }))
      .filter((level) => level.name);

    const nextLevelOrder = new Map(nextLevels.map((level) => [level.id, level.order]));
    const invalidOrgUnit = orgUnits.find((unit) => {
      const currentOrder = nextLevelOrder.get(unit.hierarchyLevelId);
      if (!currentOrder) {
        return true;
      }

      if (currentOrder === 1) {
        return !!unit.parentOrgUnitId;
      }

      const parent = orgUnits.find((item) => item.id === unit.parentOrgUnitId);
      if (!parent) {
        return true;
      }

      return nextLevelOrder.get(parent.hierarchyLevelId) !== currentOrder - 1;
    });

    if (invalidOrgUnit) {
      setMessage(
        "This hierarchy change would break existing org units. Adjust or move those org units first, then save the new level order.",
      );
      return;
    }

    saveHierarchy({
      ...hierarchyState.hierarchy,
      levels: nextLevels,
    });
    setLevels(nextLevels);
    setMessage("Hierarchy structure saved and persisted.");
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Tenant Admin"
        title="Hierarchy Structure"
        description="Step 1 of 2. Define the hierarchy levels from top to bottom. These are level types, not business entries."
        action={
          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={() =>
                updateLevels((current) => [
                  ...current,
                  {
                    id: `level-${Date.now()}`,
                    tenantId,
                    order: current.length + 1,
                    name: `Level ${current.length + 1}`,
                    active: true,
                  },
                ])
              }
            >
              Add Level
            </Button>
            <Button onClick={saveLevels}>Save Hierarchy Structure</Button>
          </div>
        }
      />

      <WorkspaceStatsBar
        items={[
          { label: "Starting template", value: getHierarchyTemplateLabel(hierarchyState.startingBlueprint) },
          { label: "Current order", value: levels.map((level) => level.name).join(" -> ") },
          { label: "Active levels", value: String(levels.filter((level) => level.active).length) },
          { label: "Last updated", value: hierarchyState.hierarchy.lastUpdated.slice(0, 10) },
        ]}
      />

      <WorkspaceNote>
        Arrange levels from top to bottom. Suggested optional labels: {hierarchyLabelSuggestions.join(", ")}. Example: Region {"->"} Zone {"->"} Branch {"->"} SubBranch.
      </WorkspaceNote>

      {message ? (
        <div className="rounded-2xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {message}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <DataTable
          title="Hierarchy levels"
          description="Manage the ordered level list only."
          headers={["Order", "Level name", "Status", "Actions"]}
          rows={levels.map((level, index) => [
            String(index + 1),
            <Input
              key={`${level.id}-name`}
              value={level.name}
              onChange={(event) =>
                updateLevels((current) =>
                  current.map((item) =>
                    item.id === level.id ? { ...item, name: event.target.value } : item,
                  ),
                )
              }
            />,
            <Button
              key={`${level.id}-status`}
              size="sm"
              variant={level.active ? "secondary" : "outline"}
              onClick={() =>
                updateLevels((current) =>
                  current.map((item) =>
                    item.id === level.id ? { ...item, active: !item.active } : item,
                  ),
                )
              }
            >
              {level.active ? "Active" : "Inactive"}
            </Button>,
            <div key={`${level.id}-actions`} className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" disabled={index === 0} onClick={() => updateLevels((current) => swapItems(current, index, index - 1))}>
                Up
              </Button>
              <Button size="sm" variant="outline" disabled={index === levels.length - 1} onClick={() => updateLevels((current) => swapItems(current, index, index + 1))}>
                Down
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={levels.length <= 1}
                onClick={() => {
                  if (orgUnits.some((unit) => unit.hierarchyLevelId === level.id)) {
                    setMessage("This level already has org units. Move or delete those org units before deleting the level.");
                    return;
                  }
                  if (roles.some((role) => role.hierarchyLevelId === level.id)) {
                    setMessage("This level is mapped to one or more roles. Reassign those roles before deleting the level.");
                    return;
                  }
                  updateLevels((current) => current.filter((item) => item.id !== level.id));
                }}
              >
                Delete
              </Button>
            </div>,
          ])}
        />

        <DataTable
          title="Preview"
          description="This final order is used during org-unit creation."
          headers={["Position", "Level", "Meaning"]}
          rows={levels.map((level, index) => [
            String(index + 1),
            level.name,
            index === 0 ? "Top/root level" : "Child level",
          ])}
        />
      </div>
    </div>
  );
}

export function TenantOrgUnitsPage() {
  const { tenantId } = useTenantRouteContext();
  const { data: levels } = useTenantOrgTypes(tenantId);
  const { data: orgUnits, createOrgUnit, updateOrgUnit, deleteOrgUnit } = useTenantOrgUnits(tenantId);
  const [open, setOpen] = useState(false);
  const [editingUnitId, setEditingUnitId] = useState<string | null>(null);
  const [confirmStatusUnitId, setConfirmStatusUnitId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({
    name: "",
    hierarchyLevelId: levels[0]?.id ?? "",
    parentOrgUnitId: "",
    status: "active" as OrgUnit["status"],
  });

  const orderedLevels = [...levels].sort((a, b) => a.order - b.order);
  const levelMap = new Map(orderedLevels.map((level) => [level.id, level.name]));
  const selectedLevelIndex = orderedLevels.findIndex((level) => level.id === form.hierarchyLevelId);
  const previousLevelId = selectedLevelIndex > 0 ? orderedLevels[selectedLevelIndex - 1]?.id ?? "" : "";
  const isRootLevel = selectedLevelIndex <= 0;
  const validParentOptions = orgUnits.filter((unit) => unit.hierarchyLevelId === previousLevelId);
  const filteredOrgUnits = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    if (!normalizedSearch) {
      return orgUnits;
    }
    return orgUnits.filter((unit) =>
      `${unit.name} ${buildOrgUnitPath(unit.id, orgUnits)} ${levelMap.get(unit.hierarchyLevelId) ?? ""}`
        .toLowerCase()
        .includes(normalizedSearch),
    );
  }, [levelMap, orgUnits, search]);

  function openCreateDialog(parentOrgUnitId = "") {
    setEditingUnitId(null);
    setForm({
      name: "",
      hierarchyLevelId: levels[0]?.id ?? "",
      parentOrgUnitId,
      status: "active",
    });
    setOpen(true);
  }

  function openEditDialog(unit: OrgUnit) {
    setEditingUnitId(unit.id);
    setForm({
      name: unit.name,
      hierarchyLevelId: unit.hierarchyLevelId,
      parentOrgUnitId: unit.parentOrgUnitId ?? "",
      status: unit.status,
    });
    setOpen(true);
  }

  function saveOrgUnit() {
    if (!form.name.trim() || !form.hierarchyLevelId) {
      setMessage("Enter the org unit name and choose a hierarchy level.");
      return;
    }

    if (!isRootLevel && !form.parentOrgUnitId) {
      setMessage("Choose a parent org unit from the immediately previous level.");
      return;
    }

    if (!isRootLevel && !validParentOptions.some((unit) => unit.id === form.parentOrgUnitId)) {
      setMessage("The selected parent is not valid for this hierarchy level.");
      return;
    }

    const payload = {
      tenantId,
      name: form.name.trim(),
      hierarchyLevelId: form.hierarchyLevelId,
      parentOrgUnitId: isRootLevel ? null : form.parentOrgUnitId || null,
      status: form.status,
    };

    if (editingUnitId) {
      updateOrgUnit(editingUnitId, payload);
      setMessage("Org unit updated and persisted.");
    } else {
      createOrgUnit(payload);
      setMessage("Org unit created and persisted.");
    }
    setOpen(false);
  }

  const pathPreview = buildPathPreview(form.name, form.parentOrgUnitId || null, orgUnits);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Tenant Admin"
        title="Org Units"
        description="Step 2 of 2. Hierarchy levels define the structure. Org units are the real business entries under those levels."
        action={<Button onClick={() => openCreateDialog()}>Add Org Unit</Button>}
      />

      <WorkspaceNote>
        Hierarchy levels define the structure. Org units are the real business values, such as North, Delhi Zone, Chennai Branch, or Depot 1.
      </WorkspaceNote>

      {message ? (
        <div className="rounded-2xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {message}
        </div>
      ) : null}

      <TenantFilterBar
        searchValue={search}
        searchPlaceholder="Search org units by name, level, or full path"
        onSearchChange={setSearch}
        trailing={<div className="text-sm text-muted-foreground">{filteredOrgUnits.length} org units shown</div>}
      />

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <DataTable
          title="Saved org units"
          description="Business nodes persisted for this tenant and linked through the hierarchy path."
          headers={["Org unit", "Level", "Parent", "Path", "Status", "Actions"]}
          rows={filteredOrgUnits.map((unit) => [
            <div key={`${unit.id}-name`} className="min-w-[180px]">
              <p className="font-medium">{unit.name}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {levelMap.get(unit.hierarchyLevelId) ?? unit.hierarchyLevelId}
              </p>
            </div>,
            levelMap.get(unit.hierarchyLevelId) ?? unit.hierarchyLevelId,
            unit.parentOrgUnitId
              ? orgUnits.find((item) => item.id === unit.parentOrgUnitId)?.name ?? unit.parentOrgUnitId
              : "Root",
            buildOrgUnitPath(unit.id, orgUnits),
            <Badge key={`${unit.id}-status`} variant={unit.status === "active" ? "success" : "warning"}>
              {unit.status}
            </Badge>,
            <div key={`${unit.id}-actions`} className="flex flex-wrap gap-1.5">
              <Button size="sm" variant="ghost" onClick={() => openCreateDialog(unit.id)}>
                Add Child
              </Button>
              <Button size="sm" variant="ghost" onClick={() => openEditDialog(unit)}>
                Edit
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setConfirmStatusUnitId(unit.id)}
              >
                {unit.status === "active" ? "Disable" : "Enable"}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  const removed = deleteOrgUnit(unit.id);
                  setMessage(
                    removed
                      ? "Org unit deleted."
                      : "Org unit cannot be deleted while it still has child org units or assigned users.",
                  );
                }}
              >
                Delete
              </Button>
            </div>,
          ])}
        />

        <DataTable
          title="Connected tree"
          description="Operational structure preview using the current tenant org-unit hierarchy."
          headers={["Tree"]}
          rows={buildOrgUnitTreeRows(orgUnits, levelMap).map((row) => [row])}
        />
      </div>

      <Dialog
        open={open}
        onOpenChange={setOpen}
        title={editingUnitId ? "Edit org unit" : "Add org unit"}
        description="Use this guided form to place the org unit at the correct level under the correct parent."
        widthClassName="max-w-2xl"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveOrgUnit}>{editingUnitId ? "Save Changes" : "Create Org Unit"}</Button>
          </div>
        }
      >
        <div className="grid gap-4">
          <WorkspaceNote>
            Choose the business level first. If the selected level is not the root, the parent must come from the immediately higher level.
          </WorkspaceNote>
          <Field label="Org unit name" helper="This is the real business value, such as North, Delhi Zone, Chennai Branch, or Depot 1.">
            <Input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
          </Field>
          <Field label="Hierarchy level" helper="Select which hierarchy level this org unit belongs to.">
            <Select
              value={form.hierarchyLevelId}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  hierarchyLevelId: event.target.value,
                  parentOrgUnitId: "",
                }))
              }
            >
              <option value="">Select level</option>
              {orderedLevels.map((level) => (
                <option key={level.id} value={level.id}>
                  {level.name}
                </option>
              ))}
            </Select>
          </Field>
          {!isRootLevel ? (
            <Field label="Parent org unit" helper={`Required for this level. Only ${levelMap.get(previousLevelId) ?? "previous-level"} org units are shown.`}>
              <Select value={form.parentOrgUnitId} onChange={(event) => setForm((current) => ({ ...current, parentOrgUnitId: event.target.value }))}>
                <option value="">Select parent</option>
                {validParentOptions.map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {unit.name}
                  </option>
                ))}
              </Select>
            </Field>
          ) : (
            <Field label="Parent org unit" helper="Top/root level org units do not need a parent.">
              <Input value="Not required for root level" disabled />
            </Field>
          )}
          <Field label="Status">
            <Select value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as OrgUnit["status"] }))}>
              <option value="active">Active</option>
              <option value="planned">Planned</option>
            </Select>
          </Field>
          <div className="rounded-2xl border bg-muted/18 p-4">
            <p className="text-sm font-medium">Path preview</p>
            <p className="mt-2 text-sm text-muted-foreground">{pathPreview}</p>
          </div>
        </div>
      </Dialog>
      <Dialog
        open={!!confirmStatusUnitId}
        onOpenChange={(open) => setConfirmStatusUnitId(open ? confirmStatusUnitId : null)}
        title={orgUnits.find((unit) => unit.id === confirmStatusUnitId)?.status === "active" ? "Disable org unit" : "Enable org unit"}
        description="Confirm this org unit status change. Existing structure remains intact, but this changes its operational visibility."
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setConfirmStatusUnitId(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                const target = orgUnits.find((unit) => unit.id === confirmStatusUnitId);
                if (!target) return;
                updateOrgUnit(target.id, {
                  status: target.status === "active" ? "planned" : "active",
                });
                setMessage(`Org unit ${target.status === "active" ? "disabled" : "enabled"} successfully.`);
                setConfirmStatusUnitId(null);
              }}
            >
              Confirm
            </Button>
          </div>
        }
      >
        <div className="rounded-2xl border bg-muted/20 p-4 text-sm text-muted-foreground">
          Use this when the org unit should be hidden from active operations without changing its position in the hierarchy.
        </div>
      </Dialog>
    </div>
  );
}

export function TenantUsersPage() {
  const { tenantId, tenant } = useTenantRouteContext();
  const { data: users, createUser, updateUser } = useTenantUsers(tenantId);
  const { data: orgUnits } = useTenantOrgUnits(tenantId);
  const { data: roles } = useTenantRoles(tenantId);
  const { data: levels } = useTenantOrgTypes(tenantId);
  const { data: vendors } = useTenantVendors(tenantId);
  const { data: customers } = useTenantCustomers(tenantId);
  const { data: modules } = usePlatformModules();
  const [open, setOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [userTypeFilter, setUserTypeFilter] = useState("all");
  const [form, setForm] = useState({
    name: "",
    email: "",
    roleId: roles[0]?.id ?? "",
    orgUnitIds: [] as string[],
    userType: "INTERNAL" as UserType,
    linkedVendorId: "",
    linkedCustomerId: "",
    driverName: "",
    driverCode: "",
    status: "invited" as UserStatus,
  });

  const levelMap = new Map(levels.map((level) => [level.id, level.name]));
  const roleMap = new Map(roles.map((role) => [role.id, role]));
  const moduleMap = new Map(modules.map((module) => [module.code, module]));
  const vendorMap = new Map(vendors.map((vendor) => [vendor.id, vendor]));
  const customerMap = new Map(customers.map((customer) => [customer.id, customer]));
  const enabledModuleSet = new Set(getAccessibleModuleCodes(tenant.enabledModuleCodes, modules));
  const validRoles = roles.filter(
    (role) =>
      role.active &&
      role.moduleCodes.length > 0 &&
      normalizeModuleKeys(role.moduleCodes).every((code) => enabledModuleSet.has(code)),
  );
  const selectedRole = roles.find((role) => role.id === form.roleId) ?? null;
  const allowedOrgUnits = selectedRole && form.userType === "INTERNAL"
    ? orgUnits.filter((unit) => unit.hierarchyLevelId === selectedRole.hierarchyLevelId)
    : [];
  const mappedLevelName = selectedRole
    ? levelMap.get(selectedRole.hierarchyLevelId) ?? selectedRole.hierarchyLevelId
    : "";
  const duplicateEmail = users.some(
    (user) => user.id !== editingUserId && user.email.trim().toLowerCase() === form.email.trim().toLowerCase(),
  );
  const filteredUsers = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return users.filter((user) => {
      if (statusFilter !== "all" && user.status !== statusFilter) {
        return false;
      }
      if (userTypeFilter !== "all" && user.userType !== userTypeFilter) {
        return false;
      }
      if (
        normalizedSearch &&
        !`${user.name} ${user.email} ${roleMap.get(user.roleId)?.name ?? ""} ${user.userType}`
          .toLowerCase()
          .includes(normalizedSearch)
      ) {
        return false;
      }
      return true;
    });
  }, [roleMap, search, statusFilter, userTypeFilter, users]);

  function openCreateDialog() {
    setEditingUserId(null);
    setForm({
      name: "",
      email: "",
      roleId: validRoles[0]?.id ?? "",
      orgUnitIds: [],
      userType: "INTERNAL",
      linkedVendorId: "",
      linkedCustomerId: "",
      driverName: "",
      driverCode: "",
      status: "invited",
    });
    setOpen(true);
  }

  function openEditDialog(userId: string) {
    const user = users.find((item) => item.id === userId);
    if (!user) {
      return;
    }
    setEditingUserId(user.id);
    setForm({
      name: user.name,
      email: user.email,
      roleId: user.roleId,
      orgUnitIds: user.orgUnitIds,
      userType: user.userType,
      linkedVendorId: user.linkedVendorId ?? "",
      linkedCustomerId: user.linkedCustomerId ?? "",
      driverName: user.driverName ?? "",
      driverCode: user.driverCode ?? "",
      status: user.status,
    });
    setOpen(true);
  }

  function saveUser() {
    if (!form.name.trim() || !form.email.trim() || !form.roleId) {
      setMessage("Enter name, email, and one role.");
      return;
    }
    if (!validRoles.some((role) => role.id === form.roleId)) {
      setMessage("Select an active role whose mapped modules are enabled for this tenant.");
      return;
    }
    if (form.userType === "INTERNAL" && !form.orgUnitIds.length) {
      setMessage("Assign at least one org unit for this internal user.");
      return;
    }
    if (form.userType === "VENDOR" && !form.linkedVendorId) {
      setMessage("Link a vendor record for this vendor user.");
      return;
    }
    if (form.userType === "DRIVER" && !`${form.driverName}${form.driverCode}`.trim()) {
      setMessage("Enter a driver name or a driver code for this driver user.");
      return;
    }
    if (form.userType === "CUSTOMER" && !form.linkedCustomerId) {
      setMessage("Link a customer record for this customer user.");
      return;
    }

    const payload = {
      tenantId,
      name: form.name.trim(),
      email: form.email.trim().toLowerCase(),
      userType: form.userType,
      roleId: form.roleId,
      orgUnitIds: form.userType === "INTERNAL" ? form.orgUnitIds : [],
      linkedVendorId: form.userType === "VENDOR" ? form.linkedVendorId || null : null,
      linkedCustomerId: form.userType === "CUSTOMER" ? form.linkedCustomerId || null : null,
      driverName: form.userType === "DRIVER" ? form.driverName.trim() : "",
      driverCode: form.userType === "DRIVER" ? form.driverCode.trim() : "",
      status: form.status,
    };

    try {
      if (editingUserId) {
        updateUser(editingUserId, payload);
        setMessage("User updated and persisted.");
      } else {
        createUser(payload);
        setMessage("User created and persisted.");
      }
      setOpen(false);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "User could not be saved.");
    }
  }

  function toggleOrgUnit(orgUnitId: string) {
    setForm((current) => ({
      ...current,
      orgUnitIds: current.orgUnitIds.includes(orgUnitId)
        ? current.orgUnitIds.filter((item) => item !== orgUnitId)
        : [...current.orgUnitIds, orgUnitId],
    }));
  }

  function updateUserType(nextUserType: UserType) {
    setForm((current) => ({
      ...current,
      userType: nextUserType,
      orgUnitIds: nextUserType === "INTERNAL" ? current.orgUnitIds : [],
      linkedVendorId: nextUserType === "VENDOR" ? current.linkedVendorId : "",
      linkedCustomerId: nextUserType === "CUSTOMER" ? current.linkedCustomerId : "",
      driverName: nextUserType === "DRIVER" ? current.driverName : "",
      driverCode: nextUserType === "DRIVER" ? current.driverCode : "",
    }));
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Tenant Admin"
        title="Users"
        description="Create internal, vendor, driver, and customer-ready users without splitting the user system into separate modules."
        action={<Button onClick={openCreateDialog}>Add User</Button>}
      />

      <WorkspaceStatsBar
        items={[
          { label: "Users", value: String(users.length) },
          { label: "Active", value: String(users.filter((user) => user.status === "active").length) },
          { label: "Invited", value: String(users.filter((user) => user.status === "invited").length) },
          { label: "User types", value: String(new Set(users.map((user) => user.userType)).size) },
        ]}
      />

      <WorkspaceNote>
        Single role currently supported (multi-role ready). Internal users require org-unit assignment. Vendor and driver users show scoped access indicators only.
      </WorkspaceNote>

      {message ? (
        <div className="rounded-2xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {message}
        </div>
      ) : null}

      <TenantFilterBar
        searchValue={search}
        searchPlaceholder="Search users by name, email, or role"
        onSearchChange={setSearch}
        filters={
          <>
            <Select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="invited">Invited</option>
              <option value="suspended">Suspended</option>
            </Select>
            <Select value={userTypeFilter} onChange={(event) => setUserTypeFilter(event.target.value)}>
              <option value="all">All types</option>
              <option value="INTERNAL">Internal</option>
              <option value="VENDOR">Vendor</option>
              <option value="DRIVER">Driver</option>
              <option value="CUSTOMER">Customer</option>
            </Select>
          </>
        }
        trailing={<div className="text-sm text-muted-foreground">{filteredUsers.length} users shown</div>}
      />

      {filteredUsers.length ? (
        <DataTable
          title="Users"
          description="Role assignment remains valid only when the role is active and all mapped modules are still enabled for this tenant."
          headers={["User", "Role", "Modules", "Allowed level", "Assigned org units", "Status", "Actions"]}
          rows={filteredUsers.map((user) => [
            <div key={`${user.id}-identity`} className="min-w-[190px]">
              <p className="font-medium">{user.name}</p>
              <p className="mt-1 text-sm text-muted-foreground">{user.email}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <Badge variant={getUserTypeBadgeVariant(user.userType)}>{getUserTypeLabel(user.userType)}</Badge>
                {getUserTypeScopeLabel(user.userType) ? (
                  <Badge variant="warning">{getUserTypeScopeLabel(user.userType)}</Badge>
                ) : null}
              </div>
            </div>,
            <div key={`${user.id}-role`}>
              <p>{roleMap.get(user.roleId)?.name ?? user.roleId}</p>
              {!roleMap.get(user.roleId)?.active || !normalizeModuleKeys(roleMap.get(user.roleId)?.moduleCodes ?? []).every((code) => enabledModuleSet.has(code)) ? (
                <p className="mt-1 text-xs text-amber-700">Restricted role</p>
              ) : null}
            </div>,
            <div key={`${user.id}-modules`} className="flex flex-wrap gap-1.5">
              {normalizeModuleKeys(roleMap.get(user.roleId)?.moduleCodes ?? []).map((moduleCode) => (
                <Badge key={`${user.id}-${moduleCode}`} variant={enabledModuleSet.has(moduleCode) ? "accent" : "warning"}>
                  {moduleMap.get(moduleCode)?.name ?? moduleCode}
                </Badge>
              ))}
            </div>,
            levelMap.get(roleMap.get(user.roleId)?.hierarchyLevelId ?? "") ?? "-",
            user.userType === "INTERNAL"
              ? user.orgUnitIds.map((orgUnitId) => buildOrgUnitLabel(orgUnitId, orgUnits, levelMap)).join(", ")
              : user.userType === "VENDOR"
                ? vendorMap.get(user.linkedVendorId ?? "")?.name ?? "Scoped vendor user"
                : user.userType === "CUSTOMER"
                  ? customerMap.get(user.linkedCustomerId ?? "")?.name ?? "Scoped customer user"
                  : `${user.driverName || "Driver profile"}${user.driverCode ? ` (${user.driverCode})` : ""}`,
            <Badge key={`${user.id}-status`} variant={user.status === "active" ? "success" : user.status === "invited" ? "secondary" : "warning"}>
              {user.status}
            </Badge>,
            <div key={`${user.id}-actions`} className="flex gap-1.5">
              <Button asChild size="sm" variant="ghost">
                <Link to={`/tenant/${tenant.id}/users/${user.id}`}>View Details</Link>
              </Button>
              <Button size="sm" variant="ghost" onClick={() => openEditDialog(user.id)}>
                Edit
              </Button>
            </div>,
          ])}
        />
      ) : (
        <TenantEmptyState
          title="No users match the current view"
          description={
            users.length
              ? "Adjust the search or status filter to widen the tenant user list."
              : "Create the first tenant user to assign a role and connect access to the right org units."
          }
          action={!users.length ? <Button onClick={openCreateDialog}>Add User</Button> : null}
        />
      )}

      <Dialog
        open={open}
        onOpenChange={setOpen}
        title={editingUserId ? "Edit user" : "Add user"}
        description="Choose one valid role first. User type then controls the conditional fields shown below."
        widthClassName="max-w-3xl"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveUser}>{editingUserId ? "Save Changes" : "Create User"}</Button>
          </div>
        }
      >
        <div className="grid gap-4">
          <WorkspaceNote>
            A user has one role. Only active roles whose mapped modules are enabled for this tenant can be assigned. Single role currently supported (multi-role ready).
          </WorkspaceNote>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Name">
              <Input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
            </Field>
            <Field label="Email">
              <Input value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} />
            </Field>
          </div>
          {duplicateEmail ? <div className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">This email already exists in the tenant user list. This is a non-blocking frontend hint.</div> : null}
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="User type" helper="INTERNAL, VENDOR, DRIVER, and CUSTOMER-ready all live in the same user module.">
              <Select value={form.userType} onChange={(event) => updateUserType(event.target.value as UserType)}>
                <option value="INTERNAL">Internal</option>
                <option value="VENDOR">Vendor</option>
                <option value="DRIVER">Driver</option>
                <option value="CUSTOMER">Customer</option>
              </Select>
            </Field>
            <Field label="Role" helper="Single select only.">
              <Select
                value={form.roleId}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    roleId: event.target.value,
                    orgUnitIds: [],
                  }))
                }
              >
                <option value="">Select role</option>
                {validRoles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
                {selectedRole && !validRoles.some((role) => role.id === selectedRole.id) ? (
                  <option value={selectedRole.id}>
                    {selectedRole.name} (restricted, reassign required)
                  </option>
                ) : null}
              </Select>
            </Field>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Allowed hierarchy level" helper="This comes directly from the selected role and drives org-unit filtering.">
              <Input value={mappedLevelName || "Select a role first"} disabled />
            </Field>
            <Field label="Scoped access">
              <Input value={getUserTypeScopeLabel(form.userType) ?? "RBAC scope via role and org units"} disabled />
            </Field>
          </div>
          <Field label="Role modules" helper="Users cannot be assigned to roles linked to disabled modules.">
            <div className="flex min-h-[52px] flex-wrap gap-2 rounded-2xl border bg-muted/20 px-4 py-3">
              {selectedRole ? (
                normalizeModuleKeys(selectedRole.moduleCodes).map((moduleCode) => (
                  <Badge key={moduleCode} variant={enabledModuleSet.has(moduleCode) ? "accent" : "warning"}>
                    {moduleMap.get(moduleCode)?.name ?? moduleCode}
                  </Badge>
                ))
              ) : (
                <span className="text-sm text-muted-foreground">Select a role first.</span>
              )}
            </div>
          </Field>
          {form.userType === "INTERNAL" ? (
            <Field
              label="Assigned org units"
              helper={
                selectedRole
                  ? `Only ${mappedLevelName} org units are available for this role. You can assign one or more units from this level.`
                  : "Select a role first to load valid org units."
              }
            >
              <div className="grid max-h-[320px] gap-3 overflow-y-auto rounded-2xl border bg-muted/20 p-4 md:grid-cols-2">
                {allowedOrgUnits.length ? (
                  allowedOrgUnits.map((unit) => (
                    <label
                      key={unit.id}
                      className={`flex items-start gap-3 rounded-2xl border px-4 py-3 transition ${
                        form.orgUnitIds.includes(unit.id) ? "border-primary/50 bg-primary/5 shadow-sm" : "bg-background/80 hover:border-primary/20 hover:bg-muted/20"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={form.orgUnitIds.includes(unit.id)}
                        onChange={() => toggleOrgUnit(unit.id)}
                        className="mt-1"
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{unit.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {buildOrgUnitLabel(unit.id, orgUnits, levelMap)}
                        </p>
                      </div>
                    </label>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {selectedRole
                      ? `No org units exist yet at the ${mappedLevelName} level.`
                      : "Select a role to see valid org units."}
                  </p>
                )}
              </div>
            </Field>
          ) : null}
          {form.userType === "VENDOR" ? (
            <Field label="Linked vendor" helper="Required for vendor users. This drives the scoped own-data indicator.">
              <Select value={form.linkedVendorId} onChange={(event) => setForm((current) => ({ ...current, linkedVendorId: event.target.value }))}>
                <option value="">Select vendor</option>
                {vendors.map((vendor) => (
                  <option key={vendor.id} value={vendor.id}>
                    {vendor.name}
                  </option>
                ))}
              </Select>
            </Field>
          ) : null}
          {form.userType === "CUSTOMER" ? (
            <Field label="Linked customer" helper="Required for customer-ready users.">
              <Select value={form.linkedCustomerId} onChange={(event) => setForm((current) => ({ ...current, linkedCustomerId: event.target.value }))}>
                <option value="">Select customer</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name}
                  </option>
                ))}
              </Select>
            </Field>
          ) : null}
          {form.userType === "DRIVER" ? (
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Driver name" helper="Required if no driver code is entered.">
                <Input value={form.driverName} onChange={(event) => setForm((current) => ({ ...current, driverName: event.target.value }))} />
              </Field>
              <Field label="Driver code" helper="Required if no driver name is entered.">
                <Input value={form.driverCode} onChange={(event) => setForm((current) => ({ ...current, driverCode: event.target.value }))} />
              </Field>
            </div>
          ) : null}
          <Field label="Status">
            <Select value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as UserStatus }))}>
              <option value="active">Active</option>
              <option value="invited">Invited</option>
              <option value="suspended">Suspended</option>
            </Select>
          </Field>
        </div>
      </Dialog>
    </div>
  );
}

export function TenantRolesPage() {
  const { tenantId, tenant } = useTenantRouteContext();
  const { data: roles, createRole, updateRole } = useTenantRoles(tenantId);
  const { data: levels } = useTenantOrgTypes(tenantId);
  const { data: users } = useTenantUsers(tenantId);
  const { data: modules } = usePlatformModules();
  const [open, setOpen] = useState(false);
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [confirmRoleState, setConfirmRoleState] = useState<{ id: string; nextActive: boolean } | null>(null);
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [form, setForm] = useState({
    name: "",
    description: "",
    hierarchyLevelId: "",
    moduleCodes: [] as string[],
    active: true,
  });

  const levelMap = new Map(levels.map((level) => [level.id, level.name]));
  const moduleMap = new Map(modules.map((module) => [module.code, module]));
  const enabledModuleCodes = getAccessibleModuleCodes(tenant.enabledModuleCodes, modules);
  const enabledModules = modules.filter(
    (module) => module.status === "active" && enabledModuleCodes.includes(normalizeModuleKey(module.code)),
  );
  const enabledModuleSet = new Set(enabledModules.map((module) => module.code));
  const filteredRoles = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return roles.filter((role) => {
      if (statusFilter !== "all" && (role.active ? "active" : "inactive") !== statusFilter) {
        return false;
      }
      if (
        normalizedSearch &&
        !`${role.name} ${role.description} ${levelMap.get(role.hierarchyLevelId) ?? ""} ${role.moduleCodes.join(" ")}`
          .toLowerCase()
          .includes(normalizedSearch)
      ) {
        return false;
      }
      return true;
    });
  }, [levelMap, roles, search, statusFilter]);

  function openCreateDialog() {
    setEditingRoleId(null);
    setForm({
      name: "",
      description: "",
      hierarchyLevelId: levels[0]?.id ?? "",
      moduleCodes: enabledModules[0] ? [enabledModules[0].code] : [],
      active: true,
    });
    setOpen(true);
  }

  function openEditDialog(roleId: string) {
    const role = roles.find((item) => item.id === roleId);
    if (!role) {
      return;
    }
    setEditingRoleId(role.id);
    setForm({
      name: role.name,
      description: role.description,
      hierarchyLevelId: role.hierarchyLevelId,
      moduleCodes: role.moduleCodes,
      active: role.active,
    });
    setOpen(true);
  }

  function saveRole() {
    if (!form.name.trim() || !form.hierarchyLevelId || !form.moduleCodes.length) {
      setMessage("Enter the role name, choose the mapped hierarchy level, and select at least one enabled module.");
      return;
    }

    try {
      if (editingRoleId) {
        updateRole(editingRoleId, {
          name: form.name.trim(),
          description: form.description.trim(),
          hierarchyLevelId: form.hierarchyLevelId,
          moduleCodes: form.moduleCodes,
          active: form.active,
        });
        setMessage("Role updated and persisted.");
      } else {
        createRole({
          tenantId,
          name: form.name.trim(),
          description: form.description.trim(),
          hierarchyLevelId: form.hierarchyLevelId,
          moduleCodes: form.moduleCodes,
          active: form.active,
        });
        setMessage("Role created and persisted.");
      }
      setOpen(false);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Role could not be saved.");
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Tenant Admin"
        title="Roles"
        description="Tenant-defined roles map to one or more enabled modules and one hierarchy level for user assignment."
        action={<Button onClick={openCreateDialog}>Add Role</Button>}
      />

      <WorkspaceNote>
        Roles must reference enabled modules only. Single role currently supported (multi-role ready) remains the current user-assignment rule.
      </WorkspaceNote>

      {message ? (
        <div className="rounded-2xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {message}
        </div>
      ) : null}

      <WorkspaceStatsBar
        items={[
          { label: "Roles", value: String(roles.length) },
          { label: "Active", value: String(roles.filter((role) => role.active).length) },
          { label: "Mapped levels", value: String(new Set(roles.map((role) => role.hierarchyLevelId)).size) },
          { label: "Enabled modules", value: String(enabledModules.length) },
        ]}
      />

      <TenantFilterBar
        searchValue={search}
        searchPlaceholder="Search roles by name, description, or mapped level"
        onSearchChange={setSearch}
        filters={
          <Select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </Select>
        }
        trailing={<div className="text-sm text-muted-foreground">{filteredRoles.length} roles shown</div>}
      />

      {filteredRoles.length ? (
        <DataTable
          title="Roles"
          description="Each role defines assignment level, module scope, and feature-access responsibility inside this tenant."
          headers={["Role", "Modules", "Mapped level", "Description", "Status", "Actions"]}
          rows={filteredRoles.map((role) => [
            <div key={`${role.id}-role`} className="min-w-[180px]">
              <p className="font-medium">{role.name}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {users.filter((user) => user.roleId === role.id).length} assigned users
              </p>
            </div>,
            <div key={`${role.id}-modules`} className="flex flex-wrap gap-1.5">
              {role.moduleCodes.map((moduleCode) => (
                <Badge key={`${role.id}-${moduleCode}`} variant={enabledModuleSet.has(normalizeModuleKey(moduleCode)) ? "accent" : "warning"}>
                  {moduleMap.get(normalizeModuleKey(moduleCode))?.name ?? normalizeModuleKey(moduleCode)}
                </Badge>
              ))}
            </div>,
            levelMap.get(role.hierarchyLevelId) ?? role.hierarchyLevelId,
            role.description,
            <Badge
              key={`${role.id}-status`}
              variant={role.active ? (normalizeModuleKeys(role.moduleCodes).every((code) => enabledModuleSet.has(code)) ? "success" : "warning") : "warning"}
            >
              {role.active
                ? normalizeModuleKeys(role.moduleCodes).every((code) => enabledModuleSet.has(code))
                  ? "Active"
                  : "Restricted"
                : "Inactive"}
            </Badge>,
            <div key={`${role.id}-actions`} className="flex gap-1.5">
              <Button asChild size="sm" variant="ghost">
                <Link to={`/tenant/${tenant.id}/roles/${role.id}`}>View Details</Link>
              </Button>
              <Button size="sm" variant="ghost" onClick={() => openEditDialog(role.id)}>
                Edit
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setConfirmRoleState({ id: role.id, nextActive: !role.active })}>
                {role.active ? "Disable" : "Enable"}
              </Button>
            </div>,
          ])}
        />
      ) : (
        <TenantEmptyState
          title="No roles match the current view"
          description={
            roles.length
              ? "Adjust the search or status filter to widen the role list."
              : "Create the first role to define assignment level and feature access for tenant users."
          }
          action={!roles.length ? <Button onClick={openCreateDialog}>Add Role</Button> : null}
        />
      )}

      <Dialog
        open={open}
        onOpenChange={setOpen}
        title={editingRoleId ? "Edit role" : "Add role"}
        description="Choose the hierarchy level and enabled modules for this role, then manage permissions separately."
        widthClassName="max-w-2xl"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveRole}>{editingRoleId ? "Save Changes" : "Create Role"}</Button>
          </div>
        }
      >
        <div className="grid gap-4">
          <WorkspaceNote>
            This form defines where the role can be assigned and which enabled modules it can access. Feature permissions are managed on the Role Permissions page. A role must always have at least one enabled module.
          </WorkspaceNote>
          <Field label="Role name">
            <Input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
          </Field>
          <Field label="Description">
            <Input value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} />
          </Field>
          <Field label="Mapped hierarchy level" helper="Users with this role can only be assigned to org units from this level.">
            <Select
              value={form.hierarchyLevelId}
              onChange={(event) => setForm((current) => ({ ...current, hierarchyLevelId: event.target.value }))}
            >
              <option value="">Select level</option>
              {levels.map((level) => (
                <option key={level.id} value={level.id}>
                  {level.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Mapped modules" helper="Only modules enabled for this tenant can be selected.">
            <div className="grid gap-3 md:grid-cols-2">
              {enabledModules.length ? (
                enabledModules.map((module) => {
                  const checked = form.moduleCodes.includes(module.code);
                  return (
                    <button
                      key={module.id}
                      type="button"
                      onClick={() =>
                        setForm((current) => ({
                          ...current,
                          moduleCodes: checked
                            ? current.moduleCodes.filter((code) => code !== module.code)
                            : [...current.moduleCodes, module.code],
                        }))
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
                        <Badge variant="accent">{module.code}</Badge>
                      </div>
                    </button>
                  );
                })
              ) : (
                <p className="text-sm text-muted-foreground">No active modules are enabled for this tenant yet.</p>
              )}
            </div>
          </Field>
          {!form.moduleCodes.length ? (
            <div className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Role must have at least one enabled module before it can be saved.
            </div>
          ) : null}
          <Field label="Status">
            <Select value={form.active ? "active" : "inactive"} onChange={(event) => setForm((current) => ({ ...current, active: event.target.value === "active" }))}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </Select>
          </Field>
        </div>
      </Dialog>
      <Dialog
        open={!!confirmRoleState}
        onOpenChange={(open) => setConfirmRoleState(open ? confirmRoleState : null)}
        title={confirmRoleState?.nextActive ? "Enable role" : "Disable role"}
        description="Confirm this role status change. Permissions remain unchanged, but assignment availability will update immediately."
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setConfirmRoleState(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!confirmRoleState) return;
                updateRole(confirmRoleState.id, { active: confirmRoleState.nextActive });
                const affectedUsers = users.filter((user) => user.roleId === confirmRoleState.id).length;
                setMessage(
                  `${confirmRoleState.nextActive ? "Role enabled" : "Role disabled"} successfully.${affectedUsers ? ` ${affectedUsers} assigned users remain linked to this role.` : ""}`,
                );
                setConfirmRoleState(null);
              }}
            >
              Confirm
            </Button>
          </div>
        }
      >
        <div className="rounded-2xl border bg-muted/20 p-4 text-sm text-muted-foreground">
          This is a controlled change for a sensitive access object.
        </div>
      </Dialog>
    </div>
  );
}

export function TenantRolePermissionsPage() {
  const { tenantId, tenant } = useTenantRouteContext();
  const { data: roles } = useTenantRoles(tenantId);
  const { data: levels } = useTenantOrgTypes(tenantId);
  const { data: rolePermissions, saveRolePermissions } = useTenantRolePermissions(tenantId);
  const { data: tenantModules } = useTenantModules(tenantId);
  const { data: users } = useTenantUsers(tenantId);
  const { data: modules } = usePlatformModules();
  const [selectedRoleId, setSelectedRoleId] = useState(roles[0]?.id ?? "");
  const [message, setMessage] = useState("");
  const [draftPermissions, setDraftPermissions] = useState<Record<string, { canView: boolean; canCreate: boolean; canEdit: boolean; canDelete: boolean; canApprove: boolean }>>({});
  const levelMap = new Map(levels.map((level) => [level.id, level.name]));
  const moduleMap = new Map(modules.map((module) => [module.code, module]));
  const enabledModuleSet = new Set(getAccessibleModuleCodes(tenant.enabledModuleCodes, modules));
  const selectedRole = roles.find((role) => role.id === selectedRoleId) ?? null;
  const assignedUsersCount = users.filter((user) => user.roleId === selectedRoleId).length;
  const selectableRoles = roles.filter((role) => role.moduleCodes.length > 0);
  const validRoleModules = selectedRole
    ? normalizeModuleKeys(selectedRole.moduleCodes).filter((moduleCode) => enabledModuleSet.has(moduleCode))
    : [];
  const restrictedRoleModules = selectedRole
    ? normalizeModuleKeys(selectedRole.moduleCodes).filter((moduleCode) => !enabledModuleSet.has(moduleCode))
    : [];
  const rows = validRoleModules.flatMap((moduleCode) =>
    tenantModules
      .filter((moduleFeature) => moduleFeature.moduleCode === moduleCode)
      .map((moduleFeature) => {
        const permission =
          rolePermissions.find(
            (item) => item.roleId === selectedRoleId && item.featureCode === moduleFeature.code,
          ) ?? {
            id: `perm-${selectedRoleId}-${moduleCode}-${moduleFeature.code}`,
            tenantId,
            roleId: selectedRoleId,
            moduleCode,
            featureCode: moduleFeature.code,
            canView: false,
            canCreate: false,
            canEdit: false,
            canDelete: false,
            canApprove: false,
          };

        return {
          moduleFeature,
          permission: {
            ...permission,
            ...(draftPermissions[permission.id] ?? {}),
          },
        };
      }),
  );
  const hasUnsavedChanges = Object.keys(draftPermissions).length > 0;

  function togglePermission(permissionId: string, key: "canView" | "canCreate" | "canEdit" | "canDelete" | "canApprove") {
    const current = rows.find((row) => row.permission.id === permissionId)?.permission;
    if (!current) {
      return;
    }

    setDraftPermissions((existing) => ({
      ...existing,
      [permissionId]: {
        canView: current.canView,
        canCreate: current.canCreate,
        canEdit: current.canEdit,
        canDelete: current.canDelete,
        canApprove: current.canApprove,
        [key]: !current[key],
      },
    }));
  }

  function resetDraft() {
    setDraftPermissions({});
    setMessage("");
  }

  function saveDraft() {
    const nextPermissions = rows.map((row) => row.permission);
    saveRolePermissions(selectedRoleId, nextPermissions);
    setDraftPermissions({});
    setMessage("Role permissions saved successfully.");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="min-w-0">
          <p className="text-sm uppercase tracking-[0.22em] text-muted-foreground">Tenant Admin</p>
          <h1 className="mt-2 text-3xl font-semibold">Role Permissions</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Manage feature access for the selected tenant role.
          </p>
        </div>
        <div className="flex flex-col gap-3 xl:min-w-[540px] xl:items-end">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center xl:justify-end">
            <Select value={selectedRoleId} onChange={(event) => setSelectedRoleId(event.target.value)}>
              <option value="">Select role</option>
              {selectableRoles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name} ({levelMap.get(role.hierarchyLevelId) ?? role.hierarchyLevelId})
                </option>
              ))}
            </Select>
            <div className="flex flex-wrap items-center gap-2">
              {selectedRole ? (
                <>
                  <Badge variant="secondary">{selectedRole.name}</Badge>
                  <Badge variant="outline">
                    Level: {levelMap.get(selectedRole.hierarchyLevelId) ?? selectedRole.hierarchyLevelId}
                  </Badge>
                  <Button asChild size="sm" variant="outline">
                    <Link to={`/tenant/${tenant.id}/roles/${selectedRole.id}`}>Role Detail</Link>
                  </Button>
                </>
              ) : null}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 xl:justify-end">
            {hasUnsavedChanges ? (
              <>
                <Button size="sm" variant="ghost" onClick={resetDraft}>
                  Reset Draft
                </Button>
                <Button size="sm" onClick={saveDraft}>
                  Save Changes
                </Button>
              </>
            ) : (
              <Badge variant="secondary">All changes saved</Badge>
            )}
          </div>
        </div>
      </div>

      {message ? (
        <div className="rounded-2xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {message}
        </div>
      ) : null}

      {selectedRole ? (
        <>
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-indigo-200/70 bg-indigo-50/55 px-4 py-3 shadow-panel">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <Badge variant="accent">
                Level: {levelMap.get(selectedRole.hierarchyLevelId) ?? selectedRole.hierarchyLevelId}
              </Badge>
              {normalizeModuleKeys(selectedRole.moduleCodes).map((moduleCode) => (
                <Badge key={moduleCode} variant={enabledModuleSet.has(moduleCode) ? "accent" : "warning"}>
                  {moduleMap.get(moduleCode)?.name ?? moduleCode}
                </Badge>
              ))}
              <Badge variant="info">
                {assignedUsersCount} assigned {assignedUsersCount === 1 ? "user" : "users"}
              </Badge>
              <Badge variant={selectedRole.active ? "success" : "warning"}>
                {selectedRole.active ? "Active role" : "Inactive role"}
              </Badge>
            </div>
            {selectedRole.description ? (
              <p className="hidden max-w-[460px] text-right text-sm text-muted-foreground xl:block">
                {selectedRole.description}
              </p>
            ) : null}
          </div>

          {restrictedRoleModules.length ? (
            <div className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              This role is mapped to disabled tenant modules: {restrictedRoleModules.join(", ")}. Access removed immediately on module disable. Data is retained until the module is re-enabled or the role is remapped.
            </div>
          ) : null}

          {validRoleModules.length ? (
            validRoleModules.map((moduleCode) => {
              const moduleRows = rows.filter((row) => row.moduleFeature.moduleCode === moduleCode);
              return (
                <TenantPanel
                  key={moduleCode}
                  title={moduleMap.get(moduleCode)?.name ?? moduleCode}
                  description="Module-wise permissions for the selected role."
                >
                  <div className="overflow-hidden rounded-3xl border border-border/75 bg-card/98 shadow-panel">
                    <div className="sticky top-[73px] z-10 grid grid-cols-[minmax(210px,1.15fr)_minmax(260px,1.2fr)_repeat(5,minmax(96px,0.5fr))] items-center border-b border-border/75 bg-slate-100/92 px-5 py-3.5 text-xs font-semibold uppercase tracking-[0.16em] text-slate-700 backdrop-blur-sm">
                      <div className="border-r border-border/65 pr-4">Feature</div>
                      <div className="border-r border-border/65 px-4">Description</div>
                      <div className="border-r border-border/65 text-center">View</div>
                      <div className="border-r border-border/65 text-center">Create</div>
                      <div className="border-r border-border/65 text-center">Edit</div>
                      <div className="border-r border-border/65 text-center">Delete</div>
                      <div className="text-center">Approve</div>
                    </div>
                    {moduleRows.map(({ moduleFeature, permission }, index) => {
                      const dirty = !!draftPermissions[permission.id];
                      return (
                        <div
                          key={permission.id}
                          className={`grid grid-cols-[minmax(210px,1.15fr)_minmax(260px,1.2fr)_repeat(5,minmax(96px,0.5fr))] items-center border-b border-border/65 px-5 py-4 last:border-b-0 ${
                            dirty
                              ? "bg-amber-50/70 ring-1 ring-inset ring-amber-200"
                              : index % 2 === 0
                                ? "bg-background/90"
                                : "bg-slate-50/65"
                          }`}
                        >
                          <div className="border-r border-border/55 pr-4">
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-foreground">{moduleFeature.name}</p>
                              {dirty ? <span className="size-2 rounded-full bg-amber-500" aria-hidden="true" /> : null}
                            </div>
                          </div>
                          <p className="border-r border-border/55 px-4 text-sm leading-6 text-muted-foreground">
                            {moduleFeature.description}
                          </p>
                          <PermissionCell label="View" value={permission.canView} onToggle={() => togglePermission(permission.id, "canView")} withDivider />
                          <PermissionCell label="Create" value={permission.canCreate} onToggle={() => togglePermission(permission.id, "canCreate")} withDivider />
                          <PermissionCell label="Edit" value={permission.canEdit} onToggle={() => togglePermission(permission.id, "canEdit")} withDivider />
                          <PermissionCell label="Delete" value={permission.canDelete} onToggle={() => togglePermission(permission.id, "canDelete")} withDivider />
                          <PermissionCell label="Approve" value={permission.canApprove} onToggle={() => togglePermission(permission.id, "canApprove")} />
                        </div>
                      );
                    })}
                  </div>
                </TenantPanel>
              );
            })
          ) : (
            <TenantEmptyState
              title="No enabled modules are mapped to this role"
              description="Map this role to one or more enabled tenant modules before configuring feature permissions."
            />
          )}

          {hasUnsavedChanges ? (
            <div className="sticky bottom-4 z-10 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50/92 px-4 py-3 shadow-panel backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <span className="size-2.5 rounded-full bg-amber-500" aria-hidden="true" />
                <p className="text-sm font-medium">Draft changes pending</p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" onClick={resetDraft}>
                  Reset Draft
                </Button>
                <Button size="sm" onClick={saveDraft}>
                  Save Changes
                </Button>
              </div>
            </div>
          ) : null}
        </>
      ) : (
        <TenantEmptyState
          title="Select a role to edit permissions"
          description="Choose a tenant role from the header selector to open the permission security matrix."
        />
      )}
    </div>
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
