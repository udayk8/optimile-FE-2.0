import { AlertTriangle, Clock3, GaugeCircle, Route, ShieldAlert, TimerReset, Truck, WifiOff } from 'lucide-react'
import { Card } from '@shared-ui'
import type { TrackingDashboardSummary } from '../types/tracking.types'

type SummaryCardMeta = {
  key: keyof TrackingDashboardSummary
  label: string
  icon: typeof Route
  tone: string
  suffix?: string
  insight: string
  stateLabel: (summary: TrackingDashboardSummary) => string
}

const urgentCardMeta: SummaryCardMeta[] = [
  {
    key: 'openAlerts',
    label: 'Open Alerts',
    icon: ShieldAlert,
    tone: 'bg-danger/10 text-danger',
    insight: 'Exception queue that still needs operator action.',
    stateLabel: (summary) => (summary.openAlerts >= 20 ? 'Escalation risk' : summary.openAlerts >= 8 ? 'Needs triage' : 'Controlled queue'),
  },
  {
    key: 'delayedTrips',
    label: 'Delayed Trips',
    icon: Clock3,
    tone: 'bg-warning/10 text-warning',
    insight: 'Trips currently under ETA pressure or delivery slip risk.',
    stateLabel: (summary) => (summary.delayedTrips >= 10 ? 'High route pressure' : summary.delayedTrips >= 5 ? 'Watch closely' : 'Within tolerance'),
  },
  {
    key: 'offlineVehicles',
    label: 'Offline Vehicles',
    icon: WifiOff,
    tone: 'bg-danger/10 text-danger',
    insight: 'Units with dropped tracking signal or stale telemetry.',
    stateLabel: (summary) => (summary.offlineVehicles >= 4 ? 'Coverage risk' : summary.offlineVehicles >= 1 ? 'Investigate source health' : 'Signals stable'),
  },
  {
    key: 'averageEtaDelay',
    label: 'Average ETA Delay',
    icon: AlertTriangle,
    tone: 'bg-warning/10 text-warning',
    suffix: ' min',
    insight: 'Average downstream delay across trips currently in motion.',
    stateLabel: (summary) => (summary.averageEtaDelay >= 90 ? 'Severe delay trend' : summary.averageEtaDelay >= 45 ? 'Rising pressure' : 'Managed delay load'),
  },
]

const supportingCardMeta: SummaryCardMeta[] = [
  {
    key: 'totalActiveTrips',
    label: 'Total Active Trips',
    icon: Route,
    tone: 'bg-primary/10 text-primary',
    insight: 'All active line-haul and in-yard movements under watch.',
    stateLabel: (summary) => `${summary.totalActiveTrips} in current scope`,
  },
  {
    key: 'inTransitTrips',
    label: 'In Transit Trips',
    icon: Truck,
    tone: 'bg-secondary/10 text-secondary',
    insight: 'Trips currently moving between planned route checkpoints.',
    stateLabel: (summary) => `${summary.inTransitTrips} on-route movements`,
  },
  {
    key: 'idleVehicles',
    label: 'Idle Vehicles',
    icon: TimerReset,
    tone: 'bg-gray-100 text-gray-700',
    insight: 'Vehicles paused long enough to trigger idle scrutiny.',
    stateLabel: (summary) => (summary.idleVehicles >= 3 ? 'Review idle pockets' : 'Idle load contained'),
  },
  {
    key: 'onTimePercentage',
    label: 'On-Time Percentage',
    icon: GaugeCircle,
    tone: 'bg-success/10 text-success',
    suffix: '%',
    insight: 'Current adherence against expected arrival commitments.',
    stateLabel: (summary) => (summary.onTimePercentage >= 85 ? 'Above target' : summary.onTimePercentage >= 65 ? 'Recovery possible' : 'Service level under pressure'),
  },
]

export function TrackingSummaryCards({
  summary,
  section = 'all',
}: {
  summary: TrackingDashboardSummary
  /** Controls which KPI tier renders. Defaults to 'all'. Use 'urgent' above the fold, 'supporting' inside an accordion. */
  section?: 'all' | 'urgent' | 'supporting'
}) {
  const urgentSection = (
    <section className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-widest text-danger">Critical operations</p>
          <h2 className="mt-1 text-xl font-extrabold text-text">Exceptions and ETA pressure</h2>
        </div>
        <p className="max-w-3xl text-sm text-gray-600">
          Highest-priority tracking issues come first so the control tower can triage risk before reviewing general movement health.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {urgentCardMeta.map((item) => {
          const Icon = item.icon
          const value = summary[item.key]
          return (
            <Card key={item.key} className="border-gray-200 p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-gray-500">{item.label}</p>
                  <p className="mt-2 text-3xl font-extrabold text-text">{value}{item.suffix ?? ''}</p>
                  <p className="mt-3 text-xs font-bold uppercase tracking-wide text-gray-500">{item.stateLabel(summary)}</p>
                </div>
                <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${item.tone}`}>
                  <Icon className="h-5 w-5" />
                </div>
              </div>
              <p className="mt-4 text-sm leading-6 text-gray-600">{item.insight}</p>
            </Card>
          )
        })}
      </div>
    </section>
  )

  const supportingSection = (
    <section className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-widest text-gray-500">Network health</p>
          <h2 className="mt-1 text-lg font-extrabold text-text">Supporting fleet context</h2>
        </div>
        <p className="max-w-3xl text-sm text-gray-600">
          Secondary metrics keep live movement, fleet utilization, and service adherence visible without competing with urgent exceptions.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {supportingCardMeta.map((item) => {
          const Icon = item.icon
          const value = summary[item.key]
          return (
            <Card key={item.key} className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-gray-500">{item.label}</p>
                  <p className="mt-2 text-3xl font-extrabold text-text">{value}{item.suffix ?? ''}</p>
                  <p className="mt-3 text-xs font-bold uppercase tracking-wide text-gray-500">{item.stateLabel(summary)}</p>
                </div>
                <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${item.tone}`}>
                  <Icon className="h-5 w-5" />
                </div>
              </div>
              <p className="mt-4 text-sm leading-6 text-gray-600">{item.insight}</p>
            </Card>
          )
        })}
      </div>
    </section>
  )

  if (section === 'urgent') return urgentSection
  if (section === 'supporting') return supportingSection
  return <div className="space-y-4">{urgentSection}{supportingSection}</div>
}
