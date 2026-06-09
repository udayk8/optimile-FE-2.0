import { create } from 'zustand'
import {
  MOCK_INDENTS,
  MOCK_TRIPS,
  MOCK_AUCTIONS,
  MOCK_VEHICLES,
  MOCK_DRIVERS,
  MOCK_CONTRACTS,
  MOCK_INVOICES,
  MOCK_LEDGER,
  MOCK_CAPACITY,
  MOCK_NOTIFICATIONS,
  MOCK_EXCEPTIONS,
  MOCK_DISPUTES,
  MOCK_COMPANY_INFO,
} from '@vendor/lib/mock-data'
import { computeGst, stateCodeOf } from '@shared-utils'
import {
  Indent, Trip, TripExpense, Auction, Vehicle, Driver, AuctionBid, AuctionLane,
  Contract, Invoice, LedgerEntry, CapacityDeclaration, Notification, InvoiceLineItem, NBFCApplication, NBFCDiscountingStatus,
  ExceptionRecord, ExceptionStatus, ExceptionTimelineEntry, ExceptionSeverity, ExceptionIssueType,
  Dispute, PaymentRecord, PaymentKind, DisruptionReason, CustomerLedgerPostPayload, NbfcLedgerPostPayload
} from '@vendor/types'

// Buyer (the 3PL / Optimile entity the vendor bills). Single source so we never
// scatter the GSTIN literal; its state code is the place of supply for the
// vendor's outgoing invoice. Tenant-configurable in a real deployment.
const BUYER_GSTIN = '27AABCU9603R1ZM'

interface AppState {
  indents: Indent[]
  trips: Trip[]
  auctions: Auction[]
  vehicles: Vehicle[]
  drivers: Driver[]
  contracts: Contract[]
  invoices: Invoice[]
  ledger: LedgerEntry[]
  payments: PaymentRecord[]
  nbfcApplications: NBFCApplication[]
  exceptions: ExceptionRecord[]
  capacity: CapacityDeclaration[]
  notifications: Notification[]

  disputes: Dispute[]
  // Vendor-side: reply / upload documents on an open dispute. Never changes the invoice status.
  respondToDispute: (disputeId: string, message: string, attachmentNames?: string[]) => void
  // Vendor-side: a RESUBMISSION_REQUIRED invoice cannot be edited in place — the vendor
  // creates a NEW (PENDING) invoice; the old one is CLOSED with closeReason SUPERSEDED.
  createResubmissionInvoice: (oldInvoiceId: string, lineItems: InvoiceLineItem[]) => void
  // Finance-side transitions (driven by the finance module / demo seed). Only finance changes status.
  financeApproveInvoice: (invoiceId: string) => void
  /** Mirror a bridge-approved invoice into the store and open its receivable in the ledger (idempotent). */
  ensureInvoiceLedgerOpened: (invoice: Invoice) => void
  financeRaiseDispute: (invoiceId: string, reason: string) => void
  financeRequestResubmission: (invoiceId: string, message?: string) => void
  financeRejectInvoice: (invoiceId: string, reason?: string) => void
  recordInvoicePayment: (payload: {
    invoiceId: string
    paymentKind: PaymentKind
    paymentDate: string
    cashAmount: number
    tdsAmount: number
    referenceNumber?: string
    note?: string
  }) => void
  postCustomerLedgerEntry: (payload: CustomerLedgerPostPayload) => void
  postNbfcLedgerEntry: (payload: NbfcLedgerPostPayload) => void
  recordPaymentReminder: (payload: {
    invoiceId: string
    paymentKind: PaymentKind
    paymentDate: string
    amount: number
    referenceNumber?: string
    note?: string
  }) => void

  // Actions
  acceptIndent: (indentId: string) => void
  assignVehicleToTrip: (tripId: string, vehicleId: string, driverId: string) => void
  addTripExpense: (
    tripId: string,
    input: { label: string; amount: number; expenseType: string; paymentMode?: string; paidBy?: string; notes?: string },
  ) => void
  // Like assignVehicleToTrip but takes already-resolved vehicle/driver objects
  // instead of ids. Used by the embedded "merge" mode where the fleet list mixes
  // local mock vehicles with the vendor's real (bridge) vehicles, whose ids do
  // not exist in this store — so an id lookup here would miss them.
  assignVehicleToTripResolved: (tripId: string, vehicle: Vehicle, driver: Driver) => void
  declineIndent: (indentId: string) => void
  submitBid: (auctionId: string, laneId: string, amount: number) => void
  addVehicle: (vehicle: Vehicle) => void
  updateVehicle: (vehicle: Vehicle) => void
  addDriver: (driver: Driver) => void
  updateDriver: (driver: Driver) => void
  generateInvoice: (payload: {
    tripIds: string[]
    invoiceDate?: string
    dueDate?: string
    gstRate?: number
    invoiceNumber?: string
    lineItems?: InvoiceLineItem[]
  }) => void
  closeInvoice: (invoiceId: string) => void
  submitNbfcApplication: (payload: {
    invoiceId: string
    invoiceNumber: string
    customerName: string
    partnerId: string
    partnerName: string
    requestedAmount: number
    charges: number
    netAmount: number
    emailTitle?: string
    recipientEmail?: string
    emailDescription?: string
    invoiceFileName?: string
  }) => void
  updateNbfcApplicationFinancials: (payload: {
    invoiceId: string
    approvedAmount: number
    approvedCharges: number
    netAmount: number
    referenceNumber?: string
    remarks?: string
  }) => void
  markNbfcApplicationStatus: (invoiceId: string, status: Exclude<NBFCDiscountingStatus, 'ELIGIBLE'>) => void
  createException: (payload: {
    bookingId: string
    route: string
    vehicle: string
    driver: string
    issueType: ExceptionIssueType
    severity: ExceptionSeverity
    description: string
    evidence?: string[]
  }) => void
  updateExceptionStatus: (exceptionId: string, status: ExceptionStatus, notes?: string) => void
  changeTripAssignment: (tripId: string, payload: {
    vehicleId?: string
    driverId?: string
    issueReason?: DisruptionReason
    notes?: string
    resolve?: boolean
  }) => void
  addCapacityDeclaration: (declaration: CapacityDeclaration) => void
  markNotificationRead: (notificationId: string) => void
  markAllNotificationsRead: () => void
  addNotification: (notification: Notification) => void
  loadBackendData: () => Promise<void>
  resetStore: () => void
  // Scopes the portal dataset to the logged-in vendor. Specific vendors (see
  // BLANK_VENDOR_NAMES) are demoed as brand-new accounts with no activity, so
  // their portal shows empty states. Every other vendor keeps the full demo
  // data. No-ops when the vendor hasn't changed, so in-session edits survive
  // navigation.
  appliedVendorKey: string | null
  applyVendorDataset: (vendorName?: string) => void
}

