import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Users } from 'lucide-react'
import { useAppStore } from '@vendor/stores/app.store'
import type { DisruptionReason, Trip } from '@vendor/types'

const REASON_OPTIONS: { value: DisruptionReason; label: string }[] = [
  { value: 'VEHICLE_BREAKDOWN', label: 'Vehicle breakdown' },
  { value: 'DRIVER_BREAKDOWN', label: 'Driver breakdown' },
  { value: 'VEHICLE_OR_DRIVER_BREAKDOWN', label: 'Vehicle and driver breakdown' },
]

interface ChangeAssignmentModalProps {
  isOpen: boolean
  onClose: () => void
  tripId: string | null
}

export function ChangeAssignmentModal({ isOpen, onClose, tripId }: ChangeAssignmentModalProps) {
  const { trips, vehicles, drivers, changeTripAssignment } = useAppStore()
  const trip: Trip | undefined = useMemo(() => trips.find((t) => t.id === tripId), [trips, tripId])

  const [vehicleId, setVehicleId] = useState<string>('')
  const [driverId, setDriverId] = useState<string>('')
  const [reason, setReason] = useState<DisruptionReason | ''>('')
  const [notes, setNotes] = useState<string>('')
  const [resolve, setResolve] = useState(false)

  useEffect(() => {
    if (!isOpen || !trip) return
    setVehicleId('')
    setDriverId('')
    setReason(trip.disruption?.reason ?? '')
    setNotes(trip.disruption?.notes ?? '')
    setResolve(false)
  }, [isOpen, trip])

  if (!isOpen || !trip) return null

  const reasonRequiresVehicle = reason === 'VEHICLE_BREAKDOWN' || reason === 'VEHICLE_OR_DRIVER_BREAKDOWN'
  const reasonRequiresDriver = reason === 'DRIVER_BREAKDOWN' || reason === 'VEHICLE_OR_DRIVER_BREAKDOWN'

  // Replacement must keep the booking's vehicle type (the type the booking was created with).
  const expectedVehicleType = trip.assignedVehicle.type && trip.assignedVehicle.type !== '—' ? trip.assignedVehicle.type : null
  const availableVehicles = vehicles.filter(
    (v) => v.id !== trip.assignedVehicle.id && (!expectedVehicleType || v.vehicleType === expectedVehicleType),
  )
  const availableDrivers = drivers.filter((d) => d.id !== trip.assignedDriver.id)

  const canSubmit =
    resolve ||
    (reason !== '' &&
      (!reasonRequiresVehicle || vehicleId !== '') &&
      (!reasonRequiresDriver || driverId !== ''))

  const handleConfirm = () => {
    changeTripAssignment(trip.id, {
      vehicleId: vehicleId || undefined,
      driverId: driverId || undefined,
      issueReason: reason || undefined,
      notes: notes.trim() || undefined,
      resolve,
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 sm:items-center">
      <div className="my-4 flex max-h-[calc(100vh-2rem)] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="flex shrink-0 items-center gap-3 border-b border-gray-100 px-6 py-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Change assignment</h3>
            <p className="text-sm text-gray-500">{trip.id} · re-assign vehicle and/or driver</p>
          </div>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
          {/* Current */}
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm">
            <p className="font-semibold text-gray-700">Current</p>
            <div className="mt-2 grid grid-cols-2 gap-3 text-xs">
              <div>
                <p className="text-gray-500">Vehicle</p>
                <p className="font-mono font-semibold text-text">{trip.assignedVehicle.registrationNumber}</p>
                <p className="text-gray-500">{trip.assignedVehicle.type}</p>
              </div>
              <div>
                <p className="text-gray-500">Driver</p>
                <p className="font-semibold text-text">{trip.assignedDriver.name}</p>
                <p className="text-gray-500">{trip.assignedDriver.mobile}</p>
              </div>
            </div>
          </div>

          {/* Issue */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Issue type</label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value as DisruptionReason | '')}
              disabled={resolve}
              className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-primary disabled:bg-gray-100"
            >
              <option value="">— Select issue —</option>
              {REASON_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* New vehicle */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              New vehicle {reasonRequiresVehicle && <span className="text-danger">*</span>}
            </label>
            <select
              value={vehicleId}
              onChange={(e) => setVehicleId(e.target.value)}
              disabled={resolve}
              className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-primary disabled:bg-gray-100"
            >
              <option value="">— Keep current vehicle —</option>
              {availableVehicles.map((v) => (
                <option key={v.id} value={v.id}>{v.registrationNumber} · {v.vehicleType}</option>
              ))}
            </select>
          </div>

          {/* New driver */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              New driver {reasonRequiresDriver && <span className="text-danger">*</span>}
            </label>
            <select
              value={driverId}
              onChange={(e) => setDriverId(e.target.value)}
              disabled={resolve}
              className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-primary disabled:bg-gray-100"
            >
              <option value="">— Keep current driver —</option>
              {availableDrivers.map((d) => (
                <option key={d.id} value={d.id}>{d.name} · {d.mobile}</option>
              ))}
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Add context for the dispatcher (optional)"
              className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </div>

          {/* Resolve */}
          {trip.disruption && !trip.disruption.resolvedAt && (
            <label className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-700">
              <input
                type="checkbox"
                checked={resolve}
                onChange={(e) => setResolve(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500"
              />
              <span className="font-semibold">Mark disruption resolved</span>
            </label>
          )}

          {!canSubmit && reason && !resolve && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                Select a replacement {reasonRequiresVehicle && 'vehicle'}
                {reasonRequiresVehicle && reasonRequiresDriver && ' and '}
                {reasonRequiresDriver && 'driver'} for the chosen issue.
              </span>
            </div>
          )}
        </div>

        <div className="flex shrink-0 justify-end gap-3 border-t border-gray-100 bg-white px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            disabled={!canSubmit}
            onClick={handleConfirm}
            className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {resolve ? 'Resolve disruption' : 'Confirm change'}
          </button>
        </div>
      </div>
    </div>
  )
}
