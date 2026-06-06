import { describe, expect, it } from "vitest";
import type { TenantVendorRateCard } from "@/types/vendor";
import {
  calculateVendorFreightFromRateCard,
  validateVendorRateCard,
} from "@/modules/tms/booking/services/booking-selectors";
import { calculateMarginAmount } from "@/modules/tms/booking/services/booking-engine";

/**
 * Proves Phase 2: vendor (buying) rate cards are matched with the SAME
 * configurable engine as customers, vendor freight is auto-calculated
 * (Per Trip / Per MT), and the comparison sorts cheapest-first.
 */

function vc(partial: Partial<TenantVendorRateCard>): TenantVendorRateCard {
  return {
    id: partial.id ?? "vc",
    tenantId: "t1",
    tenantVendorId: partial.tenantVendorId ?? "v1",
    sourcePincode: partial.sourcePincode ?? "",
    destinationPincode: partial.destinationPincode ?? "",
    rateType: partial.rateType ?? "PER_TRIP",
    vehicleType: partial.vehicleType ?? null,
    rate: partial.rate ?? 0,
    status: "active",
    createdAt: "",
    updatedAt: "",
    ...partial,
  };
}

// Real booking payload: Bengaluru -> Chennai, MGV, 20 MT, customer (selling) freight 24000.
const BOOKING = {
  fromCity: "Bengaluru",
  toCity: "Chennai",
  vehicleType: "MGV",
  weight: 20,
  distanceKm: 350,
  customerFreight: 24000,
};

describe("vendor contract matching uses the shared engine", () => {
  it("City Pair + Vehicle Type — Per Trip uses the contract rate as-is", () => {
    const cards = [vc({ fromCity: "Bengaluru", toCity: "Chennai", vehicleType: "MGV", rateType: "PER_TRIP", buyingRate: 16000, rate: 16000 })];
    const matched = validateVendorRateCard(
      { rateMatchingConfig: ["CITY_PAIR", "VEHICLE_TYPE"], fromCity: BOOKING.fromCity, toCity: BOOKING.toCity, vehicleType: BOOKING.vehicleType, rateType: "PER_TRIP" },
      cards,
    );
    expect(matched?.buyingRate).toBe(16000);
    const freight = calculateVendorFreightFromRateCard({ rateCard: matched, weight: BOOKING.weight, distanceKm: BOOKING.distanceKm });
    expect(freight).toBe(16000);
    expect(calculateMarginAmount(BOOKING.customerFreight, freight)).toBe(8000);
  });

  it("Per MT — vendor freight = rate × weight", () => {
    const cards = [vc({ fromCity: "Bengaluru", toCity: "Chennai", vehicleType: "MGV", rateType: "PER_MT", buyingRate: 800, rate: 800 })];
    const matched = validateVendorRateCard(
      { rateMatchingConfig: ["CITY_PAIR", "VEHICLE_TYPE"], fromCity: BOOKING.fromCity, toCity: BOOKING.toCity, vehicleType: BOOKING.vehicleType, rateType: "PER_MT", weight: BOOKING.weight },
      cards,
    );
    const freight = calculateVendorFreightFromRateCard({ rateCard: matched, weight: BOOKING.weight, distanceKm: BOOKING.distanceKm });
    expect(freight).toBe(16000); // 800 × 20 MT
  });

  it("City Pair + Material config ignores vehicle type (Vendor B)", () => {
    const cards = [
      vc({ id: "cement", fromCity: "Bengaluru", toCity: "Chennai", material: "Cement", vehicleType: "20FT", rateType: "PER_TRIP", buyingRate: 14000, rate: 14000 }),
      vc({ id: "steel", fromCity: "Bengaluru", toCity: "Chennai", material: "Steel", vehicleType: "32FT", rateType: "PER_TRIP", buyingRate: 15000, rate: 15000 }),
    ];
    const matched = validateVendorRateCard(
      { rateMatchingConfig: ["CITY_PAIR", "MATERIAL"], fromCity: BOOKING.fromCity, toCity: BOOKING.toCity, material: "Steel", vehicleType: "14FT", rateType: "PER_TRIP" },
      cards,
    );
    expect(matched?.id).toBe("steel"); // matched on city + material; vehicle ignored
  });

  it("comparison across vendors sorts cheapest buying freight first", () => {
    const vendors = [
      { id: "mahesh", name: "Mahesh Transport", cards: [vc({ tenantVendorId: "mahesh", fromCity: "Bengaluru", toCity: "Chennai", vehicleType: "MGV", rateType: "PER_TRIP", buyingRate: 12000, rate: 12000 })] },
      { id: "abc", name: "ABC Logistics", cards: [vc({ tenantVendorId: "abc", fromCity: "Bengaluru", toCity: "Chennai", vehicleType: "MGV", rateType: "PER_TRIP", buyingRate: 14000, rate: 14000 })] },
      { id: "fast", name: "Fast Cargo", cards: [vc({ tenantVendorId: "fast", fromCity: "Bengaluru", toCity: "Chennai", vehicleType: "MGV", rateType: "PER_TRIP", buyingRate: 15000, rate: 15000 })] },
    ];
    const comparison = vendors
      .map((vendor) => {
        const matched = validateVendorRateCard(
          { rateMatchingConfig: ["CITY_PAIR", "VEHICLE_TYPE"], fromCity: BOOKING.fromCity, toCity: BOOKING.toCity, vehicleType: BOOKING.vehicleType, rateType: "PER_TRIP" },
          vendor.cards,
        );
        if (!matched) return null;
        const freight = calculateVendorFreightFromRateCard({ rateCard: matched, weight: BOOKING.weight, distanceKm: BOOKING.distanceKm });
        return { vendorName: vendor.name, freight, margin: calculateMarginAmount(BOOKING.customerFreight, freight) };
      })
      .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))
      .sort((a, b) => a.freight - b.freight);

    expect(comparison.map((entry) => entry.vendorName)).toEqual(["Mahesh Transport", "ABC Logistics", "Fast Cargo"]);
    expect(comparison[0].freight).toBe(12000);
    expect(comparison[0].margin).toBe(12000); // 24000 - 12000 (highest margin = cheapest vendor)
  });

  it("returns null when no vendor contract matches (manual entry fallback)", () => {
    const cards = [vc({ fromCity: "Bengaluru", toCity: "Chennai", vehicleType: "MGV", rateType: "PER_TRIP", buyingRate: 16000, rate: 16000 })];
    const matched = validateVendorRateCard(
      { rateMatchingConfig: ["CITY_PAIR", "VEHICLE_TYPE"], fromCity: "Mumbai", toCity: "Pune", vehicleType: "MGV", rateType: "PER_TRIP" },
      cards,
    );
    expect(matched).toBeNull();
  });
});
