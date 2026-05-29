import {
  LayoutDashboard, FileWarning, ReceiptText, Wallet, ShieldAlert,
  GitCompareArrows, BookOpen, TrendingUp, Truck, FileText,
  Hash, Lock, ScrollText, FilePlus2, Wrench, BadgeIndianRupee,
  CalendarClock, Banknote, PieChart, Building2, Landmark, ShieldCheck,
  BarChart3, NotebookText, type LucideIcon,
} from 'lucide-react'
import type { ComponentType } from 'react'

import Dashboard from '@finance/modules/finance/analytics/pages/Dashboard'
import PendingPOD from '@finance/modules/finance/revenue/pages/PendingPOD'
import Collections from '@finance/modules/finance/revenue/pages/Collections'
import Disputes from '@finance/modules/finance/revenue/pages/Disputes'
import Notes from '@finance/modules/finance/revenue/pages/Notes'
import VendorMatch from '@finance/modules/finance/payables/pages/VendorMatch'
import SubVendor from '@finance/modules/finance/payables/pages/SubVendor'
import Retention from '@finance/modules/finance/payables/pages/Retention'
import CreditLimits from '@finance/modules/finance/controls/pages/CreditLimits'
import ContractBudget from '@finance/modules/finance/controls/pages/ContractBudget'
import Margins from '@finance/modules/finance/analytics/pages/Margins'
import Fleet from '@finance/modules/finance/fleet/pages/Fleet'
import Maintenance from '@finance/modules/finance/fleet/pages/Maintenance'
import DriverAdvances from '@finance/modules/finance/fleet/pages/DriverAdvances'
import Lifecycle from '@finance/modules/finance/fleet/pages/Lifecycle'
import Profitability from '@finance/modules/finance/analytics/pages/Profitability'
import CashFlow from '@finance/modules/finance/analytics/pages/CashFlow'
import Reconciliation from '@finance/modules/finance/revenue/pages/Reconciliation'
import WorkingCapital from '@finance/modules/finance/workingcapital/pages/WorkingCapital'
import Compliance from '@finance/modules/finance/controls/pages/Compliance'
import MonthClose from '@finance/modules/finance/controls/pages/MonthClose'
import AuditTrail from '@finance/modules/finance/controls/pages/AuditTrail'
import Ledgers from '@finance/modules/finance/ledgers/pages/Ledgers'
import EnterpriseReports from '@finance/modules/finance/analytics/pages/EnterpriseReports'
import FleetLedgers from '@finance/modules/finance/fleet/pages/FleetLedgers'

export type FinanceMode = 'aggregator' | 'fleet' | 'enterprise'

export interface ModeMeta {
  label: string
  color: string
}

export interface PageMeta {
  label: string
  icon: LucideIcon
  comp: ComponentType<any>
}

export interface NavGroup {
  group: string | null
  items: string[]
}

export const MODES: Record<FinanceMode, ModeMeta> = {
  aggregator: { label: 'Aggregator / 3PL', color: '#0ea5e9' },
  fleet: { label: 'Own Fleet Owner', color: '#8b5cf6' },
  enterprise: { label: 'Enterprise', color: '#10b981' },
}

/* All screens, keyed by id */
export const PAGES: Record<string, PageMeta> = {
  dash: { label: 'Command Centre', icon: LayoutDashboard, comp: Dashboard },
  pod: { label: 'Pending POD', icon: FileWarning, comp: PendingPOD },
  ar: { label: 'Debtors', icon: ReceiptText, comp: Collections },
  disputes: { label: 'Disputes', icon: ScrollText, comp: Disputes },
  notes: { label: 'Credit / Debit Notes', icon: FilePlus2, comp: Notes },
  vendor: { label: 'Vendor Match', icon: GitCompareArrows, comp: VendorMatch },
  subvendor: { label: 'Sub-Vendor / Vehicle', icon: Hash, comp: SubVendor },
  retention: { label: 'Retention', icon: Lock, comp: Retention },
  credit: { label: 'Credit Limits', icon: ShieldAlert, comp: CreditLimits },
  contract: { label: 'Contract & Budget', icon: Building2, comp: ContractBudget },
  margin: { label: 'Margin Tracker', icon: TrendingUp, comp: Margins },
  fleet: { label: 'Vehicle P&L', icon: Truck, comp: Fleet },
  maint: { label: 'Maintenance', icon: Wrench, comp: Maintenance },
  advances: { label: 'Driver Advances', icon: Banknote, comp: DriverAdvances },
  lifecycle: { label: 'Vehicle Lifecycle', icon: CalendarClock, comp: Lifecycle },
  profit: { label: 'Profitability', icon: PieChart, comp: Profitability },
  cash: { label: 'Cash Flow', icon: Wallet, comp: CashFlow },
  recon: { label: 'Reconciliation', icon: Landmark, comp: Reconciliation },
  wc: { label: 'Working Capital', icon: BadgeIndianRupee, comp: WorkingCapital },
  tax: { label: 'Tax (TDS/GST)', icon: FileText, comp: Compliance },
  close: { label: 'Month-End Close', icon: CalendarClock, comp: MonthClose },
  audit: { label: 'Audit Trail', icon: ShieldCheck, comp: AuditTrail },
  ledger: { label: 'Ledgers', icon: BookOpen, comp: Ledgers },
  reports: { label: 'Reports', icon: BarChart3, comp: EnterpriseReports },
  fleetledger: { label: 'Fleet Ledgers', icon: NotebookText, comp: FleetLedgers },
}

/* Grouped navigation per deployment mode. Each group: { group, items: [ids] } */
export const NAV: Record<FinanceMode, NavGroup[]> = {
  aggregator: [
    { group: null, items: ['dash'] },
    { group: 'Receivables', items: ['pod', 'ar', 'disputes', 'notes'] },
    { group: 'Payables', items: ['vendor', 'subvendor', 'retention'] },
    { group: 'Controls', items: ['credit', 'contract', 'margin'] },
    { group: 'Reports', items: ['profit', 'cash', 'recon', 'wc'] },
    { group: 'Compliance & Close', items: ['tax', 'audit', 'close'] },
    { group: 'Ledgers', items: ['ledger'] },
  ],
  fleet: [
    { group: null, items: ['dash'] },
    { group: 'Fleet', items: ['fleet', 'maint', 'advances', 'lifecycle'] },
    { group: 'Revenue', items: ['pod', 'ar', 'notes'] },
    { group: 'Reports', items: ['profit', 'cash', 'recon'] },
    { group: 'Compliance & Close', items: ['tax', 'audit', 'close'] },
    { group: 'Ledgers', items: ['fleetledger', 'ledger'] },
  ],
  enterprise: [
    { group: null, items: ['dash'] },
    { group: 'Payables', items: ['vendor', 'notes'] },
    { group: 'Receivables', items: ['pod', 'disputes'] },
    { group: 'Controls', items: ['credit', 'contract'] },
    { group: 'Reports', items: ['reports'] },
    { group: 'Compliance & Close', items: ['tax', 'audit', 'close'] },
    { group: 'Ledgers', items: ['ledger'] },
  ],
}

/* Flat list of valid page ids for a mode (for routing fallback) */
export const modeIds = (mode: FinanceMode): string[] => NAV[mode].flatMap((g) => g.items)
