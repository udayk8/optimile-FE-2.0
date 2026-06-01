import type {
  DashboardData, Auction, Contract, Indent, Trip, Expense,
  Vehicle, Driver, CapacityDeclaration, Invoice, LedgerEntry, Notification,
  CompanyInfo, BankDetails, Vendor, ExceptionRecord,
} from '@vendor/types'

export const MOCK_VENDOR: Vendor = {
  id: 'v-001',
  tradingName: 'FastTrack Logistics',
  legalName: 'FastTrack Logistics Pvt. Ltd.',
  gstin: '29AABCF1234M1ZP',
  pan: 'AABCF1234M',
  status: 'ONBOARDING_INCOMPLETE',
  onboardingStep: 'SETUP',
  kycStatus: 'DRAFT',
  profileCompletion: 45,
  bankStatus: 'PENDING',
  serviceRegions: ['Maharashtra', 'Gujarat'],
  supportedVehicleTypes: ['20ft Container', 'Flatbed'],
  documents: [
    { id: 'vd-1', type: 'GST', fileName: 'gst-certificate.pdf', uploadedAt: '2026-04-22T09:30:00Z', status: 'VERIFIED' },
    { id: 'vd-2', type: 'PAN', fileName: 'pan-card.pdf', uploadedAt: '2026-04-22T09:40:00Z', status: 'PENDING' },
    { id: 'vd-3', type: 'BANK', fileName: 'cancelled-cheque.pdf', uploadedAt: '2026-04-22T09:45:00Z', status: 'PENDING' },
  ],
  primaryContact: { name: 'Rajesh Kumar', phone: '+91 9876543210', email: 'rajesh@fasttrack.in' },
}

export const MOCK_DASHBOARD: DashboardData = {
  pendingIndents: {
    count: 3,
    items: [
      { id: 'IND-001', contractId: 'CNT-001', lane: 'Mumbai → Delhi', vehicleType: '20ft Container', reportingDate: '2026-04-26T06:00:00Z', slaDeadline: new Date(Date.now() + 3600000).toISOString(), status: 'PENDING' },
      { id: 'IND-002', contractId: 'CNT-002', lane: 'Pune → Chennai', vehicleType: 'Flatbed', reportingDate: '2026-04-27T08:00:00Z', slaDeadline: new Date(Date.now() + 7200000).toISOString(), status: 'PENDING' },
      { id: 'IND-003', contractId: 'CNT-001', lane: 'Delhi → Jaipur', vehicleType: 'LCV', reportingDate: '2026-04-28T10:00:00Z', slaDeadline: new Date(Date.now() + 14400000).toISOString(), status: 'PENDING' },
    ],
  },
  uninvoicedBookings: { count: 4, totalBillableAmount: 285000 },
  invoicePaymentStatus: { submitted: 2, approved: 3, rejected: 1, paid: 8 },
}

export const MOCK_NOTIFICATIONS: Notification[] = [
  { id: 'n1',  type: 'ONBOARDING', title: 'Complete vendor setup',       message: 'Your profile is 45% complete. Review bank details and finish company information.', deepLink: '/vendor/profile/company',              isRead: false, createdAt: new Date(Date.now() - 2   * 60  * 1000).toISOString() },
  { id: 'n2',  type: 'TRIPS',      title: 'New Booking Request',         message: 'Indent IND-001 for Mumbai → Delhi',                                                  deepLink: '/vendor/bookings?tab=new',             isRead: false, createdAt: new Date(Date.now() - 10  * 60  * 1000).toISOString() },
  { id: 'n3',  type: 'SOURCING',   title: 'Auction Going Live',          message: 'Reverse Auction AUC-012 starts in 30 min',                                           deepLink: '/vendor/sourcing/auctions/AUC-012',    isRead: false, createdAt: new Date(Date.now() - 30  * 60  * 1000).toISOString() },
  { id: 'n4',  type: 'EXPENSES',   title: 'Expense Approved',            message: 'Expense bundle ₹5,500 for TRP-043 approved',                                         deepLink: '/vendor/expenses',                     isRead: false, createdAt: new Date(Date.now() - 60  * 60  * 1000).toISOString() },
  { id: 'n5',  type: 'INVOICES',   title: 'Payment Received',            message: '₹1,45,000 credited for INV-2026-028',                                                deepLink: '/vendor/invoices/INV-2026-028',        isRead: true,  createdAt: new Date(Date.now() - 2   * 3600 * 1000).toISOString() },
  { id: 'n6',  type: 'CONTRACTS',  title: 'Contract Updated',            message: 'Contract CNT-001 rate card and SLA details were updated',                            deepLink: '/vendor/contracts/CNT-001',            isRead: false, createdAt: new Date(Date.now() - 3   * 3600 * 1000).toISOString() },
  { id: 'n7',  type: 'INVOICES',   title: 'Invoice Rejected',            message: 'Invoice INV-2026-026 was rejected. Raise a dispute if you disagree.',                deepLink: '/vendor/invoices/INV-2026-026',        isRead: false, createdAt: new Date(Date.now() - 5   * 3600 * 1000).toISOString() },
  { id: 'n8',  type: 'TRIPS',      title: 'POD Confirmed',               message: 'Proof of delivery confirmed for trip TRP-051 (Mumbai → Pune)',                       deepLink: '/vendor/bookings/completed/TRP-051',  isRead: true,  createdAt: new Date(Date.now() - 8   * 3600 * 1000).toISOString() },
  { id: 'n9',  type: 'SOURCING',   title: 'Auction Awarded',             message: 'You won R1 allocation on AUC-009 – Mumbai → Nashik lane',                           deepLink: '/vendor/sourcing',                    isRead: true,  createdAt: new Date(Date.now() - 12  * 3600 * 1000).toISOString() },
  { id: 'n10', type: 'EXPENSES',   title: 'Expense Rejected',            message: 'Expense expense ₹850 for TRP-048 rejected. Missing receipt.',                          deepLink: '/vendor/expenses',                    isRead: false, createdAt: new Date(Date.now() - 24  * 3600 * 1000).toISOString() },
  { id: 'n11', type: 'CONTRACTS',  title: 'New Contract Available',      message: 'A new contract CNT-007 for Delhi → Jaipur is ready for review',                     deepLink: '/vendor/contracts',                   isRead: true,  createdAt: new Date(Date.now() - 36  * 3600 * 1000).toISOString() },
  { id: 'n12', type: 'INVOICES',   title: 'Invoice Approved',            message: 'Invoice INV-2026-024 approved. Payment due in 15 days.',                            deepLink: '/vendor/invoices/INV-2026-024',        isRead: true,  createdAt: new Date(Date.now() - 48  * 3600 * 1000).toISOString() },
  { id: 'n13', type: 'TRIPS',      title: 'Indent Expiring Soon',        message: 'Indent IND-008 expires in 2 hours. Accept or it will lapse.',                       deepLink: '/vendor/bookings?tab=new',             isRead: false, createdAt: new Date(Date.now() - 3   * 86400 * 1000).toISOString() },
  { id: 'n14', type: 'ONBOARDING', title: 'Document Verification Done',  message: 'Your GST and PAN documents have been verified successfully.',                       deepLink: '/vendor/profile/company',              isRead: true,  createdAt: new Date(Date.now() - 5   * 86400 * 1000).toISOString() },
]

export const MOCK_EXCEPTIONS: ExceptionRecord[] = [
  {
    id: 'EXC-2048',
    bookingId: 'TRP-045',
    route: 'Mumbai → Satara',
    vehicle: 'MH-12-AB-4421',
    driver: 'Suresh Yadav',
    issueType: 'Breakdown',
    severity: 'CRITICAL',
    status: 'OPEN',
    slaDueAt: '2026-05-06T12:45:00Z',
    createdAt: '2026-05-06T09:24:00Z',
    updatedAt: '2026-05-06T09:24:00Z',
    description: 'Truck stalled near Satara bypass and requires roadside support.',
    evidence: ['photo://breakdown-1', 'gps://satara-bypass'],
    timeline: [
      { id: 'exc-2048-1', action: 'Reported', notes: 'Driver raised a breakdown alert from the mobile app.', timestamp: '2026-05-06T09:24:00Z', by: 'Driver app' },
    ],
  },
  {
    id: 'EXC-1982',
    bookingId: 'TRP-043',
    route: 'Pune → Chennai',
    vehicle: 'MH-14-KK-1007',
    driver: 'Manoj Sharma',
    issueType: 'Delay',
    severity: 'HIGH',
    status: 'ACKNOWLEDGED',
    slaDueAt: '2026-05-06T14:30:00Z',
    createdAt: '2026-05-06T10:02:00Z',
    updatedAt: '2026-05-06T10:11:00Z',
    description: 'Vehicle is stuck at a toll queue and the ETA is slipping by more than 90 minutes.',
    evidence: ['gps://toll-plaza-delay'],
    timeline: [
      { id: 'exc-1982-1', action: 'Reported', notes: 'Operations received delay notification.', timestamp: '2026-05-06T10:02:00Z', by: 'Driver app' },
      { id: 'exc-1982-2', action: 'Acknowledged', notes: 'Control tower confirmed monitoring and requested live updates.', timestamp: '2026-05-06T10:11:00Z', by: 'Operations' },
    ],
  },
  {
    id: 'EXC-2011',
    bookingId: 'TRP-047',
    route: 'Delhi → Jaipur',
    vehicle: 'RJ-14-TR-7788',
    driver: 'Ramesh Singh',
    issueType: 'Route deviation',
    severity: 'MEDIUM',
    status: 'IN_PROGRESS',
    slaDueAt: '2026-05-06T16:10:00Z',
    createdAt: '2026-05-05T13:10:00Z',
    updatedAt: '2026-05-05T14:22:00Z',
    description: 'Driver exited the planned route to avoid congestion and needs route confirmation.',
    evidence: ['gps://route-snap'],
    timeline: [
      { id: 'exc-2011-1', action: 'Reported', notes: 'Route deviation flagged by live tracking.', timestamp: '2026-05-05T13:10:00Z', by: 'System' },
      { id: 'exc-2011-2', action: 'Acknowledged', notes: 'Trip owner reviewed the deviation and requested driver call-back.', timestamp: '2026-05-05T13:28:00Z', by: 'Operations' },
      { id: 'exc-2011-3', action: 'In Progress', notes: 'Alternate route and time update are being coordinated.', timestamp: '2026-05-05T14:22:00Z', by: 'Support' },
    ],
  },
  {
    id: 'EXC-1934',
    bookingId: 'TRP-041',
    route: 'Nashik → Bangalore',
    vehicle: 'KA-01-MN-5454',
    driver: 'Sandeep Patil',
    issueType: 'Accident',
    severity: 'CRITICAL',
    status: 'RESOLVED',
    slaDueAt: '2026-05-04T18:30:00Z',
    createdAt: '2026-05-04T16:40:00Z',
    updatedAt: '2026-05-04T17:15:00Z',
    description: 'Minor accident at highway turn; cargo inspected and trip restarted after assistance.',
    evidence: ['photo://accident-1', 'photo://cargo-check'],
    timeline: [
      { id: 'exc-1934-1', action: 'Reported', notes: 'Accident reported at highway turn.', timestamp: '2026-05-04T16:40:00Z', by: 'Driver app' },
      { id: 'exc-1934-2', action: 'Acknowledged', notes: 'Support team contacted roadside help and informed customer.', timestamp: '2026-05-04T16:48:00Z', by: 'Operations' },
      { id: 'exc-1934-3', action: 'In Progress', notes: 'Cargo inspection and replacement coordination in motion.', timestamp: '2026-05-04T16:58:00Z', by: 'Support' },
      { id: 'exc-1934-4', action: 'Resolved', notes: 'Vehicle resumed trip after replacement support arrived.', timestamp: '2026-05-04T17:15:00Z', by: 'Operations' },
    ],
  },
  {
    id: 'EXC-1888',
    bookingId: 'TRP-039',
    route: 'Kolkata → Guwahati',
    vehicle: 'WB-02-PT-2201',
    driver: 'Imran Ali',
    issueType: 'Delay',
    severity: 'HIGH',
    status: 'CLOSED',
    slaDueAt: '2026-05-03T15:10:00Z',
    createdAt: '2026-05-03T11:20:00Z',
    updatedAt: '2026-05-03T15:30:00Z',
    description: 'Rain-related delay was resolved after detour approval and customer sign-off.',
    evidence: ['gps://weather-delay'],
    timeline: [
      { id: 'exc-1888-1', action: 'Reported', notes: 'Weather delay detected on route.', timestamp: '2026-05-03T11:20:00Z', by: 'System' },
      { id: 'exc-1888-2', action: 'Acknowledged', notes: 'Support confirmed delay and informed the destination team.', timestamp: '2026-05-03T11:44:00Z', by: 'Operations' },
      { id: 'exc-1888-3', action: 'Resolved', notes: 'Detour approved and delivery completed.', timestamp: '2026-05-03T15:05:00Z', by: 'Operations' },
      { id: 'exc-1888-4', action: 'Closed', notes: 'Customer accepted the resolution and case was closed.', timestamp: '2026-05-03T15:30:00Z', by: 'Support' },
    ],
  },
]



