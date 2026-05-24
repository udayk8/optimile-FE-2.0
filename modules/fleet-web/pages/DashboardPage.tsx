import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Vehicle, VehicleStatus, ExceptionSeverity, DocumentStatus } from '../types';
import { VehicleAPI, ExceptionAPI, MaintenanceAPI, EnergyAPI, ComplianceAPI, ConfidenceAPI, SyncAPI, TyreAPI } from '../services/mockDatabase';
import { IconCheck, IconAlert, IconWrench, IconZap, IconCircleDollar, IconTruck, IconArrowRight, IconSiren, IconTrendUp, IconTyre, IconMapPin, IconDroplet } from '../components/Icons';
import { VehicleDetailsPage } from './VehicleDetailsPage';
import { AIInsightsPanel, type AIInsightItem } from '../components/AIInsightsPanel';

interface DashboardPageProps {
  onNavigate: (tab: any) => void;
}

// ── Small reusable primitives ────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  accent,
  icon,
  alert,
  onClick,
}: {
  label: string;
  value: React.ReactNode;
  sub?: string;
  accent: string;        // Tailwind border-l color, e.g. 'border-emerald-500'
  icon: React.ReactNode;
  alert?: boolean;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`relative flex flex-col gap-3 rounded-xl border border-gray-100 bg-white p-5 shadow-sm transition-shadow hover:shadow-md ${onClick ? 'cursor-pointer' : ''} border-l-4 ${accent} ${alert ? 'bg-red-50' : ''}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-widest text-gray-400">{label}</span>
        <span className="text-gray-300">{icon}</span>
      </div>
      <div className="flex items-end gap-1.5">
        <span className="text-3xl font-bold leading-none text-gray-900">{value}</span>
        {sub && <span className="mb-0.5 text-xs text-gray-400">{sub}</span>}
      </div>
    </div>
  );
}

function SectionHeader({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <h2 className="text-sm font-semibold uppercase tracking-widest text-gray-400">{title}</h2>
      {action && (
        <button onClick={onAction} className="flex items-center gap-1 text-xs font-medium text-primary-600 hover:text-primary-800">
          {action}
          <IconArrowRight className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate }) => {
  const [loading, setLoading] = useState(true);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [showEnergyCostWarning, setShowEnergyCostWarning] = useState(false);
  const isFirstLoad = useRef(true);

  const [kpiData, setKpiData] = useState({
    availabilityPct: 0,
    vehiclesAtRisk: 0,
    costHealth: { healthy: 0, watch: 0, critical: 0 },
    energyRiskCount: 0,
    maintenanceDueCount: 0,
    totalFleet: 0,
  });

  const [intelData, setIntelData] = useState({
    avgKmpl: '0.0',
    adBlueCompliance: 0,
    chronicBreakdowns: 0,
    tyreAlerts: 0,
  });

  const [buckets, setBuckets] = useState({
    healthy: 0, atRisk: 0, maintenance: 0, nonCompliant: 0, offline: 0,
  });

  const [mapVehicles, setMapVehicles] = useState<{ vehicle: Vehicle; status: string }[]>([]);
  const [liveAlerts, setLiveAlerts] = useState<{ id: string; message: string; severity: 'Critical' | 'High' | 'Medium'; type: string }[]>([]);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  useEffect(() => {
    loadHealthData();
    const interval = setInterval(loadHealthData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadHealthData = async () => {
    if (isFirstLoad.current) setLoading(true);
    try {
      const [vehicles, exceptions, schedules, energyAnomalies, documents, energySync, maintKPIs, tyreSignals] = await Promise.all([
        VehicleAPI.getAll(),
        ExceptionAPI.getAll(),
        MaintenanceAPI.getSchedules(),
        EnergyAPI.getAnomalies(),
        ComplianceAPI.getAllDocuments(),
        SyncAPI.getEnergySummary(),
        MaintenanceAPI.getDashboardKPIs(),
        TyreAPI.getHealthSignals(),
      ]);

      const totalVehicles = vehicles.length;
      const nonCompliantVehicleIds = new Set(documents.filter(d => d.status !== DocumentStatus.VALID).map(d => d.vehicle_id));
      const availableVehicles = vehicles.filter(v => v.status === VehicleStatus.ACTIVE && !nonCompliantVehicleIds.has(v.vehicle_id)).length;
      const availabilityPct = totalVehicles > 0 ? Math.round((availableVehicles / totalVehicles) * 100) : 0;

      const riskyVehicleIds = new Set(exceptions.filter(e => e.severity === ExceptionSeverity.CRITICAL || e.severity === ExceptionSeverity.HIGH).map(e => e.entity_id));
      const energyRiskVehicleIds = new Set(energyAnomalies.map(a => a.vehicle_id));
      const maintenanceDueCount = schedules.filter(s => s.status === 'Due' || s.status === 'Overdue').length;

      let costHealthy = 0, costWatch = 0, costCritical = 0;
      await Promise.all(vehicles.map(async v => {
        const conf = await ConfidenceAPI.getVehicleConfidence(v.vehicle_id);
        if (conf.score === 'High') costHealthy++;
        else if (conf.score === 'Medium') costWatch++;
        else costCritical++;
      }));

      setKpiData({ availabilityPct, vehiclesAtRisk: riskyVehicleIds.size, costHealth: { healthy: costHealthy, watch: costWatch, critical: costCritical }, energyRiskCount: energyRiskVehicleIds.size, maintenanceDueCount, totalFleet: totalVehicles });

      const totalKmpl = energySync.reduce((acc, curr) => acc + curr.avg_kpl, 0);
      const compliantAdBlue = energySync.filter(s => s.adblue_compliance_status === 'Compliant').length;
      const tyreAlertVehicles = new Set(tyreSignals.filter(s => s.abnormal_wear).map(s => s.vehicle_id));
      setIntelData({ avgKmpl: energySync.length > 0 ? (totalKmpl / energySync.length).toFixed(1) : '0.0', adBlueCompliance: energySync.length > 0 ? Math.round((compliantAdBlue / energySync.length) * 100) : 0, chronicBreakdowns: maintKPIs.chronic_vehicles.length, tyreAlerts: tyreAlertVehicles.size });

      let bHealthy = 0, bRisk = 0, bMaint = 0, bNonComp = 0, bOffline = 0;
      const mapData: { vehicle: Vehicle; status: string }[] = [];
      vehicles.forEach(v => {
        let status = 'healthy';
        if (v.status === VehicleStatus.MAINTENANCE) { bMaint++; status = 'maintenance'; }
        else if (v.status === VehicleStatus.INACTIVE || v.status === VehicleStatus.DRAFT) { bOffline++; status = 'offline'; }
        else if (nonCompliantVehicleIds.has(v.vehicle_id)) { bNonComp++; status = 'nonCompliant'; }
        else if (riskyVehicleIds.has(v.vehicle_id) || energyRiskVehicleIds.has(v.vehicle_id)) { bRisk++; status = 'atRisk'; }
        else bHealthy++;
        mapData.push({ vehicle: v, status });
      });
      setBuckets({ healthy: bHealthy, atRisk: bRisk, maintenance: bMaint, nonCompliant: bNonComp, offline: bOffline });
      setMapVehicles(mapData);

      const alerts: any[] = [];
      energyAnomalies.forEach(a => {
        const v = vehicles.find(veh => veh.vehicle_id === a.vehicle_id);
        alerts.push({ id: a.anomaly_id, message: `${a.anomaly_type} — ${v?.registration_number}`, severity: a.severity, type: 'fuel' });
      });
      exceptions.filter(e => e.status === 'Open' && e.severity === 'Critical').forEach(e => {
        const v = vehicles.find(veh => veh.vehicle_id === e.entity_id);
        alerts.push({ id: e.exception_id, message: `${e.exception_type}: ${v?.registration_number || 'Unknown'}`, severity: 'Critical', type: 'exception' });
      });
      schedules.filter(s => s.status === 'Overdue').forEach(s => {
        const v = vehicles.find(veh => veh.vehicle_id === s.vehicle_id);
        alerts.push({ id: s.schedule_id, message: `Maintenance overdue — ${v?.registration_number}`, severity: 'High', type: 'maintenance' });
      });
      setLiveAlerts(alerts.slice(0, 6));
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Dashboard Load Failed', error);
    } finally {
      if (isFirstLoad.current) { setLoading(false); isFirstLoad.current = false; }
    }
  };

  const aiInsights = useMemo<AIInsightItem[]>(() => ([
    {
      label: 'Readiness',
      title: 'Fleet readiness trend',
      metric: `${kpiData.availabilityPct}%`,
      tone: kpiData.availabilityPct >= 85 ? 'positive' : kpiData.availabilityPct >= 75 ? 'watch' : 'critical',
      description: `${buckets.healthy} of ${kpiData.totalFleet} vehicles are currently healthy.`,
      action: 'Plan dispatch from healthy and compliant vehicles first.',
    },
    {
      label: 'Risk',
      title: 'Risk stack is concentrated',
      metric: `${kpiData.vehiclesAtRisk + kpiData.energyRiskCount}`,
      tone: liveAlerts.length >= 4 || kpiData.vehiclesAtRisk > 0 ? 'critical' : 'watch',
      description: `${kpiData.vehiclesAtRisk} vehicles have major exceptions and ${kpiData.energyRiskCount} show energy anomalies.`,
      action: 'Review overlapping risk vehicles first.',
    },
    {
      label: 'Maintenance',
      title: 'Maintenance drag is building',
      metric: `${kpiData.maintenanceDueCount} due`,
      tone: intelData.chronicBreakdowns > 0 || intelData.tyreAlerts > 0 ? 'watch' : 'info',
      description: `${intelData.chronicBreakdowns} chronic breakdown vehicles and ${intelData.tyreAlerts} tyre alerts need attention.`,
      action: 'Prioritize overdue service and tyre-risk assets.',
    },
  ]), [buckets.healthy, intelData.chronicBreakdowns, intelData.tyreAlerts, kpiData.availabilityPct, kpiData.energyRiskCount, kpiData.maintenanceDueCount, kpiData.totalFleet, kpiData.vehiclesAtRisk, liveAlerts.length]);

  if (selectedVehicleId) {
    return <VehicleDetailsPage vehicleId={selectedVehicleId} onBack={() => setSelectedVehicleId(null)} />;
  }

  const handleDisabledEnergyCostClick = () => {
    setShowEnergyCostWarning(true);
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-primary-600" />
          <p className="text-sm text-gray-400">Analysing fleet health…</p>
        </div>
      </div>
    );
  }

  const activeVehicles = kpiData.totalFleet - buckets.offline - buckets.maintenance;

  return (
    <div className="space-y-6">

      {/* ── Command strip ──────────────────────────────────────────────── */}
      <div className="overflow-hidden rounded-2xl bg-[#0b1120] px-6 py-5 text-white shadow-lg">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Fleet Control Center</p>
            <h1 className="mt-0.5 text-xl font-bold text-white">Fleet Health Overview</h1>
            <p className="mt-0.5 text-xs text-slate-500">
              Last updated {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </p>
          </div>

          {/* Hero numbers */}
          <div className="flex items-center gap-6 divide-x divide-slate-700">
            <div className="pr-6 text-center">
              <p className="text-2xl font-bold text-white">{kpiData.totalFleet}</p>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Total Fleet</p>
            </div>
            <div className="px-6 text-center">
              <p className={`text-2xl font-bold ${kpiData.availabilityPct >= 85 ? 'text-emerald-400' : 'text-amber-400'}`}>
                {kpiData.availabilityPct}%
              </p>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Readiness</p>
            </div>
            <div className="pl-6 text-center">
              <p className={`text-2xl font-bold ${kpiData.vehiclesAtRisk > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                {kpiData.vehiclesAtRisk}
              </p>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">At Risk</p>
            </div>
          </div>
        </div>

        {/* Live alert ticker — only when alerts exist */}
        {liveAlerts.length > 0 && (
          <div className="mt-4 flex items-center gap-3 rounded-lg border border-red-900/60 bg-red-950/50 px-4 py-2.5">
            <div className="flex flex-shrink-0 items-center gap-1.5">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-400" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-red-400">Live</span>
            </div>
            <p
              className="flex-1 cursor-pointer truncate text-xs text-slate-300 hover:text-white"
              onClick={() => onNavigate('exceptions')}
            >
              {liveAlerts[0].message}
              {liveAlerts.length > 1 && (
                <span className="ml-2 text-slate-500">+{liveAlerts.length - 1} more</span>
              )}
            </p>
            <button onClick={() => onNavigate('exceptions')} className="flex-shrink-0 text-[10px] font-semibold text-red-400 hover:text-red-300">
              View all →
            </button>
          </div>
        )}
      </div>

      {/* ── KPI cards ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard
          label="Readiness"
          value={`${kpiData.availabilityPct}%`}
          sub="available"
          accent={kpiData.availabilityPct >= 85 ? 'border-emerald-500' : 'border-amber-400'}
          icon={<IconCheck className="h-4 w-4" />}
          onClick={() => onNavigate('fleet')}
        />
        <StatCard
          label="Ops Risk"
          value={kpiData.vehiclesAtRisk}
          sub="vehicles"
          accent={kpiData.vehiclesAtRisk > 0 ? 'border-red-500' : 'border-emerald-400'}
          icon={<IconAlert className="h-4 w-4" />}
          alert={kpiData.vehiclesAtRisk > 0}
          onClick={() => onNavigate('exceptions')}
        />
        <StatCard
          label="Maint. Due"
          value={kpiData.maintenanceDueCount}
          sub="vehicles"
          accent="border-orange-400"
          icon={<IconWrench className="h-4 w-4" />}
          onClick={() => onNavigate('maintenance')}
        />
        <StatCard
          label="Energy Alerts"
          value={kpiData.energyRiskCount}
          sub="active"
          accent="border-violet-500"
          icon={<IconZap className="h-4 w-4" />}
          onClick={() => onNavigate('fuel')}
        />
        {/* Cost health — split display */}
        <div
          onClick={() => onNavigate('cost')}
          className="cursor-pointer rounded-xl border border-gray-100 border-l-4 border-l-blue-400 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
        >
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-widest text-gray-400">Cost Health</span>
            <IconCircleDollar className="h-4 w-4 text-gray-300" />
          </div>
          <div className="flex items-end gap-2">
            <div className="text-center">
              <p className="text-xl font-bold text-emerald-600">{kpiData.costHealth.healthy}</p>
              <p className="text-[10px] text-gray-400">Good</p>
            </div>
            <div className="mb-1 text-xs text-gray-200">/</div>
            <div className="text-center">
              <p className="text-xl font-bold text-amber-500">{kpiData.costHealth.watch}</p>
              <p className="text-[10px] text-gray-400">Watch</p>
            </div>
            <div className="mb-1 text-xs text-gray-200">/</div>
            <div className="text-center">
              <p className="text-xl font-bold text-red-500">{kpiData.costHealth.critical}</p>
              <p className="text-[10px] text-gray-400">Critical</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Fleet status + Live alerts ─────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

        {/* Fleet Status Distribution (2 cols wide) */}
        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm lg:col-span-2">
          <SectionHeader title="Fleet Status Distribution" action="Fleet" onAction={() => onNavigate('fleet')} />

          {/* Stacked bar */}
          <div className="mb-5 flex h-3 w-full overflow-hidden rounded-full">
            {kpiData.totalFleet > 0 && (
              <>
                <div style={{ width: `${(buckets.healthy / kpiData.totalFleet) * 100}%` }} className="bg-emerald-500 transition-all" title="Healthy" />
                <div style={{ width: `${(buckets.atRisk / kpiData.totalFleet) * 100}%` }} className="bg-amber-400 transition-all" title="At Risk" />
                <div style={{ width: `${(buckets.maintenance / kpiData.totalFleet) * 100}%` }} className="bg-red-500 transition-all" title="Maintenance" />
                <div style={{ width: `${(buckets.nonCompliant / kpiData.totalFleet) * 100}%` }} className="bg-orange-400 transition-all" title="Non-Compliant" />
                <div style={{ width: `${(buckets.offline / kpiData.totalFleet) * 100}%` }} className="bg-gray-300 transition-all" title="Offline" />
              </>
            )}
          </div>

          {/* Bucket cards */}
          <div className="grid grid-cols-5 gap-3">
            {[
              { label: 'Healthy',      count: buckets.healthy,      color: 'bg-emerald-500', tab: 'fleet' },
              { label: 'At Risk',      count: buckets.atRisk,       color: 'bg-amber-400',   tab: 'exceptions' },
              { label: 'Maintenance',  count: buckets.maintenance,  color: 'bg-red-500',     tab: 'maintenance' },
              { label: 'Non-Compliant',count: buckets.nonCompliant, color: 'bg-orange-400',  tab: 'compliance' },
              { label: 'Offline',      count: buckets.offline,      color: 'bg-gray-300',    tab: 'fleet' },
            ].map((b) => (
              <div
                key={b.label}
                onClick={() => onNavigate(b.tab)}
                className="flex cursor-pointer flex-col items-center gap-1.5 rounded-lg border border-gray-100 py-3 transition-colors hover:bg-gray-50"
              >
                <span className={`h-2 w-2 rounded-full ${b.color}`} />
                <span className="text-xl font-bold text-gray-900">{b.count}</span>
                <span className="text-center text-[10px] font-medium leading-tight text-gray-400">{b.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Live Alerts feed (1 col) */}
        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <SectionHeader title="Live Alerts" action="All" onAction={() => onNavigate('exceptions')} />

          {liveAlerts.length === 0 ? (
            <div className="flex h-32 flex-col items-center justify-center gap-2 text-center">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-50">
                <IconCheck className="h-4 w-4 text-emerald-500" />
              </div>
              <p className="text-sm font-medium text-gray-600">All clear</p>
              <p className="text-xs text-gray-400">No active alerts</p>
            </div>
          ) : (
            <div className="space-y-2">
              {liveAlerts.map((alert) => (
                <div
                  key={alert.id}
                  onClick={() => onNavigate('exceptions')}
                  className="flex cursor-pointer items-start gap-3 rounded-lg border border-gray-50 p-3 transition-colors hover:bg-gray-50"
                >
                  <span className={`mt-0.5 h-2 w-2 flex-shrink-0 rounded-full ${
                    alert.severity === 'Critical' ? 'bg-red-500' :
                    alert.severity === 'High' ? 'bg-orange-400' : 'bg-amber-400'
                  }`} />
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium text-gray-700">{alert.message}</p>
                    <p className={`mt-0.5 text-[10px] font-semibold uppercase ${
                      alert.severity === 'Critical' ? 'text-red-500' :
                      alert.severity === 'High' ? 'text-orange-500' : 'text-amber-500'
                    }`}>{alert.severity}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Intelligence panels ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

        {/* Energy & Cost */}
        <div
          className="rounded-xl border border-dashed border-gray-200 bg-gray-50/80 p-6 shadow-sm"
          onClick={handleDisabledEnergyCostClick}
        >
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-widest text-gray-400">Energy & Cost Intelligence</h2>
              <p className="mt-2 text-xs font-medium text-amber-700">This feature is not enabled yet.</p>
            </div>
            <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-amber-700">
              Coming Soon
            </span>
          </div>
          {showEnergyCostWarning ? (
            <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Energy & Cost Intelligence is not yet enabled in this workspace.
            </div>
          ) : null}
          <div className="grid grid-cols-3 gap-4">
            {[
              {
                label: 'Fleet Efficiency',
                value: intelData.avgKmpl,
                unit: 'km/l',
                color: 'text-gray-900',
                tab: 'fuel',
                icon: <IconTrendUp className="h-3 w-3 text-emerald-500" />,
              },
              {
                label: 'AdBlue Compliance',
                value: `${intelData.adBlueCompliance}%`,
                unit: '',
                color: intelData.adBlueCompliance < 90 ? 'text-orange-600' : 'text-emerald-600',
                tab: 'fuel',
              },
              {
                label: 'Cost Critical',
                value: kpiData.costHealth.critical,
                unit: 'vehs',
                color: kpiData.costHealth.critical > 0 ? 'text-red-600' : 'text-gray-900',
                tab: 'cost',
              },
            ].map((item) => (
              <div
                key={item.label}
                className="cursor-not-allowed rounded-lg border border-gray-200 bg-white/60 p-4 opacity-60 grayscale"
              >
                <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">{item.label}</p>
                <div className="mt-2 flex items-end gap-1">
                  <span className={`text-xl font-bold ${item.color}`}>{item.value}</span>
                  {item.unit && <span className="mb-0.5 text-xs text-gray-400">{item.unit}</span>}
                  {item.icon && <span className="mb-0.5">{item.icon}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Maintenance & Assets */}
        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <SectionHeader title="Maintenance & Asset Health" action="View All" onAction={() => onNavigate('maintenance')} />
          <div className="grid grid-cols-3 gap-4">
            {[
              {
                label: 'Overdue Service',
                value: kpiData.maintenanceDueCount,
                unit: 'vehs',
                color: kpiData.maintenanceDueCount > 0 ? 'text-red-600' : 'text-gray-900',
                tab: 'maintenance',
              },
              {
                label: 'Chronic Issues',
                value: intelData.chronicBreakdowns,
                unit: 'vehs',
                color: intelData.chronicBreakdowns > 0 ? 'text-orange-600' : 'text-gray-900',
                tab: 'maintenance',
              },
              {
                label: 'Tyre Alerts',
                value: intelData.tyreAlerts,
                unit: 'flags',
                color: intelData.tyreAlerts > 0 ? 'text-amber-600' : 'text-gray-900',
                tab: 'tyres',
              },
            ].map((item) => (
              <div
                key={item.label}
                onClick={() => onNavigate(item.tab)}
                className="cursor-pointer rounded-lg border border-gray-100 bg-gray-50 p-4 transition-colors hover:bg-gray-100"
              >
                <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">{item.label}</p>
                <div className="mt-2 flex items-end gap-1">
                  <span className={`text-xl font-bold ${item.color}`}>{item.value}</span>
                  <span className="mb-0.5 text-xs text-gray-400">{item.unit}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── AI Insights ────────────────────────────────────────────────── */}
      <AIInsightsPanel
        title="AI Insights: Fleet Control"
        summary="Quick read on readiness, risk, and maintenance load."
        insights={aiInsights}
        footer="AI recommendations are based on the current fleet-health snapshot and refresh with the dashboard polling cycle."
      />

      {/* ── Quick actions ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div
          onClick={() => onNavigate('dispatch')}
          className="flex cursor-pointer items-center justify-between rounded-xl border border-blue-100 bg-blue-50 px-5 py-4 transition-colors hover:bg-blue-100"
        >
          <div>
            <p className="text-sm font-semibold text-blue-900">Ready to dispatch a trip?</p>
            <p className="mt-0.5 text-xs text-blue-600">
              {activeVehicles} active vehicle{activeVehicles !== 1 ? 's' : ''} available
            </p>
          </div>
          <span className="flex-shrink-0 rounded-lg border border-blue-200 bg-white px-3 py-1.5 text-xs font-semibold text-blue-700 shadow-sm">
            Go to Dispatch →
          </span>
        </div>

        <div
          onClick={() => onNavigate('exceptions')}
          className={`flex cursor-pointer items-center justify-between rounded-xl border px-5 py-4 transition-colors ${
            liveAlerts.length > 0
              ? 'border-red-100 bg-red-50 hover:bg-red-100'
              : 'border-gray-100 bg-gray-50 hover:bg-gray-100'
          }`}
        >
          <div>
            <p className={`text-sm font-semibold ${liveAlerts.length > 0 ? 'text-red-900' : 'text-gray-700'}`}>
              {liveAlerts.length > 0 ? `${liveAlerts.length} active alert${liveAlerts.length !== 1 ? 's' : ''} need attention` : 'No active alerts'}
            </p>
            <p className={`mt-0.5 text-xs ${liveAlerts.length > 0 ? 'text-red-600' : 'text-gray-400'}`}>
              {liveAlerts.length > 0 ? 'Review exceptions and take action' : 'Fleet is operating normally'}
            </p>
          </div>
          <span className={`flex-shrink-0 rounded-lg border px-3 py-1.5 text-xs font-semibold shadow-sm ${
            liveAlerts.length > 0
              ? 'border-red-200 bg-white text-red-700'
              : 'border-gray-200 bg-white text-gray-600'
          }`}>
            {liveAlerts.length > 0 ? 'View Alerts →' : 'Exception Center →'}
          </span>
        </div>
      </div>

    </div>
  );
};
