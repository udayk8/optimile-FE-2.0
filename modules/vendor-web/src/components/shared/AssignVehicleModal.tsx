import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@vendor/components/ui/dialog'
import { Button } from '@vendor/components/ui/button'
import { useAppStore } from '@vendor/stores/app.store'

interface AssignVehicleModalProps {
  isOpen: boolean
  onClose: () => void
  indentId: string
}

export function AssignVehicleModal({ isOpen, onClose, indentId }: AssignVehicleModalProps) {
  const { vehicles, drivers, acceptIndent } = useAppStore()
  const [selectedVehicle, setSelectedVehicle] = useState<string>('')
  const [selectedDriver, setSelectedDriver] = useState<string>('')

  // Filter for ACTIVE resources
  const availableVehicles = vehicles.filter(v => v.operationalStatus === 'ACTIVE')
  const availableDrivers = drivers.filter(d => d.currentStatus === 'ACTIVE')

  const handleAssign = () => {
    if (!selectedVehicle || !selectedDriver) return
    acceptIndent(indentId, selectedVehicle, selectedDriver)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Assign Vehicle & Driver</DialogTitle>
          <DialogDescription>
            Select a vehicle and driver from your active fleet to accept this indent.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
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
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleAssign} disabled={!selectedVehicle || !selectedDriver}>
            Accept & Assign
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
