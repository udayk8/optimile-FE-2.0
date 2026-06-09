import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { TenantEmptyState, TenantPanel, TenantSummaryCard } from "@/modules/tenant-admin/components/tenant-primitives";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Dialog } from "@/shared/components/ui/dialog";
import { Input } from "@/shared/components/ui/input";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Select } from "@/shared/components/ui/select";
import { Tabs } from "@/shared/components/ui/tabs";
import { Textarea } from "@/shared/components/ui/textarea";
import { formatCurrency } from "@/shared/lib/format-currency";
import { resolveManualLrScopedOrgUnits } from "@/shared/lib/manual-lr-scope";
import { getAssignmentModeLabel, getCommercialModeLabel } from "@/shared/lib/tenant-config";
import { useSessionContext } from "@/shared/auth/session-context";
import { useTenantAccess } from "@/modules/tenant-admin/hooks/useTenantAccess";
import { useTenantOrgUnits } from "@/modules/tenant-admin/hooks/useTenantOrgUnits";
import { useTenantRouteContext } from "@/modules/tenant-admin/hooks/useTenantRouteContext";
import { BookingStatusBadge } from "@/modules/tms/booking/components/BookingStatusBadge";
import { BookingPageHeader, BookingSummaryStrip } from "./components/BookingPageHeader";
import { BookingRemarksTimeline, BookingStatusTimeline } from "@/modules/tms/booking/components/BookingTimeline";
import { useBookingAdminSources } from "./hooks/useBookingAdminSources";
import { useTenantBookings } from "./hooks/useTenantBookings";
import { useMockStore } from "@/shared/store/mock-store";
import { areAllDeliveryPodsCaptured, areAllDeliveriesPhysicallyCompleted, calculateMarginAmount, calculateMarginPercent, canCancelBooking, getBookingEditability, getDeliveryPodCount, getPrimaryBookingStatus, isDeliveryPodUploaded, isBookingDelayCandidate, normalizeBookingId } from "@/modules/tms/booking/services/booking-engine";
import {
  buildAddressLookup,
  buildCustomerLookup,
  buildDriverLookup,
  buildMaterialLookup,
  buildVehicleLookup,
  buildVehicleTypeLookup,
  buildVendorLookup,
  buildVendorComparison,
  calculateVendorFreightFromRateCard,
  getVendorRateCardUnitRate,
  validateVendorRateCard,
} from "@/modules/tms/booking/services/booking-selectors";
import { VendorContractComparison } from "@/modules/tms/booking/components/VendorContractComparison";
import { cityLaneKey, contractCityLaneKey } from "@shared-utils";
import { loadStore as loadAuctionStore } from "@auction/lib/auction-store";
import { normalizeRateMatchingConfig } from "@/shared/lib/rate-matching-config";
import {
  buildDeliveryRevisionRecord,
  previewDestinationChange,
} from "@/modules/tms/booking/services/destination-change";
import { ensureShipmentDocuments } from "@/modules/tms/booking/services/shipment-documents";
import type {
  BookingAssignmentInput,
  BookingAssignmentChangeType,
  BookingBreakdownEvent,
  BookingDeliveryRecord,
  BookingDeliveryShipmentDocuments,
  BookingDestinationChangeRequest,
  BookingExpenseRecord,
  BookingExpensePaymentMode,
  BookingExpenseStatus,
  BookingPodSnapshot,
  BookingVehicleReplacementHistoryRecord,
  BookingVehicleReplacementInput,
  BookingVehicleReplacementReason,
  BookingVehicleReplacementStatus,
  BookingVehicleReplacementVendorActionInput,
  BookingReassignmentInput,
  BookingReassignmentReason,
  BookingRemark,
  BookingStatusEvent,
  DestinationChangeTemporaryAddress,
} from "@/modules/tms/booking/types";

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
  { value: "DRIVER_CHANGED", label: "Driver Changed" },
  { value: "VEHICLE_CHANGED", label: "Vehicle Changed" },
  { value: "VEHICLE_DRIVER_CHANGED", label: "Vehicle & Driver Changed" },
  { value: "VENDOR_VEHICLE_DRIVER_CHANGED", label: "Vendor + Vehicle + Driver Changed" },
] as const;

const timelineSteps = [
  ["DRAFT", "Draft"],
  ["PENDING_RATE_APPROVAL", "Pending Rate Approval"],
  ["PENDING_ASSIGNMENT", "Pending Assignment"],
  ["IN_TRANSIT", "In Transit"],
  ["POD_PENDING", "POD Pending"],
  ["COMPLETED", "Completed"],
  ["INVOICED", "Invoiced"],
  ["EXCEPTION", "Exception"],
  ["CANCELLED", "Cancelled"],
] as const;

const executionPipelineSteps = [
  ["ACCEPTED", "Accepted"],
  ["VEHICLE_ASSIGNED", "Vehicle Assigned"],
  ["LOADING_STARTED", "Loading Started"],
  ["LOADING_COMPLETED", "Loading Completed"],
  ["DOCUMENT_PENDING", "Document Pending"],
  ["DOCUMENT_COMPLETED", "Document Completed"],
  ["READY_FOR_DISPATCH", "Ready For Dispatch"],
  ["DISPATCHED", "Dispatched"],
] as const;

const REASSIGNABLE_BOOKING_STATUSES = [
  "VEHICLE_ASSIGNED",
  "LOADING_STARTED",
  "LOADING_COMPLETED",
  "DOCUMENT_PENDING",
  "DOCUMENT_COMPLETED",
  "READY_FOR_DISPATCH",
  "DISPATCHED",
  "IN_TRANSIT",
  "POD_PENDING",
  "ASSIGNED",
  "DELAYED",
  "EXCEPTION",
] as const;

const REPLACEABLE_BOOKING_STATUSES = [
  "VEHICLE_ASSIGNED",
  "LOADING_STARTED",
  "LOADING_COMPLETED",
  "DOCUMENT_PENDING",
  "DOCUMENT_COMPLETED",
  "READY_FOR_DISPATCH",
  "DISPATCHED",
  "IN_TRANSIT",
  "POD_PENDING",
  "ASSIGNED",
  "DELAYED",
  "EXCEPTION",
] as const;

const REASSIGNMENT_REASON_OPTIONS: Array<{ value: BookingReassignmentReason; label: string }> = [
  { value: "DRIVER_UNAVAILABLE", label: "Driver unavailable" },
  { value: "DRIVER_SICK", label: "Driver sick" },
  { value: "DRIVER_SHIFT_CHANGE", label: "Driver shift change" },
  { value: "VEHICLE_BREAKDOWN", label: "Vehicle breakdown" },
  { value: "VEHICLE_COMPLIANCE_ISSUE", label: "Vehicle compliance issue" },
  { value: "VEHICLE_PLACEMENT_ISSUE", label: "Vehicle placement issue" },
  { value: "VENDOR_REPLACEMENT", label: "Vendor replacement" },
  { value: "ROUTE_OPERATIONAL_ISSUE", label: "Route operational issue" },
  { value: "CUSTOMER_REQUEST", label: "Customer request" },
  { value: "EMERGENCY_REPLACEMENT", label: "Emergency replacement" },
  { value: "OTHER", label: "Other" },
];

const VEHICLE_REPLACEMENT_REASON_OPTIONS: Array<{ value: BookingVehicleReplacementReason; label: string }> = [
  { value: "VEHICLE_BREAKDOWN", label: "Vehicle breakdown" },
  { value: "VEHICLE_COMPLIANCE_ISSUE", label: "Vehicle compliance issue" },
  { value: "VEHICLE_PLACEMENT_ISSUE", label: "Vehicle placement issue" },
  { value: "VENDOR_REPLACEMENT", label: "Vendor replacement" },
  { value: "ROUTE_OPERATIONAL_ISSUE", label: "Route operational issue" },
  { value: "CUSTOMER_REQUEST", label: "Customer request" },
  { value: "EMERGENCY_REPLACEMENT", label: "Emergency replacement" },
  { value: "OTHER", label: "Other" },
];

const BOOKING_EXPENSE_TYPES = [
  "Loading and Unloading Charges",
  "Detention Charges",
];
const BOOKING_ADVANCE_TYPE = "Advance";
const BOOKING_EXPENSE_PAID_BY = ["Driver", "Vendor", "Company", "Self"];

