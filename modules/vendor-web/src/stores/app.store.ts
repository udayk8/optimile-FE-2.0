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
} from '@vendor/lib/mock-data'
import { 
  Indent, Trip, Auction, Vehicle, Driver, Expense, AuctionBid, AuctionLane,
  Contract, Invoice, LedgerEntry, CapacityDeclaration, Notification
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
  capacity: CapacityDeclaration[]
  notifications: Notification[]

  // Actions
  acceptIndent: (indentId: string, vehicleId: string, driverId: string) => void
  declineIndent: (indentId: string) => void
  submitBid: (auctionId: string, laneId: string, amount: number) => void
  addVehicle: (vehicle: Vehicle) => void
  updateVehicle: (vehicle: Vehicle) => void
  addDriver: (driver: Driver) => void
  updateDriver: (driver: Driver) => void
  addExpense: (expense: Expense) => void
  generateInvoice: (tripIds: string[]) => void
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
  capacity: [...MOCK_CAPACITY],
  notifications: [...MOCK_NOTIFICATIONS],

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

  generateInvoice: (tripIds) =>
    set((state) => {
      if (tripIds.length === 0) return state

      const newInvoice = {
        id: `INV-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
        invoiceNumber: `INV-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
        invoiceDate: new Date().toISOString(),
        grandTotal: tripIds.reduce((sum, id) => {
          const trip = state.trips.find(t => t.id === id)
          return sum + (trip?.freightRate || 0) + (trip?.expenseSummary.approved || 0)
        }, 0),
        status: 'SUBMITTED' as any,
        lineItems: tripIds.map(id => ({ tripId: id, description: 'Freight & Expenses', amount: 0 })),
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
      capacity: [...MOCK_CAPACITY],
      notifications: [...MOCK_NOTIFICATIONS],
    }))
}))
