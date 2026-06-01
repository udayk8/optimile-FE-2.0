import {
  LayoutDashboard, FileWarning, ReceiptText, Wallet, ShieldAlert,
  GitCompareArrows, BookOpen, TrendingUp, Truck, FileText,
  Hash, Lock, ScrollText, FilePlus2, Wrench, BadgeIndianRupee,
  CalendarClock, Banknote, PieChart, Building2, Landmark, ShieldCheck,
  BarChart3, NotebookText, type LucideIcon,
} from 'lucide-react'
import type { ComponentType } from 'react'

// --- 3PL / aggregator (threepl) page copies ---
import Tp_Dashboard from '@finance/modules/finance/threepl/analytics/pages/Dashboard'
import Tp_Margins from '@finance/modules/finance/threepl/analytics/pages/Margins'
import Tp_Profitability from '@finance/modules/finance/threepl/analytics/pages/Profitability'
import Tp_CashFlow from '@finance/modules/finance/threepl/analytics/pages/CashFlow'
import Tp_PendingPOD from '@finance/modules/finance/threepl/revenue/pages/PendingPOD'
import Tp_Collections from '@finance/modules/finance/threepl/revenue/pages/Collections'
import Tp_Disputes from '@finance/modules/finance/threepl/revenue/pages/Disputes'
import Tp_Notes from '@finance/modules/finance/threepl/revenue/pages/Notes'
import Tp_Reconciliation from '@finance/modules/finance/threepl/revenue/pages/Reconciliation'
import Tp_VendorMatch from '@finance/modules/finance/threepl/payables/pages/VendorMatch'
import Tp_SubVendor from '@finance/modules/finance/threepl/payables/pages/SubVendor'
import Tp_Retention from '@finance/modules/finance/threepl/payables/pages/Retention'
import Tp_CreditLimits from '@finance/modules/finance/threepl/controls/pages/CreditLimits'
import Tp_ContractBudget from '@finance/modules/finance/threepl/controls/pages/ContractBudget'
import Tp_Compliance from '@finance/modules/finance/threepl/controls/pages/Compliance'
import Tp_MonthClose from '@finance/modules/finance/threepl/controls/pages/MonthClose'
import Tp_AuditTrail from '@finance/modules/finance/threepl/controls/pages/AuditTrail'
import Tp_WorkingCapital from '@finance/modules/finance/threepl/workingcapital/pages/WorkingCapital'
import Tp_Ledgers from '@finance/modules/finance/threepl/ledgers/pages/Ledgers'

// --- Own Fleet (own-fleet) page copies ---
import Of_Dashboard from '@finance/modules/finance/own-fleet/analytics/pages/Dashboard'
import Of_Profitability from '@finance/modules/finance/own-fleet/analytics/pages/Profitability'
import Of_CashFlow from '@finance/modules/finance/own-fleet/analytics/pages/CashFlow'
import Of_Fleet from '@finance/modules/finance/own-fleet/fleet/pages/Fleet'
import Of_Maintenance from '@finance/modules/finance/own-fleet/fleet/pages/Maintenance'
import Of_DriverAdvances from '@finance/modules/finance/own-fleet/fleet/pages/DriverAdvances'
import Of_Lifecycle from '@finance/modules/finance/own-fleet/fleet/pages/Lifecycle'
import Of_FleetLedgers from '@finance/modules/finance/own-fleet/fleet/pages/FleetLedgers'
import Of_PendingPOD from '@finance/modules/finance/own-fleet/revenue/pages/PendingPOD'
import Of_Collections from '@finance/modules/finance/own-fleet/revenue/pages/Collections'
import Of_Notes from '@finance/modules/finance/own-fleet/revenue/pages/Notes'
import Of_Reconciliation from '@finance/modules/finance/own-fleet/revenue/pages/Reconciliation'
import Of_Compliance from '@finance/modules/finance/own-fleet/controls/pages/Compliance'
import Of_MonthClose from '@finance/modules/finance/own-fleet/controls/pages/MonthClose'
import Of_AuditTrail from '@finance/modules/finance/own-fleet/controls/pages/AuditTrail'
import Of_Ledgers from '@finance/modules/finance/own-fleet/ledgers/pages/Ledgers'

// --- Enterprise page copies ---
import En_Dashboard from '@finance/modules/finance/enterprise/analytics/pages/Dashboard'
import En_EnterpriseReports from '@finance/modules/finance/enterprise/analytics/pages/EnterpriseReports'
import En_PendingPOD from '@finance/modules/finance/enterprise/revenue/pages/PendingPOD'
import En_Disputes from '@finance/modules/finance/enterprise/revenue/pages/Disputes'
import En_Notes from '@finance/modules/finance/enterprise/revenue/pages/Notes'
import En_VendorMatch from '@finance/modules/finance/enterprise/payables/pages/VendorMatch'
import En_CreditLimits from '@finance/modules/finance/enterprise/controls/pages/CreditLimits'
import En_ContractBudget from '@finance/modules/finance/enterprise/controls/pages/ContractBudget'
import En_Compliance from '@finance/modules/finance/enterprise/controls/pages/Compliance'
import En_MonthClose from '@finance/modules/finance/enterprise/controls/pages/MonthClose'
import En_AuditTrail from '@finance/modules/finance/enterprise/controls/pages/AuditTrail'
import En_Ledgers from '@finance/modules/finance/enterprise/ledgers/pages/Ledgers'

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

