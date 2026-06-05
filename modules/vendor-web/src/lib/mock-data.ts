import type {
  DashboardData, Auction, Contract, Indent, Trip,
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
      { id: 'BKG-2026-1001', contractId: 'CNT-001', originCity: 'Bengaluru', destinationCity: 'Chandausi', vehicleType: 'MGV', reportingDate: '2026-04-26T06:00:00Z', slaDeadline: new Date(Date.now() + 3600000).toISOString(), status: 'PENDING' },
      { id: 'BKG-2026-1002', contractId: 'CNT-002', originCity: 'Bengaluru', destinationCity: 'Hyderabad', vehicleType: 'MGV', reportingDate: '2026-04-27T08:00:00Z', slaDeadline: new Date(Date.now() + 7200000).toISOString(), status: 'PENDING' },
      { id: 'BKG-2026-1003', contractId: 'CNT-001', originCity: 'Bengaluru', destinationCity: 'Chennai', vehicleType: 'MGV', reportingDate: '2026-04-28T10:00:00Z', slaDeadline: new Date(Date.now() + 14400000).toISOString(), status: 'PENDING' },
    ],
  },
  uninvoicedBookings: { count: 4, totalBillableAmount: 285000 },
  invoicePaymentStatus: { submitted: 2, approved: 3, rejected: 1, paid: 8 },
}

export const MOCK_NOTIFICATIONS: Notification[] = [
  { id: 'n1',  type: 'ONBOARDING', title: 'Complete vendor setup',       message: 'Your profile is 45% complete. Review bank details and finish company information.', deepLink: '/vendor/profile/company',              isRead: false, createdAt: new Date(Date.now() - 2   * 60  * 1000).toISOString() },
  { id: 'n2',  type: 'TRIPS',      title: 'New Booking Request',         message: 'Indent BKG-2026-1001 for Bengaluru → Chandausi',                                                  deepLink: '/vendor/bookings?tab=new',             isRead: false, createdAt: new Date(Date.now() - 10  * 60  * 1000).toISOString() },
  { id: 'n3',  type: 'SOURCING',   title: 'Auction Going Live',          message: 'Reverse Auction AUC-012 starts in 30 min',                                           deepLink: '/vendor/sourcing/auctions/AUC-012',    isRead: false, createdAt: new Date(Date.now() - 30  * 60  * 1000).toISOString() },
  { id: 'n5',  type: 'INVOICES',   title: 'Payment Received',            message: '₹1,45,000 credited for INV-2026-028',                                                deepLink: '/vendor/invoices/INV-2026-028',        isRead: true,  createdAt: new Date(Date.now() - 2   * 3600 * 1000).toISOString() },
  { id: 'n6',  type: 'CONTRACTS',  title: 'Contract Updated',            message: 'Contract CNT-001 rate card and SLA details were updated',                            deepLink: '/vendor/contracts/CNT-001',            isRead: false, createdAt: new Date(Date.now() - 3   * 3600 * 1000).toISOString() },
  { id: 'n7',  type: 'INVOICES',   title: 'Invoice Rejected',            message: 'Invoice INV-2026-026 was rejected. Raise a dispute if you disagree.',                deepLink: '/vendor/invoices/INV-2026-026',        isRead: false, createdAt: new Date(Date.now() - 5   * 3600 * 1000).toISOString() },
  { id: 'n8',  type: 'TRIPS',      title: 'POD Confirmed',               message: 'Proof of delivery confirmed for trip BKG-2026-1051 (Bengaluru → Hyderabad)',                       deepLink: '/vendor/bookings/completed/BKG-2026-1051',  isRead: true,  createdAt: new Date(Date.now() - 8   * 3600 * 1000).toISOString() },
  { id: 'n9',  type: 'SOURCING',   title: 'Auction Awarded',             message: 'You won R1 allocation on AUC-009 – Mumbai → Nashik lane',                           deepLink: '/vendor/sourcing',                    isRead: true,  createdAt: new Date(Date.now() - 12  * 3600 * 1000).toISOString() },
  { id: 'n11', type: 'CONTRACTS',  title: 'New Contract Available',      message: 'A new contract CNT-007 for Delhi → Jaipur is ready for review',                     deepLink: '/vendor/contracts',                   isRead: true,  createdAt: new Date(Date.now() - 36  * 3600 * 1000).toISOString() },
  { id: 'n12', type: 'INVOICES',   title: 'Invoice Approved',            message: 'Invoice INV-2026-024 approved. Payment due in 15 days.',                            deepLink: '/vendor/invoices/INV-2026-024',        isRead: true,  createdAt: new Date(Date.now() - 48  * 3600 * 1000).toISOString() },
  { id: 'n13', type: 'TRIPS',      title: 'Indent Expiring Soon',        message: 'Indent BKG-2026-1008 expires in 2 hours. Accept or it will lapse.',                       deepLink: '/vendor/bookings?tab=new',             isRead: false, createdAt: new Date(Date.now() - 3   * 86400 * 1000).toISOString() },
  { id: 'n14', type: 'ONBOARDING', title: 'Document Verification Done',  message: 'Your GST and PAN documents have been verified successfully.',                       deepLink: '/vendor/profile/company',              isRead: true,  createdAt: new Date(Date.now() - 5   * 86400 * 1000).toISOString() },
]

