import {
  AlertRule,
  BatteryAsset,
  CostHealthDrilldown,
  DispatchAssignment,
  FleetAlert,
  FleetDriver,
  FleetReportMetric,
  FuelEvent,
  InventoryTransaction,
  MaintenanceWorkOrder,
  Part,
  PartInventoryItem,
  TelematicsSignal,
  TyreInspection,
  TyreInventoryItem,
  TyreJobCard,
  Vehicle,
  VendorLedgerEntry,
} from '../../types';

export const demoVehicles: Vehicle[] = [
  {
    id: 'veh-001',
    registrationNo: 'MH 12 VX 4182',
    make: 'Tata',
    model: 'Prima 5530.S',
    year: 2023,
    status: 'Active',
    location: 'Pune DC',
    utilization: 86,
    driver: { id: 'drv-1', name: 'Aarav Sharma', phone: '+91 98765 43210', licenseNo: 'MH1420190014289' },
    specs: { vin: 'MAT555301P7A44182', engineNo: 'CUM6BT4182', fuelType: 'Diesel', capacityKg: 49000, odometerKm: 84210 },
    documents: [
      { id: 'doc-1', vehicleId: 'veh-001', name: 'Fitness Certificate', status: 'Expiring', expiryDate: '2026-05-11', daysRemaining: 17 },
      { id: 'doc-2', vehicleId: 'veh-001', name: 'Insurance', status: 'Valid', expiryDate: '2026-09-18', daysRemaining: 147 },
    ],
    tyres: [
      { id: 't1', position: 'FL', axle: 1, pressurePsi: 109, treadMm: 12.2, health: 'Good' },
      { id: 't2', position: 'FR', axle: 1, pressurePsi: 107, treadMm: 11.8, health: 'Good' },
      { id: 't3', position: 'RL1', axle: 2, pressurePsi: 96, treadMm: 7.4, health: 'Watch' },
      { id: 't4', position: 'RR1', axle: 2, pressurePsi: 91, treadMm: 5.3, health: 'Critical' },
    ],
  },
  {
    id: 'veh-002',
    registrationNo: 'GJ 05 FT 9021',
    make: 'Ashok Leyland',
    model: 'Boss 1920',
    year: 2022,
    status: 'Maintenance',
    location: 'Surat Workshop',
    utilization: 62,
    driver: { id: 'drv-2', name: 'Mehul Patel', phone: '+91 91234 56780', licenseNo: 'GJ0520188872134' },
    specs: { vin: 'MB1BOS1920N9021', engineNo: 'H6E49021', fuelType: 'Diesel', capacityKg: 18500, odometerKm: 126900 },
    documents: [
      { id: 'doc-3', vehicleId: 'veh-002', name: 'PUC Certificate', status: 'Expired', expiryDate: '2026-04-18', daysRemaining: -6 },
      { id: 'doc-4', vehicleId: 'veh-002', name: 'National Permit', status: 'Expiring', expiryDate: '2026-05-04', daysRemaining: 10 },
    ],
    tyres: [
      { id: 't5', position: 'FL', axle: 1, pressurePsi: 102, treadMm: 9.7, health: 'Watch' },
      { id: 't6', position: 'FR', axle: 1, pressurePsi: 104, treadMm: 9.2, health: 'Watch' },
      { id: 't7', position: 'RL', axle: 2, pressurePsi: 101, treadMm: 10.1, health: 'Good' },
      { id: 't8', position: 'RR', axle: 2, pressurePsi: 100, treadMm: 9.9, health: 'Good' },
    ],
  },
  {
    id: 'veh-003',
    registrationNo: 'KA 51 CD 7720',
    make: 'Eicher',
    model: 'Pro 3015',
    year: 2021,
    status: 'Inactive',
    location: 'Bengaluru Yard',
    utilization: 28,
    driver: null,
    specs: { vin: 'MC2E3015M77720', engineNo: 'E4947720', fuelType: 'Diesel', capacityKg: 15000, odometerKm: 201440 },
    documents: [
      { id: 'doc-5', vehicleId: 'veh-003', name: 'Insurance', status: 'Expiring', expiryDate: '2026-05-19', daysRemaining: 25 },
    ],
    tyres: [
      { id: 't9', position: 'FL', axle: 1, pressurePsi: 108, treadMm: 13.4, health: 'Good' },
      { id: 't10', position: 'FR', axle: 1, pressurePsi: 108, treadMm: 13.0, health: 'Good' },
      { id: 't11', position: 'RL', axle: 2, pressurePsi: 106, treadMm: 12.1, health: 'Good' },
      { id: 't12', position: 'RR', axle: 2, pressurePsi: 105, treadMm: 12.0, health: 'Good' },
    ],
  },
];

