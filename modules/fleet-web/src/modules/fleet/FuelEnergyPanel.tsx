import { AlertOctagon, Fuel } from 'lucide-react';
import { FuelEvent } from '../../types';

interface FuelEnergyPanelProps {
  fuelEvents: FuelEvent[];
  onEventSelect?: (event: FuelEvent) => void;
}

export function FuelEnergyPanel({ fuelEvents, onEventSelect }: FuelEnergyPanelProps) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm animate-in fade-in duration-300">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-secondary">Fuel & Energy</p>
          <h2 className="text-lg font-bold text-text">Validation Queue</h2>
        </div>
        <Fuel className="h-5 w-5 text-primary" />
      </div>
      <div className="space-y-3">
        {fuelEvents.map((event) => {
          const variance = Math.abs(((event.odometerKm - event.telematicsOdometerKm) / event.telematicsOdometerKm) * 100);
          const belowBaseline = event.economyKmpl < event.baselineKmpl * 0.8;
          return (
            <article className={`rounded-xl border border-gray-200 bg-white p-4 shadow-sm ${onEventSelect ? 'cursor-pointer hover:bg-gray-50' : ''}`} key={event.id} onClick={() => onEventSelect?.(event)}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-bold text-text">{event.vehicleRegistration}</p>
                  <p className="text-sm text-gray-500">{event.pumpLocation} · {event.dateTime}</p>
                </div>
                <span className={`rounded-full px-2 py-1 text-xs font-bold ${event.status === 'Posted' ? 'bg-success/10 text-success' : event.status === 'Flagged' ? 'bg-danger/10 text-danger' : 'bg-warning/10 text-warning'}`}>
                  {event.status}
                </span>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
                <div><p className="text-xs text-gray-500">Quantity</p><p className="font-bold">{event.quantityLitres} L</p></div>
                <div><p className="text-xs text-gray-500">Amount</p><p className="font-bold">Rs {event.totalAmount.toLocaleString()}</p></div>
                <div><p className="text-xs text-gray-500">Odo variance</p><p className={variance > 2 ? 'font-bold text-danger' : 'font-bold text-success'}>{variance.toFixed(1)}%</p></div>
                <div><p className="text-xs text-gray-500">Economy</p><p className={belowBaseline ? 'font-bold text-warning' : 'font-bold text-success'}>{event.economyKmpl} km/L</p></div>
              </div>
              {event.flags.length > 0 && (
                <div className="mt-3 rounded-lg bg-danger/10 px-3 py-2 text-xs font-semibold text-danger">
                  <AlertOctagon className="mr-1 inline h-3.5 w-3.5" />
                  {event.flags.join(' · ')}
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
