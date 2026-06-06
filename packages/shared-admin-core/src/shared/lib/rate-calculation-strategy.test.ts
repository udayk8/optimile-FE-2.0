import { describe, expect, it } from "vitest";
import type { TenantCustomer, TenantCustomerRateCard } from "@/types/customer";
import {
  findBestRateCardMatch,
  resolveCustomerRateCalculationStrategy,
  resolveCustomerRateMatchingConfig,
  type RateMatchInput,
} from "@/shared/lib/rate-matching-config";

/**
 * Proves two things together:
 *  1. The rate card STRUCTURE (which columns exist) is separate from the rate
 *     calculation STRATEGY (which columns booking searches on).
 *  2. There is NO Lane concept — origin→destination matching is City / Location
 *     / Pincode pairs only. Booking freight is auto-calculated by matching on
 *     the STRATEGY using City Pair (+ configured dimensions).
 */

function rc(partial: Partial<TenantCustomerRateCard>): TenantCustomerRateCard {
  return {
    id: partial.id ?? "rc",
    tenantId: "t1",
    tenantCustomerId: "c1",
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

describe("resolveCustomerRateCalculationStrategy", () => {
  it("falls back to the full structure when no strategy is configured", () => {
    const customer = { rateMatchingConfig: ["CITY_PAIR", "VEHICLE_TYPE", "MATERIAL"] } as Partial<TenantCustomer>;
    expect(resolveCustomerRateCalculationStrategy(customer)).toEqual(["CITY_PAIR", "VEHICLE_TYPE", "MATERIAL"]);
  });

  it("uses the configured subset and drops keys absent from the structure", () => {
    const customer = {
      rateMatchingConfig: ["CITY_PAIR", "VEHICLE_TYPE", "MATERIAL"],
      // SERVICE_TYPE isn't in the structure -> must be ignored.
      rateCalculationStrategy: ["CITY_PAIR", "VEHICLE_TYPE", "SERVICE_TYPE"],
    } as Partial<TenantCustomer>;
    expect(resolveCustomerRateCalculationStrategy(customer)).toEqual(["CITY_PAIR", "VEHICLE_TYPE"]);
  });

  it("preserves canonical column order regardless of selection order", () => {
    const customer = {
      rateMatchingConfig: ["CITY_PAIR", "VEHICLE_TYPE", "MATERIAL"],
      rateCalculationStrategy: ["MATERIAL", "CITY_PAIR"],
    } as Partial<TenantCustomer>;
    expect(resolveCustomerRateCalculationStrategy(customer)).toEqual(["CITY_PAIR", "MATERIAL"]);
  });
});

describe("booking matches on the strategy, not the full structure", () => {
  // Customer A: structure City + Vehicle + Material; strategy City + Vehicle.
  it("Customer A ignores Material — both material rows match; first (most specific) wins", () => {
    const customer = {
      rateMatchingConfig: ["CITY_PAIR", "VEHICLE_TYPE", "MATERIAL"],
      rateCalculationStrategy: ["CITY_PAIR", "VEHICLE_TYPE"],
    } as Partial<TenantCustomer>;
    const strategy = resolveCustomerRateCalculationStrategy(customer);
    const cards = [
      rc({ id: "cement", fromCity: "Bengaluru", toCity: "Chennai", vehicleType: "32FT", material: "Cement", rate: 18000 }),
      rc({ id: "steel", fromCity: "Bengaluru", toCity: "Chennai", vehicleType: "32FT", material: "Steel", rate: 20000 }),
    ];
    const input: RateMatchInput = { fromCity: "Bengaluru", toCity: "Chennai", vehicleType: "32FT", material: "Steel" };
    const match = findBestRateCardMatch(cards, input, strategy);
    // Material is NOT in the strategy, so a "Steel" booking still matches the
    // first City+Vehicle row — the rate is auto-picked without considering material.
    expect(match?.id).toBe("cement");
    expect(match?.rate).toBe(18000);
  });

  // Customer B: structure City + Material + Vehicle; strategy City + Material.
  it("Customer B ignores Vehicle Type — matches on From/To City + Material", () => {
    const customer = {
      rateMatchingConfig: ["CITY_PAIR", "MATERIAL", "VEHICLE_TYPE"],
      rateCalculationStrategy: ["CITY_PAIR", "MATERIAL"],
    } as Partial<TenantCustomer>;
    const strategy = resolveCustomerRateCalculationStrategy(customer);
    const cards = [
      rc({ id: "row1", fromCity: "Bengaluru", toCity: "Chennai", material: "Cement", vehicleType: "20FT", rate: 15000 }),
      rc({ id: "row2", fromCity: "Bengaluru", toCity: "Chennai", material: "Steel", vehicleType: "32FT", rate: 17000 }),
    ];
    // Booking vehicle is 14FT (matches neither row) but is ignored by the strategy.
    const input: RateMatchInput = { fromCity: "Bengaluru", toCity: "Chennai", material: "Steel", vehicleType: "14FT" };
    const match = findBestRateCardMatch(cards, input, strategy);
    expect(match?.id).toBe("row2");
    expect(match?.rate).toBe(17000);
  });

  // Pincode Pair strategy (Example C from the spec).
  it("Pincode Pair + Vehicle Type matches on from/to pincode + vehicle", () => {
    const strategy = resolveCustomerRateCalculationStrategy({
      rateMatchingConfig: ["PINCODE_PAIR", "VEHICLE_TYPE"],
    } as Partial<TenantCustomer>);
    const cards = [
      rc({ id: "p1", sourcePincode: "560001", destinationPincode: "600001", vehicleType: "32FT", rate: 21000 }),
    ];
    const input: RateMatchInput = { fromPincode: "560001", toPincode: "600001", vehicleType: "32FT" };
    expect(findBestRateCardMatch(cards, input, strategy)?.rate).toBe(21000);
  });

  it("the SAME rate card set yields a DIFFERENT match when the strategy adds Vehicle Type", () => {
    const structure = ["CITY_PAIR", "MATERIAL", "VEHICLE_TYPE"];
    const cards = [
      rc({ id: "row1", fromCity: "Bengaluru", toCity: "Chennai", material: "Steel", vehicleType: "20FT", rate: 15000 }),
      rc({ id: "row2", fromCity: "Bengaluru", toCity: "Chennai", material: "Steel", vehicleType: "32FT", rate: 17000 }),
    ];
    const input: RateMatchInput = { fromCity: "Bengaluru", toCity: "Chennai", material: "Steel", vehicleType: "32FT" };

    const cityMaterialOnly = resolveCustomerRateCalculationStrategy({
      rateMatchingConfig: structure,
      rateCalculationStrategy: ["CITY_PAIR", "MATERIAL"],
    } as Partial<TenantCustomer>);
    // City+Material only: both rows tie on 2 dims -> first row wins.
    expect(findBestRateCardMatch(cards, input, cityMaterialOnly)?.id).toBe("row1");

    const withVehicle = resolveCustomerRateCalculationStrategy({
      rateMatchingConfig: structure,
      rateCalculationStrategy: ["CITY_PAIR", "MATERIAL", "VEHICLE_TYPE"],
    } as Partial<TenantCustomer>);
    // Adding Vehicle Type makes row2 strictly more specific (3 dims) -> row2 wins.
    expect(findBestRateCardMatch(cards, input, withVehicle)?.id).toBe("row2");
  });
});

describe("structure vs strategy are independent", () => {
  it("structure stays full even when strategy narrows it", () => {
    const customer = {
      rateMatchingConfig: ["CITY_PAIR", "VEHICLE_TYPE", "MATERIAL"],
      rateCalculationStrategy: ["CITY_PAIR"],
    } as Partial<TenantCustomer>;
    // Structure (columns) is unchanged...
    expect(resolveCustomerRateMatchingConfig(customer)).toEqual(["CITY_PAIR", "VEHICLE_TYPE", "MATERIAL"]);
    // ...while the booking strategy is just City Pair.
    expect(resolveCustomerRateCalculationStrategy(customer)).toEqual(["CITY_PAIR"]);
  });
});

describe("no Lane concept remains", () => {
  it("an empty / unknown config defaults to City Pair + Vehicle Type (never Lane)", () => {
    expect(resolveCustomerRateMatchingConfig({} as Partial<TenantCustomer>)).toEqual(["CITY_PAIR", "VEHICLE_TYPE"]);
  });
});
