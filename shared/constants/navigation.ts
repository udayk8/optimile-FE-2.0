// ============================================================
// Optimile ERP – Navigation Configuration
// ============================================================
// All sidebar navigation items, grouped by module.
// The sidebar renders only sections the user has access to.
// ============================================================

import {
  LayoutDashboard, Package, Settings, Truck, Users, FileText,
  Activity, ShieldCheck, MapPin, Calculator,
  BarChart3, Briefcase, Gavel, Timer, Zap, Network,
  TrendingUp, History,
  AlertTriangle, Box,
  Wrench, Fuel, CircleDollarSign, Globe, ClipboardCheck,
  Database, Bell, Map as MapIcon, FileCheck,
  Wallet, Receipt, ArrowLeftRight, PieChart, Battery,
  PackagePlus, Building2, Navigation, IndianRupee,
} from 'lucide-react';
import { NavSection } from '../types';

export const APP_NAME = 'Optimile ERP';

export const NAV_SECTIONS: NavSection[] = [
  // ═══════════════════════════════════════════════════════════
  // TMS MODULE (Full Truck Load / core transport operations)
  // ═══════════════════════════════════════════════════════════
  {
    title: 'Transport Management',
    module: 'tms',
    items: [
      { label: 'Dashboard', path: '/tms/dashboard', icon: LayoutDashboard, module: 'tms' },
      { label: 'Control Tower', path: '/tms/control-tower', icon: Activity, module: 'tms', requiredPermissions: ['tms:read'] },
      { label: 'Bookings', path: '/tms/bookings', icon: Package, module: 'tms', requiredPermissions: ['tms:read'] },
      { label: 'HO Approvals', path: '/tms/approvals', icon: ShieldCheck, module: 'tms', requiredPermissions: ['tms:write'] },
      { label: 'Operations', path: '/tms/operations', icon: MapPin, module: 'tms', requiredPermissions: ['tms:read'] },
      { label: 'Live Tracking', path: '/tms/tracking', icon: MapPin, module: 'tms', requiredPermissions: ['tms:read'] },
      { label: 'Rate Calculator', path: '/tms/finance/calculator', icon: Calculator, module: 'tms', requiredPermissions: ['tms:read'] },
      { label: 'Fleet (TMS)', path: '/tms/fleet', icon: Truck, module: 'tms', requiredPermissions: ['tms:read'] },
      { label: 'Drivers (TMS)', path: '/tms/drivers', icon: Users, module: 'tms', requiredPermissions: ['tms:read'] },
      { label: 'Reports', path: '/tms/reports', icon: FileText, module: 'tms', requiredPermissions: ['tms:read'] },
      { label: 'TMS Settings', path: '/tms/settings', icon: Settings, module: 'tms', requiredPermissions: ['tms:write'] },
    ],
  },

  // ═══════════════════════════════════════════════════════════
  // PTL MODULE (Part Truck Load — docket-based carrier network)
  // ═══════════════════════════════════════════════════════════
  {
    title: 'Part Truck Load (PTL)',
    module: 'ptl',
    items: [
      { label: 'PTL Dashboard', path: '/tms/ptl/dashboard', icon: BarChart3, module: 'ptl', requiredPermissions: ['ptl:read'] },
      { label: 'PTL Bookings', path: '/tms/ptl/booking', icon: PackagePlus, module: 'ptl', requiredPermissions: ['ptl:read'] },
      { label: 'Hub Operations', path: '/tms/ptl/hub-ops', icon: Building2, module: 'ptl', requiredPermissions: ['ptl:read'] },
      { label: 'PTL Tracking', path: '/tms/ptl/tracking', icon: Navigation, module: 'ptl', requiredPermissions: ['ptl:read'] },
      { label: 'Delivery Mgmt', path: '/tms/ptl/delivery', icon: Truck, module: 'ptl', requiredPermissions: ['ptl:read'] },
      { label: 'Exceptions', path: '/tms/ptl/exceptions', icon: AlertTriangle, module: 'ptl', requiredPermissions: ['ptl:read'] },
      { label: 'Carrier Hub', path: '/tms/ptl/vendors', icon: Users, module: 'ptl', requiredPermissions: ['ptl:read'] },
      { label: 'Analytics', path: '/tms/ptl/analytics', icon: TrendingUp, module: 'ptl', requiredPermissions: ['ptl:read'] },
      { label: 'PTL Settings', path: '/tms/ptl/settings', icon: Settings, module: 'ptl', requiredPermissions: ['ptl:write'] },
    ],
  },

  // ═══════════════════════════════════════════════════════════
  // FLEET CONTROL MODULE (includes Tyre Intelligence)
  // ═══════════════════════════════════════════════════════════
  {
    title: 'Fleet Control',
    module: 'fleet',
    items: [
      { label: 'Fleet Dashboard', path: '/fleet/dashboard', icon: LayoutDashboard, module: 'fleet' },
      { label: 'Ops Intelligence', path: '/fleet/ops-intel', icon: BarChart3, module: 'fleet', requiredPermissions: ['fleet:read'] },
      { label: 'Exception Center', path: '/fleet/exceptions', icon: Bell, module: 'fleet', requiredPermissions: ['fleet:read'] },
      { label: 'Data Coverage', path: '/fleet/coverage', icon: Database, module: 'fleet', requiredPermissions: ['fleet:read'] },
      { label: 'Reconciliation', path: '/fleet/reconciliation', icon: ClipboardCheck, module: 'fleet', requiredPermissions: ['fleet:read'] },
      { label: 'Live Map', path: '/fleet/live-map', icon: Globe, module: 'fleet', requiredPermissions: ['fleet:read'] },
      { label: 'Dispatch Console', path: '/fleet/dispatch', icon: MapIcon, module: 'fleet', requiredPermissions: ['fleet:read'] },
      { label: 'Vehicle Management', path: '/fleet/vehicles', icon: Truck, module: 'fleet', requiredPermissions: ['fleet:read'] },
      { label: 'Driver Management', path: '/fleet/drivers', icon: Users, module: 'fleet', requiredPermissions: ['fleet:read'] },
      { label: 'Compliance', path: '/fleet/compliance', icon: FileCheck, module: 'fleet', requiredPermissions: ['fleet:read'] },
      { label: 'Maintenance', path: '/fleet/maintenance', icon: Wrench, module: 'fleet', requiredPermissions: ['fleet:read'] },
      { label: 'Garage Mgmt', path: '/fleet/garage', icon: Wrench, module: 'fleet', requiredPermissions: ['fleet:read'] },
      { label: 'Battery Mgmt', path: '/fleet/batteries', icon: Battery, module: 'fleet', requiredPermissions: ['fleet:read'] },
      // ── Tyre Intelligence (merged into Fleet Control) ──
      { label: 'Tyre Management', path: '/fleet/tyres', icon: CircleDollarSign, module: 'fleet', requiredPermissions: ['fleet:read'] },
      { label: 'Tyre Inventory', path: '/fleet/tyres/inventory', icon: Box, module: 'fleet', requiredPermissions: ['fleet:read'] },
      { label: 'Tyre Visual Tracker', path: '/fleet/tyres/tracker', icon: Truck, module: 'fleet', requiredPermissions: ['fleet:read'] },
      { label: 'Tyre Job Cards', path: '/fleet/tyres/jobs', icon: ClipboardCheck, module: 'fleet', requiredPermissions: ['fleet:read'] },
      { label: 'Tyre Inspections', path: '/fleet/tyres/inspections', icon: FileCheck, module: 'fleet', requiredPermissions: ['fleet:read'] },
      { label: 'Vehicle Master', path: '/fleet/tyres/vehicle-master', icon: Truck, module: 'fleet', requiredPermissions: ['fleet:read'] },
      // ── End Tyre Intelligence ──
      { label: 'Vendor & Ledger', path: '/fleet/vendors', icon: Briefcase, module: 'fleet', requiredPermissions: ['fleet:read'] },
      { label: 'Inventory', path: '/fleet/inventory', icon: Box, module: 'fleet', requiredPermissions: ['fleet:read'] },
      { label: 'Fuel & Energy', path: '/fleet/fuel', icon: Fuel, module: 'fleet', requiredPermissions: ['fleet:read'] },
      { label: 'Driver Behavior', path: '/fleet/behavior', icon: Zap, module: 'fleet', requiredPermissions: ['fleet:read'] },
      { label: 'Cost Health', path: '/fleet/cost', icon: CircleDollarSign, module: 'fleet', requiredPermissions: ['fleet:read'] },
      { label: 'Settings', path: '/fleet/settings', icon: Settings, module: 'fleet', requiredPermissions: ['fleet:write'] },
    ],
  },

  // ═══════════════════════════════════════════════════════════
  // AMS MODULE (Auction Management / Procurement)
  // ═══════════════════════════════════════════════════════════
  {
    title: 'Procurement (AMS)',
    module: 'ams',
    items: [
      { label: 'AMS Dashboard', path: '/ams/dashboard', icon: LayoutDashboard, module: 'ams' },
      { label: 'Executive View', path: '/ams/executive', icon: BarChart3, module: 'ams', requiredPermissions: ['ams:read'] },
      { label: 'Client Hub', path: '/ams/clients', icon: Briefcase, module: 'ams', requiredPermissions: ['ams:read'] },
      { label: 'Contracts', path: '/ams/contracts', icon: FileText, module: 'ams', requiredPermissions: ['ams:read'] },
      { label: 'Create Auction', path: '/ams/auctions/create', icon: Gavel, module: 'ams', requiredPermissions: ['ams:write'] },
      { label: 'Live Auctions', path: '/ams/auctions/live', icon: Activity, module: 'ams', requiredPermissions: ['ams:read'] },
      { label: 'Vendor Portal', path: '/ams/vendor-portal', icon: Users, module: 'ams', requiredPermissions: ['ams:read'] },
      { label: 'Spot Operations', path: '/ams/spot', icon: Zap, module: 'ams', requiredPermissions: ['ams:read'] },
      { label: 'Execution Map', path: '/ams/execution', icon: Network, module: 'ams', requiredPermissions: ['ams:read'] },
      { label: 'SLA Monitor', path: '/ams/sla', icon: Timer, module: 'ams', requiredPermissions: ['ams:read'] },
      { label: 'Savings Analysis', path: '/ams/analytics/savings', icon: TrendingUp, module: 'ams', requiredPermissions: ['ams:read'] },
      { label: 'Vendor Insights', path: '/ams/analytics/vendors', icon: Activity, module: 'ams', requiredPermissions: ['ams:read'] },
      { label: 'Vendor Onboarding', path: '/ams/vendors/onboarding', icon: Users, module: 'ams', requiredPermissions: ['ams:write'] },
      { label: 'Disputes', path: '/ams/disputes', icon: AlertTriangle, module: 'ams', requiredPermissions: ['ams:write'] },
      { label: 'Audit Trail', path: '/ams/audit', icon: History, module: 'ams', requiredPermissions: ['ams:read'] },
    ],
  },

  // ═══════════════════════════════════════════════════════════
  // FINANCE MODULE
  // ═══════════════════════════════════════════════════════════
  {
    title: 'Finance',
    module: 'finance',
    items: [
      { label: 'Finance Dashboard', path: '/finance/dashboard', icon: Wallet, module: 'finance' },
      { label: 'Customer Ledger', path: '/finance/customers', icon: Users, module: 'finance', requiredPermissions: ['finance:read'] },
      { label: 'Vendor Ledger', path: '/finance/vendors', icon: Briefcase, module: 'finance', requiredPermissions: ['finance:read'] },
      { label: 'Invoices', path: '/finance/invoices', icon: Receipt, module: 'finance', requiredPermissions: ['finance:read'] },
      { label: 'Create Invoice', path: '/finance/invoices/create', icon: FileText, module: 'finance', requiredPermissions: ['finance:write'] },
      { label: 'Fleet Ledger', path: '/finance/fleet-ledger', icon: Truck, module: 'finance', requiredPermissions: ['finance:read'] },
      { label: 'Reconciliation', path: '/finance/reconciliation', icon: ArrowLeftRight, module: 'finance', requiredPermissions: ['finance:read'] },
      { label: 'Reports', path: '/finance/reports', icon: PieChart, module: 'finance', requiredPermissions: ['finance:read'] },
      { label: 'PTL Billing', path: '/finance/ptl-billing', icon: IndianRupee, module: 'finance', requiredPermissions: ['finance:write'] },
      { label: 'PTL Margin Report', path: '/finance/ptl-margin', icon: TrendingUp, module: 'finance', requiredPermissions: ['finance:read'] },
      { label: 'Finance Settings', path: '/finance/settings', icon: Settings, module: 'finance', requiredPermissions: ['finance:write'] },
    ],
  },
];