export const MOCK_EXCEPTIONS: ExceptionRecord[] = [
  {
    id: 'EXC-2048',
    bookingId: 'BKG-2026-1045',
    route: 'Bengaluru → Chandausi',
    vehicle: 'KA01JK1234',
    driver: 'Kartik Pawar',
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
    bookingId: 'BKG-2026-1043',
    route: 'Bengaluru → Hyderabad',
    vehicle: 'KA01JK1234',
    driver: 'Kartik Pawar',
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
    bookingId: 'BKG-2026-1047',
    route: 'Bengaluru → Chennai',
    vehicle: 'KA01JK1234',
    driver: 'Kartik Pawar',
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
    bookingId: 'BKG-2026-1041',
    route: 'Bengaluru → Mysuru',
    vehicle: 'KA01JK1234',
    driver: 'Kartik Pawar',
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
    bookingId: 'BKG-2026-1039',
    route: 'Bengaluru → Hubballi',
    vehicle: 'KA01JK1234',
    driver: 'Kartik Pawar',
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
        laneDetails: { origin: { name: 'Ankleshwar Plant', city: 'Vadodara', state: 'Gujarat' }, destination: { name: 'Bangalore DC', city: 'Bengaluru', state: 'Karnataka' }, distanceKm: 1200 },
        volumeRequirement: { estimatedVolume: 50, unit: 'trucks/month', frequency: 'MONTHLY' },
        basePrice: 28000,
        currentBestBid: 25000,
        minBidDecrement: 500
      },
      {
        id: 'L2',
        laneDetails: { origin: { name: 'Ankleshwar Plant', city: 'Vadodara', state: 'Gujarat' }, destination: { name: 'Chennai Hub', city: 'Chennai', state: 'Tamil Nadu' }, distanceKm: 1450 },
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
    id: 'CNT-001', status: 'ACTIVE', source: 'MANUAL_UPLOAD',
    laneDetails: { origin: { name: 'Mumbai Port', city: 'Mumbai', state: 'Maharashtra' }, destination: { name: 'Delhi NCR Hub', city: 'Delhi', state: 'Delhi' }, distanceKm: 1420 },
    rateCard: [{ vehicleType: 'MGV', rateType: 'PER_TRIP', rate: 45000, surcharges: [{ name: 'Fuel Surcharge', amount: 2000 }] }],
    volumeAllocation: { volume: 50, unit: 'trucks', frequency: 'Monthly' },
    paymentTerms: { creditPeriodDays: 30, billingCycle: 'MONTHLY' },
    slaClauses: [{ name: 'Placement SLA', valueHours: 4, description: 'Vehicle must report within 4 hours of acceptance' }],
    penaltyClauses: [{ breachType: 'Late Placement', penaltyType: 'FIXED', penaltyValue: 5000, description: 'Per late placement event' }],
    validityFrom: '2026-01-01', validityTo: '2026-12-31', renewalTerms: 'Auto-renew unless 30-day notice',
    amendments: [], signedAt: '2026-01-05T10:30:00Z', pdfUrl: '/contracts/CNT-001.pdf', createdAt: '2025-12-20T14:00:00Z',
  },
  {
    id: 'CNT-005', status: 'DRAFT', source: 'MANUAL_UPLOAD',
    laneDetails: { origin: { name: 'Jamshedpur Plant', city: 'Jamshedpur', state: 'Jharkhand' }, destination: { name: 'Haldia Port', city: 'Haldia', state: 'West Bengal' }, distanceKm: 280 },
    rateCard: [{ vehicleType: 'MGV', rateType: 'PER_MT', rate: 1800, surcharges: [] }],
    volumeAllocation: { volume: 30, unit: 'trucks', frequency: 'Monthly' },
    paymentTerms: { creditPeriodDays: 45, billingCycle: 'MONTHLY' },
    slaClauses: [{ name: 'Placement SLA', valueHours: 6, description: 'Vehicle must report within 6 hours' }],
    penaltyClauses: [{ breachType: 'Missed Placement', penaltyType: 'PERCENTAGE', penaltyValue: 10, description: '10% of freight rate' }],
    validityFrom: '2026-04-01', validityTo: '2027-03-31', renewalTerms: 'Manual renewal',
    amendments: [], pdfUrl: '/contracts/CNT-005.pdf', createdAt: '2026-04-20T09:00:00Z',
  },
  {
    id: 'CNT-003', status: 'EXPIRED', source: 'MANUAL_UPLOAD',
    laneDetails: { origin: { name: 'Vikhroli', city: 'Mumbai', state: 'MH' }, destination: { name: 'Surat Hub', city: 'Surat', state: 'GJ' }, distanceKm: 280 },
    rateCard: [{ vehicleType: 'MGV', rateType: 'PER_TRIP', rate: 12000, surcharges: [] }],
    volumeAllocation: { volume: 20, unit: 'trucks', frequency: 'Monthly' },
    paymentTerms: { creditPeriodDays: 30, billingCycle: 'MONTHLY' },
    slaClauses: [], penaltyClauses: [],
    validityFrom: '2025-01-01', validityTo: '2025-12-31', renewalTerms: 'None',
    amendments: [], signedAt: '2025-01-02T10:00:00Z', pdfUrl: '/contracts/CNT-003.pdf', createdAt: '2024-12-15T09:00:00Z',
  },
  // Permanent auction-win samples — always visible regardless of which vendor
  // is logged in or whether the cross-module auction store is populated.
  {
    id: 'CNT-AW-101', status: 'ACTIVE', source: 'AUCTION_WIN', contractKind: 'BULK',
    laneDetails: { origin: { name: 'Chakan Plant', city: 'Pune', state: 'Maharashtra' }, destination: { name: 'Nagpur Hub', city: 'Nagpur', state: 'Maharashtra' }, distanceKm: 700 },
    rateCard: [{ vehicleType: '20ft Container', rateType: 'PER_KM', rate: 16500, surcharges: [] }],
    volumeAllocation: { volume: 60, unit: '%', frequency: 'Monthly' },
    paymentTerms: { creditPeriodDays: 30, billingCycle: 'MONTHLY' },
    slaClauses: [{ name: 'Placement SLA', valueHours: 4, description: 'Vehicle must report within 4 hours of indent' }],
    penaltyClauses: [{ breachType: 'Late Placement', penaltyType: 'FIXED', penaltyValue: 5000, description: 'Per late placement event' }],
    validityFrom: '2026-05-01', validityTo: '2026-10-31', renewalTerms: 'Re-auction on expiry',
    amendments: [], signedAt: '2026-04-28T11:00:00Z', awardedOn: '2026-04-27T16:30:00Z', pdfUrl: '/contracts/CNT-AW-101.pdf', createdAt: '2026-04-27T16:30:00Z',
  },
  {
    id: 'CNT-AW-102', status: 'ACTIVE', source: 'AUCTION_WIN', contractKind: 'LOT',
    laneDetails: { origin: { name: 'Ankleshwar Plant', city: 'Vadodara', state: 'Gujarat' }, destination: { name: 'Bangalore DC', city: 'Bengaluru', state: 'Karnataka' }, distanceKm: 1200 },
    rateCard: [{ vehicleType: '32ft Container', rateType: 'PER_MT', rate: 2450, surcharges: [{ name: 'Fuel Surcharge', amount: 150 }] }],
    volumeAllocation: { volume: 40, unit: '%', frequency: 'Monthly' },
    paymentTerms: { creditPeriodDays: 45, billingCycle: 'MONTHLY' },
    slaClauses: [{ name: 'Placement SLA', valueHours: 6, description: 'Vehicle must report within 6 hours of indent' }],
    penaltyClauses: [{ breachType: 'Missed Placement', penaltyType: 'PERCENTAGE', penaltyValue: 10, description: '10% of freight rate' }],
    validityFrom: '2026-03-01', validityTo: '2026-08-31', renewalTerms: 'Re-auction on expiry',
    amendments: [], signedAt: '2026-02-26T09:45:00Z', awardedOn: '2026-02-25T18:10:00Z', pdfUrl: '/contracts/CNT-AW-102.pdf', createdAt: '2026-02-25T18:10:00Z',
  },
  {
    id: 'CNT-AW-103', status: 'EXPIRED', source: 'AUCTION_WIN', contractKind: 'BULK',
    laneDetails: { origin: { name: 'Delhi NCR Hub', city: 'Delhi', state: 'Delhi' }, destination: { name: 'Lucknow Depot', city: 'Lucknow', state: 'Uttar Pradesh' }, distanceKm: 550 },
    rateCard: [{ vehicleType: 'MGV', rateType: 'PER_TRIP', rate: 19800, surcharges: [] }],
    volumeAllocation: { volume: 100, unit: '%', frequency: 'Monthly' },
    paymentTerms: { creditPeriodDays: 30, billingCycle: 'MONTHLY' },
    slaClauses: [], penaltyClauses: [],
    validityFrom: '2025-07-01', validityTo: '2025-12-31', renewalTerms: 'None',
    amendments: [], signedAt: '2025-06-27T10:00:00Z', awardedOn: '2025-06-25T12:00:00Z', pdfUrl: '/contracts/CNT-AW-103.pdf', createdAt: '2025-06-25T12:00:00Z',
  },
]

// Consignor/consignee parties for mock bookings — same shape the cross-module
// bridge resolves from shared customer addresses (name, full address, contact, phone).
export const MOCK_BOOKING_PARTIES: Record<string, { name: string; address: string; contact: string; phone: string }> = {
  Bengaluru:  { name: 'Umesh', address: 'GM Palya, CV Raman Nagar, Bengaluru, Karnataka, 560093', contact: 'Umesh Rao', phone: '9886011223' },
  Chandausi:  { name: 'Rajeev Kanodia', address: 'Kanodia Cement Depot, GT Road, Chandausi, Uttar Pradesh, 244412', contact: 'Rajeev Kanodia', phone: '9812345670' },
  Hyderabad:  { name: 'Srinivas', address: 'Plot 14, IDA Uppal, Hyderabad, Telangana, 500039', contact: 'Srinivas Reddy', phone: '9849022113' },
  Chennai:    { name: 'Murugan', address: 'No 8, SIDCO Industrial Estate, Ambattur, Chennai, Tamil Nadu, 600098', contact: 'Murugan S', phone: '9841155667' },
  Mysuru:     { name: 'Prakash', address: 'Hebbal Industrial Area, Mysuru, Karnataka, 570016', contact: 'Prakash K', phone: '9886544332' },
  Hubballi:   { name: 'Basavaraj', address: 'Gokul Road Industrial Estate, Hubballi, Karnataka, 580030', contact: 'Basavaraj H', phone: '9845098450' },
  Tumakuru:   { name: 'Manjunath', address: 'Antharasanahalli Industrial Area, Tumakuru, Karnataka, 572106', contact: 'Manjunath T', phone: '9900887766' },
  Salem:      { name: 'Kumar', address: 'SIDCO Industrial Estate, Salem, Tamil Nadu, 636004', contact: 'Kumar V', phone: '9842233445' },
  Pune:       { name: 'Deshpande', address: 'Bhosari MIDC, Pune, Maharashtra, 411026', contact: 'A. Deshpande', phone: '9822011223' },
  Vijayawada: { name: 'Venkat', address: 'Auto Nagar, Vijayawada, Andhra Pradesh, 520007', contact: 'Venkata Rao', phone: '9848012345' },
  Mangaluru:  { name: 'Suresh Shetty', address: 'Baikampady Industrial Area, Mangaluru, Karnataka, 575011', contact: 'Suresh Shetty', phone: '9845677889' },
}

export const MOCK_INDENTS: Indent[] = [
  {
    id: 'BKG-2026-1001', contractId: 'CNT-001', contractReference: 'Kanodia Cements', status: 'PENDING',
    laneDetails: { origin: { name: 'Bengaluru', city: 'Bengaluru', state: '' }, destination: { name: 'Chandausi', city: 'Chandausi', state: '' }, distanceKm: 1980 },
    loadDetails: { commodity: 'Cargo', weightKg: 18000, volumeCbm: 32 },
    vehicleTypeRequired: 'MGV', reportingDateTime: '2026-04-26T06:00:00Z',
    slaDeadline: new Date(Date.now() + 3600000).toISOString(), createdAt: new Date(Date.now() - 1800000).toISOString(),
  },
  {
    id: 'BKG-2026-1002', contractId: 'CNT-002', contractReference: 'Shree Cements', status: 'PENDING',
    laneDetails: { origin: { name: 'Bengaluru', city: 'Bengaluru', state: '' }, destination: { name: 'Hyderabad', city: 'Hyderabad', state: '' }, distanceKm: 570 },
    loadDetails: { commodity: 'Cargo', weightKg: 12000, volumeCbm: 40 },
    vehicleTypeRequired: 'MGV', reportingDateTime: '2026-04-27T08:00:00Z',
    slaDeadline: new Date(Date.now() + 7200000).toISOString(), createdAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 'BKG-2026-1003', contractId: 'CNT-001', contractReference: 'Kanodia Cements', status: 'PENDING',
    laneDetails: { origin: { name: 'Bengaluru', city: 'Bengaluru', state: '' }, destination: { name: 'Chennai', city: 'Chennai', state: '' }, distanceKm: 350 },
    loadDetails: { commodity: 'Cargo', weightKg: 5000, volumeCbm: 15 },
    vehicleTypeRequired: 'MGV', reportingDateTime: '2026-04-28T10:00:00Z',
    slaDeadline: new Date(Date.now() + 14400000).toISOString(), createdAt: new Date(Date.now() - 7200000).toISOString(),
  },
  {
    id: 'BKG-2026-1004', contractId: 'CNT-001', contractReference: 'Kanodia Cements', status: 'DECLINED',
    laneDetails: { origin: { name: 'Bengaluru', city: 'Bengaluru', state: '' }, destination: { name: 'Mysuru', city: 'Mysuru', state: '' }, distanceKm: 145 },
    loadDetails: { commodity: 'Cargo', weightKg: 10000, volumeCbm: 20 },
    vehicleTypeRequired: 'MGV', reportingDateTime: '2026-04-25T06:00:00Z',
    slaDeadline: new Date(Date.now() - 3600000).toISOString(), createdAt: new Date(Date.now() - 86400000).toISOString(),
    rejectionReason: 'Vehicle availability not aligned with required dispatch window',
  },
  {
    id: 'BKG-2026-1005', contractId: 'CNT-001', contractReference: 'Kanodia Cements', status: 'ACCEPTED',
    laneDetails: { origin: { name: 'Bengaluru', city: 'Bengaluru', state: '' }, destination: { name: 'Hubballi', city: 'Hubballi', state: '' }, distanceKm: 410 },
    loadDetails: { commodity: 'Cargo', weightKg: 5000, volumeCbm: 10 },
    vehicleTypeRequired: 'MGV', reportingDateTime: '2026-04-26T12:00:00Z',
    slaDeadline: new Date(Date.now() + 3600000).toISOString(), createdAt: new Date(Date.now() - 3600000).toISOString(),
    assignedVehicleId: 'VH-001',
    assignedDriverId: 'DR-001',
  }
]

