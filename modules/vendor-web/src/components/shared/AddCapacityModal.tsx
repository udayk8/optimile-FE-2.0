import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@vendor/components/ui/dialog'
import { Button } from '@vendor/components/ui/button'
import { Input } from '@vendor/components/ui/input'
import { useAppStore } from '@vendor/stores/app.store'
import { CapacityDeclaration } from '@vendor/types'

interface AddCapacityModalProps {
  isOpen: boolean
  onClose: () => void
}

export function AddCapacityModal({ isOpen, onClose }: AddCapacityModalProps) {
  const { addCapacityDeclaration } = useAppStore()
  const [vehicleType, setVehicleType] = useState('20ft Container')
  const [availableQuantity, setAvailableQuantity] = useState('1')
  const [hub, setHub] = useState('Mumbai')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!availableQuantity || isNaN(Number(availableQuantity))) return

    const newDeclaration: CapacityDeclaration = {
      id: `CAP-${Math.floor(1000 + Math.random() * 9000)}`,
      vehicleType,
      availableQuantity: Number(availableQuantity),
      baseOperatingHubs: [hub],
      blackoutDates: []
    }

    addCapacityDeclaration(newDeclaration)
    
    // Reset
    setVehicleType('20ft Container')
    setAvailableQuantity('1')
    setHub('Mumbai')
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Capacity Declaration</DialogTitle>
          <DialogDescription>
            Declare available vehicle capacity for future indents.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Vehicle Type</label>
            <select 
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              value={vehicleType}
              onChange={(e) => setVehicleType(e.target.value)}
            >
              <option value="20ft Container">20ft Container</option>
              <option value="40ft Container">40ft Container</option>
              <option value="Flatbed">Flatbed</option>
              <option value="Tanker">Tanker</option>
              <option value="LCV">LCV</option>
            </select>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Available Quantity</label>
            <Input 
              type="number"
              min="1"
              value={availableQuantity} 
              onChange={(e) => setAvailableQuantity(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Operating Hub</label>
            <Input 
              placeholder="e.g. Mumbai" 
              value={hub} 
              onChange={(e) => setHub(e.target.value)}
              required
            />
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={!availableQuantity || !hub}>Declare Capacity</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
