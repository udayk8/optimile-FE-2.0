import { BadgeCheck, ShieldAlert, UserRoundCheck } from 'lucide-react';
import { FleetDriver } from '../../types';

function scoreBand(score: number) {
  if (score >= 90) return { label: 'Excellent', className: 'text-success bg-success/10' };
  if (score >= 75) return { label: 'Good', className: 'text-primary bg-primary/10' };
  if (score >= 50) return { label: 'Needs Improvement', className: 'text-warning bg-warning/10' };
  return { label: 'Coaching Required', className: 'text-danger bg-danger/10' };
}

export function DriverReadinessPanel({ drivers }: { drivers: FleetDriver[] }) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm animate-in fade-in duration-300">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-secondary">Driver Master</p>
          <h2 className="text-lg font-bold text-text">Readiness & Scorecards</h2>
        </div>
        <UserRoundCheck className="h-5 w-5 text-primary" />
      </div>
      <div className="overflow-hidden rounded-xl border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {['Driver', 'Readiness', 'Documents', 'Score', 'Protected PII'].map((heading) => (
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-gray-500" key={heading}>{heading}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {drivers.map((driver) => {
              const band = scoreBand(driver.behaviorScore);
              const licenseRisk = new Date(driver.licenseExpiryDate).getTime() < new Date('2026-05-24').getTime();
              return (
                <tr className="hover:bg-gray-50" key={driver.id}>
                  <td className="px-4 py-4">
                    <p className="font-bold text-text">{driver.name}</p>
                    <p className="text-sm text-gray-500">{driver.licenseClass} · {driver.baseLocation}</p>
                  </td>
                  <td className="px-4 py-4">
                    <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">{driver.assignmentStatus}</span>
                  </td>
                  <td className="px-4 py-4 text-sm">
                    <p className={`flex items-center gap-1 font-semibold ${licenseRisk ? 'text-warning' : 'text-success'}`}>
                      {licenseRisk ? <ShieldAlert className="h-4 w-4" /> : <BadgeCheck className="h-4 w-4" />}
                      DL {driver.licenseExpiryDate}
                    </p>
                    <p className="mt-1 text-gray-500">Medical {driver.medicalExpiryDate}</p>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <span className="text-xl font-extrabold text-text">{driver.behaviorScore}</span>
                      <span className={`rounded-full px-2 py-1 text-xs font-bold ${band.className}`}>{band.label}</span>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">{driver.coachingStatus}</p>
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-600">
                    <p>Aadhaar {driver.aadhaarMasked}</p>
                    <p>Bank {driver.bankAccountMasked}</p>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
