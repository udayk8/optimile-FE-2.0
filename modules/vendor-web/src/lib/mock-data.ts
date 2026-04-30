import type {
  DashboardData, Auction, Contract, Indent, Trip, Expense,
  Vehicle, Driver, CapacityDeclaration, Invoice, LedgerEntry, Notification,
  CompanyInfo, BankDetails, Vendor,
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
  { id: 'n1', type: 'ONBOARDING', title: 'Complete vendor setup', message: 'Your profile is 45% complete. Review bank details and finish company information.', deepLink: '/profile/company', isRead: false, createdAt: new Date(Date.now() - 120000).toISOString() },
  { id: 'n2', type: 'TRIPS', title: 'New Indent Request', message: 'Indent IND-001 for Mumbai → Delhi', deepLink: '/trips?tab=indents', isRead: false, createdAt: new Date(Date.now() - 600000).toISOString() },
  { id: 'n3', type: 'SOURCING', title: 'Auction Going Live', message: 'Reverse Auction AUC-012 starts in 30 min', deepLink: '/sourcing/auctions/AUC-012', isRead: false, createdAt: new Date(Date.now() - 1800000).toISOString() },
  { id: 'n4', type: 'EXPENSES', title: 'Expense Approved', message: 'Expense bundle ₹5,500 for TRP-043 approved', deepLink: '/expenses/EXP-101', isRead: false, createdAt: new Date(Date.now() - 3600000).toISOString() },
  { id: 'n5', type: 'INVOICES', title: 'Payment Received', message: '₹1,45,000 credited for INV-2026-028', deepLink: '/invoices/INV-2026-028', isRead: true, createdAt: new Date(Date.now() - 7200000).toISOString() },
  { id: 'n6', type: 'CONTRACTS', title: 'Contract Updated', message: 'Contract CNT-001 rate card and SLA details were updated', deepLink: '/contracts/CNT-001', isRead: false, createdAt: new Date(Date.now() - 10800000).toISOString() },
]



