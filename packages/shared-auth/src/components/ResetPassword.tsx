import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Eye, EyeOff, AlertCircle, CheckCircle2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { OptimileLogo } from './OptimileLogo'

export function ResetPassword() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const { resetPassword, error: apiError } = useAuth()
  const token = new URLSearchParams(window.location.search).get('token')

  const validatePassword = (pass: string): string | null => {
    if (pass.length < 8) return 'Password must be at least 8 characters'
    if (!/[A-Z]/.test(pass)) return 'Password must include at least one uppercase letter'
    if (!/[0-9]/.test(pass)) return 'Password must include at least one number'
    return null
  }

  const handleSubmit = async (e: { preventDefault(): void }) => {
    e.preventDefault()
    setFormError(null)
    if (!token) { setFormError('Invalid or missing reset token'); return }
    const passwordError = validatePassword(password)
    if (passwordError) { setFormError(passwordError); return }
    if (password !== confirmPassword) { setFormError('Passwords do not match'); return }
    setLoading(true)
    try {
      await resetPassword(token, password)
      setSuccess(true)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to reset password')
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-primary via-secondary to-primary/80 p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8 text-center">
          <AlertCircle className="h-12 w-12 text-danger mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Invalid Reset Link</h2>
          <p className="text-sm text-gray-600 mb-6">This link is invalid or has expired. Request a new one.</p>
          <Link
            to="/forgot-password"
            className="inline-flex items-center justify-center w-full py-2.5 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-secondary transition"
          >
            Request new link
          </Link>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-primary via-secondary to-primary/80 p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-50 rounded-full mb-6">
            <CheckCircle2 className="h-8 w-8 text-green-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Password updated</h2>
          <p className="text-sm text-gray-600 mb-8">Your password has been reset. You can now sign in.</p>
          <Link
            to="/login"
            className="inline-flex items-center justify-center w-full py-2.5 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-secondary transition"
          >
            Go to login
          </Link>
        </div>
      </div>
    )
  }

  const strengthBits = [password.length >= 8, /[A-Z]/.test(password), /[0-9]/.test(password)]
  const strengthColors = strengthBits.map(ok => ok ? 'bg-success' : 'bg-gray-200')

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-primary via-secondary to-primary/80 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <OptimileLogo className="text-white mx-auto mb-3" style={{ height: 48, width: 'auto', display: 'block' }} />
          <h1 className="text-2xl font-bold text-white">Optimile ERP</h1>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Set new password</h2>

          {(formError ?? apiError) && (
            <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{formError ?? apiError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="new-password" className="block text-sm font-medium text-gray-700 mb-1">
                New password
              </label>
              <div className="relative">
                <input
                  id="new-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full px-4 py-2.5 pr-10 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition"
                  placeholder="At least 8 characters"
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
              <div className="mt-1.5 flex gap-1">
                {strengthColors.map((color, i) => (
                  <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${color}`} />
                ))}
              </div>
            </div>

            <div>
              <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700 mb-1">
                Confirm new password
              </label>
              <input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition"
                placeholder="Repeat new password"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-secondary transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Updating…' : 'Update password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
