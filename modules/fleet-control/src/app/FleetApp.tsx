import React, { useEffect, useMemo, useState } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { ExceptionAPI } from '../../services/mockDatabase';
import { Layout, type Tab } from '../../components/Layout';
import { AlertManagementPage } from '../../pages/AlertManagementPage';
import { BatteryPage } from '../../pages/BatteryPage';
import { CompliancePage } from '../../pages/CompliancePage';
import { CostHealthPage } from '../../pages/CostHealthPage';
import { DashboardPage } from '../../pages/DashboardPage';
import { DataCoveragePage } from '../../pages/DataCoveragePage';
import { DispatchPage } from '../../pages/DispatchPage';
import { DriverBehaviorPage } from '../../pages/DriverBehaviorPage';
import { DriversPage } from '../../pages/DriversPage';
import { ExceptionCenterPage } from '../../pages/ExceptionCenterPage';
import { FleetPage } from '../../pages/FleetPage';
import { FleetSettingsPage } from '../../pages/FleetSettingsPage';
import { FuelPage } from '../../pages/FuelPage';
import { GaragePage } from '../../pages/GaragePage';
import { InventoryPage } from '../../pages/InventoryPage';
import { LiveMapPage } from '../../pages/LiveMapPage';
import { MaintenancePage } from '../../pages/MaintenancePage';
import { OpsIntelligencePage } from '../../pages/OpsIntelligencePage';
import { ReconciliationPage } from '../../pages/ReconciliationPage';
import { VendorManagementPage } from '../../pages/VendorManagementPage';
import { TyrePage } from '../../pages/TyrePage';
import { TyreDetailPage } from '../../pages/TyreDetailPage';
import { TyreInventoryPage } from '../../pages/TyreInventoryPage';
import { TyreTrackerPage } from '../../pages/TyreTrackerPage';
import { TyreAnalyticsPage } from '../../pages/TyreAnalyticsPage';
import { TyreIndentsPage } from '../../pages/TyreIndentsPage';
import { TyreInspectionsPage } from '../../pages/TyreInspectionsPage';
import { TyreJobsPage } from '../../pages/TyreJobsPage';
import { MarketplacePage } from '../../pages/MarketplacePage';

const routeToTab: Record<string, Tab> = {
  batteries: 'batteries',
  behavior: 'behavior',
  compliance: 'compliance',
  cost: 'cost',
  coverage: 'coverage',
  dashboard: 'dashboard',
  dispatch: 'dispatch',
  drivers: 'drivers',
  exceptions: 'exceptions',
  fleet: 'fleet',
  fuel: 'fuel',
  garage: 'garage',
  inventory: 'inventory',
  'live-map': 'live-map',
  maintenance: 'maintenance',
  'ops-intel': 'ops-intel',
  reconciliation: 'reconciliation',
  settings: 'settings',
  // 'tyres' was missing — all /fleet/tyres/* sub-routes extracted segment[1] = 'tyres'
  // but without this entry they fell through to the 'dashboard' fallback,
  // so the Tyre Mgmt sidebar item never highlighted as active.
  tyres: 'tyres',
  vendors: 'vendors',
  marketplace: 'marketplace',
};

export interface AppNotification {
  id: string;
  title: string;
  description: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
}

function FleetAppShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const exceptions = await ExceptionAPI.getAll();
        const open = exceptions
          .filter((e: any) => e.status === 'Open')
          .slice(0, 20)
          .map((e: any) => ({
            id: e.exception_id,
            title: e.exception_type,
            description: e.description || `Severity: ${e.severity}`,
            severity: e.severity as AppNotification['severity'],
          }));
        setNotifications(open);
      } catch {
        // silently ignore
      }
    };
    load();
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
  }, []);

  const activeTab = useMemo<Tab>(() => {
    const segment = location.pathname.split('/').filter(Boolean)[1] ?? 'dashboard';
    return routeToTab[segment] ?? 'dashboard';
  }, [location.pathname]);

  const handleNavigate = (tab: Tab) => {
    navigate(tab === 'dashboard' ? '/fleet/dashboard' : `/fleet/${tab}`);
  };

  return (
    <Layout activeTab={activeTab} onNavigate={handleNavigate} notifications={notifications}>
      <Routes>
        <Route path="/" element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage onNavigate={handleNavigate} />} />
        <Route path="ops-intel" element={<OpsIntelligencePage />} />
        <Route path="exceptions" element={<AlertManagementPage />} />
        <Route path="exceptions/summary" element={<ExceptionCenterPage />} />
        <Route path="coverage" element={<DataCoveragePage />} />
        <Route path="reconciliation" element={<ReconciliationPage />} />
        <Route path="live-map" element={<LiveMapPage />} />
        <Route path="dispatch" element={<DispatchPage />} />
        <Route path="fleet" element={<FleetPage />} />
        <Route path="marketplace" element={<MarketplacePage />} />
        <Route path="drivers" element={<DriversPage />} />
        <Route path="compliance" element={<CompliancePage />} />
        <Route path="maintenance" element={<MaintenancePage />} />
        <Route path="garage" element={<GaragePage />} />
        <Route path="batteries" element={<BatteryPage />} />
        <Route path="inventory" element={<InventoryPage />} />
        <Route path="vendors" element={<VendorManagementPage />} />
        <Route path="tyres" element={<TyrePage />} />
        <Route path="tyres/inventory" element={<TyreInventoryPage />} />
        <Route path="tyres/tracker" element={<TyreTrackerPage />} />
        <Route path="tyres/analytics" element={<TyreAnalyticsPage />} />
        <Route path="tyres/indents" element={<TyreIndentsPage />} />
        <Route path="tyres/inspections" element={<TyreInspectionsPage />} />
        <Route path="tyres/jobs" element={<TyreJobsPage />} />
        <Route path="tyres/:tyreId" element={<TyreDetailPage />} />
        <Route path="fuel" element={<FuelPage />} />
        <Route path="behavior" element={<DriverBehaviorPage />} />
        <Route path="cost" element={<CostHealthPage />} />
        <Route path="settings" element={<FleetSettingsPage />} />
        <Route path="*" element={<Navigate to="/fleet/dashboard" replace />} />
      </Routes>
    </Layout>
  );
}

export default function FleetApp() {
  return <FleetAppShell />;
}
