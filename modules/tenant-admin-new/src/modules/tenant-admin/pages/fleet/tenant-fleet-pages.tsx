import { useMemo, useState, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { PencilLine, Plus } from "lucide-react";
import { DataTable } from "@/shared/components/common/data-table";
import { PageHeader } from "@/shared/components/common/page-header";
import {
  TenantEmptyState,
  TenantFilterBar,
  TenantPanel,
  TenantSummaryCard,
} from "@/modules/tenant-admin/components/tenant-primitives";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Select } from "@/shared/components/ui/select";
import { Switch } from "@/shared/components/ui/switch";
import { Textarea } from "@/shared/components/ui/textarea";
import { useTenantCustomers } from "@/modules/tenant-admin/hooks/useTenantCustomers";
import { useTenantDrivers, useTenantVehicles } from "@/modules/tenant-admin/hooks/useTenantFleet";
import { useTenantVehicleTypes } from "@/modules/tenant-admin/hooks/useTenantMasterData";
import { useTenantRouteContext } from "@/modules/tenant-admin/hooks/useTenantRouteContext";
import { useTenantVendors } from "@/modules/tenant-admin/hooks/useTenantVendors";
import type {
  TenantDriver,
  TenantDriverInput,
  TenantVehicle,
  TenantVehicleInput,
  VehicleFuelType,
  VehicleOwnershipType,
} from "@/types/fleet";

const fuelTypeOptions: VehicleFuelType[] = ["DIESEL", "PETROL", "CNG", "LNG", "ELECTRIC"];
const commonEndorsements = ["Hazmat", "Long Haul", "PTL", "Night Shift", "Express Cargo"];

const initialVehicleForm: TenantVehicleInput = {
  registrationNumber: "",
  make: "",
  model: "",
  year: "",
  vehicleTypeId: "",
  fuelType: "DIESEL",
  ownershipType: "OWN",
  vendorId: null,
  chassisNo: "",
  insurance: { number: "", expiry: "" },
  fitness: { number: "", expiry: "" },
  puc: { number: "", expiry: "" },
  permit: { type: "", expiry: "" },
  odometer: "",
  isActive: true,
};

const initialDriverForm: TenantDriverInput = {
  name: "",
  dob: "",
  photoUrl: null,
  phone: "",
  address: "",
  bloodGroup: "",
  licenseNumber: "",
  licenseType: "",
  licenseExpiry: "",
  medicalExpiry: "",
  drugTestStatus: "CLEAR",
  endorsements: [],
  assignedVehicleId: null,
  vendorId: null,
  isActive: true,
};