export const MOCK_AUCTIONS: Auction[] = [
  {
    id: 'AUC-012', type: 'BULK', customerName: 'Asian Paints', state: 'LIVE', pricingUnit: 'PER_MT',
    lanes: [
      {
        id: 'L1',
        laneDetails: { origin: { name: 'Ankleshwar Plant', city: 'Bharuch', state: 'Gujarat' }, destination: { name: 'Bangalore DC', city: 'Bangalore', state: 'Karnataka' }, distanceKm: 1200 },
        volumeRequirement: { estimatedVolume: 50, unit: 'trucks/month', frequency: 'MONTHLY' },
        basePrice: 28000,
        currentBestBid: 25000,
        minBidDecrement: 500
      },
      {
        id: 'L2',
        laneDetails: { origin: { name: 'Ankleshwar Plant', city: 'Bharuch', state: 'Gujarat' }, destination: { name: 'Chennai Hub', city: 'Chennai', state: 'Tamil Nadu' }, distanceKm: 1450 },
        volumeRequirement: { estimatedVolume: 20, unit: 'trucks/month', frequency: 'MONTHLY' },
        basePrice: 34000,
        currentBestBid: 31000,
        minBidDecrement: 500
      }
    ],
    vehicleTypeRequired: '32ft Container', startTime: new Date(Date.now() - 1800000).toISOString(), endTime: new Date(Date.now() + 5400000).toISOString(),
    vendorBids: [], createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 'AUC-011', type: 'SPOT', customerName: 'ITC Limited', state: 'LIVE', pricingUnit: 'PER_TRIP',
    lanes: [{
      id: 'L1',
      laneDetails: { origin: { name: 'Munger Factory', city: 'Munger', state: 'Bihar' }, destination: { name: 'Kolkata Depot', city: 'Kolkata', state: 'West Bengal' }, distanceKm: 320 },
      basePrice: 21000,
      currentBestBid: 18500,
      minBidDecrement: 200
    }],
    vehicleTypeRequired: 'LCV', startTime: new Date(Date.now() - 3600000).toISOString(), endTime: new Date(Date.now() + 7200000).toISOString(),
    vendorBids: [
      { id: 'b1', laneId: 'L1', amount: 22000, placedAt: new Date(Date.now() - 1800000).toISOString(), status: 'SUPERSEDED' },
      { id: 'b2', laneId: 'L1', amount: 19500, placedAt: new Date(Date.now() - 900000).toISOString(), status: 'ACTIVE' },
    ],
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
  },
  {
    id: 'AUC-013', type: 'LOT', customerName: 'Reliance Retail', state: 'LIVE', pricingUnit: 'PER_TRIP',
    lanes: [
      {
        id: 'L1',
        laneDetails: { origin: { name: 'Bhiwandi', city: 'Mumbai', state: 'MH' }, destination: { name: 'Pune', city: 'Pune', state: 'MH' }, distanceKm: 150 },
        volumeRequirement: { estimatedVolume: 100, unit: 'trucks', frequency: 'MONTHLY' },
        basePrice: 15000,
        currentBestBid: 12000,
        minBidDecrement: 500
      },
      {
        id: 'L2',
        laneDetails: { origin: { name: 'Bhiwandi', city: 'Mumbai', state: 'MH' }, destination: { name: 'Nashik', city: 'Nashik', state: 'MH' }, distanceKm: 165 },
        volumeRequirement: { estimatedVolume: 80, unit: 'trucks', frequency: 'MONTHLY' },
        basePrice: 16500,
        currentBestBid: 13500,
        minBidDecrement: 500
      }
    ],
    vehicleTypeRequired: '20ft Container', startTime: new Date(Date.now() - 3600000).toISOString(), endTime: new Date(Date.now() + 7200000).toISOString(),
    vendorBids: [
      { id: 'b3', laneId: 'L1', amount: 12500, placedAt: new Date().toISOString(), status: 'SUPERSEDED' },
      { id: 'b4', laneId: 'L2', amount: 14000, placedAt: new Date().toISOString(), status: 'SUPERSEDED' },
    ],
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 'AUC-014', type: 'SPOT', customerName: 'Tata Motors', state: 'UPCOMING', pricingUnit: 'PER_KM',
    lanes: [{
      id: 'L1',
      laneDetails: { origin: { name: 'Pune Plant', city: 'Pune', state: 'MH' }, destination: { name: 'Lucknow', city: 'Lucknow', state: 'UP' }, distanceKm: 1350 },
      basePrice: 22000,
      minBidDecrement: 500
    }],
    vehicleTypeRequired: 'Car Carrier', startTime: new Date(Date.now() + 86400000).toISOString(), endTime: new Date(Date.now() + 172800000).toISOString(),
    vendorBids: [], createdAt: new Date().toISOString(),
  },
  {
    id: 'AUC-015', type: 'BULK', customerName: 'Nestle India', state: 'PENDING_AWARD', pricingUnit: 'PER_MT',
    lanes: [{
      id: 'L1',
      laneDetails: { origin: { name: 'Moga Factory', city: 'Moga', state: 'PB' }, destination: { name: 'Delhi', city: 'Delhi', state: 'DL' }, distanceKm: 400 },
      basePrice: 1800,
      currentBestBid: 1500,
      minBidDecrement: 50
    }],
    vehicleTypeRequired: '20ft Container', startTime: new Date(Date.now() - 172800000).toISOString(), endTime: new Date(Date.now() - 86400000).toISOString(),
    vendorBids: [{ id: 'b5', laneId: 'L1', amount: 1500, placedAt: new Date(Date.now() - 90000000).toISOString(), status: 'ACTIVE' }],
    createdAt: new Date(Date.now() - 259200000).toISOString(),
  },
  {
    id: 'AUC-016', type: 'SPOT', customerName: 'Mahindra Logistics', state: 'AWARDED', pricingUnit: 'PER_KM',
    lanes: [{
      id: 'L1',
      laneDetails: { origin: { name: 'Chakan Plant', city: 'Pune', state: 'MH' }, destination: { name: 'Nagpur Hub', city: 'Nagpur', state: 'MH' }, distanceKm: 700 },
      basePrice: 18500,
      currentBestBid: 16500,
      minBidDecrement: 250
    }],
    vehicleTypeRequired: '20ft Container', startTime: new Date(Date.now() - 259200000).toISOString(), endTime: new Date(Date.now() - 172800000).toISOString(),
    awardDate: new Date(Date.now() - 86400000).toISOString(),
    contractReference: 'CNT-008 / MAHINDRA',
    vendorBids: [{ id: 'b6', laneId: 'L1', amount: 16500, placedAt: new Date(Date.now() - 200000000).toISOString(), status: 'ACTIVE' }],
    createdAt: new Date(Date.now() - 345600000).toISOString(),
  },
  {
    id: 'AUC-017', type: 'LOT', customerName: 'Adani Ports', state: 'NOT_AWARDED', pricingUnit: 'PER_TRIP',
    lanes: [{
      id: 'L1',
      laneDetails: { origin: { name: 'Mundra Port', city: 'Mundra', state: 'GJ' }, destination: { name: 'Ahmedabad DC', city: 'Ahmedabad', state: 'GJ' }, distanceKm: 320 },
      basePrice: 11000,
      currentBestBid: 9800,
      minBidDecrement: 100
    }],
    vehicleTypeRequired: '32ft Container', startTime: new Date(Date.now() - 432000000).toISOString(), endTime: new Date(Date.now() - 345600000).toISOString(),
    vendorBids: [],
    createdAt: new Date(Date.now() - 432000000).toISOString(),
  },
  {
    id: 'AUC-019', type: 'SPOT', customerName: 'Bharat Petroleum', state: 'NOT_PARTICIPATED', pricingUnit: 'PER_KM',
    lanes: [{
      id: 'L1',
      laneDetails: { origin: { name: 'Refinery', city: 'Mumbai', state: 'MH' }, destination: { name: 'Depot', city: 'Ahmedabad', state: 'GJ' }, distanceKm: 530 },
      basePrice: 12500,
      minBidDecrement: 100
    }],
    vehicleTypeRequired: '32ft Container', startTime: new Date(Date.now() - 259200000).toISOString(), endTime: new Date(Date.now() - 172800000).toISOString(),
    vendorBids: [],
    createdAt: new Date(Date.now() - 302400000).toISOString(),
  },
  {
    id: 'AUC-018', type: 'SPOT', customerName: 'Blue Dart', state: 'CANCELLED', pricingUnit: 'PER_KM',
    lanes: [{
      id: 'L1',
      laneDetails: { origin: { name: 'Mumbai Hub', city: 'Mumbai', state: 'MH' }, destination: { name: 'Surat DC', city: 'Surat', state: 'GJ' }, distanceKm: 280 },
      basePrice: 14000,
      minBidDecrement: 100
    }],
    vehicleTypeRequired: 'LCV', startTime: new Date(Date.now() - 86400000).toISOString(), endTime: new Date(Date.now() - 43200000).toISOString(),
    vendorBids: [],
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  }
]

