import { useMemo, type PropsWithChildren } from 'react'
import { useMockStore } from '@tms-booking/shared/store/mock-store'
import {
  CustomerDataBridgeProvider,
  type CustomerDataBridge,
  type CustomerCreateBookingInput,
} from '@customer/integration/customer-data-bridge'
import { mapBookingToCustomerView } from './booking-view-mapper'
import { CreateBookingPage } from '@/modules/tms/booking/CreateBooking'

interface Props {
  tenantId: string
  tenantName?: string | null
  customerId: string
  customerName: string
}

/**
 * Wires the CustomerDataBridge to the TMS mock store, pre-filtered to the
 * logged-in customer. Mount this around any route that should render the
 * customer portal embedded inside the TMS workspace.
 */
export function CustomerBridgeProvider({
  tenantId,
  tenantName = null,
  customerId,
  customerName,
  children,
}: PropsWithChildren<Props>) {
  const store = useMockStore()

  const bridge = useMemo<CustomerDataBridge>(() => {
    // ── resolve helpers ───────────────────────────────────────────────────────

    const allAddresses = store.listTenantCustomerAddresses(customerId)
    const allMaterials = store.listTenantMaterials(tenantId)
    const allVehicleTypes = store.listTenantVehicleTypes(tenantId)

    const addressMap = new Map(allAddresses.map((a) => [a.id, a]))
    const materialMap = new Map(allMaterials.map((m) => [m.id, m]))

    function getAddressLabel(addressId: string): string {
      const a = addressMap.get(addressId)
      if (!a) return addressId
      return a.addressLabel ?? a.addressName ?? [a.city, a.addressLine1].filter(Boolean).join(', ')
    }

    function getMaterialLabel(materialId: string): string {
      return materialMap.get(materialId)?.description ?? materialId
    }

    function getVehicleReg(vehicleId: string | null | undefined): string {
      if (!vehicleId) return '-'
      return store.getTenantVehicleById(vehicleId)?.registrationNumber ?? vehicleId
    }

    function getDriverName(driverId: string | null | undefined): string {
      if (!driverId) return '-'
      return store.getTenantDriverById(driverId)?.name ?? driverId
    }

    function getDriverPhone(driverId: string | null | undefined): string {
      if (!driverId) return '-'
      return store.getTenantDriverById(driverId)?.phone ?? '-'
    }

    const resolvers = { getAddressLabel, getMaterialLabel, getVehicleReg, getDriverName, getDriverPhone }

    // ── booking list filtered to this customer ────────────────────────────────

    const rawBookings = store
      .listTenantBookings(tenantId)
      .filter((b) => b.customerId === customerId)

    const bookings = rawBookings.map((b) => mapBookingToCustomerView(b, resolvers))

    // ── master data for create-booking form ───────────────────────────────────

    const addresses = allAddresses.map((a) => ({
      id: a.id,
      label: a.addressLabel ?? a.addressName ?? getAddressLabel(a.id),
      city: a.city,
      usage: (a.addressUsage ?? 'BOTH') as 'ORIGIN' | 'DESTINATION' | 'BOTH',
    }))

    const materials = allMaterials.map((m) => ({
      id: m.id,
      label: m.description,
      uom: m.uom,
    }))

    const vehicleTypes = allVehicleTypes.map((vt) => ({
      id: vt.id,
      label: vt.typeCode,
    }))

    // ── actions ───────────────────────────────────────────────────────────────

    function createBooking(input: CustomerCreateBookingInput): string {
      const now = new Date().toISOString()
      const record = store.createTenantBooking({
        tenantId,
        customerId,
        sourceAddressId: input.originAddressId,
        destinationAddressId: input.destinationAddressId,
        consignorAddressId: input.originAddressId,
        consigneeAddressId: input.destinationAddressId,
        materialIds: [input.materialId],
        quantity: input.quantity,
        weight: input.weight,
        uom: input.uom,
        vehicleTypeId: input.vehicleTypeId ?? null,
        pickupDate: input.pickupDate ?? null,
        status: 'PENDING_ASSIGNMENT',
        lrType: 'AUTO',
        laneFound: false,
        serviceType: 'FTL',
        commercialType: 'SPOT',
        pricing: {
          rateType: 'PER_TRIP',
          enteredRate: 0,
          calculatedFreight: 0,
          deviationPercent: 0,
          isAutoApproved: true,
        },
        remarks: [],
        statusTimeline: [{ id: `ste-${now}`, status: 'PENDING_ASSIGNMENT', timestamp: now, actor: customerName, note: 'Booking created via Customer Portal.' }],
        createdBy: customerName,
      })
      return record.id
    }

    return {
      tenantId,
      tenantName,
      customerId,
      customerName,
      bookings,
      getBookingById: (id) => bookings.find((b) => b.id === id) ?? null,
      addresses,
      materials,
      vehicleTypes,
      createBooking,
      requestDestinationChange: (bookingId, reason) => {
        const record = store.getTenantBookingById(bookingId)
        if (!record) return
        const now = new Date().toISOString()
        const firstDelivery = record.deliveries?.[0]
        if (!firstDelivery) return
        store.updateTenantBooking(bookingId, {
          destinationChangeRequests: [
            ...(record.destinationChangeRequests ?? []),
            {
              id: `dcr-${Date.now()}`,
              bookingId,
              deliveryId: firstDelivery.id,
              remarkType: 'DESTINATION_CHANGED',
              reason,
              raisedBy: customerName,
              raisedAt: now,
              priority: 'LOW',
              status: 'SUBMITTED',
            },
          ],
        })
      },
      renderCreateBooking: (onCreated) => (
        <CreateBookingPage
          lockedCustomerId={customerId}
          createdByLabel={customerName}
          onAfterSubmit={onCreated}
        />
      ),
    }
  }, [store, tenantId, tenantName, customerId, customerName])

  return <CustomerDataBridgeProvider value={bridge}>{children}</CustomerDataBridgeProvider>
}
