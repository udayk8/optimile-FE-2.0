export const APP_NAME = 'Vendor Portal'

export const ROUTES = {
  HOME: '/home',
  LOGIN: '/login',
  SOURCING: '/sourcing',
  SOURCING_RFI: '/sourcing/rfi',
  SOURCING_RFI_DETAIL: '/sourcing/rfi/:id',
  SOURCING_RFQ: '/sourcing/rfq',
  SOURCING_RFQ_DETAIL: '/sourcing/rfq/:id',
  SOURCING_AUCTIONS: '/sourcing/auctions',
  SOURCING_AUCTION_DETAIL: '/sourcing/auctions/:id',
  CONTRACTS: '/contracts',
  CONTRACT_DETAIL: '/contracts/:id',
  TRIPS: '/trips',
  TRIPS_INDENTS: '/trips/indents',
  TRIPS_INDENT_DETAIL: '/trips/indents/:id',
  TRIPS_ACTIVE: '/trips/active',
  TRIPS_ACTIVE_DETAIL: '/trips/active/:id',
  TRIPS_COMPLETED: '/trips/completed',
  TRIPS_COMPLETED_DETAIL: '/trips/completed/:id',
  EXPENSES: '/expenses',
  EXPENSES_ADD: '/expenses/add/:tripId',
  EXPENSE_DETAIL: '/expenses/:id',
  FLEET: '/fleet',
  FLEET_VEHICLES: '/fleet/vehicles',
  FLEET_VEHICLE_ADD: '/fleet/vehicles/add',
  FLEET_VEHICLE_DETAIL: '/fleet/vehicles/:id',
  FLEET_DRIVERS: '/fleet/drivers',
  FLEET_DRIVER_ADD: '/fleet/drivers/add',
  FLEET_DRIVER_DETAIL: '/fleet/drivers/:id',
  FLEET_CAPACITY: '/fleet/capacity',
  INVOICES: '/invoices',
  INVOICES_CREATE: '/invoices/create',
  INVOICES_NEW: '/invoices/new',
  INVOICES_LIST: '/invoices/list',
  INVOICE_DETAIL: '/invoices/:id',
  LEDGER: '/ledger',
  LEDGER_PAYMENTS: '/ledger/payments',
  EXCEPTIONS: '/exceptions',
  EXCEPTION_DETAIL: '/exceptions/:exceptionId',
  DISPUTES: '/disputes',
  DISPUTE_DETAIL: '/disputes/:disputeId',
  NBFC: '/nbfc',
  NBFC_SELECT_PARTNER: '/nbfc/apply/:invoiceId/select-partner',
  NBFC_APPLICATION: '/nbfc/apply/:invoiceId/:nbfcId',
  PROFILE: '/profile',
  PROFILE_COMPANY: '/profile/company',
  PROFILE_BANK: '/profile/bank',
} as const

export const EXPENSE_TYPES = [
  { value: 'TOLL', label: 'Toll' },
  { value: 'DETENTION', label: 'Detention' },
  { value: 'LOADING_UNLOADING', label: 'Loading / Unloading' },
  { value: 'WEIGHBRIDGE', label: 'Weighbridge' },
  { value: 'OTHER', label: 'Other' },
] as const

export const VEHICLE_TYPES = [
  { value: '20FT_CONTAINER', label: '20ft Container' },
  { value: '32FT_CONTAINER', label: '32ft Container' },
  { value: '40FT_CONTAINER', label: '40ft Container' },
  { value: 'FLATBED', label: 'Flatbed' },
  { value: 'TANKER', label: 'Tanker' },
  { value: 'TRAILER', label: 'Trailer' },
  { value: 'LCV', label: 'LCV (Light Commercial)' },
  { value: 'HCV', label: 'HCV (Heavy Commercial)' },
] as const

export const AUCTION_TYPES = [
  { value: 'REVERSE', label: 'Reverse Auction' },
  { value: 'SPOT', label: 'Spot Auction' },
  { value: 'LOT', label: 'Lot Auction' },
  { value: 'BULK', label: 'Bulk Auction' },
] as const

export const FILE_UPLOAD_MAX_SIZE = 5 * 1024 * 1024 // 5MB
export const ACCEPTED_FILE_TYPES = {
  'image/*': ['.png', '.jpg', '.jpeg', '.webp'],
  'application/pdf': ['.pdf'],
}

export const POLLING_INTERVALS = {
  DASHBOARD: 30_000,
  NOTIFICATIONS: 15_000,
  AUCTION_LIVE: 3_000,
  SLA_SYNC: 60_000,
} as const
