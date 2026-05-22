import { useCallback } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import {
  Activity,
  BarChart3,
  Bell,
  Boxes,
  ClipboardCheck,
  Cog,
  Disc3,
  LayoutDashboard,
  Map,
  Send,
  ShoppingBag,
  Truck,
  Users,
  Wrench,
} from 'lucide-react'
import type { ModuleManifest } from '../../../../src/shell/manifest'
import { AlertManagementPage } from '../../pages/AlertManagementPage'
import { BatteryPage } from '../../pages/BatteryPage'
import { CompliancePage } from '../../pages/CompliancePage'
import { CostHealthPage } from '../../pages/CostHealthPage'
import { DashboardPage } from '../../pages/DashboardPage'
import { DataCoveragePage } from '../../pages/DataCoveragePage'
import { DispatchPage } from '../../pages/DispatchPage'
import { DriverBehaviorPage } from '../../pages/DriverBehaviorPage'
import { DriversPage } from '../../pages/DriversPage'
import { ExceptionCenterPage } from '../../pages/ExceptionCenterPage'
import { FleetPage } from '../../pages/FleetPage'
import { FleetSettingsPage } from '../../pages/FleetSettingsPage'
import { FuelPage } from '../../pages/FuelPage'
import { GaragePage } from '../../pages/GaragePage'
import { InventoryPage } from '../../pages/InventoryPage'
import { LiveMapPage } from '../../pages/LiveMapPage'
import { MaintenancePage } from '../../pages/MaintenancePage'
import { OpsIntelligencePage } from '../../pages/OpsIntelligencePage'
import { ReconciliationPage } from '../../pages/ReconciliationPage'
import { VendorManagementPage } from '../../pages/VendorManagementPage'
import { TyrePage } from '../../pages/TyrePage'
import { TyreDetailPage } from '../../pages/TyreDetailPage'
import { TyreInventoryPage } from '../../pages/TyreInventoryPage'
import { TyreTrackerPage } from '../../pages/TyreTrackerPage'
import { TyreAnalyticsPage } from '../../pages/TyreAnalyticsPage'
import { TyreIndentsPage } from '../../pages/TyreIndentsPage'
import { TyreInspectionsPage } from '../../pages/TyreInspectionsPage'
import { TyreJobsPage } from '../../pages/TyreJobsPage'
import { MarketplacePage } from '../../pages/MarketplacePage'

function DashboardWithNav() {
  const navigate = useNavigate()
  const onNavigate = useCallback(
    (tab: string) => navigate(tab === 'dashboard' ? '/fleet/dashboard' : `/fleet/${tab}`),
    [navigate],
  )
  return <DashboardPage onNavigate={onNavigate} />
}

export const fleetManifest: ModuleManifest = {
  key: 'fleet',
  label: 'Fleet',
  icon: Truck,
  basePath: '/fleet',
  defaultPath: '/fleet/dashboard',
  sidebar: [
    { label: 'Dashboard', path: '/fleet/dashboard', icon: LayoutDashboard },
    { label: 'Ops Intelligence', path: '/fleet/ops-intel', icon: BarChart3 },
    { label: 'Exception Center', path: '/fleet/exceptions', icon: Bell },
    { label: 'Live Map', path: '/fleet/live-map', icon: Map },
    { label: 'Dispatch Console', path: '/fleet/dispatch', icon: Send },
    { label: 'Fleet Management', path: '/fleet/fleet', icon: Truck },
    { label: 'Driver Management', path: '/fleet/drivers', icon: Users },
    { label: 'Marketplace', path: '/fleet/marketplace', icon: ShoppingBag },
    { label: 'Compliance', path: '/fleet/compliance', icon: ClipboardCheck },
    { label: 'Driver Behavior', path: '/fleet/behavior', icon: Activity },
    { label: 'Maintenance', path: '/fleet/maintenance', icon: Wrench },
    { label: 'Garage', path: '/fleet/garage', icon: Cog },
    { label: 'Tyre Management', path: '/fleet/tyres', icon: Disc3 },
    { label: 'Inventory', path: '/fleet/inventory', icon: Boxes },
  ],
  routes: [
    { index: true, element: <Navigate to="dashboard" replace /> },
    { path: 'dashboard', element: <DashboardWithNav /> },
    { path: 'ops-intel', element: <OpsIntelligencePage /> },
    { path: 'exceptions', element: <ExceptionCenterPage /> },
    { path: 'exceptions/summary', element: <Navigate to="/fleet/exceptions" replace /> },
    { path: 'exceptions/rules', element: <AlertManagementPage /> },
    { path: 'coverage', element: <DataCoveragePage /> },
    { path: 'reconciliation', element: <ReconciliationPage /> },
    { path: 'live-map', element: <LiveMapPage /> },
    { path: 'dispatch', element: <DispatchPage /> },
    { path: 'fleet', element: <FleetPage /> },
    { path: 'marketplace', element: <MarketplacePage /> },
    { path: 'drivers', element: <DriversPage /> },
    { path: 'compliance', element: <CompliancePage /> },
    { path: 'maintenance', element: <MaintenancePage /> },
    { path: 'garage', element: <GaragePage /> },
    { path: 'batteries', element: <BatteryPage /> },
    { path: 'inventory', element: <InventoryPage /> },
    { path: 'vendors', element: <VendorManagementPage /> },
    { path: 'tyres', element: <TyrePage /> },
    { path: 'tyres/inventory', element: <TyreInventoryPage /> },
    { path: 'tyres/tracker', element: <TyreTrackerPage /> },
    { path: 'tyres/analytics', element: <TyreAnalyticsPage /> },
    { path: 'tyres/indents', element: <TyreIndentsPage /> },
    { path: 'tyres/inspections', element: <TyreInspectionsPage /> },
    { path: 'tyres/jobs', element: <TyreJobsPage /> },
    { path: 'tyres/:tyreId', element: <TyreDetailPage /> },
    { path: 'fuel', element: <FuelPage /> },
    { path: 'behavior', element: <DriverBehaviorPage /> },
    { path: 'cost', element: <CostHealthPage /> },
    { path: 'settings', element: <FleetSettingsPage /> },
    { path: '*', element: <Navigate to="/fleet/dashboard" replace /> },
  ],
}
