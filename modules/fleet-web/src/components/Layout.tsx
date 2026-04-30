import { Bell, ChevronDown, ChevronLeft, ChevronRight, LogOut, Menu } from 'lucide-react';
import { ReactNode, useState } from 'react';
import { useAuth, useFleetAuth } from '@shared-auth';
import { AppPage, PageNavigationItem, getSidebarPage, pageRegistry, sidebarSections } from '../app/navigation';
import { FleetDriver, FleetTask, MaintenanceWorkOrder, PartInventoryItem, Vehicle } from '../types';
import { GlobalSearch } from './GlobalSearch';

interface LayoutProps {
  activePage: AppPage;
  children: ReactNode;
  criticalTaskCount: number;
  drivers: FleetDriver[];
  onNavigate: (page: AppPage) => void;
  onNavigateTo: (path: string) => void;
  partsInventory: PartInventoryItem[];
  subtitle: string;
  taskCount: number;
  tasks: FleetTask[];
  title: string;
  vehicles: Vehicle[];
  workOrders: MaintenanceWorkOrder[];
}

export function Layout({ activePage, children, criticalTaskCount, drivers, onNavigate, onNavigateTo, partsInventory, subtitle, taskCount, tasks, title, vehicles, workOrders }: LayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const { canAccessPage, user } = useFleetAuth();
  const { logout } = useAuth();
  const activeSidebarPage = getSidebarPage(activePage);
  const sidebarWidth = sidebarExpanded ? 'lg:w-80' : 'lg:w-20';
  const mainOffset = sidebarExpanded ? 'lg:pl-80' : 'lg:pl-20';

  const handleNavigate = (page: AppPage) => {
    onNavigate(page);
    setMobileOpen(false);
  };

  const toggleSection = (id: string) => setCollapsedSections((current) => ({ ...current, [id]: !current[id] }));

  const handleLogout = () => {
    logout();
    window.location.assign('/login');
  };

  return (
    <div className="min-h-screen bg-background text-text">
      <aside className={`fixed inset-y-0 left-0 hidden border-r border-gray-200 bg-white transition-all duration-300 lg:flex lg:flex-col ${sidebarWidth}`}>
        <div className={`flex items-center gap-3 border-b border-gray-200 px-4 py-4 ${sidebarExpanded ? '' : 'justify-center'}`}>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-lg font-extrabold text-white">
            O
          </div>
          {sidebarExpanded && (
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-secondary">Optimile</p>
              <h1 className="text-lg font-extrabold text-text">Fleet Management</h1>
            </div>
          )}
          <button
            aria-label={sidebarExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
            className="ml-auto flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition hover:bg-gray-50 hover:text-primary"
            onClick={() => setSidebarExpanded((open) => !open)}
            title={sidebarExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
            type="button"
          >
            {sidebarExpanded ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
        </div>
        <nav className={`flex flex-1 flex-col gap-5 overflow-y-auto py-4 ${sidebarExpanded ? 'px-3' : 'px-2'}`}>
          {sidebarSections.map((section) => {
            const visibleItems = section.items.map((id) => pageRegistry[id]).filter((item) => canAccessPage(item.id));
            if (visibleItems.length === 0) return null;
            const collapsed = sidebarExpanded && Boolean(collapsedSections[section.id]);
            return (
              <section key={section.id}>
                {sidebarExpanded ? (
                  <div className="mb-2 flex items-center justify-between px-3">
                    <p className="text-[11px] font-extrabold uppercase tracking-wider text-gray-500">{section.label}</p>
                    {section.collapsible && (
                      <button className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-primary" onClick={() => toggleSection(section.id)} type="button">
                        <ChevronDown className={`h-4 w-4 transition ${collapsed ? '-rotate-90' : ''}`} />
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="mb-2 border-t border-gray-100" title={section.label} />
                )}
                {!collapsed && (
                  <div className="space-y-1">
                    {visibleItems.map((item) => (
                      <SidebarNavItem
                        active={activeSidebarPage === item.id || activePage === item.id}
                        collapsed={!sidebarExpanded}
                        criticalTaskCount={criticalTaskCount}
                        item={item}
                        key={item.id}
                        onNavigate={handleNavigate}
                        taskCount={taskCount}
                      />
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </nav>
      </aside>

      <div className={`transition-all duration-300 ${mainOffset}`}>
        <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/95 backdrop-blur">
          <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <button className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 lg:hidden" onClick={() => setMobileOpen((open) => !open)} type="button">
                <Menu className="h-5 w-5" />
              </button>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-secondary">Optimile</p>
                <h1 className="text-lg font-bold text-text">{title}</h1>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <GlobalSearch
                drivers={drivers}
                onNavigate={onNavigateTo}
                parts={partsInventory}
                tasks={tasks}
                vehicles={vehicles}
                workOrders={workOrders}
              />
              <button className="relative rounded-lg border border-gray-200 p-2 text-gray-600 hover:bg-gray-50" type="button">
                <Bell className="h-5 w-5" />
                <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-danger" />
              </button>
              <div className="hidden text-right sm:block">
                <p className="text-sm font-semibold text-text">{user.name}</p>
                <p className="text-xs text-gray-500">{user.role} · {subtitle}</p>
              </div>
              <button
                aria-label="Sign out"
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 text-gray-600 transition hover:bg-gray-50 hover:text-primary"
                onClick={handleLogout}
                title="Sign out"
                type="button"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
          {mobileOpen && (
            <nav className="border-t border-gray-200 bg-white p-3 lg:hidden">
              <div className="mb-2 flex items-center justify-between px-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                Screens
                <ChevronDown className="h-4 w-4" />
              </div>
              <div className="space-y-4">
                {sidebarSections.map((section) => {
                  const visibleItems = section.items.map((id) => pageRegistry[id]).filter((item) => canAccessPage(item.id));
                  if (visibleItems.length === 0) return null;
                  return (
                    <div key={section.id}>
                      <p className="mb-2 px-2 text-[11px] font-extrabold uppercase tracking-wider text-gray-500">{section.label}</p>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {visibleItems.map(({ icon: Icon, id, label }) => (
                          <button
                            className={`flex items-center justify-between gap-2 rounded-xl px-3 py-2 text-sm font-bold ${
                              activeSidebarPage === id || activePage === id ? 'bg-primary text-white' : 'bg-gray-50 text-gray-700'
                            }`}
                            key={id}
                            onClick={() => handleNavigate(id)}
                            type="button"
                          >
                            <span className="flex items-center gap-2"><Icon className="h-4 w-4" />{id === 'my-tasks' ? 'Work Queue' : label}</span>
                            {id === 'my-tasks' && taskCount > 0 && <SidebarBadge count={taskCount} criticalCount={criticalTaskCount} />}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </nav>
          )}
        </header>
        <main className="px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}

function SidebarNavItem({ active, collapsed, criticalTaskCount, item, onNavigate, taskCount }: { active: boolean; collapsed: boolean; criticalTaskCount: number; item: PageNavigationItem; onNavigate: (page: AppPage) => void; taskCount: number }) {
  const Icon = item.icon;
  const isWorkQueue = item.id === 'my-tasks';
  const label = isWorkQueue ? 'Work Queue' : item.label;

  return (
    <button
      aria-label={label}
      className={`group relative flex w-full items-center gap-3 rounded-lg border-l-4 px-3 py-3 text-left transition ${
        active
          ? 'border-l-primary bg-primary/10 text-primary shadow-sm'
          : isWorkQueue
            ? 'border-l-warning bg-warning/5 text-text hover:bg-warning/10'
            : 'border-l-transparent text-gray-600 hover:border-l-gray-300 hover:bg-gray-100 hover:text-primary'
      } ${collapsed ? 'justify-center px-2' : ''}`}
      key={item.id}
      onClick={() => onNavigate(item.id)}
      title={collapsed ? label : undefined}
      type="button"
    >
      <Icon className={`h-5 w-5 shrink-0 ${active ? 'text-primary' : isWorkQueue ? 'text-warning' : 'text-gray-400 group-hover:text-primary'}`} />
      {!collapsed && (
        <>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-extrabold">{label}</span>
            <span className="block truncate text-xs font-semibold text-gray-400">{item.description}</span>
          </span>
          {isWorkQueue && taskCount > 0 && <SidebarBadge count={taskCount} criticalCount={criticalTaskCount} />}
        </>
      )}
      {collapsed && isWorkQueue && taskCount > 0 && <span className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full bg-danger ring-2 ring-white" />}
    </button>
  );
}

function SidebarBadge({ count, criticalCount }: { count: number; criticalCount: number }) {
  const tone = criticalCount > 0 ? 'bg-danger text-white' : 'bg-warning/15 text-warning ring-1 ring-warning/20';
  return <span className={`inline-flex min-w-7 justify-center rounded-full px-2 py-0.5 text-xs font-extrabold ${tone}`}>{count}</span>;
}
