import { useMemo, useState, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import { FileDown, PencilLine, Plus } from "lucide-react";
import { z } from "zod";
import { DataTable } from "@/components/common/data-table";
import { PageHeader } from "@/components/common/page-header";
import {
  TenantEmptyState,
  TenantFilterBar,
  TenantPanel,
  TenantSummaryCard,
} from "@/components/tenant/tenant-primitives";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Tabs } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  parseVendorRateCardCsvText,
  vendorRateCardTemplateCsv,
} from "@/lib/vendor-rate-card-import";
import { useTenantRouteContext } from "@/hooks/useTenantRouteContext";
import { useTenantCustomers } from "@/hooks/useTenantCustomers";
import { useTenantVehicleTypes } from "@/hooks/useTenantMasterData";
import { useTenantVendors } from "@/hooks/useTenantVendors";
import type {
  TenantVendor,
  TenantVendorInput,
  TenantVendorRateCard,
  TenantVendorRateCardInput,
} from "@/types/vendor";

const vendorSchema = z.object({
  name: z.string().trim().min(2, "Vendor name is required."),
  legalName: z.string().optional(),
  code: z.string().optional(),
  gstin: z.string().optional(),
  gstNumber: z.string().optional(),
  pan: z.string().optional(),
  address: z.string().optional(),
  vendorType: z.string().optional(),
  contactPerson: z.string().optional(),
  phone: z.string().optional(),
  contactNumber: z.string().optional(),
  email: z.string().optional(),
  serviceableLocations: z.array(z.string()).optional(),
  supportedVehicleTypes: z.array(z.string()).optional(),
  status: z.enum(["active", "inactive"]),
});

const rateCardSchema = z
  .object({
    sourcePincode: z.string().regex(/^\d{6}$/, "Source pincode must be a 6-digit number."),
    destinationPincode: z.string().regex(/^\d{6}$/, "Destination pincode must be a 6-digit number."),
    rateType: z.enum(["PER_MT", "PER_TRIP"]),
    vehicleType: z.string().nullable(),
    rate: z.number().positive("Rate must be greater than zero."),
    status: z.enum(["active", "inactive"]),
  })
  .superRefine((value, context) => {
    if (value.rateType === "PER_TRIP" && !value.vehicleType) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Vehicle type is required for PER_TRIP.",
        path: ["vehicleType"],
      });
    }
  });

const initialVendorForm: TenantVendorInput = {
  name: "",
  legalName: "",
  code: "",
  gstin: "",
  gstNumber: "",
  pan: "",
  address: "",
  vendorType: "",
  contactPerson: "",
  phone: "",
  contactNumber: "",
  email: "",
  serviceableLocations: [],
  supportedVehicleTypes: [],
  status: "active",
};

const initialRateCardForm = {
  sourcePincode: "",
  destinationPincode: "",
  rateType: "PER_MT" as TenantVendorRateCardInput["rateType"],
  vehicleType: "",
  rate: "",
  status: "active" as TenantVendorRateCardInput["status"],
};

