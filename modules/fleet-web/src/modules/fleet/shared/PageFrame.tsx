import { ArrowRight } from 'lucide-react';
import { ReactNode } from 'react';
import { FleetAccessGate } from '@shared-auth';
import { ACTION_PERMISSIONS } from '@shared-auth/modulePermissions';
import { AppPage, getNavigationItem } from '../../../app/navigation';
import { Button } from '../../../components/Button';

export function PageFrame({ children, page }: { children: ReactNode; page: AppPage }) {
  const item = getNavigationItem(page);
  const Icon = item.icon;

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-4">
            <div className="rounded-xl bg-primary/10 p-3 text-primary">
              <Icon className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-bold uppercase tracking-wide text-accent">Optimile Fleet MVP</p>
              <h1 className="mt-1 text-2xl font-extrabold text-text">{item.label}</h1>
              <p className="mt-1 max-w-4xl text-sm text-gray-600">{item.description}</p>
            </div>
          </div>
          <FleetAccessGate permission={permissionForWorkflow(page)}>
            <Button icon={<ArrowRight className="h-4 w-4" />} variant="outline">Open Workflow</Button>
          </FleetAccessGate>
        </div>
      </section>
      {children}
    </div>
  );
}

function permissionForWorkflow(page: AppPage) {
  if (page === 'vehicle-management' || page === 'vehicle-master') return ACTION_PERMISSIONS.createVehicle;
  if (page === 'driver-management' || page === 'driver-behavior') return ACTION_PERMISSIONS.createDriver;
  if (page === 'maintenance' || page === 'garage-mgmt') return ACTION_PERMISSIONS.createWorkOrder;
  if (page === 'fuel-energy' || page === 'reconciliation') return ACTION_PERMISSIONS.reviewFuel;
  if (page.startsWith('tyre')) return ACTION_PERMISSIONS.manageTyres;
  if (page === 'inventory') return ACTION_PERMISSIONS.manageInventory;
  if (page === 'dispatch-console') return ACTION_PERMISSIONS.assignDispatch;
  if (page === 'alert-management' || page === 'exception-center') return ACTION_PERMISSIONS.manageAlerts;
  return ACTION_PERMISSIONS.exportReports;
}
