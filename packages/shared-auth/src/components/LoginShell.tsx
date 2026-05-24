import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Eye, EyeOff, AlertCircle, ChevronDown } from 'lucide-react'
import { useAuth, DEMO_CREDENTIALS, DEMO_PASSWORD } from '../context/AuthContext'
import { OptimileLogo } from './OptimileLogo'

export function LoginShell() {
  const adminDemoEmail = 'platform-admin@optimile.com'
  const adminDemoInfo = DEMO_CREDENTIALS[adminDemoEmail]
  const [email, setEmail]               = useState(adminDemoEmail)
  const [password, setPassword]         = useState(DEMO_PASSWORD)
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe]     = useState(false)
  const [showDemoAccounts, setShowDemoAccounts] = useState(false)

  const { login, loading, error } = useAuth()
  const navigate = useNavigate()
  const demoEntries = Object.entries(DEMO_CREDENTIALS).filter(([, info]) => info.role !== 'Driver')

  const handleSubmit = async (e: { preventDefault(): void }) => {
    e.preventDefault()
    try {
      const nextRoute = await login(email, password, rememberMe)
      navigate(nextRoute, { replace: true })
    } catch {
      // error set in context
    }
  }

  const handleDemoAutofill = (demoEmail: string) => {
    setEmail(demoEmail)
    setPassword(DEMO_PASSWORD)
  }

  const getRoleHelper = (role: string) => {
    if (role === 'CEO') return 'ALL ACCESS'
    return null
  }

  const getRoleLabel = (role: string) => {
    if (role === 'Platform Admin') return 'Administration'
    if (role === 'TMS') return 'TMS'
    return role
  }

  const showErrorBanner = Boolean(error && error.trim() !== 'Request failed (404)')

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-2xl">

        {/* Brand */}
        <div className="text-center mb-8">
          <OptimileLogo
            className="text-primary mx-auto mb-4"
            style={{ height: 44, width: 'auto', display: 'block' }}
          />
          <p className="text-gray-500 text-sm">Logistics Enterprise Resource Planning</p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm space-y-5">
          {adminDemoInfo && (
            <div className="flex items-center justify-between rounded-xl border border-sky-100 bg-gradient-to-r from-sky-50 via-white to-cyan-50 px-4 py-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-sky-700">Administration</p>
                <p className="mt-1 text-xs text-slate-500">Default login is prefilled for faster access.</p>
              </div>
                <button
                  type="button"
                  onClick={() => handleDemoAutofill(adminDemoEmail)}
                  disabled={loading}
                  className="inline-flex h-11 shrink-0 items-center justify-center rounded-xl border border-sky-600 bg-sky-600 px-4 text-sm font-semibold text-white transition hover:bg-sky-700 hover:border-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Autofill Admin Login
                </button>
            </div>
          )}

          {/* Error */}
          {showErrorBanner && (
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
              className="h-10 w-full inline-flex items-center justify-center rounded-lg border border-primary bg-primary px-4 text-sm font-semibold text-white transition hover:bg-secondary hover:border-secondary disabled:cursor-not-allowed disabled:border-primary/70 disabled:bg-primary/70 disabled:text-white disabled:opacity-100"
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <div className="border-t border-gray-100 pt-4">
            <button
              type="button"
              onClick={() => setShowDemoAccounts((current) => !current)}
              className="flex w-full items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 text-left transition hover:border-primary/20 hover:bg-white"
            >
              <div>
                <p className="text-xs font-extrabold uppercase tracking-wider text-gray-400">
                  Other Demo Logins
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  Click to view the remaining accounts. Password: <span className="font-mono">{DEMO_PASSWORD}</span>
                </p>
              </div>
              <span className="inline-flex items-center gap-2 text-sm font-semibold text-primary">
                {showDemoAccounts ? 'Hide' : 'Show'}
                <ChevronDown className={`h-4 w-4 transition ${showDemoAccounts ? 'rotate-180' : ''}`} />
              </span>
            </button>

            {showDemoAccounts && (
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {demoEntries
                  .filter(([demoEmail]) => demoEmail !== adminDemoEmail)
                  .map(([demoEmail, info]) => (
                  <button
                    key={demoEmail}
                    type="button"
                    onClick={() => handleDemoAutofill(demoEmail)}
                    disabled={loading}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 text-left transition hover:border-primary/30 hover:bg-primary/5 disabled:opacity-50"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-bold text-text">{getRoleLabel(info.role)}</p>
                          {getRoleHelper(info.role) && (
                            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">
                              {getRoleHelper(info.role)}
                            </span>
                          )}
                        </div>
                        <p className="mt-1 truncate font-mono text-[11px] text-gray-400">{demoEmail}</p>
                      </div>
                      <span className="shrink-0 rounded-full bg-gray-100 px-2 py-1 text-[10px] font-bold text-gray-500">
                        {info.modules.length} module{info.modules.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
