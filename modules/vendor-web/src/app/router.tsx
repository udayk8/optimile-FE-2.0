import { Navigate, useRoutes } from 'react-router-dom'
import { AppShell } from '@vendor/components/layout/AppShell'
import LoginPage from '@vendor/auth/LoginPage'
import OnboardingPage from '@vendor/features/auth/pages/OnboardingPage'
import DashboardPage from '@vendor/features/home/pages/DashboardPage'
import SourcingPage from '@vendor/features/sourcing/pages/SourcingPage'
import AuctionDetailPage from '@vendor/features/sourcing/pages/AuctionDetailPage'
import ContractsPage from '@vendor/features/contracts/pages/ContractsPage'
import TripsPage from '@vendor/features/trips/pages/TripsPage'
import TripDetailPage from '@vendor/features/trips/pages/TripDetailPage'
import ExpensesPage from '@vendor/features/expenses/pages/ExpensesPage'
import FleetPage from '@vendor/features/fleet/pages/FleetPage'
import InvoicesPage from '@vendor/features/invoices/pages/InvoicesPage'
import InvoiceDetailPage from '@vendor/features/invoices/pages/InvoiceDetailPage'
import ProfilePage from '@vendor/features/profile/pages/ProfilePage'
import NotificationsPage from '@vendor/features/notifications/pages/NotificationsPage'
import LedgerPage from '@vendor/features/finance/pages/LedgerPage'
import PaymentsPage from '@vendor/features/finance/pages/PaymentsPage'
import BillDiscountingPage from '@vendor/features/finance/pages/BillDiscountingPage'
import SelectNBFCPage from '@vendor/features/finance/pages/SelectNBFCPage'
import DiscountingApplicationPage from '@vendor/features/finance/pages/DiscountingApplicationPage'
import SupportHubPage from '@vendor/features/support/pages/SupportHubPage'
import ReportExceptionPage from '@vendor/features/support/pages/ReportExceptionPage'
import ExceptionTimelinePage from '@vendor/features/support/pages/ExceptionTimelinePage'
import DisputeThreadPage from '@vendor/features/support/pages/DisputeThreadPage'
import CreateInvoicePage from '@vendor/features/invoices/pages/CreateInvoicePage'

export function VendorRoutes({ standalone = false }: { standalone?: boolean }) {
  return useRoutes([
    ...(standalone
      ? [
          { path: '/', element: <Navigate to="/vendor" replace /> },
          { path: '/login', element: <LoginPage /> },
        ]
      : []),
    {
      ...(standalone ? { path: '/vendor/onboarding' } : { path: 'onboarding' }),
      element: <OnboardingPage />,
    },
    {
      ...(standalone ? { path: '/vendor' } : {}),
      element: <AppShell />,
      children: [
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
        { path: 'expenses', element: <ExpensesPage /> },
        { path: 'expenses/add/:tripId', element: <ExpensesPage /> },
        { path: 'expenses/:id', element: <ExpensesPage /> },
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
        { path: 'receivables', element: <BillDiscountingPage /> },
        { path: 'nbfc', element: <Navigate to="/vendor/receivables" replace /> },
        { path: 'nbfc/apply/:invoiceId/select-partner', element: <SelectNBFCPage /> },
        { path: 'nbfc/apply/:invoiceId/view', element: <DiscountingApplicationPage /> },
        { path: 'nbfc/apply/:invoiceId/:nbfcId', element: <DiscountingApplicationPage /> },
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
    },
    ...(standalone ? [{ path: '*', element: <Navigate to="/vendor" replace /> }] : []),
  ])
}
