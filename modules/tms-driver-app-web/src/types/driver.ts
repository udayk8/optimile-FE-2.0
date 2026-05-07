export type IdentityState =
  | "INVITED"
  | "PENDING_ACTIVATION"
  | "ACTIVE"
  | "LOCKED"
  | "BLOCKED"
  | "DEACTIVATED";

export type OperationalState =
  | "AVAILABLE"
  | "ASSIGNED"
  | "ON_TRIP"
  | "OFF_TRIP"
  | "COMPLIANCE_BLOCKED"
  | "VENDOR_SUSPENDED_BLOCK";

export type CommercialState =
  | "VENDOR_LINKED"
  | "VENDOR_UNDER_REVIEW"
  | "VENDOR_SUSPENDED"
  | "VENDOR_UNLINKED";

export type ScoreBand = "Excellent" | "Good" | "Needs Improvement" | "Coaching Required";

export type ComplianceStatus = "VALID" | "EXPIRING_SOON" | "EXPIRED";

export interface ComplianceDoc {
  label: string;
  expiresOn: string;
  status: ComplianceStatus;
}

export interface Driver {
  id: string;
  name: string;
  mobile: string;
  driverType: "COMPANY" | "VENDOR";
  licenseNumber: string;
  licenseExpiryDate: string;
  depot: string;
  operatingZone: string;
  identityState: IdentityState;
  operationalState: OperationalState;
  complianceStatus: ComplianceStatus;
  score: number;
  scoreTrend: number[];
  scoreBand: ScoreBand;
  complianceDocs: ComplianceDoc[];
  supportContact: string;
  assignedVehicle: {
    id: string;
    registrationNo: string;
    type: string;
    capacity: string;
    tankCapacityLitres: number;
  };
}
