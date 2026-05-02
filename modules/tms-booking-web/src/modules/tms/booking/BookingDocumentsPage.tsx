import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { PageHeader } from "../../../components/common/page-header";
import { TenantEmptyState, TenantPanel, TenantSummaryCard } from "../../../components/tenant/tenant-primitives";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { useTenantRouteContext } from "../../../hooks/useTenantRouteContext";
import { useBookingPaths } from "../../../hooks/useBookingPaths";
import { useBookingAdminSources } from "./hooks/useBookingAdminSources";
import { useTenantBookings } from "./hooks/useTenantBookings";
import { normalizeBookingId } from "./services/booking-engine";
import {
  buildAddressLookup,
  buildCustomerLookup,
  buildMaterialLookup,
  buildVehicleLookup,
} from "./services/booking-selectors";
import {
  buildInvoiceDocumentSnapshots,
  calculateShipmentDocumentFreight,
  ensureShipmentDocuments,
  parseEwayBill,
  parseInvoice,
  sumDeliveryInvoiceTotals,
} from "./services/shipment-documents";
import type {
  BookingDeliveryShipmentDocuments,
  BookingInvoiceSnapshot,
  BookingShipmentDocuments,
} from "./types";

const stepOrder = [
  { status: "VEHICLE_ASSIGNED", label: "Vehicle Assigned" },
  { status: "LOADING_STARTED", label: "Loading Started" },
  { status: "LOADING_COMPLETED", label: "Loading Completed" },
  { status: "DOCUMENT_PENDING", label: "Document Pending" },
  { status: "DOCUMENT_COMPLETED", label: "Document Completed" },
] as const;

