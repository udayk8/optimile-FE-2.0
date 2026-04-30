import { CheckCircle2, Send, ShieldAlert, XCircle } from 'lucide-react';
import { useState } from 'react';
import { FleetAccessGate } from '@shared-auth';
import { ACTION_PERMISSIONS } from '@shared-auth/modulePermissions';
import { Button } from '../../../components/Button';
import { ConfirmModal } from '../../../components/ConfirmModal';
import { EmptyState } from '../../../components/EmptyState';
import { PageHeader } from '../../../components/PageHeader';
import { DispatchAssignment, FleetDriver, MaintenanceWorkOrder, Vehicle } from '../../../types';
import { buildDispatchAssignmentId, getDriverReadiness, getVehicleReadiness, ReadinessResult } from './dispatchReadiness';

interface DispatchPrecheckPageProps {
  createDispatchAssignment: (assignment: DispatchAssignment) => Promise<DispatchAssignment>;
  driver?: FleetDriver;
  onBack: () => void;
  onComplete: () => void;
  vehicle?: Vehicle;
  workOrders: MaintenanceWorkOrder[];
}

export function DispatchPrecheckPage({ createDispatchAssignment, driver, onBack, onComplete, vehicle, workOrders }: DispatchPrecheckPageProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  if (!vehicle || !driver) {
    return <EmptyState description="Select a vehicle and driver before running dispatch pre-check." title="Pre-check unavailable" />;
  }

  const vehicleReadiness = getVehicleReadiness(vehicle, workOrders);
  const driverReadiness = getDriverReadiness(driver);
  const ready = vehicleReadiness.ready && driverReadiness.ready;

  const confirmAssignment = async () => {
    setSaving(true);
    await createDispatchAssignment({
      id: buildDispatchAssignmentId(),
      createdAt: new Date().toISOString().slice(0, 10),
      createdBy: 'Rahul Mehta',
      destination: 'Customer Delivery Point',
      driverId: driver.id,
      driverName: driver.name,
      origin: vehicle.location,
      plannedStart: new Date().toISOString().slice(0, 16).replace('T', ' '),
      routeName: `${vehicle.location} Dispatch`,
      status: ready ? 'Assigned' : 'Blocked',
      vehicleId: vehicle.id,
      vehicleRegistration: vehicle.registrationNo,
    });
    setSaving(false);
    setConfirmOpen(false);
    onComplete();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <PageHeader
        actions={(
          <>
            <Button onClick={onBack} variant="outline">Back</Button>
            <FleetAccessGate permission={ACTION_PERMISSIONS.assignDispatch}>
              <Button disabled={!ready} icon={<Send className="h-4 w-4" />} onClick={() => setConfirmOpen(true)} variant="accent">Confirm Assignment</Button>
            </FleetAccessGate>
          </>
        )}
        subtitle={`${vehicle.registrationNo} · ${driver.name}`}
        title="Dispatch Pre-check"
      />

      <section className="grid gap-6 xl:grid-cols-2">
        <ReadinessCard title="Vehicle Gate" result={vehicleReadiness} summary={`${vehicle.make} ${vehicle.model} · ${vehicle.status}`} />
        <ReadinessCard title="Driver Gate" result={driverReadiness} summary={`${driver.licenseClass} · ${driver.assignmentStatus}`} />
      </section>

      <section className={`rounded-xl border p-5 shadow-sm ${ready ? 'border-success/30 bg-success/5' : 'border-danger/30 bg-danger/5'}`}>
        <div className="flex items-start gap-3">
          {ready ? <CheckCircle2 className="mt-0.5 h-5 w-5 text-success" /> : <ShieldAlert className="mt-0.5 h-5 w-5 text-danger" />}
          <div>
            <h2 className={`text-lg font-bold ${ready ? 'text-success' : 'text-danger'}`}>{ready ? 'Ready for dispatch' : 'Dispatch blocked'}</h2>
            <p className="mt-1 text-sm text-gray-600">{ready ? 'All mandatory gates passed. Assignment can be confirmed.' : 'Resolve blocked reasons before confirming assignment.'}</p>
            {!ready && <p className="mt-2 text-sm font-semibold text-danger">Assignment confirmation is disabled because blocked vehicles or drivers cannot be assigned.</p>}
          </div>
        </div>
      </section>

      <ConfirmModal
        confirmLabel={saving ? 'Assigning...' : 'Assign'}
        description={`Assign ${driver.name} to ${vehicle.registrationNo}? This will create a dispatch assignment record.`}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => void confirmAssignment()}
        open={confirmOpen}
        title="Confirm dispatch assignment"
      />
    </div>
  );
}

function ReadinessCard({ result, summary, title }: { result: ReadinessResult; summary: string; title: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-text">{title}</h2>
          <p className="mt-1 text-sm text-gray-500">{summary}</p>
        </div>
        {result.ready ? <CheckCircle2 className="h-5 w-5 text-success" /> : <XCircle className="h-5 w-5 text-danger" />}
      </div>
      <div className="mt-5 space-y-3">
        {result.blockers.length === 0 && result.warnings.length === 0 && <p className="rounded-lg bg-success/10 px-3 py-2 text-sm font-semibold text-success">No blockers found.</p>}
        {result.blockers.map((blocker) => (
          <div className="rounded-lg bg-danger/10 px-3 py-2 text-sm font-semibold text-danger" key={`${blocker.category}-${blocker.reason}`}>
            <p>{blocker.category}: {blocker.reason}</p>
            <p className="mt-1 text-xs text-danger/80">Suggested action: {blocker.suggestedAction}</p>
          </div>
        ))}
        {result.warnings.map((warning) => <p className="rounded-lg bg-warning/10 px-3 py-2 text-sm font-semibold text-warning" key={warning}>{warning}</p>)}
      </div>
    </div>
  );
}
