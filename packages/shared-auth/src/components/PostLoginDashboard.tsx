import { useNavigate } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { OptimileLogo } from './OptimileLogo'

export function PostLoginDashboard() {
  const { logout, user } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10 text-text">
      <section className="w-full max-w-2xl rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
        <OptimileLogo className="mx-auto text-primary" style={{ height: 36, width: 'auto', display: 'block' }} />
        <p className="mt-8 text-sm font-bold uppercase tracking-wide text-accent">Optimile ERP</p>
        <h1 className="mt-2 text-3xl font-extrabold text-text">
          Welcome{user?.name ? `, ${user.name.split(' ')[0]}` : ''}
        </h1>
        <p className="mt-3 text-sm text-gray-600">
          You are signed in to the executive workspace.
        </p>
        <button
          type="button"
          onClick={handleLogout}
          className="mx-auto mt-8 inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 text-sm font-semibold text-primary transition hover:bg-gray-50"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </section>
    </main>
  )
}
