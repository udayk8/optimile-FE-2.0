import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import { useNavigate } from 'react-router-dom'
import { useAuctionAuth } from '@auction/hooks/useAuctionAuth'

export function AppShell() {
  const navigate = useNavigate()
  const { auctionUser, isAuthenticated, loading } = useAuctionAuth()

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate('/login', { replace: true })
    }
  }, [isAuthenticated, loading, navigate])

  if (loading || !isAuthenticated) return null

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      <Sidebar />

      <div className="flex min-h-screen flex-1 flex-col">
        {auctionUser?.status === 'SUSPENDED' && (
          <div className="border-b border-amber-200 bg-amber-50 px-6 py-2.5 text-center text-sm text-amber-700">
            This demo user is suspended. Read-only access is recommended.
          </div>
        )}

        <TopBar />

        <main className="flex-1 p-6">
          <div className="page-enter">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
