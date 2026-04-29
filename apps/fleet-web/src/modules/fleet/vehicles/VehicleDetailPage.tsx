import { Edit, Trash2 } from 'lucide-react';
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
import { DispatchAssignment, FleetAlert, MaintenanceWorkOrder, PartInventoryItem, Vehicle } from '../../../types';
import { getAlertsByEntity, getAssignmentsByVehicle, getPartsUsedByVehicle, getWorkOrdersByVehicle } from '../fleetRelationships';
import { useState } from 'react';

interface VehicleDetailPageProps {
  alerts: FleetAlert[];
  dispatchAssignments: DispatchAssignment[];
  navigateTo: (path: string) => void;
  onBack: () => void;
  onDelete: () => Promise<void>;
  onEdit: () => void;
  partsInventory: PartInventoryItem[];
  vehicle?: Vehicle;
  workOrders: MaintenanceWorkOrder[];
}

export function VehicleDetailPage({ alerts, dispatchAssignments, navigateTo, onBack, onDelete, onEdit, partsInventory, vehicle, workOrders }: VehicleDetailPageProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  if (!vehicle) {
    return <EmptyState description="The requested vehicle could not be found." title="Vehicle not found" />;
  }

  const handleDelete = async () => {
    setDeleting(true);
    await onDelete();
    setDeleting(false);
    setConfirmOpen(false);
  };
  const vehicleWorkOrders = getWorkOrdersByVehicle(workOrders, vehicle.id);
  const vehicleParts = getPartsUsedByVehicle(workOrders, vehicle.id);
  const relatedAlerts = getAlertsByEntity(alerts, 'Vehicle', vehicle.id);
  const assignments = getAssignmentsByVehicle(dispatchAssignments, vehicle.id);

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: 'Vehicles', onClick: onBack }, { label: vehicle.registrationNo }]} />
      <PageHeader
        actions={(
          <>
            <Button onClick={onBack} variant="outline">Back</Button>
            <FleetAccessGate permission={ACTION_PERMISSIONS.editVehicle}>
              <Button icon={<Edit className="h-4 w-4" />} onClick={onEdit} variant="primary">Edit</Button>
            </FleetAccessGate>
            <FleetAccessGate permission={ACTION_PERMISSIONS.deleteVehicle}>
              <Button icon={<Trash2 className="h-4 w-4" />} onClick={() => setConfirmOpen(true)} variant="danger">Delete</Button>
            </FleetAccessGate>
          </>
        )}
        subtitle={`${vehicle.make} ${vehicle.model} · ${vehicle.location}`}
        title={vehicle.registrationNo}
      />

      <DetailTabs
        activeTab={activeTab}
        onChange={setActiveTab}
        tabs={[
          {
            id: 'overview',
            label: 'Overview',
            content: (
              <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h2 className="text-lg font-bold text-text">Vehicle Profile</h2>
                    <StatusBadge tone={vehicle.status === 'Active' ? 'success' : vehicle.status === 'Maintenance' ? 'warning' : 'neutral'}>{vehicle.status}</StatusBadge>
                  </div>
                  <InfoGrid columns="mt-5 sm:grid-cols-2">
                    <InfoItem label="VIN" value={vehicle.specs.vin} />
                    <InfoItem label="Engine Number" value={vehicle.specs.engineNo} />
                    <InfoItem label="Fuel Type" value={vehicle.specs.fuelType} />
                    <InfoItem label="Capacity" value={`${vehicle.specs.capacityKg.toLocaleString()} kg`} />
                    <InfoItem label="Odometer" value={`${vehicle.specs.odometerKm.toLocaleString()} km`} />
                    <InfoItem label="Utilization" value={`${vehicle.utilization}%`} />
                  </InfoGrid>
                  <MeterBar className="mt-5" value={vehicle.utilization} />
                </div>
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                  <h3 className="text-sm font-bold uppercase tracking-wide text-gray-500">Current Driver</h3>
                  {vehicle.driver ? (
                    <InfoGrid columns="mt-4">
                      <InfoItem label="Name" value={vehicle.driver.name} />
                      <InfoItem label="Phone" value={vehicle.driver.phone || 'Not provided'} />
                      <InfoItem label="License" value={vehicle.driver.licenseNo || 'Not provided'} />
                    </InfoGrid>
                  ) : <p className="mt-4 text-sm text-gray-500">No driver assigned.</p>}
                </div>
              </div>
            ),
          },
          {
            id: 'documents',
            label: 'Documents',
            content: (
              <div className="space-y-3">
                {vehicle.documents.length === 0 ? (
                  <EmptyState description="No compliance documents are attached to this vehicle." title="No documents" />
                ) : vehicle.documents.map((document) => (
                  <div className="flex items-center justify-between rounded-lg bg-gray-50 p-3" key={document.id}>
                    <div>
                      <p className="text-sm font-bold text-text">{document.name}</p>
                      <p className="text-xs text-gray-500">Expires {document.expiryDate}</p>
                    </div>
                    <StatusBadge tone={document.status === 'Valid' ? 'success' : document.status === 'Expired' ? 'danger' : 'warning'}>{document.status}</StatusBadge>
                  </div>
                ))}
              </div>
            ),
          },
          {
            id: 'maintenance',
            label: 'Maintenance',
            content: vehicleWorkOrders.length === 0 ? <EmptyState action={<Button onClick={() => navigateTo('/maintenance/create')} variant="accent">Create Work Order</Button>} description="No maintenance work orders are linked to this vehicle yet. Create one when service, inspection, or repair work is needed." title="No work orders" /> : (
              <div className="space-y-3">
                {vehicleWorkOrders.map((workOrder) => (
                  <button className="w-full rounded-xl border border-gray-200 bg-gray-50 p-4 text-left transition hover:border-primary" key={workOrder.id} onClick={() => navigateTo(`/maintenance/${workOrder.id}`)} type="button">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-bold text-primary">{workOrder.title}</p>
                        <p className="text-xs text-gray-500">{workOrder.technician} · Due {workOrder.dueDate}</p>
                      </div>
                      <StatusBadge tone={workOrder.status === 'Completed' ? 'success' : workOrder.status === 'In Progress' ? 'primary' : 'warning'}>{workOrder.status}</StatusBadge>
                    </div>
                  </button>
                ))}
              </div>
            ),
          },
          {
            id: 'parts',
            label: 'Parts Usage',
            content: vehicleParts.length === 0 ? <EmptyState action={<Button onClick={() => navigateTo('/maintenance/create')} variant="accent">Create Work Order</Button>} description="Parts usage appears here after a linked work order requests, issues, or consumes inventory." title="No parts usage" /> : (
              <div className="space-y-3">
                {vehicleParts.map((part) => {
                  const inventoryItem = partsInventory.find((item) => item.partId === part.partId || item.id === part.partId || item.partNumber === part.partNumber);
                  return (
                    <button className="w-full rounded-xl border border-gray-200 bg-gray-50 p-4 text-left transition hover:border-primary" key={part.id} onClick={() => inventoryItem && navigateTo(`/inventory/${inventoryItem.id}`)} type="button">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="font-bold text-primary">{part.partName}</p>
                          <p className="text-xs text-gray-500">{part.partNumber} · Qty {part.quantity}</p>
                        </div>
                        <StatusBadge tone={part.status === 'Consumed' ? 'success' : part.status === 'Issued' ? 'primary' : 'neutral'}>{part.status ?? 'Requested'}</StatusBadge>
                      </div>
                    </button>
                  );
                })}
              </div>
            ),
          },
          {
            id: 'compliance',
            label: 'Compliance',
            content: (
              <div className="space-y-4">
                {relatedAlerts.length === 0 ? <EmptyState description="No active alerts are linked to this vehicle." title="No related alerts" /> : <RelatedAlerts alerts={relatedAlerts} navigateTo={navigateTo} />}
                {assignments.length > 0 && (
                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                    <h3 className="text-sm font-bold uppercase tracking-wide text-gray-500">Dispatch Assignments</h3>
                    <div className="mt-3 space-y-2">
                      {assignments.map((assignment) => <p className="text-sm font-semibold text-text" key={assignment.id}>{assignment.routeName} · {assignment.status}</p>)}
                    </div>
                  </div>
                )}
              </div>
            ),
          },
        ]}
      />

      <ConfirmModal
        confirmLabel={deleting ? 'Deleting...' : 'Delete'}
        description={`Delete ${vehicle.registrationNo}? This removes the vehicle from the local fleet registry.`}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => void handleDelete()}
        open={confirmOpen}
        title="Delete vehicle"
      />
    </div>
  );
}

function RelatedAlerts({ alerts, navigateTo }: { alerts: FleetAlert[]; navigateTo: (path: string) => void }) {
  return (
    <div className="space-y-3">
      {alerts.map((alert) => (
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
  );
}
