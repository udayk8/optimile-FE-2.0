import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { AuthProvider, FleetAuthProvider, useFleetAuth } from '@shared-auth';
import { Layout } from '../components/Layout';
import { LoadingState } from '../components/LoadingState';
import { useOperationalData, OperationalDataProvider } from '../stores/OperationalDataProvider';
import { AppPage, getNavigationItem } from './navigation';
import { buildFleetHash, parseFleetHash } from '../routing/fleetRoutes';
import '../styles/global.css';

const AccessDenied = lazy(() => import('../components/AccessDenied').then((module) => ({ default: module.AccessDenied })));
const FleetDashboardPage = lazy(() => import('../modules/fleet/FleetDashboardPage').then((module) => ({ default: module.FleetDashboardPage })));
const FleetSectionPage = lazy(() => import('../modules/fleet/FleetSectionPage').then((module) => ({ default: module.FleetSectionPage })));
const MyTasksPage = lazy(() => import('../modules/fleet/tasks/MyTasksPage').then((module) => ({ default: module.MyTasksPage })));
const OpsIntelligencePage = lazy(() => import('../modules/fleet/OpsIntelligencePage').then((module) => ({ default: module.OpsIntelligencePage })));

function FleetRoutes() {
  const [route, setRoute] = useState(() => parseFleetHash(window.location.hash));
  const page = route.section;
  const { canAccessPage } = useFleetAuth();
  const operationalData = useOperationalData();

  useEffect(() => {
    const onHashChange = () => setRoute(parseFleetHash(window.location.hash));
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const activeItem = useMemo(() => getNavigationItem(page), [page]);

  const navigate = useCallback((nextPage: AppPage) => {
    if (nextPage === page) return;
    window.location.hash = buildFleetHash(nextPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [page]);

  const navigateTo = useCallback((path: string) => {
    window.location.hash = path;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const openTasks = operationalData.tasks.filter((task) => task.status !== 'Completed');
  const criticalTaskCount = openTasks.filter((task) => task.severity === 'Critical').length;

  return (
    <Layout
      activePage={page}
      criticalTaskCount={criticalTaskCount}
      drivers={operationalData.drivers}
      onNavigate={navigate}
      onNavigateTo={navigateTo}
      partsInventory={operationalData.partsInventory}
      subtitle={activeItem.description}
      taskCount={openTasks.length}
      tasks={operationalData.tasks}
      title={activeItem.label}
      vehicles={operationalData.vehicles}
      workOrders={operationalData.workOrders}
    >
      <Suspense fallback={<LoadingState label="Loading fleet module" />}>
        <div key={page} className="animate-in fade-in duration-300">
          {!canAccessPage(page) ? (
            <AccessDenied onNavigate={navigate} />
          ) : page === 'dashboard' ? (
            <FleetDashboardPage onNavigate={navigate} />
          ) : page === 'my-tasks' ? (
            <MyTasksPage navigateTo={navigateTo} reassignTask={operationalData.reassignTask} tasks={operationalData.tasks} updateTaskStatus={operationalData.updateTaskStatus} />
          ) : page === 'ops-intelligence' ? (
            <OpsIntelligencePage />
          ) : (
            <FleetSectionPage navigateTo={navigateTo} page={page} route={route} {...operationalData} />
          )}
        </div>
      </Suspense>
    </Layout>
  );
}

export default function FleetApp({ standalone = false }: { standalone?: boolean }) {
  const app = (
    <div className="optimile-fleet-root">
      <FleetAuthProvider>
        <OperationalDataProvider>
          <FleetRoutes />
        </OperationalDataProvider>
      </FleetAuthProvider>
    </div>
  );

  return standalone ? <AuthProvider>{app}</AuthProvider> : app;
}
