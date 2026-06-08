import { useMemo } from "react";
import { useAppStore } from "@tms-booking/shared/store/useAppStore";
import { loadStore as loadAuctionStore } from "@auction/lib/auction-store";
import type { TenantVendorRateCard } from "@/types/vendor";

/* ============================================================
   Booking admin sources.

   A vendor's contracts are not just the manually configured rate
   cards — auction-won LOT/BULK contracts are buying rates on a lane
   too. Contract-based booking assignment must be able to match a
   vendor on EITHER source. The manual rate cards already live in
   `vendorRateCardMap`; here we fold the vendor's auction-won
   contracts into the same map (as read-only rate-card rows) so the
   existing matching engine treats them uniformly.
   ============================================================ */

type AuctionStoreContract = {
  id: string;
  contractType?: "BULK" | "LOT" | "SPOT";
  vendorId: string;
  vendorName: string;
  originCity?: string;
  destinationCity?: string;
  contractedRate: number;
  rateUnit: TenantVendorRateCard["rateType"];
  vehicleType?: string;
  startDate: string;
  endDate: string;
  status: string;
  allocationRank?: "L1" | "L2" | "L3";
  volumeAllocationPercent?: number;
  estimatedTrips?: number;
};

/**
 * Auction-won LOT/BULK contracts for one vendor, shaped as vendor rate cards.
 * SPOT contracts are one-time (consumed by a single spot booking) so they are
 * excluded from contract-based assignment. The contract's own vehicle type is
 * carried through (auction contracts use the tenant vehicle-type vocabulary,
 * e.g. "MGV"), so booking matches on lane + vehicle like manual rate cards.
 */
function auctionContractsAsRateCards(vendor: {
  id: string;
  name: string;
  tenantId: string;
}): TenantVendorRateCard[] {
  if (typeof window === "undefined") return [];
  try {
    // loadStore (not a raw read) so the auction mock data is seeded/merged even
    // when the Auction module was never opened in this session.
    const contracts = loadAuctionStore().contracts as unknown as AuctionStoreContract[];
    const name = vendor.name.toLowerCase();
    return contracts
      .filter((contract) => contract.contractType === "BULK" || contract.contractType === "LOT")
      .filter((contract) => contract.status !== "EXPIRED" && contract.status !== "TERMINATED")
      .filter(
        (contract) =>
          contract.vendorId === vendor.id || contract.vendorName.toLowerCase() === name,
      )
      .map((contract) => ({
        id: `auction-${contract.id}`,
        tenantId: vendor.tenantId,
        tenantVendorId: vendor.id,
        fromCity: contract.originCity ?? "",
        toCity: contract.destinationCity ?? "",
        sourcePincode: "",
        destinationPincode: "",
        rateType: contract.rateUnit,
        vehicleType: contract.vehicleType ?? null,
        buyingRate: contract.contractedRate,
        underloadRate: contract.contractedRate,
        overloadRate: null,
        rate: contract.contractedRate,
        effectiveFromDate: contract.startDate,
        effectiveToDate: contract.endDate,
        status: "active",
        allocationRank: contract.allocationRank,
        volumeAllocationPercent: contract.volumeAllocationPercent,
        estimatedTrips: contract.estimatedTrips,
        createdAt: contract.startDate,
        updatedAt: contract.startDate,
      } satisfies TenantVendorRateCard));
  } catch {
    return [];
  }
}

export function useBookingAdminSources(tenantId: string) {
  const appStore = useAppStore(tenantId);

  // Fold each vendor's auction-won contracts into the rate-card map so booking
  // assignment can match a vendor on its manual OR auction-based contracts.
  const vendorRateCardMap = useMemo(() => {
    const merged = new Map(appStore.vendorRateCardMap);
    appStore.vendors.forEach((vendor) => {
      const auctionCards = auctionContractsAsRateCards({
        id: vendor.id,
        name: vendor.name,
        tenantId,
      });
      if (!auctionCards.length) return;
      merged.set(vendor.id, [...(merged.get(vendor.id) ?? []), ...auctionCards]);
    });
    return merged;
  }, [appStore.vendorRateCardMap, appStore.vendors, tenantId]);

  const vendorRateCards = useMemo(
    () => Array.from(vendorRateCardMap.values()).flat(),
    [vendorRateCardMap],
  );

  return {
    customers: appStore.customers,
    users: appStore.users,
    customerAddressMap: appStore.customerAddressMap,
    customerMap: appStore.customerMap,
    customerRateCardMap: appStore.customerRateCardMap,
    vendorRateCards,
    vendorRateCardMap,
    addresses: appStore.addresses,
    rateCards: appStore.rateCards,
    materials: appStore.materials,
    uomDefinitions: appStore.uomDefinitions,
    uomMappings: appStore.uomMappings,
    lrConfigs: appStore.lrConfigs,
    lrPools: appStore.lrPools,
    vehicleTypes: appStore.vehicleTypes,
    vehicles: appStore.vehicles,
    drivers: appStore.drivers,
    vendors: appStore.vendors,
  };
}
