import type { NearbyPOI, POIOption, POIType } from "@/types/poi";

export const poiTypes: POIOption[] = [
  { id: "fuel", label: "Fuel Station", icon: "Fuel" },
  { id: "ev", label: "EV Charging Station", icon: "BatteryCharging" },
  { id: "hospital", label: "Hospital", icon: "Hospital" },
  { id: "police", label: "Police Station", icon: "Shield" },
  { id: "restaurant", label: "Restaurant", icon: "UtensilsCrossed" },
  { id: "service", label: "Service Station", icon: "Wrench" },
];

export const mockNearbyPOI: Record<POIType, NearbyPOI[]> = {
  fuel: [
    { name: "Indian Oil Highway Station", distance: "2.3 km", address: "NH48, Nelamangala, Karnataka" },
    { name: "BPCL Fuel Point", distance: "4.1 km", address: "Tumkur Road, Bengaluru" },
  ],
  ev: [
    { name: "ChargeZone Bengaluru", distance: "3.0 km", address: "KR Puram Main Road, Bengaluru" },
    { name: "Jio-bp Pulse", distance: "5.4 km", address: "Whitefield Approach Road, Bengaluru" },
  ],
  hospital: [
    { name: "Sri Lakshmi Hospital", distance: "1.9 km", address: "Outer Ring Road, Bengaluru" },
    { name: "District Emergency Center", distance: "6.2 km", address: "Tumkur Highway Service Road" },
  ],
  police: [
    { name: "Traffic Police Outpost", distance: "2.7 km", address: "Hebbal Flyover, Bengaluru" },
    { name: "Highway Patrol Unit", distance: "7.8 km", address: "NH48 Toll Plaza" },
  ],
  restaurant: [
    { name: "A2B Highway Kitchen", distance: "2.2 km", address: "Service Road, Nelamangala" },
    { name: "MTR Drive-In", distance: "4.6 km", address: "Tumkur Main Road, Bengaluru" },
  ],
  service: [
    { name: "Ashok Leyland Service Point", distance: "5.1 km", address: "Peenya Industrial Area" },
    { name: "TyreCare Fleet Support", distance: "8.4 km", address: "NH48 Yard Access Road" },
  ],
};