export const MOCK_TRIPS: Trip[] = [
  {
    id: 'BKG-2026-1060', contractId: 'CNT-001', indentId: 'BKG-2026-1110', status: 'ACCEPTED',
    laneDetails: { origin: { name: 'Bengaluru', city: 'Bengaluru', state: '' }, destination: { name: 'Tumakuru', city: 'Tumakuru', state: '' }, distanceKm: 70 },
    // Vehicle pending — filled only when the vendor assigns, like cross-module bookings.
    assignedVehicle: { id: '', registrationNumber: '—', type: 'MGV' },
    assignedDriver: { id: '', name: '—', mobile: '' },
    documents: [],
    timeline: [
      { id: 'tt-60a', title: 'Accepted', description: 'Vendor accepted booking, awaiting vehicle assignment', timestamp: new Date(Date.now() - 900000).toISOString(), status: 'ACCEPTED' },
    ],
    freightRate: 38000, slaFlag: 'ON_TIME', isInvoiced: false,
    createdAt: new Date(Date.now() - 900000).toISOString(),
  },
  {
    id: 'BKG-2026-1050', contractId: 'CNT-001', indentId: 'BKG-2026-1104', status: 'ASSIGNED',
    laneDetails: { origin: { name: 'Bengaluru', city: 'Bengaluru', state: '' }, destination: { name: 'Salem', city: 'Salem', state: '' }, distanceKm: 190 },
    assignedVehicle: { id: 'VH-001', registrationNumber: 'KA01JK1234', type: 'MGV' },
    assignedDriver: { id: 'DR-001', name: 'Kartik Pawar', mobile: '+91 9900154373' },
    documents: [],
    timeline: [
      { id: 'tt-50a', title: 'Accepted', description: 'Vendor accepted booking', timestamp: new Date(Date.now() - 3600000).toISOString(), status: 'ACCEPTED' },
      { id: 'tt-50b', title: 'Assigned', description: 'Vehicle and driver assigned, LR generated', timestamp: new Date(Date.now() - 1800000).toISOString(), status: 'ASSIGNED' },
    ],
    freightRate: 38000, slaFlag: 'ON_TIME', isInvoiced: false,
    createdAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 'BKG-2026-1051', contractId: 'CNT-002', indentId: 'BKG-2026-1105', status: 'OUT_FOR_PICKUP',
    laneDetails: { origin: { name: 'Bengaluru', city: 'Bengaluru', state: '' }, destination: { name: 'Pune', city: 'Pune', state: '' }, distanceKm: 840 },
    assignedVehicle: { id: 'VH-001', registrationNumber: 'KA01JK1234', type: 'MGV' },
    assignedDriver: { id: 'DR-001', name: 'Kartik Pawar', mobile: '+91 9900154373' },
    documents: [],
    timeline: [
      { id: 'tt-51a', title: 'Assigned', description: 'Vehicle assigned', timestamp: new Date(Date.now() - 7200000).toISOString(), status: 'ASSIGNED' },
      { id: 'tt-51b', title: 'Out for Pickup', description: 'Driver started movement toward pickup', timestamp: new Date(Date.now() - 3600000).toISOString(), status: 'OUT_FOR_PICKUP' },
    ],
    freightRate: 42000, slaFlag: 'ON_TIME', isInvoiced: false,
    createdAt: new Date(Date.now() - 7200000).toISOString(),
  },
  {
    id: 'BKG-2026-1061', contractId: 'CNT-001', indentId: 'BKG-2026-1111', status: 'PICKUP_REACHED',
    laneDetails: { origin: { name: 'Bengaluru', city: 'Bengaluru', state: '' }, destination: { name: 'Vijayawada', city: 'Vijayawada', state: '' }, distanceKm: 650 },
    assignedVehicle: { id: 'VH-001', registrationNumber: 'KA01JK1234', type: 'MGV' },
    assignedDriver: { id: 'DR-001', name: 'Kartik Pawar', mobile: '+91 9900154373' },
    documents: [],
    timeline: [
      { id: 'tt-61a', title: 'Assigned', description: 'Vehicle assigned', timestamp: new Date(Date.now() - 14400000).toISOString(), status: 'ASSIGNED' },
      { id: 'tt-61b', title: 'Out for Pickup', description: 'Driver moving to pickup', timestamp: new Date(Date.now() - 10800000).toISOString(), status: 'OUT_FOR_PICKUP' },
      { id: 'tt-61c', title: 'Pickup Reached', description: 'Vehicle entered pickup geofence', timestamp: new Date(Date.now() - 1800000).toISOString(), status: 'PICKUP_REACHED' },
    ],
    freightRate: 31000, slaFlag: 'ON_TIME', isInvoiced: false,
    createdAt: new Date(Date.now() - 14400000).toISOString(),
  },
  {
    id: 'BKG-2026-1052', contractId: 'CNT-001', indentId: 'BKG-2026-1106', status: 'LOADING_STARTED',
    laneDetails: { origin: { name: 'Bengaluru', city: 'Bengaluru', state: '' }, destination: { name: 'Mangaluru', city: 'Mangaluru', state: '' }, distanceKm: 355 },
    assignedVehicle: { id: 'VH-001', registrationNumber: 'KA01JK1234', type: 'MGV' },
    assignedDriver: { id: 'DR-001', name: 'Kartik Pawar', mobile: '+91 9900154373' },
    documents: [],
    timeline: [
      { id: 'tt-52a', title: 'Assigned', description: 'Vehicle assigned', timestamp: new Date(Date.now() - 14400000).toISOString(), status: 'ASSIGNED' },
      { id: 'tt-52b', title: 'Pickup Reached', description: 'Reached pickup location', timestamp: new Date(Date.now() - 7200000).toISOString(), status: 'PICKUP_REACHED' },
      { id: 'tt-52c', title: 'Loading Started', description: 'Loading started at pickup', timestamp: new Date(Date.now() - 1800000).toISOString(), status: 'LOADING_STARTED' },
    ],
    freightRate: 31000, slaFlag: 'ON_TIME', isInvoiced: false,
    createdAt: new Date(Date.now() - 14400000).toISOString(),
  },
  {
    id: 'BKG-2026-1062', contractId: 'CNT-002', indentId: 'BKG-2026-1112', status: 'LOADING_COMPLETED',
    laneDetails: { origin: { name: 'Bengaluru', city: 'Bengaluru', state: '' }, destination: { name: 'Chandausi', city: 'Chandausi', state: '' }, distanceKm: 1980 },
    assignedVehicle: { id: 'VH-001', registrationNumber: 'KA01JK1234', type: 'MGV' },
    assignedDriver: { id: 'DR-001', name: 'Kartik Pawar', mobile: '+91 9900154373' },
    documents: [],
    timeline: [
      { id: 'tt-62a', title: 'Loading Started', description: 'Loading underway', timestamp: new Date(Date.now() - 10800000).toISOString(), status: 'LOADING_STARTED' },
      { id: 'tt-62b', title: 'Loading Completed', description: 'Loading completed; awaiting invoice + e-way bill + LR', timestamp: new Date(Date.now() - 1800000).toISOString(), status: 'LOADING_COMPLETED' },
    ],
    freightRate: 22000, slaFlag: 'ON_TIME', isInvoiced: false,
    createdAt: new Date(Date.now() - 21600000).toISOString(),
  },
  {
    id: 'BKG-2026-1044', contractId: 'CNT-001', indentId: 'BKG-2026-1098', status: 'IN_TRANSIT',
    laneDetails: { origin: { name: 'Bengaluru', city: 'Bengaluru', state: '' }, destination: { name: 'Hyderabad', city: 'Hyderabad', state: '' }, distanceKm: 570 },
    assignedVehicle: { id: 'VH-001', registrationNumber: 'KA01JK1234', type: 'MGV' },
    assignedDriver: { id: 'DR-001', name: 'Kartik Pawar', mobile: '+91 9900154373' },
    documents: [
      { id: 'td-1', type: 'POD_COPY', title: 'POD copy', fileName: 'pod-trp-044.pdf', fileUrl: '/docs/pod-trp-044.pdf', createdAt: '2026-04-22T16:30:00Z', note: 'Awaiting driver upload' },
      { id: 'td-2', type: 'EWAY_BILL', title: 'E-way bill copy', fileName: 'ewaybill-trp-044.pdf', fileUrl: '/docs/ewaybill-trp-044.pdf', createdAt: '2026-04-22T08:30:00Z' },
    ],
    timeline: [
      { id: 'tt-1', title: 'Assigned', description: 'Vehicle and driver assigned', timestamp: '2026-04-22T08:05:00Z', status: 'ASSIGNED' },
      { id: 'tt-2', title: 'In Transit', description: 'Truck is en route to destination', timestamp: '2026-04-22T11:30:00Z', status: 'IN_TRANSIT' },
    ],
    freightRate: 45000, slaFlag: 'ON_TIME', isInvoiced: false,
    createdAt: '2026-04-22T08:00:00Z',
  },
  {
    id: 'BKG-2026-1042', contractId: 'CNT-002', indentId: 'BKG-2026-1096', status: 'IN_TRANSIT',
    laneDetails: { origin: { name: 'Bengaluru', city: 'Bengaluru', state: '' }, destination: { name: 'Chennai', city: 'Chennai', state: '' }, distanceKm: 350 },
    assignedVehicle: { id: 'VH-001', registrationNumber: 'KA01JK1234', type: 'MGV' },
    assignedDriver: { id: 'DR-001', name: 'Kartik Pawar', mobile: '+91 9900154373' },
    documents: [
      { id: 'td-6', type: 'EWAY_BILL', title: 'E-way bill copy', fileName: 'ewaybill-trp-042.pdf', fileUrl: '/docs/ewaybill-trp-042.pdf', createdAt: '2026-04-22T09:30:00Z' },
    ],
    timeline: [
      { id: 'tt-5', title: 'In Transit', description: 'Loaded and dispatched from Pune yard', timestamp: '2026-04-22T10:00:00Z', status: 'IN_TRANSIT' },
    ],
    freightRate: 65000, slaFlag: 'ON_TIME', isInvoiced: false,
    createdAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 'BKG-2026-1045', contractId: 'CNT-002', indentId: 'BKG-2026-1099', status: 'IN_TRANSIT', exceptionFlag: true,
    disruption: { reason: 'DRIVER_BREAKDOWN', reportedAt: '2026-04-26T13:00:00Z', notes: 'Driver fell ill at unloading point; awaiting replacement.' },
    laneDetails: { origin: { name: 'Bengaluru', city: 'Bengaluru', state: '' }, destination: { name: 'Mysuru', city: 'Mysuru', state: '' }, distanceKm: 145 },
    assignedVehicle: { id: 'VH-001', registrationNumber: 'KA01JK1234', type: 'MGV' },
    assignedDriver: { id: 'DR-001', name: 'Kartik Pawar', mobile: '+91 9900154373' },
    documents: [
      { id: 'td-9', type: 'REMARKS', title: 'Remarks', fileName: 'remarks-trp-045.json', fileUrl: '/docs/remarks-trp-045.json', createdAt: '2026-04-26T11:00:00Z', note: 'Exception report available' },
    ],
    timeline: [
      { id: 'tt-7', title: 'Disruption reported', description: 'Driver breakdown at unloading point', timestamp: '2026-04-26T13:00:00Z', status: 'IN_TRANSIT' },
    ],
    freightRate: 15000, slaFlag: 'DELAYED', isInvoiced: false,
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 'BKG-2026-1048', contractId: 'CNT-002', indentId: 'BKG-2026-1102', status: 'IN_TRANSIT', exceptionFlag: true,
    disruption: { reason: 'VEHICLE_BREAKDOWN', reportedAt: '2026-04-27T12:00:00Z', notes: 'Engine failure 60km before destination — vehicle replacement required.' },
    laneDetails: { origin: { name: 'Bengaluru', city: 'Bengaluru', state: '' }, destination: { name: 'Hubballi', city: 'Hubballi', state: '' }, distanceKm: 410 },
    assignedVehicle: { id: 'VH-001', registrationNumber: 'KA01JK1234', type: 'MGV' },
    assignedDriver: { id: 'DR-001', name: 'Kartik Pawar', mobile: '+91 9900154373' },
    documents: [
      { id: 'td-13', type: 'REMARKS', title: 'Disruption remarks', fileName: 'disrupted-trp-048.json', fileUrl: '/docs/disrupted-trp-048.json', createdAt: '2026-04-27T12:00:00Z', note: 'Route disruption due to road closure' },
    ],
    timeline: [
      { id: 'tt-10', title: 'Disrupted', description: 'Vehicle breakdown during transit', timestamp: '2026-04-27T12:00:00Z', status: 'IN_TRANSIT' },
    ],
    freightRate: 18000, slaFlag: 'DELAYED', isInvoiced: false,
    createdAt: '2026-04-26T08:00:00Z',
  },
  {
    id: 'BKG-2026-1049', contractId: 'CNT-001', indentId: 'BKG-2026-1103', status: 'IN_TRANSIT', exceptionFlag: true,
    disruption: { reason: 'VEHICLE_OR_DRIVER_BREAKDOWN', reportedAt: '2026-04-28T07:30:00Z', notes: 'Reported mechanical issue and driver fatigue; both replacements requested.' },
    laneDetails: { origin: { name: 'Bengaluru', city: 'Bengaluru', state: '' }, destination: { name: 'Tumakuru', city: 'Tumakuru', state: '' }, distanceKm: 70 },
    assignedVehicle: { id: 'VH-001', registrationNumber: 'KA01JK1234', type: 'MGV' },
    assignedDriver: { id: 'DR-001', name: 'Kartik Pawar', mobile: '+91 9900154373' },
    documents: [],
    timeline: [
      { id: 'tt-11', title: 'Disrupted', description: 'Vehicle and driver replacement requested', timestamp: '2026-04-28T07:30:00Z', status: 'IN_TRANSIT' },
    ],
    freightRate: 24000, slaFlag: 'ON_TIME', isInvoiced: false,
    createdAt: '2026-04-27T18:00:00Z',
  },
  {
    id: 'BKG-2026-1063', contractId: 'CNT-001', indentId: 'BKG-2026-1113', status: 'DESTINATION_REACHED',
    laneDetails: { origin: { name: 'Bengaluru', city: 'Bengaluru', state: '' }, destination: { name: 'Salem', city: 'Salem', state: '' }, distanceKm: 190 },
    assignedVehicle: { id: 'VH-001', registrationNumber: 'KA01JK1234', type: 'MGV' },
    assignedDriver: { id: 'DR-001', name: 'Kartik Pawar', mobile: '+91 9900154373' },
    documents: [
      { id: 'td-16', type: 'EWAY_BILL', title: 'E-way bill copy', fileName: 'ewaybill-trp-063.pdf', fileUrl: '/docs/ewaybill-trp-063.pdf', createdAt: '2026-05-18T07:00:00Z' },
    ],
    timeline: [
      { id: 'tt-63a', title: 'In Transit', description: 'Dispatched from origin', timestamp: '2026-05-18T07:00:00Z', status: 'IN_TRANSIT' },
      { id: 'tt-63b', title: 'Destination Reached', description: 'Vehicle entered delivery geofence', timestamp: new Date(Date.now() - 900000).toISOString(), status: 'DESTINATION_REACHED' },
    ],
    freightRate: 52000, slaFlag: 'ON_TIME', isInvoiced: false,
    createdAt: '2026-05-18T06:30:00Z',
  },
  {
    id: 'BKG-2026-1053', contractId: 'CNT-002', indentId: 'BKG-2026-1104', status: 'POD_PENDING',
    laneDetails: { origin: { name: 'Bengaluru', city: 'Bengaluru', state: '' }, destination: { name: 'Pune', city: 'Pune', state: '' }, distanceKm: 840 },
    assignedVehicle: { id: 'VH-001', registrationNumber: 'KA01JK1234', type: 'MGV' },
    assignedDriver: { id: 'DR-001', name: 'Kartik Pawar', mobile: '+91 9900154373' },
    deliveredDate: '2026-05-17T17:30:00Z', podStatus: 'PENDING',
    documents: [
      { id: 'td-14', type: 'REMARKS', title: 'Delivery note', fileName: 'delivery-note-trp-053.txt', fileUrl: '/docs/delivery-note-trp-053.txt', createdAt: '2026-05-17T18:00:00Z', note: 'Awaiting consignee POD upload' },
    ],
    timeline: [
      { id: 'tt-12', title: 'Destination Reached', description: 'Reached delivery location', timestamp: '2026-05-17T16:30:00Z', status: 'DESTINATION_REACHED' },
      { id: 'tt-12b', title: 'POD Pending', description: 'Delivery handed over; POD pending from destination team', timestamp: '2026-05-17T17:30:00Z', status: 'POD_PENDING' },
    ],
    freightRate: 36000, slaFlag: 'ON_TIME', isInvoiced: false,
    createdAt: '2026-05-16T08:30:00Z',
  },
  {
    id: 'BKG-2026-1046', contractId: 'CNT-001', indentId: 'BKG-2026-1100', status: 'POD_PENDING',
    laneDetails: { origin: { name: 'Bengaluru', city: 'Bengaluru', state: '' }, destination: { name: 'Vijayawada', city: 'Vijayawada', state: '' }, distanceKm: 650 },
    assignedVehicle: { id: 'VH-001', registrationNumber: 'KA01JK1234', type: 'MGV' },
    assignedDriver: { id: 'DR-001', name: 'Kartik Pawar', mobile: '+91 9900154373' },
    deliveredDate: '2026-04-26T09:00:00Z', podStatus: 'PENDING',
    documents: [
      { id: 'td-10', type: 'POD_COPY', title: 'POD copy', fileName: 'pod-trp-046.pdf', fileUrl: '/docs/pod-trp-046.pdf', createdAt: '2026-04-26T09:15:00Z', note: 'POD pending upload from consignee' },
      { id: 'td-11', type: 'EWAY_BILL', title: 'E-way bill copy', fileName: 'ewaybill-trp-046.pdf', fileUrl: '/docs/ewaybill-trp-046.pdf', createdAt: '2026-04-25T07:00:00Z' },
    ],
    timeline: [
      { id: 'tt-8', title: 'POD Pending', description: 'Delivery handed over; awaiting POD', timestamp: '2026-04-26T09:00:00Z', status: 'POD_PENDING' },
    ],
    freightRate: 32000, slaFlag: 'ON_TIME', isInvoiced: false,
    createdAt: '2026-04-25T06:00:00Z',
  },
  {
    id: 'BKG-2026-1043', contractId: 'CNT-001', indentId: 'BKG-2026-1097', status: 'COMPLETED',
    laneDetails: { origin: { name: 'Bengaluru', city: 'Bengaluru', state: '' }, destination: { name: 'Mangaluru', city: 'Mangaluru', state: '' }, distanceKm: 355 },
    assignedVehicle: { id: 'VH-001', registrationNumber: 'KA01JK1234', type: 'MGV' },
    assignedDriver: { id: 'DR-001', name: 'Kartik Pawar', mobile: '+91 9900154373' },
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
    freightRate: 45000, slaFlag: 'ON_TIME', isInvoiced: false,
    createdAt: '2026-04-18T08:00:00Z',
  },
  {
    id: 'BKG-2026-1041', contractId: 'CNT-001', indentId: 'BKG-2026-1095', status: 'COMPLETED',
    laneDetails: { origin: { name: 'Bengaluru', city: 'Bengaluru', state: '' }, destination: { name: 'Chandausi', city: 'Chandausi', state: '' }, distanceKm: 1980 },
    assignedVehicle: { id: 'VH-001', registrationNumber: 'KA01JK1234', type: 'MGV' },
    assignedDriver: { id: 'DR-001', name: 'Kartik Pawar', mobile: '+91 9900154373' },
    deliveredDate: '2026-04-10T16:00:00Z', podStatus: 'CONFIRMED', podReference: 'POD-041',
    documents: [
      { id: 'td-7', type: 'INVOICE_COPY', title: 'Invoice copy', fileName: 'invoice-trp-041.pdf', fileUrl: '/docs/invoice-trp-041.pdf', createdAt: '2026-04-11T10:00:00Z' },
      { id: 'td-8', type: 'POD_COPY', title: 'POD copy', fileName: 'pod-trp-041.pdf', fileUrl: '/docs/pod-trp-041.pdf', createdAt: '2026-04-10T17:00:00Z' },
    ],
    timeline: [
      { id: 'tt-6', title: 'Completed', description: 'Booking completed and invoiced', timestamp: '2026-04-10T16:00:00Z', status: 'COMPLETED' },
    ],
    freightRate: 50000, slaFlag: 'ON_TIME', isInvoiced: true,
    createdAt: '2026-04-05T08:00:00Z',
  },
  {
    id: 'BKG-2026-1047', contractId: 'CNT-001', indentId: 'BKG-2026-1101', status: 'COMPLETED',
    laneDetails: { origin: { name: 'Bengaluru', city: 'Bengaluru', state: '' }, destination: { name: 'Hyderabad', city: 'Hyderabad', state: '' }, distanceKm: 570 },
    assignedVehicle: { id: 'VH-001', registrationNumber: 'KA01JK1234', type: 'MGV' },
    assignedDriver: { id: 'DR-001', name: 'Kartik Pawar', mobile: '+91 9900154373' },
    deliveredDate: '2026-04-24T10:00:00Z', podStatus: 'CONFIRMED', podReference: 'POD-047',
    documents: [
      { id: 'td-12', type: 'POD_COPY', title: 'POD copy', fileName: 'pod-trp-047.pdf', fileUrl: '/docs/pod-trp-047.pdf', createdAt: '2026-04-24T10:30:00Z' },
    ],
    timeline: [
      { id: 'tt-9', title: 'Completed', description: 'Delivered, POD confirmed, booking ended', timestamp: '2026-04-24T10:00:00Z', status: 'COMPLETED' },
    ],
    freightRate: 28000, slaFlag: 'ON_TIME', isInvoiced: false,
    createdAt: '2026-04-24T08:00:00Z',
  },
  // Completed, POD-confirmed, not yet invoiced — feed the Create Invoice flow.
  {
    id: 'BKG-2026-1055', contractId: 'CNT-001', indentId: 'BKG-2026-1106', status: 'COMPLETED',
    laneDetails: { origin: { name: 'Bengaluru', city: 'Bengaluru', state: '' }, destination: { name: 'Pune', city: 'Pune', state: '' }, distanceKm: 840 },
    assignedVehicle: { id: 'VH-001', registrationNumber: 'KA01JK1234', type: 'MGV' },
    assignedDriver: { id: 'DR-001', name: 'Kartik Pawar', mobile: '+91 9900154373' },
    deliveredDate: '2026-05-20T14:30:00Z', podStatus: 'CONFIRMED', podReference: 'POD-055',
    documents: [
      { id: 'td-101', type: 'POD_COPY', title: 'POD copy', fileName: 'pod-trp-055.pdf', fileUrl: '/docs/pod-trp-055.pdf', createdAt: '2026-05-20T15:00:00Z' },
      { id: 'td-102', type: 'LR_COPY', title: 'LR copy', fileName: 'lr-trp-055.pdf', fileUrl: '/docs/lr-trp-055.pdf', createdAt: '2026-05-18T08:30:00Z' },
    ],
    timeline: [
      { id: 'tt-101', title: 'In Transit', description: 'Trip released from hub', timestamp: '2026-05-18T09:00:00Z', status: 'IN_TRANSIT' },
      { id: 'tt-102', title: 'Completed', description: 'Delivered, POD confirmed, booking ended', timestamp: '2026-05-20T14:30:00Z', status: 'COMPLETED' },
    ],
    freightRate: 36500, slaFlag: 'ON_TIME', isInvoiced: false,
    createdAt: '2026-05-18T07:30:00Z',
  },
  {
    id: 'BKG-2026-1056', contractId: 'CNT-001', indentId: 'BKG-2026-1107', status: 'COMPLETED',
    laneDetails: { origin: { name: 'Bengaluru', city: 'Bengaluru', state: '' }, destination: { name: 'Coimbatore', city: 'Coimbatore', state: '' }, distanceKm: 365 },
    assignedVehicle: { id: 'VH-002', registrationNumber: 'KA05MN5678', type: 'LCV' },
    assignedDriver: { id: 'DR-002', name: 'Suresh Kumar', mobile: '+91 9886011223' },
    deliveredDate: '2026-05-24T11:15:00Z', podStatus: 'CONFIRMED', podReference: 'POD-056',
    documents: [
      { id: 'td-103', type: 'POD_COPY', title: 'POD copy', fileName: 'pod-trp-056.pdf', fileUrl: '/docs/pod-trp-056.pdf', createdAt: '2026-05-24T11:45:00Z' },
    ],
    timeline: [
      { id: 'tt-103', title: 'Completed', description: 'Delivered, POD confirmed, booking ended', timestamp: '2026-05-24T11:15:00Z', status: 'COMPLETED' },
    ],
    freightRate: 21500, slaFlag: 'ON_TIME', isInvoiced: false,
    createdAt: '2026-05-23T06:45:00Z',
  },
  {
    id: 'BKG-2026-1057', contractId: 'CNT-002', indentId: 'BKG-2026-1108', status: 'COMPLETED',
    laneDetails: { origin: { name: 'Bengaluru', city: 'Bengaluru', state: '' }, destination: { name: 'Mumbai', city: 'Mumbai', state: '' }, distanceKm: 985 },
    assignedVehicle: { id: 'VH-001', registrationNumber: 'KA01JK1234', type: 'MGV' },
    assignedDriver: { id: 'DR-001', name: 'Kartik Pawar', mobile: '+91 9900154373' },
    deliveredDate: '2026-05-28T18:00:00Z', podStatus: 'CONFIRMED', podReference: 'POD-057',
    documents: [
      { id: 'td-104', type: 'POD_COPY', title: 'POD copy', fileName: 'pod-trp-057.pdf', fileUrl: '/docs/pod-trp-057.pdf', createdAt: '2026-05-28T18:30:00Z' },
      { id: 'td-105', type: 'EWAY_BILL', title: 'E-way bill', fileName: 'eway-trp-057.pdf', fileUrl: '/docs/eway-trp-057.pdf', createdAt: '2026-05-26T07:00:00Z' },
    ],
    timeline: [
      { id: 'tt-104', title: 'In Transit', description: 'Trip released from hub', timestamp: '2026-05-26T08:00:00Z', status: 'IN_TRANSIT' },
      { id: 'tt-105', title: 'Completed', description: 'Delivered, POD confirmed, booking ended', timestamp: '2026-05-28T18:00:00Z', status: 'COMPLETED' },
    ],
    freightRate: 48500, slaFlag: 'DELAYED', isInvoiced: false,
    createdAt: '2026-05-26T06:00:00Z',
  },
  {
    id: 'BKG-2026-1058', contractId: 'CNT-002', indentId: 'BKG-2026-1109', status: 'COMPLETED',
    laneDetails: { origin: { name: 'Bengaluru', city: 'Bengaluru', state: '' }, destination: { name: 'Chennai', city: 'Chennai', state: '' }, distanceKm: 350 },
    assignedVehicle: { id: 'VH-002', registrationNumber: 'KA05MN5678', type: 'LCV' },
    assignedDriver: { id: 'DR-002', name: 'Suresh Kumar', mobile: '+91 9886011223' },
    deliveredDate: '2026-06-02T09:40:00Z', podStatus: 'CONFIRMED', podReference: 'POD-058',
    documents: [
      { id: 'td-106', type: 'POD_COPY', title: 'POD copy', fileName: 'pod-trp-058.pdf', fileUrl: '/docs/pod-trp-058.pdf', createdAt: '2026-06-02T10:00:00Z' },
    ],
    timeline: [
      { id: 'tt-106', title: 'Completed', description: 'Delivered, POD confirmed, booking ended', timestamp: '2026-06-02T09:40:00Z', status: 'COMPLETED' },
    ],
    freightRate: 23800, slaFlag: 'ON_TIME', isInvoiced: false,
    createdAt: '2026-06-01T07:15:00Z',
  },
  {
    id: 'BKG-2026-1054', contractId: 'CNT-002', indentId: 'BKG-2026-1105', status: 'CANCELLED',
    laneDetails: { origin: { name: 'Bengaluru', city: 'Bengaluru', state: '' }, destination: { name: 'Chennai', city: 'Chennai', state: '' }, distanceKm: 350 },
    assignedVehicle: { id: 'VH-001', registrationNumber: 'KA01JK1234', type: 'MGV' },
    assignedDriver: { id: 'DR-001', name: 'Kartik Pawar', mobile: '+91 9900154373' },
    documents: [
      { id: 'td-15', type: 'REMARKS', title: 'Cancellation note', fileName: 'cancelled-trp-054.txt', fileUrl: '/docs/cancelled-trp-054.txt', createdAt: '2026-05-18T10:00:00Z', note: 'Booking cancelled during POD pending stage' },
    ],
    timeline: [
      { id: 'tt-13', title: 'Cancelled', description: 'Booking cancelled', timestamp: '2026-05-18T10:00:00Z', status: 'CANCELLED' },
    ],
    freightRate: 34500, isInvoiced: false,
    createdAt: '2026-05-17T07:45:00Z',
  },
  {
    // Legacy billed booking — kept for invoice history (INV references).
    id: 'BKG-2026-1040', contractId: 'CNT-001', indentId: 'BKG-2026-1040', status: 'COMPLETED',
    laneDetails: { origin: { name: 'Bengaluru', city: 'Bengaluru', state: '' }, destination: { name: 'Chandausi', city: 'Chandausi', state: '' }, distanceKm: 1980 },
    assignedVehicle: { id: 'VH-001', registrationNumber: 'KA01JK1234', type: 'MGV' },
    assignedDriver: { id: 'DR-001', name: 'Kartik Pawar', mobile: '+91 9900154373' },
    deliveredDate: '2026-04-12T15:00:00Z', podStatus: 'CONFIRMED', podReference: 'POD-040',
    timeline: [
      { id: 'tt-40z', title: 'Completed', description: 'Delivered, POD confirmed, booking ended', timestamp: '2026-04-12T15:00:00Z', status: 'COMPLETED' },
    ],
    freightRate: 50000, slaFlag: 'ON_TIME', isInvoiced: true,
    createdAt: '2026-04-06T08:00:00Z',
  },
  {
    // Legacy billed booking — kept for invoice history (INV references).
    id: 'BKG-2026-1031', contractId: 'CNT-001', indentId: 'BKG-2026-1031', status: 'COMPLETED',
    laneDetails: { origin: { name: 'Bengaluru', city: 'Bengaluru', state: '' }, destination: { name: 'Mumbai', city: 'Mumbai', state: '' }, distanceKm: 980 },
    assignedVehicle: { id: 'VH-001', registrationNumber: 'KA01JK1234', type: 'MGV' },
    assignedDriver: { id: 'DR-001', name: 'Kartik Pawar', mobile: '+91 9900154373' },
    deliveredDate: '2026-05-11T16:00:00Z', podStatus: 'CONFIRMED', podReference: 'POD-031',
    timeline: [
      { id: 'tt-31z', title: 'Completed', description: 'Delivered, POD confirmed, booking ended', timestamp: '2026-05-11T16:00:00Z', status: 'COMPLETED' },
    ],
    freightRate: 100000, slaFlag: 'ON_TIME', isInvoiced: true,
    createdAt: '2026-05-07T08:00:00Z',
  },
  {
    // Legacy billed booking — kept for invoice history (INV references).
    id: 'BKG-2026-1032', contractId: 'CNT-001', indentId: 'BKG-2026-1032', status: 'COMPLETED',
    laneDetails: { origin: { name: 'Bengaluru', city: 'Bengaluru', state: '' }, destination: { name: 'Chennai', city: 'Chennai', state: '' }, distanceKm: 350 },
    assignedVehicle: { id: 'VH-001', registrationNumber: 'KA01JK1234', type: 'MGV' },
    assignedDriver: { id: 'DR-001', name: 'Kartik Pawar', mobile: '+91 9900154373' },
    deliveredDate: '2026-05-15T11:00:00Z', podStatus: 'CONFIRMED', podReference: 'POD-032',
    timeline: [
      { id: 'tt-32z', title: 'Completed', description: 'Delivered, POD confirmed, booking ended', timestamp: '2026-05-15T11:00:00Z', status: 'COMPLETED' },
    ],
    freightRate: 85000, slaFlag: 'ON_TIME', isInvoiced: true,
    createdAt: '2026-05-12T08:00:00Z',
  },
  {
    // Legacy billed booking — kept for invoice history (INV references).
    id: 'BKG-2026-1033', contractId: 'CNT-001', indentId: 'BKG-2026-1033', status: 'COMPLETED',
    laneDetails: { origin: { name: 'Bengaluru', city: 'Bengaluru', state: '' }, destination: { name: 'Hyderabad', city: 'Hyderabad', state: '' }, distanceKm: 570 },
    assignedVehicle: { id: 'VH-001', registrationNumber: 'KA01JK1234', type: 'MGV' },
    assignedDriver: { id: 'DR-001', name: 'Kartik Pawar', mobile: '+91 9900154373' },
    deliveredDate: '2026-05-16T12:00:00Z', podStatus: 'CONFIRMED', podReference: 'POD-033',
    timeline: [
      { id: 'tt-33z', title: 'Completed', description: 'Delivered, POD confirmed, booking ended', timestamp: '2026-05-16T12:00:00Z', status: 'COMPLETED' },
    ],
    freightRate: 92000, slaFlag: 'ON_TIME', isInvoiced: true,
    createdAt: '2026-05-13T08:00:00Z',
  },
  {
    // Legacy billed booking — kept for invoice history (INV references).
    id: 'BKG-2026-1034', contractId: 'CNT-001', indentId: 'BKG-2026-1034', status: 'COMPLETED',
    laneDetails: { origin: { name: 'Bengaluru', city: 'Bengaluru', state: '' }, destination: { name: 'Pune', city: 'Pune', state: '' }, distanceKm: 840 },
    assignedVehicle: { id: 'VH-001', registrationNumber: 'KA01JK1234', type: 'MGV' },
    assignedDriver: { id: 'DR-001', name: 'Kartik Pawar', mobile: '+91 9900154373' },
    deliveredDate: '2026-05-17T10:00:00Z', podStatus: 'CONFIRMED', podReference: 'POD-034',
    timeline: [
      { id: 'tt-34z', title: 'Completed', description: 'Delivered, POD confirmed, booking ended', timestamp: '2026-05-17T10:00:00Z', status: 'COMPLETED' },
    ],
    freightRate: 68000, slaFlag: 'ON_TIME', isInvoiced: true,
    createdAt: '2026-05-14T08:00:00Z',
  },
  {
    // Legacy billed booking — kept for invoice history (INV references).
    id: 'BKG-2026-1035', contractId: 'CNT-001', indentId: 'BKG-2026-1035', status: 'COMPLETED',
    laneDetails: { origin: { name: 'Bengaluru', city: 'Bengaluru', state: '' }, destination: { name: 'Kochi', city: 'Kochi', state: '' }, distanceKm: 550 },
    assignedVehicle: { id: 'VH-001', registrationNumber: 'KA01JK1234', type: 'MGV' },
    assignedDriver: { id: 'DR-001', name: 'Kartik Pawar', mobile: '+91 9900154373' },
    deliveredDate: '2026-05-17T18:00:00Z', podStatus: 'CONFIRMED', podReference: 'POD-035',
    timeline: [
      { id: 'tt-35z', title: 'Completed', description: 'Delivered, POD confirmed, booking ended', timestamp: '2026-05-17T18:00:00Z', status: 'COMPLETED' },
    ],
    freightRate: 74000, slaFlag: 'ON_TIME', isInvoiced: true,
    createdAt: '2026-05-14T09:00:00Z',
  },
  {
    // Legacy billed booking — kept for invoice history (INV references).
    id: 'BKG-2026-1036', contractId: 'CNT-001', indentId: 'BKG-2026-1036', status: 'COMPLETED',
    laneDetails: { origin: { name: 'Bengaluru', city: 'Bengaluru', state: '' }, destination: { name: 'Hyderabad', city: 'Hyderabad', state: '' }, distanceKm: 570 },
    assignedVehicle: { id: 'VH-001', registrationNumber: 'KA01JK1234', type: 'MGV' },
    assignedDriver: { id: 'DR-001', name: 'Kartik Pawar', mobile: '+91 9900154373' },
    deliveredDate: '2026-05-16T17:00:00Z', podStatus: 'CONFIRMED', podReference: 'POD-036',
    timeline: [
      { id: 'tt-36z', title: 'Completed', description: 'Delivered, POD confirmed, booking ended', timestamp: '2026-05-16T17:00:00Z', status: 'COMPLETED' },
    ],
    freightRate: 58000, slaFlag: 'ON_TIME', isInvoiced: true,
    createdAt: '2026-05-13T09:00:00Z',
  },
  {
    // Legacy billed booking — kept for invoice history (INV references).
    id: 'BKG-2026-1037', contractId: 'CNT-001', indentId: 'BKG-2026-1037', status: 'COMPLETED',
    laneDetails: { origin: { name: 'Bengaluru', city: 'Bengaluru', state: '' }, destination: { name: 'Mysuru', city: 'Mysuru', state: '' }, distanceKm: 145 },
    assignedVehicle: { id: 'VH-001', registrationNumber: 'KA01JK1234', type: 'MGV' },
    assignedDriver: { id: 'DR-001', name: 'Kartik Pawar', mobile: '+91 9900154373' },
    deliveredDate: '2026-05-15T14:00:00Z', podStatus: 'CONFIRMED', podReference: 'POD-037',
    timeline: [
      { id: 'tt-37z', title: 'Completed', description: 'Delivered, POD confirmed, booking ended', timestamp: '2026-05-15T14:00:00Z', status: 'COMPLETED' },
    ],
    freightRate: 47000, slaFlag: 'ON_TIME', isInvoiced: true,
    createdAt: '2026-05-13T07:00:00Z',
  },
  {
    // Legacy billed booking — kept for invoice history (INV references).
    id: 'BKG-2026-1038', contractId: 'CNT-001', indentId: 'BKG-2026-1038', status: 'COMPLETED',
    laneDetails: { origin: { name: 'Bengaluru', city: 'Bengaluru', state: '' }, destination: { name: 'Chennai', city: 'Chennai', state: '' }, distanceKm: 350 },
    assignedVehicle: { id: 'VH-001', registrationNumber: 'KA01JK1234', type: 'MGV' },
    assignedDriver: { id: 'DR-001', name: 'Kartik Pawar', mobile: '+91 9900154373' },
    deliveredDate: '2026-05-14T13:00:00Z', podStatus: 'CONFIRMED', podReference: 'POD-038',
    timeline: [
      { id: 'tt-38z', title: 'Completed', description: 'Delivered, POD confirmed, booking ended', timestamp: '2026-05-14T13:00:00Z', status: 'COMPLETED' },
    ],
    freightRate: 39000, slaFlag: 'ON_TIME', isInvoiced: false,
    createdAt: '2026-05-12T07:00:00Z',
  },
  {
    // Legacy billed booking — kept for invoice history (INV references).
    id: 'BKG-2026-1039', contractId: 'CNT-001', indentId: 'BKG-2026-1039', status: 'COMPLETED',
    laneDetails: { origin: { name: 'Bengaluru', city: 'Bengaluru', state: '' }, destination: { name: 'Hubballi', city: 'Hubballi', state: '' }, distanceKm: 410 },
    assignedVehicle: { id: 'VH-001', registrationNumber: 'KA01JK1234', type: 'MGV' },
    assignedDriver: { id: 'DR-001', name: 'Kartik Pawar', mobile: '+91 9900154373' },
    deliveredDate: '2026-05-12T16:00:00Z', podStatus: 'CONFIRMED', podReference: 'POD-039',
    timeline: [
      { id: 'tt-39z', title: 'Completed', description: 'Delivered, POD confirmed, booking ended', timestamp: '2026-05-12T16:00:00Z', status: 'COMPLETED' },
    ],
    freightRate: 59000, slaFlag: 'ON_TIME', isInvoiced: true,
    createdAt: '2026-05-10T07:00:00Z',
  },
]