export const demoWorkOrders: MaintenanceWorkOrder[] = [
  {
    id: 'wo-1',
    vehicleId: 'veh-002',
    vehicleRegistration: 'GJ 05 FT 9021',
    title: 'Replace brake liner set',
    priority: 'High',
    status: 'Open',
    dueDate: '2026-04-25',
    technician: 'Workshop A',
    estimatedCost: 65000,
    approvalRequired: 'Fleet Manager',
    approvalStatus: 'Pending',
    missingPartId: 'part-002',
    odometerKm: 126900,
    laborCost: 12000,
    taxAmount: 8200,
    partsUsed: [{ id: 'wop-1', partId: 'part-002', partName: 'Brake Liner Set', partNumber: 'BLS-1920', quantity: 2, unitCost: 22400, status: 'Requested' }],
  },
  {
    id: 'wo-2',
    vehicleId: 'veh-001',
    vehicleRegistration: 'MH 12 VX 4182',
    title: 'Pressure leak inspection',
    priority: 'Medium',
    status: 'In Progress',
    dueDate: '2026-04-27',
    technician: 'Nikhil R.',
    estimatedCost: 18000,
    approvalRequired: 'Garage Manager',
    approvalStatus: 'Approved',
    approvedBy: 'Garage Manager',
    approvedAt: '2026-04-24',
    odometerKm: 84210,
    laborCost: 8500,
    taxAmount: 1700,
    partsUsed: [{ id: 'wop-2', partId: 'part-004', partName: 'Pressure Hose', partNumber: 'PRS-4110', quantity: 1, unitCost: 7800, status: 'Issued', issuedQuantity: 1, inventoryTransactionIds: ['txn-006'] }],
  },
  {
    id: 'wo-3',
    vehicleId: 'veh-003',
    vehicleRegistration: 'KA 51 CD 7720',
    title: 'Battery health audit',
    priority: 'Low',
    status: 'Completed',
    dueDate: '2026-04-22',
    technician: 'Depot Team',
    estimatedCost: 7200,
    approvalRequired: 'Garage Manager',
    approvalStatus: 'Approved',
    approvedBy: 'Garage Manager',
    approvedAt: '2026-04-21',
    closedAt: '2026-04-22',
    odometerKm: 201440,
    laborCost: 4200,
    taxAmount: 900,
    partsUsed: [{ id: 'wop-3', partId: 'part-005', partName: 'Battery Terminal Kit', partNumber: 'BTK-1200', quantity: 1, unitCost: 2100, status: 'Consumed', issuedQuantity: 1, consumedQuantity: 1, inventoryTransactionIds: ['txn-008'] }],
  },
];

