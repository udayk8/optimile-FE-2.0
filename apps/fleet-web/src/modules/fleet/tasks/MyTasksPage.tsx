import { useMemo } from 'react';
import { Button } from '../../../components/Button';
import { DataTable, DataTableColumn } from '../../../components/DataTable';
import { EmptyState } from '../../../components/EmptyState';
import { PageHeader } from '../../../components/PageHeader';
import { StatusBadge } from '../../../components/StatusBadge';
import { FleetTask, FleetTaskStatus } from '../../../types';
import { getTaskEntityPath, isTaskOverdue } from '../fleetTasks';

interface MyTasksPageProps {
  navigateTo: (path: string) => void;
  reassignTask: (id: string, assignedTo: string, assignedRole: string) => void;
  tasks: FleetTask[];
  updateTaskStatus: (id: string, status: FleetTaskStatus) => void;
}

const today = new Date().toISOString().slice(0, 10);

export function MyTasksPage({ navigateTo, reassignTask, tasks, updateTaskStatus }: MyTasksPageProps) {
  const { completed, overdue, todayTasks } = useMemo(() => ({
    completed: tasks.filter((task) => task.status === 'Completed'),
    overdue: tasks.filter((task) => isTaskOverdue(task)),
    todayTasks: tasks.filter((task) => task.status !== 'Completed' && !isTaskOverdue(task) && task.dueAt.slice(0, 10) <= today),
  }), [tasks]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <PageHeader
        subtitle="Assigned operational work generated from alerts, dispatch blockers, work orders, and inventory risk."
        title="My Tasks"
      />
      <TaskSection
        emptyDescription="No task is due today. New alerts, blocked dispatch checks, open work orders, and low stock will appear here automatically."
        navigateTo={navigateTo}
        reassignTask={reassignTask}
        tasks={todayTasks}
        title="Today"
        updateTaskStatus={updateTaskStatus}
      />
      <TaskSection
        emptyDescription="No overdue tasks. Keep resolving critical actions before their SLA expires."
        navigateTo={navigateTo}
        reassignTask={reassignTask}
        tasks={overdue}
        title="Overdue"
        updateTaskStatus={updateTaskStatus}
      />
      <TaskSection
        emptyDescription="Completed tasks will appear here for audit review."
        navigateTo={navigateTo}
        reassignTask={reassignTask}
        tasks={completed}
        title="Completed"
        updateTaskStatus={updateTaskStatus}
      />
    </div>
  );
}

function TaskSection({ emptyDescription, navigateTo, reassignTask, tasks, title, updateTaskStatus }: { emptyDescription: string; navigateTo: (path: string) => void; reassignTask: (id: string, assignedTo: string, assignedRole: string) => void; tasks: FleetTask[]; title: string; updateTaskStatus: (id: string, status: FleetTaskStatus) => void }) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-secondary">Task Queue</p>
          <h2 className="text-lg font-bold text-text">{title}</h2>
        </div>
        <StatusBadge tone={tasks.length > 0 ? 'primary' : 'neutral'}>{`${tasks.length} tasks`}</StatusBadge>
      </div>
      {tasks.length === 0 ? (
        <EmptyState description={emptyDescription} title={`No ${title.toLowerCase()} tasks`} />
      ) : (
        <DataTable
          columns={columns({ navigateTo, reassignTask, updateTaskStatus })}
          getRowKey={(task) => task.id}
          pageSize={8}
          rows={tasks}
        />
      )}
    </section>
  );
}

function columns({ navigateTo, reassignTask, updateTaskStatus }: { navigateTo: (path: string) => void; reassignTask: (id: string, assignedTo: string, assignedRole: string) => void; updateTaskStatus: (id: string, status: FleetTaskStatus) => void }): Array<DataTableColumn<FleetTask>> {
  return [
    {
      header: 'Task',
      key: 'task',
      render: (task) => <div><p className="font-bold text-text">{task.title}</p><p className="text-xs text-gray-500">{task.relatedEntityLabel} · {task.sourceType}</p></div>,
      sortable: true,
      sortValue: (task) => task.title,
    },
    { header: 'Severity', key: 'severity', render: (task) => <StatusBadge tone={severityTone(task.severity)}>{task.severity}</StatusBadge>, sortable: true, sortValue: (task) => task.severity },
    { header: 'Status', key: 'status', render: (task) => <TaskStatusSelect onChange={(status) => updateTaskStatus(task.id, status)} value={task.status} />, sortable: true, sortValue: (task) => task.status },
    { header: 'Due', key: 'due', render: (task) => <span className={isTaskOverdue(task) ? 'font-bold text-danger' : 'font-semibold text-gray-700'}>{formatDateTime(task.dueAt)}</span>, sortable: true, sortValue: (task) => task.dueAt },
    {
      header: 'Assignment',
      key: 'assignment',
      render: (task) => <AssignmentSelect task={task} onAssign={(assignedTo, assignedRole) => reassignTask(task.id, assignedTo, assignedRole)} />,
      sortable: true,
      sortValue: (task) => task.assignedTo,
    },
    { header: 'Audit', key: 'audit', render: (task) => <span className="text-xs text-gray-500">Created by {task.audit.createdBy}<br />{task.audit.assignedBy ? `Assigned by ${task.audit.assignedBy}` : 'Auto-assigned'}{task.audit.completedBy ? <><br />Completed by {task.audit.completedBy}</> : null}</span> },
    { align: 'right', header: 'Action', key: 'action', render: (task) => <Button className="h-9 px-3" onClick={() => navigateTo(getTaskEntityPath(task))} variant="secondary">Open</Button> },
  ];
}

function TaskStatusSelect({ onChange, value }: { onChange: (status: FleetTaskStatus) => void; value: FleetTaskStatus }) {
  return (
    <select className="h-9 rounded-lg border border-gray-300 bg-white px-2 text-sm font-semibold outline-none ring-primary/20 focus:border-primary focus:ring-4" onChange={(event) => onChange(event.target.value as FleetTaskStatus)} value={value}>
      {(['Open', 'In Progress', 'Completed'] as FleetTaskStatus[]).map((status) => <option key={status}>{status}</option>)}
    </select>
  );
}

function AssignmentSelect({ onAssign, task }: { onAssign: (assignedTo: string, assignedRole: string) => void; task: FleetTask }) {
  const options = [
    ['Fleet Manager', 'Fleet Manager'],
    ['Garage Manager', 'Garage Manager'],
    ['Operations Manager', 'Operations Manager'],
    ['Finance Manager', 'Finance Manager'],
    ['Technician', 'Technician'],
  ];
  return (
    <select className="h-9 rounded-lg border border-gray-300 bg-white px-2 text-sm font-semibold outline-none ring-primary/20 focus:border-primary focus:ring-4" onChange={(event) => onAssign(event.target.value, event.target.value)} value={task.assignedTo}>
      {!options.some(([name]) => name === task.assignedTo) && <option>{task.assignedTo}</option>}
      {options.map(([name]) => <option key={name}>{name}</option>)}
    </select>
  );
}

function severityTone(severity: FleetTask['severity']) {
  if (severity === 'Critical') return 'danger';
  if (severity === 'High') return 'warning';
  return 'primary';
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}