export const MOCK_AUCTIONS: Auction[] = [
  {
    id: 'AUC-012', type: 'BULK', customerName: 'Asian Paints', state: 'LIVE', pricingUnit: 'PER_MT',
    lanes: [
      {
        id: 'L1',
        laneDetails: { origin: { name: 'Ankleshwar Plant', city: 'Bharuch', state: 'Gujarat' }, destination: { name: 'Bangalore DC', city: 'Bangalore', state: 'Karnataka' }, distanceKm: 1200 },
        volumeRequirement: { estimatedVolume: 50, unit: 'trucks/month', frequency: 'MONTHLY' },
        currentBestBid: 25000,
        minBidDecrement: 500
      },
      {
        id: 'L2',
        laneDetails: { origin: { name: 'Ankleshwar Plant', city: 'Bharuch', state: 'Gujarat' }, destination: { name: 'Chennai Hub', city: 'Chennai', state: 'Tamil Nadu' }, distanceKm: 1450 },
        volumeRequirement: { estimatedVolume: 20, unit: 'trucks/month', frequency: 'MONTHLY' },
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
        currentBestBid: 12000,
        minBidDecrement: 500
      },
      {
        id: 'L2',
        laneDetails: { origin: { name: 'Bhiwandi', city: 'Mumbai', state: 'MH' }, destination: { name: 'Nashik', city: 'Nashik', state: 'MH' }, distanceKm: 165 },
        volumeRequirement: { estimatedVolume: 80, unit: 'trucks', frequency: 'MONTHLY' },
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
      minBidDecrement: 500
    }],
    vehicleTypeRequired: 'Car Carrier', startTime: new Date(Date.now() + 86400000).toISOString(), endTime: new Date(Date.now() + 172800000).toISOString(),
    vendorBids: [], createdAt: new Date().toISOString(),
  },
  {
    id: 'AUC-010', type: 'BULK', customerName: 'Nestle India', state: 'CLOSED', pricingUnit: 'PER_MT',
    lanes: [{
      id: 'L1',
      laneDetails: { origin: { name: 'Moga Factory', city: 'Moga', state: 'PB' }, destination: { name: 'Delhi', city: 'Delhi', state: 'DL' }, distanceKm: 400 },
      currentBestBid: 1500,
      minBidDecrement: 50
    }],
    vehicleTypeRequired: '20ft Container', startTime: new Date(Date.now() - 172800000).toISOString(), endTime: new Date(Date.now() - 86400000).toISOString(),
    vendorBids: [{ id: 'b5', laneId: 'L1', amount: 1500, placedAt: new Date(Date.now() - 90000000).toISOString(), status: 'ACTIVE' }],
    createdAt: new Date(Date.now() - 259200000).toISOString(),
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
    id: 'TRP-044', contractId: 'CNT-001', indentId: 'IND-098', status: 'IN_TRANSIT',
    laneDetails: { origin: { name: 'Mumbai Port', city: 'Mumbai', state: 'Maharashtra' }, destination: { name: 'Delhi NCR Hub', city: 'Delhi', state: 'Delhi' }, distanceKm: 1420 },
    assignedVehicle: { id: 'VH-001', registrationNumber: 'MH-04-AB-1234', type: '20ft Container' },
    assignedDriver: { id: 'DR-001', name: 'Suresh Yadav', mobile: '+91 9876500001' },
    documents: [
      { id: 'td-1', type: 'POD_COPY', title: 'POD copy', fileName: 'pod-trp-044.pdf', fileUrl: '/docs/pod-trp-044.pdf', createdAt: '2026-04-22T16:30:00Z', note: 'Awaiting driver upload' },
      { id: 'td-2', type: 'EWAY_BILL', title: 'E-way bill copy', fileName: 'ewaybill-trp-044.pdf', fileUrl: '/docs/ewaybill-trp-044.pdf', createdAt: '2026-04-22T08:30:00Z' },
    ],
    timeline: [
      { id: 'tt-1', title: 'Assigned', description: 'Vehicle and driver assigned', timestamp: '2026-04-22T08:05:00Z', status: 'DISPATCHED' },
      { id: 'tt-2', title: 'In Transit', description: 'Truck is en route to destination', timestamp: '2026-04-22T11:30:00Z', status: 'IN_TRANSIT' },
    ],
    freightRate: 45000, expenseSummary: { total: 0, approved: 0, pending: 0 }, isInvoiced: false,
    createdAt: '2026-04-22T08:00:00Z',
  },
  {
    id: 'TRP-043', contractId: 'CNT-001', indentId: 'IND-097', status: 'DELIVERED',
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
      { id: 'tt-3', title: 'Dispatched', description: 'Trip released from hub', timestamp: '2026-04-18T09:30:00Z', status: 'DISPATCHED' },
      { id: 'tt-4', title: 'Delivered', description: 'Shipment delivered to consignee', timestamp: '2026-04-20T16:00:00Z', status: 'DELIVERED' },
    ],
    freightRate: 45000, expenseSummary: { total: 5500, approved: 5500, pending: 0 }, isInvoiced: false,
    createdAt: '2026-04-18T08:00:00Z',
  },
  {
    id: 'TRP-042', contractId: 'CNT-002', indentId: 'IND-096', status: 'DISPATCHED',
    laneDetails: { origin: { name: 'Pune', city: 'Pune', state: 'MH' }, destination: { name: 'Chennai', city: 'Chennai', state: 'TN' }, distanceKm: 1200 },
    assignedVehicle: { id: 'VH-001', registrationNumber: 'MH-04-AB-1234', type: '20ft Container' },
    assignedDriver: { id: 'DR-001', name: 'Suresh Yadav', mobile: '+91 9876500001' },
    documents: [
      { id: 'td-6', type: 'EWAY_BILL', title: 'E-way bill copy', fileName: 'ewaybill-trp-042.pdf', fileUrl: '/docs/ewaybill-trp-042.pdf', createdAt: '2026-04-22T09:30:00Z' },
    ],
    timeline: [
      { id: 'tt-5', title: 'Dispatched', description: 'Loaded at Pune yard', timestamp: '2026-04-22T10:00:00Z', status: 'DISPATCHED' },
    ],
    freightRate: 65000, expenseSummary: { total: 0, approved: 0, pending: 0 }, isInvoiced: false,
    createdAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 'TRP-041', contractId: 'CNT-001', indentId: 'IND-095', status: 'DELIVERED',
    laneDetails: { origin: { name: 'Mumbai', city: 'Mumbai', state: 'MH' }, destination: { name: 'Delhi', city: 'Delhi', state: 'DL' }, distanceKm: 1420 },
    assignedVehicle: { id: 'VH-001', registrationNumber: 'MH-04-AB-1234', type: '20ft Container' },
    assignedDriver: { id: 'DR-001', name: 'Suresh Yadav', mobile: '+91 9876500001' },
    deliveredDate: '2026-04-10T16:00:00Z', podStatus: 'CONFIRMED', podReference: 'POD-041',
    documents: [
      { id: 'td-7', type: 'INVOICE_COPY', title: 'Invoice copy', fileName: 'invoice-trp-041.pdf', fileUrl: '/docs/invoice-trp-041.pdf', createdAt: '2026-04-11T10:00:00Z' },
      { id: 'td-8', type: 'POD_COPY', title: 'POD copy', fileName: 'pod-trp-041.pdf', fileUrl: '/docs/pod-trp-041.pdf', createdAt: '2026-04-10T17:00:00Z' },
    ],
    timeline: [
      { id: 'tt-6', title: 'Delivered', description: 'Delivered and closed', timestamp: '2026-04-10T16:00:00Z', status: 'DELIVERED' },
    ],
    freightRate: 45000, expenseSummary: { total: 4800, approved: 4800, pending: 0 }, isInvoiced: true,
    createdAt: '2026-04-05T08:00:00Z',
  },
  {
    id: 'TRP-045', contractId: 'CNT-002', indentId: 'IND-099', status: 'EXCEPTION',
    laneDetails: { origin: { name: 'Chennai', city: 'Chennai', state: 'TN' }, destination: { name: 'Bangalore', city: 'Bangalore', state: 'KA' }, distanceKm: 350 },
    assignedVehicle: { id: 'VH-002', registrationNumber: 'MH-04-CD-5678', type: '20ft Container' },
    assignedDriver: { id: 'DR-002', name: 'Manoj Sharma', mobile: '+91 9876500002' },
    documents: [
      { id: 'td-9', type: 'REMARKS', title: 'Remarks', fileName: 'remarks-trp-045.json', fileUrl: '/docs/remarks-trp-045.json', createdAt: '2026-04-26T11:00:00Z', note: 'Exception report available' },
    ],
    timeline: [
      { id: 'tt-7', title: 'Exception reported', description: 'Delayed at unloading point', timestamp: '2026-04-26T13:00:00Z', status: 'EXCEPTION' },
    ],
    freightRate: 15000, expenseSummary: { total: 0, approved: 0, pending: 0 }, isInvoiced: false,
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  }
]

