import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { FileDown, FileText, PencilLine, Plus } from "lucide-react";
import { z } from "zod";
import { DataTable } from "@/shared/components/common/data-table";
import { PageHeader } from "@/shared/components/common/page-header";
import {
  TenantEmptyState,
  TenantFilterBar,
} from "@/modules/tenant-admin/components/tenant-primitives";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Dialog } from "@/shared/components/ui/dialog";
import { Input } from "@/shared/components/ui/input";
import { Select } from "@/shared/components/ui/select";
import { Switch } from "@/shared/components/ui/switch";
import {
  RATE_MATCHING_FIELDS,
  describeRateMatchingConfig,
  getRateCardTemplateColumns,
  getRateMatchingColumns,
  normalizeRateMatchingConfig,
  type RateCardDimensionField,
} from "@/shared/lib/rate-matching-config";
import {
  downloadVendorRateCardTemplateWorkbookConfig,
  parseVendorRateCardFileConfig,
} from "@/shared/lib/vendor-rate-card-import";
import {
  useTenantMaterials,
  useTenantUOMConfigurations,
  useTenantVehicleTypes,
} from "@/modules/tenant-admin/hooks/useTenantMasterData";
import type {
  RateMatchingConfig,
  RateMatchingFieldKey,
} from "@/types/customer";
import type { TenantVendorRateCard, TenantVendorRateCardInput } from "@/types/vendor";
import {
  VendorSpotContractsTable,
  useVendorContracts,
  useVendorSpotContracts,
} from "@/modules/tenant-admin/components/vendor-contracts";
import { useTenantRouteContext } from "@/modules/tenant-admin/hooks/useTenantRouteContext";
import { useTenantVendors } from "@/modules/tenant-admin/hooks/useTenantVendors";
import { mockTenantVendors } from "@shared-admin-core/mocks/data";
import {
  VendorOnboardingWizard,
  emptyVendorOnboardingDraft,
  type VendorOnboardingDraft,
} from "@/vendor-onboarding";
import type { TenantVendor, TenantVendorInput } from "@/types/vendor";

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
  bankName: z.string().optional(),
  branch: z.string().optional(),
  accountNumber: z.string().optional(),
  ifscCode: z.string().optional(),
  accountType: z.enum(["SAVINGS", "CURRENT"]).optional(),
  status: z.enum(["active", "inactive"]),
});

function formatAddress(addr: VendorOnboardingDraft["registeredAddress"]) {
  return [addr.street, addr.city, addr.state, addr.pincode].filter(Boolean).join(", ");
}

function parseAddress(value: string): VendorOnboardingDraft["registeredAddress"] {
  const parts = value.split(",").map((p) => p.trim());
  return {
    street: parts[0] ?? "",
    city: parts[1] ?? "",
    state: parts[2] ?? "",
    pincode: parts[3] ?? "",
  };
}

function tenantFormToDraft(form: TenantVendorInput): VendorOnboardingDraft {
  return {
    ...emptyVendorOnboardingDraft,
    companyName: form.name ?? "",
    legalName: form.legalName ?? "",
    gstin: form.gstin ?? form.gstNumber ?? "",
    pan: form.pan ?? "",
    registeredAddress: parseAddress(form.address ?? ""),
    primaryContact: {
      name: form.contactPerson ?? "",
      phone: form.phone ?? form.contactNumber ?? "",
      email: form.email ?? "",
    },
    serviceRegions: form.serviceableLocations ?? [],
    supportedVehicleTypes: form.supportedVehicleTypes ?? [],
    bankName: form.bankName ?? "",
    branch: form.branch ?? "",
    accountNumber: form.accountNumber ?? "",
    ifscCode: form.ifscCode ?? "",
    accountType: form.accountType ?? "CURRENT",
  };
}

function draftToTenantForm(
  draft: VendorOnboardingDraft,
  extras: { code: string; vendorType: string; status: TenantVendorInput["status"] },
): TenantVendorInput {
  const phone = draft.primaryContact.phone;
  const gstin = draft.gstin;
  return {
    name: draft.companyName,
    legalName: draft.legalName,
    code: extras.code,
    vendorType: extras.vendorType,
    gstin,
    gstNumber: gstin,
    pan: draft.pan,
    address: formatAddress(draft.registeredAddress),
    contactPerson: draft.primaryContact.name,
    phone,
    contactNumber: phone,
    email: draft.primaryContact.email,
    serviceableLocations: draft.serviceRegions,
    supportedVehicleTypes: draft.supportedVehicleTypes,
    bankName: draft.bankName,
    branch: draft.branch,
    accountNumber: draft.accountNumber,
    ifscCode: draft.ifscCode,
    accountType: draft.accountType,
    status: extras.status,
  };
}

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

