type TrackTraceStatusTone = 'info' | 'success' | 'warning' | 'danger'

const toneClasses: Record<TrackTraceStatusTone, string> = {
  info: 'border-primary/20 bg-primary/5 text-primary',
  success: 'border-success/20 bg-success/5 text-success',
  warning: 'border-warning/20 bg-warning/5 text-warning',
  danger: 'border-danger/20 bg-danger/5 text-danger',
}

export function TrackTraceStatusNotice({
  title,
  description,
  tone = 'info',
  timestamp,
}: {
  title: string
  description: string
  tone?: TrackTraceStatusTone
  timestamp?: string | null
}) {
  return (
    <div className={`rounded-2xl border px-4 py-3 ${toneClasses[tone]}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-widest">Workspace status</p>
          <p className="mt-2 text-sm font-bold">{title}</p>
          <p className="mt-1 text-sm leading-6 opacity-90">{description}</p>
        </div>
        {timestamp ? (
          <span className="rounded-full bg-white/70 px-2.5 py-1 text-xs font-semibold text-current">
            {new Date(timestamp).toLocaleTimeString('en-IN')}
          </span>
        ) : null}
      </div>
    </div>
  )
}