export const MOCK_CONTRACTS: Contract[] = [
  {
    id: 'CNT-001', customerName: 'Hindustan Unilever', customerGSTIN: '27AABCU9603R1ZM', status: 'ACTIVE',
    laneDetails: { origin: { name: 'Mumbai Port', city: 'Mumbai', state: 'Maharashtra' }, destination: { name: 'Delhi NCR Hub', city: 'Delhi', state: 'Delhi' }, distanceKm: 1420 },
    rateCard: [{ vehicleType: '20ft Container', rateType: 'PER_TRIP', rate: 45000, surcharges: [{ name: 'Fuel Surcharge', amount: 2000 }] }],
    volumeAllocation: { volume: 50, unit: 'trucks', frequency: 'Monthly' },
    paymentTerms: { creditPeriodDays: 30, billingCycle: 'MONTHLY' },
    slaClauses: [{ name: 'Placement SLA', valueHours: 4, description: 'Vehicle must report within 4 hours of acceptance' }],
    penaltyClauses: [{ breachType: 'Late Placement', penaltyType: 'FIXED', penaltyValue: 5000, description: 'Per late placement event' }],
    validityFrom: '2026-01-01', validityTo: '2026-12-31', renewalTerms: 'Auto-renew unless 30-day notice',
    amendments: [], signedAt: '2026-01-05T10:30:00Z', pdfUrl: '/contracts/CNT-001.pdf', createdAt: '2025-12-20T14:00:00Z',
  },
  {
    id: 'CNT-005', customerName: 'Tata Steel Ltd.', customerGSTIN: '20AABCT1234D1ZP', status: 'DRAFT',
    laneDetails: { origin: { name: 'Jamshedpur Plant', city: 'Jamshedpur', state: 'Jharkhand' }, destination: { name: 'Haldia Port', city: 'Haldia', state: 'West Bengal' }, distanceKm: 280 },
    rateCard: [{ vehicleType: 'Flatbed', rateType: 'PER_TRIP', rate: 28000, surcharges: [] }],
    volumeAllocation: { volume: 30, unit: 'trucks', frequency: 'Monthly' },
    paymentTerms: { creditPeriodDays: 45, billingCycle: 'MONTHLY' },
    slaClauses: [{ name: 'Placement SLA', valueHours: 6, description: 'Vehicle must report within 6 hours' }],
    penaltyClauses: [{ breachType: 'Missed Placement', penaltyType: 'PERCENTAGE', penaltyValue: 10, description: '10% of freight rate' }],
    validityFrom: '2026-04-01', validityTo: '2027-03-31', renewalTerms: 'Manual renewal',
    amendments: [], pdfUrl: '/contracts/CNT-005.pdf', createdAt: '2026-04-20T09:00:00Z',
  },
  {
    id: 'CNT-003', customerName: 'Godrej Consumer', customerGSTIN: '27AABCU9603R1ZA', status: 'EXPIRED',
    laneDetails: { origin: { name: 'Vikhroli', city: 'Mumbai', state: 'MH' }, destination: { name: 'Surat Hub', city: 'Surat', state: 'GJ' }, distanceKm: 280 },
    rateCard: [{ vehicleType: 'LCV', rateType: 'PER_TRIP', rate: 12000, surcharges: [] }],
    volumeAllocation: { volume: 20, unit: 'trucks', frequency: 'Monthly' },
    paymentTerms: { creditPeriodDays: 30, billingCycle: 'MONTHLY' },
    slaClauses: [], penaltyClauses: [],
    validityFrom: '2025-01-01', validityTo: '2025-12-31', renewalTerms: 'None',
    amendments: [], signedAt: '2025-01-02T10:00:00Z', pdfUrl: '/contracts/CNT-003.pdf', createdAt: '2024-12-15T09:00:00Z',
  },
]

export const MOCK_INDENTS: Indent[] = [
  {
    id: 'IND-001', contractId: 'CNT-001', contractReference: 'CNT-001 / HUL', status: 'PENDING',
    laneDetails: { origin: { name: 'Mumbai Port', city: 'Mumbai', state: 'Maharashtra' }, destination: { name: 'Delhi NCR Hub', city: 'Delhi', state: 'Delhi' }, distanceKm: 1420 },
    loadDetails: { commodity: 'FMCG Goods', weightKg: 18000, volumeCbm: 32 },
    vehicleTypeRequired: '20ft Container', reportingDateTime: '2026-04-26T06:00:00Z',
    slaDeadline: new Date(Date.now() + 3600000).toISOString(), createdAt: new Date(Date.now() - 1800000).toISOString(),
  },
  {
    id: 'IND-002', contractId: 'CNT-002', contractReference: 'CNT-002 / RELIANCE', status: 'PENDING',
    laneDetails: { origin: { name: 'Pune Plant', city: 'Pune', state: 'Maharashtra' }, destination: { name: 'Chennai DC', city: 'Chennai', state: 'Tamil Nadu' }, distanceKm: 1200 },
    loadDetails: { commodity: 'Electronics', weightKg: 12000, volumeCbm: 40 },
    vehicleTypeRequired: 'Flatbed', reportingDateTime: '2026-04-27T08:00:00Z',
    slaDeadline: new Date(Date.now() + 7200000).toISOString(), createdAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 'IND-003', contractId: 'CNT-001', contractReference: 'CNT-001 / HUL', status: 'PENDING',
    laneDetails: { origin: { name: 'Delhi Warehouse', city: 'Delhi', state: 'Delhi' }, destination: { name: 'Jaipur Hub', city: 'Jaipur', state: 'Rajasthan' }, distanceKm: 280 },
    loadDetails: { commodity: 'FMCG Goods', weightKg: 5000, volumeCbm: 15 },
    vehicleTypeRequired: 'LCV', reportingDateTime: '2026-04-28T10:00:00Z',
    slaDeadline: new Date(Date.now() + 14400000).toISOString(), createdAt: new Date(Date.now() - 7200000).toISOString(),
  },
  {
    id: 'IND-004', contractId: 'CNT-001', contractReference: 'CNT-001 / HUL', status: 'DECLINED',
    laneDetails: { origin: { name: 'Mumbai Port', city: 'Mumbai', state: 'MH' }, destination: { name: 'Nagpur', city: 'Nagpur', state: 'MH' }, distanceKm: 800 },
    loadDetails: { commodity: 'FMCG Goods', weightKg: 10000, volumeCbm: 20 },
    vehicleTypeRequired: '20ft Container', reportingDateTime: '2026-04-25T06:00:00Z',
    slaDeadline: new Date(Date.now() - 3600000).toISOString(), createdAt: new Date(Date.now() - 86400000).toISOString(),
    rejectionReason: 'Vehicle availability not aligned with required dispatch window',
  },
  {
    id: 'IND-005', contractId: 'CNT-001', contractReference: 'CNT-001 / HUL', status: 'ACCEPTED',
    laneDetails: { origin: { name: 'Mumbai', city: 'Mumbai', state: 'MH' }, destination: { name: 'Pune', city: 'Pune', state: 'MH' }, distanceKm: 150 },
    loadDetails: { commodity: 'Goods', weightKg: 5000, volumeCbm: 10 },
    vehicleTypeRequired: 'LCV', reportingDateTime: '2026-04-26T12:00:00Z',
    slaDeadline: new Date(Date.now() + 3600000).toISOString(), createdAt: new Date(Date.now() - 3600000).toISOString(),
    assignedVehicleId: 'VH-001',
    assignedDriverId: 'DR-001',
  }
]

