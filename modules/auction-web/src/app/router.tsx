import { Navigate, useRoutes } from 'react-router-dom'
import { ProtectedRoute } from '@shared-auth'
import { AppShell } from '@auction/components/layout/AppShell'
import LoginPage from '@auction/features/auth/pages/LoginPage'
import DashboardPage from '@auction/features/dashboard/pages/DashboardPage'
import AuctionsPage from '@auction/features/auctions/pages/AuctionsPage'
import AuctionCreatePage from '@auction/features/auctions/pages/AuctionCreatePage'
import AuctionDetailPage from '@auction/features/auctions/pages/AuctionDetailPage'
import ContractsPage from '@auction/features/contracts/pages/ContractsPage'
import SourcingPage from '@auction/features/sourcing/pages/SourcingPage'
import RfiCreatePage from '@auction/features/sourcing/pages/RfiCreatePage'
import RfiDetailPage from '@auction/features/sourcing/pages/RfiDetailPage'
import RfqCreatePage from '@auction/features/sourcing/pages/RfqCreatePage'
import RfqDetailPage from '@auction/features/sourcing/pages/RfqDetailPage'
import RfqResponsesPage from '@auction/features/sourcing/pages/RfqResponsesPage'
import NotificationsPage from '@auction/features/notifications/pages/NotificationsPage'

export function AuctionRoutes({ standalone = false }: { standalone?: boolean }) {
  const protectedChildren = [
    { index: true, element: <Navigate to="dashboard" replace /> },
    { path: 'dashboard', element: <DashboardPage /> },
    { path: 'auctions', element: <AuctionsPage /> },
    { path: 'auctions/new', element: <AuctionCreatePage /> },
    { path: 'auctions/new/:type', element: <AuctionCreatePage /> },
    { path: 'auctions/:id', element: <AuctionDetailPage /> },
    { path: 'contracts', element: <ContractsPage /> },
    { path: 'contracts/:id', element: <ContractsPage /> },
    { path: 'sourcing', element: <SourcingPage /> },
    { path: 'sourcing/rfi/new', element: <RfiCreatePage /> },
    { path: 'sourcing/rfi/:id', element: <RfiDetailPage /> },
    { path: 'sourcing/rfq/new', element: <RfqCreatePage /> },
    { path: 'sourcing/rfq/:id', element: <RfqDetailPage /> },
    { path: 'rfq-responses', element: <RfqResponsesPage /> },
    { path: 'notifications', element: <NotificationsPage /> },
    { path: '*', element: <Navigate to="dashboard" replace /> },
  ]

  const routes = standalone
    ? [
        { path: '/login', element: <LoginPage /> },
        { path: '/', element: <Navigate to="/auction" replace /> },
        {
          path: '/auction',
          element: <ProtectedRoute portal="auction"><AppShell /></ProtectedRoute>,
          children: protectedChildren,
        },
        { path: '*', element: <Navigate to="/auction/dashboard" replace /> },
      ]
    : [
        {
          path: '/',
          element: <AppShell />,
          children: protectedChildren,
        },
      ]

  return useRoutes(routes)
}
