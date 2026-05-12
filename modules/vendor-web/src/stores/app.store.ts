import { create } from 'zustand'
import {
  MOCK_INDENTS,
  MOCK_TRIPS,
  MOCK_AUCTIONS,
  MOCK_VEHICLES,
  MOCK_DRIVERS,
  MOCK_EXPENSES,
  MOCK_CONTRACTS,
  MOCK_INVOICES,
  MOCK_LEDGER,
  MOCK_CAPACITY,
  MOCK_NOTIFICATIONS,
  MOCK_EXCEPTIONS,
  MOCK_DISPUTES,
} from '@vendor/lib/mock-data'
import {
  Indent, Trip, Auction, Vehicle, Driver, Expense, AuctionBid, AuctionLane,
  Contract, Invoice, LedgerEntry, CapacityDeclaration, Notification, InvoiceLineItem, ExpenseType, NBFCApplication, NBFCDiscountingStatus,
  ExceptionRecord, ExceptionStatus, ExceptionTimelineEntry, ExceptionSeverity, ExceptionIssueType,
  Dispute, DisputeStatus, PaymentRecord, PaymentKind
} from '@vendor/types'

interface AppState {
  indents: Indent[]
  trips: Trip[]
  auctions: Auction[]
  vehicles: Vehicle[]
  drivers: Driver[]
  expenses: Expense[]
  contracts: Contract[]
  invoices: Invoice[]
  ledger: LedgerEntry[]
  payments: PaymentRecord[]
  nbfcApplications: NBFCApplication[]
  exceptions: ExceptionRecord[]
  capacity: CapacityDeclaration[]
  notifications: Notification[]

  disputes: Dispute[]
  raiseDispute: (invoiceId: string, invoiceNumber: string, invoiceAmount: number, reason: string) => void
  updateDisputeStatus: (disputeId: string, status: DisputeStatus, notes?: string) => void
  acceptDispute: (disputeId: string) => void
  cancelDispute: (disputeId: string) => void
  resubmitInvoice: (invoiceId: string, lineItems: InvoiceLineItem[]) => void
  recordInvoicePayment: (payload: {
    invoiceId: string
    paymentKind: PaymentKind
    paymentDate: string
    cashAmount: number
    tdsAmount: number
    referenceNumber?: string
    note?: string
  }) => void

