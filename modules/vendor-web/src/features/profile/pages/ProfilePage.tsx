import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { HeroCard } from '@vendor/components/cards/HeroCard'
import { Card, CardContent, CardHeader, CardTitle } from '@vendor/components/ui/card'
import { Button } from '@vendor/components/ui/button'
import { Input } from '@vendor/components/ui/input'
import { MOCK_BANK, MOCK_COMPANY_INFO } from '@vendor/lib/mock-data'
import { Building, CreditCard, Save, User } from 'lucide-react'
import { useAuthStore } from '@vendor/stores/auth.store'
import { StatusBadge } from '@vendor/components/shared/StatusBadge'
import { Badge } from '@vendor/components/ui/badge'

type ProfileTab = 'company' | 'bank'

const PROFILE_TABS: { key: ProfileTab; label: string; path: string; icon: React.ReactNode }[] = [
  { key: 'company', label: 'Company Info', path: '/vendor/profile/company', icon: <Building className="h-4 w-4" /> },
  { key: 'bank', label: 'Bank Details', path: '/vendor/profile/bank', icon: <CreditCard className="h-4 w-4" /> },
]

function buildCompanyForm(vendor: ReturnType<typeof useAuthStore.getState>['vendor']) {
  const source = vendor
    ? {
        tradingName: vendor.tradingName,
        legalName: vendor.legalName,
        gstin: vendor.gstin,
        pan: vendor.pan,
        registeredAddress: MOCK_COMPANY_INFO.registeredAddress,
        primaryContact: vendor.primaryContact,
        serviceRegions: vendor.serviceRegions ?? MOCK_COMPANY_INFO.serviceRegions,
        supportedVehicleTypes: vendor.supportedVehicleTypes ?? MOCK_COMPANY_INFO.supportedVehicleTypes,
      }
    : MOCK_COMPANY_INFO

  return {
    tradingName: source.tradingName,
    legalName: source.legalName,
    gstin: source.gstin,
    pan: source.pan,
    street: source.registeredAddress.street,
    city: source.registeredAddress.city,
    state: source.registeredAddress.state,
    pincode: source.registeredAddress.pincode,
    contactName: source.primaryContact.name,
    contactPhone: source.primaryContact.phone,
    contactEmail: source.primaryContact.email,
    serviceRegions: source.serviceRegions.join(', '),
    supportedVehicleTypes: source.supportedVehicleTypes.join(', '),
  }
}

function getProfileTab(pathname: string): ProfileTab {
  const tab = pathname.split('/')[3]
  return PROFILE_TABS.some((item) => item.key === tab) ? (tab as ProfileTab) : 'company'
}

