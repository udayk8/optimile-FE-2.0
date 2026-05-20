import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TyreAppProvider, useTyreApp } from '../tyre-intelligence/App';
import { Inspection, Tyre, TyreStatus } from '../tyre-intelligence/types';

const TyreInspectionsContent: React.FC = () => {
  const navigate = useNavigate();
  const { inspections, tyres, vehicles, vehicleTypes, onInspect } = useTyreApp();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTyreId, setSelectedTyreId] = useState('');
  const [condition, setCondition] = useState<Inspection['condition']>('OK');
  const [pressure, setPressure] = useState('');
  const [tread, setTread] = useState('');
  const [remarks, setRemarks] = useState('');
  const [filterCondition, setFilterCondition] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [modalVehicleId, setModalVehicleId] = useState('');

  const fittedTyres = tyres.filter(t => t.status === TyreStatus.FITTED || t.status === TyreStatus.IN_STORE);

  const filteredInspections = inspections
    .filter(i => filterCondition === 'All' || i.condition === filterCondition)
    .filter(i => !searchQuery || i.tyreId.toLowerCase().includes(searchQuery.toLowerCase()) || i.user.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const handleSubmitInspection = () => {
    if (!selectedTyreId) return;
    onInspect(
      selectedTyreId,
      condition,
      pressure ? Number(pressure) : undefined,
      tread ? Number(tread) : undefined,
      remarks || undefined
    );
    // Reset form
    setIsModalOpen(false);
    setSelectedTyreId('');
    setCondition('OK');
    setPressure('');
    setTread('');
    setRemarks('');
    setModalVehicleId('');
  };

  // Stats
  const totalInspections = inspections.length;
  const issueCount = inspections.filter(i => i.condition !== 'OK').length;
  const avgTread = inspections.filter(i => i.treadDepthMm).length > 0
    ? (inspections.reduce((sum, i) => sum + (i.treadDepthMm || 0), 0) / inspections.filter(i => i.treadDepthMm).length).toFixed(1)
    : '--';
  const uniqueTyresInspected = new Set(inspections.map(i => i.tyreId)).size;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Tyre Inspections</h1>
          <p className="text-sm text-slate-500 mt-1">Yard checks, inspections history, and quality audits</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-6 py-3 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl shadow-lg hover:bg-indigo-700 transition-all active:scale-95"
        >
          + Log New Inspection
        </button>
      </div>

      {/* Stats Bar */}
      <div className="px-6 py-4 grid grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Total Inspections</p>
          <p className="text-2xl font-black text-slate-900 mt-1">{totalInspections}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Issues Found</p>
          <p className="text-2xl font-black text-red-600 mt-1">{issueCount}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Avg Tread Depth</p>
          <p className="text-2xl font-black text-slate-900 mt-1">{avgTread} <span className="text-xs text-slate-400">mm</span></p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Tyres Inspected</p>
          <p className="text-2xl font-black text-slate-900 mt-1">{uniqueTyresInspected}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="px-6 pb-4 flex gap-3 items-center">
        <div className="relative flex-1 max-w-sm">
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by Tyre ID or Inspector..."
            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 pl-9 text-sm font-medium outline-none focus:ring-2 ring-indigo-500/20"
          />
          <svg className="absolute left-3 top-3 w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
        </div>
        <div className="flex gap-1">
          {['All', 'OK', 'Cut', 'Bulge', 'Uneven', 'Damaged'].map(cond => (
            <button
              key={cond}
              onClick={() => setFilterCondition(cond)}
              className={`px-3 py-2 text-[10px] font-black uppercase rounded-xl transition-all ${filterCondition === cond
                ? 'bg-indigo-600 text-white'
                : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50'
                }`}
            >
              {cond}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="px-6 pb-8">
        <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date & Time</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Asset ID</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Condition</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Pressure (PSI)</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tread (MM)</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Inspector</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Remarks</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredInspections.map(insp => {
                const tyre = tyres.find(t => t.id === insp.tyreId);
                return (
                  <tr key={insp.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="text-xs font-black text-slate-900">{new Date(insp.timestamp).toLocaleDateString()}</p>
                      <p className="text-[9px] text-slate-400 font-bold">{new Date(insp.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-xs font-black text-indigo-600 uppercase">{insp.tyreId}</p>
                      <p className="text-[9px] text-slate-400 font-bold uppercase">{tyre?.brand} {tyre?.model}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 text-[9px] font-black rounded-lg border uppercase ${insp.condition === 'OK'
                        ? 'bg-green-50 text-green-700 border-green-200'
                        : insp.condition === 'Uneven'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-red-50 text-red-700 border-red-200'
                        }`}>
                        {insp.condition}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs font-black text-slate-700">
                      {insp.pressurePsi ? `${insp.pressurePsi} PSI` : '--'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-xs font-black ${(insp.treadDepthMm || 0) < 4 ? 'text-red-600' : (insp.treadDepthMm || 0) < 6 ? 'text-amber-600' : 'text-slate-700'}`}>
                        {insp.treadDepthMm ? `${insp.treadDepthMm} MM` : '--'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs font-bold text-slate-500 italic">
                      {insp.user}
                    </td>
                    <td className="px-6 py-4 text-[10px] text-slate-400 italic max-w-[150px] truncate">
                      {insp.remarks || '—'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => navigate(`/fleet/tyres/${insp.tyreId}`)}
                        className="text-[10px] font-black text-indigo-600 hover:text-indigo-800 uppercase tracking-widest"
                      >
                        View Asset →
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filteredInspections.length === 0 && (
            <div className="p-16 text-center">
              <p className="text-sm font-black text-slate-400 uppercase tracking-widest italic">No inspections match your filters.</p>
            </div>
          )}
        </div>
      </div>

      {/* New Inspection Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-6 z-[100] animate-in fade-in duration-200">
          <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-lg animate-in zoom-in-95">
            <div className="bg-slate-950 px-10 py-8 text-white rounded-t-[40px] flex justify-between items-center">
              <div>
                <h2 className="text-lg font-black uppercase tracking-widest">New Yard Inspection</h2>
                <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mt-1">Log physical check results</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center font-bold hover:bg-white/20">✕</button>
            </div>

            <div className="p-10 space-y-6">
              {/* Vehicle Filter */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Filter by Vehicle</label>
                <select
                  value={modalVehicleId}
                  onChange={e => { setModalVehicleId(e.target.value); setSelectedTyreId(''); }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-bold outline-none focus:ring-2 ring-indigo-500/20"
                >
                  <option value="">All vehicles (show all tyres)</option>
                  {vehicles.map(v => (
                    <option key={v.id} value={v.id}>
                      🚛 {v.plateNumber} — {vehicleTypes.find(vt => vt.id === v.typeId)?.name || v.typeId}
                    </option>
                  ))}
                </select>
              </div>

              {/* Tyre Selector */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Select Tyre {modalVehicleId && <span className="text-indigo-500">({fittedTyres.filter(t => !modalVehicleId || t.currentVehicleId === modalVehicleId).length} tyres)</span>}
                </label>
                <select
                  value={selectedTyreId}
                  onChange={e => setSelectedTyreId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-bold outline-none focus:ring-2 ring-indigo-500/20"
                >
                  <option value="">Choose a tyre...</option>
                  {fittedTyres
                    .filter(t => !modalVehicleId || t.currentVehicleId === modalVehicleId)
                    .map(t => {
                      const vehicle = vehicles.find(v => v.id === t.currentVehicleId);
                      return (
                        <option key={t.id} value={t.id}>
                          {t.id} — {t.brand} {t.model} ({t.status}){vehicle ? ` [${vehicle.plateNumber}]` : ''}
                        </option>
                      );
                    })}
                </select>
              </div>

              {/* Condition */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Physical Condition</label>
                <div className="grid grid-cols-5 gap-2">
                  {(['OK', 'Uneven', 'Cut', 'Bulge', 'Damaged'] as const).map(c => (
                    <button
                      key={c}
                      onClick={() => setCondition(c)}
                      className={`py-3 text-[9px] font-black uppercase rounded-xl border-2 transition-all ${condition === c
                        ? c === 'OK' ? 'border-green-500 bg-green-50 text-green-700' : 'border-red-500 bg-red-50 text-red-700'
                        : 'border-slate-200 text-slate-500 hover:border-slate-300'
                        }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              {/* Measurements */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pressure (PSI)</label>
                  <input
                    type="number"
                    value={pressure}
                    onChange={e => setPressure(e.target.value)}
                    placeholder="e.g. 105"
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-bold outline-none focus:ring-2 ring-indigo-500/20"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tread Depth (MM)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={tread}
                    onChange={e => setTread(e.target.value)}
                    placeholder="e.g. 12.5"
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-bold outline-none focus:ring-2 ring-indigo-500/20"
                  />
                </div>
              </div>

              {/* Remarks */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Remarks (Optional)</label>
                <input
                  type="text"
                  value={remarks}
                  onChange={e => setRemarks(e.target.value)}
                  placeholder="Any observations..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-bold outline-none focus:ring-2 ring-indigo-500/20"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4 pt-2">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-5 border-2 border-slate-200 rounded-2xl text-[10px] font-black uppercase text-slate-500 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitInspection}
                  disabled={!selectedTyreId}
                  className={`flex-[2] py-5 rounded-2xl text-[10px] font-black uppercase shadow-xl transition-all active:scale-95 ${selectedTyreId
                    ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    }`}
                >
                  Commit Inspection
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const TyreInspectionsPage: React.FC = () => {
  return (
    <TyreAppProvider>
      <TyreInspectionsContent />
    </TyreAppProvider>
  );
};
