import { useState, type FormEvent } from 'react'
import { DEMO_ROLES, type DemoRole } from '../roles'
import { PORTALS, type Portal } from '../utils/authStorage'
import './LoginShell.css'

type LoginShellProps = {
  defaultPortal?: Portal
  defaultEmail?: string
  defaultPassword?: string
  onSubmit: (payload: {
    portal: Portal
    email: string
    password: string
    rememberMe: boolean
  }) => void
  onDemoLogin: (payload: { portal: Portal; role: DemoRole }) => void
}

const PORTAL_LABELS: Record<Portal, string> = {
  admin: 'Admin Web',
  vendor: 'Vendor Web App',
  fleet: 'Fleet Management',
  driver: 'Driver Web App',
  customer: 'Customer Web App',
}

const PORTAL_MARKS: Record<Portal, string> = {
  admin: 'AW',
  vendor: 'VP',
  fleet: 'FM',
  driver: 'DR',
  customer: 'CU',
}

export function LoginShell({
  defaultPortal = 'admin',
  defaultEmail = '',
  defaultPassword = '',
  onSubmit,
  onDemoLogin,
}: LoginShellProps) {
  const [portal, setPortal] = useState<Portal>(defaultPortal)
  const [email, setEmail] = useState(defaultEmail)
  const [password, setPassword] = useState(defaultPassword)
  const [rememberMe, setRememberMe] = useState(true)

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    onSubmit({ portal, email, password, rememberMe })
  }

  return (
    <div className="optimile-login">
      <div className="optimile-login__card">
        <div className="optimile-login__header">
          <div className="optimile-login__brand">OM</div>
          <h1>Sign in to your account</h1>
        </div>

        <form onSubmit={handleSubmit} className="optimile-login__form">
          <div>
            <label className="optimile-login__label">Choose Portal</label>
            <div className="optimile-login__portal-grid">
              {PORTALS.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setPortal(item)}
                  className={`optimile-login__portal ${portal === item ? 'is-active' : ''}`}
                >
                  <span className="optimile-login__portal-mark">{PORTAL_MARKS[item]}</span>
                  <span>{PORTAL_LABELS[item]}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="optimile-login__label">Email</label>
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="optimile-login__input"
            />
          </div>

          <div>
            <label className="optimile-login__label">Password</label>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="optimile-login__input"
            />
          </div>

          <label className="optimile-login__remember">
            <input type="checkbox" checked={rememberMe} onChange={(event) => setRememberMe(event.target.checked)} />
            Remember me
          </label>

          <button type="submit" className="optimile-login__submit">
            Sign in
          </button>

          <div className="optimile-login__demo">
            <div className="optimile-login__demo-title">QUICK DEMO LOGIN</div>
            <div className="optimile-login__demo-grid">
              {DEMO_ROLES.map((role) => (
                <button
                  key={role}
                  type="button"
                  className="optimile-login__demo-button"
                  onClick={() => onDemoLogin({ portal, role })}
                >
                  {role}
                </button>
              ))}
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