// Vendors (by name, case-insensitive) whose portal should appear empty — used
// to demo a freshly onboarded vendor with no bookings/invoices/etc. yet.
// Empty: every vendor (incl. Mahesh Transport and any vendor onboarded via
// tenant-admin-new) now loads the full demo dataset on login.
const BLANK_VENDOR_NAMES = new Set<string>([])

function normalizeVendorName(name?: string): string {
  return (name ?? '').trim().toLowerCase()
}

function isBlankVendor(name?: string): boolean {
  return BLANK_VENDOR_NAMES.has(normalizeVendorName(name))
}

// Reads which vendor (if any) is signed in, from the session the unified login
// page (shared-admin-core) writes to localStorage. Lets the store start in the
// correct (full vs. empty) shape on first load — no flash of demo data.
function readLoggedInVendorName(): string | undefined {
  if (typeof window === 'undefined') return undefined
  try {
    const raw = window.localStorage.getItem('optimile.session.context')
    if (!raw) return undefined
    const session = JSON.parse(raw) as { loginType?: string; vendorName?: string }
    if (session?.loginType !== 'VENDOR') return undefined
    return session.vendorName
  } catch {
    return undefined
  }
}

type VendorDataCollections = Pick<
  AppState,
  | 'indents'
  | 'trips'
  | 'auctions'
  | 'vehicles'
  | 'drivers'
  | 'contracts'
  | 'invoices'
  | 'ledger'
  | 'payments'
  | 'exceptions'
  | 'nbfcApplications'
  | 'capacity'
  | 'notifications'
  | 'disputes'
>

const EMPTY_DATA: VendorDataCollections = {
  indents: [],
  trips: [],
  auctions: [],
  vehicles: [],
  drivers: [],
  contracts: [],
  invoices: [],
  ledger: [],
  payments: [],
  exceptions: [],
  nbfcApplications: [],
  capacity: [],
  notifications: [],
  disputes: [],
}

function buildFullData(): VendorDataCollections {
  return {
    indents: [...MOCK_INDENTS],
    trips: [...MOCK_TRIPS],
    auctions: [...MOCK_AUCTIONS],
    vehicles: [...MOCK_VEHICLES],
    drivers: [...MOCK_DRIVERS],
    contracts: [...MOCK_CONTRACTS],
    invoices: [...MOCK_INVOICES],
    ledger: [...MOCK_LEDGER],
    payments: buildInitialPayments(),
    exceptions: [...MOCK_EXCEPTIONS],
    nbfcApplications: INITIAL_NBFC_APPLICATIONS.map((app) => ({ ...app })),
    capacity: [...MOCK_CAPACITY],
    notifications: [...MOCK_NOTIFICATIONS],
    disputes: [...MOCK_DISPUTES],
  }
}

function buildDataForVendor(vendorName?: string): VendorDataCollections {
  return isBlankVendor(vendorName) ? { ...EMPTY_DATA } : buildFullData()
}

const INITIAL_NBFC_APPLICATIONS: NBFCApplication[] = [
  {
    id: 'nbfc-app-001',
    invoiceId: 'INV-2026-001',
    invoiceNumber: 'INV-2026-001',
    customerName: 'HUL',
    partnerId: 'nbfc-1',
    partnerName: 'FinEdge Capital',
    status: 'SUBMITTED',
    appliedAt: '2026-05-10T10:00:00Z',
    requestedAmount: 90000,
    charges: 1500,
    netAmount: 88500,
    referenceNumber: 'NBFC-REF-001',
    remarks: 'Awaiting final approval',
    emailTitle: 'Bill Discounting Request - INV-2026-001',
    recipientEmail: 'finedge@nbfc.com',
    emailDescription: 'Please process the request for INV-2026-001.',
    invoiceFileName: 'inv-2026-001.pdf',
  },
  {
    id: 'nbfc-app-002',
    invoiceId: 'INV-2026-002',
    invoiceNumber: 'INV-2026-002',
    customerName: 'HUL',
    partnerId: 'nbfc-2',
    partnerName: 'Prime Credit',
    status: 'DISBURSED',
    appliedAt: '2026-05-11T09:30:00Z',
    approvedAt: '2026-05-12T15:30:00Z',
    requestedAmount: 92000,
    approvedAmount: 90000,
    charges: 1800,
    approvedCharges: 2000,
    netAmount: 88000,
    referenceNumber: 'NBFC-REF-002',
    remarks: 'Disbursed — NBFC financing and charges posted to ledger',
    emailTitle: 'Bill Discounting Request - INV-2026-002',
    recipientEmail: 'prime@nbfc.com',
    emailDescription: 'Please process the request for INV-2026-002.',
    invoiceFileName: 'inv-2026-002.pdf',
  },
  {
    id: 'nbfc-app-003',
    invoiceId: 'INV-2026-003',
    invoiceNumber: 'INV-2026-003',
    customerName: 'HUL',
    partnerId: 'nbfc-3',
    partnerName: 'Axis Finance',
    status: 'REJECTED',
    appliedAt: '2026-05-12T11:00:00Z',
    requestedAmount: 76000,
    charges: 1400,
    netAmount: 74600,
    referenceNumber: 'NBFC-REF-003',
    remarks: 'Rejected due to credit policy mismatch',
    emailTitle: 'Bill Discounting Request - INV-2026-003',
    recipientEmail: 'axis@nbfc.com',
    emailDescription: 'Please process the request for INV-2026-003.',
    invoiceFileName: 'inv-2026-003.pdf',
  },
  {
    id: 'nbfc-app-004',
    invoiceId: 'INV-2026-004',
    invoiceNumber: 'INV-2026-004',
    customerName: 'HUL',
    partnerId: 'nbfc-4',
    partnerName: 'Tata Capital',
    status: 'APPROVED',
    appliedAt: '2026-05-15T09:00:00Z',
    approvedAt: '2026-05-17T11:00:00Z',
    requestedAmount: 76000,
    approvedAmount: 75000,
    charges: 1500,
    approvedCharges: 1600,
    netAmount: 73400,
    referenceNumber: 'NBFC-REF-004',
    remarks: 'Approved — awaiting disbursal',
    emailTitle: 'Bill Discounting Request - INV-2026-004',
    recipientEmail: 'tata@nbfc.com',
    emailDescription: 'Please process the request for INV-2026-004.',
    invoiceFileName: 'inv-2026-004.pdf',
  },
]

