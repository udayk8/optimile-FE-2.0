import { useEffect, useState } from 'react'
import { useAppStore } from '@vendor/stores/app.store'
import { useTenantBridge } from '@vendor/integration/tenant-data-bridge'
import { formatDateTime, formatDate } from '@vendor/lib/date-utils'
import type { Notification, NotificationCategory } from '@vendor/types'

/**
 * Cross-module ledger sync: when finance (tenant side) approves a vendor
 * invoice in the shared store, mirror it into the local store and open its
 * receivable in the ledger automatically. Recorded payments then post
 * against that opening entry, so both flows land in the Ledger page.
 */
export function useVendorLedgerSync(): void {
  const bridge = useTenantBridge()
  const ensureInvoiceLedgerOpened = useAppStore((s) => s.ensureInvoiceLedgerOpened)
  const bridgeInvoices = bridge?.vendorInvoices

  useEffect(() => {
    if (!bridgeInvoices) return
    bridgeInvoices
      .filter((invoice) => invoice.status === 'APPROVED')
      .forEach((invoice) => ensureInvoiceLedgerOpened(invoice))
  }, [bridgeInvoices, ensureInvoiceLedgerOpened])
}

/**
 * Derives the P0 vendor notifications (time-boxed actions tied to cash or
 * capacity) from the portal's own store collections and pushes them into the
 * notification feed. Stable per-event ids keep pushes idempotent — an event
 * already in the feed is never duplicated.
 *
 * Auction/sourcing events are handled separately by useAuctionNotificationsSync
 * (they come from the cross-module auction store, not these collections).
 */
const EXPIRING_WINDOW_MS = 60 * 60 * 1000 // indent SLA warning fires inside the last hour

