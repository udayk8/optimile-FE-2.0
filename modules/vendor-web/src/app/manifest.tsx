import { Navigate } from 'react-router-dom'
import {
  Briefcase,
  CreditCard,
  FileText,
  Home,
  ReceiptText,
  Search,
  ShieldAlert,
  Ship,
  Truck,
  User,
  Wallet,
} from 'lucide-react'
import type { ModuleManifest } from '@shared-ui'
import { VendorRouteWrapper } from './VendorRouteWrapper'
import OnboardingPage from '@vendor/features/auth/pages/OnboardingPage'
import DashboardPage from '@vendor/features/home/pages/DashboardPage'
import SourcingPage from '@vendor/features/sourcing/pages/SourcingPage'
import AuctionDetailPage from '@vendor/features/sourcing/pages/AuctionDetailPage'
import ContractsPage from '@vendor/features/contracts/pages/ContractsPage'
import TripsPage from '@vendor/features/trips/pages/TripsPage'
import TripDetailPage from '@vendor/features/trips/pages/TripDetailPage'
import FleetPage from '@vendor/features/fleet/pages/FleetPage'
import InvoicesPage from '@vendor/features/invoices/pages/InvoicesPage'
import InvoiceDetailPage from '@vendor/features/invoices/pages/InvoiceDetailPage'
import ProfilePage from '@vendor/features/profile/pages/ProfilePage'
import NotificationsPage from '@vendor/features/notifications/pages/NotificationsPage'
import LedgerPage from '@vendor/features/finance/pages/LedgerPage'
import PaymentsPage from '@vendor/features/finance/pages/PaymentsPage'
import SupportHubPage from '@vendor/features/support/pages/SupportHubPage'
import ReportExceptionPage from '@vendor/features/support/pages/ReportExceptionPage'
import ExceptionTimelinePage from '@vendor/features/support/pages/ExceptionTimelinePage'
import DisputeThreadPage from '@vendor/features/support/pages/DisputeThreadPage'
import CreateInvoicePage from '@vendor/features/invoices/pages/CreateInvoicePage'

export const vendorManifest: ModuleManifest = {
  key: 'vendor',
  label: 'Vendor',
  icon: Briefcase,
  basePath: '/vendor',
  sidebar: [
    { label: 'Home', path: '/vendor', icon: Home },
    { label: 'Sourcing', path: '/vendor/sourcing', icon: Search },
    { label: 'Contracts', path: '/vendor/contracts', icon: FileText },
    { label: 'Bookings', path: '/vendor/bookings', icon: Truck },
    { label: 'Fleet', path: '/vendor/fleet', icon: Ship },
    { label: 'Invoices', path: '/vendor/invoices', icon: CreditCard },
    { label: 'Record Payments', path: '/vendor/record-payments', icon: ReceiptText },
    { label: 'Ledger', path: '/vendor/ledger', icon: Wallet },
    { label: 'Exceptions', path: '/vendor/exceptions', icon: ShieldAlert },
    { label: 'Profile', path: '/vendor/profile', icon: User },
  ],
  wrapper: VendorRouteWrapper,
  routes: [
    { path: 'onboarding', element: <OnboardingPage /> },
    { index: true, element: <DashboardPage /> },
    { path: 'home', element: <Navigate to="/vendor" replace /> },
    { path: 'sourcing', element: <SourcingPage /> },
    { path: 'sourcing/auctions/:id', element: <AuctionDetailPage /> },
    { path: 'contracts', element: <ContractsPage /> },
    { path: 'contracts/:id', element: <ContractsPage /> },
    { path: 'trips', element: <TripsPage /> },
    { path: 'bookings', element: <TripsPage /> },
    { path: 'trips/new/:id', element: <TripDetailPage /> },
    { path: 'bookings/new/:id', element: <TripDetailPage /> },
    { path: 'trips/accepted/:id', element: <TripDetailPage /> },
    { path: 'bookings/accepted/:id', element: <TripDetailPage /> },
    { path: 'trips/indents/:id', element: <TripDetailPage /> },
    { path: 'bookings/indents/:id', element: <TripDetailPage /> },
    { path: 'trips/active/:id', element: <TripDetailPage /> },
    { path: 'bookings/active/:id', element: <TripDetailPage /> },
    { path: 'trips/assignment/:id', element: <TripDetailPage /> },
    { path: 'bookings/assignment/:id', element: <TripDetailPage /> },
    { path: 'trips/in-transit/:id', element: <TripDetailPage /> },
    { path: 'bookings/in-transit/:id', element: <TripDetailPage /> },
    { path: 'trips/pending-pod/:id', element: <TripDetailPage /> },
    { path: 'bookings/pending-pod/:id', element: <TripDetailPage /> },
    { path: 'trips/completed/:id', element: <TripDetailPage /> },
    { path: 'bookings/completed/:id', element: <TripDetailPage /> },
    { path: 'trips/cancelled/:id', element: <TripDetailPage /> },
    { path: 'bookings/cancelled/:id', element: <TripDetailPage /> },
    { path: 'trips/rejected/:id', element: <TripDetailPage /> },
    { path: 'bookings/rejected/:id', element: <TripDetailPage /> },
    { path: 'trips/exception/:id', element: <TripDetailPage /> },
    { path: 'bookings/exception/:id', element: <TripDetailPage /> },
    { path: 'fleet', element: <FleetPage /> },
    { path: 'fleet/vehicles', element: <FleetPage /> },
    { path: 'fleet/vehicles/add', element: <FleetPage /> },
    { path: 'fleet/vehicles/:id', element: <FleetPage /> },
    { path: 'fleet/drivers', element: <FleetPage /> },
    { path: 'fleet/drivers/add', element: <FleetPage /> },
    { path: 'fleet/drivers/:id', element: <FleetPage /> },
    { path: 'fleet/capacity', element: <FleetPage /> },
    { path: 'invoices', element: <InvoicesPage /> },
    { path: 'invoices/new', element: <CreateInvoicePage /> },
    { path: 'invoices/create', element: <CreateInvoicePage /> },
    { path: 'invoices/list', element: <InvoicesPage /> },
    { path: 'invoices/:id', element: <InvoiceDetailPage /> },
    { path: 'ledger', element: <LedgerPage /> },
    { path: 'record-payments', element: <PaymentsPage /> },
    { path: 'ledger/payments', element: <Navigate to="/vendor/record-payments" replace /> },
    { path: 'payments', element: <Navigate to="/vendor/record-payments" replace /> },
    { path: 'exceptions', element: <SupportHubPage /> },
    { path: 'exceptions/:exceptionId', element: <ExceptionTimelinePage /> },
    { path: 'profile', element: <ProfilePage /> },
    { path: 'profile/company', element: <ProfilePage /> },
    { path: 'profile/bank', element: <ProfilePage /> },
    { path: 'profile/verification', element: <Navigate to="/vendor/profile/company" replace /> },
    { path: 'profile/notifications', element: <Navigate to="/vendor/profile" replace /> },
    { path: 'notifications', element: <NotificationsPage /> },
    { path: 'report-exception', element: <ReportExceptionPage /> },
    { path: 'support', element: <SupportHubPage /> },
    { path: 'support/report', element: <ReportExceptionPage /> },
    { path: 'support/exception/:id', element: <ExceptionTimelinePage /> },
    { path: 'support/dispute/:id', element: <DisputeThreadPage /> },
    { path: 'disputes/:id', element: <DisputeThreadPage /> },
    { path: '*', element: <Navigate to="/vendor" replace /> },
  ],
}