export const MOCK_VEHICLES: Vehicle[] = [
  // Mirrors the vehicle onboarded by Mahesh Transport through the tenant
  // workspace (shared master data), so standalone and embedded show the same fleet.
  {
    id: 'VH-001', registrationNumber: 'KA01JK1234', vehicleType: 'MGV',
    manufacturer: 'TATA', model: 'TATA', year: '2012', fuelType: 'Diesel',
    engineNumber: 'sefeffeqw', chassisNumber: 'qewrwdewdew',
    capacityKg: '15000',
    baseLocation: 'KA', operationalStatus: 'ACTIVE', complianceStatus: 'COMPLIANT',
    complianceDocuments: [
      { id: 'doc-rc', type: 'RC', fileName: '6925_CONSIGNOR_COPY.pdf', fileUrl: '/docs/6925_CONSIGNOR_COPY.pdf', expiryDate: '2027-06-01', status: 'VALID', uploadedAt: '2026-06-01' },
      { id: 'doc-ins', type: 'Insurance', fileName: 'LR copy format for AI.pdf', fileUrl: '/docs/LR copy format for AI.pdf', expiryDate: '2027-06-01', status: 'VALID', uploadedAt: '2026-06-01' },
      { id: 'doc-puc', type: 'PUC', fileName: 'Bill Format Print File.pdf', fileUrl: '/docs/Bill Format Print File.pdf', expiryDate: '2027-06-01', status: 'VALID', uploadedAt: '2026-06-01' },
      { id: 'doc-fc', type: 'FC', fileName: 'Bill Format Print File.pdf', fileUrl: '/docs/Bill Format Print File.pdf', expiryDate: '2027-06-01', status: 'VALID', uploadedAt: '2026-06-01' },
      { id: 'doc-np', type: 'NationalPermit', fileName: 'Bill Format Print File.pdf', fileUrl: '/docs/Bill Format Print File.pdf', expiryDate: '2027-06-01', status: 'VALID', uploadedAt: '2026-06-01' },
    ],
    blackoutDates: [],
  },
]

