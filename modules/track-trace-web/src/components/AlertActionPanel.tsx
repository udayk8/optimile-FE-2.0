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
  const [expanded, setExpanded] = useState(false)
  const isResolved = alert.status === 'Resolved'
  const isAcknowledged = alert.status === 'Acknowledged'

  return (
    <Card className="space-y-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Alert workflow</p>
          <p className="mt-1 text-sm text-gray-600">
            Keep common actions visible and expand the workspace only when assignment or remark detail is needed.
          </p>
        </div>
        <Button size="sm" variant="ghost" onClick={() => setExpanded((value) => !value)}>
          {expanded ? 'Hide actions' : 'Expand actions'}
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="outline"
          disabled={isAcknowledged || isResolved}
          onClick={() => onAcknowledge(remark || undefined)}
        >
          {isAcknowledged ? 'Acknowledged' : isResolved ? 'Closed' : 'Acknowledge'}
        </Button>
        <Button
          size="sm"
          variant="success"
          disabled={isResolved}
          onClick={() => onResolve(remark || 'Resolved from alert action panel.')}
        >
          {isResolved ? 'Resolved' : 'Resolve'}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => onRemark(remark || 'Operator note added.')}>
          Add remark
        </Button>
      </div>

      {expanded ? (
        <div className="grid gap-3 border-t border-gray-200 pt-4 md:grid-cols-2">
          <div>
            <label className="text-xs font-bold uppercase tracking-wide text-gray-500" htmlFor={`assign-${alert.id}`}>Assign Alert</label>
            <div className="mt-2 flex gap-2">
              <input
                id={`assign-${alert.id}`}
                className="h-10 flex-1 rounded-lg border border-gray-300 px-3 text-sm text-text outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                onChange={(event) => setAssignee(event.target.value)}
                placeholder="ops.user@optimile"
                value={assignee}
              />
              <Button size="sm" variant="outline" onClick={() => onAssign(assignee || 'ops.user@optimile')}>Assign</Button>
            </div>
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-wide text-gray-500" htmlFor={`remark-${alert.id}`}>Remarks / Resolution</label>
            <textarea
              id={`remark-${alert.id}`}
              className="mt-2 min-h-24 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-text outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              onChange={(event) => setRemark(event.target.value)}
              placeholder="Add investigation remark or resolution note"
              value={remark}
            />
          </div>
        </div>
      ) : null}
    </Card>
  )
}
