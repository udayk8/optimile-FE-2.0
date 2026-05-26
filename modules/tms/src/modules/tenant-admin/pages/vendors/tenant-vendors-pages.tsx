import { useMemo, useState, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import { FileDown, PencilLine, Plus } from "lucide-react";
import { z } from "zod";
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
import { Tabs } from "@/shared/components/ui/tabs";
import { Textarea } from "@/shared/components/ui/textarea";
import {
  downloadVendorRateCardTemplateWorkbook,
  parseVendorRateCardFile,
} from "@/shared/lib/vendor-rate-card-import";
import { useTenantRouteContext } from "@tms-booking/modules/tenant-admin/hooks/useTenantRouteContext";
import { useTenantCustomers } from "@tms-booking/modules/tenant-admin/hooks/useTenantCustomers";
import { useTenantVehicleTypes } from "@tms-booking/modules/tenant-admin/hooks/useTenantMasterData";
import { useTenantVendors } from "@tms-booking/modules/tenant-admin/hooks/useTenantVendors";
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
    contractName: z.string().optional(),
    contractCode: z.string().optional(),
    effectiveFromDate: z.string().optional(),
    effectiveToDate: z.string().optional(),
    lanes: z.string().trim().min(1, "Lane is required."),
    fromCity: z.string().optional(),
    toCity: z.string().optional(),
    fromLocation: z.string().optional(),
    toLocation: z.string().optional(),
    sourcePincode: z.string().regex(/^\d{6}$/, "Source pincode must be a 6-digit number."),
    destinationPincode: z.string().regex(/^\d{6}$/, "Destination pincode must be a 6-digit number."),
    rateType: z.enum(["PER_MT", "PER_TRIP", "PER_KM"]),
    vehicleType: z.string().nullable(),
    buyingRate: z.number().positive("Buying rate must be greater than zero."),
    underloadRate: z.number().positive("Underload rate must be greater than zero."),
    overloadRate: z.number().nullable(),
    tat: z.string().optional(),
    rate: z.number().positive("Rate must be greater than zero."),
    status: z.enum(["active", "inactive"]),
    remarks: z.string().optional(),
  })
  .superRefine((value, context) => {
    if ((value.rateType === "PER_TRIP" || value.rateType === "PER_KM") && !value.vehicleType) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Vehicle type is required for PER_TRIP and PER_KM.",
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
  contractName: "",
  contractCode: "",
  effectiveFromDate: "",
  effectiveToDate: "",
  lanes: "",
  fromCity: "",
  toCity: "",
  fromLocation: "",
  toLocation: "",
  sourcePincode: "",
  destinationPincode: "",
  rateType: "PER_MT" as TenantVendorRateCardInput["rateType"],
  vehicleType: "",
  buyingRate: "",
  underloadRate: "",
  overloadRate: "",
  tat: "",
  rate: "",
  status: "active" as TenantVendorRateCardInput["status"],
  remarks: "",
};

export function TenantVendorsPage() {
  const { tenant } = useTenantRouteContext();
  const { data, createVendor, updateTenantVendor, createRateCard } = useTenantVendors(tenant.id);
  const customers = useTenantCustomers(tenant.id);
  const vehicleTypes = useTenantVehicleTypes(tenant.id);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [rateCardError, setRateCardError] = useState("");
  const [editingVendor, setEditingVendor] = useState<TenantVendor | null>(null);
  const [form, setForm] = useState<TenantVendorInput>(initialVendorForm);
  const [addRateCardOnCreate, setAddRateCardOnCreate] = useState(false);
  const [rateCardMode, setRateCardMode] = useState<"Add Manually" | "Bulk Upload">("Bulk Upload");
  const [rateCardForm, setRateCardForm] = useState(initialRateCardForm);
  const [rateCardImportSummary, setRateCardImportSummary] =
    useState<Awaited<ReturnType<typeof parseVendorRateCardFile>> | null>(null);
  const [rateCardImportError, setRateCardImportError] = useState("");
  const [rateCardImporting, setRateCardImporting] = useState(false);
  const [rateCardUploadedFileName, setRateCardUploadedFileName] = useState("");

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
    setRateCardError("");
    setAddRateCardOnCreate(false);
    setRateCardMode("Bulk Upload");
    setRateCardForm(initialRateCardForm);
    setRateCardImportSummary(null);
    setRateCardImportError("");
    setRateCardImporting(false);
    setRateCardUploadedFileName("");
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
    setRateCardError("");
    setAddRateCardOnCreate(false);
    setRateCardMode("Bulk Upload");
    setRateCardForm(initialRateCardForm);
    setRateCardImportSummary(null);
    setRateCardImportError("");
    setRateCardImporting(false);
    setRateCardUploadedFileName("");
    setOpen(true);
  }

  function buildManualRateCardPayload() {
    return rateCardSchema.safeParse({
      contractName: rateCardForm.contractName.trim() || undefined,
      contractCode: rateCardForm.contractCode.trim() || undefined,
      effectiveFromDate: rateCardForm.effectiveFromDate || undefined,
      effectiveToDate: rateCardForm.effectiveToDate || undefined,
      lanes: rateCardForm.lanes.trim(),
      fromCity: rateCardForm.fromCity.trim() || undefined,
      toCity: rateCardForm.toCity.trim() || undefined,
      fromLocation: rateCardForm.fromLocation.trim() || undefined,
      toLocation: rateCardForm.toLocation.trim() || undefined,
      sourcePincode: rateCardForm.sourcePincode,
      destinationPincode: rateCardForm.destinationPincode,
      rateType: rateCardForm.rateType,
      vehicleType: rateCardForm.vehicleType.trim() || null,
      buyingRate: Number(rateCardForm.buyingRate),
      underloadRate: Number(rateCardForm.underloadRate || rateCardForm.buyingRate),
      overloadRate: rateCardForm.overloadRate.trim() ? Number(rateCardForm.overloadRate) : null,
      tat: rateCardForm.tat.trim() || undefined,
      rate: Number(rateCardForm.rate || rateCardForm.buyingRate),
      status: rateCardForm.status,
      remarks: rateCardForm.remarks.trim() || undefined,
    });
  }

  function hasManualRateCardDraft() {
    return [
      rateCardForm.contractName,
      rateCardForm.contractCode,
      rateCardForm.effectiveFromDate,
      rateCardForm.effectiveToDate,
      rateCardForm.lanes,
      rateCardForm.fromCity,
      rateCardForm.toCity,
      rateCardForm.fromLocation,
      rateCardForm.toLocation,
      rateCardForm.sourcePincode,
      rateCardForm.destinationPincode,
      rateCardForm.vehicleType,
      rateCardForm.buyingRate,
      rateCardForm.underloadRate,
      rateCardForm.overloadRate,
      rateCardForm.tat,
      rateCardForm.remarks,
    ].some((value) => value.trim().length > 0);
  }

  async function handleRateCardUpload(file: File | null) {
    if (!file) {
      return;
    }
    setRateCardImporting(true);
    setRateCardImportError("");
    try {
      const summary = await parseVendorRateCardFile(file);
      setRateCardImportSummary(summary);
      setRateCardUploadedFileName(file.name);
    } catch (uploadError) {
      setRateCardImportSummary(null);
      setRateCardImportError(
        uploadError instanceof Error ? uploadError.message : "Vendor contract file could not be parsed.",
      );
    } finally {
      setRateCardImporting(false);
    }
  }

  function collectVendorRateCards() {
    const importedRateCards = rateCardMode === "Bulk Upload" ? rateCardImportSummary?.validRows ?? [] : [];
    const hasManualDraft = rateCardMode === "Add Manually" ? hasManualRateCardDraft() : false;
    let manualRateCard: TenantVendorRateCardInput | null = null;

    if (rateCardMode === "Add Manually" && hasManualDraft) {
      const parsedRateCard = buildManualRateCardPayload();
      if (!parsedRateCard.success) {
        setRateCardError(parsedRateCard.error.issues[0]?.message ?? "Fix the vendor contract fields.");
        return null;
      }
      manualRateCard = parsedRateCard.data;
    }
    if (rateCardMode === "Add Manually" && !manualRateCard) {
      setRateCardError("Add at least one vendor contract manually.");
      return null;
    }
    if (rateCardMode === "Bulk Upload" && !importedRateCards.length) {
      setRateCardError("Upload at least one valid vendor contract row.");
      return null;
    }
    if (!importedRateCards.length && !manualRateCard) {
      setRateCardError("Add at least one vendor contract manually or import valid contract rows.");
      return null;
    }

    return {
      importedRateCards,
      manualRateCard,
    };
  }

  function applyVendorRateCards(
    tenantVendorId: string,
    rateCards:
      | {
          importedRateCards: TenantVendorRateCardInput[];
          manualRateCard: TenantVendorRateCardInput | null;
        }
      | null,
  ) {
    if (!rateCards) {
      return false;
    }

    rateCards.importedRateCards.forEach((row) => {
      createRateCard(tenantVendorId, row);
    });
    if (rateCards.manualRateCard) {
      createRateCard(tenantVendorId, rateCards.manualRateCard);
    }
    return true;
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
        if (addRateCardOnCreate) {
          const collectedRateCards = collectVendorRateCards();
          const rateCardsApplied = applyVendorRateCards(editingVendor.id, collectedRateCards);
          if (!rateCardsApplied) {
            return;
          }
          setMessage("Vendor updated and vendor contract added successfully.");
        } else {
          setMessage("Vendor updated successfully.");
        }
      } else {
        const collectedRateCards = addRateCardOnCreate ? collectVendorRateCards() : null;
        if (addRateCardOnCreate && !collectedRateCards) {
          return;
        }
        const createdVendor = createVendor(parsed.data);
        if (addRateCardOnCreate) {
          const rateCardsApplied = applyVendorRateCards(createdVendor.id, collectedRateCards);
          if (!rateCardsApplied) {
            return;
          }
          setMessage("Vendor and vendor contract created successfully.");
        } else {
          setMessage("Vendor created successfully.");
        }
      }
      setOpen(false);
      setError("");
      setRateCardError("");
      setRateCardImportError("");
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
              <p className="mt-1 text-sm text-muted-foreground">{vendor.code || "â€”"}</p>
            </div>,
            vendor.vendorType ? <Badge key={`${vendor.id}-type`} variant="outline">{vendor.vendorType}</Badge> : "â€”",
            <div key={`${vendor.id}-contact`}>
              <p>{vendor.contactPerson || "â€”"}</p>
              <p className="mt-1 text-sm text-muted-foreground">{vendor.contactNumber || vendor.email || "â€”"}</p>
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
          {rateCardError ? <div className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">{rateCardError}</div> : null}
          {rateCardImportError ? <div className="rounded-2xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-700">{rateCardImportError}</div> : null}

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

          <div className="rounded-2xl border bg-muted/20 p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold">Vendor Contract / Rate Card</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Use the same contract upload and lane setup pattern as customer rate cards so buying-side pricing is ready for assignment and finance workflows.
                  </p>
                </div>
                <Switch checked={addRateCardOnCreate} onCheckedChange={setAddRateCardOnCreate} />
              </div>

              {addRateCardOnCreate ? (
                <div className="mt-4 space-y-4">
                  <Tabs
                    tabs={["Bulk Upload", "Add Manually"]}
                    active={rateCardMode}
                    onChange={(value) => {
                      setRateCardMode(value as "Add Manually" | "Bulk Upload");
                      setRateCardError("");
                      setRateCardImportError("");
                    }}
                  />
                  {rateCardMode === "Bulk Upload" ? (
                    <div className="rounded-2xl border bg-background/80 p-4">
                      <p className="text-sm font-medium">Vendor Contract Upload</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Download the vendor contract workbook and upload `.xlsx` or `.csv` rows with lane, source, destination, and buying-rate details.
                      </p>
                      <div className="mt-4 flex flex-wrap gap-3">
                        <Button variant="outline" onClick={() => downloadVendorRateCardTemplateWorkbook()}>
                          <FileDown className="size-4" />
                          Download Template
                        </Button>
                        <label className="inline-flex cursor-pointer items-center rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
                          Upload Vendor Contract
                          <input
                            type="file"
                            accept=".xlsx,.csv"
                            className="hidden"
                            onChange={(event) => void handleRateCardUpload(event.target.files?.[0] ?? null)}
                          />
                        </label>
                      </div>
                      <p className="mt-3 text-xs text-muted-foreground">
                        Accepted formats: `.xlsx`, `.csv`. Template columns are validated strictly before contracts are saved with this vendor.
                      </p>
                      {rateCardImporting ? <p className="mt-3 text-sm text-muted-foreground">Validating uploaded file...</p> : null}
                      {rateCardUploadedFileName ? <p className="mt-3 text-sm font-medium">{rateCardUploadedFileName}</p> : null}
                      {rateCardImportSummary ? (
                        <div className="mt-4 grid gap-4 md:grid-cols-2">
                          <div className="rounded-2xl border border-emerald-300 bg-emerald-50 p-4">
                            <p className="font-medium text-emerald-900">Valid rows</p>
                            <p className="mt-1 text-sm text-emerald-800">
                              {rateCardImportSummary.validRows.length} rows ready to save with this vendor.
                            </p>
                          </div>
                          <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4">
                            <p className="font-medium text-amber-900">Invalid rows</p>
                            <p className="mt-1 text-sm text-amber-800">
                              {rateCardImportSummary.invalidRows.length} rows need correction.
                            </p>
                          </div>
                          {rateCardImportSummary.invalidRows.length ? (
                            <div className="md:col-span-2 rounded-2xl border border-amber-300 bg-amber-50 p-4">
                              <p className="font-medium text-amber-900">Validation errors</p>
                              <div className="mt-3 space-y-3">
                                {rateCardImportSummary.invalidRows.slice(0, 5).map((row) => (
                                  <div
                                    key={`vendor-create-import-${row.rowNumber}`}
                                    className="rounded-xl border border-amber-200 bg-white/70 px-3 py-3 text-sm text-amber-900"
                                  >
                                    <p className="font-medium">Row {row.rowNumber}</p>
                                    <p className="mt-1">{row.errors.join(" ")}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Contract name"><Input value={rateCardForm.contractName} onChange={(event) => setRateCardForm((current) => ({ ...current, contractName: event.target.value }))} /></Field>
                  <Field label="Contract code"><Input value={rateCardForm.contractCode} onChange={(event) => setRateCardForm((current) => ({ ...current, contractCode: event.target.value }))} /></Field>
                  <Field label="Effective from"><Input type="date" value={rateCardForm.effectiveFromDate} onChange={(event) => setRateCardForm((current) => ({ ...current, effectiveFromDate: event.target.value }))} /></Field>
                  <Field label="Effective to"><Input type="date" value={rateCardForm.effectiveToDate} onChange={(event) => setRateCardForm((current) => ({ ...current, effectiveToDate: event.target.value }))} /></Field>
                  <Field label="Lane"><Input value={rateCardForm.lanes} onChange={(event) => setRateCardForm((current) => ({ ...current, lanes: event.target.value }))} placeholder="DEL-BOM" /></Field>
                  <Field label="Origin city"><Input value={rateCardForm.fromCity} onChange={(event) => setRateCardForm((current) => ({ ...current, fromCity: event.target.value }))} /></Field>
                  <Field label="Destination city"><Input value={rateCardForm.toCity} onChange={(event) => setRateCardForm((current) => ({ ...current, toCity: event.target.value }))} /></Field>
                  <Field label="Origin address / location"><Input value={rateCardForm.fromLocation} onChange={(event) => setRateCardForm((current) => ({ ...current, fromLocation: event.target.value }))} /></Field>
                  <Field label="Destination address / location"><Input value={rateCardForm.toLocation} onChange={(event) => setRateCardForm((current) => ({ ...current, toLocation: event.target.value }))} /></Field>
                  <Field label="Source pincode"><Input value={rateCardForm.sourcePincode} onChange={(event) => setRateCardForm((current) => ({ ...current, sourcePincode: event.target.value }))} /></Field>
                  <Field label="Destination pincode"><Input value={rateCardForm.destinationPincode} onChange={(event) => setRateCardForm((current) => ({ ...current, destinationPincode: event.target.value }))} /></Field>
                  <Field label="Rate type">
                    <Select value={rateCardForm.rateType} onChange={(event) => setRateCardForm((current) => ({ ...current, rateType: event.target.value as TenantVendorRateCardInput["rateType"] }))}>
                      <option value="PER_MT">PER_MT</option>
                      <option value="PER_TRIP">PER_TRIP</option>
                      <option value="PER_KM">PER_KM</option>
                    </Select>
                  </Field>
                  <Field label="Vehicle type">
                    <Input value={rateCardForm.vehicleType} onChange={(event) => setRateCardForm((current) => ({ ...current, vehicleType: event.target.value }))} />
                  </Field>
                  <Field label="Buying rate">
                    <Input value={rateCardForm.buyingRate} onChange={(event) => setRateCardForm((current) => ({ ...current, buyingRate: event.target.value, rate: event.target.value }))} />
                  </Field>
                  <Field label="Underload rate">
                    <Input value={rateCardForm.underloadRate} onChange={(event) => setRateCardForm((current) => ({ ...current, underloadRate: event.target.value }))} />
                  </Field>
                  <Field label="Overload rate">
                    <Input value={rateCardForm.overloadRate} onChange={(event) => setRateCardForm((current) => ({ ...current, overloadRate: event.target.value }))} />
                  </Field>
                  <Field label="TAT">
                    <Input value={rateCardForm.tat} onChange={(event) => setRateCardForm((current) => ({ ...current, tat: event.target.value }))} />
                  </Field>
                  <Field label="Status">
                    <Select value={rateCardForm.status} onChange={(event) => setRateCardForm((current) => ({ ...current, status: event.target.value as TenantVendorRateCardInput["status"] }))}>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </Select>
                  </Field>
                  <div className="md:col-span-2">
                    <Field label="Remarks"><Textarea value={rateCardForm.remarks} onChange={(event) => setRateCardForm((current) => ({ ...current, remarks: event.target.value }))} /></Field>
                  </div>
                  </div>
                  )}
                </div>
              ) : null}
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
            <InfoRow label="Legal name" value={tenantVendor.legalName || "â€”"} />
            <InfoRow label="Code" value={tenantVendor.code || "â€”"} />
            <InfoRow label="GST" value={tenantVendor.gstNumber || "â€”"} />
            <InfoRow label="Vendor type" value={tenantVendor.vendorType || "â€”"} />
            <InfoRow label="Contact person" value={tenantVendor.contactPerson || "â€”"} />
            <InfoRow label="Contact number" value={tenantVendor.contactNumber || "â€”"} />
            <InfoRow label="Email" value={tenantVendor.email || "â€”"} />
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
  const [importSummary, setImportSummary] = useState<Awaited<ReturnType<typeof parseVendorRateCardFile>> | null>(null);
  const [importError, setImportError] = useState("");
  const [importing, setImporting] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState("");
  const [form, setForm] = useState(initialRateCardForm);

  const filteredRateCards = rateCards.filter((rateCard) => {
    const normalizedSearch = search.trim().toLowerCase();
    if (
      normalizedSearch &&
      !`${rateCard.contractName ?? ""} ${rateCard.contractCode ?? ""} ${rateCard.fromCity ?? ""} ${rateCard.toCity ?? ""} ${rateCard.sourcePincode} ${rateCard.destinationPincode} ${rateCard.vehicleType ?? ""}`.toLowerCase().includes(normalizedSearch)
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
      contractName: rateCard.contractName ?? "",
      contractCode: rateCard.contractCode ?? "",
      effectiveFromDate: rateCard.effectiveFromDate ?? "",
      effectiveToDate: rateCard.effectiveToDate ?? "",
      lanes: rateCard.lanes ?? "",
      fromCity: rateCard.fromCity ?? "",
      toCity: rateCard.toCity ?? "",
      fromLocation: rateCard.fromLocation ?? "",
      toLocation: rateCard.toLocation ?? "",
      sourcePincode: rateCard.sourcePincode,
      destinationPincode: rateCard.destinationPincode,
      rateType: rateCard.rateType,
      vehicleType: rateCard.vehicleType ?? "",
      buyingRate: String(rateCard.buyingRate ?? rateCard.underloadRate ?? rateCard.rate),
      underloadRate: String(rateCard.underloadRate ?? rateCard.buyingRate ?? rateCard.rate),
      overloadRate: rateCard.overloadRate != null ? String(rateCard.overloadRate) : "",
      tat: rateCard.tat ?? "",
      rate: String(rateCard.rate),
      status: rateCard.status,
      remarks: rateCard.remarks ?? "",
    });
    setError("");
    setOpen(true);
  }

  function submit() {
    const parsed = rateCardSchema.safeParse({
      contractName: form.contractName.trim() || undefined,
      contractCode: form.contractCode.trim() || undefined,
      effectiveFromDate: form.effectiveFromDate || undefined,
      effectiveToDate: form.effectiveToDate || undefined,
      lanes: form.lanes.trim(),
      fromCity: form.fromCity.trim() || undefined,
      toCity: form.toCity.trim() || undefined,
      fromLocation: form.fromLocation.trim() || undefined,
      toLocation: form.toLocation.trim() || undefined,
      sourcePincode: form.sourcePincode,
      destinationPincode: form.destinationPincode,
      rateType: form.rateType,
      vehicleType: form.vehicleType.trim() || null,
      buyingRate: Number(form.buyingRate),
      underloadRate: Number(form.underloadRate || form.buyingRate),
      overloadRate: form.overloadRate.trim() ? Number(form.overloadRate) : null,
      tat: form.tat.trim() || undefined,
      rate: Number(form.rate),
      status: form.status,
      remarks: form.remarks.trim() || undefined,
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
    downloadVendorRateCardTemplateWorkbook();
  }

  async function handleUpload(file: File | null) {
    if (!file) {
      return;
    }
    setImporting(true);
    setImportError("");
    try {
      const summary = await parseVendorRateCardFile(file);
      setImportSummary(summary);
      setUploadedFileName(file.name);
    } catch (uploadError) {
      setImportSummary(null);
      setImportError(uploadError instanceof Error ? uploadError.message : "Vendor contract file could not be parsed.");
    } finally {
      setImporting(false);
    }
  }

  function applyValidRows() {
    if (!importSummary?.validRows.length) return;
    importSummary.validRows.forEach((row) => onCreate(row));
    setImportOpen(false);
    setImportSummary(null);
    setImportError("");
    setUploadedFileName("");
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
            <option value="PER_KM">PER_KM</option>
          </Select>
        }
        trailing={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setImportOpen(true)}>
              <FileDown className="size-4" />
              Import
            </Button>
            <Button onClick={openCreate}>Add Rate Manually</Button>
          </div>
        }
      />
      <DataTable
        title="Rate Card Preview"
        description="Uploaded rows and manual rows are previewed here before downstream assignment and finance workflows use them."
        headers={["Lane", "From City", "To City", "From Location", "To Location", "From Pincode", "To Pincode", "Vehicle Type", "Rate Type", "Underload Rate", "Overload Rate", "TAT", "Effective From", "Effective To", "Remarks", "Status", "Updated", "Actions"]}
        rows={filteredRateCards.map((rateCard) => [
          rateCard.lanes ?? `${rateCard.fromLocation ?? rateCard.sourcePincode} -> ${rateCard.toLocation ?? rateCard.destinationPincode}`,
          rateCard.fromCity ?? "-",
          rateCard.toCity ?? "-",
          rateCard.fromLocation ?? "-",
          rateCard.toLocation ?? "-",
          rateCard.sourcePincode || "-",
          rateCard.destinationPincode || "-",
          rateCard.vehicleType || "â€”",
          <Badge key={`${rateCard.id}-type`} variant="outline">{rateCard.rateType === "PER_KM" ? "Per KM" : rateCard.rateType === "PER_MT" ? "Per MT" : "Per Trip"}</Badge>,
          `${(rateCard.underloadRate ?? rateCard.buyingRate ?? rateCard.rate).toLocaleString()}`,
          rateCard.overloadRate != null ? String(rateCard.overloadRate) : "-",
          rateCard.tat ?? "-",
          rateCard.effectiveFromDate ?? "-",
          rateCard.effectiveToDate ?? "-",
          rateCard.remarks || "-",
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
        title={editingRateCard ? "Edit Rate Card" : "Add Rate Manually"}
        description="Manual entry is best for a small number of rows. Upload remains the primary method for bulk setup."
        footer={<div className="flex justify-end gap-3"><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={submit}>{editingRateCard ? "Save Changes" : "Save Rate Card"}</Button></div>}
      >
        <div className="grid gap-4 md:grid-cols-2">
          {error ? <div className="md:col-span-2 rounded-2xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}
          <Field label="Contract Name"><Input value={form.contractName} onChange={(event) => setForm((current) => ({ ...current, contractName: event.target.value }))} /></Field>
          <Field label="Contract Code"><Input value={form.contractCode} onChange={(event) => setForm((current) => ({ ...current, contractCode: event.target.value }))} /></Field>
          <Field label="Effective From Date"><Input type="date" value={form.effectiveFromDate} onChange={(event) => setForm((current) => ({ ...current, effectiveFromDate: event.target.value }))} /></Field>
          <Field label="Effective To Date"><Input type="date" value={form.effectiveToDate} onChange={(event) => setForm((current) => ({ ...current, effectiveToDate: event.target.value }))} /></Field>
          <Field label="Lane"><Input value={form.lanes} onChange={(event) => setForm((current) => ({ ...current, lanes: event.target.value }))} placeholder="DEL-BOM" /></Field>
          <Field label="From City"><Input value={form.fromCity} onChange={(event) => setForm((current) => ({ ...current, fromCity: event.target.value }))} /></Field>
          <Field label="To City"><Input value={form.toCity} onChange={(event) => setForm((current) => ({ ...current, toCity: event.target.value }))} /></Field>
          <Field label="From Location"><Input value={form.fromLocation} onChange={(event) => setForm((current) => ({ ...current, fromLocation: event.target.value }))} /></Field>
          <Field label="To Location"><Input value={form.toLocation} onChange={(event) => setForm((current) => ({ ...current, toLocation: event.target.value }))} /></Field>
          <Field label="From Pincode"><Input value={form.sourcePincode} onChange={(event) => setForm((current) => ({ ...current, sourcePincode: event.target.value }))} placeholder="560037" /></Field>
          <Field label="To Pincode"><Input value={form.destinationPincode} onChange={(event) => setForm((current) => ({ ...current, destinationPincode: event.target.value }))} placeholder="600001" /></Field>
          <Field label="Vehicle Type">
            <Input value={form.vehicleType} onChange={(event) => setForm((current) => ({ ...current, vehicleType: event.target.value }))} />
          </Field>
          <Field label="Rate Type" helper={form.rateType === "PER_TRIP" ? "Full trip charge." : form.rateType === "PER_KM" ? "Charge per kilometre." : "Charge per metric ton."}>
            <Select value={form.rateType} onChange={(event) => setForm((current) => ({ ...current, rateType: event.target.value as TenantVendorRateCardInput["rateType"] }))}>
              <option value="PER_KM">Per KM</option>
              <option value="PER_MT">Per MT</option>
              <option value="PER_TRIP">Per Trip</option>
            </Select>
          </Field>
          <Field label="Underload Rate"><Input value={form.underloadRate} onChange={(event) => setForm((current) => ({ ...current, underloadRate: event.target.value, buyingRate: event.target.value, rate: event.target.value }))} /></Field>
          <Field label="Overload Rate (Optional)"><Input value={form.overloadRate} onChange={(event) => setForm((current) => ({ ...current, overloadRate: event.target.value }))} /></Field>
          <Field label="TAT (Optional)"><Input value={form.tat} onChange={(event) => setForm((current) => ({ ...current, tat: event.target.value }))} /></Field>
          <Field label="Status">
            <Select value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as TenantVendorRateCardInput["status"] }))}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </Select>
          </Field>
          <div className="md:col-span-2">
            <Field label="Remarks (Optional)"><Textarea value={form.remarks} onChange={(event) => setForm((current) => ({ ...current, remarks: event.target.value }))} /></Field>
          </div>
        </div>
      </Dialog>

      <Dialog
        open={importOpen}
        onOpenChange={setImportOpen}
        title="Import Vendor Rate Cards"
        description="Upload vendor contracts using the same workbook-driven lane and source-destination format as customer rate cards."
        widthClassName="max-w-4xl"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setImportOpen(false)}>Close</Button>
            <Button onClick={applyValidRows} disabled={!importSummary?.validRows.length}>Import Valid Rows</Button>
          </div>
        }
      >
        <div className="grid gap-4">
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" onClick={downloadTemplate}>
              <FileDown className="size-4" />
              Download Template
            </Button>
            <label className="inline-flex cursor-pointer items-center rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
              Upload Vendor Contract
              <input
                type="file"
                accept=".xlsx,.csv"
                className="hidden"
                onChange={(event) => void handleUpload(event.target.files?.[0] ?? null)}
              />
            </label>
          </div>
          <p className="text-xs text-muted-foreground">
            Accepted formats: `.xlsx`, `.csv`. Template columns are validated strictly before rows are imported.
          </p>
          {importing ? <p className="text-sm text-muted-foreground">Validating uploaded file...</p> : null}
          {uploadedFileName ? <p className="text-sm font-medium">{uploadedFileName}</p> : null}
          {importError ? (
            <div className="rounded-2xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {importError}
            </div>
          ) : null}
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
              {importSummary.invalidRows.length ? (
                <div className="md:col-span-2 rounded-2xl border border-amber-300 bg-amber-50 p-4">
                  <p className="font-medium text-amber-900">Validation errors</p>
                  <div className="mt-3 space-y-3">
                    {importSummary.invalidRows.slice(0, 5).map((row) => (
                      <div
                        key={`vendor-import-invalid-${row.rowNumber}`}
                        className="rounded-xl border border-amber-200 bg-white/70 px-3 py-3 text-sm text-amber-900"
                      >
                        <p className="font-medium">Row {row.rowNumber}</p>
                        <p className="mt-1">{row.errors.join(" ")}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
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