export function TenantVehiclesPage() {
  const { tenant } = useTenantRouteContext();
  const navigate = useNavigate();
  const { data: vehicles, updateVehicle } = useTenantVehicles(tenant.id);
  const { data: vendors } = useTenantVendors(tenant.id);
  const { data: vehicleTypes } = useTenantVehicleTypes(tenant.id);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");

  const vendorMap = useMemo(() => new Map(vendors.map((vendor) => [vendor.id, vendor])), [vendors]);
  const vehicleTypeMap = useMemo(
    () => new Map(vehicleTypes.map((vehicleType) => [vehicleType.id, vehicleType])),
    [vehicleTypes],
  );

  const filteredVehicles = useMemo(() => {
    const query = search.trim().toLowerCase();
    return vehicles.filter((vehicle) => {
      if (!query) {
        return true;
      }
      const vendorName = vehicle.vendorId ? vendorMap.get(vehicle.vendorId)?.name ?? "" : "";
      const vehicleTypeCode = vehicleTypeMap.get(vehicle.vehicleTypeId)?.typeCode ?? "";
      return `${vehicle.registrationNumber} ${vehicle.make} ${vehicle.model} ${vendorName} ${vehicleTypeCode}`
        .toLowerCase()
        .includes(query);
    });
  }, [search, vehicles, vendorMap, vehicleTypeMap]);

  const openCreate = () => navigate(`/tenant/${tenant.id}/vehicles/new`);
  const openEdit = (vehicle: TenantVehicle) =>
    navigate(`/tenant/${tenant.id}/vehicles/${vehicle.id}/edit`);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Administration"
        title="Vehicles"
        description="Onboard own and vendor vehicles into the shared fleet master used by booking assignment."
        action={
          <Button onClick={openCreate}>
            <Plus className="size-4" />
            Add Vehicle
          </Button>
        }
      />

      {message ? <SuccessBanner message={message} /> : null}

      <div className="grid gap-4 md:grid-cols-4">
        <TenantSummaryCard label="Total Vehicles" value={String(vehicles.length)} helper="Own and vendor assets" />
        <TenantSummaryCard label="Own Fleet" value={String(vehicles.filter((vehicle) => vehicle.ownershipType === "OWN").length)} helper="Internal fleet vehicles" />
        <TenantSummaryCard label="Vendor Fleet" value={String(vehicles.filter((vehicle) => vehicle.ownershipType === "VENDOR").length)} helper="Vendor mapped vehicles" />
        <TenantSummaryCard label="Active" value={String(vehicles.filter((vehicle) => vehicle.isActive).length)} helper="Visible for assignment" />
      </div>

      <TenantFilterBar
        searchValue={search}
        searchPlaceholder="Search by registration, vehicle type, make, or vendor"
        onSearchChange={setSearch}
        trailing={<div className="text-sm text-muted-foreground">{filteredVehicles.length} vehicles shown</div>}
      />

      {filteredVehicles.length ? (
        <DataTable
          title="Vehicle List"
          description="Vehicle master records are used directly by the booking assignment queue."
          headers={["Registration Number", "Vehicle Type", "Ownership", "Vendor", "Status", "Actions"]}
          rows={filteredVehicles.map((vehicle) => [
            vehicle.registrationNumber,
            vehicleTypeMap.get(vehicle.vehicleTypeId)?.typeCode ?? "Unknown",
            <Badge key={`${vehicle.id}-ownership`} variant={vehicle.ownershipType === "OWN" ? "success" : "outline"}>
              {vehicle.ownershipType}
            </Badge>,
            vehicle.vendorId ? vendorMap.get(vehicle.vendorId)?.name ?? "Unknown vendor" : "Own Fleet",
            <div key={`${vehicle.id}-status`} className="flex items-center gap-2">
              <Switch
                checked={vehicle.isActive}
                onCheckedChange={(checked) => {
                  updateVehicle(vehicle.id, { isActive: checked });
                  setMessage(`${vehicle.registrationNumber} marked as ${checked ? "active" : "inactive"}.`);
                }}
              />
              <span className="text-xs text-muted-foreground">{vehicle.isActive ? "active" : "inactive"}</span>
            </div>,
            <Button key={`${vehicle.id}-actions`} size="sm" variant="ghost" onClick={() => openEdit(vehicle)}>
              <PencilLine className="size-4" />
              Edit
            </Button>,
          ])}
          emptyMessage="No vehicles found."
        />
      ) : (
        <TenantEmptyState
          title="No vehicles found"
          description="Add the first vehicle to start assignment from real fleet master data."
          action={<Button onClick={openCreate}>Add Vehicle</Button>}
        />
      )}

    </div>
  );
}

