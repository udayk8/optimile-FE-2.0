import React, { useMemo, useState } from 'react';
import { AlertCircle, Clock3, Download, Filter, Search, Truck, Users, X } from 'lucide-react';

type DriverType = 'Permanent' | 'Contract';
type ViolationSeverity = 'High' | 'Medium' | 'Low';
type ViolationFilter = 'All' | 'With Violations' | 'No Violations';
type SeverityFilter = 'All severities' | ViolationSeverity;

interface DriverViolation {
  id: string;
  title: string;
  details: string;
  severity: ViolationSeverity;
  date: string;
  vehicle: string;
}

interface DriverItem {
  id: string;
  name: string;
  phone: string;
  license: string;
  type: DriverType;
  totalViolations: number;
  violations: DriverViolation[];
}

const DRIVERS: DriverItem[] = [
  {
    id: 'd1',
    name: 'Ramesh Kumar',
    phone: '+91 98765 43210',
    license: 'MH14 20180000123',
    type: 'Permanent',
    totalViolations: 2,
    violations: [
      {
        id: 'v1',
        title: 'Harsh Braking',
        details: 'Deceleration > 3.5m/s² detected at highway exit ramp.',
        severity: 'High',
        date: '25/02/2026',
        vehicle: 'MH-46-BM-2849',
      },
      {
        id: 'v2',
        title: 'Excessive Idling',
        details: 'Engine idle > 15 mins at unmapped location.',
        severity: 'Low',
        date: '25/02/2026',
        vehicle: 'MH-46-BM-2849',
      },
    ],
  },
  {
    id: 'd2',
    name: 'Suresh Singh',
    phone: '+91 98123 45678',
    license: 'DL04 20190000456',
    type: 'Contract',
    totalViolations: 3,
    violations: [
      {
        id: 'v3',
        title: 'Overspeeding',
        details: 'Speed > 95 km/h sustained for 60 seconds.',
        severity: 'High',
        date: '24/02/2026',
        vehicle: 'DL-11-XY-1176',
      },
    ],
  },
  { id: 'd3', name: 'Mahesh Patil', phone: '+91 98230 77881', license: 'MH12 20170000987', type: 'Permanent', totalViolations: 0, violations: [] },
  { id: 'd4', name: 'Anil Yadav', phone: '+91 99301 22334', license: 'UP16 20160000444', type: 'Contract', totalViolations: 0, violations: [] },
  { id: 'd5', name: 'Ravindra Jadhav', phone: '+91 97654 88990', license: 'MH20 20150000678', type: 'Permanent', totalViolations: 0, violations: [] },
  { id: 'd6', name: 'Sunil Chauhan', phone: '+91 98987 55443', license: 'GJ05 20180000321', type: 'Contract', totalViolations: 0, violations: [] },
  { id: 'd7', name: 'Balwant Singh', phone: '+91 94678 11223', license: 'PB10 20140000888', type: 'Permanent', totalViolations: 0, violations: [] },
  { id: 'd8', name: 'Kiran Rao', phone: '+91 98450 66778', license: 'KA01 20190000111', type: 'Contract', totalViolations: 0, violations: [] },
  { id: 'd9', name: 'Prakash Meena', phone: '+91 99822 33445', license: 'RJ19 20160000555', type: 'Permanent', totalViolations: 0, violations: [] },
];

const severityClass = (severity: ViolationSeverity) => {
  if (severity === 'High') return 'border-red-200 bg-red-50 text-red-600';
  if (severity === 'Medium') return 'border-orange-200 bg-orange-50 text-orange-600';
  return 'border-blue-200 bg-blue-50 text-blue-600';
};

const filterChipClassName = (active: boolean) =>
  active
    ? 'rounded-lg border border-primary-600 bg-primary-50 px-3 py-1.5 text-sm font-semibold text-primary-700'
    : 'rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50';

