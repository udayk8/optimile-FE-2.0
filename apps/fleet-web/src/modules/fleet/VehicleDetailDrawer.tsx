import { FileCheck2, Gauge, Phone, UserRound, X } from 'lucide-react';
import { Button } from '../../components/Button';
import { Vehicle } from '../../types';
import { documentStatusClass, vehicleStatusClass } from './statusStyles';

interface VehicleDetailDrawerProps {
  vehicle: Vehicle | null;
  onClose: () => void;
}

export function VehicleDetailDrawer({ onClose, vehicle }: VehicleDetailDrawerProps) {
  if (!vehicle) return null;

  return (
    <div className="fixed inset-0 z-40 bg-black/50">
      <aside className="ml-auto flex h-full w-full max-w-xl flex-col bg-white shadow-2xl animate-in fade-in duration-300">
        <div className="flex items-start justify-between border-b border-gray-200 p-6">
          <div>
            <p className="text-sm font-semibold text-secondary">{vehicle.make} {vehicle.model}</p>
            <h2 className="mt-1 text-2xl font-bold text-text">{vehicle.registrationNo}</h2>
            <span className={`mt-3 inline-flex rounded-full px-3 py-1 text-xs font-bold ring-1 ${vehicleStatusClass(vehicle.status)}`}>
              {vehicle.status}
            </span>
          </div>
          <Button aria-label="Close drawer" className="h-9 w-9 px-0" onClick={onClose} variant="ghost">
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto p-6">
          <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2 text-primary">
              <Gauge className="h-5 w-5" />
              <h3 className="font-bold">Technical Specs</h3>
            </div>
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div><dt className="text-gray-500">VIN</dt><dd className="font-semibold">{vehicle.specs.vin}</dd></div>
              <div><dt className="text-gray-500">Engine</dt><dd className="font-semibold">{vehicle.specs.engineNo}</dd></div>
              <div><dt className="text-gray-500">Fuel</dt><dd className="font-semibold">{vehicle.specs.fuelType}</dd></div>
              <div><dt className="text-gray-500">Capacity</dt><dd className="font-semibold">{vehicle.specs.capacityKg.toLocaleString()} kg</dd></div>
              <div><dt className="text-gray-500">Odometer</dt><dd className="font-semibold">{vehicle.specs.odometerKm.toLocaleString()} km</dd></div>
              <div><dt className="text-gray-500">Utilization</dt><dd className="font-semibold">{vehicle.utilization}%</dd></div>
            </dl>
          </section>

          <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2 text-primary">
              <UserRound className="h-5 w-5" />
              <h3 className="font-bold">Current Driver</h3>
            </div>
            {vehicle.driver ? (
              <div className="space-y-3 text-sm">
                <p className="text-lg font-bold">{vehicle.driver.name}</p>
                <p className="flex items-center gap-2 text-gray-600"><Phone className="h-4 w-4" /> {vehicle.driver.phone}</p>
                <p className="text-gray-600">License: <span className="font-semibold text-text">{vehicle.driver.licenseNo}</span></p>
              </div>
            ) : (
              <p className="text-sm text-gray-500">No active driver assigned.</p>
            )}
          </section>

          <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2 text-primary">
              <FileCheck2 className="h-5 w-5" />
              <h3 className="font-bold">Document Status</h3>
            </div>
            <div className="space-y-3">
              {vehicle.documents.map((document) => (
                <div className="flex items-center justify-between rounded-lg bg-gray-50 p-3" key={document.id}>
                  <div>
                    <p className="text-sm font-semibold">{document.name}</p>
                    <p className="text-xs text-gray-500">Expires {document.expiryDate}</p>
                  </div>
                  <p className={`text-sm font-bold ${documentStatusClass(document.status)}`}>{document.status}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </aside>
    </div>
  );
}