export function TenantVendorsPage() {
  const { tenant } = useTenantRouteContext();
  const navigate = useNavigate();
  const { data, updateTenantVendor } = useTenantVendors(tenant.id);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");

  const rows = useMemo(() => {
    const source = data.length ? data : mockTenantVendors;
    const normalizedSearch = search.trim().toLowerCase();
    return source.filter((vendor) => {
      if (!normalizedSearch) {
        return true;
      }
      return `${vendor.name} ${vendor.code ?? ""} ${vendor.contactPerson ?? ""} ${vendor.contactNumber ?? ""}`
        .toLowerCase()
        .includes(normalizedSearch);
    });
  }, [data, search]);

  const openCreate = () => navigate(`/tenant/${tenant.id}/vendors/new`);
  const openEdit = (vendor: TenantVendor) =>
    navigate(`/tenant/${tenant.id}/vendors/${vendor.id}/edit`);

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
          <div key={`${vendor.id}-status`} className="flex items-center gap-2">
            <Switch
              checked={vendor.status === "active"}
              onCheckedChange={(checked) => {
                updateTenantVendor(vendor.id, { status: checked ? "active" : "inactive" });
                setMessage(`${vendor.name} marked as ${checked ? "active" : "inactive"}.`);
              }}
            />
            <span className="text-xs text-muted-foreground">{vendor.status}</span>
          </div>,
          new Date(vendor.updatedAt).toLocaleDateString(),
          <div key={`${vendor.id}-actions`} className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate(`/tenant/${tenant.id}/vendors/${vendor.id}`)}
            >
              <FileText className="size-4" />
              View Contracts
            </Button>
            <Button size="sm" variant="ghost" onClick={() => openEdit(vendor)}>
              <PencilLine className="size-4" />
              Edit
            </Button>
          </div>,
        ])}
        emptyMessage="No tenant vendors found."
        pageSize={10}
      />
    </div>
  );
}

