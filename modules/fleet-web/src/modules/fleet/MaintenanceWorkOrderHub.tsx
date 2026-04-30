import { CalendarClock, GripVertical } from 'lucide-react';
import { FleetAccessGate } from '@shared-auth';
import { ACTION_PERMISSIONS } from '@shared-auth/modulePermissions';
import { MaintenanceWorkOrder, WorkOrderStatus } from '../../types';

const columns: WorkOrderStatus[] = ['Open', 'In Progress', 'Pending Inspection', 'Completed'];

interface MaintenanceWorkOrderHubProps {
  onOrderSelect?: (workOrder: MaintenanceWorkOrder) => void;
  workOrders: MaintenanceWorkOrder[];
  onStatusChange: (id: string, status: WorkOrderStatus) => void | Promise<void>;
}

export function MaintenanceWorkOrderHub({ onOrderSelect, onStatusChange, workOrders }: MaintenanceWorkOrderHubProps) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm animate-in fade-in duration-300">
      <div className="mb-5">
        <p className="text-sm font-semibold text-secondary">Maintenance</p>
        <h2 className="text-lg font-bold text-text">Work Order Hub</h2>
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        {columns.map((status) => (
          <div
            className="min-h-64 rounded-xl border border-gray-200 bg-gray-50 p-3"
            key={status}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              const id = event.dataTransfer.getData('text/work-order-id');
              if (id) void onStatusChange(id, status);
            }}
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-bold text-text">{status}</h3>
              <span className="rounded-full bg-white px-2 py-1 text-xs font-bold text-gray-600 ring-1 ring-gray-200">
                {workOrders.filter((order) => order.status === status).length}
              </span>
            </div>
            <div className="space-y-3">
              {workOrders.filter((order) => order.status === status).map((order) => (
                <article
                  className="cursor-grab rounded-xl border border-gray-200 bg-white p-4 shadow-sm active:cursor-grabbing"
                  draggable
                  key={order.id}
                  onClick={() => onOrderSelect?.(order)}
                  onDragStart={(event) => event.dataTransfer.setData('text/work-order-id', order.id)}
                >
                  <div className="flex items-start gap-2">
                    <GripVertical className="mt-0.5 h-4 w-4 text-gray-400" />
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-text">{order.title}</p>
                      <p className="mt-1 text-xs font-semibold text-secondary">{order.vehicleRegistration}</p>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between text-xs">
                    <span className={`rounded-full px-2 py-1 font-bold ${order.priority === 'High' ? 'bg-danger/10 text-danger' : order.priority === 'Medium' ? 'bg-warning/10 text-warning' : 'bg-success/10 text-success'}`}>
                      {order.priority}
                    </span>
                    <span className="flex items-center gap-1 text-gray-500">
                      <CalendarClock className="h-3.5 w-3.5" />
                      {order.dueDate}
                    </span>
                  </div>
                  {order.estimatedCost && (
                    <div className="mt-3 rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-600">
                      Rs {order.estimatedCost.toLocaleString()} · {order.approvalRequired} approval
                    </div>
                  )}
                  <FleetAccessGate
                    fallback={<p className="mt-3 rounded-lg bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-500">Read-only for your role</p>}
                    permission={ACTION_PERMISSIONS.updateWorkOrder}
                  >
                    <select
                      className="mt-3 h-9 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm font-medium text-gray-700"
                      onClick={(event) => event.stopPropagation()}
                      onChange={(event) => void onStatusChange(order.id, event.target.value as WorkOrderStatus)}
                      value={order.status}
                    >
                      {columns.map((option) => <option key={option}>{option}</option>)}
                    </select>
                  </FleetAccessGate>
                </article>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
