import { useMemo, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import { DataTable } from "@/shared/components/common/data-table";
import { PageHeader } from "@/shared/components/common/page-header";
import {
  TenantEmptyState,
  TenantFilterBar,
  TenantPanel,
  TenantSummaryCard,
} from "@tms-booking/modules/tenant-admin/components/tenant-primitives";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Dialog } from "@/shared/components/ui/dialog";
import { Input } from "@/shared/components/ui/input";
import { Select } from "@/shared/components/ui/select";
import { Switch } from "@/shared/components/ui/switch";
import { useTenantCustomers } from "@tms-booking/modules/tenant-admin/hooks/useTenantCustomers";
import {
  useTenantLRConfigs,
  useTenantMaterials,
  useTenantUOMConfigurations,
  useTenantVehicleTypes,
} from "@tms-booking/modules/tenant-admin/hooks/useTenantMasterData";
import { useTenantOrgTypes } from "@tms-booking/modules/tenant-admin/hooks/useTenantOrgTypes";
import { useTenantOrgUnits } from "@tms-booking/modules/tenant-admin/hooks/useTenantOrgUnits";
import { useTenantUsers } from "@tms-booking/modules/tenant-admin/hooks/useTenantUsers";
import { usePlatformModules } from "@/modules/platform-admin/hooks/usePlatformModules";
import { useTenantRouteContext } from "@tms-booking/modules/tenant-admin/hooks/useTenantRouteContext";
import { useTenantVendors } from "@tms-booking/modules/tenant-admin/hooks/useTenantVendors";
import { getAccessibleModuleCodes } from "@/shared/lib/tenant-admin";
import type { OrgUnit, UserRecord } from "@/types/access";
import type {
  LRAllocationFlowConfig,
  LRAllocationFlowLevel,
  LRAllocationFlowMode,
  LRAllocationStrategy,
  LRCustomerAllocationScope,
  LRConsumptionLevel,
  LRConfigScopeType,
  LRPoolOwnershipType,
  LRPoolSource,
  LRType,
  LRYearFormat,
  TenantLRConfig,
  TenantMaterial,
  TenantUOMDefinition,
  TenantUOMMapping,
  TenantVehicleType,
} from "@/types/master-data";

export function TenantVehicleTypesPage() {
  const { tenantId, tenant } = useTenantRouteContext();
  const { data: vehicleTypes, createVehicleType, updateVehicleType } = useTenantVehicleTypes(tenantId);
  const { data: modules } = usePlatformModules();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({
    typeCode: "",
    capacity: "",
    dimensions: "",
    status: "active" as TenantVehicleType["status"],
  });

  const enabledModuleCodes = getAccessibleModuleCodes(tenant.enabledModuleCodes, modules);
  const availableForTenant = enabledModuleCodes.some((moduleCode) => ["TMS", "FLEET"].includes(moduleCode));
  const duplicateCode = vehicleTypes.some(
    (item) =>
      item.id !== editingId && item.typeCode.trim().toUpperCase() === form.typeCode.trim().toUpperCase(),
  );
  const filteredVehicleTypes = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    if (!normalizedSearch) {
      return vehicleTypes;
    }
    return vehicleTypes.filter((item) =>
      `${item.typeCode} ${item.capacity} ${item.dimensions}`.toLowerCase().includes(normalizedSearch),
    );
  }, [search, vehicleTypes]);

  function openCreate() {
    setEditingId(null);
    setForm({
      typeCode: "",
      capacity: "",
      dimensions: "",
      status: "active",
    });
    setOpen(true);
  }

  function openEdit(vehicleType: TenantVehicleType) {
    setEditingId(vehicleType.id);
    setForm({
      typeCode: vehicleType.typeCode,
      capacity: vehicleType.capacity,
      dimensions: vehicleType.dimensions,
      status: vehicleType.status,
    });
    setOpen(true);
  }

  function saveVehicleType() {
    if (!form.typeCode.trim() || !form.capacity.trim() || !form.dimensions.trim()) {
      setMessage("Enter the type code, capacity, and dimensions.");
      return;
    }

    try {
      if (editingId) {
        updateVehicleType(editingId, form);
        setMessage("Vehicle type updated and persisted.");
      } else {
        createVehicleType(form);
        setMessage("Vehicle type created and persisted.");
      }
      setOpen(false);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Vehicle type could not be saved.");
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Tenant Admin"
        title="Vehicle Types"
        description="Maintain tenant vehicle-type masters used by booking, fleet, and rate-card flows."
        action={
          <Button onClick={openCreate} disabled={!availableForTenant}>
            Add Vehicle Type
          </Button>
        }
      />

      <MasterDataAccessBanner
        enabledModuleCodes={enabledModuleCodes}
        requiredModules={["TMS", "FLEET"]}
        disabledMessage="Vehicle types stay visible here, but create and edit actions are disabled until TMS or Fleet is enabled for this tenant."
      />

      <div className="grid gap-4 md:grid-cols-3">
        <TenantSummaryCard label="Vehicle types" value={String(vehicleTypes.length)} helper="Tenant-scoped master records" />
        <TenantSummaryCard label="Active" value={String(vehicleTypes.filter((item) => item.status === "active").length)} helper="Currently usable types" />
        <TenantSummaryCard label="Enabled modules" value={enabledModuleCodes.filter((item) => ["TMS", "FLEET"].includes(item)).join(", ") || "None"} helper="Relevant operational modules" />
      </div>

      {message ? <StatusBanner message={message} /> : null}

      <TenantFilterBar
        searchValue={search}
        searchPlaceholder="Search vehicle types by code, capacity, or dimensions"
        onSearchChange={setSearch}
        trailing={<div className="text-sm text-muted-foreground">{filteredVehicleTypes.length} records shown</div>}
      />

      {filteredVehicleTypes.length ? (
        <DataTable
          title="Vehicle type master"
          description="Same local-storage persistence model as the rest of the tenant administration workspace."
          headers={["Type code", "Capacity", "Dimensions", "Status", "Actions"]}
          rows={filteredVehicleTypes.map((item) => [
            <div key={`${item.id}-code`} className="min-w-[140px]">
              <p className="font-medium">{item.typeCode}</p>
              <p className="mt-1 text-xs text-muted-foreground">Updated {new Date(item.updatedAt).toLocaleDateString()}</p>
            </div>,
            item.capacity,
            item.dimensions,
            <Badge key={`${item.id}-status`} variant={item.status === "active" ? "success" : "warning"}>
              {item.status}
            </Badge>,
            <Button key={`${item.id}-edit`} size="sm" variant="ghost" onClick={() => openEdit(item)} disabled={!availableForTenant}>
              Edit
            </Button>,
          ])}
        />
      ) : (
        <TenantEmptyState
          title="No vehicle types found"
          description="Create the first tenant vehicle type to support booking, fleet, and rate-card references."
          action={availableForTenant ? <Button onClick={openCreate}>Add Vehicle Type</Button> : null}
        />
      )}

      <Dialog
        open={open}
        onOpenChange={setOpen}
        title={editingId ? "Edit vehicle type" : "Add vehicle type"}
        description="Use the existing tenant form rhythm. Unique hints are advisory only in this frontend-only workspace."
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveVehicleType} disabled={!availableForTenant}>
              {editingId ? "Save Changes" : "Create Vehicle Type"}
            </Button>
          </div>
        }
      >
        <div className="grid gap-4">
          <Field label="Type code" helper="Required. Use the tenant naming convention already used in rate cards.">
            <Input value={form.typeCode} onChange={(event) => setForm((current) => ({ ...current, typeCode: event.target.value }))} />
          </Field>
          {duplicateCode ? <ValidationHint text="A vehicle type with this code already exists. This is a non-blocking frontend hint." /> : null}
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Capacity" helper="Required. Example: 9 MT">
              <Input value={form.capacity} onChange={(event) => setForm((current) => ({ ...current, capacity: event.target.value }))} />
            </Field>
            <Field label="Status">
              <Select value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as TenantVehicleType["status"] }))}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </Select>
            </Field>
          </div>
          <Field label="Dimensions" helper="Required. Example: 32 x 8 x 8 ft">
            <Input value={form.dimensions} onChange={(event) => setForm((current) => ({ ...current, dimensions: event.target.value }))} />
          </Field>
        </div>
      </Dialog>
    </div>
  );
}

