import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Eye, EyeOff, AlertCircle, ChevronDown } from 'lucide-react'
import { useAuth, DEMO_CREDENTIALS, DEMO_PASSWORD } from '../context/AuthContext'
import { OptimileLogo } from './OptimileLogo'

export function LoginShell() {
  const adminDemoEmail = 'platform-admin@optimile.com'
  const [email, setEmail]               = useState('')
  const [password, setPassword]         = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe]     = useState(false)
  const [showDemoAccounts, setShowDemoAccounts] = useState(false)

  const { login, loading, error } = useAuth()
  const navigate = useNavigate()
  const roleOrder = [
    'CEO',
    'Platform Admin',
    'Tenant Admin',
    'TMS',
    'Vendor',
    'Auction Head',
    'Fleet Manager',
    'Track and Trace',
    'CBD',
  ] as const

  const roleRank = new Map<string, number>(roleOrder.map((role, idx) => [role, idx]))

  const canonicalEmailByRole: Partial<Record<(typeof roleOrder)[number], string>> = {
    CEO: 'ceo@uday.ts.com',
    'Platform Admin': 'platform-admin@optimile.com',
    'Tenant Admin': 'tenant-admin@optimile.com',
    TMS: 'tms@optimile.com',
    Vendor: 'vendor@pranay.ts.com',
    'Auction Head': 'auction@pranay.ts.com',
    'Fleet Manager': 'fleet@uday.ts.com',
    'Track and Trace': 'tracking@optimile.com',
    CBD: 'cbd@optimile.com',
  }

  const orderedEmails = roleOrder
    .map((role) => canonicalEmailByRole[role])
    .filter((email): email is string => Boolean(email))

  const demoEntries = orderedEmails
    .flatMap((email) => {
      const info = DEMO_CREDENTIALS[email]
      return info ? [[email, info] as const] : []
    })
    .sort((a, b) => (roleRank.get(a[1].role) ?? 99) - (roleRank.get(b[1].role) ?? 99))

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

  const moduleLabelMap: Record<string, string> = {
    ams: 'Auction',
    fleet: 'Fleet',
    vendor: 'Vendor',
    customer: 'Customer',
    tms: 'TMS Booking',
    tracking: 'Track & Trace',
    'platform-admin': 'Platform Admin',
    'tenant-admin': 'Tenant Admin',
    'driver-app': 'Driver App',
    admin: 'Administration',
    finance: 'Finance',
    reporting: 'Reporting',
    ptl: 'PTL',
  }

  const formatModules = (modules: string[]) => modules.map((m) => moduleLabelMap[m] ?? m).join(', ')

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-2xl">

        {/* Brand */}
        <div className="text-center mb-8">
          <OptimileLogo
            className="text-primary mx-auto mb-4"
            style={{ height: 44, width: 'auto', display: 'block' }}
          />
          <p className="text-gray-500 text-base">Logistics Enterprise Resource Planning</p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm space-y-5">
          {/* Error */}
          {showErrorBanner && (
            <div className="flex items-start gap-2 rounded-lg border border-danger/20 bg-danger/10 p-3 text-base font-semibold text-danger">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div>
              <label htmlFor="email" className="block text-sm font-semibold uppercase tracking-wide text-gray-500 mb-1.5">
                Email
              </label>
              <input
                id="email"
                type="email"
                name="email"
                autoComplete="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="h-12 w-full rounded-lg border border-gray-300 bg-white px-3 text-base outline-none ring-primary/20 transition focus:border-primary focus:ring-4"
                placeholder="you@company.com"
                required
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="password" className="text-sm font-semibold uppercase tracking-wide text-gray-500">
                  Password
                </label>
                <Link to="/forgot-password" className="text-sm font-semibold text-primary hover:text-secondary transition">
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
                  className="h-12 w-full rounded-lg border border-gray-300 bg-white px-3 pr-10 text-base outline-none ring-primary/20 transition focus:border-primary focus:ring-4"
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
              <label htmlFor="remember" className="text-base text-gray-600 select-none">Remember me</label>
            </div>

            <button
              type="submit"
              disabled={loading || !email || !password}
              className="h-12 w-full inline-flex items-center justify-center rounded-lg border border-primary bg-primary px-4 text-base font-semibold text-white transition hover:bg-secondary hover:border-secondary disabled:cursor-not-allowed disabled:border-primary/70 disabled:bg-primary/70 disabled:text-white disabled:opacity-100"
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
                <p className="text-sm font-extrabold uppercase tracking-wider text-gray-400">
                  Other Demo Logins
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  Click to view accounts and modules served. Password: <span className="font-mono">{DEMO_PASSWORD}</span>
                </p>
              </div>
              <span className="inline-flex items-center gap-2 text-base font-semibold text-primary">
                {showDemoAccounts ? 'Hide' : 'Show'}
                <ChevronDown className={`h-4 w-4 transition ${showDemoAccounts ? 'rotate-180' : ''}`} />
              </span>
            </button>

            {showDemoAccounts && (
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {demoEntries
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
                          <p className="text-base font-bold text-text">{getRoleLabel(info.role)}</p>
                          {getRoleHelper(info.role) && (
                            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-primary">
                              {getRoleHelper(info.role)}
                            </span>
                          )}
                        </div>
                        <p className="mt-1 truncate font-mono text-xs text-gray-400">{demoEmail}</p>
                        <p className="mt-1 text-xs text-gray-500">Modules: {formatModules(info.modules)}</p>
                      </div>
                      <span className="shrink-0 rounded-full bg-gray-100 px-2 py-1 text-[11px] font-bold text-gray-500">
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
