import type { SocketConnectionState } from '../types/socket.types'

function getFreshnessMeta(lastUpdatedAt?: string | null) {
  if (!lastUpdatedAt) {
    return {
      label: 'Waiting for first update',
      detail: 'The workspace has not received a data refresh yet.',
      stale: true,
    }
  }

  const diffMs = Date.now() - new Date(lastUpdatedAt).getTime()
  const diffMinutes = Math.max(0, Math.round(diffMs / 60000))

  if (diffMinutes >= 5) {
    return {
      label: `${diffMinutes} min since refresh`,
      detail: 'Data may be stale and should be treated as degraded until a fresh update arrives.',
      stale: true,
    }
  }

  if (diffMinutes >= 2) {
    return {
      label: `${diffMinutes} min since refresh`,
      detail: 'Freshness is slipping; keep an eye on live stream recovery.',
      stale: true,
    }
  }

  return {
    label: 'Updated recently',
    detail: `Last refresh at ${new Date(lastUpdatedAt).toLocaleTimeString('en-IN')}.`,
    stale: false,
  }
}

function getConnectionMeta(state: SocketConnectionState) {
  switch (state) {
    case 'Connected':
      return {
        label: 'Live stream healthy',
        detail: 'Realtime ETA and trip events are streaming normally.',
        tone: 'border-success/20 bg-success/5 text-success',
      }
    case 'Connecting':
      return {
        label: 'Connecting to live stream',
        detail: 'Realtime updates are initializing for this workspace.',
        tone: 'border-warning/20 bg-warning/5 text-warning',
      }
    case 'Reconnecting':
      return {
        label: 'Reconnecting to live stream',
        detail: 'The workspace is recovering and may briefly rely on fallback refresh behavior.',
        tone: 'border-warning/20 bg-warning/5 text-warning',
      }
    case 'Failed':
      return {
        label: 'Live stream failed',
        detail: 'Realtime events are unavailable; rely on polled refreshes until the socket recovers.',
        tone: 'border-danger/20 bg-danger/5 text-danger',
      }
    default:
      return {
        label: 'Live stream disconnected',
        detail: 'Realtime events are offline. The workspace will fall back to periodic refresh every 15 seconds.',
        tone: 'border-danger/20 bg-danger/5 text-danger',
      }
  }
}

export function TrackingDataHealthBanner({
  socketConnectionState,
  lastUpdatedAt,
}: {
  socketConnectionState: SocketConnectionState
  lastUpdatedAt?: string | null
}) {
  const connection = getConnectionMeta(socketConnectionState)
  const freshness = getFreshnessMeta(lastUpdatedAt)
  const freshnessTone = freshness.stale
    ? 'border-warning/20 bg-warning/5 text-warning'
    : 'border-primary/15 bg-primary/5 text-primary'

  return (
    <div className="grid gap-3 md:grid-cols-2">
      <div className={`rounded-2xl border px-4 py-3 ${connection.tone}`}>
        <p className="text-xs font-extrabold uppercase tracking-widest">Connection health</p>
        <p className="mt-2 text-sm font-bold">{connection.label}</p>
        <p className="mt-1 text-sm leading-6 opacity-90">{connection.detail}</p>
      </div>
      <div className={`rounded-2xl border px-4 py-3 ${freshnessTone}`}>
        <p className="text-xs font-extrabold uppercase tracking-widest">Data freshness</p>
        <p className="mt-2 text-sm font-bold">{freshness.label}</p>
        <p className="mt-1 text-sm leading-6 opacity-90">{freshness.detail}</p>
      </div>
    </div>
  )
}