const buildInitialPayments = (): PaymentRecord[] =>
  MOCK_LEDGER
    .filter((entry) => ['CUSTOMER_PAYMENT', 'TDS_DEDUCTION'].includes(entry.entryType))
    .map((entry, index) => {
      const invoiceId = entry.invoiceId
      const paymentKind: PaymentKind =
        entry.entryType === 'TDS_DEDUCTION' ? 'TDS_DEDUCTION'
          : 'CUSTOMER_PAYMENT'
      const amount = entry.credit > 0 ? entry.credit : entry.debit
      return {
        id: `pay-seed-${index + 1}`,
        invoiceId,
        invoiceNumber: invoiceId,
        customerName: invoiceId,
        paymentKind,
        paymentDate: entry.date,
        cashAmount: entry.entryType === 'TDS_DEDUCTION' ? 0 : amount,
        tdsAmount: entry.entryType === 'TDS_DEDUCTION' ? entry.credit : 0,
        referenceNumber: entry.referenceNumber ?? entry.id.toUpperCase(),
        note: entry.description,
        status: 'POSTED',
        createdAt: `${entry.date}T00:00:00Z`,
        ledgerEntryIds: [entry.id],
      } as PaymentRecord
    })

const INITIAL_VENDOR_NAME = readLoggedInVendorName()

