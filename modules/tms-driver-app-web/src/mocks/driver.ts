import type { Driver } from "@/types/driver";

export const mockDriver: Driver = {
  id: "DRV-001",
  name: "Rakesh Kumar",
  mobile: "+91 9876543210",
  driverType: "COMPANY",
  licenseNumber: "KA-2020-998877",
  licenseExpiryDate: "2026-06-01",
  depot: "Bengaluru North Depot",
  operatingZone: "South India",
  identityState: "ACTIVE",
  operationalState: "ON_TRIP",
  complianceStatus: "EXPIRING_SOON",
  score: 86,
  scoreTrend: [72, 79, 86],
  scoreBand: "Good",
  complianceDocs: [
    { label: "Driving License", expiresOn: "2026-06-01", status: "EXPIRING_SOON" },
    { label: "RC / FC", expiresOn: "2026-05-20", status: "EXPIRING_SOON" },
    { label: "Aadhar", expiresOn: "N/A", status: "VALID" },
  ],
  supportContact: "+91 9870001111",
  assignedVehicle: {
    id: "VEH-101",
    registrationNo: "TN38AP7768",
    type: "Truck 20FT",
    capacity: "10 Ton",
    tankCapacityLitres: 120,
  },
};
