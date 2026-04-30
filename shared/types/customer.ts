// ============================================================
// Optimile ERP — Platform-Level Customer Master Types
// ============================================================
// Customer Master is owned by TMS.
// Finance and AMS read from it.
// The BRD uses "Customer" — TMS currently calls them "Client".
// This shared type is the canonical definition.
// ============================================================

// ── Enums ──────────────────────────────────────────────────

export type CustomerTier = 'Premium' | 'Standard' | 'Basic';
export type CustomerStatus = 'Active' | 'Inactive' | 'On Hold' | 'Suspended';

// ── Contact ────────────────────────────────────────────────

export interface CustomerContact {
    name: string;
    email: string;
    phone: string;
    designation?: string;
}

// ── Core Customer Interface ────────────────────────────────

export interface PlatformCustomer {
    // ── Identity
    id: string;                       // CUS-00001
    name: string;                     // Company name
    legalName?: string;               // Legal entity name
    tier: CustomerTier;
    status: CustomerStatus;

    // ── Contacts
    contacts: {
        primary: CustomerContact;
        accounts: CustomerContact;
        logistics: CustomerContact;
    };

    // ── Compliance
    gstin: string;
    pan: string;
    gstinVerified: boolean;
    billingAddress: string;
    shippingAddresses?: string[];

    // ── Financial — synced with Finance module
    financial: {
        creditLimit: number;
        creditDays: number;              // Payment terms in days
        outstanding: number;             // Current outstanding AR
        tdsApplicable: boolean;
        tdsRate: number;                 // 0 if not applicable
        gstChargeType: 'FORWARD' | 'REVERSE';  // GTA: Forward (12%) or RCM (5%)
        invoiceFormat: 'PDF' | 'Excel';
    };

    // ── Preferences
    preferences: {
        vehicleTypes: string[];
        communicationChannel: 'Email' | 'SMS' | 'WhatsApp';
        autoBooking: boolean;
        defaultPaymentMode: 'Bank Transfer' | 'Cheque' | 'UPI';
    };

    // ── Contracts (TMS-level)
    contracts: Array<{
        id: string;
        name: string;
        validFrom: string;
        validTo: string;
        status: 'Active' | 'Expired' | 'Draft';
        rateCardId?: string;             // Link to rate template
        fileUrl?: string;
    }>;

    // ── CRM / Relationship
    relationshipManager?: string;
    acquisitionDate?: string;
    lastOrderDate?: string;

    // ── Timestamps
    createdAt: string;
    lastUpdatedAt: string;
}

// ── Factory / Defaults ─────────────────────────────────────

export const EMPTY_CUSTOMER: PlatformCustomer = {
    id: '',
    name: '',
    tier: 'Standard',
    status: 'Active',
    contacts: {
        primary: { name: '', email: '', phone: '' },
        accounts: { name: '', email: '', phone: '' },
        logistics: { name: '', email: '', phone: '' },
    },
    gstin: '',
    pan: '',
    gstinVerified: false,
    billingAddress: '',
    financial: {
        creditLimit: 100000,
        creditDays: 30,
        outstanding: 0,
        tdsApplicable: false,
        tdsRate: 0,
        gstChargeType: 'FORWARD',
        invoiceFormat: 'PDF',
    },
    preferences: {
        vehicleTypes: [],
        communicationChannel: 'Email',
        autoBooking: false,
        defaultPaymentMode: 'Bank Transfer',
    },
    contracts: [],
    createdAt: new Date().toISOString(),
    lastUpdatedAt: new Date().toISOString(),
};
