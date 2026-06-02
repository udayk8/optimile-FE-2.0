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
  status: 'PENDING_VERIFICATION',
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
  { id: 'n1', type: 'TRIPS', title: 'New Indent Request', message: 'Indent IND-001 for Mumbai → Delhi', deepLink: '/vendor/trips/indents/IND-001', isRead: false, createdAt: new Date(Date.now() - 120000).toISOString() },
  { id: 'n2', type: 'SOURCING', title: 'Auction Going Live', message: 'Reverse Auction AUC-012 starts in 30 min', deepLink: '/vendor/sourcing/auctions/AUC-012', isRead: false, createdAt: new Date(Date.now() - 600000).toISOString() },
  { id: 'n3', type: 'EXPENSES', title: 'Expense Added', message: 'Expense ₹2,500 added for TRP-045', deepLink: '/vendor/bookings/completed/TRP-045', isRead: false, createdAt: new Date(Date.now() - 1800000).toISOString() },
  { id: 'n4', type: 'INVOICES', title: 'Payment Received', message: '₹1,45,000 credited for INV-2026-028', deepLink: '/vendor/invoices/INV-2026-028', isRead: true, createdAt: new Date(Date.now() - 3600000).toISOString() },
  { id: 'n5', type: 'CONTRACTS', title: 'Contract Ready', message: 'Contract CNT-005 from Tata Steel awaiting your signature', deepLink: '/vendor/contracts/CNT-005', isRead: false, createdAt: new Date(Date.now() - 7200000).toISOString() },
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
    id: 'AUC-015', type: 'BULK', customerName: 'Nestle India', state: 'PENDING_AWARD', pricingUnit: 'PER_MT',
    lanes: [{
      id: 'L1',
      laneDetails: { origin: { name: 'Moga Factory', city: 'Moga', state: 'PB' }, destination: { name: 'Delhi', city: 'Delhi', state: 'DL' }, distanceKm: 400 },
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
  },
  {
    id: 'IND-005', contractId: 'CNT-001', contractReference: 'CNT-001 / HUL', status: 'ACCEPTED',
    laneDetails: { origin: { name: 'Mumbai', city: 'Mumbai', state: 'MH' }, destination: { name: 'Pune', city: 'Pune', state: 'MH' }, distanceKm: 150 },
    loadDetails: { commodity: 'Goods', weightKg: 5000, volumeCbm: 10 },
    vehicleTypeRequired: 'LCV', reportingDateTime: '2026-04-26T12:00:00Z',
    slaDeadline: new Date(Date.now() + 3600000).toISOString(), createdAt: new Date(Date.now() - 3600000).toISOString(),
  }
]

