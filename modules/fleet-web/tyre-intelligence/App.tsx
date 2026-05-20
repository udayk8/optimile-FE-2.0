
import React, { useState, useMemo, useEffect, ReactNode } from 'react';
import {
  UserRole,
  Tyre,
  TyreStatus,
  Vehicle,
  HistoryEvent,
  ActionType,
  Inspection,
  Defect,
  Repair,
  Vendor,
  RetreadRecord,
  TPIBand,
  RemovalReason,
  VehicleType,
  formatPosition,
  JobCard,
  JobStatus,
  Location,
  TyrePosition,
  TyreIndent,
  IndentStatus
} from './types';
import { MOCK_TYRES, MOCK_VEHICLES, MOCK_HISTORY, MOCK_VENDORS, MOCK_INSPECTIONS, MOCK_VEHICLE_TYPES, MOCK_JOB_CARDS, MOCK_LOCATIONS, MOCK_INDENTS } from './mockData';

export interface TyreAppContextType {
  currentUser: { name: string; role: UserRole };
  tyres: Tyre[];
  vehicles: Vehicle[];
  vehicleTypes: VehicleType[];
  history: HistoryEvent[];
  inspections: Inspection[];
  defects: Defect[];
  repairs: Repair[];
  retreads: RetreadRecord[];
  vendors: Vendor[];
  jobCards: JobCard[];
  locations: Location[];
  indents: TyreIndent[];

  currentView: 'inventory' | 'details' | 'on_vehicles' | 'analytics' | 'inspections' | 'history' | 'onboard_truck' | 'vehicle_master' | 'job_cards' | 'indents';
  selectedTyreId: string | null;
  selectedVehicleId: string;
  isDrawerOpen: boolean;

  setCurrentView: (view: any) => void;
  setSelectedTyreId: (id: string | null) => void;
  setSelectedVehicleId: (id: string) => void;
  setIsDrawerOpen: (open: boolean) => void;
  setTyres: (tyres: Tyre[] | ((prev: Tyre[]) => Tyre[])) => void;
  setVehicles: (vehicles: Vehicle[] | ((prev: Vehicle[]) => Vehicle[])) => void;
  setHistory: (history: HistoryEvent[] | ((prev: HistoryEvent[]) => HistoryEvent[])) => void;
  setInspections: (inspections: Inspection[] | ((prev: Inspection[]) => Inspection[])) => void;
  setJobCards: (jobCards: JobCard[] | ((prev: JobCard[]) => JobCard[])) => void;
  setRepairs: (repairs: Repair[] | ((prev: Repair[]) => Repair[])) => void;
  setRetreads: (retreads: RetreadRecord[] | ((prev: RetreadRecord[]) => RetreadRecord[])) => void;
  setVehicleTypes: (types: VehicleType[] | ((prev: VehicleType[]) => VehicleType[])) => void;

  // Tyre lifecycle actions
  onInspect: (tyreId: string, condition: Inspection['condition'], pressure?: number, tread?: number, remarks?: string) => void;
  onSendForRetread: (tyreId: string, vendorId: string, type: 'Cold' | 'Hot') => void;
  onCompleteRetread: (tyreId: string, cost: number, newModel: string, newTreadDepth: number) => void;
  onRejectRetread: (tyreId: string, reason: string) => void;
  onLogRepair: (tyreId: string, type: string, cost: number, vendorId: string, remarks?: string) => void;
  onFitTyre: (tyreId: string, vehicleId: string, position: string) => void;
  onRemoveTyre: (tyreId: string, reason: RemovalReason) => void;
  onScrapTyre: (tyreId: string, reason: string) => void;
  onCreateWorkOrder: (removedId: string, reason: RemovalReason, nextAction: 'Retread' | 'Inventory' | 'Scrap', replacementId: string) => void;

  // Indent management
  createIndent: (indent: Omit<TyreIndent, 'id' | 'indentNumber' | 'status'>) => void;
  approveIndent: (id: string, approver: string) => void;
  rejectIndent: (id: string, reason: string) => void;
  markIndentOrdered: (id: string, poNumber: string, vendorId: string) => void;
  markIndentReceived: (id: string) => void;
}