export function BookingDocumentsPage() {
  const navigate = useNavigate();
  const { bookingId } = useParams();
  const { tenant } = useTenantRouteContext();
  const paths = useBookingPaths();
  const { getBookingById, updateBooking, transitionBooking } = useTenantBookings(tenant.id);
  const adminSources = useBookingAdminSources(tenant.id);
  const [documentDraft, setDocumentDraft] = useState<BookingShipmentDocuments | null>(null);
  const [freightPreview, setFreightPreview] = useState<ReturnType<typeof calculateShipmentDocumentFreight> | null>(null);
  const [expandedDeliveryId, setExpandedDeliveryId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const normalizedRouteBookingId = normalizeBookingId(bookingId);
  const booking = bookingId ? getBookingById(normalizedRouteBookingId) : null;
  const customerMap = useMemo(() => buildCustomerLookup(adminSources.customers), [adminSources.customers]);
  const addressMap = useMemo(
    () => buildAddressLookup(Array.from(adminSources.customerAddressMap.values()).flat()),
    [adminSources.customerAddressMap],
  );
  const materialMap = useMemo(() => buildMaterialLookup(adminSources.materials), [adminSources.materials]);
  const vehicleMap = useMemo(() => buildVehicleLookup(adminSources.vehicles), [adminSources.vehicles]);

  useEffect(() => {
    if (!booking) {
      return;
    }
    const nextDraft = ensureShipmentDocuments(booking);
    setDocumentDraft(nextDraft);
    setExpandedDeliveryId(nextDraft.deliveries[0]?.deliveryId ?? null);
    setError("");
  }, [booking]);

  useEffect(() => {
    console.log("[BookingDocuments] route bookingId:", bookingId, "normalized:", normalizedRouteBookingId);
    console.log("[BookingDocuments] store booking id:", booking?.id ?? null, "booking no:", booking?.bookingId ?? null, "status:", booking?.status ?? null);
  }, [booking?.bookingId, booking?.id, booking?.status, bookingId, normalizedRouteBookingId]);

  useEffect(() => {
    if (!booking || !documentDraft) {
      return;
    }
    const timeoutId = window.setTimeout(() => {
      setFreightPreview(
        calculateShipmentDocumentFreight({
          booking,
          customer: customerMap.get(booking.customerId) ?? null,
          addressMap,
          rateCards: adminSources.rateCards,
          shipmentDocuments: documentDraft,
          vehicleTypeCode: booking.vehicleTypeId
            ? adminSources.vehicleTypes.find((item) => item.id === booking.vehicleTypeId)?.typeCode ?? null
            : null,
        }),
      );
    }, 300);
    return () => window.clearTimeout(timeoutId);
  }, [addressMap, adminSources.rateCards, adminSources.vehicleTypes, booking, customerMap, documentDraft]);

  if (!booking) {
    return (
      <TenantEmptyState
        title="Booking not found"
        description="Selected booking is unavailable."
        action={
          <Button asChild>
            <Link to={paths.bookings}>Back to bookings</Link>
          </Button>
        }
      />
    );
  }

  const bookingRecord = booking;
  if (!["LOADING_COMPLETED", "DOCUMENT_PENDING", "DOCUMENT_COMPLETED"].includes(bookingRecord.status)) {
    return (
      <TenantEmptyState
        title="Documents stage locked"
        description="Invoice and E-Way Bill capture becomes available after loading is completed."
        action={
          <Button asChild>
            <Link to={paths.booking(bookingRecord.id)}>Back to booking</Link>
          </Button>
        }
      />
    );
  }
  const customer = customerMap.get(bookingRecord.customerId) ?? null;
  const shipmentDocuments = documentDraft ?? ensureShipmentDocuments(bookingRecord);
  const assignedVehicle = bookingRecord.assignment?.vehicleId ? vehicleMap.get(bookingRecord.assignment.vehicleId) ?? null : null;
  const finalWeight = shipmentDocuments.deliveries.reduce((sum, delivery) => sum + sumDeliveryInvoiceTotals(delivery).weight, 0);
  const finalQuantity = shipmentDocuments.deliveries.reduce((sum, delivery) => sum + sumDeliveryInvoiceTotals(delivery).quantity, 0);

  function updateShipmentDocuments(updater: (current: BookingShipmentDocuments) => BookingShipmentDocuments) {
    setDocumentDraft((current) => updater(current ?? ensureShipmentDocuments(bookingRecord)));
    setError("");
  }

  function updateDeliveryDocuments(
    deliveryId: string,
    updater: (current: BookingDeliveryShipmentDocuments) => BookingDeliveryShipmentDocuments,
  ) {
    updateShipmentDocuments((current) => ({
      ...current,
      deliveries: current.deliveries.map((delivery) => (delivery.deliveryId === deliveryId ? updater(delivery) : delivery)),
    }));
  }

  async function handleInvoiceUpload(deliveryId: string, file: File | null) {
    if (!file) {
      return;
    }
    const parsed = await parseInvoice(file);
    const invoice: BookingInvoiceSnapshot = {
      id: `invoice-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      uploadedAt: new Date().toISOString(),
      ...parsed,
    };
    updateDeliveryDocuments(deliveryId, (current) => ({
      ...current,
      invoices: [...current.invoices, invoice],
    }));
  }

  async function handleEwayUpload(deliveryId: string, file: File | null) {
    if (!file) {
      return;
    }
    const parsed = await parseEwayBill(file);
    updateDeliveryDocuments(deliveryId, (current) => ({
      ...current,
      ewayBill: {
        fileName: parsed.fileName,
        ewayBillNumber: parsed.ewayBillNumber,
        validFromDate: parsed.validFromDate,
        validFromTime: parsed.validFromTime,
        validToDate: parsed.validToDate,
        validToTime: parsed.validToTime,
        uploadedAt: new Date().toISOString(),
      },
    }));
  }

  function updateInvoiceField(
    deliveryId: string,
    invoiceId: string,
    field: keyof BookingInvoiceSnapshot,
    value: string,
  ) {
    updateDeliveryDocuments(deliveryId, (current) => ({
      ...current,
      invoices: current.invoices.map((invoice) =>
        invoice.id === invoiceId
          ? {
              ...invoice,
              [field]:
                field === "invoiceValue" || field === "quantity" || field === "weight"
                  ? Number(value) || null
                  : value,
            }
          : invoice,
      ),
    }));
  }

  function updateEwayField(
    deliveryId: string,
    field: "fileName" | "ewayBillNumber" | "validFromDate" | "validFromTime" | "validToDate" | "validToTime",
    value: string,
  ) {
    updateDeliveryDocuments(deliveryId, (current) => ({
      ...current,
      ewayBill: {
        fileName: current.ewayBill?.fileName ?? "",
        ewayBillNumber: current.ewayBill?.ewayBillNumber ?? "",
        validFromDate: current.ewayBill?.validFromDate ?? null,
        validFromTime: current.ewayBill?.validFromTime ?? null,
        validToDate: current.ewayBill?.validToDate ?? null,
        validToTime: current.ewayBill?.validToTime ?? null,
        uploadedAt: current.ewayBill?.uploadedAt ?? new Date().toISOString(),
        [field]: value,
      },
    }));
  }

  function removeInvoice(deliveryId: string, invoiceId: string) {
    updateDeliveryDocuments(deliveryId, (current) => ({
      ...current,
      invoices: current.invoices.filter((invoice) => invoice.id !== invoiceId),
    }));
  }

  function submitDocuments() {
    const errors = shipmentDocuments.deliveries.flatMap((delivery) => {
      const deliveryErrors: string[] = [];
      if (!delivery.invoices.length) {
        deliveryErrors.push("Invoice upload is required for every delivery.");
      }
      if (!delivery.ewayBill?.fileName.trim() || !delivery.ewayBill?.ewayBillNumber.trim()) {
        deliveryErrors.push("EWB upload is required for every delivery.");
      }
      delivery.invoices.forEach((invoice) => {
        if (!invoice.fileName.trim() || !invoice.invoiceNumber.trim() || !invoice.invoiceDate || !invoice.material.trim()) {
          deliveryErrors.push("Complete all required invoice fields before submit.");
        }
        if ((Number(invoice.weight) || 0) <= 0) {
          deliveryErrors.push("Invoice weight is required.");
        }
      });
      return deliveryErrors;
    });

    if (errors.length) {
      setError(errors[0] ?? "Complete all required fields.");
      return;
    }

    const timestamp = new Date().toISOString();
    const lrNumber = bookingRecord.assignment?.lrNumber ?? bookingRecord.bookingId.replace("BKG", "LR");
    const nextDocuments = [
      ...(bookingRecord.documents ?? []).filter((document) => document.type !== "INVOICE" && document.type !== "EWAY_BILL"),
      ...shipmentDocuments.deliveries.flatMap((delivery) => {
        const deliveryRecord = bookingRecord.deliveries?.find((item) => item.id === delivery.deliveryId);
        return deliveryRecord ? buildInvoiceDocumentSnapshots(bookingRecord.bookingId, deliveryRecord, delivery) : [];
      }),
    ];
    const nextDeliveries = (bookingRecord.deliveries ?? []).map((delivery) => {
      const deliveryDocuments = shipmentDocuments.deliveries.find((item) => item.deliveryId === delivery.id);
      const totals = deliveryDocuments ? sumDeliveryInvoiceTotals(deliveryDocuments) : { quantity: delivery.quantity ?? 0, weight: delivery.weight ?? 0 };
      return {
        ...delivery,
        quantity: totals.quantity || delivery.quantity,
        weight: totals.weight || delivery.weight,
        lrNumber,
      };
    });
    const nextShipmentDocuments: BookingShipmentDocuments = {
      ...shipmentDocuments,
      totalFreightRate: freightPreview?.totalFreightRate ?? bookingRecord.pricing.calculatedFreight,
      freightStatus: freightPreview?.freightStatus ?? "READY",
      freightMessage: freightPreview?.freightMessage ?? null,
      submittedAt: timestamp,
      deliveries: shipmentDocuments.deliveries.map((delivery) => ({
        ...delivery,
        freightRate: freightPreview?.deliveryRates.get(delivery.deliveryId) ?? null,
      })),
      lr: {
        number: lrNumber,
        generatedAt: timestamp,
        viewMode: shipmentDocuments.lr?.viewMode ?? "COMBINED",
        extraCharges: shipmentDocuments.lr?.extraCharges ?? 0,
        advance: shipmentDocuments.lr?.advance ?? 0,
      },
    };

    updateBooking(bookingRecord.id, {
      status: "DOCUMENT_COMPLETED",
      documents: nextDocuments,
      shipmentDocuments: nextShipmentDocuments,
      quantity: finalQuantity || bookingRecord.quantity,
      weight: finalWeight || bookingRecord.weight,
      pricing: {
        ...bookingRecord.pricing,
        calculatedFreight: nextShipmentDocuments.totalFreightRate ?? bookingRecord.pricing.calculatedFreight,
      },
      assignment: bookingRecord.assignment
        ? {
            ...bookingRecord.assignment,
            lrNumber,
          }
        : bookingRecord.assignment,
      deliveries: nextDeliveries,
    });
    if (bookingRecord.status !== "DOCUMENT_COMPLETED") {
      transitionBooking(bookingRecord.id, {
        status: "DOCUMENT_COMPLETED",
        actor: "Ops",
        note: "Invoice and E-Way Bill submitted. LR generated.",
      });
    }
    navigate(paths.bookingLR(bookingRecord.id));
  }

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="TMS"
        title={`Invoice & E-Way Bill - ${bookingRecord.bookingId}`}
        description="Single-page document capture for all deliveries after loading completion."
        action={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link to={paths.booking(bookingRecord.id)}>Back to booking</Link>
            </Button>
            {bookingRecord.shipmentDocuments?.lr?.number ? (
              <Button asChild variant="outline">
                <Link to={paths.bookingLR(bookingRecord.id)}>Open LR</Link>
              </Button>
            ) : null}
          </div>
        }
      />

      <TenantPanel title="Timeline" description="Strict step-by-step progression.">
        <StepTimeline currentStatus={bookingRecord.status} />
      </TenantPanel>

      <div className="grid gap-3 md:grid-cols-4">
        <TenantSummaryCard label="Vehicle" value={assignedVehicle?.registrationNumber ?? bookingRecord.assignment?.vehicleLabel ?? "-"} helper="Assigned vehicle" />
        <TenantSummaryCard label="Deliveries" value={String(bookingRecord.deliveries?.length ?? 0)} helper="All deliveries on one page" />
        <TenantSummaryCard label="Final Quantity" value={String(finalQuantity || 0)} helper="Sum of invoice quantities" />
        <TenantSummaryCard label="Updated Freight" value={freightPreview?.totalFreightRate != null ? `₹${freightPreview.totalFreightRate.toLocaleString()}` : "-"} helper={freightPreview?.freightMessage ?? "Rate refreshes after document edits"} />
      </div>

      {error ? (
        <div className="rounded-xl border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-danger">{error}</div>
      ) : null}

      <TenantPanel title="Deliveries" description="Scrollable single page with expandable delivery cards.">
        <div className="max-h-[70vh] space-y-3 overflow-y-auto pr-2">
          {(bookingRecord.deliveries ?? []).map((delivery) => {
            const deliveryDocuments = shipmentDocuments.deliveries.find((item) => item.deliveryId === delivery.id);
            if (!deliveryDocuments) {
              return null;
            }
            const totals = sumDeliveryInvoiceTotals(deliveryDocuments);
            const isOpen = expandedDeliveryId === delivery.id;
            return (
              <div key={delivery.id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-3 text-left"
                  onClick={() => setExpandedDeliveryId((current) => (current === delivery.id ? null : delivery.id))}
                >
                  <div>
                    <p className="text-sm font-semibold">{delivery.trackingId}</p>
                    <p className="mt-1 text-sm text-slate-600">
                      {addressMap.get(delivery.originAddressId)?.addressName ?? "-"} → {addressMap.get(delivery.destinationAddressId)?.addressName ?? "-"}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{materialMap.get(delivery.materialId)?.materialCode ?? "-"}</Badge>
                    <Badge variant={deliveryDocuments.invoices.length ? "success" : "warning"}>{deliveryDocuments.invoices.length ? "Invoice Ready" : "Invoice Pending"}</Badge>
                    <Badge variant={deliveryDocuments.ewayBill?.ewayBillNumber ? "success" : "warning"}>{deliveryDocuments.ewayBill?.ewayBillNumber ? "EWB Ready" : "EWB Pending"}</Badge>
                  </div>
                </button>
                {isOpen ? (
                  <div className="mt-4 space-y-4">
                    <SectionCard title="Invoice">
                      <div className="flex flex-wrap gap-2">
                        <label className="inline-flex cursor-pointer items-center">
                          <input
                            type="file"
                            accept=".pdf,.txt"
                            className="hidden"
                            onChange={(event) => {
                              void handleInvoiceUpload(delivery.id, event.target.files?.[0] ?? null);
                              event.target.value = "";
                            }}
                          />
                          <span className="inline-flex rounded-full border border-border/70 bg-white px-3 py-2 text-xs font-medium">Upload Invoice</span>
                        </label>
                      </div>
                      <div className="mt-3 space-y-3">
                        {deliveryDocuments.invoices.length ? (
                          deliveryDocuments.invoices.map((invoice, index) => (
                            <div key={invoice.id} className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                              <div className="mb-3 flex items-center justify-between">
                                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Invoice {index + 1}</p>
                                <Button size="sm" variant="ghost" onClick={() => removeInvoice(delivery.id, invoice.id)}>Remove</Button>
                              </div>
                              <div className="grid gap-3 md:grid-cols-2">
                                <Field label="Upload Invoice*"><Input value={invoice.fileName} onChange={(event) => updateInvoiceField(delivery.id, invoice.id, "fileName", event.target.value)} /></Field>
                                <Field label="Invoice Number*"><Input value={invoice.invoiceNumber} onChange={(event) => updateInvoiceField(delivery.id, invoice.id, "invoiceNumber", event.target.value)} /></Field>
                                <Field label="Date*"><Input type="date" value={invoice.invoiceDate ?? ""} onChange={(event) => updateInvoiceField(delivery.id, invoice.id, "invoiceDate", event.target.value)} /></Field>
                                <Field label="Value*"><Input type="number" value={invoice.invoiceValue ?? ""} onChange={(event) => updateInvoiceField(delivery.id, invoice.id, "invoiceValue", event.target.value)} /></Field>
                                <Field label="Material*"><Input value={invoice.material} onChange={(event) => updateInvoiceField(delivery.id, invoice.id, "material", event.target.value)} /></Field>
                                <Field label="Quantity*"><Input type="number" value={invoice.quantity ?? ""} onChange={(event) => updateInvoiceField(delivery.id, invoice.id, "quantity", event.target.value)} /></Field>
                                <Field label="Quantity UOM*"><Input value={invoice.quantityUOM ?? ""} onChange={(event) => updateInvoiceField(delivery.id, invoice.id, "quantityUOM", event.target.value)} /></Field>
                                <Field label="Weight*"><Input type="number" value={invoice.weight ?? ""} onChange={(event) => updateInvoiceField(delivery.id, invoice.id, "weight", event.target.value)} /></Field>
                                <Field label="Weight UOM*"><Input value={invoice.weightUOM ?? ""} onChange={(event) => updateInvoiceField(delivery.id, invoice.id, "weightUOM", event.target.value)} /></Field>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="rounded-xl border border-dashed px-3 py-4 text-xs text-muted-foreground">No invoice uploaded yet.</div>
                        )}
                      </div>
                    </SectionCard>

                    <SectionCard title="E-Way Bill">
                      <label className="inline-flex cursor-pointer items-center">
                        <input
                          type="file"
                          accept=".pdf,.txt"
                          className="hidden"
                          onChange={(event) => {
                            void handleEwayUpload(delivery.id, event.target.files?.[0] ?? null);
                            event.target.value = "";
                          }}
                        />
                        <span className="inline-flex rounded-full border border-border/70 bg-white px-3 py-2 text-xs font-medium">Upload EWB</span>
                      </label>
                      <div className="mt-3 grid gap-3 md:grid-cols-2">
                        <Field label="EWB File*"><Input value={deliveryDocuments.ewayBill?.fileName ?? ""} onChange={(event) => updateEwayField(delivery.id, "fileName", event.target.value)} /></Field>
                        <Field label="EWB Number*"><Input value={deliveryDocuments.ewayBill?.ewayBillNumber ?? ""} onChange={(event) => updateEwayField(delivery.id, "ewayBillNumber", event.target.value)} /></Field>
                        <Field label="Valid From"><Input type="date" value={deliveryDocuments.ewayBill?.validFromDate ?? ""} onChange={(event) => updateEwayField(delivery.id, "validFromDate", event.target.value)} /></Field>
                        <Field label="Valid To"><Input type="date" value={deliveryDocuments.ewayBill?.validToDate ?? ""} onChange={(event) => updateEwayField(delivery.id, "validToDate", event.target.value)} /></Field>
                      </div>
                    </SectionCard>

                    <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-3 text-sm text-muted-foreground">
                      <p className="font-medium text-text">Delivery Totals</p>
                      <p className="mt-1">Quantity: {totals.quantity}</p>
                      <p>Weight: {totals.weight}</p>
                      <p>Invoice Value: ₹{totals.invoiceValue.toLocaleString()}</p>
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </TenantPanel>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div>
          <p className="text-sm font-semibold">Updated Freight</p>
          <p className="mt-1 text-lg font-semibold text-text">
            {freightPreview?.totalFreightRate != null ? `₹${freightPreview.totalFreightRate.toLocaleString()}` : "Pending"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{freightPreview?.freightMessage ?? "Freight updates in real time."}</p>
        </div>
        <Button onClick={submitDocuments}>Submit Documents</Button>
      </div>
    </div>
  );
}

function StepTimeline({ currentStatus }: { currentStatus: string }) {
  const currentIndex = stepOrder.findIndex((step) => step.status === currentStatus);

  return (
    <div className="grid gap-3 md:grid-cols-5">
      {stepOrder.map((step, index) => (
        <div key={step.status} className={`rounded-xl border px-4 py-3 ${index <= currentIndex ? "border-success/20 bg-success/10" : "border-gray-200 bg-white"}`}>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Step {index + 1}</p>
          <p className="mt-1 text-sm font-semibold text-text">{step.label}</p>
        </div>
      ))}
    </div>
  );
}

function SectionCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <p className="text-base font-bold text-text">{title}</p>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</label>
      {children}
    </div>
  );
}