export const MOCK_TRIPS: Trip[] = [
  {
    id: 'TRP-044', contractId: 'CNT-001', indentId: 'IND-098', status: 'IN_TRANSIT',
    laneDetails: { origin: { name: 'Mumbai Port', city: 'Mumbai', state: 'Maharashtra' }, destination: { name: 'Delhi NCR Hub', city: 'Delhi', state: 'Delhi' }, distanceKm: 1420 },
    assignedVehicle: { id: 'VH-001', registrationNumber: 'MH-04-AB-1234', type: '20ft Container' },
    assignedDriver: { id: 'DR-001', name: 'Suresh Yadav', mobile: '+91 9876500001' },
    freightRate: 45000, expenseSummary: { total: 0 }, isInvoiced: false,
    createdAt: '2026-04-22T08:00:00Z',
  },
  {
    id: 'TRP-043', contractId: 'CNT-001', indentId: 'IND-097', status: 'COMPLETED',
    laneDetails: { origin: { name: 'Mumbai Port', city: 'Mumbai', state: 'Maharashtra' }, destination: { name: 'Delhi NCR Hub', city: 'Delhi', state: 'Delhi' }, distanceKm: 1420 },
    assignedVehicle: { id: 'VH-002', registrationNumber: 'MH-04-CD-5678', type: '20ft Container' },
    assignedDriver: { id: 'DR-002', name: 'Manoj Sharma', mobile: '+91 9876500002' },
    deliveredDate: '2026-04-20T16:00:00Z', podStatus: 'CONFIRMED', podReference: 'POD-043',
    freightRate: 45000, expenseSummary: { total: 5500 }, isInvoiced: false,
    createdAt: '2026-04-18T08:00:00Z',
  },
  {
    id: 'TRP-042', contractId: 'CNT-002', indentId: 'IND-096', status: 'IN_TRANSIT',
    laneDetails: { origin: { name: 'Pune', city: 'Pune', state: 'MH' }, destination: { name: 'Chennai', city: 'Chennai', state: 'TN' }, distanceKm: 1200 },
    assignedVehicle: { id: 'VH-001', registrationNumber: 'MH-04-AB-1234', type: '20ft Container' },
    assignedDriver: { id: 'DR-001', name: 'Suresh Yadav', mobile: '+91 9876500001' },
    freightRate: 65000, expenseSummary: { total: 0 }, isInvoiced: false,
    createdAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 'TRP-041', contractId: 'CNT-001', indentId: 'IND-095', status: 'COMPLETED',
    laneDetails: { origin: { name: 'Mumbai', city: 'Mumbai', state: 'MH' }, destination: { name: 'Delhi', city: 'Delhi', state: 'DL' }, distanceKm: 1420 },
    assignedVehicle: { id: 'VH-001', registrationNumber: 'MH-04-AB-1234', type: '20ft Container' },
    assignedDriver: { id: 'DR-001', name: 'Suresh Yadav', mobile: '+91 9876500001' },
    deliveredDate: '2026-04-10T16:00:00Z', podStatus: 'CONFIRMED', podReference: 'POD-041',
    freightRate: 45000, expenseSummary: { total: 4800 }, isInvoiced: true,
    createdAt: '2026-04-05T08:00:00Z',
  },
  {
    id: 'TRP-045', contractId: 'CNT-002', indentId: 'IND-099', status: 'IN_TRANSIT', exceptionFlag: true,
    laneDetails: { origin: { name: 'Chennai', city: 'Chennai', state: 'TN' }, destination: { name: 'Bangalore', city: 'Bangalore', state: 'KA' }, distanceKm: 350 },
    assignedVehicle: { id: 'VH-002', registrationNumber: 'MH-04-CD-5678', type: '20ft Container' },
    assignedDriver: { id: 'DR-002', name: 'Manoj Sharma', mobile: '+91 9876500002' },
    freightRate: 15000, expenseSummary: { total: 0 }, isInvoiced: false,
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 'TRP-046', contractId: 'CNT-001', indentId: 'IND-100', status: 'COMPLETED',
    laneDetails: { origin: { name: 'Mumbai', city: 'Mumbai', state: 'MH' }, destination: { name: 'Pune', city: 'Pune', state: 'MH' }, distanceKm: 150 },
    assignedVehicle: { id: 'VH-001', registrationNumber: 'MH-04-AB-1234', type: '20ft Container' },
    assignedDriver: { id: 'DR-001', name: 'Suresh Yadav', mobile: '+91 9876500001' },
    deliveredDate: '2026-05-11T10:00:00Z', podStatus: 'CONFIRMED', podReference: 'POD-046',
    freightRate: 32000, expenseSummary: { total: 0 }, isInvoiced: false,
    createdAt: '2026-05-10T07:00:00Z',
  },
  {
    id: 'TRP-047', contractId: 'CNT-001', indentId: 'IND-101', status: 'COMPLETED',
    laneDetails: { origin: { name: 'Nashik', city: 'Nashik', state: 'MH' }, destination: { name: 'Surat', city: 'Surat', state: 'GJ' }, distanceKm: 240 },
    assignedVehicle: { id: 'VH-002', registrationNumber: 'MH-04-CD-5678', type: '20ft Container' },
    assignedDriver: { id: 'DR-002', name: 'Manoj Sharma', mobile: '+91 9876500002' },
    deliveredDate: '2026-05-12T15:30:00Z', podStatus: 'CONFIRMED', podReference: 'POD-047',
    freightRate: 28000, expenseSummary: { total: 0 }, isInvoiced: false,
    createdAt: '2026-05-11T06:30:00Z',
  },
  {
    id: 'TRP-048', contractId: 'CNT-002', indentId: 'IND-102', status: 'COMPLETED',
    laneDetails: { origin: { name: 'Nagpur', city: 'Nagpur', state: 'MH' }, destination: { name: 'Indore', city: 'Indore', state: 'MP' }, distanceKm: 450 },
    assignedVehicle: { id: 'VH-001', registrationNumber: 'MH-04-AB-1234', type: '20ft Container' },
    assignedDriver: { id: 'DR-001', name: 'Suresh Yadav', mobile: '+91 9876500001' },
    deliveredDate: '2026-05-17T17:30:00Z', podStatus: 'PENDING',
    freightRate: 36000, expenseSummary: { total: 0 }, isInvoiced: false,
    createdAt: '2026-05-16T08:30:00Z',
  },
  {
    id: 'TRP-049', contractId: 'CNT-002', indentId: 'IND-103', status: 'CANCELLED',
    laneDetails: { origin: { name: 'Bhiwandi', city: 'Bhiwandi', state: 'MH' }, destination: { name: 'Ahmedabad', city: 'Ahmedabad', state: 'GJ' }, distanceKm: 520 },
    assignedVehicle: { id: 'VH-002', registrationNumber: 'MH-04-CD-5678', type: '20ft Container' },
    assignedDriver: { id: 'DR-002', name: 'Manoj Sharma', mobile: '+91 9876500002' },
    deliveredDate: '2026-05-18T09:30:00Z', podStatus: 'PENDING',
    freightRate: 34500, expenseSummary: { total: 0 }, isInvoiced: false,
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
    ],
    amount: 3000,
    submittedAt: '2026-04-21T10:00:00Z',
  },
  {
    id: 'EXP-102',
    tripId: 'TRP-043',
    tripReference: 'TRP-043',
    lineItems: [
      { id: 'EXP-102-1', expenseType: 'DETENTION', amount: 2500, description: 'Detention at delivery - 4 hours' },
    ],
    amount: 2500,
    submittedAt: '2026-04-21T10:00:00Z',
  },
  {
    id: 'EXP-103',
    tripId: 'TRP-042',
    tripReference: 'TRP-042',
    lineItems: [
      { id: 'EXP-103-1', expenseType: 'EXPENSE', amount: 1800 },
    ],
    amount: 1800,
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
    submittedAt: '2026-04-22T15:00:00Z',
  }
]

