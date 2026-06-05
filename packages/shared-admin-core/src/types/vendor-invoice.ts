// Shared vendor-invoice record — the single source of truth for the AP invoice
// lifecycle that BOTH the vendor portal and the finance module read/write.
// The two apps are route-switched (never mounted together), so this lives in the
// shared mock-store. Superset of the vendor-web `Invoice` + an embedded dispute
// thread so finance↔vendor stay consistent without a second collection.

export type TenantVendorInvoiceStatus =
  | "PENDING"
  | "APPROVED"
  | "DISPUTED"
  | "RESUBMISSION_REQUIRED"
  | "CLOSED";

export type TenantVendorInvoiceCloseReason = "SUPERSEDED" | "REJECTED";

export interface TenantVendorInvoiceLineItem {
  tripId: string;
  tripReference: string;
  freightCharge: number;
  lineTotal: number;
}

export interface TenantVendorInvoiceDisputeMessage {
  id: string;
  sender: "FINANCE" | "VENDOR";
  message: string;
  createdAt: string;
}

export interface TenantVendorInvoiceDispute {
  reason: string;
  status: "OPEN" | "CLOSED";
  raisedAt: string;
  responseDueAt?: string;
  messages: TenantVendorInvoiceDisputeMessage[];
}

export interface TenantVendorInvoiceRecord {
  id: string;
  tenantId: string;
  vendorId: string;
  vendorName: string;
  invoiceNumber: string;
  invoiceDate: string;
  paymentDueDate: string;
  vendorGstin: string;
  customerGstin: string;
  lineItems: TenantVendorInvoiceLineItem[];
  subtotal: number;
  gstAmount: number;
  grandTotal: number;
  status: TenantVendorInvoiceStatus;
  closeReason?: TenantVendorInvoiceCloseReason;
  supersedesInvoiceId?: string;   // on the NEW invoice — the old it replaces
  supersededByInvoiceId?: string; // on the OLD invoice — the new that replaced it
  pdfUrl: string;
  tripReferences: string[];
  billingPeriod?: { from: string; to: string };
  createdAt: string;
  dispute?: TenantVendorInvoiceDispute;
}