export function BookingDetailsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { bookingId } = useParams();
  const { tenant } = useTenantRouteContext();
  const { session, setSession } = useSessionContext();
  const { data: orgUnits } = useTenantOrgUnits(tenant.id);
  const access = useTenantAccess();
  const {
    data: allBookings,
    getBookingById,
    transitionBooking,
    updateBooking,
    assignBooking,
    reassignBooking,
    replaceBookingVehicle,
    actionBookingVehicleReplacement,
  } = useTenantBookings(tenant.id);
  const adminSources = useBookingAdminSources(tenant.id);
  const { sendBookingVendorIndent, listBookingVendorIndents, cancelBookingVendorIndent } = useMockStore();
  const [assignmentOpen, setAssignmentOpen] = useState(false);
  const [reassignmentOpen, setReassignmentOpen] = useState(false);
  const [deliveryModalOpen, setDeliveryModalOpen] = useState(false);
  const [breakdownActionOpen, setBreakdownActionOpen] = useState(false);
  const [vehicleReplacementOpen, setVehicleReplacementOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancellationReason, setCancellationReason] = useState("");
  // Contract Vendor (auto-match + comparison) vs Manual Assignment. Default Contract.
  const [assignMethod, setAssignMethod] = useState<"CONTRACT" | "MANUAL">("CONTRACT");
  // Reason required when bypassing the default L1/lowest contract (manual assign).
  const [manualReason, setManualReason] = useState("");
  const [vendorId, setVendorId] = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const [driverId, setDriverId] = useState("");
  const [vendorFreight, setVendorFreight] = useState("");
  const [vendorFreightSource, setVendorFreightSource] = useState<"RATE_CARD" | "MANUAL">("MANUAL");
  const [vendorRateWarning, setVendorRateWarning] = useState("");
  const [matchedVendorRateCardId, setMatchedVendorRateCardId] = useState<string | null>(null);
  const [matchedVendorRateType, setMatchedVendorRateType] = useState<"PER_TRIP" | "PER_KM" | "PER_MT" | null>(null);
  const [buyingRateLabel, setBuyingRateLabel] = useState<string | null>(null);
  const [preferredLrNumber, setPreferredLrNumber] = useState("");
  const [selectedLrMode, setSelectedLrMode] = useState<"MANUAL" | "PRE_GENERATED" | "AUTO">("MANUAL");
  const [expenseLabel, setExpenseLabel] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  // "expense" = charge (loading/detention); "advance" = booking advance entry.
  const [expenseMode, setExpenseMode] = useState<"expense" | "advance">("expense");
  const [expenseViewId, setExpenseViewId] = useState<string | null>(null);
  const [expenseType, setExpenseType] = useState("Loading and Unloading Charges");
  const [expensePaymentMode, setExpensePaymentMode] = useState<BookingExpensePaymentMode>("UPI");
  const [expensePaidBy, setExpensePaidBy] = useState("Driver");
  const [expenseBillFile, setExpenseBillFile] = useState("");
  const [expenseNotes, setExpenseNotes] = useState("");
  const [activeTab, setActiveTab] = useState("Overview");
  const [showExecutionOpsPanel, setShowExecutionOpsPanel] = useState(false);
  const [deliveryWorkspaceTabs, setDeliveryWorkspaceTabs] = useState<Record<string, string>>({});
  const [activeDeliveryWorkspaceId, setActiveDeliveryWorkspaceId] = useState<string | null>(null);
  const [podForms, setPodForms] = useState<Record<string, BookingPodSnapshot>>({});
  const [podEditId, setPodEditId] = useState<string | null>(null);
  const [remarkDeliveryId, setRemarkDeliveryId] = useState<string | null>(null);
  const [remarkType, setRemarkType] = useState<(typeof DELIVERY_REMARK_TYPES)[number]["value"]>("INTACT");
  const [remarkLocation, setRemarkLocation] = useState("");
  const [remarkConsignee, setRemarkConsignee] = useState("");
  const [remarkDestination, setRemarkDestination] = useState("");
  const [remarkText, setRemarkText] = useState("");
  const [breakdownReportedAt, setBreakdownReportedAt] = useState(() => new Date().toISOString().slice(0, 16));
  const [breakdownExpectedRepairAt, setBreakdownExpectedRepairAt] = useState("");
  const [breakdownEvidence, setBreakdownEvidence] = useState("");
  const [destinationChangeReason, setDestinationChangeReason] = useState("");
  const [destinationChangePriority, setDestinationChangePriority] = useState<BookingDestinationChangeRequest["priority"]>("HIGH");
  const [destinationChangeStatusFilter, setDestinationChangeStatusFilter] = useState<BookingDestinationChangeRequest["status"] | "ALL">("ALL");
  const [destinationChangeRequestId, setDestinationChangeRequestId] = useState<string | null>(null);
  const [requestReviewNote, setRequestReviewNote] = useState("");
  const [requestUnloadingNotes, setRequestUnloadingNotes] = useState("");
  const [requestInstructions, setRequestInstructions] = useState("");
  const [requestContactPerson, setRequestContactPerson] = useState("");
  const [requestContactNumber, setRequestContactNumber] = useState("");
  const [temporaryAddressEnabled, setTemporaryAddressEnabled] = useState(false);
  const [temporaryAddressDraft, setTemporaryAddressDraft] = useState<DestinationChangeTemporaryAddress>({
    id: `temporary-address-${Date.now()}`,
    addressLabel: "",
    fullAddress: "",
    city: "",
    state: "",
    pincode: "",
    contactPerson: "",
    contactNumber: "",
    gstNumber: null,
    remarks: null,
    isTemporary: true,
  });
  const [destinationReviewOpen, setDestinationReviewOpen] = useState(false);
  const [reassignmentType, setReassignmentType] = useState<BookingAssignmentChangeType>("DRIVER");
  const [reassignmentVehicleId, setReassignmentVehicleId] = useState("");
  const [reassignmentDriverId, setReassignmentDriverId] = useState("");
  const [reassignmentReason, setReassignmentReason] = useState<BookingReassignmentReason>("DRIVER_UNAVAILABLE");
  const [reassignmentRemark, setReassignmentRemark] = useState("");
  const [reassignmentEffectiveAt, setReassignmentEffectiveAt] = useState(() => new Date().toISOString().slice(0, 16));
  const [reassignmentLocation, setReassignmentLocation] = useState("");
  const [reassignmentVendorId, setReassignmentVendorId] = useState("");
  const [reassignmentVendorFreight, setReassignmentVendorFreight] = useState("");
  const [reassignmentInvoiceDocument, setReassignmentInvoiceDocument] = useState("");
  const [reassignmentEwayBillDocument, setReassignmentEwayBillDocument] = useState("");
  const [reassignmentError, setReassignmentError] = useState("");
  const [activeBreakdownEventId, setActiveBreakdownEventId] = useState<string | null>(null);
  const [breakdownActionType, setBreakdownActionType] = useState<"SELECT" | "REPAIR" | "REPLACE" | "CONTINUE">("SELECT");
  const [repairResponsiblePerson, setRepairResponsiblePerson] = useState("");
  const [repairNote, setRepairNote] = useState("");
  const [repairCurrentLocation, setRepairCurrentLocation] = useState("");
  const [repairCompletionAt, setRepairCompletionAt] = useState(() => new Date().toISOString().slice(0, 16));
  const [repairCompletionRemark, setRepairCompletionRemark] = useState("");
  const [repairDowntimeMinutes, setRepairDowntimeMinutes] = useState("");
  const [breakdownReplacementSourceId, setBreakdownReplacementSourceId] = useState<string | null>(null);
  const [vehicleReplacementType, setVehicleReplacementType] = useState<"VEHICLE_ONLY" | "VENDOR_VEHICLE_DRIVER" | "VENDOR_APP_REPLACEMENT">("VEHICLE_ONLY");
  const [vehicleReplacementVehicleId, setVehicleReplacementVehicleId] = useState("");
  const [vehicleReplacementDriverId, setVehicleReplacementDriverId] = useState("");
  const [vehicleReplacementVendorId, setVehicleReplacementVendorId] = useState("");
  const [vehicleReplacementReason, setVehicleReplacementReason] = useState<BookingVehicleReplacementReason>("VEHICLE_BREAKDOWN");
  const [vehicleReplacementRemark, setVehicleReplacementRemark] = useState("");
  const [vehicleReplacementLocation, setVehicleReplacementLocation] = useState("");
  const [vehicleReplacementEffectiveAt, setVehicleReplacementEffectiveAt] = useState(() => new Date().toISOString().slice(0, 16));
  const [vehicleReplacementInvoiceDocument, setVehicleReplacementInvoiceDocument] = useState("");
  const [vehicleReplacementEwayDocument, setVehicleReplacementEwayDocument] = useState("");
  const [vehicleReplacementVendorRate, setVehicleReplacementVendorRate] = useState("");
  const [vehicleReplacementTargetRequestId, setVehicleReplacementTargetRequestId] = useState<string | null>(null);
  const [vehicleReplacementMode, setVehicleReplacementMode] = useState<"DIRECT" | "VENDOR_ACTION" | "INTERNAL_FALLBACK">("DIRECT");
  const [vehicleReplacementAction, setVehicleReplacementAction] = useState<"ASSIGN_REPLACEMENT" | "REJECT" | "INTERNAL_COMPLETE">("ASSIGN_REPLACEMENT");
  const [vehicleReplacementRejectionReason, setVehicleReplacementRejectionReason] = useState("");
  const [vehicleReplacementVendorRemark, setVehicleReplacementVendorRemark] = useState("");
  const [vehicleReplacementError, setVehicleReplacementError] = useState("");

  const normalizedRouteBookingId = normalizeBookingId(bookingId);
  const booking = bookingId ? getBookingById(normalizedRouteBookingId) : null;
  const customerMap = useMemo(() => buildCustomerLookup(adminSources.customers), [adminSources.customers]);
  const addressMap = useMemo(() => buildAddressLookup(Array.from(adminSources.customerAddressMap.values()).flat()), [adminSources.customerAddressMap]);
  const materialMap = useMemo(() => buildMaterialLookup(adminSources.materials), [adminSources.materials]);
  const driverMap = useMemo(() => buildDriverLookup(adminSources.drivers), [adminSources.drivers]);
  const vehicleMap = useMemo(() => buildVehicleLookup(adminSources.vehicles), [adminSources.vehicles]);
  const vehicleTypeMap = useMemo(() => buildVehicleTypeLookup(adminSources.vehicleTypes), [adminSources.vehicleTypes]);
  const vendorMap = useMemo(() => buildVendorLookup(adminSources.vendors), [adminSources.vendors]);
  const currentUser =
    adminSources.users.find((user) => user.name === session.actorName || user.email === session.actorName) ?? null;
  const currentUserOrgUnitIds = currentUser?.orgUnitIds ?? [];

  useEffect(() => {
    if (!booking?.deliveries?.length) {
      return;
    }
    setPodForms(
      Object.fromEntries(
        booking.deliveries.map((delivery) => [
          delivery.id,
          {
            podDocument: delivery.pod?.podDocument ?? delivery.pod?.photoName ?? "",
            podUploaded: delivery.pod?.podUploaded ?? Boolean(delivery.pod?.capturedAt),
            podUploadedAt: delivery.pod?.podUploadedAt ?? delivery.pod?.capturedAt ?? null,
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
    const firstDeliveryId = booking?.deliveries?.[0]?.id ?? null;
    setActiveDeliveryWorkspaceId((current) => {
      if (current && booking?.deliveries?.some((delivery) => delivery.id === current)) {
        return current;
      }
      return firstDeliveryId;
    });
  }, [booking?.deliveries]);

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
  const assignmentHistory = bookingRecord.assignmentHistory ?? [];
  const vehicleReplacementHistory = bookingRecord.vehicleReplacementHistory ?? [];
  const canChangeAssignment =
    Boolean(bookingRecord.assignment) &&
    REASSIGNABLE_BOOKING_STATUSES.includes(bookingRecord.status as (typeof REASSIGNABLE_BOOKING_STATUSES)[number]) &&
    access.can("BOOKING_DETAIL", "CHANGE_ASSIGNMENT");
  const canReplaceVehicle =
    Boolean(bookingRecord.assignment) &&
    REPLACEABLE_BOOKING_STATUSES.includes(bookingRecord.status as (typeof REPLACEABLE_BOOKING_STATUSES)[number]) &&
    access.can("BOOKING_DETAIL", "REPLACE_VEHICLE");
  const vehicleType = bookingRecord.vehicleTypeId ? vehicleTypeMap.get(bookingRecord.vehicleTypeId) ?? null : null;
  const shipmentDocuments = bookingRecord.shipmentDocuments ?? ensureShipmentDocuments(bookingRecord);
  const documentsReady = shipmentDocuments.deliveries.every((delivery) => delivery.invoices.length > 0 && Boolean(delivery.ewayBill?.ewayBillNumber));
  const invoiceOrEwayUploaded = shipmentDocuments.deliveries.some((delivery) => delivery.invoices.length > 0 || Boolean(delivery.ewayBill?.ewayBillNumber));
  const loadingStarted =
    Boolean(bookingRecord.assignment?.loadingStartedAt) ||
    bookingRecord.statusTimeline.some((event) =>
      ["LOADING_STARTED", "LOADING_COMPLETED", "DOCUMENT_PENDING", "DOCUMENT_COMPLETED", "READY_FOR_DISPATCH", "DISPATCHED", "IN_TRANSIT", "ARRIVED", "COMPLETED"].includes(event.status),
    );
  const loadingCompleted =
    Boolean(bookingRecord.assignment?.loadingCompletedAt) ||
    bookingRecord.statusTimeline.some((event) =>
      ["LOADING_COMPLETED", "DOCUMENT_PENDING", "DOCUMENT_COMPLETED", "READY_FOR_DISPATCH", "DISPATCHED", "IN_TRANSIT", "ARRIVED", "COMPLETED"].includes(event.status),
    );
  const latestFreight = shipmentDocuments.totalFreightRate ?? bookingRecord.pricing.calculatedFreight;
  const customerFreight = bookingRecord.pricing.calculatedFreight;
  const marginAmount = calculateMarginAmount(customerFreight, Number(vendorFreight || 0));
  const marginPercent = calculateMarginPercent(customerFreight, Number(vendorFreight || 0));

  // Vendor Recommendation Engine — booking payload + per-vendor contract match.
  const assignSourceAddress = addressMap.get(bookingRecord.sourceAddressId) ?? null;
  const assignDestinationAddress = addressMap.get(bookingRecord.destinationAddressId) ?? null;
  const assignVehicleTypeCode = bookingRecord.vehicleTypeId
    ? adminSources.vehicleTypes.find((vehicleType) => vehicleType.id === bookingRecord.vehicleTypeId)?.typeCode ?? null
    : null;
  const assignMaterialCode =
    (bookingRecord.materialIds ?? [])
      .map((id) => adminSources.materials.find((material) => material.id === id)?.materialCode)
      .find(Boolean) ?? null;
  const assignDistanceKm =
    bookingRecord.deliveries?.reduce((max, delivery) => Math.max(max, Number(delivery.distanceKm || 0)), 0) ??
    Number(bookingRecord.pricing.distanceKm || 0);
  const assignWeight = Number(bookingRecord.weight || 0);
  const vendorComparison = useMemo(
    () =>
      buildVendorComparison({
        vendors: adminSources.vendors,
        vendorRateCardMap: adminSources.vendorRateCardMap,
        customerFreight,
        input: {
          bookingDate: bookingRecord.pickupDate ?? null,
          fromCity: assignSourceAddress?.city ?? null,
          toCity: assignDestinationAddress?.city ?? null,
          fromLocation: assignSourceAddress?.addressName ?? null,
          toLocation: assignDestinationAddress?.addressName ?? null,
          fromPincode: assignSourceAddress?.pincode ?? null,
          toPincode: assignDestinationAddress?.pincode ?? null,
          vehicleType: assignVehicleTypeCode,
          material: assignMaterialCode,
          weight: assignWeight,
          distanceKm: assignDistanceKm,
          preferredRateType: bookingRecord.pricing.rateType,
        },
        // Trips already fulfilled by a vendor on the lane → drives trips-remaining.
        completedTrips: (vendorId, fromCity, toCity) => {
          const norm = (value?: string | null) => (value ?? "").trim().toLowerCase();
          return allBookings.filter((b) => {
            if (getPrimaryBookingStatus(b.status) !== "COMPLETED") return false;
            if ((b.assignment?.vendorId ?? null) !== vendorId) return false;
            const src = addressMap.get(b.sourceAddressId)?.city;
            const dst = addressMap.get(b.destinationAddressId)?.city;
            return norm(src) === norm(fromCity) && norm(dst) === norm(toCity);
          }).length;
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [adminSources.vendors, adminSources.vendorRateCardMap, customerFreight, bookingRecord, assignSourceAddress, assignDestinationAddress, assignVehicleTypeCode, assignMaterialCode, allBookings, addressMap],
  );

  // L1 / lowest-rate contract(s). vendorComparison is sorted cheapest-first, so
  // the first entry's freight is the best rate; ties (multiple vendors at that
  // exact rate) are ALL treated as L1 — any of them is a no-remark default pick.
  const lowestVendorFreight = vendorComparison[0]?.vendorFreight ?? null;
  const l1Entries = vendorComparison.filter((entry) => entry.vendorFreight === lowestVendorFreight);
  const l1RateCardIds = l1Entries.map((entry) => entry.rateCardId);

  // Contract Vendor indent stage. The booking stays PENDING_ASSIGNMENT throughout;
  // the stage is derived from the vendor indents (send → pending → accepted/rejected).
  const isSpotBooking = bookingRecord.commercialType === "SPOT";
  // Active, unconsumed spot auction contracts on this lane — a one-time contract
  // with a locked price. When present, the dispatcher sends the indent to that
  // vendor instead of broadcasting to all.
  const spotContractMatches = useMemo(() => {
    if (!isSpotBooking) return [] as Array<{ contractId: string; vendorId: string; vendorName: string; rate: number }>;
    const origin = assignSourceAddress?.city;
    const destination = assignDestinationAddress?.city;
    if (!origin || !destination) return [];
    const laneKey = cityLaneKey(origin, destination);
    const today = new Date().toISOString().slice(0, 10);
    return loadAuctionStore()
      .contracts.filter(
        (contract) =>
          contract.contractType === "SPOT" &&
          contract.status === "ACTIVE" &&
          !contract.consumedByBookingId &&
          contractCityLaneKey(contract) === laneKey &&
          contract.endDate >= today,
      )
      .map((contract) => ({
        contractId: contract.id,
        vendorId: contract.vendorId,
        vendorName: contract.vendorName,
        rate: contract.contractedRate,
      }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSpotBooking, assignSourceAddress?.city, assignDestinationAddress?.city]);
  const myBookingIndents = listBookingVendorIndents(tenant.id).filter((indent) => indent.bookingId === bookingRecord.id);
  const winnerIndent = myBookingIndents.find((indent) => indent.isWinner && indent.status === "ACCEPTED") ?? null;
  const pendingIndent = myBookingIndents.find((indent) => indent.status === "PENDING") ?? null;
  const rejectedIndentVendorIds = Array.from(
    new Set(myBookingIndents.filter((indent) => indent.status === "REJECTED").map((indent) => indent.vendorId)),
  );
  const pendingIndentBuyingRate =
    pendingIndent?.buyingRate ?? vendorComparison.find((entry) => entry.vendorId === pendingIndent?.vendorId)?.vendorFreight ?? null;
  const winnerIndentBuyingRate =
    winnerIndent?.buyingRate ?? vendorComparison.find((entry) => entry.vendorId === winnerIndent?.vendorId)?.vendorFreight ?? null;

  function sendIndentToVendor(targetVendorId: string, reason?: string) {
    const entry = vendorComparison.find((item) => item.vendorId === targetVendorId);
    try {
      sendBookingVendorIndent(
        bookingRecord.id,
        session.actorName || "Dispatcher",
        session.activeTenantOrgUnitId ?? null,
        orgUnits.find((unit) => unit.id === session.activeTenantOrgUnitId)?.name ?? null,
        targetVendorId,
        entry?.vendorFreight ?? null,
        undefined,
        reason ?? null,
      );
    } catch (error) {
      window.alert((error as Error).message);
    }
  }
  // Spot bookings: send the indent to the spot-contract vendor (locked one-time
  // rate) when one exists, or broadcast to all vendors (targetVendorId = null).
  function sendSpotIndent(targetVendorId: string | null, buyingRate: number | null) {
    try {
      sendBookingVendorIndent(
        bookingRecord.id,
        session.actorName || "Dispatcher",
        session.activeTenantOrgUnitId ?? null,
        orgUnits.find((unit) => unit.id === session.activeTenantOrgUnitId)?.name ?? null,
        targetVendorId,
        buyingRate,
      );
    } catch (error) {
      window.alert((error as Error).message);
    }
  }
  function cancelPendingIndent() {
    if (!pendingIndent) return;
    try {
      cancelBookingVendorIndent(pendingIndent.id);
    } catch (error) {
      window.alert((error as Error).message);
    }
  }
  // Once a vendor accepts, prefill them as the assigned vendor so the buying
  // freight + assignment fields populate for the ops team.
  useEffect(() => {
    if (winnerIndent && vendorId !== winnerIndent.vendorId) {
      setVendorId(winnerIndent.vendorId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [winnerIndent?.vendorId]);

  // SPOT and Manual modes use a vendor dropdown + direct freight entry. Contract
  // mode only reveals the vehicle/driver/LR fields AFTER a vendor accepts the indent.
  const manualVendorSelection = isSpotBooking || assignMethod === "MANUAL";
  const showAssignmentFields = manualVendorSelection || (assignMethod === "CONTRACT" && Boolean(winnerIndent));

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
  const reassignmentVehicle = reassignmentVehicleId ? vehicleMap.get(reassignmentVehicleId) ?? null : null;
  const reassignmentSelectedVendorId = reassignmentVehicle?.vendorId ?? bookingRecord.assignment?.vendorId ?? null;
  const reassignmentVendor = reassignmentSelectedVendorId ? vendorMap.get(reassignmentSelectedVendorId) ?? null : null;
  const availableReassignmentVehicles = adminSources.vehicles.filter((vehicle) => {
    if (!vehicle.isActive) {
      return false;
    }
    if (!bookingRecord.assignment) {
      return false;
    }
    if (reassignmentType === "DRIVER") {
      return vehicle.id === bookingRecord.assignment.vehicleId;
    }
    if (reassignmentType === "VENDOR_VEHICLE_DRIVER") {
      return vehicle.id !== bookingRecord.assignment.vehicleId && (vehicle.vendorId ?? "") === reassignmentVendorId;
    }
    return vehicle.id !== bookingRecord.assignment.vehicleId;
  });
  const availableReassignmentDrivers = adminSources.drivers.filter((driver) => {
    if (!driver.isActive || !bookingRecord.assignment) {
      return false;
    }
    if (reassignmentType === "DRIVER") {
      return driver.id !== bookingRecord.assignment.driverId;
    }
    return true;
  }).sort((left, right) => {
    const targetVendorId =
      reassignmentType === "VENDOR_VEHICLE_DRIVER"
        ? reassignmentVendorId || null
        : reassignmentVehicle?.vendorId ?? bookingRecord.assignment?.vendorId ?? null;
    const leftMatch = (left.vendorId ?? null) === targetVendorId ? 1 : 0;
    const rightMatch = (right.vendorId ?? null) === targetVendorId ? 1 : 0;
    if (leftMatch !== rightMatch) {
      return rightMatch - leftMatch;
    }
    return left.name.localeCompare(right.name);
  });
  const reassignmentVendorFreightNumber = Number(reassignmentVendorFreight || 0);
  const reassignmentCustomerFreight = bookingRecord.assignment?.customerFreight ?? customerFreight;
  const reassignmentMarginImpact =
    Number.isFinite(reassignmentVendorFreightNumber) && reassignmentVendorFreight.trim()
      ? Number((reassignmentCustomerFreight - reassignmentVendorFreightNumber).toFixed(2))
      : bookingRecord.assignment?.marginAmount ?? null;
  const reassignmentVendorChanged =
    Boolean(bookingRecord.assignment) &&
    ((reassignmentType === "VENDOR_VEHICLE_DRIVER" ? reassignmentVendorId || null : reassignmentVehicle?.vendorId ?? bookingRecord.assignment?.vendorId ?? null) !==
      (bookingRecord.assignment?.vendorId ?? null));
  const availableReplacementVehicles = adminSources.vehicles.filter((vehicle) => {
    if (!vehicle.isActive || !bookingRecord.assignment) {
      return false;
    }
    if (vehicleReplacementMode === "DIRECT") {
      return vehicle.id !== bookingRecord.assignment.vehicleId;
    }
    if (vehicleReplacementMode === "VENDOR_ACTION" && currentUser?.linkedVendorId) {
      return (vehicle.vendorId ?? null) === currentUser.linkedVendorId && vehicle.id !== bookingRecord.assignment.vehicleId;
    }
    return vehicle.id !== bookingRecord.assignment.vehicleId;
  });
  const replacementVehicle = vehicleReplacementVehicleId ? vehicleMap.get(vehicleReplacementVehicleId) ?? null : null;
  const replacementVendorId = vehicleReplacementVendorId || replacementVehicle?.vendorId || bookingRecord.assignment?.vendorId || "";
  const availableReplacementDrivers = adminSources.drivers.filter((driver) => {
    if (!driver.isActive || !bookingRecord.assignment) {
      return false;
    }
    const targetVendorId = replacementVehicle?.vendorId ?? (replacementVendorId || null);
    if (vehicleReplacementMode === "VENDOR_ACTION" && currentUser?.linkedVendorId) {
      return (driver.vendorId ?? null) === currentUser.linkedVendorId;
    }
    return (driver.vendorId ?? null) === (targetVendorId || null);
  });
  const currentDriverCompatibleWithSelectedVehicle =
    reassignmentVehicle && bookingRecord.assignment
      ? (reassignmentVehicle.vendorId ?? null) === (bookingRecord.assignment.vendorId ?? null)
      : true;
  const currentVendorReplacementRequest =
    vehicleReplacementTargetRequestId
      ? vehicleReplacementHistory.find((entry) => entry.id === vehicleReplacementTargetRequestId) ?? null
      : null;
  const selectedLrConfig = useMemo(
    () =>
      adminSources.lrConfigs.find((config) => config.status === "active" && config.lrType === "MANUAL") ??
      adminSources.lrConfigs.find((config) => config.lrType === "MANUAL") ??
      null,
    [adminSources.lrConfigs],
  );
  const selectedAutoLrConfig = useMemo(
    () =>
      adminSources.lrConfigs.find((config) => config.status === "active" && config.lrType === "AUTO") ??
      adminSources.lrConfigs.find((config) => config.lrType === "AUTO") ??
      null,
    [adminSources.lrConfigs],
  );
  const selectedAssignmentLrConfig = selectedLrMode === "AUTO" ? selectedAutoLrConfig : selectedLrConfig;
  const availableLrOrgUnits = useMemo(
    () =>
      resolveManualLrScopedOrgUnits({
        orgUnits,
        assignedOrgUnitIds: currentUserOrgUnitIds,
        ownershipLevelId: selectedAssignmentLrConfig?.ownershipLevelId ?? null,
        config: selectedAssignmentLrConfig,
        activeOrgUnitId: session.activeTenantOrgUnitId,
      }),
    [currentUserOrgUnitIds, orgUnits, selectedAssignmentLrConfig, session.activeTenantOrgUnitId],
  );
  const activeLrOrgUnitId =
    session.activeTenantOrgUnitId &&
    availableLrOrgUnits.some((orgUnit) => orgUnit.id === session.activeTenantOrgUnitId)
      ? session.activeTenantOrgUnitId
      : availableLrOrgUnits.length === 1
        ? availableLrOrgUnits[0].id
        : "";
  const activeLrOrgUnit = activeLrOrgUnitId
    ? availableLrOrgUnits.find((orgUnit) => orgUnit.id === activeLrOrgUnitId) ?? null
    : null;
  const requiresActiveLrScope = availableLrOrgUnits.length > 1 && !activeLrOrgUnitId;
  const availableManualPools = useMemo(() => {
    if (!selectedLrConfig) {
      return [];
    }
    const bookingCustomerId = bookingRecord.customerId;
    const scopedPools = adminSources.lrPools.filter(
      (pool) =>
        pool.tenantId === tenant.id &&
        pool.configId === selectedLrConfig.id &&
        ["AVAILABLE", "ALLOCATED"].includes(pool.status) &&
        (!activeLrOrgUnitId || (pool.currentPlaceId ?? pool.ownerPlaceId ?? pool.ownerLevelId) === activeLrOrgUnitId),
    );
    if (selectedLrMode === "PRE_GENERATED") {
      return scopedPools.filter(
        (pool) => (pool.poolType ?? (pool.customerId ? "CUSTOMER_RESERVED" : "GENERAL")) === "CUSTOMER_RESERVED" && pool.customerId === bookingCustomerId,
      );
    }
    return scopedPools.filter(
      (pool) => (pool.poolType ?? (pool.customerId ? "CUSTOMER_RESERVED" : "GENERAL")) === "GENERAL" && !pool.customerId,
    );
  }, [activeLrOrgUnitId, adminSources.lrPools, availableLrOrgUnits, bookingRecord.customerId, selectedLrConfig, selectedLrMode, tenant.id]);
  const canUseManualLr = Boolean(selectedLrConfig);
  const canUseAutoLr = Boolean(selectedAutoLrConfig);
  const selectedRemarkDelivery = remarkDeliveryId ? (bookingRecord.deliveries ?? []).find((delivery) => delivery.id === remarkDeliveryId) ?? null : null;
  const requiresLocation = ["ACCIDENT_INCIDENT", "VEHICLE_BREAKDOWN", "DESTINATION_CHANGED", "CONSIGNEE_DESTINATION_CHANGED"].includes(remarkType);
  const requiresRemark = ["DEPS", "CONSIGNEE_DESTINATION_CHANGED"].includes(remarkType);
  const requiresConsigneeDestination = remarkType === "CONSIGNEE_DESTINATION_CHANGED";
  const visibleBookingStatus = getPrimaryBookingStatus(bookingRecord.status);
  const allDeliveryPodsCaptured = areAllDeliveryPodsCaptured(bookingRecord.deliveries);
  const pendingPodDeliveries = (bookingRecord.deliveries ?? []).filter((delivery) => !delivery.pod?.podUploaded);
  const currentTimelineStage = getCurrentTimelineStage(bookingRecord.statusTimeline);
  const currentExecutionStage = getCurrentExecutionStage(bookingRecord.statusTimeline);
  const latestCancellationReason =
    [...bookingRecord.remarks]
      .filter((remark) => remark.type === "CANCELLATION_REMARK")
      .sort((left, right) => right.timestamp.localeCompare(left.timestamp))[0]?.message ??
    [...bookingRecord.statusTimeline]
      .filter((event) => event.status === "CANCELLED")
      .sort((left, right) => right.timestamp.localeCompare(left.timestamp))[0]?.note ??
    "";
  const deliveryLrUsage = useMemo(() => {
    const counts = new Map<string, number>();
    (bookingRecord.deliveries ?? []).forEach((delivery) => {
      const lrNumber = delivery.lrNumber?.trim();
      if (!lrNumber) {
        return;
      }
      counts.set(lrNumber, (counts.get(lrNumber) ?? 0) + 1);
    });
    return counts;
  }, [bookingRecord.deliveries]);
  const customerAddresses = adminSources.customerAddressMap.get(bookingRecord.customerId) ?? [];
  const activeDeliveryAddress =
    activeDeliveryWorkspaceId
      ? (bookingRecord.deliveries ?? []).find((delivery) => delivery.id === activeDeliveryWorkspaceId)?.destinationAddressId
      : null;
  const activeConsigneeAddress = activeDeliveryAddress ? addressMap.get(activeDeliveryAddress) ?? null : null;
  const normalizeAddressToken = (value?: string | null) =>
    (value ?? "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  const activeAddressTokens = [
    normalizeAddressToken(activeConsigneeAddress?.fullAddress),
    normalizeAddressToken(activeConsigneeAddress?.addressLabel),
    normalizeAddressToken(activeConsigneeAddress?.addressLine1),
    normalizeAddressToken(activeConsigneeAddress?.addressName),
  ].filter(Boolean);
  const matchedCustomerMasterAddress =
    customerAddresses.find((address) => {
      const customerAddressTokens = [
        normalizeAddressToken(address.fullAddress),
        normalizeAddressToken(address.addressLabel),
        normalizeAddressToken(address.addressLine1),
        normalizeAddressToken(address.addressName),
      ].filter(Boolean);
      return activeAddressTokens.some(
        (activeToken) =>
          customerAddressTokens.includes(activeToken) ||
          customerAddressTokens.some((customerToken) => customerToken.includes(activeToken) || activeToken.includes(customerToken)),
      );
    }) ?? null;
  const activeConsigneeKey =
    matchedCustomerMasterAddress?.consigneeId?.trim().toLowerCase() ||
    matchedCustomerMasterAddress?.consigneeName?.trim().toLowerCase() ||
    activeConsigneeAddress?.consigneeId?.trim().toLowerCase() ||
    activeConsigneeAddress?.consigneeName?.trim().toLowerCase() ||
    "";
  const filteredDestinationChangeAddressOptions = customerAddresses.filter(
    (address) => {
      const addressConsigneeKey =
        address.consigneeId?.trim().toLowerCase() ||
        address.consigneeName?.trim().toLowerCase() ||
        "";
      const matchesConsignee = activeConsigneeKey ? addressConsigneeKey === activeConsigneeKey : true;
      return (
        address.status === "active" &&
        matchesConsignee &&
        (address.addressUsage === "DESTINATION" || address.addressUsage === "BOTH") &&
        ["PRIMARY", "ADDITIONAL", "EMERGENCY"].includes(address.operationalAddressType ?? "PRIMARY")
      );
    },
  );
  const destinationChangeAddressOptions =
    filteredDestinationChangeAddressOptions.length > 0
      ? filteredDestinationChangeAddressOptions
      : customerAddresses.filter(
          (address) =>
            address.status === "active" &&
            (address.addressUsage === "DESTINATION" || address.addressUsage === "BOTH") &&
            ["PRIMARY", "ADDITIONAL", "EMERGENCY"].includes(address.operationalAddressType ?? "PRIMARY"),
        );
  const defaultDestinationChangeAddressId =
    destinationChangeAddressOptions.find((address) => address.isTemporary)?.id ??
    destinationChangeAddressOptions[0]?.id ??
    "";
  const destinationChangeRequests = (bookingRecord.destinationChangeRequests ?? [])
    .filter((request) => destinationChangeStatusFilter === "ALL" || request.status === destinationChangeStatusFilter)
    .sort((left, right) => right.raisedAt.localeCompare(left.raisedAt));
  const selectedDestinationChangeRequest =
    bookingRecord.destinationChangeRequests?.find((request) => request.id === destinationChangeRequestId) ?? null;
  const selectedDestinationChangeDelivery =
    selectedDestinationChangeRequest
      ? bookingRecord.deliveries?.find((delivery) => delivery.id === selectedDestinationChangeRequest.deliveryId) ?? null
      : selectedRemarkDelivery;
  const currentDestinationAddress =
    selectedDestinationChangeDelivery?.destinationAddressId
      ? addressMap.get(selectedDestinationChangeDelivery.destinationAddressId) ?? null
      : null;
  const requestedDestinationAddress =
    selectedDestinationChangeRequest?.requestedAddressId
      ? addressMap.get(selectedDestinationChangeRequest.requestedAddressId) ?? null
      : remarkDestination
        ? addressMap.get(remarkDestination) ?? null
        : null;
  const canRaiseDestinationChange =
    currentUser?.userType === "CUSTOMER" ||
    /operations manager|dispatch supervisor|tenant admin|region manager/i.test(access.activeRole?.name ?? "");
  const canApproveDestinationChange = /operations manager|tenant admin|region manager/i.test(access.activeRole?.name ?? "");
  const canCreateTemporaryOperationalAddress = currentUser?.userType !== "CUSTOMER";
  const revisionPendingRequests = (bookingRecord.destinationChangeRequests ?? []).filter((request) =>
    ["SUBMITTED", "UNDER_REVIEW", "APPROVED"].includes(request.status),
  );
  const bookingRevisionEnabled = revisionPendingRequests.length > 0;
  const bookingRevised = (bookingRecord.deliveries ?? []).some((delivery) => (delivery.revisions?.length ?? 0) > 0);
  const bookingOperationalAlert = bookingRevisionEnabled || bookingRevised;
  const breakdownEvents = [...(bookingRecord.breakdownEvents ?? [])].sort((left, right) => right.reportedAt.localeCompare(left.reportedAt));
  const activeBreakdownEvent = activeBreakdownEventId
    ? breakdownEvents.find((event) => event.id === activeBreakdownEventId) ?? null
    : breakdownEvents[0] ?? null;
  const visibleBreakdownEvent =
    breakdownEvents.find((event) => ["WAITING_FOR_REPAIR", "REPLACEMENT_REQUIRED"].includes(event.repairStatus)) ??
    breakdownEvents[0] ??
    null;
  const canHandleVehicleBreakdown = access.can("BOOKING_DETAIL", "HANDLE_VEHICLE_BREAKDOWN");
  const canSubmitReassignment =
    canChangeAssignment || (Boolean(breakdownReplacementSourceId) && canHandleVehicleBreakdown && Boolean(bookingRecord.assignment));
  const actionableReassignmentRemarks = [...bookingRecord.remarks]
    .filter((remark) => ["DRIVER_CHANGED", "VEHICLE_CHANGED", "VEHICLE_DRIVER_CHANGED", "VENDOR_VEHICLE_DRIVER_CHANGED", "DRIVER_AND_VEHICLE_CHANGED"].includes(remark.type))
    .sort((left, right) => right.timestamp.localeCompare(left.timestamp));
  const openVehicleReplacementRequests = vehicleReplacementHistory.filter((entry) =>
    ["SENT_TO_VENDOR", "INTERNAL_REPLACEMENT_REQUIRED"].includes(entry.status),
  );
  const currentVendorLinked = currentUser?.linkedVendorId ?? null;
  const vendorReplacementRequests = openVehicleReplacementRequests.filter(
    (entry) => entry.status === "SENT_TO_VENDOR" && entry.previousVendorId && entry.previousVendorId === currentVendorLinked,
  );
  const internalReplacementRequests = openVehicleReplacementRequests.filter(
    (entry) => entry.status === "INTERNAL_REPLACEMENT_REQUIRED",
  );
  const destinationChangePreview =
    selectedDestinationChangeDelivery
      ? previewDestinationChange({
          booking: bookingRecord,
          delivery: selectedDestinationChangeDelivery,
          customer,
          sourceAddress,
          currentAddress: currentDestinationAddress,
          proposedAddress: requestedDestinationAddress,
          temporaryAddress:
            selectedDestinationChangeRequest?.temporaryAddress ??
            (temporaryAddressEnabled ? temporaryAddressDraft : null),
          rateCards: adminSources.customerRateCardMap.get(bookingRecord.customerId) ?? [],
        })
      : null;

  useEffect(() => {
    if (!destinationReviewOpen) {
      return;
    }
    if (!destinationChangeAddressOptions.length) {
      return;
    }
    setRemarkDestination((current) =>
      current && destinationChangeAddressOptions.some((address) => address.id === current)
        ? current
        : defaultDestinationChangeAddressId,
    );
  }, [defaultDestinationChangeAddressId, destinationChangeAddressOptions, destinationReviewOpen]);

  useEffect(() => {
    if (!bookingRecord.assignment || !reassignmentOpen) {
      return;
    }
    if (reassignmentType === "DRIVER") {
      setReassignmentVehicleId(bookingRecord.assignment.vehicleId);
      setReassignmentVendorId(bookingRecord.assignment.vendorId ?? "");
      return;
    }
    if (reassignmentType === "VEHICLE") {
      setReassignmentVendorId(reassignmentVehicle?.vendorId ?? bookingRecord.assignment.vendorId ?? "");
      return;
    }
    if (reassignmentType === "VEHICLE_DRIVER" || reassignmentType === "DRIVER_AND_VEHICLE") {
      setReassignmentVendorId(reassignmentVehicle?.vendorId ?? bookingRecord.assignment.vendorId ?? "");
      return;
    }
    if (reassignmentType === "VENDOR_VEHICLE_DRIVER" && !reassignmentVendorId) {
      setReassignmentVehicleId("");
      setReassignmentDriverId("");
    }
  }, [bookingRecord.assignment, reassignmentOpen, reassignmentType, reassignmentVehicle?.vendorId, reassignmentVendorId]);

  function getVisibleDeliveryLrNumber(delivery: BookingDeliveryRecord) {
    const lrNumber = delivery.lrNumber?.trim();
    if (!lrNumber) {
      return null;
    }
    return (deliveryLrUsage.get(lrNumber) ?? 0) > 1 ? null : lrNumber;
  }

  function resetAssignmentDialog() {
    setAssignmentOpen(false);
    setVendorId("");
    setVehicleId("");
    setDriverId("");
    setVendorFreight("");
    setVendorFreightSource("MANUAL");
    setVendorRateWarning("");
      setMatchedVendorRateCardId(null);
      setMatchedVendorRateType(null);
      setBuyingRateLabel(null);
      setManualReason("");
      setPreferredLrNumber("");
      if (bookingRecord.lrType === "AUTO") {
        setSelectedLrMode("AUTO");
      } else {
        setSelectedLrMode(bookingRecord.manualLrPoolPreference === "PRE_GENERATED" ? "PRE_GENERATED" : "MANUAL");
      }
  }

  function openReassignmentDialog() {
    if (!bookingRecord.assignment) {
      return;
    }
    setReassignmentType("DRIVER");
    setReassignmentVehicleId(bookingRecord.assignment.vehicleId);
    setReassignmentDriverId("");
    setReassignmentVendorId(bookingRecord.assignment.vendorId ?? "");
    setReassignmentVendorFreight(bookingRecord.assignment.vendorFreight != null ? String(bookingRecord.assignment.vendorFreight) : "");
    setReassignmentInvoiceDocument("");
    setReassignmentEwayBillDocument("");
    setReassignmentReason("DRIVER_UNAVAILABLE");
    setReassignmentRemark("");
    setReassignmentLocation("");
    setReassignmentEffectiveAt(new Date().toISOString().slice(0, 16));
    setReassignmentError("");
    setBreakdownReplacementSourceId(null);
    setReassignmentOpen(true);
  }

  function triggerReassignmentFromRemark(remark: BookingRemark) {
    if (!bookingRecord.assignment) {
      return;
    }
    setReassignmentType(
      remark.type === "DRIVER_CHANGED"
        ? "DRIVER"
        : remark.type === "VEHICLE_CHANGED"
          ? "VEHICLE"
          : remark.type === "VENDOR_VEHICLE_DRIVER_CHANGED"
            ? "VENDOR_VEHICLE_DRIVER"
            : "VEHICLE_DRIVER",
    );
    setReassignmentVehicleId(bookingRecord.assignment.vehicleId);
    setReassignmentDriverId("");
    setReassignmentVendorId(bookingRecord.assignment.vendorId ?? "");
    setReassignmentVendorFreight(bookingRecord.assignment.vendorFreight != null ? String(bookingRecord.assignment.vendorFreight) : "");
    setReassignmentInvoiceDocument("");
    setReassignmentEwayBillDocument("");
    setReassignmentReason(
      remark.type === "VEHICLE_CHANGED" ? "VEHICLE_BREAKDOWN" : "DRIVER_UNAVAILABLE",
    );
    setReassignmentRemark(remark.message);
    setReassignmentLocation(remark.location ?? "");
    setReassignmentEffectiveAt(new Date().toISOString().slice(0, 16));
    setReassignmentError("");
    setBreakdownReplacementSourceId(null);
    setReassignmentOpen(true);
  }

  function resetReassignmentDialog() {
    setReassignmentOpen(false);
    setReassignmentType("DRIVER");
    setReassignmentVehicleId(bookingRecord.assignment?.vehicleId ?? "");
    setReassignmentDriverId("");
    setReassignmentVendorId(bookingRecord.assignment?.vendorId ?? "");
    setReassignmentVendorFreight(bookingRecord.assignment?.vendorFreight != null ? String(bookingRecord.assignment.vendorFreight) : "");
    setReassignmentInvoiceDocument("");
    setReassignmentEwayBillDocument("");
    setReassignmentReason("DRIVER_UNAVAILABLE");
    setReassignmentRemark("");
    setReassignmentLocation("");
    setReassignmentEffectiveAt(new Date().toISOString().slice(0, 16));
    setReassignmentError("");
    setBreakdownReplacementSourceId(null);
  }

  function startRepairWait() {
    if (!activeBreakdownEvent) {
      return;
    }
    const timestamp = new Date().toISOString();
    updateBooking(bookingRecord.id, {
      breakdownEvents: (bookingRecord.breakdownEvents ?? []).map((event) =>
        event.id === activeBreakdownEvent.id
          ? {
              ...event,
              repairStatus: "WAITING_FOR_REPAIR" as const,
              expectedRepairAt: breakdownExpectedRepairAt ? new Date(breakdownExpectedRepairAt).toISOString() : event.expectedRepairAt ?? null,
              repairStartedAt: event.repairStartedAt ?? timestamp,
              repairRemark: repairNote.trim() || event.repairRemark || null,
              responsiblePerson: repairResponsiblePerson.trim() || null,
              location: repairCurrentLocation.trim() || event.location,
            }
          : event,
      ),
      statusTimeline: [
        ...bookingRecord.statusTimeline,
        {
          id: `booking-status-${Date.now()}-repair-wait`,
          status: bookingRecord.status,
          timestamp,
          actor: session.actorName || "Operations",
          eventLabel: "REPAIR_WAIT_STARTED",
          note: `Repair wait started at ${repairCurrentLocation.trim() || activeBreakdownEvent.location}.`,
        },
      ],
    });
    resetBreakdownActionDialog();
  }

  function updateRepairAndContinue() {
    if (!activeBreakdownEvent) {
      return;
    }
    const completedAt = repairCompletionAt ? new Date(repairCompletionAt).toISOString() : new Date().toISOString();
    const reportedAt = new Date(activeBreakdownEvent.reportedAt).getTime();
    const completedAtMs = new Date(completedAt).getTime();
    const autoDowntime = Number.isFinite(reportedAt) && Number.isFinite(completedAtMs)
      ? Math.max(0, Math.round((completedAtMs - reportedAt) / 60000))
      : 0;
    const downtimeMinutes = repairDowntimeMinutes.trim() ? Number(repairDowntimeMinutes) : autoDowntime;
    updateBooking(bookingRecord.id, {
      breakdownEvents: (bookingRecord.breakdownEvents ?? []).map((event) =>
        event.id === activeBreakdownEvent.id
          ? {
              ...event,
              repairStatus: "REPAIRED_CONTINUED" as const,
              repairCompletedAt: completedAt,
              downtimeMinutes,
              repairRemark: repairCompletionRemark.trim() || repairNote.trim() || event.repairRemark || null,
            }
          : event,
      ),
      statusTimeline: [
        ...bookingRecord.statusTimeline,
        {
          id: `booking-status-${Date.now()}-repair-continued`,
          status: bookingRecord.status,
          timestamp: completedAt,
          actor: session.actorName || "Operations",
          eventLabel: "VEHICLE_REPAIRED_CONTINUED",
          note: `Vehicle repaired and continued. Downtime: ${downtimeMinutes} minutes.`,
        },
      ],
    });
    resetBreakdownActionDialog();
  }

  function initiateBreakdownReplacement() {
    if (!activeBreakdownEvent || !canHandleVehicleBreakdown) {
      return;
    }
    const timestamp = new Date().toISOString();
    updateBooking(bookingRecord.id, {
      breakdownEvents: (bookingRecord.breakdownEvents ?? []).map((event) =>
        event.id === activeBreakdownEvent.id
          ? {
              ...event,
              repairStatus: "REPLACEMENT_REQUIRED" as const,
            }
          : event,
      ),
      statusTimeline: [
        ...bookingRecord.statusTimeline,
        {
          id: `booking-status-${Date.now()}-breakdown-replace`,
          status: bookingRecord.status,
          timestamp,
          actor: session.actorName || "Operations",
          eventLabel: "BREAKDOWN_REPLACEMENT_INITIATED",
          note: "Vehicle replacement initiated after breakdown.",
        },
      ],
    });
    setReassignmentType("VEHICLE_DRIVER");
    setReassignmentReason("VEHICLE_BREAKDOWN");
    setReassignmentRemark(activeBreakdownEvent.description);
    setReassignmentLocation(activeBreakdownEvent.location);
    setReassignmentEffectiveAt(new Date().toISOString().slice(0, 16));
    setReassignmentVehicleId("");
    setReassignmentDriverId("");
    setReassignmentVendorId(bookingRecord.assignment?.vendorId ?? "");
    setReassignmentVendorFreight(bookingRecord.assignment?.vendorFreight != null ? String(bookingRecord.assignment.vendorFreight) : "");
    setReassignmentInvoiceDocument("");
    setReassignmentEwayBillDocument("");
    setBreakdownReplacementSourceId(activeBreakdownEvent.id);
    setReassignmentOpen(true);
    resetBreakdownActionDialog();
  }

  function openVehicleReplacementDialog(mode: "DIRECT" | "VENDOR_ACTION" | "INTERNAL_FALLBACK", requestId?: string) {
    const request = requestId ? vehicleReplacementHistory.find((entry) => entry.id === requestId) ?? null : null;
    setVehicleReplacementMode(mode);
    setVehicleReplacementTargetRequestId(requestId ?? null);
    setVehicleReplacementAction(mode === "VENDOR_ACTION" ? "ASSIGN_REPLACEMENT" : mode === "INTERNAL_FALLBACK" ? "INTERNAL_COMPLETE" : "ASSIGN_REPLACEMENT");
    setVehicleReplacementType(
      mode === "INTERNAL_FALLBACK"
        ? "VENDOR_VEHICLE_DRIVER"
        : mode === "VENDOR_ACTION"
          ? "VENDOR_APP_REPLACEMENT"
          : "VEHICLE_ONLY",
    );
    setVehicleReplacementVehicleId("");
    setVehicleReplacementDriverId("");
    setVehicleReplacementVendorId(request?.previousVendorId ?? bookingRecord.assignment?.vendorId ?? "");
    setVehicleReplacementReason(request?.reason ?? "VEHICLE_BREAKDOWN");
    setVehicleReplacementRemark(request?.remark ?? "");
    setVehicleReplacementLocation(request?.location ?? "");
    setVehicleReplacementEffectiveAt(new Date().toISOString().slice(0, 16));
    setVehicleReplacementInvoiceDocument("");
    setVehicleReplacementEwayDocument("");
    setVehicleReplacementVendorRate(request?.newVendorRate != null ? String(request.newVendorRate) : "");
    setVehicleReplacementRejectionReason("");
    setVehicleReplacementVendorRemark("");
    setVehicleReplacementError("");
    setVehicleReplacementOpen(true);
  }

  function resetVehicleReplacementDialog() {
    setVehicleReplacementOpen(false);
    setVehicleReplacementTargetRequestId(null);
    setVehicleReplacementMode("DIRECT");
    setVehicleReplacementAction("ASSIGN_REPLACEMENT");
    setVehicleReplacementType("VEHICLE_ONLY");
    setVehicleReplacementVehicleId("");
    setVehicleReplacementDriverId("");
    setVehicleReplacementVendorId("");
    setVehicleReplacementReason("VEHICLE_BREAKDOWN");
    setVehicleReplacementRemark("");
    setVehicleReplacementLocation("");
    setVehicleReplacementEffectiveAt(new Date().toISOString().slice(0, 16));
    setVehicleReplacementInvoiceDocument("");
    setVehicleReplacementEwayDocument("");
    setVehicleReplacementVendorRate("");
    setVehicleReplacementRejectionReason("");
    setVehicleReplacementVendorRemark("");
    setVehicleReplacementError("");
  }

  function resetCancellationDialog() {
    setCancelDialogOpen(false);
    setCancellationReason("");
  }

  useEffect(() => {
    setPreferredLrNumber((current) =>
      current && availableManualPools.some((pool) => pool.lrNumber === current)
        ? current
        : availableManualPools[0]?.lrNumber ?? "",
    );
  }, [availableManualPools]);

  useEffect(() => {
    if (!assignmentOpen) {
      return;
    }
      if (bookingRecord.lrType === "AUTO") {
        setSelectedLrMode("AUTO");
        return;
      }
      setSelectedLrMode(bookingRecord.manualLrPoolPreference === "PRE_GENERATED" ? "PRE_GENERATED" : "MANUAL");
  }, [assignmentOpen, bookingRecord.lrType, bookingRecord.manualLrPoolPreference]);

  useEffect(() => {
    if (!vendorId || vendorId === OWN_FLEET_VENDOR) {
      setVendorFreightSource("MANUAL");
      setVendorRateWarning("");
      setMatchedVendorRateCardId(null);
      setMatchedVendorRateType(null);
      setBuyingRateLabel(null);
      return;
    }

    // Search the selected vendor's contract using its OWN config (same engine
    // as customers) and auto-fill the buying freight + margin.
    const vendorRateCards = adminSources.vendorRateCardMap.get(vendorId) ?? [];
    const config = normalizeRateMatchingConfig(vendorMap.get(vendorId)?.rateMatchingConfig);
    const candidateRateTypes: Array<"PER_MT" | "PER_KM" | "PER_TRIP"> = [
      bookingRecord.pricing.rateType,
      "PER_MT",
      "PER_TRIP",
      "PER_KM",
    ].filter((value, index, array) => array.indexOf(value) === index) as Array<"PER_MT" | "PER_KM" | "PER_TRIP">;

    const matchedRateCard =
      candidateRateTypes
        .map((rateType) =>
          validateVendorRateCard(
            {
              bookingDate: bookingRecord.pickupDate ?? null,
              rateMatchingConfig: config,
              fromCity: assignSourceAddress?.city ?? null,
              toCity: assignDestinationAddress?.city ?? null,
              fromLocation: assignSourceAddress?.addressName ?? null,
              toLocation: assignDestinationAddress?.addressName ?? null,
              fromPincode: assignSourceAddress?.pincode ?? null,
              toPincode: assignDestinationAddress?.pincode ?? null,
              vehicleType: assignVehicleTypeCode,
              material: assignMaterialCode,
              rateType,
            },
            vendorRateCards,
          ),
        )
        .find(Boolean) ?? null;

    if (!matchedRateCard) {
      setVendorFreightSource("MANUAL");
      setVendorRateWarning("No matching vendor contract found. Enter the buying rate manually.");
      setMatchedVendorRateCardId(null);
      setMatchedVendorRateType(null);
      setBuyingRateLabel(null);
      return;
    }

    const calculatedVendorFreight = calculateVendorFreightFromRateCard({
      rateCard: matchedRateCard,
      weight: assignWeight,
      distanceKm: assignDistanceKm,
    });

    setVendorFreight(String(calculatedVendorFreight));
    setVendorFreightSource("RATE_CARD");
    setVendorRateWarning("");
    setMatchedVendorRateCardId(matchedRateCard.id);
    setMatchedVendorRateType(matchedRateCard.rateType);
    setBuyingRateLabel(
      `${matchedRateCard.rateType} @ ${(getVendorRateCardUnitRate(matchedRateCard) ?? 0).toLocaleString()}`,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminSources.vendorRateCardMap, assignmentOpen, bookingRecord, vendorId]);

  function resetRemarkDialog() {
    setRemarkDeliveryId(null);
    setRemarkType("INTACT");
    setRemarkLocation("");
    setRemarkConsignee("");
    setRemarkDestination("");
    setRemarkText("");
    setBreakdownReportedAt(new Date().toISOString().slice(0, 16));
    setBreakdownExpectedRepairAt("");
    setBreakdownEvidence("");
    setDestinationChangeReason("");
    setDestinationChangePriority("HIGH");
    setDestinationChangeRequestId(null);
    setRequestReviewNote("");
    setRequestUnloadingNotes("");
    setRequestInstructions("");
    setRequestContactPerson("");
    setRequestContactNumber("");
    setTemporaryAddressEnabled(false);
    setTemporaryAddressDraft({
      id: `temporary-address-${Date.now()}`,
      addressLabel: "",
      fullAddress: "",
      city: "",
      state: "",
      pincode: "",
      contactPerson: "",
      contactNumber: "",
      gstNumber: null,
      remarks: null,
      isTemporary: true,
    });
  }

  function openBreakdownAction(eventId: string, type: "SELECT" | "REPAIR" | "REPLACE" | "CONTINUE" = "SELECT") {
    const event = breakdownEvents.find((item) => item.id === eventId) ?? null;
    setActiveBreakdownEventId(eventId);
    setBreakdownActionType(type);
    setRepairResponsiblePerson(event?.responsiblePerson ?? "");
    setRepairNote(event?.repairRemark ?? "");
    setRepairCurrentLocation(event?.location ?? "");
    setRepairCompletionAt(new Date().toISOString().slice(0, 16));
    setRepairCompletionRemark("");
    setRepairDowntimeMinutes(event?.downtimeMinutes != null ? String(event.downtimeMinutes) : "");
    setBreakdownActionOpen(true);
  }

  function resetBreakdownActionDialog() {
    setBreakdownActionOpen(false);
    setActiveBreakdownEventId(null);
    setBreakdownActionType("SELECT");
    setRepairResponsiblePerson("");
    setRepairNote("");
    setRepairCurrentLocation("");
    setRepairCompletionAt(new Date().toISOString().slice(0, 16));
    setRepairCompletionRemark("");
    setRepairDowntimeMinutes("");
  }

  function openDestinationChangeRequest(requestId: string) {
    const request = bookingRecord.destinationChangeRequests?.find((item) => item.id === requestId) ?? null;
    if (!request) {
      return;
    }
    setDestinationChangeRequestId(request.id);
    setDestinationChangeReason(request.reason);
    setDestinationChangePriority(request.priority);
    setRemarkDeliveryId(request.deliveryId);
    setRemarkDestination(request.requestedAddressId ?? "");
    setRequestReviewNote(request.reviewNote ?? "");
    setRemarkText(request.requestNotes ?? "");
    setRequestUnloadingNotes(request.unloadingNotes ?? "");
    setRequestInstructions(request.instructions ?? "");
    setRequestContactPerson(request.requestedContactPerson ?? "");
    setRequestContactNumber(request.requestedContactNumber ?? "");
    setTemporaryAddressEnabled(Boolean(request.temporaryAddress));
    if (request.temporaryAddress) {
      setTemporaryAddressDraft(request.temporaryAddress);
    }
    setDestinationReviewOpen(true);
  }

  function submitDestinationChangeRequest() {
    if (!remarkDeliveryId || !canRaiseDestinationChange) {
      return;
    }
    if (!destinationChangeReason.trim()) {
      return;
    }
    const timestamp = new Date().toISOString();
    const request: BookingDestinationChangeRequest = {
      id: `destination-change-${Date.now()}`,
      bookingId: bookingRecord.id,
      deliveryId: remarkDeliveryId,
      remarkType: "DESTINATION_CHANGED",
      reason: destinationChangeReason.trim(),
      requestNotes: remarkText.trim() || null,
      requestedAddressId: null,
      temporaryAddress: null,
      raisedBy: currentUser?.name ?? session.actorName ?? "Ops",
      raisedAt: timestamp,
      priority: destinationChangePriority,
      status: "SUBMITTED",
      notificationRecipients: ["Operations Team", "Assigned Branch", "Customer", "Dispatch Team"],
      eventLabel: "Destination Change Requested",
      reviewNote: null,
    };
    const nextRemark: BookingRemark = {
      id: `booking-remark-${Date.now()}`,
      timestamp,
      actor: request.raisedBy,
      type: "DESTINATION_CHANGED",
      message: "Destination Change Requested",
      deliveryId: request.deliveryId,
      location: remarkLocation.trim() || null,
      consignee: null,
      destination: null,
    };
    updateBooking(bookingRecord.id, {
      remarks: [nextRemark, ...bookingRecord.remarks],
      destinationChangeRequests: [request, ...(bookingRecord.destinationChangeRequests ?? [])],
      operationalFlags: Array.from(new Set([...(bookingRecord.operationalFlags ?? []), "DESTINATION_CHANGED"])),
    });
    resetRemarkDialog();
  }

  function updateDestinationChangeStatus(status: BookingDestinationChangeRequest["status"]) {
    if (!selectedDestinationChangeRequest) {
      return;
    }
    const timestamp = new Date().toISOString();
    updateBooking(bookingRecord.id, {
      destinationChangeRequests: (bookingRecord.destinationChangeRequests ?? []).map((request) =>
        request.id === selectedDestinationChangeRequest.id
          ? {
              ...request,
              status,
              requestedAddressId: remarkDestination || request.requestedAddressId || null,
              reviewNote: requestReviewNote.trim() || request.reviewNote || null,
              requestedContactPerson: requestContactPerson.trim() || request.requestedContactPerson || null,
              requestedContactNumber: requestContactNumber.trim() || request.requestedContactNumber || null,
              unloadingNotes: requestUnloadingNotes.trim() || request.unloadingNotes || null,
              instructions: requestInstructions.trim() || request.instructions || null,
              requestedConsigneeId: requestedDestinationAddress?.consigneeId ?? request.requestedConsigneeId ?? null,
              requestedConsigneeName: requestedDestinationAddress?.consigneeName ?? request.requestedConsigneeName ?? null,
              requestedRoute: destinationChangePreview?.proposedSnapshot.route ?? request.requestedRoute ?? null,
              requestedDistanceKm: destinationChangePreview?.proposedSnapshot.distanceKm ?? request.requestedDistanceKm ?? null,
              requestedFreight: destinationChangePreview?.proposedSnapshot.freight ?? request.requestedFreight ?? null,
              requestedEta: destinationChangePreview?.proposedSnapshot.eta ?? request.requestedEta ?? null,
              approvedBy: status === "APPROVED" ? currentUser?.name ?? session.actorName ?? "Ops" : request.approvedBy ?? null,
              approvedAt: status === "APPROVED" ? timestamp : request.approvedAt ?? null,
            }
          : request,
      ),
    });
  }

  function implementDestinationChange() {
    if (!selectedDestinationChangeRequest || !selectedDestinationChangeDelivery || !destinationChangePreview) {
      return;
    }
    const actor = currentUser?.name ?? session.actorName ?? "Ops";
    const revision = buildDeliveryRevisionRecord({
      booking: bookingRecord,
      delivery: selectedDestinationChangeDelivery,
      request: selectedDestinationChangeRequest,
      previousSnapshot: destinationChangePreview.previousSnapshot,
      proposedSnapshot: destinationChangePreview.proposedSnapshot,
      impact: destinationChangePreview.impact,
      actor,
      status: "ACTIVE",
    });
    const nextDeliveries = (bookingRecord.deliveries ?? []).map((delivery) => {
      if (delivery.id !== selectedDestinationChangeDelivery.id) {
        return delivery;
      }
      const nextRevisions = [
        ...(delivery.revisions ?? []).map((item) =>
          item.status === "ACTIVE" ? { ...item, status: "SUPERSEDED" as const } : item,
        ),
        revision,
      ];
      return {
        ...delivery,
        destinationAddressId: selectedDestinationChangeRequest.requestedAddressId ?? delivery.destinationAddressId,
        destinationCity: revision.proposedSnapshot.city,
        distanceKm: revision.proposedSnapshot.distanceKm,
        routeLabel: revision.proposedSnapshot.route,
        eta: revision.proposedSnapshot.eta,
        freightRate: revision.proposedSnapshot.freight,
        deliverySequence: revision.proposedSnapshot.sequence,
        tripImpactSummary: revision.impact.tripImpactSummary,
        contactPerson: revision.proposedSnapshot.contactPerson ?? null,
        contactNumber: revision.proposedSnapshot.contactNumber ?? null,
        unloadingNotes: revision.proposedSnapshot.unloadingNotes ?? null,
        instructions: revision.proposedSnapshot.instructions ?? null,
        activeRevisionId: revision.id,
        revisions: nextRevisions,
      };
    });
    const totalFreight = nextDeliveries.reduce(
      (sum, delivery) => sum + Number(delivery.freightRate ?? 0),
      0,
    ) || bookingRecord.pricing.calculatedFreight;
    const nextRequests = (bookingRecord.destinationChangeRequests ?? []).map((request) =>
      request.id === selectedDestinationChangeRequest.id
        ? {
            ...request,
            status: "IMPLEMENTED" as const,
            revisionId: revision.id,
            implementedBy: actor,
            implementedAt: new Date().toISOString(),
          }
        : request,
    );
    updateBooking(bookingRecord.id, {
      deliveries: nextDeliveries,
      pricing: {
        ...bookingRecord.pricing,
        calculatedFreight: totalFreight,
      },
      remarks: [
        {
          id: `booking-remark-${Date.now()}-implemented`,
          timestamp: new Date().toISOString(),
          actor,
          type: "SYSTEM_REMARK",
          message: `Destination revision activated for Delivery ${selectedDestinationChangeDelivery.deliveryNo}. Existing LR linkage retained.`,
          deliveryId: selectedDestinationChangeDelivery.id,
        },
        ...bookingRecord.remarks,
      ],
      destinationChangeRequests: nextRequests,
      operationalFlags: Array.from(new Set([...(bookingRecord.operationalFlags ?? []), "DESTINATION_CHANGED", "DELIVERY_REVISED", "BOOKING_EDITED"])),
    });
  }

  function submitCancellation() {
    const reason = cancellationReason.trim();
    if (!reason || loadingStarted || !canCancelBooking(bookingRecord.status)) {
      return;
    }
    transitionBooking(bookingRecord.id, {
      status: "CANCELLED",
      actor: currentUser?.name ?? "Ops",
      note: reason,
    });
    resetCancellationDialog();
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
    if (!activeLrOrgUnitId) {
      return;
    }
      if (selectedLrMode !== "AUTO" && !preferredLrNumber) {
        return;
      }
    // Manual assignment on a contract booking bypasses the default L1/lowest
    // contract — reason required.
    if (assignMethod === "MANUAL" && !isSpotBooking && !manualReason.trim()) {
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
      vendorRateCardId: matchedVendorRateCardId,
      vendorRateType: matchedVendorRateType,
      vendorContractSource: vendorFreightSource,
      customerFreight,
      sellingRateLabel: `${bookingRecord.pricing.rateType} @ ${bookingRecord.pricing.enteredRate.toLocaleString()}`,
      buyingRateLabel,
      marginAmount,
      marginPercent,
      actor: session.actorName || "Dispatcher",
      orgUnitId: activeLrOrgUnitId || null,
      actorUserId: currentUser?.id ?? null,
        lrType: selectedLrMode === "AUTO" ? "AUTO" : "MANUAL",
        lrConfigId: selectedAssignmentLrConfig?.id ?? null,
        preferredLrNumber: selectedLrMode === "AUTO" ? null : preferredLrNumber,
        manualLrPoolPreference: selectedLrMode === "PRE_GENERATED" ? "PRE_GENERATED" : "GENERAL",
        manualAssignmentReason: assignMethod === "MANUAL" && !isSpotBooking ? manualReason.trim() : null,
      };
    assignBooking(bookingRecord.id, assignment);
    resetAssignmentDialog();
  }

  function submitReassignment() {
    if (!bookingRecord.assignment) {
      setReassignmentError("Current assignment not found.");
      return;
    }
    if (!reassignmentRemark.trim()) {
      setReassignmentError("Operational remark is required.");
      return;
    }

    const nextVehicle =
      reassignmentType === "DRIVER"
        ? assignedVehicle
        : adminSources.vehicles.find((vehicle) => vehicle.id === reassignmentVehicleId) ?? null;
    const nextDriver =
      reassignmentType === "DRIVER"
        ? adminSources.drivers.find((driver) => driver.id === reassignmentDriverId) ?? null
        : reassignmentType === "VEHICLE" && !reassignmentDriverId
          ? assignedDriver
        : adminSources.drivers.find((driver) => driver.id === reassignmentDriverId) ?? null;

    if (!nextVehicle) {
      setReassignmentError("Select a new vehicle.");
      return;
    }
    if (!nextDriver) {
      setReassignmentError("Select a new driver.");
      return;
    }
    if (
      ["VEHICLE", "VEHICLE_DRIVER", "VENDOR_VEHICLE_DRIVER"].includes(reassignmentType) &&
      Number(reassignmentVendorFreight) <= 0
    ) {
      setReassignmentError("Enter new vendor freight rate.");
      return;
    }
    if (invoiceOrEwayUploaded && reassignmentVendorChanged && (!reassignmentInvoiceDocument.trim() || !reassignmentEwayBillDocument.trim())) {
      setReassignmentError("New invoice and e-waybill are required when vendor is changed after document upload.");
      return;
    }

    try {
      const input: BookingReassignmentInput = {
        changeType: reassignmentType,
        vendorId:
          reassignmentType === "VENDOR_VEHICLE_DRIVER"
            ? reassignmentVendorId || nextVehicle.vendorId || null
            : nextVehicle.vendorId ?? null,
        vendorName:
          reassignmentType === "VENDOR_VEHICLE_DRIVER"
            ? vendorMap.get(reassignmentVendorId)?.name ?? "Vendor"
            : nextVehicle.vendorId ? vendorMap.get(nextVehicle.vendorId)?.name ?? "Vendor" : "Own Fleet",
        vehicleId: nextVehicle.id,
        vehicleLabel: nextVehicle.registrationNumber,
        driverId: nextDriver.id,
        driverName: nextDriver.name,
        reason: reassignmentReason,
        remark: reassignmentRemark.trim(),
        effectiveAt: new Date(reassignmentEffectiveAt).toISOString(),
        location: reassignmentLocation.trim() || null,
        actor: session.actorName || "Operations",
        actorUserId: currentUser?.id ?? null,
        actorRole: access.activeRole?.name ?? null,
        newVendorFreight:
          ["VEHICLE", "VEHICLE_DRIVER", "VENDOR_VEHICLE_DRIVER"].includes(reassignmentType)
            ? Number(reassignmentVendorFreight)
            : bookingRecord.assignment?.vendorFreight ?? null,
        newInvoiceDocument: reassignmentInvoiceDocument.trim() || null,
        newEwayBillDocument: reassignmentEwayBillDocument.trim() || null,
      };
      const updatedBooking = reassignBooking(bookingRecord.id, input);
      if (breakdownReplacementSourceId) {
        const latestAssignmentHistoryId = updatedBooking.assignmentHistory?.[0]?.id ?? null;
        updateBooking(bookingRecord.id, {
          breakdownEvents: (updatedBooking.breakdownEvents ?? bookingRecord.breakdownEvents ?? []).map((event) =>
            event.id === breakdownReplacementSourceId
              ? {
                  ...event,
                  repairStatus: "REPLACED" as const,
                  replacementHistoryId: latestAssignmentHistoryId,
                }
              : event,
          ),
          statusTimeline: [
            ...updatedBooking.statusTimeline,
            {
              id: `booking-status-${Date.now()}-breakdown-replaced`,
              status: updatedBooking.status,
              timestamp: new Date().toISOString(),
              actor: session.actorName || "Operations",
              eventLabel: "VEHICLE_REPLACED_AFTER_BREAKDOWN",
              note: "Vehicle and driver replaced after breakdown. LR linkage retained.",
            },
          ],
        });
      }
      resetReassignmentDialog();
    } catch (error) {
      setReassignmentError(error instanceof Error ? error.message : "Operational reassignment failed.");
    }
  }

  function submitVehicleReplacement() {
    if (!bookingRecord.assignment) {
      return;
    }
    if (!vehicleReplacementRemark.trim()) {
      setVehicleReplacementError("Replacement remark is required.");
      return;
    }
    try {
      if (vehicleReplacementMode === "DIRECT") {
        const input: BookingVehicleReplacementInput = {
          replacementType: invoiceOrEwayUploaded ? "VENDOR_APP_REPLACEMENT" : vehicleReplacementType,
          vehicleId: vehicleReplacementVehicleId || null,
          driverId: vehicleReplacementDriverId || bookingRecord.assignment.driverId,
          vendorId: vehicleReplacementVendorId || null,
          vendorName: vehicleReplacementVendorId ? vendorMap.get(vehicleReplacementVendorId)?.name ?? "Vendor" : "Own Fleet",
          reason: vehicleReplacementReason,
          remark: vehicleReplacementRemark.trim(),
          actor: session.actorName || "Operations",
          actorUserId: currentUser?.id ?? null,
          actorRole: access.activeRole?.name ?? null,
          location: vehicleReplacementLocation.trim() || null,
          effectiveAt: new Date(vehicleReplacementEffectiveAt).toISOString(),
          newVendorRate: vehicleReplacementVendorRate.trim() ? Number(vehicleReplacementVendorRate) : null,
        };
        replaceBookingVehicle(bookingRecord.id, input);
        resetVehicleReplacementDialog();
        return;
      }
      if (!currentVendorReplacementRequest) {
        setVehicleReplacementError("Vehicle replacement request not found.");
        return;
      }
      const actionInput: BookingVehicleReplacementVendorActionInput = {
        requestId: currentVendorReplacementRequest.id,
        action: vehicleReplacementAction,
        vehicleId: vehicleReplacementVehicleId || null,
        driverId: vehicleReplacementDriverId || null,
        vendorId: vehicleReplacementVendorId || null,
        vendorName: vehicleReplacementVendorId ? vendorMap.get(vehicleReplacementVendorId)?.name ?? "Vendor" : "Own Fleet",
        vendorRemark: vehicleReplacementVendorRemark.trim() || null,
        rejectionReason: vehicleReplacementRejectionReason.trim() || null,
        remark: vehicleReplacementRemark.trim(),
        actor: session.actorName || "Operations",
        actorUserId: currentUser?.id ?? null,
        actorRole: access.activeRole?.name ?? null,
        newInvoiceDocument: vehicleReplacementInvoiceDocument.trim() || null,
        newEwayBillDocument: vehicleReplacementEwayDocument.trim() || null,
        newVendorRate: vehicleReplacementVendorRate.trim() ? Number(vehicleReplacementVendorRate) : null,
      };
      actionBookingVehicleReplacement(bookingRecord.id, actionInput);
      resetVehicleReplacementDialog();
    } catch (error) {
      setVehicleReplacementError(error instanceof Error ? error.message : "Vehicle replacement failed.");
    }
  }

  function markDeliveryCompleted(deliveryId: string) {
    if (!["IN_TRANSIT", "ARRIVED", "DELAYED", "EXCEPTION"].includes(bookingRecord.status)) {
      return;
    }
    const nextDeliveries = (bookingRecord.deliveries ?? []).map((delivery) =>
      delivery.id === deliveryId
        ? {
            ...delivery,
            status: "COMPLETED" as const,
          }
        : delivery,
    );
    updateBooking(bookingRecord.id, {
      deliveries: nextDeliveries,
    });
    if (areAllDeliveriesPhysicallyCompleted(nextDeliveries)) {
      transitionBooking(bookingRecord.id, {
        status: "POD_PENDING",
        actor: "Ops",
        note: "All deliveries physically completed. Waiting for POD collection.",
      });
    }
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

  function openAddModal(mode: "expense" | "advance") {
    setExpenseMode(mode);
    setExpenseType(mode === "advance" ? BOOKING_ADVANCE_TYPE : "Loading and Unloading Charges");
    setExpenseAmount("");
    setExpenseBillFile("");
    setExpenseNotes("");
    setExpensePaymentMode("UPI");
    setExpensePaidBy(mode === "advance" ? "Company" : "Driver");
    setExpenseModalOpen(true);
  }

  function submitExpense() {
    const typeValue = expenseMode === "advance" ? BOOKING_ADVANCE_TYPE : expenseType.trim();
    if (!typeValue || Number(expenseAmount) <= 0 || !expenseBillFile.trim()) {
      return;
    }
    const now = new Date().toISOString();
    const nextExpense: BookingExpenseRecord = {
      id: `expense-${Date.now()}`,
      label: typeValue,
      amount: Number(expenseAmount),
      createdAt: now,
      createdBy: session.actorName || "Ops",
      bookingId: bookingRecord.bookingId,
      dateTime: now,
      expenseType: typeValue,
      paymentMode: expensePaymentMode,
      paidBy: expensePaidBy,
      billReceiptFile: expenseBillFile.trim(),
      notes: expenseNotes.trim() || undefined,
      status: "Pending",
    };
    updateBooking(bookingRecord.id, {
      expenses: [...(bookingRecord.expenses ?? []), nextExpense],
    });
    setExpenseAmount("");
    setExpenseBillFile("");
    setExpenseNotes("");
    setExpenseType("Loading and Unloading Charges");
    setExpensePaymentMode("UPI");
    setExpensePaidBy("Driver");
    setExpenseModalOpen(false);
  }
  // Advance entries are stored as expense items typed "Advance".
  const isAdvanceItem = (e: { expenseType?: string; label?: string }) =>
    /advance/i.test(`${e.expenseType ?? ""} ${e.label ?? ""}`);
  const expenseItems = (bookingRecord.expenses ?? []).filter((e) => !isAdvanceItem(e));
  const advanceItems = (bookingRecord.expenses ?? []).filter(isAdvanceItem);

  function setExpenseStatus(expenseId: string, status: BookingExpenseStatus) {
    updateBooking(bookingRecord.id, {
      expenses: (bookingRecord.expenses ?? []).map((expense) =>
        expense.id === expenseId ? { ...expense, status } : expense,
      ),
    });
  }

  function saveDeliveryPod(deliveryId: string) {
    const form = podForms[deliveryId];
    if (bookingRecord.status === "COMPLETED") {
      return;
    }
    if (!form?.podDocument?.trim() || !form?.consigneeName?.trim() || !form?.podRemark?.trim()) {
      return;
    }
    const capturedAt = new Date().toISOString();
    const prevPod = (bookingRecord.deliveries ?? []).find((delivery) => delivery.id === deliveryId)?.pod;
    const newFile = (form.podDocument ?? "").trim();
    // Append to the existing POD file list (multiple-POD support); migrate
    // legacy single-file PODs into the list on first re-save. No overwrite.
    const priorFiles = prevPod?.podFiles ?? (prevPod?.podDocument ? [prevPod.podDocument] : []);
    const podFiles = Array.from(new Set([...priorFiles, newFile])).filter(Boolean);
    const nextDeliveries = (bookingRecord.deliveries ?? []).map((delivery) =>
      delivery.id === deliveryId
        ? {
            ...delivery,
            pod: {
              podDocument: newFile,
              podFiles,
              podUploaded: true,
              podUploadedAt: capturedAt,
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
    // Clear only the file field so "Add More POD" starts fresh (keep consignee/remark).
    setPodForms((current) => ({ ...current, [deliveryId]: { ...current[deliveryId], podDocument: "", photoName: "" } }));
  }

  function markBookingCompleted() {
    if (bookingRecord.status !== "POD_PENDING" || !allDeliveryPodsCaptured) {
      return;
    }
    transitionBooking(bookingRecord.id, {
      status: "COMPLETED",
      actor: "Ops",
      note: "All delivery PODs uploaded. Booking marked as completed.",
    });
  }

  function saveDeliveryRemark() {
    if (remarkType === "DESTINATION_CHANGED") {
      submitDestinationChangeRequest();
      return;
    }
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
      actor: session.actorName || "Ops",
      type: remarkType,
      message: remarkText.trim() || getRemarkLabel(remarkType),
      deliveryId: remarkDeliveryId,
      location: remarkLocation.trim() || null,
      consignee: remarkConsignee.trim() || null,
      destination: remarkDestination.trim() ? addressMap.get(remarkDestination)?.addressName ?? remarkDestination.trim() : null,
    };
    updateBooking(bookingRecord.id, {
      remarks: [nextRemark, ...bookingRecord.remarks],
      breakdownEvents:
        remarkType === "VEHICLE_BREAKDOWN"
          ? [
              {
                id: `breakdown-${Date.now()}`,
                remarkId: nextRemark.id,
                deliveryId: remarkDeliveryId,
                location: remarkLocation.trim(),
                reportedAt: breakdownReportedAt ? new Date(breakdownReportedAt).toISOString() : timestamp,
                reportedBy: session.actorName || "Ops",
                reportedByRole: access.activeRole?.name ?? null,
                description: remarkText.trim(),
                expectedRepairAt: breakdownExpectedRepairAt ? new Date(breakdownExpectedRepairAt).toISOString() : null,
                photoEvidence: breakdownEvidence.trim() || null,
                repairStatus: "WAITING_FOR_REPAIR",
                repairStartedAt: timestamp,
                createdAt: timestamp,
              } satisfies BookingBreakdownEvent,
              ...(bookingRecord.breakdownEvents ?? []),
            ]
          : bookingRecord.breakdownEvents,
    });
    if (
      ["DELIVERY_DELAY", "VEHICLE_BREAKDOWN", "ACCIDENT_INCIDENT"].includes(remarkType) &&
      !["COMPLETED", "INVOICED", "PAID", "DISPUTED", "CANCELLED", "EXCEPTION"].includes(bookingRecord.status)
    ) {
      transitionBooking(bookingRecord.id, {
        status: "EXCEPTION",
        actor: "Ops",
        note: `${getRemarkLabel(remarkType)} reported.`,
      });
    }
    if (remarkType === "VEHICLE_BREAKDOWN") {
      updateBooking(bookingRecord.id, {
        statusTimeline: [
          ...bookingRecord.statusTimeline,
          {
            id: `booking-status-${Date.now()}-breakdown-reported`,
            status: bookingRecord.status,
            timestamp,
            actor: session.actorName || "Operations",
            eventLabel: "VEHICLE_BREAKDOWN_REPORTED",
            note: `Vehicle breakdown reported at ${remarkLocation.trim()}.`,
          },
        ],
      });
    }
    if (["DRIVER_CHANGED", "VEHICLE_CHANGED", "VEHICLE_DRIVER_CHANGED", "VENDOR_VEHICLE_DRIVER_CHANGED", "DRIVER_AND_VEHICLE_CHANGED"].includes(remarkType)) {
      triggerReassignmentFromRemark(nextRemark);
      setRemarkDeliveryId(null);
      return;
    }
    resetRemarkDialog();
  }

  // Shared POD upload form (used by the prominent POD card and the Documents tab).
  const renderPodForm = (deliveryId: string) => {
    const pod = podForms[deliveryId] ?? null;
    const podLocked = bookingRecord.status === "COMPLETED";
    return (
      <div className="mt-2 rounded-lg border border-gray-200 bg-white p-3">
        <div className="flex flex-wrap items-center gap-2">
          <label className={`inline-flex cursor-pointer items-center rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium ${podLocked ? "pointer-events-none opacity-60" : ""}`}>
            <input type="file" className="hidden" disabled={podLocked} onChange={(event) => { const file = event.target.files?.[0] ?? null; if (!file) { return; } setPodForms((current) => ({ ...current, [deliveryId]: { ...current[deliveryId], podDocument: file.name, photoName: file.name, podUploaded: false } })); event.target.value = ""; }} />
            {pod?.podDocument ? "Replace selected file" : "Choose POD file"}
          </label>
          <span className="text-xs text-gray-500">{pod?.podDocument || "No file selected"}</span>
        </div>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          <Input value={pod?.consigneeName ?? ""} disabled={podLocked} onChange={(event) => setPodForms((current) => ({ ...current, [deliveryId]: { ...current[deliveryId], consigneeName: event.target.value } }))} placeholder="Consignee name" />
          <Input value={pod?.podRemark ?? ""} disabled={podLocked} onChange={(event) => setPodForms((current) => ({ ...current, [deliveryId]: { ...current[deliveryId], podRemark: event.target.value } }))} placeholder="POD remark" />
        </div>
        <div className="mt-2">
          <Button size="sm" disabled={podLocked} onClick={() => { saveDeliveryPod(deliveryId); setPodEditId(null); }}>Save POD</Button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-2.5">
      <BookingPageHeader
        backTo={`/tenant/${tenant.id}/bookings`}
        backLabel="Bookings"
        title={bookingRecord.bookingId}
        subtitle={`${customer?.name ?? "-"} · ${sourceAddress?.city ?? "-"} → ${destinationAddress?.city ?? "-"}`}
        summary={
          <div className="space-y-2">
            <BookingSummaryStrip
              items={[
                { label: "Status", value: bookingRecord.status === "POD_PENDING" && allDeliveryPodsCaptured ? <Badge variant="success">POD UPLOADED</Badge> : <BookingStatusBadge status={bookingRecord.status} /> },
                { label: "Customer", value: customer?.name ?? "-" },
                { label: "Vehicle", value: assignedVehicle?.registrationNumber ?? "Not assigned" },
                { label: "Driver", value: assignedDriver?.name ?? bookingRecord.assignment?.driverName ?? "Not assigned" },
                { label: "Vendor", value: assignedVendor?.name ?? bookingRecord.assignment?.vendorName ?? "Own Fleet" },
                { label: "Freight", value: `Rs ${customerFreight.toLocaleString()}` },
              ]}
            />
            {(bookingRecord.deliveries ?? []).length > 0 ? (
              <DeliveryChipRow
                deliveries={bookingRecord.deliveries ?? []}
                isErp={bookingRecord.bookingSource === "ERP"}
                addressMap={addressMap}
                materialMap={materialMap}
                onViewAll={() => setDeliveryModalOpen(true)}
              />
            ) : null}
          </div>
        }
        actions={
          <div className="flex flex-wrap gap-1.5">
                    {getBookingEditability(bookingRecord.status) ? (
                      <Button asChild size="sm" variant="outline">
                        <Link to={`/tenant/${tenant.id}/bookings/${bookingRecord.id}/edit`}>Edit</Link>
                      </Button>
                    ) : null}
                    {bookingRevisionEnabled || bookingRevised ? (
                      <Button
                        size="sm"
                        variant={bookingRevisionEnabled ? "default" : "outline"}
                        onClick={() => {
                          const firstPending = revisionPendingRequests[0] ?? bookingRecord.destinationChangeRequests?.[0] ?? null;
                          if (firstPending) {
                            openDestinationChangeRequest(firstPending.id);
                          } else {
                            setDestinationReviewOpen(true);
                          }
                        }}
                      >
                        {bookingRevisionEnabled ? "Destination Change Review" : "Revised Delivery History"}
                      </Button>
                    ) : null}
                  {!loadingStarted && canCancelBooking(bookingRecord.status) ? (
                      <Button size="sm" variant="outline" onClick={() => setCancelDialogOpen(true)}>
                        Cancel Booking
                      </Button>
                    ) : null}
                  {bookingRecord.status === "PENDING_ASSIGNMENT" ? (() => {
                    const myIndents = listBookingVendorIndents(tenant.id).filter((indent) => indent.bookingId === bookingRecord.id);
                    const pendingCount = myIndents.filter((indent) => indent.status === "PENDING").length;
                    const winner = myIndents.find((indent) => indent.isWinner);
                    if (winner) {
                      return <Badge variant="warning">Accepted · {winner.vendorName} · vehicle pending</Badge>;
                    }
                    if (pendingCount > 0) {
                      return <Badge variant="accent">Indent sent · {pendingCount} notified</Badge>;
                    }
                    // Indents are sent per-vendor from the Contract Vendor recommendation
                    // table in the Assign Vehicle section — no broadcast button in the header.
                    return null;
                  })() : null}
                  {!loadingStarted && ["VEHICLE_ASSIGNED", "ASSIGNED"].includes(bookingRecord.status) && access.can("BOOKING_DETAIL", "START_LOADING") ? <Button size="sm" onClick={startLoading}>Start Loading</Button> : null}
                    {loadingStarted && !loadingCompleted && access.can("BOOKING_DETAIL", "COMPLETE_LOADING") ? <Button size="sm" onClick={endLoading}>Complete Loading</Button> : null}
                  {["LOADING_COMPLETED", "DOCUMENT_PENDING", "DOCUMENT_COMPLETED"].includes(bookingRecord.status) ? (
                    <Button asChild size="sm">
                      <Link to={`/tenant/${tenant.id}/bookings/${bookingRecord.id}/documents`}>Documents</Link>
                    </Button>
                  ) : null}
                  {bookingRecord.status === "DOCUMENT_COMPLETED" && !(bookingRecord.lrIds?.length ?? 0) && access.can("BOOKING_DETAIL", "GENERATE_LR") ? (
                    <Button asChild size="sm" variant="outline">
                      <Link to={`/tenant/${tenant.id}/bookings/${bookingRecord.id}/documents`}>Generate LR</Link>
                    </Button>
                  ) : null}
                  {bookingRecord.status === "POD_PENDING" && allDeliveryPodsCaptured && access.can("BOOKING_DETAIL", "MARK_COMPLETED") ? <Button size="sm" onClick={markBookingCompleted}>Complete Booking</Button> : null}
                  {["DELAYED", "EXCEPTION"].includes(bookingRecord.status) ? <Button size="sm" variant="outline" onClick={resumeTransit}>Move to Transit</Button> : null}
          </div>
        }
      />
      {bookingRecord.status === "CANCELLED" && latestCancellationReason ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900">
          Cancellation reason: {latestCancellationReason}
        </div>
      ) : null}

      {/* Prominent POD & completion card — above the fold, not hidden in tabs. */}
      {bookingRecord.status === "POD_PENDING" && access.can("BOOKING_DETAIL", "UPLOAD_POD") ? (
        <section className="overflow-hidden rounded-xl border border-slate-300 border-l-[3px] border-l-primary/70 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-gradient-to-r from-primary/[0.09] to-transparent px-4 py-2.5">
            <div className="flex items-center gap-2.5">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">P</span>
              <span className="text-[15px] font-semibold text-slate-900">Proof of Delivery</span>
              <span className="text-[11px] text-slate-500">
                {(bookingRecord.deliveries ?? []).filter((d) => isDeliveryPodUploaded(d)).length}/{bookingRecord.deliveries?.length ?? 0} uploaded
              </span>
            </div>
            <Button size="sm" onClick={markBookingCompleted} disabled={!allDeliveryPodsCaptured}>
              Move Booking To Completed
            </Button>
          </div>
          <div className="space-y-2 px-4 py-3">
            {allDeliveryPodsCaptured ? (
              <div className="rounded-md border border-emerald-200 bg-emerald-50/70 px-3 py-1.5 text-[12px] font-medium text-emerald-800">
                ✓ All deliveries POD uploaded — ready to complete.
              </div>
            ) : null}
            {(bookingRecord.deliveries ?? []).map((delivery) => {
              const podCount = getDeliveryPodCount(delivery);
              const uploaded = isDeliveryPodUploaded(delivery);
              const podOpen = podEditId === delivery.id;
              const podFileList = delivery.pod?.podFiles ?? (delivery.pod?.podDocument ? [delivery.pod.podDocument] : []);
              return (
                <div key={`pod-card-${delivery.id}`} className="rounded-lg border border-slate-200 px-3 py-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-[13px]">
                      <span className="font-semibold text-slate-900">Delivery {delivery.deliveryNo}</span>
                      <span className={`ml-2 text-[12px] font-medium ${uploaded ? "text-emerald-600" : "text-amber-600"}`}>
                        {uploaded ? `✓ POD Uploaded${podCount > 1 ? ` (${podCount} files)` : ""}` : "⚠ POD Pending"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant={podOpen ? "default" : uploaded ? "outline" : "default"} onClick={() => setPodEditId(podOpen ? null : delivery.id)}>
                        {uploaded ? "Add More POD" : "Upload POD"}
                      </Button>
                    </div>
                  </div>
                  {uploaded && podFileList.length ? (
                    <ul className="mt-1.5 flex flex-wrap gap-1.5 text-[11px] text-slate-600">
                      {podFileList.map((file, fileIndex) => (
                        <li key={`${delivery.id}-pod-${fileIndex}`} className="rounded border border-slate-200 bg-slate-50 px-2 py-0.5">{file}</li>
                      ))}
                    </ul>
                  ) : null}
                  {podOpen ? renderPodForm(delivery.id) : null}
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      {bookingRecord.status !== "PENDING_ASSIGNMENT" ? (
      <Card>
        <CardContent className="p-3">
          <div className="space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Tabs tabs={["Overview", "Deliveries", "Documents", "Timeline", "Expenses", "Advance"]} active={activeTab} onChange={setActiveTab} />
                          {activeTab === "Deliveries" && actionableReassignmentRemarks.length ? (
              <button
                type="button"
                onClick={() => setShowExecutionOpsPanel((current) => !current)}
                className="inline-flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-left text-sm font-medium text-rose-900 shadow-sm"
              >
                <span className="inline-flex h-2.5 w-2.5 rounded-full bg-rose-600" />
                <span>{actionableReassignmentRemarks[0]?.type.replace(/_/g, " ")}</span>
              </button>
            ) : null}
            </div>

            {activeTab === "Overview" ? (
              <div className="grid gap-3 lg:grid-cols-3">
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                  <p className="mb-2 text-sm font-semibold text-gray-900">Booking Information</p>
                  <div className="grid gap-1.5">
                    <DetailRow label="Booking No" value={bookingRecord.bookingId} />
                    <DetailRow label="Customer" value={customer?.name ?? "-"} />
                    <DetailRow label="Lane" value={`${sourceAddress?.city ?? "-"} to ${destinationAddress?.city ?? "-"}`} />
                    <DetailRow label="Pickup" value={bookingRecord.pickupDate || bookingRecord.pickupTime ? `${bookingRecord.pickupDate ?? "-"} ${bookingRecord.pickupTime ?? ""}`.trim() : "-"} />
                    <DetailRow label="Deliveries" value={String(bookingRecord.numberOfDeliveries ?? bookingRecord.deliveries?.length ?? 1)} />
                    <DetailRow label="Qty / Weight" value={`${bookingRecord.quantity} ${bookingRecord.uom} / ${bookingRecord.weight} ${bookingRecord.weightUom ?? bookingRecord.uom}`} />
                  </div>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                  <p className="mb-2 text-sm font-semibold text-gray-900">Vehicle Information</p>
                  <div className="grid gap-1.5">
                    <DetailRow label="Vehicle" value={assignedVehicle?.registrationNumber ?? "Not assigned"} />
                    <DetailRow label="Vehicle Type" value={vehicleType?.typeCode ?? "-"} />
                    <DetailRow label="Driver" value={assignedDriver?.name ?? bookingRecord.assignment?.driverName ?? "Not assigned"} />
                    <DetailRow label="Driver Phone" value={assignedDriver?.phone ?? "-"} />
                    <DetailRow label="Vendor" value={assignedVendor?.name ?? bookingRecord.assignment?.vendorName ?? "Own Fleet"} />
                    <DetailRow label="Mode / Service" value={`${bookingRecord.modeOfTransport ?? "ROAD"} / ${bookingRecord.serviceType}`} />
                  </div>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                  <p className="mb-2 text-sm font-semibold text-gray-900">Commercial Information</p>
                  <div className="grid gap-1.5">
                    <DetailRow label="Commercial Type" value={bookingRecord.commercialType} />
                    <DetailRow label="Rate Type" value={bookingRecord.pricing.rateType.replace(/_/g, " ")} />
                    <DetailRow label="Selling Freight" value={`Rs ${customerFreight.toLocaleString()}`} />
                    <DetailRow label="Buying Freight" value={bookingRecord.assignment?.vendorFreight != null ? `Rs ${bookingRecord.assignment.vendorFreight.toLocaleString()}` : "Pending"} />
                    {access.can("BOOKING_DETAIL", "VIEW_MARGIN") ? (
                      <DetailRow label="Margin" value={bookingRecord.assignment?.marginAmount != null ? `Rs ${bookingRecord.assignment.marginAmount.toLocaleString()}` : "Pending"} />
                    ) : null}
                    <DetailRow label="Documents" value={documentsReady ? "Ready" : "Pending"} />
                  </div>
                </div>
              </div>
            ) : null}

                      {activeTab === "Deliveries" ? (
            <div className="space-y-3">
              {showExecutionOpsPanel && (
                <div className="rounded-[20px] border border-rose-200 bg-white p-3 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-950">
                        {actionableReassignmentRemarks[0]?.type.replace(/_/g, " ")}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {actionableReassignmentRemarks[0]?.message}
                      </p>
                    </div>
                      <div className="flex flex-wrap items-center gap-2">
                      {actionableReassignmentRemarks[0] && canChangeAssignment ? (
                        <Button size="sm" onClick={() => triggerReassignmentFromRemark(actionableReassignmentRemarks[0])}>
                          Take Action
                        </Button>
                      ) : null}
                      <Button size="sm" variant="outline" onClick={() => setShowExecutionOpsPanel(false)}>
                        Minimize
                      </Button>
                    </div>
                  </div>
                  <div className="mt-3 space-y-3">
                      <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
                      <DetailRow label="Current Vendor" value={assignedVendor?.name ?? bookingRecord.assignment?.vendorName ?? "Not assigned"} tone="blue" />
                      <DetailRow label="Current Vehicle" value={assignedVehicle?.registrationNumber ?? bookingRecord.assignment?.vehicleLabel ?? "Not assigned"} tone="blue" />
                      <DetailRow label="Current Driver" value={assignedDriver?.name ?? bookingRecord.assignment?.driverName ?? "Not assigned"} tone="blue" />
                      <DetailRow label="Assigned At" value={bookingRecord.assignment?.assignedAt ? formatDateTime(bookingRecord.assignment.assignedAt) : "Not assigned"} tone="blue" />
                    </div>
                    <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
                      Freight and invoice values are unchanged by reassignment.
                    </div>
                    {assignmentHistory.length ? (
                      <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3">
                        <p className="text-sm font-semibold text-slate-900">Assignment Change History</p>
                        <div className="mt-3 space-y-2">
                          {assignmentHistory.map((entry) => (
                            <div key={entry.id} className="rounded-2xl border border-slate-200 bg-white px-3 py-3">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <p className="text-sm font-semibold text-slate-900">{entry.changeType.replace(/_/g, " ")}</p>
                                <span className="text-xs text-slate-500">{formatDateTime(entry.createdAt)}</span>
                              </div>
                              <p className="mt-2 text-sm text-slate-700">
                                {`${entry.previousDriverName ?? "-"} / ${entry.previousVehicleNumber ?? "-"} -> ${entry.newDriverName ?? "-"} / ${entry.newVehicleNumber ?? "-"}`}
                              </p>
                              <p className="mt-1 text-xs text-slate-500">
                                Vendor: {entry.previousVendorName ?? "-"} {"->"} {entry.newVendorName ?? "-"}
                              </p>
                              <p className="mt-1 text-xs text-slate-500">
                                Vendor freight: {entry.previousVendorFreight != null ? formatCurrency(entry.previousVendorFreight) : "-"} {"->"} {entry.newVendorFreight != null ? formatCurrency(entry.newVendorFreight) : "-"} | Customer freight: {entry.customerFreight != null ? formatCurrency(entry.customerFreight) : "-"} | Margin: {entry.marginImpact != null ? formatCurrency(entry.marginImpact) : "-"}
                              </p>
                              <p className="mt-1 text-xs text-slate-500">
                                Reason: {entry.reason.replace(/_/g, " ")} | Changed by: {entry.changedByUserName}{entry.changedByRole ? ` (${entry.changedByRole})` : ""}
                              </p>
                              {entry.newInvoiceDocument || entry.newEwayBillDocument ? (
                                <p className="mt-1 text-xs text-slate-500">
                                  Invoice: {entry.newInvoiceDocument ?? "-"} | E-Waybill: {entry.newEwayBillDocument ?? "-"}
                                </p>
                              ) : null}
                              <p className="mt-1 text-xs text-slate-500">Remark: {entry.remark}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                    {vehicleReplacementHistory.length ? (
                      <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3">
                        <p className="text-sm font-semibold text-slate-900">Vehicle Replacement History</p>
                        <div className="mt-3 space-y-2">
                          {vehicleReplacementHistory.map((entry) => (
                            <div key={entry.id} className="rounded-2xl border border-slate-200 bg-white px-3 py-3">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <p className="text-sm font-semibold text-slate-900">{entry.status.replace(/_/g, " ")}</p>
                                <span className="text-xs text-slate-500">{formatDateTime(entry.requestedAt)}</span>
                              </div>
                              <p className="mt-2 text-sm text-slate-700">
                                {`${entry.previousVehicleNumber ?? "-"} -> ${entry.newVehicleNumber ?? "Pending"} | ${entry.previousDriverName ?? "-"} -> ${entry.newDriverName ?? "Pending"}`}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                    {vendorReplacementRequests.length ? (
                      <div className="rounded-2xl border border-amber-200 bg-amber-50/90 p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <p className="text-sm font-semibold text-amber-950">Vehicle Replacement Request</p>
                            <p className="text-xs text-amber-800">Vendor action pending.</p>
                          </div>
                          <Button size="sm" onClick={() => openVehicleReplacementDialog("VENDOR_ACTION", vendorReplacementRequests[0]?.id)}>
                            Review
                          </Button>
                        </div>
                      </div>
                    ) : null}
                    {internalReplacementRequests.length && canReplaceVehicle ? (
                      <div className="rounded-2xl border border-rose-200 bg-rose-50/90 p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <p className="text-sm font-semibold text-rose-950">Internal Replacement Required</p>
                            <p className="text-xs text-rose-800">Vendor rejected replacement. Complete internal fallback.</p>
                          </div>
                          <Button size="sm" onClick={() => openVehicleReplacementDialog("INTERNAL_FALLBACK", internalReplacementRequests[0]?.id)}>
                            Replace Vendor / Vehicle / Driver
                          </Button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              )}
              {visibleBreakdownEvent ? (
                <div className="rounded-[20px] border border-rose-200 bg-rose-50/90 p-3 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-rose-950">Vehicle Breakdown Status</p>
                      <p className="mt-1 text-xs text-rose-800">
                        {visibleBreakdownEvent.repairStatus === "WAITING_FOR_REPAIR"
                          ? "Vehicle breakdown reported. Waiting for repair."
                          : visibleBreakdownEvent.repairStatus === "REPAIRED_CONTINUED"
                            ? `Vehicle repaired and continued. Downtime: ${formatDowntime(visibleBreakdownEvent.downtimeMinutes)}.`
                            : visibleBreakdownEvent.repairStatus === "REPLACEMENT_REQUIRED"
                              ? "Repair not completed. Vehicle replacement required."
                              : "Vehicle replaced after breakdown."}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {visibleBreakdownEvent.repairStatus === "WAITING_FOR_REPAIR" ? (
                        <>
                          <Button size="sm" variant="outline" onClick={() => openBreakdownAction(visibleBreakdownEvent.id, "CONTINUE")}>
                            Update Repair & Continue
                          </Button>
                          {canHandleVehicleBreakdown ? (
                            <Button size="sm" onClick={() => openBreakdownAction(visibleBreakdownEvent.id, "REPLACE")}>
                              Replace Vehicle
                            </Button>
                          ) : null}
                        </>
                      ) : null}
                    </div>
                  </div>
                  <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
                    <DetailRow label="Reported At" value={formatDateTime(visibleBreakdownEvent.reportedAt)} tone="amber" />
                    <DetailRow label="Expected Repair By" value={formatDateTime(visibleBreakdownEvent.expectedRepairAt)} tone="amber" />
                    <DetailRow label="Elapsed Waiting Time" value={formatElapsedSince(visibleBreakdownEvent.reportedAt, visibleBreakdownEvent.repairCompletedAt)} tone="amber" />
                    <DetailRow label="Current Status" value={visibleBreakdownEvent.repairStatus.replace(/_/g, " ")} tone="amber" />
                  </div>
                  {breakdownEvents.length > 1 ? (
                    <div className="mt-3 rounded-2xl border border-rose-200 bg-white/80 p-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-rose-700">Breakdown Incidents</p>
                      <div className="mt-3 space-y-2">
                        {breakdownEvents.map((event, index) => (
                          <div key={event.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-rose-100 bg-rose-50/60 px-3 py-2">
                            <div>
                              <p className="text-sm font-medium text-slate-900">Breakdown {breakdownEvents.length - index}</p>
                              <p className="text-xs text-slate-500">{formatDateTime(event.reportedAt)} | {event.location} | {event.repairStatus.replace(/_/g, " ")}</p>
                            </div>
                            <Button size="sm" variant="outline" onClick={() => openBreakdownAction(event.id, event.repairStatus === "WAITING_FOR_REPAIR" ? "SELECT" : "CONTINUE")}>
                              View
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}
              {destinationChangeRequests.length || bookingRevisionEnabled || bookingRevised ? (
              <div className="rounded-[22px] border border-white/75 bg-white/80 p-3 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-950">Destination Change Workspace</p>
                    <p className="mt-1 text-xs text-slate-500">Raise issue first, update customer address master separately, then review operational impact from here.</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button asChild size="sm" variant="outline">
                      <Link to={`/tenant/${tenant.id}/customers/${bookingRecord.customerId}`}>Open Customer Address Master</Link>
                    </Button>
                    <Select value={destinationChangeStatusFilter} onChange={(event) => setDestinationChangeStatusFilter(event.target.value as BookingDestinationChangeRequest["status"] | "ALL")}>
                      <option value="ALL">All statuses</option>
                      <option value="DRAFT">Draft</option>
                      <option value="SUBMITTED">Submitted</option>
                      <option value="UNDER_REVIEW">Under Review</option>
                      <option value="APPROVED">Approved</option>
                      <option value="REJECTED">Rejected</option>
                      <option value="IMPLEMENTED">Implemented</option>
                    </Select>
                  </div>
                </div>
                {destinationChangeRequests.length ? (
                  <div className="mt-3 grid gap-2 xl:grid-cols-2">
                    {destinationChangeRequests.map((request) => (
                      <button
                        key={request.id}
                        type="button"
                        onClick={() => openDestinationChangeRequest(request.id)}
                        className={`rounded-2xl border px-3 py-3 text-left ${destinationChangeRequestId === request.id ? "border-cyan-300 bg-cyan-50" : "border-border/70 bg-slate-50/70"}`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-semibold text-slate-900">Delivery {(bookingRecord.deliveries ?? []).find((delivery) => delivery.id === request.deliveryId)?.deliveryNo ?? "-"}</p>
                          <Badge variant={request.status === "IMPLEMENTED" ? "success" : request.status === "REJECTED" ? "warning" : "outline"}>{request.status.replace(/_/g, " ")}</Badge>
                        </div>
                        <p className="mt-2 text-sm text-slate-700">{request.reason}</p>
                        <p className="mt-1 text-xs text-slate-500">{request.eventLabel ?? "Destination Change Requested"} | {new Date(request.raisedAt).toLocaleString()}</p>
                        {request.requestNotes ? <p className="mt-1 text-xs text-slate-500">Notes: {request.requestNotes}</p> : null}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
              ) : null}
              <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
                {(bookingRecord.deliveries ?? []).map((delivery) => {
                  const isActive = activeDeliveryWorkspaceId === delivery.id;
                  const deliveryDestination = delivery.destinationAddressId ? addressMap.get(delivery.destinationAddressId) ?? null : null;
                  const deliveryDestinationConsignee =
                    deliveryDestination?.consigneeName?.trim() ||
                    deliveryDestination?.addressName?.trim() ||
                    delivery.destinationCity ||
                    "-";
                  const deliveryDestinationFullAddress =
                    deliveryDestination?.fullAddress ||
                    [
                      deliveryDestination?.addressLine1,
                      deliveryDestination?.addressLine2,
                      deliveryDestination?.city,
                      deliveryDestination?.state,
                      deliveryDestination?.pincode,
                    ]
                      .filter(Boolean)
                      .join(", ") ||
                    delivery.destinationCity ||
                    "-";
                  const visibleDeliveryLrNumber = getVisibleDeliveryLrNumber(delivery);
                  return (
                    <button
                      key={`selector-${delivery.id}`}
                      type="button"
                      onClick={() => setActiveDeliveryWorkspaceId(delivery.id)}
                      className={`rounded-lg border px-3 py-2 text-left transition ${
                        isActive
                          ? "border-primary bg-primary/5"
                          : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[13px] font-semibold text-gray-900">Delivery {delivery.deliveryNo}</span>
                        <Badge variant={isDeliveryPodUploaded(delivery) ? "success" : "warning"}>{isDeliveryPodUploaded(delivery) ? `POD${getDeliveryPodCount(delivery) > 1 ? ` ${getDeliveryPodCount(delivery)}` : ""}` : "Open"}</Badge>
                      </div>
                      <p className="mt-0.5 truncate text-[11px] text-gray-500">
                        {formatStatusLabel(delivery.status)} · {delivery.trackingId || "Tracking pending"}{visibleDeliveryLrNumber ? ` · LR ${visibleDeliveryLrNumber}` : ""}
                      </p>
                      <p className="mt-0.5 truncate text-[12px] font-medium text-gray-700">{deliveryDestinationConsignee}</p>
                    </button>
                  );
                })}
              </div>

              {(bookingRecord.deliveries ?? [])
                .filter((delivery) => delivery.id === activeDeliveryWorkspaceId)
                .map((delivery) => {
                const rawDeliveryTab = deliveryWorkspaceTabs[delivery.id] ?? "Load Details";
                const deliveryTab = rawDeliveryTab === "Freight Details" ? "Load Details" : rawDeliveryTab;
                const deliveryDocuments = shipmentDocuments.deliveries.find((item) => item.deliveryId === delivery.id) ?? null;
                const deliveryMaterial = materialMap.get(delivery.materialId) ?? null;
                const deliveryOrigin = addressMap.get(delivery.originAddressId) ?? null;
                const deliveryDestination = delivery.destinationAddressId ? addressMap.get(delivery.destinationAddressId) ?? null : null;
                const invoiceFiles = deliveryDocuments?.invoices ?? [];
                const invoiceNumbers = invoiceFiles.map((invoice) => invoice.invoiceNumber).filter(Boolean).join(", ");
                const invoiceMaterials = invoiceFiles.map((invoice) => invoice.material).filter(Boolean).join(", ");
                const invoiceWeights = invoiceFiles
                  .map((invoice) => invoice.weight != null ? `${invoice.weight} ${invoice.weightUOM ?? ""}`.trim() : "")
                  .filter(Boolean)
                  .join(", ");
                const invoiceQuantities = invoiceFiles
                  .map((invoice) => invoice.quantity != null ? `${invoice.quantity} ${invoice.quantityUOM ?? ""}`.trim() : "")
                  .filter(Boolean)
                  .join(", ");
                const firstInvoice = invoiceFiles[0] ?? null;
                const deliveryDestinationConsignee =
                  deliveryDestination?.consigneeName?.trim() ||
                  firstInvoice?.consigneeName?.trim() ||
                  podForms[delivery.id]?.consigneeName?.trim() ||
                  deliveryDestination?.addressName?.trim() ||
                  delivery.destinationCity ||
                  "-";
                const deliveryDestinationFullAddress =
                  deliveryDestination?.fullAddress ||
                  [
                    deliveryDestination?.addressLine1,
                    deliveryDestination?.addressLine2,
                    deliveryDestination?.city,
                    deliveryDestination?.state,
                    deliveryDestination?.pincode,
                  ]
                    .filter(Boolean)
                    .join(", ") ||
                  delivery.destinationCity ||
                  "-";
                const trackingSummary = buildDeliveryTrackingSummary({
                  bookingPickupDate: bookingRecord.pickupDate,
                  bookingPickupTime: bookingRecord.pickupTime,
                  bookingTat: bookingRecord.tat,
                  bookingStatus: bookingRecord.status,
                  deliveryStatus: delivery.status,
                  distanceKm: delivery.distanceKm ?? null,
                  destinationLabel: deliveryDestination?.addressName ?? delivery.destinationCity ?? "-",
                  updatedAt: bookingRecord.updatedAt,
                });
                const recentActions = buildDeliveryRecentActions(bookingRecord.statusTimeline);
                const deliveryFreight = deliveryDocuments?.freightRate ?? shipmentDocuments.totalFreightRate ?? bookingRecord.pricing.calculatedFreight;
                const podEnabled = ["POD_PENDING", "COMPLETED"].includes(bookingRecord.status);
                const visibleDeliveryLrNumber = getVisibleDeliveryLrNumber(delivery);

                return (
                  <div key={delivery.id} className="max-h-[70vh] overflow-y-auto rounded-xl border border-gray-200 bg-white p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-base font-semibold tracking-[-0.02em] text-slate-950">Delivery {delivery.deliveryNo}</p>
                          <span className="text-slate-300">•</span>
                          <BookingStatusBadge status={delivery.status} />
                        </div>
                        <p className="mt-0.5 text-xs text-slate-500">{delivery.trackingId || "Tracking pending"}{visibleDeliveryLrNumber ? ` • LR ${visibleDeliveryLrNumber}` : ""}</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {visibleDeliveryLrNumber ? (
                          <Button asChild size="sm" variant="outline">
                            <Link to={`/tenant/${tenant.id}/bookings/${bookingRecord.id}/lr`}>View LR</Link>
                          </Button>
                        ) : null}
                        {bookingRecord.status === "IN_TRANSIT" && delivery.lrNumber?.trim() ? (
                          // Delivery-wise Track → Track-and-Trace trip keyed by LR number.
                          <Button asChild size="sm" variant="outline">
                            <Link to={`/tenant/${tenant.id}/track-and-trace/trips/${encodeURIComponent(delivery.lrNumber.trim())}`}>Track</Link>
                          </Button>
                        ) : null}
                        <Button size="sm" variant="outline" onClick={() => setRemarkDeliveryId(delivery.id)}>Add Remark</Button>
                        {["IN_TRANSIT", "ARRIVED", "DELAYED", "EXCEPTION"].includes(bookingRecord.status) && delivery.status !== "COMPLETED" ? (
                          <Button size="sm" onClick={() => markDeliveryCompleted(delivery.id)}>Mark Delivery Completed</Button>
                        ) : null}
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <Tabs
                        tabs={["Load Details", "Track", "Recent Action"]}
                        active={deliveryTab}
                        onChange={(tab) =>
                          setDeliveryWorkspaceTabs((current) => ({
                            ...current,
                            [delivery.id]: tab,
                          }))
                        }
                      />
                    </div>

                    {deliveryTab === "Track" ? (
                      <div className="mt-3 space-y-3">
                        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
                          <DetailRow label="Arriving In" value={trackingSummary.arrivingIn} />
                          <DetailRow label="ETA" value={trackingSummary.eta} />
                          <DetailRow label="Average Speed" value={trackingSummary.averageSpeed} />
                          <DetailRow label="Distance" value={trackingSummary.distance} />
                        </div>
                        <div className="rounded-2xl border border-white/70 bg-white/80 p-3">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-semibold text-slate-900">{trackingSummary.progressLabel}</p>
                            <span className="text-sm font-medium text-slate-600">{trackingSummary.progressPercent}%</span>
                          </div>
                          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                            <div className="h-full rounded-full bg-primary" style={{ width: `${trackingSummary.progressPercent}%` }} />
                          </div>
                          <p className="mt-3 text-sm text-slate-700">Last updated location & time: {trackingSummary.lastKnownLocation}</p>
                        </div>
                      </div>
                    ) : null}

                    {deliveryTab === "Recent Action" ? (
                      <div className="mt-3 grid gap-3 xl:grid-cols-2">
                        {recentActions.map((action) => (
                          <div key={`${delivery.id}-${action.label}`} className="rounded-2xl border border-white/70 bg-white/80 p-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <p className="text-sm font-semibold text-slate-900">{action.label}</p>
                              <span className="text-xs text-muted-foreground">{action.timestamp}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : null}

                    {deliveryTab === "Load Details" ? (
                      <div className="mt-3 space-y-3">
                        {/* Delivery-specific fields only. Customer / Vehicle / Driver / Freight / Status live in Overview; Invoice / E-Way Bill / LR / POD live in Documents. */}
                        <div className="grid gap-2 md:grid-cols-2 2xl:grid-cols-3">
                          <DetailRow label="Delivery Freight" value={formatCurrency(deliveryFreight || 0)} />
                          <DetailRow label="Origin" value={deliveryOrigin?.addressName ?? delivery.originCity ?? "-"} />
                          <DetailRow label="Destination" value={deliveryDestinationConsignee} />
                          <DetailRow label="Consignee Full Address" value={deliveryDestinationFullAddress} />
                          <DetailRow label="Consignee Name" value={firstInvoice?.consigneeName ?? podForms[delivery.id]?.consigneeName ?? "N/A"} />
                          <DetailRow label="Material" value={deliveryMaterial?.materialCode ?? "-"} />
                          <DetailRow label="Sub-brand" value={invoiceFiles.map((invoice) => invoice.subBrand).filter(Boolean).join(", ") || bookingRecord.subBrand || "N/A"} />
                          <DetailRow label="Quantity" value={delivery.quantity != null ? `${delivery.quantity} ${delivery.uom ?? ""}`.trim() : "-"} />
                          <DetailRow label="Weight" value={delivery.weight != null ? `${delivery.weight} ${delivery.weightUom ?? ""}`.trim() : "-"} />
                          <DetailRow label="Pickup Date & Time" value={bookingRecord.pickupDate || bookingRecord.pickupTime ? `${bookingRecord.pickupDate ?? "-"} ${bookingRecord.pickupTime ?? ""}`.trim() : "N/A"} />
                          <DetailRow label="TAT" value={bookingRecord.tat ?? "N/A"} />
                          <DetailRow label="ETA" value={trackingSummary.eta} />
                          <DetailRow label="Approx Trip Distance" value={trackingSummary.distance} />
                          <DetailRow label="Notes" value={bookingRecord.opsRemark?.trim() || "--"} />
                        </div>
                        <div className="rounded-2xl border border-white/70 bg-white/80 p-3">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">Trip Documents</p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {invoiceFiles.map((invoice) => (
                              <Badge key={invoice.id} variant="outline">{invoice.fileName || invoice.invoiceNumber || "Invoice"}</Badge>
                            ))}
                            {deliveryDocuments?.ewayBill?.fileName ? <Badge variant="outline">{deliveryDocuments.ewayBill.fileName}</Badge> : null}
                            {podForms[delivery.id]?.podDocument ? <Badge variant="outline">{podForms[delivery.id].podDocument}</Badge> : null}
                            {!invoiceFiles.length && !deliveryDocuments?.ewayBill?.fileName && !podForms[delivery.id]?.podDocument ? (
                              <span className="text-sm text-muted-foreground">No trip documents uploaded yet.</span>
                            ) : null}
                          </div>
                        </div>
                        {(delivery.revisions?.length ?? 0) > 0 ? (
                          <div className="rounded-2xl border border-slate-200 bg-slate-50/90 p-3">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">Delivery Revision Engine</p>
                            <div className="mt-3 space-y-2">
                              {[...(delivery.revisions ?? [])].sort((left, right) => right.revisionNo - left.revisionNo).map((revision) => (
                                <div key={revision.id} className={`rounded-2xl border px-3 py-3 ${revision.status === "ACTIVE" ? "border-emerald-300 bg-emerald-50" : "border-slate-200 bg-slate-100/80 opacity-80"}`}>
                                  <div className="flex flex-wrap items-center justify-between gap-2">
                                    <p className="text-sm font-semibold text-slate-900">Revision {revision.revisionNo}</p>
                                    <Badge variant={revision.status === "ACTIVE" ? "success" : "outline"}>{revision.status === "ACTIVE" ? "Revised Destination" : "Superseded"}</Badge>
                                  </div>
                                  <p className="mt-2 text-xs text-slate-600">{`${revision.previousSnapshot.city} -> ${revision.proposedSnapshot.city} | Freight impact ${formatCurrency(revision.impact.freightDelta)}`}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : null}
                        <div className="grid gap-3 2xl:grid-cols-[1fr_0.9fr]">
                          <SectionStrip title="Remarks">
                            <div className="max-h-[160px] overflow-y-auto pr-1">
                              <DeliveryRemarkTimeline remarks={bookingRecord.remarks.filter((remark) => remark.deliveryId === delivery.id)} />
                            </div>
                          </SectionStrip>
                          {false /* POD moved to Documents tab */ ? (
                            <SectionStrip title="POD">
                              <div className="space-y-2">
                                <div className="flex flex-wrap items-center gap-2">
                                  <label className={`inline-flex cursor-pointer items-center rounded-full border border-border/70 bg-white px-3 py-1.5 text-xs font-medium ${bookingRecord.status === "COMPLETED" ? "pointer-events-none opacity-60" : ""}`}>
                                    <input
                                      type="file"
                                      className="hidden"
                                      disabled={bookingRecord.status === "COMPLETED"}
                                      onChange={(event) => {
                                        const file = event.target.files?.[0] ?? null;
                                        if (!file) {
                                          return;
                                        }
                                        setPodForms((current) => ({
                                          ...current,
                                          [delivery.id]: {
                                            ...current[delivery.id],
                                            podDocument: file.name,
                                            photoName: file.name,
                                            podUploaded: false,
                                          },
                                        }));
                                        event.target.value = "";
                                      }}
                                    />
                                    {podForms[delivery.id]?.podDocument ? "Replace POD" : "Choose POD"}
                                  </label>
                                  <span className="text-xs text-muted-foreground">{podForms[delivery.id]?.podDocument || "No document uploaded"}</span>
                                </div>
                                <div className="grid gap-2">
                                  <Input
                                    value={podForms[delivery.id]?.consigneeName ?? ""}
                                    disabled={bookingRecord.status === "COMPLETED"}
                                    onChange={(event) => setPodForms((current) => ({ ...current, [delivery.id]: { ...current[delivery.id], consigneeName: event.target.value } }))}
                                    placeholder="Consignee name"
                                  />
                                  <Input
                                    value={podForms[delivery.id]?.podRemark ?? ""}
                                    disabled={bookingRecord.status === "COMPLETED"}
                                    onChange={(event) => setPodForms((current) => ({ ...current, [delivery.id]: { ...current[delivery.id], podRemark: event.target.value } }))}
                                    placeholder="POD remark"
                                  />
                                </div>
                                {access.can("BOOKING_DETAIL", "UPLOAD_POD") ? (
                                  <Button size="sm" disabled={bookingRecord.status === "COMPLETED"} onClick={() => saveDeliveryPod(delivery.id)}>
                                    Save POD
                                  </Button>
                                ) : null}
                              </div>
                            </SectionStrip>
                          ) : null}
                        </div>
                      </div>
                    ) : null}

                  </div>
                );
              })}

            </div>
          ) : null}

            {activeTab === "Documents" ? (
              <div className="space-y-3">
                {(bookingRecord.deliveries ?? []).map((delivery) => {
                  const docs = shipmentDocuments.deliveries.find((item) => item.deliveryId === delivery.id) ?? null;
                  const invoices = docs?.invoices ?? [];
                  const lrNumber = getVisibleDeliveryLrNumber(delivery);
                  const pod = podForms[delivery.id] ?? null;
                  const podOpen = podEditId === delivery.id;
                  const podLocked = bookingRecord.status === "COMPLETED";
                  return (
                    <div key={`doc-${delivery.id}`} className="rounded-xl border border-gray-200 bg-white p-4">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-gray-900">Delivery {delivery.deliveryNo}</p>
                        <div className="flex items-center gap-1.5">
                          {lrNumber ? (
                            <Button asChild size="sm" variant="outline"><Link to={`/tenant/${tenant.id}/bookings/${bookingRecord.id}/lr`}>View LR</Link></Button>
                          ) : null}
                          {access.can("BOOKING_DETAIL", "UPLOAD_POD") && ["POD_PENDING", "COMPLETED"].includes(bookingRecord.status) ? (
                            <Button size="sm" variant={podOpen ? "default" : "outline"} onClick={() => setPodEditId(podOpen ? null : delivery.id)}>
                              {isDeliveryPodUploaded(delivery) ? "Add More POD" : "Upload POD"}
                            </Button>
                          ) : null}
                        </div>
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                        <DetailRow label="Invoice" value={invoices.map((invoice) => invoice.invoiceNumber).filter(Boolean).join(", ") || "—"} />
                        <DetailRow label="E-Way Bill" value={docs?.ewayBill?.ewayBillNumber ?? "—"} />
                        <DetailRow label="LR" value={lrNumber ?? "—"} />
                        <DetailRow label="POD" value={isDeliveryPodUploaded(delivery) ? `Uploaded${getDeliveryPodCount(delivery) > 1 ? ` (${getDeliveryPodCount(delivery)})` : ""}` : "Pending"} />
                      </div>
                      {(() => {
                        const podFileList = delivery.pod?.podFiles ?? (delivery.pod?.podDocument ? [delivery.pod.podDocument] : []);
                        return invoices.length || docs?.ewayBill?.fileName || podFileList.length ? (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {invoices.map((invoice) => (<Badge key={invoice.id} variant="outline">{invoice.fileName || invoice.invoiceNumber || "Invoice"}</Badge>))}
                            {docs?.ewayBill?.fileName ? <Badge variant="outline">{docs.ewayBill.fileName}</Badge> : null}
                            {podFileList.map((file, fileIndex) => <Badge key={`pod-file-${fileIndex}`} variant="outline">{file}</Badge>)}
                          </div>
                        ) : null;
                      })()}
                      {podOpen ? renderPodForm(delivery.id) : null}
                    </div>
                  );
                })}
              </div>
            ) : null}

            {activeTab === "Timeline" ? (
              <div className="rounded-xl border border-gray-200 bg-white p-4">
                <ol className="relative ml-3 border-l border-gray-200">
                  {[...bookingRecord.statusTimeline].sort((left, right) => left.timestamp.localeCompare(right.timestamp)).map((event) => (
                    <li key={event.id} className="mb-4 ml-4">
                      <span className="absolute -left-[6px] mt-1 h-3 w-3 rounded-full border-2 border-white bg-primary" />
                      <p className="text-sm font-semibold text-gray-900">{event.status.replace(/_/g, " ")}</p>
                      <p className="text-xs text-gray-500">{formatDateTime(event.timestamp)}{event.actor ? ` · ${event.actor}` : ""}</p>
                      {event.note ? <p className="mt-0.5 text-xs text-gray-600">{event.note}</p> : null}
                    </li>
                  ))}
                </ol>
              </div>
            ) : null}

                      {activeTab === "Expenses" ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-gray-900">Booking Expenses</p>
                {bookingRecord.status !== "COMPLETED" ? (
                  <Button size="sm" onClick={() => openAddModal("expense")}>+ Add Expense</Button>
                ) : null}
              </div>
              {expenseItems.length ? (
                <div className="overflow-x-auto rounded-xl border border-gray-200">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                        <th className="px-3 py-2">Date &amp; time</th>
                        <th className="px-3 py-2">Expense type</th>
                        <th className="px-3 py-2">Amount</th>
                        <th className="px-3 py-2">Payment mode</th>
                        <th className="px-3 py-2">Paid by</th>
                        <th className="px-3 py-2">Bill/Receipt</th>
                        <th className="px-3 py-2">Status</th>
                        <th className="px-3 py-2">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {expenseItems.map((expense) => (
                        <tr key={expense.id} className="border-b border-gray-100">
                          <td className="px-3 py-2 text-gray-600">{formatDateTime(expense.dateTime ?? expense.createdAt)}</td>
                          <td className="px-3 py-2 font-medium text-gray-900">{expense.expenseType ?? expense.label}</td>
                          <td className="px-3 py-2 font-medium text-gray-900">{formatCurrency(expense.amount)}</td>
                          <td className="px-3 py-2 text-gray-600">{expense.paymentMode ?? "-"}</td>
                          <td className="px-3 py-2 text-gray-600">{expense.paidBy ?? "-"}</td>
                          <td className="px-3 py-2">
                            {expense.billReceiptFile ? (
                              <button type="button" className="text-primary underline" onClick={() => setExpenseViewId(expense.id)}>Download</button>
                            ) : "-"}
                          </td>
                          <td className="px-3 py-2">
                            <Badge variant={expense.status === "Approved" ? "success" : expense.status === "Rejected" ? "danger" : "warning"}>
                              {expense.status ?? "Pending"}
                            </Badge>
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex flex-wrap gap-1.5">
                              <Button size="sm" variant="outline" onClick={() => setExpenseViewId(expense.id)}>View</Button>
                              {bookingRecord.status !== "COMPLETED" && (expense.status ?? "Pending") === "Pending" ? (
                                <>
                                  <Button size="sm" variant="outline" onClick={() => setExpenseStatus(expense.id, "Approved")}>Approve</Button>
                                  <Button size="sm" variant="outline" onClick={() => setExpenseStatus(expense.id, "Rejected")}>Reject</Button>
                                </>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-gray-200 px-3 py-6 text-center text-sm text-gray-400">No expenses yet.</div>
              )}
            </div>
          ) : null}

                      {activeTab === "Advance" ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-gray-900">Booking Advance</p>
                {bookingRecord.status !== "COMPLETED" ? (
                  <Button size="sm" onClick={() => openAddModal("advance")}>+ Add Advance</Button>
                ) : null}
              </div>
              {advanceItems.length ? (
                <div className="overflow-x-auto rounded-xl border border-gray-200">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                        <th className="px-3 py-2">Date &amp; time</th>
                        <th className="px-3 py-2">Amount</th>
                        <th className="px-3 py-2">Payment mode</th>
                        <th className="px-3 py-2">Paid by</th>
                        <th className="px-3 py-2">Bill/Receipt</th>
                        <th className="px-3 py-2">Status</th>
                        <th className="px-3 py-2">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {advanceItems.map((expense) => (
                        <tr key={expense.id} className="border-b border-gray-100">
                          <td className="px-3 py-2 text-gray-600">{formatDateTime(expense.dateTime ?? expense.createdAt)}</td>
                          <td className="px-3 py-2 font-medium text-gray-900">{formatCurrency(expense.amount)}</td>
                          <td className="px-3 py-2 text-gray-600">{expense.paymentMode ?? "-"}</td>
                          <td className="px-3 py-2 text-gray-600">{expense.paidBy ?? "-"}</td>
                          <td className="px-3 py-2">
                            {expense.billReceiptFile ? (
                              <button type="button" className="text-primary underline" onClick={() => setExpenseViewId(expense.id)}>Download</button>
                            ) : "-"}
                          </td>
                          <td className="px-3 py-2">
                            <Badge variant={expense.status === "Approved" ? "success" : expense.status === "Rejected" ? "danger" : "warning"}>
                              {expense.status ?? "Pending"}
                            </Badge>
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex flex-wrap gap-1.5">
                              <Button size="sm" variant="outline" onClick={() => setExpenseViewId(expense.id)}>View</Button>
                              {bookingRecord.status !== "COMPLETED" && (expense.status ?? "Pending") === "Pending" ? (
                                <>
                                  <Button size="sm" variant="outline" onClick={() => setExpenseStatus(expense.id, "Approved")}>Approve</Button>
                                  <Button size="sm" variant="outline" onClick={() => setExpenseStatus(expense.id, "Rejected")}>Reject</Button>
                                </>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-gray-200 px-3 py-6 text-center text-sm text-gray-400">No advance recorded yet.</div>
              )}
            </div>
          ) : null}
          </div>
        </CardContent>
      </Card>
      ) : null}

      <Dialog
        open={expenseModalOpen}
        onOpenChange={setExpenseModalOpen}
        title={expenseMode === "advance" ? "Add Booking Advance" : "Add Booking Expense"}
        description={expenseMode === "advance"
          ? "Advance recorded against this booking. Approved advance is netted off the vendor invoice."
          : "Recorded against this booking. Approved expenses are billed to the customer in Finance."}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setExpenseModalOpen(false)}>Cancel</Button>
            <Button onClick={submitExpense}>{expenseMode === "advance" ? "Save Advance" : "Save Expense"}</Button>
          </div>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          {expenseMode === "advance" ? null : (
            <CompactField label="Expense type *">
              <Select value={expenseType} onChange={(event) => setExpenseType(event.target.value)}>
                {BOOKING_EXPENSE_TYPES.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </Select>
            </CompactField>
          )}
          <CompactField label="Amount *">
            <Input value={expenseAmount} onChange={(event) => setExpenseAmount(event.target.value)} placeholder="0" />
          </CompactField>
          <CompactField label="Payment mode *">
            <Select value={expensePaymentMode} onChange={(event) => setExpensePaymentMode(event.target.value as BookingExpensePaymentMode)}>
              <option value="NEFT">NEFT</option>
              <option value="UPI">UPI</option>
              <option value="Cash">Cash</option>
              <option value="Cheque">Cheque</option>
            </Select>
          </CompactField>
          {expenseMode === "advance" ? null : (
            <CompactField label="Paid by *">
              <Select value={expensePaidBy} onChange={(event) => setExpensePaidBy(event.target.value)}>
                {BOOKING_EXPENSE_PAID_BY.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </Select>
            </CompactField>
          )}
          <CompactField label="Bill / Receipt *">
            <div className="flex items-center gap-2">
              <label className="inline-flex cursor-pointer items-center rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium">
                <input
                  type="file"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0] ?? null;
                    if (file) {
                      setExpenseBillFile(file.name);
                    }
                    event.target.value = "";
                  }}
                />
                {expenseBillFile ? "Replace file" : "Choose file"}
              </label>
              <span className="truncate text-xs text-gray-500">{expenseBillFile || "No file"}</span>
            </div>
          </CompactField>
          <CompactField label="Notes">
            <Textarea value={expenseNotes} onChange={(event) => setExpenseNotes(event.target.value)} />
          </CompactField>
        </div>
      </Dialog>

      {expenseViewId
        ? (() => {
            const ex = (bookingRecord.expenses ?? []).find((expense) => expense.id === expenseViewId);
            if (!ex) {
              return null;
            }
            return (
              <Dialog open onOpenChange={() => setExpenseViewId(null)} title="Expense Details">
                <div className="grid gap-2">
                  <DetailRow label="Date & time" value={formatDateTime(ex.dateTime ?? ex.createdAt)} />
                  <DetailRow label="Expense type" value={ex.expenseType ?? ex.label} />
                  <DetailRow label="Amount" value={formatCurrency(ex.amount)} />
                  <DetailRow label="Payment mode" value={ex.paymentMode ?? "-"} />
                  <DetailRow label="Paid by" value={ex.paidBy ?? "-"} />
                  <DetailRow label="Bill / Receipt" value={ex.billReceiptFile ?? "-"} />
                  <DetailRow label="Status" value={ex.status ?? "Pending"} />
                  <DetailRow label="Notes" value={ex.notes ?? "-"} />
                </div>
              </Dialog>
            );
          })()
        : null}

      <Dialog
        open={reassignmentOpen}
        onOpenChange={(open) => {
          if (!open) {
            resetReassignmentDialog();
          }
        }}
        title="Operational Reassignment"
        description="Change driver, vehicle, vendor, or a full assignment combination without losing old assignment history. Matching vendor-linked options are shown first, but ops can still choose any active driver."
        widthClassName="max-w-5xl"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={resetReassignmentDialog}>Cancel</Button>
            <Button onClick={submitReassignment} disabled={!canSubmitReassignment}>
              Update Assignment
            </Button>
          </div>
        }
      >
        <div className="grid gap-4">
          {reassignmentError ? (
            <div className="rounded-2xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {reassignmentError}
            </div>
          ) : null}
          <div className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
            <div className="space-y-4">
              <div className="rounded-2xl border bg-slate-50/90 p-4">
                <p className="text-sm font-semibold text-slate-900">Step 1: Select Change Type</p>
                <div className="mt-3 grid gap-2">
                  <Button variant={reassignmentType === "DRIVER" ? "default" : "outline"} onClick={() => setReassignmentType("DRIVER")}>Change Driver</Button>
                  <Button variant={reassignmentType === "VEHICLE" ? "default" : "outline"} onClick={() => setReassignmentType("VEHICLE")}>Change Vehicle</Button>
                  <Button variant={reassignmentType === "VEHICLE_DRIVER" ? "default" : "outline"} onClick={() => setReassignmentType("VEHICLE_DRIVER")}>Change Vehicle + Driver</Button>
                  <Button variant={reassignmentType === "VENDOR_VEHICLE_DRIVER" ? "default" : "outline"} onClick={() => setReassignmentType("VENDOR_VEHICLE_DRIVER")}>Change Vendor + Vehicle + Driver</Button>
                </div>
              </div>
              <div className="rounded-2xl border bg-slate-50/90 p-4">
                <p className="text-sm font-semibold text-slate-900">Step 2: Current Assignment Summary</p>
                <div className="mt-3 grid gap-2">
                  <DetailRow label="Current Vendor" value={assignedVendor?.name ?? bookingRecord.assignment?.vendorName ?? "Not assigned"} />
                  <DetailRow label="Current Vehicle Number" value={assignedVehicle?.registrationNumber ?? bookingRecord.assignment?.vehicleLabel ?? "Not assigned"} />
                  <DetailRow label="Current Vehicle Type" value={assignedVehicle ? vehicleTypeMap.get(assignedVehicle.vehicleTypeId)?.typeCode ?? "N/A" : "N/A"} />
                  <DetailRow label="Current Driver Name" value={assignedDriver?.name ?? bookingRecord.assignment?.driverName ?? "Not assigned"} />
                  <DetailRow label="Current Driver Mobile" value={assignedDriver?.phone ?? "N/A"} />
                  <DetailRow label="Assigned Date / Time" value={bookingRecord.assignment?.assignedAt ? formatDateTime(bookingRecord.assignment.assignedAt) : "N/A"} />
                  <DetailRow label="Current Booking Status" value={formatStatusLabel(bookingRecord.status)} />
                  <DetailRow label="Current Location / Stage" value={currentExecutionStage.label} />
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <div className="rounded-2xl border bg-white p-4">
                <p className="text-sm font-semibold text-slate-900">Step 3: New Assignment</p>
                <div className="mt-3 grid gap-4">
                  {reassignmentType === "VENDOR_VEHICLE_DRIVER" ? (
                    <CompactField label="Select New Vendor">
                      <Select value={reassignmentVendorId} onChange={(event) => {
                        setReassignmentVendorId(event.target.value);
                        setReassignmentVehicleId("");
                        setReassignmentDriverId("");
                      }}>
                        <option value="">Select vendor</option>
                        {adminSources.vendors.filter((vendor) => vendor.status === "active").map((vendor) => (
                          <option key={vendor.id} value={vendor.id}>{vendor.name}</option>
                        ))}
                      </Select>
                    </CompactField>
                  ) : null}
                  {reassignmentType !== "DRIVER" ? (
                    <>
                      <CompactField label={reassignmentType === "VENDOR_VEHICLE_DRIVER" ? "Select New Vehicle From Vendor" : "Select New Vehicle"}>
                        <Select value={reassignmentVehicleId} onChange={(event) => setReassignmentVehicleId(event.target.value)}>
                          <option value="">Select new vehicle</option>
                          {availableReassignmentVehicles.map((vehicle) => (
                            <option key={vehicle.id} value={vehicle.id}>
                              {vehicle.registrationNumber} | {vehicleTypeMap.get(vehicle.vehicleTypeId)?.typeCode ?? "Type"} | {(vehicle.vendorId ? vendorMap.get(vehicle.vendorId)?.name : "Own Fleet") ?? "Own Fleet"}
                            </option>
                          ))}
                        </Select>
                      </CompactField>
                      <div className="grid gap-2 md:grid-cols-2">
                        <DetailRow label="Vehicle Type" value={reassignmentVehicle ? vehicleTypeMap.get(reassignmentVehicle.vehicleTypeId)?.typeCode ?? "N/A" : "Select vehicle"} />
                        <DetailRow label="Ownership / Vendor" value={reassignmentVehicle ? (reassignmentVendor?.name ?? "Own Fleet") : "Select vehicle"} />
                        <DetailRow label="Availability" value={reassignmentVehicle?.isActive ? "Available" : "Unavailable"} />
                        <DetailRow label="Compliance Status" value={reassignmentVehicle ? "Active" : "Select vehicle"} />
                      </div>
                    </>
                  ) : null}
                  {reassignmentType === "DRIVER" || reassignmentType === "VEHICLE_DRIVER" || reassignmentType === "VENDOR_VEHICLE_DRIVER" || (reassignmentType === "VEHICLE" && currentDriverCompatibleWithSelectedVehicle === false) ? (
                    <>
                      <CompactField label={reassignmentType === "VEHICLE" ? "Select Driver For New Vehicle" : reassignmentType === "VENDOR_VEHICLE_DRIVER" ? "Select New Driver From Vendor" : "Select New Driver"}>
                        <Select value={reassignmentDriverId} onChange={(event) => setReassignmentDriverId(event.target.value)}>
                          <option value="">Select driver</option>
                          {availableReassignmentDrivers.map((driver) => (
                            <option key={driver.id} value={driver.id}>
                              {driver.name} | {driver.phone} | {(driver.vendorId ? vendorMap.get(driver.vendorId)?.name : "Own Fleet") ?? "Own Fleet"}
                            </option>
                          ))}
                        </Select>
                      </CompactField>
                      <div className="grid gap-2 md:grid-cols-2">
                        <DetailRow label="Driver Mobile" value={reassignmentDriverId ? driverMap.get(reassignmentDriverId)?.phone ?? "N/A" : "Select driver"} />
                        <DetailRow label="Driver Status" value={reassignmentDriverId ? (driverMap.get(reassignmentDriverId)?.isActive ? "Active" : "Inactive") : "Select driver"} />
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                        Vendor-linked drivers are shown first for operational priority, but cross-vendor driver selection is allowed when needed.
                      </div>
                    </>
                  ) : reassignmentType === "VEHICLE" ? (
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                      Current driver can remain with the selected vehicle.
                    </div>
                  ) : null}
                  {["VEHICLE", "VEHICLE_DRIVER", "VENDOR_VEHICLE_DRIVER"].includes(reassignmentType) ? (
                    <CompactField label="New Vendor Freight Rate">
                      <Input value={reassignmentVendorFreight} onChange={(event) => setReassignmentVendorFreight(event.target.value)} placeholder="Enter vendor freight rate" />
                    </CompactField>
                  ) : null}
                </div>
              </div>
              <div className="rounded-2xl border bg-white p-4">
                <p className="text-sm font-semibold text-slate-900">Freight Impact</p>
                <div className="mt-3 grid gap-2 md:grid-cols-2">
                  <DetailRow label="Old Vendor Freight" value={bookingRecord.assignment?.vendorFreight != null ? formatCurrency(bookingRecord.assignment.vendorFreight) : "N/A"} />
                  <DetailRow label="New Vendor Freight" value={reassignmentVendorFreight.trim() ? formatCurrency(Number(reassignmentVendorFreight)) : "Enter freight"} />
                  <DetailRow label="Customer Freight" value={formatCurrency(reassignmentCustomerFreight)} />
                  <DetailRow label="Margin Impact" value={reassignmentMarginImpact != null ? formatCurrency(reassignmentMarginImpact) : "N/A"} />
                </div>
              </div>
              <div className="rounded-2xl border bg-white p-4">
                <p className="text-sm font-semibold text-slate-900">Step 4: Reason / Remark</p>
                <div className="mt-3 grid gap-4 md:grid-cols-2">
                  <CompactField label="Reassignment Reason">
                    <Select value={reassignmentReason} onChange={(event) => setReassignmentReason(event.target.value as BookingReassignmentReason)}>
                      {REASSIGNMENT_REASON_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </Select>
                  </CompactField>
                  <CompactField label="Effective Time">
                    <Input type="datetime-local" value={reassignmentEffectiveAt} onChange={(event) => setReassignmentEffectiveAt(event.target.value)} />
                  </CompactField>
                  <CompactField label="Location (Optional)">
                    <Input value={reassignmentLocation} onChange={(event) => setReassignmentLocation(event.target.value)} placeholder="Checkpoint / hub / route point" />
                  </CompactField>
                  {invoiceOrEwayUploaded && reassignmentVendorChanged ? (
                    <>
                      <CompactField label="New Invoice Upload">
                        <Input value={reassignmentInvoiceDocument} onChange={(event) => setReassignmentInvoiceDocument(event.target.value)} placeholder="Invoice document / reference" />
                      </CompactField>
                      <CompactField label="New E-Waybill Upload">
                        <Input value={reassignmentEwayBillDocument} onChange={(event) => setReassignmentEwayBillDocument(event.target.value)} placeholder="E-waybill document / reference" />
                      </CompactField>
                    </>
                  ) : (
                    <div className="rounded-2xl border border-dashed bg-muted/10 px-4 py-3 text-sm text-muted-foreground">
                      {invoiceOrEwayUploaded ? "Invoice / e-waybill are needed only if vendor changes after document upload." : "No invoice / e-waybill upload needed before document stage."}
                    </div>
                  )}
                  <div className="md:col-span-2">
                    <CompactField label="Operational Remark">
                      <Textarea value={reassignmentRemark} onChange={(event) => setReassignmentRemark(event.target.value)} className="min-h-[96px]" placeholder="Operational remark" />
                    </CompactField>
                  </div>
                </div>
              </div>
              <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
                LR remains linked. Customer freight does not change automatically.
              </div>
            </div>
          </div>
        </div>
      </Dialog>

      <Dialog
        open={breakdownActionOpen}
        onOpenChange={(open) => {
          if (!open) {
            resetBreakdownActionDialog();
          }
        }}
        title="Vehicle Breakdown Action"
        description="Choose the next operational action for this breakdown."
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={resetBreakdownActionDialog}>Close</Button>
            {breakdownActionType === "REPAIR" ? <Button onClick={startRepairWait}>Start Repair Wait</Button> : null}
            {breakdownActionType === "CONTINUE" ? <Button onClick={updateRepairAndContinue}>Continue Booking</Button> : null}
          </div>
        }
      >
        {activeBreakdownEvent ? (
          <div className="space-y-4">
            {breakdownActionType === "SELECT" ? (
              <div className="grid gap-3">
                <button type="button" className="rounded-2xl border border-slate-200 bg-white p-4 text-left" onClick={() => setBreakdownActionType("REPAIR")}>
                  <p className="text-sm font-semibold text-slate-950">Repair & Wait</p>
                  <p className="mt-1 text-xs text-slate-500">Use when the same vehicle may continue after repair.</p>
                </button>
                <button type="button" className="rounded-2xl border border-slate-200 bg-white p-4 text-left" onClick={() => setBreakdownActionType("REPLACE")}>
                  <p className="text-sm font-semibold text-slate-950">Replace Vehicle</p>
                  <p className="mt-1 text-xs text-slate-500">Use when the vehicle and driver need replacement.</p>
                </button>
              </div>
            ) : null}
            {breakdownActionType === "REPAIR" ? (
              <div className="grid gap-3 md:grid-cols-2">
                <CompactField label="Expected Repair Completion Time">
                  <Input type="datetime-local" value={breakdownExpectedRepairAt} onChange={(event) => setBreakdownExpectedRepairAt(event.target.value)} />
                </CompactField>
                <CompactField label="Current Location">
                  <Input value={repairCurrentLocation} onChange={(event) => setRepairCurrentLocation(event.target.value)} />
                </CompactField>
                <CompactField label="Responsible Person / Vendor">
                  <Input value={repairResponsiblePerson} onChange={(event) => setRepairResponsiblePerson(event.target.value)} placeholder="Optional" />
                </CompactField>
                <div className="md:col-span-2">
                  <CompactField label="Repair Note">
                    <Textarea value={repairNote} onChange={(event) => setRepairNote(event.target.value)} className="min-h-[88px]" />
                  </CompactField>
                </div>
              </div>
            ) : null}
            {breakdownActionType === "CONTINUE" ? (
              <div className="grid gap-3 md:grid-cols-2">
                <CompactField label="Actual Repair Completed Time">
                  <Input type="datetime-local" value={repairCompletionAt} onChange={(event) => setRepairCompletionAt(event.target.value)} />
                </CompactField>
                <CompactField label="Downtime Minutes (Optional)">
                  <Input value={repairDowntimeMinutes} onChange={(event) => setRepairDowntimeMinutes(event.target.value)} placeholder="Auto-calc if blank" />
                </CompactField>
                <div className="md:col-span-2">
                  <CompactField label="Repair Completion Remark">
                    <Textarea value={repairCompletionRemark} onChange={(event) => setRepairCompletionRemark(event.target.value)} className="min-h-[88px]" />
                  </CompactField>
                </div>
              </div>
            ) : null}
            {breakdownActionType === "REPLACE" ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                Replacement after breakdown uses the reassignment workflow and keeps assignment history. LR is not regenerated automatically.
                <div className="mt-3">
                  <Button onClick={initiateBreakdownReplacement}>Open Replacement</Button>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </Dialog>

      <Dialog
        open={vehicleReplacementOpen}
        onOpenChange={(open) => {
          if (!open) {
            resetVehicleReplacementDialog();
          }
        }}
        title="Vehicle Replacement"
        description={
          vehicleReplacementMode === "DIRECT"
            ? invoiceOrEwayUploaded
              ? "Invoice or e-waybill already uploaded. This action creates a controlled replacement request."
              : "Direct operational vehicle replacement before invoice and e-waybill upload."
            : vehicleReplacementMode === "VENDOR_ACTION"
              ? "Vendor replacement action for the current booking."
              : "Internal fallback replacement after vendor rejection."
        }
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={resetVehicleReplacementDialog}>Close</Button>
            <Button onClick={submitVehicleReplacement}>
              {vehicleReplacementMode === "DIRECT"
                ? invoiceOrEwayUploaded
                  ? "Send Replacement Request"
                  : "Replace Vehicle"
                : vehicleReplacementAction === "REJECT"
                  ? "Reject Request"
                  : vehicleReplacementMode === "INTERNAL_FALLBACK"
                    ? "Complete Internal Replacement"
                    : "Assign Replacement"}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          {vehicleReplacementError ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">{vehicleReplacementError}</div>
          ) : null}
          <div className="rounded-2xl border bg-white p-4">
            <p className="text-sm font-semibold text-slate-900">Current Assignment</p>
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              <DetailRow label="Current Vendor" value={assignedVendor?.name ?? bookingRecord.assignment?.vendorName ?? "Not assigned"} />
              <DetailRow label="Current Vehicle" value={assignedVehicle?.registrationNumber ?? bookingRecord.assignment?.vehicleLabel ?? "Not assigned"} />
              <DetailRow label="Current Driver" value={assignedDriver?.name ?? bookingRecord.assignment?.driverName ?? "Not assigned"} />
              <DetailRow label="Current Status" value={formatStatusLabel(bookingRecord.status)} />
            </div>
          </div>
          {vehicleReplacementMode === "DIRECT" ? (
            <>
              <div className="rounded-2xl border bg-white p-4">
                <p className="text-sm font-semibold text-slate-900">Replacement Setup</p>
                <div className="mt-3 grid gap-4 md:grid-cols-2">
                  <CompactField label="Replacement Type">
                    <Select value={vehicleReplacementType} onChange={(event) => setVehicleReplacementType(event.target.value as BookingVehicleReplacementInput["replacementType"])}>
                      <option value="VEHICLE_ONLY">Replace Vehicle only</option>
                      <option value="VENDOR_VEHICLE_DRIVER">Replace Vendor + Vehicle + Driver</option>
                      <option value="VENDOR_APP_REPLACEMENT">Vendor-driven replacement</option>
                    </Select>
                  </CompactField>
                  <CompactField label="Reason">
                    <Select value={vehicleReplacementReason} onChange={(event) => setVehicleReplacementReason(event.target.value as BookingVehicleReplacementReason)}>
                      {VEHICLE_REPLACEMENT_REASON_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </Select>
                  </CompactField>
                  <CompactField label="New Vehicle">
                    <Select value={vehicleReplacementVehicleId} onChange={(event) => setVehicleReplacementVehicleId(event.target.value)}>
                      <option value="">Select vehicle</option>
                      {availableReplacementVehicles.map((vehicle) => (
                        <option key={vehicle.id} value={vehicle.id}>
                          {vehicle.registrationNumber} | {(vehicle.vendorId ? vendorMap.get(vehicle.vendorId)?.name : "Own Fleet") ?? "Own Fleet"}
                        </option>
                      ))}
                    </Select>
                  </CompactField>
                  <CompactField label="New Driver">
                    <Select value={vehicleReplacementDriverId} onChange={(event) => setVehicleReplacementDriverId(event.target.value)}>
                      <option value="">Select driver</option>
                      {availableReplacementDrivers.map((driver) => (
                        <option key={driver.id} value={driver.id}>
                          {driver.name} | {driver.phone}
                        </option>
                      ))}
                    </Select>
                  </CompactField>
                  <CompactField label="Effective Time">
                    <Input type="datetime-local" value={vehicleReplacementEffectiveAt} onChange={(event) => setVehicleReplacementEffectiveAt(event.target.value)} />
                  </CompactField>
                  <CompactField label="Location">
                    <Input value={vehicleReplacementLocation} onChange={(event) => setVehicleReplacementLocation(event.target.value)} placeholder="Checkpoint / yard / route point" />
                  </CompactField>
                  <div className="md:col-span-2">
                    <CompactField label="Remark">
                      <Textarea value={vehicleReplacementRemark} onChange={(event) => setVehicleReplacementRemark(event.target.value)} className="min-h-[88px]" placeholder="Operational replacement remark" />
                    </CompactField>
                  </div>
                </div>
              </div>
              {invoiceOrEwayUploaded ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  Invoice or e-waybill already uploaded. This will create a vendor/internal replacement request first.
                </div>
              ) : null}
            </>
          ) : (
            <div className="rounded-2xl border bg-white p-4">
              <div className="grid gap-4 md:grid-cols-2">
                {vehicleReplacementMode === "VENDOR_ACTION" ? (
                  <CompactField label="Vendor Action">
                    <Select value={vehicleReplacementAction} onChange={(event) => setVehicleReplacementAction(event.target.value as "ASSIGN_REPLACEMENT" | "REJECT")}>
                      <option value="ASSIGN_REPLACEMENT">Assign Replacement Vehicle</option>
                      <option value="REJECT">Reject Request</option>
                    </Select>
                  </CompactField>
                ) : null}
                {vehicleReplacementAction !== "REJECT" ? (
                  <>
                    <CompactField label="New Vehicle">
                      <Select value={vehicleReplacementVehicleId} onChange={(event) => setVehicleReplacementVehicleId(event.target.value)}>
                        <option value="">Select vehicle</option>
                        {availableReplacementVehicles.map((vehicle) => (
                          <option key={vehicle.id} value={vehicle.id}>
                            {vehicle.registrationNumber} | {(vehicle.vendorId ? vendorMap.get(vehicle.vendorId)?.name : "Own Fleet") ?? "Own Fleet"}
                          </option>
                        ))}
                      </Select>
                    </CompactField>
                    <CompactField label="New Driver">
                      <Select value={vehicleReplacementDriverId} onChange={(event) => setVehicleReplacementDriverId(event.target.value)}>
                        <option value="">Select driver</option>
                        {availableReplacementDrivers.map((driver) => (
                          <option key={driver.id} value={driver.id}>{driver.name} | {driver.phone}</option>
                        ))}
                      </Select>
                    </CompactField>
                  </>
                ) : (
                  <CompactField label="Rejection Reason">
                    <Input value={vehicleReplacementRejectionReason} onChange={(event) => setVehicleReplacementRejectionReason(event.target.value)} placeholder="Why replacement is rejected" />
                  </CompactField>
                )}
                {vehicleReplacementMode === "INTERNAL_FALLBACK" ? (
                  <>
                    <CompactField label="New Invoice Document">
                      <Input value={vehicleReplacementInvoiceDocument} onChange={(event) => setVehicleReplacementInvoiceDocument(event.target.value)} placeholder="Invoice file / number" />
                    </CompactField>
                    <CompactField label="New E-Waybill Document">
                      <Input value={vehicleReplacementEwayDocument} onChange={(event) => setVehicleReplacementEwayDocument(event.target.value)} placeholder="E-Waybill file / number" />
                    </CompactField>
                    <CompactField label="New Vendor Rate">
                      <Input type="number" value={vehicleReplacementVendorRate} onChange={(event) => setVehicleReplacementVendorRate(event.target.value)} placeholder="Vendor rate" />
                    </CompactField>
                  </>
                ) : null}
                <CompactField label={vehicleReplacementMode === "VENDOR_ACTION" ? "Vendor Remark" : "Remark"}>
                  <Textarea
                    value={vehicleReplacementMode === "VENDOR_ACTION" ? vehicleReplacementVendorRemark : vehicleReplacementRemark}
                    onChange={(event) =>
                      vehicleReplacementMode === "VENDOR_ACTION"
                        ? setVehicleReplacementVendorRemark(event.target.value)
                        : setVehicleReplacementRemark(event.target.value)
                    }
                    className="min-h-[88px]"
                    placeholder="Operational remark"
                  />
                </CompactField>
              </div>
            </div>
          )}
        </div>
      </Dialog>

        <Dialog
          open={cancelDialogOpen}
          onOpenChange={(open) => {
            if (!open) {
              resetCancellationDialog();
            }
          }}
          title="Cancel Booking"
          description="Cancellation is allowed only before loading starts."
          footer={
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={resetCancellationDialog}>Close</Button>
              <Button onClick={submitCancellation} disabled={!cancellationReason.trim() || loadingStarted}>
                Confirm Cancel
              </Button>
            </div>
          }
        >
          <div className="grid gap-3">
            <CompactField label="Booking">
              <Input value={bookingRecord.bookingId} disabled />
            </CompactField>
            <CompactField label="Reason">
              <Textarea
                value={cancellationReason}
                onChange={(event) => setCancellationReason(event.target.value)}
                className="min-h-[110px]"
                placeholder="Enter cancellation reason"
              />
            </CompactField>
          </div>
        </Dialog>

        <Dialog
          open={Boolean(remarkDeliveryId) && !destinationReviewOpen}
          onOpenChange={(open) => {
            if (!open) {
            resetRemarkDialog();
          }
        }}
        title={remarkType === "DESTINATION_CHANGED" ? `Raise Destination Change${selectedRemarkDelivery ? ` | Delivery ${selectedRemarkDelivery.deliveryNo}` : ""}` : `Add Remark${selectedRemarkDelivery ? ` | Delivery ${selectedRemarkDelivery.deliveryNo}` : ""}`}
        description={remarkType === "DESTINATION_CHANGED" ? "Operational trigger only. Address updates happen later in customer address master, and delivery revision happens in a separate review workspace." : "Structured delivery remark linked to booking and delivery."}
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={resetRemarkDialog}>Cancel</Button>
            {remarkType === "DESTINATION_CHANGED" ? (
              <Button
                onClick={submitDestinationChangeRequest}
                disabled={!remarkDeliveryId || !destinationChangeReason.trim() || !canRaiseDestinationChange}
              >
                Submit Request
              </Button>
            ) : (
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
            )}
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
          {remarkType === "DESTINATION_CHANGED" ? (
            <div className="grid gap-3">
              <CompactField label="Reason">
                <Textarea value={destinationChangeReason} onChange={(event) => setDestinationChangeReason(event.target.value)} className="min-h-[84px]" placeholder="Reason for operational destination change" />
              </CompactField>
              <CompactField label="Priority">
                <Select value={destinationChangePriority} onChange={(event) => setDestinationChangePriority(event.target.value as BookingDestinationChangeRequest["priority"])}>
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="CRITICAL">Critical</option>
                </Select>
              </CompactField>
              <CompactField label="Notes">
                <Textarea value={remarkText} onChange={(event) => setRemarkText(event.target.value)} className="min-h-[96px]" placeholder="Operational notes only. Address update happens later in customer address master." />
              </CompactField>
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                Next step after submission: open Customer Address Master, add the new additional or emergency address for the same consignee, then return here for destination change review.
              </div>
            </div>
          ) : null}
          {remarkType !== "DESTINATION_CHANGED" && requiresConsigneeDestination ? (
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
          {remarkType !== "DESTINATION_CHANGED" && requiresLocation ? (
            <CompactField label="Location">
              <Input value={remarkLocation} onChange={(event) => setRemarkLocation(event.target.value)} placeholder="Enter location" />
            </CompactField>
          ) : null}
          {remarkType === "VEHICLE_BREAKDOWN" ? (
            <div className="grid gap-3 md:grid-cols-2">
              <CompactField label="Breakdown Time">
                <Input type="datetime-local" value={breakdownReportedAt} onChange={(event) => setBreakdownReportedAt(event.target.value)} />
              </CompactField>
              <CompactField label="Expected Repair Time (Optional)">
                <Input type="datetime-local" value={breakdownExpectedRepairAt} onChange={(event) => setBreakdownExpectedRepairAt(event.target.value)} />
              </CompactField>
              <CompactField label="Reported By">
                <Input value={session.actorName || "Ops"} disabled />
              </CompactField>
              <CompactField label="Photo / Evidence (Optional)">
                <Input value={breakdownEvidence} onChange={(event) => setBreakdownEvidence(event.target.value)} placeholder="Photo / evidence placeholder" />
              </CompactField>
            </div>
          ) : null}
          {remarkType !== "DESTINATION_CHANGED" ? (
          <CompactField label={remarkType === "VEHICLE_BREAKDOWN" ? "Issue Description" : requiresRemark || requiresConsigneeDestination ? "Remark" : "Remark (Optional)"}>
            <Textarea value={remarkText} onChange={(event) => setRemarkText(event.target.value)} className="min-h-[96px]" placeholder={remarkType === "VEHICLE_BREAKDOWN" ? "Describe the breakdown issue" : "Enter remark"} />
          </CompactField>
          ) : null}
        </div>
      </Dialog>

      <Dialog
        open={destinationReviewOpen}
        onOpenChange={(open) => {
          setDestinationReviewOpen(open);
          if (!open) {
            setDestinationChangeRequestId(null);
          }
        }}
        title={selectedDestinationChangeRequest ? `Destination Change Review | Delivery ${selectedDestinationChangeDelivery?.deliveryNo ?? "-"}` : "Destination Change Review"}
        description="Existing delivery remains read-only. Customer address master drives revised address selection, and delivery revision is created only after review."
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setDestinationReviewOpen(false)}>Close</Button>
            {selectedDestinationChangeRequest?.status === "SUBMITTED" || selectedDestinationChangeRequest?.status === "UNDER_REVIEW" ? (
              <>
                <Button variant="outline" onClick={() => updateDestinationChangeStatus("UNDER_REVIEW")} disabled={!canApproveDestinationChange}>
                  Request Clarification
                </Button>
                <Button variant="outline" onClick={() => updateDestinationChangeStatus("REJECTED")} disabled={!canApproveDestinationChange}>
                  Reject Change
                </Button>
                <Button onClick={() => updateDestinationChangeStatus("APPROVED")} disabled={!canApproveDestinationChange || !remarkDestination}>
                  Approve Change
                </Button>
              </>
            ) : null}
            {selectedDestinationChangeRequest?.status === "APPROVED" ? (
              <Button onClick={implementDestinationChange} disabled={!remarkDestination}>
                Create Delivery Revision
              </Button>
            ) : null}
          </div>
        }
      >
        <div className="grid gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <span>{selectedDestinationChangeRequest?.status === "APPROVED" ? "Approved request. Finalize revised delivery from customer address master." : "Raise issue first, update customer address master separately, then review revised delivery here."}</span>
            <Button asChild size="sm" variant="outline">
              <Link to={`/tenant/${tenant.id}/customers/${bookingRecord.customerId}`}>Customer Address Master</Link>
            </Button>
          </div>
          <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
            <div className="rounded-2xl border border-slate-200 bg-slate-50/90 p-4">
              <p className="text-sm font-semibold text-slate-900">Old Delivery</p>
              <p className="mt-1 text-xs text-slate-500">This remains unchanged until revision is submitted.</p>
              {destinationChangePreview ? (
                <div className="mt-3 grid gap-2 md:grid-cols-2">
                  <DetailRow label="Existing Consignee" value={destinationChangePreview.previousSnapshot.consigneeName || matchedCustomerMasterAddress?.consigneeName || "-"} />
                  <DetailRow label="Existing Address" value={destinationChangePreview.previousSnapshot.addressLabel} />
                  <DetailRow label="Route" value={destinationChangePreview.previousSnapshot.route} />
                  <DetailRow label="Freight" value={formatCurrency(destinationChangePreview.previousSnapshot.freight)} />
                  <DetailRow label="ETA" value={destinationChangePreview.previousSnapshot.eta ?? "N/A"} />
                  <DetailRow label="Current LR" value={destinationChangePreview.previousSnapshot.lrNumber ?? "Retain current LR"} />
                  <DetailRow label="Sequence" value={String(destinationChangePreview.previousSnapshot.sequence)} />
                  <DetailRow label="Delivery Status" value={selectedDestinationChangeDelivery?.status ?? "-"} />
                  <DetailRow label="Distance" value={`${destinationChangePreview.previousSnapshot.distanceKm ?? 0} km`} />
                  <DetailRow label="Trip Impact" value={destinationChangePreview.previousSnapshot.tripImpact} />
                </div>
              ) : (
                <p className="mt-3 text-sm text-slate-500">Open a submitted destination change request first.</p>
              )}
            </div>
            <div className="rounded-2xl border border-cyan-200 bg-cyan-50/70 p-4">
              <p className="text-sm font-semibold text-slate-900">Revised To</p>
              <p className="mt-1 text-xs text-slate-500">Choose the temporary address already added under the same consignee.</p>
              <div className="mt-3 grid gap-3">
                <CompactField label="Temporary Address For Same Consignee">
                  <Select value={remarkDestination} onChange={(event) => setRemarkDestination(event.target.value)}>
                    <option value="">Select primary / additional / emergency address</option>
                    {destinationChangeAddressOptions.map((address) => (
                      <option key={address.id} value={address.id}>
                        {address.addressName} | {address.operationalAddressType ?? "PRIMARY"}{address.isTemporary ? " | TEMPORARY" : ""} | {address.city}
                      </option>
                    ))}
                  </Select>
                </CompactField>
                <CompactField label="Review Note">
                  <Textarea value={requestReviewNote} onChange={(event) => setRequestReviewNote(event.target.value)} className="min-h-[72px]" placeholder="Approval, rejection, or clarification note" />
                </CompactField>
                {destinationChangePreview ? (
                  <div className="grid gap-3">
                    <div className="rounded-2xl border border-cyan-200 bg-white/80 px-4 py-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-cyan-700">Revised Address</p>
                      <p className="mt-2 text-sm font-medium text-slate-900">{destinationChangePreview.proposedSnapshot.addressLabel}</p>
                      <p className="mt-2 text-xs text-slate-500">
                        {destinationChangeAddressOptions.find((address) => address.id === remarkDestination)?.isTemporary ? "Temporary address selected for same consignee." : "Customer master address selected for same consignee."}
                      </p>
                    </div>
                    <div className="grid gap-2 md:grid-cols-2">
                      <DetailRow label="Revised Freight" value={formatCurrency(destinationChangePreview.proposedSnapshot.freight)} tone="emerald" />
                      <DetailRow label="Trip Impact" value={destinationChangePreview.impact.tripImpactSummary} tone="amber" />
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </Dialog>

      {bookingRecord.status === "PENDING_ASSIGNMENT" && access.can("BOOKING_DETAIL", "ASSIGN_VEHICLE") ? (
      <section className="overflow-hidden rounded-xl border border-slate-300 border-l-[3px] border-l-primary/70 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-gradient-to-r from-primary/[0.09] to-transparent px-4 py-2.5">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">A</span>
            <span className="text-[15px] font-semibold text-slate-900">Assign Vehicle</span>
            <span className="text-[11px] text-slate-500">{getAssignmentModeLabel(tenant.assignmentMode)} · {getCommercialModeLabel(tenant.commercialMode)}</span>
          </div>
          {showAssignmentFields ? (
            <Button
              size="sm"
              onClick={submitAssignment}
              disabled={
                !vendorId ||
                !vehicleId ||
                !driverId ||
                Number(vendorFreight) <= 0 ||
                  (selectedLrMode !== "AUTO" && !preferredLrNumber) ||
                  (assignMethod === "MANUAL" && !isSpotBooking && !manualReason.trim()) ||
                  !activeLrOrgUnitId
                }
            >
              Assign Vehicle
            </Button>
          ) : null}
        </div>
        <div className="px-4 py-3.5">
        <div className="space-y-3">
          {/* Assignment method — Contract Vendor (recommendation engine) is default; SPOT is manual-only. */}
          {!isSpotBooking ? (
            <div className="rounded-xl border border-slate-200 bg-white p-3">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Assignment Method</p>
              <div className="flex flex-wrap gap-4 text-sm">
                <label className="flex cursor-pointer items-center gap-2">
                  <input type="radio" name="assignMethodDetail" checked={assignMethod === "CONTRACT"} onChange={() => { setAssignMethod("CONTRACT"); setVendorId(""); setVehicleId(""); setDriverId(""); setVendorFreight(""); }} />
                  Contract Vendor
                </label>
                <label className="flex cursor-pointer items-center gap-2">
                  <input type="radio" name="assignMethodDetail" checked={assignMethod === "MANUAL"} onChange={() => { setAssignMethod("MANUAL"); setVendorId(""); setVehicleId(""); setDriverId(""); setVendorFreight(""); }} />
                  Manual Assignment
                </label>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
              Spot booking — send the indent to the spot-contract vendor (if any), or assign manually below.
            </div>
          )}

          {/* CONTRACT mode is staged by indent: recommend → send → pending → accepted.
              SPOT bookings reuse the same indent stage (spot-contract vendor recommendation). */}
          {assignMethod === "CONTRACT" || isSpotBooking ? (
            winnerIndent ? (
              <div className="rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                <span className="font-semibold">{winnerIndent.vendorName}</span> accepted the indent
                {winnerIndentBuyingRate != null ? <> · Buying Rate Rs {Math.round(winnerIndentBuyingRate).toLocaleString()}</> : null}. Assign vehicle &amp; driver below.
              </div>
            ) : pendingIndent ? (
              <div className="rounded-xl border border-amber-300 bg-amber-50 p-4">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-amber-800">Selected Vendor</p>
                    <p className="mt-0.5 text-sm font-semibold text-amber-950">{pendingIndent.vendorName}</p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-amber-800">Buying Rate</p>
                    <p className="mt-0.5 text-sm font-semibold text-amber-950">{pendingIndentBuyingRate != null ? `Rs ${Math.round(pendingIndentBuyingRate).toLocaleString()}` : "-"}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-[11px] uppercase tracking-wide text-amber-800">Status</p>
                    <p className="mt-0.5 text-sm font-semibold text-amber-950">Indent Sent · Waiting for Vendor Response</p>
                  </div>
                </div>
                <div className="mt-3">
                  <Button size="sm" variant="outline" onClick={cancelPendingIndent}>Cancel Indent</Button>
                </div>
              </div>
            ) : isSpotBooking ? (
              // Spot: recommend the one-time spot-contract vendor(s) for the lane;
              // send the indent to that vendor, else broadcast to all / assign manually.
              <div className="space-y-2">
                {spotContractMatches.length ? (
                  <>
                    <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                      Spot auction contract available on this lane — send the indent to the contract vendor
                    </p>
                    <div className="overflow-hidden rounded-xl border">
                      {spotContractMatches.map((match) => (
                        <div key={match.contractId} className="flex flex-wrap items-center justify-between gap-2 border-b border-border/70 px-3 py-2 text-sm last:border-b-0">
                          <div>
                            <span className="font-semibold">{match.vendorName}</span>
                            <span className="ml-2 inline-flex rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">Spot · one-time</span>
                            <span className="ml-2 text-xs text-muted-foreground">Rs {match.rate.toLocaleString()} · {match.contractId}</span>
                          </div>
                          <Button
                            size="sm"
                            disabled={rejectedIndentVendorIds.includes(match.vendorId)}
                            onClick={() => sendSpotIndent(match.vendorId, match.rate)}
                          >
                            {rejectedIndentVendorIds.includes(match.vendorId) ? "Rejected" : "Send Indent"}
                          </Button>
                        </div>
                      ))}
                    </div>
                    <p className="text-[11px] text-muted-foreground">Or assign manually below.</p>
                  </>
                ) : (
                  <div className="space-y-2">
                    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                      No spot auction contract for this lane. Send the indent to all vendors, or assign manually below.
                    </div>
                    <Button size="sm" variant="outline" onClick={() => sendSpotIndent(null, null)}>
                      Send Indent to all vendors
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {/* All matching contracts on the lane are shown, cheapest-first.
                    L1 = lowest-rate contract(s) (ties included) — sent with one
                    click. A higher-rate vendor opens a remark modal first. */}
                <VendorContractComparison
                  entries={vendorComparison}
                  selectedRateCardId={null}
                  recommendedRateCardIds={l1RateCardIds}
                  enableRemark
                  onSelect={(targetVendorId, _rateCardId, remark) => {
                    // L1 vendors send with one click (remark optional); higher-rate
                    // vendors are gated by the inline remark inside the comparison.
                    sendIndentToVendor(targetVendorId, remark);
                  }}
                  actionLabel="Send Indent"
                  mutedVendorIds={rejectedIndentVendorIds}
                  showMargin={access.can("BOOKING_DETAIL", "VIEW_MARGIN")}
                  showCustomerFreight={false}
                  header={{
                    route: `${assignSourceAddress?.city ?? "-"} → ${assignDestinationAddress?.city ?? "-"}`,
                    customerFreight,
                    vehicleType: assignVehicleTypeCode ?? "-",
                    material: assignMaterialCode ?? "-",
                  }}
                />
                {vendorComparison.length ? (
                  <p className="text-[11px] text-muted-foreground">
                    {l1Entries.length > 1
                      ? `${l1Entries.length} vendors tie at the lowest rate (L1) — send the indent to any of them with one click. `
                      : "The lowest-rate (L1) contract is the default — one click to send. "}
                    Choosing a higher-rate vendor needs a remark.
                  </p>
                ) : null}
              </div>
            )
          ) : null}


          {showAssignmentFields ? (
          <>
          {/* Two-column: Assignment Details (left) | Commercial & LR (right) */}
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
              <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Assignment Details</p>
              <div className="space-y-2.5">
                <CompactField label="Vendor">
                  {manualVendorSelection ? (
                    <Select value={vendorId} onChange={(event) => { setVendorId(event.target.value); setVehicleId(""); setDriverId(""); }}>
                      <option value="">Select vendor</option>
                      <option value={OWN_FLEET_VENDOR}>Own Fleet</option>
                      {adminSources.vendors.filter((vendor) => vendor.status === "active").map((vendor) => (
                        <option key={vendor.id} value={vendor.id}>{vendor.name}</option>
                      ))}
                    </Select>
                  ) : (
                    <Input value={vendorMap.get(vendorId)?.name ?? "Contract vendor"} disabled />
                  )}
                </CompactField>
                {assignMethod === "MANUAL" && !isSpotBooking ? (
                  <CompactField label="Reason for manual assignment *">
                    <textarea
                      value={manualReason}
                      onChange={(event) => setManualReason(event.target.value)}
                      rows={2}
                      placeholder="Why are you not using the recommended L1 / lowest-rate contract?"
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-primary"
                    />
                  </CompactField>
                ) : null}
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
                <CompactField label="Active Place">
                  <Select
                    value={activeLrOrgUnitId}
                    onChange={(event) =>
                      setSession({
                        ...session,
                        tenantId: tenant.id,
                        activeTenantOrgUnitId: event.target.value || null,
                      })
                    }
                  >
                    <option value="">{availableLrOrgUnits.length > 1 ? "Select active LR place" : activeLrOrgUnit?.name ?? "No place"}</option>
                    {availableLrOrgUnits.map((orgUnit) => (
                      <option key={orgUnit.id} value={orgUnit.id}>
                        {orgUnit.name}
                      </option>
                    ))}
                  </Select>
                </CompactField>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
              <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Commercial &amp; LR</p>
              <div className="space-y-2.5">
                <CompactField label="Customer Freight / Selling Rate">
                  <Input value={customerFreight.toLocaleString()} disabled />
                </CompactField>
                <CompactField label="Vendor Freight / Buying Rate">
                  <Input value={vendorFreight} onChange={(event) => setVendorFreight(event.target.value)} />
                </CompactField>
                {access.can("BOOKING_DETAIL", "VIEW_MARGIN") ? (
                  <div className="grid grid-cols-2 gap-2.5">
                    <CompactField label="Margin Amount">
                      <Input value={Number.isFinite(marginAmount) ? String(marginAmount) : ""} disabled />
                    </CompactField>
                    <CompactField label="Margin %">
                      <Input value={Number.isFinite(marginPercent) ? String(marginPercent) : ""} disabled />
                    </CompactField>
                  </div>
                ) : null}
                {vendorRateWarning ? (
                  <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                    {vendorRateWarning}
                  </div>
                ) : null}
                {!vendorRateWarning && buyingRateLabel ? (
                  <div className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
                    Vendor contract applied: {buyingRateLabel}
                  </div>
                ) : null}
                <CompactField label="LR Mode">
                  <Select value={selectedLrMode} onChange={(event) => setSelectedLrMode(event.target.value as "MANUAL" | "PRE_GENERATED" | "AUTO")}>
                    {canUseManualLr ? <option value="MANUAL">Manual LR</option> : null}
                    {canUseManualLr ? <option value="PRE_GENERATED">Pre-generated / Customer LR</option> : null}
                    {canUseAutoLr ? <option value="AUTO">Auto LR</option> : null}
                  </Select>
                </CompactField>
                {selectedLrMode !== "AUTO" ? (
                  <>
                    <CompactField label="Manual LR Selection">
                      <Select value={preferredLrNumber} onChange={(event) => setPreferredLrNumber(event.target.value)}>
                        <option value="">
                          {requiresActiveLrScope ? "Select active place first" : "Select LR number"}
                        </option>
                        {availableManualPools.map((pool) => (
                          <option key={pool.id} value={pool.lrNumber}>
                            {pool.lrNumber}{(pool.poolType ?? (pool.customerId ? "CUSTOMER_RESERVED" : "GENERAL")) === "CUSTOMER_RESERVED" ? " • Reserved" : " • General"}
                          </option>
                        ))}
                      </Select>
                    </CompactField>
                    {requiresActiveLrScope ? (
                      <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                        ⚠ Select active place to view LR numbers.
                      </div>
                    ) : availableManualPools.length > 0 ? (
                      <p className="px-1 text-[11px] text-gray-500">
                        Available LR at <span className="font-medium text-gray-700">{activeLrOrgUnit?.name ?? "place"}</span>: <span className="font-medium text-gray-700">{availableManualPools.length}</span>
                      </p>
                    ) : null}
                  </>
                ) : (
                  <div className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-900">
                    Auto LR will be generated during assignment for <span className="font-medium">{activeLrOrgUnit?.name ?? "the active place"}</span>.
                  </div>
                )}
                {selectedLrMode !== "AUTO" && !selectedLrConfig ? (
                  <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                    Manual LR configuration is missing. Configure LR before assignment.
                  </div>
                ) : null}
                {selectedLrMode === "AUTO" && !selectedAutoLrConfig ? (
                  <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                    Auto LR configuration is missing. Configure Auto LR before assignment.
                  </div>
                ) : null}
                {selectedLrMode !== "AUTO" && selectedLrConfig && !requiresActiveLrScope && availableManualPools.length === 0 ? (
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                    <span>⚠ No LR available for selected place.</span>
                    <Button asChild size="sm" variant="outline">
                      <Link to={`/tenant/${tenant.id}/lr`}>Open LR Workspace</Link>
                    </Button>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
          </>
          ) : null}
        </div>
        </div>
      </section>
      ) : null}

      {/* Deliveries detail modal — read-only, no action buttons */}
      <Dialog
        open={deliveryModalOpen}
        onOpenChange={setDeliveryModalOpen}
        title={`Deliveries (${(bookingRecord.deliveries ?? []).length})`}
        description={`${bookingRecord.bookingId} · ${customer?.name ?? "-"} · read-only`}
        footer={<div className="flex justify-end"><Button variant="outline" onClick={() => setDeliveryModalOpen(false)}>Close</Button></div>}
      >
        <DeliveryDetailCards
          deliveries={bookingRecord.deliveries ?? []}
          isErp={bookingRecord.bookingSource === "ERP"}
          addressMap={addressMap}
          materialMap={materialMap}
          shipmentDocuments={shipmentDocuments}
          calculatedFreight={bookingRecord.pricing.calculatedFreight}
          pickupDate={bookingRecord.pickupDate}
          pickupTime={bookingRecord.pickupTime}
        />
      </Dialog>
    </div>
  );
}

// ─── Compact Delivery Chip Row — lives in the header summary area ─────────────

function DeliveryChipRow({
  deliveries,
  isErp,
  addressMap,
  materialMap,
  onViewAll,
}: {
  deliveries: import("@/modules/tms/booking/types").BookingDeliveryRecord[];
  isErp: boolean;
  addressMap: Map<string, import("@/types/customer").TenantCustomerAddress>;
  materialMap: Map<string, { materialCode: string; name?: string }>;
  onViewAll: () => void;
}) {
  if (deliveries.length === 0) return null;

  const MAX_CHIPS = 3;
  const visibleChips = deliveries.slice(0, MAX_CHIPS);
  const overflow = deliveries.length - MAX_CHIPS;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mr-1">
        {deliveries.length === 1 ? "Delivery" : `Deliveries (${deliveries.length})`}
      </span>
      {visibleChips.map((delivery) => {
        const origin = addressMap.get(delivery.originAddressId);
        const dest = addressMap.get(delivery.destinationAddressId ?? "");
        const originCity = origin?.city ?? delivery.originCity ?? "—";
        const destCity = dest?.city ?? delivery.destinationCity ?? "—";
        const mat = delivery.materialId ? materialMap.get(delivery.materialId) : null;
        const matCode = mat?.materialCode ?? mat?.name ?? null;
        const soLabel = isErp && delivery.trackingId && !delivery.trackingId.startsWith("TRK-")
          ? delivery.trackingId
          : null;

        return (
          <button
            key={delivery.id}
            type="button"
            onClick={onViewAll}
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
          >
            <span className="font-bold text-slate-900">D{delivery.deliveryNo}</span>
            {soLabel ? <span className="font-semibold text-violet-700">{soLabel}</span> : null}
            <span className="text-slate-500">{originCity}→{destCity}</span>
            {matCode ? <span className="text-slate-500">{matCode}</span> : null}
            {delivery.weight ? <span className="font-medium text-slate-700">{delivery.weight}{delivery.weightUom ?? "MT"}</span> : null}
          </button>
        );
      })}
      {overflow > 0 ? (
        <button
          type="button"
          onClick={onViewAll}
          className="inline-flex items-center rounded-full border border-dashed border-slate-300 bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-500 hover:border-slate-400 hover:text-slate-700"
        >
          +{overflow} more
        </button>
      ) : null}
      <button
        type="button"
        onClick={onViewAll}
        className="text-[11px] font-semibold text-sky-600 hover:underline ml-1"
      >
        View All →
      </button>
    </div>
  );
}

// ─── Delivery Detail Cards (inside modal) — read-only, mirrors delivery workspace ──

function DeliveryDetailCards({
  deliveries,
  isErp,
  addressMap,
  materialMap,
  shipmentDocuments,
  calculatedFreight,
  pickupDate,
  pickupTime,
}: {
  deliveries: import("@/modules/tms/booking/types").BookingDeliveryRecord[];
  isErp: boolean;
  addressMap: Map<string, import("@/types/customer").TenantCustomerAddress>;
  materialMap: Map<string, { materialCode: string; name?: string }>;
  shipmentDocuments: import("@/modules/tms/booking/types").BookingShipmentDocuments;
  calculatedFreight: number;
  pickupDate?: string | null;
  pickupTime?: string | null;
}) {
  if (deliveries.length === 0) return <p className="text-sm text-slate-500">No deliveries.</p>;

  return (
    <div className="space-y-3 max-h-[65vh] overflow-y-auto pr-1">
      {deliveries.map((delivery) => {
        const origin = addressMap.get(delivery.originAddressId);
        const dest = delivery.destinationAddressId ? addressMap.get(delivery.destinationAddressId) : null;
        const mat = delivery.materialId ? materialMap.get(delivery.materialId) : null;
        const deliveryDocs = shipmentDocuments.deliveries.find((d) => d.deliveryId === delivery.id);
        const freight = deliveryDocs?.freightRate ?? shipmentDocuments.totalFreightRate ?? calculatedFreight;
        const invoices = deliveryDocs?.invoices ?? [];
        const consigneeName =
          dest?.consigneeName?.trim() ||
          invoices[0]?.consigneeName?.trim() ||
          dest?.addressName?.trim() ||
          delivery.destinationCity ||
          "—";
        const consigneeAddr =
          dest?.fullAddress ||
          [dest?.addressLine1, dest?.addressLine2, dest?.city, dest?.state, dest?.pincode].filter(Boolean).join(", ") ||
          delivery.destinationCity || "—";
        const soLabel = isErp && delivery.trackingId && !delivery.trackingId.startsWith("TRK-")
          ? delivery.trackingId : null;
        const invoiceFileNames = invoices.map((inv) => inv.fileName).filter(Boolean);

        return (
          <div key={delivery.id} className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            {/* Delivery header */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50 px-4 py-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[14px] font-semibold text-slate-900">Delivery {delivery.deliveryNo}</span>
                <span className="text-slate-300">•</span>
                <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                  delivery.status === "COMPLETED" ? "bg-emerald-100 text-emerald-700" :
                  delivery.status === "IN_TRANSIT" ? "bg-sky-100 text-sky-700" :
                  "bg-slate-100 text-slate-600"
                }`}>
                  {delivery.status.replace(/_/g, " ")}
                </span>
                {soLabel ? (
                  <span className="rounded bg-violet-100 px-2 py-0.5 text-[10px] font-semibold text-violet-700">{soLabel}</span>
                ) : (
                  delivery.trackingId ? <span className="text-[11px] text-slate-400">{delivery.trackingId}</span> : null
                )}
              </div>
              {freight > 0 ? (
                <div className="text-right">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Delivery Freight</p>
                  <p className="text-[15px] font-bold text-slate-900">₹{Math.round(freight).toLocaleString()}</p>
                </div>
              ) : null}
            </div>

            {/* Detail grid */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-3 px-4 py-3 sm:grid-cols-3">
              <DRow label="Origin" value={origin?.addressName ?? origin?.city ?? delivery.originCity ?? "—"} />
              <DRow label="Destination" value={dest?.addressName ?? dest?.city ?? delivery.destinationCity ?? "—"} />
              <DRow label="Consignee Name" value={consigneeName} />
              {consigneeAddr !== consigneeName ? (
                <div className="col-span-2 sm:col-span-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Consignee Full Address</p>
                  <p className="mt-0.5 text-[12px] text-slate-700 leading-relaxed">{consigneeAddr}</p>
                </div>
              ) : null}
              <DRow label="Material" value={mat?.materialCode ?? mat?.name ?? "—"} />
              <DRow label="Quantity" value={delivery.quantity ? `${delivery.quantity} ${delivery.uom ?? ""}`.trim() : "—"} />
              <DRow label="Weight" value={delivery.weight ? `${delivery.weight} ${delivery.weightUom ?? "MT"}`.trim() : "—"} />
              {pickupDate ? (
                <DRow label="Pickup Date & Time" value={pickupTime ? `${pickupDate} ${pickupTime}` : pickupDate} />
              ) : null}
              {delivery.distanceKm != null ? (
                <DRow label="Approx Trip Distance" value={`${delivery.distanceKm.toFixed(2)} km`} />
              ) : null}
              {delivery.unloadingNotes ? (
                <div className="col-span-2 sm:col-span-3">
                  <DRow label="Notes" value={delivery.unloadingNotes} />
                </div>
              ) : null}
              {delivery.lrNumber ? <DRow label="LR Number" value={delivery.lrNumber} /> : null}
              {delivery.eta ? <DRow label="ETA" value={delivery.eta} /> : null}
            </div>

            {/* Trip documents */}
            {invoiceFileNames.length > 0 ? (
              <div className="border-t border-slate-100 px-4 py-2.5">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-1">Trip Documents</p>
                <div className="flex flex-wrap gap-1.5">
                  {invoiceFileNames.map((fileName, i) => (
                    <span key={i} className="inline-flex rounded bg-slate-100 px-2 py-0.5 text-[11px] text-slate-700">{fileName}</span>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function DRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-0.5 text-[12px] font-medium text-slate-800">{value}</p>
    </div>
  );
}

function DetailRow({
  label,
  value,
  tone = "slate",
}: {
  label: string;
  value: string;
  tone?: "slate" | "blue" | "emerald" | "amber" | "violet";
}) {
  const toneClass =
    tone === "blue"
      ? "border-sky-200/80 bg-sky-50/85"
      : tone === "emerald"
        ? "border-emerald-200/80 bg-emerald-50/85"
        : tone === "amber"
          ? "border-amber-200/80 bg-amber-50/85"
          : tone === "violet"
            ? "border-violet-200/80 bg-violet-50/85"
            : "border-border/55 bg-white/75";
  return (
    <div className={`rounded-lg border px-2.5 py-2 ${toneClass}`}>
      <p className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm font-medium leading-5">{value}</p>
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

function MiniStat({ label, value, inverse = false }: { label: string; value: string; inverse?: boolean }) {
  return (
    <div className={`rounded-2xl border px-4 py-3 shadow-sm ${inverse ? "border-white/15 bg-white/10 backdrop-blur" : "border-white/70 bg-white/85"}`}>
      <p className={`text-[10px] font-semibold uppercase tracking-[0.08em] ${inverse ? "text-slate-300" : "text-slate-500"}`}>{label}</p>
      <p className={`mt-1 text-sm font-semibold ${inverse ? "text-white" : "text-slate-950"}`}>{value}</p>
    </div>
  );
}

function StageFocusCard({
  label,
  code,
  title,
  note,
  actionLabel,
  onAction,
}: {
  label: string;
  code: string;
  title: string;
  note: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <div className="rounded-[24px] border border-white/70 bg-gradient-to-br from-white via-slate-50 to-cyan-50/80 p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</p>
          <p className="mt-1 text-xs font-medium uppercase tracking-[0.08em] text-cyan-700">{code.replace(/_/g, " ")}</p>
          <p className="mt-2 text-sm font-semibold text-slate-950">{title}</p>
          <p className="mt-1 text-xs text-slate-600">{note}</p>
        </div>
        <Button size="sm" variant="outline" onClick={onAction}>{actionLabel}</Button>
      </div>
    </div>
  );
}

function CompactStagePill({
  reached,
  code,
  label,
}: {
  reached: boolean;
  code: string;
  label: string;
}) {
  return (
    <div className={`rounded-2xl border px-3 py-2 ${reached ? "border-emerald-300 bg-emerald-50" : "border-border/70 bg-white"}`}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500">{code.replace(/_/g, " ")}</p>
      <p className="mt-1 text-xs font-medium text-slate-800">{label}</p>
    </div>
  );
}

function SlimInfoCard({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="rounded-2xl border border-white/70 bg-white/85 px-4 py-3 shadow-sm">
      <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500">{label}</p>
      <p className={`mt-1 text-sm ${strong ? "font-semibold text-slate-950" : "font-medium text-slate-900"}`}>{value}</p>
    </div>
  );
}

function MiniInfoPill({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2.5 backdrop-blur">
      <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-300">{label}</p>
      <p className={`mt-0.5 text-sm leading-5 ${strong ? "font-semibold text-white" : "font-medium text-slate-100"}`}>{value}</p>
    </div>
  );
}

function SectionStrip({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-[20px] border border-white/70 bg-white/80 p-3 shadow-sm">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">{title}</p>
      {children}
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

function formatStatusLabel(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatDateTime(value?: string | null) {
  if (!value) {
    return "N/A";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString();
}

function formatDowntime(value?: number | null) {
  if (!value || value <= 0) {
    return "0 minutes";
  }
  const hours = Math.floor(value / 60);
  const minutes = value % 60;
  if (!hours) {
    return `${minutes} minutes`;
  }
  if (!minutes) {
    return `${hours} hours`;
  }
  return `${hours} hours ${minutes} minutes`;
}

function formatElapsedSince(start?: string | null, end?: string | null) {
  if (!start) {
    return "N/A";
  }
  const startMs = new Date(start).getTime();
  const endMs = end ? new Date(end).getTime() : Date.now();
  if (Number.isNaN(startMs) || Number.isNaN(endMs)) {
    return "N/A";
  }
  return formatDowntime(Math.max(0, Math.round((endMs - startMs) / 60000)));
}

function buildDeliveryTrackingSummary({
  bookingPickupDate,
  bookingPickupTime,
  bookingTat,
  bookingStatus,
  deliveryStatus,
  distanceKm,
  destinationLabel,
  updatedAt,
}: {
  bookingPickupDate?: string | null;
  bookingPickupTime?: string | null;
  bookingTat?: string | null;
  bookingStatus: string;
  deliveryStatus: string;
  distanceKm?: number | null;
  destinationLabel: string;
  updatedAt: string;
}) {
  const pickupDateTime =
    bookingPickupDate
      ? new Date(`${bookingPickupDate}T${bookingPickupTime ?? "00:00"}`)
      : null;
  const tatDays = Number(bookingTat ?? 0) || 0;
  const eta =
    pickupDateTime && !Number.isNaN(pickupDateTime.getTime()) && tatDays > 0
      ? new Date(pickupDateTime.getTime() + tatDays * 24 * 60 * 60 * 1000)
      : null;
  const progressPercent =
    deliveryStatus === "COMPLETED"
      ? 100
      : bookingStatus === "POD_PENDING"
        ? 92
        : bookingStatus === "IN_TRANSIT" || bookingStatus === "ARRIVED"
          ? 68
          : bookingStatus === "DISPATCHED" || bookingStatus === "READY_FOR_DISPATCH"
            ? 35
            : 0;

  return {
    arrivingIn: tatDays > 0 ? `${tatDays} day${tatDays > 1 ? "s" : ""}` : "TAT not defined",
    eta: eta ? eta.toLocaleString() : "N/A",
    averageSpeed: "0.00 km/h",
    distance: `${Number(distanceKm || 0).toFixed(2)} km`,
    progressPercent,
    progressLabel: `${progressPercent}% Journey completed`,
    lastKnownLocation: `${destinationLabel} | ${formatDateTime(updatedAt)}`,
  };
}

function buildDeliveryRecentActions(events: BookingStatusEvent[]) {
  const actionMeta: Partial<Record<BookingStatusEvent["status"], string>> = {
    DRAFT: "Your booking has been successfully created and recorded in the system.",
    ACCEPTED: "The vendor has confirmed the booking and is preparing for dispatch.",
    VEHICLE_ASSIGNED: "Vehicle and driver assignment has been completed.",
    LOADING_STARTED: "The vehicle is at pickup and loading has started.",
    LOADING_COMPLETED: "Goods have been successfully loaded and are ready for transport.",
    DOCUMENT_COMPLETED: "All necessary documents have been uploaded and verified for transit.",
    READY_FOR_DISPATCH: "The shipment is staged and ready to leave origin.",
    DISPATCHED: "The vehicle is out for pickup and dispatch movement is active.",
    IN_TRANSIT: "The shipment is currently on the move to its destination.",
    ARRIVED: "The vehicle has reached the destination city and is heading for final delivery.",
    COMPLETED: "Delivery is successfully completed and the trip has been closed.",
  };

  return events
    .filter((event) => actionMeta[event.status] || event.eventLabel)
    .sort((left, right) => left.timestamp.localeCompare(right.timestamp))
    .map((event) => ({
      label: event.eventLabel ?? formatStatusLabel(event.status),
      message: actionMeta[event.status] ?? event.note ?? "-",
      timestamp: formatDateTime(event.timestamp),
    }));
}

function getCurrentTimelineStage(events: BookingStatusEvent[]) {
  const reversed = [...events].sort((left, right) => right.timestamp.localeCompare(left.timestamp));
  const match = reversed.find((event) =>
    timelineSteps.some(([status]) => getPrimaryBookingStatus(event.status) === status),
  );
  const stageCode = match ? getPrimaryBookingStatus(match.status) : "DRAFT";
  const stage = timelineSteps.find(([status]) => status === stageCode) ?? timelineSteps[0];
  return {
    code: stage[0],
    label: stage[1],
  };
}

function getCurrentExecutionStage(events: BookingStatusEvent[]) {
  const reversed = [...events].sort((left, right) => right.timestamp.localeCompare(left.timestamp));
  const match = reversed.find((event) =>
    executionPipelineSteps.some(([status]) => event.status === status),
  );
  const stage = executionPipelineSteps.find(([status]) => status === match?.status) ?? executionPipelineSteps[0];
  return {
    code: stage[0],
    label: stage[1],
  };
}
