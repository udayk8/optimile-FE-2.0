export type VehicleOwnershipType = "OWN" | "VENDOR";
export type VehicleFuelType = "DIESEL" | "PETROL" | "CNG" | "LNG" | "ELECTRIC";
// How a vehicle reports location — mirrors the vendor portal's tracking model.
export type VehicleTrackingType = "GPS_DEVICE" | "SIM" | "NONE";
export type DrugTestStatus = "CLEAR" | "PENDING" | "FAILED";
export type VehicleOperationalStatus = "ACTIVE" | "UNDER_MAINTENANCE" | "INACTIVE";
export type ComplianceStatus = "COMPLIANT" | "EXPIRING_SOON" | "EXPIRED" | "PENDING_DOCS";

// Which module created/owns a master-data record. Lets Admin show provenance
// and lets every module read/write the SAME tenant collection regardless of
// where the record originated.
export type MasterDataSource = "ADMIN" | "VENDOR_PORTAL" | "FLEET_MODULE";
export type MasterDataCreatorLoginType = "TENANT_ADMIN" | "INTERNAL_USER" | "VENDOR" | "FLEET";

// Shared provenance fields tagged onto vehicle/driver master records. All
// optional + additive so existing records and create flows keep working
// (source is defaulted to "ADMIN" by the store when absent).
export interface MasterDataOrigin {
  vendorName?: string;
  source?: MasterDataSource;
  createdByLoginType?: MasterDataCreatorLoginType;
  createdByUserId?: string | null;
  createdByVendorId?: string | null;
}

export interface FleetComplianceDocument {
  id: string;
  type: string;
  referenceNo: string;
  fileName: string;
  fileUrl: string;
  expiryDate: string;
  status: "VALID" | "EXPIRING_SOON" | "EXPIRED";
  uploadedAt: string;
}

export interface TenantVehicle {
  id: string;
  tenantId: string;
  registrationNumber: string;
  make: string;
  model: string;
  year: string;
  vehicleTypeId: string;
  fuelType: VehicleFuelType;
  ownershipType: VehicleOwnershipType;
  vendorId?: string | null;
  chassisNo?: string;
  insurance: {
    number: string;
    expiry: string;
  };
  fitness: {
    number: string;
    expiry: string;
  };
  puc: {
    number: string;
    expiry: string;
  };
  permit: {
    type: string;
    expiry: string;
  };
  odometer: string;
  engineNumber?: string;
  capacityKg?: string;
  baseLocation?: string;
  // Location reporting method (GPS device / SIM / none). GPS device id is set
  // only when trackingType === "GPS_DEVICE".
  trackingType?: VehicleTrackingType;
  gpsDeviceId?: string | null;
  operationalStatus?: VehicleOperationalStatus;
  complianceStatus?: ComplianceStatus;
  complianceDocuments?: FleetComplianceDocument[];
  isActive: boolean;
  // Provenance — who created this vehicle and from which module.
  vendorName?: string;
  source?: MasterDataSource;
  createdByLoginType?: MasterDataCreatorLoginType;
  createdByUserId?: string | null;
  createdByVendorId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TenantVehicleInput {
  registrationNumber: string;
  make: string;
  model: string;
  year: string;
  vehicleTypeId: string;
  fuelType: VehicleFuelType;
  ownershipType: VehicleOwnershipType;
  vendorId?: string | null;
  chassisNo?: string;
  insurance: {
    number: string;
    expiry: string;
  };
  fitness: {
    number: string;
    expiry: string;
  };
  puc: {
    number: string;
    expiry: string;
  };
  permit: {
    type: string;
    expiry: string;
  };
  odometer: string;
  engineNumber?: string;
  capacityKg?: string;
  baseLocation?: string;
  // Location reporting method (GPS device / SIM / none). GPS device id is set
  // only when trackingType === "GPS_DEVICE".
  trackingType?: VehicleTrackingType;
  gpsDeviceId?: string | null;
  operationalStatus?: VehicleOperationalStatus;
  complianceStatus?: ComplianceStatus;
  complianceDocuments?: FleetComplianceDocument[];
  isActive: boolean;
  vendorName?: string;
  source?: MasterDataSource;
  createdByLoginType?: MasterDataCreatorLoginType;
  createdByUserId?: string | null;
  createdByVendorId?: string | null;
}

export interface TenantDriver {
  id: string;
  tenantId: string;
  name: string;
  dob: string;
  photoUrl?: string | null;
  phone: string;
  address: string;
  bloodGroup: string;
  licenseNumber: string;
  licenseType: string;
  licenseExpiry: string;
  medicalExpiry: string;
  drugTestStatus: DrugTestStatus;
  endorsements: string[];
  assignedVehicleId?: string | null;
  vendorId?: string | null;
  email?: string;
  gender?: "MALE" | "FEMALE" | "OTHER" | "";
  baseLocation?: string;
  aadhaarMasked?: string;
  licenseClasses?: string[];
  currentStatus?: "ACTIVE" | "INACTIVE" | "BLOCKED";
  complianceStatus?: ComplianceStatus;
  complianceDocuments?: FleetComplianceDocument[];
  mobile?: string;
  isActive: boolean;
  // Provenance — who created this driver and from which module.
  vendorName?: string;
  source?: MasterDataSource;
  createdByLoginType?: MasterDataCreatorLoginType;
  createdByUserId?: string | null;
  createdByVendorId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TenantDriverInput {
  name: string;
  dob: string;
  photoUrl?: string | null;
  phone: string;
  address: string;
  bloodGroup: string;
  licenseNumber: string;
  licenseType: string;
  licenseExpiry: string;
  medicalExpiry: string;
  drugTestStatus: DrugTestStatus;
  endorsements: string[];
  assignedVehicleId?: string | null;
  vendorId?: string | null;
  email?: string;
  gender?: "MALE" | "FEMALE" | "OTHER" | "";
  baseLocation?: string;
  aadhaarMasked?: string;
  licenseClasses?: string[];
  currentStatus?: "ACTIVE" | "INACTIVE" | "BLOCKED";
  complianceStatus?: ComplianceStatus;
  complianceDocuments?: FleetComplianceDocument[];
  mobile?: string;
  isActive: boolean;
  vendorName?: string;
  source?: MasterDataSource;
  createdByLoginType?: MasterDataCreatorLoginType;
  createdByUserId?: string | null;
  createdByVendorId?: string | null;
}
