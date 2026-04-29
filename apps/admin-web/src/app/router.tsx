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
  const routes = [
    ...(standalone
      ? [
          { path: '/login', element: <LoginPage /> },
          { path: '/', element: <Navigate to="/admin" replace /> },
          { path: '/auction/*', element: <Navigate to="/admin/auction/dashboard" replace /> },
        ]
      : [
          { index: true, element: <Navigate to="/admin/auction/dashboard" replace /> },
          { path: 'auction/*', element: <Navigate to="/admin/auction/dashboard" replace /> },
        ]),
    {
      path: standalone ? '/admin' : '/',
      element: <ProtectedRoute portal="admin"><AppShell /></ProtectedRoute>,
      children: [
        { index: true, element: <Navigate to="/admin/auction/dashboard" replace /> },
        { path: 'auction', element: <Navigate to="/admin/auction/dashboard" replace /> },
        { path: 'auction/dashboard', element: <DashboardPage /> },
        { path: 'auction/auctions', element: <ProtectedRoute portal="admin" module="auction"><AuctionsPage /></ProtectedRoute> },
        { path: 'auction/auctions/new', element: <ProtectedRoute portal="admin" module="auction"><AuctionCreatePage /></ProtectedRoute> },
        { path: 'auction/auctions/new/:type', element: <ProtectedRoute portal="admin" module="auction"><AuctionCreatePage /></ProtectedRoute> },
        { path: 'auction/auctions/:id', element: <ProtectedRoute portal="admin" module="auction"><AuctionDetailPage /></ProtectedRoute> },
        { path: 'auction/contracts', element: <ProtectedRoute portal="admin" module="contracts"><ContractsPage /></ProtectedRoute> },
        { path: 'auction/contracts/:id', element: <ProtectedRoute portal="admin" module="contracts"><ContractsPage /></ProtectedRoute> },
      ],
    },
  ]

  return useRoutes(routes)
}
