import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { PageHeader } from "@/components/common/page-header";
import { TenantEmptyState, TenantPanel, TenantSummaryCard } from "@/components/tenant/tenant-primitives";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Tabs } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useTenantRouteContext } from "@/hooks/useTenantRouteContext";
import { BookingStatusBadge } from "@/modules/tms/booking/components/BookingStatusBadge";
import { BookingRemarksTimeline, BookingStatusTimeline } from "@/modules/tms/booking/components/BookingTimeline";
import { useBookingAdminSources } from "@/modules/tms/booking/hooks/useBookingAdminSources";
import { useTenantBookings } from "@/modules/tms/booking/hooks/useTenantBookings";
import { calculateMarginPercent, getBookingEditability, isBookingDelayCandidate, normalizeBookingId } from "@/modules/tms/booking/services/booking-engine";
import {
  buildAddressLookup,
  buildCustomerLookup,
  buildDriverLookup,
  buildMaterialLookup,
  buildVehicleLookup,
  buildVehicleTypeLookup,
  buildVendorLookup,
} from "@/modules/tms/booking/services/booking-selectors";
import { ensureShipmentDocuments } from "@/modules/tms/booking/services/shipment-documents";
import type { BookingAssignmentInput, BookingExpenseRecord, BookingPodSnapshot, BookingRemark } from "@/modules/tms/booking/types";

const OWN_FLEET_VENDOR = "__OWN_FLEET__";
const DELIVERY_REMARK_TYPES = [
  { value: "INTACT", label: "Intact" },
  { value: "DEPS", label: "DEPS (Damaged, Excess, Pilferage, Shortage)" },
  { value: "ACCIDENT_INCIDENT", label: "Accidents / Incidents" },
  { value: "VEHICLE_PLACEMENT_DELAY_DEVIATION", label: "Vehicle Placement Delay / Deviation" },
  { value: "DELIVERY_DELAY", label: "Delivery Delay" },
  { value: "EPOD_SUBMITTED", label: "E-POD Submitted" },
  { value: "EPOD_NOT_SUBMITTED", label: "E-POD Not Submitted" },
  { value: "ORIGINAL_POD_NOT_SUBMITTED", label: "Original POD Not Submitted" },
  { value: "VEHICLE_BREAKDOWN", label: "Vehicle Breakdown" },
  { value: "DESTINATION_CHANGED", label: "Destination Changed" },
  { value: "CONSIGNEE_DESTINATION_CHANGED", label: "Consignee & Destination Changed" },
] as const;

const timelineSteps = [
  ["VEHICLE_ASSIGNED", "Vehicle Assigned"],
  ["LOADING_STARTED", "Loading Started"],
  ["LOADING_COMPLETED", "Loading Completed"],
  ["DOCUMENT_PENDING", "Document Pending"],
  ["DOCUMENT_COMPLETED", "Document Completed"],
] as const;

