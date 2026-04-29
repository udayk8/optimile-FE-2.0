import { lazy, Suspense, type ReactNode } from 'react'
import { Navigate, useRoutes } from 'react-router-dom'
import { ProtectedRoute } from '@shared-auth'
import { AppShell } from '@vendor/components/layout/AppShell'
import LoginPage from '@vendor/auth/LoginPage'

const DashboardPage = lazy(() => import('@vendor/modules/home/pages/DashboardPage'))
const SourcingPage = lazy(() => import('@vendor/modules/sourcing/pages/SourcingPage'))
const AuctionDetailPage = lazy(() => import('@vendor/modules/sourcing/pages/AuctionDetailPage'))
const ContractsPage = lazy(() => import('@vendor/modules/contracts/pages/ContractsPage'))
const TripsPage = lazy(() => import('@vendor/modules/trips/pages/TripsPage'))
const ExpensesPage = lazy(() => import('@vendor/modules/expenses/pages/ExpensesPage'))
const FleetPage = lazy(() => import('@vendor/modules/fleet/pages/FleetPage'))
const InvoicesPage = lazy(() => import('@vendor/modules/invoices/pages/InvoicesPage'))
const ProfilePage = lazy(() => import('@vendor/modules/profile/pages/ProfilePage'))

function LazyPage({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-[#64748B]">Loading module...</div>}>
      {children}
    </Suspense>
  )
}

export function VendorRoutes({ standalone = false }: { standalone?: boolean }) {
  const routes = [
    ...(standalone
      ? [
          { path: '/login', element: <LoginPage /> },
          { path: '/', element: <Navigate to="/vendor" replace /> },
        ]
      : [{ index: true, element: <Navigate to="/vendor/dashboard" replace /> }]),
    {
      path: standalone ? '/vendor' : '/',
      element: <ProtectedRoute portal="vendor"><AppShell /></ProtectedRoute>,
      children: [
        { index: true, element: <Navigate to="/vendor/dashboard" replace /> },
        { path: 'dashboard', element: <LazyPage><DashboardPage /></LazyPage> },
        { path: 'home', element: <LazyPage><DashboardPage /></LazyPage> },
        { path: 'sourcing', element: <ProtectedRoute portal="vendor" module="sourcing"><LazyPage><SourcingPage /></LazyPage></ProtectedRoute> },
        { path: 'sourcing/auctions/:id', element: <ProtectedRoute portal="vendor" module="sourcing"><LazyPage><AuctionDetailPage /></LazyPage></ProtectedRoute> },
        { path: 'contracts', element: <ProtectedRoute portal="vendor" module="contracts"><LazyPage><ContractsPage /></LazyPage></ProtectedRoute> },
        { path: 'contracts/:id', element: <ProtectedRoute portal="vendor" module="contracts"><LazyPage><ContractsPage /></LazyPage></ProtectedRoute> },
        { path: 'trips', element: <ProtectedRoute portal="vendor" module="trips"><LazyPage><TripsPage /></LazyPage></ProtectedRoute> },
        { path: 'trips/indents/:id', element: <ProtectedRoute portal="vendor" module="trips"><LazyPage><TripsPage /></LazyPage></ProtectedRoute> },
        { path: 'trips/active/:id', element: <ProtectedRoute portal="vendor" module="trips"><LazyPage><TripsPage /></LazyPage></ProtectedRoute> },
        { path: 'trips/completed/:id', element: <ProtectedRoute portal="vendor" module="trips"><LazyPage><TripsPage /></LazyPage></ProtectedRoute> },
        { path: 'expenses', element: <ProtectedRoute portal="vendor" module="expenses"><LazyPage><ExpensesPage /></LazyPage></ProtectedRoute> },
        { path: 'expenses/add/:tripId', element: <ProtectedRoute portal="vendor" module="expenses"><LazyPage><ExpensesPage /></LazyPage></ProtectedRoute> },
        { path: 'expenses/:id', element: <ProtectedRoute portal="vendor" module="expenses"><LazyPage><ExpensesPage /></LazyPage></ProtectedRoute> },
        { path: 'fleet', element: <ProtectedRoute portal="vendor" module="fleet"><LazyPage><FleetPage /></LazyPage></ProtectedRoute> },
        { path: 'fleet/vehicles', element: <ProtectedRoute portal="vendor" module="fleet"><LazyPage><FleetPage /></LazyPage></ProtectedRoute> },
        { path: 'fleet/vehicles/add', element: <ProtectedRoute portal="vendor" module="fleet"><LazyPage><FleetPage /></LazyPage></ProtectedRoute> },
        { path: 'fleet/vehicles/:id', element: <ProtectedRoute portal="vendor" module="fleet"><LazyPage><FleetPage /></LazyPage></ProtectedRoute> },
        { path: 'fleet/drivers', element: <ProtectedRoute portal="vendor" module="fleet"><LazyPage><FleetPage /></LazyPage></ProtectedRoute> },
        { path: 'fleet/drivers/add', element: <ProtectedRoute portal="vendor" module="fleet"><LazyPage><FleetPage /></LazyPage></ProtectedRoute> },
        { path: 'fleet/drivers/:id', element: <ProtectedRoute portal="vendor" module="fleet"><LazyPage><FleetPage /></LazyPage></ProtectedRoute> },
        { path: 'fleet/capacity', element: <ProtectedRoute portal="vendor" module="fleet"><LazyPage><FleetPage /></LazyPage></ProtectedRoute> },
        { path: 'invoices', element: <ProtectedRoute portal="vendor" module="invoices"><LazyPage><InvoicesPage /></LazyPage></ProtectedRoute> },
        { path: 'invoices/create', element: <ProtectedRoute portal="vendor" module="invoices"><LazyPage><InvoicesPage /></LazyPage></ProtectedRoute> },
        { path: 'invoices/list', element: <ProtectedRoute portal="vendor" module="invoices"><LazyPage><InvoicesPage /></LazyPage></ProtectedRoute> },
        { path: 'invoices/:id', element: <ProtectedRoute portal="vendor" module="invoices"><LazyPage><InvoicesPage /></LazyPage></ProtectedRoute> },
        { path: 'invoices/ledger', element: <ProtectedRoute portal="vendor" module="invoices"><LazyPage><InvoicesPage /></LazyPage></ProtectedRoute> },
        { path: 'profile', element: <ProtectedRoute portal="vendor" module="profile"><LazyPage><ProfilePage /></LazyPage></ProtectedRoute> },
        { path: 'profile/company', element: <ProtectedRoute portal="vendor" module="profile"><LazyPage><ProfilePage /></LazyPage></ProtectedRoute> },
        { path: 'profile/bank', element: <ProtectedRoute portal="vendor" module="profile"><LazyPage><ProfilePage /></LazyPage></ProtectedRoute> },
        { path: 'profile/notifications', element: <Navigate to="/vendor/profile" replace /> },
        { path: '*', element: <Navigate to="/vendor/dashboard" replace /> },
      ],
    },
  ]

  return useRoutes(routes)
}
