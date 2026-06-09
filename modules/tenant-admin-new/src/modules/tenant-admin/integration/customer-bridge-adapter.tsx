import { useMemo } from "react";
import { useMockStore } from "@/shared/store/mock-store";
import { useSessionContext } from "@/shared/auth/session-context";
import { loadStore as loadAuctionStore } from "@auction/lib/auction-store";
import { cityLaneKey, contractCityLaneKey } from "@shared-utils";
import {
  getWeightUOMOptions,
  validateRateCard,
} from "@/modules/tms/booking/services/booking-selectors";
import { getRateCardUnitRate } from "@/modules/tms/booking/services/booking-engine";
// Import the SAME local booking page TenantAdminApp routes to (relative path,
// not the @/modules/tms alias which resolves to the standalone tms copy whose
// MockStoreProvider isn't mounted in the tenant shell — that caused a crash).
import { CreateBookingPage } from "../../tms/booking/CreateBooking";
import type { BookingRecord, BookingStatus } from "@/modules/tms/booking/types";
import type {
  CustomerAddressInput,
  CustomerRateCardResult,
  CustomerSpotContractMatch,
  CustomerAddressOption,
  CustomerBookingStatus,
  CustomerBookingView,
  CustomerDataBridge,
  CustomerInvoiceStatus,
  CustomerInvoiceView,
  CustomerMaterialOption,
  CustomerVehicleTypeOption,
} from "@customer/integration/customer-data-bridge";

// ── Internal booking lifecycle → customer-facing status ──────────────────────
// The customer never sees internal assignment sub-states; they collapse into a
// small, friendly set. (Same shared store, just a safe projection.)
const STATUS_VIEW: Record<BookingStatus, CustomerBookingStatus> = {
  DRAFT: "DRAFT",
  PENDING_RATE_APPROVAL: "PENDING_RATE_APPROVAL",
  PENDING_ASSIGNMENT: "PENDING_ASSIGNMENT",
  ACCEPTED: "PENDING_ASSIGNMENT",
  VEHICLE_ASSIGNED: "PENDING_ASSIGNMENT",
  ASSIGNED: "PENDING_ASSIGNMENT",
  LOADING_STARTED: "READY_FOR_DISPATCH",
  LOADING_COMPLETED: "READY_FOR_DISPATCH",
  DOCUMENT_PENDING: "READY_FOR_DISPATCH",
  DOCUMENT_COMPLETED: "READY_FOR_DISPATCH",
  LOADING: "READY_FOR_DISPATCH",
  LOADED: "READY_FOR_DISPATCH",
  READY_FOR_DISPATCH: "READY_FOR_DISPATCH",
  DISPATCHED: "DISPATCHED",
  IN_TRANSIT: "IN_TRANSIT",
  POD_PENDING: "IN_TRANSIT",
  ARRIVED: "IN_TRANSIT",
  DELAYED: "IN_TRANSIT_DELAYED",
  EXCEPTION: "IN_TRANSIT_EXCEPTION",
  DISPUTED: "IN_TRANSIT_EXCEPTION",
  COMPLETED: "DELIVERED",
  INVOICED: "DELIVERED",
  PAID: "DELIVERED",
  CANCELLED: "CANCELLED",
};

const STATUS_PROGRESS: Record<CustomerBookingStatus, number> = {
  DRAFT: 5,
  PENDING_RATE_APPROVAL: 12,
  PENDING_AUCTION: 18,
  PENDING_ASSIGNMENT: 24,
  READY_FOR_DISPATCH: 40,
  DISPATCHED: 55,
  IN_TRANSIT: 70,
  IN_TRANSIT_DELAYED: 62,
  IN_TRANSIT_EXCEPTION: 58,
  DELIVERED: 100,
  CANCELLED: 0,
};

function fmt(iso: string | null | undefined): string {
  if (!iso) return "-";
  // Render the stored ISO timestamp without pulling in a date library.
  return iso.slice(0, 16).replace("T", " ");
}