export const MOCK_TRIPS: Trip[] = [
  {
    id: 'TRP-060', contractId: 'CNT-001', indentId: 'IND-110', status: 'ACCEPTED',
    laneDetails: { origin: { name: 'Mumbai Port', city: 'Mumbai', state: 'Maharashtra' }, destination: { name: 'Hyderabad Hub', city: 'Hyderabad', state: 'Telangana' }, distanceKm: 710 },
    assignedVehicle: { id: 'VH-001', registrationNumber: 'MH-04-AB-1234', type: '20ft Container' },
    assignedDriver: { id: 'DR-001', name: 'Suresh Yadav', mobile: '+91 9876500001' },
    documents: [],
    timeline: [
      { id: 'tt-60a', title: 'Accepted', description: 'Vendor accepted booking, awaiting vehicle assignment', timestamp: new Date(Date.now() - 900000).toISOString(), status: 'ACCEPTED' },
    ],
    freightRate: 38000, slaFlag: 'ON_TIME', expenseSummary: { total: 0, approved: 0, pending: 0 }, isInvoiced: false,
    createdAt: new Date(Date.now() - 900000).toISOString(),
  },
  {
    id: 'TRP-050', contractId: 'CNT-001', indentId: 'IND-104', status: 'ASSIGNED',
    laneDetails: { origin: { name: 'Mumbai Port', city: 'Mumbai', state: 'Maharashtra' }, destination: { name: 'Hyderabad Hub', city: 'Hyderabad', state: 'Telangana' }, distanceKm: 710 },
    assignedVehicle: { id: 'VH-001', registrationNumber: 'MH-04-AB-1234', type: '20ft Container' },
    assignedDriver: { id: 'DR-001', name: 'Suresh Yadav', mobile: '+91 9876500001' },
    documents: [],
    timeline: [
      { id: 'tt-50a', title: 'Accepted', description: 'Vendor accepted booking', timestamp: new Date(Date.now() - 3600000).toISOString(), status: 'ACCEPTED' },
      { id: 'tt-50b', title: 'Assigned', description: 'Vehicle and driver assigned, LR generated', timestamp: new Date(Date.now() - 1800000).toISOString(), status: 'ASSIGNED' },
    ],
    freightRate: 38000, slaFlag: 'ON_TIME', expenseSummary: { total: 0, approved: 0, pending: 0 }, isInvoiced: false,
    createdAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 'TRP-051', contractId: 'CNT-002', indentId: 'IND-105', status: 'OUT_FOR_PICKUP',
    laneDetails: { origin: { name: 'Pune Yard', city: 'Pune', state: 'Maharashtra' }, destination: { name: 'Ahmedabad DC', city: 'Ahmedabad', state: 'Gujarat' }, distanceKm: 660 },
    assignedVehicle: { id: 'VH-002', registrationNumber: 'MH-04-CD-5678', type: '20ft Container' },
    assignedDriver: { id: 'DR-002', name: 'Manoj Sharma', mobile: '+91 9876500002' },
    documents: [],
    timeline: [
      { id: 'tt-51a', title: 'Assigned', description: 'Vehicle assigned', timestamp: new Date(Date.now() - 7200000).toISOString(), status: 'ASSIGNED' },
      { id: 'tt-51b', title: 'Out for Pickup', description: 'Driver started movement toward pickup', timestamp: new Date(Date.now() - 3600000).toISOString(), status: 'OUT_FOR_PICKUP' },
    ],
    freightRate: 42000, slaFlag: 'ON_TIME', expenseSummary: { total: 0, approved: 0, pending: 0 }, isInvoiced: false,
    createdAt: new Date(Date.now() - 7200000).toISOString(),
  },
  {
    id: 'TRP-061', contractId: 'CNT-001', indentId: 'IND-111', status: 'PICKUP_REACHED',
    laneDetails: { origin: { name: 'Nashik Yard', city: 'Nashik', state: 'Maharashtra' }, destination: { name: 'Indore DC', city: 'Indore', state: 'Madhya Pradesh' }, distanceKm: 540 },
    assignedVehicle: { id: 'VH-004', registrationNumber: 'MH-12-PZ-1010', type: 'LCV' },
    assignedDriver: { id: 'DR-003', name: 'Ramesh Singh', mobile: '+91 9876500003' },
    documents: [],
    timeline: [
      { id: 'tt-61a', title: 'Assigned', description: 'Vehicle assigned', timestamp: new Date(Date.now() - 14400000).toISOString(), status: 'ASSIGNED' },
      { id: 'tt-61b', title: 'Out for Pickup', description: 'Driver moving to pickup', timestamp: new Date(Date.now() - 10800000).toISOString(), status: 'OUT_FOR_PICKUP' },
      { id: 'tt-61c', title: 'Pickup Reached', description: 'Vehicle entered pickup geofence', timestamp: new Date(Date.now() - 1800000).toISOString(), status: 'PICKUP_REACHED' },
    ],
    freightRate: 31000, slaFlag: 'ON_TIME', expenseSummary: { total: 0, approved: 0, pending: 0 }, isInvoiced: false,
    createdAt: new Date(Date.now() - 14400000).toISOString(),
  },
  {
    id: 'TRP-052', contractId: 'CNT-001', indentId: 'IND-106', status: 'LOADING_STARTED',
    laneDetails: { origin: { name: 'Nashik Yard', city: 'Nashik', state: 'Maharashtra' }, destination: { name: 'Indore DC', city: 'Indore', state: 'Madhya Pradesh' }, distanceKm: 540 },
    assignedVehicle: { id: 'VH-004', registrationNumber: 'MH-12-PZ-1010', type: 'LCV' },
    assignedDriver: { id: 'DR-003', name: 'Ramesh Singh', mobile: '+91 9876500003' },
    documents: [],
    timeline: [
      { id: 'tt-52a', title: 'Assigned', description: 'Vehicle assigned', timestamp: new Date(Date.now() - 14400000).toISOString(), status: 'ASSIGNED' },
      { id: 'tt-52b', title: 'Pickup Reached', description: 'Reached pickup location', timestamp: new Date(Date.now() - 7200000).toISOString(), status: 'PICKUP_REACHED' },
      { id: 'tt-52c', title: 'Loading Started', description: 'Loading started at pickup', timestamp: new Date(Date.now() - 1800000).toISOString(), status: 'LOADING_STARTED' },
    ],
    freightRate: 31000, slaFlag: 'ON_TIME', expenseSummary: { total: 0, approved: 0, pending: 0 }, isInvoiced: false,
    createdAt: new Date(Date.now() - 14400000).toISOString(),
  },
  {
    id: 'TRP-062', contractId: 'CNT-002', indentId: 'IND-112', status: 'LOADING_COMPLETED',
    laneDetails: { origin: { name: 'Surat Hub', city: 'Surat', state: 'Gujarat' }, destination: { name: 'Mumbai DC', city: 'Mumbai', state: 'Maharashtra' }, distanceKm: 290 },
    assignedVehicle: { id: 'VH-003', registrationNumber: 'GJ-01-XY-9999', type: 'Tanker' },
    assignedDriver: { id: 'DR-002', name: 'Manoj Sharma', mobile: '+91 9876500002' },
    documents: [],
    timeline: [
      { id: 'tt-62a', title: 'Loading Started', description: 'Loading underway', timestamp: new Date(Date.now() - 10800000).toISOString(), status: 'LOADING_STARTED' },
      { id: 'tt-62b', title: 'Loading Completed', description: 'Loading completed; awaiting invoice + e-way bill + LR', timestamp: new Date(Date.now() - 1800000).toISOString(), status: 'LOADING_COMPLETED' },
    ],
    freightRate: 22000, slaFlag: 'ON_TIME', expenseSummary: { total: 0, approved: 0, pending: 0 }, isInvoiced: false,
    createdAt: new Date(Date.now() - 21600000).toISOString(),
  },
  {
    id: 'TRP-044', contractId: 'CNT-001', indentId: 'IND-098', status: 'IN_TRANSIT',
    laneDetails: { origin: { name: 'Mumbai Port', city: 'Mumbai', state: 'Maharashtra' }, destination: { name: 'Delhi NCR Hub', city: 'Delhi', state: 'Delhi' }, distanceKm: 1420 },
    assignedVehicle: { id: 'VH-001', registrationNumber: 'MH-04-AB-1234', type: '20ft Container' },
    assignedDriver: { id: 'DR-001', name: 'Suresh Yadav', mobile: '+91 9876500001' },
    documents: [
      { id: 'td-1', type: 'POD_COPY', title: 'POD copy', fileName: 'pod-trp-044.pdf', fileUrl: '/docs/pod-trp-044.pdf', createdAt: '2026-04-22T16:30:00Z', note: 'Awaiting driver upload' },
      { id: 'td-2', type: 'EWAY_BILL', title: 'E-way bill copy', fileName: 'ewaybill-trp-044.pdf', fileUrl: '/docs/ewaybill-trp-044.pdf', createdAt: '2026-04-22T08:30:00Z' },
    ],
    timeline: [
      { id: 'tt-1', title: 'Assigned', description: 'Vehicle and driver assigned', timestamp: '2026-04-22T08:05:00Z', status: 'ASSIGNED' },
      { id: 'tt-2', title: 'In Transit', description: 'Truck is en route to destination', timestamp: '2026-04-22T11:30:00Z', status: 'IN_TRANSIT' },
    ],
    freightRate: 45000, slaFlag: 'ON_TIME', expenseSummary: { total: 0, approved: 0, pending: 0 }, isInvoiced: false,
    createdAt: '2026-04-22T08:00:00Z',
  },
  {
    id: 'TRP-042', contractId: 'CNT-002', indentId: 'IND-096', status: 'IN_TRANSIT',
    laneDetails: { origin: { name: 'Pune', city: 'Pune', state: 'MH' }, destination: { name: 'Chennai', city: 'Chennai', state: 'TN' }, distanceKm: 1200 },
    assignedVehicle: { id: 'VH-001', registrationNumber: 'MH-04-AB-1234', type: '20ft Container' },
    assignedDriver: { id: 'DR-001', name: 'Suresh Yadav', mobile: '+91 9876500001' },
    documents: [
      { id: 'td-6', type: 'EWAY_BILL', title: 'E-way bill copy', fileName: 'ewaybill-trp-042.pdf', fileUrl: '/docs/ewaybill-trp-042.pdf', createdAt: '2026-04-22T09:30:00Z' },
    ],
    timeline: [
      { id: 'tt-5', title: 'In Transit', description: 'Loaded and dispatched from Pune yard', timestamp: '2026-04-22T10:00:00Z', status: 'IN_TRANSIT' },
    ],
    freightRate: 65000, slaFlag: 'ON_TIME', expenseSummary: { total: 0, approved: 0, pending: 0 }, isInvoiced: false,
    createdAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 'TRP-045', contractId: 'CNT-002', indentId: 'IND-099', status: 'IN_TRANSIT', exceptionFlag: true,
    disruption: { reason: 'DRIVER_BREAKDOWN', reportedAt: '2026-04-26T13:00:00Z', notes: 'Driver fell ill at unloading point; awaiting replacement.' },
    laneDetails: { origin: { name: 'Chennai', city: 'Chennai', state: 'TN' }, destination: { name: 'Bangalore', city: 'Bangalore', state: 'KA' }, distanceKm: 350 },
    assignedVehicle: { id: 'VH-002', registrationNumber: 'MH-04-CD-5678', type: '20ft Container' },
    assignedDriver: { id: 'DR-002', name: 'Manoj Sharma', mobile: '+91 9876500002' },
    documents: [
      { id: 'td-9', type: 'REMARKS', title: 'Remarks', fileName: 'remarks-trp-045.json', fileUrl: '/docs/remarks-trp-045.json', createdAt: '2026-04-26T11:00:00Z', note: 'Exception report available' },
    ],
    timeline: [
      { id: 'tt-7', title: 'Disruption reported', description: 'Driver breakdown at unloading point', timestamp: '2026-04-26T13:00:00Z', status: 'IN_TRANSIT' },
    ],
    freightRate: 15000, slaFlag: 'DELAYED', expenseSummary: { total: 0, approved: 0, pending: 0 }, isInvoiced: false,
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 'TRP-048', contractId: 'CNT-002', indentId: 'IND-102', status: 'IN_TRANSIT', exceptionFlag: true,
    disruption: { reason: 'VEHICLE_BREAKDOWN', reportedAt: '2026-04-27T12:00:00Z', notes: 'Engine failure 60km before destination — vehicle replacement required.' },
    laneDetails: { origin: { name: 'Chennai Port', city: 'Chennai', state: 'Tamil Nadu' }, destination: { name: 'Bangalore Hub', city: 'Bangalore', state: 'Karnataka' }, distanceKm: 350 },
    assignedVehicle: { id: 'VH-001', registrationNumber: 'MH-04-AB-1234', type: '20ft Container' },
    assignedDriver: { id: 'DR-001', name: 'Suresh Yadav', mobile: '+91 9876500001' },
    documents: [
      { id: 'td-13', type: 'REMARKS', title: 'Disruption remarks', fileName: 'disrupted-trp-048.json', fileUrl: '/docs/disrupted-trp-048.json', createdAt: '2026-04-27T12:00:00Z', note: 'Route disruption due to road closure' },
    ],
    timeline: [
      { id: 'tt-10', title: 'Disrupted', description: 'Vehicle breakdown during transit', timestamp: '2026-04-27T12:00:00Z', status: 'IN_TRANSIT' },
    ],
    freightRate: 18000, slaFlag: 'DELAYED', expenseSummary: { total: 0, approved: 0, pending: 0 }, isInvoiced: false,
    createdAt: '2026-04-26T08:00:00Z',
  },
  {
    id: 'TRP-049', contractId: 'CNT-001', indentId: 'IND-103', status: 'IN_TRANSIT', exceptionFlag: true,
    disruption: { reason: 'VEHICLE_OR_DRIVER_BREAKDOWN', reportedAt: '2026-04-28T07:30:00Z', notes: 'Reported mechanical issue and driver fatigue; both replacements requested.' },
    laneDetails: { origin: { name: 'Hyderabad Yard', city: 'Hyderabad', state: 'Telangana' }, destination: { name: 'Pune DC', city: 'Pune', state: 'Maharashtra' }, distanceKm: 560 },
    assignedVehicle: { id: 'VH-004', registrationNumber: 'MH-12-PZ-1010', type: 'LCV' },
    assignedDriver: { id: 'DR-003', name: 'Ramesh Singh', mobile: '+91 9876500003' },
    documents: [],
    timeline: [
      { id: 'tt-11', title: 'Disrupted', description: 'Vehicle and driver replacement requested', timestamp: '2026-04-28T07:30:00Z', status: 'IN_TRANSIT' },
    ],
    freightRate: 24000, slaFlag: 'ON_TIME', expenseSummary: { total: 0, approved: 0, pending: 0 }, isInvoiced: false,
    createdAt: '2026-04-27T18:00:00Z',
  },
  {
    id: 'TRP-063', contractId: 'CNT-001', indentId: 'IND-113', status: 'DESTINATION_REACHED',
    laneDetails: { origin: { name: 'Mumbai Port', city: 'Mumbai', state: 'Maharashtra' }, destination: { name: 'Bangalore Hub', city: 'Bangalore', state: 'Karnataka' }, distanceKm: 980 },
    assignedVehicle: { id: 'VH-002', registrationNumber: 'MH-04-CD-5678', type: '20ft Container' },
    assignedDriver: { id: 'DR-002', name: 'Manoj Sharma', mobile: '+91 9876500002' },
    documents: [
      { id: 'td-16', type: 'EWAY_BILL', title: 'E-way bill copy', fileName: 'ewaybill-trp-063.pdf', fileUrl: '/docs/ewaybill-trp-063.pdf', createdAt: '2026-05-18T07:00:00Z' },
    ],
    timeline: [
      { id: 'tt-63a', title: 'In Transit', description: 'Dispatched from origin', timestamp: '2026-05-18T07:00:00Z', status: 'IN_TRANSIT' },
      { id: 'tt-63b', title: 'Destination Reached', description: 'Vehicle entered delivery geofence', timestamp: new Date(Date.now() - 900000).toISOString(), status: 'DESTINATION_REACHED' },
    ],
    freightRate: 52000, slaFlag: 'ON_TIME', expenseSummary: { total: 0, approved: 0, pending: 0 }, isInvoiced: false,
    createdAt: '2026-05-18T06:30:00Z',
  },
  {
    id: 'TRP-053', contractId: 'CNT-002', indentId: 'IND-104', status: 'POD_PENDING',
    laneDetails: { origin: { name: 'Nagpur', city: 'Nagpur', state: 'Maharashtra' }, destination: { name: 'Indore', city: 'Indore', state: 'Madhya Pradesh' }, distanceKm: 450 },
    assignedVehicle: { id: 'VH-001', registrationNumber: 'MH-04-AB-1234', type: '20ft Container' },
    assignedDriver: { id: 'DR-001', name: 'Suresh Yadav', mobile: '+91 9876500001' },
    deliveredDate: '2026-05-17T17:30:00Z', podStatus: 'PENDING',
    documents: [
      { id: 'td-14', type: 'REMARKS', title: 'Delivery note', fileName: 'delivery-note-trp-053.txt', fileUrl: '/docs/delivery-note-trp-053.txt', createdAt: '2026-05-17T18:00:00Z', note: 'Awaiting consignee POD upload' },
    ],
    timeline: [
      { id: 'tt-12', title: 'Destination Reached', description: 'Reached delivery location', timestamp: '2026-05-17T16:30:00Z', status: 'DESTINATION_REACHED' },
      { id: 'tt-12b', title: 'POD Pending', description: 'Delivery handed over; POD pending from destination team', timestamp: '2026-05-17T17:30:00Z', status: 'POD_PENDING' },
    ],
    freightRate: 36000, slaFlag: 'ON_TIME', expenseSummary: { total: 0, approved: 0, pending: 0 }, isInvoiced: false,
    createdAt: '2026-05-16T08:30:00Z',
  },
  {
    id: 'TRP-046', contractId: 'CNT-001', indentId: 'IND-100', status: 'POD_PENDING',
    laneDetails: { origin: { name: 'Navi Mumbai Yard', city: 'Navi Mumbai', state: 'Maharashtra' }, destination: { name: 'Jaipur DC', city: 'Jaipur', state: 'Rajasthan' }, distanceKm: 1150 },
    assignedVehicle: { id: 'VH-004', registrationNumber: 'MH-12-PZ-1010', type: 'LCV' },
    assignedDriver: { id: 'DR-003', name: 'Ramesh Singh', mobile: '+91 9876500003' },
    deliveredDate: '2026-04-26T09:00:00Z', podStatus: 'PENDING',
    documents: [
      { id: 'td-10', type: 'POD_COPY', title: 'POD copy', fileName: 'pod-trp-046.pdf', fileUrl: '/docs/pod-trp-046.pdf', createdAt: '2026-04-26T09:15:00Z', note: 'POD pending upload from consignee' },
      { id: 'td-11', type: 'EWAY_BILL', title: 'E-way bill copy', fileName: 'ewaybill-trp-046.pdf', fileUrl: '/docs/ewaybill-trp-046.pdf', createdAt: '2026-04-25T07:00:00Z' },
    ],
    timeline: [
      { id: 'tt-8', title: 'POD Pending', description: 'Delivery handed over; awaiting POD', timestamp: '2026-04-26T09:00:00Z', status: 'POD_PENDING' },
    ],
    freightRate: 32000, slaFlag: 'ON_TIME', expenseSummary: { total: 1400, approved: 0, pending: 1400 }, isInvoiced: false,
    createdAt: '2026-04-25T06:00:00Z',
  },
  {
    id: 'TRP-043', contractId: 'CNT-001', indentId: 'IND-097', status: 'COMPLETED',
    laneDetails: { origin: { name: 'Mumbai Port', city: 'Mumbai', state: 'Maharashtra' }, destination: { name: 'Delhi NCR Hub', city: 'Delhi', state: 'Delhi' }, distanceKm: 1420 },
    assignedVehicle: { id: 'VH-002', registrationNumber: 'MH-04-CD-5678', type: '20ft Container' },
    assignedDriver: { id: 'DR-002', name: 'Manoj Sharma', mobile: '+91 9876500002' },
    deliveredDate: '2026-04-20T16:00:00Z', podStatus: 'CONFIRMED', podReference: 'POD-043',
    documents: [
      { id: 'td-3', type: 'POD_COPY', title: 'POD copy', fileName: 'pod-trp-043.pdf', fileUrl: '/docs/pod-trp-043.pdf', createdAt: '2026-04-20T16:15:00Z', note: 'Signed POD available' },
      { id: 'td-4', type: 'INVOICE_COPY', title: 'Invoice copy', fileName: 'invoice-trp-043.pdf', fileUrl: '/docs/invoice-trp-043.pdf', createdAt: '2026-04-21T09:00:00Z' },
      { id: 'td-5', type: 'REMARKS', title: 'Remarks', fileName: 'remarks-trp-043.json', fileUrl: '/docs/remarks-trp-043.json', createdAt: '2026-04-20T17:00:00Z', note: 'Two delivery remarks recorded' },
    ],
    timeline: [
      { id: 'tt-3', title: 'In Transit', description: 'Trip released from hub', timestamp: '2026-04-18T09:30:00Z', status: 'IN_TRANSIT' },
      { id: 'tt-4', title: 'Completed', description: 'POD uploaded; booking ended', timestamp: '2026-04-20T16:00:00Z', status: 'COMPLETED' },
    ],
    freightRate: 45000, slaFlag: 'ON_TIME', expenseSummary: { total: 5500, approved: 5500, pending: 0 }, isInvoiced: false,
    createdAt: '2026-04-18T08:00:00Z',
  },
  {
    id: 'TRP-041', contractId: 'CNT-001', indentId: 'IND-095', status: 'COMPLETED',
    laneDetails: { origin: { name: 'Mumbai', city: 'Mumbai', state: 'MH' }, destination: { name: 'Delhi', city: 'Delhi', state: 'DL' }, distanceKm: 1420 },
    assignedVehicle: { id: 'VH-001', registrationNumber: 'MH-04-AB-1234', type: '20ft Container' },
    assignedDriver: { id: 'DR-001', name: 'Suresh Yadav', mobile: '+91 9876500001' },
    deliveredDate: '2026-04-10T16:00:00Z', podStatus: 'CONFIRMED', podReference: 'POD-041',
    documents: [
      { id: 'td-7', type: 'INVOICE_COPY', title: 'Invoice copy', fileName: 'invoice-trp-041.pdf', fileUrl: '/docs/invoice-trp-041.pdf', createdAt: '2026-04-11T10:00:00Z' },
      { id: 'td-8', type: 'POD_COPY', title: 'POD copy', fileName: 'pod-trp-041.pdf', fileUrl: '/docs/pod-trp-041.pdf', createdAt: '2026-04-10T17:00:00Z' },
    ],
    timeline: [
      { id: 'tt-6', title: 'Completed', description: 'Booking completed and invoiced', timestamp: '2026-04-10T16:00:00Z', status: 'COMPLETED' },
    ],
    freightRate: 45000, slaFlag: 'ON_TIME', expenseSummary: { total: 4800, approved: 4800, pending: 0 }, isInvoiced: true,
    createdAt: '2026-04-05T08:00:00Z',
  },
  {
    id: 'TRP-047', contractId: 'CNT-001', indentId: 'IND-101', status: 'COMPLETED',
    laneDetails: { origin: { name: 'Mumbai Port', city: 'Mumbai', state: 'Maharashtra' }, destination: { name: 'Surat Depot', city: 'Surat', state: 'Gujarat' }, distanceKm: 280 },
    assignedVehicle: { id: 'VH-003', registrationNumber: 'GJ-01-XY-9999', type: 'Tanker' },
    assignedDriver: { id: 'DR-002', name: 'Manoj Sharma', mobile: '+91 9876500002' },
    deliveredDate: '2026-04-24T10:00:00Z', podStatus: 'CONFIRMED', podReference: 'POD-047',
    documents: [
      { id: 'td-12', type: 'POD_COPY', title: 'POD copy', fileName: 'pod-trp-047.pdf', fileUrl: '/docs/pod-trp-047.pdf', createdAt: '2026-04-24T10:30:00Z' },
    ],
    timeline: [
      { id: 'tt-9', title: 'Completed', description: 'Delivered, POD confirmed, booking ended', timestamp: '2026-04-24T10:00:00Z', status: 'COMPLETED' },
    ],
    freightRate: 28000, slaFlag: 'ON_TIME', expenseSummary: { total: 0, approved: 0, pending: 0 }, isInvoiced: false,
    createdAt: '2026-04-24T08:00:00Z',
  },
  {
    id: 'TRP-054', contractId: 'CNT-002', indentId: 'IND-105', status: 'CANCELLED',
    laneDetails: { origin: { name: 'Bhiwandi Hub', city: 'Bhiwandi', state: 'Maharashtra' }, destination: { name: 'Ahmedabad DC', city: 'Ahmedabad', state: 'Gujarat' }, distanceKm: 520 },
    assignedVehicle: { id: 'VH-002', registrationNumber: 'MH-04-CD-5678', type: '20ft Container' },
    assignedDriver: { id: 'DR-002', name: 'Manoj Sharma', mobile: '+91 9876500002' },
    documents: [
      { id: 'td-15', type: 'REMARKS', title: 'Cancellation note', fileName: 'cancelled-trp-054.txt', fileUrl: '/docs/cancelled-trp-054.txt', createdAt: '2026-05-18T10:00:00Z', note: 'Booking cancelled during POD pending stage' },
    ],
    timeline: [
      { id: 'tt-13', title: 'Cancelled', description: 'Booking cancelled', timestamp: '2026-05-18T10:00:00Z', status: 'CANCELLED' },
    ],
    freightRate: 34500, expenseSummary: { total: 0, approved: 0, pending: 0 }, isInvoiced: false,
    createdAt: '2026-05-17T07:45:00Z',
  }
]

