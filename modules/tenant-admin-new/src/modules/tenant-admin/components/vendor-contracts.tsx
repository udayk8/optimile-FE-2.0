import { useEffect, useMemo, useState } from "react";
import { FileDown, PencilLine, Trash2, Upload } from "lucide-react";
import { DataTable } from "@/shared/components/common/data-table";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Dialog } from "@/shared/components/ui/dialog";
import { Input } from "@/shared/components/ui/input";
import { Select } from "@/shared/components/ui/select";
import {
  RATE_TYPE_OPTIONS,
  VENDOR_CONTRACTS_EVENT,
  buildVendorContractCsvTemplate,
  getLaneCodeError,
  getRateTypeLabel,
  isValidRateType,
  listVendorContracts,
  normalizeLaneCode,
  parseVendorContractCsv,
  uploadVendorContractsCsv,
  type RateType,
  type VendorContract,
  type VendorContractCsvResult,
  type VendorContractCsvRow,
} from "@shared-utils";

/* ============================================================
   Tenant Admin → vendor contracts.

   Manual contracts come from the CSV upload below (shared
   `optimile.vendor-contracts` store — what the Vendor Portal "My
   Contracts" page reads). Auction-won contracts are read from the
   shared auction store the moment a winner is finalized. Together
   this mirrors GET /admin/vendors/:vendorId/contracts.
   ============================================================ */

const AUCTION_STORE_KEY = "optimile.auction-store";

interface AuctionStoreContract {
  id: string;
  sourceAuctionId?: string;
  contractType?: "BULK" | "LOT" | "SPOT";
  vendorId: string;
  vendorName: string;
  lane: string;
  vehicleType: string;
  contractedRate: number;
  rateUnit: VendorContract["rateType"];
  startDate: string;
  endDate: string;
  status: string;
  allocationRank?: "L1" | "L2" | "L3";
  volumeAllocationPercent?: number;
}

function readAuctionWonContracts(vendor: { id: string; name: string }): VendorContract[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(AUCTION_STORE_KEY);
    if (!raw) return [];
    const contracts = (JSON.parse(raw)?.contracts ?? []) as AuctionStoreContract[];
    const name = vendor.name.toLowerCase();
    return contracts
      // SPOT one-time contracts render in their own table — keep the main
      // vendor-contracts list to manual uploads + BULK/LOT auction wins.
      .filter((contract) => contract.contractType !== "SPOT")
      .filter((contract) => contract.vendorId === vendor.id || contract.vendorName.toLowerCase() === name)
      .map((contract) => ({
        contractId: contract.id,
        vendorId: contract.vendorId,
        vendorName: contract.vendorName,
        laneCode: contract.lane,
        vehicleType: contract.vehicleType,
        rate: contract.contractedRate,
        rateType: contract.rateUnit,
        startDate: contract.startDate,
        endDate: contract.endDate,
        createdFrom: "AUCTION_WIN" as const,
        contractKind: contract.contractType,
        status: contract.status === "TERMINATED" ? "TERMINATED" : contract.status === "EXPIRED" ? "EXPIRED" : "ACTIVE",
        allocationRank: contract.allocationRank,
        volumeAllocationPercent: contract.volumeAllocationPercent,
      }));
  } catch {
    return [];
  }
}

/** Manual + auction-won contracts for a vendor, refreshed on shared-store changes. */
export function useVendorContracts(vendor: { id: string; name: string }): VendorContract[] {
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const bump = () => setRevision((value) => value + 1);
    window.addEventListener(VENDOR_CONTRACTS_EVENT, bump);
    window.addEventListener("optimile-auction-store", bump);
    window.addEventListener("storage", bump);
    return () => {
      window.removeEventListener(VENDOR_CONTRACTS_EVENT, bump);
      window.removeEventListener("optimile-auction-store", bump);
      window.removeEventListener("storage", bump);
    };
  }, []);
  return useMemo(
    () => [
      ...listVendorContracts({ vendorId: vendor.id, vendorName: vendor.name }),
      ...readAuctionWonContracts(vendor),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [vendor.id, vendor.name, revision],
  );
}

/** Spot-auction one-time contract rows for the dedicated spot table. */
export interface VendorSpotContract extends VendorContract {
  sourceAuctionId: string;
  consumedByBookingId?: string;
}