export const demoDrivers: FleetDriver[] = [
  { id: 'drv-1', name: 'Aarav Sharma', phone: '+91 98765 43210', licenseNo: 'MH1420190014289', baseLocation: 'Pune DC', licenseClass: 'HMV', licenseExpiryDate: '2027-09-12', medicalExpiryDate: '2026-08-18', assignmentStatus: 'On Trip', behaviorScore: 92, coachingStatus: 'None', aadhaarMasked: 'XXXX-XXXX-4821', bankAccountMasked: 'XXXXXX2190' },
  { id: 'drv-2', name: 'Mehul Patel', phone: '+91 91234 56780', licenseNo: 'GJ0520188872134', baseLocation: 'Surat Workshop', licenseClass: 'HMV Hazmat', licenseExpiryDate: '2026-05-09', medicalExpiryDate: '2026-05-14', assignmentStatus: 'Assigned', behaviorScore: 68, coachingStatus: 'Watch', aadhaarMasked: 'XXXX-XXXX-7134', bankAccountMasked: 'XXXXXX8801' },
  { id: 'drv-3', name: 'Naveen Rao', phone: '+91 99887 77665', licenseNo: 'KA5120174419088', baseLocation: 'Bengaluru Yard', licenseClass: 'LMV Transport', licenseExpiryDate: '2026-04-16', medicalExpiryDate: '2026-11-30', assignmentStatus: 'Inactive', behaviorScore: 46, coachingStatus: 'Coaching Required', aadhaarMasked: 'XXXX-XXXX-9088', bankAccountMasked: 'XXXXXX4412' },
];

export const demoTyreInventory: TyreInventoryItem[] = [
  { id: 'tyre-001', serialNo: 'MRF-24-8841', brand: 'MRF', size: '295/90R20', status: 'Fitted', vehicleId: 'veh-001', vehicleRegistration: 'MH 12 VX 4182', position: 'FL', purchaseDate: '2025-09-12', kmRun: 42100, treadMm: 13.4, pressurePsi: 108, retreadCount: 0, health: 'Good' },
  { id: 'tyre-002', serialNo: 'APL-23-4418', brand: 'Apollo', size: '295/90R20', status: 'Retread', vehicleId: 'veh-002', vehicleRegistration: 'GJ 05 FT 9021', position: 'RR', purchaseDate: '2024-12-02', kmRun: 76220, treadMm: 7.8, pressurePsi: 101, retreadCount: 1, health: 'Watch' },
  { id: 'tyre-003', serialNo: 'CEAT-22-0192', brand: 'CEAT', size: '10.00R20', status: 'Damaged', vehicleId: 'veh-003', vehicleRegistration: 'KA 51 CD 7720', position: 'Spare', purchaseDate: '2024-05-18', kmRun: 96300, treadMm: 3.9, pressurePsi: 88, retreadCount: 2, health: 'Critical' },
  { id: 'tyre-004', serialNo: 'JK-26-7750', brand: 'JK Tyre', size: '295/90R20', status: 'Spare', purchaseDate: '2026-01-08', kmRun: 0, treadMm: 16.2, pressurePsi: 110, retreadCount: 0, health: 'Good' },
];

export const demoTyreInspections: TyreInspection[] = [
  { id: 'tin-001', tyreId: 'tyre-001', tyreSerialNo: 'MRF-24-8841', vehicleRegistration: 'MH 12 VX 4182', inspectionDate: '2026-04-24', inspector: 'Nikhil R.', pressurePsi: 108, treadMm: 13.4, status: 'Passed', notes: 'Normal wear pattern.' },
  { id: 'tin-002', tyreId: 'tyre-002', tyreSerialNo: 'APL-23-4418', vehicleRegistration: 'GJ 05 FT 9021', inspectionDate: '2026-04-23', inspector: 'Workshop A', pressurePsi: 101, treadMm: 7.8, status: 'Watch', notes: 'Monitor after retread cycle.' },
  { id: 'tin-003', tyreId: 'tyre-003', tyreSerialNo: 'CEAT-22-0192', vehicleRegistration: 'KA 51 CD 7720', inspectionDate: '2026-04-22', inspector: 'Depot Team', pressurePsi: 88, treadMm: 3.9, status: 'Failed', notes: 'Sidewall damage detected.' },
];

