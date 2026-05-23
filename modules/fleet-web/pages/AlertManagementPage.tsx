import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  ArrowLeft,
  Bell,
  CheckCircle2,
  Coffee,
  FlaskConical,
  Filter,
  LayoutGrid,
  Mail,
  MapPin,
  MessageCircle,
  Moon,
  PencilLine,
  Pause,
  SkipBack,
  SkipForward,
  PlayCircle,
  Save,
  Search,
  ShieldAlert,
  Smartphone,
  TriangleAlert,
  Truck,
  Video,
  X,
  Zap,
} from 'lucide-react';

type AlertPriority = 'High' | 'Medium' | 'Low';
type AlertStatus = 'Active' | 'Assigned' | 'Resolved' | 'Ignored';
type AlertType =
  | 'Power cut off'
  | 'Fuel theft detection'
  | 'Geofence violation'
  | 'Overspeeding'
  | 'Fatigue / sleeping'
  | 'Harsh braking'
  | 'Engine idle anomaly'
  | 'Route deviation'
  | 'Panic trigger'
  | 'Door tamper'
  | 'Low battery';
type AlertChannel = 'chat' | 'grid' | 'mail' | 'phone';
type RuleChannel = 'sms' | 'dashboard' | 'email' | 'push';

interface FleetAlert {
  id: string;
  type: AlertType;
  dateTime: string;
  vehicle: string;
  driver?: string;
  priority: AlertPriority;
  status: AlertStatus;
  supervisor?: string;
  channels: AlertChannel[];
  detailLine1?: string;
  detailLine2?: string;
  note: string;
}

interface AlertRule {
  id: string;
  name: string;
  description: string;
  threshold: string;
  priority: 'High' | 'Medium';
  channels: RuleChannel[];
  helperText?: string;
}

const ALERTS_SEED: FleetAlert[] = [
  { id: 'a1', type: 'Power cut off', dateTime: '03 Mar 2026, 11:13', vehicle: 'MH-12-KL-9087', priority: 'High', status: 'Assigned', supervisor: 'Ajay Sharma', channels: ['chat', 'grid'], note: '"Main power disconnected"' },
  { id: 'a2', type: 'Fuel theft detection', dateTime: '03 Mar 2026, 11:13', vehicle: 'HR-38-YT-8899', driver: 'Arjun Nair', priority: 'High', status: 'Active', channels: ['chat', 'mail', 'phone'], detailLine1: 'Value: 12L drop |', detailLine2: 'Threshold: 5L', note: '"Rapid fuel loss detected while stationary"' },
  { id: 'a3', type: 'Geofence violation', dateTime: '03 Mar 2026, 11:08', vehicle: 'UP-16-QW-5566', driver: 'Dinesh Solanki', priority: 'Medium', status: 'Active', channels: ['grid', 'chat'], note: '"Exited designated route"' },
  { id: 'a4', type: 'Overspeeding', dateTime: '03 Mar 2026, 11:03', vehicle: 'MH-46-BM-2849', driver: 'Ramesh Kumar', priority: 'High', status: 'Active', channels: ['chat', 'grid'], detailLine1: 'Value: 110 km/h |', detailLine2: 'Threshold: 80 km/h', note: '"Repeated violation"' },
  { id: 'a5', type: 'Fatigue / sleeping', dateTime: '03 Mar 2026, 10:58', vehicle: 'TN-10-MM-6677', driver: 'Suresh Iyer', priority: 'High', status: 'Active', channels: ['chat', 'grid'], note: '"Eyes closed for abnormal duration"' },
  { id: 'a6', type: 'Harsh braking', dateTime: '03 Mar 2026, 10:42', vehicle: 'GJ-01-KK-2244', driver: 'Imran Ali', priority: 'Medium', status: 'Active', channels: ['chat'], note: '"3 events in 15 minutes"' },
  { id: 'a7', type: 'Engine idle anomaly', dateTime: '03 Mar 2026, 10:20', vehicle: 'RJ-14-AS-1290', driver: 'Karan Verma', priority: 'Low', status: 'Active', channels: ['chat', 'mail'], note: '"Idle time exceeded threshold"' },
  { id: 'a8', type: 'Route deviation', dateTime: '03 Mar 2026, 09:55', vehicle: 'MH-14-NN-3491', driver: 'Prakash D', priority: 'Medium', status: 'Assigned', supervisor: 'Neha Gupta', channels: ['grid', 'mail'], note: '"Deviation detected for 12 minutes"' },
  { id: 'a9', type: 'Panic trigger', dateTime: '03 Mar 2026, 09:22', vehicle: 'KA-09-DF-1229', priority: 'High', status: 'Resolved', channels: ['chat', 'phone'], note: '"SOS button pressed then reset"' },
  { id: 'a10', type: 'Door tamper', dateTime: '03 Mar 2026, 08:46', vehicle: 'DL-01-AT-7711', priority: 'Medium', status: 'Resolved', channels: ['grid'], note: '"Cargo door opened off-route"' },
  { id: 'a11', type: 'Low battery', dateTime: '03 Mar 2026, 08:10', vehicle: 'MH-01-RT-5012', priority: 'Low', status: 'Ignored', channels: ['chat'], note: '"Battery dipped below 11.6V"' },
];

