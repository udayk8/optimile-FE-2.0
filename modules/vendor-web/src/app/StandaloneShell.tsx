import { useNavigate } from 'react-router-dom'
import { ShellAppShell, type ModuleManifest } from '@shared-ui'
import { useAuth, OptimileLogo } from '@shared-auth'
import { useAppStore } from '@vendor/stores/app.store'

export function StandaloneShell({ manifest }: { manifest: ModuleManifest }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const unreadCount = useAppStore(
    (state) => state.notifications.filter((n) => !n.isRead).length,
  )
  const onLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }
  return (
    <ShellAppShell
      modules={[manifest]}
      user={user ? { name: user.name, email: user.email, role: user.role } : null}
      onLogout={onLogout}
      logo={<OptimileLogo className="text-primary" style={{ height: 28, width: 'auto' }} />}
      notificationCount={unreadCount}
      onNotificationsClick={() => navigate('/vendor/notifications')}
    />
  )
}
