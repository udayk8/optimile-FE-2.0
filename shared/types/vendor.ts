// ============================================================
// Optimile ERP — Platform-Level Vendor Master Types
// ============================================================
// The CANONICAL Vendor type used across all modules.
// Both TMS and AMS can CREATE vendors into the shared store;
// Finance and Fleet only READ.
// ============================================================

// ── Enums ──────────────────────────────────────────────────

export type VendorType = 'Company' | 'Individual' | 'Broker';

export type VendorStatus =
    | 'ACTIVE'
    | 'INACTIVE'
    | 'BLACKLISTED'
    | 'PENDING_VERIFICATION'
    | 'ON_HOLD';

/**
 * Verification level determines how thoroughly the vendor was vetted:
 * - BASIC: Quick-add via TMS (name + phone + bank). For aggregators onboarding brokers.
 * - FULL: Document-verified via AMS pipeline (GST + PAN + transport license + insurance).
 */
export type VerificationLevel = 'BASIC' | 'FULL';

/**
 * Which module originally created this vendor record.
 * This never changes even if the vendor is later enriched by another module.
 */
export type VendorCreatedFrom = 'TMS' | 'AMS' | 'FLEET' | 'IMPORT';

// ── Document Tracking ──────────────────────────────────────

export type VendorDocumentType =
    | 'GST_CERTIFICATE'
    | 'PAN_CARD'
    | 'TRANSPORT_LICENSE'
    | 'INSURANCE'
    | 'BANK_STATEMENT'
    | 'CANCELLED_CHEQUE'
    | 'COMPANY_REGISTRATION'
    | 'OTHER';

export type VendorDocumentStatus =
    | 'NOT_UPLOADED'
    | 'UPLOADED'
    | 'VERIFYING'
    | 'VERIFIED'
    | 'REJECTED'
    | 'EXPIRED';

export interface VendorDocument {
    type: VendorDocumentType;
    status: VendorDocumentStatus;
    fileName?: string;
    fileUrl?: string;
    uploadedAt?: number;
    expiryDate?: string;
    verifiedBy?: string;
    verifiedAt?: number;
    rejectionReason?: string;
}

// ── Core Vendor Interface ──────────────────────────────────

export interface PlatformVendor {
    // ── Identity (Core — required for all vendors)
    id: string;                       // VEN-00001
    companyName: string;
    legalEntityName?: string;
    type: VendorType;
    status: VendorStatus;
    verificationLevel: VerificationLevel;
    createdFrom: VendorCreatedFrom;

    // ── Contact
    contactName: string;
    phone: string;
    email: string;
    address?: string;
    city?: string;
    state?: string;
    pincode?: string;

    // ── Compliance (optional for BASIC, required for FULL)
    gstin?: string;
    pan?: string;
    transportLicense?: string;
    documents: VendorDocument[];

    // ── Banking
    bankDetails?: {
        accountNumber: string;
        ifsc: string;
        beneficiaryName: string;
        bankName?: string;
        branch?: string;
    };

    // ── Capacity & Coverage
    zonesServed: string[];            // e.g., ['North', 'West']
    vehicleTypes: string[];           // e.g., ['20FT', '32FT', 'Trailer']
    fleetSize: number;

    // ── Status History
    statusHistory: Array<{
        from: VendorStatus;
        to: VendorStatus;
        changedBy: string;
        changedAt: number;
        reason: string;
    }>;

    // ── Timestamps
    createdAt: number;
    lastUpdatedAt: number;
    lastActiveAt: number;
}

// ── TMS Extension (stored alongside PlatformVendor in TMS) ─

export interface TMSVendorExtension {
    vendorId: string;
    rateAgreements: TMSRateAgreement[];
    brokerCommission?: number;        // Percentage
    preferredRoutes: string[];        // Route IDs
    paymentTerms: 'Weekly' | 'Bi-weekly' | 'Monthly' | 'On Delivery';
    paymentMode: 'Bank Transfer' | 'Cheque' | 'Cash' | 'UPI';
    performance: {
        rating: number;                 // 0-5
        totalTrips: number;
        onTimePercent: number;
        lastTripDate?: string;
    };
}

export interface TMSRateAgreement {
    id: string;
    routeId?: string;
    origin?: string;
    destination?: string;
    vehicleType: string;
    rateType: 'Per KM' | 'Per Trip' | 'Per Ton';
    rate: number;
    validFrom: string;
    validTo: string;
    status: 'Active' | 'Expired' | 'Draft';
}

// ── AMS Extension (stored alongside PlatformVendor in AMS) ──

export interface AMSVendorExtension {
    vendorId: string;
    applicationId?: string;           // Link to AMS onboarding application
    vendorPortalAccess: boolean;
    qualifiedLaneGroups: string[];
    qualifiedCommodities: string[];
    slaScore: number;                 // 0-100
    performanceScorecard: {
        onTimePlacement: number;        // Percentage
        deliverySuccess: number;        // Percentage
        disputeRate: number;            // Percentage
        avgResponseTime: number;        // Hours
    };
    contractIds: string[];            // Active AMS contract IDs
    bidHistory: Array<{
        auctionId: string;
        laneId: string;
        bidAmount: number;
        awarded: boolean;
        timestamp: number;
    }>;
    reVerificationDueAt?: number;
}

// ── Factory / Defaults ─────────────────────────────────────

export const EMPTY_PLATFORM_VENDOR: PlatformVendor = {
    id: '',
    companyName: '',
    type: 'Company',
    status: 'PENDING_VERIFICATION',
    verificationLevel: 'BASIC',
    createdFrom: 'TMS',
    contactName: '',
    phone: '',
    email: '',
    documents: [],
    zonesServed: [],
    vehicleTypes: [],
    fleetSize: 0,
    statusHistory: [],
    createdAt: Date.now(),
    lastUpdatedAt: Date.now(),
    lastActiveAt: Date.now(),
};

export const EMPTY_TMS_EXTENSION: TMSVendorExtension = {
    vendorId: '',
    rateAgreements: [],
    preferredRoutes: [],
    paymentTerms: 'Monthly',
    paymentMode: 'Bank Transfer',
    performance: { rating: 0, totalTrips: 0, onTimePercent: 0 },
};