export function TenantVendorsPage() {
  const { tenant } = useTenantRouteContext();
  const { data, createVendor, updateTenantVendor } = useTenantVendors(tenant.id);
  const customers = useTenantCustomers(tenant.id);
  const vehicleTypes = useTenantVehicleTypes(tenant.id);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [editingVendor, setEditingVendor] = useState<TenantVendor | null>(null);
  const [form, setForm] = useState<TenantVendorInput>(initialVendorForm);

  const rows = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return data.filter((vendor) => {
      if (!normalizedSearch) {
        return true;
      }
      return `${vendor.name} ${vendor.code ?? ""} ${vendor.contactPerson ?? ""} ${vendor.contactNumber ?? ""}`
        .toLowerCase()
        .includes(normalizedSearch);
    });
  }, [data, search]);

  const locationOptions = useMemo(
    () =>
      Array.from(
        new Set(
          data
            .flatMap((vendor) => vendor.serviceableLocations ?? [])
            .concat(
              customers.data.flatMap((customer) =>
                customers
                  .listAddresses(customer.id)
                  .map((address) => `${address.city}, ${address.state}`),
              ),
            ),
        ),
      ).sort(),
    [customers, data],
  );

  function openCreate() {
    setEditingVendor(null);
    setForm(initialVendorForm);
    setError("");
    setOpen(true);
  }

  function openEdit(vendor: TenantVendor) {
    setEditingVendor(vendor);
    setForm({
      name: vendor.name,
      legalName: vendor.legalName ?? "",
      code: vendor.code ?? "",
      gstin: vendor.gstin ?? vendor.gstNumber ?? "",
      gstNumber: vendor.gstNumber ?? "",
      pan: vendor.pan ?? "",
      address: vendor.address ?? "",
      vendorType: vendor.vendorType ?? "",
      contactPerson: vendor.contactPerson ?? "",
      phone: vendor.phone ?? vendor.contactNumber ?? "",
      contactNumber: vendor.contactNumber ?? "",
      email: vendor.email ?? "",
      serviceableLocations: vendor.serviceableLocations ?? [],
      supportedVehicleTypes: vendor.supportedVehicleTypes ?? [],
      status: vendor.status,
    });
    setError("");
    setOpen(true);
  }

  function submitVendor() {
    const parsed = vendorSchema.safeParse(form);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Complete the required vendor fields.");
      return;
    }
    const normalizedPhone = parsed.data.phone?.trim() || parsed.data.contactNumber?.trim() || "";
    if (normalizedPhone && !/^\d{10}$/.test(normalizedPhone)) {
      setError("Contact number must be a 10-digit numeric value.");
      return;
    }
    if (parsed.data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(parsed.data.email.trim())) {
      setError("Enter a valid email address.");
      return;
    }

    try {
      if (editingVendor) {
        updateTenantVendor(editingVendor.id, parsed.data);
        setMessage("Vendor updated successfully.");
      } else {
        createVendor(parsed.data);
        setMessage("Vendor created successfully.");
      }
      setOpen(false);
      setError("");
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "Vendor could not be saved.");
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Tenant Admin"
        title="Vendors"
        description="Create and manage tenant-owned vendors and their rate cards directly inside this workspace."
        action={
          <Button onClick={openCreate}>
            <Plus className="size-4" />
            Add Vendor
          </Button>
        }
      />

      {message ? <div className="rounded-2xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div> : null}

      <TenantFilterBar
        searchValue={search}
        searchPlaceholder="Search tenant vendors by name, code, or contact"
        onSearchChange={setSearch}
        trailing={<div className="text-sm text-muted-foreground">{rows.length} vendors shown</div>}
      />

      {rows.length ? (
        <DataTable
          title="Tenant vendors"
          description="Vendors are now fully tenant-owned. Pricing stays under each vendor workspace."
          headers={["Vendor", "Type", "Contact", "Status", "Updated", "Actions"]}
          rows={rows.map((vendor) => [
            <div key={`${vendor.id}-vendor`} className="min-w-[180px]">
              <p className="font-semibold">{vendor.name}</p>
              <p className="mt-1 text-sm text-muted-foreground">{vendor.code || "—"}</p>
            </div>,
            vendor.vendorType ? <Badge key={`${vendor.id}-type`} variant="outline">{vendor.vendorType}</Badge> : "—",
            <div key={`${vendor.id}-contact`}>
              <p>{vendor.contactPerson || "—"}</p>
              <p className="mt-1 text-sm text-muted-foreground">{vendor.contactNumber || vendor.email || "—"}</p>
            </div>,
            <Badge key={`${vendor.id}-status`} variant={vendor.status === "active" ? "success" : "warning"}>{vendor.status}</Badge>,
            new Date(vendor.updatedAt).toLocaleDateString(),
            <div key={`${vendor.id}-actions`} className="flex flex-wrap gap-2">
              <Button asChild size="sm" variant="ghost">
                <Link to={`/tenant/${tenant.id}/vendors/${vendor.id}`}>View Rate Cards</Link>
              </Button>
              <Button size="sm" variant="ghost" onClick={() => openEdit(vendor)}>
                <PencilLine className="size-4" />
                Edit
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  updateTenantVendor(vendor.id, {
                    status: vendor.status === "active" ? "inactive" : "active",
                  });
                  setMessage(`${vendor.name} marked as ${vendor.status === "active" ? "inactive" : "active"}.`);
                }}
              >
                {vendor.status === "active" ? "Deactivate" : "Activate"}
              </Button>
            </div>,
          ])}
          emptyMessage="No tenant vendors found."
        />
      ) : (
        <TenantEmptyState
          title="No tenant vendors found"
          description="Create the first vendor to start managing rate cards."
          action={<Button onClick={openCreate}>Add Vendor</Button>}
        />
      )}

      <Dialog
        open={open}
        onOpenChange={setOpen}
        title={editingVendor ? "Edit Vendor" : "Add Vendor"}
        description="Vendor onboarding now includes business and operational mapping for fleet and booking usage."
        widthClassName="max-w-5xl"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={submitVendor}>{editingVendor ? "Save Changes" : "Create Vendor"}</Button>
          </div>
        }
      >
        <div className="space-y-6">
          {error ? <div className="rounded-2xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

          <div className="rounded-2xl border bg-muted/20 p-4">
            <p className="text-sm font-semibold">Basic Details</p>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <Field label="Vendor Name"><Input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} /></Field>
              <Field label="Vendor Code" helper="Auto-generated if left blank."><Input value={form.code ?? ""} onChange={(event) => setForm((current) => ({ ...current, code: event.target.value }))} /></Field>
              <Field label="Legal Name"><Input value={form.legalName ?? ""} onChange={(event) => setForm((current) => ({ ...current, legalName: event.target.value }))} /></Field>
              <Field label="Vendor Type"><Input value={form.vendorType ?? ""} onChange={(event) => setForm((current) => ({ ...current, vendorType: event.target.value }))} /></Field>
              <Field label="Contact Person"><Input value={form.contactPerson ?? ""} onChange={(event) => setForm((current) => ({ ...current, contactPerson: event.target.value }))} /></Field>
              <Field label="Phone"><Input value={form.phone ?? form.contactNumber ?? ""} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value, contactNumber: event.target.value }))} /></Field>
              <Field label="Email"><Input value={form.email ?? ""} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} /></Field>
              <Field label="Status">
                <Select value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as TenantVendorInput["status"] }))}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </Select>
              </Field>
            </div>
          </div>

          <div className="rounded-2xl border bg-muted/20 p-4">
            <p className="text-sm font-semibold">Business Info</p>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <Field label="GSTIN"><Input value={form.gstin ?? form.gstNumber ?? ""} onChange={(event) => setForm((current) => ({ ...current, gstin: event.target.value, gstNumber: event.target.value }))} /></Field>
              <Field label="PAN"><Input value={form.pan ?? ""} onChange={(event) => setForm((current) => ({ ...current, pan: event.target.value }))} /></Field>
              <div className="md:col-span-2">
                <Field label="Address"><Textarea value={form.address ?? ""} onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))} className="min-h-[100px]" /></Field>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border bg-muted/20 p-4">
            <p className="text-sm font-semibold">Operational</p>
            <div className="mt-4 grid gap-6 xl:grid-cols-2">
              <div className="space-y-3">
                <p className="text-sm font-medium">Serviceable Locations</p>
                <div className="grid gap-3 md:grid-cols-2">
                  {locationOptions.map((location) => (
                    <label key={location} className="flex items-center gap-3 rounded-2xl border bg-background/80 px-4 py-3 text-sm">
                      <input
                        type="checkbox"
                        checked={form.serviceableLocations?.includes(location) ?? false}
                        onChange={() =>
                          setForm((current) => ({
                            ...current,
                            serviceableLocations: current.serviceableLocations?.includes(location)
                              ? current.serviceableLocations.filter((item) => item !== location)
                              : [...(current.serviceableLocations ?? []), location],
                          }))
                        }
                      />
                      <span>{location}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="space-y-3">
                <p className="text-sm font-medium">Supported Vehicle Types</p>
                <div className="grid gap-3 md:grid-cols-2">
                  {vehicleTypes.data
                    .filter((vehicleType) => vehicleType.status === "active")
                    .map((vehicleType) => (
                      <label key={vehicleType.id} className="flex items-center gap-3 rounded-2xl border bg-background/80 px-4 py-3 text-sm">
                        <input
                          type="checkbox"
                          checked={form.supportedVehicleTypes?.includes(vehicleType.id) ?? false}
                          onChange={() =>
                            setForm((current) => ({
                              ...current,
                              supportedVehicleTypes: current.supportedVehicleTypes?.includes(vehicleType.id)
                                ? current.supportedVehicleTypes.filter((item) => item !== vehicleType.id)
                                : [...(current.supportedVehicleTypes ?? []), vehicleType.id],
                            }))
                          }
                        />
                        <span>{vehicleType.typeCode}</span>
                      </label>
                    ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

export function TenantVendorDetailPage() {
  const { tenant } = useTenantRouteContext();
  const { tenantVendorId = "" } = useParams();
  const {
    getTenantVendorById,
    listRateCards,
    createRateCard,
    updateRateCard,
  } = useTenantVendors(tenant.id);
  const tenantVendor = getTenantVendorById(tenantVendorId);
  const [activeTab, setActiveTab] = useState("Basic Info");
  const [message, setMessage] = useState("");

  if (!tenantVendor) {
    return (
      <TenantEmptyState
        title="Vendor not found"
        description="This tenant vendor record is not available for the current tenant."
        action={<Button asChild><Link to={`/tenant/${tenant.id}/vendors`}>Back to vendors</Link></Button>}
      />
    );
  }

  const rateCards = listRateCards(tenantVendor.id);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Tenant Admin"
        title={tenantVendor.name}
        description="Manage tenant-owned vendor details and rate cards."
        action={<Button asChild variant="outline"><Link to={`/tenant/${tenant.id}/vendors`}>Back to vendors</Link></Button>}
      />

      {message ? <div className="rounded-2xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div> : null}

      <div className="grid gap-4 md:grid-cols-3">
        <TenantSummaryCard label="Status" value={tenantVendor.status} helper="Tenant-owned vendor state" />
        <TenantSummaryCard label="Rate cards" value={String(rateCards.length)} helper="Tenant-scoped pricing records" />
        <TenantSummaryCard label="Last updated" value={new Date(tenantVendor.updatedAt).toLocaleDateString()} helper="Latest vendor master change" />
      </div>

      <TenantPanel
        title="Vendor workspace"
        description="Basic info and pricing are maintained at tenant level."
        action={<Tabs tabs={["Basic Info", "Rate Cards"]} active={activeTab} onChange={setActiveTab} />}
      >
        {activeTab === "Basic Info" ? (
          <div className="grid gap-3">
            <InfoRow label="Vendor name" value={tenantVendor.name} />
            <InfoRow label="Legal name" value={tenantVendor.legalName || "—"} />
            <InfoRow label="Code" value={tenantVendor.code || "—"} />
            <InfoRow label="GST" value={tenantVendor.gstNumber || "—"} />
            <InfoRow label="Vendor type" value={tenantVendor.vendorType || "—"} />
            <InfoRow label="Contact person" value={tenantVendor.contactPerson || "—"} />
            <InfoRow label="Contact number" value={tenantVendor.contactNumber || "—"} />
            <InfoRow label="Email" value={tenantVendor.email || "—"} />
            <InfoRow label="Created" value={new Date(tenantVendor.createdAt).toLocaleString()} />
            <InfoRow label="Updated" value={new Date(tenantVendor.updatedAt).toLocaleString()} />
          </div>
        ) : null}
        {activeTab === "Rate Cards" ? (
          <TenantVendorRateCardsSection
            rateCards={rateCards}
            onCreate={(input) => {
              createRateCard(tenantVendor.id, input);
              setMessage("Vendor rate card saved successfully.");
            }}
            onUpdate={(rateCardId, updates) => {
              updateRateCard(rateCardId, updates);
              setMessage("Vendor rate card updated successfully.");
            }}
          />
        ) : null}
      </TenantPanel>
    </div>
  );
}

function TenantVendorRateCardsSection({
  rateCards,
  onCreate,
  onUpdate,
}: {
  rateCards: TenantVendorRateCard[];
  onCreate: (input: TenantVendorRateCardInput) => void;
  onUpdate: (rateCardId: string, updates: Partial<TenantVendorRateCardInput>) => void;
}) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [editingRateCard, setEditingRateCard] = useState<TenantVendorRateCard | null>(null);
  const [error, setError] = useState("");
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState(vendorRateCardTemplateCsv);
  const [importSummary, setImportSummary] = useState<ReturnType<typeof parseVendorRateCardCsvText> | null>(null);
  const [form, setForm] = useState(initialRateCardForm);

  const filteredRateCards = rateCards.filter((rateCard) => {
    const normalizedSearch = search.trim().toLowerCase();
    if (
      normalizedSearch &&
      !`${rateCard.sourcePincode} ${rateCard.destinationPincode} ${rateCard.vehicleType ?? ""}`.toLowerCase().includes(normalizedSearch)
    ) {
      return false;
    }
    if (typeFilter !== "all" && rateCard.rateType !== typeFilter) {
      return false;
    }
    return true;
  });

  function openCreate() {
    setEditingRateCard(null);
    setForm(initialRateCardForm);
    setError("");
    setOpen(true);
  }

  function openEdit(rateCard: TenantVendorRateCard) {
    setEditingRateCard(rateCard);
    setForm({
      sourcePincode: rateCard.sourcePincode,
      destinationPincode: rateCard.destinationPincode,
      rateType: rateCard.rateType,
      vehicleType: rateCard.vehicleType ?? "",
      rate: String(rateCard.rate),
      status: rateCard.status,
    });
    setError("");
    setOpen(true);
  }

  function submit() {
    const parsed = rateCardSchema.safeParse({
      sourcePincode: form.sourcePincode,
      destinationPincode: form.destinationPincode,
      rateType: form.rateType,
      vehicleType: form.vehicleType.trim() || null,
      rate: Number(form.rate),
      status: form.status,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Fix the rate card form errors.");
      return;
    }
    if (editingRateCard) {
      onUpdate(editingRateCard.id, parsed.data);
    } else {
      onCreate(parsed.data);
    }
    setOpen(false);
  }

  function downloadTemplate() {
    const blob = new Blob([vendorRateCardTemplateCsv], { type: "text/csv;charset=utf-8" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "vendor-rate-card-template.csv";
    link.click();
    window.URL.revokeObjectURL(url);
  }

  function runImportPreview() {
    setImportSummary(parseVendorRateCardCsvText(importText));
  }

  function applyValidRows() {
    if (!importSummary?.validRows.length) return;
    importSummary.validRows.forEach((row) => onCreate(row));
    setImportOpen(false);
    setImportSummary(null);
  }

  return (
    <div className="space-y-5">
      <TenantFilterBar
        searchValue={search}
        searchPlaceholder="Search by source, destination, or vehicle type"
        onSearchChange={setSearch}
        filters={
          <Select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
            <option value="all">All rate types</option>
            <option value="PER_MT">PER_MT</option>
            <option value="PER_TRIP">PER_TRIP</option>
          </Select>
        }
        trailing={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setImportOpen(true)}>
              <FileDown className="size-4" />
              Import
            </Button>
            <Button onClick={openCreate}>Add Rate Card</Button>
          </div>
        }
      />
      <DataTable
        title="Vendor rate cards"
        description="Tenant-specific vendor pricing based on source, destination, and rate type."
        headers={["Source", "Destination", "Rate type", "Vehicle type", "Rate", "Status", "Updated", "Actions"]}
        rows={filteredRateCards.map((rateCard) => [
          rateCard.sourcePincode,
          rateCard.destinationPincode,
          <Badge key={`${rateCard.id}-type`} variant="outline">{rateCard.rateType}</Badge>,
          rateCard.vehicleType || "—",
          rateCard.rate.toLocaleString(),
          <Badge key={`${rateCard.id}-status`} variant={rateCard.status === "active" ? "success" : "warning"}>{rateCard.status}</Badge>,
          new Date(rateCard.updatedAt).toLocaleDateString(),
          <div key={`${rateCard.id}-actions`} className="flex flex-wrap gap-2">
            <Button size="sm" variant="ghost" onClick={() => openEdit(rateCard)}>Edit</Button>
            <Button size="sm" variant="outline" onClick={() => onUpdate(rateCard.id, { status: rateCard.status === "active" ? "inactive" : "active" })}>
              {rateCard.status === "active" ? "Deactivate" : "Activate"}
            </Button>
          </div>,
        ])}
        emptyMessage="No rate cards found for this vendor."
      />

      <Dialog
        open={open}
        onOpenChange={setOpen}
        title={editingRateCard ? "Edit Rate Card" : "Add Rate Card"}
        description="PER_TRIP means total trip charge and requires vehicle type. PER_MT means charge per metric ton."
        footer={<div className="flex justify-end gap-3"><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={submit}>{editingRateCard ? "Save Changes" : "Save Rate Card"}</Button></div>}
      >
        <div className="grid gap-4 md:grid-cols-2">
          {error ? <div className="md:col-span-2 rounded-2xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}
          <Field label="Source pincode"><Input value={form.sourcePincode} onChange={(event) => setForm((current) => ({ ...current, sourcePincode: event.target.value }))} /></Field>
          <Field label="Destination pincode"><Input value={form.destinationPincode} onChange={(event) => setForm((current) => ({ ...current, destinationPincode: event.target.value }))} /></Field>
          <Field label="Rate type" helper={form.rateType === "PER_TRIP" ? "Full trip charge." : "Charge per metric ton."}>
            <Select value={form.rateType} onChange={(event) => setForm((current) => ({ ...current, rateType: event.target.value as TenantVendorRateCardInput["rateType"] }))}>
              <option value="PER_MT">PER_MT</option>
              <option value="PER_TRIP">PER_TRIP</option>
            </Select>
          </Field>
          <Field label="Vehicle type" helper={form.rateType === "PER_TRIP" ? "Required for PER_TRIP." : "Optional for PER_MT."}>
            <Input value={form.vehicleType} onChange={(event) => setForm((current) => ({ ...current, vehicleType: event.target.value }))} />
          </Field>
          <Field label="Rate"><Input value={form.rate} onChange={(event) => setForm((current) => ({ ...current, rate: event.target.value }))} /></Field>
          <Field label="Status">
            <Select value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as TenantVendorRateCardInput["status"] }))}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </Select>
          </Field>
        </div>
      </Dialog>

      <Dialog
        open={importOpen}
        onOpenChange={setImportOpen}
        title="Import Vendor Rate Cards"
        description="Use the CSV template now. The parser is prepared so real file parsing can be connected later."
        widthClassName="max-w-4xl"
        footer={
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Button variant="outline" onClick={downloadTemplate}>Download Template</Button>
            <div className="flex gap-3">
              <Button variant="outline" onClick={runImportPreview}>Validate</Button>
              <Button onClick={applyValidRows} disabled={!importSummary?.validRows.length}>Import Valid Rows</Button>
            </div>
          </div>
        }
      >
        <div className="grid gap-4">
          <Field label="CSV input"><Textarea value={importText} onChange={(event) => setImportText(event.target.value)} className="min-h-[220px]" /></Field>
          {importSummary ? (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-emerald-300 bg-emerald-50 p-4">
                <p className="font-medium text-emerald-900">Valid rows</p>
                <p className="mt-1 text-sm text-emerald-800">{importSummary.validRows.length} rows ready to import.</p>
              </div>
              <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4">
                <p className="font-medium text-amber-900">Invalid rows</p>
                <p className="mt-1 text-sm text-amber-800">{importSummary.invalidRows.length} rows need correction.</p>
              </div>
            </div>
          ) : null}
        </div>
      </Dialog>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-border/70 bg-background/80 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value}</span>
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
      <label className="text-sm font-medium">{label}</label>
      {children}
      {helper ? <p className="text-xs text-muted-foreground">{helper}</p> : null}
    </div>
  );
}