  // Actions
  acceptIndent: (indentId: string, vehicleId: string, driverId: string) => void
  declineIndent: (indentId: string) => void
  submitBid: (auctionId: string, laneId: string, amount: number) => void
  addVehicle: (vehicle: Vehicle) => void
  updateVehicle: (vehicle: Vehicle) => void
  addDriver: (driver: Driver) => void
  updateDriver: (driver: Driver) => void
  addExpense: (expense: Expense) => void
  generateInvoice: (payload: {
    tripIds: string[]
    invoiceDate?: string
    dueDate?: string
    gstRate?: number
    invoiceNumber?: string
  }) => void
  submitNbfcApplication: (payload: {
    invoiceId: string
    invoiceNumber: string
    customerName: string
    partnerId: string
    partnerName: string
    advanceAmount: number
    charges: number
    netDisbursement: number
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
  addCapacityDeclaration: (declaration: CapacityDeclaration) => void
  markNotificationRead: (notificationId: string) => void
  markAllNotificationsRead: () => void
  addNotification: (notification: Notification) => void
  resetStore: () => void
}

export const useAppStore = create<AppState>((set) => ({
  indents: [...MOCK_INDENTS],
  trips: [...MOCK_TRIPS],
  auctions: [...MOCK_AUCTIONS],
  vehicles: [...MOCK_VEHICLES],
  drivers: [...MOCK_DRIVERS],
  expenses: [...MOCK_EXPENSES],
  contracts: [...MOCK_CONTRACTS],
  invoices: [...MOCK_INVOICES],
  ledger: [...MOCK_LEDGER],
  payments: MOCK_LEDGER
    .filter((entry) => entry.entryType === 'PAYMENT_RECEIVED' || entry.entryType === 'TDS_DEDUCTION')
    .map((entry, index) => {
      const invoiceMatch = entry.description.match(/INV-\d{4}-\d{3}/)
      const invoiceId = invoiceMatch?.[0] ?? 'INV-UNKNOWN'
      return {
        id: `pay-seed-${index + 1}`,
        invoiceId,
        invoiceNumber: invoiceId,
        customerName: invoiceId,
        paymentKind: entry.entryType === 'TDS_DEDUCTION' ? 'TDS_DEDUCTION' : entry.description.includes('Partial') ? 'PARTIAL_PAYMENT' : 'FINAL_PAYMENT',
        paymentDate: entry.date,
        cashAmount: entry.entryType === 'TDS_DEDUCTION' ? 0 : entry.credit,
        tdsAmount: entry.entryType === 'TDS_DEDUCTION' ? entry.debit : 0,
        referenceNumber: entry.id.toUpperCase(),
        note: entry.description,
        status: 'POSTED',
        createdAt: `${entry.date}T00:00:00Z`,
        ledgerEntryIds: [entry.id],
      } as PaymentRecord
    }),
  exceptions: [...MOCK_EXCEPTIONS],
  nbfcApplications: [
    {
      id: 'nbfc-app-001',
      invoiceId: 'INV-2026-029',
      invoiceNumber: 'INV-2026-029',
      customerName: 'APL Logistics',
      partnerId: 'nbfc-1',
      partnerName: 'FinEdge Capital',
      status: 'SUBMITTED',
      appliedAt: '2026-05-02T10:00:00Z',
      referenceNumber: 'NBFC-884211',
      advanceAmount: 65300,
      charges: 1250,
      netDisbursement: 64050,
    },
    {
      id: 'nbfc-app-002',
      invoiceId: 'INV-2026-028',
      invoiceNumber: 'INV-2026-028',
      customerName: 'Mahindra CIE',
      partnerId: 'nbfc-2',
      partnerName: 'Prime Credit',
      status: 'APPROVED',
      appliedAt: '2026-05-03T09:00:00Z',
      approvedAt: '2026-05-04T14:00:00Z',
      referenceNumber: 'NBFC-884212',
      advanceAmount: 97200,
      charges: 1824,
      netDisbursement: 95376,
    },
    {
      id: 'nbfc-app-003',
      invoiceId: 'INV-2026-027',
      invoiceNumber: 'INV-2026-027',
      customerName: 'DHL Supply Chain',
      partnerId: 'nbfc-3',
      partnerName: 'Axis Finance',
      status: 'DISBURSED',
      appliedAt: '2026-05-01T08:30:00Z',
      approvedAt: '2026-05-02T13:00:00Z',
      disbursedAt: '2026-05-04T11:00:00Z',
      referenceNumber: 'NBFC-884213',
      advanceAmount: 30100,
      charges: 600,
      netDisbursement: 29500,
    },
  ],
  capacity: [...MOCK_CAPACITY],
  notifications: [...MOCK_NOTIFICATIONS],
  disputes: [...MOCK_DISPUTES],

  acceptIndent: (indentId, vehicleId, driverId) =>
    set((state) => {
      const indentIndex = state.indents.findIndex((i) => i.id === indentId)
      if (indentIndex === -1) return state

      const indent = state.indents[indentIndex] as Indent
      const vehicle = state.vehicles.find((v) => v.id === vehicleId)
      const driver = state.drivers.find((d) => d.id === driverId)

      if (!vehicle || !driver) return state

      const updatedIndents = [...state.indents]
      updatedIndents[indentIndex] = { ...indent, status: 'ACCEPTED' }

      const newTrip: Trip = {
        id: `TRP-${Math.floor(1000 + Math.random() * 9000)}`,
        contractId: indent.contractId,
        indentId: indent.id,
        laneDetails: indent.laneDetails,
        assignedVehicle: { id: vehicle.id, registrationNumber: vehicle.registrationNumber, type: vehicle.vehicleType },
        assignedDriver: { id: driver.id, name: driver.name, mobile: driver.mobile },
        status: 'DISPATCHED',
        freightRate: 0, // Should come from contract, simplify for now
        expenseSummary: { total: 0, approved: 0, pending: 0 },
        isInvoiced: false,
        createdAt: new Date().toISOString(),
      }

      return {
        indents: updatedIndents,
        trips: [newTrip, ...state.trips],
      }
    }),

  declineIndent: (indentId) =>
    set((state) => {
      const indentIndex = state.indents.findIndex((i) => i.id === indentId)
      if (indentIndex === -1) return state
      
      const updatedIndents = [...state.indents]
      updatedIndents[indentIndex] = { ...state.indents[indentIndex], status: 'DECLINED' } as Indent
      return { indents: updatedIndents }
    }),

  submitBid: (auctionId, laneId, amount) =>
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
    }),

  addVehicle: (vehicle) =>
    set((state) => ({ vehicles: [vehicle, ...state.vehicles] })),

  updateVehicle: (vehicle) =>
    set((state) => ({
      vehicles: state.vehicles.map((item) => (item.id === vehicle.id ? vehicle : item)),
    })),

  addDriver: (driver) =>
    set((state) => ({ drivers: [driver, ...state.drivers] })),

  updateDriver: (driver) =>
    set((state) => ({
      drivers: state.drivers.map((item) => (item.id === driver.id ? driver : item)),
    })),

  addExpense: (expense) =>
    set((state) => {
      const tripIndex = state.trips.findIndex((t) => t.id === expense.tripId)
      const existingExpense = state.expenses.find((item) => item.tripId === expense.tripId)
      let updatedTrips = state.trips

      if (tripIndex !== -1) {
        const trip = state.trips[tripIndex] as Trip
        const previousPending = existingExpense?.status === 'PENDING' ? existingExpense.amount : 0
        const previousApproved = existingExpense?.status === 'APPROVED' ? existingExpense.amount : 0
        const nextPending = expense.status === 'PENDING' ? expense.amount : 0
        const nextApproved = expense.status === 'APPROVED' ? expense.amount : 0

        updatedTrips = [...state.trips]
        updatedTrips[tripIndex] = {
          ...trip,
          expenseSummary: {
            total: trip.expenseSummary.total - (existingExpense?.amount ?? 0) + expense.amount,
            approved: trip.expenseSummary.approved - previousApproved + nextApproved,
            pending: trip.expenseSummary.pending - previousPending + nextPending,
          },
        }
      }

      const updatedExpenses = existingExpense
        ? [expense, ...state.expenses.filter((item) => item.tripId !== expense.tripId)]
        : [expense, ...state.expenses]

      return {
        expenses: updatedExpenses,
        trips: updatedTrips,
      }
    }),

  generateInvoice: (payload) =>
    set((state) => {
      const { tripIds, invoiceDate = new Date().toISOString(), dueDate, gstRate = 12, invoiceNumber } = payload
      if (tripIds.length === 0) return state

      const selectedTrips = tripIds
        .map((id) => state.trips.find((trip) => trip.id === id))
        .filter((trip): trip is Trip => Boolean(trip))

      if (selectedTrips.length === 0) return state

      const subtotal = selectedTrips.reduce(
        (sum, trip) => sum + (trip.freightRate || 0) + (trip.expenseSummary.approved || 0),
        0
      )
      const gstAmount = Math.round(subtotal * (gstRate / 100))
      const finalDueDate = dueDate ?? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      const generatedInvoiceNumber = invoiceNumber ?? `INV-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`

      const lineItems: InvoiceLineItem[] = selectedTrips.map((trip) => {
        const freightCharge = trip.freightRate || 0
        const expenses: { type: ExpenseType; amount: number }[] = trip.expenseSummary.approved > 0
          ? [{ type: 'OTHER', amount: trip.expenseSummary.approved }]
          : []
        const lineTotal = freightCharge + trip.expenseSummary.approved
        return {
          tripId: trip.id,
          tripReference: trip.id,
          freightCharge,
          expenses,
          lineTotal,
        }
      })

      const newInvoice = {
        id: generatedInvoiceNumber,
        invoiceNumber: generatedInvoiceNumber,
        invoiceDate,
        paymentDueDate: finalDueDate,
        subtotal,
        gstAmount,
        grandTotal: subtotal + gstAmount,
        status: 'SUBMITTED' as any,
        lineItems,
        vendorGstin: '29AABCF1234M1ZP',
        customerGstin: selectedTrips[0]?.contractId ? '27AABCU9603R1ZM' : '27AABCU9603R1ZM',
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
      } as unknown as Invoice

      // Mark trips as invoiced
      const updatedTrips = state.trips.map(t => 
        tripIds.includes(t.id) ? { ...t, isInvoiced: true } : t
      )

      return {
        invoices: [newInvoice, ...state.invoices],
        trips: updatedTrips
      }
    }),

  recordInvoicePayment: ({ invoiceId, paymentKind, paymentDate, cashAmount, tdsAmount, referenceNumber, note }) =>
    set((state) => {
      const invoice = state.invoices.find((item) => item.id === invoiceId)
      if (!invoice) return state

      const invoicePaidFromRecords = state.payments
        .filter((payment) => payment.invoiceId === invoiceId && payment.status === 'POSTED')
        .reduce((sum, payment) => sum + payment.cashAmount + payment.tdsAmount, 0)
      const remainingBefore = Math.max(0, invoice.grandTotal - invoicePaidFromRecords)
      const totalPosted = Math.max(0, cashAmount) + Math.max(0, tdsAmount)
      if (totalPosted <= 0) return state
      if (totalPosted > remainingBefore) return state

      const timestamp = new Date().toISOString()
      const paymentId = `pay-${Math.floor(1000 + Math.random() * 9000)}`
      const ledgerEntryIds: string[] = []
      const nextBalanceAfterCash = remainingBefore - Math.max(0, cashAmount)
      const nextBalanceAfterTds = nextBalanceAfterCash - Math.max(0, tdsAmount)

      const nextLedger: LedgerEntry[] = []

      if (cashAmount > 0) {
        const cashEntry: LedgerEntry = {
          id: `led-${Math.floor(1000 + Math.random() * 9000)}`,
          date: paymentDate,
          entryType: 'PAYMENT_RECEIVED',
          description: `${paymentKind === 'PARTIAL_PAYMENT' ? 'Partial payment' : 'Final payment'} for ${invoice.invoiceNumber}`,
          credit: cashAmount,
          debit: 0,
          runningBalance: nextBalanceAfterCash,
          documentUrl: referenceNumber ? `/payments/${referenceNumber}.pdf` : undefined,
        }
        ledgerEntryIds.push(cashEntry.id)
        nextLedger.push(cashEntry)
      }

      if (tdsAmount > 0) {
        const tdsEntry: LedgerEntry = {
          id: `led-${Math.floor(1000 + Math.random() * 9000)}`,
          date: paymentDate,
          entryType: 'TDS_DEDUCTION',
          description: `TDS deduction against ${invoice.invoiceNumber}`,
          credit: 0,
          debit: tdsAmount,
          runningBalance: nextBalanceAfterTds,
          documentUrl: referenceNumber ? `/tds/${referenceNumber}.pdf` : undefined,
        }
        ledgerEntryIds.push(tdsEntry.id)
        nextLedger.push(tdsEntry)
      }

      const totalAfterPayment = state.payments
        .filter((payment) => payment.invoiceId === invoiceId && payment.status === 'POSTED')
        .reduce((sum, payment) => sum + payment.cashAmount + payment.tdsAmount, 0) + totalPosted
      const invoiceSettled = totalAfterPayment >= invoice.grandTotal

      const paymentRecord: PaymentRecord = {
        id: paymentId,
        invoiceId,
        invoiceNumber: invoice.invoiceNumber,
        customerName: (invoice as any).clientName ?? invoice.invoiceNumber,
        paymentKind,
        paymentDate,
        cashAmount: Math.max(0, cashAmount),
        tdsAmount: Math.max(0, tdsAmount),
        referenceNumber,
        note,
        status: 'POSTED',
        createdAt: timestamp,
        ledgerEntryIds,
      }

      return {
        payments: [paymentRecord, ...state.payments],
        ledger: [...nextLedger, ...state.ledger],
        invoices: state.invoices.map((item) =>
          item.id === invoiceId
            ? {
                ...item,
                status: invoiceSettled ? 'PAID' : item.status,
                paymentDate: invoiceSettled ? paymentDate : item.paymentDate,
              }
            : item
        ),
      }
    }),

  submitNbfcApplication: ({ invoiceId, invoiceNumber, customerName, partnerId, partnerName, advanceAmount, charges, netDisbursement }) =>
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
        advanceAmount,
        charges,
        netDisbursement,
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

  markNbfcApplicationStatus: (invoiceId, status) =>
    set((state) => {
      const updatedApplications = state.nbfcApplications.map((application) =>
        application.invoiceId === invoiceId
          ? {
              ...application,
              status,
              approvedAt: status === 'APPROVED' && !application.approvedAt ? new Date().toISOString() : application.approvedAt,
              disbursedAt: status === 'DISBURSED' ? new Date().toISOString() : application.disbursedAt,
            }
          : application
      )

      return {
        nbfcApplications: updatedApplications,
        invoices: state.invoices.map((invoice) =>
          invoice.id === invoiceId
            ? {
                ...invoice,
                nbfcDiscountingStatus: status === 'SUBMITTED' ? 'SUBMITTED' : status === 'APPROVED' ? 'APPROVED' : 'DISBURSED',
              }
            : invoice
        ),
      }
    }),

  createException: ({ bookingId, route, vehicle, driver, issueType, severity, description, evidence = [] }) =>
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
    }),

