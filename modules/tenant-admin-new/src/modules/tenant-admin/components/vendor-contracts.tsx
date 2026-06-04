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
  getContractSourceLabel,
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
      headers={["Lane", "Vehicle Type", "Rate", "Rate Type", "Volume", "Start Date", "End Date", "Source", "Status"]}
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
        <Badge key={`${contract.contractId}-source`} variant={contract.createdFrom === "AUCTION_WIN" ? "outline" : "secondary"}>
          {getContractSourceLabel(contract.createdFrom)}
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
  const [form, setForm] = useState<VendorContractCsvRow | null>(null);
  const [error, setError] = useState("");

  function openEdit(index: number) {
    setForm({ ...rows[index] });
    setEditIndex(index);
    setError("");
  }

  function saveEdit() {
    if (editIndex === null || !form) return;
    const laneCode = normalizeLaneCode(form.laneCode);
    const laneError = getLaneCodeError(laneCode);
    if (laneError) return setError(laneError);
    if (!form.vehicleType.trim()) return setError("Vehicle type is required.");
    if (!Number.isFinite(form.rate) || form.rate <= 0) return setError("Rate must be greater than zero.");
    if (!isValidRateType(form.rateType)) return setError("Rate type must be PER_TRIP, PER_MT, or PER_KM.");
    if (!form.startDate || !form.endDate) return setError("Start and end dates are required.");
    if (form.endDate < form.startDate) return setError("End date must not be before start date.");
    onChange(rows.map((row, index) => (index === editIndex ? { ...form, laneCode } : row)));
    setEditIndex(null);
  }

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
            <Button size="sm" variant="ghost" onClick={() => openEdit(index)}>
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

      <Dialog
        open={editIndex !== null}
        onOpenChange={(open) => { if (!open) setEditIndex(null); }}
        title="Edit Contract Row"
        description="Lane must be AAA-BBB; rate type must be PER_TRIP, PER_MT, or PER_KM."
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setEditIndex(null)}>Cancel</Button>
            <Button onClick={saveEdit}>Save Row</Button>
          </div>
        }
      >
        {form ? (
          <div className="grid gap-4 md:grid-cols-2">
            {error ? (
              <div className="md:col-span-2 rounded-2xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
            ) : null}
            <ContractField label="Lane">
              <Input
                value={form.laneCode}
                onChange={(event) => setForm((current) => current && { ...current, laneCode: event.target.value.toUpperCase() })}
                placeholder="MUM-BLR"
                className="font-mono"
              />
            </ContractField>
            <ContractField label="Vehicle Type">
              <Input value={form.vehicleType} onChange={(event) => setForm((current) => current && { ...current, vehicleType: event.target.value })} />
            </ContractField>
            <ContractField label="Rate">
              <Input
                type="number"
                value={String(form.rate)}
                onChange={(event) => setForm((current) => current && { ...current, rate: Number(event.target.value) })}
              />
            </ContractField>
            <ContractField label="Rate Type">
              <Select
                value={form.rateType}
                onChange={(event) => setForm((current) => current && { ...current, rateType: event.target.value as RateType })}
              >
                {RATE_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </Select>
            </ContractField>
            <ContractField label="Start Date">
              <Input type="date" value={form.startDate} onChange={(event) => setForm((current) => current && { ...current, startDate: event.target.value })} />
            </ContractField>
            <ContractField label="End Date">
              <Input type="date" value={form.endDate} onChange={(event) => setForm((current) => current && { ...current, endDate: event.target.value })} />
            </ContractField>
          </div>
        ) : null}
      </Dialog>
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
