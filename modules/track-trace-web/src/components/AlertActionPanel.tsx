import { useState } from 'react'
import { Button, Card } from '@shared-ui'
import type { TrackingAlertRecord } from '../types/alert.types'

export function AlertActionPanel({
  alert,
  onAcknowledge,
  onResolve,
  onAssign,
  onRemark,
}: {
  alert: TrackingAlertRecord
  onAcknowledge: (remarks?: string) => void
  onResolve: (resolutionNote: string) => void
  onAssign: (userId: string) => void
  onRemark: (remark: string) => void
}) {
  const [assignee, setAssignee] = useState(alert.assignedTo ?? '')
  const [remark, setRemark] = useState('')
  const [resolutionNote, setResolutionNote] = useState('')
  const [expanded, setExpanded] = useState(false)
  const [pending, setPending] = useState<'acknowledge' | 'resolve' | 'assign' | 'remark' | null>(null)
  const [resolveError, setResolveError] = useState(false)
  const isResolved = alert.status === 'Resolved'
  const isAcknowledged = alert.status === 'Acknowledged'

  async function handleAcknowledge() {
    setPending('acknowledge')
    try { await Promise.resolve(onAcknowledge(remark || undefined)) } finally { setPending(null) }
  }

  async function handleResolve() {
    if (!resolutionNote.trim()) {
      setResolveError(true)
      return
    }
    setResolveError(false)
    setPending('resolve')
    try { await Promise.resolve(onResolve(resolutionNote.trim())) } finally { setPending(null) }
  }

  async function handleAssign() {
    setPending('assign')
    try { await Promise.resolve(onAssign(assignee || 'ops.user@optimile')) } finally { setPending(null) }
  }

  async function handleRemark() {
    if (!remark.trim()) return
    setPending('remark')
    try { await Promise.resolve(onRemark(remark.trim())) } finally { setPending(null) }
  }

  return (
    <Card className="space-y-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Alert workflow</p>
          <p className="mt-1 text-sm text-gray-600">
            Acknowledge to claim, then resolve with a note or assign to a team member.
          </p>
        </div>
        <Button size="sm" variant="ghost" onClick={() => setExpanded((v) => !v)}>
          {expanded ? 'Hide actions' : 'Expand actions'}
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="outline"
          disabled={isAcknowledged || isResolved || pending !== null}
          loading={pending === 'acknowledge'}
          onClick={() => void handleAcknowledge()}
        >
          {isAcknowledged ? 'Acknowledged' : isResolved ? 'Resolved' : 'Acknowledge'}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          disabled={isResolved || pending !== null}
          onClick={() => setExpanded(true)}
        >
          {isResolved ? 'Resolved' : 'Resolve / Remark'}
        </Button>
      </div>

      {expanded && (
        <div className="grid gap-4 border-t border-gray-200 pt-4 md:grid-cols-2">
          {/* Resolution note */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wide text-gray-500" htmlFor={`resolve-${alert.id}`}>
              Resolution note <span className="text-danger">*</span>
            </label>
            <textarea
              id={`resolve-${alert.id}`}
              className={`mt-2 min-h-24 w-full rounded-lg border px-3 py-2 text-sm text-text outline-none transition focus:ring-2 focus:ring-primary/20 ${resolveError ? 'border-danger focus:border-danger' : 'border-gray-300 focus:border-primary'}`}
              onChange={(e) => { setResolutionNote(e.target.value); if (resolveError) setResolveError(false) }}
              placeholder="Describe how this alert was resolved..."
              value={resolutionNote}
            />
            {resolveError && <p className="mt-1 text-xs text-danger">A resolution note is required before closing.</p>}
            <Button
              className="mt-2"
              size="sm"
              variant="success"
              disabled={isResolved || pending !== null}
              loading={pending === 'resolve'}
              onClick={() => void handleResolve()}
            >
              {isResolved ? 'Resolved' : 'Resolve alert'}
            </Button>
          </div>

          {/* Remark + Assign */}
          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold uppercase tracking-wide text-gray-500" htmlFor={`remark-${alert.id}`}>Add remark</label>
              <textarea
                id={`remark-${alert.id}`}
                className="mt-2 min-h-[72px] w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-text outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                onChange={(e) => setRemark(e.target.value)}
                placeholder="Investigation note or update..."
                value={remark}
              />
              <Button
                className="mt-2"
                size="sm"
                variant="outline"
                disabled={!remark.trim() || pending !== null}
                loading={pending === 'remark'}
                onClick={() => void handleRemark()}
              >
                Add remark
              </Button>
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wide text-gray-500" htmlFor={`assign-${alert.id}`}>Assign alert</label>
              <div className="mt-2 flex gap-2">
                <input
                  id={`assign-${alert.id}`}
                  className="h-10 flex-1 rounded-lg border border-gray-300 px-3 text-sm text-text outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                  onChange={(e) => setAssignee(e.target.value)}
                  placeholder="ops.user@optimile"
                  value={assignee}
                />
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!assignee.trim() || pending !== null}
                  loading={pending === 'assign'}
                  onClick={() => void handleAssign()}
                >
                  Assign
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Card>
  )
}
