import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useLocation, useParams } from 'react-router-dom'
import { useModuleNavigate as useNavigate, ModuleLink as Link } from '@vendor/hooks/useModuleRoute'
import { HeroCard } from '@vendor/components/cards/HeroCard'
import { Button } from '@vendor/components/ui/button'
import { StatusBadge } from '@vendor/components/shared/StatusBadge'
import { formatDate } from '@vendor/lib/date-utils'
import { useAppStore } from '@vendor/stores/app.store'
import { AddVehicleModal } from '@vendor/components/shared/AddVehicleModal'
import { AddDriverModal } from '@vendor/components/shared/AddDriverModal'
import type { Driver, Vehicle } from '@vendor/types'
import { Ship, Truck, Users, Plus, AlertTriangle, ShieldCheck, ShieldX, Edit3, PowerOff } from 'lucide-react'

type FleetTab = 'vehicles' | 'drivers'

function getFleetTab(pathname: string): FleetTab {
  return pathname.split('/')[3] === 'drivers' ? 'drivers' : 'vehicles'
}

function ComplianceIcon({ status }: { status: string }) {
  if (status === 'COMPLIANT') return <ShieldCheck className="h-4 w-4 text-success" />
  if (status === 'EXPIRING_SOON') return <AlertTriangle className="h-4 w-4 text-warning" />
  return <ShieldX className="h-4 w-4 text-danger" />
}

function ToggleSwitch({ active, onToggle }: { active: boolean; onToggle: () => void }) {
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={onToggle}
        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors duration-200 focus:outline-none ${
          active ? 'bg-success' : 'bg-gray-300'
        }`}
        role="switch"
        aria-checked={active}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 mt-0.5 ${
            active ? 'translate-x-4' : 'translate-x-0.5'
          }`}
        />
      </button>
      <span className="text-sm font-medium text-text">{active ? 'Active' : 'Inactive'}</span>
    </div>
  )
}