export function TenantMaterialsPage() {
  const { tenantId, tenant } = useTenantRouteContext();
  const { data: materials, createMaterial, updateMaterial } = useTenantMaterials(tenantId);
  const { definitions: uomDefinitions } = useTenantUOMConfigurations(tenantId);
  const { data: customers } = useTenantCustomers(tenantId);
  const { data: modules } = usePlatformModules();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [previewCustomerId, setPreviewCustomerId] = useState(customers[0]?.id ?? "");
  const [form, setForm] = useState({
    materialCode: "",
    description: "",
    uom: "",
    defaultWeightUOM: "KG",
    conversionValue: "",
    mappedCustomerIds: [] as string[],
    status: "active" as TenantMaterial["status"],
  });

  const enabledModuleCodes = getAccessibleModuleCodes(tenant.enabledModuleCodes, modules);
  const availableForTenant = enabledModuleCodes.includes("TMS");
  const quantityUOMOptions = Array.from(
    new Set([
      ...uomDefinitions
        .filter((definition) => definition.category === "QUANTITY" && definition.status === "active")
        .map((definition) => definition.code),
      form.uom.trim().toUpperCase(),
    ].filter(Boolean)),
  );
  const customerMap = new Map(customers.map((customer) => [customer.id, customer]));
  const duplicateCode = materials.some(
    (item) =>
      item.id !== editingId &&
      item.materialCode.trim().toUpperCase() === form.materialCode.trim().toUpperCase(),
  );
  const filteredMaterials = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    if (!normalizedSearch) {
      return materials;
    }
    return materials.filter((item) =>
      `${item.materialCode} ${item.description} ${item.uom} ${item.defaultWeightUOM ?? ""} ${item.conversionValue ?? ""}`.toLowerCase().includes(normalizedSearch),
    );
  }, [materials, search]);
  const previewMaterials = previewCustomerId
    ? materials.filter((item) => item.mappedCustomerIds.includes(previewCustomerId))
    : [];

  function toggleCustomer(customerId: string) {
    setForm((current) => ({
      ...current,
      mappedCustomerIds: current.mappedCustomerIds.includes(customerId)
        ? current.mappedCustomerIds.filter((item) => item !== customerId)
        : [...current.mappedCustomerIds, customerId],
    }));
  }

  function openCreate() {
    setEditingId(null);
    setForm({
      materialCode: "",
      description: "",
      uom: "",
      defaultWeightUOM: "KG",
      conversionValue: "",
      mappedCustomerIds: [],
      status: "active",
    });
    setOpen(true);
  }

  function openEdit(material: TenantMaterial) {
    setEditingId(material.id);
    setForm({
      materialCode: material.materialCode,
      description: material.description,
      uom: material.quantityUOM ?? material.uom,
      defaultWeightUOM: material.defaultWeightUOM ?? "KG",
      conversionValue: material.conversionValue != null ? String(material.conversionValue) : "",
      mappedCustomerIds: material.mappedCustomerIds,
      status: material.status,
    });
    setOpen(true);
  }

  function saveMaterial() {
    if (!form.materialCode.trim() || !form.description.trim() || !form.uom.trim() || !form.defaultWeightUOM.trim()) {
      setMessage("Enter material code, description, quantity UOM, and weight UOM.");
      return;
    }
    const conversionValue = Number(form.conversionValue);
    if (!Number.isFinite(conversionValue) || conversionValue <= 0) {
      setMessage("Enter valid conversion mapping.");
      return;
    }

    try {
      const payload = {
        ...form,
        quantityUOM: form.uom,
        defaultWeightUOM: form.defaultWeightUOM,
        conversionValue,
      };
      if (editingId) {
        updateMaterial(editingId, payload);
        setMessage("Material updated and persisted.");
      } else {
        createMaterial(payload);
        setMessage("Material created and persisted.");
      }
      setOpen(false);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Material could not be saved.");
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Tenant Admin"
        title="Material Master"
        description="Maintain centrally managed tenant materials and map them to one or more customers."
        action={
          <Button onClick={openCreate} disabled={!availableForTenant}>
            Add Material
          </Button>
        }
      />

      <MasterDataAccessBanner
        enabledModuleCodes={enabledModuleCodes}
        requiredModules={["TMS"]}
        disabledMessage="Material master stays visible here, but create and edit actions are disabled until TMS is enabled for this tenant."
      />

      <div className="grid gap-4 md:grid-cols-3">
        <TenantSummaryCard label="Materials" value={String(materials.length)} helper="Tenant master-data records" />
        <TenantSummaryCard label="Mapped customers" value={String(new Set(materials.flatMap((item) => item.mappedCustomerIds)).size)} helper="Customers already linked to materials" />
        <TenantSummaryCard label="Booking preview" value={previewMaterials.length ? `${previewMaterials.length} shown` : "No mapping"} helper="UI-only filtered material simulation" />
      </div>

      {message ? <StatusBanner message={message} /> : null}

      <TenantFilterBar
        searchValue={search}
        searchPlaceholder="Search materials by code, quantity UOM, weight UOM, or mapping"
        onSearchChange={setSearch}
        trailing={<div className="text-sm text-muted-foreground">{filteredMaterials.length} records shown</div>}
      />

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        {filteredMaterials.length ? (
          <DataTable
            title="Material master"
            description="Materials stay centrally maintained here and are filtered by customer mapping in downstream booking UI."
            headers={["Material", "Quantity UOM", "Weight UOM", "Mapping", "Mapped customers", "Status", "Actions"]}
            rows={filteredMaterials.map((item) => [
              <div key={`${item.id}-material`} className="min-w-[180px]">
                <p className="font-medium">{item.materialCode}</p>
                <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
              </div>,
              <Badge key={`${item.id}-uom`} variant="outline">
                {item.quantityUOM ?? item.uom}
              </Badge>,
              <Badge key={`${item.id}-weight-uom`} variant="accent">
                {item.defaultWeightUOM ?? "KG"}
              </Badge>,
              <span key={`${item.id}-mapping`} className="text-sm text-muted-foreground">
                1 {item.quantityUOM ?? item.uom} = {item.conversionValue ?? 0} {item.defaultWeightUOM ?? "KG"}
              </span>,
              <div key={`${item.id}-customers`} className="flex flex-wrap gap-1.5">
                {item.mappedCustomerIds.length ? (
                  item.mappedCustomerIds.map((customerId) => (
                    <Badge key={`${item.id}-${customerId}`} variant="accent">
                      {customerMap.get(customerId)?.name ?? customerId}
                    </Badge>
                  ))
                ) : (
                  <Badge variant="warning">No customer mapping</Badge>
                )}
              </div>,
              <Badge key={`${item.id}-status`} variant={item.status === "active" ? "success" : "warning"}>
                {item.status}
              </Badge>,
              <Button key={`${item.id}-edit`} size="sm" variant="ghost" onClick={() => openEdit(item)} disabled={!availableForTenant}>
                Edit
              </Button>,
            ])}
          />
        ) : (
          <TenantEmptyState
            title="No materials found"
            description="Create the first material master record and map it to one or more customers."
            action={availableForTenant ? <Button onClick={openCreate}>Add Material</Button> : null}
          />
        )}

        <TenantPanel
          title="Booking material preview"
          description="UI-only simulation of the material filtering rule described in the BRD."
        >
          <div className="space-y-4">
            <Field label="Customer">
              <Select value={previewCustomerId} onChange={(event) => setPreviewCustomerId(event.target.value)}>
                <option value="">Select customer</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name}
                  </option>
                ))}
              </Select>
            </Field>
            <div className="rounded-2xl border bg-muted/20 p-4">
              <p className="text-sm font-medium">Materials shown for booking</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {previewMaterials.length ? (
                  previewMaterials.map((material) => (
                    <Badge key={material.id} variant="accent">
                      {material.materialCode}
                    </Badge>
                  ))
                ) : (
                  <span className="text-sm text-muted-foreground">
                    {previewCustomerId
                      ? "No mapped materials are currently available for the selected customer."
                      : "Select a customer to preview mapped materials."}
                  </span>
                )}
              </div>
            </div>
          </div>
        </TenantPanel>
      </div>

      <Dialog
        open={open}
        onOpenChange={setOpen}
        title={editingId ? "Edit material" : "Add material"}
        description="Define quantity UOM, default weight UOM, and conversion mapping so booking can auto-calculate weight."
        widthClassName="max-w-3xl"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveMaterial} disabled={!availableForTenant}>
              {editingId ? "Save Changes" : "Create Material"}
            </Button>
          </div>
        }
      >
        <div className="grid gap-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Material code" helper="Required. This is the tenant-facing unique reference hint.">
              <Input value={form.materialCode} onChange={(event) => setForm((current) => ({ ...current, materialCode: event.target.value }))} />
            </Field>
            <Field label="UOM" helper="Required. Quantity UOMs come from the tenant UOM configuration master.">
              <Select value={form.uom} onChange={(event) => setForm((current) => ({ ...current, uom: event.target.value }))}>
                <option value="">Select quantity UOM</option>
                {quantityUOMOptions.map((uom) => (
                  <option key={uom} value={uom}>
                    {uom}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Weight UOM" helper="Default booking weight unit for this material.">
              <Select value={form.defaultWeightUOM} onChange={(event) => setForm((current) => ({ ...current, defaultWeightUOM: event.target.value }))}>
                <option value="">Select weight UOM</option>
                {uomDefinitions.filter((definition) => definition.category === "WEIGHT" && definition.status === "active").map((definition) => (
                  <option key={definition.id} value={definition.code}>
                    {definition.code}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          {duplicateCode ? <ValidationHint text="A material with this code already exists. This is a non-blocking frontend hint." /> : null}
          <Field label="Description" helper="Required. Use the customer-facing material description.">
            <Input value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} />
          </Field>
          <Field label="Conversion Mapping" helper="Example: 1 BAG = 0.05 MT">
            <Input value={form.conversionValue} onChange={(event) => setForm((current) => ({ ...current, conversionValue: event.target.value }))} />
          </Field>
          <Field label="Mapped customers" helper="Select one or more customers. Unmapped materials will not appear in the booking preview for that customer.">
            <div className="grid max-h-[260px] gap-3 overflow-y-auto rounded-2xl border bg-muted/20 p-4 md:grid-cols-2">
              {customers.length ? (
                customers.map((customer) => (
                  <label
                    key={customer.id}
                    className={`flex items-start gap-3 rounded-2xl border px-4 py-3 transition ${
                      form.mappedCustomerIds.includes(customer.id)
                        ? "border-primary/40 bg-primary/5"
                        : "bg-background/80 hover:border-primary/20"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={form.mappedCustomerIds.includes(customer.id)}
                      onChange={() => toggleCustomer(customer.id)}
                      className="mt-1"
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{customer.name}</p>
                      <p className="text-xs text-muted-foreground">{customer.code ?? "No code"}</p>
                    </div>
                  </label>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No tenant customers exist yet.</p>
              )}
            </div>
          </Field>
          <Field label="Status">
            <Select value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as TenantMaterial["status"] }))}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </Select>
          </Field>
        </div>
      </Dialog>
    </div>
  );
}

export function TenantUOMConfigurationPage() {
  const { tenantId, tenant } = useTenantRouteContext();
  const { data: modules } = usePlatformModules();
  const {
    definitions,
    mappings,
    createDefinition,
    updateDefinition,
    createMapping,
    updateMapping,
    deleteMapping,
  } = useTenantUOMConfigurations(tenantId);
  const [definitionOpen, setDefinitionOpen] = useState(false);
  const [mappingOpen, setMappingOpen] = useState(false);
  const [editingDefinition, setEditingDefinition] = useState<TenantUOMDefinition | null>(null);
  const [editingMapping, setEditingMapping] = useState<TenantUOMMapping | null>(null);
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [definitionForm, setDefinitionForm] = useState({
    category: "QUANTITY" as TenantUOMDefinition["category"],
    code: "",
    label: "",
    isCustom: false,
    status: "active" as TenantUOMDefinition["status"],
  });
  const [mappingForm, setMappingForm] = useState({
    quantityUOM: "",
    weightUOM: "",
    conversionValue: "",
    status: "active" as TenantUOMMapping["status"],
  });

  const enabledModuleCodes = getAccessibleModuleCodes(tenant.enabledModuleCodes, modules);
  const availableForTenant = enabledModuleCodes.includes("TMS");
  const quantityDefinitions = useMemo(
    () => definitions.filter((definition) => definition.category === "QUANTITY"),
    [definitions],
  );
  const weightDefinitions = useMemo(
    () => definitions.filter((definition) => definition.category === "WEIGHT"),
    [definitions],
  );
  const quantityCodes = quantityDefinitions.map((definition) => definition.code);
  const weightCodes = weightDefinitions.map((definition) => definition.code);
  const filteredMappings = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    if (!normalizedSearch) {
      return mappings;
    }
    return mappings.filter((mapping) =>
      `${mapping.quantityUOM} ${mapping.weightUOM} ${mapping.conversionValue}`
        .toLowerCase()
        .includes(normalizedSearch),
    );
  }, [mappings, search]);

  function openCreateDefinition(category: TenantUOMDefinition["category"]) {
    setEditingDefinition(null);
    setDefinitionForm({
      category,
      code: "",
      label: "",
      isCustom: false,
      status: "active",
    });
    setDefinitionOpen(true);
  }

  function openEditDefinition(definition: TenantUOMDefinition) {
    setEditingDefinition(definition);
    setDefinitionForm({
      category: definition.category,
      code: definition.code,
      label: definition.label,
      isCustom: Boolean(definition.isCustom),
      status: definition.status,
    });
    setDefinitionOpen(true);
  }

  function saveDefinition() {
    if (!definitionForm.code.trim() || !definitionForm.label.trim()) {
      setMessage("Enter both UOM code and label.");
      return;
    }
    try {
      if (editingDefinition) {
        updateDefinition(editingDefinition.id, definitionForm);
        setMessage("UOM definition updated.");
      } else {
        createDefinition(definitionForm);
        setMessage("UOM definition created.");
      }
      setDefinitionOpen(false);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "UOM definition could not be saved.");
    }
  }

  function openCreateMapping() {
    setEditingMapping(null);
    setMappingForm({
      quantityUOM: quantityCodes[0] ?? "",
      weightUOM: weightCodes[0] ?? "",
      conversionValue: "",
      status: "active",
    });
    setMappingOpen(true);
  }

  function openEditMapping(mapping: TenantUOMMapping) {
    setEditingMapping(mapping);
    setMappingForm({
      quantityUOM: mapping.quantityUOM,
      weightUOM: mapping.weightUOM,
      conversionValue: String(mapping.conversionValue),
      status: mapping.status,
    });
    setMappingOpen(true);
  }

  function saveMapping() {
    if (!mappingForm.quantityUOM || !mappingForm.weightUOM) {
      setMessage("Select both quantity and weight UOM.");
      return;
    }
    const conversionValue = Number(mappingForm.conversionValue);
    if (!Number.isFinite(conversionValue) || conversionValue <= 0) {
      setMessage("Conversion value must be greater than zero.");
      return;
    }
    try {
      const payload = {
        quantityUOM: mappingForm.quantityUOM,
        weightUOM: mappingForm.weightUOM,
        conversionValue,
        status: mappingForm.status,
      };
      if (editingMapping) {
        updateMapping(editingMapping.id, payload);
        setMessage("UOM mapping updated.");
      } else {
        createMapping(payload);
        setMessage("UOM mapping created.");
      }
      setMappingOpen(false);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "UOM mapping could not be saved.");
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Tenant Admin"
        title="UOM Configuration"
        description="Maintain quantity UOMs, weight UOMs, and global conversion defaults that downstream customer overrides and booking use."
        action={
          <Button onClick={openCreateMapping} disabled={!availableForTenant || !quantityCodes.length || !weightCodes.length}>
            Add UOM Mapping
          </Button>
        }
      />

      <MasterDataAccessBanner
        enabledModuleCodes={enabledModuleCodes}
        requiredModules={["TMS"]}
        disabledMessage="UOM configuration stays visible here, but create and edit actions are disabled until TMS is enabled for this tenant."
      />

      <div className="grid gap-4 md:grid-cols-3">
        <TenantSummaryCard label="Quantity UOMs" value={String(quantityDefinitions.length)} helper="Load-facing units like bag, drum, pallet" />
        <TenantSummaryCard label="Weight UOMs" value={String(weightDefinitions.length)} helper="Weight units like KG, MT, Pounds" />
        <TenantSummaryCard label="Global mappings" value={String(mappings.length)} helper="Default quantity-to-weight conversions" />
      </div>

      {message ? <StatusBanner message={message} /> : null}

      <div className="grid gap-3">
        <ValidationHint text="Customer-specific overrides take precedence over these defaults." />
        <ValidationHint text="Booking uses the resolved UOM mapping to auto-calculate shipment weight." />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <TenantPanel
          title="Quantity UOM Master"
          description="Create tenant-approved quantity units for material and booking quantity capture."
          action={
            <Button size="sm" onClick={() => openCreateDefinition("QUANTITY")} disabled={!availableForTenant}>
              Add Quantity UOM
            </Button>
          }
        >
          <div className="flex flex-wrap gap-2">
            {quantityDefinitions.length ? (
              quantityDefinitions.map((definition) => (
                <button
                  type="button"
                  key={definition.id}
                  onClick={() => openEditDefinition(definition)}
                  className="rounded-full border bg-background px-3 py-2 text-sm transition hover:border-primary/30"
                  disabled={!availableForTenant}
                >
                  {definition.code}
                  {definition.isCustom ? " (Custom)" : ""}
                </button>
              ))
            ) : (
              <span className="text-sm text-muted-foreground">No quantity UOMs configured yet.</span>
            )}
          </div>
        </TenantPanel>

        <TenantPanel
          title="Weight UOM Master"
          description="Define the weight units allowed in conversion defaults and booking."
          action={
            <Button size="sm" onClick={() => openCreateDefinition("WEIGHT")} disabled={!availableForTenant}>
              Add Weight UOM
            </Button>
          }
        >
          <div className="flex flex-wrap gap-2">
            {weightDefinitions.length ? (
              weightDefinitions.map((definition) => (
                <button
                  type="button"
                  key={definition.id}
                  onClick={() => openEditDefinition(definition)}
                  className="rounded-full border bg-background px-3 py-2 text-sm transition hover:border-primary/30"
                  disabled={!availableForTenant}
                >
                  {definition.code}
                </button>
              ))
            ) : (
              <span className="text-sm text-muted-foreground">No weight UOMs configured yet.</span>
            )}
          </div>
        </TenantPanel>
      </div>

      <TenantFilterBar
        searchValue={search}
        searchPlaceholder="Search UOM mappings by quantity unit, weight unit, or conversion"
        onSearchChange={setSearch}
        trailing={<div className="text-sm text-muted-foreground">{filteredMappings.length} mappings shown</div>}
      />

      {filteredMappings.length ? (
        <DataTable
          title="Global UOM Mapping"
          description="These are the tenant default conversions used when a customer-specific override does not exist."
          headers={["Quantity UOM", "Weight UOM", "Conversion", "Status", "Actions"]}
          rows={filteredMappings.map((mapping) => [
            <Badge key={`${mapping.id}-qty`} variant="outline">
              {mapping.quantityUOM}
            </Badge>,
            <Badge key={`${mapping.id}-weight`} variant="accent">
              {mapping.weightUOM}
            </Badge>,
            <span key={`${mapping.id}-conversion`} className="text-sm font-medium">
              1 {mapping.quantityUOM} = {mapping.conversionValue} {mapping.weightUOM}
            </span>,
            <Badge key={`${mapping.id}-status`} variant={mapping.status === "active" ? "success" : "warning"}>
              {mapping.status}
            </Badge>,
            <div key={`${mapping.id}-actions`} className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={() => openEditMapping(mapping)} disabled={!availableForTenant}>
                Edit
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  deleteMapping(mapping.id);
                  setMessage("UOM mapping deleted.");
                }}
                disabled={!availableForTenant}
              >
                Delete
              </Button>
            </div>,
          ])}
        />
      ) : (
        <TenantEmptyState
          title="No UOM mappings found"
          description="Create the first global quantity-to-weight conversion default for downstream booking auto-calculation."
          action={availableForTenant ? <Button onClick={openCreateMapping}>Add UOM Mapping</Button> : null}
        />
      )}

      <Dialog
        open={definitionOpen}
        onOpenChange={setDefinitionOpen}
        title={editingDefinition ? "Edit UOM definition" : "Add UOM definition"}
        description="UOM definitions become reusable choices across master data, customer overrides, and booking."
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setDefinitionOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveDefinition} disabled={!availableForTenant}>
              {editingDefinition ? "Save Changes" : "Create UOM"}
            </Button>
          </div>
        }
      >
        <div className="grid gap-4">
          <Field label="Category">
            <Select
              value={definitionForm.category}
              onChange={(event) =>
                setDefinitionForm((current) => ({
                  ...current,
                  category: event.target.value as TenantUOMDefinition["category"],
                }))
              }
            >
              <option value="QUANTITY">Quantity UOM</option>
              <option value="WEIGHT">Weight UOM</option>
            </Select>
          </Field>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Code" helper="Stored in uppercase for consistent matching.">
              <Input value={definitionForm.code} onChange={(event) => setDefinitionForm((current) => ({ ...current, code: event.target.value }))} />
            </Field>
            <Field label="Label">
              <Input value={definitionForm.label} onChange={(event) => setDefinitionForm((current) => ({ ...current, label: event.target.value }))} />
            </Field>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Status">
              <Select
                value={definitionForm.status}
                onChange={(event) =>
                  setDefinitionForm((current) => ({
                    ...current,
                    status: event.target.value as TenantUOMDefinition["status"],
                  }))
                }
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </Select>
            </Field>
            <FlowToggle
              label="Custom UOM"
              description="Use this when the unit is tenant-defined rather than a standard unit."
              checked={definitionForm.isCustom}
              onCheckedChange={(checked) => setDefinitionForm((current) => ({ ...current, isCustom: checked }))}
            />
          </div>
        </div>
      </Dialog>

      <Dialog
        open={mappingOpen}
        onOpenChange={setMappingOpen}
        title={editingMapping ? "Edit UOM mapping" : "Add UOM mapping"}
        description="Set the default quantity-to-weight conversion used by booking unless the customer has an override."
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setMappingOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveMapping} disabled={!availableForTenant}>
              {editingMapping ? "Save Changes" : "Create Mapping"}
            </Button>
          </div>
        }
      >
        <div className="grid gap-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Quantity UOM">
              <Select
                value={mappingForm.quantityUOM}
                onChange={(event) => setMappingForm((current) => ({ ...current, quantityUOM: event.target.value }))}
              >
                <option value="">Select quantity UOM</option>
                {quantityCodes.map((code) => (
                  <option key={code} value={code}>
                    {code}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Weight UOM">
              <Select
                value={mappingForm.weightUOM}
                onChange={(event) => setMappingForm((current) => ({ ...current, weightUOM: event.target.value }))}
              >
                <option value="">Select weight UOM</option>
                {weightCodes.map((code) => (
                  <option key={code} value={code}>
                    {code}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Conversion Value" helper="Example: 0.05 means 1 quantity unit = 0.05 weight units.">
              <Input
                type="number"
                min="0"
                step="0.0001"
                value={mappingForm.conversionValue}
                onChange={(event) => setMappingForm((current) => ({ ...current, conversionValue: event.target.value }))}
              />
            </Field>
            <Field label="Status">
              <Select
                value={mappingForm.status}
                onChange={(event) =>
                  setMappingForm((current) => ({
                    ...current,
                    status: event.target.value as TenantUOMMapping["status"],
                  }))
                }
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </Select>
            </Field>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

export function TenantLRConfigPage() {
  const { tenantId, tenant } = useTenantRouteContext();
  const { data: lrConfigs, createLRConfig, updateLRConfig } = useTenantLRConfigs(tenantId);
  const { data: orgUnits } = useTenantOrgUnits(tenantId);
  const { data: customers } = useTenantCustomers(tenantId);
  const { data: users } = useTenantUsers(tenantId);
  const { data: vendors } = useTenantVendors(tenantId);
  const { data: hierarchyLevels } = useTenantOrgTypes(tenantId);
  const { data: modules } = usePlatformModules();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [form, setForm] = useState<TenantLRConfigForm>(() => buildDefaultLRConfigForm(hierarchyLevels));

  const enabledModuleCodes = getAccessibleModuleCodes(tenant.enabledModuleCodes, modules);
  const availableForTenant = enabledModuleCodes.includes("TMS");
  const orgUnitMap = new Map(orgUnits.map((item) => [item.id, item]));
  const customerMap = new Map(customers.map((item) => [item.id, item]));
  const vendorMap = new Map(vendors.map((item) => [item.id, item]));
  const hierarchyLevelMap = new Map(hierarchyLevels.map((item) => [item.id, item]));
  const configurationMode = getConfigurationMode(form);
  const orderedHierarchyLevels = useMemo(
    () => [...hierarchyLevels].sort((left, right) => left.order - right.order),
    [hierarchyLevels],
  );
  const visibleFlowLevels = useMemo(() => {
    if (configurationMode !== "HIERARCHY_LEVEL") {
      return [];
    }
    const selectedLevelIds = new Set(form.scopeOrgUnitIds);
    return form.allocationFlow.levels
      .filter((level) => selectedLevelIds.has(level.levelId))
      .filter((level) => hierarchyLevelMap.has(level.levelId))
      .sort(
        (left, right) =>
          (hierarchyLevelMap.get(left.levelId)?.order ?? Number.MAX_SAFE_INTEGER) -
          (hierarchyLevelMap.get(right.levelId)?.order ?? Number.MAX_SAFE_INTEGER),
      );
  }, [configurationMode, form.allocationFlow.levels, form.scopeOrgUnitIds, hierarchyLevelMap]);
  const duplicateScopePrefix = lrConfigs.some(
    (item) =>
      item.id !== editingId &&
      buildLRScopeKey(item) === buildLRScopeKey(form) &&
      item.lrType === form.lrType &&
      item.prefix.trim().toUpperCase() === form.prefix.trim().toUpperCase(),
  );
  const derivedPoolCount = deriveLRPoolCount(form);
  const scopeSummary = summarizeLRScope(form, orgUnitMap);
  const flowSummary = summarizeLRAllocationFlow(form.allocationFlow, hierarchyLevelMap);
  const supportsLegacyVendorFlow = Boolean(editingId && form.lrType === "VENDOR");
  const filteredConfigs = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    if (!normalizedSearch) {
      return lrConfigs;
    }
    return lrConfigs.filter((item) =>
      `${summarizeLRScope(item, orgUnitMap)} ${summarizeLROwnership(item, customerMap, vendorMap)} ${item.prefix} ${item.lrType} ${item.allocationStrategy ?? ""} ${summarizeLRAllocationFlow(item.allocationFlow, hierarchyLevelMap)}`
        .toLowerCase()
        .includes(normalizedSearch),
    );
  }, [customerMap, hierarchyLevelMap, lrConfigs, orgUnitMap, search, vendorMap]);

  function openCreate() {
    setEditingId(null);
    setForm(buildDefaultLRConfigForm(hierarchyLevels));
    setOpen(true);
  }

  function openEdit(config: TenantLRConfig) {
    setEditingId(config.id);
    setForm(buildLRConfigForm(config, hierarchyLevels));
    setOpen(true);
  }

  function handleLRTypeChange(nextType: LRType) {
    setForm((current) => applyLRTypeDefaults({ ...current, lrType: nextType }));
  }

  function handleConfigurationModeChange(nextMode: LRConfigurationMode) {
    setForm((current) => applyConfigurationMode(current, hierarchyLevels, nextMode));
  }

  function updateAllocationFlow(updates: Partial<LRAllocationFlowConfig>) {
    setForm((current) => ({
      ...current,
      allocationFlow: {
        ...current.allocationFlow,
        ...updates,
      },
    }));
  }

  function updateAllocationFlowLevel(levelId: string, updates: Partial<LRAllocationFlowLevel>) {
    setForm((current) => ({
      ...current,
      allocationFlow: {
        ...current.allocationFlow,
        levels: current.allocationFlow.levels.map((level) =>
          level.levelId === levelId ? { ...level, ...updates } : level,
        ),
      },
    }));
  }

  function toggleHierarchyLevel(levelId: string) {
    setForm((current) => {
      const nextSelectedLevelIds = current.scopeOrgUnitIds.includes(levelId)
        ? current.scopeOrgUnitIds.filter((item) => item !== levelId)
        : [...current.scopeOrgUnitIds, levelId];

      const nextFlowLevels = current.allocationFlow.levels.map((level) =>
        nextSelectedLevelIds.includes(level.levelId)
          ? level
          : {
              ...level,
              canAllocateQuota: false,
              canApproveRequests: false,
              canRequestQuota: false,
              canConsumeLR: false,
              canAllocateToCustomer: false,
              allocateToLevelIds: [],
              customerScope: "ALL" as const,
              customerIds: [],
            },
      );

      return {
        ...current,
        scopeOrgUnitIds: nextSelectedLevelIds,
        allocationFlow: {
          ...current.allocationFlow,
          customConsumptionLevelId:
            current.allocationFlow.customConsumptionLevelId &&
            !nextSelectedLevelIds.includes(current.allocationFlow.customConsumptionLevelId)
              ? null
              : current.allocationFlow.customConsumptionLevelId,
          levels: nextFlowLevels,
        },
      };
    });
  }

  function toggleAllocationTarget(levelId: string, targetLevelId: string) {
    setForm((current) => ({
      ...current,
      allocationFlow: {
        ...current.allocationFlow,
        levels: current.allocationFlow.levels.map((level) => {
          if (level.levelId !== levelId) {
            return level;
          }
          return {
            ...level,
            allocateToLevelIds: level.allocateToLevelIds.includes(targetLevelId)
              ? level.allocateToLevelIds.filter((item) => item !== targetLevelId)
              : [...level.allocateToLevelIds, targetLevelId],
          };
        }),
      },
    }));
  }

  function saveConfig() {
    if (form.lrType === "AUTO" && !form.prefix.trim()) {
      setMessage("Enter the LR prefix for auto numbering.");
      return;
    }

    if (form.lrType === "AUTO" && form.zeroPaddingLength < 1) {
      setMessage("Enter a valid zero-padding length for auto LR numbering.");
      return;
    }

    if (configurationMode === "HIERARCHY_LEVEL" && !visibleFlowLevels.length) {
      setMessage("Add hierarchy levels before saving an advanced LR flow.");
      return;
    }

    if (form.poolOwnershipType === "CUSTOMER" && form.lrType !== "PRE_GENERATED" && !form.customerId) {
      setMessage("Select the customer that owns this LR pool.");
      return;
    }

    if (form.poolOwnershipType === "VENDOR" && !form.vendorId) {
      setMessage("Select the vendor that owns this LR pool.");
      return;
    }

    if (form.lrType === "MANUAL") {
      if (!form.prefix.trim()) {
        setMessage("Enter the LR prefix for manual LR format.");
        return;
      }
      if (form.zeroPaddingLength < 1) {
        setMessage("Enter a valid number padding for manual LR format.");
        return;
      }
    }

    if (form.lrType === "VENDOR") {
      if (!form.prefix.trim()) {
        setMessage("Enter the LR prefix for vendor LR format.");
        return;
      }
      if (form.zeroPaddingLength < 1) {
        setMessage("Enter a valid number padding for vendor LR format.");
        return;
      }
      if (form.poolSource === "RANGE") {
        const start = Number(form.poolRangeStart);
        const end = Number(form.poolRangeEnd);
        if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) {
          setMessage("Enter a valid LR range where the end value is greater than or equal to the start value.");
          return;
        }
      } else if (!form.poolEntries.trim()) {
        setMessage("Upload or paste pre-generated LR numbers in CSV/list format.");
        return;
      }
    }

    if (form.lrType === "PRE_GENERATED" && !form.prefix.trim()) {
      setMessage("Define the LR format prefix used to validate pre-generated LR numbers.");
      return;
    }

    if (form.lrType === "PRE_GENERATED" && form.zeroPaddingLength < 1) {
      setMessage("Enter a valid number length for pre-generated LR format validation.");
      return;
    }

    if (form.allocationStrategy === "HIERARCHICAL" && !form.allocationFlow.levels.length) {
      setMessage("Add at least one tenant hierarchy level before configuring hierarchy-based LR allocation flow.");
      return;
    }

    if (
      configurationMode === "HIERARCHY_LEVEL" &&
      visibleFlowLevels.some(
        (level) =>
          !level.canAllocateQuota &&
          !level.canAllocateToCustomer &&
          !level.canApproveRequests &&
          !level.canRequestQuota &&
          !level.canConsumeLR,
      )
    ) {
      setMessage("Each selected hierarchy level must define at least one LR action.");
      return;
    }

    if (
      form.lrType === "PRE_GENERATED" &&
      form.customerOwnershipEnabled &&
      configurationMode === "HIERARCHY_LEVEL" &&
      visibleFlowLevels.some(
        (level) =>
          level.canAllocateToCustomer &&
          (level.customerScope ?? "ALL") === "SELECTED" &&
          !(level.customerIds ?? []).length,
      )
    ) {
      setMessage("Select at least one customer for levels that allocate LR to selected customers.");
      return;
    }

    if (
      form.allocationStrategy === "HIERARCHICAL" &&
      form.allocationFlow.consumptionLevel === "CUSTOM" &&
      !form.allocationFlow.customConsumptionLevelId
    ) {
      setMessage("Select the custom hierarchy level where LR should be consumed.");
      return;
    }

    try {
      const payload = buildLRConfigPayload(form, derivedPoolCount, hierarchyLevels);
      if (editingId) {
        updateLRConfig(editingId, payload);
        setMessage("LR configuration updated and persisted.");
      } else {
        createLRConfig(payload);
        setMessage("LR configuration created and persisted.");
      }
      setOpen(false);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "LR configuration could not be saved.");
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Tenant Admin"
        title="LR Configuration"
        description="Guide tenant users through a simple LR setup first, then reveal hierarchy controls only when advanced allocation is required."
        action={
          <Button onClick={openCreate} disabled={!availableForTenant}>
            Add LR Config
          </Button>
        }
      />

      <MasterDataAccessBanner
        enabledModuleCodes={enabledModuleCodes}
        requiredModules={["TMS"]}
        disabledMessage="LR configuration stays visible here, but create and edit actions are disabled until TMS is enabled for this tenant."
      />

      <div className="grid gap-4 md:grid-cols-3">
        <TenantSummaryCard label="Configurations" value={String(lrConfigs.length)} helper="Tenant-scoped LR rules" />
        <TenantSummaryCard label="Active" value={String(lrConfigs.filter((item) => item.status === "active").length)} helper="Currently effective records" />
        <TenantSummaryCard
          label="Owned pools"
          value={String(lrConfigs.filter((item) => (item.poolOwnershipType ?? (item.vendorId ? "VENDOR" : item.customerId ? "CUSTOMER" : "TENANT")) !== "TENANT").length)}
          helper="Customer- or vendor-owned pool mappings"
        />
      </div>

      {message ? <StatusBanner message={message} /> : null}

      <div className="grid gap-3">
        <ValidationHint text="LR is generated only at vehicle assignment." />
        <ValidationHint text="Tenant Level keeps LR simple: global auto numbering, shared manual pool, or direct customer pre-generated pool." />
        <ValidationHint text="Hierarchy Level reveals allocation, request, approval, and consumption only for tenants that need branch-controlled LR ownership." />
      </div>

      <TenantFilterBar
        searchValue={search}
        searchPlaceholder="Search LR configs by scope, ownership, prefix, vendor, customer, or LR type"
        onSearchChange={setSearch}
        trailing={<div className="text-sm text-muted-foreground">{filteredConfigs.length} records shown</div>}
      />

      {filteredConfigs.length ? (
        <DataTable
          title="LR configuration master"
          description="Saved LR rules drive LR Management automatically. Setup stays compatible with the current booking assignment and LR generation flow."
          headers={["Scope", "LR type", "Allocation", "Configuration", "Status", "Actions"]}
          rows={filteredConfigs.map((item) => [
            <div key={`${item.id}-scope`} className="min-w-[180px]">
              <p className="font-medium">{summarizeLRScope(item, orgUnitMap)}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {item.scopeType === "HIERARCHY"
                    ? "Optional hierarchy allocation"
                    : "Tenant-wide configuration"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{summarizeLROwnership(item, customerMap, vendorMap)}</p>
            </div>,
            <Badge key={`${item.id}-lr-type`} variant="outline">
              {formatLRType(item.lrType)}
            </Badge>,
            <div key={`${item.id}-allocation`} className="flex flex-wrap gap-1.5">
              <Badge variant="accent">{formatAllocationStrategy(item.allocationStrategy ?? "FLAT")}</Badge>
              <Badge variant="secondary">{formatAllocationFlowMode(item.allocationFlow?.mode ?? "FLAT")}</Badge>
              <Badge variant="outline">
                {formatConsumptionLevel(item.allocationFlow?.consumptionLevel ?? "TENANT", item.allocationFlow, hierarchyLevelMap)}
              </Badge>
            </div>,
            <div key={`${item.id}-config`} className="min-w-[210px]">
              <p className="font-medium">{describeLRConfiguration(item)}</p>
              <p className="mt-1 text-xs text-muted-foreground">{describeLRPool(item)}</p>
              <p className="mt-1 text-xs text-muted-foreground">{summarizeLRAllocationFlow(item.allocationFlow, hierarchyLevelMap)}</p>
            </div>,
            <Badge key={`${item.id}-status`} variant={item.status === "active" ? "success" : "warning"}>
              {item.status}
            </Badge>,
            <Button key={`${item.id}-edit`} size="sm" variant="ghost" onClick={() => openEdit(item)} disabled={!availableForTenant}>
              Edit
            </Button>,
          ])}
        />
      ) : (
        <TenantEmptyState
          title="No LR configuration found"
          description="Create the first company-level LR rule. Hierarchy mapping and customer-level pre-generated pools remain optional."
          action={availableForTenant ? <Button onClick={openCreate}>Add LR Config</Button> : null}
        />
      )}

      <Dialog
        open={open}
        onOpenChange={setOpen}
        title={editingId ? "Edit LR configuration" : "Add LR configuration"}
        description=""
        widthClassName="max-w-4xl"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveConfig} disabled={!availableForTenant}>
              {editingId ? "Save Changes" : "Create LR Config"}
            </Button>
          </div>
        }
      >
        <div className="grid gap-4">
          <SectionHeading
            title="1. Select LR Type"
            description=""
          />
          <div className="grid gap-3 md:grid-cols-3">
            {(["AUTO", "MANUAL", "PRE_GENERATED"] as LRType[]).map((lrType) => (
              <button
                key={lrType}
                type="button"
                onClick={() => handleLRTypeChange(lrType)}
                className={[
                  "rounded-2xl border px-4 py-4 text-left transition",
                  form.lrType === lrType ? "border-primary bg-primary/5 shadow-sm" : "bg-background hover:border-primary/30",
                ].join(" ")}
              >
                <p className="text-sm font-semibold">{formatLRType(lrType)}</p>
                <p className="mt-1 text-xs text-muted-foreground">{getLRTypeHelperText(lrType)}</p>
              </button>
            ))}
            {supportsLegacyVendorFlow ? (
              <button
                type="button"
                onClick={() => handleLRTypeChange("VENDOR")}
                className={[
                  "rounded-2xl border px-4 py-4 text-left transition md:col-span-3",
                  form.lrType === "VENDOR" ? "border-primary bg-primary/5 shadow-sm" : "bg-background hover:border-primary/30",
                ].join(" ")}
              >
                <p className="text-sm font-semibold">Vendor LR (Legacy compatibility)</p>
                <p className="mt-2 text-sm text-muted-foreground">Retained for existing tenants without changing the current LR engine.</p>
              </button>
            ) : null}
          </div>

          {supportsLegacyVendorFlow ? (
            <ValidationHint text="This existing config uses Vendor LR. The guided create flow is simplified to Auto, Manual, and Pre-generated, but legacy vendor rules remain compatible in saved data." />
          ) : null}

          <SectionHeading
            title="2. Select Configuration Mode"
            description=""
          />
          <div className="grid gap-3 md:grid-cols-2">
            <button
              type="button"
              onClick={() => handleConfigurationModeChange("TENANT_LEVEL")}
              className={[
                "rounded-2xl border px-4 py-4 text-left transition",
                configurationMode === "TENANT_LEVEL" ? "border-primary bg-primary/5 shadow-sm" : "bg-background hover:border-primary/30",
              ].join(" ")}
            >
              <p className="text-sm font-semibold">Tenant Level</p>
              <p className="mt-1 text-xs text-muted-foreground">Simple</p>
            </button>
            <button
              type="button"
              onClick={() => handleConfigurationModeChange("HIERARCHY_LEVEL")}
              className={[
                "rounded-2xl border px-4 py-4 text-left transition",
                configurationMode === "HIERARCHY_LEVEL" ? "border-primary bg-primary/5 shadow-sm" : "bg-background hover:border-primary/30",
              ].join(" ")}
            >
              <p className="text-sm font-semibold">Hierarchy Level</p>
              <p className="mt-1 text-xs text-muted-foreground">Advanced</p>
            </button>
          </div>

          {configurationMode === "TENANT_LEVEL" ? (
            <div className="grid gap-4">
              <SectionHeading
                title="3. Tenant Level Setup"
                description=""
              />

              {form.lrType === "AUTO" || form.lrType === "MANUAL" ? (
                <>
                  <SectionHeading
                    title="4. LR Format"
                    description=""
                  />
                  <div className="grid gap-4 md:grid-cols-4">
                    <Field label="Prefix">
                      <Input value={form.prefix} onChange={(event) => setForm((current) => ({ ...current, prefix: event.target.value }))} />
                    </Field>
                    <Field label="Include Year?">
                      <Select
                        value={form.yearFormat}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            yearFormat: event.target.value as LRYearFormat,
                          }))
                        }
                      >
                        <option value="NONE">No</option>
                        <option value="YY">Yes, 2 digits</option>
                        <option value="YYYY">Yes, 4 digits</option>
                      </Select>
                    </Field>
                    <Field label="Separator">
                      <Select
                        value={form.numberSeparator}
                        onChange={(event) => setForm((current) => ({ ...current, numberSeparator: event.target.value }))}
                      >
                        <option value="/">/</option>
                        <option value="-">-</option>
                        <option value="_">_</option>
                      </Select>
                    </Field>
                    <Field label="Number Padding">
                      <Input
                        type="number"
                        min="1"
                        value={String(form.zeroPaddingLength)}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            zeroPaddingLength: Number(event.target.value || 0),
                          }))
                        }
                      />
                    </Field>
                  </div>
                  <p className="text-xs text-muted-foreground">Preview: {buildLrFormatPreview(form)}</p>
                </>
              ) : (
                <>
                  {form.lrType === "PRE_GENERATED" ? (
                    <>
                      <Field label="Customer involvement">
                        <Select
                          value={form.customerOwnershipEnabled ? "CUSTOMER" : "TENANT"}
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              customerOwnershipEnabled: event.target.value === "CUSTOMER",
                              poolOwnershipType: event.target.value === "CUSTOMER" ? "CUSTOMER" : "TENANT",
                            }))
                          }
                        >
                          <option value="TENANT">No, keep pre-generated LR tenant-level</option>
                          <option value="CUSTOMER">Yes, allow customer-specific LR pools</option>
                        </Select>
                      </Field>
                      <div className="grid gap-4 md:grid-cols-4">
                        <Field label="Prefix">
                          <Input value={form.prefix} onChange={(event) => setForm((current) => ({ ...current, prefix: event.target.value }))} />
                        </Field>
                        <Field label="Year format">
                          <Select value={form.yearFormat} onChange={(event) => setForm((current) => ({ ...current, yearFormat: event.target.value as LRYearFormat }))}>
                            <option value="NONE">None</option>
                            <option value="YY">YY</option>
                            <option value="YYYY">YYYY</option>
                          </Select>
                        </Field>
                        <Field label="Separator">
                          <Input value={form.numberSeparator} onChange={(event) => setForm((current) => ({ ...current, numberSeparator: event.target.value }))} placeholder="/" />
                        </Field>
                        <Field label="Number length / padding">
                          <Input type="number" min="1" value={String(form.zeroPaddingLength)} onChange={(event) => setForm((current) => ({ ...current, zeroPaddingLength: Number(event.target.value || 0) }))} />
                        </Field>
                      </div>
                      <p className="text-xs text-muted-foreground">Preview: {buildLrFormatPreview(form)}</p>
                    </>
                  ) : null}
                  {form.lrType === "VENDOR" ? (
                    <Field label="Vendor" helper="Legacy vendor-owned LR pools remain editable for compatibility.">
                      <Select
                        value={form.vendorId ?? ""}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            poolOwnershipType: "VENDOR",
                            vendorId: event.target.value || null,
                          }))
                        }
                      >
                        <option value="">Select vendor</option>
                        {vendors.map((vendor) => (
                          <option key={vendor.id} value={vendor.id}>
                            {vendor.name}
                          </option>
                        ))}
                      </Select>
                    </Field>
                  ) : null}

                </>
              )}
            </div>
          ) : (
            <div className="grid gap-4">
              <SectionHeading
                title="3. Select Hierarchy Levels"
                description=""
              />

              <div className="grid gap-2 md:grid-cols-3">
                  {orderedHierarchyLevels.length ? (
                    orderedHierarchyLevels.map((level) => (
                      <button
                        key={level.id}
                        type="button"
                        onClick={() => toggleHierarchyLevel(level.id)}
                        className={[
                          "rounded-xl border px-3 py-3 text-left transition",
                          form.scopeOrgUnitIds.includes(level.id)
                            ? "border-primary bg-primary/5 shadow-sm"
                            : "bg-background hover:border-primary/30",
                        ].join(" ")}
                      >
                        <p className="text-sm font-medium">{level.name}</p>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                          {form.scopeOrgUnitIds.includes(level.id) ? "Selected" : "Click to select"}
                        </p>
                      </button>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No hierarchy levels exist yet.</p>
                  )}
              </div>

              {form.lrType === "AUTO" || form.lrType === "MANUAL" ? (
                <>
                  <SectionHeading
                    title="4. LR Format"
                    description=""
                  />
                  <div className="grid gap-4 md:grid-cols-4">
                    <Field label="Prefix">
                      <Input value={form.prefix} onChange={(event) => setForm((current) => ({ ...current, prefix: event.target.value }))} />
                    </Field>
                    <Field label="Include Year?">
                      <Select
                        value={form.yearFormat}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            yearFormat: event.target.value as LRYearFormat,
                          }))
                        }
                      >
                        <option value="NONE">No</option>
                        <option value="YY">Yes, 2 digits</option>
                        <option value="YYYY">Yes, 4 digits</option>
                      </Select>
                    </Field>
                    <Field label="Separator">
                      <Select
                        value={form.numberSeparator}
                        onChange={(event) => setForm((current) => ({ ...current, numberSeparator: event.target.value }))}
                      >
                        <option value="/">/</option>
                        <option value="-">-</option>
                        <option value="_">_</option>
                      </Select>
                    </Field>
                    <Field label="Number Padding">
                      <Input
                        type="number"
                        min="1"
                        value={String(form.zeroPaddingLength)}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            zeroPaddingLength: Number(event.target.value || 0),
                          }))
                        }
                      />
                    </Field>
                  </div>
                  <p className="text-xs text-muted-foreground">Preview: {buildLrFormatPreview(form)}</p>
                </>
              ) : (
                <>
                  {form.lrType === "PRE_GENERATED" ? (
                    <>
                      <Field label="Customer involvement">
                        <Select
                          value={form.customerOwnershipEnabled ? "CUSTOMER" : "TENANT"}
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              customerOwnershipEnabled: event.target.value === "CUSTOMER",
                              poolOwnershipType: event.target.value === "CUSTOMER" ? "CUSTOMER" : "TENANT",
                            }))
                          }
                        >
                          <option value="TENANT">No, keep pre-generated LR tenant-level</option>
                          <option value="CUSTOMER">Yes, allow customer-specific LR pools</option>
                        </Select>
                      </Field>
                      <div className="grid gap-4 md:grid-cols-4">
                        <Field label="Prefix">
                          <Input value={form.prefix} onChange={(event) => setForm((current) => ({ ...current, prefix: event.target.value }))} />
                        </Field>
                        <Field label="Year format">
                          <Select value={form.yearFormat} onChange={(event) => setForm((current) => ({ ...current, yearFormat: event.target.value as LRYearFormat }))}>
                            <option value="NONE">None</option>
                            <option value="YY">YY</option>
                            <option value="YYYY">YYYY</option>
                          </Select>
                        </Field>
                        <Field label="Separator">
                          <Input value={form.numberSeparator} onChange={(event) => setForm((current) => ({ ...current, numberSeparator: event.target.value }))} placeholder="/" />
                        </Field>
                        <Field label="Number length / padding">
                          <Input type="number" min="1" value={String(form.zeroPaddingLength)} onChange={(event) => setForm((current) => ({ ...current, zeroPaddingLength: Number(event.target.value || 0) }))} />
                        </Field>
                      </div>
                      <p className="text-xs text-muted-foreground">Preview: {buildLrFormatPreview(form)}</p>
                    </>
                  ) : null}
                  {form.lrType === "VENDOR" ? (
                    <Field label="Vendor" helper="Legacy vendor-owned LR pools remain editable for compatibility.">
                      <Select
                        value={form.vendorId ?? ""}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            poolOwnershipType: "VENDOR",
                            vendorId: event.target.value || null,
                          }))
                        }
                      >
                        <option value="">Select vendor</option>
                        {vendors.map((vendor) => (
                          <option key={vendor.id} value={vendor.id}>
                            {vendor.name}
                          </option>
                        ))}
                      </Select>
                    </Field>
                  ) : null}

                </>
              )}

              <div className="rounded-2xl border bg-card/80 p-4">
                <div className="flex flex-col gap-2">
                  <p className="text-sm font-semibold">4. Actions By Level</p>
                </div>

                <div className="mt-4">
                  <Field label="Consumption level">
                    <Select
                      value={form.allocationFlow.consumptionLevel}
                      onChange={(event) =>
                        updateAllocationFlow({
                          consumptionLevel: event.target.value as LRConsumptionLevel,
                          customConsumptionLevelId: event.target.value === "CUSTOM" ? form.allocationFlow.customConsumptionLevelId : null,
                        })
                      }
                    >
                      <option value="TENANT">Tenant</option>
                      <option value="REGION">Region</option>
                      <option value="BRANCH">Branch</option>
                      <option value="DISPATCH_UNIT">Dispatch Unit</option>
                      <option value="USER">User</option>
                      <option value="CUSTOM">Custom Hierarchy Level</option>
                    </Select>
                  </Field>
                </div>

                {form.allocationFlow.consumptionLevel === "CUSTOM" ? (
                  <div className="mt-4">
                    <Field label="Custom consumption hierarchy level" helper="Choose the hierarchy level that can consume LR during booking assignment.">
                      <Select
                        value={form.allocationFlow.customConsumptionLevelId ?? ""}
                        onChange={(event) =>
                          updateAllocationFlow({
                            customConsumptionLevelId: event.target.value || null,
                          })
                        }
                      >
                        <option value="">Select hierarchy level</option>
                        {form.allocationFlow.levels.map((level) => (
                          <option key={level.levelId} value={level.levelId}>
                            {hierarchyLevelMap.get(level.levelId)?.name ?? `Unavailable level (${level.levelId})`}
                          </option>
                        ))}
                      </Select>
                    </Field>
                  </div>
                ) : null}

                {visibleFlowLevels.length ? (
                  <div className="mt-4 grid gap-4">
                    {visibleFlowLevels.map((level) => {
                      const levelMeta = hierarchyLevelMap.get(level.levelId);
                      const currentOrder = levelMeta?.order ?? Number.MAX_SAFE_INTEGER;
                      const nextHierarchyLevel = orderedHierarchyLevels.find((candidate) => candidate.order > currentOrder);
                      const childLevelOptions = nextHierarchyLevel
                        ? [
                            {
                              levelId: nextHierarchyLevel.id,
                              label: nextHierarchyLevel.name,
                            },
                          ]
                        : [];

                      return (
                        <div key={level.levelId} className="rounded-xl border bg-background/80 p-3">
                          <div className="flex flex-col gap-1">
                            <p className="text-sm font-medium">{levelMeta?.name ?? `Unavailable level (${level.levelId})`}</p>
                          </div>

                          <div className="mt-3 grid gap-3 md:grid-cols-2">
                            <FlowToggle
                              label="Allocate LR"
                              description="Allow this level to allocate LR."
                              checked={level.canAllocateQuota}
                              onCheckedChange={(checked) =>
                                updateAllocationFlowLevel(level.levelId, {
                                  canAllocateQuota: checked,
                                  allocateToLevelIds: checked ? level.allocateToLevelIds : [],
                                })
                              }
                            />
                            {form.lrType === "PRE_GENERATED" && form.customerOwnershipEnabled ? (
                              <FlowToggle
                                label="Allocate to Customer"
                                description="Allow this level to allocate LR to customers."
                                checked={level.canAllocateToCustomer ?? false}
                                onCheckedChange={(checked) =>
                                  updateAllocationFlowLevel(level.levelId, {
                                    canAllocateToCustomer: checked,
                                    customerScope: checked ? (level.customerScope ?? "ALL") : "ALL",
                                    customerIds: checked ? (level.customerIds ?? []) : [],
                                  })
                                }
                              />
                            ) : null}
                            <FlowToggle
                              label="Approve Requests"
                              description="Allow this level to approve requests."
                              checked={level.canApproveRequests}
                              onCheckedChange={(checked) =>
                                updateAllocationFlowLevel(level.levelId, {
                                  canApproveRequests: checked,
                                })
                              }
                            />
                            <FlowToggle
                              label="Request LR"
                              description="Allow this level to request LR."
                              checked={level.canRequestQuota}
                              onCheckedChange={(checked) =>
                                updateAllocationFlowLevel(level.levelId, {
                                  canRequestQuota: checked,
                                })
                              }
                            />
                            <FlowToggle
                              label="Consume LR"
                              description="Allow this level to consume LR."
                              checked={level.canConsumeLR}
                              onCheckedChange={(checked) =>
                                updateAllocationFlowLevel(level.levelId, {
                                  canConsumeLR: checked,
                                })
                              }
                            />
                          </div>

                          {level.canAllocateQuota ? (
                            <div className="mt-4">
                              <Field label="Allocate to child levels">
                                <div className="grid gap-2 rounded-xl border bg-muted/20 p-3 md:grid-cols-2">
                                  {childLevelOptions.length ? (
                                    childLevelOptions.map((option) => (
                                      <label
                                        key={`${level.levelId}-${option.levelId}`}
                                        className={`flex items-start gap-3 rounded-2xl border px-4 py-3 transition ${
                                          level.allocateToLevelIds.includes(option.levelId)
                                            ? "border-primary/40 bg-primary/5"
                                            : "bg-background/80 hover:border-primary/20"
                                        }`}
                                      >
                                        <input
                                          type="checkbox"
                                          checked={level.allocateToLevelIds.includes(option.levelId)}
                                          onChange={() => toggleAllocationTarget(level.levelId, option.levelId)}
                                          className="mt-1"
                                        />
                                        <div className="min-w-0">
                                          <p className="text-sm font-medium">{option.label}</p>
                                        </div>
                                      </label>
                                    ))
                                  ) : (
                                    <p className="text-sm text-muted-foreground">No lower hierarchy level is available below this level.</p>
                                  )}
                                </div>
                              </Field>
                            </div>
                          ) : null}

                          {form.lrType === "PRE_GENERATED" && form.customerOwnershipEnabled && level.canAllocateToCustomer ? (
                            <div className="mt-4 grid gap-4">
                              <Field label="Customer allocation scope">
                                <Select
                                  value={level.customerScope ?? "ALL"}
                                  onChange={(event) =>
                                    updateAllocationFlowLevel(level.levelId, {
                                      customerScope: event.target.value as LRCustomerAllocationScope,
                                      customerIds:
                                        event.target.value === "SELECTED"
                                          ? (level.customerIds ?? [])
                                          : [],
                                    })
                                  }
                                >
                                  <option value="ALL">All customers</option>
                                  <option value="SELECTED">Selected customers</option>
                                </Select>
                              </Field>

                              {(level.customerScope ?? "ALL") === "SELECTED" ? (
                                <Field label="Allowed customers">
                                  <div className="grid gap-2 rounded-xl border bg-muted/20 p-3 md:grid-cols-2">
                                    {customers.length ? (
                                      customers.map((customer) => (
                                        <label
                                          key={`${level.levelId}-${customer.id}`}
                                          className={`flex items-start gap-3 rounded-2xl border px-4 py-3 transition ${
                                            (level.customerIds ?? []).includes(customer.id)
                                              ? "border-primary/40 bg-primary/5"
                                              : "bg-background/80 hover:border-primary/20"
                                          }`}
                                        >
                                          <input
                                            type="checkbox"
                                            checked={(level.customerIds ?? []).includes(customer.id)}
                                            onChange={() =>
                                              updateAllocationFlowLevel(level.levelId, {
                                                customerIds: (level.customerIds ?? []).includes(customer.id)
                                                  ? (level.customerIds ?? []).filter((item) => item !== customer.id)
                                                  : [...(level.customerIds ?? []), customer.id],
                                              })
                                            }
                                            className="mt-1"
                                          />
                                          <div className="min-w-0">
                                            <p className="text-sm font-medium">{customer.name}</p>
                                          </div>
                                        </label>
                                      ))
                                    ) : (
                                      <p className="text-sm text-muted-foreground">No customers are available yet.</p>
                                    )}
                                  </div>
                                </Field>
                              ) : null}
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="mt-4 rounded-2xl border bg-muted/20 p-4">
                    <p className="text-sm font-medium">No hierarchy level selected</p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Select at least one level.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Status">
              <Select value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as TenantLRConfig["status"] }))}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </Select>
            </Field>
          </div>

          {duplicateScopePrefix ? (
            <ValidationHint text="This LR prefix is already used for the same scope and LR type. This is a non-blocking frontend hint." />
          ) : null}
        </div>
      </Dialog>
    </div>
  );
}

type TenantLRConfigForm = {
  scopeType: LRConfigScopeType;
  scopeOrgUnitIds: string[];
  poolOwnershipType: LRPoolOwnershipType;
  customerId: string | null;
  vendorId: string | null;
  customerOwnershipEnabled: boolean;
  lrType: LRType;
  allocationStrategy: LRAllocationStrategy;
  prefix: string;
  numberSeparator: string;
  yearFormat: LRYearFormat;
  zeroPaddingLength: number;
  poolSource: LRPoolSource;
  poolRangeStart: string;
  poolRangeEnd: string;
  poolEntries: string;
  poolAvailableCount: number;
  poolUsedCount: number;
  locationOrgUnitId: string;
  locationCounter: number;
  allocationFlow: LRAllocationFlowConfig;
  status: TenantLRConfig["status"];
};

type LRConfigurationMode = "TENANT_LEVEL" | "HIERARCHY_LEVEL";

type HierarchyPreviewNode = {
  id: string;
  name: string;
  levelId: string;
  levelName: string;
  users: string[];
  children: HierarchyPreviewNode[];
};

function buildDefaultLRConfigForm(hierarchyLevels: Array<{ id: string; order: number }>): TenantLRConfigForm {
  return {
    scopeType: "TENANT",
    scopeOrgUnitIds: [],
    poolOwnershipType: "TENANT",
    customerId: null,
    vendorId: null,
    customerOwnershipEnabled: false,
    lrType: "AUTO",
    allocationStrategy: "FLAT",
    prefix: "",
    numberSeparator: "-",
    yearFormat: "YYYY",
    zeroPaddingLength: 6,
    poolSource: "RANGE",
    poolRangeStart: "",
    poolRangeEnd: "",
    poolEntries: "",
    poolAvailableCount: 0,
    poolUsedCount: 0,
    locationOrgUnitId: "",
    locationCounter: 0,
    allocationFlow: buildDefaultAllocationFlow(hierarchyLevels, "FLAT"),
    status: "active",
  };
}

function getConfigurationMode(config: Pick<TenantLRConfigForm, "scopeType" | "allocationStrategy">): LRConfigurationMode {
  return config.scopeType === "HIERARCHY" || config.allocationStrategy === "HIERARCHICAL"
    ? "HIERARCHY_LEVEL"
    : "TENANT_LEVEL";
}

function applyConfigurationMode(
  form: TenantLRConfigForm,
  hierarchyLevels: Array<{ id: string; order: number }>,
  mode: LRConfigurationMode,
): TenantLRConfigForm {
  if (mode === "TENANT_LEVEL") {
    return applyLRTypeDefaults({
      ...form,
      scopeType: "TENANT",
      scopeOrgUnitIds: [],
      allocationStrategy: "FLAT",
      allocationFlow: buildDefaultAllocationFlow(hierarchyLevels, "FLAT", form.allocationFlow),
    });
  }

  return applyLRTypeDefaults({
    ...form,
    scopeType: "HIERARCHY",
    allocationStrategy: "HIERARCHICAL",
    allocationFlow: buildDefaultAllocationFlow(hierarchyLevels, "HIERARCHY", form.allocationFlow),
  });
}

function buildLRConfigForm(
  config: TenantLRConfig,
  hierarchyLevels: Array<{ id: string; order: number }>,
): TenantLRConfigForm {
  return applyLRTypeDefaults({
    scopeType: config.scopeType ?? (config.locationOrgUnitId ? "HIERARCHY" : "TENANT"),
    scopeOrgUnitIds: config.scopeOrgUnitIds?.length
      ? config.scopeOrgUnitIds
      : config.locationOrgUnitId
        ? [config.locationOrgUnitId]
        : [],
    poolOwnershipType:
      config.poolOwnershipType ??
      (config.vendorId ? "VENDOR" : config.customerId ? "CUSTOMER" : "TENANT"),
    customerId: config.customerId ?? null,
    vendorId: config.vendorId ?? null,
    customerOwnershipEnabled: config.customerOwnershipEnabled ?? false,
    lrType: config.lrType,
    allocationStrategy:
      config.allocationStrategy ??
      (config.allocationFlow?.mode === "HIERARCHY" || config.scopeType === "HIERARCHY"
        ? "HIERARCHICAL"
        : "FLAT"),
    prefix: config.prefix,
    numberSeparator: config.numberSeparator ?? "-",
    yearFormat: config.yearFormat ?? "YYYY",
    zeroPaddingLength: config.zeroPaddingLength ?? 6,
    poolSource:
      config.poolSource ??
      (config.lrType === "PRE_GENERATED" || config.lrType === "VENDOR"
        ? "CSV"
        : config.lrType === "MANUAL"
          ? "RANGE"
          : "LIST"),
    poolRangeStart: config.poolRangeStart ?? "",
    poolRangeEnd: config.poolRangeEnd ?? "",
    poolEntries: config.poolEntries ?? "",
    poolAvailableCount: config.poolAvailableCount ?? 0,
    poolUsedCount: config.poolUsedCount ?? 0,
    locationOrgUnitId: config.locationOrgUnitId ?? "",
    locationCounter: config.locationCounter ?? 0,
    allocationFlow: buildDefaultAllocationFlow(
      hierarchyLevels,
      config.allocationFlow?.mode ??
        (config.allocationStrategy === "HIERARCHICAL" || config.scopeType === "HIERARCHY"
          ? "HIERARCHY"
          : "FLAT"),
      config.allocationFlow,
    ),
    status: config.status,
  });
}

function applyLRTypeDefaults(form: TenantLRConfigForm): TenantLRConfigForm {
  if (form.lrType === "AUTO") {
    return {
      ...form,
      scopeType: form.scopeType === "CUSTOMER" ? "TENANT" : form.scopeType,
      poolOwnershipType: "TENANT",
      customerId: null,
      vendorId: null,
      customerOwnershipEnabled: false,
      yearFormat: form.yearFormat === "NONE" ? "YYYY" : form.yearFormat,
      poolSource: "LIST",
    };
  }

  if (form.lrType === "MANUAL") {
    return {
      ...form,
      scopeType: form.scopeType === "CUSTOMER" ? "TENANT" : form.scopeType,
      poolOwnershipType: "TENANT",
      customerId: null,
      vendorId: null,
      customerOwnershipEnabled: false,
      yearFormat: form.yearFormat,
      poolSource: form.poolSource === "CSV" ? "CSV" : form.poolSource === "RANGE" ? "RANGE" : "LIST",
    };
  }

  if (form.lrType === "PRE_GENERATED") {
    return {
      ...form,
      scopeType: form.scopeType === "CUSTOMER" ? "TENANT" : form.scopeType,
      poolOwnershipType: form.customerOwnershipEnabled ? "CUSTOMER" : "TENANT",
      customerId: null,
      vendorId: null,
      poolSource: form.poolSource === "LIST" ? "CSV" : form.poolSource,
    };
  }

  return {
    ...form,
    scopeType: form.scopeType === "CUSTOMER" ? "TENANT" : form.scopeType,
    poolOwnershipType: form.poolOwnershipType === "CUSTOMER" ? "TENANT" : form.poolOwnershipType,
    customerId: null,
    vendorId: form.poolOwnershipType === "VENDOR" ? form.vendorId : null,
    customerOwnershipEnabled: false,
    yearFormat: "NONE",
    poolSource: form.poolSource === "LIST" ? "CSV" : form.poolSource,
  };
}

function deriveLRPoolCount(config: Pick<TenantLRConfigForm, "lrType" | "poolSource" | "poolRangeStart" | "poolRangeEnd" | "poolEntries">) {
  if (config.lrType === "AUTO") {
    return 0;
  }
  if (config.poolSource === "RANGE") {
    const start = Number(config.poolRangeStart);
    const end = Number(config.poolRangeEnd);
    if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) {
      return 0;
    }
    return end - start + 1;
  }
  return config.poolEntries
    .split(/[\r\n,]+/)
    .map((entry) => entry.trim())
    .filter(Boolean).length;
}

function buildLrFormatPreview(config: Pick<TenantLRConfigForm, "prefix" | "numberSeparator" | "yearFormat" | "zeroPaddingLength">) {
  const separator = config.numberSeparator || "-";
  const segments = [config.prefix.trim().toUpperCase() || "LR"];
  if (config.yearFormat === "YY") {
    segments.push("26");
  } else if (config.yearFormat === "YYYY") {
    segments.push("2026");
  }
  segments.push("1".padStart(Math.max(config.zeroPaddingLength, 1), "0"));
  return segments.join(separator);
}

function buildRangeSummary(config: Pick<TenantLRConfigForm, "prefix" | "numberSeparator" | "yearFormat" | "zeroPaddingLength" | "poolRangeStart" | "poolRangeEnd">) {
  const start = Number(config.poolRangeStart);
  const end = Number(config.poolRangeEnd);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) {
    return null;
  }
  const separator = config.numberSeparator || "-";
  const yearToken = config.yearFormat === "YY" ? "26" : config.yearFormat === "YYYY" ? "2026" : "";
  const parts = [config.prefix.trim().toUpperCase() || "LR"];
  if (yearToken) {
    parts.push(yearToken);
  }
  const formatSequence = (value: number) => String(value).padStart(Math.max(config.zeroPaddingLength, 1), "0");
  return `${[...parts, formatSequence(start)].join(separator)} → ${[...parts, formatSequence(end)].join(separator)}`;
}

function importPoolEntriesIntoForm(file: File | null, setForm: Dispatch<SetStateAction<TenantLRConfigForm>>, setMessage: (message: string) => void) {
  if (!file) {
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    const value = typeof reader.result === "string" ? reader.result : "";
    setForm((current) => ({
      ...current,
      poolEntries: value,
    }));
    setMessage(`${file.name} loaded into the LR pool input.`);
  };
  reader.readAsText(file);
}

function buildHierarchyPreviewTree(
  orgUnits: OrgUnit[],
  hierarchyLevelMap: Map<string, { name: string }>,
  users: UserRecord[],
) {
  const childrenByParent = new Map<string | null, OrgUnit[]>();
  orgUnits.forEach((orgUnit) => {
    const parentId = orgUnit.parentOrgUnitId ?? null;
    childrenByParent.set(parentId, [...(childrenByParent.get(parentId) ?? []), orgUnit]);
  });

  const usersByOrgUnitId = new Map(
    orgUnits.map((orgUnit) => [
      orgUnit.id,
      users
        .filter((user) => user.orgUnitIds.includes(orgUnit.id))
        .map((user) => user.name),
    ]),
  );

  const buildNode = (orgUnit: OrgUnit): HierarchyPreviewNode => ({
    id: orgUnit.id,
    name: orgUnit.name,
    levelId: orgUnit.hierarchyLevelId,
    levelName: hierarchyLevelMap.get(orgUnit.hierarchyLevelId)?.name ?? orgUnit.hierarchyLevelId,
    users: usersByOrgUnitId.get(orgUnit.id) ?? [],
    children: (childrenByParent.get(orgUnit.id) ?? [])
      .slice()
      .sort((left, right) => left.name.localeCompare(right.name))
      .map(buildNode),
  });

  return (childrenByParent.get(null) ?? [])
    .slice()
    .sort((left, right) => left.name.localeCompare(right.name))
    .map(buildNode);
}

function buildLRConfigPayload(
  form: TenantLRConfigForm,
  derivedPoolCount: number,
  hierarchyLevels: Array<{ id: string; order: number }>,
) {
  return {
    scopeType: form.scopeType === "CUSTOMER" ? "TENANT" : form.scopeType,
    scopeOrgUnitIds: Array.from(new Set(form.scopeOrgUnitIds)),
    poolOwnershipType:
      form.lrType === "PRE_GENERATED"
        ? (form.customerOwnershipEnabled ? "CUSTOMER" : "TENANT")
        : supportsPoolOwnership(form.lrType)
          ? form.poolOwnershipType
          : "TENANT",
    customerId: form.lrType === "PRE_GENERATED" ? null : form.poolOwnershipType === "CUSTOMER" ? form.customerId : null,
    vendorId: form.poolOwnershipType === "VENDOR" ? form.vendorId : null,
    customerOwnershipEnabled: form.lrType === "PRE_GENERATED" ? form.customerOwnershipEnabled : false,
    lrType: form.lrType,
    allocationStrategy: form.allocationStrategy,
    prefix: form.prefix,
    numberSeparator: form.numberSeparator.trim() || "-",
    yearFormat: (form.lrType === "AUTO" || form.lrType === "MANUAL" || form.lrType === "PRE_GENERATED") ? form.yearFormat : "NONE" as LRYearFormat,
    zeroPaddingLength: (form.lrType === "AUTO" || form.lrType === "MANUAL" || form.lrType === "PRE_GENERATED") ? form.zeroPaddingLength : 0,
    poolSource: form.lrType === "AUTO" ? "LIST" as LRPoolSource : form.poolSource,
    poolRangeStart: form.lrType === "AUTO" ? "" : form.poolRangeStart.trim(),
    poolRangeEnd: form.lrType === "AUTO" ? "" : form.poolRangeEnd.trim(),
    poolEntries: form.lrType === "AUTO" ? "" : form.poolEntries.trim(),
    poolAvailableCount: form.lrType === "AUTO" ? 0 : derivedPoolCount,
    poolUsedCount: form.lrType === "AUTO" ? 0 : form.poolUsedCount,
    locationOrgUnitId: form.scopeOrgUnitIds[0] ?? form.locationOrgUnitId ?? "",
    locationCounter: form.locationCounter ?? 0,
    allocationFlow: buildLRAllocationFlowPayload(form.allocationFlow, hierarchyLevels),
    status: form.status,
  };
}

function buildDefaultAllocationFlow(
  hierarchyLevels: Array<{ id: string; order: number }>,
  mode: LRAllocationFlowMode,
  existing?: LRAllocationFlowConfig,
): LRAllocationFlowConfig {
  const baseLevels = hierarchyLevels
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((level) => {
      const storedLevel = existing?.levels.find((item) => item.levelId === level.id);
      return {
        levelId: level.id,
        canAllocateQuota: storedLevel?.canAllocateQuota ?? false,
        allocateToLevelIds: Array.from(new Set((storedLevel?.allocateToLevelIds ?? []).filter(Boolean))),
        canAllocateToCustomer: storedLevel?.canAllocateToCustomer ?? false,
        customerScope: storedLevel?.customerScope ?? "ALL",
        customerIds: Array.from(new Set((storedLevel?.customerIds ?? []).filter(Boolean))),
        canRequestQuota: storedLevel?.canRequestQuota ?? false,
        canApproveRequests: storedLevel?.canApproveRequests ?? false,
        canConsumeLR: storedLevel?.canConsumeLR ?? false,
      };
    });
  const archivedLevels = (existing?.levels ?? [])
    .filter((storedLevel) => !hierarchyLevels.some((item) => item.id === storedLevel.levelId))
    .map((storedLevel) => ({
      levelId: storedLevel.levelId,
      canAllocateQuota: storedLevel.canAllocateQuota ?? false,
      allocateToLevelIds: Array.from(new Set((storedLevel.allocateToLevelIds ?? []).filter(Boolean))),
      canAllocateToCustomer: storedLevel.canAllocateToCustomer ?? false,
      customerScope: storedLevel.customerScope ?? "ALL",
      customerIds: Array.from(new Set((storedLevel.customerIds ?? []).filter(Boolean))),
      canRequestQuota: storedLevel.canRequestQuota ?? false,
      canApproveRequests: storedLevel.canApproveRequests ?? false,
      canConsumeLR: storedLevel.canConsumeLR ?? false,
    }));

  return {
    mode,
    requestFlow: existing?.requestFlow ?? "CHILD_TO_PARENT",
    approvalFlow: existing?.approvalFlow ?? "PARENT_APPROVES",
    consumptionLevel: mode === "FLAT" ? "TENANT" : existing?.consumptionLevel ?? "TENANT",
    customConsumptionLevelId: mode === "FLAT" ? null : existing?.customConsumptionLevelId ?? null,
    levels: [...baseLevels, ...archivedLevels],
  };
}

function buildLRAllocationFlowPayload(
  flow: LRAllocationFlowConfig,
  hierarchyLevels: Array<{ id: string; order: number }>,
): LRAllocationFlowConfig | undefined {
  if (flow.mode === "FLAT") {
    return undefined;
  }

  const orderedLevelIds = hierarchyLevels
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((level) => level.id);
  const rankMap = new Map(orderedLevelIds.map((levelId, index) => [levelId, index]));
  const normalizedLevels = flow.levels.map((level) => ({
    levelId: level.levelId,
    canAllocateQuota: level.canAllocateQuota,
    allocateToLevelIds: Array.from(
      new Set(
        level.allocateToLevelIds.filter((targetLevelId) => {
          if (targetLevelId === level.levelId) {
            return false;
          }
          const sourceRank = rankMap.get(level.levelId);
          const targetRank = rankMap.get(targetLevelId);
          if (sourceRank === undefined || targetRank === undefined) {
            return true;
          }
          return targetRank > sourceRank;
        }),
      ),
    ),
    canAllocateToCustomer: level.canAllocateToCustomer,
    customerScope: level.canAllocateToCustomer ? (level.customerScope ?? "ALL") : "ALL",
    customerIds:
      level.canAllocateToCustomer && (level.customerScope ?? "ALL") === "SELECTED"
        ? Array.from(new Set((level.customerIds ?? []).filter(Boolean)))
        : [],
    canRequestQuota: level.canRequestQuota,
    canApproveRequests: level.canApproveRequests,
    canConsumeLR: level.canConsumeLR,
  }));

  return {
    mode: flow.mode,
    requestFlow: flow.requestFlow,
    approvalFlow: flow.approvalFlow,
    consumptionLevel: flow.consumptionLevel,
    customConsumptionLevelId:
      flow.consumptionLevel === "CUSTOM" ? flow.customConsumptionLevelId ?? null : null,
    levels: normalizedLevels,
  };
}

function buildLRScopeKey(
  config: Pick<TenantLRConfig, "scopeType" | "scopeOrgUnitIds" | "poolOwnershipType" | "customerId" | "vendorId">,
) {
  return [
    config.scopeType ?? "TENANT",
    [...(config.scopeOrgUnitIds ?? [])].sort().join("|"),
    config.poolOwnershipType ?? (config.vendorId ? "VENDOR" : config.customerId ? "CUSTOMER" : "TENANT"),
    config.customerId ?? "",
    config.vendorId ?? "",
  ].join("::");
}

function summarizeLRScope<TOrgUnit extends { name: string }>(
  config: Pick<TenantLRConfig, "scopeType" | "scopeOrgUnitIds">,
  orgUnitMap: Map<string, TOrgUnit>,
) {
  if (config.scopeType === "HIERARCHY") {
    return "Hierarchy Level";
  }
  return "Tenant Level";
}

function summarizeLROwnership<
  TCustomer extends { name: string },
  TVendor extends { name: string },
>(
  config: Pick<TenantLRConfig, "poolOwnershipType" | "customerId" | "vendorId">,
  customerMap: Map<string, TCustomer>,
  vendorMap: Map<string, TVendor>,
) {
  const ownershipType =
    config.poolOwnershipType ?? (config.vendorId ? "VENDOR" : config.customerId ? "CUSTOMER" : "TENANT");
  if (ownershipType === "CUSTOMER") {
    return `Customer-owned: ${customerMap.get(config.customerId ?? "")?.name ?? "Unassigned customer"}`;
  }
  if (ownershipType === "VENDOR") {
    return `Vendor-owned: ${vendorMap.get(config.vendorId ?? "")?.name ?? "Unassigned vendor"}`;
  }
  return "Tenant-owned pool";
}

function describeLRConfiguration(config: TenantLRConfig) {
  if (config.lrType === "AUTO") {
    const yearPart = config.yearFormat && config.yearFormat !== "NONE" ? ` + ${config.yearFormat}` : "";
    return `${config.prefix || "No prefix"}${yearPart} + ${config.zeroPaddingLength ?? 0} digit padding`;
  }
  if (config.lrType === "MANUAL") {
    return `Manual pool via ${formatPoolSource(config.poolSource ?? "LIST")}`;
  }
  if (config.lrType === "VENDOR") {
    return `Vendor pool via ${formatPoolSource(config.poolSource ?? "CSV")}`;
  }
  return `Pre-generated pool via ${formatPoolSource(config.poolSource ?? "CSV")}`;
}

function describeLRPool(config: TenantLRConfig) {
  if (config.lrType === "AUTO") {
    return config.locationCounter
      ? `System managed counter. Legacy counter hint: ${config.locationCounter.toLocaleString()}.`
      : "System managed counter. No manual counter entry.";
  }
  return `AVAILABLE ${config.poolAvailableCount ?? 0} / USED ${config.poolUsedCount ?? 0}`;
}

function summarizeLRAllocationFlow<TLevel extends { name: string }>(
  flow: TenantLRConfig["allocationFlow"],
  hierarchyLevelMap: Map<string, TLevel>,
) {
  if (!flow || flow.mode === "FLAT") {
    return "Flat mode with direct tenant-level consumption.";
  }

  const enabledLevels = flow.levels.filter(
    (level) =>
      level.canAllocateQuota ||
      level.canAllocateToCustomer ||
      level.canRequestQuota ||
      level.canApproveRequests ||
      level.canConsumeLR,
  );
  const levelSummary = enabledLevels.length
    ? enabledLevels
        .map((level) => {
          const levelName = hierarchyLevelMap.get(level.levelId)?.name ?? level.levelId;
          if (!level.canAllocateToCustomer) {
            return levelName;
          }
          return `${levelName} (${(level.customerScope ?? "ALL") === "SELECTED" ? `${(level.customerIds ?? []).length} customers` : "all customers"})`;
        })
        .join(", ")
    : "no hierarchy levels configured yet";

  return `Hierarchy flow, ${formatConsumptionLevel(flow.consumptionLevel, flow, hierarchyLevelMap).toLowerCase()}, active levels: ${levelSummary}.`;
}

function MasterDataAccessBanner({
  enabledModuleCodes,
  requiredModules,
  disabledMessage,
}: {
  enabledModuleCodes: string[];
  requiredModules: string[];
  disabledMessage: string;
}) {
  const moduleSet = new Set(enabledModuleCodes);
  const matchedModules = requiredModules.filter((moduleCode) => moduleSet.has(moduleCode));
  return (
    <div className={`rounded-2xl border px-4 py-3 text-sm ${matchedModules.length ? "border-sky-200 bg-sky-50/60 text-slate-800" : "border-amber-300 bg-amber-50 text-amber-900"}`}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium">Enabled modules</span>
        {enabledModuleCodes.length ? (
          enabledModuleCodes.map((moduleCode) => (
            <Badge key={moduleCode} variant={matchedModules.includes(moduleCode) ? "accent" : "secondary"}>
              {moduleCode}
            </Badge>
          ))
        ) : (
          <Badge variant="warning">None enabled</Badge>
        )}
      </div>
      <p className="mt-2">
        Access removed immediately on module disable. Data is retained.
        {!matchedModules.length ? ` ${disabledMessage}` : ""}
      </p>
    </div>
  );
}

function StatusBanner({ message }: { message: string }) {
  return <div className="rounded-2xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div>;
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

function ValidationHint({ text }: { text: string }) {
  return <div className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">{text}</div>;
}

function SectionHeading({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-2xl border bg-slate-50/70 px-4 py-3">
      <p className="text-sm font-semibold">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function FlowToggle({
  label,
  description,
  checked,
  onCheckedChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-2xl border bg-muted/20 px-4 py-3">
      <div className="min-w-0">
        <p className="text-sm font-medium">{label}</p>
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

function HierarchyPreviewBranch({
  node,
  selectedIds,
  onToggle,
  depth = 0,
}: {
  node: HierarchyPreviewNode;
  selectedIds: string[];
  onToggle: (orgUnitId: string) => void;
  depth?: number;
}) {
  return (
    <div className="space-y-3">
      <label
        className={`flex items-start gap-3 rounded-2xl border px-4 py-3 transition ${
          selectedIds.includes(node.id)
            ? "border-primary/40 bg-primary/5"
            : "bg-background/80 hover:border-primary/20"
        }`}
        style={{ marginLeft: `${depth * 16}px` }}
      >
        <input
          type="checkbox"
          checked={selectedIds.includes(node.id)}
          onChange={() => onToggle(node.id)}
          className="mt-1"
        />
        <div className="min-w-0">
          <p className="text-sm font-medium">{node.name}</p>
          <p className="text-xs text-muted-foreground">{node.levelName}</p>
          {node.users.length ? (
            <p className="mt-1 text-xs text-muted-foreground">Users: {node.users.join(", ")}</p>
          ) : null}
        </div>
      </label>
      {node.children.map((child) => (
        <HierarchyPreviewBranch
          key={child.id}
          node={child}
          selectedIds={selectedIds}
          onToggle={onToggle}
          depth={depth + 1}
        />
      ))}
    </div>
  );
}

function formatLRType(lrType: LRType) {
  if (lrType === "PRE_GENERATED") {
    return "Pre-generated";
  }
  if (lrType === "VENDOR") {
    return "Vendor LR";
  }
  return lrType.charAt(0) + lrType.slice(1).toLowerCase();
}

function formatAllocationStrategy(strategy: LRAllocationStrategy) {
  return strategy === "HIERARCHICAL" ? "Hierarchical" : "Flat";
}

function formatAllocationFlowMode(mode: LRAllocationFlowMode) {
  return mode === "HIERARCHY" ? "Hierarchy Flow" : "Flat Flow";
}

function formatConsumptionLevel<TLevel extends { name: string }>(
  level: LRConsumptionLevel,
  flow: Pick<LRAllocationFlowConfig, "customConsumptionLevelId"> | undefined,
  hierarchyLevelMap: Map<string, TLevel>,
) {
  if (level === "REGION") {
    return "Region";
  }
  if (level === "BRANCH") {
    return "Branch";
  }
  if (level === "DISPATCH_UNIT") {
    return "Dispatch Unit";
  }
  if (level === "USER") {
    return "User";
  }
  if (level === "CUSTOM") {
    return hierarchyLevelMap.get(flow?.customConsumptionLevelId ?? "")?.name ?? "Custom Level";
  }
  return "Tenant";
}

function formatPoolSource(source: LRPoolSource) {
  if (source === "CSV") {
    return "CSV";
  }
  return source.charAt(0) + source.slice(1).toLowerCase();
}

function supportsPoolOwnership(lrType: LRType) {
  return lrType === "PRE_GENERATED" || lrType === "VENDOR";
}

function requiresOwnedPool(lrType: LRType) {
  return supportsPoolOwnership(lrType);
}

function getLRTypeHelperText(lrType: LRType) {
  if (lrType === "AUTO") {
    return "System-generated LR at vehicle assignment. Format and allocation remain configurable.";
  }
  if (lrType === "MANUAL") {
    return "Define manual LR format and ownership rules here. Numbers and availability are managed later in LR Management.";
  }
  if (lrType === "VENDOR") {
    return "Secondary vendor reference pool. This does not replace the primary tenant LR priority.";
  }
  return "Use a pre-generated LR pool. Customer mapping is optional and only needed for customer-specific ownership.";
}

function getLRConfigSectionDescription(lrType: LRType) {
  if (lrType === "AUTO") {
    return "Define the generated LR format. Pool setup is not needed for auto numbering.";
  }
  if (lrType === "MANUAL") {
    return "Configure the manual LR format and setup rules. Number creation and allocation happen in LR Management.";
  }
  if (lrType === "VENDOR") {
    return "Configure the vendor LR pool. Ownership and allocation stay optional.";
  }
  return "Configure the pre-generated LR pool. Ownership and allocation stay optional.";
}

