import type { DriverDocumentStore } from "@/types/document";

export const mockDriverDocuments: DriverDocumentStore = {
  drivingLicense: {
    label: "Driving License",
    uploaded: true,
    expiryDate: "2026-06-01",
    isExpiring: true,
    mandatory: true,
    url: "/mock/dl.pdf",
  },
  aadhar: {
    label: "Aadhar",
    uploaded: true,
    expiryDate: null,
    isExpiring: false,
    mandatory: false,
    url: "/mock/aadhar.pdf",
  },
  rcFcDocument: {
    label: "RC/FC Document",
    uploaded: true,
    expiryDate: "2026-05-20",
    isExpiring: true,
    mandatory: true,
    url: "/mock/rc.pdf",
  },
};