export const MOCK_EXPENSES: Expense[] = [
  {
    id: 'EXP-101',
    tripId: 'TRP-043',
    tripReference: 'TRP-043',
    lineItems: [
      { id: 'EXP-101-1', expenseType: 'TOLL', amount: 3000, description: 'Mumbai-Delhi highway toll' },
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
      { id: 'EXP-103-1', expenseType: 'TOLL', amount: 1800, description: 'Pune bypass toll' },
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
    baseLocation: 'Pune', operationalStatus: 'UNDER_MAINTENANCE', complianceStatus: 'COMPLIANT',
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
    id: 'INV-2026-028', invoiceNumber: 'INV-2026-028', invoiceDate: '2026-04-15', vendorGstin: '29AABCF1234M1ZP',
    customerGstin: '27AABCU9603R1ZM', billingPeriod: { from: '2026-04-01', to: '2026-04-15' },
    paymentDueDate: '2026-05-15', status: 'PAID', paymentDate: '2026-05-10',
    lineItems: [
      { tripId: 'TRP-040', tripReference: 'TRP-040', freightCharge: 45000, expenses: [{ type: 'TOLL', amount: 3000 }], lineTotal: 48000 },
      { tripId: 'TRP-041', tripReference: 'TRP-041', freightCharge: 45000, expenses: [{ type: 'TOLL', amount: 2800 }, { type: 'DETENTION', amount: 2000 }], lineTotal: 49800 },
    ],
    subtotal: 97800, gstAmount: 17604, grandTotal: 115404, pdfUrl: '/invoices/INV-2026-028.pdf', tripReferences: ['TRP-040', 'TRP-041'], createdAt: '2026-04-15T12:00:00Z',
  },
  {
    id: 'INV-2026-029', invoiceNumber: 'INV-2026-029', invoiceDate: '2026-04-20', vendorGstin: '29AABCF1234M1ZP',
    customerGstin: '27AABCU9603R1ZM', billingPeriod: { from: '2026-04-16', to: '2026-04-20' },
    paymentDueDate: '2026-05-20', status: 'SUBMITTED',
    lineItems: [
      { tripId: 'TRP-042', tripReference: 'TRP-042', freightCharge: 65000, expenses: [], lineTotal: 65000 }
    ],
    subtotal: 65000, gstAmount: 11700, grandTotal: 76700, pdfUrl: '/invoices/INV-2026-029.pdf', tripReferences: ['TRP-042'], createdAt: '2026-04-20T10:00:00Z',
  },
  {
    id: 'INV-2026-027', invoiceNumber: 'INV-2026-027', invoiceDate: '2026-04-01', vendorGstin: '29AABCF1234M1ZP',
    customerGstin: '27AABCU9603R1ZM', billingPeriod: { from: '2026-03-15', to: '2026-03-31' },
    paymentDueDate: '2026-05-01', status: 'REJECTED',
    lineItems: [
      { tripId: 'TRP-030', tripReference: 'TRP-030', freightCharge: 30000, expenses: [], lineTotal: 30000 }
    ],
    subtotal: 30000, gstAmount: 5400, grandTotal: 35400, pdfUrl: '/invoices/INV-2026-027.pdf', tripReferences: ['TRP-030'], createdAt: '2026-04-01T09:00:00Z',
  }
]

export const MOCK_LEDGER: LedgerEntry[] = [
  { id: 'led1', date: '2026-04-18', entryType: 'INVOICE_APPROVED', description: 'Invoice INV-2026-028 approved', credit: 115404, debit: 0, runningBalance: 115404 },
  { id: 'led2', date: '2026-04-20', entryType: 'TDS_DEDUCTION', description: 'TDS @ 2% on INV-2026-028', credit: 0, debit: 2308, runningBalance: 113096, documentUrl: '/tds/tds-apr-2026.pdf' },
  { id: 'led3', date: '2026-05-10', entryType: 'PAYMENT_RECEIVED', description: 'Payment for INV-2026-028', credit: 113096, debit: 0, runningBalance: 0, documentUrl: '/payments/pa-2026-028.pdf' },
  { id: 'led4', date: '2026-05-11', entryType: 'SLA_PENALTY', description: 'Penalty for Declined Indent IND-004', credit: 0, debit: 5000, runningBalance: -5000 },
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