export default function FleetPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const params = useParams()
  const activeTab = getFleetTab(location.pathname)
  const { vehicles, drivers, updateVehicle, updateDriver } = useAppStore()

  const [isAddVehicleOpen, setIsAddVehicleOpen] = useState(false)
  const [isAddDriverOpen, setIsAddDriverOpen] = useState(false)
  const [editingVehicleId, setEditingVehicleId] = useState<string | null>(null)
  const [editingDriverId, setEditingDriverId] = useState<string | null>(null)

  const editingVehicle = useMemo(
    () => (editingVehicleId ? vehicles.find((item) => item.id === editingVehicleId) : null),
    [editingVehicleId, vehicles]
  )
  const editingDriver = useMemo(
    () => (editingDriverId ? drivers.find((item) => item.id === editingDriverId) : null),
    [editingDriverId, drivers]
  )

  const tabs: { key: FleetTab; label: string; icon: ReactNode; count: number }[] = [
    { key: 'vehicles', label: 'Vehicles', icon: <Truck className="h-4 w-4" />, count: vehicles.length },
    { key: 'drivers', label: 'Drivers', icon: <Users className="h-4 w-4" />, count: drivers.length },
  ]

  const toggleVehicleStatus = useCallback(
    (vehicle: Vehicle) => {
      updateVehicle({ ...vehicle, operationalStatus: vehicle.operationalStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' })
    },
    [updateVehicle]
  )

  const toggleDriverStatus = useCallback(
    (driver: Driver) => {
      updateDriver({ ...driver, currentStatus: driver.currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' })
    },
    [updateDriver]
  )

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
        subtitle="Manage vehicles and drivers. A vehicle is dispatch-ready only when status is Active and all compliance documents are valid."
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
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-gray-50">
                <tr>
                  <th className="p-4 text-xs font-bold uppercase tracking-wide text-gray-500">Vehicle</th>
                  <th className="p-4 text-xs font-bold uppercase tracking-wide text-gray-500">Status</th>
                  <th className="p-4 text-xs font-bold uppercase tracking-wide text-gray-500">Compliance</th>
                  <th className="p-4 text-right text-xs font-bold uppercase tracking-wide text-gray-500">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {vehicles.map((vehicle) => (
                  <tr key={vehicle.id} className="hover:bg-gray-50">
                    <td className="p-4 align-top">
                      <div className="flex items-center gap-3">
                        <ComplianceIcon status={vehicle.complianceStatus} />
                        <div>
                          <div className="font-mono text-sm font-semibold">{vehicle.registrationNumber}</div>
                          <p className="text-xs text-gray-500">{vehicle.vehicleType}{vehicle.baseLocation ? ` · ${vehicle.baseLocation}` : ''}</p>
                        </div>
                      </div>
                      {vehicle.operationalStatus === 'INACTIVE' && (
                        <div className="mt-2 flex items-center gap-1.5 rounded bg-gray-100 p-1.5 text-xs text-gray-500">
                          <PowerOff className="h-3.5 w-3.5" /> Inactive — not available for dispatch
                        </div>
                      )}
                      {vehicle.complianceStatus === 'EXPIRED' && (
                        <div className="mt-2 flex items-center gap-1.5 rounded bg-danger/10 p-1.5 text-xs text-danger">
                          <AlertTriangle className="h-3.5 w-3.5" /> Blocked — documents expired
                        </div>
                      )}
                      {vehicle.complianceStatus === 'EXPIRING_SOON' && (
                        <div className="mt-2 flex items-center gap-1.5 rounded bg-warning/10 p-1.5 text-xs text-warning">
                          <AlertTriangle className="h-3.5 w-3.5" /> Documents expiring soon
                        </div>
                      )}
                      {vehicle.complianceStatus === 'PENDING_DOCS' && (
                        <div className="mt-2 flex items-center gap-1.5 rounded bg-gray-100 p-1.5 text-xs text-gray-500">
                          <AlertTriangle className="h-3.5 w-3.5" /> Pending documents — not dispatch-ready
                        </div>
                      )}
                    </td>
                    <td className="p-4 align-top">
                      <ToggleSwitch
                        active={vehicle.operationalStatus === 'ACTIVE'}
                        onToggle={() => toggleVehicleStatus(vehicle)}
                      />
                    </td>
                    <td className="p-4 align-top space-y-1">
                      <StatusBadge status={vehicle.complianceStatus} />
                      <div className="text-xs text-gray-500">
                        {vehicle.complianceDocuments?.length
                          ? `${vehicle.complianceDocuments.length} doc${vehicle.complianceDocuments.length !== 1 ? 's' : ''}`
                          : 'No docs'}
                      </div>
                    </td>
                    <td className="p-4 align-top text-right">
                      <Button size="sm" variant="outline" onClick={() => navigate(`/vendor/fleet/vehicles/${vehicle.id}`)}>
                        <Edit3 className="mr-2 h-4 w-4" /> Edit
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'drivers' && (
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-gray-50">
                <tr>
                  <th className="p-4 text-xs font-bold uppercase tracking-wide text-gray-500">Driver</th>
                  <th className="p-4 text-xs font-bold uppercase tracking-wide text-gray-500">License</th>
                  <th className="p-4 text-xs font-bold uppercase tracking-wide text-gray-500">Status</th>
                  <th className="p-4 text-xs font-bold uppercase tracking-wide text-gray-500">Compliance</th>
                  <th className="p-4 text-right text-xs font-bold uppercase tracking-wide text-gray-500">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {drivers.map((driver) => (
                  <tr key={driver.id} className="hover:bg-gray-50">
                    <td className="p-4 align-top">
                      <div className="flex items-center gap-3">
                        <ComplianceIcon status={driver.complianceStatus} />
                        <div>
                          <div className="text-sm font-bold text-text">{driver.name}</div>
                          <p className="text-xs text-gray-500">{driver.mobile}{driver.baseLocation ? ` · ${driver.baseLocation}` : ''}</p>
                        </div>
                      </div>
                      {driver.currentStatus === 'INACTIVE' && (
                        <div className="mt-2 flex items-center gap-1.5 rounded bg-gray-100 p-1.5 text-xs text-gray-500">
                          <PowerOff className="h-3.5 w-3.5" /> Inactive — not available for dispatch
                        </div>
                      )}
                      {driver.currentStatus === 'BLOCKED' && (
                        <div className="mt-2 flex items-center gap-1.5 rounded bg-danger/10 p-1.5 text-xs text-danger">
                          <AlertTriangle className="h-3.5 w-3.5" /> Blocked — contact support
                        </div>
                      )}
                      {driver.complianceStatus === 'EXPIRED' && (
                        <div className="mt-2 flex items-center gap-1.5 rounded bg-danger/10 p-1.5 text-xs text-danger">
                          <AlertTriangle className="h-3.5 w-3.5" /> Blocked — documents expired
                        </div>
                      )}
                      {driver.complianceStatus === 'EXPIRING_SOON' && (
                        <div className="mt-2 flex items-center gap-1.5 rounded bg-warning/10 p-1.5 text-xs text-warning">
                          <AlertTriangle className="h-3.5 w-3.5" /> Documents expiring soon
                        </div>
                      )}
                      {driver.complianceStatus === 'PENDING_DOCS' && (
                        <div className="mt-2 flex items-center gap-1.5 rounded bg-gray-100 p-1.5 text-xs text-gray-500">
                          <AlertTriangle className="h-3.5 w-3.5" /> Pending documents — not dispatch-ready
                        </div>
                      )}
                    </td>
                    <td className="p-4 align-top">
                      <div className="font-mono text-xs font-medium text-text">{driver.licenseNumber}</div>
                      <div className="mt-0.5 text-xs text-gray-500">{driver.licenseClass.join(', ')} · Exp {formatDate(driver.licenseExpiry)}</div>
                    </td>
                    <td className="p-4 align-top">
                      {driver.currentStatus === 'BLOCKED' ? (
                        <StatusBadge status="BLOCKED" />
                      ) : (
                        <ToggleSwitch
                          active={driver.currentStatus === 'ACTIVE'}
                          onToggle={() => toggleDriverStatus(driver)}
                        />
                      )}
                    </td>
                    <td className="p-4 align-top space-y-1">
                      <StatusBadge status={driver.complianceStatus} />
                      <div className="text-xs text-gray-500">
                        {driver.complianceDocuments?.length
                          ? `${driver.complianceDocuments.length} doc${driver.complianceDocuments.length !== 1 ? 's' : ''}`
                          : 'No docs'}
                      </div>
                    </td>
                    <td className="p-4 align-top text-right">
                      <Button size="sm" variant="outline" onClick={() => navigate(`/vendor/fleet/drivers/${driver.id}`)}>
                        <Edit3 className="mr-2 h-4 w-4" /> Edit
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <AddVehicleModal isOpen={isAddVehicleOpen} onClose={closeVehicleModal} initialVehicle={editingVehicle} />
      <AddDriverModal isOpen={isAddDriverOpen} onClose={closeDriverModal} initialDriver={editingDriver} />
    </div>
  )
}
