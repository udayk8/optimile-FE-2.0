import { useLocation, useNavigate } from 'react-router-dom'
import { PageHero } from '@shared-ui/page-hero'
import { Card, CardContent, CardHeader, CardTitle } from '@shared-ui/card'
import { Button } from '@shared-ui/button'
import { Input } from '@shared-ui/input'
import { MOCK_COMPANY_INFO, MOCK_BANK } from '@vendor/utils/mock-data'
import { Building, CreditCard, Save, User } from 'lucide-react'
import { useAuthStore } from '@vendor/stores/auth.store'
import { StatusBadge } from '@vendor/components/shared/StatusBadge'

type ProfileTab = 'company' | 'bank'

const PROFILE_TABS: ProfileTab[] = ['company', 'bank']

function getProfileTab(pathname: string): ProfileTab {
  const tab = pathname.split('/')[3]
  return PROFILE_TABS.includes(tab as ProfileTab) ? (tab as ProfileTab) : 'company'
}

export default function ProfilePage() {
  const location = useLocation()
  const navigate = useNavigate()
  const { vendor, updateVendorStatus } = useAuthStore()
  const activeTab = getProfileTab(location.pathname)
  
  const company = MOCK_COMPANY_INFO
  const bank = MOCK_BANK

  const tabs: { key: ProfileTab; label: string; icon: React.ReactNode }[] = [
    { key: 'company', label: 'Company Info', icon: <Building className="h-4 w-4" /> },
    { key: 'bank', label: 'Bank Details', icon: <CreditCard className="h-4 w-4" /> },
  ]

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <PageHero 
          eyebrow="SETTINGS"
          title="Company Profile" 
          subtitle="Manage your company and bank details"
          icon={<User className="h-5 w-5 text-primary" />}
        />
        {vendor?.status && (
          <div className="flex flex-col items-end gap-1 mt-1">
            <span className="text-xs text-gray-500">Account Status</span>
            <StatusBadge status={vendor.status} />
          </div>
        )}
      </div>

      <div className="flex w-fit gap-1 overflow-x-auto border-b border-gray-200">
        {tabs.map((tab) => (
          <button key={tab.key} onClick={() => navigate(`/vendor/profile/${tab.key}`)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-bold transition-all ${activeTab === tab.key ? 'bg-primary text-white' : 'text-gray-600 hover:bg-gray-50 hover:text-primary'}`}>
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Company Info */}
      {activeTab === 'company' && (
        <Card>
          <CardHeader><CardTitle>Company Information</CardTitle></CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label className="text-sm font-medium text-gray-500">Trading Name</label><Input defaultValue={company.tradingName} className="mt-1" /></div>
              <div><label className="text-sm font-medium text-gray-500">Legal Name</label><Input defaultValue={company.legalName} className="mt-1" /></div>
              <div><label className="text-sm font-medium text-gray-500">GSTIN</label><Input defaultValue={company.gstin} className="mt-1 font-mono" /></div>
              <div><label className="text-sm font-medium text-gray-500">PAN</label><Input defaultValue={company.pan} className="mt-1 font-mono" /></div>
            </div>
            <div>
              <h4 className="font-medium mb-2">Registered Address</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="text-sm text-gray-500">Street</label><Input defaultValue={company.registeredAddress.street} className="mt-1" /></div>
                <div><label className="text-sm text-gray-500">City</label><Input defaultValue={company.registeredAddress.city} className="mt-1" /></div>
                <div><label className="text-sm text-gray-500">State</label><Input defaultValue={company.registeredAddress.state} className="mt-1" /></div>
                <div><label className="text-sm text-gray-500">Pincode</label><Input defaultValue={company.registeredAddress.pincode} className="mt-1" /></div>
              </div>
            </div>
            <div>
              <h4 className="font-medium mb-2">Primary Contact</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div><label className="text-sm text-gray-500">Name</label><Input defaultValue={company.primaryContact.name} className="mt-1" /></div>
                <div><label className="text-sm text-gray-500">Phone</label><Input defaultValue={company.primaryContact.phone} className="mt-1" /></div>
                <div><label className="text-sm text-gray-500">Email</label><Input defaultValue={company.primaryContact.email} className="mt-1" /></div>
              </div>
            </div>
            <div>
              <h4 className="font-medium mb-2">Service Details</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="text-sm text-gray-500">Service Regions</label><p className="mt-1 text-sm">{company.serviceRegions.join(', ')}</p></div>
                <div><label className="text-sm text-gray-500">Supported Vehicle Types</label><p className="mt-1 text-sm">{company.supportedVehicleTypes.join(', ')}</p></div>
              </div>
            </div>
            <Button onClick={() => alert('Company profile changes saved successfully!')}><Save className="h-4 w-4 mr-1" /> Save Changes</Button>
          </CardContent>
        </Card>
      )}

      {/* Bank Details */}
      {activeTab === 'bank' && (
        <Card>
          <CardHeader><CardTitle>Bank Details</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-warning/10 border border-warning/30 rounded-lg p-3 text-sm text-warning">
              ⚠️ Changes to bank details may require re-verification by the customer.
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label className="text-sm text-gray-500">Bank Name</label><Input defaultValue={bank.bankName} className="mt-1" /></div>
              <div><label className="text-sm text-gray-500">Branch</label><Input defaultValue={bank.branch} className="mt-1" /></div>
              <div><label className="text-sm text-gray-500">Account Number</label><Input defaultValue={`****${bank.accountNumber.slice(-4)}`} className="mt-1 font-mono" /></div>
              <div><label className="text-sm text-gray-500">IFSC Code</label><Input defaultValue={bank.ifscCode} className="mt-1 font-mono" /></div>
              <div><label className="text-sm text-gray-500">Account Type</label><Input defaultValue={bank.accountType} className="mt-1" /></div>
            </div>
            <div>
              <label className="text-sm text-gray-500">Supporting Document</label>
              <div className="mt-2 border-2 border-dashed border-muted rounded-lg p-6 text-center text-sm text-gray-500">
                Drag & drop cancelled cheque or bank letter, or click to upload
              </div>
            </div>
            <Button onClick={() => {
              alert('Bank details saved successfully! Your profile is now pending verification and active.')
              updateVendorStatus('ACTIVE')
            }}>
              <Save className="h-4 w-4 mr-1" /> Save Changes & Complete Profile
            </Button>
          </CardContent>
        </Card>
      )}

    </div>
  )
}
