import { FormEvent, useMemo, useState } from 'react'
import { HeroCard } from '@vendor/components/cards/HeroCard'
import { Button } from '@vendor/components/ui/button'
import { useAppStore } from '@vendor/stores/app.store'
import { ExceptionStatus } from '@vendor/types'
import { CheckCircle2, Clock, ShieldCheck, Truck, AlertTriangle, ArrowRightLeft, History, Settings, Info, CheckCircle } from 'lucide-react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'

type ExceptionTab = 'timeline' | 'actions' | 'context'

const STATUS_OPTIONS: Array<{ value: ExceptionStatus; label: string; icon: any; color: string; description: string }> = [
  { value: 'OPEN', label: 'Open', icon: AlertTriangle, color: 'text-red-600 bg-red-50', description: 'Newly reported issue' },
  { value: 'ACKNOWLEDGED', label: 'Acknowledged', icon: ShieldCheck, color: 'text-blue-600 bg-blue-50', description: 'Receipt confirmed by ops' },
  { value: 'IN_PROGRESS', label: 'In Progress', icon: Truck, color: 'text-amber-600 bg-amber-50', description: 'Actively working on resolution' },
  { value: 'RESOLVED', label: 'Resolved', icon: CheckCircle2, color: 'text-green-600 bg-green-50', description: 'Issue has been addressed' },
  { value: 'CLOSED', label: 'Closed', icon: CheckCircle, color: 'text-gray-600 bg-gray-50', description: 'Final closure of the ticket' },
]

const REASON_OPTIONS = [
  'Customer update',
  'Replacement arranged',
  'Delay confirmed',
  'Roadside assistance',
  'Resolved after verification',
  'Duplicate report',
  'Invalid exception',
  'Other',
]

const statusLabel = (value?: string) => value?.replace('_', ' ') ?? '-'

