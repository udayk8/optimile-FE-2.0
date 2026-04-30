import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardCheck,
  Fuel,
  Gauge,
  MapPinned,
  Plus,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Truck,
  UserRoundCheck,
  Wrench,
} from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { ACTION_PERMISSIONS } from '@shared-auth/modulePermissions';
import { useFleetAuth } from '@shared-auth';
import { Button } from '../../components/Button';
import { AppPage } from '../../app/navigation';
import { useOperationalData } from '../../stores/OperationalDataProvider';
import { buildFleetHash, FleetRouteMode } from '../../routing/fleetRoutes';
import { FleetAlert, FleetDriver, FleetTask, FuelEvent, MaintenanceWorkOrder, TelematicsSignal, Vehicle } from '../../types';
import { getAlertSeverity } from './fleetRelationships';
import { getTaskEntityPath, isTaskOverdue } from './fleetTasks';

interface FleetDashboardPageProps {
  onNavigate: (page: AppPage) => void;
}

type Severity = 'Critical' | 'High' | 'Medium';

interface ControlTowerAction {
  id: string;
  title: string;
  severity: Severity;
  description: string;
  actionLabel: string;
  assignedTo: string;
  dueLabel: string;
  overdue?: boolean;
  page: AppPage;
  mode?: FleetRouteMode;
  rank: number;
  recordId?: string;
  status?: string;
}

const utilizationTrend = [68, 72, 70, 78, 82, 79, 86];

