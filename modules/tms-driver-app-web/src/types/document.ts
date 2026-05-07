export interface DriverDocument {
  label: string;
  uploaded: boolean;
  expiryDate: string | null;
  isExpiring: boolean;
  mandatory: boolean;
  url: string | null;
}

export interface DriverDocumentStore {
  drivingLicense: DriverDocument;
  aadhar: DriverDocument;
  rcFcDocument: DriverDocument;
}
