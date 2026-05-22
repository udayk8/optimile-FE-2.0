import { type ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { FileCheck2, FileSpreadsheet, FileText, Gavel, LayoutDashboard } from 'lucide-react'
import type { ModuleManifest } from '../../../../src/shell/manifest'
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
import { useAuctionAuth } from '@auction/hooks/useAuctionAuth'

function AuctionWrapper({ children }: { children: ReactNode }) {
  const { auctionUser } = useAuctionAuth()
  return (
    <>
      {auctionUser?.status === 'SUSPENDED' && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-700">
          This demo user is suspended. Read-only access is recommended.
        </div>
      )}
      {children}
    </>
  )
}

export const auctionManifest: ModuleManifest = {
  key: 'auction',
  label: 'Auction',
  icon: Gavel,
  basePath: '/auction',
  defaultPath: '/auction/dashboard',
  sidebar: [
    { label: 'Dashboard', path: '/auction/dashboard', icon: LayoutDashboard },
    { label: 'Client Hub', path: '/auction/sourcing', icon: FileText },
    { label: 'RFQ Responses', path: '/auction/rfq-responses', icon: FileSpreadsheet },
    { label: 'Auctions', path: '/auction/auctions', icon: Gavel },
    { label: 'Contracts', path: '/auction/contracts', icon: FileCheck2 },
  ],
  Wrapper: AuctionWrapper,
  routes: [
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
    { path: '*', element: <Navigate to="/auction/dashboard" replace /> },
  ],
}