export function TenantVehicleOnboardingPage() {
  const { tenant } = useTenantRouteContext();
  const navigate = useNavigate();
  const { tenantVehicleId } = useParams();
  const { data: vehicles, createVehicle, updateVehicle } = useTenantVehicles(tenant.id);
  const { data: vendors } = useTenantVendors(tenant.id);
  const { data: vehicleTypes } = useTenantVehicleTypes(tenant.id);
  const editingVehicle = tenantVehicleId
    ? vehicles.find((vehicle) => vehicle.id === tenantVehicleId) ?? null
    : null;
  const activeVendors = vendors.filter((vendor) => vendor.status === "active");
  const activeVehicleTypes = vehicleTypes.filter((vehicleType) => vehicleType.status === "active");

  const initial: TenantVehicleInput = editingVehicle
    ? {
        registrationNumber: editingVehicle.registrationNumber,
        make: editingVehicle.make,
        model: editingVehicle.model,
        year: editingVehicle.year,
        vehicleTypeId: editingVehicle.vehicleTypeId,
        fuelType: editingVehicle.fuelType,
        ownershipType: editingVehicle.ownershipType,
        vendorId: editingVehicle.vendorId ?? null,
        chassisNo: editingVehicle.chassisNo ?? "",
        insurance: { ...editingVehicle.insurance },
        fitness: { ...editingVehicle.fitness },
        puc: { ...editingVehicle.puc },
        permit: { ...editingVehicle.permit },
        odometer: editingVehicle.odometer,
        isActive: editingVehicle.isActive,
      }
    : initialVehicleForm;

  const [form, setForm] = useState<TenantVehicleInput>(initial);
  const [error, setError] = useState("");
  const isEdit = Boolean(editingVehicle);

  if (tenantVehicleId && !editingVehicle) {
    return (
      <TenantEmptyState
        title="Vehicle not found"
        description="This vehicle record is not available for the current tenant."
        action={<Button asChild><Link to={`/tenant/${tenant.id}/vehicles`}>Back to vehicles</Link></Button>}
      />
    );
  }

  function submit() {
    if (!form.registrationNumber.trim()) {
      setError("Registration number is required.");
      return;
    }
    if (!form.vehicleTypeId) {
      setError("Select a vehicle type.");
      return;
    }
    if (form.ownershipType === "VENDOR" && !form.vendorId) {
      setError("Vendor is required for vendor-owned vehicles.");
      return;
    }
    try {
      if (editingVehicle) {
        updateVehicle(editingVehicle.id, form);
      } else {
        createVehicle(form);
      }
      navigate(`/tenant/${tenant.id}/vehicles`);
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "Vehicle could not be saved.");
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Administration"
        title={editingVehicle ? `Edit ${editingVehicle.registrationNumber}` : "Onboard Vehicle"}
        description="Capture vehicle ownership, compliance, and operational details."
        action={
          <Button asChild variant="outline">
            <Link to={`/tenant/${tenant.id}/vehicles`}>Back to vehicles</Link>
          </Button>
        }
      />

      {error ? <ErrorBanner message={error} /> : null}

      <Section title="Ownership">
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="Ownership Type">
            <Select
              value={form.ownershipType}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  ownershipType: event.target.value as VehicleOwnershipType,
                  vendorId: event.target.value === "VENDOR" ? current.vendorId : null,
                }))
              }
            >
              <option value="OWN">OWN</option>
              <option value="VENDOR">VENDOR</option>
            </Select>
          </Field>
          {form.ownershipType === "VENDOR" ? (
            <Field label="Vendor">
              <Select
                value={form.vendorId ?? ""}
                onChange={(event) => setForm((current) => ({ ...current, vendorId: event.target.value || null }))}
              >
                <option value="">Select vendor</option>
                {activeVendors.map((vendor) => (
                  <option key={vendor.id} value={vendor.id}>{vendor.name}</option>
                ))}
              </Select>
            </Field>
          ) : null}
          <Field label="Vehicle Type">
            <Select
              value={form.vehicleTypeId}
              onChange={(event) => setForm((current) => ({ ...current, vehicleTypeId: event.target.value }))}
            >
              <option value="">Select vehicle type</option>
              {activeVehicleTypes.map((vehicleType) => (
                <option key={vehicleType.id} value={vehicleType.id}>{vehicleType.typeCode}</option>
              ))}
            </Select>
          </Field>
        </div>
      </Section>

      <Section title="Vehicle Details">
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="Registration Number">
            <Input
              value={form.registrationNumber}
              onChange={(event) => setForm((current) => ({ ...current, registrationNumber: event.target.value }))}
              disabled={isEdit}
              readOnly={isEdit}
            />
          </Field>
          <Field label="Make"><Input value={form.make} onChange={(event) => setForm((current) => ({ ...current, make: event.target.value }))} /></Field>
          <Field label="Model"><Input value={form.model} onChange={(event) => setForm((current) => ({ ...current, model: event.target.value }))} /></Field>
          <Field label="Year"><Input value={form.year} onChange={(event) => setForm((current) => ({ ...current, year: event.target.value }))} /></Field>
          <Field label="Fuel Type">
            <Select value={form.fuelType} onChange={(event) => setForm((current) => ({ ...current, fuelType: event.target.value as VehicleFuelType }))}>
              {fuelTypeOptions.map((fuelType) => (
                <option key={fuelType} value={fuelType}>{fuelType}</option>
              ))}
            </Select>
          </Field>
          <Field label="Chassis No / VIN"><Input value={form.chassisNo ?? ""} onChange={(event) => setForm((current) => ({ ...current, chassisNo: event.target.value }))} /></Field>
        </div>
      </Section>

      <Section title="Compliance">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Field label="Insurance Number"><Input value={form.insurance.number} onChange={(event) => setForm((current) => ({ ...current, insurance: { ...current.insurance, number: event.target.value } }))} /></Field>
          <Field label="Insurance Expiry"><Input type="date" value={form.insurance.expiry} onChange={(event) => setForm((current) => ({ ...current, insurance: { ...current.insurance, expiry: event.target.value } }))} /></Field>
          <Field label="Fitness Certificate"><Input value={form.fitness.number} onChange={(event) => setForm((current) => ({ ...current, fitness: { ...current.fitness, number: event.target.value } }))} /></Field>
          <Field label="Fitness Expiry"><Input type="date" value={form.fitness.expiry} onChange={(event) => setForm((current) => ({ ...current, fitness: { ...current.fitness, expiry: event.target.value } }))} /></Field>
          <Field label="PUC Certificate"><Input value={form.puc.number} onChange={(event) => setForm((current) => ({ ...current, puc: { ...current.puc, number: event.target.value } }))} /></Field>
          <Field label="PUC Expiry"><Input type="date" value={form.puc.expiry} onChange={(event) => setForm((current) => ({ ...current, puc: { ...current.puc, expiry: event.target.value } }))} /></Field>
          <Field label="Permit Type"><Input value={form.permit.type} onChange={(event) => setForm((current) => ({ ...current, permit: { ...current.permit, type: event.target.value } }))} /></Field>
          <Field label="Permit Expiry"><Input type="date" value={form.permit.expiry} onChange={(event) => setForm((current) => ({ ...current, permit: { ...current.permit, expiry: event.target.value } }))} /></Field>
        </div>
      </Section>

      <Section title="Operations">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Odometer Reading"><Input value={form.odometer} onChange={(event) => setForm((current) => ({ ...current, odometer: event.target.value }))} /></Field>
          <Field label="Status">
            <Select value={form.isActive ? "active" : "inactive"} onChange={(event) => setForm((current) => ({ ...current, isActive: event.target.value === "active" }))}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </Select>
          </Field>
        </div>
      </Section>

      <div className="flex justify-end gap-3">
        <Button variant="outline" asChild><Link to={`/tenant/${tenant.id}/vehicles`}>Cancel</Link></Button>
        <Button onClick={submit}>{editingVehicle ? "Save Changes" : "Create Vehicle"}</Button>
      </div>
    </div>
  );
}

