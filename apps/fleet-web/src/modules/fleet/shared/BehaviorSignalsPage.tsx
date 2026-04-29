import { OperationalDataState } from '../../../types';

export function BehaviorSignalsPage({ drivers }: { drivers: OperationalDataState['drivers'] }) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-semibold text-secondary">Score Drivers</p>
      <h2 className="mt-1 text-lg font-bold text-text">Behavior Event Mix</h2>
      <div className="mt-5 grid gap-4 md:grid-cols-3">
        {drivers.map((driver) => (
          <article className="rounded-xl bg-gray-50 p-4" key={driver.id}>
            <p className="font-bold text-text">{driver.name}</p>
            <div className="mt-4 h-2 rounded-full bg-gray-200">
              <div className={`h-2 rounded-full ${driver.behaviorScore < 50 ? 'bg-danger' : driver.behaviorScore < 75 ? 'bg-warning' : 'bg-success'}`} style={{ width: `${driver.behaviorScore}%` }} />
            </div>
            <p className="mt-3 text-sm font-bold text-gray-700">{driver.behaviorScore}/100 · {driver.coachingStatus}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
