import { Edit, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { FleetAccessGate } from '@shared-auth';
import { ACTION_PERMISSIONS } from '@shared-auth/modulePermissions';
import { Breadcrumbs } from '../../../components/Breadcrumbs';
import { Button } from '../../../components/Button';
import { ConfirmModal } from '../../../components/ConfirmModal';
import { DetailTabs } from '../../../components/DetailTabs';
import { EmptyState } from '../../../components/EmptyState';
import { InfoGrid, InfoItem } from '../../../components/InfoGrid';
import { MeterBar } from '../../../components/MeterBar';
import { PageHeader } from '../../../components/PageHeader';
import { StatusBadge } from '../../../components/StatusBadge';
import { DispatchAssignment, FleetAlert, FleetDriver, MaintenanceWorkOrder, Vehicle } from '../../../types';
import { getAlertsByEntity, getAssignmentsByDriver, getWorkOrdersByVehicle } from '../fleetRelationships';

interface DriverDetailPageProps {
  alerts: FleetAlert[];
  dispatchAssignments: DispatchAssignment[];
  driver?: FleetDriver;
  navigateTo: (path: string) => void;
  onBack: () => void;
  onDelete: () => Promise<void>;
  onEdit: () => void;
  vehicles: Vehicle[];
  workOrders: MaintenanceWorkOrder[];
}

export function DriverDetailPage({ alerts, dispatchAssignments, driver, navigateTo, onBack, onDelete, onEdit, vehicles, workOrders }: DriverDetailPageProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');

  if (!driver) {
    return <EmptyState description="The requested driver could not be found." title="Driver not found" />;
  }

  const handleDelete = async () => {
    setDeleting(true);
    await onDelete();
    setDeleting(false);
    setConfirmOpen(false);
  };
  const assignments = getAssignmentsByDriver(dispatchAssignments, driver.id);
  const relatedAlerts = getAlertsByEntity(alerts, 'Driver', driver.id);

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: 'Drivers', onClick: onBack }, { label: driver.name }]} />
      <PageHeader
        actions={(
          <>
            <Button onClick={onBack} variant="outline">Back</Button>
            <FleetAccessGate permission={ACTION_PERMISSIONS.editDriver}>
              <Button icon={<Edit className="h-4 w-4" />} onClick={onEdit} variant="primary">Edit</Button>
            </FleetAccessGate>
            <FleetAccessGate permission={ACTION_PERMISSIONS.deleteDriver}>
              <Button icon={<Trash2 className="h-4 w-4" />} onClick={() => setConfirmOpen(true)} variant="danger">Delete</Button>
            </FleetAccessGate>
          </>
        )}
        subtitle={`${driver.licenseClass} · ${driver.baseLocation}`}
        title={driver.name}
      />

      <DetailTabs
        activeTab={activeTab}
        onChange={setActiveTab}
        tabs={[
          {
            id: 'profile',
            label: 'Profile',
            content: (
              <InfoGrid columns="sm:grid-cols-2 xl:grid-cols-3">
                <InfoItem label="Mobile" value={driver.phone} />
                <InfoItem label="Base Location" value={driver.baseLocation} />
                <InfoItem label="Assignment Status" value={<StatusBadge tone={driver.assignmentStatus === 'Available' ? 'success' : driver.assignmentStatus === 'Inactive' ? 'neutral' : 'primary'}>{driver.assignmentStatus}</StatusBadge>} />
                <InfoItem label="Masked Aadhaar" value={driver.aadhaarMasked} />
                <InfoItem label="Masked Bank" value={driver.bankAccountMasked} />
              </InfoGrid>
            ),
          },
          {
            id: 'license',
            label: 'License',
            content: (
              <InfoGrid columns="sm:grid-cols-2 xl:grid-cols-3">
                <InfoItem label="License Number" value={driver.licenseNo} />
                <InfoItem label="Class" value={driver.licenseClass} />
                <InfoItem label="License Expiry" value={driver.licenseExpiryDate} />
                <InfoItem label="Medical Expiry" value={driver.medicalExpiryDate} />
              </InfoGrid>
            ),
          },
          {
            id: 'readiness',
            label: 'Readiness',
            content: (
              <div className="space-y-4">
                <StatusBadge tone={driver.assignmentStatus === 'Available' ? 'success' : driver.assignmentStatus === 'Inactive' ? 'neutral' : 'primary'}>{driver.assignmentStatus}</StatusBadge>
                <p className="text-sm leading-6 text-gray-600">Driver readiness combines assignment status, license validity, and medical expiry.</p>
              </div>
            ),
          },
          {
            id: 'assignments',
            label: 'Assignments',
            content: assignments.length === 0 ? <EmptyState action={<Button onClick={() => navigateTo('/dispatch-console')} variant="accent">Open Dispatch</Button>} description="No dispatch assignments are linked to this driver. Assign the driver from Dispatch when they are ready." title="No assignments" /> : (
              <div className="space-y-3">
                <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm font-semibold text-primary">
                  Active Work Orders for Assigned Vehicle are shown below each assignment. This is an indirect link through the assigned vehicle, not a driver-owned work order.
                </div>
                {assignments.map((assignment) => {
                  const vehicle = vehicles.find((item) => item.id === assignment.vehicleId);
                  const vehicleWorkOrders = getWorkOrdersByVehicle(workOrders, assignment.vehicleId).filter((workOrder) => workOrder.status !== 'Completed');
                  return (
                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4" key={assignment.id}>
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="font-bold text-text">{assignment.routeName}</p>
                          <p className="text-xs text-gray-500">{assignment.origin} to {assignment.destination} · {assignment.plannedStart}</p>
                        </div>
                        <StatusBadge tone={assignment.status === 'Assigned' ? 'success' : assignment.status === 'Blocked' ? 'danger' : 'primary'}>{assignment.status}</StatusBadge>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button className="h-9 px-3" disabled={!vehicle} onClick={() => vehicle && navigateTo(`/vehicle-management/${vehicle.id}`)} variant="secondary">Vehicle</Button>
                        <Button className="h-9 px-3" onClick={() => navigateTo('/dispatch-console')} variant="secondary">Dispatch</Button>
                        {vehicleWorkOrders.length === 0 && <span className="flex h-9 items-center text-sm font-semibold text-gray-500">No active work orders for assigned vehicle</span>}
                        {vehicleWorkOrders.map((workOrder) => (
                          <Button className="h-9 px-3" key={workOrder.id} onClick={() => navigateTo(`/maintenance/${workOrder.id}`)} variant="secondary">{workOrder.id}</Button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ),
          },
          {
            id: 'behavior',
            label: 'Behavior',
            content: (
              <div>
                <p className="text-5xl font-extrabold text-text">{driver.behaviorScore}</p>
                <p className="mt-2 text-sm font-semibold text-gray-500">{driver.coachingStatus}</p>
                <MeterBar className="mt-5 h-3" tone={driver.behaviorScore < 50 ? 'danger' : driver.behaviorScore < 75 ? 'warning' : 'success'} value={driver.behaviorScore} />
              </div>
            ),
          },
          {
            id: 'alerts',
            label: 'Alerts',
            content: relatedAlerts.length === 0 ? <EmptyState description="No active alerts are linked to this driver." title="No related alerts" /> : (
              <div className="space-y-3">
                {relatedAlerts.map((alert) => (
                  <button className="w-full rounded-xl border border-warning/20 bg-warning/5 p-4 text-left transition hover:border-warning" key={alert.id} onClick={() => navigateTo(`/exception-center/${alert.id}`)} type="button">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-bold text-text">{alert.title}</p>
                        <p className="text-xs text-gray-500">{alert.detail}</p>
                      </div>
                      <StatusBadge tone={alert.severity === 'Critical' ? 'danger' : alert.severity === 'High' ? 'warning' : 'primary'}>{alert.severity}</StatusBadge>
                    </div>
                  </button>
                ))}
              </div>
            ),
          },
        ]}
      />

      <ConfirmModal
        confirmLabel={deleting ? 'Deleting...' : 'Delete'}
        description={`Delete ${driver.name}? This removes the driver from the local driver master.`}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => void handleDelete()}
        open={confirmOpen}
        title="Delete driver"
      />
    </div>
  );
}