export const MOCK_VEHICLES: Vehicle[] = [
  {
    id: 'VH-001', registrationNumber: 'MH-04-AB-1234', vehicleType: '20ft Container',
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
    baseLocation: 'Ahmedabad', operationalStatus: 'ACTIVE', complianceStatus: 'EXPIRED',
    complianceDocuments: [
      { id: 'doc5', type: 'Insurance', fileName: 'insurance2.pdf', fileUrl: '/docs/insurance2.pdf', expiryDate: '2026-03-01', status: 'EXPIRED', uploadedAt: '2025-03-01' },
    ],
    blackoutDates: [],
  },
  {
    id: 'VH-004', registrationNumber: 'MH-12-PZ-1010', vehicleType: 'LCV',
    baseLocation: 'Pune', operationalStatus: 'UNDER_MAINTENANCE', complianceStatus: 'COMPLIANT',
    complianceDocuments: [
      { id: 'doc6', type: 'Insurance', fileName: 'ins3.pdf', fileUrl: '/docs/ins3.pdf', expiryDate: '2027-01-01', status: 'VALID', uploadedAt: '2026-01-01' }
    ],
    blackoutDates: []
  }
]

export const MOCK_DRIVERS: Driver[] = [
  {
    id: 'DR-001', name: 'Suresh Yadav', mobile: '+91 9876500001', licenseNumber: 'MH0420210012345',
    licenseExpiry: '2028-06-30', licenseClass: ['HCV', 'LCV'], complianceStatus: 'COMPLIANT', currentStatus: 'ACTIVE',
    complianceDocuments: [
      { id: 'dd1', type: 'Driving License', fileName: 'dl.pdf', fileUrl: '/docs/dl.pdf', expiryDate: '2028-06-30', status: 'VALID', uploadedAt: '2026-01-01' },
      { id: 'dd2', type: 'Medical Certificate', fileName: 'medical.pdf', fileUrl: '/docs/medical.pdf', expiryDate: '2027-01-01', status: 'VALID', uploadedAt: '2026-01-01' },
    ],
  },
  {
    id: 'DR-002', name: 'Manoj Sharma', mobile: '+91 9876500002', licenseNumber: 'RJ1420180054321',
    licenseExpiry: '2026-05-15', licenseClass: ['LCV'], complianceStatus: 'EXPIRING_SOON', currentStatus: 'ACTIVE',
    complianceDocuments: [
      { id: 'dd3', type: 'Driving License', fileName: 'dl2.pdf', fileUrl: '/docs/dl2.pdf', expiryDate: '2026-05-15', status: 'EXPIRING_SOON', uploadedAt: '2021-05-15' }
    ]
  },
  {
    id: 'DR-003', name: 'Ramesh Singh', mobile: '+91 9876500003', licenseNumber: 'DL0120150098765',
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
    subtotal: 100000, gstAmount: 12000, grandTotal: 112000, pdfUrl: '/invoices/INV-2026-001.pdf', createdAt: '2026-04-15T12:00:00Z',
  },
  {
    id: 'INV-2026-002', invoiceNumber: 'INV-2026-002', invoiceDate: '2026-05-13', vendorGstin: '29AABCF1234M1ZP',
    customerGstin: '27AABCU9603R1ZM', billingPeriod: { from: '2026-05-01', to: '2026-05-13' },
    paymentDueDate: '2026-06-12', status: 'APPROVED',
    lineItems: [
      { tripId: 'TRP-042', tripReference: 'TRP-042', freightCharge: 100000, expenses: [], lineTotal: 100000 }
    ],
    subtotal: 100000, gstAmount: 12000, grandTotal: 112000, pdfUrl: '/invoices/INV-2026-002.pdf', createdAt: '2026-05-13T10:00:00Z',
  },
  {
    id: 'INV-2026-003', invoiceNumber: 'INV-2026-003', invoiceDate: '2026-05-17', vendorGstin: '29AABCF1234M1ZP',
    customerGstin: '27AABCU9603R1ZM', billingPeriod: { from: '2026-05-14', to: '2026-05-17' },
    paymentDueDate: '2026-06-16', status: 'APPROVED',
    lineItems: [{ tripId: 'TRP-046', tripReference: 'TRP-046', freightCharge: 85000, expenses: [], lineTotal: 85000 }],
    subtotal: 85000, gstAmount: 10200, grandTotal: 95200, pdfUrl: '/invoices/INV-2026-003.pdf', createdAt: '2026-05-17T10:00:00Z',
  },
  {
    id: 'INV-2026-004', invoiceNumber: 'INV-2026-004', invoiceDate: '2026-05-18', vendorGstin: '29AABCF1234M1ZP',
    customerGstin: '27AABCU9603R1ZM', billingPeriod: { from: '2026-05-15', to: '2026-05-18' },
    paymentDueDate: '2026-06-17', status: 'APPROVED',
    lineItems: [{ tripId: 'TRP-047', tripReference: 'TRP-047', freightCharge: 92000, expenses: [], lineTotal: 92000 }],
    subtotal: 92000, gstAmount: 11040, grandTotal: 103040, pdfUrl: '/invoices/INV-2026-004.pdf', createdAt: '2026-05-18T10:00:00Z',
  },
  {
    id: 'INV-2026-005', invoiceNumber: 'INV-2026-005', invoiceDate: '2026-05-19', vendorGstin: '29AABCF1234M1ZP',
    customerGstin: '27AABCU9603R1ZM', billingPeriod: { from: '2026-05-16', to: '2026-05-19' },
    paymentDueDate: '2026-06-18', status: 'APPROVED',
    lineItems: [{ tripId: 'TRP-048', tripReference: 'TRP-048', freightCharge: 68000, expenses: [], lineTotal: 68000 }],
    subtotal: 68000, gstAmount: 8160, grandTotal: 76160, pdfUrl: '/invoices/INV-2026-005.pdf', createdAt: '2026-05-19T10:00:00Z',
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
    subtotal: 74800, gstAmount: 8976, grandTotal: 83776, pdfUrl: '/invoices/INV-2026-006.pdf', createdAt: '2026-05-19T11:00:00Z',
  },
  {
    id: 'INV-2026-007', invoiceNumber: 'INV-2026-007', invoiceDate: '2026-05-18', vendorGstin: '29AABCF1234M1ZP',
    customerGstin: '27AABCU9603R1ZM', billingPeriod: { from: '2026-05-15', to: '2026-05-18' },
    paymentDueDate: '2026-06-17', status: 'CLOSED', closeReason: 'REJECTED',
    lineItems: [{
      tripId: 'TRP-050', tripReference: 'TRP-050', freightCharge: 58000,
      expenses: [
        { type: 'DETENTION', amount: 3000 },
        { type: 'LOADING_UNLOADING', amount: 1500 },
      ],
      lineTotal: 62500,
    }],
    subtotal: 62500, gstAmount: 7500, grandTotal: 70000, pdfUrl: '/invoices/INV-2026-007.pdf', notes: 'POD missing for TRP-050 and expense amounts need correction', createdAt: '2026-05-18T09:30:00Z',
  },
  {
    id: 'INV-2026-008', invoiceNumber: 'INV-2026-008', invoiceDate: '2026-05-17', vendorGstin: '29AABCF1234M1ZP',
    customerGstin: '27AABCU9603R1ZM', billingPeriod: { from: '2026-05-14', to: '2026-05-17' },
    paymentDueDate: '2026-06-16', status: 'RESUBMISSION_REQUIRED',
    lineItems: [{ tripId: 'TRP-051', tripReference: 'TRP-051', freightCharge: 47000, expenses: [], lineTotal: 47000 }],
    subtotal: 47000, gstAmount: 5640, grandTotal: 52640, pdfUrl: '/invoices/INV-2026-008.pdf', notes: 'Duplicate of INV-2026-005, cancelled by vendor', createdAt: '2026-05-17T16:00:00Z',
  }
]

