import {
  Battery,
  Bell,
  Boxes,
  BriefcaseBusiness,
  ChartNoAxesColumn,
  CircleDollarSign,
  ClipboardCheck,
  ClipboardList,
  Database,
  FileCheck2,
  FileSearch,
  Fuel,
  Globe2,
  Grid2X2,
  HeartPulse,
  Map,
  Package,
  ScrollText,
  TriangleAlert,
  Truck,
  UsersRound,
  Wrench,
  Zap,
} from 'lucide-react';
import { ComponentType } from 'react';
import type { FleetAppPage, Permission } from '@shared-auth/modulePermissions';

export type AppPage = FleetAppPage;

export interface NavigationItem {
  id: AppPage;
  label: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
  permission?: Permission;
}

export interface PageNavigationItem extends NavigationItem {
  featureFlag?: string;
  hiddenForMvp?: boolean;
  mvpTabs?: string[];
  parentId?: AppPage;
}

export interface SidebarSection {
  collapsible?: boolean;
  id: string;
  items: AppPage[];
  label: string;
}

export const pageRegistry: Record<AppPage, PageNavigationItem> = {
  dashboard: {
    id: 'dashboard',
    label: 'Dashboard',
    description: 'Fleet overview',
    icon: Grid2X2,
    mvpTabs: ['Overview', 'Ops Intelligence'],
  },
  'my-tasks': {
    id: 'my-tasks',
    label: 'My Tasks',
    description: 'Assigned work queue',
    icon: ClipboardList,
    mvpTabs: ['Today', 'Overdue', 'Completed'],
  },
  'dispatch-console': {
    id: 'dispatch-console',
    label: 'Dispatch',
    description: 'Assignments and readiness',
    icon: Map,
    mvpTabs: ['Assignments', 'Pre-checks', 'Live Map'],
  },
  'vehicle-management': {
    id: 'vehicle-management',
    label: 'Vehicles',
    description: 'Fleet assets',
    icon: Truck,
    mvpTabs: ['Vehicles', 'Vehicle Master', 'Tyres', 'Battery'],
  },
  'driver-management': {
    id: 'driver-management',
    label: 'Drivers',
    description: 'Readiness and profiles',
    icon: UsersRound,
    mvpTabs: ['Drivers', 'Readiness', 'Behavior'],
  },
  maintenance: {
    id: 'maintenance',
    label: 'Maintenance',
    description: 'Work orders',
    icon: Wrench,
    mvpTabs: ['Work Orders', 'Garage', 'Parts Usage'],
  },
  compliance: {
    id: 'compliance',
    label: 'Compliance',
    description: 'Documents and gates',
    icon: FileCheck2,
    mvpTabs: ['Documents', 'Expiring Soon', 'Dispatch Gates'],
  },
  'exception-center': {
    id: 'exception-center',
    label: 'Alerts',
    description: 'Exceptions and rules',
    icon: Bell,
    mvpTabs: ['Exceptions', 'Rules', 'Resolution'],
  },
  'ops-intelligence': {
    id: 'ops-intelligence',
    label: 'Ops Intelligence',
    description: 'KPI command center',
    icon: ChartNoAxesColumn,
    parentId: 'dashboard',
  },
  'alert-management': {
    id: 'alert-management',
    label: 'Alert Rules',
    description: 'Rules and thresholds',
    icon: TriangleAlert,
    parentId: 'exception-center',
  },
  'driver-behavior': {
    id: 'driver-behavior',
    label: 'Driver Behavior',
    description: 'Score and events',
    icon: Zap,
    parentId: 'driver-management',
  },
  'data-coverage': {
    id: 'data-coverage',
    label: 'Data Coverage',
    description: 'Device and data health',
    icon: Database,
    featureFlag: 'fleet.telemetry',
    hiddenForMvp: true,
    parentId: 'dispatch-console',
  },
  reconciliation: {
    id: 'reconciliation',
    label: 'Reconciliation',
    description: 'Fuel and ledger checks',
    icon: ClipboardCheck,
    featureFlag: 'fleet.financeOps',
    hiddenForMvp: true,
    parentId: 'dashboard',
  },
  'live-map': {
    id: 'live-map',
    label: 'Live Map',
    description: 'GPS and route view',
    icon: Globe2,
    featureFlag: 'fleet.liveMap',
    hiddenForMvp: true,
    parentId: 'dispatch-console',
  },
  'garage-mgmt': {
    id: 'garage-mgmt',
    label: 'Garage',
    description: 'Workshop control',
    icon: Wrench,
    parentId: 'maintenance',
  },
  'battery-mgmt': {
    id: 'battery-mgmt',
    label: 'Battery',
    description: 'Battery lifecycle',
    icon: Battery,
    featureFlag: 'fleet.battery',
    hiddenForMvp: true,
    parentId: 'vehicle-management',
  },
  'tyre-management': {
    id: 'tyre-management',
    label: 'Tyres',
    description: 'Tyre analytics',
    icon: CircleDollarSign,
    featureFlag: 'fleet.tyres',
    hiddenForMvp: true,
    parentId: 'vehicle-management',
  },
  'tyre-inventory': {
    id: 'tyre-inventory',
    label: 'Tyre Inventory',
    description: 'Tyre stock',
    icon: Package,
    featureFlag: 'fleet.tyres',
    hiddenForMvp: true,
    parentId: 'vehicle-management',
  },
  'tyre-visual-tracker': {
    id: 'tyre-visual-tracker',
    label: 'Tyre Visual Tracker',
    description: 'Axle tracker',
    icon: Truck,
    featureFlag: 'fleet.tyres',
    hiddenForMvp: true,
    parentId: 'vehicle-management',
  },
  'tyre-job-cards': {
    id: 'tyre-job-cards',
    label: 'Tyre Job Cards',
    description: 'Fitment jobs',
    icon: ClipboardList,
    featureFlag: 'fleet.tyres',
    hiddenForMvp: true,
    parentId: 'vehicle-management',
  },
  'tyre-inspections': {
    id: 'tyre-inspections',
    label: 'Tyre Inspections',
    description: 'Tread checks',
    icon: FileSearch,
    featureFlag: 'fleet.tyres',
    hiddenForMvp: true,
    parentId: 'vehicle-management',
  },
  'vehicle-master': {
    id: 'vehicle-master',
    label: 'Vehicle Master',
    description: 'Master data',
    icon: Truck,
    parentId: 'vehicle-management',
  },
  'vendor-ledger': {
    id: 'vendor-ledger',
    label: 'Vendor Ledger',
    description: 'Vendor cost view',
    icon: BriefcaseBusiness,
    featureFlag: 'fleet.financeOps',
    hiddenForMvp: true,
    parentId: 'dashboard',
  },
  inventory: {
    id: 'inventory',
    label: 'Inventory',
    description: 'Parts stock',
    icon: Boxes,
    featureFlag: 'fleet.inventory',
    hiddenForMvp: true,
    parentId: 'maintenance',
  },
  'inventory-transactions': {
    id: 'inventory-transactions',
    label: 'Inventory Transactions',
    description: 'Stock audit trail',
    icon: ScrollText,
    featureFlag: 'fleet.inventory',
    hiddenForMvp: true,
    parentId: 'inventory',
  },
  'fuel-energy': {
    id: 'fuel-energy',
    label: 'Fuel',
    description: 'Fuel validation',
    icon: Fuel,
    featureFlag: 'fleet.fuel',
    hiddenForMvp: true,
    parentId: 'dashboard',
  },
  'cost-health': {
    id: 'cost-health',
    label: 'Cost Health',
    description: 'Cost per KM',
    icon: HeartPulse,
    featureFlag: 'fleet.financeOps',
    hiddenForMvp: true,
    parentId: 'dashboard',
  },
};