export const demoTyreJobCards: TyreJobCard[] = [
  { id: 'tjc-001', tyreId: 'tyre-003', tyreSerialNo: 'CEAT-22-0192', vehicleRegistration: 'KA 51 CD 7720', title: 'Scrap damaged tyre', status: 'Open', action: 'Scrap', assignedTo: 'Workshop A', dueDate: '2026-04-26', estimatedCost: 0 },
  { id: 'tjc-002', tyreId: 'tyre-002', tyreSerialNo: 'APL-23-4418', vehicleRegistration: 'GJ 05 FT 9021', title: 'Retread quality check', status: 'In Progress', action: 'Retread', assignedTo: 'Nikhil R.', dueDate: '2026-04-28', estimatedCost: 8500 },
];

export const demoBatteries: BatteryAsset[] = [
  {
    id: 'bat-001',
    serialNo: 'EXD-24-1182',
    brand: 'Exide',
    chemistry: 'Lead Acid',
    capacityAh: 180,
    voltage: 24.4,
    healthPercent: 91,
    status: 'Healthy',
    vehicleId: 'veh-001',
    vehicleRegistration: 'MH 12 VX 4182',
    position: 'Primary',
    purchaseDate: '2025-08-12',
    warrantyExpiryDate: '2027-08-11',
    lastInspectionDate: '2026-04-20',
    replacementDueDate: '2027-02-12',
    inspections: [{ id: 'bti-001', inspectedAt: '2026-04-20', inspector: 'Nikhil R.', healthPercent: 91, voltage: 24.4, notes: 'Charging profile normal.' }],
    replacements: [],
  },
  {
    id: 'bat-002',
    serialNo: 'AMA-23-9044',
    brand: 'Amaron',
    chemistry: 'AGM',
    capacityAh: 160,
    voltage: 22.7,
    healthPercent: 63,
    status: 'Weak',
    vehicleId: 'veh-002',
    vehicleRegistration: 'GJ 05 FT 9021',
    position: 'Primary',
    purchaseDate: '2024-10-02',
    warrantyExpiryDate: '2026-10-01',
    lastInspectionDate: '2026-04-22',
    replacementDueDate: '2026-08-15',
    inspections: [{ id: 'bti-002', inspectedAt: '2026-04-22', inspector: 'Workshop A', healthPercent: 63, voltage: 22.7, notes: 'Voltage sag under crank load.' }],
    replacements: [{ id: 'btr-001', replacedAt: '2024-10-02', oldSerialNo: 'OLD-19-5521', newSerialNo: 'AMA-23-9044', reason: 'End of lifecycle' }],
  },
  {
    id: 'bat-003',
    serialNo: 'LTH-22-3019',
    brand: 'Livguard',
    chemistry: 'Lithium Ion',
    capacityAh: 120,
    voltage: 20.9,
    healthPercent: 38,
    status: 'Replace',
    vehicleId: 'veh-003',
    vehicleRegistration: 'KA 51 CD 7720',
    position: 'Auxiliary',
    purchaseDate: '2023-12-18',
    warrantyExpiryDate: '2025-12-17',
    lastInspectionDate: '2026-04-21',
    replacementDueDate: '2026-04-30',
    inspections: [{ id: 'bti-003', inspectedAt: '2026-04-21', inspector: 'Depot Team', healthPercent: 38, voltage: 20.9, notes: 'Replacement recommended before dispatch.' }],
    replacements: [],
  },
];

