import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@vendor/components/ui/button'
import { Input } from '@vendor/components/ui/input'
import { Textarea } from '@vendor/components/ui/textarea'
import { Card, CardContent } from '@vendor/components/ui/card'
import { Badge } from '@vendor/components/ui/badge'
import { StatusBadge } from '@vendor/components/shared/StatusBadge'
import { useAuthStore } from '@vendor/stores/auth.store'
import { CheckCircle2, ChevronLeft, ChevronRight, FileBadge2, Wallet, Building2 } from 'lucide-react'

const steps = ['Company', 'Coverage', 'Bank', 'Review']

export default function OnboardingPage() {
  const navigate = useNavigate()
  const { vendor, onboardingDraft, updateOnboardingDraft, completeOnboarding } = useAuthStore()
  const [step, setStep] = useState(0)

  const draft = useMemo(
    () => onboardingDraft ?? {
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
      accountType: 'CURRENT' as const,
    },
    [onboardingDraft, vendor]
  )

  const progress = Math.round(((step + 1) / steps.length) * 100)

  const next = () => setStep((current) => Math.min(current + 1, steps.length - 1))
  const back = () => setStep((current) => Math.max(current - 1, 0))

  const finish = () => {
    completeOnboarding()
    navigate('/profile/company')
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] px-4 py-8 text-[#0F172A]">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-[#2563EB]/75">Vendor onboarding</p>
            <h1 className="mt-2 text-3xl font-bold">Complete your setup</h1>
            <p className="mt-2 max-w-2xl text-[#475569]">
              Finish the web onboarding flow with the same business data the mobile app collects, but using the existing web layout.
            </p>
          </div>
          <div className="rounded-2xl border border-[#E5E7EB] bg-white px-4 py-3 text-right shadow-soft">
            <div className="text-xs text-[#64748B]">Current status</div>
            <div className="mt-1">{vendor?.status ? <StatusBadge status={vendor.status} /> : <Badge variant="muted">Draft</Badge>}</div>
          </div>
        </div>

        <div className="mb-6 rounded-full bg-[#DBEAFE] p-1">
          <div className="h-2 rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
        </div>

        <div className="mb-6 flex flex-wrap gap-2">
          {steps.map((label, index) => (
            <button
              key={label}
              onClick={() => setStep(index)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                step === index
                  ? 'bg-[#2563EB] text-white shadow-sm'
                  : 'border border-[#E5E7EB] bg-white text-[#475569] hover:border-[#BFDBFE] hover:bg-[#EFF6FF]'
              }`}
            >
              {index + 1}. {label}
            </button>
          ))}
        </div>

        <Card className="shadow-soft">
          <CardContent className="p-6 md:p-8">
            {step === 0 && (
              <div className="space-y-5">
                <div className="flex items-center gap-3">
                  <Building2 className="h-5 w-5 text-[#2563EB]" />
                  <h2 className="text-xl font-semibold">Company details</h2>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="text-sm text-[#475569]">Trading name</label>
                    <Input
                      value={draft.companyName}
                      onChange={(e) => updateOnboardingDraft({ companyName: e.target.value })}
                      className="mt-1 bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-[#475569]">Legal name</label>
                    <Input
                      value={draft.legalName}
                      onChange={(e) => updateOnboardingDraft({ legalName: e.target.value })}
                      className="mt-1 bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-[#475569]">GSTIN</label>
                    <Input
                      value={draft.gstin}
                      onChange={(e) => updateOnboardingDraft({ gstin: e.target.value.toUpperCase() })}
                      className="mt-1 bg-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-[#475569]">PAN</label>
                    <Input
                      value={draft.pan}
                      onChange={(e) => updateOnboardingDraft({ pan: e.target.value.toUpperCase() })}
                      className="mt-1 bg-white font-mono"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm text-[#475569]">Registered address</label>
                  <Textarea
                    value={`${draft.registeredAddress.street}, ${draft.registeredAddress.city}, ${draft.registeredAddress.state} - ${draft.registeredAddress.pincode}`}
                    readOnly
                    className="mt-1 bg-white"
                  />
                </div>
              </div>
            )}

            {step === 1 && (
              <div className="space-y-5">
                <div className="flex items-center gap-3">
                  <FileBadge2 className="h-5 w-5 text-[#2563EB]" />
                  <h2 className="text-xl font-semibold">Service coverage</h2>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="text-sm text-[#475569]">Service regions</label>
                    <Input
                      value={draft.serviceRegions.join(', ')}
                      onChange={(e) => updateOnboardingDraft({ serviceRegions: e.target.value.split(',').map((value) => value.trim()).filter(Boolean) })}
                      className="mt-1 bg-white"
                    />
                    <p className="mt-2 text-xs text-[#64748B]">Comma-separated for mock testing.</p>
                  </div>
                  <div>
                    <label className="text-sm text-[#475569]">Supported vehicle types</label>
                    <Input
                      value={draft.supportedVehicleTypes.join(', ')}
                      onChange={(e) => updateOnboardingDraft({ supportedVehicleTypes: e.target.value.split(',').map((value) => value.trim()).filter(Boolean) })}
                      className="mt-1 bg-white"
                    />
                  </div>
                </div>
                <div className="rounded-2xl border border-[#DBEAFE] bg-[#EFF6FF] p-4 text-sm text-[#1D4ED8]">
                  This page mirrors the data collection from the mobile setup flow, but keeps the web form style intact.
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-5">
                <div className="flex items-center gap-3">
                  <Wallet className="h-5 w-5 text-[#2563EB]" />
                  <h2 className="text-xl font-semibold">Bank details</h2>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="text-sm text-[#475569]">Bank name</label>
                    <Input value={draft.bankName} onChange={(e) => updateOnboardingDraft({ bankName: e.target.value })} className="mt-1 bg-white" />
                  </div>
                  <div>
                    <label className="text-sm text-[#475569]">Branch</label>
                    <Input value={draft.branch} onChange={(e) => updateOnboardingDraft({ branch: e.target.value })} className="mt-1 bg-white" />
                  </div>
                  <div>
                    <label className="text-sm text-[#475569]">Account number</label>
                    <Input value={draft.accountNumber} onChange={(e) => updateOnboardingDraft({ accountNumber: e.target.value })} className="mt-1 bg-white font-mono" />
                  </div>
                  <div>
                    <label className="text-sm text-[#475569]">IFSC code</label>
                    <Input value={draft.ifscCode} onChange={(e) => updateOnboardingDraft({ ifscCode: e.target.value.toUpperCase() })} className="mt-1 bg-white font-mono" />
                  </div>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-[#16A34A]" />
                  <h2 className="text-xl font-semibold">Review and submit</h2>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl border border-[#E5E7EB] bg-[#F8FAFC] p-4">
                    <div className="text-xs text-[#64748B]">Company</div>
                    <div className="mt-1 font-medium">{draft.companyName}</div>
                    <div className="mt-3 text-xs text-[#64748B]">Coverage</div>
                    <div className="mt-1 text-sm">{draft.serviceRegions.join(', ') || '—'}</div>
                  </div>
                  <div className="rounded-2xl border border-[#E5E7EB] bg-[#F8FAFC] p-4">
                    <div className="text-xs text-[#64748B]">Bank</div>
                    <div className="mt-1 font-medium">{draft.bankName}</div>
                    <div className="mt-3 text-xs text-[#64748B]">Account</div>
                    <div className="mt-1 font-mono text-sm">****{draft.accountNumber.slice(-4)}</div>
                  </div>
                </div>
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                  Submitting activates the vendor account in local state and opens the normal portal UI.
                </div>
              </div>
            )}

            <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
              <div className="text-sm text-[#64748B]">
                Step {step + 1} of {steps.length}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={back} disabled={step === 0}>
                  <ChevronLeft className="mr-1 h-4 w-4" /> Back
                </Button>
                {step < steps.length - 1 ? (
                  <Button onClick={next}>
                    Next <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                ) : (
                  <Button onClick={finish}>Submit for review</Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
