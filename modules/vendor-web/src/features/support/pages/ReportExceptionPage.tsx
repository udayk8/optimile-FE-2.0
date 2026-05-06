import { FormEvent, useMemo, useState } from 'react'
import { HeroCard } from '@vendor/components/cards/HeroCard'
import { Button } from '@vendor/components/ui/button'
import { useAppStore } from '@vendor/stores/app.store'
import { ExceptionIssueType, ExceptionSeverity } from '@vendor/types'
import { AlertTriangle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const BOOKINGS = [
  { id: 'TRP-045', route: 'Mumbai → Satara', vehicle: 'MH-12-AB-4421', driver: 'Suresh Yadav' },
  { id: 'TRP-043', route: 'Pune → Chennai', vehicle: 'MH-14-KK-1007', driver: 'Manoj Sharma' },
  { id: 'TRP-047', route: 'Delhi → Jaipur', vehicle: 'RJ-14-TR-7788', driver: 'Ramesh Singh' },
  { id: 'TRP-041', route: 'Nashik → Bangalore', vehicle: 'KA-01-MN-5454', driver: 'Sandeep Patil' },
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
  const [evidence, setEvidence] = useState('GPS capture, photo evidence')

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
      evidence: evidence
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
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

        <label className="block space-y-2">
          <div className="text-sm font-semibold text-text">Evidence</div>
          <input
            value={evidence}
            onChange={(e) => setEvidence(e.target.value)}
            placeholder="Comma-separated notes like GPS capture, photo, call recording"
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:border-primary focus:bg-white"
          />
        </label>

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
