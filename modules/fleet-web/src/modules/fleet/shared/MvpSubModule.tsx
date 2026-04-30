import { Activity, AlertTriangle, Battery, CheckCircle2, CircleDollarSign, Database, ShieldCheck, Truck, UsersRound, Wrench } from 'lucide-react';
import { AppPage, getNavigationItem } from '../../../app/navigation';

export function MvpSubModule({ page, vehiclesCount }: { page: AppPage; vehiclesCount: number }) {
  const item = getNavigationItem(page);
  const cards = getSubModuleCards(page, vehiclesCount);

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <p className="text-sm font-semibold text-secondary">Module Workspace</p>
        <h2 className="mt-1 text-lg font-bold text-text">{item.label} Control Board</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {cards.map((card) => (
            <article className="rounded-xl border border-gray-200 bg-gray-50 p-4" key={card.label}>
              <div className={`mb-4 inline-flex rounded-xl p-3 ${card.tone}`}>
                <card.icon className="h-5 w-5" />
              </div>
              <p className="text-2xl font-extrabold text-text">{card.value}</p>
              <p className="mt-1 text-sm font-semibold text-gray-600">{card.label}</p>
              <p className="mt-3 text-xs text-gray-500">{card.detail}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <p className="text-sm font-semibold text-secondary">Next Best Actions</p>
        <h2 className="mt-1 text-lg font-bold text-text">Operational Queue</h2>
        <div className="mt-5 space-y-3">
          {['Review pending exceptions', 'Assign owner and SLA', 'Sync downstream event', 'Export audit snapshot'].map((action, index) => (
            <div className="flex items-center justify-between rounded-xl bg-gray-50 p-3" key={action}>
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold text-primary">{index + 1}</span>
                <p className="text-sm font-semibold text-gray-700">{action}</p>
              </div>
              <CheckCircle2 className="h-4 w-4 text-success" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function getSubModuleCards(page: AppPage, vehiclesCount: number) {
  const common = [
    { label: 'Records', value: vehiclesCount.toString(), detail: 'Current operational scope', icon: Database, tone: 'bg-primary/10 text-primary' },
    { label: 'Exceptions', value: page.includes('tyre') ? '4' : '3', detail: 'Needs operator review', icon: AlertTriangle, tone: 'bg-warning/10 text-warning' },
    { label: 'SLA Health', value: '92%', detail: 'Within target control band', icon: Activity, tone: 'bg-success/10 text-success' },
  ];

  if (page === 'battery-mgmt') {
    return [
      { label: 'Battery Assets', value: '18', detail: 'Active and spare units', icon: Battery, tone: 'bg-primary/10 text-primary' },
      { label: 'Low Voltage', value: '2', detail: 'Health below threshold', icon: AlertTriangle, tone: 'bg-danger/10 text-danger' },
      { label: 'Warranty Risk', value: '1', detail: 'Expiring this month', icon: ShieldCheck, tone: 'bg-warning/10 text-warning' },
    ];
  }

  if (page.startsWith('tyre')) {
    return [
      { label: 'Mounted Tyres', value: '12', detail: 'Tracked by axle position', icon: Truck, tone: 'bg-primary/10 text-primary' },
      { label: 'Retread Queue', value: '3', detail: 'Eligible for casing review', icon: Wrench, tone: 'bg-warning/10 text-warning' },
      { label: 'Cost / KM', value: '0.14', detail: 'Blended tyre cost run-rate', icon: CircleDollarSign, tone: 'bg-success/10 text-success' },
    ];
  }

  if (page === 'dispatch-console') {
    return [
      { label: 'Ready Vehicles', value: '1', detail: 'Dispatch-compliant assets', icon: Truck, tone: 'bg-success/10 text-success' },
      { label: 'Ready Drivers', value: '1', detail: 'Available with valid documents', icon: UsersRound, tone: 'bg-primary/10 text-primary' },
      { label: 'Blocked', value: '2', detail: 'Compliance or maintenance hold', icon: AlertTriangle, tone: 'bg-danger/10 text-danger' },
    ];
  }

  return common;
}
