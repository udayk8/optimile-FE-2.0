import { useNavigate } from 'react-router-dom'
import {
  getPortalDashboardPath,
  LoginShell,
  storeDemoLogin,
  storeTokenLogin,
  type DemoRole,
  type Portal,
} from '@shared-auth'
import { useAuthStore } from '@admin/stores/auth.store'
import { MOCK_USERS } from '@admin/utils/mock-data'

function pickDemoUser(role: DemoRole) {
  if (role === 'Procurement Head') return MOCK_USERS.find((user) => user.role === 'PROCUREMENT') ?? MOCK_USERS[0]
  if (role === 'Ops Head' || role === 'Regional Manager' || role === 'Fleet Manager') return MOCK_USERS.find((user) => user.role === 'OPS') ?? MOCK_USERS[0]
  if (role === 'Finance Manager') return MOCK_USERS.find((user) => user.role === 'FINANCE') ?? MOCK_USERS[0]
  return MOCK_USERS.find((user) => user.role === 'ADMIN') ?? MOCK_USERS[0]
}

export default function LoginPage() {
  const { setAuth } = useAuthStore()
  const navigate = useNavigate()

  const redirectToPortal = (portal: Portal) => {
    navigate(getPortalDashboardPath(portal))
  }

  return (
    <LoginShell
      defaultPortal="admin"
      defaultEmail="admin@optimile-demo.com"
      defaultPassword="demo123"
      onDemoLogin={({ portal, role }) => {
        storeDemoLogin(portal, role)

        if (portal === 'admin') {
          const user = pickDemoUser(role)
          if (user) setAuth(user, 'demo-admin-token')
        }

        redirectToPortal(portal)
      }}
      onSubmit={({ portal, email, password, rememberMe }) => {
        if (!email || !password) return

        storeTokenLogin(portal)
        if (rememberMe) localStorage.setItem('rememberMe', 'true')

        if (portal === 'admin') {
          const user = MOCK_USERS.find((item) => item.email === email) ?? MOCK_USERS[0]
          if (user) setAuth(user, 'mock-admin-token')
        }

        redirectToPortal(portal)
      }}
    />
  )
}