function readSpotContracts(vendor: { id: string; name: string }): VendorSpotContract[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(AUCTION_STORE_KEY);
    if (!raw) return [];
    const contracts = (JSON.parse(raw)?.contracts ?? []) as (AuctionStoreContract & {
      consumedByBookingId?: string;
    })[];
    const name = vendor.name.toLowerCase();
    return contracts
      .filter((contract) => contract.contractType === "SPOT")
      .filter((contract) => contract.vendorId === vendor.id || contract.vendorName.toLowerCase() === name)
      .map((contract) => ({
        contractId: contract.id,
        sourceAuctionId: contract.sourceAuctionId ?? "",
        consumedByBookingId: contract.consumedByBookingId,
        vendorId: contract.vendorId,
        vendorName: contract.vendorName,
        laneCode: contract.lane,
        vehicleType: contract.vehicleType,
        rate: contract.contractedRate,
        rateType: contract.rateUnit,
        startDate: contract.startDate,
        endDate: contract.endDate,
        createdFrom: "AUCTION_WIN" as const,
        status: contract.status === "TERMINATED" ? "TERMINATED" : contract.status === "EXPIRED" ? "EXPIRED" : "ACTIVE",
        volumeAllocationPercent: contract.volumeAllocationPercent,
        allocationRank: contract.allocationRank,
      }));
  } catch {
    return [];
  }
}

/** Spot contracts for a vendor, refreshed on shared-store changes. */
export function useVendorSpotContracts(vendor: { id: string; name: string }): VendorSpotContract[] {
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const bump = () => setRevision((value) => value + 1);
    window.addEventListener("optimile-auction-store", bump);
    window.addEventListener("storage", bump);
    return () => {
      window.removeEventListener("optimile-auction-store", bump);
      window.removeEventListener("storage", bump);
    };
  }, []);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => readSpotContracts(vendor), [vendor.id, vendor.name, revision]);
}

/**
 * Spot-auction contracts table — same columns as the vendor contracts table
 * plus the spot auction id. A spot contract is just a contract with that
 * extra reference; no manual lifecycle marking here.
 */
export function VendorSpotContractsTable({ contracts }: { contracts: VendorSpotContract[] }) {
  return (
    <DataTable
      title="Spot auction contracts"
      description="One-time contracts won in spot auctions — consumed by a single spot booking on the lane."
      headers={["Lane", "Vehicle Type", "Rate", "Rate Type", "Volume", "Valid Till", "Spot Auction", "Status"]}
      rows={contracts.map((contract) => [
        <span key={`${contract.contractId}-lane`} className="font-mono font-semibold">{contract.laneCode}</span>,
        contract.vehicleType,
        contract.rate.toLocaleString("en-IN"),
        <Badge key={`${contract.contractId}-rate-type`} variant="outline">{getRateTypeLabel(contract.rateType)}</Badge>,
        <span key={`${contract.contractId}-volume`}>{contract.volumeAllocationPercent ?? 100}%</span>,
        contract.endDate,
        <span key={`${contract.contractId}-auction`} className="font-mono text-xs">
          {contract.sourceAuctionId || "—"}
          {contract.consumedByBookingId ? (
            <span className="ml-1 text-muted-foreground">· used in {contract.consumedByBookingId}</span>
          ) : null}
        </span>,
        <Badge key={`${contract.contractId}-status`} variant={contract.status === "ACTIVE" ? "success" : "warning"}>
          {contract.status}
        </Badge>,
      ])}
      emptyMessage="No spot auction contracts yet — award a spot auction to this vendor."
      pageSize={10}
    />
  );
}

