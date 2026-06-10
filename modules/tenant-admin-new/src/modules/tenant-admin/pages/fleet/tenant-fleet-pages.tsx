import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Edit3,
  FileCheck,
  Plus,
  PowerOff,
  Search,
  ShieldCheck,
  ShieldX,
  Ship,
  Truck,
  Upload,
  Users,
  X,
} from "lucide-react";
import { PageHeader } from "@/shared/components/common/page-header";
import { TenantSummaryCard } from "@/modules/tenant-admin/components/tenant-primitives";
import { mockTenantVehicles, mockTenantDrivers } from "@shared-admin-core/mocks/data";
import { Button } from "@/shared/components/ui/button";
import { Dialog } from "@/shared/components/ui/dialog";
import { Input } from "@/shared/components/ui/input";
import { Select } from "@/shared/components/ui/select";
import { useTenantDrivers, useTenantVehicles } from "@/modules/tenant-admin/hooks/useTenantFleet";
import { useTenantVehicleTypes } from "@/modules/tenant-admin/hooks/useTenantMasterData";
import { useTenantRouteContext } from "@/modules/tenant-admin/hooks/useTenantRouteContext";
import { useTenantVendors } from "@/modules/tenant-admin/hooks/useTenantVendors";
import type {
  ComplianceStatus,
  FleetComplianceDocument,
  TenantDriver,
  TenantDriverInput,
  TenantVehicle,
  TenantVehicleInput,
  VehicleFuelType,
  VehicleOperationalStatus,
  VehicleTrackingType,
} from "@/types/fleet";

const FUEL_TYPES: VehicleFuelType[] = ["DIESEL", "PETROL", "CNG", "LNG", "ELECTRIC"];
const TRACKING_TYPES: Array<{ value: VehicleTrackingType; label: string }> = [
  { value: "NONE", label: "No Tracking" },
  { value: "GPS_DEVICE", label: "GPS Device" },
  { value: "SIM", label: "SIM Based" },
];
const OPERATIONAL_STATUSES: Array<{ value: VehicleOperationalStatus; label: string }> = [
  { value: "ACTIVE", label: "Active" },
  { value: "UNDER_MAINTENANCE", label: "Under Maintenance" },
  { value: "INACTIVE", label: "Inactive" },
];

const STATUS_STYLES: Record<ComplianceStatus, string> = {
  COMPLIANT: "bg-emerald-100 text-emerald-700",
  EXPIRING_SOON: "bg-amber-100 text-amber-700",
  EXPIRED: "bg-rose-100 text-rose-700",
  PENDING_DOCS: "bg-gray-100 text-gray-600",
};
const STATUS_LABELS: Record<ComplianceStatus, string> = {
  COMPLIANT: "All Documents Uploaded",
  EXPIRING_SOON: "Documents Expiring Soon",
  EXPIRED: "Documents Expired",
  PENDING_DOCS: "Documents Pending",
};

function computeDocStatus(expiryDate: string): FleetComplianceDocument["status"] {
  if (!expiryDate) return "VALID";
  const daysLeft = (new Date(expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
  if (daysLeft < 0) return "EXPIRED";
  if (daysLeft <= 30) return "EXPIRING_SOON";
  return "VALID";
}

function computeComplianceFromDocs(
  docs: Record<string, { fileName: string; referenceNo: string; expiryDate: string }>,
): ComplianceStatus {
  const entries = Object.values(docs);
  if (entries.some((d) => !d.fileName)) return "PENDING_DOCS";
  if (entries.some((d) => computeDocStatus(d.expiryDate) === "EXPIRED")) return "EXPIRED";
  if (entries.some((d) => computeDocStatus(d.expiryDate) === "EXPIRING_SOON")) return "EXPIRING_SOON";
  return "COMPLIANT";
}

function docsToComplianceDocs(
  docs: Record<string, { fileName: string; referenceNo: string; expiryDate: string }>,
): FleetComplianceDocument[] {
  return Object.entries(docs)
    .filter(([, d]) => d.fileName)
    .map(([type, d]) => ({
      id: `${type}-${type}`,
      type,
      referenceNo: d.referenceNo,
      fileName: d.fileName,
      fileUrl: `/docs/${d.fileName}`,
      expiryDate: d.expiryDate,
      status: computeDocStatus(d.expiryDate),
      uploadedAt: new Date(0).toISOString(),
    }));
}

function complianceDocsToMap<K extends string>(
  list: FleetComplianceDocument[] | undefined,
  keys: K[],
): Record<K, { fileName: string; referenceNo: string; expiryDate: string }> {
  const empty = { fileName: "", referenceNo: "", expiryDate: "" };
  const result = Object.fromEntries(keys.map((k) => [k, { ...empty }])) as Record<
    K,
    { fileName: string; referenceNo: string; expiryDate: string }
  >;
  for (const doc of list ?? []) {
    if (keys.includes(doc.type as K)) {
      result[doc.type as K] = {
        fileName: doc.fileName ?? "",
        referenceNo: doc.referenceNo ?? "",
        expiryDate: doc.expiryDate ?? "",
      };
    }
  }
  return result;
}

function ComplianceIcon({ status }: { status?: ComplianceStatus }) {
  if (status === "COMPLIANT") return <ShieldCheck className="h-4 w-4 text-emerald-600" />;
  if (status === "EXPIRING_SOON") return <AlertTriangle className="h-4 w-4 text-amber-600" />;
  return <ShieldX className="h-4 w-4 text-rose-600" />;
}

function ToggleSwitch({ active, onToggle }: { active: boolean; onToggle: () => void }) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={onToggle}
        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors ${
          active ? "bg-emerald-500" : "bg-gray-300"
        }`}
        role="switch"
        aria-checked={active}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform mt-0.5 ${
            active ? "translate-x-4" : "translate-x-0.5"
          }`}
        />
      </button>
      <span className="text-sm font-medium">{active ? "Active" : "Inactive"}</span>
    </div>
  );
}

