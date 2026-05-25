import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { PageHeader } from "@/shared/components/common/page-header";
import { TenantEmptyState, TenantPanel, TenantSummaryCard } from "@/modules/tenant-admin/components/tenant-primitives";
import { useTenantCustomers } from "@/modules/tenant-admin/hooks/useTenantCustomers";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Select } from "@/shared/components/ui/select";
import { useTenantRouteContext } from "@/modules/tenant-admin/hooks/useTenantRouteContext";
import { useBookingAdminSources } from "./hooks/useBookingAdminSources";
import { useTenantBookings } from "./hooks/useTenantBookings";
import { normalizeBookingId } from "@/modules/tms/booking/services/booking-engine";
import { formatCurrency } from "@/shared/lib/format-currency";
import {
  buildAddressLookup,
  buildCustomerLookup,
  buildMaterialLookup,
  buildVehicleLookup,
} from "@/modules/tms/booking/services/booking-selectors";
import {
  aggregateDeliveryInvoiceActuals,
  buildInvoiceDocumentSnapshots,
  calculateShipmentDocumentFreight,
  compareAddressSimilarity,
  ensureShipmentDocuments,
  getLastDocumentParseDebug,
  parseEwayBill,
  parseInvoice,
  sumDeliveryInvoiceTotals,
} from "@/modules/tms/booking/services/shipment-documents";
import type {
  BookingAddressComparisonResult,
  BookingConsigneeSnapshot,
  BookingDeliveryRecord,
  BookingDeliveryShipmentDocuments,
  BookingInvoiceSnapshot,
  BookingShipmentDocuments,
} from "@/modules/tms/booking/types";
import type { CustomerAddressTag, TenantCustomerAddress, TenantCustomerAddressInput } from "@/types/customer";

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
  const { getBookingById, updateBooking, transitionBooking } = useTenantBookings(tenant.id);
  const { createAddress } = useTenantCustomers(tenant.id);
  const adminSources = useBookingAdminSources(tenant.id);
  const [documentDraft, setDocumentDraft] = useState<BookingShipmentDocuments | null>(null);
  const [freightPreview, setFreightPreview] = useState<ReturnType<typeof calculateShipmentDocumentFreight> | null>(null);
  const [expandedDeliveryId, setExpandedDeliveryId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [debugParseText, setDebugParseText] = useState("");

  const normalizedRouteBookingId = normalizeBookingId(bookingId);
  const routeBookingKey = normalizedRouteBookingId || bookingId || "";
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
            <Link to={`/tenant/${tenant.id}/bookings`}>Back to bookings</Link>
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
            <Link to={`/tenant/${tenant.id}/bookings/${bookingRecord.id}`}>Back to booking</Link>
          </Button>
        }
      />
    );
  }

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
      deliveries: current.deliveries.map((delivery) =>
        delivery.deliveryId === deliveryId ? aggregateDeliveryInvoiceActuals(updater(delivery)) : delivery,
      ),
    }));
  }

  async function handleInvoiceUpload(deliveryId: string, file: File | null) {
    if (!file) {
      return;
    }
    let parsed: Awaited<ReturnType<typeof parseInvoice>>;
    try {
      parsed = await parseInvoice(file);
      setError("");
      const debugSnapshot = getLastDocumentParseDebug();
      setDebugParseText(debugSnapshot?.extractedText ?? "");
    } catch (parseError) {
      console.error("[BookingDocuments] invoice parse failed", parseError);
      setError("Unable to read PDF. Please enter details manually.");
      const debugSnapshot = getLastDocumentParseDebug();
      setDebugParseText(debugSnapshot?.extractedText ?? "");
      parsed = {
        fileName: file.name,
        invoiceNumber: "",
        invoiceValue: null,
        invoiceDate: null,
        material: "",
        subBrand: null,
        quantity: null,
        quantityUOM: null,
        weight: null,
        weightUOM: null,
        extractedAt: new Date().toISOString(),
      };
    }

    const invoice: BookingInvoiceSnapshot = {
      id: `invoice-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      uploadedAt: new Date().toISOString(),
      ...parsed,
    };
    console.log("PARSED_DATA:", invoice);

    updateDeliveryDocuments(deliveryId, (current) => ({
      ...current,
      invoices: [...current.invoices, invoice],
      extractedConsignee: deriveExtractedConsigneeSnapshotFromInvoices([...current.invoices, invoice]),
    }));
  }

  async function handleEwayUpload(deliveryId: string, file: File | null) {
    if (!file) {
      return;
    }
    let parsed: Awaited<ReturnType<typeof parseEwayBill>>;
    try {
      parsed = await parseEwayBill(file);
      setError("");
      const debugSnapshot = getLastDocumentParseDebug();
      setDebugParseText(debugSnapshot?.extractedText ?? "");
    } catch (parseError) {
      console.error("[BookingDocuments] eway parse failed", parseError);
      setError("Unable to read PDF. Please enter details manually.");
      const debugSnapshot = getLastDocumentParseDebug();
      setDebugParseText(debugSnapshot?.extractedText ?? "");
      parsed = {
        fileName: file.name,
        ewayBillNumber: "",
        validFromDate: null,
        validFromTime: null,
        validToDate: null,
        validToTime: null,
      };
    }

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
    console.log("PARSED_DATA:", parsed);
  }

  function updateInvoiceField(
    deliveryId: string,
    invoiceId: string,
    field: keyof BookingInvoiceSnapshot,
    value: string,
  ) {
    updateDeliveryDocuments(deliveryId, (current) => {
      const nextInvoices = current.invoices.map((invoice) =>
        invoice.id === invoiceId
          ? {
              ...invoice,
              [field]:
                field === "invoiceValue" || field === "quantity" || field === "weight"
                  ? Number(value) || null
                  : value,
            }
          : invoice,
      );
      return {
        ...current,
        invoices: nextInvoices,
        extractedConsignee: deriveExtractedConsigneeSnapshotFromInvoices(nextInvoices),
      };
    });
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
      extractedConsignee:
        deriveExtractedConsigneeSnapshotFromInvoices(
          current.invoices.filter((invoice) => invoice.id !== invoiceId),
        ),
    }));
  }

  function updateConsigneeChoice(
    deliveryId: string,
    updater: (
      current: BookingDeliveryShipmentDocuments,
      deliveryRecord: BookingDeliveryRecord | undefined,
    ) => BookingDeliveryShipmentDocuments,
  ) {
    updateShipmentDocuments((current) => ({
      ...current,
      deliveries: current.deliveries.map((deliveryDocuments) => {
        if (deliveryDocuments.deliveryId !== deliveryId) {
          return deliveryDocuments;
        }
        const deliveryRecord = bookingRecord.deliveries?.find((item) => item.id === deliveryId);
        return updater(deliveryDocuments, deliveryRecord);
      }),
    }));
  }

  function updateExtractedConsigneeField(
    deliveryId: string,
    field: keyof BookingConsigneeSnapshot,
    value: string,
  ) {
    updateDeliveryDocuments(deliveryId, (current) => ({
      ...current,
      extractedConsignee: {
        name: current.extractedConsignee?.name ?? "",
        addressLine: current.extractedConsignee?.addressLine ?? "",
        city: current.extractedConsignee?.city ?? "",
        pincode: current.extractedConsignee?.pincode ?? "",
        gstin: current.extractedConsignee?.gstin ?? null,
        [field]: value,
      },
    }));
  }

  function safeTransitionBooking(
    bookingKey: string,
    targetStatus: "DOCUMENT_COMPLETED" | "READY_FOR_DISPATCH" | "DISPATCHED" | "IN_TRANSIT",
    note: string,
  ) {
    const latestBooking = bookingKey ? getBookingById(bookingKey) : null;
    if (!latestBooking) {
      console.warn("[BookingDocuments] transition skipped; booking missing", {
        bookingKey,
        targetStatus,
      });
      return null;
    }
    if (latestBooking.status === targetStatus) {
      return latestBooking;
    }
    try {
      return transitionBooking(latestBooking.id, {
        status: targetStatus,
        actor: "System",
        note,
      });
    } catch (transitionError) {
      console.warn("[BookingDocuments] transition failed", {
        bookingKey,
        targetStatus,
        error: transitionError,
      });
      return null;
    }
  }

  function submitDocuments() {
    if (isSubmitting) {
      return;
    }

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

    setIsSubmitting(true);
    try {
      const latestBooking = routeBookingKey ? getBookingById(routeBookingKey) : null;
      if (!latestBooking) {
        console.warn("[BookingDocuments] submit skipped; booking missing", {
          routeBookingKey,
          bookingId,
        });
        setError("Unable to update booking. Please retry.");
        setIsSubmitting(false);
        return;
      }

      const timestamp = new Date().toISOString();
      const nextDocuments = [
        ...(latestBooking.documents ?? []).filter((document) => document.type !== "INVOICE" && document.type !== "EWAY_BILL"),
        ...shipmentDocuments.deliveries.flatMap((delivery) => {
          const deliveryRecord = latestBooking.deliveries?.find((item) => item.id === delivery.deliveryId);
          return deliveryRecord ? buildInvoiceDocumentSnapshots(latestBooking.bookingId, deliveryRecord, delivery) : [];
        }),
      ];
      const existingLrNumber =
        latestBooking.deliveries?.find((delivery) => delivery.lrNumber)?.lrNumber ??
        latestBooking.assignment?.lrNumber ??
        latestBooking.bookingId.replace("BKG", "LR");
      const nextDeliveries = (latestBooking.deliveries ?? []).map((delivery) => {
        const deliveryDocuments = shipmentDocuments.deliveries.find((item) => item.deliveryId === delivery.id);
        const totals = deliveryDocuments ? sumDeliveryInvoiceTotals(deliveryDocuments) : { quantity: delivery.quantity ?? 0, weight: delivery.weight ?? 0 };
        const resolvedDestination = resolveFinalDestinationAddress(
          latestBooking.customerId,
          delivery,
          deliveryDocuments,
          addressMap,
          createAddress,
        );
        return {
          ...delivery,
          destinationCity: resolvedDestination.city ?? delivery.destinationCity ?? null,
          destinationAddressId: resolvedDestination.addressId ?? delivery.destinationAddressId,
          destinationAddressSource:
            resolvedDestination.addressId || delivery.destinationAddressSource === "SAVED_ADDRESS"
              ? ("SAVED_ADDRESS" as const)
              : ("FROM_INVOICE_LATER" as const),
          consigneeFinalizationStatus:
            resolvedDestination.confirmed ? "CONFIRMED" : delivery.consigneeFinalizationStatus ?? "PENDING",
          quantity: totals.quantity || delivery.quantity,
          weight: totals.weight || delivery.weight,
          lrNumber: delivery.lrNumber ?? null,
          lrId: delivery.lrId ?? null,
        };
      });
      const nextShipmentDocuments: BookingShipmentDocuments = {
        ...shipmentDocuments,
        totalFreightRate: freightPreview?.totalFreightRate ?? latestBooking.pricing.calculatedFreight,
        freightStatus: freightPreview?.freightStatus ?? "READY",
        freightMessage: freightPreview?.freightMessage ?? null,
        submittedAt: timestamp,
        deliveries: shipmentDocuments.deliveries.map((delivery) => ({
          ...delivery,
          freightRate: freightPreview?.deliveryRates.get(delivery.deliveryId) ?? null,
        })),
        lr: {
          number: existingLrNumber,
          generatedAt: timestamp,
          viewMode: shipmentDocuments.lr?.viewMode ?? "COMBINED",
          extraCharges: shipmentDocuments.lr?.extraCharges ?? 0,
          advance: shipmentDocuments.lr?.advance ?? 0,
        },
      };

      const savedBooking = updateBooking(latestBooking.id, {
        status: "DOCUMENT_COMPLETED",
        documents: nextDocuments,
        shipmentDocuments: nextShipmentDocuments,
        quantity: finalQuantity || latestBooking.quantity,
        weight: finalWeight || latestBooking.weight,
        destinationAddressId:
          nextDeliveries[nextDeliveries.length - 1]?.destinationAddressId || latestBooking.destinationAddressId,
        consigneeAddressId:
          nextDeliveries[nextDeliveries.length - 1]?.destinationAddressId || latestBooking.consigneeAddressId,
        pricing: {
          ...latestBooking.pricing,
          calculatedFreight: nextShipmentDocuments.totalFreightRate ?? latestBooking.pricing.calculatedFreight,
        },
        assignment: latestBooking.assignment
          ? {
              ...latestBooking.assignment,
              lrNumber: existingLrNumber,
            }
          : latestBooking.assignment,
        lrIds: latestBooking.lrIds ?? [],
        deliveries: nextDeliveries,
      });

      const transitionKey = savedBooking.id || latestBooking.id || routeBookingKey;
      console.log("[BookingDocuments] submit transition", {
        bookingKey: transitionKey,
        currentStatus: latestBooking.status,
        targetStatus: "IN_TRANSIT",
      });

      safeTransitionBooking(transitionKey, "DOCUMENT_COMPLETED", "Invoice and E-Way Bill submitted. LR generated.");
      safeTransitionBooking(transitionKey, "READY_FOR_DISPATCH", "All required execution checkpoints completed.");
      safeTransitionBooking(transitionKey, "DISPATCHED", "Dispatch flow advanced automatically.");
      safeTransitionBooking(transitionKey, "IN_TRANSIT", "Auto moved to transit after loading, invoice, E-Way Bill, and LR completion.");

      setIsSubmitting(false);
      navigate(`/tenant/${tenant.id}/bookings/${savedBooking.id}/lr`);
    } catch (submitError) {
      console.error("[BookingDocuments] submit failed", submitError);
      setError("Unable to update booking. Please retry.");
      setIsSubmitting(false);
    }
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
              <Link to={`/tenant/${tenant.id}/bookings/${bookingRecord.id}`}>Back to booking</Link>
            </Button>
            {bookingRecord.shipmentDocuments?.lr?.number ? (
              <Button asChild variant="outline">
                <Link to={`/tenant/${tenant.id}/bookings/${bookingRecord.id}/lr`}>Open LR</Link>
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
        <TenantSummaryCard label="Updated Freight" value={freightPreview?.totalFreightRate != null ? formatCurrency(freightPreview.totalFreightRate) : "-"} helper={freightPreview?.freightMessage ?? "Rate refreshes after document edits"} />
      </div>

      {error ? (
        <div className="rounded-2xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
      ) : null}

      {import.meta.env.DEV && debugParseText ? (
        <TenantPanel title="PDF Debug" description="Dev-only extracted text preview.">
          <pre className="max-h-56 overflow-auto whitespace-pre-wrap rounded-2xl border border-dashed border-border/70 bg-slate-50/80 p-3 text-xs text-slate-700">
            {debugParseText}
          </pre>
        </TenantPanel>
      ) : null}

      <TenantPanel title="Deliveries" description="Scrollable single page with expandable delivery cards.">
        <div className="max-h-[70vh] space-y-3 overflow-y-auto pr-2">
          {(bookingRecord.deliveries ?? []).map((delivery) => {
            const deliveryDocuments = shipmentDocuments.deliveries.find((item) => item.deliveryId === delivery.id);
            if (!deliveryDocuments) {
              return null;
            }
            const customerAddresses = adminSources.customerAddressMap.get(bookingRecord.customerId) ?? [];
            const selectedDestinationAddress = delivery.destinationAddressId
              ? addressMap.get(delivery.destinationAddressId) ?? null
              : null;
            const extractedConsignee = deliveryDocuments.extractedConsignee ?? deriveExtractedConsigneeSnapshotFromInvoices(deliveryDocuments.invoices);
            const comparison =
              selectedDestinationAddress && extractedConsignee
                ? compareAddressSimilarity(selectedDestinationAddress, extractedConsignee)
                : null;
            const totals = sumDeliveryInvoiceTotals(deliveryDocuments);
            console.log("[BookingDocuments] aggregated totals", { deliveryId: delivery.id, totals });
            const isOpen = expandedDeliveryId === delivery.id;
            return (
              <div key={delivery.id} className="rounded-[24px] border border-white/75 bg-gradient-to-r from-white to-sky-50/75 p-4 shadow-sm">
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-3 text-left"
                  onClick={() => setExpandedDeliveryId((current) => (current === delivery.id ? null : delivery.id))}
                >
                  <div>
                    <p className="text-sm font-semibold">{delivery.trackingId}</p>
                    <p className="mt-1 text-sm text-slate-600">
                      {addressMap.get(delivery.originAddressId)?.addressName ?? delivery.originCity ?? "-"} to {addressMap.get(delivery.destinationAddressId)?.addressName ?? delivery.destinationCity ?? "-"}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{materialMap.get(delivery.materialId)?.materialCode ?? "-"}</Badge>
                    <Badge variant={deliveryDocuments.invoices.length ? "success" : "warning"}>{deliveryDocuments.invoices.length ? "Invoice Ready" : "Invoice Pending"}</Badge>
                    <Badge variant={deliveryDocuments.ewayBill?.ewayBillNumber ? "success" : "warning"}>{deliveryDocuments.ewayBill?.ewayBillNumber ? "EWB Ready" : "EWB Pending"}</Badge>
                    <Badge variant={delivery.consigneeFinalizationStatus === "CONFIRMED" ? "success" : "warning"}>
                      {delivery.consigneeFinalizationStatus === "CONFIRMED" ? "Consignee Confirmed" : "Consignee Pending"}
                    </Badge>
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
                        {deliveryDocuments.invoices.length ? (
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
                            <span className="inline-flex rounded-full border border-border/70 bg-white px-3 py-2 text-xs font-medium">Add Invoice +</span>
                          </label>
                        ) : null}
                      </div>
                      <div className="mt-3 space-y-3">
                        {deliveryDocuments.invoices.length ? (
                          deliveryDocuments.invoices.map((invoice, index) => (
                            <div key={invoice.id} className="rounded-2xl border border-white/70 bg-white/80 p-3">
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

                    {(delivery.destinationAddressSource === "FROM_INVOICE_LATER" || extractedConsignee || comparison) ? (
                      <SectionCard title="Consignee Confirmation">
                        <div className="mb-3 rounded-2xl border border-white/70 bg-white/80 px-4 py-3 text-xs text-slate-600">
                          <p>Delivery Address Source: {delivery.destinationAddressSource === "FROM_INVOICE_LATER" ? "From Invoice Later" : "Saved Customer Address"}</p>
                          <p className="mt-1">Finalization Status: {delivery.consigneeFinalizationStatus ?? "PENDING"}</p>
                        </div>
                        {extractedConsignee ? (
                          <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-slate-700">
                            <p className="font-semibold text-slate-900">Consignee details extracted from invoice</p>
                            <div className="mt-3 grid gap-3 md:grid-cols-2">
                              <Field label="Name">
                                <Input
                                  value={extractedConsignee.name}
                                  onChange={(event) => updateExtractedConsigneeField(delivery.id, "name", event.target.value)}
                                />
                              </Field>
                              <Field label="City">
                                <Input
                                  value={extractedConsignee.city}
                                  onChange={(event) => updateExtractedConsigneeField(delivery.id, "city", event.target.value)}
                                />
                              </Field>
                              <div className="md:col-span-2">
                                <Field label="Address">
                                  <Input
                                    value={extractedConsignee.addressLine}
                                    onChange={(event) => updateExtractedConsigneeField(delivery.id, "addressLine", event.target.value)}
                                  />
                                </Field>
                              </div>
                              <Field label="Pincode">
                                <Input
                                  value={extractedConsignee.pincode}
                                  onChange={(event) => updateExtractedConsigneeField(delivery.id, "pincode", event.target.value)}
                                />
                              </Field>
                              <Field label="GSTIN">
                                <Input
                                  value={extractedConsignee.gstin ?? ""}
                                  onChange={(event) => updateExtractedConsigneeField(delivery.id, "gstin", event.target.value)}
                                />
                              </Field>
                            </div>
                          </div>
                        ) : (
                          <div className="rounded-xl border border-dashed px-3 py-4 text-xs text-muted-foreground">
                            Upload invoice to extract consignee details.
                          </div>
                        )}

                        {comparison && comparison.matchStatus !== "MATCH" ? (
                          <div className="mt-3 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                            <p className="font-medium">The selected destination address appears different from the invoice address.</p>
                            <p className="mt-1">Confidence: {Math.round(comparison.confidence * 100)}%</p>
                            <p className="mt-1">{comparison.reasons.join(" ")}</p>
                          </div>
                        ) : null}

                        <div className="mt-3 grid gap-3 md:grid-cols-2">
                          <Field label="Final Address Action">
                            <Select
                              value={deliveryDocuments.finalConsigneeChoice?.mode ?? defaultConsigneeChoiceMode(delivery, extractedConsignee)}
                              onChange={(event) =>
                                updateConsigneeChoice(delivery.id, (current) => ({
                                  ...current,
                                  finalConsigneeChoice: {
                                    mode: event.target.value as NonNullable<typeof current.finalConsigneeChoice>["mode"],
                                    selectedAddressId: current.finalConsigneeChoice?.selectedAddressId ?? delivery.destinationAddressId ?? null,
                                    comparison: comparison ?? null,
                                  },
                                }))
                              }
                            >
                              {selectedDestinationAddress ? <option value="KEEP_SELECTED_ADDRESS">Keep selected address</option> : null}
                              {extractedConsignee ? <option value="USE_INVOICE_ADDRESS">Use invoice address</option> : null}
                              {extractedConsignee ? <option value="SAVE_INVOICE_ADDRESS_AND_USE_IT">Save invoice address as new customer address and use it</option> : null}
                              <option value="USE_SAVED_ADDRESS">Select different saved address</option>
                            </Select>
                          </Field>
                          {(
                            (deliveryDocuments.finalConsigneeChoice?.mode ?? defaultConsigneeChoiceMode(delivery, extractedConsignee)) ===
                            "USE_SAVED_ADDRESS"
                          ) ? (
                            <Field label="Saved Address">
                              <Select
                                value={deliveryDocuments.finalConsigneeChoice?.selectedAddressId ?? delivery.destinationAddressId ?? ""}
                                onChange={(event) =>
                                  updateConsigneeChoice(delivery.id, (current) => ({
                                    ...current,
                                    finalConsigneeChoice: {
                                      mode: "USE_SAVED_ADDRESS",
                                      selectedAddressId: event.target.value,
                                      comparison: comparison ?? null,
                                    },
                                  }))
                                }
                              >
                                <option value="">Select saved address</option>
                                {customerAddresses.map((address) => (
                                  <option key={address.id} value={address.id}>{address.addressName}</option>
                                ))}
                              </Select>
                            </Field>
                          ) : null}
                        </div>
                      </SectionCard>
                    ) : null}

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

                    <SectionCard title="Package Details">
                      <div className="grid gap-2 md:grid-cols-2">
                        <p className="text-sm text-muted-foreground">Actual Quantity: {deliveryDocuments.actuals.quantity ?? "-"}</p>
                        <p className="text-sm text-muted-foreground">Quantity UOM: {deliveryDocuments.actuals.quantityUOM ?? "-"}</p>
                        <p className="text-sm text-muted-foreground">Actual Weight: {deliveryDocuments.actuals.weight ?? "-"}</p>
                        <p className="text-sm text-muted-foreground">Weight UOM: {deliveryDocuments.actuals.weightUOM ?? "-"}</p>
                        <p className="text-sm text-muted-foreground md:col-span-2">Material: {deliveryDocuments.actuals.material || "-"}</p>
                      </div>
                    </SectionCard>

                    <div className="rounded-2xl border border-dashed border-border/70 bg-slate-50/70 px-4 py-3 text-sm text-muted-foreground">
                      <p className="font-medium text-slate-700">Delivery Totals</p>
                      <p className="mt-1">Quantity: {totals.quantity || "-"}</p>
                      <p>Weight: {totals.weight || "-"}</p>
                      <p>Invoice Value: {totals.invoiceValue ? formatCurrency(totals.invoiceValue) : "-"}</p>
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </TenantPanel>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[24px] border border-white/70 bg-gradient-to-br from-slate-50 to-sky-50/70 p-4 shadow-sm">
        <div>
          <p className="text-sm font-semibold">Updated Freight</p>
          <p className="mt-1 text-lg font-semibold text-slate-900">
            {freightPreview?.totalFreightRate != null ? formatCurrency(freightPreview.totalFreightRate) : "Pending"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{freightPreview?.freightMessage ?? "Freight updates in real time."}</p>
        </div>
        <Button onClick={submitDocuments} disabled={isSubmitting || bookingRecord.status === "DOCUMENT_COMPLETED"}>
          {isSubmitting || bookingRecord.status === "DOCUMENT_COMPLETED" ? "Documents Submitted" : "Submit Documents"}
        </Button>
      </div>
    </div>
  );
}

function StepTimeline({ currentStatus }: { currentStatus: string }) {
  const currentIndex = stepOrder.findIndex((step) => step.status === currentStatus);

  return (
    <div className="grid gap-3 md:grid-cols-5">
      {stepOrder.map((step, index) => (
        <div key={step.status} className={`rounded-2xl border px-4 py-3 ${index <= currentIndex ? "border-emerald-300 bg-emerald-50" : "border-border/70 bg-white"}`}>
          <p className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">Step {index + 1}</p>
          <p className="mt-1 text-sm font-medium">{step.label}</p>
        </div>
      ))}
    </div>
  );
}

function SectionCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/70 bg-white/80 p-3">
      <p className="text-sm font-semibold">{title}</p>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}

function deriveExtractedConsigneeSnapshot(invoice: BookingInvoiceSnapshot): BookingConsigneeSnapshot | null {
  if (
    !invoice.consigneeName?.trim() &&
    !invoice.consigneeAddress?.trim() &&
    !invoice.consigneeCity?.trim() &&
    !invoice.consigneePincode?.trim()
  ) {
    return null;
  }
  return {
    name: invoice.consigneeName?.trim() ?? "",
    addressLine: invoice.consigneeAddress?.trim() ?? "",
    city: invoice.consigneeCity?.trim() ?? "",
    pincode: invoice.consigneePincode?.trim() ?? "",
    gstin: invoice.consigneeGstin?.trim() ?? null,
  };
}

function deriveExtractedConsigneeSnapshotFromInvoices(invoices: BookingInvoiceSnapshot[]) {
  for (const invoice of invoices) {
    const snapshot = deriveExtractedConsigneeSnapshot(invoice);
    if (snapshot) {
      return snapshot;
    }
  }
  return null;
}

function defaultConsigneeChoiceMode(
  delivery: BookingDeliveryRecord,
  extractedConsignee: BookingConsigneeSnapshot | null,
) {
  if (extractedConsignee) {
    return "USE_INVOICE_ADDRESS" as const;
  }
  if (delivery.destinationAddressId) {
    return "KEEP_SELECTED_ADDRESS" as const;
  }
  return extractedConsignee ? "USE_INVOICE_ADDRESS" as const : "USE_SAVED_ADDRESS" as const;
}

function resolveFinalDestinationAddress(
  customerId: string,
  delivery: BookingDeliveryRecord,
  deliveryDocuments: BookingDeliveryShipmentDocuments | undefined,
  addressMap: Map<string, TenantCustomerAddress>,
  createAddress: ReturnType<typeof useTenantCustomers>["createAddress"],
) {
  const choiceMode = deliveryDocuments?.finalConsigneeChoice?.mode ?? defaultConsigneeChoiceMode(delivery, deliveryDocuments?.extractedConsignee ?? null);
  const extracted = deliveryDocuments?.extractedConsignee ?? null;

  if (choiceMode === "USE_SAVED_ADDRESS") {
    const selectedAddressId = deliveryDocuments?.finalConsigneeChoice?.selectedAddressId ?? delivery.destinationAddressId;
    const selectedAddress = selectedAddressId ? addressMap.get(selectedAddressId) ?? null : null;
    return {
      addressId: selectedAddress?.id ?? selectedAddressId ?? "",
      city: selectedAddress?.city ?? delivery.destinationCity ?? "",
      confirmed: Boolean(selectedAddressId),
    };
  }

  if (choiceMode === "KEEP_SELECTED_ADDRESS") {
    const currentAddress = delivery.destinationAddressId ? addressMap.get(delivery.destinationAddressId) ?? null : null;
    return {
      addressId: delivery.destinationAddressId,
      city: currentAddress?.city ?? delivery.destinationCity ?? "",
      confirmed: Boolean(delivery.destinationAddressId),
    };
  }

  if (choiceMode === "SAVE_INVOICE_ADDRESS_AND_USE_IT" && extracted) {
    const created = createAddress(customerId, buildCustomerAddressFromInvoice(extracted));
    return {
      addressId: created.id,
      city: created.city,
      confirmed: true,
    };
  }

  if (choiceMode === "USE_INVOICE_ADDRESS" && extracted) {
    return {
      addressId: "",
      city: extracted.city || delivery.destinationCity || "",
      confirmed: true,
    };
  }

  return {
    addressId: delivery.destinationAddressId,
    city: delivery.destinationCity ?? "",
    confirmed: delivery.consigneeFinalizationStatus === "CONFIRMED",
  };
}

function buildCustomerAddressFromInvoice(extracted: BookingConsigneeSnapshot): TenantCustomerAddressInput {
  const addressTypes: CustomerAddressTag[] = ["Consignee"];
  return {
    addressType: "consignee" as const,
    addressTypes,
    addressUsage: "DESTINATION" as const,
    addressName: extracted.name || `${extracted.city || "Customer"} Destination`,
    contactCode: undefined,
    gstin: extracted.gstin ?? undefined,
    contactPersonName: extracted.name || "Consignee",
    contactPerson: extracted.name || "Consignee",
    phone: "9876543210",
    contactNumber: "9876543210",
    email: undefined,
    emailId: undefined,
    addressLine1: extracted.addressLine || extracted.city || "Invoice extracted address",
    addressLine2: undefined,
    city: extracted.city || "Pending",
    state: "Pending",
    country: "India",
    pincode: extracted.pincode || "000000",
    isDefault: false,
    status: "active" as const,
  };
}