export const navigationItems: NavigationItem[] = [
  pageRegistry.dashboard,
  pageRegistry['my-tasks'],
  pageRegistry['dispatch-console'],
  pageRegistry['vehicle-management'],
  pageRegistry['driver-management'],
  pageRegistry.maintenance,
  pageRegistry.compliance,
  pageRegistry['exception-center'],
];

export const sidebarSections: SidebarSection[] = [
  { id: 'overview', label: 'Overview', items: ['dashboard'] },
  { collapsible: true, id: 'operations', label: 'Operations', items: ['my-tasks', 'dispatch-console'] },
  { collapsible: true, id: 'fleet', label: 'Fleet', items: ['vehicle-management', 'driver-management'] },
  { collapsible: true, id: 'maintenance', label: 'Maintenance', items: ['maintenance', 'inventory'] },
  { collapsible: true, id: 'risk', label: 'Compliance & Risk', items: ['compliance', 'exception-center'] },
];

export const legacyRouteParents: Partial<Record<AppPage, AppPage>> = Object.fromEntries(
  Object.entries(pageRegistry)
    .filter(([, item]) => item.parentId)
    .map(([page, item]) => [page, item.parentId]),
) as Partial<Record<AppPage, AppPage>>;

export function isAppPage(value: string): value is AppPage {
  return value in pageRegistry;
}

export function getNavigationItem(page: AppPage): NavigationItem {
  return pageRegistry[page] ?? pageRegistry.dashboard;
}

export function getSidebarPage(page: AppPage): AppPage {
  return legacyRouteParents[page] ?? page;
}

export const routeAliases: Partial<Record<string, AppPage>> = {
  alerts: 'exception-center',
  assignments: 'dispatch-console',
  batteries: 'battery-mgmt',
  battery: 'battery-mgmt',
  dispatch: 'dispatch-console',
  tasks: 'my-tasks',
  'work-queue': 'my-tasks',
  vehicles: 'vehicle-management',
  drivers: 'driver-management',
  exceptions: 'exception-center',
  fuel: 'fuel-energy',
  garage: 'garage-mgmt',
  rules: 'alert-management',
  telemetry: 'live-map',
  reports: 'cost-health',
  transactions: 'inventory-transactions',
  tyres: 'tyre-management',
};