export const TyreAppContext = React.createContext<TyreAppContextType | undefined>(undefined);

export const useTyreApp = () => {
  const context = React.useContext(TyreAppContext);
  if (!context) {
    throw new Error('useTyreApp must be used within TyreAppProvider');
  }
  return context;
};

interface TyreAppProviderProps {
  children: ReactNode;
}

export const TyreAppProvider: React.FC<TyreAppProviderProps> = ({ children }) => {
  const [currentUser] = useState<{ name: string; role: UserRole }>({
    name: 'Admin User',
    role: UserRole.FLEET_ADMIN
  });

  const [tyres, setTyres] = useState<Tyre[]>(MOCK_TYRES);
  const [vehicles, setVehicles] = useState<Vehicle[]>(MOCK_VEHICLES);
  const [vehicleTypes, setVehicleTypes] = useState<VehicleType[]>(MOCK_VEHICLE_TYPES);
  const [history, setHistory] = useState<HistoryEvent[]>(MOCK_HISTORY);
  const [inspections, setInspections] = useState<Inspection[]>(MOCK_INSPECTIONS);
  const [defects, setDefects] = useState<Defect[]>([]);
  const [repairs, setRepairs] = useState<Repair[]>([]);
  const [retreads, setRetreads] = useState<RetreadRecord[]>([]);
  const [vendors] = useState<Vendor[]>(MOCK_VENDORS);
  const [jobCards, setJobCards] = useState<JobCard[]>(MOCK_JOB_CARDS);
  const [locations] = useState<Location[]>(MOCK_LOCATIONS);
  const [indents, setIndents] = useState<TyreIndent[]>(MOCK_INDENTS);

  const [currentView, setCurrentView] = useState<'inventory' | 'details' | 'on_vehicles' | 'analytics' | 'inspections' | 'history' | 'onboard_truck' | 'vehicle_master' | 'job_cards' | 'indents'>('on_vehicles');
  const [selectedTyreId, setSelectedTyreId] = useState<string | null>(null);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('V-101');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Indent management functions
  const createIndent = (indent: Omit<TyreIndent, 'id' | 'indentNumber' | 'status'>) => {
    const newIndent: TyreIndent = {
      ...indent,
      id: `IND-${Date.now()}`,
      indentNumber: `TYR-IND-2026-${String(indents.length + 1).padStart(3, '0')}`,
      status: 'Pending'
    };
    setIndents(prev => [newIndent, ...prev]);
  };

  const approveIndent = (id: string, approver: string) => {
    setIndents(prev => prev.map(indent =>
      indent.id === id
        ? { ...indent, status: 'Approved' as IndentStatus, approver, approvalDate: new Date().toISOString() }
        : indent
    ));
  };

  const rejectIndent = (id: string, reason: string) => {
    setIndents(prev => prev.map(indent =>
      indent.id === id
        ? { ...indent, status: 'Rejected' as IndentStatus, rejectionReason: reason }
        : indent
    ));
  };

  const markIndentOrdered = (id: string, poNumber: string, vendorId: string) => {
    setIndents(prev => prev.map(indent =>
      indent.id === id
        ? { ...indent, status: 'Ordered' as IndentStatus, poNumber, vendorId }
        : indent
    ));
  };

  const markIndentReceived = (id: string) => {
    setIndents(prev => prev.map(indent =>
      indent.id === id
        ? { ...indent, status: 'Received' as IndentStatus }
        : indent
    ));
    // TODO: Trigger GRN workflow here
  };

  // ── Tyre Lifecycle Actions ──────────────────────────────────
  const onInspect = (tyreId: string, condition: Inspection['condition'], pressure?: number, tread?: number, remarks?: string) => {
    const newInsp: Inspection = {
      id: `INSP-${Date.now()}`,
      tyreId,
      condition,
      pressurePsi: pressure || 0,
      treadDepthMm: tread || 0,
      remarks,
      timestamp: new Date().toISOString(),
      user: currentUser.name
    };
    setInspections(prev => [...prev, newInsp]);
    setHistory(prev => [...prev, { id: `H-${Date.now()}`, tyreId, action: ActionType.INSPECTED, details: `Yard check: ${condition}. Pressure: ${pressure} PSI, Tread: ${tread} mm`, timestamp: new Date().toISOString(), user: currentUser.name, role: currentUser.role }]);
  };

  const onSendForRetread = (tyreId: string, vendorId: string, type: 'Cold' | 'Hot') => {
    const tyre = tyres.find(t => t.id === tyreId);
    setTyres(prev => prev.map(t => t.id === tyreId ? { ...t, status: TyreStatus.RETREAD_IN_PROGRESS, locationId: vendorId } : t));
    setRetreads(prev => [...prev, { id: `RT-${Date.now()}`, tyreId, vendorId, type, lifeNo: (tyre?.currentLifeNo || 0) + 1, startDate: new Date().toISOString(), status: 'Pending' as const }]);
    setHistory(prev => [...prev, { id: `H-${Date.now()}`, tyreId, action: ActionType.RETREAD_SENT, details: `Sent for ${type} retread to vendor ${vendorId}`, timestamp: new Date().toISOString(), user: currentUser.name, role: currentUser.role }]);
  };

  const onCompleteRetread = (tyreId: string, cost: number, newModel: string, newTreadDepth: number) => {
    setTyres(prev => prev.map(t => t.id === tyreId ? { ...t, status: TyreStatus.IN_STORE, model: newModel, currentLifeNo: t.currentLifeNo + 1, locationId: 'LOC-MUM-01' } : t));
    setRetreads(prev => prev.map(r => r.tyreId === tyreId && r.status === 'Pending' ? { ...r, status: 'Completed' as const, cost, completionDate: new Date().toISOString() } : r));
    setHistory(prev => [...prev, { id: `H-${Date.now()}`, tyreId, action: ActionType.RETREAD_COMPLETED, details: `Retread completed. Cost: ₹${cost}. New tread: ${newTreadDepth}mm`, timestamp: new Date().toISOString(), user: currentUser.name, role: currentUser.role }]);
  };

  const onRejectRetread = (tyreId: string, reason: string) => {
    setTyres(prev => prev.map(t => t.id === tyreId ? { ...t, status: TyreStatus.AWAITING_DECISION, locationId: 'LOC-MUM-01' } : t));
    setRetreads(prev => prev.map(r => r.tyreId === tyreId && r.status === 'Pending' ? { ...r, status: 'Rejected' as const, rejectionReason: reason } : r));
    setHistory(prev => [...prev, { id: `H-${Date.now()}`, tyreId, action: ActionType.RETREAD_REJECTED, details: `Retread rejected: ${reason}`, timestamp: new Date().toISOString(), user: currentUser.name, role: currentUser.role }]);
  };

  const onLogRepair = (tyreId: string, type: string, cost: number, vendorId: string, remarks?: string) => {
    setRepairs(prev => [...prev, { id: `RPR-${Date.now()}`, tyreId, type, cost, vendorId, date: new Date().toISOString(), remarks }]);
    setHistory(prev => [...prev, { id: `H-${Date.now()}`, tyreId, action: ActionType.REPAIR_LOGGED, details: `Repair: ${type}. Cost: ₹${cost}. ${remarks || ''}`, timestamp: new Date().toISOString(), user: currentUser.name, role: currentUser.role }]);
  };

  const onFitTyre = (tyreId: string, vehicleId: string, position: string) => {
    setTyres(prev => prev.map(t => t.id === tyreId ? { ...t, status: TyreStatus.FITTED, currentVehicleId: vehicleId, locationId: vehicleId } : t));
    setHistory(prev => [...prev, { id: `H-${Date.now()}`, tyreId, action: ActionType.FITTED, details: `Fitted to ${vehicleId} at position ${position}`, timestamp: new Date().toISOString(), user: currentUser.name, role: currentUser.role }]);
  };

  const onRemoveTyre = (tyreId: string, reason: RemovalReason) => {
    setTyres(prev => prev.map(t => t.id === tyreId ? { ...t, status: TyreStatus.AWAITING_DECISION, currentVehicleId: undefined, position: undefined, locationId: 'LOC-MUM-01' } : t));
    setHistory(prev => [...prev, { id: `H-${Date.now()}`, tyreId, action: ActionType.REMOVED, details: `Removed: ${reason}`, timestamp: new Date().toISOString(), user: currentUser.name, role: currentUser.role }]);
  };

  const onScrapTyre = (tyreId: string, reason: string) => {
    setTyres(prev => prev.map(t => t.id === tyreId ? { ...t, status: TyreStatus.SCRAPPED } : t));
    setHistory(prev => [...prev, { id: `H-${Date.now()}`, tyreId, action: ActionType.SCRAPPED, details: `Scrapped: ${reason}`, timestamp: new Date().toISOString(), user: currentUser.name, role: currentUser.role }]);
  };

  const onCreateWorkOrder = (removedId: string, reason: RemovalReason, nextAction: 'Retread' | 'Inventory' | 'Scrap', replacementId: string) => {
    // Remove old tyre
    const oldTyre = tyres.find(t => t.id === removedId);
    if (!oldTyre) return;
    const vehicleId = oldTyre.currentVehicleId || '';
    const position = oldTyre.position;

    // Update old tyre status based on next action
    setTyres(prev => prev.map(t => {
      if (t.id === removedId) {
        if (nextAction === 'Scrap') return { ...t, status: TyreStatus.SCRAPPED, currentVehicleId: undefined, position: undefined };
        if (nextAction === 'Retread') return { ...t, status: TyreStatus.AWAITING_DECISION, currentVehicleId: undefined, position: undefined, locationId: 'LOC-MUM-01' };
        return { ...t, status: TyreStatus.IN_STORE, currentVehicleId: undefined, position: undefined, locationId: 'LOC-MUM-01' };
      }
      // Fit replacement tyre
      if (t.id === replacementId && position) {
        return { ...t, status: TyreStatus.FITTED, currentVehicleId: vehicleId, position, locationId: vehicleId };
      }
      return t;
    }));

    // Create job card
    const newJob: JobCard = {
      id: `JC-${Date.now()}`,
      vehicleId,
      type: 'REPLACEMENT',
      priority: 'High',
      status: JobStatus.COMPLETED,
      createdAt: new Date().toISOString(),
      createdBy: currentUser.name,
      targetTyreId: removedId,
      position: position!,
      replacementTyreId: replacementId,
      removalReason: reason,
      nextDestination: nextAction
    };
    setJobCards(prev => [...prev, newJob]);

    setHistory(prev => [...prev,
    { id: `H-${Date.now()}-1`, tyreId: removedId, action: ActionType.REMOVED, details: `Work Order: Removed (${reason}) → ${nextAction}`, timestamp: new Date().toISOString(), user: currentUser.name, role: currentUser.role },
    { id: `H-${Date.now()}-2`, tyreId: replacementId, action: ActionType.FITTED, details: `Work Order: Replacement fitted at ${position ? formatPosition(position) : 'unknown'}`, timestamp: new Date().toISOString(), user: currentUser.name, role: currentUser.role }
    ]);
  };

  const value: TyreAppContextType = {
    currentUser,
    tyres,
    vehicles,
    vehicleTypes,
    history,
    inspections,
    defects,
    repairs,
    retreads,
    vendors,
    jobCards,
    locations,
    indents,
    currentView,
    selectedTyreId,
    selectedVehicleId,
    isDrawerOpen,
    setCurrentView,
    setSelectedTyreId,
    setSelectedVehicleId,
    setIsDrawerOpen,
    setTyres,
    setVehicles,
    setHistory,
    setInspections,
    setJobCards,
    setRepairs,
    setRetreads,
    setVehicleTypes,
    onInspect,
    onSendForRetread,
    onCompleteRetread,
    onRejectRetread,
    onLogRepair,
    onFitTyre,
    onRemoveTyre,
    onScrapTyre,
    onCreateWorkOrder,
    createIndent,
    approveIndent,
    rejectIndent,
    markIndentOrdered,
    markIndentReceived
  };

  return (
    <TyreAppContext.Provider value={value}>
      {children}
    </TyreAppContext.Provider>
  );
};
