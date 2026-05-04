import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { HeroCard } from '@vendor/components/cards/HeroCard'
import { Button } from '@vendor/components/ui/button'
import { StatusBadge } from '@vendor/components/shared/StatusBadge'
import { formatDate } from '@vendor/lib/date-utils'
import { useAppStore } from '@vendor/stores/app.store'
import { AddVehicleModal } from '@vendor/components/shared/AddVehicleModal'
import { AddDriverModal } from '@vendor/components/shared/AddDriverModal'
import { Ship, Truck, Users, Plus, AlertTriangle, ShieldCheck, ShieldX, Edit3 } from 'lucide-react'

type FleetTab = 'vehicles' | 'drivers'

function getFleetTab(pathname: string): FleetTab {
  return pathname.split('/')[2] === 'drivers' ? 'drivers' : 'vehicles'
}

function ComplianceIcon({ status }: { status: string }) {
  if (status === 'COMPLIANT') return <ShieldCheck className="h-4 w-4 text-success" />
  if (status === 'EXPIRING_SOON') return <AlertTriangle className="h-4 w-4 text-warning" />
  return <ShieldX className="h-4 w-4 text-danger" />
}

export default function FleetPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const params = useParams()
  const activeTab = getFleetTab(location.pathname)
  const { vehicles, drivers } = useAppStore()

  const [isAddVehicleOpen, setIsAddVehicleOpen] = useState(false)
  const [isAddDriverOpen, setIsAddDriverOpen] = useState(false)
  const [editingVehicleId, setEditingVehicleId] = useState<string | null>(null)
  const [editingDriverId, setEditingDriverId] = useState<string | null>(null)

  const editingVehicle = useMemo(
    () => editingVehicleId ? vehicles.find((item) => item.id === editingVehicleId) : null,
    [editingVehicleId, vehicles]
  )
  const editingDriver = useMemo(
    () => editingDriverId ? drivers.find((item) => item.id === editingDriverId) : null,
    [editingDriverId, drivers]
  )

  const tabs: { key: FleetTab; label: string; icon: ReactNode; count: number }[] = [
    { key: 'vehicles', label: 'Vehicles', icon: <Truck className="h-4 w-4" />, count: vehicles.length },
    { key: 'drivers', label: 'Drivers', icon: <Users className="h-4 w-4" />, count: drivers.length },
  ]

  const handleAddClick = () => {
    if (activeTab === 'vehicles') {
      setEditingVehicleId(null)
      setIsAddVehicleOpen(true)
      navigate('/vendor/fleet/vehicles/add')
      return
    }

    setEditingDriverId(null)
    setIsAddDriverOpen(true)
    navigate('/vendor/fleet/drivers/add')
  }

  const openEditVehicle = (id: string) => {
    navigate(`/vendor/fleet/vehicles/${id}`)
  }

  const openEditDriver = (id: string) => {
    navigate(`/vendor/fleet/drivers/${id}`)
  }

  const closeVehicleModal = () => {
    setIsAddVehicleOpen(false)
    setEditingVehicleId(null)
    navigate('/vendor/fleet/vehicles')
  }

  const closeDriverModal = () => {
    setIsAddDriverOpen(false)
    setEditingDriverId(null)
    navigate('/vendor/fleet/drivers')
  }

  useEffect(() => {
    if (location.pathname === '/vendor/fleet/vehicles/add') {
      setEditingVehicleId(null)
      setIsAddVehicleOpen(true)
      return
    }
    if (activeTab === 'vehicles' && params.id) {
      const vehicle = vehicles.find((item) => item.id === params.id)
      if (vehicle) {
        setEditingVehicleId(vehicle.id)
        setIsAddVehicleOpen(true)
      } else {
        setEditingVehicleId(null)
        setIsAddVehicleOpen(false)
        navigate('/vendor/fleet/vehicles', { replace: true })
      }
      return
    }
    setEditingVehicleId(null)
    setIsAddVehicleOpen(false)
  }, [activeTab, location.pathname, navigate, params.id, vehicles])

  useEffect(() => {
    if (location.pathname === '/vendor/fleet/drivers/add') {
      setEditingDriverId(null)
      setIsAddDriverOpen(true)
      return
    }
    if (activeTab === 'drivers' && params.id) {
      const driver = drivers.find((item) => item.id === params.id)
      if (driver) {
        setEditingDriverId(driver.id)
        setIsAddDriverOpen(true)
      } else {
        setEditingDriverId(null)
        setIsAddDriverOpen(false)
        navigate('/vendor/fleet/drivers', { replace: true })
      }
      return
    }
    setEditingDriverId(null)
    setIsAddDriverOpen(false)
  }, [activeTab, drivers, location.pathname, navigate, params.id])

  return (
    <div>
      <HeroCard
        eyebrow="FLEET MANAGEMENT"
        title="Fleet"
        subtitle="Manage vehicles and drivers with compliance-heavy mock data."
        icon={<Ship className="h-5 w-5 text-primary" />}
        action={
          <Button onClick={handleAddClick}>
            <Plus className="h-4 w-4 mr-1" /> Add {activeTab === 'vehicles' ? 'Vehicle' : 'Driver'}
          </Button>
        }
      />

      <div className="mt-6 mb-6 flex w-fit gap-1 rounded-lg bg-gray-100 p-1">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => navigate(`/vendor/fleet/${tab.key}`)}
            className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition-all ${
              activeTab === tab.key ? 'bg-white text-text shadow-sm' : 'text-gray-600 hover:text-primary'
            }`}
          >
            {tab.icon} {tab.label}
            <span className="bg-primary/10 text-primary text-xs px-1.5 py-0.5 rounded-full">{tab.count}</span>
          </button>
        ))}
      </div>

      {activeTab === 'vehicles' && (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          {vehicles.map((vehicle) => (
            <div key={vehicle.id} className="border-b border-gray-200 px-5 py-4 last:border-b-0">
              <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr_1fr_auto] lg:items-start">
                <div>
                  <div className="flex items-center gap-3">
                    <ComplianceIcon status={vehicle.complianceStatus} />
                    <div>
                      <div className="font-mono text-sm font-semibold">{vehicle.registrationNumber}</div>
                      <p className="text-sm text-gray-500">{vehicle.vehicleType}</p>
                    </div>
                  </div>
                  {vehicle.complianceStatus === 'EXPIRED' && (
                    <div className="mt-3 flex items-center gap-2 rounded-lg border border-danger/20 bg-danger/10 p-2 text-xs text-danger">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      Blocked from indent nomination - compliance documents expired (BR-06)
                    </div>
                  )}
                </div>
                <div className="text-sm"><span className="text-gray-500">Base: </span>{vehicle.baseLocation}</div>
                <div className="text-sm space-y-2">
                  <div><span className="text-gray-500">Compliance: </span><StatusBadge status={vehicle.complianceStatus} /></div>
                  <div><span className="text-gray-500">GPS: </span>{vehicle.gpsDeviceId || '—'}</div>
                  <div><span className="text-gray-500">RC End: </span>{vehicle.rcEndDate ? formatDate(vehicle.rcEndDate) : '—'}</div>
                </div>
                <div className="flex justify-end">
                  <Button size="sm" variant="outline" onClick={() => openEditVehicle(vehicle.id)}>
                    <Edit3 className="mr-2 h-4 w-4" /> Edit
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'drivers' && (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          {drivers.map((driver) => (
            <div key={driver.id} className="border-b border-gray-200 px-5 py-4 last:border-b-0">
              <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr_1fr_auto] lg:items-start">
                <div className="flex items-center gap-3">
                  <ComplianceIcon status={driver.complianceStatus} />
                  <div>
                    <div className="text-base font-bold text-text">{driver.name}</div>
                    <p className="text-sm text-gray-500">{driver.mobile}</p>
                  </div>
                </div>
                <div className="text-sm"><span className="text-gray-500">License: </span><span className="font-mono text-xs">{driver.licenseNumber}</span></div>
                <div className="text-sm space-y-2">
                  <div><span className="text-gray-500">Expiry: </span>{formatDate(driver.licenseExpiry)}</div>
                  <div><span className="text-gray-500">Class: </span>{driver.licenseClass.join(', ')}</div>
                  <div><span className="text-gray-500">Tracking: </span>{driver.trackingSelections?.length || 0}</div>
                  <div><span className="text-gray-500">Status: </span><StatusBadge status={driver.currentStatus} /></div>
                </div>
                <div className="flex justify-end">
                  <Button size="sm" variant="outline" onClick={() => openEditDriver(driver.id)}>
                    <Edit3 className="mr-2 h-4 w-4" /> Edit
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <AddVehicleModal isOpen={isAddVehicleOpen} onClose={closeVehicleModal} initialVehicle={editingVehicle} />
      <AddDriverModal isOpen={isAddDriverOpen} onClose={closeDriverModal} initialDriver={editingDriver} />
    </div>
  )
}
