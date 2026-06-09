import { useTenantBridge } from '@vendor/integration/tenant-data-bridge'
import { MOCK_BANK, MOCK_COMPANY_INFO } from '@vendor/lib/mock-data'
import type { BankDetails, CompanyInfo } from '@vendor/types'

export interface VendorInvoiceProfileData {
  companyName: string
  companyInfo: CompanyInfo
  bank: BankDetails
  terms: string[]
  logoUrl?: string
}

/**
 * Single source for the invoice-PDF company/bank/terms/logo. Embedded, it comes
 * from the tenant-configured vendor master record (via the bridge); standalone
 * it falls back to the local mock company so the demo build keeps rendering.
 * Nothing on the invoice PDF is hardcoded in the pages anymore.
 */
export function useVendorInvoiceProfile(): VendorInvoiceProfileData {
  const bridge = useTenantBridge()
  const profile = bridge?.invoiceProfile ?? null

  if (profile) {
    return {
      companyName: profile.companyName,
      companyInfo: profile.companyInfo,
      bank: profile.bank,
      terms: profile.terms,
      logoUrl: profile.logoUrl,
    }
  }

  return {
    companyName: bridge?.vendorName ?? MOCK_COMPANY_INFO.tradingName,
    companyInfo: MOCK_COMPANY_INFO,
    bank: MOCK_BANK,
    terms: [],
  }
}