export function BookingDetailsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { bookingId } = useParams();
  const { tenant } = useTenantRouteContext();
  const { getBookingById, transitionBooking, updateBooking, assignBooking } = useTenantBookings(tenant.id);
  const adminSources = useBookingAdminSources(tenant.id);
  const [assignmentOpen, setAssignmentOpen] = useState(false);
  const [vendorId, setVendorId] = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const [driverId, setDriverId] = useState("");
  const [vendorFreight, setVendorFreight] = useState("");
  const [expenseLabel, setExpenseLabel] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [activeTab, setActiveTab] = useState("Deliveries");
  const [podForms, setPodForms] = useState<Record<string, BookingPodSnapshot>>({});
  const [remarkDeliveryId, setRemarkDeliveryId] = useState<string | null>(null);
  const [remarkType, setRemarkType] = useState<(typeof DELIVERY_REMARK_TYPES)[number]["value"]>("INTACT");
  const [remarkLocation, setRemarkLocation] = useState("");
  const [remarkConsignee, setRemarkConsignee] = useState("");
  const [remarkDestination, setRemarkDestination] = useState("");
  const [remarkText, setRemarkText] = useState("");

  const normalizedRouteBookingId = normalizeBookingId(bookingId);
  const booking = bookingId ? getBookingById(normalizedRouteBookingId) : null;
  const customerMap = useMemo(() => buildCustomerLookup(adminSources.customers), [adminSources.customers]);
  const addressMap = useMemo(() => buildAddressLookup(Array.from(adminSources.customerAddressMap.values()).flat()), [adminSources.customerAddressMap]);
  const materialMap = useMemo(() => buildMaterialLookup(adminSources.materials), [adminSources.materials]);
  const driverMap = useMemo(() => buildDriverLookup(adminSources.drivers), [adminSources.drivers]);
  const vehicleMap = useMemo(() => buildVehicleLookup(adminSources.vehicles), [adminSources.vehicles]);
  const vehicleTypeMap = useMemo(() => buildVehicleTypeLookup(adminSources.vehicleTypes), [adminSources.vehicleTypes]);
  const vendorMap = useMemo(() => buildVendorLookup(adminSources.vendors), [adminSources.vendors]);

  useEffect(() => {
    if (!booking?.deliveries?.length) {
      return;
    }
    setPodForms(
      Object.fromEntries(
        booking.deliveries.map((delivery) => [
          delivery.id,
          {
            photoName: delivery.pod?.photoName ?? "",
            consigneeName: delivery.pod?.consigneeName ?? "",
            podRemark: delivery.pod?.podRemark ?? "",
            eSignRequested: delivery.pod?.eSignRequested ?? false,
            capturedAt: delivery.pod?.capturedAt ?? null,
          },
        ]),
      ),
    );
  }, [booking]);

  useEffect(() => {
    console.log("[BookingDetails] route bookingId:", bookingId, "normalized:", normalizedRouteBookingId);
    console.log("[BookingDetails] store booking id:", booking?.id ?? null, "booking no:", booking?.bookingId ?? null, "status:", booking?.status ?? null);
  }, [booking?.bookingId, booking?.id, booking?.status, bookingId, normalizedRouteBookingId]);

  if (!booking) {
    return (
      <TenantEmptyState
        title="Booking not found"
        description="Selected booking record unavailable."
        action={
          <Button asChild>
            <Link to={`/tenant/${tenant.id}/bookings`}>Back to booking list</Link>
          </Button>
        }
      />
    );
  }

  const bookingRecord = booking;
  const customer = customerMap.get(bookingRecord.customerId) ?? null;
  const sourceAddress = addressMap.get(bookingRecord.sourceAddressId) ?? null;
  const destinationAddress = addressMap.get(bookingRecord.destinationAddressId) ?? null;
  const assignedVehicle = bookingRecord.assignment?.vehicleId ? vehicleMap.get(bookingRecord.assignment.vehicleId) ?? null : null;
  const assignedDriver = bookingRecord.assignment?.driverId ? driverMap.get(bookingRecord.assignment.driverId) ?? null : null;
  const assignedVendor = bookingRecord.assignment?.vendorId ? vendorMap.get(bookingRecord.assignment.vendorId) ?? null : null;
  const vehicleType = bookingRecord.vehicleTypeId ? vehicleTypeMap.get(bookingRecord.vehicleTypeId) ?? null : null;
  const shipmentDocuments = bookingRecord.shipmentDocuments ?? ensureShipmentDocuments(bookingRecord);
  const documentsReady = shipmentDocuments.deliveries.every((delivery) => delivery.invoices.length > 0 && Boolean(delivery.ewayBill?.ewayBillNumber));
  const loadingStarted =
    Boolean(bookingRecord.assignment?.loadingStartedAt) ||
    bookingRecord.statusTimeline.some((event) =>
      ["LOADING_STARTED", "LOADING_COMPLETED", "DOCUMENT_PENDING", "DOCUMENT_COMPLETED", "READY_FOR_DISPATCH", "DISPATCHED", "IN_TRANSIT", "ARRIVED", "DELIVERED"].includes(event.status),
    );
  const loadingCompleted =
    Boolean(bookingRecord.assignment?.loadingCompletedAt) ||
    bookingRecord.statusTimeline.some((event) =>
      ["LOADING_COMPLETED", "DOCUMENT_PENDING", "DOCUMENT_COMPLETED", "READY_FOR_DISPATCH", "DISPATCHED", "IN_TRANSIT", "ARRIVED", "DELIVERED"].includes(event.status),
    );
  const latestFreight = shipmentDocuments.totalFreightRate ?? bookingRecord.pricing.calculatedFreight;
  const customerFreight = bookingRecord.pricing.calculatedFreight;
  const marginPercent = calculateMarginPercent(customerFreight, Number(vendorFreight || 0));
  const selectedDeliveryId = typeof (location.state as { deliveryId?: string } | null)?.deliveryId === "string" ? (location.state as { deliveryId?: string }).deliveryId : null;
  const selectedDelivery = (bookingRecord.deliveries ?? []).find((delivery) => delivery.id === selectedDeliveryId) ?? null;
  const normalizedVendorId = vendorId === OWN_FLEET_VENDOR ? null : vendorId || null;
  const selectedVehicle = vehicleId ? vehicleMap.get(vehicleId) ?? null : null;
  const availableVehicles = adminSources.vehicles.filter((vehicle) => {
    if (!vendorId || !vehicle.isActive) {
      return false;
    }
    return vendorId === OWN_FLEET_VENDOR ? !vehicle.vendorId : vehicle.vendorId === vendorId;
  });
  const availableDrivers = adminSources.drivers.filter((driver) => {
    if (!vendorId || !selectedVehicle || !driver.isActive) {
      return false;
    }
    return vendorId === OWN_FLEET_VENDOR ? !driver.vendorId : driver.vendorId === vendorId;
  });
  const selectedRemarkDelivery = remarkDeliveryId ? (bookingRecord.deliveries ?? []).find((delivery) => delivery.id === remarkDeliveryId) ?? null : null;
  const requiresLocation = ["ACCIDENT_INCIDENT", "VEHICLE_BREAKDOWN", "DESTINATION_CHANGED", "CONSIGNEE_DESTINATION_CHANGED"].includes(remarkType);
  const requiresRemark = ["DEPS", "CONSIGNEE_DESTINATION_CHANGED"].includes(remarkType);
  const requiresConsigneeDestination = remarkType === "CONSIGNEE_DESTINATION_CHANGED";
  const canMoveTransit = ["DOCUMENT_COMPLETED", "READY_FOR_DISPATCH", "DISPATCHED"].includes(bookingRecord.status);

  function resetAssignmentDialog() {
    setAssignmentOpen(false);
    setVendorId("");
    setVehicleId("");
    setDriverId("");
    setVendorFreight("");
  }

  function resetRemarkDialog() {
    setRemarkDeliveryId(null);
    setRemarkType("INTACT");
    setRemarkLocation("");
    setRemarkConsignee("");
    setRemarkDestination("");
    setRemarkText("");
  }

  function startLoading() {
    if (!["VEHICLE_ASSIGNED", "ASSIGNED"].includes(bookingRecord.status) || loadingStarted) {
      return;
    }
    const timestamp = new Date().toISOString();
    console.log("[BookingDetails] startLoading before:", {
      routeBookingId: bookingId,
      storeBookingId: bookingRecord.id,
      status: bookingRecord.status,
    });
    updateBooking(bookingRecord.id, {
      assignment: bookingRecord.assignment ? { ...bookingRecord.assignment, loadingStartedAt: timestamp } : bookingRecord.assignment,
    });
    const transitioned = transitionBooking(bookingRecord.id, {
      status: "LOADING_STARTED",
      actor: "Dispatcher",
      note: "Loading started.",
    });
    console.log("[BookingDetails] startLoading after:", {
      routeBookingId: bookingId,
      storeBookingId: transitioned.id,
      status: transitioned.status,
      loadingStartedAt: transitioned.assignment?.loadingStartedAt ?? timestamp,
    });
  }

  function endLoading() {
    if (!loadingStarted || loadingCompleted) {
      return;
    }
    const timestamp = new Date().toISOString();
    console.log("[BookingDetails] endLoading before:", {
      routeBookingId: bookingId,
      storeBookingId: bookingRecord.id,
      status: bookingRecord.status,
      loadingStartedAt: bookingRecord.assignment?.loadingStartedAt ?? null,
      loadingCompletedAt: bookingRecord.assignment?.loadingCompletedAt ?? null,
    });
    updateBooking(bookingRecord.id, {
      assignment: bookingRecord.assignment
        ? {
            ...bookingRecord.assignment,
            loadingStartedAt: bookingRecord.assignment.loadingStartedAt ?? timestamp,
            loadingCompletedAt: timestamp,
          }
        : bookingRecord.assignment,
    });
    const loadingCompletedBooking = transitionBooking(bookingRecord.id, {
      status: "LOADING_COMPLETED",
      actor: "Dispatcher",
      note: "Loading completed.",
    });
    const documentPendingBooking = transitionBooking(loadingCompletedBooking.id, {
      status: "DOCUMENT_PENDING",
      actor: "Dispatcher",
      note: "Invoice and E-Way Bill pending.",
    });
    console.log("[BookingDetails] endLoading after:", {
      routeBookingId: bookingId,
      storeBookingId: documentPendingBooking.id,
      loadingCompletedStatus: loadingCompletedBooking.status,
      finalStatus: documentPendingBooking.status,
      loadingStartedAt: documentPendingBooking.assignment?.loadingStartedAt ?? timestamp,
      loadingCompletedAt: documentPendingBooking.assignment?.loadingCompletedAt ?? timestamp,
    });
    navigate(`/tenant/${tenant.id}/bookings/${documentPendingBooking.id}/documents`);
  }

  function submitAssignment() {
    const selectedDriver = adminSources.drivers.find((driver) => driver.id === driverId);
    if (!selectedVehicle || !selectedDriver || !vendorId || Number(vendorFreight) <= 0) {
      return;
    }
    const assignment: BookingAssignmentInput = {
      vendorId: normalizedVendorId,
      vendorName: vendorId === OWN_FLEET_VENDOR ? "Own Fleet" : vendorMap.get(vendorId)?.name ?? "Vendor",
      vehicleId: selectedVehicle.id,
      vehicleLabel:
        selectedVehicle.ownershipType === "OWN"
          ? `${selectedVehicle.registrationNumber} (OWN)`
          : `${selectedVehicle.registrationNumber} (Vendor: ${vendorMap.get(selectedVehicle.vendorId ?? "")?.name ?? "Vendor"})`,
      driverId: selectedDriver.id,
      driverName: selectedDriver.name,
      vendorFreight: Number(vendorFreight),
      marginPercent,
      actor: "Dispatcher",
    };
    assignBooking(bookingRecord.id, assignment);
    resetAssignmentDialog();
  }

  function moveToTransit() {
    if (!canMoveTransit) {
      return;
    }
    transitionBooking(bookingRecord.id, {
      status: "IN_TRANSIT",
      actor: "Dispatcher",
      note: "Trip moved to transit after document completion.",
    });
  }

  function markDelivered() {
    if (!["IN_TRANSIT", "ARRIVED", "DELAYED", "EXCEPTION"].includes(bookingRecord.status)) {
      return;
    }
    transitionBooking(bookingRecord.id, {
      status: "DELIVERED",
      actor: "Ops",
      note: "Shipment delivered. Capture POD per delivery.",
    });
  }

  function resumeTransit() {
    if (!["DELAYED", "EXCEPTION"].includes(bookingRecord.status)) {
      return;
    }
    transitionBooking(bookingRecord.id, {
      status: "IN_TRANSIT",
      actor: "Ops",
      note: "Transit resumed.",
    });
  }

  function addExpense() {
    if (!expenseLabel.trim() || Number(expenseAmount) <= 0) {
      return;
    }
    const nextExpense: BookingExpenseRecord = {
      id: `expense-${Date.now()}`,
      label: expenseLabel.trim(),
      amount: Number(expenseAmount),
      createdAt: new Date().toISOString(),
      createdBy: "Ops",
    };
    updateBooking(bookingRecord.id, {
      expenses: [...(bookingRecord.expenses ?? []), nextExpense],
    });
    setExpenseLabel("");
    setExpenseAmount("");
  }

  function saveDeliveryPod(deliveryId: string) {
    const form = podForms[deliveryId];
    if (!form?.photoName?.trim() || !form?.consigneeName?.trim() || !form?.podRemark?.trim()) {
      return;
    }
    const capturedAt = new Date().toISOString();
    const nextDeliveries = (bookingRecord.deliveries ?? []).map((delivery) =>
      delivery.id === deliveryId
        ? {
            ...delivery,
            pod: {
              photoName: (form.photoName ?? "").trim(),
              consigneeName: (form.consigneeName ?? "").trim(),
              podRemark: (form.podRemark ?? "").trim(),
              eSignRequested: form.eSignRequested ?? false,
              capturedAt,
            },
          }
        : delivery,
    );
    updateBooking(bookingRecord.id, {
      deliveries: nextDeliveries,
      pod: nextDeliveries.find((delivery) => delivery.id === deliveryId)?.pod ?? bookingRecord.pod ?? null,
    });
  }

  function saveDeliveryRemark() {
    if (!remarkDeliveryId) {
      return;
    }
    if (requiresLocation && !remarkLocation.trim()) {
      return;
    }
    if (requiresConsigneeDestination && (!remarkConsignee.trim() || !remarkDestination.trim() || !remarkText.trim())) {
      return;
    }
    if (requiresRemark && !remarkText.trim()) {
      return;
    }
    const timestamp = new Date().toISOString();
    const nextRemark: BookingRemark = {
      id: `booking-remark-${Date.now()}`,
      timestamp,
      actor: "Ops",
      type: remarkType,
      message: remarkText.trim() || getRemarkLabel(remarkType),
      deliveryId: remarkDeliveryId,
      location: remarkLocation.trim() || null,
      consignee: remarkConsignee.trim() || null,
      destination: remarkDestination.trim() ? addressMap.get(remarkDestination)?.addressName ?? remarkDestination.trim() : null,
    };
    updateBooking(bookingRecord.id, {
      remarks: [nextRemark, ...bookingRecord.remarks],
    });
    resetRemarkDialog();
  }

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="TMS"
        title={bookingRecord.bookingId}
        description={`${customer?.name ?? "Unknown customer"} | ${sourceAddress?.city ?? "-"} to ${destinationAddress?.city ?? "-"} | ${bookingRecord.serviceType} | ${bookingRecord.commercialType}`}
        action={
          <div className="flex flex-wrap gap-2">
            <BookingStatusBadge status={bookingRecord.status} />
            <Button asChild variant="outline">
              <Link to={`/tenant/${tenant.id}/bookings`}>Back</Link>
            </Button>
            {getBookingEditability(bookingRecord.status) ? (
              <Button asChild variant="outline">
                <Link to={`/tenant/${tenant.id}/bookings/${bookingRecord.id}/edit`}>Edit</Link>
              </Button>
            ) : null}
          </div>
        }
      />

      <div className="workspace-hero fancy-grid grid gap-4 px-5 py-5 xl:grid-cols-[1.1fr,0.9fr,0.9fr,0.8fr]">
        <HeroStat label="Booking ID" value={bookingRecord.bookingId} tone="blue" />
        <HeroStat label="Status" value={bookingRecord.status.replace(/_/g, " ")} tone="indigo" />
        <HeroStat label="Updated Freight" value={`Rs ${latestFreight.toLocaleString()}`} tone="emerald" />
        <HeroStat label="Margin" value={bookingRecord.assignment?.marginPercent != null ? `${bookingRecord.assignment.marginPercent}%` : "Pending"} tone="amber" />
      </div>

      <TenantPanel title="Timeline" description="Strict step-by-step progression.">
        <div className="grid gap-3 md:grid-cols-5">
          {timelineSteps.map(([status, label]) => {
            const reached = bookingRecord.statusTimeline.some((event) => event.status === status);
            return (
              <div key={status} className={`rounded-2xl border px-4 py-3 ${reached ? "border-emerald-300 bg-emerald-50" : "border-border/70 bg-white"}`}>
                <p className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">{status.replace(/_/g, " ")}</p>
                <p className="mt-1 text-sm font-medium">{label}</p>
              </div>
            );
          })}
        </div>
      </TenantPanel>

      {selectedDelivery ? (
        <TenantPanel title="Selected Delivery" description="Opened from list drill-down.">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <DetailRow label="Tracking" value={selectedDelivery.trackingId} />
            <DetailRow label="Origin" value={addressMap.get(selectedDelivery.originAddressId)?.addressName ?? "-"} />
            <DetailRow label="Destination" value={addressMap.get(selectedDelivery.destinationAddressId)?.addressName ?? "-"} />
            <DetailRow label="Material" value={materialMap.get(selectedDelivery.materialId)?.materialCode ?? "-"} />
          </div>
        </TenantPanel>
      ) : null}

      <TenantPanel
        title="Actions"
        description="Step locking stays aligned to assignment, loading, document completion, and transit."
        action={
          <div className="flex flex-wrap gap-2">
            {bookingRecord.status === "PENDING_ASSIGNMENT" ? <Button onClick={() => setAssignmentOpen(true)}>Assign Vehicle</Button> : null}
            {!loadingStarted && ["VEHICLE_ASSIGNED", "ASSIGNED"].includes(bookingRecord.status) ? <Button onClick={startLoading}>Start Loading</Button> : null}
            {loadingStarted && !loadingCompleted ? <Button onClick={endLoading}>Complete Loading</Button> : null}
            {["LOADING_COMPLETED", "DOCUMENT_PENDING", "DOCUMENT_COMPLETED"].includes(bookingRecord.status) ? (
              <Button asChild>
                <Link to={`/tenant/${tenant.id}/bookings/${bookingRecord.id}/documents`}>Invoice & E-Way Bill Page</Link>
              </Button>
            ) : null}
            {canMoveTransit ? <Button onClick={moveToTransit}>Move to Transit</Button> : null}
            {["DELAYED", "EXCEPTION"].includes(bookingRecord.status) ? <Button variant="outline" onClick={resumeTransit}>Move to Transit</Button> : null}
            {["IN_TRANSIT", "ARRIVED", "DELAYED", "EXCEPTION"].includes(bookingRecord.status) ? <Button onClick={markDelivered}>Mark Delivered</Button> : null}
            {shipmentDocuments.lr?.number ? (
              <Button asChild variant="outline">
                <Link to={`/tenant/${tenant.id}/bookings/${bookingRecord.id}/lr`}>View LR</Link>
              </Button>
            ) : null}
          </div>
        }
      >
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">{bookingRecord.modeOfTransport ?? "ROAD"}</Badge>
          <Badge variant="outline">{bookingRecord.serviceType}</Badge>
          <Badge variant="outline">{bookingRecord.commercialType}</Badge>
          <Badge variant="outline">{bookingRecord.pricing.rateType.replace(/_/g, " ")}</Badge>
          <Badge variant={loadingCompleted ? "success" : loadingStarted ? "accent" : "outline"}>
            {loadingCompleted ? "Loading Completed" : loadingStarted ? "Loading Started" : "Loading Pending"}
          </Badge>
          <Badge variant={documentsReady ? "success" : "warning"}>
            {documentsReady ? "Documents Ready" : "Documents Pending"}
          </Badge>
          {isBookingDelayCandidate(bookingRecord) && bookingRecord.status !== "DELAYED" ? <Badge variant="warning">Delay Candidate</Badge> : null}
        </div>
      </TenantPanel>

      <div className="grid gap-4 xl:grid-cols-[1.2fr,0.8fr]">
        <TenantPanel title="Booking Summary" description="Route, pricing, and shipment snapshot.">
          <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
            <DetailRow label="Customer" value={customer?.name ?? "-"} />
            <DetailRow label="Deliveries" value={String(bookingRecord.numberOfDeliveries ?? bookingRecord.deliveries?.length ?? 1)} />
            <DetailRow label="Lane" value={`${sourceAddress?.addressName ?? "-"} to ${destinationAddress?.addressName ?? "-"}`} />
            <DetailRow label="Pickup" value={bookingRecord.pickupDate || bookingRecord.pickupTime ? `${bookingRecord.pickupDate ?? "-"} ${bookingRecord.pickupTime ?? ""}`.trim() : "-"} />
            <DetailRow label="Quantity / Weight" value={`${bookingRecord.quantity} ${bookingRecord.uom} / ${bookingRecord.weight} ${bookingRecord.weightUom ?? bookingRecord.uom}`} />
            <DetailRow label="Vehicle Type" value={vehicleType?.typeCode ?? "Optional"} />
          </div>
        </TenantPanel>

        <TenantPanel title="Execution Summary" description="Freight, margin, vehicle, driver, and vendor.">
          <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
            <DetailRow label="Customer Freight" value={`Rs ${bookingRecord.pricing.calculatedFreight.toLocaleString()}`} />
            <DetailRow label="Updated Freight" value={`Rs ${latestFreight.toLocaleString()}`} />
            <DetailRow label="Vendor Freight" value={bookingRecord.assignment?.vendorFreight != null ? `Rs ${bookingRecord.assignment.vendorFreight.toLocaleString()}` : "-"} />
            <DetailRow label="Margin %" value={bookingRecord.assignment?.marginPercent != null ? `${bookingRecord.assignment.marginPercent}%` : "-"} />
            <DetailRow label="LR Number" value={shipmentDocuments.lr?.number ?? bookingRecord.assignment?.lrNumber ?? "Pending"} />
            <DetailRow label="Vehicle" value={assignedVehicle?.registrationNumber ?? bookingRecord.assignment?.vehicleLabel ?? "Not assigned"} />
            <DetailRow label="Driver" value={assignedDriver ? `${assignedDriver.name} (${assignedDriver.phone})` : bookingRecord.assignment?.driverName ?? "Not assigned"} />
            <DetailRow label="Vendor" value={assignedVendor?.name ?? bookingRecord.assignment?.vendorName ?? "Not assigned"} />
          </div>
        </TenantPanel>
      </div>

      <TenantPanel title="Booking Workspace" description="Deliveries, expenses, and timeline stay grouped here.">
        <div className="space-y-4">
          <Tabs tabs={["Deliveries", "Expenses", "Timeline"]} active={activeTab} onChange={setActiveTab} />

          {activeTab === "Deliveries" ? (
            <div className="space-y-3">
              {(bookingRecord.deliveries ?? []).map((delivery) => (
                <div key={delivery.id} className="rounded-[24px] border border-white/75 bg-gradient-to-r from-white to-sky-50/75 p-4 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold">{delivery.lrNumber || delivery.trackingId}</p>
                      <p className="mt-1 text-sm text-slate-600">
                        {addressMap.get(delivery.originAddressId)?.addressName ?? "-"} to {addressMap.get(delivery.destinationAddressId)?.addressName ?? "-"}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline">{materialMap.get(delivery.materialId)?.materialCode ?? "-"}</Badge>
                      <Badge variant={delivery.pod?.capturedAt ? "success" : "warning"}>{delivery.pod?.capturedAt ? "POD done" : "POD pending"}</Badge>
                      <BookingStatusBadge status={delivery.status} />
                      <Button size="sm" variant="outline" onClick={() => setRemarkDeliveryId(delivery.id)}>Add Remark</Button>
                    </div>
                  </div>
                  <div className="mt-3 grid gap-3 xl:grid-cols-[1fr_1fr_minmax(260px,320px)]">
                    <DetailRow label="Quantity" value={delivery.quantity != null ? `${delivery.quantity} ${delivery.uom ?? ""}`.trim() : "-"} />
                    <DetailRow label="Weight" value={delivery.weight != null ? `${delivery.weight} ${delivery.weightUom ?? ""}`.trim() : "-"} />
                    {bookingRecord.status === "DELIVERED" ? (
                      <div className="rounded-2xl border border-white/70 bg-white/80 p-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">POD</p>
                        <div className="mt-2 space-y-2">
                          <Input value={podForms[delivery.id]?.photoName ?? ""} onChange={(event) => setPodForms((current) => ({ ...current, [delivery.id]: { ...current[delivery.id], photoName: event.target.value } }))} placeholder="POD file" />
                          <Input value={podForms[delivery.id]?.consigneeName ?? ""} onChange={(event) => setPodForms((current) => ({ ...current, [delivery.id]: { ...current[delivery.id], consigneeName: event.target.value } }))} placeholder="Consignee name" />
                          <Input value={podForms[delivery.id]?.podRemark ?? ""} onChange={(event) => setPodForms((current) => ({ ...current, [delivery.id]: { ...current[delivery.id], podRemark: event.target.value } }))} placeholder="POD remark" />
                          <Button size="sm" onClick={() => saveDeliveryPod(delivery.id)}>Save POD</Button>
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-dashed border-border/70 bg-slate-50/70 px-4 py-3 text-sm text-muted-foreground">
                        POD becomes active after booking is marked delivered.
                      </div>
                    )}
                  </div>
                  <div className="mt-3">
                    <DeliveryRemarkTimeline remarks={bookingRecord.remarks.filter((remark) => remark.deliveryId === delivery.id)} />
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          {activeTab === "Expenses" ? (
            <div className="space-y-3">
              {(bookingRecord.expenses ?? []).length ? (
                (bookingRecord.expenses ?? []).map((expense) => (
                  <div key={expense.id} className="flex items-center justify-between rounded-2xl border border-white/70 bg-gradient-to-r from-white to-slate-50/80 px-3 py-3 text-sm shadow-sm">
                    <span>{expense.label}</span>
                    <span className="font-medium">Rs {expense.amount.toLocaleString()}</span>
                  </div>
                ))
              ) : (
                <div className="rounded-xl border border-dashed px-3 py-4 text-xs text-muted-foreground">No expenses</div>
              )}
              {bookingRecord.status === "IN_TRANSIT" ? (
                <div className="grid gap-3 rounded-[24px] border border-white/70 bg-gradient-to-br from-slate-50 to-sky-50/70 p-4 shadow-sm md:grid-cols-[1fr_180px_auto]">
                  <CompactField label="Expense Type">
                    <Input value={expenseLabel} onChange={(event) => setExpenseLabel(event.target.value)} placeholder="Toll / unloading / detention" />
                  </CompactField>
                  <CompactField label="Amount">
                    <Input value={expenseAmount} onChange={(event) => setExpenseAmount(event.target.value)} placeholder="0" />
                  </CompactField>
                  <div className="flex items-end">
                    <Button onClick={addExpense}>Add Expense</Button>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          {activeTab === "Timeline" ? (
            <div className="grid gap-4 xl:grid-cols-2">
              <div>
                <p className="mb-3 text-sm font-semibold">Remarks</p>
                <BookingRemarksTimeline remarks={[...bookingRecord.remarks].sort((left, right) => left.timestamp.localeCompare(right.timestamp))} />
              </div>
              <div>
                <p className="mb-3 text-sm font-semibold">Status Timeline</p>
                <BookingStatusTimeline events={[...bookingRecord.statusTimeline].sort((left, right) => left.timestamp.localeCompare(right.timestamp))} />
              </div>
            </div>
          ) : null}
        </div>
      </TenantPanel>

      <Dialog
        open={Boolean(remarkDeliveryId)}
        onOpenChange={(open) => {
          if (!open) {
            resetRemarkDialog();
          }
        }}
        title={`Add Remark${selectedRemarkDelivery ? ` · Delivery ${selectedRemarkDelivery.deliveryNo}` : ""}`}
        description="Structured delivery remark linked to booking and delivery."
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={resetRemarkDialog}>Cancel</Button>
            <Button
              onClick={saveDeliveryRemark}
              disabled={
                !remarkDeliveryId ||
                (requiresLocation && !remarkLocation.trim()) ||
                (requiresConsigneeDestination && (!remarkConsignee.trim() || !remarkDestination.trim() || !remarkText.trim())) ||
                (requiresRemark && !remarkText.trim())
              }
            >
              Save Remark
            </Button>
          </div>
        }
      >
        <div className="grid gap-3">
          <CompactField label="Remark Type">
            <Select value={remarkType} onChange={(event) => setRemarkType(event.target.value as (typeof DELIVERY_REMARK_TYPES)[number]["value"])}>
              {DELIVERY_REMARK_TYPES.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </Select>
          </CompactField>
          {requiresConsigneeDestination ? (
            <div className="grid gap-3 md:grid-cols-2">
              <CompactField label="Consignee">
                <Input value={remarkConsignee} onChange={(event) => setRemarkConsignee(event.target.value)} placeholder="Consignee name" />
              </CompactField>
              <CompactField label="Destination">
                <Select value={remarkDestination} onChange={(event) => setRemarkDestination(event.target.value)}>
                  <option value="">Select destination</option>
                  {(adminSources.customerAddressMap.get(bookingRecord.customerId) ?? []).map((address) => (
                    <option key={address.id} value={address.id}>{address.addressName}</option>
                  ))}
                </Select>
              </CompactField>
            </div>
          ) : null}
          {requiresLocation ? (
            <CompactField label="Location">
              <Input value={remarkLocation} onChange={(event) => setRemarkLocation(event.target.value)} placeholder="Enter location" />
            </CompactField>
          ) : null}
          <CompactField label={requiresRemark || requiresConsigneeDestination ? "Remark" : "Remark (Optional)"}>
            <Textarea value={remarkText} onChange={(event) => setRemarkText(event.target.value)} className="min-h-[96px]" placeholder="Enter remark" />
          </CompactField>
        </div>
      </Dialog>

      <Dialog
        open={assignmentOpen}
        onOpenChange={(open) => {
          if (!open) {
            resetAssignmentDialog();
          }
        }}
        title="Assign Booking"
        description="Vehicle assignment is the first mandatory execution step."
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={resetAssignmentDialog}>Cancel</Button>
            <Button onClick={submitAssignment} disabled={!vendorId || !vehicleId || !driverId || Number(vendorFreight) <= 0}>Assign Vehicle</Button>
          </div>
        }
      >
        <div className="grid gap-3 md:grid-cols-2">
          <CompactField label="Vendor">
            <Select value={vendorId} onChange={(event) => { setVendorId(event.target.value); setVehicleId(""); setDriverId(""); }}>
              <option value="">Select vendor</option>
              <option value={OWN_FLEET_VENDOR}>Own Fleet</option>
              {adminSources.vendors.filter((vendor) => vendor.status === "active").map((vendor) => (
                <option key={vendor.id} value={vendor.id}>{vendor.name}</option>
              ))}
            </Select>
          </CompactField>
          <CompactField label="Customer Freight">
            <Input value={customerFreight.toLocaleString()} disabled />
          </CompactField>
          <CompactField label="Vehicle">
            <Select value={vehicleId} onChange={(event) => { setVehicleId(event.target.value); setDriverId(""); }} disabled={!vendorId}>
              <option value="">Select vehicle</option>
              {availableVehicles.map((vehicle) => (
                <option key={vehicle.id} value={vehicle.id}>
                  {vehicle.ownershipType === "OWN" ? `${vehicle.registrationNumber} (OWN)` : `${vehicle.registrationNumber} (${vendorMap.get(vehicle.vendorId ?? "")?.name ?? "Vendor"})`}
                </option>
              ))}
            </Select>
          </CompactField>
          <CompactField label="Driver">
            <Select value={driverId} onChange={(event) => setDriverId(event.target.value)} disabled={!selectedVehicle}>
              <option value="">Select driver</option>
              {availableDrivers.map((driver) => (
                <option key={driver.id} value={driver.id}>{driver.name}</option>
              ))}
            </Select>
          </CompactField>
          <CompactField label="Vendor Freight">
            <Input value={vendorFreight} onChange={(event) => setVendorFreight(event.target.value)} />
          </CompactField>
          <CompactField label="Margin %">
            <Input value={Number.isFinite(marginPercent) ? String(marginPercent) : ""} disabled />
          </CompactField>
        </div>
      </Dialog>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/55 bg-white/75 px-3 py-3">
      <p className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-medium">{value}</p>
    </div>
  );
}

function HeroStat({ label, value, tone }: { label: string; value: string; tone: "blue" | "indigo" | "emerald" | "amber" }) {
  const toneClass =
    tone === "blue"
      ? "from-blue-100 via-sky-100 to-cyan-100"
      : tone === "indigo"
        ? "from-indigo-100 via-violet-100 to-fuchsia-100"
        : tone === "emerald"
          ? "from-emerald-100 via-green-100 to-lime-100"
          : "from-amber-100 via-orange-100 to-yellow-100";
  return (
    <div className={`rounded-[24px] border border-white/80 bg-gradient-to-br ${toneClass} p-4 shadow-sm`}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-2 text-base font-semibold tracking-[-0.02em] text-slate-950">{value}</p>
    </div>
  );
}

function CompactField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}

function getRemarkLabel(type: (typeof DELIVERY_REMARK_TYPES)[number]["value"]) {
  return DELIVERY_REMARK_TYPES.find((item) => item.value === type)?.label ?? type;
}

function DeliveryRemarkTimeline({ remarks }: { remarks: BookingRemark[] }) {
  const sortedRemarks = [...remarks].sort((left, right) => right.timestamp.localeCompare(left.timestamp));
  if (!sortedRemarks.length) {
    return <div className="rounded-xl border border-dashed px-3 py-3 text-xs text-muted-foreground">No delivery remarks</div>;
  }
  return (
    <div className="space-y-2">
      {sortedRemarks.map((remark) => (
        <div key={remark.id} className="rounded-2xl border border-white/70 bg-slate-50/80 px-3 py-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Badge variant="accent">{getRemarkLabel(remark.type as (typeof DELIVERY_REMARK_TYPES)[number]["value"])}</Badge>
            <span className="text-xs text-muted-foreground">{new Date(remark.timestamp).toLocaleString()}</span>
          </div>
          <p className="mt-2 text-sm text-slate-800">{remark.message}</p>
        </div>
      ))}
    </div>
  );
}