// Page label + icon are identical across modes; only the underlying component
// copy differs (each mode has its own self-contained file). Shared meta keeps
// the per-mode maps below terse and guarantees identical sidebar rendering.
const META: Record<string, { label: string; icon: LucideIcon }> = {
  dash: { label: 'Command Centre', icon: LayoutDashboard },
  pod: { label: 'Pending POD', icon: FileWarning },
  ar: { label: 'Debtors', icon: ReceiptText },
  disputes: { label: 'Disputes', icon: ScrollText },
  notes: { label: 'Credit / Debit Notes', icon: FilePlus2 },
  vendor: { label: 'Vendor Match', icon: GitCompareArrows },
  subvendor: { label: 'Sub-Vendor / Vehicle', icon: Hash },
  retention: { label: 'Retention', icon: Lock },
  credit: { label: 'Credit Limits', icon: ShieldAlert },
  contract: { label: 'Contract & Budget', icon: Building2 },
  margin: { label: 'Margin Tracker', icon: TrendingUp },
  fleet: { label: 'Vehicle P&L', icon: Truck },
  maint: { label: 'Maintenance', icon: Wrench },
  advances: { label: 'Driver Advances', icon: Banknote },
  lifecycle: { label: 'Vehicle Lifecycle', icon: CalendarClock },
  profit: { label: 'Profitability', icon: PieChart },
  cash: { label: 'Cash Flow', icon: Wallet },
  recon: { label: 'Reconciliation', icon: Landmark },
  wc: { label: 'Working Capital', icon: BadgeIndianRupee },
  tax: { label: 'Tax (TDS/GST)', icon: FileText },
  close: { label: 'Month-End Close', icon: CalendarClock },
  audit: { label: 'Audit Trail', icon: ShieldCheck },
  ledger: { label: 'Ledgers', icon: BookOpen },
  reports: { label: 'Reports', icon: BarChart3 },
  fleetledger: { label: 'Fleet Ledgers', icon: NotebookText },
}

const meta = (id: string, comp: ComponentType<any>): PageMeta => ({
  label: META[id].label,
  icon: META[id].icon,
  comp,
})

/* Screens per mode, keyed by id. Each mode points at its own page copy. */
export const PAGES: Record<FinanceMode, Record<string, PageMeta>> = {
  aggregator: {
    dash: meta('dash', Tp_Dashboard),
    pod: meta('pod', Tp_PendingPOD),
    ar: meta('ar', Tp_Collections),
    disputes: meta('disputes', Tp_Disputes),
    notes: meta('notes', Tp_Notes),
    vendor: meta('vendor', Tp_VendorMatch),
    subvendor: meta('subvendor', Tp_SubVendor),
    retention: meta('retention', Tp_Retention),
    credit: meta('credit', Tp_CreditLimits),
    contract: meta('contract', Tp_ContractBudget),
    margin: meta('margin', Tp_Margins),
    profit: meta('profit', Tp_Profitability),
    cash: meta('cash', Tp_CashFlow),
    recon: meta('recon', Tp_Reconciliation),
    wc: meta('wc', Tp_WorkingCapital),
    tax: meta('tax', Tp_Compliance),
    audit: meta('audit', Tp_AuditTrail),
    close: meta('close', Tp_MonthClose),
    ledger: meta('ledger', Tp_Ledgers),
  },
  fleet: {
    dash: meta('dash', Of_Dashboard),
    fleet: meta('fleet', Of_Fleet),
    maint: meta('maint', Of_Maintenance),
    advances: meta('advances', Of_DriverAdvances),
    lifecycle: meta('lifecycle', Of_Lifecycle),
    pod: meta('pod', Of_PendingPOD),
    ar: meta('ar', Of_Collections),
    notes: meta('notes', Of_Notes),
    profit: meta('profit', Of_Profitability),
    cash: meta('cash', Of_CashFlow),
    recon: meta('recon', Of_Reconciliation),
    tax: meta('tax', Of_Compliance),
    audit: meta('audit', Of_AuditTrail),
    close: meta('close', Of_MonthClose),
    fleetledger: meta('fleetledger', Of_FleetLedgers),
    ledger: meta('ledger', Of_Ledgers),
  },
  enterprise: {
    dash: meta('dash', En_Dashboard),
    vendor: meta('vendor', En_VendorMatch),
    notes: meta('notes', En_Notes),
    pod: meta('pod', En_PendingPOD),
    disputes: meta('disputes', En_Disputes),
    credit: meta('credit', En_CreditLimits),
    contract: meta('contract', En_ContractBudget),
    reports: meta('reports', En_EnterpriseReports),
    tax: meta('tax', En_Compliance),
    audit: meta('audit', En_AuditTrail),
    close: meta('close', En_MonthClose),
    ledger: meta('ledger', En_Ledgers),
  },
}

/* Grouped navigation per deployment mode. Each group: { group, items: [ids] } */
export const NAV: Record<FinanceMode, NavGroup[]> = {
  aggregator: [
    { group: null, items: ['dash'] },
    { group: 'Receivables', items: ['pod', 'ar', 'notes'] },
    { group: 'Payables', items: ['vendor', 'subvendor', 'retention'] },
    { group: null, items: ['disputes'] },
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
    { group: 'Receivables', items: ['pod'] },
    { group: null, items: ['disputes'] },
    { group: 'Controls', items: ['credit', 'contract'] },
    { group: 'Reports', items: ['reports'] },
    { group: 'Compliance & Close', items: ['tax', 'audit', 'close'] },
    { group: 'Ledgers', items: ['ledger'] },
  ],
}

/* Flat list of valid page ids for a mode (for routing fallback) */
export const modeIds = (mode: FinanceMode): string[] => NAV[mode].flatMap((g) => g.items)