export const MOCK_DRIVERS: Driver[] = [
  // Mirrors the driver onboarded by Mahesh Transport through the tenant workspace.
  {
    id: 'DR-001', name: 'Kartik Pawar', mobile: '+91 9900154373',
    licenseNumber: 'DL002323', licenseExpiry: '2027-06-01', licenseClass: ['HMV'],
    complianceStatus: 'COMPLIANT', currentStatus: 'ACTIVE',
    gender: 'Male', email: 'kartikpawar391@gmail.com', baseLocation: 'KA',
    aadhaarMasked: '21324832947324324',
    dlName: 'Kartik Pawar', dlVerified: true, dlValidTillDate: '2027-06-01',
    complianceDocuments: [
      { id: 'dd-dl', type: 'DL', fileName: 'Bill Format Print File.pdf', fileUrl: '/docs/Bill Format Print File.pdf', expiryDate: '2027-06-01', status: 'VALID', uploadedAt: '2026-06-01' },
      { id: 'dd-med', type: 'MedicalCertificate', fileName: 'Bill Format Print File.pdf', fileUrl: '/docs/Bill Format Print File.pdf', expiryDate: '2027-06-01', status: 'VALID', uploadedAt: '2026-06-01' },
    ],
  },
]

export const MOCK_CAPACITY: CapacityDeclaration[] = [
  { id: 'cap1', vehicleType: 'MGV', availableQuantity: 15, baseOperatingHubs: ['Mumbai', 'Pune', 'Nashik'], blackoutDates: [] },
  { id: 'cap2', vehicleType: 'MGV', availableQuantity: 8, baseOperatingHubs: ['Mumbai', 'Delhi'], blackoutDates: [{ from: '2026-05-01', to: '2026-05-05' }] },
]

