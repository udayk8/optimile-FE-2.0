import { AlertCircle, BarChart3, ShieldCheck, TrendingUp, Truck } from 'lucide-react';
import { useMemo } from 'react';
import { useOperationalData } from '../../stores/OperationalDataProvider';
import { getAlertSeverity } from './fleetRelationships';

const efficiencyTrend = [66, 71, 69, 75, 77, 74, 79];

export function OpsIntelligencePage() {
  const { alerts, fuelEvents, telematics, vehicles, workOrders } = useOperationalData();

  const refreshedAt = useMemo(
    () => new Intl.DateTimeFormat('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).format(new Date()),
    [],
  );

  const activeOrTrip = vehicles.filter((vehicle) => vehicle.status === 'Active').length;
  const availableIdle = Math.max(0, vehicles.length - activeOrTrip - workOrders.filter((order) => order.status !== 'Completed').length);
  const maintenance = vehicles.filter((vehicle) => vehicle.status === 'Maintenance').length;
  const nonCompliant = vehicles.filter((vehicle) => vehicle.documents.some((document) => document.status === 'Expired')).length;
  const fleetAvailability = vehicles.length ? Math.round(vehicles.filter((vehicle) => vehicle.status !== 'Inactive').reduce((sum, vehicle) => sum + vehicle.utilization, 0) / Math.max(1, vehicles.filter((vehicle) => vehicle.status !== 'Inactive').length)) : 0;
  const documentCount = vehicles.flatMap((vehicle) => vehicle.documents).length;
  const exceptionCount = vehicles.flatMap((vehicle) => vehicle.documents).filter((document) => document.status !== 'Valid').length;
  const complianceRate = Math.max(0, Math.round(100 - (exceptionCount / Math.max(1, documentCount)) * 12));
  const criticalExceptions = alerts.filter((alert) => getAlertSeverity(alert) === 'Critical').length;
  const costConfidence = Math.max(0, Math.round(100 - fuelEvents.filter((event) => event.status !== 'Posted').length * 8));

  const distribution = [
    { label: 'Active / On Trip', value: percent(activeOrTrip, vehicles.length), color: 'bg-success' },
    { label: 'Available (Idle)', value: percent(availableIdle, vehicles.length), color: 'bg-[#72A5F6]' },
    { label: 'Maintenance / Breakdown', value: percent(maintenance, vehicles.length), color: 'bg-danger/70' },
    { label: 'Non-Compliant / Parked', value: percent(nonCompliant, vehicles.length), color: 'bg-gray-400' },
  ];

  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-text">Operations Intelligence</h1>
          <p className="mt-2 text-base text-gray-500">Strategic view of fleet efficiency, risk, and operational health.</p>
        </div>
        <p className="text-sm font-medium text-gray-400">Data refreshed: {refreshedAt}</p>
      </section>

      <section className="grid gap-5 md:grid-cols-2 2xl:grid-cols-4">
        <OpsKpi
          icon={<Truck className="h-5 w-5" />}
          iconClass="text-[#4F83FF]"
          label="Fleet Availability"
          progress={fleetAvailability}
          progressClass="bg-[#EABF38]"
          subcopy={`${activeOrTrip + availableIdle} vehicles active on duty`}
          value={`${fleetAvailability}%`}
          valueSuffix="Utilization"
        />
        <OpsKpi
          icon={<ShieldCheck className="h-5 w-5" />}
          iconClass="text-[#9B5CF6]"
          label="Compliance Rate"
          progress={complianceRate}
          progressClass="bg-[#59C46B]"
          subcopy="Based on document expiry status"
          value={`${complianceRate}%`}
        />
        <OpsKpi
          icon={<AlertCircle className="h-5 w-5" />}
          iconClass="text-danger"
          label="Critical Exceptions"
          progress={criticalExceptions > 0 ? 100 : 0}
          progressClass="bg-danger"
          subcopy={criticalExceptions > 0 ? 'Requires immediate Ops attention' : 'No immediate Ops attention required'}
          subcopyClass={criticalExceptions > 0 ? 'text-danger' : 'text-success'}
          value={criticalExceptions.toString()}
          valueClass={criticalExceptions > 0 ? 'text-danger' : 'text-success'}
          valueSuffix="Open"
        />
        <OpsKpi
          icon={<BarChart3 className="h-5 w-5" />}
          iconClass="text-success"
          label="Cost Confidence"
          progress={costConfidence}
          progressClass="bg-[#59C46B]"
          subcopy="Data accuracy for financial reporting"
          value={`${costConfidence}%`}
          valueSuffix="High Conf."
        />
      </section>

      <section className="grid gap-6 2xl:grid-cols-[minmax(0,1fr)_0.95fr]">
        <article className="rounded-xl border border-gray-200 bg-white p-7 shadow-sm">
          <div className="mb-8 flex items-center gap-3">
            <TrendingUp className="h-5 w-5 text-gray-500" />
            <h2 className="text-2xl font-extrabold text-text">Fleet Efficiency Trend (7 Days)</h2>
          </div>
          <LineChart values={efficiencyTrend} />
        </article>

        <article className="rounded-xl border border-gray-200 bg-white p-7 shadow-sm">
          <div className="mb-8 flex items-center gap-3">
            <span className="text-gray-500">↯</span>
            <h2 className="text-2xl font-extrabold text-text">Asset State Distribution</h2>
          </div>
          <div className="space-y-7">
            {distribution.map((item) => (
              <div key={item.label}>
                <div className="mb-2 flex items-center justify-between text-base font-semibold text-gray-600">
                  <span>{item.label}</span>
                  <span className="font-extrabold text-text">{item.value}%</span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-gray-100">
                  <div className={`h-full rounded-full ${item.color}`} style={{ width: `${item.value}%` }} />
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <article className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-secondary">Intelligence Queue</p>
              <h2 className="text-xl font-extrabold text-text">Operational Signals</h2>
            </div>
            <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">{telematics.length} live feeds</span>
          </div>
          <div className="overflow-hidden rounded-xl border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {['Signal', 'Scope', 'Confidence', 'Action'].map((heading) => (
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-gray-500" key={heading}>{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                <SignalRow action="Prioritize renewal before dispatch" confidence={`${complianceRate}%`} scope={`${exceptionCount} document watch items`} signal="Compliance decay" />
                <SignalRow action="Review fuel-card and odometer match" confidence={`${costConfidence}%`} scope={`${fuelEvents.filter((event) => event.status !== 'Posted').length} fuel exceptions`} signal="Cost confidence" />
                <SignalRow action="Check stale GPS devices" confidence={`${percent(telematics.filter((signal) => signal.deviceStatus === 'Online').length, Math.max(1, telematics.length))}%`} scope={`${telematics.length} telematics units`} signal="Data coverage" />
              </tbody>
            </table>
          </div>
        </article>

        <article className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold text-secondary">Decision Assist</p>
          <h2 className="mt-1 text-xl font-extrabold text-text">Recommended Focus</h2>
          <div className="mt-5 space-y-3">
            {[
              criticalExceptions > 0 ? 'Resolve critical compliance block before releasing dispatch pool.' : 'Compliance queue has no critical open items.',
              'Use live GPS confidence to rank dispatch-ready vehicles.',
              'Review non-posted fuel events before Finance ledger sync.',
            ].map((item, index) => (
              <div className="rounded-xl bg-gray-50 p-4" key={item}>
                <p className="text-xs font-bold uppercase tracking-wide text-gray-400">Focus {index + 1}</p>
                <p className="mt-1 text-sm font-semibold leading-5 text-gray-700">{item}</p>
              </div>
            ))}
          </div>
        </article>
      </section>
    </div>
  );
}

function percent(value: number, total: number) {
  return Math.round((value / Math.max(1, total)) * 100);
}

function OpsKpi({
  icon,
  iconClass,
  label,
  progress,
  progressClass,
  subcopy,
  subcopyClass = 'text-gray-400',
  value,
  valueClass = 'text-text',
  valueSuffix,
}: {
  icon: React.ReactNode;
  iconClass: string;
  label: string;
  progress: number;
  progressClass: string;
  subcopy: string;
  subcopyClass?: string;
  value: string;
  valueClass?: string;
  valueSuffix?: string;
}) {
  return (
    <article className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between">
        <p className="text-lg font-bold text-gray-500">{label}</p>
        <span className={iconClass}>{icon}</span>
      </div>
      <div className="mt-8 flex items-end gap-3">
        <span className={`text-5xl font-extrabold tracking-tight ${valueClass}`}>{value}</span>
        {valueSuffix && <span className="pb-2 text-lg font-semibold text-gray-500">{valueSuffix}</span>}
      </div>
      <div className="mt-6 h-2 overflow-hidden rounded-full bg-gray-100">
        <div className={`h-full rounded-full ${progressClass}`} style={{ width: `${Math.max(4, Math.min(100, progress))}%` }} />
      </div>
      <p className={`mt-4 text-base font-semibold ${subcopyClass}`}>{subcopy}</p>
    </article>
  );
}

function LineChart({ values }: { values: number[] }) {
  const points = values.map((value, index) => {
    const x = 28 + index * 112;
    const y = 230 - (value - 60) * 5;
    return { x, y, value };
  });
  const line = points.map((point) => `${point.x},${point.y}`).join(' ');

  return (
    <div className="h-80">
      <svg className="h-full w-full" preserveAspectRatio="none" viewBox="0 0 720 300">
        {[0, 1, 2, 3].map((lineIndex) => (
          <line key={lineIndex} stroke="#F3F4F6" strokeWidth="1" x1="0" x2="720" y1={52 + lineIndex * 52} y2={52 + lineIndex * 52} />
        ))}
        <polyline fill="none" points={line} stroke="#2E75B5" strokeLinecap="round" strokeLinejoin="round" strokeWidth="5" />
        {points.map((point) => (
          <g key={`${point.x}-${point.y}`}>
            <circle cx={point.x} cy={point.y} fill="#FFFFFF" r="8" stroke="#2E75B5" strokeWidth="4" />
            <text fill="#6B7280" fontSize="12" fontWeight="700" textAnchor="middle" x={point.x} y={point.y - 16}>{point.value}%</text>
          </g>
        ))}
        {['D-7', 'D-6', 'D-5', 'D-4', 'D-3', 'D-2', 'D-1'].map((label, index) => (
          <text fill="#6B7280" fontSize="14" fontWeight="700" key={label} textAnchor="middle" x={28 + index * 112} y="286">{label}</text>
        ))}
      </svg>
    </div>
  );
}

function SignalRow({ action, confidence, scope, signal }: { action: string; confidence: string; scope: string; signal: string }) {
  return (
    <tr className="hover:bg-gray-50">
      <td className="px-4 py-4 text-sm font-bold text-text">{signal}</td>
      <td className="px-4 py-4 text-sm text-gray-600">{scope}</td>
      <td className="px-4 py-4">
        <span className="rounded-full bg-success/10 px-2 py-1 text-xs font-bold text-success">{confidence}</span>
      </td>
      <td className="px-4 py-4 text-sm font-semibold text-gray-700">{action}</td>
    </tr>
  );
}
