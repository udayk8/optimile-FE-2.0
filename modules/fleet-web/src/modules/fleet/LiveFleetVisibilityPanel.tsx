import { MapPinned, RadioTower } from 'lucide-react';
import { TelematicsSignal } from '../../types';

export function LiveFleetVisibilityPanel({ telematics }: { telematics: TelematicsSignal[] }) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm animate-in fade-in duration-300">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-secondary">Telematics</p>
          <h2 className="text-lg font-bold text-text">Live Fleet Visibility</h2>
        </div>
        <MapPinned className="h-5 w-5 text-primary" />
      </div>
      <div className="space-y-3">
        {telematics.map((signal) => (
          <article className="rounded-xl border border-gray-200 bg-gray-50 p-4" key={signal.id}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-bold text-text">{signal.vehicleRegistration}</p>
                <p className="text-sm text-gray-500">{signal.location}</p>
              </div>
              <span className={`rounded-full px-2 py-1 text-xs font-bold ${signal.deviceStatus === 'Online' ? 'bg-success/10 text-success' : signal.deviceStatus === 'Fault' ? 'bg-warning/10 text-warning' : 'bg-danger/10 text-danger'}`}>
                {signal.deviceStatus}
              </span>
            </div>
            <div className="mt-4 grid grid-cols-4 gap-3 text-sm">
              <div><p className="text-xs text-gray-500">Speed</p><p className="font-bold">{signal.speedKmph} km/h</p></div>
              <div><p className="text-xs text-gray-500">Ignition</p><p className="font-bold">{signal.ignition}</p></div>
              <div><p className="text-xs text-gray-500">Fuel</p><p className="font-bold">{signal.fuelLevelPercent}%</p></div>
              <div><p className="text-xs text-gray-500">Ping</p><p className="font-bold">{signal.lastPingSeconds}s</p></div>
            </div>
            <div className="mt-3 flex items-center justify-between rounded-lg bg-white px-3 py-2 text-xs text-gray-600">
              <span className="flex items-center gap-2"><RadioTower className="h-3.5 w-3.5 text-secondary" /> Route deviation</span>
              <span className={signal.routeDeviationKm > 5 ? 'font-bold text-danger' : 'font-bold text-success'}>{signal.routeDeviationKm} km</span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