export const demoFuelEvents: FuelEvent[] = [
  { id: 'fuel-1', vehicleId: 'veh-001', vehicleRegistration: 'MH 12 VX 4182', driverName: 'Aarav Sharma', dateTime: '2026-04-24 08:40', fuelType: 'Diesel', odometerKm: 84210, telematicsOdometerKm: 84190, quantityLitres: 110, unitCost: 92.4, totalAmount: 10164, pumpLocation: 'HPCL Chakan', receiptReference: 'HPCL-49210', economyKmpl: 7.6, baselineKmpl: 8.2, status: 'Posted', reconciliationStatus: 'Matched', flags: [] },
  { id: 'fuel-2', vehicleId: 'veh-002', vehicleRegistration: 'GJ 05 FT 9021', driverName: 'Mehul Patel', dateTime: '2026-04-23 21:15', fuelType: 'Diesel', odometerKm: 126900, telematicsOdometerKm: 123640, quantityLitres: 320, unitCost: 91.8, totalAmount: 29376, pumpLocation: 'IOCL Ankleshwar', receiptReference: 'IOCL-77104', economyKmpl: 5.5, baselineKmpl: 8.0, status: 'Flagged', reconciliationStatus: 'Queued', flags: ['Odometer variance above 2%', 'Quantity exceeds tank capacity', 'Fuel economy below 80% baseline'] },
  { id: 'fuel-3', vehicleId: 'veh-003', vehicleRegistration: 'KA 51 CD 7720', driverName: 'Unassigned', dateTime: '2026-04-22 13:05', fuelType: 'Diesel', odometerKm: 201440, telematicsOdometerKm: 201420, quantityLitres: 60, unitCost: 93.1, totalAmount: 5586, pumpLocation: 'Depot Bowser', receiptReference: 'DEPOT-118', economyKmpl: 6.9, baselineKmpl: 7.4, status: 'Under Review', reconciliationStatus: 'Queued', flags: ['Sudden fuel-level drop without fill event'] },
];

export const demoDispatchAssignments: DispatchAssignment[] = [
  {
    id: 'dsp-001',
    vehicleId: 'veh-001',
    vehicleRegistration: 'MH 12 VX 4182',
    driverId: 'drv-1',
    driverName: 'Aarav Sharma',
    routeName: 'Pune DC to Mumbai Hub',
    origin: 'Pune DC',
    destination: 'Mumbai Hub',
    plannedStart: '2026-04-25 18:00',
    status: 'Assigned',
    createdAt: '2026-04-24',
    createdBy: 'Rahul Mehta',
  },
];

export const demoAlerts: FleetAlert[] = [
  { id: 'alert-1', title: 'Dispatch blocked: PUC expired', detail: 'GJ 05 FT 9021 cannot be assigned until PUC is renewed.', severity: 'Critical', status: 'Open', entityType: 'Vehicle', entityId: 'veh-002', entityLabel: 'GJ 05 FT 9021', source: 'Compliance', createdAt: '2026-04-24', assignedTo: 'Fleet Manager', recipient: 'Fleet Manager, Ops Head', channel: 'In-app + SMS + Email' },
  { id: 'alert-2', title: 'Fuel anomaly for review', detail: 'IOCL fill has odometer variance above 2% and low economy.', severity: 'High', status: 'Open', entityType: 'Vehicle', entityId: 'veh-002', entityLabel: 'GJ 05 FT 9021', source: 'Fuel', createdAt: '2026-04-23', assignedTo: 'Finance Manager', recipient: 'Fleet Manager, Finance', channel: 'In-app + Email' },
  { id: 'alert-3', title: 'PM service due', detail: 'MH 12 VX 4182 crossed 10,000 km oil-change threshold.', severity: 'Medium', status: 'Open', entityType: 'WorkOrder', entityId: 'wo-2', entityLabel: 'Pressure leak inspection', source: 'Maintenance', createdAt: '2026-04-22', assignedTo: 'Garage Manager', recipient: 'Garage Manager', channel: 'In-app + Email' },
  { id: 'alert-4', title: 'Driver readiness blocked', detail: 'Naveen Rao has an expired license and coaching requirement.', severity: 'High', status: 'Open', entityType: 'Driver', entityId: 'drv-3', entityLabel: 'Naveen Rao', source: 'Dispatch', createdAt: '2026-04-24', assignedTo: 'Fleet Manager', recipient: 'Fleet Manager', channel: 'In-app + Email' },
];