const RULES_SEED: AlertRule[] = [
  { id: 'r1', name: 'Overspeeding', description: 'Once the driver crosses the speed limit it will be considered as overspeeding.', threshold: '80 km/h', priority: 'High', channels: ['sms', 'dashboard'], helperText: 'Common range: 60-100 km/h' },
  { id: 'r2', name: 'Harsh braking', description: 'Sudden deceleration detected that exceeds the safety threshold.', threshold: '> 0.5g', priority: 'Medium', channels: ['dashboard'] },
  { id: 'r3', name: 'Night driving', description: 'Vehicle operation detected during restricted night hours (e.g., 10 PM - 5 AM).', threshold: '10 PM - 5 AM', priority: 'Medium', channels: ['dashboard', 'email'] },
  { id: 'r4', name: 'Fatigue / sleeping', description: 'Continuous driving exceeds the maximum allowed hours without a break.', threshold: '> 4h continuous', priority: 'High', channels: ['sms', 'dashboard'] },
  { id: 'r5', name: 'Harsh acceleration', description: 'Rapid increase in speed detected that exceeds the safety threshold.', threshold: '> 0.4g', priority: 'Medium', channels: ['dashboard'] },
  { id: 'r6', name: 'Geofence violation', description: 'Vehicle enters or exits a designated geographical zone.', threshold: 'Exit Zone', priority: 'Medium', channels: ['dashboard', 'sms'] },
  { id: 'r7', name: 'Fuel theft detection', description: 'Sudden drop in fuel level detected while the vehicle is stationary.', threshold: '> 5% drop', priority: 'High', channels: ['sms', 'email'] },
  { id: 'r8', name: 'Tampering / Device disconnect', description: 'GPS tracking device has been unplugged or tampered with.', threshold: 'Immediate', priority: 'High', channels: ['sms', 'dashboard'] },
  { id: 'r9', name: 'Power cut off', description: 'Main power supply to the tracking device has been disconnected.', threshold: 'Immediate', priority: 'High', channels: ['sms', 'dashboard'] },
  { id: 'r10', name: 'Accident / Impact violation', description: 'High-force impact or collision detected by the device accelerometer.', threshold: 'Impact > 3G', priority: 'High', channels: ['sms', 'email', 'push'] },
];

const TYPE_OPTIONS = ['All Types', ...new Set(ALERTS_SEED.map((a) => a.type))];
const PRIORITY_OPTIONS: Array<'All Priorities' | AlertPriority> = ['All Priorities', 'High', 'Medium', 'Low'];
const STATUS_OPTIONS: Array<'All Statuses' | AlertStatus> = ['All Statuses', 'Active', 'Assigned', 'Resolved', 'Ignored'];
const SUPERVISORS = ['Ajay Sharma', 'Neha Gupta', 'Vikram Rao', 'Meera Iyer', 'Sanjay Nair'];