export const MOCK_EXPENSES: Expense[] = [
  {
    id: 'EXP-101',
    tripId: 'TRP-043',
    tripReference: 'TRP-043',
    lineItems: [
      { id: 'EXP-101-1', expenseType: 'EXPENSE', amount: 3000, description: 'Mumbai-Delhi highway toll' },
      { id: 'EXP-101-2', expenseType: 'DETENTION', amount: 2500, description: 'Detention at delivery - 4 hours' },
    ],
    amount: 5500,
    status: 'APPROVED',
    submittedAt: '2026-04-21T10:00:00Z',
  },
  {
    id: 'EXP-103',
    tripId: 'TRP-042',
    tripReference: 'TRP-042',
    lineItems: [
      { id: 'EXP-103-1', expenseType: 'EXPENSE', amount: 1800, description: 'Pune bypass toll' },
    ],
    amount: 1800,
    status: 'PENDING',
    submittedAt: '2026-04-22T14:00:00Z',
  },
  {
    id: 'EXP-104',
    tripId: 'TRP-045',
    tripReference: 'TRP-045',
    lineItems: [
      { id: 'EXP-104-1', expenseType: 'WEIGHBRIDGE', amount: 500, description: 'Weighbridge mismatch' },
    ],
    amount: 500,
    status: 'REJECTED',
    rejectionReason: 'Receipt illegible',
    submittedAt: '2026-04-22T15:00:00Z',
  }
]