export function useVendorNotificationsSync(vendorStatus?: string): void {
  const indents = useAppStore((s) => s.indents)
  const trips = useAppStore((s) => s.trips)
  const invoices = useAppStore((s) => s.invoices)
  const payments = useAppStore((s) => s.payments)
  const vehicles = useAppStore((s) => s.vehicles)
  const drivers = useAppStore((s) => s.drivers)
  const addNotification = useAppStore((s) => s.addNotification)

  // Time-based events (indent SLA countdown) need a periodic re-evaluation.
  const [tick, setTick] = useState(0)
  useEffect(() => {
    const timer = window.setInterval(() => setTick((t) => t + 1), 60_000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    const now = Date.now()
    const existing = new Set(useAppStore.getState().notifications.map((n) => n.id))
    const push = (id: string, type: NotificationCategory, title: string, message: string, deepLink: string) => {
      if (existing.has(id)) return
      existing.add(id)
      const notification: Notification = {
        id,
        type,
        title,
        message,
        deepLink,
        isRead: false,
        createdAt: new Date().toISOString(),
      }
      addNotification(notification)
    }
    const lane = (l: { origin: { city: string }; destination: { city: string } }) =>
      `${l.origin.city} → ${l.destination.city}`

    // 1. New indent assigned — direct revenue, time-boxed acceptance.
    indents
      .filter((indent) => indent.status === 'PENDING')
      .forEach((indent) => {
        push(
          `ntf-indent-new-${indent.id}`,
          'TRIPS',
          `New indent ${indent.id}`,
          `${lane(indent.laneDetails)}, ${indent.vehicleTypeRequired}, report by ${formatDateTime(indent.reportingDateTime)}. Accept before ${formatDateTime(indent.slaDeadline)}.`,
          `/vendor/bookings/indents/${indent.id}`,
        )

        // 2. Indent expiring — last call before reassignment.
        const slaAt = new Date(indent.slaDeadline).getTime()
        if (!Number.isNaN(slaAt) && slaAt > now && slaAt - now <= EXPIRING_WINDOW_MS) {
          const minutesLeft = Math.max(1, Math.round((slaAt - now) / 60_000))
          push(
            `ntf-indent-expiring-${indent.id}`,
            'TRIPS',
            'Indent expiring',
            `Indent ${indent.id} expires in ${minutesLeft} min. Accept now or it reassigns to the next vendor.`,
            `/vendor/bookings/indents/${indent.id}`,
          )
        }
      })

    // 3. POD due — payment is held until the POD is uploaded.
    trips
      .filter((trip) => trip.status === 'POD_PENDING' && trip.podStatus !== 'CONFIRMED')
      .forEach((trip) => {
        push(
          `ntf-trip-pod-${trip.id}`,
          'TRIPS',
          `POD due for ${trip.id}`,
          `${lane(trip.laneDetails)} delivered${trip.deliveredDate ? ` on ${formatDate(trip.deliveredDate)}` : ''}. Upload the POD to release invoicing.`,
          `/vendor/bookings/pending-pod/${trip.id}`,
        )
      })

    // 4. Invoice rejected / resubmission required — cash blocked until fixed.
    invoices.forEach((invoice) => {
      if (invoice.status === 'RESUBMISSION_REQUIRED') {
        push(
          `ntf-inv-resubmit-${invoice.id}`,
          'INVOICES',
          `Invoice ${invoice.invoiceNumber} needs resubmission`,
          `₹${invoice.grandTotal.toLocaleString('en-IN')} is on hold${invoice.notes ? `: ${invoice.notes}` : ''}. Fix and resubmit to restart the payment clock.`,
          `/vendor/invoices/${invoice.id}`,
        )
      }
      if (invoice.status === 'CLOSED' && invoice.closeReason === 'REJECTED') {
        push(
          `ntf-inv-rejected-${invoice.id}`,
          'INVOICES',
          `Invoice ${invoice.invoiceNumber} rejected`,
          `₹${invoice.grandTotal.toLocaleString('en-IN')} was rejected and closed${invoice.notes ? `: ${invoice.notes}` : ''}. Raise a fresh invoice for the trips.`,
          `/vendor/invoices/${invoice.id}`,
        )
      }
    })

    // 5. Payment disbursed — cash reconciliation.
    payments.forEach((payment) => {
      push(
        `ntf-pay-${payment.id}`,
        'INVOICES',
        'Payment received',
        `₹${payment.cashAmount.toLocaleString('en-IN')} received against ${payment.invoiceNumber} on ${formatDate(payment.paymentDate)}${payment.referenceNumber ? ` (ref ${payment.referenceNumber})` : ''}.`,
        `/vendor/invoices/${payment.invoiceId}`,
      )
    })

    // 6. Compliance documents expiring/expired — vehicle or driver becomes
    // unassignable, silently stopping future indents.
    vehicles.forEach((vehicle) => {
      vehicle.complianceDocuments
        .filter((doc) => doc.status === 'EXPIRING_SOON' || doc.status === 'EXPIRED')
        .forEach((doc) => {
          push(
            `ntf-doc-veh-${vehicle.id}-${doc.id}`,
            'ONBOARDING',
            doc.status === 'EXPIRED' ? `${doc.type} expired` : `${doc.type} expiring`,
            `${doc.type} for ${vehicle.registrationNumber} ${doc.status === 'EXPIRED' ? 'expired' : 'expires'} ${formatDate(doc.expiryDate)}. Renew it to keep the vehicle assignable.`,
            `/vendor/fleet/vehicles/${vehicle.id}`,
          )
        })
    })
    drivers.forEach((driver) => {
      driver.complianceDocuments
        .filter((doc) => doc.status === 'EXPIRING_SOON' || doc.status === 'EXPIRED')
        .forEach((doc) => {
          push(
            `ntf-doc-drv-${driver.id}-${doc.id}`,
            'ONBOARDING',
            doc.status === 'EXPIRED' ? `${doc.type} expired` : `${doc.type} expiring`,
            `${doc.type} for ${driver.name} ${doc.status === 'EXPIRED' ? 'expired' : 'expires'} ${formatDate(doc.expiryDate)}. Renew it to keep the driver assignable.`,
            `/vendor/fleet/drivers/${driver.id}`,
          )
        })
    })

    // 7. Account status — everything stops; vendor must know immediately.
    if (vendorStatus === 'SUSPENDED' || vendorStatus === 'BLACKLISTED' || vendorStatus === 'REJECTED') {
      const messages: Record<string, string> = {
        SUSPENDED: 'Your account is suspended. You cannot accept indents or participate in sourcing until it is restored.',
        BLACKLISTED: 'Your account is blacklisted. Access is restricted to viewing existing records only.',
        REJECTED: 'Your vendor profile was rejected. Update the profile and resubmit for review.',
      }
      push(
        `ntf-account-${vendorStatus.toLowerCase()}`,
        'ONBOARDING',
        `Account ${vendorStatus.toLowerCase()}`,
        messages[vendorStatus],
        '/vendor/profile',
      )
    }
  }, [indents, trips, invoices, payments, vehicles, drivers, vendorStatus, tick, addNotification])
}
