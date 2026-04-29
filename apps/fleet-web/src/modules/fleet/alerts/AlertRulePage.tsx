import { Plus } from 'lucide-react';
import { FleetAccessGate } from '@shared-auth';
import { ACTION_PERMISSIONS } from '@shared-auth/modulePermissions';
import { Button } from '../../../components/Button';
import { DataTable, DataTableColumn } from '../../../components/DataTable';
import { EmptyState } from '../../../components/EmptyState';
import { ErrorState } from '../../../components/ErrorState';
import { LoadingState } from '../../../components/LoadingState';
import { PageHeader } from '../../../components/PageHeader';
import { StatusBadge } from '../../../components/StatusBadge';
import { FleetRoute } from '../../../routing/fleetRoutes';
import { AlertRule } from '../../../types';
import { AlertRuleDetailPage } from './AlertRuleDetailPage';
import { AlertRuleFormPage } from './AlertRuleFormPage';
import { ruleStatusTone, severityTone } from './alertValidation';

export function AlertRulePage({ alertRules, createAlertRule, error, loading, navigateTo, route, updateAlertRule }: { alertRules: AlertRule[]; createAlertRule: (rule: AlertRule) => Promise<AlertRule>; error: string | null; loading: boolean; navigateTo: (path: string) => void; route: FleetRoute; updateAlertRule: (rule: AlertRule) => Promise<AlertRule> }) {
  const basePath = `/${route.section}`;
  const rule = route.id ? alertRules.find((item) => item.id === route.id) : undefined;
  if (loading) return <LoadingState label="Loading alert rules" />;
  if (error && alertRules.length === 0) return <ErrorState message={error} title="Alert rules unavailable" />;
  if (route.mode === 'create') return <FleetAccessGate fallback={<EmptyState description="You do not have permission to create alert rules." title="Create unavailable" />} permission={ACTION_PERMISSIONS.createAlertRule}><AlertRuleFormPage mode="create" onCancel={() => navigateTo(basePath)} onSubmit={async (next) => { const created = await createAlertRule(next); navigateTo(`${basePath}/${created.id}`); }} /></FleetAccessGate>;
  if (route.mode === 'edit') return <FleetAccessGate fallback={<EmptyState description="You do not have permission to edit alert rules." title="Edit unavailable" />} permission={ACTION_PERMISSIONS.editAlertRule}><AlertRuleFormPage mode="edit" onCancel={() => navigateTo(rule ? `${basePath}/${rule.id}` : basePath)} onSubmit={async (next) => { const updated = await updateAlertRule(next); navigateTo(`${basePath}/${updated.id}`); }} rule={rule} /></FleetAccessGate>;
  if (route.mode === 'detail') return <AlertRuleDetailPage onBack={() => navigateTo(basePath)} onEdit={() => rule && navigateTo(`${basePath}/${rule.id}/edit`)} rule={rule} />;
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <PageHeader actions={<FleetAccessGate permission={ACTION_PERMISSIONS.createAlertRule}><Button icon={<Plus className="h-4 w-4" />} onClick={() => navigateTo(`${basePath}/create`)} variant="accent">Create Rule</Button></FleetAccessGate>} subtitle="Configure fleet alert rules, escalation severity, delivery channels, and cooldowns." title="Alert Management" />
      {error && <ErrorState message={error} title="Showing cached or demo alert rules" />}
      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"><DataTable columns={columns} emptyMessage="No alert rules found." getRowKey={(item) => item.id} onRowClick={(item) => navigateTo(`${basePath}/${item.id}`)} rows={alertRules} /></section>
    </div>
  );
}

const columns: Array<DataTableColumn<AlertRule>> = [
  { header: 'Rule', key: 'rule', render: (row) => <div><p className="font-bold text-text">{row.name}</p><p className="text-xs text-gray-500">{row.module} · {row.condition}</p></div> },
  { header: 'Severity', key: 'severity', render: (row) => <StatusBadge tone={severityTone(row.severity)}>{row.severity}</StatusBadge> },
  { header: 'Status', key: 'status', render: (row) => <StatusBadge tone={ruleStatusTone(row.status)}>{row.status}</StatusBadge> },
  { header: 'Recipient', key: 'recipient', render: (row) => row.recipient },
  { align: 'right', header: 'Cooldown', key: 'cooldown', render: (row) => `${row.cooldownMinutes}m` },
];
