import { Navigate } from 'react-router-dom'
import { FileText, Gavel, LayoutDashboard } from 'lucide-react'
import type { ModuleManifest } from '@shared-ui'
import { AuctionRouteWrapper } from './AuctionRouteWrapper'
import DashboardPage from '@auction/features/dashboard/pages/DashboardPage'
import AuctionsPage from '@auction/features/auctions/pages/AuctionsPage'
import AuctionCreatePage from '@auction/features/auctions/pages/AuctionCreatePage'
import AuctionDetailPage from '@auction/features/auctions/pages/AuctionDetailPage'
import ContractsPage from '@auction/features/contracts/pages/ContractsPage'

export const auctionManifest: ModuleManifest = {
  key: 'auction',
  label: 'Auction',
  icon: Gavel,
  basePath: '/auction',
  sidebar: [
    { label: 'Dashboard', path: '/auction/dashboard', icon: LayoutDashboard },
    { label: 'Auctions', path: '/auction/auctions', icon: Gavel },
    { label: 'Contracts', path: '/auction/contracts', icon: FileText },
  ],
  wrapper: AuctionRouteWrapper,
  routes: [
    { index: true, element: <Navigate to="/auction/dashboard" replace /> },
    { path: 'dashboard', element: <DashboardPage /> },
    { path: 'auctions', element: <AuctionsPage /> },
    { path: 'auctions/new', element: <AuctionCreatePage /> },
    { path: 'auctions/new/:type', element: <AuctionCreatePage /> },
    { path: 'auctions/:id', element: <AuctionDetailPage /> },
    { path: 'contracts', element: <ContractsPage /> },
    { path: 'contracts/:id', element: <ContractsPage /> },
    { path: '*', element: <Navigate to="/auction/dashboard" replace /> },
  ],
}