function StatusBadge({ status }: { status: ComplianceStatus }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${STATUS_STYLES[status]}`}>
      <ComplianceIcon status={status} />
      {STATUS_LABELS[status]}
    </span>
  );
}

const VEHICLE_DOC_KEYS = ["RC", "Insurance", "PUC", "FC", "NationalPermit"] as const;
type VehicleDocKey = (typeof VEHICLE_DOC_KEYS)[number];
const VEHICLE_DOC_CONFIG: Array<{ key: VehicleDocKey; label: string; refPlaceholder: string }> = [
  { key: "RC", label: "Registration Certificate (RC)", refPlaceholder: "RC Number" },
  { key: "Insurance", label: "Insurance", refPlaceholder: "Policy Number" },
  { key: "PUC", label: "Pollution Under Control (PUC)", refPlaceholder: "PUC Number" },
  { key: "FC", label: "Fitness Certificate (FC)", refPlaceholder: "FC Number" },
  { key: "NationalPermit", label: "National Permit", refPlaceholder: "Permit Number" },
];

const DRIVER_DOC_KEYS = ["DL", "MedicalCertificate"] as const;
type DriverDocKey = (typeof DRIVER_DOC_KEYS)[number];
const DRIVER_DOC_CONFIG: Array<{ key: DriverDocKey; label: string; refPlaceholder: string }> = [
  { key: "DL", label: "Driving License (DL)", refPlaceholder: "DL Number" },
  { key: "MedicalCertificate", label: "Medical Certificate", refPlaceholder: "Certificate Number" },
];

const FLEET_PAGE_SIZE = 10;

function FleetSearchBar({
  value,
  onChange,
  placeholder,
  trailing,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  trailing?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-gray-100 px-5 py-4 md:flex-row md:items-center md:justify-between">
      <div className="relative w-full md:w-80">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="pl-9"
        />
      </div>
      {trailing}
    </div>
  );
}

function PaginationFooter({
  page,
  totalPages,
  totalItems,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  totalItems: number;
  onPageChange: (page: number) => void;
}) {
  if (totalItems <= FLEET_PAGE_SIZE) return null;
  const start = (page - 1) * FLEET_PAGE_SIZE + 1;
  const end = Math.min(page * FLEET_PAGE_SIZE, totalItems);
  return (
    <div className="flex items-center justify-between border-t border-gray-100 px-5 py-4 text-sm text-gray-600">
      <span>
        Showing {start}-{end} of {totalItems}
      </span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
          disabled={page === 1}
          onClick={() => onPageChange(Math.max(1, page - 1))}
        >
          <ChevronLeft className="h-4 w-4" /> Previous
        </button>
        <span className="rounded-lg bg-gray-50 px-3 py-1.5 font-semibold text-gray-800">
          Page {page} of {totalPages}
        </span>
        <button
          type="button"
          className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
          disabled={page === totalPages}
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
        >
          Next <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

// ============================ VEHICLES ============================

// Who created this master-data record: the vendor (when added from the Vendor
// Portal) or "Administration" (when added here in Tenant Admin). Records created
// before provenance tracking default to Administration.
type CreatedByRecord = {
  source?: string;
  createdByLoginType?: string;
  createdByVendorId?: string | null;
  vendorName?: string;
};

function createdByLabel(record: CreatedByRecord): string {
  const byVendor = record.createdByLoginType === "VENDOR" || record.source === "VENDOR_PORTAL";
  if (byVendor) return record.vendorName ?? "Vendor";
  return "Administration";
}

function CreatedByCell({ record }: { record: CreatedByRecord }) {
  const label = createdByLabel(record);
  const byVendor = label !== "Administration";
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
        byVendor ? "bg-indigo-50 text-indigo-700" : "bg-gray-100 text-gray-600"
      }`}
    >
      {label}
    </span>
  );
}

