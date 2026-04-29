import { ClipboardList, Search, Truck, UserRound, Wrench, X, Boxes } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { FleetDriver, FleetTask, MaintenanceWorkOrder, PartInventoryItem, Vehicle } from '../types';
import { getTaskEntityPath } from '../modules/fleet/fleetTasks';

type SearchGroup = 'Vehicles' | 'Drivers' | 'Work Orders' | 'Parts' | 'Tasks';

interface SearchResult {
  description: string;
  group: SearchGroup;
  icon: typeof Truck;
  id: string;
  label: string;
  path: string;
}

interface GlobalSearchProps {
  drivers: FleetDriver[];
  onNavigate: (path: string) => void;
  parts: PartInventoryItem[];
  tasks: FleetTask[];
  vehicles: Vehicle[];
  workOrders: MaintenanceWorkOrder[];
}

const groupOrder: SearchGroup[] = ['Vehicles', 'Drivers', 'Work Orders', 'Parts', 'Tasks'];

export function GlobalSearch({ drivers, onNavigate, parts, tasks, vehicles, workOrders }: GlobalSearchProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen(true);
        window.setTimeout(() => inputRef.current?.focus(), 0);
      }
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, []);

  const groupedResults = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const results = buildResults({ drivers, parts, tasks, vehicles, workOrders });
    const filtered = normalized
      ? results.filter((result) => [result.label, result.description, result.group].join(' ').toLowerCase().includes(normalized))
      : results.slice(0, 10);
    return groupOrder.map((group) => ({ group, results: filtered.filter((result) => result.group === group).slice(0, 5) })).filter((group) => group.results.length > 0);
  }, [drivers, parts, query, tasks, vehicles, workOrders]);

  const handleNavigate = (path: string) => {
    onNavigate(path);
    setOpen(false);
    setQuery('');
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        aria-label="Open global search"
        className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 md:hidden"
        onClick={() => {
          setOpen(true);
          window.setTimeout(() => inputRef.current?.focus(), 0);
        }}
        type="button"
      >
        <Search className="h-4 w-4" />
      </button>

      <div className="hidden md:block">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          className="h-10 w-[min(38vw,440px)] rounded-lg border border-gray-200 bg-gray-50 pl-9 pr-20 text-sm outline-none ring-primary/20 transition focus:border-primary focus:bg-white focus:ring-4"
          onChange={(event) => setQuery(event.target.value)}
          onFocus={() => setOpen(true)}
          placeholder="Search vehicles, drivers, work orders, parts..."
          ref={inputRef}
          value={query}
        />
        <span className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded-md border border-gray-200 bg-white px-2 py-0.5 text-[11px] font-bold text-gray-400 lg:inline">
          ⌘K
        </span>
      </div>

      {open && (
        <div className="fixed inset-x-4 top-20 z-50 rounded-xl border border-gray-200 bg-white p-3 shadow-2xl md:absolute md:inset-x-auto md:left-0 md:top-12 md:w-[520px]">
          <div className="flex items-center gap-2 border-b border-gray-200 pb-3 md:hidden">
            <Search className="h-4 w-4 text-gray-400" />
            <input
              className="h-9 min-w-0 flex-1 text-sm outline-none"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search vehicles, drivers, work orders, parts..."
              ref={inputRef}
              value={query}
            />
            <button className="rounded-lg p-1 text-gray-500 hover:bg-gray-100" onClick={() => setOpen(false)} type="button">
              <X className="h-4 w-4" />
            </button>
          </div>

          {groupedResults.length === 0 ? (
            <div className="p-6 text-center">
              <p className="text-sm font-bold text-text">No matching results found</p>
              <p className="mt-2 text-sm text-gray-500">Try vehicle number, driver name, work order, or part name.</p>
            </div>
          ) : (
            <div className="max-h-[70vh] overflow-y-auto py-1">
              {groupedResults.map(({ group, results }) => (
                <section className="py-2" key={group}>
                  <p className="px-2 pb-1 text-[11px] font-extrabold uppercase tracking-wider text-gray-500">{group}</p>
                  <div className="space-y-1">
                    {results.map((result) => (
                      <SearchResultItem key={result.id} onSelect={() => handleNavigate(result.path)} result={result} />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SearchResultItem({ onSelect, result }: { onSelect: () => void; result: SearchResult }) {
  const Icon = result.icon;
  return (
    <button className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-gray-50" onClick={onSelect} type="button">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-bold text-text">{result.label}</span>
        <span className="block truncate text-xs font-semibold text-gray-500">{result.description}</span>
      </span>
      <span className="rounded-full bg-gray-100 px-2 py-1 text-[11px] font-bold text-gray-600">{result.group}</span>
    </button>
  );
}

function buildResults({ drivers, parts, tasks, vehicles, workOrders }: Omit<GlobalSearchProps, 'onNavigate'>): SearchResult[] {
  return [
    ...vehicles.map((vehicle): SearchResult => ({
      description: `${vehicle.make} ${vehicle.model} · ${vehicle.location} · ${vehicle.status}`,
      group: 'Vehicles',
      icon: Truck,
      id: `vehicle-${vehicle.id}`,
      label: vehicle.registrationNo,
      path: `/vehicle-management/${vehicle.id}`,
    })),
    ...drivers.map((driver): SearchResult => ({
      description: `${driver.licenseClass} · ${driver.baseLocation} · ${driver.assignmentStatus}`,
      group: 'Drivers',
      icon: UserRound,
      id: `driver-${driver.id}`,
      label: driver.name,
      path: `/driver-management/${driver.id}`,
    })),
    ...workOrders.map((workOrder): SearchResult => ({
      description: `${workOrder.vehicleRegistration} · ${workOrder.status} · ${workOrder.technician}`,
      group: 'Work Orders',
      icon: Wrench,
      id: `workOrder-${workOrder.id}`,
      label: workOrder.title,
      path: `/maintenance/${workOrder.id}`,
    })),
    ...parts.map((part): SearchResult => ({
      description: `${part.partNumber} · ${part.category ?? 'Unclassified'} · ${part.status}`,
      group: 'Parts',
      icon: Boxes,
      id: `part-${part.id}`,
      label: part.partName,
      path: `/inventory/${part.id}`,
    })),
    ...tasks.map((task): SearchResult => ({
      description: `${task.status} · ${task.assignedTo} · ${task.relatedEntityLabel}`,
      group: 'Tasks',
      icon: ClipboardList,
      id: `task-${task.id}`,
      label: task.title,
      path: getTaskEntityPath(task),
    })),
  ];
}