export function FleetDashboardPage({ onNavigate }: FleetDashboardPageProps) {
  const { can } = useFleetAuth();
  const {
    alerts,
    drivers,
    error,
    fuelEvents,
    loading,
    refreshFleetData,
    telematics,
    tasks,
    vehicles,
    workOrders,
  } = useOperationalData();

  const activeCount = vehicles.filter((vehicle) => vehicle.status === 'Active').length;
  const blockedVehicles = vehicles.filter((vehicle) => isVehicleBlocked(vehicle));
  const expiringDocs = vehicles.flatMap((vehicle) => vehicle.documents).filter((document) => document.status !== 'Valid').length;
  const openOrders = workOrders.filter((order) => order.status !== 'Completed').length;
  const flaggedFuel = fuelEvents.filter((event) => event.status !== 'Posted').length;
  const coachingRequired = drivers.filter((driver) => driver.coachingStatus === 'Coaching Required').length;
  const averageUtilization = average(vehicles.map((vehicle) => vehicle.utilization));
  const onlineTelematics = telematics.filter((signal) => signal.deviceStatus === 'Online').length;
  const maintenanceUnavailable = vehicles.filter((vehicle) => vehicle.status === 'Maintenance').length;
  const maintenanceDispatchImpact = workOrders.filter((order) => order.status !== 'Completed' && (order.priority === 'High' || order.approvalStatus === 'Pending')).length;
  const dispatchReady = Math.max(0, vehicles.length - blockedVehicles.length);
  const dispatchReadinessScore = Math.round((dispatchReady / Math.max(1, vehicles.length)) * 100);
  const fleetHealthScore = Math.max(0, Math.round(92 - expiringDocs * 5 - openOrders * 3 - flaggedFuel * 4 - coachingRequired * 6));
  const telemetryHealth = telematics.length === 0 ? 'No feed' : onlineTelematics === telematics.length ? 'Healthy' : `Partial (${onlineTelematics}/${telematics.length} active)`;
  const criticalActions = buildCriticalActionsFromTasks(tasks);

  const navigateToRoute = (page: AppPage, mode: FleetRouteMode = 'list', id?: string) => {
    window.location.hash = page === 'my-tasks' && id ? id : buildFleetHash(page, mode, id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-col gap-5 p-6 lg:flex-row lg:items-start lg:justify-between lg:p-7">
          <div>
            <p className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-accent">
              <Sparkles className="h-4 w-4" />
              Fleet Control Tower
            </p>
            <h1 className="mt-3 text-3xl font-extrabold text-text lg:text-4xl">Optimile Control Dashboard</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-600">
              Daily command view for dispatch blockers, compliance gates, maintenance impact, fuel anomalies, and driver readiness.
            </p>
          </div>
          <div className="flex flex-col items-start gap-3 lg:items-end">
            <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm">
              <p className="font-bold text-text">Last sync: 2 mins ago</p>
              <p className="mt-1 font-semibold text-gray-500">Telemetry: {telemetryHealth}</p>
            </div>
            <Button
              disabled={loading}
              icon={<RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />}
              onClick={() => void refreshFleetData()}
              variant="outline"
            >
              Refresh
            </Button>
          </div>
        </div>

        {error && (
          <div className="mx-6 mb-6 rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm font-semibold text-warning lg:mx-7">
            {error}
          </div>
        )}
      </section>

      <CriticalActionsStrip actions={criticalActions} onNavigate={navigateToRoute} />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <HeroKpi
          icon={<Gauge className="h-5 w-5" />}
          insight={fleetHealthScore >= 80 ? '+5% from yesterday' : 'Risk drag from open exceptions'}
          label="Fleet Health"
          microAction="Open command view"
          onClick={() => onNavigate('ops-intelligence')}
          tone={fleetHealthScore >= 75 ? 'success' : 'warning'}
          trend={fleetHealthScore >= 80 ? '↑ stable' : '↓ watch'}
          value={`${fleetHealthScore}/100`}
        />
        <HeroKpi
          icon={<Truck className="h-5 w-5" />}
          insight={`${blockedVehicles.length} vehicles blocking dispatch`}
          label="Dispatch Readiness"
          microAction="View blocked vehicles"
          onClick={() => onNavigate('dispatch-console')}
          tone={blockedVehicles.length > 0 ? 'warning' : 'success'}
          trend={`${dispatchReadinessScore}% ready`}
          value={`${dispatchReady}/${vehicles.length}`}
        />
        <HeroKpi
          icon={<ShieldCheck className="h-5 w-5" />}
          insight={expiringDocs > 0 ? 'Dispatch gate requires document action' : 'No document gate blocking dispatch'}
          label="Compliance Risk"
          microAction="Resolve documents"
          onClick={() => onNavigate('compliance')}
          tone={expiringDocs > 0 ? 'danger' : 'success'}
          trend={expiringDocs > 0 ? '↑ risk' : '↓ clear'}
          value={expiringDocs.toString()}
        />
        <HeroKpi
          icon={<Wrench className="h-5 w-5" />}
          insight={`${maintenanceDispatchImpact} impacting dispatch today`}
          label="Maintenance Impact"
          microAction="Review work orders"
          onClick={() => onNavigate('maintenance')}
          tone={maintenanceDispatchImpact > 0 ? 'danger' : 'primary'}
          trend={`${maintenanceUnavailable} unavailable`}
          value={maintenanceUnavailable.toString()}
        />
      </section>

      <section className="grid gap-6 2xl:grid-cols-[minmax(0,1fr)_420px]">
        <RiskTable
          alerts={alerts}
          drivers={drivers}
          fuelEvents={fuelEvents}
          onNavigate={navigateToRoute}
          vehicles={vehicles}
          workOrders={workOrders}
        />
        <LiveSnapshot onNavigate={navigateToRoute} telematics={telematics} />
      </section>

      <QuickActions
        actions={[
          can(ACTION_PERMISSIONS.createVehicle) ? { label: 'Add Vehicle', page: 'vehicle-management' as AppPage, detail: 'Create a new fleet asset', mode: 'create' as FleetRouteMode } : null,
          can(ACTION_PERMISSIONS.createDriver) ? { label: 'Add Driver', page: 'driver-management' as AppPage, detail: 'Onboard driver profile', mode: 'create' as FleetRouteMode } : null,
          can(ACTION_PERMISSIONS.createWorkOrder) ? { label: 'Create Work Order', page: 'maintenance' as AppPage, detail: 'Start repair or PM workflow', mode: 'create' as FleetRouteMode } : null,
        ].filter(Boolean) as Array<{ label: string; page: AppPage; detail: string; mode: FleetRouteMode }>}
        onNavigate={navigateToRoute}
      />

      <TrendsSection
        averageUtilization={averageUtilization}
        maintenanceDispatchImpact={maintenanceDispatchImpact}
        maintenanceUnavailable={maintenanceUnavailable}
        onNavigate={() => onNavigate('dispatch-console')}
        workOrders={workOrders}
      />
    </div>
  );
}

function average(values: number[]) {
  if (values.length === 0) return 0;
  return Math.round(values.reduce((total, value) => total + value, 0) / values.length);
}

function isVehicleBlocked(vehicle: Vehicle) {
  return vehicle.status !== 'Active' || vehicle.documents.some((document) => document.status !== 'Valid');
}

function severityTone(severity: Severity) {
  if (severity === 'Critical') return 'border-danger/30 bg-danger/10 text-danger';
  if (severity === 'High') return 'border-warning/30 bg-warning/10 text-warning';
  return 'border-primary/30 bg-primary/10 text-primary';
}

function buildCriticalActions({
  alerts,
  drivers,
  fuelEvents,
  telematics,
  vehicles,
  workOrders,
}: {
  alerts: FleetAlert[];
  drivers: FleetDriver[];
  fuelEvents: FuelEvent[];
  telematics: TelematicsSignal[];
  vehicles: Vehicle[];
  workOrders: MaintenanceWorkOrder[];
}): ControlTowerAction[] {
  const blockedVehicle = vehicles.find((vehicle) => isVehicleBlocked(vehicle));
  const blockedDocument = blockedVehicle?.documents.find((document) => document.status !== 'Valid');
  const highCostOrder = workOrders
    .filter((order) => order.status !== 'Completed')
    .sort((a, b) => (b.estimatedCost ?? 0) - (a.estimatedCost ?? 0))
    .find((order) => (order.estimatedCost ?? 0) > 50000 || order.approvalStatus === 'Pending' || Boolean(order.approvalRequired));
  const coachingDriver = drivers.find((driver) => driver.coachingStatus === 'Coaching Required');
  const fuelAnomaly = fuelEvents.find((event) => event.status !== 'Posted');
  const priorityAlert = [...alerts].sort((a, b) => severityRank(getAlertSeverity(b)) - severityRank(getAlertSeverity(a)))[0];
  const telemetryFault = telematics.find((signal) => signal.deviceStatus === 'Fault' || signal.deviceStatus === 'Offline');

  return [
    priorityAlert && {
      id: `alert-${priorityAlert.id}`,
      title: priorityAlert.title,
      severity: getAlertSeverity(priorityAlert),
      description: priorityAlert.detail,
      actionLabel: priorityAlert.source === 'Compliance' ? 'Clear Compliance' : 'Resolve Exception',
      assignedTo: priorityAlert.assignedTo ?? priorityAlert.recipient,
      dueLabel: getAlertSeverity(priorityAlert) === 'Critical' ? 'Overdue' : 'SLA 2h',
      overdue: getAlertSeverity(priorityAlert) === 'Critical',
      page: 'exception-center' as AppPage,
      mode: 'detail' as FleetRouteMode,
      rank: severityRank(getAlertSeverity(priorityAlert)) * 10,
      recordId: priorityAlert.id,
    },
    blockedVehicle && {
      id: `vehicle-${blockedVehicle.id}`,
      title: `${blockedVehicle.registrationNo} blocked for dispatch`,
      severity: blockedVehicle.status === 'Inactive' || blockedVehicle.documents.some((document) => document.status === 'Expired') ? 'Critical' : 'High',
      description: blockedVehicle.status !== 'Active' ? `Vehicle status is ${blockedVehicle.status}.` : 'Document compliance needs attention before dispatch.',
      actionLabel: blockedDocument ? `Upload ${blockedDocument.name}` : 'View Blocker',
      assignedTo: 'Fleet Executive',
      dueLabel: blockedDocument?.status === 'Expired' ? 'Overdue' : 'Due 10:30 AM',
      overdue: blockedDocument?.status === 'Expired',
      page: blockedDocument ? 'compliance' as AppPage : 'vehicle-management' as AppPage,
      mode: 'detail' as FleetRouteMode,
      rank: blockedDocument?.status === 'Expired' ? 31 : 24,
      recordId: blockedVehicle.id,
    },
    highCostOrder && {
      id: `wo-${highCostOrder.id}`,
      title: 'High-cost work order needs approval',
      severity: 'High' as Severity,
      description: `${highCostOrder.vehicleRegistration}: ${highCostOrder.title} ${highCostOrder.estimatedCost ? `(Rs ${highCostOrder.estimatedCost.toLocaleString()})` : ''}`,
      actionLabel: 'Approve Work Order',
      assignedTo: highCostOrder.approvalRequired ?? 'Garage Manager',
      dueLabel: 'SLA 4h',
      page: 'maintenance' as AppPage,
      mode: 'detail' as FleetRouteMode,
      rank: 22,
      recordId: highCostOrder.id,
    },
    coachingDriver && {
      id: `driver-${coachingDriver.id}`,
      title: `${coachingDriver.name} requires coaching`,
      severity: 'Medium' as Severity,
      description: `Behavior score ${coachingDriver.behaviorScore}/100 is below the preferred threshold.`,
      actionLabel: 'Assign Driver',
      assignedTo: 'Fleet Manager',
      dueLabel: 'Due today',
      page: 'driver-management' as AppPage,
      mode: 'detail' as FleetRouteMode,
      rank: 12,
      recordId: coachingDriver.id,
    },
    fuelAnomaly && {
      id: `fuel-${fuelAnomaly.id}`,
      title: 'Fuel anomaly requires review',
      severity: fuelAnomaly.status === 'Flagged' ? 'High' : 'Medium',
      description: `${fuelAnomaly.vehicleRegistration}: ${fuelAnomaly.flags[0] ?? 'Variance detected'}.`,
      actionLabel: 'Review Fuel Variance',
      assignedTo: 'Finance Reviewer',
      dueLabel: fuelAnomaly.status === 'Flagged' ? 'SLA 1h' : 'Due today',
      page: 'fuel-energy' as AppPage,
      mode: 'detail' as FleetRouteMode,
      rank: fuelAnomaly.status === 'Flagged' ? 23 : 11,
      recordId: fuelAnomaly.id,
    },
    telemetryFault && {
      id: `telemetry-${telemetryFault.id}`,
      title: `${telemetryFault.vehicleRegistration} telemetry ${telemetryFault.deviceStatus.toLowerCase()}`,
      severity: telemetryFault.deviceStatus === 'Offline' ? 'High' as Severity : 'Medium' as Severity,
      description: `${telemetryFault.location} has not reported clean telemetry. Last ping ${telemetryFault.lastPingSeconds}s ago.`,
      actionLabel: 'Raise Alert',
      assignedTo: 'Control Room',
      dueLabel: telemetryFault.deviceStatus === 'Offline' ? 'SLA 1h' : 'Due today',
      page: 'alert-management' as AppPage,
      mode: 'create' as FleetRouteMode,
      rank: telemetryFault.deviceStatus === 'Offline' ? 21 : 10,
      recordId: telemetryFault.vehicleId,
    },
  ]
    .filter(Boolean)
    .sort((a, b) => (b as ControlTowerAction).rank - (a as ControlTowerAction).rank)
    .slice(0, 6) as ControlTowerAction[];
}

function severityRank(severity: Severity) {
  return { Critical: 3, High: 2, Medium: 1 }[severity];
}

function buildCriticalActionsFromTasks(tasks: FleetTask[]): ControlTowerAction[] {
  return tasks
    .filter((task) => task.status !== 'Completed')
    .slice(0, 6)
    .map((task) => ({
      id: task.id,
      actionLabel: 'Open Task',
      assignedTo: task.assignedTo,
      description: `${task.type} task for ${task.relatedEntityLabel}`,
      dueLabel: isTaskOverdue(task) ? 'Overdue' : formatDueLabel(task.dueAt),
      mode: 'list' as FleetRouteMode,
      overdue: isTaskOverdue(task),
      page: 'my-tasks' as AppPage,
      rank: severityRank(task.severity) * 10 + (isTaskOverdue(task) ? 5 : 0),
      recordId: getTaskEntityPath(task),
      severity: task.severity,
      status: task.status,
      title: task.title,
    }));
}

function formatDueLabel(value: string) {
  return new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}

function CriticalActionsStrip({
  actions,
  onNavigate,
}: {
  actions: ControlTowerAction[];
  onNavigate: (page: AppPage, mode?: FleetRouteMode, id?: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const topActions = actions.slice(0, 3);
  const moreActions = actions.slice(3);
  const visibleActions = expanded ? [...topActions, ...moreActions] : topActions;

  return (
    <section className="rounded-xl border border-danger/30 bg-danger/5 p-5 shadow-sm">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-text">🚨 Today’s Critical Actions</h2>
          <p className="mt-1 text-sm font-semibold text-gray-600">Fix these first to keep dispatch moving.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-danger shadow-sm">{actions.length} active</span>
          {moreActions.length > 0 && (
            <Button
              className="h-8 px-3 text-xs"
              icon={expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              onClick={() => setExpanded((open) => !open)}
              variant="outline"
            >
              {expanded ? 'Show less' : `+${moreActions.length} more`}
            </Button>
          )}
        </div>
      </div>
      <div className="grid gap-3 xl:grid-cols-3">
        {actions.length > 0 ? (
          visibleActions.map((action, index) => {
            const dominant = index === 0;
            return (
              <article
                className={`rounded-xl border bg-white p-4 shadow-sm ${dominant ? 'border-danger/40 ring-2 ring-danger/10 xl:col-span-1' : 'border-gray-200'}`}
                key={action.id}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className={`inline-flex rounded-full border px-2 py-1 text-xs font-bold ${severityTone(action.severity)}`}>
                    {action.severity}
                  </span>
                  <span className={`text-xs font-extrabold ${action.overdue ? 'text-danger' : 'text-gray-500'}`}>{action.dueLabel}</span>
                </div>
                <h3 className={`${dominant ? 'text-base' : 'text-sm'} mt-3 font-extrabold text-text`}>{action.title}</h3>
                <p className="mt-2 min-h-10 text-xs leading-5 text-gray-600">{action.description}</p>
                <div className="mt-3 rounded-lg bg-gray-50 px-3 py-2 text-xs">
                  <p className="font-bold text-gray-700">Assigned to</p>
                  <p className="mt-0.5 font-semibold text-gray-500">{action.assignedTo}</p>
                  {action.status && <p className="mt-1 font-bold text-primary">{action.status}</p>}
                </div>
                <Button className="mt-4 h-9 w-full justify-center px-3 text-xs" onClick={() => onNavigate(action.page, action.mode, action.recordId)}>
                  {action.actionLabel}
                </Button>
              </article>
            );
          })
        ) : (
          <div className="rounded-xl border border-success/30 bg-white p-4 text-sm font-semibold text-success xl:col-span-3">
            No critical action is blocking fleet operations right now.
          </div>
        )}
      </div>
    </section>
  );
}

function HeroKpi({
  icon,
  insight,
  label,
  microAction,
  onClick,
  tone,
  trend,
  value,
}: {
  icon: ReactNode;
  insight: string;
  label: string;
  microAction: string;
  onClick: () => void;
  tone: 'primary' | 'success' | 'warning' | 'danger';
  trend: string;
  value: string;
}) {
  const tones = {
    primary: 'text-primary bg-primary/10',
    success: 'text-success bg-success/10',
    warning: 'text-warning bg-warning/10',
    danger: 'text-danger bg-danger/10',
  };

  return (
    <button className="rounded-xl border border-gray-200 bg-white p-5 text-left shadow-sm transition hover:border-secondary hover:shadow-md" onClick={onClick} type="button">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-gray-500">{label}</p>
          <p className="mt-3 text-3xl font-extrabold text-text">{value}</p>
        </div>
        <span className={`rounded-xl p-3 ${tones[tone]}`}>{icon}</span>
      </div>
      <div className="mt-4 flex items-center justify-between gap-3">
        <span className={`rounded-full px-2 py-1 text-xs font-bold ${tones[tone]}`}>{trend}</span>
        <ArrowRight className="h-4 w-4 text-gray-400" />
      </div>
      <p className="mt-3 text-xs font-semibold leading-5 text-gray-600">{insight}</p>
      <span className="mt-4 inline-flex items-center gap-2 text-xs font-extrabold text-secondary">
        {microAction}
        <ArrowRight className="h-3.5 w-3.5" />
      </span>
    </button>
  );
}

function TrendsSection({
  averageUtilization,
  maintenanceDispatchImpact,
  maintenanceUnavailable,
  onNavigate,
  workOrders,
}: {
  averageUtilization: number;
  maintenanceDispatchImpact: number;
  maintenanceUnavailable: number;
  onNavigate: () => void;
  workOrders: MaintenanceWorkOrder[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <button className="flex w-full items-center justify-between text-left" onClick={() => setOpen((value) => !value)} type="button">
        <div>
          <p className="text-sm font-semibold text-secondary">Trends</p>
          <h2 className="text-lg font-bold text-text">View Trends</h2>
        </div>
        {open ? <ChevronUp className="h-5 w-5 text-primary" /> : <ChevronDown className="h-5 w-5 text-primary" />}
      </button>
      {open && (
        <div className="mt-5 grid gap-6 xl:grid-cols-2 animate-in fade-in duration-300">
          <TrendPanel
            accent="bg-secondary"
            data={utilizationTrend}
            label="7-Day Utilization"
            onClick={onNavigate}
            summary={`${averageUtilization}% fleet average`}
            title="Utilization Momentum"
          />
          <MaintenanceImpactPanel impactCount={maintenanceDispatchImpact} unavailableCount={maintenanceUnavailable} workOrders={workOrders} />
        </div>
      )}
    </section>
  );
}

function TrendPanel({
  accent,
  data,
  label,
  onClick,
  summary,
  title,
}: {
  accent: string;
  data: number[];
  label: string;
  onClick: () => void;
  summary: string;
  title: string;
}) {
  const max = Math.max(...data);
  const min = Math.min(...data);

  return (
    <button className="rounded-xl border border-gray-200 bg-white p-5 text-left shadow-sm transition hover:border-secondary hover:shadow-md" onClick={onClick} type="button">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-semibold text-secondary">{label}</p>
          <h2 className="mt-1 text-lg font-bold text-text">{title}</h2>
        </div>
        <span className="rounded-full bg-success/10 px-2 py-1 text-xs font-bold text-success">Daily</span>
      </div>
      <div className="mt-6 flex h-32 items-end gap-2">
        {data.map((value, index) => {
          const height = 32 + ((value - min) / Math.max(1, max - min)) * 88;
          return (
            <div className="flex flex-1 flex-col items-center gap-2" key={`${value}-${index}`}>
              <div className="flex h-28 w-full items-end rounded-lg bg-gray-100 px-1">
                <div className={`w-full rounded-md ${accent}`} style={{ height }} />
              </div>
              <span className="text-[11px] font-semibold text-gray-400">D{index + 1}</span>
            </div>
          );
        })}
      </div>
      <p className="mt-4 text-sm font-semibold text-gray-600">{summary}</p>
    </button>
  );
}

function MaintenanceImpactPanel({
  impactCount,
  unavailableCount,
  workOrders,
}: {
  impactCount: number;
  unavailableCount: number;
  workOrders: MaintenanceWorkOrder[];
}) {
  const openOrders = workOrders.filter((order) => order.status !== 'Completed');
  const highPriority = openOrders.filter((order) => order.priority === 'High').length;
  const approvalPending = openOrders.filter((order) => order.approvalStatus === 'Pending' || Boolean(order.approvalRequired)).length;

  return (
    <article className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-semibold text-secondary">Maintenance Impact</p>
      <h2 className="mt-1 text-lg font-bold text-text">{unavailableCount} vehicles unavailable due to maintenance</h2>
      <p className="mt-2 text-sm font-semibold text-gray-600">{impactCount} work orders are directly impacting dispatch decisions.</p>
      <div className="mt-5 space-y-3">
        {[
          { label: 'Open work orders', value: openOrders.length, tone: 'bg-warning' },
          { label: 'High priority', value: highPriority, tone: 'bg-danger' },
          { label: 'Approval pending', value: approvalPending, tone: 'bg-accent' },
        ].map((item) => (
          <div className="grid grid-cols-[140px_minmax(0,1fr)_36px] items-center gap-3 text-sm" key={item.label}>
            <span className="font-semibold text-gray-600">{item.label}</span>
            <div className="h-2 rounded-full bg-gray-100">
              <div className={`h-2 rounded-full ${item.tone}`} style={{ width: `${Math.min(100, (item.value / Math.max(1, openOrders.length)) * 100)}%` }} />
            </div>
            <span className="text-right font-bold text-text">{item.value}</span>
          </div>
        ))}
      </div>
    </article>
  );
}

function RiskTable({
  alerts,
  drivers,
  fuelEvents,
  onNavigate,
  vehicles,
  workOrders,
}: {
  alerts: FleetAlert[];
  drivers: FleetDriver[];
  fuelEvents: FuelEvent[];
  onNavigate: (page: AppPage, mode?: FleetRouteMode, id?: string) => void;
  vehicles: Vehicle[];
  workOrders: MaintenanceWorkOrder[];
}) {
  const [criticalOnly, setCriticalOnly] = useState(false);
  const rows = [
    ...alerts.slice(0, 2).map((alert) => ({
      id: alert.id,
      item: alert.title,
      owner: alert.assignedTo ?? alert.recipient,
      risk: getAlertSeverity(alert),
      action: alert.source === 'Compliance' ? 'Clear Compliance' : 'Resolve',
      page: 'exception-center' as AppPage,
      severity: getAlertSeverity(alert) as Severity,
    })),
    ...fuelEvents.filter((event) => event.status !== 'Posted').slice(0, 1).map((event) => ({
      id: event.id,
      item: event.vehicleRegistration,
      owner: 'Fleet + Finance',
      risk: event.status,
      action: 'Review Fuel Variance',
      page: 'fuel-energy' as AppPage,
      severity: event.status === 'Flagged' ? 'High' as Severity : 'Medium' as Severity,
    })),
    ...drivers.filter((driver) => driver.coachingStatus !== 'None').slice(0, 1).map((driver) => ({
      id: driver.id,
      item: driver.name,
      owner: 'Fleet Manager',
      risk: driver.coachingStatus,
      action: 'Assign Driver',
      page: 'driver-management' as AppPage,
      severity: 'Medium' as Severity,
    })),
    ...workOrders.filter((order) => order.status !== 'Completed').slice(0, 1).map((order) => ({
      id: order.id,
      item: order.vehicleRegistration,
      owner: order.approvalRequired ?? order.technician,
      risk: order.priority,
      action: order.approvalStatus === 'Pending' || order.approvalRequired ? 'Approve Work Order' : 'Assign Technician',
      page: 'maintenance' as AppPage,
      severity: order.priority === 'High' ? 'High' as Severity : 'Medium' as Severity,
    })),
  ].sort((a, b) => severityRank(b.severity) - severityRank(a.severity));
  const visibleRows = criticalOnly ? rows.filter((row) => row.severity === 'Critical') : rows;
  const primaryRowId = rows[0]?.id;

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <p className="text-sm font-semibold text-secondary">Exception Desk</p>
          <h2 className="text-lg font-bold text-text">Priority Action Table</h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button className="h-8 px-3 text-xs" onClick={() => setCriticalOnly((value) => !value)} variant={criticalOnly ? 'primary' : 'outline'}>
            Critical only
          </Button>
          <Button className="h-8 px-3 text-xs" onClick={() => onNavigate('maintenance')} variant="outline">
            Approve all
          </Button>
          <Button className="h-8 px-3 text-xs" onClick={() => onNavigate('dispatch-console')} variant="outline">
            Assign all
          </Button>
          <span className="rounded-full bg-danger/10 px-3 py-1 text-xs font-bold text-danger">
            {vehicles.length} assets monitored
          </span>
        </div>
      </div>
      <div className="overflow-hidden rounded-xl border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {['Item', 'Risk', 'Owner', 'Action'].map((heading) => (
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-gray-500" key={heading}>{heading}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {visibleRows.map((row) => (
              <tr
                className={`cursor-pointer hover:bg-gray-50 ${row.id === primaryRowId ? 'bg-danger/5' : ''}`}
                key={`${row.item}-${row.risk}`}
                onClick={() => onNavigate(row.page, 'detail', row.id)}
              >
                <td className="px-4 py-4 text-sm font-bold text-text">{row.item}</td>
                <td className="px-4 py-4">
                  <span className={`rounded-full px-2 py-1 text-xs font-bold ${row.severity === 'Critical' ? 'bg-danger/10 text-danger' : row.severity === 'High' ? 'bg-warning/10 text-warning' : 'bg-primary/10 text-primary'}`}>
                    {row.risk}
                  </span>
                </td>
                <td className="px-4 py-4 text-sm text-gray-600">{row.owner}</td>
                <td className="px-4 py-4">
                  <Button
                    onClick={(event) => {
                      event.stopPropagation();
                      onNavigate(row.page, 'detail', row.id);
                    }}
                    className="h-8 px-3 text-xs"
                    variant="outline"
                  >
                    {row.action}
                  </Button>
                </td>
              </tr>
            ))}
            {visibleRows.length === 0 && (
              <tr>
                <td className="px-4 py-6 text-sm font-semibold text-gray-500" colSpan={4}>
                  No critical rows match the current filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function LiveSnapshot({
  onNavigate,
  telematics,
}: {
  onNavigate: (page: AppPage, mode?: FleetRouteMode, id?: string) => void;
  telematics: TelematicsSignal[];
}) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-secondary">Live Map Feed</p>
          <h2 className="text-lg font-bold text-text">Telemetry Snapshot</h2>
        </div>
        <MapPinned className="h-5 w-5 text-primary" />
      </div>
      <div className="space-y-3">
        {telematics.map((signal) => (
          <article className="rounded-xl border border-gray-200 bg-gray-50 p-4" key={signal.id}>
            <button className="w-full text-left" onClick={() => onNavigate('vehicle-management', 'detail', signal.vehicleId)} type="button">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-bold text-text">{signal.vehicleRegistration}</p>
                  <p className="text-sm text-gray-500">{signal.location}</p>
                </div>
                <span className={`rounded-full px-2 py-1 text-xs font-bold ${signal.deviceStatus === 'Online' ? 'bg-success/10 text-success' : signal.deviceStatus === 'Fault' ? 'bg-warning/10 text-warning' : 'bg-danger/10 text-danger'}`}>
                  {signal.deviceStatus}
                </span>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
                <div><p className="text-xs text-gray-500">Speed</p><p className="font-bold">{signal.speedKmph} km/h</p></div>
                <div><p className="text-xs text-gray-500">Fuel</p><p className="font-bold">{signal.fuelLevelPercent}%</p></div>
                <div><p className="text-xs text-gray-500">Ping</p><p className="font-bold">{signal.lastPingSeconds}s</p></div>
              </div>
            </button>
            <div className="mt-4 grid grid-cols-3 gap-2">
              <Button className="h-8 px-2 text-xs" onClick={() => onNavigate('vehicle-management', 'detail', signal.vehicleId)} variant="outline">View Vehicle</Button>
              <Button className="h-8 px-2 text-xs" onClick={() => onNavigate('dispatch-console')} variant="outline">Assign</Button>
              <Button
                className="h-8 px-2 text-xs"
                disabled={signal.deviceStatus === 'Online'}
                onClick={() => onNavigate('alert-management', 'create')}
                variant={signal.deviceStatus === 'Online' ? 'ghost' : 'outline'}
              >
                Raise Alert
              </Button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function QuickActions({
  actions,
  onNavigate,
}: {
  actions: Array<{ label: string; page: AppPage; detail: string; mode: FleetRouteMode }>;
  onNavigate: (page: AppPage, mode?: FleetRouteMode) => void;
}) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-secondary">Quick Actions</p>
          <h2 className="text-lg font-bold text-text">Start common fleet workflows</h2>
        </div>
        <ClipboardCheck className="h-5 w-5 text-primary" />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {actions.map((action) => (
          <button
            className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 p-4 text-left transition hover:border-secondary hover:bg-white"
            key={action.label}
            onClick={() => onNavigate(action.page, action.mode)}
            type="button"
          >
            <span>
              <span className="flex items-center gap-2 font-bold text-text">
                <Plus className="h-4 w-4 text-accent" />
                {action.label}
              </span>
              <span className="mt-1 block text-xs font-semibold text-gray-500">{action.detail}</span>
            </span>
            <ArrowRight className="h-4 w-4 text-secondary" />
          </button>
        ))}
      </div>
    </section>
  );
}