export function TenantVehiclesPage() {
  const { tenant } = useTenantRouteContext();
  const { data, createVehicle, updateVehicle } = useTenantVehicles(tenant.id);
  const vehicles = data.length ? data : mockTenantVehicles;
  const { data: vendors } = useTenantVendors(tenant.id);
  const { data: vehicleTypes } = useTenantVehicleTypes(tenant.id);
  const vendorMap = useMemo(() => new Map(vendors.map((v) => [v.id, v])), [vendors]);
  const vehicleTypeMap = useMemo(() => new Map(vehicleTypes.map((vt) => [vt.id, vt])), [vehicleTypes]);
  const activeVendors = vendors.filter((v) => v.status === "active");
  const activeVehicleTypes = vehicleTypes.filter((vt) => vt.status === "active");
  const [isOpen, setIsOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<TenantVehicle | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const filteredVehicles = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return vehicles;
    return vehicles.filter((vehicle) => {
      const vendorName = vehicle.vendorId ? vendorMap.get(vehicle.vendorId)?.name ?? vehicle.vendorName ?? "" : "Own Fleet";
      return `${vehicle.registrationNumber} ${vehicle.make} ${vehicle.model} ${vehicle.baseLocation ?? ""} ${vendorName}`
        .toLowerCase()
        .includes(q);
    });
  }, [vehicles, search, vendorMap]);
  const totalPages = Math.max(1, Math.ceil(filteredVehicles.length / FLEET_PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pagedVehicles = filteredVehicles.slice((safePage - 1) * FLEET_PAGE_SIZE, safePage * FLEET_PAGE_SIZE);

  function openAdd() {
    setEditingVehicle(null);
    setIsOpen(true);
  }
  function openEdit(vehicle: TenantVehicle) {
    setEditingVehicle(vehicle);
    setIsOpen(true);
  }
  function close() {
    setIsOpen(false);
    setEditingVehicle(null);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Administration"
        title="Vehicles"
        description="Manage vehicles. A vehicle is dispatch-ready only when status is Active and all compliance documents are valid."
        action={
          <Button onClick={openAdd}>
            <Plus className="size-4" />
            Add Vehicle
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-4">
        <TenantSummaryCard label="Total Vehicles" value={String(vehicles.length)} helper="Own and vendor assets" />
        <TenantSummaryCard label="Own Fleet" value={String(vehicles.filter((v) => v.ownershipType === "OWN").length)} helper="Internal fleet vehicles" />
        <TenantSummaryCard label="Vendor Fleet" value={String(vehicles.filter((v) => v.ownershipType === "VENDOR").length)} helper="Vendor mapped vehicles" />
        <TenantSummaryCard label="Active" value={String(vehicles.filter((v) => v.isActive).length)} helper="Visible for assignment" />
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <FleetSearchBar
          value={search}
          onChange={(value) => {
            setSearch(value);
            setPage(1);
          }}
          placeholder="Search by registration, make, model, location, or vendor"
          trailing={<span className="text-sm text-gray-500">{filteredVehicles.length} vehicle{filteredVehicles.length === 1 ? "" : "s"}</span>}
        />
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-gray-50">
              <tr>
                <th className="p-4 text-xs font-bold uppercase tracking-wide text-gray-500">Vehicle</th>
                <th className="p-4 text-xs font-bold uppercase tracking-wide text-gray-500">Vendor</th>
                <th className="p-4 text-xs font-bold uppercase tracking-wide text-gray-500">Status</th>
                <th className="p-4 text-xs font-bold uppercase tracking-wide text-gray-500">Compliance</th>
                <th className="p-4 text-xs font-bold uppercase tracking-wide text-gray-500">Created By</th>
                <th className="p-4 text-right text-xs font-bold uppercase tracking-wide text-gray-500">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredVehicles.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-sm text-gray-500">
                    {search ? "No vehicles match the search." : "No vehicles yet. Click Add Vehicle."}
                  </td>
                </tr>
              ) : null}
              {pagedVehicles.map((vehicle) => {
                  const compliance = vehicle.complianceStatus ?? "PENDING_DOCS";
                  return (
                    <tr key={vehicle.id} className="transition-colors hover:bg-blue-50/40">
                      <td className="p-4 align-top">
                        <div className="flex items-center gap-3">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                            <Truck className="h-5 w-5 text-primary" />
                          </span>
                          <div>
                            <div className="font-mono text-sm font-semibold">{vehicle.registrationNumber}</div>
                            <p className="text-xs text-gray-500">
                              {vehicleTypeMap.get(vehicle.vehicleTypeId)?.typeCode ?? "—"}
                              {vehicle.baseLocation ? ` · ${vehicle.baseLocation}` : ""}
                            </p>
                          </div>
                        </div>
                        {!vehicle.isActive && (
                          <div className="mt-2 flex items-center gap-1.5 rounded bg-gray-100 p-1.5 text-xs text-gray-500">
                            <PowerOff className="h-3.5 w-3.5" /> Inactive — not available for dispatch
                          </div>
                        )}
                      </td>
                      <td className="p-4 align-top text-sm text-gray-700">
                        {vehicle.vendorId
                          ? vendorMap.get(vehicle.vendorId)?.name ?? vehicle.vendorName ?? "Vendor"
                          : "Own Fleet"}
                      </td>
                      <td className="p-4 align-top">
                        <ToggleSwitch
                          active={vehicle.isActive}
                          onToggle={() => updateVehicle(vehicle.id, { isActive: !vehicle.isActive })}
                        />
                      </td>
                      <td className="p-4 align-top space-y-1">
                        <StatusBadge status={compliance} />
                        <div className="text-xs text-gray-500">
                          {vehicle.complianceDocuments?.length
                            ? `${vehicle.complianceDocuments.length} doc${vehicle.complianceDocuments.length !== 1 ? "s" : ""}`
                            : "No docs"}
                        </div>
                      </td>
                      <td className="p-4 align-top">
                        <CreatedByCell record={vehicle} />
                      </td>
                      <td className="p-4 align-top text-right">
                        <Button size="sm" variant="outline" onClick={() => openEdit(vehicle)}>
                          <Edit3 className="mr-2 h-4 w-4" /> Edit
                        </Button>
                      </td>
                    </tr>
                  );
              })}
            </tbody>
          </table>
        </div>
        <PaginationFooter
          page={safePage}
          totalPages={totalPages}
          totalItems={filteredVehicles.length}
          onPageChange={setPage}
        />
      </div>

      <VehicleModal
        isOpen={isOpen}
        onClose={close}
        initialVehicle={editingVehicle}
        activeVendors={activeVendors}
        activeVehicleTypes={activeVehicleTypes}
        vendorMap={vendorMap}
        vehicleTypeMap={vehicleTypeMap}
        onCreate={(input) => {
          createVehicle(input);
          close();
        }}
        onUpdate={(id, input) => {
          updateVehicle(id, input);
          close();
        }}
      />
    </div>
  );
}

