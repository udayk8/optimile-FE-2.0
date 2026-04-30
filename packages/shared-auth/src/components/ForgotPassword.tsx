import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, CheckCircle2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { OptimileLogo } from './OptimileLogo'

export function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const { forgotPassword } = useAuth()

  const handleSubmit = async (e: { preventDefault(): void }) => {
    e.preventDefault()
    setLoading(true)
    try {
      await forgotPassword(email)
    } catch {
      // Always show success to prevent user enumeration
    } finally {
      setLoading(false)
      setSubmitted(true)
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-primary via-secondary to-primary/80 p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-50 rounded-full mb-6">
            <CheckCircle2 className="h-8 w-8 text-green-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Check your email</h2>
          <p className="text-gray-600 mb-8 text-sm">
            If an account matches <strong>{email}</strong>, you will receive password reset instructions shortly.
          </p>
          <Link
            to="/login"
            className="inline-flex items-center justify-center w-full py-2.5 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-secondary transition"
          >
            Return to login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-primary via-secondary to-primary/80 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <OptimileLogo className="text-white mx-auto mb-3" style={{ height: 48, width: 'auto', display: 'block' }} />
          <h1 className="text-2xl font-bold text-white">Optimile ERP</h1>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="mb-6">
            <Link
              to="/login"
              className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:text-primary/80 transition"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to login
            </Link>
          </div>

          <h2 className="text-xl font-bold text-gray-900 mb-1">Reset your password</h2>
          <p className="text-sm text-gray-500 mb-6">
            Enter your email and we'll send you a reset link.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="fp-email" className="block text-sm font-medium text-gray-700 mb-1">
                Email address
              </label>
              <input
                id="fp-email"
                type="email"
                name="email"
                autoComplete="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition"
                placeholder="you@company.com"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading || !email}
              className="w-full py-2.5 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-secondary transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Sending…' : 'Send reset link'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