const CardIconWrap: React.FC<{ className: string; children: React.ReactNode }> = ({ className, children }) => (
  <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${className}`}>{children}</div>
);

const iconBadge = 'inline-flex h-7 w-7 items-center justify-center rounded-md bg-gray-100';

const getRuleIcon = (ruleName: string) => {
  if (ruleName === 'Geofence violation') return <MapPin className="h-6 w-6 text-blue-500" />;
  if (ruleName === 'Fuel theft detection') return <FlaskConical className="h-6 w-6 text-red-500" />;
  if (ruleName === 'Tampering / Device disconnect') return <ShieldAlert className="h-6 w-6 text-violet-500" />;
  if (ruleName === 'Night driving') return <Moon className="h-6 w-6 text-primary-500" />;
  if (ruleName === 'Fatigue / sleeping') return <Coffee className="h-6 w-6 text-orange-700" />;
  if (ruleName === 'Accident / Impact violation') return <TriangleAlert className="h-6 w-6 text-red-600" />;
  if (ruleName === 'Harsh braking') return <TriangleAlert className="h-6 w-6 text-red-500" />;
  return <Zap className="h-6 w-6 text-orange-500" />;
};

const getRuleChannelIcon = (channel: RuleChannel) => {
  if (channel === 'sms') return <MessageCircle className="h-4 w-4 text-gray-500" />;
  if (channel === 'email') return <Mail className="h-4 w-4 text-gray-500" />;
  if (channel === 'push') return <Smartphone className="h-4 w-4 text-gray-500" />;
  return <LayoutGrid className="h-4 w-4 text-gray-500" />;
};

export const AlertManagementPage: React.FC = () => {
  const location = useLocation();
  const [alerts, setAlerts] = useState<FleetAlert[]>(ALERTS_SEED);
  const [rules, setRules] = useState<AlertRule[]>(RULES_SEED);
  const [typeFilter, setTypeFilter] = useState<string>('All Types');
  const [priorityFilter, setPriorityFilter] = useState<'All Priorities' | AlertPriority>('All Priorities');
  const [statusFilter, setStatusFilter] = useState<'All Statuses' | AlertStatus>('All Statuses');
  const [query, setQuery] = useState('');

  // ID passed via router state when user clicks a notification in the bell dropdown
  const [highlightedId, setHighlightedId] = useState<string | null>(
    (location.state as { highlightId?: string } | null)?.highlightId ?? null,
  );
  // One ref per alert row — used for scrollIntoView
  const rowRefs = useRef<Record<string, HTMLTableRowElement | null>>({});

  // Scroll to and briefly highlight the target row
  useEffect(() => {
    if (!highlightedId) return;
    const el = rowRefs.current[highlightedId];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    // Clear the highlight ring after 3 seconds
    const t = setTimeout(() => setHighlightedId(null), 3000);
    return () => clearTimeout(t);
  }, [highlightedId]);
  const [showConfigureRules, setShowConfigureRules] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<AlertRule | null>(null);
  const [playbackAlert, setPlaybackAlert] = useState<FleetAlert | null>(null);
  const [assignAlertId, setAssignAlertId] = useState<string | null>(null);
  const [assignSupervisorName, setAssignSupervisorName] = useState('');

  const filteredAlerts = useMemo(() => {
    return alerts.filter((alert) => {
      const typeMatch = typeFilter === 'All Types' || alert.type === typeFilter;
      const priorityMatch = priorityFilter === 'All Priorities' || alert.priority === priorityFilter;
      const statusMatch = statusFilter === 'All Statuses' || alert.status === statusFilter;
      const searchMatch = query.trim() === '' || alert.vehicle.toLowerCase().includes(query.toLowerCase()) || (alert.driver || '').toLowerCase().includes(query.toLowerCase());
      return typeMatch && priorityMatch && statusMatch && searchMatch;
    });
  }, [alerts, typeFilter, priorityFilter, statusFilter, query]);

  const alertStats = useMemo(() => {
    return {
      total: alerts.length,
      active: alerts.filter((a) => a.status === 'Active').length,
      high: alerts.filter((a) => a.priority === 'High' && a.status !== 'Resolved' && a.status !== 'Ignored').length,
      assigned: alerts.filter((a) => a.status === 'Assigned').length,
    };
  }, [alerts]);

  const updateAlertStatus = (id: string, nextStatus: AlertStatus) => {
    setAlerts((prev) => prev.map((item) => (item.id === id ? { ...item, status: nextStatus } : item)));
  };

  const assignSupervisor = (id: string, selected: string) => {
    if (!selected) return;
    setAlerts((prev) => prev.map((item) => (item.id === id ? { ...item, supervisor: selected, status: 'Assigned' } : item)));
  };

  const openEditRule = (rule: AlertRule) => {
    setEditingRuleId(rule.id);
    setEditDraft({ ...rule });
  };

  const closeEditRule = () => {
    setEditingRuleId(null);
    setEditDraft(null);
  };

  const saveRule = () => {
    if (!editingRuleId || !editDraft) return;
    setRules((prev) => prev.map((rule) => (rule.id === editingRuleId ? editDraft : rule)));
    closeEditRule();
  };

  const toggleRuleChannel = (channel: RuleChannel) => {
    if (!editDraft) return;
    setEditDraft((prev) => {
      if (!prev) return prev;
      const exists = prev.channels.includes(channel);
      const channels = exists ? prev.channels.filter((c) => c !== channel) : [...prev.channels, channel];
      return { ...prev, channels };
    });
  };

  const getAlertTypeIcon = (type: AlertType) => {
    if (type === 'Fuel theft detection') return <FlaskConical className="h-6 w-6 text-red-500" />;
    if (type === 'Geofence violation') return <MapPin className="h-6 w-6 text-blue-500" />;
    if (type === 'Fatigue / sleeping') return <Coffee className="h-6 w-6 text-orange-600" />;
    if (type === 'Overspeeding') return <Zap className="h-6 w-6 text-orange-500" />;
    return <Zap className="h-6 w-6 text-red-500" />;
  };

  const getAlertChannelIcon = (channel: AlertChannel) => {
    if (channel === 'chat') return <MessageCircle className="h-3.5 w-3.5 text-gray-500" />;
    if (channel === 'grid') return <LayoutGrid className="h-3.5 w-3.5 text-gray-500" />;
    if (channel === 'mail') return <Mail className="h-3.5 w-3.5 text-gray-500" />;
    return <Smartphone className="h-3.5 w-3.5 text-gray-500" />;
  };

  const getPriorityPill = (priority: AlertPriority) => {
    if (priority === 'High') return 'text-red-500 bg-red-50 border-red-200';
    if (priority === 'Medium') return 'text-orange-500 bg-orange-50 border-orange-200';
    return 'text-blue-500 bg-blue-50 border-blue-200';
  };

  const getRulePriorityPill = (priority: 'High' | 'Medium') => (priority === 'High' ? 'text-red-500 bg-red-50 border-red-200' : 'text-orange-500 bg-orange-50 border-orange-200');

  const getStatusPill = (status: AlertStatus) => {
    if (status === 'Active') return 'text-red-600 bg-red-100';
    if (status === 'Assigned') return 'text-primary-700 bg-primary-100';
    if (status === 'Resolved') return 'text-green-700 bg-green-100';
    return 'text-gray-600 bg-gray-100';
  };

  if (showConfigureRules) {
    return (
      <>
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setShowConfigureRules(false)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100"
              aria-label="Back"
            >
              <ArrowLeft className="h-7 w-7" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Configure Alert Rules</h1>
              <p className="mt-1 text-sm text-slate-500">Define thresholds and notification settings</p>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-200 px-5 py-5">
              <h2 className="text-lg font-semibold text-slate-900">Active Rules</h2>
            </div>
            {rules.map((rule) => (
              <div key={rule.id} className="grid gap-4 border-b border-gray-200 px-5 py-4 lg:grid-cols-[1fr_auto] lg:items-center">
                <div className="flex gap-4">
                  <div className="mt-1 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gray-100">{getRuleIcon(rule.name)}</div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{rule.name}</p>
                    <p className="text-sm text-slate-500">{rule.description}</p>
                    <p className="text-sm font-medium text-slate-400">Threshold: {rule.threshold}</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-8 lg:justify-end">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-gray-500">Priority</p>
                    <span className={`inline-flex rounded-full border px-4 py-1 text-sm font-semibold leading-none ${getRulePriorityPill(rule.priority)}`}>{rule.priority}</span>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-gray-500">Channels</p>
                    <div className="mt-1 flex items-center gap-2">
                      {rule.channels.map((channel) => (
                        <span key={`${rule.id}-${channel}`} className={iconBadge}>
                          {getRuleChannelIcon(channel)}
                        </span>
                      ))}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => openEditRule(rule)}
                    className="inline-flex items-center gap-2 text-sm font-semibold text-primary-900 hover:text-primary-700"
                  >
                    <PencilLine className="h-5 w-5" />
                    Edit
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {editingRuleId && editDraft ? (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/45 p-4">
            <div className="w-full max-w-[720px] overflow-hidden rounded-2xl bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
                <h3 className="text-xl font-bold text-slate-900">Edit Rule: {editDraft.name}</h3>
                <button type="button" onClick={closeEditRule} className="rounded-md p-1 text-gray-400 hover:bg-gray-100">
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-4 px-5 py-5">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">Description</label>
                  <textarea
                    value={editDraft.description}
                    onChange={(e) => setEditDraft({ ...editDraft, description: e.target.value })}
                    className="h-28 w-full resize-none rounded-xl border border-gray-300 bg-gray-50 px-4 py-3 text-sm text-slate-700 focus:border-primary-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">Threshold</label>
                  <input
                    value={editDraft.threshold}
                    onChange={(e) => setEditDraft({ ...editDraft, threshold: e.target.value })}
                    className="h-11 w-full rounded-xl border border-gray-300 px-4 text-sm text-slate-800 focus:border-primary-500 focus:outline-none"
                  />
                  <p className="mt-1 text-xs text-slate-500">{editDraft.helperText || 'Set rule trigger threshold'}</p>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">Priority</label>
                  <select
                    value={editDraft.priority}
                    onChange={(e) => setEditDraft({ ...editDraft, priority: e.target.value as 'High' | 'Medium' })}
                    className="h-11 w-full rounded-xl border border-gray-300 px-4 text-sm text-slate-800 focus:border-primary-500 focus:outline-none"
                  >
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">Delivery Channels</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['sms', 'email', 'push'] as RuleChannel[]).map((channel) => {
                      const selected = editDraft.channels.includes(channel);
                      const label = channel === 'sms' ? 'SMS' : channel === 'email' ? 'Email' : 'Push Notification';
                      return (
                        <button
                          key={channel}
                          type="button"
                          onClick={() => toggleRuleChannel(channel)}
                          className={`inline-flex h-11 items-center gap-2 rounded-xl border px-4 text-sm ${
                            selected ? 'border-primary-600 bg-primary-50 text-primary-700' : 'border-gray-300 text-slate-600 hover:bg-gray-50'
                          }`}
                        >
                          {getRuleChannelIcon(channel)}
                          {label}
                        </button>
                      );
                    })}
                  </div>
                  <p className="mt-2 text-xs text-slate-500">* Dashboard alerts are always enabled by default.</p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-4 border-t border-gray-200 px-5 py-4">
                <button type="button" onClick={closeEditRule} className="rounded-xl px-5 py-3 text-sm text-slate-700 hover:bg-gray-100">
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveRule}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary-900 px-5 py-3 text-sm font-semibold text-white hover:bg-primary-800"
                >
                  <Save className="h-5 w-5" />
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Alert Management</h1>
          <p className="mt-2 text-sm text-slate-500">Real-time monitoring and incident response</p>
        </div>
        <button
          type="button"
          onClick={() => setShowConfigureRules(true)}
          className="inline-flex items-center gap-3 rounded-2xl border border-gray-300 bg-white px-5 py-3 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50"
        >
          <LayoutGrid className="h-7 w-7 text-gray-600" />
          Configure Rules
        </button>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-gray-500">Total Alerts</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">{alertStats.total}</p>
            </div>
            <CardIconWrap className="bg-blue-50">
              <Bell className="h-7 w-7 text-blue-600" />
            </CardIconWrap>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-gray-500">Active Incidents</p>
              <p className="mt-2 text-2xl font-bold text-red-600">{alertStats.active}</p>
            </div>
            <CardIconWrap className="bg-red-50">
              <TriangleAlert className="h-7 w-7 text-red-600" />
            </CardIconWrap>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-gray-500">High Priority</p>
              <p className="mt-2 text-2xl font-bold text-orange-600">{alertStats.high}</p>
            </div>
            <CardIconWrap className="bg-orange-50">
              <Zap className="h-7 w-7 text-orange-600" />
            </CardIconWrap>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-gray-500">Assigned</p>
              <p className="mt-2 text-2xl font-bold text-green-600">{alertStats.assigned}</p>
            </div>
            <CardIconWrap className="bg-green-50">
              <CheckCircle2 className="h-7 w-7 text-green-600" />
            </CardIconWrap>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="flex items-center gap-3 text-gray-600">
              <Filter className="h-5 w-5" />
              <span className="text-sm font-semibold">Filters:</span>
            </div>

            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="h-11 rounded-xl border border-gray-300 px-4 text-sm text-gray-700 focus:border-primary-500 focus:outline-none">
              {TYPE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>

            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value as 'All Priorities' | AlertPriority)}
              className="h-11 rounded-xl border border-gray-300 px-4 text-sm text-gray-700 focus:border-primary-500 focus:outline-none"
            >
              {PRIORITY_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'All Statuses' | AlertStatus)}
              className="h-11 rounded-xl border border-gray-300 px-4 text-sm text-gray-700 focus:border-primary-500 focus:outline-none"
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <div className="relative w-full xl:w-[360px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search vehicle..."
              className="h-11 w-full rounded-xl border border-gray-300 pl-11 pr-4 text-sm text-gray-700 placeholder:text-gray-400 focus:border-primary-500 focus:outline-none"
            />
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <table className="w-full table-fixed">
          <thead className="border-b border-gray-200 bg-slate-50/60">
            <tr className="text-left text-xs uppercase tracking-wider text-slate-500">
              <th className="w-[24%] px-6 py-4 font-medium">Alert Details</th>
              <th className="w-[13%] px-6 py-4 font-medium">Vehicle / Driver</th>
              <th className="w-[8%] px-6 py-4 font-medium">Priority</th>
              <th className="w-[10%] px-6 py-4 font-medium">Status</th>
              <th className="w-[15%] px-6 py-4 font-medium">Supervisor</th>
              <th className="w-[7%] px-6 py-4 font-medium">Channels</th>
              <th className="w-[8%] px-6 py-4 font-medium">Recordings</th>
              <th className="w-[15%] px-6 py-4 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredAlerts.map((alert) => (
              <tr
                key={alert.id}
                ref={(el) => { rowRefs.current[alert.id] = el; }}
                className={`align-top border-b border-gray-200 transition-colors ${
                  highlightedId === alert.id
                    ? 'ring-2 ring-inset ring-amber-400 bg-amber-50'
                    : ''
                }`}
              >
                <td className="px-6 py-4">
                  <div className="flex gap-3">
                    <div className="mt-0.5 opacity-90">{getAlertTypeIcon(alert.type)}</div>
                    <div className="min-w-0 break-words">
                      <p className="text-sm font-medium text-slate-900">{alert.type}</p>
                      <p className="text-xs text-slate-500">{alert.dateTime}</p>
                      {alert.detailLine1 ? <p className="text-xs text-slate-600">{alert.detailLine1}</p> : null}
                      {alert.detailLine2 ? <p className="text-xs text-slate-600">{alert.detailLine2}</p> : null}
                      <p className="text-xs italic text-slate-500">{alert.note}</p>
                    </div>
                  </div>
                </td>

                <td className="px-6 py-4">
                  <div className="space-y-1">
                    <p className="inline-flex items-center gap-2 text-xs font-medium text-slate-900">
                      <Truck className="h-4 w-4 text-slate-400" />
                      {alert.vehicle}
                    </p>
                    {alert.driver ? <p className="text-xs text-slate-500">{alert.driver}</p> : null}
                  </div>
                </td>

                <td className="px-6 py-4">
                  <span className={`inline-flex rounded-full border px-3 py-1 text-sm font-medium leading-none ${getPriorityPill(alert.priority)}`}>{alert.priority}</span>
                </td>

                <td className="px-6 py-4">
                  <span className={`inline-flex rounded-full px-3 py-1 text-sm font-medium leading-none ${getStatusPill(alert.status)}`}>{alert.status}</span>
                </td>

                <td className="px-6 py-4">
                  {alert.supervisor ? (
                    <div>
                      <p className="text-sm font-medium text-slate-900">{alert.supervisor}</p>
                      <p className="text-xs text-slate-500">Assigned by Fleet Manager / CEO</p>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400">Not assigned</span>
                  )}
                </td>

                <td className="px-6 py-4">
                  <div className="flex flex-wrap gap-2">
                    {alert.channels.map((channel) => (
                      <span key={`${alert.id}-${channel}`} className={iconBadge}>
                        {getAlertChannelIcon(channel)}
                      </span>
                    ))}
                  </div>
                </td>

                <td className="px-6 py-4">
                  <button
                    type="button"
                    onClick={() => setPlaybackAlert(alert)}
                    className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700"
                  >
                    <PlayCircle className="h-5 w-5" />
                    Playback
                  </button>
                </td>

                <td className="px-6 py-4">
                  <div className="flex flex-wrap justify-end gap-2">
                    {alert.status === 'Assigned' ? (
                      <button type="button" onClick={() => updateAlertStatus(alert.id, 'Resolved')} className="rounded-lg bg-green-100 px-4 py-2 text-sm font-medium text-green-700 hover:bg-green-200">
                        Mark Resolved
                      </button>
                    ) : alert.status === 'Active' ? (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setAssignAlertId(alert.id);
                            setAssignSupervisorName('');
                          }}
                          className="rounded-lg bg-blue-100 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-200 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Assign
                        </button>
                        <button type="button" onClick={() => updateAlertStatus(alert.id, 'Ignored')} className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-200">
                          Ignore
                        </button>
                      </>
                    ) : alert.status === 'Ignored' ? (
                      <button
                        type="button"
                        onClick={() => updateAlertStatus(alert.id, 'Active')}
                        className="rounded-lg bg-blue-100 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-200"
                      >
                        Reopen
                      </button>
                    ) : (
                      <span className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-500">No actions</span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {filteredAlerts.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-5 py-10 text-center text-sm text-gray-500">
                  No alerts match your current filters.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {playbackAlert ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setPlaybackAlert(null)}
        >
          <div
            className="w-full max-w-[1200px] overflow-hidden rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
              <div>
                <h3 className="inline-flex items-center gap-2 text-sm font-bold text-slate-900">
                  <Video className="h-5 w-5 text-slate-500" />
                  Incident Playback
                </h3>
                <p className="mt-1 text-sm text-slate-500">{playbackAlert.type} • {playbackAlert.dateTime}:43</p>
              </div>
              <button
                type="button"
                onClick={() => setPlaybackAlert(null)}
                className="rounded-md p-1 text-gray-400 hover:bg-gray-100"
              >
                <X className="h-7 w-7" />
              </button>
            </div>

            <div className="bg-black px-5 py-10">
              <div className="mx-auto flex h-[360px] w-full flex-col items-center justify-center text-center text-slate-400">
                <Video className="h-20 w-20 text-slate-500" />
                <p className="mt-3 text-base">Video Recording Placeholder</p>
                <p className="text-sm text-slate-500">ID: {playbackAlert.id}</p>
              </div>

              <div className="mt-4">
                <div className="relative h-6">
                  <div className="absolute top-2 h-1 w-full rounded-full bg-slate-600" />
                  <div className="absolute top-2 h-1 w-[60%] rounded-full bg-red-500" />
                  <div className="absolute left-[60%] top-0 h-5 w-5 -translate-x-1/2 rounded-full border-2 border-red-500 bg-white shadow" />
                    <span className="absolute left-[60%] -top-10 -translate-x-1/2 rounded-md bg-red-600 px-3 py-1 text-xs font-semibold text-white">
                    Violation Detected
                  </span>
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <div className="flex items-center gap-4 text-white">
                    <button type="button" className="rounded p-1 hover:bg-white/10" aria-label="Skip backward">
                      <SkipBack className="h-6 w-6" />
                    </button>
                    <button type="button" className="rounded-full border border-white/30 p-2 hover:bg-white/10" aria-label="Pause">
                      <Pause className="h-6 w-6" />
                    </button>
                    <button type="button" className="rounded p-1 hover:bg-white/10" aria-label="Skip forward">
                      <SkipForward className="h-6 w-6" />
                    </button>
                    <span className="text-sm">00:45 / 01:15</span>
                  </div>

                  <span className="rounded-md bg-red-700 px-3 py-1 text-sm font-semibold text-white">HIGH PRIORITY</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between bg-white px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-gray-200 text-sm font-bold text-gray-600">
                  {(playbackAlert.driver || 'Driver').charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">Driver ID:</p>
                  <p className="text-sm text-slate-500">Vehicle: {playbackAlert.vehicle}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-slate-500">Violation Type</p>
                <p className="text-base font-bold text-slate-900">{playbackAlert.type}</p>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {assignAlertId ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4"
          onClick={() => {
            setAssignAlertId(null);
            setAssignSupervisorName('');
          }}
        >
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
              <h3 className="text-lg font-semibold text-slate-900">Assign Supervisor</h3>
              <button
                type="button"
                onClick={() => {
                  setAssignAlertId(null);
                  setAssignSupervisorName('');
                }}
                className="rounded-md p-1 text-gray-400 hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-3 px-5 py-5">
              <p className="text-sm text-slate-600">Select supervisor to handle this violation.</p>
              <select
                value={assignSupervisorName}
                onChange={(e) => setAssignSupervisorName(e.target.value)}
                className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm text-slate-700 focus:border-primary-500 focus:outline-none"
              >
                <option value="">Choose supervisor...</option>
                {SUPERVISORS.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-2 border-t border-gray-200 px-5 py-4">
              <button
                type="button"
                onClick={() => {
                  setAssignAlertId(null);
                  setAssignSupervisorName('');
                }}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!assignSupervisorName}
                onClick={() => {
                  if (!assignAlertId || !assignSupervisorName) return;
                  assignSupervisor(assignAlertId, assignSupervisorName);
                  setAssignAlertId(null);
                  setAssignSupervisorName('');
                }}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Assign Supervisor
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