export function TenantDriversPage() {
  const { tenant } = useTenantRouteContext();
  const navigate = useNavigate();
  const { data: drivers, updateDriver } = useTenantDrivers(tenant.id);
  const { data: vehicles } = useTenantVehicles(tenant.id);
  const { data: vendors } = useTenantVendors(tenant.id);
  const { data: vehicleTypes } = useTenantVehicleTypes(tenant.id);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");

  const vehicleMap = useMemo(() => new Map(vehicles.map((vehicle) => [vehicle.id, vehicle])), [vehicles]);
  const vendorMap = useMemo(() => new Map(vendors.map((vendor) => [vendor.id, vendor])), [vendors]);
  const vehicleTypeMap = useMemo(
    () => new Map(vehicleTypes.map((vehicleType) => [vehicleType.id, vehicleType])),
    [vehicleTypes],
  );

  const filteredDrivers = useMemo(() => {
    const query = search.trim().toLowerCase();
    return drivers.filter((driver) => {
      if (!query) {
        return true;
      }
      const vehicle = driver.assignedVehicleId ? vehicleMap.get(driver.assignedVehicleId) : null;
      const vendorName = driver.vendorId ? vendorMap.get(driver.vendorId)?.name ?? "" : "";
      return `${driver.name} ${driver.phone} ${driver.licenseNumber} ${vehicle?.registrationNumber ?? ""} ${vendorName}`
        .toLowerCase()
        .includes(query);
    });
  }, [drivers, search, vehicleMap, vendorMap]);

  const openCreate = () => navigate(`/tenant/${tenant.id}/drivers/new`);
  const openEdit = (driver: TenantDriver) =>
    navigate(`/tenant/${tenant.id}/drivers/${driver.id}/edit`);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Administration"
        title="Drivers"
        description="Onboard own and vendor drivers into the shared driver master used by booking assignment."
        action={
          <Button onClick={openCreate}>
            <Plus className="size-4" />
            Add Driver
          </Button>
        }
      />

      {message ? <SuccessBanner message={message} /> : null}

      <div className="grid gap-4 md:grid-cols-4">
        <TenantSummaryCard label="Total Drivers" value={String(drivers.length)} helper="Own and vendor drivers" />
        <TenantSummaryCard label="Own Drivers" value={String(drivers.filter((driver) => !driver.vendorId).length)} helper="Assigned to own fleet" />
        <TenantSummaryCard label="Vendor Drivers" value={String(drivers.filter((driver) => Boolean(driver.vendorId)).length)} helper="Affiliated to vendors" />
        <TenantSummaryCard label="Active" value={String(drivers.filter((driver) => driver.isActive).length)} helper="Visible for assignment" />
      </div>

      <TenantFilterBar
        searchValue={search}
        searchPlaceholder="Search by driver, phone, license, vehicle, or vendor"
        onSearchChange={setSearch}
        trailing={<div className="text-sm text-muted-foreground">{filteredDrivers.length} drivers shown</div>}
      />

      {filteredDrivers.length ? (
        <DataTable
          title="Driver List"
          description="Driver master records are filtered dynamically during booking assignment based on vehicle ownership."
          headers={["Name", "Phone", "Assigned Vehicle", "Vendor", "Status", "Actions"]}
          rows={filteredDrivers.map((driver) => {
            const vehicle = driver.assignedVehicleId ? vehicleMap.get(driver.assignedVehicleId) : null;
            return [
              driver.name,
              driver.phone,
              vehicle ? `${vehicle.registrationNumber} (${vehicleTypeMap.get(vehicle.vehicleTypeId)?.typeCode ?? "Vehicle"})` : "Unassigned",
              driver.vendorId ? vendorMap.get(driver.vendorId)?.name ?? "Unknown vendor" : "Own Fleet",
              <div key={`${driver.id}-status`} className="flex items-center gap-2">
                <Switch
                  checked={driver.isActive}
                  onCheckedChange={(checked) => {
                    updateDriver(driver.id, { isActive: checked });
                    setMessage(`${driver.name} marked as ${checked ? "active" : "inactive"}.`);
                  }}
                />
                <span className="text-xs text-muted-foreground">{driver.isActive ? "active" : "inactive"}</span>
              </div>,
              <Button key={`${driver.id}-actions`} size="sm" variant="ghost" onClick={() => openEdit(driver)}>
                <PencilLine className="size-4" />
                Edit
              </Button>,
            ];
          })}
          emptyMessage="No drivers found."
        />
      ) : (
        <TenantEmptyState
          title="No drivers found"
          description="Add the first driver. Vehicle mapping can be done later during operations."
          action={<Button onClick={openCreate}>Add Driver</Button>}
        />
      )}

    </div>
  );
}

