import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { TyreAppProvider, useTyreApp } from '../tyre-intelligence/App';
import { TruckVisualization } from '../tyre-intelligence/components/TruckVisualization';
import { Tyre, TPIBand, TyreStatus, formatPosition } from '../tyre-intelligence/types';

const TyreTrackerContent: React.FC = () => {
  const navigate = useNavigate();
  const {
    vehicles,
    vehicleTypes,
    tyres,
    inspections,
    setInspections,
    setTyres,
  } = useTyreApp();

  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTyre, setSelectedTyre] = useState<Tyre | null>(null);

  // Log Inspection modal state
  const [showInspModal, setShowInspModal] = useState(false);
  const [inspCondition, setInspCondition] = useState<'OK' | 'Cut' | 'Bulge' | 'Uneven' | 'Damaged'>('OK');
  const [inspPressure, setInspPressure] = useState('');
  const [inspTread, setInspTread] = useState('');
  const [inspRemarks, setInspRemarks] = useState('');

  // Replace modal state
  const [showReplaceModal, setShowReplaceModal] = useState(false);
  const [replaceReason, setReplaceReason] = useState('');
  const [replaceReplacementId, setReplaceReplacementId] = useState('');

  const handleSubmitInspection = () => {
    if (!selectedTyre) return;
    const newInsp = {
      id: `INSP-${Date.now()}`,
      tyreId: selectedTyre.id,
      condition: inspCondition,
      pressurePsi: inspPressure ? Number(inspPressure) : undefined,
      treadDepthMm: inspTread ? Number(inspTread) : undefined,
      remarks: inspRemarks || undefined,
      timestamp: new Date().toISOString(),
      inspectedBy: 'Fleet Manager',
    };
    setInspections(prev => [newInsp, ...prev]);
    setShowInspModal(false);
    setInspCondition('OK');
    setInspPressure('');
    setInspTread('');
    setInspRemarks('');
  };

  const handleSubmitReplace = () => {
    if (!selectedTyre) return;
    // Mark existing tyre as awaiting decision, mark replacement as fitted
    setTyres(prev => prev.map(t => {
      if (t.id === selectedTyre.id) return { ...t, status: TyreStatus.AWAITING_DECISION, currentVehicleId: undefined, position: undefined };
      if (t.id === replaceReplacementId) return { ...t, status: TyreStatus.FITTED, currentVehicleId: selectedTyre.currentVehicleId, position: selectedTyre.position };
      return t;
    }));
    setSelectedTyre(null);
    setShowReplaceModal(false);
    setReplaceReason('');
    setReplaceReplacementId('');
  };

  const inStoreTyres = tyres.filter(t => t.status === TyreStatus.IN_STORE);

  // Filter vehicles by search query
  const filteredVehicles = useMemo(() => {
    if (!searchQuery) return vehicles;
    const q = searchQuery.toLowerCase();
    return vehicles.filter(v =>
      v.plateNumber.toLowerCase().includes(q) ||
      v.id.toLowerCase().includes(q)
    );
  }, [vehicles, searchQuery]);

  const selectedVehicle = vehicles.find(v => v.id === selectedVehicleId);
  const selectedVehicleType = selectedVehicle
    ? vehicleTypes.find(vt => vt.id === selectedVehicle.typeId)
    : null;

  const vehicleTyres = useMemo(() =>
    tyres.filter(t => t.currentVehicleId === selectedVehicleId),
    [tyres, selectedVehicleId]
  );

  const calculateTPI = (tyre: Tyre) => {
    const latestInspection = inspections
      .filter(i => i.tyreId === tyre.id)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];

    const treadDepth = latestInspection?.treadDepthMm || 15;
    const conditionScore = latestInspection
      ? (latestInspection.condition === 'OK' ? 100 :
        latestInspection.condition === 'Uneven' ? 60 :
          latestInspection.condition === 'Cut' || latestInspection.condition === 'Bulge' ? 20 : 0)
      : 80;

    const score = Math.round((treadDepth / 20 * 50) + (conditionScore / 100 * 50));
    let band: TPIBand;
    if (score >= 80) band = TPIBand.EXCELLENT;
    else if (score >= 60) band = TPIBand.ACCEPTABLE;
    else if (score >= 40) band = TPIBand.WATCH;
    else band = TPIBand.REPLACE;

    return { band, score };
  };

  const handleTyreClick = (tyre: Tyre) => {
    setSelectedTyre(tyre);
  };

  const latestInspection = (tyreId: string) => {
    return inspections
      .filter(i => i.tyreId === tyreId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-6">
        <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Tyre Visual Tracker</h1>
        <p className="text-sm text-slate-500 mt-1">Select a vehicle to view its tyre layout; click any tyre for details and actions</p>
      </div>

      <div className="p-6 flex gap-6">
        {/* Left — Vehicle Selector */}
        <div className="w-80 shrink-0 space-y-4">
          {/* Search */}
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by vehicle number..."
              className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 pl-10 text-sm font-medium outline-none focus:ring-2 ring-indigo-500/20 focus:border-indigo-400 transition-all"
            />
            <svg className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
          </div>

          {/* Vehicle List */}
          <div className="space-y-2 max-h-[calc(100vh-220px)] overflow-y-auto pr-1">
            {filteredVehicles.map(vehicle => {
              const vType = vehicleTypes.find(vt => vt.id === vehicle.typeId);
              const vTyres = tyres.filter(t => t.currentVehicleId === vehicle.id);
              const isSelected = selectedVehicleId === vehicle.id;

              return (
                <button
                  key={vehicle.id}
                  onClick={() => {
                    setSelectedVehicleId(vehicle.id);
                    setSelectedTyre(null);
                  }}
                  className={`w-full text-left p-4 rounded-2xl border-2 transition-all ${isSelected
                    ? 'border-indigo-500 bg-indigo-50 shadow-lg'
                    : 'border-slate-100 bg-white hover:border-slate-200 hover:shadow-sm'
                    }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-100'}`}>
                      🚛
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-black text-slate-900 uppercase tracking-tight truncate">{vehicle.plateNumber}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{vType?.name || vehicle.typeId}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex gap-4 text-[10px] font-bold uppercase text-slate-400">
                    <span>{vTyres.length} tyres</span>
                    <span>•</span>
                    <span>{vehicle.odometer.toLocaleString()} km</span>
                  </div>
                </button>
              );
            })}
            {filteredVehicles.length === 0 && (
              <div className="p-8 text-center text-slate-400 text-xs font-medium italic">
                No vehicles match "{searchQuery}"
              </div>
            )}
          </div>
        </div>

        {/* Center — Truck Visualization */}
        <div className="flex-1 flex flex-col items-center">
          {selectedVehicle && selectedVehicleType ? (
            <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm p-8 w-full">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">{selectedVehicle.plateNumber}</h2>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{selectedVehicleType.name}</p>
                </div>
                <div className="flex gap-3">
                  <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase">
                    <span className="w-3 h-3 rounded-full bg-green-500" /> Excellent
                  </div>
                  <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase">
                    <span className="w-3 h-3 rounded-full bg-yellow-500" /> Watch
                  </div>
                  <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase">
                    <span className="w-3 h-3 rounded-full bg-red-500" /> Replace
                  </div>
                  <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase">
                    <span className="w-3 h-3 rounded-full bg-slate-300" /> Empty
                  </div>
                </div>
              </div>

              <div className="flex justify-center">
                <TruckVisualization
                  vehicleType={selectedVehicleType}
                  tyres={vehicleTyres}
                  inspections={inspections}
                  onTyreClick={handleTyreClick}
                  calculateTPI={calculateTPI}
                  selectedTyreId={selectedTyre?.id || null}
                />
              </div>

              {/* Tyre Summary Table */}
              <div className="mt-8 border-t border-slate-100 pt-6">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Mounted Tyres</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {vehicleTyres.map(tyre => {
                    const { band, score } = calculateTPI(tyre);
                    return (
                      <button
                        key={tyre.id}
                        onClick={() => setSelectedTyre(tyre)}
                        className={`p-3 rounded-xl border text-left transition-all hover:shadow-sm ${selectedTyre?.id === tyre.id ? 'border-indigo-500 bg-indigo-50' : 'border-slate-100'}`}
                      >
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-black text-slate-900">{formatPosition(tyre.position)}</span>
                          <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${band === TPIBand.EXCELLENT ? 'bg-green-100 text-green-700' :
                            band === TPIBand.WATCH ? 'bg-yellow-100 text-yellow-700' :
                              band === TPIBand.REPLACE ? 'bg-red-100 text-red-700' :
                                'bg-blue-100 text-blue-700'
                            }`}>{score}</span>
                        </div>
                        <p className="text-[9px] text-slate-400 font-bold mt-1 truncate">{tyre.brand} {tyre.model}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-20">
              <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center text-5xl mb-6">🔍</div>
              <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight mb-2">Select a Vehicle</h2>
              <p className="text-sm text-slate-400 max-w-sm">Choose a vehicle from the list or search by plate number to view its tyre layout and health.</p>
            </div>
          )}
        </div>

        {/* Right — Selected Tyre Detail Panel */}
        {selectedTyre && (
          <div className="w-80 shrink-0">
            <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm p-6 sticky top-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-black text-slate-900">{selectedTyre.id}</h3>
                  <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest mt-1">
                    Position: {formatPosition(selectedTyre.position)}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedTyre(null)}
                  className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 hover:bg-slate-200"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                {/* Status Badge */}
                <div className={`inline-flex px-3 py-1.5 rounded-full text-[10px] font-black uppercase ${selectedTyre.status === TyreStatus.FITTED ? 'bg-green-50 text-green-700 border border-green-200' :
                  selectedTyre.status === TyreStatus.IN_STORE ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                    'bg-slate-100 text-slate-600 border border-slate-200'
                  }`}>
                  {selectedTyre.status}
                </div>

                {/* Info Grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-slate-50 rounded-xl">
                    <p className="text-[9px] font-bold text-slate-400 uppercase">Brand</p>
                    <p className="text-xs font-black text-slate-900 mt-1">{selectedTyre.brand}</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl">
                    <p className="text-[9px] font-bold text-slate-400 uppercase">Model</p>
                    <p className="text-xs font-black text-slate-900 mt-1">{selectedTyre.model}</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl">
                    <p className="text-[9px] font-bold text-slate-400 uppercase">Size</p>
                    <p className="text-xs font-black text-slate-900 mt-1">{selectedTyre.size}</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl">
                    <p className="text-[9px] font-bold text-slate-400 uppercase">Life Stage</p>
                    <p className="text-xs font-black text-slate-900 mt-1">{selectedTyre.currentLifeNo === 0 ? 'NEW' : `RT${selectedTyre.currentLifeNo}`}</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl">
                    <p className="text-[9px] font-bold text-slate-400 uppercase">Total KM</p>
                    <p className="text-xs font-black text-slate-900 mt-1">{selectedTyre.totalKm.toLocaleString()}</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl">
                    <p className="text-[9px] font-bold text-slate-400 uppercase">TPI Score</p>
                    <p className="text-xs font-black text-slate-900 mt-1">{calculateTPI(selectedTyre).score}</p>
                  </div>
                </div>

                {/* Last Inspection */}
                {(() => {
                  const insp = latestInspection(selectedTyre.id);
                  if (!insp) return null;
                  return (
                    <div className="p-4 bg-slate-900 rounded-2xl text-white">
                      <p className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest mb-2">Last Inspection</p>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div>
                          <p className="text-lg font-black">{insp.treadDepthMm || '--'}</p>
                          <p className="text-[8px] text-slate-400 uppercase">mm tread</p>
                        </div>
                        <div>
                          <p className="text-lg font-black">{insp.pressurePsi || '--'}</p>
                          <p className="text-[8px] text-slate-400 uppercase">PSI</p>
                        </div>
                        <div>
                          <p className="text-lg font-black">{insp.condition}</p>
                          <p className="text-[8px] text-slate-400 uppercase">Condition</p>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Action Buttons */}
                <div className="space-y-2 pt-2">
                  <button
                    onClick={() => navigate(`/fleet/tyres/${selectedTyre.id}`)}
                    className="w-full py-3.5 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-indigo-700 transition-all shadow-lg"
                  >
                    View Full Detail →
                  </button>
                  <button
                    onClick={() => setShowInspModal(true)}
                    className="w-full py-3 border-2 border-slate-100 text-slate-700 text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-slate-50 transition-all"
                  >
                    Log Inspection
                  </button>
                  <button
                    onClick={() => setShowReplaceModal(true)}
                    className="w-full py-3 border-2 border-red-100 text-red-600 text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-red-50 transition-all"
                  >
                    Replace / Change Flow
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Log Inspection Modal */}
      {showInspModal && selectedTyre && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">Log Inspection</h2>
                <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest mt-1">{selectedTyre.id} · {formatPosition(selectedTyre.position)}</p>
              </div>
              <button onClick={() => setShowInspModal(false)} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200">✕</button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Condition</label>
                <div className="flex flex-wrap gap-2">
                  {(['OK', 'Cut', 'Bulge', 'Uneven', 'Damaged'] as const).map(c => (
                    <button key={c} onClick={() => setInspCondition(c)}
                      className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase border-2 transition-all ${inspCondition === c ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-100 text-slate-500 hover:border-slate-200'}`}>
                      {c}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">Pressure (PSI)</label>
                  <input type="number" value={inspPressure} onChange={e => setInspPressure(e.target.value)} placeholder="e.g. 110"
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium outline-none focus:ring-2 ring-indigo-500/20 focus:border-indigo-400" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">Tread Depth (mm)</label>
                  <input type="number" value={inspTread} onChange={e => setInspTread(e.target.value)} placeholder="e.g. 8"
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium outline-none focus:ring-2 ring-indigo-500/20 focus:border-indigo-400" />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">Remarks</label>
                <textarea value={inspRemarks} onChange={e => setInspRemarks(e.target.value)} rows={2} placeholder="Optional notes..."
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium outline-none focus:ring-2 ring-indigo-500/20 focus:border-indigo-400 resize-none" />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowInspModal(false)} className="flex-1 py-3 border-2 border-slate-100 text-slate-700 text-[10px] font-black uppercase rounded-2xl hover:bg-slate-50">Cancel</button>
              <button onClick={handleSubmitInspection} className="flex-1 py-3 bg-indigo-600 text-white text-[10px] font-black uppercase rounded-2xl hover:bg-indigo-700 shadow-lg">Save Inspection</button>
            </div>
          </div>
        </div>
      )}

      {/* Replace / Change Flow Modal */}
      {showReplaceModal && selectedTyre && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">Replace Tyre</h2>
                <p className="text-[10px] font-bold text-red-500 uppercase tracking-widest mt-1">{selectedTyre.id} · {formatPosition(selectedTyre.position)}</p>
              </div>
              <button onClick={() => setShowReplaceModal(false)} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200">✕</button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">Reason for Replacement</label>
                <textarea value={replaceReason} onChange={e => setReplaceReason(e.target.value)} rows={2} placeholder="e.g. Tread worn below limit, sidewall damage..."
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium outline-none focus:ring-2 ring-red-500/20 focus:border-red-400 resize-none" />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">Replacement Tyre (from store)</label>
                <select value={replaceReplacementId} onChange={e => setReplaceReplacementId(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium outline-none focus:ring-2 ring-red-500/20 focus:border-red-400">
                  <option value="">-- Select replacement tyre --</option>
                  {inStoreTyres.map(t => (
                    <option key={t.id} value={t.id}>{t.id} · {t.brand} {t.model} ({t.size})</option>
                  ))}
                </select>
              </div>
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700 font-medium">
                The current tyre will be marked <strong>Awaiting Decision</strong> and removed from the vehicle.
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowReplaceModal(false)} className="flex-1 py-3 border-2 border-slate-100 text-slate-700 text-[10px] font-black uppercase rounded-2xl hover:bg-slate-50">Cancel</button>
              <button onClick={handleSubmitReplace} disabled={!replaceReplacementId || !replaceReason}
                className="flex-1 py-3 bg-red-600 text-white text-[10px] font-black uppercase rounded-2xl hover:bg-red-700 shadow-lg disabled:opacity-40 disabled:cursor-not-allowed">
                Confirm Replace
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const TyreTrackerPage: React.FC = () => {
  return (
    <TyreAppProvider>
      <TyreTrackerContent />
    </TyreAppProvider>
  );
};
