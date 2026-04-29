import { Edit } from 'lucide-react';
import { FleetAccessGate } from '@shared-auth';
import { ACTION_PERMISSIONS } from '@shared-auth/modulePermissions';
import { Button } from '../../../components/Button';
import { EmptyState } from '../../../components/EmptyState';
import { PageHeader } from '../../../components/PageHeader';
import { StatusBadge } from '../../../components/StatusBadge';
import { AlertRule } from '../../../types';
import { ruleStatusTone, severityTone } from './alertValidation';

export function AlertRuleDetailPage({ onBack, onEdit, rule }: { onBack: () => void; onEdit: () => void; rule?: AlertRule }) {
  if (!rule) return <EmptyState description="The requested alert rule could not be found." title="Rule not found" />;
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <PageHeader actions={<><Button onClick={onBack} variant="outline">Back</Button><FleetAccessGate permission={ACTION_PERMISSIONS.editAlertRule}><Button icon={<Edit className="h-4 w-4" />} onClick={onEdit} variant="primary">Edit</Button></FleetAccessGate></>} subtitle={`${rule.module} · created ${rule.createdAt}`} title={rule.name} />
      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap gap-2"><StatusBadge tone={severityTone(rule.severity)}>{rule.severity}</StatusBadge><StatusBadge tone={ruleStatusTone(rule.status)}>{rule.status}</StatusBadge></div>
        <dl className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <Info label="Condition" value={rule.condition} />
          <Info label="Recipient" value={rule.recipient} />
          <Info label="Channel" value={rule.channel} />
          <Info label="Cooldown" value={`${rule.cooldownMinutes} minutes`} />
        </dl>
      </section>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</dt><dd className="mt-1 text-sm font-bold text-text">{value}</dd></div>;
}