export function useCustomerTenantDataBridge(): CustomerDataBridge | null {
  const store = useMockStore();
  const { session } = useSessionContext();

  return useMemo<CustomerDataBridge | null>(() => {
    const tenantId = session.tenantId;
    const customerId = session.customerId;
    // Only a real CUSTOMER portal session is scoped to one customer. Internal
    // (tenant-admin) previews have no customerId → bridge stays null and the
    // dashboard shows its standalone demo data.
    if (session.loginType !== "CUSTOMER" || !tenantId || !customerId) {
      return null;
    }

    const customerName = session.customerName ?? store.getTenantCustomerById(customerId)?.name ?? "Customer";
    const tenantName = store.getTenantById(tenantId)?.name ?? null;

    const addressRecords = store.listTenantCustomerAddresses(customerId);
    const addressById = new Map(addressRecords.map((a) => [a.id, a]));
    const materials = store.listTenantMaterials(tenantId);
    const materialById = new Map(materials.map((m) => [m.id, m]));

    const cityOf = (addressId: string | null | undefined) => {
      if (!addressId) return "-";
      const a = addressById.get(addressId);
      return a ? `${a.city}` : "-";
    };
    const nameOf = (addressId: string | null | undefined) => {
      if (!addressId) return "-";
      const a = addressById.get(addressId);
      return a ? a.addressName : "-";
    };

    function toView(record: BookingRecord): CustomerBookingView {
      const status = STATUS_VIEW[record.status] ?? "PENDING_RATE_APPROVAL";
      const firstDelivery = record.deliveries?.[0] ?? null;
      const materialName = record.materialIds?.[0]
        ? materialById.get(record.materialIds[0])?.description ?? "-"
        : "-";
      const createdByPortal =
        record.createdBy === customerName ||
        record.remarks?.some((r) => /customer portal/i.test(r.message ?? ""));
      const timeline = (record.statusTimeline ?? []).map((event, index, arr) => ({
        label: event.note?.trim() || event.status,
        time: fmt(event.timestamp),
        state:
          status === "DELIVERED"
            ? ("done" as const)
            : index === arr.length - 1
              ? ("current" as const)
              : ("done" as const),
      }));
      return {
        id: record.bookingId,
        salesOrder: record.poNumber ?? record.doNumber ?? record.bookingId,
        status,
        origin: cityOf(record.sourceAddressId),
        destination: cityOf(record.destinationAddressId),
        consignee: nameOf(record.consigneeAddressId),
        vehicle: record.assignment?.vehicleLabel ?? "-",
        driver: record.assignment?.driverName ?? (status === "PENDING_ASSIGNMENT" ? "Masked until assigned" : "-"),
        driverPhone: "-",
        weight: record.weight ?? 0,
        material: materialName,
        quantity: `${record.quantity ?? 0} ${record.uom ?? ""}`.trim(),
        eta: firstDelivery?.eta ?? "-",
        bookingDate: fmt(record.createdAt),
        createdBy: createdByPortal ? "Customer" : record.createdBy?.toLowerCase().includes("ops") ? "Ops" : "ERP",
        freight: record.pricing?.calculatedFreight ?? 0,
        lrNumber: firstDelivery?.lrNumber ?? record.lrIds?.[0] ?? "-",
        progress: STATUS_PROGRESS[status] ?? 0,
        lastUpdate: fmt(record.updatedAt),
        avgSpeed: 0,
        distanceKm: record.pricing?.distanceKm ?? firstDelivery?.distanceKm ?? 0,
        consigneeLink: "Not sent",
        loadStops: (record.deliveries ?? []).map((d) => ({
          destination: d.destinationCity ?? cityOf(d.destinationAddressId),
          material: materialById.get(d.materialId)?.description ?? materialName,
          quantity: `${d.quantity ?? 0} ${d.uom ?? ""}`.trim(),
          weight: d.weight ?? 0,
          tat: "-",
          pod: d.pod ? "Captured" : "Pending",
        })),
        timeline,
        documents: (record.shipmentDocuments?.deliveries ?? []).flatMap((d) =>
          (d.invoices ?? []).map((inv) => ({
            invoiceNumber: inv.invoiceNumber,
            invoiceDate: inv.invoiceDate ?? null,
            ewayBillNumber: d.ewayBill?.ewayBillNumber ?? null,
            ewayBillExpiry: d.ewayBill?.validToDate ?? null,
            uploadedAt: inv.uploadedAt,
          }))
        ),
        destinationChangeRequests: (record.destinationChangeRequests ?? []).map((r) => ({
          id: r.id,
          reason: r.reason,
          status: (r.status === 'APPROVED' || r.status === 'IMPLEMENTED' ? 'APPROVED' : r.status === 'REJECTED' ? 'REJECTED' : 'PENDING') as 'PENDING' | 'APPROVED' | 'REJECTED',
          raisedAt: r.raisedAt,
        })),
      };
    }

    const bookings = store
      .listTenantBookings(tenantId)
      .filter((b) => b.customerId === customerId)
      .map(toView);

    const addresses: CustomerAddressOption[] = addressRecords.map((a) => ({
      id: a.id,
      label: a.addressName,
      city: a.city,
      usage: a.addressUsage ?? "BOTH",
    }));
    const materialOptions: CustomerMaterialOption[] = materials
      .filter((m) => m.status === "active" && (m.mappedCustomerIds.length === 0 || m.mappedCustomerIds.includes(customerId)))
      .map((m) => ({
        id: m.id,
        label: m.materialCode ?? m.description,
        description: m.description,
        uom: m.uom,
        conversionValue: m.conversionValue ?? null,
        weightUom: m.defaultWeightUOM ?? null,
      }));
    const vehicleTypes: CustomerVehicleTypeOption[] = store
      .listTenantVehicleTypes(tenantId)
      .filter((v) => v.status === "active")
      .map((v) => ({ id: v.id, label: v.typeCode }));
    const uomDefinitions = store.listTenantUOMDefinitions ? store.listTenantUOMDefinitions(tenantId) : [];
    const selectedCustomerRecord = store.getTenantCustomerById(customerId) ?? null;
    const weightUomOptions = getWeightUOMOptions(uomDefinitions, selectedCustomerRecord);
    const effectiveWeightUomOptions = weightUomOptions.length > 0 ? weightUomOptions : ["KG", "MT", "TON"];

    // ── AR invoices the 3PL issued to this customer (shared TenantInvoiceRecord) ──
    const bookingById = new Map(bookings.map((b) => [b.id, b]));
    const invoiceStatusOf = (inv: { stage?: string; paymentStatus?: string; dueDate?: string | null }): { status: CustomerInvoiceStatus; agingDays: number } => {
      if (inv.paymentStatus === "paid") return { status: "Paid", agingDays: 0 };
      const stage = inv.stage ?? "submitted";
      if (stage === "closed") return { status: "Closed", agingDays: 0 };
      if (stage === "disputed") return { status: "Disputed", agingDays: 0 };
      if (stage === "correction") return { status: "Resubmission Required", agingDays: 0 };
      if (stage === "approved") {
        const days = inv.dueDate ? Math.round((Date.now() - new Date(inv.dueDate).getTime()) / 86400000) : 0;
        return days > 0 ? { status: "Overdue", agingDays: days } : { status: "Approved", agingDays: 0 };
      }
      return { status: "Pending", agingDays: 0 };
    };
    const customerInvoices: CustomerInvoiceView[] = store
      .listTenantInvoices(tenantId)
      .filter((inv) => inv.customerId === customerId)
      .map((inv) => {
        const firstBooking = inv.bookingIds?.[0] ? bookingById.get(inv.bookingIds[0]) : undefined;
        const { status, agingDays } = invoiceStatusOf(inv);
        return {
          invoiceId: inv.invoiceId,
          bookingRef: firstBooking?.salesOrder ?? inv.bookingIds?.[0] ?? "-",
          route: firstBooking ? `${firstBooking.origin} → ${firstBooking.destination}` : "-",
          invoiceDate: fmt(inv.createdAt),
          dueDate: inv.dueDate ? fmt(inv.dueDate) : "On approval",
          amount: inv.total,
          status,
          agingDays,
          dispute: inv.dispute
            ? {
                reason: inv.dispute.reason,
                status: inv.dispute.status,
                raisedAt: inv.dispute.raisedAt,
                responseDueAt: inv.dispute.responseDueAt,
                messages: inv.dispute.messages.map((m) => ({ id: m.id, sender: m.sender, message: m.message, createdAt: m.createdAt })),
              }
            : undefined,
          supersedesInvoiceId: inv.supersedesInvoiceId,
          supersededByInvoiceId: inv.supersededByInvoiceId,
        };
      });

    return {
      tenantId,
      tenantName,
      customerId,
      customerName,
      bookings,
      invoices: customerInvoices,
      approveInvoice: (invoiceId) => store.customerApproveInvoice(invoiceId),
      disputeInvoice: (invoiceId, reason) => store.customerDisputeInvoice(invoiceId, reason),
      requestResubmission: (invoiceId, message) => store.customerRequestInvoiceResubmission(invoiceId, message),
      rejectInvoice: (invoiceId, reason) => store.customerRejectInvoice(invoiceId, reason),
      replyToDispute: (invoiceId, message) => store.customerReplyToInvoiceDispute(invoiceId, message),
      getBookingById: (id) => {
        const record = store.getTenantBookingById(id);
        if (!record || record.customerId !== customerId) return null;
        return toView(record);
      },
      addresses,
      materials: materialOptions,
      vehicleTypes,
      weightUomOptions: effectiveWeightUomOptions,
      createAddress: (input: CustomerAddressInput): CustomerAddressOption => {
        const addressType = input.usage === "ORIGIN" ? "consignor" : input.usage === "DESTINATION" ? "consignee" : "both";
        const created = store.createTenantCustomerAddress({
          tenantId,
          tenantCustomerId: customerId,
          customerId,
          addressType,
          addressUsage: input.usage,
          addressName: input.addressName || `${input.city} ${input.usage === "DESTINATION" ? "Destination" : input.usage === "ORIGIN" ? "Origin" : "Address"}`,
          contactPersonName: input.contactPersonName,
          contactPerson: input.contactPersonName,
          phone: input.phone,
          contactNumber: input.phone,
          email: input.email || undefined,
          emailId: input.email || undefined,
          gstin: input.gstin || undefined,
          addressLine1: input.addressLine1,
          addressLine2: input.addressLine2 || undefined,
          city: input.city,
          state: input.state,
          country: input.country || "India",
          pincode: input.pincode,
          isDefault: false,
          status: "active",
        });
        return {
          id: created.id,
          label: created.addressName,
          city: created.city,
          usage: input.usage,
        };
      },
      lookupContractRate: (params): CustomerRateCardResult | null => {
        const customerRateCards = store.listTenantCustomerRateCards(customerId);
        if (!customerRateCards.length) return null;
        const sourceAddr = addressRecords.find((a) => a.id === params.originAddressId);
        if (!sourceAddr) return null;
        const matched = validateRateCard(
          {
            bookingDate: params.pickupDate,
            customerId,
            rateMatchingBasis: "CITY_TO_CITY",
            lane: null,
            fromCity: sourceAddr.city,
            toCity: params.destinationCity,
            fromLocation: sourceAddr.addressName ?? null,
            toLocation: null,
            fromPincode: sourceAddr.pincode ?? null,
            toPincode: null,
            vehicleType: params.vehicleTypeCode,
            rateType: params.rateType,
            weight: params.rateType === "PER_MT" ? params.weight : null,
          },
          customerRateCards,
        );
        if (!matched) return null;
        const rate = getRateCardUnitRate(matched);
        if (rate == null) return null;
        return { rate, rateType: params.rateType, laneKey: matched.lanes ?? null };
      },
      getSpotContractForLane: (originCity, destinationCity): CustomerSpotContractMatch | null => {
        const laneKey = cityLaneKey(originCity, destinationCity);
        if (!laneKey) return null;
        const today = new Date().toISOString().slice(0, 10);
        const contract = loadAuctionStore().contracts.find(
          (c) =>
            c.contractType === "SPOT" &&
            c.status === "ACTIVE" &&
            !c.consumedByBookingId &&
            contractCityLaneKey(c) === laneKey &&
            c.endDate >= today,
        ) ?? null;
        if (!contract) return null;
        return {
          contractId: contract.id,
          sourceAuctionId: contract.sourceAuctionId,
          vendorName: contract.vendorName,
          contractedRate: contract.contractedRate,
          rateUnit: contract.rateUnit,
          originCity: contract.originCity,
          destinationCity: contract.destinationCity,
          endDate: contract.endDate,
        };
      },
      cancelBooking: (bookingId, reason) => {
        const record = store.getTenantBookingById(bookingId);
        if (!record || record.customerId !== customerId) return;
        const now = new Date().toISOString();
        store.updateTenantBooking(bookingId, {
          status: "CANCELLED",
          remarks: [
            ...(record.remarks ?? []),
            { id: `remark-cancel-${Date.now()}`, timestamp: now, actor: customerName, type: "OPS_REMARK", message: `Cancelled by customer: ${reason}` },
          ],
          statusTimeline: [
            ...(record.statusTimeline ?? []),
            { id: `status-cancel-${Date.now()}`, status: "CANCELLED" as const, timestamp: now, actor: customerName, note: reason },
          ],
        });
      },

      updateBooking: (bookingId, input) => {
        const record = store.getTenantBookingById(bookingId);
        if (!record || record.customerId !== customerId) return bookingId;
        const now = new Date().toISOString();
        const newStatus = input.asDraft ? "DRAFT" : "PENDING_ASSIGNMENT";
        store.updateTenantBooking(bookingId, {
          status: newStatus,
          materialIds: [input.materialId],
          sourceAddressId: input.originAddressId,
          destinationAddressId: input.destinationAddressId,
          consignorAddressId: input.originAddressId,
          consigneeAddressId: input.destinationAddressId,
          quantity: input.quantity,
          weight: input.weight,
          uom: input.uom,
          weightUom: input.weightUom,
          vehicleTypeId: input.vehicleTypeId,
          pickupDate: input.pickupDate,
          goodsValue: input.goodsValue,
          pricing: {
            rateType: input.contractRateType,
            contractRateCardId: null,
            l1Rate: null,
            enteredRate: input.enteredRate ?? 0,
            calculatedFreight: input.enteredRate ?? 0,
            distanceKm: input.distanceKm ?? null,
            deviationPercent: 0,
            approvalLevel: "AUTO",
            deviationRemark: input.deviationRemark ?? null,
            isAutoApproved: true,
          },
          remarks: [
            ...(record.remarks ?? []),
            { id: `remark-edit-${Date.now()}`, timestamp: now, actor: customerName, type: "OPS_REMARK", message: `Booking edited via Customer Portal${input.specialInstructions ? ` — ${input.specialInstructions}` : ""}` },
          ],
          statusTimeline: [
            ...(record.statusTimeline ?? []),
            { id: `status-edit-${Date.now()}`, status: newStatus, timestamp: now, actor: customerName, note: input.asDraft ? "Booking re-saved as draft." : "Booking re-submitted via Customer Portal." },
          ],
        });
        if (!input.asDraft) {
          try { store.sendBookingVendorIndent(bookingId, customerName, null, null); } catch { /* no vendors */ }
        }
        return bookingId;
      },

      getBookingForEdit: (bookingId) => {
        const record = store.getTenantBookingById(bookingId);
        if (!record || record.customerId !== customerId) return null;
        const firstDelivery = record.deliveries?.[0] ?? null;
        const material = record.materialIds?.[0] ? materialById.get(record.materialIds[0]) : null;
        return {
          commercialType:       (record.pricing?.rateType === "PER_MT" ? "CONTRACT" : "SPOT") as import("@customer/integration/customer-data-bridge").CustomerCommercialType,
          serviceType:          "FTL" as import("@customer/integration/customer-data-bridge").CustomerServiceType,
          contractRateType:     (record.pricing?.rateType ?? "PER_TRIP") as import("@customer/integration/customer-data-bridge").CustomerContractRateType,
          originAddressId:      record.sourceAddressId ?? "",
          destinationAddressId: record.destinationAddressId ?? firstDelivery?.destinationAddressId ?? "",
          materialId:           record.materialIds?.[0] ?? "",
          quantity:             record.quantity ?? 0,
          weight:               record.weight ?? 0,
          uom:                  record.uom ?? material?.uom ?? "NOS",
          weightUom:            record.weightUom ?? material?.defaultWeightUOM ?? "MT",
          vehicleTypeId:        record.vehicleTypeId ?? null,
          pickupDate:           record.pickupDate ?? null,
          pickupTime:           null,
          goodsValue:           record.goodsValue ?? null,
          specialInstructions:  null,
          distanceKm:           record.pricing?.distanceKm ?? firstDelivery?.distanceKm ?? null,
          spotContractId:       record.spotContract?.contractId ?? null,
          enteredRate:          record.pricing?.enteredRate ?? null,
          deviationRemark:      record.pricing?.deviationRemark ?? null,
        };
      },

      requestDestinationChange: (bookingId, reason) => {
        const record = store.getTenantBookingById(bookingId)
        if (!record) return
        const now = new Date().toISOString()
        const firstDelivery = record.deliveries?.[0]
        if (!firstDelivery) return
        store.updateTenantBooking(bookingId, {
          destinationChangeRequests: [
            ...(record.destinationChangeRequests ?? []),
            {
              id: `dcr-${Date.now()}`,
              bookingId,
              deliveryId: firstDelivery.id,
              remarkType: 'DESTINATION_CHANGED',
              reason,
              raisedBy: customerName,
              raisedAt: now,
              priority: 'LOW',
              status: 'SUBMITTED',
            },
          ],
        })
      },
      createBooking: (input) => {
        const now = new Date().toISOString();
        const originCity = cityOf(input.originAddressId);
        const destinationCity = cityOf(input.destinationAddressId);
        const created = store.createTenantBooking({
          tenantId,
          customerId,
          modeOfTransport: "ROAD",
          numberOfDeliveries: 1,
          materialIds: [input.materialId],
          sourceAddressId: input.originAddressId,
          destinationAddressId: input.destinationAddressId,
          consignorAddressId: input.originAddressId,
          consigneeAddressId: input.destinationAddressId,
          laneKey: null,
          laneFound: false,
          spotContract: input.spotContractId
            ? (() => {
                const c = loadAuctionStore().contracts.find((x) => x.id === input.spotContractId);
                return c
                  ? {
                      contractId: c.id,
                      sourceAuctionId: c.sourceAuctionId,
                      vendorId: c.vendorId,
                      vendorName: c.vendorName,
                      rate: c.contractedRate,
                      rateUnit: c.rateUnit,
                      originCity: c.originCity,
                      destinationCity: c.destinationCity,
                    }
                  : null;
              })()
            : null,
          poNumber: null,
          doNumber: null,
          ewayBillNumber: null,
          pickupDate: input.pickupDate,
          pickupTime: input.pickupTime ?? null,
          goodsValue: input.goodsValue ?? null,
          tat: null,
          serviceType: input.serviceType,
          commercialType: input.commercialType,
          pricing: {
            rateType: input.contractRateType,
            contractRateCardId: null,
            l1Rate: null,
            enteredRate: input.enteredRate ?? 0,
            calculatedFreight: input.enteredRate ?? 0,
            distanceKm: input.distanceKm ?? null,
            deviationPercent: 0,
            approvalLevel: "AUTO",
            deviationRemark: input.deviationRemark ?? null,
            isAutoApproved: true,
          },
          chargeType: null,
          subBrand: null,
          quantity: input.quantity,
          weight: input.weight,
          uom: input.uom,
          weightUom: input.weightUom,
          vehicleTypeId: input.vehicleTypeId,
          lrType: "MANUAL",
          manualLrPoolPreference: "GENERAL",
          status: input.asDraft ? "DRAFT" : "PENDING_ASSIGNMENT",
          opsRemark: null,
          pod: null,
          documents: [],
          expenses: [],
          deliveries: [
            {
              id: `delivery-${Math.random().toString(36).slice(2, 9)}`,
              deliveryNo: 1,
              trackingId: "",
              originCity,
              originAddressId: input.originAddressId,
              destinationCity,
              destinationAddressId: input.destinationAddressId,
              destinationAddressSource: "SAVED_ADDRESS",
              consigneeFinalizationStatus: "CONFIRMED",
              materialId: input.materialId,
              quantity: input.quantity,
              uom: input.uom,
              weight: input.weight,
              weightUom: input.weightUom,
              distanceKm: input.distanceKm ?? null,
              status: input.asDraft ? "DRAFT" : "PENDING_ASSIGNMENT",
              lrNumber: null,
              pod: null,
            },
          ],
          assignment: null,
          remarks: [
            {
              id: `booking-remark-${Date.now()}-portal`,
              timestamp: now,
              actor: customerName,
              type: "OPS_REMARK",
              message: input.asDraft
                ? `Draft saved via Customer Portal${input.specialInstructions ? ` — ${input.specialInstructions}` : ""}`
                : `Created via Customer Portal${input.specialInstructions ? ` — ${input.specialInstructions}` : ""}`,
            },
          ],
          statusTimeline: [
            {
              id: `booking-status-${Date.now()}-created`,
              status: input.asDraft ? "DRAFT" : "PENDING_ASSIGNMENT",
              timestamp: now,
              actor: customerName,
              note: input.asDraft ? "Booking saved as draft via Customer Portal." : "Booking created via Customer Portal.",
            },
          ],
          createdBy: customerName,
        });
        if (!input.asDraft) {
          try {
            store.sendBookingVendorIndent(created.id, customerName, null, null);
          } catch {
            // No active vendors — booking stays in PENDING_ASSIGNMENT for ops to handle
          }
        }
        return created.bookingId;
      },
      // Reuse the exact internal Create Booking page, locked to this customer
      // (no customer selector). Rendered inside the tenant route subtree, so it
      // has the router/tenant/store contexts it needs.
      renderCreateBooking: (onCreated) => (
        <CreateBookingPage lockedCustomerId={customerId} createdByLabel={customerName} onAfterSubmit={onCreated} />
      ),
    };
  }, [store, session.loginType, session.tenantId, session.customerId, session.customerName]);
}
