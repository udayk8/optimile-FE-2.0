import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { AlertTriangle, Wrench, Truck, CheckCircle2 } from 'lucide-react'
import { useVendorBookings } from '@vendor/integration/useVendorBookings'
import { useFleetData } from '@vendor/integration/useFleetData'
import type { DisruptionReason, Trip } from '@vendor/types'

const REASON_OPTIONS: { value: DisruptionReason; label: string }[] = [
  { value: 'VEHICLE_BREAKDOWN', label: 'Vehicle breakdown' },
  { value: 'DRIVER_BREAKDOWN', label: 'Driver breakdown' },
  { value: 'VEHICLE_OR_DRIVER_BREAKDOWN', label: 'Vehicle and driver breakdown' },
]

type ExceptionAction = 'update' | 'replace' | 'resolve'

interface ChangeAssignmentModalProps {
  isOpen: boolean
  onClose: () => void
  tripId: string | null
}

export function ChangeAssignmentModal({ isOpen, onClose, tripId }: ChangeAssignmentModalProps) {
  const { trips, changeTripException } = useVendorBookings()
  const { vehicles, drivers } = useFleetData()
  const trip: Trip | undefined = useMemo(() => trips.find((t) => t.id === tripId), [trips, tripId])

  const inException = Boolean(trip?.exceptionFlag && (!trip?.disruption || !trip.disruption.resolvedAt))

  // Report form (trip not yet in exception).
  const [reason, setReason] = useState<DisruptionReason | ''>('')
  // Action while already in exception.
  const [action, setAction] = useState<ExceptionAction>('update')
  const [vehicleId, setVehicleId] = useState('')
  const [driverId, setDriverId] = useState('')
  const [notes, setNotes] = useState('')
  const [eta, setEta] = useState('')

  useEffect(() => {
    if (!isOpen || !trip) return
    setReason('')
    setAction('update')
    setVehicleId('')
    setDriverId('')
    setNotes('')
    setEta(trip.disruption?.revisedEta ?? '')
  }, [isOpen, trip])

  if (!isOpen || !trip) return null

  const expectedType = trip.assignedVehicle.type && trip.assignedVehicle.type !== '—' ? trip.assignedVehicle.type : null
  // Only Active + Compliant fleet can be assigned; exclude the current ones.
  const availableVehicles = vehicles.filter(
    (v) => v.id !== trip.assignedVehicle.id && v.operationalStatus === 'ACTIVE' && v.complianceStatus === 'COMPLIANT' && (!expectedType || v.vehicleType === expectedType),
  )
  const availableDrivers = drivers.filter((d) => d.id !== trip.assignedDriver.id && d.currentStatus === 'ACTIVE' && d.complianceStatus === 'COMPLIANT')

  const canSubmit = inException
    ? action === 'resolve'
      ? true
      : action === 'update'
        ? Boolean(notes.trim() || eta)
        : Boolean(vehicleId || driverId) // replace
    : reason !== '' // report

  const handleConfirm = () => {
    if (!inException) {
      changeTripException(trip.id, { mode: 'report', reason: reason || undefined, notes: notes.trim() || undefined, revisedEta: eta || undefined })
    } else if (action === 'resolve') {
      changeTripException(trip.id, { mode: 'resolve', notes: notes.trim() || undefined })
    } else if (action === 'replace') {
      changeTripException(trip.id, { mode: 'replace', vehicleId: vehicleId || undefined, driverId: driverId || undefined, notes: notes.trim() || undefined, revisedEta: eta || undefined })
    } else {
      changeTripException(trip.id, { mode: 'update', notes: notes.trim() || undefined, revisedEta: eta || undefined })
    }
    onClose()
  }

  const ActionTab = ({ value, icon, label }: { value: ExceptionAction; icon: ReactNode; label: string }) => (
    <button
      type="button"
      onClick={() => setAction(value)}
      className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-semibold transition ${
        action === value ? 'border-primary bg-primary/5 text-primary' : 'border-gray-200 text-gray-600 hover:border-primary/40'
      }`}
    >
      {icon}
      {label}
    </button>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 sm:items-center">
      <div className="my-4 flex max-h-[calc(100vh-2rem)] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="flex shrink-0 items-center gap-3 border-b border-gray-100 px-6 py-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-amber-700">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{inException ? 'Manage breakdown' : 'Report breakdown'}</h3>
            <p className="text-sm text-gray-500">{trip.id} · booking stays In Transit</p>
          </div>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
          {/* Current assignment */}
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-xs">
            <p className="font-semibold text-gray-700">Current</p>
            <div className="mt-2 grid grid-cols-2 gap-3">
              <div>
                <p className="text-gray-500">Vehicle</p>
                <p className="font-mono font-semibold text-text">{trip.assignedVehicle.registrationNumber}</p>
              </div>
              <div>
                <p className="text-gray-500">Driver</p>
                <p className="font-semibold text-text">{trip.assignedDriver.name}</p>
              </div>
            </div>
            {inException && trip.disruption && (
              <p className="mt-2 text-amber-700">
                In exception: {REASON_OPTIONS.find((r) => r.value === trip.disruption?.reason)?.label ?? 'Breakdown'}
                {trip.disruption.revisedEta ? ` · Revised ETA ${trip.disruption.revisedEta}` : ''}
              </p>
            )}
          </div>

          {/* Report (not yet in exception) */}
          {!inException && (
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">What broke down?</label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value as DisruptionReason | '')}
                className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-primary"
              >
                <option value="">— Select —</option>
                {REASON_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          )}

          {/* Actions while in exception */}
          {inException && (
            <div className="flex gap-2">
              <ActionTab value="update" icon={<Wrench className="h-4 w-4" />} label="Repair / ETA" />
              <ActionTab value="replace" icon={<Truck className="h-4 w-4" />} label="Replace" />
              <ActionTab value="resolve" icon={<CheckCircle2 className="h-4 w-4" />} label="Resolve" />
            </div>
          )}

          {/* Replace fields */}
          {inException && action === 'replace' && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Replacement vehicle</label>
                <select value={vehicleId} onChange={(e) => setVehicleId(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-primary">
                  <option value="">— Keep current vehicle —</option>
                  {availableVehicles.map((v) => <option key={v.id} value={v.id}>{v.registrationNumber} · {v.vehicleType}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Replacement driver</label>
                <select value={driverId} onChange={(e) => setDriverId(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-primary">
                  <option value="">— Keep current driver —</option>
                  {availableDrivers.map((d) => <option key={d.id} value={d.id}>{d.name} · {d.mobile}</option>)}
                </select>
              </div>
            </div>
          )}

          {/* Revised ETA — for report, update, replace (not resolve) */}
          {(!inException || action !== 'resolve') && (
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Revised ETA {inException && action === 'update' && <span className="text-gray-400">(or repair note)</span>}</label>
              <input type="datetime-local" value={eta} onChange={(e) => setEta(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-primary" />
            </div>
          )}

          {/* Notes — always */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder={action === 'resolve' && inException ? 'How was it resolved? (optional)' : 'Add context (optional)'}
              className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </div>

          {inException && action === 'resolve' && (
            <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
              Marks the breakdown resolved and removes the booking from Exception — it stays In Transit.
            </p>
          )}
        </div>

        <div className="flex shrink-0 justify-end gap-3 border-t border-gray-100 bg-white px-6 py-4">
          <button onClick={onClose} className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
          <button
            disabled={!canSubmit}
            onClick={handleConfirm}
            className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {!inException ? 'Report breakdown' : action === 'resolve' ? 'Mark resolved' : action === 'replace' ? 'Confirm replacement' : 'Save update'}
          </button>
        </div>
      </div>
    </div>
  )
}
