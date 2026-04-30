import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@vendor/stores/auth.store'
import { MOCK_VENDOR } from '@vendor/lib/mock-data'
import { Button } from '@vendor/components/ui/button'
import { Input } from '@vendor/components/ui/input'
import { Truck, LogIn } from 'lucide-react'

export default function LoginPage() {
  const [mobile, setMobile] = useState('9876543210')
  const [otp, setOtp] = useState('123456')
  const [otpSent, setOtpSent] = useState(false)
  const { setAuth, vendor, setOnboardingDraft } = useAuthStore()
  const navigate = useNavigate()

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    if (otp !== '123456') return
    const nextStatus = vendor?.status === 'ACTIVE' ? 'ACTIVE' : 'ONBOARDING_INCOMPLETE'
    if (nextStatus !== 'ACTIVE') {
      setOnboardingDraft({
        companyName: MOCK_VENDOR.tradingName,
        legalName: MOCK_VENDOR.legalName,
        gstin: MOCK_VENDOR.gstin,
        pan: MOCK_VENDOR.pan,
        registeredAddress: {
          street: '45, Transport Nagar',
          city: 'Mumbai',
          state: 'Maharashtra',
          pincode: '400001',
        },
        primaryContact: { ...MOCK_VENDOR.primaryContact },
        serviceRegions: ['Maharashtra', 'Gujarat'],
        supportedVehicleTypes: ['20ft Container', 'Flatbed'],
        bankName: 'HDFC Bank',
        branch: 'Andheri East, Mumbai',
        accountNumber: '50100123456789',
        ifscCode: 'HDFC0001234',
        accountType: 'CURRENT',
      })
    }
    setAuth(
      {
        ...MOCK_VENDOR,
        ...(vendor ?? {}),
        primaryContact: vendor?.primaryContact ?? MOCK_VENDOR.primaryContact,
        status: nextStatus,
        onboardingStep: nextStatus === 'ACTIVE' ? 'COMPLETE' : 'SETUP',
        kycStatus: nextStatus === 'ACTIVE' ? 'APPROVED' : 'DRAFT',
        profileCompletion: nextStatus === 'ACTIVE' ? 100 : 25,
        bankStatus: nextStatus === 'ACTIVE' ? 'VERIFIED' : 'PENDING',
      },
      'mock-jwt-token-xyz'
    )
    navigate(nextStatus === 'ACTIVE' ? '/home' : '/onboarding')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/20 mb-4">
            <Truck className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-white">Vendor Portal</h1>
          <p className="text-blue-300 mt-2">Sign in with mobile number and OTP to manage your operations</p>
        </div>

        {/* Login form */}
        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-8 shadow-2xl">
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-blue-200">Mobile Number</label>
              <Input
                type="tel"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                placeholder="Enter your mobile number"
                className="mt-1 bg-white/10 border-white/20 text-white placeholder:text-blue-300/50 focus:ring-primary"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-blue-200">OTP</label>
              <Input
                inputMode="numeric"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="Enter OTP"
                className="mt-1 bg-white/10 border-white/20 text-white placeholder:text-blue-300/50 focus:ring-primary"
              />
            </div>
            <Button
              type="button"
              variant="outline"
              className="w-full h-11 border-white/20 bg-transparent text-white hover:bg-white/10"
              onClick={() => setOtpSent(true)}
            >
              Send OTP
            </Button>
            <Button type="submit" className="w-full h-11 text-base" size="lg">
              <LogIn className="h-4 w-4 mr-2" /> Verify OTP and Sign In
            </Button>
            <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-blue-100/70">
              Vendor users are pre-registered. Use OTP login to continue to onboarding or the portal.
            </div>
          </form>
          <p className="text-center text-xs text-blue-300/50 mt-4">
            Hardcoded OTP: 123456. {otpSent ? 'OTP marked as sent.' : 'Use Send OTP first for the mock flow.'}
          </p>
        </div>
      </div>
    </div>
  )
}