export const demoAlertRules: AlertRule[] = [
  { id: 'rule-001', name: 'Expired compliance gate', module: 'Compliance', severity: 'Critical', status: 'Active', condition: 'document.status = expired OR daysRemaining < 0', recipient: 'Fleet Manager, Ops Head', channel: 'In-app + SMS + Email', cooldownMinutes: 60, createdAt: '2026-04-01' },
  { id: 'rule-002', name: 'Fuel odometer variance', module: 'Fuel', severity: 'High', status: 'Active', condition: 'abs(fuel.odometer - telematics.odometer) > 2%', recipient: 'Fleet Manager, Finance', channel: 'In-app + Email', cooldownMinutes: 120, createdAt: '2026-04-03' },
  { id: 'rule-003', name: 'PM threshold crossed', module: 'Maintenance', severity: 'Medium', status: 'Paused', condition: 'vehicle.odometerSinceService > 10000', recipient: 'Garage Manager', channel: 'In-app + Email', cooldownMinutes: 1440, createdAt: '2026-04-05' },
];

export const demoPartsInventory: PartInventoryItem[] = [
  { id: 'part-001', partId: 'part-001', partName: 'Oil Filter Kit', partNumber: 'OFK-5530', category: 'Maintenance', unit: 'kit', minimumStockLevel: 6, currentStock: 11, partStatus: 'Active', vendorId: 'ven-001', vendorName: 'Pune Auto Spares', unitCost: 1450, stockOnHand: 11, reorderPoint: 6, status: 'In Stock' },
  { id: 'part-002', partId: 'part-002', partName: 'Brake Liner Set', partNumber: 'BLS-1920', category: 'Brake', unit: 'set', minimumStockLevel: 4, currentStock: 0, partStatus: 'Active', vendorId: 'ven-002', vendorName: 'Surat Brake House', unitCost: 22400, stockOnHand: 0, reorderPoint: 4, status: 'PR Raised', linkedWorkOrderId: 'wo-1', urgency: 'Urgent' },
  { id: 'part-003', partId: 'part-003', partName: 'Battery 24V', partNumber: 'BAT-24V-HD', category: 'Electrical', unit: 'unit', minimumStockLevel: 3, currentStock: 2, partStatus: 'Active', vendorId: 'ven-003', vendorName: 'Battery World', unitCost: 11800, stockOnHand: 2, reorderPoint: 3, status: 'Low Stock' },
  { id: 'part-004', partId: 'part-004', partName: 'Pressure Hose', partNumber: 'PRS-4110', category: 'Hydraulics', unit: 'piece', minimumStockLevel: 2, currentStock: 3, partStatus: 'Active', vendorId: 'ven-001', vendorName: 'Pune Auto Spares', unitCost: 7800, stockOnHand: 3, reorderPoint: 2, status: 'In Stock' },
  { id: 'part-005', partId: 'part-005', partName: 'Battery Terminal Kit', partNumber: 'BTK-1200', category: 'Electrical', unit: 'kit', minimumStockLevel: 5, currentStock: 7, partStatus: 'Active', vendorId: 'ven-003', vendorName: 'Battery World', unitCost: 2100, stockOnHand: 7, reorderPoint: 5, status: 'In Stock' },
  { id: 'part-006', partId: 'part-006', partName: 'Legacy Air Filter', partNumber: 'LAF-9000', category: 'Maintenance', unit: 'piece', minimumStockLevel: 2, currentStock: 4, partStatus: 'Inactive', vendorName: 'Legacy Stock', unitCost: 950, stockOnHand: 4, reorderPoint: 2, status: 'In Stock' },
];

