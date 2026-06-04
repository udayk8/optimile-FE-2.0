import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { FileText, PencilLine, Plus } from "lucide-react";
import { z } from "zod";
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
import { Switch } from "@/shared/components/ui/switch";
import {
  EditableVendorContractRows,
  VendorContractCsvUpload,
  VendorContractsTable,
  useVendorContracts,
} from "@/modules/tenant-admin/components/vendor-contracts";
import { createVendorContracts, type VendorContractCsvRow } from "@shared-utils";
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
      />
    </div>
  );
}

export function TenantVendorOnboardingPage() {
  const { tenant } = useTenantRouteContext();
  const navigate = useNavigate();
  const { tenantVendorId } = useParams();
  const { getTenantVendorById, createVendor, updateTenantVendor } = useTenantVendors(tenant.id);
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
  // Contract rows parsed from uploaded CSVs — editable per row and persisted
  // once the vendor record is saved.
  const [pendingContractRows, setPendingContractRows] = useState<VendorContractCsvRow[]>([]);

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
      if (pendingContractRows.length > 0) {
        createVendorContracts(
          { vendorId: saved.id, vendorName: saved.name, tenantId: tenant.id },
          pendingContractRows,
        );
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
        extraReviewContent={
          <div className="space-y-4 rounded-xl border bg-muted/30 p-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Vendor contracts (optional)
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Bulk upload contract CSVs — rows can be edited or removed below and are saved together with the vendor on submit.
              </p>
            </div>
            <VendorContractCsvUpload
              onRowsParsed={(_file, result) =>
                setPendingContractRows((current) => [...current, ...result.validRows])
              }
            />
            <EditableVendorContractRows rows={pendingContractRows} onChange={setPendingContractRows} />
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
  const contracts = useVendorContracts({ id: tenantVendor?.id ?? "", name: tenantVendor?.name ?? "" });

  if (!tenantVendor) {
    return (
      <TenantEmptyState
        title="Vendor not found"
        description="This tenant vendor record is not available for the current tenant."
        action={<Button asChild><Link to={`/tenant/${tenant.id}/vendors`}>Back to vendors</Link></Button>}
      />
    );
  }

  const manualCount = contracts.filter((contract) => contract.createdFrom === "MANUAL_UPLOAD").length;
  const auctionCount = contracts.length - manualCount;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Tenant Admin"
        title={tenantVendor.name}
        description="Vendor contracts — bulk upload via CSV and review auction-won contracts."
        action={<Button asChild variant="outline"><Link to={`/tenant/${tenant.id}/vendors`}>Back to vendors</Link></Button>}
      />

      {message ? <div className="rounded-2xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div> : null}

      <div className="grid gap-4 md:grid-cols-3">
        <TenantSummaryCard label="Contracts" value={String(contracts.length)} helper="Manual uploads + auction wins" />
        <TenantSummaryCard label="Manual uploads" value={String(manualCount)} helper="Uploaded via contract CSV" />
        <TenantSummaryCard label="Auction won" value={String(auctionCount)} helper="Awarded from finished auctions" />
      </div>

      <TenantPanel
        title="Vendor Contracts"
        description="The same contract list the vendor sees in their portal."
      >
        <TenantVendorContractsSection
          vendor={{ id: tenantVendor.id, name: tenantVendor.name, tenantId: tenant.id }}
          onUploaded={(count) => setMessage(`${count} vendor contract${count === 1 ? "" : "s"} imported.`)}
        />
      </TenantPanel>
    </div>
  );
}

function TenantVendorContractsSection({
  vendor,
  onUploaded,
}: {
  vendor: { id: string; name: string; tenantId?: string };
  onUploaded: (count: number) => void;
}) {
  const contracts = useVendorContracts(vendor);
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {contracts.length} contract{contracts.length === 1 ? "" : "s"} — manual uploads and auction wins.
        </p>
        <VendorContractCsvUpload vendor={vendor} onUploaded={(created) => onUploaded(created.length)} />
      </div>
      <VendorContractsTable contracts={contracts} />
    </div>
  );
}

