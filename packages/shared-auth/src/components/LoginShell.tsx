import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Eye, EyeOff, AlertCircle, WifiOff } from 'lucide-react'
import { useAuth, DEMO_CREDENTIALS, DEMO_PASSWORD } from '../context/AuthContext'
import { OptimileLogo } from './OptimileLogo'

export function LoginShell() {
  const [email, setEmail]               = useState('')
  const [password, setPassword]         = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe]     = useState(false)

  const { login, loading, error, backendAvailable } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: { preventDefault(): void }) => {
    e.preventDefault()
    try {
      const nextRoute = await login(email, password, rememberMe)
      navigate(nextRoute, { replace: true })
    } catch {
      // error set in context
    }
  }

  const handleDemoLogin = async (demoEmail: string) => {
    try {
      const nextRoute = await login(demoEmail, DEMO_PASSWORD)
      navigate(nextRoute, { replace: true })
    } catch {
      // error shown inline
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">

        {/* Brand */}
        <div className="text-center mb-8">
          <OptimileLogo
            className="text-primary mx-auto mb-4"
            style={{ height: 44, width: 'auto', display: 'block' }}
          />
          <p className="text-gray-500 text-sm">Logistics Enterprise Resource Planning</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8 space-y-5">
          <div>
            <h1 className="text-2xl font-extrabold text-text">Welcome back</h1>
            <p className="text-sm text-gray-500 mt-1">Sign in to your Optimile account</p>
          </div>

          {/* Offline warning */}
          {backendAvailable === false && (
            <div className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm font-semibold text-warning">
              <WifiOff className="h-4 w-4 mt-0.5 shrink-0" />
              <span>Backend unavailable — use a demo account below.</span>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-danger/20 bg-danger/10 p-3 text-sm font-semibold text-danger">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div>
              <label htmlFor="email" className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5">
                Email
              </label>
              <input
                id="email"
                type="email"
                name="email"
                autoComplete="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm outline-none ring-primary/20 transition focus:border-primary focus:ring-4"
                placeholder="you@company.com"
                required
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="password" className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Password
                </label>
                <Link to="/forgot-password" className="text-xs font-semibold text-primary hover:text-secondary transition">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 pr-10 text-sm outline-none ring-primary/20 transition focus:border-primary focus:ring-4"
                  placeholder="Enter password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                id="remember"
                type="checkbox"
                checked={rememberMe}
                onChange={e => setRememberMe(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <label htmlFor="remember" className="text-sm text-gray-600 select-none">Remember me</label>
            </div>

            <button
              type="submit"
              disabled={loading || !email || !password}
              className="h-10 w-full inline-flex items-center justify-center rounded-lg border border-primary bg-primary px-4 text-sm font-semibold text-white transition hover:bg-secondary hover:border-secondary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          {/* Demo accounts */}
          <div className="border-t border-gray-100 pt-4">
            <p className="text-[11px] font-extrabold uppercase tracking-wider text-gray-400 text-center mb-3">
              Quick Demo Login · password: <span className="font-mono">{DEMO_PASSWORD}</span>
            </p>
            <div className="space-y-2">
              {Object.entries(DEMO_CREDENTIALS).map(([demoEmail, info]) => (
                <button
                  key={demoEmail}
                  type="button"
                  onClick={() => void handleDemoLogin(demoEmail)}
                  disabled={loading}
                  className="w-full flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-left transition hover:bg-primary/5 hover:border-primary/30 disabled:opacity-50"
                >
                  <div>
                    <p className="text-xs font-bold text-text">{info.role}</p>
                    <p className="text-[11px] text-gray-400 font-mono mt-0.5">{demoEmail}</p>
                  </div>
                  <span className="text-[10px] font-bold text-gray-400 bg-gray-100 rounded px-1.5 py-0.5 shrink-0 ml-2">
                    {info.modules.length} module{info.modules.length !== 1 ? 's' : ''}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