export const useAppStore = create<AppState>((set) => ({
  // Start in the shape that matches the logged-in vendor so there's no flash of
  // demo data for a "blank" vendor on first paint.
  ...buildDataForVendor(INITIAL_VENDOR_NAME),
  appliedVendorKey: normalizeVendorName(INITIAL_VENDOR_NAME),

  acceptIndent: (indentId) => {
    set((state) => {
      const indentIndex = state.indents.findIndex((i) => i.id === indentId)
      if (indentIndex === -1) return state

      const indent = state.indents[indentIndex] as Indent

      const updatedIndents = [...state.indents]
      updatedIndents[indentIndex] = { ...indent, status: 'ACCEPTED' }

      const newTrip: Trip = {
        // Same booking ref carries through the lifecycle, like cross-module bookings.
        id: indent.id,
        contractId: indent.contractId,
        indentId: indent.id,
        laneDetails: indent.laneDetails,
        // Carry the booking's expected vehicle type so the assign modal can
        // filter the fleet before a vehicle is attached.
        assignedVehicle: { id: '', registrationNumber: '—', type: indent.vehicleTypeRequired || '—' },
        assignedDriver: { id: '', name: '—', mobile: '—' },
        status: 'ACCEPTED',
        slaFlag: 'ON_TIME',
        freightRate: 0,
        isInvoiced: false,
        createdAt: new Date().toISOString(),
      }

      return {
        indents: updatedIndents,
        trips: [newTrip, ...state.trips],
      }
    })
  },

  assignVehicleToTrip: (tripId, vehicleId, driverId) => {
    set((state) => {
      const tripIndex = state.trips.findIndex((t) => t.id === tripId)
      if (tripIndex === -1) return state

      const trip = state.trips[tripIndex] as Trip
      if (trip.status !== 'ACCEPTED') return state

      const vehicle = state.vehicles.find((v) => v.id === vehicleId)
      const driver = state.drivers.find((d) => d.id === driverId)
      if (!vehicle || !driver) return state

      const updatedTrips = [...state.trips]
      updatedTrips[tripIndex] = {
        ...trip,
        assignedVehicle: { id: vehicle.id, registrationNumber: vehicle.registrationNumber, type: vehicle.vehicleType },
        assignedDriver: { id: driver.id, name: driver.name, mobile: driver.mobile },
        status: 'ASSIGNED',
      }

      return { trips: updatedTrips }
    })
  },

  addTripExpense: (tripId, input) => {
    set((state) => {
      const tripIndex = state.trips.findIndex((t) => t.id === tripId)
      if (tripIndex === -1) return state
      const trip = state.trips[tripIndex] as Trip
      const now = new Date().toISOString()
      const record: TripExpense = {
        id: `expense-${Date.now()}`,
        label: input.label,
        amount: input.amount,
        expenseType: input.expenseType,
        paymentMode: input.paymentMode,
        paidBy: input.paidBy,
        status: 'Approved',
        dateTime: now,
      }
      const expenses = [...(trip.expenses ?? []), record]
      const isAdvance = (e: TripExpense) => /advance/i.test(`${e.expenseType ?? ''} ${e.label ?? ''}`)
      const approved = expenses.filter((e) => e.status === 'Approved')
      const updatedTrips = [...state.trips]
      updatedTrips[tripIndex] = {
        ...trip,
        expenses,
        approvedExpenses: approved.filter((e) => !isAdvance(e)).reduce((s, e) => s + (e.amount || 0), 0),
        advance: approved.filter(isAdvance).reduce((s, e) => s + (e.amount || 0), 0),
        advanceItems: approved.filter(isAdvance),
      }
      return { trips: updatedTrips }
    })
  },

  assignVehicleToTripResolved: (tripId, vehicle, driver) => {
    set((state) => {
      const tripIndex = state.trips.findIndex((t) => t.id === tripId)
      if (tripIndex === -1) return state

      const trip = state.trips[tripIndex] as Trip
      if (trip.status !== 'ACCEPTED') return state

      const updatedTrips = [...state.trips]
      updatedTrips[tripIndex] = {
        ...trip,
        assignedVehicle: { id: vehicle.id, registrationNumber: vehicle.registrationNumber, type: vehicle.vehicleType },
        assignedDriver: { id: driver.id, name: driver.name, mobile: driver.mobile },
        status: 'ASSIGNED',
      }

      return { trips: updatedTrips }
    })
  },

  declineIndent: (indentId) => {
    set((state) => {
      const indentIndex = state.indents.findIndex((i) => i.id === indentId)
      if (indentIndex === -1) return state

      const updatedIndents = [...state.indents]
      updatedIndents[indentIndex] = { ...state.indents[indentIndex], status: 'DECLINED' } as Indent
      return { indents: updatedIndents }
    })
  },

  submitBid: (auctionId, laneId, amount) => {
    set((state) => {
      const auctionIndex = state.auctions.findIndex((a) => a.id === auctionId)
      if (auctionIndex === -1) return state

      const auction = state.auctions[auctionIndex] as Auction
      const newBid: AuctionBid = {
        id: `BID-${Math.floor(1000 + Math.random() * 9000)}`,
        laneId,
        amount,
        placedAt: new Date().toISOString(),
        status: 'ACTIVE',
      }

      // Mark older bids for this lane as SUPERSEDED
      const updatedBids = auction.vendorBids.map((bid) =>
        bid.laneId === laneId && bid.status === 'ACTIVE' ? { ...bid, status: 'SUPERSEDED' as const } : bid
      )

      const updatedAuction: Auction = {
        ...auction,
        vendorBids: [...updatedBids, newBid],
      }

      // Update current best bid if applicable
      const laneIndex = updatedAuction.lanes.findIndex((l) => l.id === laneId)
      if (laneIndex !== -1) {
        const lane = updatedAuction.lanes[laneIndex] as AuctionLane
        if (!lane.currentBestBid || amount < lane.currentBestBid) {
          const updatedLanes = [...updatedAuction.lanes]
          updatedLanes[laneIndex] = { ...lane, currentBestBid: amount } as AuctionLane
          updatedAuction.lanes = updatedLanes
        }
      }

      const updatedAuctions = [...state.auctions]
      updatedAuctions[auctionIndex] = updatedAuction

      return { auctions: updatedAuctions }
    })
  },

  addVehicle: (vehicle) => {
    set((state) => ({ vehicles: [vehicle, ...state.vehicles] }))
  },

  updateVehicle: (vehicle) => {
    set((state) => ({
      vehicles: state.vehicles.map((item) => (item.id === vehicle.id ? vehicle : item)),
    }))
  },

  addDriver: (driver) => {
    set((state) => ({ drivers: [driver, ...state.drivers] }))
  },

  updateDriver: (driver) => {
    set((state) => ({
      drivers: state.drivers.map((item) => (item.id === driver.id ? driver : item)),
    }))
  },

  generateInvoice: (payload) => {
    set((state) => {
      const { tripIds, invoiceDate = new Date().toISOString(), dueDate, gstRate = 12, invoiceNumber } = payload
      if (tripIds.length === 0) return state

      // Only COMPLETED, not-yet-invoiced bookings are billable.
      const selectedTrips = tripIds
        .map((id) => state.trips.find((trip) => trip.id === id))
        .filter((trip): trip is Trip => Boolean(trip && trip.status === 'COMPLETED' && !trip.isInvoiced))

      if (selectedTrips.length === 0) return state

      // Prefer edited line items (freight + charges) supplied by the Create
      // Invoice page; fall back to freight-only derived from the trips.
      const editedById = new Map((payload.lineItems ?? []).map((li) => [li.tripId, li]))
      const lineItems: InvoiceLineItem[] = selectedTrips.map((trip) => {
        const edited = editedById.get(trip.id)
        if (edited) return edited
        const freightCharge = trip.freightRate || 0
        return { tripId: trip.id, tripReference: trip.id, freightCharge, lineTotal: freightCharge }
      })
      const subtotal = lineItems.reduce((sum, li) => sum + li.lineTotal, 0)
      // Split GST by place of supply: supplier = vendor's own GSTIN state,
      // place of supply = buyer's GSTIN state. Inter-state -> IGST, intra -> CGST+SGST.
      const vendorGstin = MOCK_COMPANY_INFO.gstin
      const tax = computeGst({
        taxableValue: subtotal,
        ratePct: gstRate,
        supplierStateCode: stateCodeOf(vendorGstin),
        placeOfSupplyStateCode: stateCodeOf(BUYER_GSTIN),
      })
      const gstAmount = tax.igst + tax.cgst + tax.sgst
      const finalDueDate = dueDate ?? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      const generatedInvoiceNumber = invoiceNumber ?? `INV-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`

      const newInvoice = {
        id: generatedInvoiceNumber,
        invoiceNumber: generatedInvoiceNumber,
        invoiceDate,
        paymentDueDate: finalDueDate,
        subtotal,
        gstAmount,
        igst: tax.igst,
        cgst: tax.cgst,
        sgst: tax.sgst,
        grandTotal: tax.total,
        status: 'PENDING' as any,
        lineItems,
        vendorGstin,
        customerGstin: BUYER_GSTIN,
        billingPeriod: {
          from: selectedTrips
            .map((trip) => (trip.deliveredDate ?? trip.createdAt).slice(0, 10))
            .sort()[0],
          to: selectedTrips
            .map((trip) => (trip.deliveredDate ?? trip.createdAt).slice(0, 10))
            .sort().slice(-1)[0],
        },
        pdfUrl: `/invoices/${generatedInvoiceNumber}.pdf`,
        tripReferences: selectedTrips.map((trip) => trip.id),
        createdAt: invoiceDate,
        statusUpdatedAt: invoiceDate,
      } as unknown as Invoice

      // Mark only the actually-billed trips as invoiced
      const billedIds = new Set(selectedTrips.map((trip) => trip.id))
      const updatedTrips = state.trips.map(t =>
        billedIds.has(t.id) ? { ...t, isInvoiced: true } : t
      )

      return {
        invoices: [newInvoice, ...state.invoices],
        trips: updatedTrips
      }
    })
  },

  // Vendor withdraws a resubmission-required invoice — closed (WITHDRAWN); the
  // bookings it covered become billable again (invoicedTripIds skips CLOSED).
  closeInvoice: (invoiceId) =>
    set((state) => {
      const now = new Date().toISOString()
      return {
        invoices: state.invoices.map((inv) =>
          inv.id === invoiceId && inv.status === 'RESUBMISSION_REQUIRED'
            ? { ...inv, status: 'CLOSED' as const, closeReason: 'WITHDRAWN' as const, statusUpdatedAt: now }
            : inv,
        ),
      }
    }),

  recordInvoicePayment: ({ invoiceId, paymentDate, cashAmount, tdsAmount, referenceNumber, note }) =>
    set((state) => {
      const invoice = state.invoices.find((item) => item.id === invoiceId)
      if (!invoice) return state
      const amount = Math.max(0, cashAmount) + Math.max(0, tdsAmount)
      if (amount <= 0) return state
      const entryType = tdsAmount > 0 ? 'TDS_DEDUCTION' : 'CUSTOMER_PAYMENT'
      const customerEntries = state.ledger
        .filter((entry) => entry.invoiceId === invoiceId && entry.ledgerType === 'CUSTOMER')
        .sort((a, b) => a.date.localeCompare(b.date))
      const currentBalance = customerEntries.length > 0 ? customerEntries[customerEntries.length - 1].runningBalance : 0
      if (amount > currentBalance) return state
      const nextBalance = Math.max(0, currentBalance - amount)
      const ledgerEntry: LedgerEntry = {
        id: `led-${Math.floor(1000 + Math.random() * 9000)}`,
        invoiceId,
        ledgerType: 'CUSTOMER',
        date: paymentDate,
        entryType,
        description: note?.trim() || `${entryType === 'TDS_DEDUCTION' ? 'TDS deduction' : 'Customer payment'} for ${invoice.invoiceNumber}`,
        credit: amount,
        debit: 0,
        runningBalance: nextBalance,
        referenceNumber,
        notes: note,
        mode: entryType === 'TDS_DEDUCTION' ? 'ADJUSTMENT' : 'BANK',
      }

      const paymentRecord: PaymentRecord = {
        id: `pay-${Math.floor(1000 + Math.random() * 9000)}`,
        invoiceId,
        invoiceNumber: invoice.invoiceNumber,
        customerName: invoice.invoiceNumber,
        paymentKind: entryType === 'TDS_DEDUCTION' ? 'TDS_DEDUCTION' : 'CUSTOMER_PAYMENT',
        paymentDate,
        cashAmount: entryType === 'TDS_DEDUCTION' ? 0 : amount,
        tdsAmount: entryType === 'TDS_DEDUCTION' ? amount : 0,
        referenceNumber,
        note,
        recordedBy: 'Vendor finance user',
        recordedAt: new Date().toISOString(),
        status: 'POSTED',
        createdAt: new Date().toISOString(),
        ledgerEntryIds: [ledgerEntry.id],
      }

      return {
        payments: [paymentRecord, ...state.payments],
        ledger: [ledgerEntry, ...state.ledger],
        invoices: state.invoices.map((item) =>
          item.id === invoiceId ? { ...item, paymentDate: nextBalance === 0 ? paymentDate : item.paymentDate } : item
        ),
      }
    }),

  postCustomerLedgerEntry: ({ invoiceId, entryType, amount, date, description, referenceNumber, mode, notes }) =>
    set((state) => {
      const invoice = state.invoices.find((item) => item.id === invoiceId)
      if (!invoice || amount <= 0) return state
      const customerEntries = state.ledger
        .filter((entry) => entry.invoiceId === invoiceId && entry.ledgerType === 'CUSTOMER')
        .sort((a, b) => a.date.localeCompare(b.date))
      const currentBalance = customerEntries.length > 0 ? customerEntries[customerEntries.length - 1].runningBalance : 0
      if (entryType !== 'INVOICE_APPROVED' && amount > currentBalance) return state
      const nextBalance = entryType === 'INVOICE_APPROVED' ? currentBalance + amount : Math.max(0, currentBalance - amount)

      const ledgerEntry: LedgerEntry = {
        id: `led-${Math.floor(1000 + Math.random() * 9000)}`,
        invoiceId,
        ledgerType: 'CUSTOMER',
        date,
        entryType,
        description: description.trim(),
        credit: entryType === 'INVOICE_APPROVED' ? 0 : amount,
        debit: entryType === 'INVOICE_APPROVED' ? amount : 0,
        runningBalance: nextBalance,
        referenceNumber,
        mode: mode ?? (entryType === 'TDS_DEDUCTION' ? 'ADJUSTMENT' : 'BANK'),
        notes,
      }

      const payments = entryType === 'INVOICE_APPROVED'
        ? state.payments
        : [{
          id: `pay-${Math.floor(1000 + Math.random() * 9000)}`,
          invoiceId,
          invoiceNumber: invoice.invoiceNumber,
          customerName: invoice.invoiceNumber,
          paymentKind: entryType === 'TDS_DEDUCTION' ? 'TDS_DEDUCTION' : 'CUSTOMER_PAYMENT',
          paymentDate: date,
          cashAmount: entryType === 'TDS_DEDUCTION' ? 0 : amount,
          tdsAmount: entryType === 'TDS_DEDUCTION' ? amount : 0,
          referenceNumber,
          note: notes ?? description,
          status: 'POSTED' as const,
          createdAt: new Date().toISOString(),
          ledgerEntryIds: [ledgerEntry.id],
        } as PaymentRecord, ...state.payments]

      return {
        ledger: [ledgerEntry, ...state.ledger],
        payments,
        invoices: state.invoices.map((item) =>
          item.id === invoiceId ? { ...item, paymentDate: nextBalance === 0 ? date : item.paymentDate } : item
        ),
      }
    }),

  postNbfcLedgerEntry: ({ invoiceId, entryType, amount, date, description, referenceNumber, mode, notes }) =>
    set((state) => {
      const invoice = state.invoices.find((item) => item.id === invoiceId)
      if (!invoice || amount <= 0) return state
      const nbfcEntries = state.ledger
        .filter((entry) => entry.invoiceId === invoiceId && entry.ledgerType === 'NBFC')
        .sort((a, b) => a.date.localeCompare(b.date))
      const currentBalance = nbfcEntries.length > 0 ? nbfcEntries[nbfcEntries.length - 1].runningBalance : 0
      const isDebit = entryType === 'NBFC_FINANCING_APPROVED' || entryType === 'NBFC_CHARGE' || entryType === 'NBFC_ADJUSTMENT'
      const nextBalance = isDebit ? currentBalance + amount : Math.max(0, currentBalance - amount)
      const ledgerEntry: LedgerEntry = {
        id: `led-${Math.floor(1000 + Math.random() * 9000)}`,
        invoiceId,
        ledgerType: 'NBFC',
        date,
        entryType,
        description: description.trim(),
        credit: isDebit ? 0 : amount,
        debit: isDebit ? amount : 0,
        runningBalance: nextBalance,
        referenceNumber,
        mode: mode ?? 'BANK',
        notes,
      }
      return {
        ledger: [ledgerEntry, ...state.ledger],
        payments: (entryType === 'NBFC_DISBURSEMENT' || entryType === 'NBFC_REPAYMENT' || entryType === 'NBFC_CHARGE')
          ? [{
            id: `pay-${Math.floor(1000 + Math.random() * 9000)}`,
            invoiceId,
            invoiceNumber: invoice.invoiceNumber,
            customerName: invoice.invoiceNumber,
            paymentKind:
              entryType === 'NBFC_DISBURSEMENT' ? 'NBFC_DISBURSEMENT'
              : entryType === 'NBFC_REPAYMENT' ? 'NBFC_REPAYMENT'
              : 'NBFC_CHARGE',
            paymentDate: date,
            cashAmount: amount,
            tdsAmount: 0,
            referenceNumber,
            note: notes ?? description,
            status: 'POSTED' as const,
            createdAt: new Date().toISOString(),
            ledgerEntryIds: [ledgerEntry.id],
          } as PaymentRecord, ...state.payments]
          : state.payments,
      }
    }),

  recordPaymentReminder: ({ invoiceId, paymentKind, paymentDate, amount, referenceNumber, note }) =>
    set((state) => {
      const invoice = state.invoices.find((item) => item.id === invoiceId)
      if (!invoice || amount <= 0) return state
      const paymentRecord: PaymentRecord = {
        id: `pay-${Math.floor(1000 + Math.random() * 9000)}`,
        invoiceId,
        invoiceNumber: invoice.invoiceNumber,
        customerName: invoice.invoiceNumber,
        paymentKind,
        paymentDate,
        cashAmount: amount,
        tdsAmount: 0,
        referenceNumber,
        note,
        status: 'PENDING',
        createdAt: new Date().toISOString(),
        ledgerEntryIds: [],
      }
      return { payments: [paymentRecord, ...state.payments] }
    }),

  submitNbfcApplication: ({ invoiceId, invoiceNumber, customerName, partnerId, partnerName, requestedAmount, charges, netAmount, emailTitle, recipientEmail, emailDescription, invoiceFileName }) =>
    set((state) => {
      const application: NBFCApplication = {
        id: `nbfc-app-${Math.floor(100 + Math.random() * 900)}`,
        invoiceId,
        invoiceNumber,
        customerName,
        partnerId,
        partnerName,
        status: 'SUBMITTED',
        appliedAt: new Date().toISOString(),
        referenceNumber: `NBFC-${Math.floor(100000 + Math.random() * 900000)}`,
        requestedAmount,
        charges,
        netAmount,
        emailTitle,
        recipientEmail,
        emailDescription,
        invoiceFileName,
      }

      return {
        nbfcApplications: [
          application,
          ...state.nbfcApplications.filter((item) => item.invoiceId !== invoiceId),
        ],
        invoices: state.invoices.map((invoice) =>
          invoice.id === invoiceId ? { ...invoice, nbfcDiscountingStatus: 'SUBMITTED' } : invoice
        ),
      }
    }),

  updateNbfcApplicationFinancials: ({ invoiceId, approvedAmount, approvedCharges, netAmount, referenceNumber, remarks }) =>
    set((state) => ({
      nbfcApplications: state.nbfcApplications.map((application) =>
        application.invoiceId === invoiceId
          ? {
              ...application,
              approvedAmount,
              approvedCharges,
              netAmount,
              referenceNumber: referenceNumber ?? application.referenceNumber,
              remarks: remarks ?? application.remarks,
            }
          : application
      ),
    })),

  markNbfcApplicationStatus: (invoiceId, status) =>
    set((state) => {
      const nowIso = new Date().toISOString()

      const updatedApplications = state.nbfcApplications.map((application) =>
        application.invoiceId === invoiceId
          ? {
              ...application,
              status,
              approvedAt: status === 'APPROVED' && !application.approvedAt ? nowIso : application.approvedAt,
            }
          : application
      )

      const nbfcDiscountingStatus: Invoice['nbfcDiscountingStatus'] =
        status === 'SUBMITTED' ? 'SUBMITTED'
        : status === 'APPROVED' ? 'APPROVED'
        : status === 'DISBURSED' ? 'DISBURSED'
        : 'REJECTED'

      const invoices = state.invoices.map((invoice) =>
        invoice.id === invoiceId ? { ...invoice, nbfcDiscountingStatus } : invoice
      )
      return { nbfcApplications: updatedApplications, invoices }
    }),

  createException: ({ bookingId, route, vehicle, driver, issueType, severity, description, evidence = [] }) => {
    set((state) => {
      const timestamp = new Date().toISOString()
      const exception: ExceptionRecord = {
        id: `EXC-${Math.floor(1000 + Math.random() * 9000)}`,
        bookingId,
        route,
        vehicle,
        driver,
        issueType,
        severity,
        status: 'OPEN',
        slaDueAt: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
        createdAt: timestamp,
        updatedAt: timestamp,
        description,
        evidence,
        timeline: [
          {
            id: `exc-${Math.floor(1000 + Math.random() * 9000)}-1`,
            action: 'Reported',
            notes: description,
            timestamp,
            by: 'Vendor portal',
          },
        ],
      }

      return {
        exceptions: [exception, ...state.exceptions],
      }
    })
  },

  updateExceptionStatus: (exceptionId, status, notes) => {
    set((state) => ({
      exceptions: state.exceptions.map((exception) => {
        if (exception.id !== exceptionId) return exception

        const timestamp = new Date().toISOString()
        const action =
          status === 'IN_PROGRESS'
            ? 'In Progress'
            : status === 'RESOLVED'
              ? 'Resolved'
              : 'Open'

        const defaultNotes =
          status === 'IN_PROGRESS'
            ? 'Working on recovery and customer communication.'
            : status === 'RESOLVED'
              ? 'Issue has been resolved.'
              : 'Exception reported and awaiting triage.'

        return {
          ...exception,
          status,
          updatedAt: timestamp,
          timeline: [
            ...exception.timeline,
            {
              id: `exc-${exception.id.toLowerCase()}-${exception.timeline.length + 1}`,
              action,
              notes: notes ?? defaultNotes,
              timestamp,
              by: 'Operations',
            } as ExceptionTimelineEntry,
          ],
        }
      }),
    }))
  },

  addCapacityDeclaration: (declaration) =>
    set((state) => ({ capacity: [declaration, ...state.capacity] })),

  changeTripAssignment: (tripId, { vehicleId, driverId, issueReason, notes, resolve }) =>
    set((state) => {
      const tripIndex = state.trips.findIndex((t) => t.id === tripId)
      if (tripIndex === -1) return state
      const trip = state.trips[tripIndex] as Trip
      const nextVehicle = vehicleId
        ? state.vehicles.find((v) => v.id === vehicleId)
        : undefined
      const nextDriver = driverId
        ? state.drivers.find((d) => d.id === driverId)
        : undefined

      const now = new Date().toISOString()
      const updatedTrip: Trip = {
        ...trip,
        assignedVehicle: nextVehicle
          ? { id: nextVehicle.id, registrationNumber: nextVehicle.registrationNumber, type: nextVehicle.vehicleType }
          : trip.assignedVehicle,
        assignedDriver: nextDriver
          ? { id: nextDriver.id, name: nextDriver.name, mobile: nextDriver.mobile }
          : trip.assignedDriver,
      }

      if (resolve) {
        updatedTrip.disruption = trip.disruption ? { ...trip.disruption, resolvedAt: now } : undefined
        updatedTrip.exceptionFlag = false
        updatedTrip.slaFlag = 'ON_TIME'
      } else if (issueReason) {
        updatedTrip.disruption = {
          reason: issueReason,
          reportedAt: trip.disruption?.reportedAt ?? now,
          notes: notes ?? trip.disruption?.notes,
        }
        updatedTrip.exceptionFlag = true
      } else if (notes && trip.disruption) {
        updatedTrip.disruption = { ...trip.disruption, notes }
      }

      const updatedTrips = [...state.trips]
      updatedTrips[tripIndex] = updatedTrip
      return { trips: updatedTrips }
    }),

  markNotificationRead: (notificationId) => {
    set((state) => ({
      notifications: state.notifications.map((notification) =>
        notification.id === notificationId ? { ...notification, isRead: true } : notification
      ),
    }))
  },

  markAllNotificationsRead: () => {
    set((state) => ({
      notifications: state.notifications.map((notification) => ({ ...notification, isRead: true })),
    }))
  },

  addNotification: (notification) =>
    set((state) => ({ notifications: [notification, ...state.notifications] })),

  loadBackendData: async () => {
    // Mock-only mode: backend not called.
  },

  respondToDispute: (disputeId, message, attachmentNames) =>
    set((state) => {
      const dispute = state.disputes.find((d) => d.id === disputeId)
      // Vendor can only post while the dispute is OPEN, and this never changes the invoice status.
      if (!dispute || dispute.status !== 'OPEN') return state
      const timestamp = new Date().toISOString()
      const nextIndex = (dispute.messages?.length ?? 0) + 1
      const attachments = (attachmentNames ?? [])
        .map((name) => name.trim())
        .filter(Boolean)
        .map((fileName, index) => ({ id: `datt-${dispute.id.toLowerCase()}-${nextIndex}-${index + 1}`, fileName }))
      if (!message.trim() && attachments.length === 0) return state
      return {
        disputes: state.disputes.map((d) =>
          d.id === disputeId
            ? {
                ...d,
                updatedAt: timestamp,
                messages: [
                  ...(d.messages ?? []),
                  {
                    id: `dmsg-${d.id.toLowerCase()}-${nextIndex}`,
                    sender: 'VENDOR' as const,
                    message: message.trim() || 'Documents uploaded for finance review.',
                    createdAt: timestamp,
                    attachments: attachments.length ? attachments : undefined,
                  },
                ],
              }
            : d
        ),
      }
    }),

  createResubmissionInvoice: (oldInvoiceId, updatedLineItems) =>
    set((state) => {
      const oldInvoice = state.invoices.find((inv) => inv.id === oldInvoiceId)
      if (!oldInvoice || oldInvoice.status !== 'RESUBMISSION_REQUIRED') return state

      const subtotal = updatedLineItems.reduce((sum, item) => sum + item.lineTotal, 0)
      const gstFraction = oldInvoice.subtotal > 0 ? oldInvoice.gstAmount / oldInvoice.subtotal : 0.12
      // Re-split GST by place of supply, carrying the original invoice's GSTINs.
      const tax = computeGst({
        taxableValue: subtotal,
        ratePct: gstFraction * 100,
        supplierStateCode: stateCodeOf(oldInvoice.vendorGstin),
        placeOfSupplyStateCode: stateCodeOf(oldInvoice.customerGstin),
      })
      const gstAmount = tax.igst + tax.cgst + tax.sgst
      const nowIso = new Date().toISOString()
      const newInvoiceNumber = `INV-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`

      const newInvoice: Invoice = {
        ...oldInvoice,
        id: newInvoiceNumber,
        invoiceNumber: newInvoiceNumber,
        invoiceDate: nowIso.slice(0, 10),
        status: 'PENDING',
        closeReason: undefined,
        supersedesInvoiceId: oldInvoice.id,
        supersededByInvoiceId: undefined,
        lineItems: updatedLineItems,
        subtotal,
        gstAmount,
        igst: tax.igst,
        cgst: tax.cgst,
        sgst: tax.sgst,
        grandTotal: tax.total,
        notes: `Resubmission of ${oldInvoice.invoiceNumber}.`,
        pdfUrl: `/invoices/${newInvoiceNumber}.pdf`,
        createdAt: nowIso,
      }

      return {
        // Old invoice closes as SUPERSEDED; the corrected one starts fresh as PENDING.
        invoices: [
          newInvoice,
          ...state.invoices.map((inv) =>
            inv.id === oldInvoiceId
              ? { ...inv, status: 'CLOSED' as const, closeReason: 'SUPERSEDED' as const, statusUpdatedAt: new Date().toISOString(), supersededByInvoiceId: newInvoiceNumber }
              : inv
          ),
        ],
      }
    }),

  financeApproveInvoice: (invoiceId) =>
    set((state) => {
      const invoice = state.invoices.find((inv) => inv.id === invoiceId)
      const approving = Boolean(invoice && (invoice.status === 'PENDING' || invoice.status === 'DISPUTED'))
      // Approval opens the receivable: post the INVOICE_APPROVED ledger entry
      // automatically (idempotent — one opening entry per invoice).
      const hasOpeningEntry = state.ledger.some(
        (entry) => entry.invoiceId === invoiceId && entry.entryType === 'INVOICE_APPROVED',
      )
      const openingEntry: LedgerEntry | null = approving && invoice && !hasOpeningEntry
        ? {
            id: `led-appr-${invoiceId}`,
            invoiceId,
            ledgerType: 'CUSTOMER',
            date: new Date().toISOString().slice(0, 10),
            entryType: 'INVOICE_APPROVED',
            description: `Invoice ${invoice.invoiceNumber} approved — receivable opened`,
            credit: 0,
            debit: invoice.grandTotal,
            runningBalance: invoice.grandTotal,
            mode: 'ADJUSTMENT',
          }
        : null
      return {
        invoices: state.invoices.map((inv) =>
          inv.id === invoiceId && (inv.status === 'PENDING' || inv.status === 'DISPUTED')
            ? { ...inv, status: 'APPROVED' as const, statusUpdatedAt: new Date().toISOString() }
            : inv
        ),
        disputes: state.disputes.map((d) =>
          d.invoiceId === invoiceId && d.status === 'OPEN'
            ? { ...d, status: 'CLOSED' as const, updatedAt: new Date().toISOString() }
            : d
        ),
        ledger: openingEntry ? [openingEntry, ...state.ledger] : state.ledger,
      }
    }),

  // Mirrors a finance-approved invoice (from the cross-module bridge) into the
  // local store and opens its receivable in the ledger. Idempotent: existing
  // invoice rows and opening entries are never duplicated. Lets Record
  // Payments and the Ledger work for invoices approved in the finance module.
  ensureInvoiceLedgerOpened: (invoice) =>
    set((state) => {
      const invoiceExists = state.invoices.some((item) => item.id === invoice.id)
      const hasOpeningEntry = state.ledger.some(
        (entry) => entry.invoiceId === invoice.id && entry.entryType === 'INVOICE_APPROVED',
      )
      if (invoiceExists && hasOpeningEntry) return state
      const openingEntry: LedgerEntry = {
        id: `led-appr-${invoice.id}`,
        invoiceId: invoice.id,
        ledgerType: 'CUSTOMER',
        date: invoice.invoiceDate?.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
        entryType: 'INVOICE_APPROVED',
        description: `Invoice ${invoice.invoiceNumber} approved — receivable opened`,
        credit: 0,
        debit: invoice.grandTotal,
        runningBalance: invoice.grandTotal,
        mode: 'ADJUSTMENT',
      }
      return {
        invoices: invoiceExists ? state.invoices : [invoice, ...state.invoices],
        ledger: hasOpeningEntry ? state.ledger : [openingEntry, ...state.ledger],
      }
    }),

  financeRaiseDispute: (invoiceId, reason) =>
    set((state) => {
      const invoice = state.invoices.find((inv) => inv.id === invoiceId)
      if (!invoice || invoice.status !== 'PENDING') return state
      const nowIso = new Date().toISOString()
      const existing = state.disputes.find((d) => d.invoiceId === invoiceId)
      const num = state.disputes.length + 1
      const dispute: Dispute = existing
        ? { ...existing, reason, status: 'OPEN', updatedAt: nowIso }
        : {
            id: `DSP-${new Date().getFullYear()}-${String(num).padStart(3, '0')}`,
            invoiceId,
            invoiceNumber: invoice.invoiceNumber,
            invoiceAmount: invoice.grandTotal,
            reason,
            status: 'OPEN',
            raisedAt: nowIso,
            updatedAt: nowIso,
            responseDueAt: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
            messages: [{ id: `dmsg-${num}-1`, sender: 'FINANCE', message: reason, createdAt: nowIso }],
          }
      return {
        invoices: state.invoices.map((inv) => (inv.id === invoiceId ? { ...inv, status: 'DISPUTED' as const, statusUpdatedAt: nowIso } : inv)),
        disputes: existing
          ? state.disputes.map((d) => (d.invoiceId === invoiceId ? dispute : d))
          : [dispute, ...state.disputes],
      }
    }),

  financeRequestResubmission: (invoiceId, message) =>
    set((state) => {
      const invoice = state.invoices.find((inv) => inv.id === invoiceId)
      if (!invoice || invoice.status !== 'DISPUTED') return state
      const timestamp = new Date().toISOString()
      return {
        invoices: state.invoices.map((inv) => (inv.id === invoiceId ? { ...inv, status: 'RESUBMISSION_REQUIRED' as const, statusUpdatedAt: timestamp } : inv)),
        disputes: state.disputes.map((d) =>
          d.invoiceId === invoiceId && d.status === 'OPEN'
            ? {
                ...d,
                status: 'CLOSED' as const,
                updatedAt: timestamp,
                messages: [
                  ...(d.messages ?? []),
                  {
                    id: `dmsg-${d.id.toLowerCase()}-${(d.messages?.length ?? 0) + 1}`,
                    sender: 'FINANCE' as const,
                    message: message?.trim() || 'Resubmission required. Please create a new corrected invoice.',
                    createdAt: timestamp,
                  },
                ],
              }
            : d
        ),
      }
    }),

  financeRejectInvoice: (invoiceId, reason) =>
    set((state) => {
      const invoice = state.invoices.find((inv) => inv.id === invoiceId)
      if (!invoice || (invoice.status !== 'PENDING' && invoice.status !== 'DISPUTED')) return state
      const timestamp = new Date().toISOString()
      return {
        invoices: state.invoices.map((inv) =>
          inv.id === invoiceId ? { ...inv, status: 'CLOSED' as const, closeReason: 'REJECTED' as const, statusUpdatedAt: timestamp } : inv
        ),
        disputes: state.disputes.map((d) =>
          d.invoiceId === invoiceId && d.status === 'OPEN'
            ? {
                ...d,
                status: 'CLOSED' as const,
                updatedAt: timestamp,
                messages: [
                  ...(d.messages ?? []),
                  {
                    id: `dmsg-${d.id.toLowerCase()}-${(d.messages?.length ?? 0) + 1}`,
                    sender: 'FINANCE' as const,
                    message: reason?.trim() || 'Invoice rejected by finance.',
                    createdAt: timestamp,
                  },
                ],
              }
            : d
        ),
      }
    }),

  resetStore: () =>
    set(() => ({
      ...buildFullData(),
    })),

  applyVendorDataset: (vendorName) =>
    set((state) => {
      const key = normalizeVendorName(vendorName)
      // Same vendor as last applied — leave the store (and any in-session edits)
      // untouched so navigating around the portal doesn't wipe state.
      if (state.appliedVendorKey === key) return state
      return {
        appliedVendorKey: key,
        ...buildDataForVendor(vendorName),
      }
    }),
}))
