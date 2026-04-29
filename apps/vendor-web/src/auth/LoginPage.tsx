import { useNavigate } from 'react-router-dom'
import {
  getPortalDashboardPath,
  LoginShell,
  storeDemoLogin,
  storeTokenLogin,
  type Portal,
} from '@shared-auth'
import { useAuthStore } from '@vendor/stores/auth.store'
import { MOCK_VENDOR } from '@vendor/utils/mock-data'

export default function LoginPage() {
  const { setAuth } = useAuthStore()
  const navigate = useNavigate()

  const redirectToPortal = (portal: Portal) => {
    navigate(getPortalDashboardPath(portal))
  }

  return (
    <LoginShell
      defaultPortal="vendor"
      defaultEmail="rajesh@fasttrack.in"
      defaultPassword="demo123"
      onDemoLogin={({ portal, role }) => {
        storeDemoLogin(portal, role)

        if (portal === 'vendor') {
          setAuth({ ...MOCK_VENDOR, status: 'ACTIVE' }, 'demo-vendor-token')
        }

        redirectToPortal(portal)
      }}
      onSubmit={({ portal, email, password, rememberMe }) => {
        if (!email || !password) return

        storeTokenLogin(portal)
        if (rememberMe) localStorage.setItem('rememberMe', 'true')

        if (portal === 'vendor') {
          setAuth({ ...MOCK_VENDOR, status: 'ACTIVE' }, 'mock-jwt-token-xyz')
        }

        redirectToPortal(portal)
      }}
    />
  )
}
