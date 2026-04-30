import { Navigate, useRoutes } from 'react-router-dom'
import { ProtectedRoute } from '@shared-auth'
import { AppShell } from '@admin/components/layout/AppShell'
import LoginPage from '@admin/auth/LoginPage'
import DashboardPage from '@admin/modules/auction/dashboard/pages/DashboardPage'
import AuctionsPage from '@admin/modules/auction/auctions/pages/AuctionsPage'
import AuctionCreatePage from '@admin/modules/auction/auctions/pages/AuctionCreatePage'
import AuctionDetailPage from '@admin/modules/auction/auctions/pages/AuctionDetailPage'
import ContractsPage from '@admin/modules/auction/contracts/pages/ContractsPage'

export function AdminRoutes({ standalone = false }: { standalone?: boolean }) {
  const dashboardPath = '/auction/dashboard'

  const routes = [
    ...(standalone
      ? [
          { path: '/login', element: <LoginPage /> },
          { path: '/', element: <Navigate to={dashboardPath} replace /> },
          { path: '/admin/*', element: <Navigate to={dashboardPath} replace /> },
        ]
      : []),
    {
      ...(standalone ? { path: '/auction' } : {}),
      element: <ProtectedRoute portal="auction"><AppShell /></ProtectedRoute>,
      children: [
        { index: true, element: <Navigate to={dashboardPath} replace /> },
        { path: 'dashboard', element: <DashboardPage /> },
        { path: 'auctions', element: <ProtectedRoute portal="auction" module="auction"><AuctionsPage /></ProtectedRoute> },
        { path: 'auctions/new', element: <ProtectedRoute portal="auction" module="auction"><AuctionCreatePage /></ProtectedRoute> },
        { path: 'auctions/new/:type', element: <ProtectedRoute portal="auction" module="auction"><AuctionCreatePage /></ProtectedRoute> },
        { path: 'auctions/:id', element: <ProtectedRoute portal="auction" module="auction"><AuctionDetailPage /></ProtectedRoute> },
        { path: 'contracts', element: <ProtectedRoute portal="auction" module="contracts"><ContractsPage /></ProtectedRoute> },
        { path: 'contracts/:id', element: <ProtectedRoute portal="auction" module="contracts"><ContractsPage /></ProtectedRoute> },
      ],
    },
  ]

  return useRoutes(routes)
}
