import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { FileText, PencilLine, Plus } from "lucide-react";
import { z } from "zod";
import { DataTable } from "@/shared/components/common/data-table";
import { PageHeader } from "@/shared/components/common/page-header";
import {
  TenantEmptyState,
  TenantFilterBar,
} from "@/modules/tenant-admin/components/tenant-primitives";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Switch } from "@/shared/components/ui/switch";
import {
  EditableVendorContractRows,
  VendorContractCsvUpload,
  VendorContractFormDialog,
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
import {
  AUCTION_STORE_KEY,
  loadStore as loadAuctionStore,
  updateContract as updateAuctionContract,
} from "@auction/lib/auction-store";

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
  // Contract rows parsed from uploaded CSVs or added manually — editable per
  // row and persisted once the vendor record is saved.
  const [pendingContractRows, setPendingContractRows] = useState<VendorContractCsvRow[]>([]);
  const [addContractOpen, setAddContractOpen] = useState(false);

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
        extraSteps={[
          {
            label: "Contracts",
            content: (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Bulk upload the vendor's contract CSVs or add contracts manually (optional). Rows can be edited
                  or removed below and are saved together with the vendor on submit.
                </p>
                <div className="flex flex-wrap gap-2">
                  <VendorContractCsvUpload
                    onRowsParsed={(_file, result) =>
                      setPendingContractRows((current) => [...current, ...result.validRows])
                    }
                  />
                  <Button onClick={() => setAddContractOpen(true)}>
                    <Plus className="size-4" />
                    Add Contract
                  </Button>
                </div>
                <EditableVendorContractRows rows={pendingContractRows} onChange={setPendingContractRows} />
                <VendorContractFormDialog
                  open={addContractOpen}
                  onOpenChange={setAddContractOpen}
                  title="Add Contract"
                  saveLabel="Add Contract"
                  onSave={(row) => setPendingContractRows((current) => [...current, row])}
                />
              </div>
            ),
          },
        ]}
        extraReviewContent={
          <div className="rounded-xl border bg-muted/30 p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Contracts</div>
            <div className="mt-1 text-sm font-bold">
              {pendingContractRows.length
                ? `${pendingContractRows.length} contract row${pendingContractRows.length === 1 ? "" : "s"} ready to import`
                : "No contracts uploaded"}
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

      <TenantVendorContractsSection
        vendor={{ id: tenantVendor.id, name: tenantVendor.name, tenantId: tenant.id }}
        onUploaded={(count) => setMessage(`${count} vendor contract${count === 1 ? "" : "s"} imported.`)}
      />

      <VendorSpotContractsSection vendor={{ id: tenantVendor.id, name: tenantVendor.name }} />
    </div>
  );
}

