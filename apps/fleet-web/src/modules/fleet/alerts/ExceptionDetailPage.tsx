import { CheckCircle2 } from 'lucide-react';
import { useState } from 'react';
import { FleetAccessGate } from '@shared-auth';
import { ACTION_PERMISSIONS } from '@shared-auth/modulePermissions';
import { Button } from '../../../components/Button';
import { ConfirmModal } from '../../../components/ConfirmModal';
import { EmptyState } from '../../../components/EmptyState';
import { InfoGrid, InfoItem } from '../../../components/InfoGrid';
import { PageHeader } from '../../../components/PageHeader';
import { StatusBadge } from '../../../components/StatusBadge';
import { FleetAlert } from '../../../types';
import { getAlertSeverity } from '../fleetRelationships';
import { exceptionStatusTone, severityTone } from './alertValidation';

export function ExceptionDetailPage({ alert, onBack, onNavigateEntity, onResolve }: { alert?: FleetAlert; onBack: () => void; onNavigateEntity: (path: string) => void; onResolve: (note: string) => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  if (!alert) return <EmptyState description="The requested exception could not be found." title="Exception not found" />;
  const canResolve = alert.status !== 'Resolved';
  const entityPath = getEntityPath(alert);
  const resolve = async () => {
    setSaving(true);
    await onResolve(note.trim() || 'Resolved from exception center.');
    setSaving(false);
    setOpen(false);
  };
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <PageHeader
        actions={<><Button onClick={onBack} variant="outline">Back</Button>{entityPath && <Button onClick={() => onNavigateEntity(entityPath)} variant="secondary">Open Entity</Button>}{canResolve && <FleetAccessGate permission={ACTION_PERMISSIONS.resolveException}><Button icon={<CheckCircle2 className="h-4 w-4" />} onClick={() => setOpen(true)} variant="accent">Resolve</Button></FleetAccessGate>}</>}
        subtitle={`${alert.source ?? 'Fleet'} · ${alert.createdAt ?? 'Open'}`}
        title={alert.title}
      />
      {alert.status === 'Resolved' && <div className="rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-sm font-semibold text-success">This alert has been resolved. The linked entity remains available for audit review.</div>}
      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap gap-2"><StatusBadge tone={severityTone(getAlertSeverity(alert))}>{getAlertSeverity(alert)}</StatusBadge><StatusBadge tone={exceptionStatusTone(alert.status)}>{alert.status ?? 'Open'}</StatusBadge></div>
        <p className="mt-5 text-sm leading-6 text-gray-700">{alert.detail}</p>
        <InfoGrid columns="mt-5 sm:grid-cols-2 xl:grid-cols-3">
          <InfoItem label="Assigned To" value={alert.assignedTo ?? 'Unassigned'} />
          <InfoItem label="Recipient" value={alert.recipient} />
          <InfoItem label="Channel" value={alert.channel} />
          <InfoItem label="Linked Entity" value={entityPath ? <button className="font-bold text-primary" onClick={() => onNavigateEntity(entityPath)} type="button">{alert.entityLabel}</button> : alert.entityLabel} />
          <InfoItem label="Resolved By" value={alert.resolvedBy ?? 'Pending'} />
          <InfoItem label="Resolved At" value={alert.resolvedAt ?? 'Pending'} />
          <InfoItem label="Resolution Note" value={alert.resolutionNote ?? 'No note captured'} />
        </InfoGrid>
      </section>
      <ConfirmModal confirmLabel={saving ? 'Resolving...' : 'Resolve'} description="Resolve this exception and record a closure note." onClose={() => setOpen(false)} onConfirm={() => void resolve()} open={open} title="Resolve exception">
        <label className="block space-y-2">
          <span className="text-xs font-bold uppercase tracking-wide text-gray-500">Resolution note</span>
          <textarea className="h-24 w-full rounded-xl border border-gray-300 bg-white p-3 text-sm outline-none ring-primary/20 focus:border-primary focus:ring-4" onChange={(event) => setNote(event.target.value)} placeholder="Resolution note" value={note} />
        </label>
      </ConfirmModal>
    </div>
  );
}

function getEntityPath(alert: FleetAlert) {
  if (alert.entityType === 'Vehicle') return `/vehicle-management/${alert.entityId}`;
  if (alert.entityType === 'Driver') return `/driver-management/${alert.entityId}`;
  if (alert.entityType === 'WorkOrder') return `/maintenance/${alert.entityId}`;
  if (alert.entityType === 'Part') return `/inventory/${alert.entityId}`;
  if (alert.entityType === 'Dispatch') return '/dispatch-console';
  return null;
}