// Page-route components for backward compatibility — redirect-style stubs.
export function TenantVehicleOnboardingPage() {
  return <TenantVehiclesPage />;
}

type VehicleModalProps = {
  isOpen: boolean;
  onClose: () => void;
  initialVehicle: TenantVehicle | null;
  activeVendors: Array<{ id: string; name: string }>;
  activeVehicleTypes: Array<{ id: string; typeCode: string }>;
  vendorMap: Map<string, { id: string; name: string }>;
  vehicleTypeMap: Map<string, { id: string; typeCode: string }>;
  onCreate: (input: TenantVehicleInput) => void;
  onUpdate: (id: string, input: Partial<TenantVehicleInput>) => void;
};

function VehicleModal({
  isOpen,
  onClose,
  initialVehicle,
  activeVendors,
  activeVehicleTypes,
  onCreate,
  onUpdate,
}: VehicleModalProps) {
  const isEdit = !!initialVehicle;
  const emptyDocs = useMemo(
    () => complianceDocsToMap(undefined, [...VEHICLE_DOC_KEYS]),
    [],
  );
  const [form, setForm] = useState({
    registrationNumber: "",
    vehicleTypeId: "",
    make: "",
    model: "",
    year: "",
    fuelType: "DIESEL" as VehicleFuelType,
    engineNumber: "",
    chassisNo: "",
    capacityKg: "",
    baseLocation: "",
    operationalStatus: "ACTIVE" as VehicleOperationalStatus,
    ownershipType: "OWN" as "OWN" | "VENDOR",
    vendorId: "" as string | "",
    trackingType: "NONE" as VehicleTrackingType,
    gpsDeviceId: "",
  });
  const [docs, setDocs] = useState(emptyDocs);
  const fileRef = useRef<HTMLInputElement>(null);
  const [pendingKey, setPendingKey] = useState<VehicleDocKey | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    if (initialVehicle) {
      setForm({
        registrationNumber: initialVehicle.registrationNumber,
        vehicleTypeId: initialVehicle.vehicleTypeId,
        make: initialVehicle.make,
        model: initialVehicle.model,
        year: initialVehicle.year,
        fuelType: initialVehicle.fuelType,
        engineNumber: initialVehicle.engineNumber ?? "",
        chassisNo: initialVehicle.chassisNo ?? "",
        capacityKg: initialVehicle.capacityKg ?? "",
        baseLocation: initialVehicle.baseLocation ?? "",
        operationalStatus: initialVehicle.operationalStatus ?? (initialVehicle.isActive ? "ACTIVE" : "INACTIVE"),
        ownershipType: initialVehicle.ownershipType,
        vendorId: initialVehicle.vendorId ?? "",
        trackingType: initialVehicle.trackingType ?? "NONE",
        gpsDeviceId: initialVehicle.gpsDeviceId ?? "",
      });
      setDocs(complianceDocsToMap(initialVehicle.complianceDocuments, [...VEHICLE_DOC_KEYS]));
    } else {
      setForm({
        registrationNumber: "",
        vehicleTypeId: "",
        make: "",
        model: "",
        year: "",
        fuelType: "DIESEL",
        engineNumber: "",
        chassisNo: "",
        capacityKg: "",
        baseLocation: "",
        operationalStatus: "ACTIVE",
        ownershipType: "OWN",
        vendorId: "",
        trackingType: "NONE",
        gpsDeviceId: "",
      });
      setDocs(complianceDocsToMap(undefined, [...VEHICLE_DOC_KEYS]));
    }
  }, [isOpen, initialVehicle]);

  const setField = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((c) => ({ ...c, [k]: v }));
  const setDoc = (key: VehicleDocKey, patch: Partial<{ fileName: string; referenceNo: string; expiryDate: string }>) =>
    setDocs((c) => ({ ...c, [key]: { ...c[key], ...patch } }));

  const compliance = computeComplianceFromDocs(docs);

  function handleSubmit() {
    if (!form.registrationNumber.trim() || !form.vehicleTypeId) return;
    const input: TenantVehicleInput = {
      registrationNumber: form.registrationNumber,
      vehicleTypeId: form.vehicleTypeId,
      make: form.make,
      model: form.model,
      year: form.year,
      fuelType: form.fuelType,
      engineNumber: form.engineNumber,
      chassisNo: form.chassisNo,
      capacityKg: form.capacityKg,
      baseLocation: form.baseLocation,
      trackingType: form.trackingType,
      gpsDeviceId: form.trackingType === "GPS_DEVICE" ? form.gpsDeviceId || null : null,
      operationalStatus: form.operationalStatus,
      ownershipType: form.ownershipType,
      // Vendor link is not picked during onboarding; preserved on edit if present.
      vendorId: form.ownershipType === "VENDOR" ? form.vendorId || null : null,
      insurance: { number: docs.Insurance.referenceNo, expiry: docs.Insurance.expiryDate },
      fitness: { number: docs.FC.referenceNo, expiry: docs.FC.expiryDate },
      puc: { number: docs.PUC.referenceNo, expiry: docs.PUC.expiryDate },
      permit: { type: docs.NationalPermit.referenceNo, expiry: docs.NationalPermit.expiryDate },
      odometer: "",
      complianceStatus: compliance,
      complianceDocuments: docsToComplianceDocs(docs),
      isActive: form.operationalStatus === "ACTIVE",
    };
    if (initialVehicle) onUpdate(initialVehicle.id, input);
    else onCreate(input);
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => (!open ? onClose() : undefined)}
      title={isEdit ? `Edit ${initialVehicle?.registrationNumber}` : "Add Vehicle"}
      description="Capture vehicle details and compliance documents."
      widthClassName="max-w-3xl"
      footer={
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit}>{isEdit ? "Save Changes" : "Add Vehicle"}</Button>
        </div>
      }
    >
      <div className="space-y-6">
        <input ref={fileRef} type="file" hidden onChange={(e) => {
          const f = e.target.files?.[0];
          if (!f || !pendingKey) return;
          setDoc(pendingKey, { fileName: f.name });
          setPendingKey(null);
          if (fileRef.current) fileRef.current.value = "";
        }} />

        <Section title="Vehicle Details">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Registration Number*">
              <Input
                value={form.registrationNumber}
                onChange={(e) => setField("registrationNumber", e.target.value)}
                placeholder="MH-04-AB-1234"
                disabled={isEdit}
                readOnly={isEdit}
              />
            </Field>
            <Field label="Vehicle Type">
              <Select value={form.vehicleTypeId} onChange={(e) => setField("vehicleTypeId", e.target.value)}>
                <option value="">Select vehicle type</option>
                {activeVehicleTypes.map((vt) => (
                  <option key={vt.id} value={vt.id}>{vt.typeCode}</option>
                ))}
              </Select>
            </Field>
            <Field label="Manufacturer">
              <Input value={form.make} onChange={(e) => setField("make", e.target.value)} placeholder="Tata, Mahindra…" />
            </Field>
            <Field label="Model">
              <Input value={form.model} onChange={(e) => setField("model", e.target.value)} placeholder="Prima 4928.S" />
            </Field>
            <Field label="Year">
              <Input value={form.year} onChange={(e) => setField("year", e.target.value)} placeholder="2021" />
            </Field>
            <Field label="Fuel Type">
              <Select value={form.fuelType} onChange={(e) => setField("fuelType", e.target.value as VehicleFuelType)}>
                {FUEL_TYPES.map((ft) => <option key={ft} value={ft}>{ft}</option>)}
              </Select>
            </Field>
            <Field label="Engine Number">
              <Input value={form.engineNumber} onChange={(e) => setField("engineNumber", e.target.value)} />
            </Field>
            <Field label="Chassis Number">
              <Input value={form.chassisNo} onChange={(e) => setField("chassisNo", e.target.value)} />
            </Field>
            <Field label="Capacity (kg)">
              <Input value={form.capacityKg} onChange={(e) => setField("capacityKg", e.target.value)} placeholder="15000" />
            </Field>
            <Field label="Base Location*">
              <Input value={form.baseLocation} onChange={(e) => setField("baseLocation", e.target.value)} placeholder="Mumbai" />
            </Field>
            <Field label="Operational Status">
              <Select value={form.operationalStatus} onChange={(e) => setField("operationalStatus", e.target.value as VehicleOperationalStatus)}>
                {OPERATIONAL_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </Select>
            </Field>
            <Field label="Ownership">
              <Select
                value={form.ownershipType}
                onChange={(e) => {
                  setField("ownershipType", e.target.value as "OWN" | "VENDOR");
                  if (e.target.value === "OWN") setField("vendorId", "");
                }}
              >
                <option value="OWN">OWN</option>
                <option value="VENDOR">VENDOR</option>
              </Select>
            </Field>
            {form.ownershipType === "VENDOR" ? (
              <Field label="Vendor">
                <Select value={form.vendorId} onChange={(e) => setField("vendorId", e.target.value)}>
                  <option value="">Select vendor</option>
                  {activeVendors.map((v) => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
                </Select>
              </Field>
            ) : null}
            <Field label="Tracking Type">
              <Select value={form.trackingType} onChange={(e) => setField("trackingType", e.target.value as VehicleTrackingType)}>
                {TRACKING_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </Select>
            </Field>
            {form.trackingType === "GPS_DEVICE" ? (
              <Field label="GPS Device ID">
                <Input value={form.gpsDeviceId} onChange={(e) => setField("gpsDeviceId", e.target.value)} placeholder="GPS-001" />
              </Field>
            ) : null}
          </div>
        </Section>

        <Section title={`Compliance Documents — ${STATUS_LABELS[compliance]}`}>
          <div className="space-y-3">
            {VEHICLE_DOC_CONFIG.map(({ key, label, refPlaceholder }) => {
              const d = docs[key];
              return (
                <div key={key} className="rounded-xl border bg-gray-50/50 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold">{label}</span>
                    {d.fileName ? (
                      <button onClick={() => setDoc(key, { fileName: "", expiryDate: "" })} className="text-rose-600">
                        <X className="h-4 w-4" />
                      </button>
                    ) : null}
                  </div>
                  <div className="mt-2 grid gap-2 md:grid-cols-3">
                    <Input value={d.referenceNo} onChange={(e) => setDoc(key, { referenceNo: e.target.value })} placeholder={refPlaceholder} className="h-8 text-sm" />
                    <Input type="date" value={d.expiryDate} onChange={(e) => setDoc(key, { expiryDate: e.target.value })} className="h-8 text-sm" />
                    {d.fileName ? (
                      <div className="flex items-center gap-1.5 rounded-md bg-emerald-50 px-2 text-xs text-emerald-700">
                        <FileCheck className="h-3.5 w-3.5" />
                        <span className="truncate">{d.fileName}</span>
                      </div>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setPendingKey(key);
                          fileRef.current?.click();
                        }}
                      >
                        <Upload className="mr-1 h-3.5 w-3.5" /> Upload
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Section>
      </div>
    </Dialog>
  );
}

// ============================ DRIVERS ============================

export function TenantDriversPage() {
  const { tenant } = useTenantRouteContext();
  const { data, createDriver, updateDriver } = useTenantDrivers(tenant.id);
  const drivers = data.length ? data : mockTenantDrivers;
  const { data: vehicles } = useTenantVehicles(tenant.id);
  const { data: vendors } = useTenantVendors(tenant.id);
  const activeVehicles = vehicles.filter((v) => v.isActive);
  const activeVendors = vendors.filter((v) => v.status === "active");
  const [isOpen, setIsOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<TenantDriver | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const filteredDrivers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return drivers;
    return drivers.filter((driver) => {
      const vendorName = driver.vendorId
        ? vendors.find((v) => v.id === driver.vendorId)?.name ?? driver.vendorName ?? ""
        : "Own Driver";
      return `${driver.name} ${driver.phone ?? ""} ${driver.licenseNumber ?? ""} ${driver.baseLocation ?? ""} ${vendorName}`
        .toLowerCase()
        .includes(q);
    });
  }, [drivers, search, vendors]);
  const totalPages = Math.max(1, Math.ceil(filteredDrivers.length / FLEET_PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pagedDrivers = filteredDrivers.slice((safePage - 1) * FLEET_PAGE_SIZE, safePage * FLEET_PAGE_SIZE);

  function openAdd() {
    setEditingDriver(null);
    setIsOpen(true);
  }
  function openEdit(driver: TenantDriver) {
    setEditingDriver(driver);
    setIsOpen(true);
  }
  function close() {
    setIsOpen(false);
    setEditingDriver(null);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Administration"
        title="Drivers"
        description="Manage drivers. A driver is dispatch-ready only when status is Active and all compliance documents are valid."
        action={
          <Button onClick={openAdd}>
            <Plus className="size-4" />
            Add Driver
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-4">
        <TenantSummaryCard label="Total Drivers" value={String(drivers.length)} helper="Own and vendor drivers" />
        <TenantSummaryCard label="Own Drivers" value={String(drivers.filter((d) => !d.vendorId).length)} helper="Assigned to own fleet" />
        <TenantSummaryCard label="Vendor Drivers" value={String(drivers.filter((d) => Boolean(d.vendorId)).length)} helper="Affiliated to vendors" />
        <TenantSummaryCard label="Active" value={String(drivers.filter((d) => d.isActive).length)} helper="Visible for assignment" />
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <FleetSearchBar
          value={search}
          onChange={(value) => {
            setSearch(value);
            setPage(1);
          }}
          placeholder="Search by name, phone, license, location, or vendor"
          trailing={<span className="text-sm text-gray-500">{filteredDrivers.length} driver{filteredDrivers.length === 1 ? "" : "s"}</span>}
        />
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-gray-50">
              <tr>
                <th className="p-4 text-xs font-bold uppercase tracking-wide text-gray-500">Driver</th>
                <th className="p-4 text-xs font-bold uppercase tracking-wide text-gray-500">Vendor</th>
                <th className="p-4 text-xs font-bold uppercase tracking-wide text-gray-500">License</th>
                <th className="p-4 text-xs font-bold uppercase tracking-wide text-gray-500">Status</th>
                <th className="p-4 text-xs font-bold uppercase tracking-wide text-gray-500">Compliance</th>
                <th className="p-4 text-xs font-bold uppercase tracking-wide text-gray-500">Created By</th>
                <th className="p-4 text-right text-xs font-bold uppercase tracking-wide text-gray-500">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredDrivers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-sm text-gray-500">
                    {search ? "No drivers match the search." : "No drivers yet. Click Add Driver."}
                  </td>
                </tr>
              ) : null}
              {pagedDrivers.map((driver) => {
                  const compliance = driver.complianceStatus ?? "PENDING_DOCS";
                  return (
                    <tr key={driver.id} className="transition-colors hover:bg-blue-50/40">
                      <td className="p-4 align-top">
                        <div className="flex items-center gap-3">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                            {driver.name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase()}
                          </span>
                          <div>
                            <div className="text-sm font-bold">{driver.name}</div>
                            <p className="text-xs text-gray-500">
                              {driver.phone}
                              {driver.baseLocation ? ` · ${driver.baseLocation}` : ""}
                            </p>
                          </div>
                        </div>
                        {!driver.isActive && (
                          <div className="mt-2 flex items-center gap-1.5 rounded bg-gray-100 p-1.5 text-xs text-gray-500">
                            <PowerOff className="h-3.5 w-3.5" /> Inactive — not available for dispatch
                          </div>
                        )}
                      </td>
                      <td className="p-4 align-top text-sm text-gray-700">
                        {driver.vendorId
                          ? vendors.find((v) => v.id === driver.vendorId)?.name ?? driver.vendorName ?? "Vendor"
                          : "Own Driver"}
                      </td>
                      <td className="p-4 align-top">
                        <div className="font-mono text-xs font-medium">{driver.licenseNumber}</div>
                        <div className="mt-0.5 text-xs text-gray-500">
                          {(driver.licenseClasses ?? []).join(", ") || driver.licenseType}
                          {driver.licenseExpiry ? ` · Exp ${driver.licenseExpiry}` : ""}
                        </div>
                      </td>
                      <td className="p-4 align-top">
                        <ToggleSwitch
                          active={driver.isActive}
                          onToggle={() => updateDriver(driver.id, { isActive: !driver.isActive })}
                        />
                      </td>
                      <td className="p-4 align-top space-y-1">
                        <StatusBadge status={compliance} />
                        <div className="text-xs text-gray-500">
                          {driver.complianceDocuments?.length
                            ? `${driver.complianceDocuments.length} doc${driver.complianceDocuments.length !== 1 ? "s" : ""}`
                            : "No docs"}
                        </div>
                      </td>
                      <td className="p-4 align-top">
                        <CreatedByCell record={driver} />
                      </td>
                      <td className="p-4 align-top text-right">
                        <Button size="sm" variant="outline" onClick={() => openEdit(driver)}>
                          <Edit3 className="mr-2 h-4 w-4" /> Edit
                        </Button>
                      </td>
                    </tr>
                  );
              })}
            </tbody>
          </table>
        </div>
        <PaginationFooter
          page={safePage}
          totalPages={totalPages}
          totalItems={filteredDrivers.length}
          onPageChange={setPage}
        />
      </div>

      <DriverModal
        isOpen={isOpen}
        onClose={close}
        initialDriver={editingDriver}
        activeVehicles={activeVehicles}
        activeVendors={activeVendors}
        onCreate={(input) => {
          createDriver(input);
          close();
        }}
        onUpdate={(id, input) => {
          updateDriver(id, input);
          close();
        }}
      />
    </div>
  );
}

export function TenantDriverOnboardingPage() {
  return <TenantDriversPage />;
}

type DriverModalProps = {
  isOpen: boolean;
  onClose: () => void;
  initialDriver: TenantDriver | null;
  activeVehicles: Array<{ id: string; registrationNumber: string }>;
  activeVendors: Array<{ id: string; name: string }>;
  onCreate: (input: TenantDriverInput) => void;
  onUpdate: (id: string, input: Partial<TenantDriverInput>) => void;
};

function DriverModal({
  isOpen,
  onClose,
  initialDriver,
  activeVendors,
  onCreate,
  onUpdate,
}: DriverModalProps) {
  const isEdit = !!initialDriver;
  const [form, setForm] = useState({
    name: "",
    dob: "",
    mobile: "",
    gender: "" as "MALE" | "FEMALE" | "OTHER" | "",
    baseLocation: "",
    aadhaarMasked: "",
    assignedVehicleId: "" as string,
    vendorId: "" as string,
  });
  const [docs, setDocs] = useState(() => complianceDocsToMap(undefined, [...DRIVER_DOC_KEYS]));
  const fileRef = useRef<HTMLInputElement>(null);
  const [pendingKey, setPendingKey] = useState<DriverDocKey | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    if (initialDriver) {
      setForm({
        name: initialDriver.name,
        dob: initialDriver.dob ?? "",
        mobile: initialDriver.mobile ?? initialDriver.phone ?? "",
        gender: (initialDriver.gender ?? "") as "MALE" | "FEMALE" | "OTHER" | "",
        baseLocation: initialDriver.baseLocation ?? "",
        aadhaarMasked: initialDriver.aadhaarMasked ?? "",
        assignedVehicleId: initialDriver.assignedVehicleId ?? "",
        vendorId: initialDriver.vendorId ?? "",
      });
      setDocs(complianceDocsToMap(initialDriver.complianceDocuments, [...DRIVER_DOC_KEYS]));
    } else {
      setForm({
        name: "",
        dob: "",
        mobile: "",
        gender: "",
        baseLocation: "",
        aadhaarMasked: "",
        assignedVehicleId: "",
        vendorId: "",
      });
      setDocs(complianceDocsToMap(undefined, [...DRIVER_DOC_KEYS]));
    }
  }, [isOpen, initialDriver]);

  const setField = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((c) => ({ ...c, [k]: v }));
  const setDoc = (key: DriverDocKey, patch: Partial<{ fileName: string; referenceNo: string; expiryDate: string }>) =>
    setDocs((c) => ({ ...c, [key]: { ...c[key], ...patch } }));
  const compliance = computeComplianceFromDocs(docs);

  function handleSubmit() {
    if (!form.name.trim()) return;
    // DL number/expiry come from the DL compliance document now that the
    // standalone License section is gone. DL number stays mandatory.
    const licenseNumber = docs.DL.referenceNo.trim();
    if (!licenseNumber) return;
    const input: TenantDriverInput = {
      name: form.name,
      dob: form.dob,
      photoUrl: null,
      phone: form.mobile,
      address: form.baseLocation,
      bloodGroup: "",
      licenseNumber,
      licenseType: "",
      licenseExpiry: docs.DL.expiryDate,
      medicalExpiry: docs.MedicalCertificate.expiryDate,
      drugTestStatus: "CLEAR",
      endorsements: [],
      assignedVehicleId: form.assignedVehicleId || null,
      vendorId: form.vendorId || null,
      gender: form.gender,
      baseLocation: form.baseLocation,
      aadhaarMasked: form.aadhaarMasked,
      licenseClasses: [],
      mobile: form.mobile,
      complianceStatus: compliance,
      complianceDocuments: docsToComplianceDocs(docs),
      isActive: true,
    };
    if (initialDriver) onUpdate(initialDriver.id, input);
    else onCreate(input);
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => (!open ? onClose() : undefined)}
      title={isEdit ? `Edit ${initialDriver?.name}` : "Add Driver"}
      description="Capture driver personal info and compliance documents (DL number is taken from the Driving License document)."
      widthClassName="max-w-3xl"
      footer={
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit}>{isEdit ? "Save Changes" : "Add Driver"}</Button>
        </div>
      }
    >
      <div className="space-y-6">
        <input ref={fileRef} type="file" hidden onChange={(e) => {
          const f = e.target.files?.[0];
          if (!f || !pendingKey) return;
          setDoc(pendingKey, { fileName: f.name });
          setPendingKey(null);
          if (fileRef.current) fileRef.current.value = "";
        }} />

        <Section title="Personal">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Full Name*">
              <Input
                value={form.name}
                onChange={(e) => setField("name", e.target.value)}
                disabled={isEdit}
                readOnly={isEdit}
              />
            </Field>
            <Field label="Date of Birth">
              <Input type="date" value={form.dob} onChange={(e) => setField("dob", e.target.value)} />
            </Field>
            <Field label="Mobile*">
              <Input
                value={form.mobile}
                onChange={(e) => setField("mobile", e.target.value)}
                placeholder="98xxxxxxxx"
                disabled={isEdit}
                readOnly={isEdit}
              />
            </Field>
            <Field label="Gender">
              <Select value={form.gender} onChange={(e) => setField("gender", e.target.value as "MALE" | "FEMALE" | "OTHER" | "")}>
                <option value="">Select</option>
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
              </Select>
            </Field>
            <Field label="Base Location*">
              <Input value={form.baseLocation} onChange={(e) => setField("baseLocation", e.target.value)} placeholder="Mumbai" />
            </Field>
            <Field label="Aadhaar (masked)">
              <Input value={form.aadhaarMasked} onChange={(e) => setField("aadhaarMasked", e.target.value)} placeholder="XXXX-XXXX-1234" />
            </Field>
            <Field label="Vendor">
              <Select value={form.vendorId} onChange={(e) => setField("vendorId", e.target.value)}>
                <option value="">Own Fleet (no vendor)</option>
                {activeVendors.map((v) => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </Select>
            </Field>
          </div>
        </Section>

        <Section title={`Compliance Documents — ${STATUS_LABELS[compliance]}`}>
          <div className="space-y-3">
            {DRIVER_DOC_CONFIG.map(({ key, label, refPlaceholder }) => {
              const d = docs[key];
              return (
                <div key={key} className="rounded-xl border bg-gray-50/50 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold">{label}</span>
                    {d.fileName ? (
                      <button onClick={() => setDoc(key, { fileName: "", expiryDate: "" })} className="text-rose-600">
                        <X className="h-4 w-4" />
                      </button>
                    ) : null}
                  </div>
                  <div className="mt-2 grid gap-2 md:grid-cols-3">
                    <Input value={d.referenceNo} onChange={(e) => setDoc(key, { referenceNo: e.target.value })} placeholder={refPlaceholder} className="h-8 text-sm" />
                    <Input type="date" value={d.expiryDate} onChange={(e) => setDoc(key, { expiryDate: e.target.value })} className="h-8 text-sm" />
                    {d.fileName ? (
                      <div className="flex items-center gap-1.5 rounded-md bg-emerald-50 px-2 text-xs text-emerald-700">
                        <FileCheck className="h-3.5 w-3.5" />
                        <span className="truncate">{d.fileName}</span>
                      </div>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setPendingKey(key);
                          fileRef.current?.click();
                        }}
                      >
                        <Upload className="mr-1 h-3.5 w-3.5" /> Upload
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Section>
      </div>
    </Dialog>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="space-y-4 rounded-2xl border border-border/70 bg-gradient-to-br from-white to-slate-50/60 p-5 shadow-sm">
      <p className="flex items-center gap-2 text-sm font-bold">
        <span className="h-4 w-1 rounded-full bg-primary" />
        {title}
      </p>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      {children}
    </div>
  );
}
