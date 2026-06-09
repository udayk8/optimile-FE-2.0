import { useEffect, useState } from "react";
import type { ErpOrderRecord } from "@/modules/tms/booking/types";

// Seed data — shown on first load before any user-created orders.
const SEED_ERP_ORDERS: ErpOrderRecord[] = [
  {
    id: "erp-order-seed-1",
    tenantId: "tenant-northstar",
    salesOrderNumber: "SO-10001",
    erpReferenceNumber: "ERP-SO-10001",
    externalBookingNumber: "EXT-BKG-10001",
    erpCustomerCode: "ACC001",
    erpPlantCode: "PLT-BLR-01",
    sourceSystem: "SAP",
    integrationStatus: "MOCK",
    customerId: "tenant-customer-1",
    materialId: "material-1",
    quantity: 100,
    uom: "BAG",
    weight: 5,
    weightUom: "MT",
    vehicleTypeId: "vehicle-type-1",
    originCity: "Bengaluru",
    originAddressId: "customer-address-1",
    destinationCity: "Chennai",
    destinationAddressId: null,
    consignorName: "ACC Cement Works, Bengaluru",
    consignorAddress: "Survey No. 12, Peenya, Bengaluru – 560058",
    consignorGstin: "29AAACA1234A1Z5",
    consigneeName: "BuildMart Depot, Chennai",
    consigneeAddress: "Plot 45, Ambattur, Chennai – 600098",
    consigneeGstin: "33AABCB5678B1Z2",
    opsRemark: "ERP SO-10001 — ACC Cement, Bengaluru to Chennai.",
    pickupDateTime: null,
    status: "PENDING",
    mergedBookingId: null,
    mergedBookingDisplayId: null,
    createdAt: "2026-04-22T07:00:00Z",
    updatedAt: "2026-04-22T07:00:00Z",
    createdBy: "ERP System",
  },
  {
    id: "erp-order-seed-2",
    tenantId: "tenant-northstar",
    salesOrderNumber: "SO-10002",
    erpReferenceNumber: "ERP-SO-10002",
    externalBookingNumber: null,
    erpCustomerCode: "ACC001",
    erpPlantCode: "PLT-BLR-01",
    sourceSystem: "SAP",
    integrationStatus: "MOCK",
    customerId: "tenant-customer-1",
    materialId: "material-1",
    quantity: 80,
    uom: "BAG",
    weight: 4,
    weightUom: "MT",
    vehicleTypeId: "vehicle-type-1",
    originCity: "Bengaluru",
    originAddressId: "customer-address-1",
    destinationCity: "Hyderabad",
    destinationAddressId: null,
    consignorName: "ACC Cement Works, Bengaluru",
    consignorAddress: "Survey No. 12, Peenya, Bengaluru – 560058",
    consignorGstin: "29AAACA1234A1Z5",
    consigneeName: "Infra Depot, Hyderabad",
    consigneeAddress: "Sy. No. 45, Patancheru, Hyderabad – 502319",
    consigneeGstin: "36AAACI9999I1Z1",
    opsRemark: "ERP SO-10002 — ACC Cement, Bengaluru to Hyderabad.",
    pickupDateTime: null,
    status: "PENDING",
    mergedBookingId: null,
    mergedBookingDisplayId: null,
    createdAt: "2026-04-22T08:00:00Z",
    updatedAt: "2026-04-22T08:00:00Z",
    createdBy: "ERP System",
  },
  {
    id: "erp-order-seed-3",
    tenantId: "tenant-northstar",
    salesOrderNumber: "SO-10003",
    erpReferenceNumber: "ERP-SO-10003",
    externalBookingNumber: "EXT-BKG-10003",
    erpCustomerCode: "ACC001",
    erpPlantCode: "PLT-BLR-01",
    sourceSystem: "SAP",
    integrationStatus: "MOCK",
    customerId: "tenant-customer-1",
    materialId: "material-1",
    quantity: 120,
    uom: "BAG",
    weight: 6,
    weightUom: "MT",
    vehicleTypeId: "vehicle-type-1",
    originCity: "Bengaluru",
    originAddressId: "customer-address-1",
    destinationCity: "Coimbatore",
    destinationAddressId: null,
    consignorName: "ACC Cement Works, Bengaluru",
    consignorAddress: "Survey No. 12, Peenya, Bengaluru – 560058",
    consignorGstin: "29AAACA1234A1Z5",
    consigneeName: "Southern Construction Supplies",
    consigneeAddress: "64/A, Trichy Road, Coimbatore – 641018",
    consigneeGstin: "33AABCS4444S1Z6",
    opsRemark: "ERP SO-10003 — ACC Cement, Bengaluru to Coimbatore.",
    pickupDateTime: null,
    status: "PENDING",
    mergedBookingId: null,
    mergedBookingDisplayId: null,
    createdAt: "2026-04-22T09:00:00Z",
    updatedAt: "2026-04-22T09:00:00Z",
    createdBy: "ERP System",
  },
];

export function useErpOrders(tenantId: string) {
  const storageKey = `optimile.tenant.${tenantId}.erpOrders`;

  const [orders, setOrders] = useState<ErpOrderRecord[]>(() => {
    try {
      const raw = typeof window !== "undefined" ? window.localStorage.getItem(storageKey) : null;
      if (raw) {
        const parsed = JSON.parse(raw) as ErpOrderRecord[];
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // fall through to seed
    }
    return SEED_ERP_ORDERS.filter((o) => o.tenantId === tenantId);
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(orders));
    } catch {
      // localStorage unavailable — state lives in memory only
    }
  }, [orders, storageKey]);

  function createOrder(
    input: Omit<ErpOrderRecord, "id" | "createdAt" | "updatedAt" | "status" | "mergedBookingId" | "mergedBookingDisplayId">,
  ): ErpOrderRecord {
    const now = new Date().toISOString();
    const order: ErpOrderRecord = {
      ...input,
      id: `erp-order-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      status: "PENDING",
      mergedBookingId: null,
      mergedBookingDisplayId: null,
      createdAt: now,
      updatedAt: now,
    };
    setOrders((current) => [order, ...current]);
    return order;
  }

  function markAsMerged(orderIds: string[], bookingId: string, bookingDisplayId: string) {
    const now = new Date().toISOString();
    setOrders((current) =>
      current.map((o) =>
        orderIds.includes(o.id)
          ? { ...o, status: "MERGED" as const, mergedBookingId: bookingId, mergedBookingDisplayId: bookingDisplayId, updatedAt: now }
          : o,
      ),
    );
  }

  return {
    orders,
    pendingOrders: orders.filter((o) => o.status === "PENDING" && o.tenantId === tenantId),
    mergedOrders: orders.filter((o) => o.status === "MERGED" && o.tenantId === tenantId),
    createOrder,
    markAsMerged,
  };
}
