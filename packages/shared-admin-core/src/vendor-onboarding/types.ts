export interface VendorOnboardingAddress {
  street: string;
  city: string;
  state: string;
  pincode: string;
}

export interface VendorOnboardingContact {
  name: string;
  phone: string;
  email: string;
}

export type VendorOnboardingAccountType = "SAVINGS" | "CURRENT";

export interface VendorOnboardingDraft {
  companyName: string;
  legalName: string;
  gstin: string;
  /** GST rate (%) applied to this vendor's invoices, e.g. 12 or 18. */
  gstRate: number;
  pan: string;
  registeredAddress: VendorOnboardingAddress;
  primaryContact: VendorOnboardingContact;
  serviceRegions: string[];
  supportedVehicleTypes: string[];
  bankName: string;
  branch: string;
  accountNumber: string;
  ifscCode: string;
  accountType: VendorOnboardingAccountType;
}

export const emptyVendorOnboardingDraft: VendorOnboardingDraft = {
  companyName: "",
  legalName: "",
  gstin: "",
  gstRate: 18,
  pan: "",
  registeredAddress: { street: "", city: "", state: "", pincode: "" },
  primaryContact: { name: "", phone: "", email: "" },
  serviceRegions: [],
  supportedVehicleTypes: [],
  bankName: "",
  branch: "",
  accountNumber: "",
  ifscCode: "",
  accountType: "CURRENT",
};

export function mergeVendorOnboardingDraft(
  base: VendorOnboardingDraft,
  patch: Partial<VendorOnboardingDraft>,
): VendorOnboardingDraft {
  return { ...base, ...patch };
}
