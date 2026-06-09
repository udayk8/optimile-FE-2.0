import { FormEvent, useMemo, useState } from 'react'
import { HeroCard } from '@vendor/components/cards/HeroCard'
import { ConfirmDialog } from '@vendor/components/shared/ConfirmDialog'
import { Button } from '@vendor/components/ui/button'
import { useAppStore } from '@vendor/stores/app.store'
import { ExceptionIssueType, ExceptionSeverity } from '@vendor/types'
import { AlertTriangle } from 'lucide-react'

import { useModuleNavigate as useNavigate, ModuleLink as Link } from '@vendor/hooks/useModuleRoute'

const BOOKINGS = [
  { id: 'BKG-2026-1045', route: 'Bengaluru → Chandausi', vehicle: 'KA01JK1234', driver: 'Kartik Pawar' },
  { id: 'BKG-2026-1043', route: 'Bengaluru → Hyderabad', vehicle: 'KA01JK1234', driver: 'Kartik Pawar' },
  { id: 'BKG-2026-1047', route: 'Bengaluru → Chennai', vehicle: 'KA01JK1234', driver: 'Kartik Pawar' },
  { id: 'BKG-2026-1041', route: 'Bengaluru → Mysuru', vehicle: 'KA01JK1234', driver: 'Kartik Pawar' },
]

const ISSUE_TYPES: ExceptionIssueType[] = ['Breakdown', 'Delay', 'Accident', 'Route deviation', 'Cargo issue']
const SEVERITIES: ExceptionSeverity[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']

export default function ReportExceptionPage() {
  const navigate = useNavigate()
  const createException = useAppStore((state) => state.createException)
  const [bookingId, setBookingId] = useState(BOOKINGS[0].id)
  const [issueType, setIssueType] = useState<ExceptionIssueType>('Breakdown')
  const [severity, setSeverity] = useState<ExceptionSeverity>('HIGH')
  const [description, setDescription] = useState('Vehicle needs immediate assistance due to an operational incident.')
  const [submissionError, setSubmissionError] = useState('')
  const [exitConfirmOpen, setExitConfirmOpen] = useState(false)
  const [photos, setPhotos] = useState<string[]>([])

  const selected = useMemo(() => BOOKINGS.find((item) => item.id === bookingId) ?? BOOKINGS[0], [bookingId])

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!selected) return

    if (!description.trim()) {
      setSubmissionError('Add a short description before submitting.')
      return
    }

    createException({
      bookingId: selected.id,
      route: selected.route,
      vehicle: selected.vehicle,
      driver: selected.driver,
      issueType,
      severity,
      description: description.trim(),
      evidence: photos,
    })
    navigate('/vendor/exceptions')
  }

  return (
    <div className="space-y-6">
      <HeroCard
        eyebrow="SUPPORT"
        title="Report Exception"
        subtitle="Log a booking-linked exception from the Exceptions tab with severity and issue type"
        icon={<AlertTriangle className="h-6 w-6 text-primary" />}
        onBack={() => setExitConfirmOpen(true)}
      />

      <ConfirmDialog
        isOpen={exitConfirmOpen}
        onClose={() => setExitConfirmOpen(false)}
        onConfirm={() => navigate('/vendor/support')}
        title="Leave exception report?"
        description="Your exception details will be lost."
        confirmLabel="Leave"
      />

      <form onSubmit={handleSubmit} className="space-y-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2">
            <div className="text-sm font-semibold text-text">Booking</div>
            <select
              value={bookingId}
              onChange={(e) => setBookingId(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:border-primary focus:bg-white"
            >
              {BOOKINGS.map((booking) => (
                <option key={booking.id} value={booking.id}>
                  {booking.id} - {booking.route}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2">
            <div className="text-sm font-semibold text-text">Issue type</div>
            <select
              value={issueType}
              onChange={(e) => setIssueType(e.target.value as ExceptionIssueType)}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:border-primary focus:bg-white"
            >
              {ISSUE_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2">
            <div className="text-sm font-semibold text-text">Severity</div>
            <select
              value={severity}
              onChange={(e) => setSeverity(e.target.value as ExceptionSeverity)}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:border-primary focus:bg-white"
            >
              {SEVERITIES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-gray-400">Selected booking details</div>
            <div className="mt-2 text-sm font-semibold text-text">{selected.id}</div>
            <div className="mt-1 text-sm text-gray-600">{selected.route}</div>
            <div className="mt-1 text-xs text-gray-400">
              {selected.vehicle} • {selected.driver}
            </div>
          </div>
        </div>

        <label className="block space-y-2">
          <div className="text-sm font-semibold text-text">Description</div>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={5}
            placeholder="Explain what happened, what support is needed, and any immediate impact."
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:border-primary focus:bg-white"
          />
        </label>

        <div className="block space-y-2">
          <div className="text-sm font-semibold text-text">Photos</div>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => setPhotos(Array.from(e.target.files ?? []).map((file) => file.name))}
            className="block w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none file:mr-4 file:rounded-lg file:border-0 file:bg-primary/10 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-primary hover:file:bg-primary/20 focus:border-primary focus:bg-white"
          />
          {photos.length > 0 && (
            <ul className="mt-2 space-y-1 text-sm text-gray-600">
              {photos.map((name) => (
                <li key={name} className="flex items-center gap-2">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary" />
                  {name}
                </li>
              ))}
            </ul>
          )}
        </div>

        {submissionError && <div className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{submissionError}</div>}

        <div className="flex flex-wrap gap-3">
          <Button type="submit">Submit Exception</Button>
          <Button type="button" variant="outline" onClick={() => navigate('/vendor/exceptions')}>
            Back to Exceptions
          </Button>
        </div>
      </form>
    </div>
  )
}
