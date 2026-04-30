import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppShell } from '@vendor/components/layout/AppShell'
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

const routes = [
  {
    path: '/onboarding',
    element: <OnboardingPage />,
  },
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <Navigate to="/home" replace /> },
      { path: 'home', element: <DashboardPage /> },
      { path: 'sourcing', element: <SourcingPage /> },
      { path: 'sourcing/auctions/:id', element: <AuctionDetailPage /> },
      { path: 'contracts', element: <ContractsPage /> },
      { path: 'contracts/:id', element: <ContractsPage /> },
      { path: 'trips', element: <TripsPage /> },
      { path: 'trips/indents/:id', element: <TripDetailPage /> },
      { path: 'trips/active/:id', element: <TripDetailPage /> },
      { path: 'trips/completed/:id', element: <TripDetailPage /> },
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
      { path: 'invoices/create', element: <InvoicesPage /> },
      { path: 'invoices/list', element: <InvoicesPage /> },
      { path: 'invoices/:id', element: <InvoiceDetailPage /> },
      { path: 'invoices/ledger', element: <InvoicesPage /> },
      { path: 'profile', element: <ProfilePage /> },
      { path: 'profile/company', element: <ProfilePage /> },
      { path: 'profile/bank', element: <ProfilePage /> },
      { path: 'profile/verification', element: <Navigate to="/profile/company" replace /> },
      { path: 'profile/notifications', element: <Navigate to="/profile" replace /> },
      { path: 'notifications', element: <NotificationsPage /> },
      { path: '*', element: <Navigate to="/home" replace /> },
    ],
  },
]

export function createVendorPortalRouter(basename?: string) {
  return createBrowserRouter(routes, { basename })
}