export default function ProfilePage() {
  const location = useLocation()
  const navigate = useNavigate()
  const { vendor, updateVendorProfile } = useAuthStore()
  const activeTab = getProfileTab(location.pathname)
  const [companyForm, setCompanyForm] = useState(() => buildCompanyForm(vendor))
  const completion = vendor?.profileCompletion ?? 0

  useEffect(() => {
    if (location.pathname === '/vendor/profile' || location.pathname === '/vendor/profile/verification') {
      navigate('/vendor/profile/company', { replace: true })
    }
  }, [location.pathname, navigate])

  useEffect(() => {
    setCompanyForm(buildCompanyForm(vendor))
  }, [vendor])

  const saveCompany = () => {
    updateVendorProfile({
      tradingName: companyForm.tradingName,
      legalName: companyForm.legalName,
      gstin: companyForm.gstin,
      pan: companyForm.pan,
      primaryContact: {
        name: vendor?.primaryContact.name ?? companyForm.contactName,
        phone: vendor?.primaryContact.phone ?? companyForm.contactPhone,
        email: companyForm.contactEmail,
      },
      serviceRegions: companyForm.serviceRegions.split(',').map((value) => value.trim()).filter(Boolean),
      supportedVehicleTypes: companyForm.supportedVehicleTypes.split(',').map((value) => value.trim()).filter(Boolean),
      profileCompletion: Math.max(completion, 60),
      onboardingStep: 'DOCUMENTS',
      status: vendor?.status === 'ACTIVE' ? 'ACTIVE' : 'ONBOARDING_INCOMPLETE',
    })
    window.alert('Company profile saved in mock state.')
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <HeroCard
          eyebrow="SETTINGS"
          title="Company Profile"
          subtitle="Manage editable company information and review registered bank details."
          icon={<User className="h-5 w-5 text-primary" />}
          className="mb-0 flex-1"
        />
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm xl:w-[240px] xl:shrink-0">
          <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Account status</div>
          <div className="mt-1 flex items-center gap-2">
            {vendor?.status ? <StatusBadge status={vendor.status} /> : <Badge variant="muted">Draft</Badge>}
          </div>
          <div className="mt-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Completion</div>
          <div className="mt-2 h-2 rounded-full bg-gray-100">
            <div className="h-2 rounded-full bg-primary" style={{ width: `${completion}%` }} />
          </div>
          <div className="mt-2 text-right text-xs text-gray-500">{completion}%</div>
        </div>
      </div>

      <div className="relative z-10 flex w-full max-w-full flex-wrap gap-1 overflow-x-auto rounded-lg bg-gray-100 p-1">
        {PROFILE_TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => navigate(tab.path)}
            aria-current={activeTab === tab.key ? 'page' : undefined}
            className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition-all ${
              activeTab === tab.key
                ? 'bg-white text-text shadow-sm'
                : 'text-gray-600 hover:text-primary'
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'company' && (
        <Card>
          <CardHeader>
            <CardTitle>Company Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div><label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">Trading Name</label><Input value={companyForm.tradingName} onChange={(e) => setCompanyForm((prev) => ({ ...prev, tradingName: e.target.value }))} className="mt-1" /></div>
              <div><label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">Legal Name</label><Input value={companyForm.legalName} onChange={(e) => setCompanyForm((prev) => ({ ...prev, legalName: e.target.value }))} className="mt-1" /></div>
              <div><label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">GSTIN</label><Input value={companyForm.gstin} onChange={(e) => setCompanyForm((prev) => ({ ...prev, gstin: e.target.value.toUpperCase() }))} className="mt-1 font-mono" /></div>
              <div><label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">PAN</label><Input value={companyForm.pan} onChange={(e) => setCompanyForm((prev) => ({ ...prev, pan: e.target.value.toUpperCase() }))} className="mt-1 font-mono" /></div>
            </div>

            <div>
              <h4 className="mb-2 text-base font-bold text-text">Registered Address</h4>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div><label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">Street</label><Input value={companyForm.street} onChange={(e) => setCompanyForm((prev) => ({ ...prev, street: e.target.value }))} className="mt-1" /></div>
                <div><label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">City</label><Input value={companyForm.city} onChange={(e) => setCompanyForm((prev) => ({ ...prev, city: e.target.value }))} className="mt-1" /></div>
                <div><label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">State</label><Input value={companyForm.state} onChange={(e) => setCompanyForm((prev) => ({ ...prev, state: e.target.value }))} className="mt-1" /></div>
                <div><label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">Pincode</label><Input value={companyForm.pincode} onChange={(e) => setCompanyForm((prev) => ({ ...prev, pincode: e.target.value }))} className="mt-1" /></div>
              </div>
            </div>

            <div>
              <h4 className="mb-2 text-base font-bold text-text">Primary Contact</h4>
              <p className="mb-3 text-sm text-gray-500">Primary contact name and phone are locked after onboarding. Contact support if they need to change.</p>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div><label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">Name</label><Input value={companyForm.contactName} readOnly className="mt-1 bg-gray-50 text-gray-500" /></div>
                <div><label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">Phone</label><Input value={companyForm.contactPhone} readOnly className="mt-1 bg-gray-50 text-gray-500" /></div>
                <div><label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">Email</label><Input value={companyForm.contactEmail} onChange={(e) => setCompanyForm((prev) => ({ ...prev, contactEmail: e.target.value }))} className="mt-1" /></div>
              </div>
            </div>

            <div>
              <h4 className="mb-2 text-base font-bold text-text">Service Details</h4>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div><label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">Service Regions</label><Input value={companyForm.serviceRegions} onChange={(e) => setCompanyForm((prev) => ({ ...prev, serviceRegions: e.target.value }))} className="mt-1" /></div>
                <div><label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">Supported Vehicle Types</label><Input value={companyForm.supportedVehicleTypes} onChange={(e) => setCompanyForm((prev) => ({ ...prev, supportedVehicleTypes: e.target.value }))} className="mt-1" /></div>
              </div>
            </div>

            <Button onClick={saveCompany}><Save className="mr-1 h-4 w-4" /> Save Changes</Button>
          </CardContent>
        </Card>
      )}

      {activeTab === 'bank' && (
        <Card>
          <CardHeader>
            <CardTitle>Bank Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div><label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">Bank Name</label><Input value={MOCK_BANK.bankName} readOnly className="mt-1 bg-gray-50 text-gray-500" /></div>
              <div><label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">Branch</label><Input value={MOCK_BANK.branch} readOnly className="mt-1 bg-gray-50 text-gray-500" /></div>
              <div><label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">Account Number</label><Input value={MOCK_BANK.accountNumber} readOnly className="mt-1 bg-gray-50 font-mono text-gray-500" /></div>
              <div><label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">IFSC Code</label><Input value={MOCK_BANK.ifscCode} readOnly className="mt-1 bg-gray-50 font-mono text-gray-500" /></div>
              <div><label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">Account Type</label><Input value={MOCK_BANK.accountType} readOnly className="mt-1 bg-gray-50 text-gray-500" /></div>
              <div><label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">Supporting Document URL</label><Input value={MOCK_BANK.supportingDocumentUrl ?? ''} readOnly className="mt-1 bg-gray-50 text-gray-500" /></div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
