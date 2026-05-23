import { Navigate } from 'react-router-dom'
import {
  Bell,
  Box,
  ChartLine,
  ClipboardCheck,
  CircleGauge,
  FileText,
  Gauge,
  Globe,
  Hammer,
  Map as MapIcon,
  Settings,
  Truck,
  Users,
  Wrench,
  Zap,
} from 'lucide-react'
import type { ModuleManifest } from '@shared-ui'
import { FleetRouteWrapper, useFleetTabNavigate } from './FleetRouteWrapper'
import { AlertManagementPage } from '../../pages/AlertManagementPage'
import { BatteryPage } from '../../pages/BatteryPage'
import { CompliancePage } from '../../pages/CompliancePage'
import { CostHealthPage } from '../../pages/CostHealthPage'
import { DashboardPage } from '../../pages/DashboardPage'
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
import { MarketplacePage } from '../../pages/MarketplacePage'
import { OpsIntelligencePage } from '../../pages/OpsIntelligencePage'
import { TyreAnalyticsPage } from '../../pages/TyreAnalyticsPage'
import { TyreDetailPage } from '../../pages/TyreDetailPage'
import { TyreIndentsPage } from '../../pages/TyreIndentsPage'
import { TyreInspectionsPage } from '../../pages/TyreInspectionsPage'
import { TyreInventoryPage } from '../../pages/TyreInventoryPage'
import { TyreJobsPage } from '../../pages/TyreJobsPage'
import { TyrePage } from '../../pages/TyrePage'
import { TyreTrackerPage } from '../../pages/TyreTrackerPage'
import { VendorManagementPage } from '../../pages/VendorManagementPage'

function DashboardPageBridge() {
  const navTab = useFleetTabNavigate()
  return <DashboardPage onNavigate={navTab} />
}

export const fleetManifest: ModuleManifest = {
  key: 'fleet',
  label: 'Fleet',
  icon: Truck,
  basePath: '/fleet',
  sidebar: [
    { label: 'Dashboard', path: '/fleet/dashboard', icon: Gauge },
    { label: 'Ops Intelligence', path: '/fleet/ops-intel', icon: ChartLine },
    { label: 'Exception Center', path: '/fleet/exceptions', icon: Bell },
    { label: 'Live Map', path: '/fleet/live-map', icon: MapIcon },
    { label: 'Dispatch', path: '/fleet/dispatch', icon: Globe },
    { label: 'Fleet Management', path: '/fleet/fleet', icon: Truck },
    { label: 'Drivers', path: '/fleet/drivers', icon: Users },
    { label: 'Compliance', path: '/fleet/compliance', icon: FileText },
    { label: 'Driver Behavior', path: '/fleet/behavior', icon: Zap },
    { label: 'Maintenance', path: '/fleet/maintenance', icon: Wrench },
    { label: 'Garage', path: '/fleet/garage', icon: Hammer },
    { label: 'Tyre Overview', path: '/fleet/tyres', icon: CircleGauge },
    { label: 'Tyre Inventory', path: '/fleet/tyres/inventory', icon: Box },
    { label: 'Tyre Tracker', path: '/fleet/tyres/tracker', icon: Globe },
    { label: 'Tyre Indents', path: '/fleet/tyres/indents', icon: ClipboardCheck },
    { label: 'Inventory', path: '/fleet/inventory', icon: Box },
    { label: 'Settings', path: '/fleet/settings', icon: Settings },
  ],
  wrapper: FleetRouteWrapper,
  routes: [
    { index: true, element: <Navigate to="/fleet/dashboard" replace /> },
    { path: 'dashboard', element: <DashboardPageBridge /> },
    { path: 'ops-intel', element: <OpsIntelligencePage /> },
    { path: 'exceptions', element: <ExceptionCenterPage /> },
    { path: 'exceptions/summary', element: <Navigate to="/fleet/exceptions" replace /> },
    { path: 'exceptions/rules', element: <AlertManagementPage /> },
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
