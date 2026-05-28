import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Badge } from '@vendor/components/ui/badge'
import { StatusBadge } from '@vendor/components/shared/StatusBadge'
import { useAuthStore } from '@vendor/stores/auth.store'
import {
  VendorOnboardingWizard,
  type VendorOnboardingDraft,
} from '@/vendor-onboarding'

export default function OnboardingPage() {
  const navigate = useNavigate()
  const { vendor, onboardingDraft, updateOnboardingDraft, completeOnboarding } = useAuthStore()

  const initialDraft = useMemo<Partial<VendorOnboardingDraft>>(
    () =>
      onboardingDraft ?? {
        companyName: vendor?.tradingName ?? '',
        legalName: vendor?.legalName ?? '',
        gstin: vendor?.gstin ?? '',
        pan: vendor?.pan ?? '',
        registeredAddress: { street: '45, Transport Nagar', city: 'Mumbai', state: 'Maharashtra', pincode: '400001' },
        primaryContact: vendor?.primaryContact ?? { name: '', phone: '', email: '' },
        serviceRegions: vendor?.serviceRegions ?? ['Maharashtra', 'Gujarat'],
        supportedVehicleTypes: vendor?.supportedVehicleTypes ?? ['20ft Container', 'Flatbed'],
        bankName: 'HDFC Bank',
        branch: 'Andheri East, Mumbai',
        accountNumber: '50100123456789',
        ifscCode: 'HDFC0001234',
        accountType: 'CURRENT',
      },
    [onboardingDraft, vendor],
  )

  const header = (
    <div className="mb-6 flex items-start justify-between gap-4">
      <div>
        <p className="text-sm font-bold uppercase tracking-wide text-accent">Vendor onboarding</p>
        <h1 className="mt-2 text-3xl font-extrabold">Complete your setup</h1>
        <p className="mt-2 max-w-2xl text-gray-600">
          Finish the web onboarding flow with the same business data the mobile app collects.
        </p>
      </div>
      <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-right shadow-sm">
        <div className="text-xs text-gray-600">Current status</div>
        <div className="mt-1">
          {vendor?.status ? <StatusBadge status={vendor.status} /> : <Badge variant="muted">Draft</Badge>}
        </div>
      </div>
    </div>
  )

  return (
    <VendorOnboardingWizard
      initialDraft={initialDraft}
      header={header}
      onChange={(draft) => updateOnboardingDraft(draft)}
      onSubmit={(draft) => {
        updateOnboardingDraft(draft)
        completeOnboarding()
        navigate('/vendor', { replace: true })
      }}
    />
  )
}
