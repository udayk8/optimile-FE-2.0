import { useState } from 'react'

import { useModuleNavigate as useNavigate, ModuleLink as Link } from '@vendor/hooks/useModuleRoute'
import { useAuthStore } from '@vendor/stores/auth.store'
import { MOCK_VENDOR } from '@vendor/lib/mock-data'
import { Button } from '@vendor/components/ui/button'
import { Input } from '@vendor/components/ui/input'
import { Truck, LogIn } from 'lucide-react'

export default function LoginPage() {
  const [mobile, setMobile] = useState('9876543210')
  const [otp, setOtp] = useState('123456')
  const [otpSent, setOtpSent] = useState(false)
  const { setAuth, vendor } = useAuthStore()
  const navigate = useNavigate()

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    if (otp !== '123456') return
    setAuth(
      {
        ...MOCK_VENDOR,
        ...(vendor ?? {}),
        primaryContact: vendor?.primaryContact ?? MOCK_VENDOR.primaryContact,
        status: 'ACTIVE',
        onboardingStep: 'COMPLETE',
        kycStatus: 'APPROVED',
        profileCompletion: 100,
        bankStatus: 'VERIFIED',
      },
      'mock-jwt-token-xyz'
    )
    navigate('/vendor')
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4 text-text">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-xl bg-primary/10">
            <Truck className="h-8 w-8 text-primary" />
          </div>
          <p className="text-sm font-bold uppercase tracking-wide text-accent">Vendor Portal</p>
          <h1 className="mt-2 text-3xl font-extrabold text-text">Sign in to continue</h1>
          <p className="mt-2 text-sm text-gray-600">Use mobile number and OTP to continue to the vendor workspace.</p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">Mobile Number</label>
              <Input
                type="tel"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                placeholder="Enter your mobile number"
                className="mt-1 bg-white"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">OTP</label>
              <Input
                inputMode="numeric"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="Enter OTP"
                className="mt-1 bg-white"
              />
            </div>
            <Button
              type="button"
              variant="outline"
              className="h-10 w-full"
              onClick={() => setOtpSent(true)}
            >
              Send OTP
            </Button>
            <Button type="submit" className="h-10 w-full" size="default">
              <LogIn className="h-4 w-4 mr-2" /> Verify OTP and Sign In
            </Button>
            <div className="rounded-lg border border-primary/20 bg-primary/10 px-3 py-2 text-xs text-primary">
              Vendor users are pre-registered. Use OTP login to continue to the portal.
            </div>
          </form>
          <p className="mt-4 text-center text-xs text-gray-500">
            Hardcoded OTP: 123456. {otpSent ? 'OTP marked as sent.' : 'Use Send OTP first for the mock flow.'}
          </p>
        </div>
      </div>
    </div>
  )
}