export const DriverBehaviorPage: React.FC = () => {
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'All' | DriverType>('All');
  const [filterViolations, setFilterViolations] = useState<ViolationFilter>('All');
  const [filterSeverity, setFilterSeverity] = useState<SeverityFilter>('All severities');
  const [selectedDriver, setSelectedDriver] = useState<DriverItem | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const activeFilterCount = [filterType !== 'All', filterViolations !== 'All', filterSeverity !== 'All severities'].filter(Boolean).length;

  const clearFilters = () => {
    setFilterType('All');
    setFilterViolations('All');
    setFilterSeverity('All severities');
    setSearch('');
  };

  const visibleDrivers = useMemo(() => {
    return DRIVERS.filter((driver) => {
      const q = search.toLowerCase().trim();
      const matchesSearch = !q || driver.name.toLowerCase().includes(q) || driver.phone.includes(q) || driver.license.toLowerCase().includes(q);
      const matchesType = filterType === 'All' || driver.type === filterType;
      const matchesViolations =
        filterViolations === 'All' ||
        (filterViolations === 'With Violations' && driver.totalViolations > 0) ||
        (filterViolations === 'No Violations' && driver.totalViolations === 0);
      const matchesSeverity =
        filterSeverity === 'All severities' ||
        driver.violations.some((violation) => violation.severity === filterSeverity);
      return matchesSearch && matchesType && matchesViolations && matchesSeverity;
    });
  }, [search, filterSeverity, filterType, filterViolations]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Driver Behavior Intelligence</h1>
        <p className="mt-2 text-sm text-slate-500">Real-time driving pattern analysis from Telematics & OBD.</p>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-6 py-4">
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div>
                <h2 className="inline-flex items-center gap-2 text-lg font-semibold text-slate-900">
                  <Users className="h-5 w-5 text-slate-500" />
                  Driver List
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  {visibleDrivers.length} of {DRIVERS.length} drivers
                </p>
              </div>

              <div className="flex w-full items-center gap-2 sm:w-auto">
                <div className="relative flex-1 sm:w-72">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by name, phone or licence…"
                    className="h-10 w-full rounded-lg border border-gray-300 bg-white pl-9 pr-3 text-sm text-gray-700 outline-none ring-primary-600/20 placeholder:text-gray-400 focus:border-primary-500 focus:ring-4"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setShowFilters((v) => !v)}
                  className={`inline-flex h-10 items-center gap-2 rounded-lg border px-3 text-sm font-semibold transition ${
                    showFilters || activeFilterCount > 0
                      ? 'border-primary-500 bg-primary-50 text-primary-700'
                      : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Filter className="h-4 w-4" />
                  Filter
                  {activeFilterCount > 0 && (
                    <span className="inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-primary-600 px-1 text-[10px] font-bold text-white">
                      {activeFilterCount}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Active filter tags — always visible when any filter is on, even when panel is closed */}
            {(activeFilterCount > 0 || search.trim()) && !showFilters && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium text-gray-400">Active filters:</span>

                {search.trim() && (
                  <span className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-gray-50 px-2 py-1 text-xs font-medium text-gray-700">
                    Search: "{search}"
                    <button
                      type="button"
                      aria-label="Clear search"
                      onClick={() => setSearch('')}
                      className="ml-0.5 text-gray-400 hover:text-gray-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )}

                {filterType !== 'All' && (
                  <span className="inline-flex items-center gap-1 rounded-md border border-primary-200 bg-primary-50 px-2 py-1 text-xs font-medium text-primary-700">
                    Type: {filterType}
                    <button
                      type="button"
                      aria-label="Clear driver type filter"
                      onClick={() => setFilterType('All')}
                      className="ml-0.5 text-primary-400 hover:text-primary-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )}

                {filterViolations !== 'All' && (
                  <span className="inline-flex items-center gap-1 rounded-md border border-primary-200 bg-primary-50 px-2 py-1 text-xs font-medium text-primary-700">
                    {filterViolations}
                    <button
                      type="button"
                      aria-label="Clear violation status filter"
                      onClick={() => { setFilterViolations('All'); setFilterSeverity('All severities'); }}
                      className="ml-0.5 text-primary-400 hover:text-primary-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )}

                {filterSeverity !== 'All severities' && (
                  <span className="inline-flex items-center gap-1 rounded-md border border-primary-200 bg-primary-50 px-2 py-1 text-xs font-medium text-primary-700">
                    Severity: {filterSeverity}
                    <button
                      type="button"
                      aria-label="Clear severity filter"
                      onClick={() => setFilterSeverity('All severities')}
                      className="ml-0.5 text-primary-400 hover:text-primary-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )}

                <button
                  type="button"
                  onClick={clearFilters}
                  className="text-xs font-medium text-gray-400 hover:text-gray-600 underline underline-offset-2"
                >
                  Clear all
                </button>
              </div>
            )}

            {showFilters ? (
              <div className="border-t border-gray-200 pt-4">
                <div className="grid gap-5 sm:grid-cols-3">
                  {/* Driver Type */}
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Driver Type</p>
                    <div className="flex flex-wrap gap-2">
                      {(['All', 'Permanent', 'Contract'] as const).map((option) => (
                        <button
                          key={option}
                          type="button"
                          onClick={() => setFilterType(option)}
                          className={filterChipClassName(filterType === option)}
                        >
                          {option === 'All' ? 'All' : option}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Violation Status */}
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Violation Status</p>
                    <div className="flex flex-wrap gap-2">
                      {(['All', 'With Violations', 'No Violations'] as const).map((option) => (
                        <button
                          key={option}
                          type="button"
                          onClick={() => {
                            setFilterViolations(option);
                            // Selecting "No Violations" makes severity irrelevant — reset it
                            if (option === 'No Violations') setFilterSeverity('All severities');
                          }}
                          className={filterChipClassName(filterViolations === option)}
                        >
                          {option === 'All' ? 'All' : option}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Violation Severity — disabled when "No Violations" is selected */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Violation Severity</p>
                      {filterViolations === 'No Violations' && (
                        <span className="text-xs text-gray-400">(n/a)</span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {(['All severities', 'High', 'Medium', 'Low'] as const).map((option) => (
                        <button
                          key={option}
                          type="button"
                          disabled={filterViolations === 'No Violations'}
                          onClick={() => setFilterSeverity(option)}
                          className={
                            filterViolations === 'No Violations'
                              ? 'rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm font-medium text-gray-300 cursor-not-allowed'
                              : filterChipClassName(filterSeverity === option)
                          }
                        >
                          {option === 'All severities' ? 'All' : option}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {(activeFilterCount > 0 || search.trim()) && (
                  <div className="mt-4">
                    <button
                      type="button"
                      onClick={clearFilters}
                      className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 text-xs font-medium text-gray-600 transition hover:bg-gray-50 hover:text-gray-800"
                    >
                      <X className="h-3 w-3" />
                      Clear all
                    </button>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>

        <div className="overflow-hidden">
          <table className="w-full table-fixed">
            <thead className="border-b border-gray-200 bg-slate-50/60 text-left text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th className="w-[34%] px-6 py-4 font-medium">Driver Name / Phone</th>
                <th className="w-[24%] px-6 py-4 font-medium">License</th>
                <th className="w-[16%] px-6 py-4 font-medium">Type</th>
                <th className="w-[14%] px-6 py-4 text-center font-medium">Total Violations</th>
                <th className="w-[12%] px-6 py-4 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleDrivers.map((driver) => (
                <tr key={driver.id} className="border-b border-gray-200">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-4">
                      <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-200 text-sm font-semibold text-slate-600">
                        {driver.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-900">{driver.name}</p>
                        <p className="text-xs text-slate-500">{driver.phone}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">{driver.license}</td>
                  <td className="px-6 py-4">
                    <span className="inline-flex rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-700">{driver.type}</span>
                  </td>
                  <td className="px-6 py-4 text-center text-sm font-medium text-slate-900">{driver.totalViolations}</td>
                  <td className="px-6 py-4 text-right">
                    <button type="button" onClick={() => setSelectedDriver(driver)} className="text-sm font-medium text-blue-600 hover:text-blue-700">
                      View
                    </button>
                  </td>
                </tr>
              ))}
              {visibleDrivers.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center">
                    <p className="text-sm font-medium text-gray-700">No drivers match your filters.</p>
                    <button
                      type="button"
                      onClick={clearFilters}
                      className="mt-2 text-sm text-primary-600 hover:underline"
                    >
                      Clear all filters
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedDriver ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setSelectedDriver(null)}>
          <div className="w-full max-w-[900px] rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
              <h3 className="text-xl font-bold text-slate-900">Driver Report: {selectedDriver.name}</h3>
              <button type="button" onClick={() => setSelectedDriver(null)} className="rounded-md p-1 text-gray-400 hover:bg-gray-100">
                <X className="h-7 w-7" />
              </button>
            </div>

            <div className="space-y-5 px-5 py-5">
              <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 p-4">
                <div className="flex items-center gap-4">
                  <div className="inline-flex h-16 w-16 items-center justify-center rounded-full border border-gray-300 bg-white text-sm font-semibold text-slate-600">
                    {selectedDriver.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-xl font-semibold text-slate-900">{selectedDriver.name}</p>
                    <p className="text-sm text-slate-500">Phone: {selectedDriver.phone}</p>
                    <p className="text-sm text-slate-500">License: {selectedDriver.license}</p>
                  </div>
                </div>
                <div className="min-w-[210px] rounded-xl border border-gray-300 bg-white px-4 py-3 text-center">
                  <p className="text-sm font-semibold uppercase text-slate-500">Total Violations</p>
                  <p className="text-3xl font-bold text-blue-600">{selectedDriver.totalViolations}</p>
                </div>
              </div>

              <div>
                <h4 className="mb-3 text-sm font-bold text-slate-900">ALL VIOLATIONS</h4>
                <div className="space-y-3">
                  {selectedDriver.violations.length > 0 ? (
                    selectedDriver.violations.map((violation) => (
                      <div key={violation.id} className="rounded-xl border border-gray-200 bg-white p-4">
                        <div className="mb-1 flex items-start justify-between">
                          <div className="inline-flex items-center gap-2">
                            {violation.title.toLowerCase().includes('idling') ? (
                              <Clock3 className="h-5 w-5 text-slate-500" />
                            ) : (
                              <AlertCircle className="h-5 w-5 text-slate-500" />
                            )}
                            <p className="text-base font-semibold text-slate-900">{violation.title}</p>
                          </div>
                          <p className="text-sm text-slate-400">{violation.date}</p>
                        </div>
                        <p className="text-sm text-slate-600">{violation.details}</p>
                        <div className="mt-2 flex items-center justify-between">
                          <span className={`inline-flex rounded-full border px-4 py-1 text-sm font-semibold ${severityClass(violation.severity)}`}>
                            {violation.severity}
                          </span>
                          <span className="inline-flex items-center gap-1 text-sm text-slate-400">
                            <Truck className="h-4 w-4" />
                            {violation.vehicle}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-xl border border-gray-200 p-6 text-sm text-slate-500">No violations recorded for this driver.</div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-gray-200 px-5 py-4">
              <button type="button" onClick={() => setSelectedDriver(null)} className="rounded-xl border border-gray-300 px-5 py-3 text-sm text-slate-700 hover:bg-gray-50">
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!selectedDriver) return;
                  const rows = [
                    ['Driver', 'License', 'Phone', 'Type', 'Total Violations'],
                    [selectedDriver.name, selectedDriver.license, selectedDriver.phone, selectedDriver.type, String(selectedDriver.totalViolations)],
                    [],
                    ['Violation', 'Severity', 'Date', 'Vehicle', 'Details'],
                    ...selectedDriver.violations.map(v => [v.title, v.severity, v.date, v.vehicle, v.details]),
                  ];
                  const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
                  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `behavior-report-${selectedDriver.name.replace(/\s+/g, '-').toLowerCase()}.csv`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                disabled={!selectedDriver || selectedDriver.totalViolations === 0}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Download className="h-5 w-5" />
                Download Full Report
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