export const demoParts: Part[] = demoPartsInventory.map((item) => ({
  partId: item.partId ?? item.id,
  partName: item.partName,
  category: item.category ?? 'Unclassified',
  unit: item.unit ?? 'unit',
  minimumStockLevel: item.minimumStockLevel ?? item.reorderPoint,
  currentStock: item.currentStock ?? item.stockOnHand,
  status: item.partStatus ?? 'Active',
  partNumber: item.partNumber,
  unitCost: item.unitCost,
  vendorId: item.vendorId,
  vendorName: item.vendorName,
}));

export const demoInventoryTransactions: InventoryTransaction[] = [
  { transactionId: 'txn-001', partId: 'part-001', quantity: 14, type: 'INWARD', referenceType: 'Purchase', referenceId: 'PO-PAS-2241', performedBy: 'Rahul Mehta', timestamp: '2026-04-20T09:30:00+05:30', remarks: 'Initial stock from Pune Auto Spares.' },
  { transactionId: 'txn-002', partId: 'part-001', quantity: 3, type: 'OUTWARD', referenceType: 'Work Order', referenceId: 'wo-2', performedBy: 'Nikhil R.', timestamp: '2026-04-24T11:45:00+05:30', remarks: 'Issued for routine service kit.' },
  { transactionId: 'txn-003', partId: 'part-002', quantity: 2, type: 'INWARD', referenceType: 'Purchase', referenceId: 'PO-SBH-9182', performedBy: 'Rahul Mehta', timestamp: '2026-04-22T10:10:00+05:30' },
  { transactionId: 'txn-004', partId: 'part-002', quantity: 2, type: 'OUTWARD', referenceType: 'Work Order', referenceId: 'wo-1', performedBy: 'Workshop A', timestamp: '2026-04-24T16:20:00+05:30', remarks: 'Brake liner set requested for high priority work order.' },
  { transactionId: 'txn-005', partId: 'part-003', quantity: 2, type: 'INWARD', referenceType: 'Manual', referenceId: 'OPENING-STOCK', performedBy: 'Rahul Mehta', timestamp: '2026-04-18T08:00:00+05:30', remarks: 'Opening stock setup.' },
  { transactionId: 'txn-006', partId: 'part-004', quantity: 4, type: 'INWARD', referenceType: 'Purchase', referenceId: 'PO-PAS-2242', performedBy: 'Rahul Mehta', timestamp: '2026-04-23T12:00:00+05:30' },
  { transactionId: 'txn-007', partId: 'part-004', quantity: 1, type: 'OUTWARD', referenceType: 'Work Order', referenceId: 'wo-2', performedBy: 'Nikhil R.', timestamp: '2026-04-24T13:15:00+05:30', remarks: 'Issued to pressure leak inspection.' },
  { transactionId: 'txn-008', partId: 'part-005', quantity: 8, type: 'INWARD', referenceType: 'Manual', referenceId: 'OPENING-STOCK', performedBy: 'Depot Team', timestamp: '2026-04-18T08:10:00+05:30' },
  { transactionId: 'txn-009', partId: 'part-005', quantity: 1, type: 'OUTWARD', referenceType: 'Work Order', referenceId: 'wo-3', performedBy: 'Depot Team', timestamp: '2026-04-22T15:45:00+05:30', remarks: 'Consumed during battery health audit.' },
  { transactionId: 'txn-010', partId: 'part-006', quantity: 4, type: 'INWARD', referenceType: 'Manual', referenceId: 'OPENING-STOCK', performedBy: 'Rahul Mehta', timestamp: '2026-04-18T08:15:00+05:30', remarks: 'Inactive legacy item retained for audit.' },
];

