import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@vendor/components/ui/dialog'
import { Button } from '@vendor/components/ui/button'
import { useFleetData } from '@vendor/integration/useFleetData'
import { useTenantBridge } from '@vendor/integration/tenant-data-bridge'
import { useVendorBookings } from '@vendor/integration/useVendorBookings'
import { useAppStore } from '@vendor/stores/app.store'

interface AssignVehicleModalProps {
  isOpen: boolean
  onClose: () => void
  tripId: string
}

export function AssignVehicleModal({ isOpen, onClose, tripId }: AssignVehicleModalProps) {
  const { vehicles, drivers } = useFleetData()
  const bridge = useTenantBridge()
  // Bookings (bridge + mock merged) so we can read the booking's expected vehicle type.
  const { indents, trips } = useVendorBookings()
  // Mock/demo trips live in the local store; real bookings come from the bridge.
  const mockTrips = useAppStore((state) => state.trips)
  const assignResolved = useAppStore((state) => state.assignVehicleToTripResolved)
  const lrAuthorityName = bridge?.tenantName || 'the tenant'
  const [selectedVehicle, setSelectedVehicle] = useState<string>('')
  const [selectedDriver, setSelectedDriver] = useState<string>('')

  // Expected vehicle type for this booking: pre-assignment trips carry the
  // booking's vehicle type on assignedVehicle.type; fall back to the indent.
  const trip = trips.find((t) => t.id === tripId)
  const indent = indents.find((i) => i.id === tripId || i.id === trip?.indentId)
  const rawExpectedType =
    trip?.assignedVehicle.type && trip.assignedVehicle.type !== '—'
      ? trip.assignedVehicle.type
      : indent?.vehicleTypeRequired
  const expectedVehicleType = rawExpectedType && rawExpectedType !== '—' ? rawExpectedType : null

  // Show ALL active vehicles & drivers — vehicle-type matching is intentionally
  // ignored, the vendor can assign any of its vehicles/drivers to any booking.
  const availableVehicles = vehicles.filter(v => v.operationalStatus === 'ACTIVE')
  const availableDrivers = drivers.filter(d => d.currentStatus === 'ACTIVE')

  const handleAssign = () => {
    if (!selectedVehicle || !selectedDriver) return
    const vehicle = vehicles.find((v) => v.id === selectedVehicle)
    const driver = drivers.find((d) => d.id === selectedDriver)
    if (!vehicle || !driver) return
    const isMockTrip = mockTrips.some((t) => t.id === tripId)
    if (isMockTrip) {
      // Object-based assign so a real (bridge) vehicle/driver — whose id isn't in
      // the local store — can still be attached to a demo trip.
      assignResolved(tripId, vehicle, driver)
    } else {
      // Real booking → persist through the bridge. Object-based so a local demo
      // vehicle/driver gets auto-onboarded to the tenant before assignment.
      bridge?.assignVehicleResolved(tripId, vehicle, driver)
    }
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Assign Vehicle & Driver</DialogTitle>
          <DialogDescription>
            Select a vehicle and driver from your active fleet for this booking.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          {expectedVehicleType && (
            <div className="flex items-center justify-between rounded-md border border-gray-200 bg-gray-50 px-3 py-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Expected vehicle type</span>
              <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary">{expectedVehicleType}</span>
            </div>
          )}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Select Vehicle</label>
            <select 
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              value={selectedVehicle}
              onChange={(e) => setSelectedVehicle(e.target.value)}
            >
              <option value="">-- Choose a Vehicle --</option>
              {availableVehicles.map(v => (
                <option key={v.id} value={v.id}>
                  {v.registrationNumber} ({v.vehicleType})
                </option>
              ))}
            </select>
            {availableVehicles.length === 0 && (
              <p className="text-xs text-amber-600">
                No active vehicles in your fleet. Onboard a vehicle to assign this booking.
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Select Driver</label>
            <select 
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              value={selectedDriver}
              onChange={(e) => setSelectedDriver(e.target.value)}
            >
              <option value="">-- Choose a Driver --</option>
              {availableDrivers.map(d => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.mobile})
                </option>
              ))}
            </select>
          </div>

          <div className="rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-800">
            LR will be generated automatically by {lrAuthorityName} after vehicle assignment.
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleAssign} disabled={!selectedVehicle || !selectedDriver}>
            Assign
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