export function TenantVendorOnboardingPage() {
  const { tenant } = useTenantRouteContext();
  const navigate = useNavigate();
  const { tenantVendorId } = useParams();
  const { getTenantVendorById, createVendor, updateTenantVendor, createRateCard } = useTenantVendors(tenant.id);
  const editingVendor = tenantVendorId ? getTenantVendorById(tenantVendorId) : null;
  const isEdit = Boolean(tenantVendorId);

  const initialForm: TenantVendorInput = useMemo(() => {
    if (editingVendor) {
      return {
        name: editingVendor.name,
        legalName: editingVendor.legalName ?? "",
        code: editingVendor.code ?? "",
        gstin: editingVendor.gstin ?? editingVendor.gstNumber ?? "",
        gstNumber: editingVendor.gstNumber ?? "",
        pan: editingVendor.pan ?? "",
        address: editingVendor.address ?? "",
        vendorType: editingVendor.vendorType ?? "",
        contactPerson: editingVendor.contactPerson ?? "",
        phone: editingVendor.phone ?? editingVendor.contactNumber ?? "",
        contactNumber: editingVendor.contactNumber ?? "",
        email: editingVendor.email ?? "",
        serviceableLocations: editingVendor.serviceableLocations ?? [],
        supportedVehicleTypes: editingVendor.supportedVehicleTypes ?? [],
        bankName: editingVendor.bankName ?? "",
        branch: editingVendor.branch ?? "",
        accountNumber: editingVendor.accountNumber ?? "",
        ifscCode: editingVendor.ifscCode ?? "",
        accountType: editingVendor.accountType ?? "CURRENT",
        status: editingVendor.status,
      };
    }
    return initialVendorForm;
  }, [editingVendor]);

  const extras = {
    code: initialForm.code ?? "",
    vendorType: initialForm.vendorType ?? "",
    status: initialForm.status,
  };
  const [error, setError] = useState("");
  // Pending rate card rows (create flow) — persisted once the vendor record is
  // saved. The edit flow manages the live rate card directly in the wizard
  // step, exactly like the vendor detail page.
  const [pendingRateRows, setPendingRateRows] = useState<TenantVendorRateCardInput[]>([]);
  const [rateDialogOpen, setRateDialogOpen] = useState(false);
  const [editRateIndex, setEditRateIndex] = useState<number | null>(null);
  const [rateUploadError, setRateUploadError] = useState("");
  const [rateUploadInfo, setRateUploadInfo] = useState("");
  const [rateMessage, setRateMessage] = useState("");
  // New vendors start on the default structure (City Pair + Vehicle Type);
  // it can be reconfigured from the detail page once the vendor exists.
  const onboardingRateConfig = normalizeRateMatchingConfig(undefined);
  const onboardingRateColumns = getRateMatchingColumns(onboardingRateConfig);
  const rateSelectOptionsByField = useVendorRateCardSelectOptions(tenant.id);

  async function handleRateFile(file: File | null) {
    if (!file) return;
    setRateUploadError("");
    setRateUploadInfo("");
    try {
      const summary = await parseVendorRateCardFileConfig(file, onboardingRateConfig);
      if (summary.validRows.length) {
        setPendingRateRows((current) => [...current, ...summary.validRows]);
      }
      setRateUploadInfo(
        `${summary.validRows.length} valid row${summary.validRows.length === 1 ? "" : "s"} added` +
          (summary.invalidRows.length ? `, ${summary.invalidRows.length} skipped.` : "."),
      );
    } catch {
      setRateUploadError("Could not read the file. Check the format and try again.");
    }
  }

  if (isEdit && !editingVendor) {
    return (
      <TenantEmptyState
        title="Vendor not found"
        description="This tenant vendor record is not available for the current tenant."
        action={<Button asChild><Link to={`/tenant/${tenant.id}/vendors`}>Back to vendors</Link></Button>}
      />
    );
  }

  const wizardInitialDraft = tenantFormToDraft(initialForm);

  async function submit(draft: VendorOnboardingDraft) {
    const merged = draftToTenantForm(draft, extras);
    const parsed = vendorSchema.safeParse(merged);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Complete the required vendor fields.");
      return;
    }
    const phone = parsed.data.phone?.trim() || parsed.data.contactNumber?.trim() || "";
    if (phone && !/^\d{10}$/.test(phone)) {
      setError("Contact number must be a 10-digit numeric value.");
      return;
    }
    if (parsed.data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(parsed.data.email.trim())) {
      setError("Enter a valid email address.");
      return;
    }
    try {
      const saved = editingVendor
        ? updateTenantVendor(editingVendor.id, parsed.data)
        : createVendor(parsed.data);
      if (!editingVendor && pendingRateRows.length > 0) {
        pendingRateRows.forEach((row) => createRateCard(saved.id, row));
      }
      navigate(`/tenant/${tenant.id}/vendors`);
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "Vendor could not be saved.");
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Tenant Admin"
        title={editingVendor ? `Edit ${editingVendor.name}` : "Onboard Vendor"}
        description="Capture full vendor profile: company, coverage, bank, and tenant tagging."
        action={
          <Button asChild variant="outline">
            <Link to={`/tenant/${tenant.id}/vendors`}>Back to vendors</Link>
          </Button>
        }
      />

      {error ? (
        <div className="rounded-2xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
      ) : null}

      <VendorOnboardingWizard
        chrome={false}
        initialDraft={wizardInitialDraft}
        submitLabel={editingVendor ? "Save Changes" : "Create Vendor"}
        onSubmit={submit}
        lockCompanyName={Boolean(editingVendor)}
        lockPrimaryContactPhone={Boolean(editingVendor)}
        extraSteps={[
          {
            label: "Rate Card",
            content: isEdit && editingVendor ? (
              // Edit flow: the SAME live rate card section as the vendor detail
              // page — structure config, add/edit/delete rates, template upload.
              <div className="space-y-4">
                {rateMessage ? (
                  <div className="rounded-2xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{rateMessage}</div>
                ) : null}
                <TenantVendorRateCardSection
                  vendor={{ id: editingVendor.id, name: editingVendor.name, tenantId: tenant.id }}
                  onMessage={setRateMessage}
                />
              </div>
            ) : (
              // Create flow: vendor doesn't exist yet, so rows are collected
              // here and persisted right after the vendor record is created.
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Define the vendor's buying rates (optional). Rows are saved together with the vendor on
                  submit; the rate card structure can be reconfigured later from the vendor detail page.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" onClick={() => downloadVendorRateCardTemplateWorkbookConfig(onboardingRateConfig)}>
                    <FileDown className="size-4" />
                    Download Template
                  </Button>
                  <label className="inline-flex cursor-pointer items-center rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
                    Upload Rate Card
                    <input
                      type="file"
                      accept=".xlsx,.csv"
                      className="hidden"
                      onChange={(event) => {
                        void handleRateFile(event.target.files?.[0] ?? null);
                        event.target.value = "";
                      }}
                    />
                  </label>
                  <Button onClick={() => { setEditRateIndex(null); setRateDialogOpen(true); }}>
                    <Plus className="size-4" />
                    Add Rate
                  </Button>
                </div>
                {rateUploadError ? (
                  <div className="rounded-2xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-700">{rateUploadError}</div>
                ) : null}
                {rateUploadInfo ? (
                  <div className="rounded-2xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{rateUploadInfo}</div>
                ) : null}
                <DataTable
                  title="Rates to import"
                  description="Each row can be edited or removed before the vendor is saved."
                  headers={[...onboardingRateColumns.map((column) => column.label), "Rate Type", "Rate", "Effective From", "Effective To", "Actions"]}
                  rows={pendingRateRows.map((row, index) => [
                    ...onboardingRateColumns.map((column, columnIndex) => (
                      <span key={`pending-rate-${index}-dim-${columnIndex}`} className="font-medium">
                        {(() => {
                          const value = (row as unknown as Record<string, unknown>)[column.field];
                          return value != null && value !== "" ? String(value) : "-";
                        })()}
                      </span>
                    )),
                    <Badge key={`pending-rate-${index}-type`} variant="outline">{formatVendorRateType(row.rateType)}</Badge>,
                    `${(row.buyingRate ?? row.rate ?? 0).toLocaleString()}`,
                    row.effectiveFromDate || "—",
                    row.effectiveToDate || "—",
                    <div key={`pending-rate-${index}-actions`} className="flex gap-2">
                      <Button size="sm" variant="ghost" onClick={() => { setEditRateIndex(index); setRateDialogOpen(true); }}>
                        <PencilLine className="size-4" />
                        Edit
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setPendingRateRows((current) => current.filter((_, i) => i !== index))}>
                        Delete
                      </Button>
                    </div>,
                  ])}
                  emptyMessage="No rate rows yet — upload the template or add rates manually."
                  pageSize={10}
                />
                <VendorRateFormDialog
                  open={rateDialogOpen}
                  onOpenChange={setRateDialogOpen}
                  title={editRateIndex !== null ? "Edit Vendor Rate" : "Add Vendor Rate"}
                  saveLabel={editRateIndex !== null ? "Save Row" : "Add Rate"}
                  columns={onboardingRateColumns}
                  selectOptionsByField={rateSelectOptionsByField}
                  initial={editRateIndex !== null ? pendingRateRows[editRateIndex] : null}
                  onSave={(payload) => {
                    if (editRateIndex !== null) {
                      setPendingRateRows((current) => current.map((row, i) => (i === editRateIndex ? payload : row)));
                    } else {
                      setPendingRateRows((current) => [...current, payload]);
                    }
                  }}
                />
              </div>
            ),
          },
        ]}
        extraReviewContent={
          <div className="rounded-xl border bg-muted/30 p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Rate Card</div>
            <div className="mt-1 text-sm font-bold">
              {isEdit
                ? "Managed live in the Rate Card step."
                : pendingRateRows.length
                  ? `${pendingRateRows.length} rate row${pendingRateRows.length === 1 ? "" : "s"} ready to import`
                  : "No rates added"}
            </div>
          </div>
        }
      />
    </div>
  );
}