export function downloadVendorContractCsvTemplate() {
  const blob = new Blob([buildVendorContractCsvTemplate()], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "vendor-contracts-template.csv";
  anchor.click();
  URL.revokeObjectURL(url);
}

export function VendorContractsTable({ contracts }: { contracts: VendorContract[] }) {
  return (
    <DataTable
      title="Vendor contracts"
      description="Manually uploaded contracts and auction-won contracts — the same list the vendor sees in their portal."
      headers={["Lane", "Vehicle Type", "Rate", "Rate Type", "Volume", "Start Date", "End Date", "Type", "Status"]}
      rows={contracts.map((contract) => [
        <span key={`${contract.contractId}-lane`} className="font-mono font-semibold">{contract.laneCode}</span>,
        contract.vehicleType,
        contract.rate.toLocaleString("en-IN"),
        <Badge key={`${contract.contractId}-rate-type`} variant="outline">{getRateTypeLabel(contract.rateType)}</Badge>,
        <span key={`${contract.contractId}-volume`}>
          {contract.volumeAllocationPercent ?? 100}%
          {contract.allocationRank ? <span className="ml-1 text-xs text-muted-foreground">({contract.allocationRank})</span> : null}
        </span>,
        contract.startDate,
        contract.endDate,
        <Badge key={`${contract.contractId}-type`} variant={contract.createdFrom === "AUCTION_WIN" ? "outline" : "secondary"}>
          {contract.contractKind === "LOT" ? "Lot" : contract.contractKind === "BULK" ? "Bulk" : "Manual"}
        </Badge>,
        <Badge key={`${contract.contractId}-status`} variant={contract.status === "ACTIVE" ? "success" : "warning"}>
          {contract.status}
        </Badge>,
      ])}
      emptyMessage="No contracts yet — upload a CSV or award an auction to this vendor."
      pageSize={10}
    />
  );
}

const EMPTY_CONTRACT_ROW: VendorContractCsvRow = {
  laneCode: "",
  vehicleType: "",
  rate: 0,
  rateType: "PER_TRIP",
  startDate: "",
  endDate: "",
};

/** Validates a contract row; returns an error message or null when valid. */
function validateContractRow(form: VendorContractCsvRow): string | null {
  const laneError = getLaneCodeError(normalizeLaneCode(form.laneCode));
  if (laneError) return laneError;
  if (!form.vehicleType.trim()) return "Vehicle type is required.";
  if (!Number.isFinite(form.rate) || form.rate <= 0) return "Rate must be greater than zero.";
  if (!isValidRateType(form.rateType)) return "Rate type must be PER_TRIP, PER_MT, or PER_KM.";
  if (!form.startDate || !form.endDate) return "Start and end dates are required.";
  if (form.endDate < form.startDate) return "End date must not be before start date.";
  return null;
}

/** Shared add/edit form for one contract row (manual entry). */
export function VendorContractFormDialog({
  open,
  onOpenChange,
  title,
  initial,
  saveLabel = "Save Contract",
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  initial?: VendorContractCsvRow | null;
  saveLabel?: string;
  onSave: (row: VendorContractCsvRow) => void;
}) {
  const [form, setForm] = useState<VendorContractCsvRow>(EMPTY_CONTRACT_ROW);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setForm(initial ? { ...initial } : EMPTY_CONTRACT_ROW);
    setError("");
  }, [open, initial]);

  function save() {
    const validationError = validateContractRow(form);
    if (validationError) return setError(validationError);
    onSave({ ...form, laneCode: normalizeLaneCode(form.laneCode) });
    onOpenChange(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description="Lane must be AAA-BBB; rate type must be PER_TRIP, PER_MT, or PER_KM."
      footer={
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save}>{saveLabel}</Button>
        </div>
      }
    >
      <div className="grid gap-4 md:grid-cols-2">
        {error ? (
          <div className="md:col-span-2 rounded-2xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
        ) : null}
        <ContractField label="Lane">
          <Input
            value={form.laneCode}
            onChange={(event) => setForm((current) => ({ ...current, laneCode: event.target.value.toUpperCase() }))}
            placeholder="MUM-BLR"
            className="font-mono"
          />
        </ContractField>
        <ContractField label="Vehicle Type">
          <Input
            value={form.vehicleType}
            onChange={(event) => setForm((current) => ({ ...current, vehicleType: event.target.value }))}
            placeholder="32FT"
          />
        </ContractField>
        <ContractField label="Rate">
          <Input
            type="number"
            value={form.rate ? String(form.rate) : ""}
            onChange={(event) => setForm((current) => ({ ...current, rate: Number(event.target.value) }))}
            placeholder="45000"
          />
        </ContractField>
        <ContractField label="Rate Type">
          <Select
            value={form.rateType}
            onChange={(event) => setForm((current) => ({ ...current, rateType: event.target.value as RateType }))}
          >
            {RATE_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </Select>
        </ContractField>
        <ContractField label="Start Date">
          <Input type="date" value={form.startDate} onChange={(event) => setForm((current) => ({ ...current, startDate: event.target.value }))} />
        </ContractField>
        <ContractField label="End Date">
          <Input type="date" value={form.endDate} onChange={(event) => setForm((current) => ({ ...current, endDate: event.target.value }))} />
        </ContractField>
      </div>
    </Dialog>
  );
}

/**
 * Editable list of parsed contract rows — used during vendor onboarding so the
 * admin can fix or drop individual CSV rows before the vendor is submitted.
 */
export function EditableVendorContractRows({
  rows,
  onChange,
}: {
  rows: VendorContractCsvRow[];
  onChange: (rows: VendorContractCsvRow[]) => void;
}) {
  const [editIndex, setEditIndex] = useState<number | null>(null);

  return (
    <>
      <DataTable
        title="Contracts to import"
        description="Each row can be edited or removed before the vendor is saved."
        headers={["Lane", "Vehicle Type", "Rate", "Rate Type", "Start Date", "End Date", "Actions"]}
        rows={rows.map((row, index) => [
          <span key={`pending-${index}-lane`} className="font-mono font-semibold">{row.laneCode}</span>,
          row.vehicleType,
          row.rate.toLocaleString("en-IN"),
          <Badge key={`pending-${index}-rate-type`} variant="outline">{getRateTypeLabel(row.rateType)}</Badge>,
          row.startDate,
          row.endDate,
          <div key={`pending-${index}-actions`} className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={() => setEditIndex(index)}>
              <PencilLine className="size-4" />
              Edit
            </Button>
            <Button size="sm" variant="outline" onClick={() => onChange(rows.filter((_, i) => i !== index))}>
              <Trash2 className="size-4" />
              Delete
            </Button>
          </div>,
        ])}
        emptyMessage="No contract rows yet — upload a CSV to add contracts."
        pageSize={10}
      />

      <VendorContractFormDialog
        open={editIndex !== null}
        onOpenChange={(open) => { if (!open) setEditIndex(null); }}
        title="Edit Contract Row"
        initial={editIndex !== null ? rows[editIndex] : null}
        saveLabel="Save Row"
        onSave={(row) => {
          if (editIndex === null) return;
          onChange(rows.map((current, index) => (index === editIndex ? row : current)));
        }}
      />
    </>
  );
}