export const MOCK_VEHICLES: Vehicle[] = [
  {
    id: 'VH-001', registrationNumber: 'MH-04-AB-1234', vehicleType: '20ft Container',
    model: 'Tata Ultra 1918',
    engineNumber: 'EN-1918-001',
    chassisNumber: 'CH-1918-001',
    odometerReading: '45210',
    manufacturer: 'Tata Motors',
    manufactureDate: '2024-03-12',
    registrationDate: '2024-04-01',
    permitType: 'National Permit',
    capacityKg: '18000',
    capacityCubicMeter: '32',
    capacityLiters: '0',
    length: '20',
    width: '8',
    height: '9',
    rcStartDate: '2024-04-01',
    rcEndDate: '2029-03-31',
    rcFileName: 'rc-mh-04-ab-1234.pdf',
    trackingSelections: [
      { type: 'GPS Tracking', checked: true, primarySet: true, gpsOption: 'gps-vamosys', gpsDeviceID: 'GPS-001' },
      { type: 'Manual Tracking', checked: false, primarySet: false },
    ],
    additionalDocuments: [
      { id: 'vdoc-1', type: 'Insurance', fileName: 'insurance.pdf', startDate: '2026-01-15', endDate: '2027-01-15' },
      { id: 'vdoc-2', type: 'Fitness Certificate', fileName: 'fitness.pdf', startDate: '2026-02-20', endDate: '2026-08-20' },
    ],
    baseLocation: 'Mumbai', operationalStatus: 'ACTIVE', complianceStatus: 'COMPLIANT', gpsDeviceId: 'GPS-001',
    complianceDocuments: [
      { id: 'doc1', type: 'Insurance', fileName: 'insurance.pdf', fileUrl: '/docs/insurance.pdf', expiryDate: '2027-01-15', status: 'VALID', uploadedAt: '2026-01-15' },
      { id: 'doc2', type: 'Fitness Certificate', fileName: 'fitness.pdf', fileUrl: '/docs/fitness.pdf', expiryDate: '2026-08-20', status: 'VALID', uploadedAt: '2026-02-20' },
      { id: 'doc3', type: 'Permit (National)', fileName: 'permit.pdf', fileUrl: '/docs/permit.pdf', expiryDate: '2026-05-10', status: 'EXPIRING_SOON', uploadedAt: '2025-05-10' },
      { id: 'doc4', type: 'PUC Certificate', fileName: 'puc.pdf', fileUrl: '/docs/puc.pdf', expiryDate: '2026-12-01', status: 'VALID', uploadedAt: '2026-06-01' },
    ],
    blackoutDates: [],
  },
  {
    id: 'VH-003', registrationNumber: 'GJ-01-XY-9999', vehicleType: 'Tanker',
    model: 'Ashok Leyland Boss',
    engineNumber: 'EN-AX-032',
    chassisNumber: 'CH-AX-032',
    odometerReading: '78100',
    manufacturer: 'Ashok Leyland',
    manufactureDate: '2023-07-08',
    registrationDate: '2023-08-10',
    permitType: 'State Permit',
    capacityKg: '16000',
    capacityCubicMeter: '24',
    capacityLiters: '12000',
    length: '18',
    width: '8',
    height: '9',
    rcStartDate: '2023-08-10',
    rcEndDate: '2028-08-09',
    rcFileName: 'rc-gj-01-xy-9999.pdf',
    trackingSelections: [{ type: 'GPS Tracking', checked: true, primarySet: true, gpsOption: 'gps-loconav', gpsDeviceID: 'GPS-007' }],
    additionalDocuments: [{ id: 'vdoc-3', type: 'Insurance', fileName: 'insurance2.pdf', startDate: '2025-03-01', endDate: '2026-03-01' }],
    baseLocation: 'Ahmedabad', operationalStatus: 'ACTIVE', complianceStatus: 'EXPIRED',
    complianceDocuments: [
      { id: 'doc5', type: 'Insurance', fileName: 'insurance2.pdf', fileUrl: '/docs/insurance2.pdf', expiryDate: '2026-03-01', status: 'EXPIRED', uploadedAt: '2025-03-01' },
    ],
    blackoutDates: [],
  },
  {
    id: 'VH-004', registrationNumber: 'MH-12-PZ-1010', vehicleType: 'LCV',
    model: 'Mahindra Bolero Pickup',
    engineNumber: 'EN-MH-120',
    chassisNumber: 'CH-MH-120',
    odometerReading: '18200',
    manufacturer: 'Mahindra',
    manufactureDate: '2025-01-11',
    registrationDate: '2025-02-01',
    permitType: 'Local Permit',
    capacityKg: '2500',
    capacityCubicMeter: '10',
    capacityLiters: '0',
    length: '12',
    width: '6',
    height: '7',
    rcStartDate: '2025-02-01',
    rcEndDate: '2030-01-31',
    rcFileName: 'rc-mh-12-pz-1010.pdf',
    trackingSelections: [{ type: 'Manual Tracking', checked: true, primarySet: true }],
    additionalDocuments: [],
    baseLocation: 'Pune', operationalStatus: 'INACTIVE', complianceStatus: 'COMPLIANT',
    complianceDocuments: [
      { id: 'doc6', type: 'Insurance', fileName: 'ins3.pdf', fileUrl: '/docs/ins3.pdf', expiryDate: '2027-01-01', status: 'VALID', uploadedAt: '2026-01-01' }
    ],
    blackoutDates: []
  }
]