export const MOCK_INVOICES: Invoice[] = [
  {
    id: 'INV-2026-001', invoiceNumber: 'INV-2026-001', invoiceDate: '2026-04-15', vendorGstin: '29AABCF1234M1ZP',
    customerGstin: '27AABCU9603R1ZM', billingPeriod: { from: '2026-04-01', to: '2026-04-15' },
    paymentDueDate: '2026-05-15', status: 'APPROVED', paymentDate: '2026-05-12',
    lineItems: [
      { tripId: 'BKG-2026-1040', tripReference: 'BKG-2026-1040', freightCharge: 50000, lineTotal: 50000 },
      { tripId: 'BKG-2026-1041', tripReference: 'BKG-2026-1041', freightCharge: 50000, lineTotal: 50000 },
    ],
    subtotal: 100000, gstAmount: 12000, grandTotal: 112000, pdfUrl: '/invoices/INV-2026-001.pdf', tripReferences: ['BKG-2026-1040', 'BKG-2026-1041'], createdAt: '2026-04-15T12:00:00Z',
  },
  {
    id: 'INV-2026-002', invoiceNumber: 'INV-2026-002', invoiceDate: '2026-05-13', vendorGstin: '29AABCF1234M1ZP',
    customerGstin: '27AABCU9603R1ZM', billingPeriod: { from: '2026-05-01', to: '2026-05-13' },
    paymentDueDate: '2026-06-12', status: 'APPROVED',
    lineItems: [
      { tripId: 'BKG-2026-1031', tripReference: 'BKG-2026-1031', freightCharge: 100000, lineTotal: 100000 }
    ],
    subtotal: 100000, gstAmount: 12000, grandTotal: 112000, pdfUrl: '/invoices/INV-2026-002.pdf', tripReferences: ['BKG-2026-1031'], createdAt: '2026-05-13T10:00:00Z',
  },
  {
    id: 'INV-2026-003', invoiceNumber: 'INV-2026-003', invoiceDate: '2026-05-17', vendorGstin: '29AABCF1234M1ZP',
    customerGstin: '27AABCU9603R1ZM', billingPeriod: { from: '2026-05-14', to: '2026-05-17' },
    paymentDueDate: '2026-06-16', status: 'APPROVED',
    lineItems: [{ tripId: 'BKG-2026-1032', tripReference: 'BKG-2026-1032', freightCharge: 85000, lineTotal: 85000 }],
    subtotal: 85000, gstAmount: 10200, grandTotal: 95200, pdfUrl: '/invoices/INV-2026-003.pdf', tripReferences: ['BKG-2026-1032'], createdAt: '2026-05-17T10:00:00Z',
  },
  {
    id: 'INV-2026-004', invoiceNumber: 'INV-2026-004', invoiceDate: '2026-05-18', vendorGstin: '29AABCF1234M1ZP',
    customerGstin: '27AABCU9603R1ZM', billingPeriod: { from: '2026-05-15', to: '2026-05-18' },
    paymentDueDate: '2026-06-17', status: 'APPROVED',
    lineItems: [{ tripId: 'BKG-2026-1033', tripReference: 'BKG-2026-1033', freightCharge: 92000, lineTotal: 92000 }],
    subtotal: 92000, gstAmount: 11040, grandTotal: 103040, pdfUrl: '/invoices/INV-2026-004.pdf', tripReferences: ['BKG-2026-1033'], createdAt: '2026-05-18T10:00:00Z',
  },
  {
    id: 'INV-2026-005', invoiceNumber: 'INV-2026-005', invoiceDate: '2026-05-19', vendorGstin: '29AABCF1234M1ZP',
    customerGstin: '27AABCU9603R1ZM', billingPeriod: { from: '2026-05-16', to: '2026-05-19' },
    paymentDueDate: '2026-06-18', status: 'APPROVED',
    lineItems: [{ tripId: 'BKG-2026-1034', tripReference: 'BKG-2026-1034', freightCharge: 68000, lineTotal: 68000 }],
    subtotal: 68000, gstAmount: 8160, grandTotal: 76160, pdfUrl: '/invoices/INV-2026-005.pdf', tripReferences: ['BKG-2026-1034'], createdAt: '2026-05-19T10:00:00Z',
  },
  {
    id: 'INV-2026-006', invoiceNumber: 'INV-2026-006', invoiceDate: '2026-05-19', vendorGstin: '29AABCF1234M1ZP',
    customerGstin: '27AABCU9603R1ZM', billingPeriod: { from: '2026-05-17', to: '2026-05-19' },
    paymentDueDate: '2026-06-18', status: 'PENDING',
    lineItems: [{
      tripId: 'BKG-2026-1035', tripReference: 'BKG-2026-1035', freightCharge: 74000,
      lineTotal: 74000,
    }],
    subtotal: 74000, gstAmount: 8880, grandTotal: 82880, pdfUrl: '/invoices/INV-2026-006.pdf', tripReferences: ['BKG-2026-1035'], createdAt: '2026-05-19T11:00:00Z',
  },
  {
    id: 'INV-2026-007', invoiceNumber: 'INV-2026-007', invoiceDate: '2026-05-18', vendorGstin: '29AABCF1234M1ZP',
    customerGstin: '27AABCU9603R1ZM', billingPeriod: { from: '2026-05-15', to: '2026-05-18' },
    paymentDueDate: '2026-06-17', status: 'DISPUTED',
    lineItems: [{
      tripId: 'BKG-2026-1036', tripReference: 'BKG-2026-1036', freightCharge: 58000,
      lineTotal: 58000,
    }],
    subtotal: 58000, gstAmount: 6960, grandTotal: 64960, pdfUrl: '/invoices/INV-2026-007.pdf', tripReferences: ['BKG-2026-1036'], notes: 'Finance raised a dispute on the detention and handling charges.', createdAt: '2026-05-18T09:30:00Z',
  },
  {
    id: 'INV-2026-008', invoiceNumber: 'INV-2026-008', invoiceDate: '2026-05-17', vendorGstin: '29AABCF1234M1ZP',
    customerGstin: '27AABCU9603R1ZM', billingPeriod: { from: '2026-05-14', to: '2026-05-17' },
    paymentDueDate: '2026-06-16', status: 'RESUBMISSION_REQUIRED',
    lineItems: [{ tripId: 'BKG-2026-1037', tripReference: 'BKG-2026-1037', freightCharge: 47000, lineTotal: 47000 }],
    subtotal: 47000, gstAmount: 5640, grandTotal: 52640, pdfUrl: '/invoices/INV-2026-008.pdf', tripReferences: ['BKG-2026-1037'], notes: 'Finance asked for a corrected invoice. Create a new invoice to replace this one.', createdAt: '2026-05-17T16:00:00Z',
  },
  {
    // CLOSED — finance rejected the invoice outright.
    id: 'INV-2026-009', invoiceNumber: 'INV-2026-009', invoiceDate: '2026-05-16', vendorGstin: '29AABCF1234M1ZP',
    customerGstin: '27AABCU9603R1ZM', billingPeriod: { from: '2026-05-12', to: '2026-05-16' },
    paymentDueDate: '2026-06-15', status: 'CLOSED', closeReason: 'REJECTED',
    lineItems: [{ tripId: 'BKG-2026-1038', tripReference: 'BKG-2026-1038', freightCharge: 39000, lineTotal: 39000 }],
    subtotal: 39000, gstAmount: 4680, grandTotal: 43680, pdfUrl: '/invoices/INV-2026-009.pdf', tripReferences: ['BKG-2026-1038'], notes: 'Rejected by finance — trip was not delivered against a valid contract.', createdAt: '2026-05-16T10:00:00Z',
  },
  {
    // CLOSED — superseded by INV-2026-011 after a resubmission.
    id: 'INV-2026-010', invoiceNumber: 'INV-2026-010', invoiceDate: '2026-05-14', vendorGstin: '29AABCF1234M1ZP',
    customerGstin: '27AABCU9603R1ZM', billingPeriod: { from: '2026-05-10', to: '2026-05-14' },
    paymentDueDate: '2026-06-13', status: 'CLOSED', closeReason: 'SUPERSEDED', supersededByInvoiceId: 'INV-2026-011',
    lineItems: [{ tripId: 'BKG-2026-1039', tripReference: 'BKG-2026-1039', freightCharge: 61000, lineTotal: 61000 }],
    subtotal: 61000, gstAmount: 7320, grandTotal: 68320, pdfUrl: '/invoices/INV-2026-010.pdf', tripReferences: ['BKG-2026-1039'], notes: 'Replaced by INV-2026-011 after finance requested a resubmission.', createdAt: '2026-05-14T10:00:00Z',
  },
  {
    // PENDING — the corrected invoice that replaced INV-2026-010.
    id: 'INV-2026-011', invoiceNumber: 'INV-2026-011', invoiceDate: '2026-05-20', vendorGstin: '29AABCF1234M1ZP',
    customerGstin: '27AABCU9603R1ZM', billingPeriod: { from: '2026-05-10', to: '2026-05-14' },
    paymentDueDate: '2026-06-19', status: 'PENDING', supersedesInvoiceId: 'INV-2026-010',
    lineItems: [{ tripId: 'BKG-2026-1039', tripReference: 'BKG-2026-1039', freightCharge: 59000, lineTotal: 59000 }],
    subtotal: 59000, gstAmount: 7080, grandTotal: 66080, pdfUrl: '/invoices/INV-2026-011.pdf', tripReferences: ['BKG-2026-1039'], notes: 'Corrected resubmission of INV-2026-010.', createdAt: '2026-05-20T10:00:00Z',
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
    reason: 'Detention and loading charges do not match the approved rate card for BKG-2026-1036.',
    status: 'OPEN',
    raisedAt: '2026-05-19T10:00:00Z',
    updatedAt: '2026-05-19T10:00:00Z',
    responseDueAt: '2026-05-21T10:00:00Z',
    messages: [
      {
        id: 'dmsg-seed-1',
        sender: 'FINANCE',
        message: 'Detention and loading charges do not match the approved rate card for BKG-2026-1036.',
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