export const demoVendorLedger: VendorLedgerEntry[] = [
  { id: 'led-001', vendorId: 'ven-001', vendorName: 'Pune Auto Spares', invoiceNo: 'PAS-2241', invoiceDate: '2026-04-20', amount: 43500, paidAmount: 43500, status: 'Paid', category: 'Parts' },
  { id: 'led-002', vendorId: 'ven-002', vendorName: 'Surat Brake House', invoiceNo: 'SBH-9182', invoiceDate: '2026-04-23', amount: 67200, paidAmount: 0, status: 'Open', category: 'Maintenance' },
  { id: 'led-003', vendorId: 'ven-003', vendorName: 'Battery World', invoiceNo: 'BTW-7704', invoiceDate: '2026-04-19', amount: 23600, paidAmount: 12000, status: 'Part Paid', category: 'Parts' },
  { id: 'led-004', vendorId: 'ven-004', vendorName: 'IOCL Ankleshwar', invoiceNo: 'IOCL-77104', invoiceDate: '2026-04-23', amount: 29376, paidAmount: 0, status: 'Disputed', category: 'Fuel' },
];

export const demoTelematics: TelematicsSignal[] = [
  { id: 'gps-1', vehicleId: 'veh-001', vehicleRegistration: 'MH 12 VX 4182', location: 'Mumbai-Pune Expressway', speedKmph: 72, ignition: 'On', fuelLevelPercent: 64, deviceStatus: 'Online', lastPingSeconds: 1, routeDeviationKm: 0.8 },
  { id: 'gps-2', vehicleId: 'veh-002', vehicleRegistration: 'GJ 05 FT 9021', location: 'Surat Workshop', speedKmph: 0, ignition: 'Off', fuelLevelPercent: 21, deviceStatus: 'Fault', lastPingSeconds: 46, routeDeviationKm: 0 },
  { id: 'gps-3', vehicleId: 'veh-003', vehicleRegistration: 'KA 51 CD 7720', location: 'Bengaluru Yard', speedKmph: 0, ignition: 'Off', fuelLevelPercent: 48, deviceStatus: 'Offline', lastPingSeconds: 320, routeDeviationKm: 0 },
];

export const demoReportMetrics: FleetReportMetric[] = [
  { id: 'rep-1', label: 'Fleet Health Score', value: '78/100', trend: 'Compliance drag from 3 exceptions', exportFormats: ['Excel', 'PDF', 'CSV'] },
  { id: 'rep-2', label: 'Cost per KM by Vehicle', value: 'Rs 38.40/km', trend: 'GJ 05 FT 9021 above baseline', exportFormats: ['Excel', 'PDF', 'CSV'] },
  { id: 'rep-3', label: 'Maintenance Cost Trend', value: 'Rs 1.10L', trend: 'High brake spend this month', exportFormats: ['Excel', 'PDF', 'CSV'] },
  { id: 'rep-4', label: 'Tyre Replacement Forecast', value: '4 tyres', trend: '1 critical replacement queue', exportFormats: ['Excel', 'PDF', 'CSV'] },
];

export const demoCostDrilldowns: CostHealthDrilldown[] = [
  { id: 'cost-001', metricId: 'rep-2', title: 'GJ 05 FT 9021 fuel variance', costCenter: 'Fuel', amount: 29376, variancePercent: 18, status: 'Critical', recommendation: 'Resolve flagged fuel event before month-end posting.' },
  { id: 'cost-002', metricId: 'rep-3', title: 'Brake liner replacement spike', costCenter: 'Maintenance', amount: 65000, variancePercent: 22, status: 'Watch', recommendation: 'Compare brake wear by route and driver behavior.' },
  { id: 'cost-003', metricId: 'rep-4', title: 'Retread queue exposure', costCenter: 'Tyre', amount: 8500, variancePercent: 9, status: 'Watch', recommendation: 'Approve retread job cards before scrap threshold.' },
  { id: 'cost-004', metricId: 'rep-1', title: 'Compliance exception drag', costCenter: 'Compliance', amount: 0, variancePercent: 6, status: 'Healthy', recommendation: 'Close expiring documents to improve dispatch readiness.' },
];