// Spot auction contracts — one-time lane contracts won by this vendor in
// SPOT auctions. View + lifecycle marking only; they can never be added
// manually (the Add Contract button above is for regular vendor contracts).
function VendorSpotContractsSection({ vendor }: { vendor: { id: string; name: string } }) {
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const bump = () => setRevision((v) => v + 1);
    const onStorage = (e: StorageEvent) => {
      if (e.key === AUCTION_STORE_KEY) bump();
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener("optimile-auction-store", bump);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("optimile-auction-store", bump);
    };
  }, []);

  const spotContracts = useMemo(() => {
    const myName = vendor.name.toLowerCase();
    return loadAuctionStore().contracts.filter(
      (contract) =>
        contract.contractType === "SPOT" &&
        (contract.vendorId === vendor.id || contract.vendorName.toLowerCase() === myName),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revision, vendor.id, vendor.name]);

  const markStatus = (contractId: string, status: "ACTIVE" | "USED" | "TERMINATED") => {
    updateAuctionContract(contractId, (contract) => ({ ...contract, status }));
  };

  const statusChip = (status: string) => {
    const map: Record<string, string> = {
      ACTIVE: "bg-emerald-50 text-emerald-700",
      USED: "bg-gray-100 text-gray-600",
      TERMINATED: "bg-red-50 text-red-700",
      EXPIRED: "bg-red-50 text-red-700",
      EXPIRING_SOON: "bg-amber-50 text-amber-700",
    };
    return (
      <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${map[status] ?? "bg-gray-100 text-gray-600"}`}>
        {status === "USED" ? "Used" : status.charAt(0) + status.slice(1).toLowerCase().replace(/_/g, " ")}
      </span>
    );
  };

  return (
    <div className="space-y-3 rounded-2xl border border-amber-200 bg-amber-50/30 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold">Spot Auction Contracts</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            One-time lane contracts won in spot auctions. They are consumed by a single spot booking
            and cannot be added manually.
          </p>
        </div>
        <span className="text-xs text-muted-foreground">{spotContracts.length} contract{spotContracts.length === 1 ? "" : "s"}</span>
      </div>
      {spotContracts.length === 0 ? (
        <p className="rounded-xl border border-dashed border-amber-200 px-4 py-6 text-center text-sm text-muted-foreground">
          No spot auction contracts for this vendor yet.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500">
              <tr>
                <th className="border-b px-4 py-3">Contract</th>
                <th className="border-b px-4 py-3">Lane</th>
                <th className="border-b px-4 py-3">Rate</th>
                <th className="border-b px-4 py-3">Won On</th>
                <th className="border-b px-4 py-3">Valid Till</th>
                <th className="border-b px-4 py-3">Status</th>
                <th className="border-b px-4 py-3 text-right">Mark</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {spotContracts.map((contract) => (
                <tr key={contract.id}>
                  <td className="px-4 py-3">
                    <div className="font-mono font-semibold">{contract.id}</div>
                    <div className="mt-0.5 text-[11px] text-muted-foreground">
                      Auction {contract.sourceAuctionId}
                      {contract.consumedByBookingId ? ` · Used in ${contract.consumedByBookingId}` : ""}
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono">{contract.lane}</td>
                  <td className="px-4 py-3">₹{contract.contractedRate.toLocaleString("en-IN")} <span className="text-[11px] text-muted-foreground">{contract.rateUnit.replace("PER_", "/").toLowerCase()}</span></td>
                  <td className="px-4 py-3">{contract.awardedAt ? new Date(contract.awardedAt).toLocaleString() : "—"}</td>
                  <td className="px-4 py-3">{contract.endDate}</td>
                  <td className="px-4 py-3">{statusChip(contract.status)}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex gap-2">
                      {contract.status !== "USED" && (
                        <Button size="sm" variant="outline" onClick={() => markStatus(contract.id, "USED")}>Used</Button>
                      )}
                      {contract.status !== "TERMINATED" && (
                        <Button size="sm" variant="outline" onClick={() => markStatus(contract.id, "TERMINATED")}>Inactive</Button>
                      )}
                      {contract.status !== "ACTIVE" && (
                        <Button size="sm" variant="outline" onClick={() => markStatus(contract.id, "ACTIVE")}>Reactivate</Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
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
  const [addOpen, setAddOpen] = useState(false);
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {contracts.length} contract{contracts.length === 1 ? "" : "s"} — manual uploads and auction wins.
        </p>
        <div className="flex flex-wrap gap-2">
          <VendorContractCsvUpload vendor={vendor} onUploaded={(created) => onUploaded(created.length)} />
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="size-4" />
            Add Contract
          </Button>
        </div>
      </div>
      <VendorContractsTable contracts={contracts} />

      <VendorContractFormDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        title="Add Contract"
        saveLabel="Add Contract"
        onSave={(row) => {
          createVendorContracts(
            { vendorId: vendor.id, vendorName: vendor.name, tenantId: vendor.tenantId },
            [row],
          );
          onUploaded(1);
        }}
      />
    </div>
  );
}

