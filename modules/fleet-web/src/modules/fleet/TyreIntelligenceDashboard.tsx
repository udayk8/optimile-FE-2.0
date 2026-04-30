import { Activity, CircleDot } from 'lucide-react';
import { Vehicle } from '../../types';
import { tyreHealthClass } from './statusStyles';

export function TyreIntelligenceDashboard({ vehicles }: { vehicles: Vehicle[] }) {
  const vehicle = vehicles[0];

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm animate-in fade-in duration-300">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-secondary">Intelligence</p>
          <h2 className="text-lg font-bold text-text">Tyre Health Signals</h2>
        </div>
        <Activity className="h-5 w-5 text-primary" />
      </div>

      {vehicle ? (
        <div>
          <div className="mb-4 rounded-lg bg-gray-50 p-3">
            <p className="text-sm font-bold">{vehicle.registrationNo}</p>
            <p className="text-xs text-gray-500">{vehicle.make} {vehicle.model}</p>
          </div>
          <div className="space-y-5">
            {[1, 2].map((axle) => (
              <div className="relative rounded-xl border border-gray-200 bg-gray-50 p-4" key={axle}>
                <div className="absolute left-1/2 top-1/2 h-2 w-2/3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gray-300" />
                <p className="relative mb-3 text-xs font-bold uppercase tracking-wide text-gray-500">Axle {axle}</p>
                <div className="relative grid grid-cols-2 gap-4">
                  {vehicle.tyres.filter((tyre) => tyre.axle === axle).map((tyre) => (
                    <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm" key={tyre.id}>
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-sm font-bold">{tyre.position}</span>
                        <span className={`h-3 w-3 rounded-full ${tyreHealthClass(tyre.health)}`} />
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-600">
                        <CircleDot className="h-3.5 w-3.5 text-primary" />
                        {tyre.pressurePsi} PSI
                      </div>
                      <p className="mt-1 text-xs text-gray-600">{tyre.treadMm} mm tread</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-sm text-gray-500">No tyre telemetry available.</p>
      )}
    </section>
  );
}