export const MOCK_LEDGER: LedgerEntry[] = [
  { id: 'led-001', invoiceId: 'INV-2026-001', ledgerType: 'CUSTOMER', date: '2026-04-15', entryType: 'INVOICE_APPROVED', description: 'Invoice INV-2026-001 approved (Taxable ₹100,000 + GST ₹0)', debit: 100000, credit: 0, runningBalance: 100000 },
  { id: 'led-002', invoiceId: 'INV-2026-001', ledgerType: 'CUSTOMER', date: '2026-04-20', entryType: 'CUSTOMER_PAYMENT', description: 'Partial payment from customer for INV-2026-001', debit: 0, credit: 40000, runningBalance: 60000 },
  { id: 'led-003', invoiceId: 'INV-2026-001', ledgerType: 'CUSTOMER', date: '2026-05-10', entryType: 'CUSTOMER_PAYMENT', description: 'Final payment from customer for INV-2026-001', debit: 0, credit: 58000, runningBalance: 2000 },
  { id: 'led-004', invoiceId: 'INV-2026-001', ledgerType: 'CUSTOMER', date: '2026-05-12', entryType: 'TDS_DEDUCTION', description: 'TDS deduction against INV-2026-001', debit: 0, credit: 2000, runningBalance: 0 },
  { id: 'led-005', invoiceId: 'INV-2026-002', ledgerType: 'CUSTOMER', date: '2026-05-13', entryType: 'INVOICE_APPROVED', description: 'Invoice INV-2026-002 approved (Taxable ₹100,000 + GST ₹0)', debit: 100000, credit: 0, runningBalance: 100000 },
  { id: 'led-006', invoiceId: 'INV-2026-002', ledgerType: 'NBFC', date: '2026-05-14', entryType: 'NBFC_DISBURSEMENT', description: 'NBFC advance received for INV-2026-002', debit: 0, credit: 90000, runningBalance: 90000 },
  { id: 'led-006a', invoiceId: 'INV-2026-002', ledgerType: 'NBFC', date: '2026-05-20', entryType: 'NBFC_REPAYMENT', description: 'Repaid to NBFC for INV-2026-002', debit: 40000, credit: 0, runningBalance: 50000 },
  { id: 'led-006b', invoiceId: 'INV-2026-002', ledgerType: 'NBFC', date: '2026-05-28', entryType: 'NBFC_REPAYMENT', description: 'Repaid to NBFC for INV-2026-002', debit: 50000, credit: 0, runningBalance: 0 },
  { id: 'led-007', invoiceId: 'INV-2026-002', ledgerType: 'CUSTOMER', date: '2026-05-20', entryType: 'CUSTOMER_PAYMENT', description: 'Customer payment for INV-2026-002', debit: 0, credit: 40000, runningBalance: 60000 },
  { id: 'led-008', invoiceId: 'INV-2026-002', ledgerType: 'CUSTOMER', date: '2026-05-28', entryType: 'CUSTOMER_PAYMENT', description: 'Customer payment for INV-2026-002', debit: 0, credit: 50000, runningBalance: 10000 },
  { id: 'led-009', invoiceId: 'INV-2026-002', ledgerType: 'CUSTOMER', date: '2026-06-10', entryType: 'CUSTOMER_PAYMENT', description: 'Customer final payment for INV-2026-002', debit: 0, credit: 10000, runningBalance: 0 },
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
}