export function TenantVendorDetailPage() {
  const { tenant } = useTenantRouteContext();
  const { tenantVendorId = "" } = useParams();
  const { getTenantVendorById } = useTenantVendors(tenant.id);
  const tenantVendor = getTenantVendorById(tenantVendorId);
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

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Tenant Admin"
        title={tenantVendor.name}
        description="Vendor contracts — bulk upload via CSV and review auction-won contracts."
        action={<Button asChild variant="outline"><Link to={`/tenant/${tenant.id}/vendors`}>Back to vendors</Link></Button>}
      />

      {message ? <div className="rounded-2xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div> : null}

      <TenantVendorRateCardSection
        vendor={{ id: tenantVendor.id, name: tenantVendor.name, tenantId: tenant.id }}
        onMessage={setMessage}
      />

      <VendorSpotContractsSection vendor={{ id: tenantVendor.id, name: tenantVendor.name }} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Config-driven Vendor Rate Card (Contracts) — reuses the SAME engine as
// Customer Contracts (shared/lib/rate-matching-config). The vendor's
// rateMatchingConfig drives grid, add form, template and upload validation.
// ---------------------------------------------------------------------------

const VENDOR_RATE_CARD_FORM_INIT: Record<string, string> & { rateType: TenantVendorRateCardInput["rateType"] } = {
  fromCity: "",
  toCity: "",
  fromLocation: "",
  toLocation: "",
  sourcePincode: "",
  destinationPincode: "",
  vehicleType: "",
  material: "",
  serviceType: "",
  weightSlab: "",
  quantitySlab: "",
  customerGroup: "",
  uom: "",
  rate: "",
  underloadRate: "",
  overloadRate: "",
  effectiveFromDate: "",
  effectiveToDate: "",
  rateType: "PER_TRIP",
};

function formatVendorRateType(rateType: TenantVendorRateCard["rateType"]) {
  if (rateType === "PER_KM") return "Per KM";
  if (rateType === "PER_MT") return "Per MT";
  return "Per Trip";
}

function VendorField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      {children}
    </div>
  );
}