  updateExceptionStatus: (exceptionId, status, notes) =>
    set((state) => ({
      exceptions: state.exceptions.map((exception) => {
        if (exception.id !== exceptionId) return exception

        const timestamp = new Date().toISOString()
        const action =
          status === 'ACKNOWLEDGED'
            ? 'Acknowledged'
            : status === 'IN_PROGRESS'
              ? 'In Progress'
              : status === 'RESOLVED'
                ? 'Resolved'
                : 'Closed'

        const defaultNotes =
          status === 'ACKNOWLEDGED'
            ? 'Operations confirmed receipt and started triage.'
            : status === 'IN_PROGRESS'
              ? 'Working on recovery and customer communication.'
              : status === 'RESOLVED'
                ? 'Issue has been resolved.'
                : 'Exception closed after resolution.'

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
    })),

  addCapacityDeclaration: (declaration) =>
    set((state) => ({ capacity: [declaration, ...state.capacity] })),

  markNotificationRead: (notificationId) =>
    set((state) => ({
      notifications: state.notifications.map((notification) =>
        notification.id === notificationId ? { ...notification, isRead: true } : notification
      ),
    })),

  markAllNotificationsRead: () =>
    set((state) => ({
      notifications: state.notifications.map((notification) => ({ ...notification, isRead: true })),
    })),

  addNotification: (notification) =>
    set((state) => ({ notifications: [notification, ...state.notifications] })),

  raiseDispute: (invoiceId, invoiceNumber, invoiceAmount, reason) =>
    set((state) => {
      if (state.disputes.find((d) => d.invoiceId === invoiceId)) return state
      const num = state.disputes.length + 1
      const newDispute: Dispute = {
        id: `DSP-${new Date().getFullYear()}-${String(num).padStart(3, '0')}`,
        invoiceId,
        invoiceNumber,
        invoiceAmount,
        reason,
        status: 'OPEN',
        raisedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      return { disputes: [newDispute, ...state.disputes] }
    }),

  updateDisputeStatus: (disputeId, status, notes) =>
    set((state) => ({
      disputes: state.disputes.map((d) =>
        d.id === disputeId ? { ...d, status, notes: notes ?? d.notes, updatedAt: new Date().toISOString() } : d
      ),
    })),

  acceptDispute: (disputeId) =>
    set((state) => {
      const dispute = state.disputes.find((d) => d.id === disputeId)
      if (!dispute) return state
      return {
        disputes: state.disputes.map((d) =>
          d.id === disputeId ? { ...d, status: 'ACCEPTED', updatedAt: new Date().toISOString() } : d
        ),
        invoices: state.invoices.map((inv) =>
          inv.id === dispute.invoiceId ? { ...inv, status: 'APPROVED' } : inv
        ),
      }
    }),

  cancelDispute: (disputeId) =>
    set((state) => {
      const dispute = state.disputes.find((d) => d.id === disputeId)
      if (!dispute) return state
      return {
        disputes: state.disputes.map((d) =>
          d.id === disputeId ? { ...d, status: 'CANCELLED', updatedAt: new Date().toISOString() } : d
        ),
        invoices: state.invoices.map((inv) =>
          inv.id === dispute.invoiceId ? { ...inv, status: 'CANCELLED' } : inv
        ),
      }
    }),

  resubmitInvoice: (invoiceId, updatedLineItems) =>
    set((state) => {
      const invoice = state.invoices.find((inv) => inv.id === invoiceId)
      if (!invoice) return state
      const subtotal = updatedLineItems.reduce((sum, item) => sum + item.lineTotal, 0)
      const gstRate = invoice.subtotal > 0 ? invoice.gstAmount / invoice.subtotal : 0.12
      const gstAmount = Math.round(subtotal * gstRate)
      return {
        invoices: state.invoices.map((inv) =>
          inv.id === invoiceId
            ? { ...inv, status: 'SUBMITTED', lineItems: updatedLineItems, subtotal, gstAmount, grandTotal: subtotal + gstAmount }
            : inv
        ),
        disputes: state.disputes.map((d) =>
          d.invoiceId === invoiceId ? { ...d, status: 'CLOSED', updatedAt: new Date().toISOString() } : d
        ),
      }
    }),

  resetStore: () =>
    set(() => ({
      indents: [...MOCK_INDENTS],
      trips: [...MOCK_TRIPS],
      auctions: [...MOCK_AUCTIONS],
      vehicles: [...MOCK_VEHICLES],
      drivers: [...MOCK_DRIVERS],
      expenses: [...MOCK_EXPENSES],
      contracts: [...MOCK_CONTRACTS],
      invoices: [...MOCK_INVOICES],
      ledger: [...MOCK_LEDGER],
      payments: MOCK_LEDGER
        .filter((entry) => entry.entryType === 'PAYMENT_RECEIVED' || entry.entryType === 'TDS_DEDUCTION')
        .map((entry, index) => {
          const invoiceMatch = entry.description.match(/INV-\d{4}-\d{3}/)
          const invoiceId = invoiceMatch?.[0] ?? 'INV-UNKNOWN'
          return {
            id: `pay-seed-${index + 1}`,
            invoiceId,
            invoiceNumber: invoiceId,
            customerName: invoiceId,
            paymentKind: entry.entryType === 'TDS_DEDUCTION' ? 'TDS_DEDUCTION' : entry.description.includes('Partial') ? 'PARTIAL_PAYMENT' : 'FINAL_PAYMENT',
            paymentDate: entry.date,
            cashAmount: entry.entryType === 'TDS_DEDUCTION' ? 0 : entry.credit,
            tdsAmount: entry.entryType === 'TDS_DEDUCTION' ? entry.debit : 0,
            referenceNumber: entry.id.toUpperCase(),
            note: entry.description,
            status: 'POSTED',
            createdAt: `${entry.date}T00:00:00Z`,
            ledgerEntryIds: [entry.id],
          } as PaymentRecord
        }),
      exceptions: [...MOCK_EXCEPTIONS],
      nbfcApplications: [
        {
          id: 'nbfc-app-001',
          invoiceId: 'INV-2026-029',
          invoiceNumber: 'INV-2026-029',
          customerName: 'APL Logistics',
          partnerId: 'nbfc-1',
          partnerName: 'FinEdge Capital',
          status: 'SUBMITTED',
          appliedAt: '2026-05-02T10:00:00Z',
          referenceNumber: 'NBFC-884211',
          advanceAmount: 65300,
          charges: 1250,
          netDisbursement: 64050,
        },
        {
          id: 'nbfc-app-002',
          invoiceId: 'INV-2026-028',
          invoiceNumber: 'INV-2026-028',
          customerName: 'Mahindra CIE',
          partnerId: 'nbfc-2',
          partnerName: 'Prime Credit',
          status: 'APPROVED',
          appliedAt: '2026-05-03T09:00:00Z',
          approvedAt: '2026-05-04T14:00:00Z',
          referenceNumber: 'NBFC-884212',
          advanceAmount: 97200,
          charges: 1824,
          netDisbursement: 95376,
        },
        {
          id: 'nbfc-app-003',
          invoiceId: 'INV-2026-027',
          invoiceNumber: 'INV-2026-027',
          customerName: 'DHL Supply Chain',
          partnerId: 'nbfc-3',
          partnerName: 'Axis Finance',
          status: 'DISBURSED',
          appliedAt: '2026-05-01T08:30:00Z',
          approvedAt: '2026-05-02T13:00:00Z',
          disbursedAt: '2026-05-04T11:00:00Z',
          referenceNumber: 'NBFC-884213',
          advanceAmount: 30100,
          charges: 600,
          netDisbursement: 29500,
        },
      ],
      capacity: [...MOCK_CAPACITY],
      notifications: [...MOCK_NOTIFICATIONS],
      disputes: [...MOCK_DISPUTES],
    }))
}))
