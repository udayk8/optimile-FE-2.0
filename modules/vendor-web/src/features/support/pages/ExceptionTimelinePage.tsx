import { FormEvent, useMemo, useState } from 'react'
import { HeroCard } from '@vendor/components/cards/HeroCard'
import { Button } from '@vendor/components/ui/button'
import { useAppStore } from '@vendor/stores/app.store'
import { ExceptionStatus } from '@vendor/types'
import { AlertTriangle, CheckCircle2, Clock, MessageSquare } from 'lucide-react'
import { useParams } from 'react-router-dom'
import { useModuleNavigate as useNavigate, ModuleLink as Link } from '@vendor/hooks/useModuleRoute'

const STATUS_OPTIONS: Array<{ value: ExceptionStatus; label: string }> = [
  { value: 'OPEN', label: 'Open' },
  { value: 'ACKNOWLEDGED', label: 'Acknowledged' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'RESOLVED', label: 'Resolved' },
  { value: 'CLOSED', label: 'Closed' },
]

const SEVERITY_COLOR: Record<string, string> = {
  CRITICAL: 'bg-red-100 text-red-700',
  HIGH: 'bg-orange-100 text-orange-700',
  MEDIUM: 'bg-amber-100 text-amber-700',
  LOW: 'bg-gray-100 text-gray-600',
}

const STATUS_COLOR: Record<string, string> = {
  OPEN: 'bg-red-100 text-red-700',
  ACKNOWLEDGED: 'bg-blue-100 text-blue-700',
  IN_PROGRESS: 'bg-amber-100 text-amber-700',
  RESOLVED: 'bg-green-100 text-green-700',
  CLOSED: 'bg-gray-100 text-gray-600',
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
}

export default function ExceptionTimelinePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const exception = useAppStore((state) => state.exceptions.find((item) => item.id === id))
  const updateExceptionStatus = useAppStore((state) => state.updateExceptionStatus)

  const [nextStatus, setNextStatus] = useState<ExceptionStatus | ''>('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const timeline = useMemo(() => [...(exception?.timeline ?? [])].reverse(), [exception])

  if (!exception) {
    return (
      <div className="space-y-6">
        <HeroCard
          eyebrow="EXCEPTIONS"
          title={`Exception ${id}`}
          subtitle="Not found"
          icon={<AlertTriangle className="h-6 w-6 text-primary" />}
        />
        <Button onClick={() => navigate('/vendor/exceptions')}>Back to Exceptions</Button>
      </div>
    )
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!nextStatus) { setError('Select a status first.'); return }
    if (!notes.trim()) { setError('Add a note explaining this update.'); return }
    updateExceptionStatus(exception.id, nextStatus, notes.trim())
    setNotes('')
    setNextStatus('')
    setError('')
    setSuccess(true)
    setTimeout(() => setSuccess(false), 2000)
  }

  return (
    <div className="space-y-6 pb-12">
      <HeroCard
        eyebrow="EXCEPTIONS"
        title={exception.id}
        subtitle={`${exception.issueType} · ${exception.route}`}
        icon={<AlertTriangle className="h-6 w-6 text-primary" />}
        onBack={() => navigate('/vendor/support')}
      />

      {/* Status bar */}
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ${STATUS_COLOR[exception.status] ?? 'bg-gray-100 text-gray-600'}`}>
          {exception.status.replace(/_/g, ' ')}
        </span>
        <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ${SEVERITY_COLOR[exception.severity] ?? 'bg-gray-100 text-gray-600'}`}>
          {exception.severity}
        </span>
        <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
          Booking: {exception.bookingId}
        </span>
        <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
          SLA: {formatDateTime(exception.slaDueAt)}
        </span>
        <span className="ml-auto text-xs text-gray-400">
          {exception.vehicle} · {exception.driver}
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        {/* Communication feed */}
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center gap-2 border-b border-gray-100 px-5 py-4">
            <MessageSquare className="h-4 w-4 text-gray-400" />
            <h3 className="text-sm font-bold text-text">Updates & Communication</h3>
          </div>
          {timeline.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <Clock className="h-8 w-8 mb-2 opacity-30" />
              <p className="text-sm">No updates yet</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {timeline.map((entry, idx) => (
                <div key={entry.id} className={`px-5 py-4 ${idx === 0 ? 'bg-primary/[0.03]' : ''}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {idx === 0 && <span className="h-2 w-2 rounded-full bg-primary shrink-0" />}
                        <span className="text-sm font-semibold text-text">{entry.action}</span>
                      </div>
                      <p className="mt-1 text-sm text-gray-600 leading-relaxed">{entry.notes}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xs text-gray-400">{formatDateTime(entry.timestamp)}</div>
                      <div className="text-xs text-gray-400 mt-0.5">{entry.by}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-5">
          {/* Update status */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-bold text-text mb-4">Update Status</h3>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1.5 block">New status</label>
                <select
                  value={nextStatus}
                  onChange={(e) => setNextStatus(e.target.value as ExceptionStatus)}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-primary focus:bg-white"
                >
                  <option value="">Select status...</option>
                  {STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Note</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="What was done or what is the current situation?"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-primary focus:bg-white resize-none"
                />
              </div>
              {error && <p className="text-xs text-red-600">{error}</p>}
              {success ? (
                <div className="flex items-center gap-2 text-sm font-semibold text-green-600">
                  <CheckCircle2 className="h-4 w-4" /> Updated successfully
                </div>
              ) : (
                <Button type="submit" className="w-full">Post Update</Button>
              )}
            </form>
          </div>

          {/* Exception details */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-bold text-text mb-3">Exception Details</h3>
            <div className="space-y-2.5 text-sm">
              {[
                { label: 'Booking', value: exception.bookingId },
                { label: 'Route', value: exception.route },
                { label: 'Issue', value: exception.issueType },
                { label: 'Vehicle', value: exception.vehicle },
                { label: 'Driver', value: exception.driver },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between gap-3">
                  <span className="text-gray-500 shrink-0">{label}</span>
                  <span className="font-medium text-text text-right">{value}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-3 border-t border-gray-100">
              <div className="text-xs text-gray-500 mb-1">Description</div>
              <p className="text-sm text-gray-700 leading-relaxed">{exception.description}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