export const MOCK_DRIVERS: Driver[] = [
  {
    id: 'DR-001', name: 'Suresh Yadav', dateOfBirth: '1990-05-12', dlName: 'Suresh Yadav', dlVerified: true,
    mobile: '+91 9876500001', licenseNumber: 'MH0420210012345', dlValidTillDate: '2028-06-30', gender: 'Male', email: 'suresh@yadav.in', dlCopyFileName: 'dl.pdf',
    trackingSelections: [{ type: 'SIM Tracking', checked: true, primarySet: true }, { type: 'Driver App Tracking', checked: true, primarySet: false }],
    licenseExpiry: '2028-06-30', licenseClass: ['HCV', 'LCV'], complianceStatus: 'COMPLIANT', currentStatus: 'ACTIVE',
    complianceDocuments: [
      { id: 'dd1', type: 'Driving License', fileName: 'dl.pdf', fileUrl: '/docs/dl.pdf', expiryDate: '2028-06-30', status: 'VALID', uploadedAt: '2026-01-01' },
      { id: 'dd2', type: 'Medical Certificate', fileName: 'medical.pdf', fileUrl: '/docs/medical.pdf', expiryDate: '2027-01-01', status: 'VALID', uploadedAt: '2026-01-01' },
    ],
  },
  {
    id: 'DR-002', name: 'Manoj Sharma', dateOfBirth: '1988-02-20', dlName: 'Manoj Sharma', dlVerified: true,
    mobile: '+91 9876500002', licenseNumber: 'RJ1420180054321', dlValidTillDate: '2026-05-15', gender: 'Male', email: 'manoj@sharma.in', dlCopyFileName: 'dl2.pdf',
    trackingSelections: [{ type: 'SIM Tracking', checked: true, primarySet: true }],
    licenseExpiry: '2026-05-15', licenseClass: ['LCV'], complianceStatus: 'EXPIRING_SOON', currentStatus: 'ACTIVE',
    complianceDocuments: [
      { id: 'dd3', type: 'Driving License', fileName: 'dl2.pdf', fileUrl: '/docs/dl2.pdf', expiryDate: '2026-05-15', status: 'EXPIRING_SOON', uploadedAt: '2021-05-15' }
    ]
  },
  {
    id: 'DR-003', name: 'Ramesh Singh', dateOfBirth: '1985-09-01', dlName: 'Ramesh Singh', dlVerified: false,
    mobile: '+91 9876500003', licenseNumber: 'DL0120150098765', dlValidTillDate: '2025-12-31', gender: 'Male', email: 'ramesh@singh.in', dlCopyFileName: 'dl3.pdf',
    trackingSelections: [],
    licenseExpiry: '2025-12-31', licenseClass: ['HCV'], complianceStatus: 'EXPIRED', currentStatus: 'BLOCKED',
    complianceDocuments: []
  }
]

export const MOCK_CAPACITY: CapacityDeclaration[] = [
  { id: 'cap1', vehicleType: '20ft Container', availableQuantity: 15, baseOperatingHubs: ['Mumbai', 'Pune', 'Nashik'], blackoutDates: [] },
  { id: 'cap2', vehicleType: 'Flatbed', availableQuantity: 8, baseOperatingHubs: ['Mumbai', 'Delhi'], blackoutDates: [{ from: '2026-05-01', to: '2026-05-05' }] },
]

export const MOCK_INVOICES: Invoice[] = [
  {
    id: 'INV-2026-001', invoiceNumber: 'INV-2026-001', invoiceDate: '2026-04-15', vendorGstin: '29AABCF1234M1ZP',
    customerGstin: '27AABCU9603R1ZM', billingPeriod: { from: '2026-04-01', to: '2026-04-15' },
    paymentDueDate: '2026-05-15', status: 'APPROVED', paymentDate: '2026-05-12',
    lineItems: [
      { tripId: 'TRP-040', tripReference: 'TRP-040', freightCharge: 50000, expenses: [], lineTotal: 50000 },
      { tripId: 'TRP-041', tripReference: 'TRP-041', freightCharge: 50000, expenses: [], lineTotal: 50000 },
    ],
    subtotal: 100000, gstAmount: 12000, grandTotal: 112000, pdfUrl: '/invoices/INV-2026-001.pdf', tripReferences: ['TRP-040', 'TRP-041'], createdAt: '2026-04-15T12:00:00Z',
  },
  {
    id: 'INV-2026-002', invoiceNumber: 'INV-2026-002', invoiceDate: '2026-05-13', vendorGstin: '29AABCF1234M1ZP',
    customerGstin: '27AABCU9603R1ZM', billingPeriod: { from: '2026-05-01', to: '2026-05-13' },
    paymentDueDate: '2026-06-12', status: 'APPROVED',
    lineItems: [
      { tripId: 'TRP-042', tripReference: 'TRP-042', freightCharge: 100000, expenses: [], lineTotal: 100000 }
    ],
    subtotal: 100000, gstAmount: 12000, grandTotal: 112000, pdfUrl: '/invoices/INV-2026-002.pdf', tripReferences: ['TRP-042'], createdAt: '2026-05-13T10:00:00Z',
  },
  {
    id: 'INV-2026-003', invoiceNumber: 'INV-2026-003', invoiceDate: '2026-05-17', vendorGstin: '29AABCF1234M1ZP',
    customerGstin: '27AABCU9603R1ZM', billingPeriod: { from: '2026-05-14', to: '2026-05-17' },
    paymentDueDate: '2026-06-16', status: 'APPROVED',
    lineItems: [{ tripId: 'TRP-046', tripReference: 'TRP-046', freightCharge: 85000, expenses: [], lineTotal: 85000 }],
    subtotal: 85000, gstAmount: 10200, grandTotal: 95200, pdfUrl: '/invoices/INV-2026-003.pdf', tripReferences: ['TRP-046'], createdAt: '2026-05-17T10:00:00Z',
  },
  {
    id: 'INV-2026-004', invoiceNumber: 'INV-2026-004', invoiceDate: '2026-05-18', vendorGstin: '29AABCF1234M1ZP',
    customerGstin: '27AABCU9603R1ZM', billingPeriod: { from: '2026-05-15', to: '2026-05-18' },
    paymentDueDate: '2026-06-17', status: 'APPROVED',
    lineItems: [{ tripId: 'TRP-047', tripReference: 'TRP-047', freightCharge: 92000, expenses: [], lineTotal: 92000 }],
    subtotal: 92000, gstAmount: 11040, grandTotal: 103040, pdfUrl: '/invoices/INV-2026-004.pdf', tripReferences: ['TRP-047'], createdAt: '2026-05-18T10:00:00Z',
  },
  {
    id: 'INV-2026-005', invoiceNumber: 'INV-2026-005', invoiceDate: '2026-05-19', vendorGstin: '29AABCF1234M1ZP',
    customerGstin: '27AABCU9603R1ZM', billingPeriod: { from: '2026-05-16', to: '2026-05-19' },
    paymentDueDate: '2026-06-18', status: 'APPROVED',
    lineItems: [{ tripId: 'TRP-048', tripReference: 'TRP-048', freightCharge: 68000, expenses: [], lineTotal: 68000 }],
    subtotal: 68000, gstAmount: 8160, grandTotal: 76160, pdfUrl: '/invoices/INV-2026-005.pdf', tripReferences: ['TRP-048'], createdAt: '2026-05-19T10:00:00Z',
  },
  {
    id: 'INV-2026-006', invoiceNumber: 'INV-2026-006', invoiceDate: '2026-05-19', vendorGstin: '29AABCF1234M1ZP',
    customerGstin: '27AABCU9603R1ZM', billingPeriod: { from: '2026-05-17', to: '2026-05-19' },
    paymentDueDate: '2026-06-18', status: 'PENDING',
    lineItems: [{
      tripId: 'TRP-049', tripReference: 'TRP-049', freightCharge: 74000,
      expenses: [{ type: 'WEIGHBRIDGE', amount: 800 }],
      lineTotal: 74800,
    }],
    subtotal: 74800, gstAmount: 8976, grandTotal: 83776, pdfUrl: '/invoices/INV-2026-006.pdf', tripReferences: ['TRP-049'], createdAt: '2026-05-19T11:00:00Z',
  },
  {
    id: 'INV-2026-007', invoiceNumber: 'INV-2026-007', invoiceDate: '2026-05-18', vendorGstin: '29AABCF1234M1ZP',
    customerGstin: '27AABCU9603R1ZM', billingPeriod: { from: '2026-05-15', to: '2026-05-18' },
    paymentDueDate: '2026-06-17', status: 'DISPUTED',
    lineItems: [{
      tripId: 'TRP-050', tripReference: 'TRP-050', freightCharge: 58000,
      expenses: [
        { type: 'DETENTION', amount: 3000 },
        { type: 'LOADING_UNLOADING', amount: 1500 },
      ],
      lineTotal: 62500,
    }],
    subtotal: 62500, gstAmount: 7500, grandTotal: 70000, pdfUrl: '/invoices/INV-2026-007.pdf', tripReferences: ['TRP-050'], notes: 'Finance raised a dispute on the detention and handling charges.', createdAt: '2026-05-18T09:30:00Z',
  },
  {
    id: 'INV-2026-008', invoiceNumber: 'INV-2026-008', invoiceDate: '2026-05-17', vendorGstin: '29AABCF1234M1ZP',
    customerGstin: '27AABCU9603R1ZM', billingPeriod: { from: '2026-05-14', to: '2026-05-17' },
    paymentDueDate: '2026-06-16', status: 'RESUBMISSION_REQUIRED',
    lineItems: [{ tripId: 'TRP-051', tripReference: 'TRP-051', freightCharge: 47000, expenses: [], lineTotal: 47000 }],
    subtotal: 47000, gstAmount: 5640, grandTotal: 52640, pdfUrl: '/invoices/INV-2026-008.pdf', tripReferences: ['TRP-051'], notes: 'Finance asked for a corrected invoice. Create a new invoice to replace this one.', createdAt: '2026-05-17T16:00:00Z',
  },
  {
    // CLOSED — finance rejected the invoice outright.
    id: 'INV-2026-009', invoiceNumber: 'INV-2026-009', invoiceDate: '2026-05-16', vendorGstin: '29AABCF1234M1ZP',
    customerGstin: '27AABCU9603R1ZM', billingPeriod: { from: '2026-05-12', to: '2026-05-16' },
    paymentDueDate: '2026-06-15', status: 'CLOSED', closeReason: 'REJECTED',
    lineItems: [{ tripId: 'TRP-052', tripReference: 'TRP-052', freightCharge: 39000, expenses: [], lineTotal: 39000 }],
    subtotal: 39000, gstAmount: 4680, grandTotal: 43680, pdfUrl: '/invoices/INV-2026-009.pdf', tripReferences: ['TRP-052'], notes: 'Rejected by finance — trip was not delivered against a valid contract.', createdAt: '2026-05-16T10:00:00Z',
  },
  {
    // CLOSED — superseded by INV-2026-011 after a resubmission.
    id: 'INV-2026-010', invoiceNumber: 'INV-2026-010', invoiceDate: '2026-05-14', vendorGstin: '29AABCF1234M1ZP',
    customerGstin: '27AABCU9603R1ZM', billingPeriod: { from: '2026-05-10', to: '2026-05-14' },
    paymentDueDate: '2026-06-13', status: 'CLOSED', closeReason: 'SUPERSEDED', supersededByInvoiceId: 'INV-2026-011',
    lineItems: [{ tripId: 'TRP-053', tripReference: 'TRP-053', freightCharge: 61000, expenses: [], lineTotal: 61000 }],
    subtotal: 61000, gstAmount: 7320, grandTotal: 68320, pdfUrl: '/invoices/INV-2026-010.pdf', tripReferences: ['TRP-053'], notes: 'Replaced by INV-2026-011 after finance requested a resubmission.', createdAt: '2026-05-14T10:00:00Z',
  },
  {
    // PENDING — the corrected invoice that replaced INV-2026-010.
    id: 'INV-2026-011', invoiceNumber: 'INV-2026-011', invoiceDate: '2026-05-20', vendorGstin: '29AABCF1234M1ZP',
    customerGstin: '27AABCU9603R1ZM', billingPeriod: { from: '2026-05-10', to: '2026-05-14' },
    paymentDueDate: '2026-06-19', status: 'PENDING', supersedesInvoiceId: 'INV-2026-010',
    lineItems: [{ tripId: 'TRP-053', tripReference: 'TRP-053', freightCharge: 59000, expenses: [], lineTotal: 59000 }],
    subtotal: 59000, gstAmount: 7080, grandTotal: 66080, pdfUrl: '/invoices/INV-2026-011.pdf', tripReferences: ['TRP-053'], notes: 'Corrected resubmission of INV-2026-010.', createdAt: '2026-05-20T10:00:00Z',
  }
]