export default function ExceptionTimelinePage() {
  const location = useLocation()
  const { id } = useParams()
  const navigate = useNavigate()
  const exception = useAppStore((state) => state.exceptions.find((item) => item.id === id))
  const updateExceptionStatus = useAppStore((state) => state.updateExceptionStatus)

  const [activeTab, setActiveTab] = useState<ExceptionTab>((location.state as any)?.tab || 'timeline')
  const [nextStatus, setNextStatus] = useState<ExceptionStatus>(exception?.status || 'OPEN')
  const [reason, setReason] = useState(REASON_OPTIONS[0])
  const [description, setDescription] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const timeline = useMemo(() => [...(exception?.timeline ?? [])].reverse(), [exception])

  if (!exception) {
    return (
      <div className="space-y-6">
        <HeroCard
          eyebrow="SUPPORT"
          title={`Exception ${id}`}
          subtitle="Exception not found"
          icon={<Clock className="h-6 w-6 text-primary" />}
        />
        <Button onClick={() => navigate('/vendor/support')}>Back to Hub</Button>
      </div>
    )
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!description.trim()) {
      setError('Please provide a detailed description for this status change.')
      return
    }

    updateExceptionStatus(exception.id, nextStatus, `${reason}: ${description.trim()}`)
    setDescription('')
    setError('')
    setSuccess(true)
    setTimeout(() => {
      setSuccess(false)
      setActiveTab('timeline')
    }, 1500)
  }

  const handleDiscardChanges = () => {
    setNextStatus(exception.status)
    setReason(REASON_OPTIONS[0])
    setDescription('')
    setError('')
    setSuccess(false)
  }

  return (
    <div className="space-y-6 pb-12">
      <HeroCard
        eyebrow="SUPPORT"
        title={exception.id}
        subtitle="Manage lifecycle, track timeline, and update resolution status"
        icon={<Clock className="h-6 w-6 text-primary" />}
      />

      {/* Header Info Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-2 rounded-full bg-gray-900 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white">
            {statusLabel(exception.status)}
          </div>
          <div className="flex items-center gap-2 rounded-full bg-red-50 px-4 py-2 text-xs font-bold uppercase tracking-wider text-red-600 border border-red-100">
            {exception.severity}
          </div>
          <div className="flex items-center gap-2 rounded-full bg-blue-50 px-4 py-2 text-xs font-bold uppercase tracking-wider text-blue-600 border border-blue-100">
            SLA {new Date(exception.slaDueAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => navigate('/vendor/support')}>Back to Hub</Button>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex gap-1 rounded-xl bg-gray-100 p-1 w-fit">
        {[
          { id: 'timeline', label: 'Timeline', icon: History },
          { id: 'actions', label: 'Update Status', icon: Settings },
          { id: 'context', label: 'Context', icon: Info },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as ExceptionTab)}
            className={`flex items-center gap-2 rounded-lg px-6 py-2.5 text-sm font-bold transition-all ${
              activeTab === tab.id ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <tab.icon className={`h-4 w-4 ${activeTab === tab.id ? 'text-primary' : 'text-gray-400'}`} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {activeTab === 'timeline' && (
          <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
            <h3 className="text-xl font-bold text-text mb-8">Resolution Timeline</h3>
            <div className="relative ml-4 space-y-8 before:absolute before:left-[-17px] before:top-2 before:h-[calc(100%-16px)] before:w-0.5 before:bg-gray-100">
              {timeline.map((entry, idx) => {
                const isLatest = idx === 0
                return (
                  <div key={entry.id} className="relative">
                    <div className={`absolute left-[-25px] top-1.5 h-4 w-4 rounded-full border-2 border-white ${isLatest ? 'bg-primary ring-4 ring-primary/10' : 'bg-gray-300'}`} />
                    <div className={`rounded-2xl border border-gray-100 p-6 ${isLatest ? 'bg-primary/5 border-primary/10' : 'bg-gray-50'}`}>
                      <div className="flex items-center justify-between gap-4 flex-wrap">
                        <span className={`text-sm font-bold uppercase tracking-wide ${isLatest ? 'text-primary' : 'text-text'}`}>
                          {entry.action}
                        </span>
                        <span className="text-xs font-medium text-gray-400">
                          {new Date(entry.timestamp).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                        </span>
                      </div>
                      <p className="mt-3 text-sm leading-relaxed text-gray-600">{entry.notes}</p>
                      <div className="mt-4 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-gray-400">
                        <div className="h-1 w-1 rounded-full bg-gray-300" />
                        Logged by {entry.by}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {activeTab === 'actions' && (
          <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="max-w-3xl">
              <h3 className="text-xl font-bold text-text">Change Exception Status</h3>
              <p className="mt-2 text-sm text-gray-500">Select the new stage for this exception. This will be visible to both the customer and operations teams.</p>

              <form onSubmit={handleSubmit} className="mt-8 space-y-8">
                {/* Status Grid */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {STATUS_OPTIONS.map((option) => {
                    const Icon = option.icon
                    const isSelected = nextStatus === option.value
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setNextStatus(option.value)}
                        className={`group relative flex flex-col items-start rounded-2xl border-2 p-4 text-left transition-all hover:border-primary/30 ${
                          isSelected ? 'border-primary bg-primary/5 ring-4 ring-primary/5' : 'border-gray-100 bg-white'
                        }`}
                      >
                        <div className={`flex h-10 w-10 items-center justify-center rounded-xl transition-colors ${option.color} group-hover:scale-110 duration-200`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="mt-4 text-sm font-bold text-text">{option.label}</div>
                        <div className="mt-1 text-xs text-gray-400 leading-tight">{option.description}</div>
                        {isSelected && <div className="absolute right-3 top-3 h-2 w-2 rounded-full bg-primary" />}
                      </button>
                    )
                  })}
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <label className="space-y-2">
                    <div className="text-sm font-bold text-text">Reason for update</div>
                    <select
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3.5 text-sm font-medium outline-none focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/5"
                    >
                      {REASON_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </label>

                  <label className="space-y-2">
                    <div className="text-sm font-bold text-text">Detailed Description</div>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Add context for this state change..."
                      rows={3}
                      className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3.5 text-sm font-medium outline-none focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/5 resize-none"
                    />
                  </label>
                </div>

                {error && <div className="rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-600 border border-red-100">{error}</div>}
                
                {success ? (
                  <div className="flex items-center gap-3 rounded-xl bg-green-50 px-6 py-4 text-sm font-bold text-green-600 border border-green-100 animate-in zoom-in-95">
                    <CheckCircle2 className="h-5 w-5" />
                    Status updated successfully!
                  </div>
                ) : (
                  <div className="flex gap-4 pt-4 border-t border-gray-50">
                    <Button type="submit" className="shadow-lg shadow-primary/20">
                      Update Status
                    </Button>
                    <Button type="button" variant="outline" onClick={handleDiscardChanges}>
                      Discard Changes
                    </Button>
                  </div>
                )}
              </form>
            </div>
          </div>
        )}

        {activeTab === 'context' && (
          <div className="grid gap-6 lg:grid-cols-3 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="lg:col-span-2 space-y-6">
              <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
                <h3 className="text-xl font-bold text-text mb-6">Booking Context</h3>
                <div className="grid gap-6 sm:grid-cols-2">
                  <div className="rounded-xl bg-gray-50 p-4 border border-gray-100">
                    <div className="text-xs font-bold uppercase tracking-wider text-gray-400">Booking Reference</div>
                    <div className="mt-2 text-lg font-bold text-text">{exception.bookingId}</div>
                  </div>
                  <div className="rounded-xl bg-gray-50 p-4 border border-gray-100">
                    <div className="text-xs font-bold uppercase tracking-wider text-gray-400">Issue Category</div>
                    <div className="mt-2 text-lg font-bold text-text">{exception.issueType}</div>
                  </div>
                  <div className="rounded-xl bg-gray-50 p-4 border border-gray-100">
                    <div className="text-xs font-bold uppercase tracking-wider text-gray-400">Operational Route</div>
                    <div className="mt-2 text-sm font-bold text-text leading-tight">{exception.route}</div>
                  </div>
                  <div className="rounded-xl bg-gray-50 p-4 border border-gray-100">
                    <div className="text-xs font-bold uppercase tracking-wider text-gray-400">SLA Breach Warning</div>
                    <div className="mt-2 text-sm font-bold text-red-600">
                      Due at {new Date(exception.slaDueAt).toLocaleString('en-IN', { timeStyle: 'short', dateStyle: 'short' })}
                    </div>
                  </div>
                </div>

                <div className="mt-8">
                  <div className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Detailed Report</div>
                  <div className="rounded-xl bg-gray-50 p-6 text-sm text-gray-700 leading-relaxed italic border-l-4 border-gray-200">
                    "{exception.description}"
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
                <h3 className="text-xl font-bold text-text mb-6">Evidence & Attachments</h3>
                {exception.evidence.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {exception.evidence.map((ev, i) => (
                      <div key={i} className="aspect-square rounded-xl bg-gray-100 flex items-center justify-center border-2 border-dashed border-gray-200 text-gray-400 font-bold text-xs">
                        {ev}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-gray-400 border-2 border-dashed border-gray-100 rounded-2xl">
                    <Info className="h-10 w-10 mb-3 opacity-20" />
                    <p className="text-sm font-medium">No files uploaded as evidence</p>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-6">
              <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <h4 className="text-sm font-bold text-text mb-4 uppercase tracking-wider">Asset Info</h4>
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                      <Truck className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-gray-400 uppercase">Vehicle</div>
                      <div className="text-sm font-bold text-text">{exception.vehicle}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                      <ArrowRightLeft className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-gray-400 uppercase">Driver</div>
                      <div className="text-sm font-bold text-text">{exception.driver}</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl bg-gray-900 p-6 text-white shadow-xl shadow-gray-200">
                <div className="flex items-center gap-2 mb-4">
                  <AlertTriangle className="h-5 w-5 text-amber-400" />
                  <span className="text-sm font-bold uppercase tracking-wider">Operational Alert</span>
                </div>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Moving this exception to "Closed" will finalize all associated penalty calculations and lock the timeline. Ensure all evidence is captured before closure.
                </p>
                <Button className="w-full mt-6 bg-white text-gray-900 hover:bg-gray-100" onClick={() => setActiveTab('actions')}>
                  Go to Actions
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