export function TenantDriverOnboardingPage() {
  const { tenant } = useTenantRouteContext();
  const navigate = useNavigate();
  const { tenantDriverId } = useParams();
  const { data: drivers, createDriver, updateDriver } = useTenantDrivers(tenant.id);
  const { data: vehicles } = useTenantVehicles(tenant.id);
  const { data: vendors } = useTenantVendors(tenant.id);
  const editingDriver = tenantDriverId
    ? drivers.find((driver) => driver.id === tenantDriverId) ?? null
    : null;
  const vehicleMap = useMemo(() => new Map(vehicles.map((vehicle) => [vehicle.id, vehicle])), [vehicles]);
  const vendorMap = useMemo(() => new Map(vendors.map((vendor) => [vendor.id, vendor])), [vendors]);
  const activeVehicles = vehicles.filter((vehicle) => vehicle.isActive);
  const activeVendors = vendors.filter((vendor) => vendor.status === "active");
  const endorsementOptions = Array.from(
    new Set([...commonEndorsements, ...drivers.flatMap((driver) => driver.endorsements)]),
  );

  const initial: TenantDriverInput = editingDriver
    ? {
        name: editingDriver.name,
        dob: editingDriver.dob,
        photoUrl: editingDriver.photoUrl ?? null,
        phone: editingDriver.phone,
        address: editingDriver.address,
        bloodGroup: editingDriver.bloodGroup,
        licenseNumber: editingDriver.licenseNumber,
        licenseType: editingDriver.licenseType,
        licenseExpiry: editingDriver.licenseExpiry,
        medicalExpiry: editingDriver.medicalExpiry,
        drugTestStatus: editingDriver.drugTestStatus,
        endorsements: [...editingDriver.endorsements],
        assignedVehicleId: editingDriver.assignedVehicleId ?? null,
        vendorId: editingDriver.vendorId ?? null,
        isActive: editingDriver.isActive,
      }
    : initialDriverForm;
  const [form, setForm] = useState<TenantDriverInput>(initial);
  const [error, setError] = useState("");
  const isEdit = Boolean(editingDriver);

  if (tenantDriverId && !editingDriver) {
    return (
      <TenantEmptyState
        title="Driver not found"
        description="This driver record is not available for the current tenant."
        action={<Button asChild><Link to={`/tenant/${tenant.id}/drivers`}>Back to drivers</Link></Button>}
      />
    );
  }

  function submit() {
    if (!form.name.trim()) {
      setError("Driver name is required.");
      return;
    }
    if (!form.licenseNumber.trim()) {
      setError("License number is required.");
      return;
    }
    try {
      if (editingDriver) {
        updateDriver(editingDriver.id, form);
      } else {
        createDriver(form);
      }
      navigate(`/tenant/${tenant.id}/drivers`);
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "Driver could not be saved.");
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Administration"
        title={editingDriver ? `Edit ${editingDriver.name}` : "Onboard Driver"}
        description="Capture personal, license, compliance, and assignment details."
        action={
          <Button asChild variant="outline">
            <Link to={`/tenant/${tenant.id}/drivers`}>Back to drivers</Link>
          </Button>
        }
      />

      <div className="space-y-6">
        {error ? <ErrorBanner message={error} /> : null}

          <Section title="Personal">
            <div className="grid gap-4 md:grid-cols-3">
              <Field label="Full Name">
                <Input
                  value={form.name}
                  onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                  disabled={isEdit}
                  readOnly={isEdit}
                />
              </Field>
              <Field label="DOB">
                <Input type="date" value={form.dob} onChange={(event) => setForm((current) => ({ ...current, dob: event.target.value }))} />
              </Field>
              <Field label="Photo">
                <Button type="button" variant="outline" disabled>
                  Photo Upload Placeholder
                </Button>
              </Field>
            </div>
          </Section>

          <Section title="License">
            <div className="grid gap-4 md:grid-cols-3">
              <Field label="License Number">
                <Input value={form.licenseNumber} onChange={(event) => setForm((current) => ({ ...current, licenseNumber: event.target.value }))} />
              </Field>
              <Field label="License Type">
                <Input value={form.licenseType} onChange={(event) => setForm((current) => ({ ...current, licenseType: event.target.value }))} />
              </Field>
              <Field label="License Expiry">
                <Input type="date" value={form.licenseExpiry} onChange={(event) => setForm((current) => ({ ...current, licenseExpiry: event.target.value }))} />
              </Field>
            </div>
          </Section>

          <Section title="Compliance">
            <div className="grid gap-4 md:grid-cols-3">
              <Field label="Medical Certificate Expiry">
                <Input type="date" value={form.medicalExpiry} onChange={(event) => setForm((current) => ({ ...current, medicalExpiry: event.target.value }))} />
              </Field>
              <Field label="Drug Test Status">
                <Select value={form.drugTestStatus} onChange={(event) => setForm((current) => ({ ...current, drugTestStatus: event.target.value as TenantDriverInput["drugTestStatus"] }))}>
                  <option value="CLEAR">CLEAR</option>
                  <option value="PENDING">PENDING</option>
                  <option value="FAILED">FAILED</option>
                </Select>
              </Field>
              <Field label="Blood Group">
                <Input value={form.bloodGroup} onChange={(event) => setForm((current) => ({ ...current, bloodGroup: event.target.value }))} />
              </Field>
            </div>
          </Section>

          <Section title="Contact">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Phone">
                <Input
                  value={form.phone}
                  onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
                  disabled={isEdit}
                  readOnly={isEdit}
                />
              </Field>
              <Field label="Address">
                <Textarea value={form.address} onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))} className="min-h-[96px]" />
              </Field>
            </div>
          </Section>

          <Section title="Assignment">
            <div className="grid gap-4 md:grid-cols-3">
              <Field label="Assigned Vehicle">
                <Select
                  value={form.assignedVehicleId ?? ""}
                  onChange={(event) => {
                    const nextVehicleId = event.target.value || null;
                    const vehicle = nextVehicleId ? vehicleMap.get(nextVehicleId) ?? null : null;
                    setForm((current) => ({
                      ...current,
                      assignedVehicleId: nextVehicleId,
                      vendorId:
                        current.vendorId ??
                        (vehicle?.ownershipType === "VENDOR" ? vehicle.vendorId ?? null : null),
                    }));
                  }}
                >
                  <option value="">No vehicle mapped</option>
                  {activeVehicles.map((vehicle) => (
                    <option key={vehicle.id} value={vehicle.id}>
                      {vehicle.registrationNumber} ({vehicle.ownershipType === "OWN" ? "OWN" : `Vendor: ${vendorMap.get(vehicle.vendorId ?? "")?.name ?? "Vendor"}`})
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Vendor Affiliation">
                <Select
                  value={form.vendorId ?? ""}
                  onChange={(event) => setForm((current) => ({ ...current, vendorId: event.target.value || null }))}
                >
                  <option value="">Own Driver</option>
                  {activeVendors.map((vendor) => (
                    <option key={vendor.id} value={vendor.id}>
                      {vendor.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Status">
                <Select value={form.isActive ? "active" : "inactive"} onChange={(event) => setForm((current) => ({ ...current, isActive: event.target.value === "active" }))}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </Select>
              </Field>
            </div>
          </Section>

          <Section title="License Endorsements">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {endorsementOptions.map((endorsement) => (
                <label key={endorsement} className="flex items-center gap-3 rounded-2xl border bg-background/80 px-4 py-3 text-sm">
                  <input
                    type="checkbox"
                    checked={form.endorsements.includes(endorsement)}
                    onChange={() =>
                      setForm((current) => ({
                        ...current,
                        endorsements: current.endorsements.includes(endorsement)
                          ? current.endorsements.filter((item) => item !== endorsement)
                          : [...current.endorsements, endorsement],
                      }))
                    }
                  />
                  <span>{endorsement}</span>
                </label>
              ))}
            </div>
          </Section>

        <div className="flex justify-end gap-3">
          <Button variant="outline" asChild><Link to={`/tenant/${tenant.id}/drivers`}>Cancel</Link></Button>
          <Button onClick={submit}>{editingDriver ? "Save Changes" : "Create Driver"}</Button>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="space-y-4 rounded-2xl border bg-muted/20 p-4">
      <p className="text-sm font-semibold">{title}</p>
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

function SuccessBanner({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
      {message}
    </div>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-700">
      {message}
    </div>
  );
}