export const MOCK_LEDGER: LedgerEntry[] = [
  { id: 'led-001', invoiceId: 'INV-2026-001', ledgerType: 'CUSTOMER', date: '2026-04-15', entryType: 'INVOICE_APPROVED', description: 'Invoice INV-2026-001 approved (Taxable ₹100,000 + GST ₹0)', debit: 100000, credit: 0, runningBalance: 100000 },
  { id: 'led-002', invoiceId: 'INV-2026-001', ledgerType: 'CUSTOMER', date: '2026-04-20', entryType: 'CUSTOMER_PAYMENT', description: 'Partial payment from customer for INV-2026-001', debit: 0, credit: 40000, runningBalance: 60000, mode: 'BANK' },
  { id: 'led-003', invoiceId: 'INV-2026-001', ledgerType: 'CUSTOMER', date: '2026-05-10', entryType: 'CUSTOMER_PAYMENT', description: 'Final payment from customer for INV-2026-001', debit: 0, credit: 58000, runningBalance: 2000, mode: 'BANK' },
  { id: 'led-004', invoiceId: 'INV-2026-001', ledgerType: 'CUSTOMER', date: '2026-05-12', entryType: 'TDS_DEDUCTION', description: 'TDS deduction against INV-2026-001', debit: 0, credit: 2000, runningBalance: 0, mode: 'ADJUSTMENT' },

  { id: 'led-005', invoiceId: 'INV-2026-002', ledgerType: 'CUSTOMER', date: '2026-05-13', entryType: 'INVOICE_APPROVED', description: 'Invoice INV-2026-002 approved (Taxable ₹100,000 + GST ₹0)', debit: 100000, credit: 0, runningBalance: 100000 },
  { id: 'led-006', invoiceId: 'INV-2026-002', ledgerType: 'NBFC', date: '2026-05-14', entryType: 'NBFC_DISBURSEMENT', description: 'NBFC advance received for INV-2026-002', debit: 0, credit: 90000, runningBalance: 90000, mode: 'BANK' },
  { id: 'led-006a', invoiceId: 'INV-2026-002', ledgerType: 'NBFC', date: '2026-05-20', entryType: 'NBFC_REPAYMENT', description: 'Repaid to NBFC for INV-2026-002', debit: 40000, credit: 0, runningBalance: 50000, mode: 'BANK' },
  { id: 'led-006b', invoiceId: 'INV-2026-002', ledgerType: 'NBFC', date: '2026-05-28', entryType: 'NBFC_REPAYMENT', description: 'Repaid to NBFC for INV-2026-002', debit: 50000, credit: 0, runningBalance: 0, mode: 'BANK' },
  { id: 'led-007', invoiceId: 'INV-2026-002', ledgerType: 'CUSTOMER', date: '2026-05-20', entryType: 'CUSTOMER_PAYMENT', description: 'Customer payment for INV-2026-002', debit: 0, credit: 40000, runningBalance: 60000, mode: 'BANK' },
  { id: 'led-008', invoiceId: 'INV-2026-002', ledgerType: 'CUSTOMER', date: '2026-05-28', entryType: 'CUSTOMER_PAYMENT', description: 'Customer payment for INV-2026-002', debit: 0, credit: 50000, runningBalance: 10000, mode: 'BANK' },
  { id: 'led-009', invoiceId: 'INV-2026-002', ledgerType: 'CUSTOMER', date: '2026-06-10', entryType: 'CUSTOMER_PAYMENT', description: 'Customer final payment for INV-2026-002', debit: 0, credit: 10000, runningBalance: 0, mode: 'BANK' },
]

export const MOCK_COMPANY_INFO: CompanyInfo = {
  tradingName: 'FastTrack Logistics', legalName: 'FastTrack Logistics Pvt. Ltd.',
  registeredAddress: { street: '45, Transport Nagar', city: 'Mumbai', state: 'Maharashtra', pincode: '400001' },
  gstin: '29AABCF1234M1ZP', pan: 'AABCF1234M',
  primaryContact: { name: 'Rajesh Kumar', phone: '+91 9876543210', email: 'rajesh@fasttrack.in' },
  serviceRegions: ['Maharashtra', 'Gujarat', 'Delhi NCR', 'Karnataka'],
  supportedVehicleTypes: ['20ft Container', '32ft Container', 'Flatbed', 'Tanker'],
}

export const MOCK_BANK: BankDetails = {
  bankName: 'HDFC Bank', branch: 'Andheri East, Mumbai',
  accountNumber: '50100123456789', ifscCode: 'HDFC0001234', accountType: 'CURRENT',
  supportingDocumentUrl: '/docs/cancelled-cheque.pdf',
}

export const MOCK_DISPUTES: import('../types').Dispute[] = [
  {
    id: 'DSP-2026-001',
    invoiceId: 'INV-2026-007',
    invoiceNumber: 'INV-2026-007',
    invoiceAmount: 70000,
    reason: 'Detention and loading charges do not match the approved rate card for TRP-050.',
    status: 'OPEN',
    raisedAt: '2026-05-19T10:00:00Z',
    updatedAt: '2026-05-19T10:00:00Z',
    responseDueAt: '2026-05-21T10:00:00Z',
    messages: [
      {
        id: 'dmsg-seed-1',
        sender: 'FINANCE',
        message: 'Detention and loading charges do not match the approved rate card for TRP-050.',
        createdAt: '2026-05-19T10:00:00Z',
      },
    ],
  },
  {
    id: 'DSP-2026-002',
    invoiceId: 'INV-2026-008',
    invoiceNumber: 'INV-2026-008',
    invoiceAmount: 52640,
    reason: 'Invoice needs correction and resubmission as per finance review.',
    status: 'CLOSED',
    raisedAt: '2026-05-18T09:00:00Z',
    updatedAt: '2026-05-18T14:30:00Z',
    notes: 'Please correct the invoice reference and resubmit.',
    responseDueAt: '2026-05-20T09:00:00Z',
    messages: [
      {
        id: 'dmsg-seed-2',
        sender: 'FINANCE',
        message: 'Invoice number conflicts with an earlier submission. Please correct and resubmit.',
        createdAt: '2026-05-18T09:00:00Z',
      },
      {
        id: 'dmsg-seed-3',
        sender: 'VENDOR',
        message: 'Accepted. We will correct the invoice and resubmit.',
        createdAt: '2026-05-18T14:30:00Z',
      },
    ],
  },
]
