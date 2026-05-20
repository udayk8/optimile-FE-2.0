import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { PageHero } from '@shared-ui/page-hero'
import { Ship, Truck, Users, Plus, AlertTriangle, ShieldCheck, ShieldX } from 'lucide-react'
import { Card, CardContent } from '@shared-ui/card'
import { Button } from '@shared-ui/button'
import { StatusBadge } from '@vendor/components/shared/StatusBadge'
import { formatDate } from '@vendor/utils/date-utils'
import { useAppStore } from '@vendor/stores/app.store'
import { AddVehicleModal } from '@vendor/components/shared/AddVehicleModal'
import { AddDriverModal } from '@vendor/components/shared/AddDriverModal'

type FleetTab = 'vehicles' | 'drivers'

function getFleetTab(pathname: string): FleetTab {
  return pathname.split('/')[3] === 'drivers' ? 'drivers' : 'vehicles'
}

function ComplianceIcon({ status }: { status: string }) {
  if (status === 'COMPLIANT') return <ShieldCheck className="h-4 w-4 text-success" />
  if (status === 'EXPIRING_SOON') return <AlertTriangle className="h-4 w-4 text-warning" />
  return <ShieldX className="h-4 w-4 text-danger" />
}

export default function FleetPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const activeTab = getFleetTab(location.pathname)

  const { vehicles, drivers } = useAppStore()
  
  const [isAddVehicleOpen, setIsAddVehicleOpen] = useState(false)
  const [isAddDriverOpen, setIsAddDriverOpen] = useState(false)

  const tabs: { key: FleetTab; label: string; icon: React.ReactNode; count: number }[] = [
    { key: 'vehicles', label: 'Vehicles', icon: <Truck className="h-4 w-4" />, count: vehicles.length },
    { key: 'drivers', label: 'Drivers', icon: <Users className="h-4 w-4" />, count: drivers.length },
  ]

  const handleAddClick = () => {
    if (activeTab === 'vehicles') {
      setIsAddVehicleOpen(true)
      navigate('/vendor/fleet/vehicles/add')
    } else if (activeTab === 'drivers') {
      setIsAddDriverOpen(true)
      navigate('/vendor/fleet/drivers/add')
    }
  }

  const closeVehicleModal = () => {
    setIsAddVehicleOpen(false)
    if (location.pathname === '/vendor/fleet/vehicles/add') navigate('/vendor/fleet/vehicles')
  }

  const closeDriverModal = () => {
    setIsAddDriverOpen(false)
    if (location.pathname === '/vendor/fleet/drivers/add') navigate('/vendor/fleet/drivers')
  }

  useEffect(() => {
    if (location.pathname === '/vendor/fleet/vehicles/add') setIsAddVehicleOpen(true)
    if (location.pathname === '/vendor/fleet/drivers/add') setIsAddDriverOpen(true)
  }, [location.pathname])

  return (
    <div className="space-y-6">
      <PageHero 
        eyebrow="FLEET MANAGEMENT"
        title="Fleet" 
        subtitle="Manage your registered vehicles and drivers, and track compliance"
        icon={<Ship className="h-5 w-5 text-primary" />}
        action={
          <Button onClick={handleAddClick}>
            <Plus className="h-4 w-4 mr-1" /> Add {activeTab === 'vehicles' ? 'Vehicle' : 'Driver'}
          </Button>
        }
      />

      <div className="flex w-fit gap-1 overflow-x-auto border-b border-gray-200">
        {tabs.map((tab) => (
          <button key={tab.key} onClick={() => navigate(`/vendor/fleet/${tab.key}`)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-bold transition-all ${activeTab === tab.key ? 'bg-primary text-white' : 'text-gray-600 hover:bg-gray-50 hover:text-primary'}`}>
            {tab.icon} {tab.label}
            <span className="bg-primary/10 text-primary text-xs px-1.5 py-0.5 rounded-full">{tab.count}</span>
          </button>
        ))}
      </div>

      {/* Vehicles */}
      {activeTab === 'vehicles' && (
        <div className="space-y-4">
          {vehicles.map((v) => (
            <Card key={v.id} className="cursor-pointer hover:border-primary/30" onClick={() => navigate(`/vendor/fleet/vehicles/${v.id}`)}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <ComplianceIcon status={v.complianceStatus} />
                    <div>
                      <span className="font-mono text-sm font-semibold">{v.registrationNumber}</span>
                      <p className="text-sm text-gray-500">{v.vehicleType}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={v.operationalStatus} />
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                  <div><span className="text-gray-500">Base: </span>{v.baseLocation}</div>
                  <div><span className="text-gray-500">Compliance: </span><StatusBadge status={v.complianceStatus} /></div>
                  <div><span className="text-gray-500">GPS: </span>{v.gpsDeviceId || '—'}</div>
                  <div><span className="text-gray-500">Docs: </span>{v.complianceDocuments.length}</div>
                </div>
                {v.complianceStatus === 'EXPIRED' && (
                  <div className="mt-3 p-2 bg-danger/10 rounded-lg text-xs text-danger flex items-center gap-2">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Blocked from indent nomination — compliance documents expired (BR-06)
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Drivers */}
      {activeTab === 'drivers' && (
        <div className="space-y-4">
          {drivers.map((d) => (
            <Card key={d.id} className="cursor-pointer hover:border-primary/30" onClick={() => navigate(`/vendor/fleet/drivers/${d.id}`)}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <ComplianceIcon status={d.complianceStatus} />
                    <div>
                      <span className="text-base font-medium">{d.name}</span>
                      <p className="text-sm text-gray-500">{d.mobile}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={d.currentStatus} />
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                  <div><span className="text-gray-500">License: </span><span className="font-mono text-xs">{d.licenseNumber}</span></div>
                  <div><span className="text-gray-500">Expiry: </span>{formatDate(d.licenseExpiry)}</div>
                  <div><span className="text-gray-500">Class: </span>{d.licenseClass.join(', ')}</div>
                  <div><span className="text-gray-500">Docs: </span>{d.complianceDocuments.length}</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AddVehicleModal isOpen={isAddVehicleOpen} onClose={closeVehicleModal} />
      <AddDriverModal isOpen={isAddDriverOpen} onClose={closeDriverModal} />
    </div>
  )
}
