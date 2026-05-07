export type POIType = "fuel" | "ev" | "hospital" | "police" | "restaurant" | "service";

export interface POIOption {
  id: POIType;
  label: string;
  icon: string;
}

export interface NearbyPOI {
  name: string;
  distance: string;
  address: string;
}