function ContractField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      {children}
    </div>
  );
}

/**
 * CSV upload dialog. With a `vendor` it uploads immediately (multipart →
 * shared store); with `onRowsParsed` it hands the validated file back so the
 * onboarding flow can persist after the vendor record is created.
 */
export function VendorContractCsvUpload({
  vendor,
  onRowsParsed,
  onUploaded,
}: {
  vendor?: { id: string; name: string; tenantId?: string };
  onRowsParsed?: (file: File, result: VendorContractCsvResult) => void;
  onUploaded?: (created: VendorContract[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [fileName, setFileName] = useState("");
  const [summary, setSummary] = useState<VendorContractCsvResult | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleFile(file: File | null) {
    if (!file) return;
    setError("");
    setSummary(null);
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setError("Only .csv files are accepted.");
      return;
    }
    setBusy(true);
    try {
      const result = parseVendorContractCsv(await file.text());
      setFileName(file.name);
      if (result.headerErrors.length > 0) {
        setError(result.headerErrors.join(" "));
        return;
      }
      setSummary(result);
      if (vendor) {
        const created = await uploadVendorContractsCsv(
          { vendorId: vendor.id, vendorName: vendor.name, tenantId: vendor.tenantId },
          file,
        );
        onUploaded?.(created);
      } else {
        onRowsParsed?.(file, result);
      }
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Contract CSV could not be processed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={downloadVendorContractCsvTemplate}>
          <FileDown className="size-4" />
          Download Template
        </Button>
        <Button onClick={() => setOpen(true)}>
          <Upload className="size-4" />
          Upload Contracts CSV
        </Button>
      </div>

      <Dialog
        open={open}
        onOpenChange={setOpen}
        title="Upload Vendor Contracts"
        description="CSV only. Headers must be exactly: lane,vehicleType,rate,rateType,startDate,endDate — no customer column."
        footer={
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => setOpen(false)}>Close</Button>
          </div>
        }
      >
        <div className="grid gap-4">
          <label className="inline-flex w-fit cursor-pointer items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
            <Upload className="size-4" />
            Choose CSV file
            <input
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(event) => {
                void handleFile(event.target.files?.[0] ?? null);
                event.target.value = "";
              }}
            />
          </label>
          <p className="text-xs text-muted-foreground">
            Lane must be in AAA-BBB format (e.g. MUM-BLR). Rate type must be PER_TRIP, PER_MT, or PER_KM.
          </p>
          {busy ? <p className="text-sm text-muted-foreground">Validating uploaded file...</p> : null}
          {fileName && !busy ? <p className="text-sm font-medium">{fileName}</p> : null}
          {error ? (
            <div className="rounded-2xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
          ) : null}
          {summary ? (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-emerald-300 bg-emerald-50 p-4">
                <p className="font-medium text-emerald-900">Valid rows</p>
                <p className="mt-1 text-sm text-emerald-800">
                  {summary.validRows.length} contract{summary.validRows.length === 1 ? "" : "s"}
                  {vendor ? " imported." : " ready — saved when the vendor is submitted."}
                </p>
              </div>
              <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4">
                <p className="font-medium text-amber-900">Invalid rows</p>
                <p className="mt-1 text-sm text-amber-800">{summary.invalidRows.length} rows skipped.</p>
              </div>
              {summary.invalidRows.length ? (
                <div className="md:col-span-2 rounded-2xl border border-amber-300 bg-amber-50 p-4">
                  <p className="font-medium text-amber-900">Validation errors</p>
                  <div className="mt-3 space-y-2">
                    {summary.invalidRows.slice(0, 5).map((row) => (
                      <div key={`contract-import-invalid-${row.rowNumber}`} className="rounded-xl border border-amber-200 bg-white/70 px-3 py-2 text-sm text-amber-900">
                        <span className="font-medium">Row {row.rowNumber}:</span> {row.errors.join(" ")}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </Dialog>
    </>
  );
}
