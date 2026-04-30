import { Download, Plus } from 'lucide-react';
import { FleetAccessGate } from '@shared-auth';
import { ACTION_PERMISSIONS } from '@shared-auth/modulePermissions';
import { Button } from '../../../components/Button';
import { EmptyState } from '../../../components/EmptyState';
import { ErrorState } from '../../../components/ErrorState';
import { LoadingState } from '../../../components/LoadingState';
import { PageHeader } from '../../../components/PageHeader';
import { FleetRoute } from '../../../routing/fleetRoutes';
import { DispatchAssignment, FleetAlert, MaintenanceWorkOrder, PartInventoryItem, Vehicle } from '../../../types';
import { VehicleList } from '../VehicleList';
import { VehicleDetailPage } from './VehicleDetailPage';
import { VehicleFormPage } from './VehicleFormPage';

interface VehicleManagementPageProps {
  createVehicle: (vehicle: Vehicle) => Promise<Vehicle>;
  deleteVehicle: (id: string) => Promise<void>;
  error: string | null;
  alerts: FleetAlert[];
  dispatchAssignments: DispatchAssignment[];
  loading: boolean;
  navigateTo: (path: string) => void;
  partsInventory: PartInventoryItem[];
  route: FleetRoute;
  updateVehicle: (vehicle: Vehicle) => Promise<Vehicle>;
  vehicles: Vehicle[];
  workOrders: MaintenanceWorkOrder[];
}

export function VehicleManagementPage({ alerts, createVehicle, deleteVehicle, dispatchAssignments, error, loading, navigateTo, partsInventory, route, updateVehicle, vehicles, workOrders }: VehicleManagementPageProps) {
  const vehicle = route.id ? vehicles.find((item) => item.id === route.id) : undefined;
  const basePath = `/${route.section}`;

  if (loading) return <LoadingState label="Loading vehicles" />;
  if (error && vehicles.length === 0) return <ErrorState message={error} title="Vehicle data unavailable" />;

  if (route.mode === 'create') {
    return (
      <FleetAccessGate fallback={<EmptyState description="You do not have permission to create vehicles." title="Create unavailable" />} permission={ACTION_PERMISSIONS.createVehicle}>
        <VehicleFormPage
          mode="create"
          onCancel={() => navigateTo(basePath)}
          onSubmit={async (nextVehicle) => {
            const created = await createVehicle(nextVehicle);
            navigateTo(`${basePath}/${created.id}`);
          }}
        />
      </FleetAccessGate>
    );
  }

  if (route.mode === 'edit') {
    return (
      <FleetAccessGate fallback={<EmptyState description="You do not have permission to edit vehicles." title="Edit unavailable" />} permission={ACTION_PERMISSIONS.editVehicle}>
        <VehicleFormPage
          mode="edit"
          onCancel={() => navigateTo(vehicle ? `${basePath}/${vehicle.id}` : basePath)}
          onSubmit={async (nextVehicle) => {
            const updated = await updateVehicle(nextVehicle);
            navigateTo(`${basePath}/${updated.id}`);
          }}
          vehicle={vehicle}
        />
      </FleetAccessGate>
    );
  }

  if (route.mode === 'detail') {
    return (
      <VehicleDetailPage
        onBack={() => navigateTo(basePath)}
        onDelete={async () => {
          if (!vehicle) return;
          await deleteVehicle(vehicle.id);
          navigateTo(basePath);
        }}
        onEdit={() => vehicle && navigateTo(`${basePath}/${vehicle.id}/edit`)}
        alerts={alerts}
        dispatchAssignments={dispatchAssignments}
        navigateTo={navigateTo}
        partsInventory={partsInventory}
        vehicle={vehicle}
        workOrders={workOrders}
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        actions={(
          <>
            <FleetAccessGate permission={ACTION_PERMISSIONS.createVehicle}>
              <Button icon={<Plus className="h-4 w-4" />} onClick={() => navigateTo(`${basePath}/create`)} variant="accent">Add Vehicle</Button>
            </FleetAccessGate>
            <FleetAccessGate permission={ACTION_PERMISSIONS.exportVehicles}>
              <Button icon={<Download className="h-4 w-4" />} variant="outline">Export</Button>
            </FleetAccessGate>
          </>
        )}
        subtitle="Create, inspect, and maintain fleet vehicle master records."
        title="Vehicle Management"
      />
      {error && <ErrorState message={error} title="Showing cached or demo vehicle data" />}
      <VehicleList
        onVehicleSelect={(selected) => navigateTo(`${basePath}/${selected.id}`)}
        vehicles={vehicles}
      />
    </div>
  );
}
