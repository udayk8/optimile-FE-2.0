// ============================================================
// Settings API — CRUD for all settings masters
// ============================================================
// Provides typed API functions for Hub, Commodity, VehicleType,
// Rate, Fleet Settings masters, and PTL config.
//
// Frontend gracefully handles 404 with empty arrays / null.
// ============================================================

import { apiClient } from './apiClient';

const BASE = '/api/v1/master';

// ── Generic helpers ─────────────────────────────────────────

async function listEntity<T>(path: string): Promise<T[]> {
  try {
    const data = await apiClient.get<T[]>(path);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

async function createEntity<T>(path: string, body: unknown): Promise<T> {
  return apiClient.post<T>(path, body);
}

async function updateEntity<T>(path: string, body: unknown): Promise<T> {
  return apiClient.put<T>(path, body);
}

async function deleteEntity(path: string): Promise<void> {
  await apiClient.delete(path);
}

// ── Hub Master ──────────────────────────────────────────────
// Schema: { id, hubCode, name, city, state, address, hubType,
//   zonesServed[], capacityVolume, capacityWeight, managerName,
//   managerPhone, managerEmail, operatingHoursStart, operatingHoursEnd,
//   status, currentUtilization? }

export const hubApi = {
  list: () => listEntity<Record<string, unknown>>(`${BASE}/hubs`),
  create: (hub: unknown) => createEntity<Record<string, unknown>>(`${BASE}/hubs`, hub),
  update: (id: string, hub: unknown) => updateEntity<Record<string, unknown>>(`${BASE}/hubs/${id}`, hub),
  remove: (id: string) => deleteEntity(`${BASE}/hubs/${id}`),
};

// ── Commodity Master ────────────────────────────────────────
// Schema: { id, code, name, category, hsn, isHazmat, hazmatClass?,
//   hazmatUnNumber?, isFragile, isTemperatureSensitive,
//   temperatureRequirement: { required, minTemp, maxTemp, unit },
//   isHighValue, isDimensionalCargo, handlingInstruction, specialNotes,
//   packagingType, insuranceRequired, defaultWeight, defaultVolume,
//   unitOfMeasure, permittedVehicleTypes[], restrictedZones[],
//   requiresEscort, status }

export const commodityApi = {
  list: () => listEntity<Record<string, unknown>>(`${BASE}/commodities`),
  create: (c: unknown) => createEntity<Record<string, unknown>>(`${BASE}/commodities`, c),
  update: (id: string, c: unknown) => updateEntity<Record<string, unknown>>(`${BASE}/commodities/${id}`, c),
  remove: (id: string) => deleteEntity(`${BASE}/commodities/${id}`),
};

// ── Vehicle Type Master ─────────────────────────────────────
// Schema: { id, code, name, displayName, bodyType, lengthFt,
//   widthFt, heightFt, grossWeightCapacity, netPayloadCapacity,
//   volumeCapacity, tareWeight, numAxles, fuelType, avgMileage,
//   requiresNationalPermit, requiresOverDimensionPermit,
//   permittedCommodities[], restrictedCommodities[],
//   isRefrigerated, isHazmatCertified, isADR,
//   standardRatePerKm, standardRatePerTrip, detentionRatePerHour,
//   ewayBillVehicleType, status }

export const vehicleTypeApi = {
  list: () => listEntity<Record<string, unknown>>(`${BASE}/vehicle-types`),
  create: (v: unknown) => createEntity<Record<string, unknown>>(`${BASE}/vehicle-types`, v),
  update: (id: string, v: unknown) => updateEntity<Record<string, unknown>>(`${BASE}/vehicle-types/${id}`, v),
  remove: (id: string) => deleteEntity(`${BASE}/vehicle-types/${id}`),
};

// ── Rate Master ─────────────────────────────────────────────
// Schema: { id, code, name, description, applicableFor: { clients[],
//   routes[], vehicleTypes[] }, rateStructure: { baseRate, unit,
//   minimumCharge }, additionalCharges: { loading, unloading,
//   detention: { afterHours, ratePerHour }, toll, tollAmount? },
//   fuelSurcharge: { type, baseDieselPrice, calculation },
//   specialConditions: { bulkDiscount: [{ minTrips, discountPercent }] },
//   validity: { from, to }, status }

export const rateTemplateApi = {
  list: () => listEntity<Record<string, unknown>>(`${BASE}/rate-templates`),
  create: (r: unknown) => createEntity<Record<string, unknown>>(`${BASE}/rate-templates`, r),
  update: (id: string, r: unknown) => updateEntity<Record<string, unknown>>(`${BASE}/rate-templates/${id}`, r),
  remove: (id: string) => deleteEntity(`${BASE}/rate-templates/${id}`),
};

// ── Location Master ─────────────────────────────────────────
// Schema: { id, code, name, type, address, contact, operatingHours,
//   facilities, geofence, linkedClients[], status }

export const locationApi = {
  list: () => listEntity<Record<string, unknown>>(`${BASE}/locations`),
  create: (location: unknown) => createEntity<Record<string, unknown>>(`${BASE}/locations`, location),
  update: (id: string, location: unknown) => updateEntity<Record<string, unknown>>(`${BASE}/locations/${id}`, location),
  remove: (id: string) => deleteEntity(`${BASE}/locations/${id}`),
};

// ── Route Master ────────────────────────────────────────────
// Schema: { id, code, name, origin, destination, distance,
//   estimatedTime, highways[], tolls[], totalTollCost,
//   stopsRecommended[], historical, status }

export const routeApi = {
  list: () => listEntity<Record<string, unknown>>(`${BASE}/routes`),
  create: (route: unknown) => createEntity<Record<string, unknown>>(`${BASE}/routes`, route),
  update: (id: string, route: unknown) => updateEntity<Record<string, unknown>>(`${BASE}/routes/${id}`, route),
  remove: (id: string) => deleteEntity(`${BASE}/routes/${id}`),
};

// ── Fleet Settings Masters ──────────────────────────────────
// TODO: Backend needed — CRUD for each fleet settings entity
// /api/v1/fleet/settings/vehicle-types
// /api/v1/fleet/settings/tyre-brands
// /api/v1/fleet/settings/battery-models
// /api/v1/fleet/settings/inventory-categories

const FLEET_BASE = '/api/v1/fleet/settings';

export const fleetSettingsApi = {
  vehicleTypes: {
    list: () => listEntity<Record<string, unknown>>(`${FLEET_BASE}/vehicle-types`),
    create: (v: unknown) => createEntity<Record<string, unknown>>(`${FLEET_BASE}/vehicle-types`, v),
    update: (id: string, v: unknown) => updateEntity<Record<string, unknown>>(`${FLEET_BASE}/vehicle-types/${id}`, v),
    remove: (id: string) => deleteEntity(`${FLEET_BASE}/vehicle-types/${id}`),
  },
  tyreBrands: {
    list: () => listEntity<Record<string, unknown>>(`${FLEET_BASE}/tyre-brands`),
    create: (t: unknown) => createEntity<Record<string, unknown>>(`${FLEET_BASE}/tyre-brands`, t),
    update: (id: string, t: unknown) => updateEntity<Record<string, unknown>>(`${FLEET_BASE}/tyre-brands/${id}`, t),
    remove: (id: string) => deleteEntity(`${FLEET_BASE}/tyre-brands/${id}`),
  },
  batteryModels: {
    list: () => listEntity<Record<string, unknown>>(`${FLEET_BASE}/battery-models`),
    create: (b: unknown) => createEntity<Record<string, unknown>>(`${FLEET_BASE}/battery-models`, b),
    update: (id: string, b: unknown) => updateEntity<Record<string, unknown>>(`${FLEET_BASE}/battery-models/${id}`, b),
    remove: (id: string) => deleteEntity(`${FLEET_BASE}/battery-models/${id}`),
  },
  inventoryCategories: {
    list: () => listEntity<Record<string, unknown>>(`${FLEET_BASE}/inventory-categories`),
    create: (c: unknown) => createEntity<Record<string, unknown>>(`${FLEET_BASE}/inventory-categories`, c),
    update: (id: string, c: unknown) => updateEntity<Record<string, unknown>>(`${FLEET_BASE}/inventory-categories/${id}`, c),
    remove: (id: string) => deleteEntity(`${FLEET_BASE}/inventory-categories/${id}`),
  },
};

// ── PTL Config ──────────────────────────────────────────────
// TODO: Backend needed — GET/PUT /api/v1/ptl/settings
// Schema: PTLConfigLocal (docketPrefix, seqReset, eWayBillThreshold,
//   freeStorageDays, fleetModels, notifyDelivery, notifyException, transitSLA[])

export const ptlConfigApi = {
  async get(): Promise<Record<string, unknown> | null> {
    try {
      return await apiClient.get<Record<string, unknown>>('/api/v1/ptl/settings');
    } catch {
      return null;
    }
  },
  async save(config: unknown): Promise<void> {
    await apiClient.put('/api/v1/ptl/settings', config);
  },
};