/** A labelled group of rate-card dimension checkboxes (mirrors the customer modal). */
function VendorRateCardConfigGroup({
  title,
  hint,
  keys,
  labels,
  selected,
  onToggle,
}: {
  title: string;
  hint?: string;
  keys: RateMatchingFieldKey[];
  labels?: Partial<Record<RateMatchingFieldKey, string>>;
  selected: RateMatchingConfig;
  onToggle: (key: RateMatchingFieldKey) => void;
}) {
  return (
    <div>
      <p className="text-sm font-semibold">{title}</p>
      {hint ? <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p> : null}
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        {keys.map((key) => {
          const field = RATE_MATCHING_FIELDS.find((item) => item.key === key);
          const label = labels?.[key] ?? field?.label ?? key;
          const checked = selected.includes(key);
          return (
            <label
              key={key}
              className={`flex cursor-pointer items-start gap-2 rounded-lg border px-3 py-2 text-sm transition ${
                checked ? "border-primary/40 bg-primary/5 font-medium" : "bg-background/80 hover:border-primary/20"
              }`}
            >
              <input type="checkbox" className="mt-0.5" checked={checked} onChange={() => onToggle(key)} />
              <span>
                {label}
                {field?.description ? (
                  <span className="block text-xs font-normal text-muted-foreground">{field.description}</span>
                ) : null}
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

/** Select options per rate-card dimension, sourced from tenant master data. */
function useVendorRateCardSelectOptions(tenantId: string): Partial<Record<RateCardDimensionField, string[]>> {
  const { data: vehicleTypeData } = useTenantVehicleTypes(tenantId);
  const { data: materialData } = useTenantMaterials(tenantId);
  const { definitions: uomDefinitions } = useTenantUOMConfigurations(tenantId);
  const vehicleSelectOptions = vehicleTypeData.length
    ? vehicleTypeData.map((vehicleType) => vehicleType.typeCode)
    : ["20FT", "32FT", "Trailer", "Container", "LCV", "Tanker", "Open Body", "Other"];
  const materialSelectOptions = materialData
    .filter((material) => material.status === "active")
    .map((material) => material.materialCode);
  const uomSelectOptions = uomDefinitions
    .filter((definition) => definition.status === "active")
    .map((definition) => definition.code);
  return {
    vehicleType: vehicleSelectOptions,
    ...(materialSelectOptions.length ? { material: materialSelectOptions } : {}),
    ...(uomSelectOptions.length ? { uom: uomSelectOptions } : {}),
  };
}

/**
 * Shared add/edit dialog for one vendor buying-rate row. Used by the vendor
 * detail rate card section AND the onboarding/edit wizard so both entry
 * points run the exact same form, validation and payload shape.
 */
function VendorRateFormDialog({
  open,
  onOpenChange,
  title,
  saveLabel,
  columns,
  selectOptionsByField,
  initial,
  onSave,
  showUnderloadRate = true,
  showOverloadRate = true,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  saveLabel: string;
  columns: ReturnType<typeof getRateMatchingColumns>;
  selectOptionsByField: Partial<Record<RateCardDimensionField, string[]>>;
  initial?: Partial<TenantVendorRateCard> | null;
  onSave: (payload: TenantVendorRateCardInput) => void;
  showUnderloadRate?: boolean;
  showOverloadRate?: boolean;
}) {
  const [form, setForm] = useState(VENDOR_RATE_CARD_FORM_INIT);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setForm({
      ...VENDOR_RATE_CARD_FORM_INIT,
      fromCity: initial?.fromCity ?? "",
      toCity: initial?.toCity ?? "",
      fromLocation: initial?.fromLocation ?? "",
      toLocation: initial?.toLocation ?? "",
      sourcePincode: initial?.sourcePincode ?? "",
      destinationPincode: initial?.destinationPincode ?? "",
      vehicleType: initial?.vehicleType ?? "",
      material: initial?.material ?? "",
      serviceType: initial?.serviceType ?? "",
      weightSlab: initial?.weightSlab ?? "",
      quantitySlab: initial?.quantitySlab ?? "",
      customerGroup: initial?.customerGroup ?? "",
      uom: initial?.uom ?? "",
      rate: initial ? String(initial.buyingRate ?? initial.underloadRate ?? initial.rate ?? "") : "",
      underloadRate: initial?.underloadRate != null ? String(initial.underloadRate) : "",
      overloadRate: initial?.overloadRate != null ? String(initial.overloadRate) : "",
      effectiveFromDate: initial?.effectiveFromDate ?? "",
      effectiveToDate: initial?.effectiveToDate ?? "",
      rateType: initial?.rateType ?? "PER_TRIP",
    });
    setError("");
  }, [open, initial]);

  function submit() {
    setError("");
    const readField = (field: RateCardDimensionField) => (form[field] ?? "").trim();
    for (const column of columns) {
      const value = readField(column.field);
      if (column.field === "sourcePincode" || column.field === "destinationPincode") {
        if (!/^\d{6}$/.test(value)) {
          setError(`${column.label} must be a 6-digit number.`);
          return;
        }
      } else if (!value) {
        setError(`${column.label} is required.`);
        return;
      }
    }
    const rate = Number(form.rate);
    if (!form.rate || Number.isNaN(rate) || rate <= 0) {
      setError("Rate must be greater than zero.");
      return;
    }
    // Manual contracts carry the same validity window as auction-won (LOT/BULK)
    // contracts, so the start/end dates are mandatory here too.
    if (!form.effectiveFromDate || !form.effectiveToDate) {
      setError("Start and end dates are required.");
      return;
    }
    if (form.effectiveToDate < form.effectiveFromDate) {
      setError("End date must not be before start date.");
      return;
    }
    const configuredFields = new Set(columns.map((column) => column.field));
    const dim = (field: RateCardDimensionField) =>
      configuredFields.has(field) ? readField(field) || undefined : undefined;
    const underloadRate = Number(form.underloadRate) > 0 ? Number(form.underloadRate) : rate;
    const overloadRate = form.overloadRate && Number(form.overloadRate) > 0 ? Number(form.overloadRate) : null;
    onSave({
      fromCity: dim("fromCity"),
      toCity: dim("toCity"),
      fromLocation: dim("fromLocation"),
      toLocation: dim("toLocation"),
      sourcePincode: dim("sourcePincode") ?? "",
      destinationPincode: dim("destinationPincode") ?? "",
      effectiveFromDate: form.effectiveFromDate || undefined,
      effectiveToDate: form.effectiveToDate || undefined,
      rateType: form.rateType,
      vehicleType: form.vehicleType?.trim() || null,
      material: dim("material"),
      serviceType: dim("serviceType"),
      weightSlab: dim("weightSlab"),
      quantitySlab: dim("quantitySlab"),
      customerGroup: dim("customerGroup"),
      uom: dim("uom"),
      buyingRate: underloadRate,
      underloadRate,
      overloadRate,
      rate: underloadRate,
      status: "active",
    });
    onOpenChange(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description="Buying rate for this vendor. Booking auto-fills vendor freight from these rows."
      footer={
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit}>{saveLabel}</Button>
        </div>
      }
    >
      <div className="grid gap-4 md:grid-cols-2">
        {error ? (
          <div className="md:col-span-2 rounded-2xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
        ) : null}
        <VendorField label="Rate Type *">
          <Select value={form.rateType} onChange={(event) => setForm((current) => ({ ...current, rateType: event.target.value as TenantVendorRateCardInput["rateType"] }))}>
            <option value="PER_KM">Per KM</option>
            <option value="PER_MT">Per MT</option>
            <option value="PER_TRIP">Per Trip</option>
          </Select>
        </VendorField>
        {columns.map((column) => {
          const value = form[column.field] ?? "";
          const options = selectOptionsByField[column.field];
          const setValue = (next: string) => setForm((current) => ({ ...current, [column.field]: next }));
          const vehicleOptional = column.field === "vehicleType" && form.rateType !== "PER_TRIP";
          const labelText = vehicleOptional ? `${column.label} (optional)` : `${column.label} *`;
          return (
            <VendorField key={column.field} label={labelText}>
              {options ? (
                <Select value={value} onChange={(event) => setValue(event.target.value)}>
                  <option value="">Select {column.label}</option>
                  {value && !options.includes(value) ? <option value={value}>{value}</option> : null}
                  {options.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </Select>
              ) : (
                <Input value={value} onChange={(event) => setValue(event.target.value)} placeholder={column.placeholder} />
              )}
            </VendorField>
          );
        })}
        {/* Vehicle Type — fixed column, always shown. */}
        <VendorField label="Vehicle Type">
          <Select
            value={form.vehicleType}
            onChange={(event) => setForm((current) => ({ ...current, vehicleType: event.target.value }))}
          >
            <option value="">Select Vehicle Type</option>
            {form.vehicleType && !selectOptionsByField.vehicleType?.includes(form.vehicleType) ? (
              <option value={form.vehicleType}>{form.vehicleType}</option>
            ) : null}
            {(selectOptionsByField.vehicleType ?? []).map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </Select>
        </VendorField>
        <VendorField label="Rate *">
          <Input type="number" value={form.rate} onChange={(event) => setForm((current) => ({ ...current, rate: event.target.value }))} placeholder="16000" />
        </VendorField>
        {showUnderloadRate ? (
          <VendorField label="Underload Rate">
            <Input
              type="number"
              value={form.underloadRate}
              onChange={(event) => setForm((current) => ({ ...current, underloadRate: event.target.value }))}
              placeholder="14000"
            />
          </VendorField>
        ) : null}
        {showOverloadRate ? (
          <VendorField label="Overload Rate">
            <Input
              type="number"
              value={form.overloadRate}
              onChange={(event) => setForm((current) => ({ ...current, overloadRate: event.target.value }))}
              placeholder="18000"
            />
          </VendorField>
        ) : null}
        <VendorField label="Start Date *">
          <Input
            type="date"
            value={form.effectiveFromDate}
            onChange={(event) => setForm((current) => ({ ...current, effectiveFromDate: event.target.value }))}
          />
        </VendorField>
        <VendorField label="End Date *">
          <Input
            type="date"
            value={form.effectiveToDate}
            onChange={(event) => setForm((current) => ({ ...current, effectiveToDate: event.target.value }))}
          />
        </VendorField>
      </div>
    </Dialog>
  );
}

function TenantVendorRateCardSection({
  vendor,
  onMessage,
}: {
  vendor: { id: string; name: string; tenantId: string };
  onMessage: (message: string) => void;
}) {
  const { getTenantVendorById, updateTenantVendor, listRateCards, createRateCard, updateRateCard, deleteRateCard } =
    useTenantVendors(vendor.tenantId);
  const vendorRecord = getTenantVendorById(vendor.id);
  const config = normalizeRateMatchingConfig(vendorRecord?.rateMatchingConfig);
  const columns = getRateMatchingColumns(config);
  // Vehicle Type is a fixed column — exclude it from the dimension set.
  const dimensionColumns = columns.filter((c) => c.field !== "vehicleType");
  const rateCards = listRateCards(vendor.id);

  // BULK/LOT auction wins surface here as read-only rate card rows — winning a
  // term auction effectively adds a buying rate on the lane. SPOT wins render
  // in their own table below the page.
  const vendorContracts = useVendorContracts(vendor);
  const auctionContracts = vendorContracts.filter(
    (contract) => contract.createdFrom === "AUCTION_WIN",
  );

  const selectOptionsByField = useVendorRateCardSelectOptions(vendor.tenantId);

  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [importSummary, setImportSummary] = useState<Awaited<ReturnType<typeof parseVendorRateCardFileConfig>> | null>(null);
  const [importError, setImportError] = useState("");
  const [importing, setImporting] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState("");

  const [configOpen, setConfigOpen] = useState(false);
  const [draftConfig, setDraftConfig] = useState<RateMatchingConfig>(config);
  const [showUnderloadRate, setShowUnderloadRate] = useState(true);
  const [showOverloadRate, setShowOverloadRate] = useState(true);
  const [draftPricing, setDraftPricing] = useState({ underloadRate: true, overloadRate: true });
  function toggleDraftConfig(key: RateMatchingFieldKey) {
    setDraftConfig((current) =>
      current.includes(key) ? current.filter((item) => item !== key) : [...current, key],
    );
  }
  function openConfig() {
    setDraftConfig(config);
    setDraftPricing({ underloadRate: showUnderloadRate, overloadRate: showOverloadRate });
    setConfigOpen(true);
  }
  function saveConfig() {
    if (!draftConfig.length) return;
    updateTenantVendor(vendor.id, { rateMatchingConfig: normalizeRateMatchingConfig(draftConfig) });
    setShowUnderloadRate(draftPricing.underloadRate);
    setShowOverloadRate(draftPricing.overloadRate);
    setConfigOpen(false);
    onMessage("Vendor rate card structure updated.");
  }

  const filteredRateCards = rateCards.filter((rateCard) => {
    const normalizedSearch = search.trim().toLowerCase();
    if (!normalizedSearch) return true;
    return `${rateCard.fromCity ?? ""} ${rateCard.toCity ?? ""} ${rateCard.fromLocation ?? ""} ${rateCard.toLocation ?? ""} ${rateCard.sourcePincode ?? ""} ${rateCard.destinationPincode ?? ""} ${rateCard.vehicleType ?? ""} ${rateCard.material ?? ""} ${rateCard.remarks ?? ""}`
      .toLowerCase()
      .includes(normalizedSearch);
  });

  const filteredAuctionContracts = auctionContracts.filter((contract) => {
    const normalizedSearch = search.trim().toLowerCase();
    if (!normalizedSearch) return true;
    return `${contract.originCity} ${contract.destinationCity} ${contract.vehicleType}`
      .toLowerCase()
      .includes(normalizedSearch);
  });

  /** Auction contracts only carry the lane + vehicle dimensions. */
  function auctionDimensionValue(field: RateCardDimensionField, contract: (typeof auctionContracts)[number]) {
    if (field === "fromCity") return contract.originCity;
    if (field === "toCity") return contract.destinationCity;
    if (field === "vehicleType") return contract.vehicleType;
    return "";
  }

  const editingRateCard = editingId ? rateCards.find((rateCard) => rateCard.id === editingId) ?? null : null;

  function openCreate() {
    setEditingId(null);
    setOpen(true);
  }

  function openEdit(rateCard: TenantVendorRateCard) {
    setEditingId(rateCard.id);
    setOpen(true);
  }

  function handleSave(payload: TenantVendorRateCardInput) {
    if (editingId) {
      updateRateCard(editingId, payload);
      onMessage("Vendor rate updated.");
    } else {
      createRateCard(vendor.id, payload);
      onMessage("Vendor rate added.");
    }
  }

  async function handleUpload(file: File | null) {
    if (!file) return;
    setImporting(true);
    setImportError("");
    setImportSummary(null);
    setUploadedFileName(file.name);
    try {
      const summary = await parseVendorRateCardFileConfig(file, config);
      setImportSummary(summary);
    } catch {
      setImportError("Could not read the file. Check the format and try again.");
    } finally {
      setImporting(false);
    }
  }

  function applyValidRows() {
    if (!importSummary?.validRows.length) return;
    importSummary.validRows.forEach((row) => createRateCard(vendor.id, row));
    onMessage(`${importSummary.validRows.length} vendor rate${importSummary.validRows.length === 1 ? "" : "s"} imported.`);
    setImportSummary(null);
    setUploadedFileName("");
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/70 bg-card px-4 py-3 shadow-sm">
        <div>
          <p className="text-sm font-semibold">Rate Card Structure</p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Choose which columns this vendor's rate card has. This regenerates the grid, add-rate
            form, template and upload validation, and is what booking matches on to auto-fill vendor
            (buying) freight.
          </p>
        </div>
        <Button onClick={openConfig}>Configure Rate Card</Button>
      </div>

      <TenantFilterBar
        searchValue={search}
        searchPlaceholder="Search by city, location, vehicle type, or material"
        onSearchChange={setSearch}
        trailing={
          <div className="flex flex-wrap items-center gap-2">
            <span className="hidden text-[12px] text-muted-foreground sm:inline">
              {rateCards.length} row{rateCards.length === 1 ? "" : "s"} configured
              {auctionContracts.length ? ` · ${auctionContracts.length} auction-won` : ""}
            </span>
            <Button size="sm" onClick={openCreate}>Add Rate</Button>
            <label className="inline-flex cursor-pointer items-center rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground">
              Upload Rate Card
              <input type="file" accept=".xlsx,.csv" className="hidden" onChange={(event) => void handleUpload(event.target.files?.[0] ?? null)} />
            </label>
            <Button size="sm" variant="outline" onClick={() => downloadVendorRateCardTemplateWorkbookConfig(config)}>
              <FileDown className="size-4" />
              Download Template
            </Button>
          </div>
        }
      />

      {importing || uploadedFileName || importError || importSummary ? (
        <div className="space-y-3 rounded-xl border border-border/60 bg-muted/10 p-3">
          {importing ? <p className="text-sm text-muted-foreground">Validating uploaded file...</p> : null}
          {uploadedFileName ? <p className="text-sm font-medium">{uploadedFileName}</p> : null}
          {importError ? (
            <div className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-700">{importError}</div>
          ) : null}
          {importSummary ? (
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-3">
                <p className="font-medium text-emerald-900">Valid rows</p>
                <p className="mt-1 text-sm text-emerald-800">{importSummary.validRows.length} rows ready to import.</p>
              </div>
              <div className="rounded-xl border border-amber-300 bg-amber-50 p-3">
                <p className="font-medium text-amber-900">Invalid rows</p>
                <p className="mt-1 text-sm text-amber-800">{importSummary.invalidRows.length} rows need correction.</p>
              </div>
              {importSummary.invalidRows.length ? (
                <div className="md:col-span-2 rounded-xl border border-amber-300 bg-amber-50 p-3">
                  <p className="font-medium text-amber-900">Validation errors</p>
                  <div className="mt-2 space-y-2">
                    {importSummary.invalidRows.slice(0, 5).map((row) => (
                      <div key={`invalid-${row.rowNumber}`} className="rounded-lg border border-amber-200 bg-white/70 px-3 py-2 text-sm text-amber-900">
                        <p className="font-medium">Row {row.rowNumber}</p>
                        <p className="mt-1">{row.errors.join(" ")}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
              <div className="md:col-span-2 flex justify-end">
                <Button onClick={applyValidRows} disabled={!importSummary.validRows.length}>Import Valid Rows</Button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      <DataTable
        title="Vendor Rate Card"
        description="Buying-rate rows for this vendor — manually configured rates plus BULK/LOT auction wins."
        headers={[
          ...dimensionColumns.map((column) => column.label),
          "Vehicle Type",
          "Volume",
          "Rate Type",
          "Rate",
          ...(showUnderloadRate ? ["Underload Rate"] : []),
          ...(showOverloadRate ? ["Overload Rate"] : []),
          "Start Date",
          "End Date",
          "Type",
          "Actions",
        ]}
        rows={[
          ...filteredRateCards.map((rateCard) => [
            ...dimensionColumns.map((column, columnIndex) => (
              <span key={`${rateCard.id}-dim-${columnIndex}`} className="font-medium">
                {(() => {
                  const value = (rateCard as unknown as Record<string, unknown>)[column.field];
                  return value != null && value !== "" ? String(value) : "-";
                })()}
              </span>
            )),
            rateCard.vehicleType || "—",
            "100%",
            <Badge key={`${rateCard.id}-rate-type`} variant="outline">{formatVendorRateType(rateCard.rateType)}</Badge>,
            `${(rateCard.buyingRate ?? rateCard.underloadRate ?? rateCard.rate ?? 0).toLocaleString()}`,
            ...(showUnderloadRate ? [rateCard.underloadRate != null ? rateCard.underloadRate.toLocaleString() : "—"] : []),
            ...(showOverloadRate ? [rateCard.overloadRate != null ? rateCard.overloadRate.toLocaleString() : "—"] : []),
            rateCard.effectiveFromDate || "—",
            rateCard.effectiveToDate || "—",
            <Badge key={`${rateCard.id}-kind`} variant="secondary">Manual</Badge>,
            <div key={`${rateCard.id}-actions`} className="flex flex-wrap gap-2">
              <Button size="sm" variant="ghost" onClick={() => openEdit(rateCard)}>Edit</Button>
              <Button size="sm" variant="outline" onClick={() => { deleteRateCard(rateCard.id); onMessage("Vendor rate removed."); }}>Delete</Button>
            </div>,
          ]),
          // Auction-won BULK/LOT contract rows — read only.
          ...filteredAuctionContracts.map((contract) => [
            ...dimensionColumns.map((column, columnIndex) => (
              <span key={`${contract.contractId}-dim-${columnIndex}`} className="font-medium">
                {auctionDimensionValue(column.field, contract) || "-"}
              </span>
            )),
            contract.vehicleType || "—",
            <span key={`${contract.contractId}-volume`}>
              {contract.volumeAllocationPercent ?? 100}%
              {contract.allocationRank ? <span className="ml-1 text-xs text-muted-foreground">({contract.allocationRank})</span> : null}
            </span>,
            <Badge key={`${contract.contractId}-rate-type`} variant="outline">{formatVendorRateType(contract.rateType)}</Badge>,
            contract.rate.toLocaleString(),
            ...(showUnderloadRate ? ["—"] : []),
            ...(showOverloadRate ? ["—"] : []),
            contract.startDate,
            contract.endDate,
            <Badge key={`${contract.contractId}-kind`} variant="outline">
              {contract.contractKind === "LOT" ? "Lot" : "Bulk"}
            </Badge>,
            <div key={`${contract.contractId}-actions`} className="flex items-center gap-2">
              <Badge variant={contract.status === "ACTIVE" ? "success" : "warning"}>{contract.status}</Badge>
              <span className="text-xs text-muted-foreground">Auction-won</span>
            </div>,
          ]),
        ]}
        emptyMessage="No vendor rates yet. Configure the structure, then add rows or upload a template — or award this vendor an auction."
      />

      <VendorRateFormDialog
        open={open}
        onOpenChange={setOpen}
        title={editingId ? "Edit Vendor Rate" : "Add Vendor Rate"}
        saveLabel={editingId ? "Save Changes" : "Save Rate"}
        columns={dimensionColumns}
        selectOptionsByField={selectOptionsByField}
        initial={editingRateCard}
        onSave={handleSave}
        showUnderloadRate={showUnderloadRate}
        showOverloadRate={showOverloadRate}
      />

      <Dialog
        open={configOpen}
        onOpenChange={setConfigOpen}
        title="Configure Rate Card"
        description="Select which columns this vendor's rate card has. Columns regenerate immediately. Booking matches on these columns to auto-fill vendor freight."
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setConfigOpen(false)}>Cancel</Button>
            <Button onClick={saveConfig} disabled={!draftConfig.length}>Save Configuration</Button>
          </div>
        }
      >
        <div className="space-y-5">
          <VendorRateCardConfigGroup
            title="Origin → Destination columns"
            hint="Pick at least one origin → destination basis."
            keys={["CITY_PAIR", "LOCATION_PAIR", "PINCODE_PAIR"]}
            labels={{ CITY_PAIR: "City Pair", LOCATION_PAIR: "Location Pair", PINCODE_PAIR: "Pincode Pair" }}
            selected={draftConfig}
            onToggle={toggleDraftConfig}
          />
          {!draftConfig.length ? <p className="text-sm text-rose-600">Select at least one parameter.</p> : null}
          <div>
            <p className="text-sm font-semibold">Additional fields</p>
            <p className="mt-0.5 text-xs text-muted-foreground">Optional pricing columns shown in the grid and form.</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {(
                [
                  { key: "underloadRate", label: "Underload Rate" },
                  { key: "overloadRate", label: "Overload Rate" },
                ] as const
              ).map(({ key, label }) => {
                const checked = draftPricing[key];
                return (
                  <label
                    key={key}
                    className={`flex cursor-pointer items-start gap-2 rounded-lg border px-3 py-2 text-sm transition ${
                      checked ? "border-primary/40 bg-primary/5 font-medium" : "bg-background/80 hover:border-primary/20"
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="mt-0.5"
                      checked={checked}
                      onChange={() => setDraftPricing((p) => ({ ...p, [key]: !p[key] }))}
                    />
                    <span>{label}</span>
                  </label>
                );
              })}
            </div>
          </div>
          <p className="rounded-lg bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
            Booking will match this vendor using:{" "}
            <span className="font-medium text-foreground">{describeRateMatchingConfig(draftConfig.length ? draftConfig : config)}</span>
          </p>
        </div>
      </Dialog>
    </div>
  );
}

// Spot auction contracts — one-time lane contracts won by this vendor in
// SPOT auctions. Rendered with the same columns as the vendor contracts
// table, plus the spot auction reference. View only; no manual marking —
// status flips to Used automatically when a spot booking consumes it.
function VendorSpotContractsSection({ vendor }: { vendor: { id: string; name: string } }) {
  const spotContracts = useVendorSpotContracts(vendor);
  return <VendorSpotContractsTable contracts={spotContracts} />;
}

