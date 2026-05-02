export type VehicleStatus = 'Active' | 'Maintenance' | 'Inactive';

export type VehicleDocumentType = 'RC' | 'Insurance' | 'PUC' | 'FC' | 'NationalPermit' | 'FASTag' | 'RoutePermit';
export type DriverDocumentType = 'DL' | 'MedicalCertificate' | 'Badge' | 'PSVBadge' | 'PoliceVerification' | 'Aadhaar';
export type DocumentDispatchImpact = 'Block' | 'Warn' | 'None';

export interface DocumentUploadEntry {
  referenceNo: string;
  expiryDate: string;
  fileName: string;
  fileSize: number;
}

export interface VehicleDocumentConfig {
  type: VehicleDocumentType;
  label: string;
  alertLeadDays: number;
  dispatchImpact: DocumentDispatchImpact;
  hasExpiry: boolean;
  renewalCycle: string;
}

export interface DriverDocumentConfig {
  type: DriverDocumentType;
  label: string;
  alertLeadDays: number;
  dispatchImpact: DocumentDispatchImpact;
  hasExpiry: boolean;
  renewalCycle: string;
}
export type DocumentStatus = 'Valid' | 'Expiring' | 'Expired';
export type WorkOrderStatus = 'Open' | 'In Progress' | 'Pending Inspection' | 'Completed';
export type WorkOrderApprovalStatus = 'Not Required' | 'Pending' | 'Approved';
export type TyreHealth = 'Good' | 'Watch' | 'Critical';
export type TyreInventoryStatus = 'Fitted' | 'Spare' | 'Damaged' | 'Retread' | 'Scrapped';
export type TyreInspectionStatus = 'Passed' | 'Watch' | 'Failed';
export type TyreJobCardStatus = 'Open' | 'In Progress' | 'Completed';
export type AssignmentStatus = 'Available' | 'Assigned' | 'On Trip' | 'Inactive';
export type AlertPriority = 'Medium' | 'High' | 'Critical';
export type ExceptionStatus = 'Open' | 'Resolved';
export type AlertEntityType = 'Vehicle' | 'Driver' | 'WorkOrder' | 'Part' | 'Dispatch';
export type FleetTaskType = 'compliance' | 'maintenance' | 'inventory' | 'dispatch';
export type FleetTaskStatus = 'Open' | 'In Progress' | 'Completed';
export type AlertRuleStatus = 'Active' | 'Paused' | 'Draft';
export type BatteryStatus = 'Healthy' | 'Weak' | 'Needs Charge' | 'Replace' | 'Scrapped';
export type FuelEventStatus = 'Posted' | 'Flagged' | 'Under Review';
export type FuelType = 'Diesel' | 'Petrol' | 'CNG' | 'EV';
export type FuelReconciliationStatus = 'Queued' | 'Matched' | 'Approved' | 'Rejected';
export type PartStockStatus = 'In Stock' | 'Low Stock' | 'Out of Stock' | 'PR Raised';
export type PartStatus = 'Active' | 'Inactive';
export type InventoryStockStatus = 'In Stock' | 'Low Stock' | 'Out of Stock' | 'Inactive';
export type InventoryTransactionType = 'INWARD' | 'OUTWARD' | 'ADJUSTMENT' | 'REVERSAL' | 'RETURN';
export type InventoryReferenceType = 'Work Order' | 'Purchase' | 'Manual' | 'Adjustment';
export type StockInwardSource = 'Purchase' | 'Manual' | 'Adjustment';
export type WorkOrderPartUsageStatus = 'Requested' | 'Reserved' | 'Issued' | 'Consumed' | 'Returned' | 'Reversed';

export interface Driver {
  id: string;
  name: string;
  phone: string;
  licenseNo: string;
}

export interface FleetDriver extends Driver {
  baseLocation: string;
  licenseClass: string;
  licenseExpiryDate: string;
  medicalExpiryDate: string;
  assignmentStatus: AssignmentStatus;
  behaviorScore: number;
  coachingStatus: 'None' | 'Watch' | 'Coaching Required';
  aadhaarMasked: string;
  bankAccountMasked: string;
}

export interface FleetDocument {
  id: string;
  vehicleId: string;
  name: string;
  status: DocumentStatus;
  expiryDate: string;
  daysRemaining: number;
}

export interface TechnicalSpecs {
  vin: string;
  engineNo: string;
  fuelType: string;
  capacityKg: number;
  odometerKm: number;
}

export interface TyreSignal {
  id: string;
  position: string;
  axle: number;
  pressurePsi: number;
  treadMm: number;
  health: TyreHealth;
}

export interface TyreInventoryItem {
  id: string;
  serialNo: string;
  brand: string;
  size: string;
  status: TyreInventoryStatus;
  vehicleId?: string;
  vehicleRegistration?: string;
  position?: string;
  purchaseDate: string;
  kmRun: number;
  treadMm: number;
  pressurePsi: number;
  retreadCount: number;
  health: TyreHealth;
}

export interface TyreInspection {
  id: string;
  tyreId: string;
  tyreSerialNo: string;
  vehicleRegistration?: string;
  inspectionDate: string;
  inspector: string;
  pressurePsi: number;
  treadMm: number;
  status: TyreInspectionStatus;
  notes: string;
}

export interface TyreJobCard {
  id: string;
  tyreId: string;
  tyreSerialNo: string;
  vehicleRegistration?: string;
  title: string;
  status: TyreJobCardStatus;
  action: 'Fitment' | 'Rotation' | 'Retread' | 'Repair' | 'Scrap';
  assignedTo: string;
  dueDate: string;
  estimatedCost: number;
}

export interface BatteryInspection {
  id: string;
  inspectedAt: string;
  inspector: string;
  healthPercent: number;
  voltage: number;
  notes: string;
}

export interface BatteryReplacement {
  id: string;
  replacedAt: string;
  oldSerialNo: string;
  newSerialNo: string;
  reason: string;
}

export interface BatteryAsset {
  id: string;
  serialNo: string;
  brand: string;
  chemistry: 'Lead Acid' | 'AGM' | 'Lithium Ion';
  capacityAh: number;
  voltage: number;
  healthPercent: number;
  status: BatteryStatus;
  vehicleId?: string;
  vehicleRegistration?: string;
  position?: string;
  purchaseDate: string;
  warrantyExpiryDate: string;
  lastInspectionDate: string;
  replacementDueDate: string;
  inspections: BatteryInspection[];
  replacements: BatteryReplacement[];
}

export interface Vehicle {
  id: string;
  registrationNo: string;
  make: string;
  model: string;
  year: number;
  status: VehicleStatus;
  location: string;
  utilization: number;
  driver: Driver | null;
  specs: TechnicalSpecs;
  documents: FleetDocument[];
  tyres: TyreSignal[];
}

export interface MaintenanceWorkOrder {
  id: string;
  vehicleId: string;
  vehicleRegistration: string;
  title: string;
  priority: 'Low' | 'Medium' | 'High';
  status: WorkOrderStatus;
  dueDate: string;
  technician: string;
  estimatedCost?: number;
  approvalRequired?: 'Garage Manager' | 'Fleet Manager' | 'COO';
  approvalStatus?: WorkOrderApprovalStatus;
  approvedBy?: string;
  approvedAt?: string;
  closedAt?: string;
  odometerKm?: number;
  laborCost?: number;
  taxAmount?: number;
  missingPartId?: string;
  partsUsed?: WorkOrderPartUsage[];
}

export interface WorkOrderPartUsage {
  id: string;
  partId?: string;
  partName: string;
  partNumber: string;
  quantity: number;
  unitCost: number;
  status?: WorkOrderPartUsageStatus;
  issuedQuantity?: number;
  consumedQuantity?: number;
  returnedQuantity?: number;
  inventoryTransactionIds?: string[];
}

export interface FuelEvent {
  id: string;
  vehicleId: string;
  vehicleRegistration: string;
  driverName: string;
  dateTime: string;
  fuelType?: FuelType;
  odometerKm: number;
  telematicsOdometerKm: number;
  quantityLitres: number;
  unitCost: number;
  totalAmount: number;
  pumpLocation: string;
  receiptReference: string;
  economyKmpl: number;
  baselineKmpl: number;
  status: FuelEventStatus;
  reconciliationStatus?: FuelReconciliationStatus;
  reviewDecision?: 'Approved' | 'Rejected';
  reviewNote?: string;
  reviewedAt?: string;
  reviewedBy?: string;
  flags: string[];
}

export interface DispatchAssignment {
  id: string;
  vehicleId: string;
  vehicleRegistration: string;
  driverId: string;
  driverName: string;
  routeName: string;
  origin: string;
  destination: string;
  plannedStart: string;
  status: 'Planned' | 'Assigned' | 'Blocked';
  createdAt: string;
  createdBy: string;
}

export interface FleetAlert {
  id: string;
  title: string;
  detail: string;
  priority?: AlertPriority;
  severity: AlertPriority;
  status: ExceptionStatus;
  entityType: AlertEntityType;
  entityId: string;
  entityLabel: string;
  source?: 'Compliance' | 'Fuel' | 'Maintenance' | 'Dispatch' | 'Telematics';
  createdAt?: string;
  assignedTo?: string;
  resolvedAt?: string;
  resolvedBy?: string;
  resolutionNote?: string;
  recipient: string;
  channel: string;
}

export interface FleetTaskAudit {
  createdBy: string;
  assignedBy?: string;
  completedBy?: string;
  completedAt?: string;
}

export interface FleetTask {
  id: string;
  title: string;
  type: FleetTaskType;
  severity: AlertPriority;
  relatedEntityType: AlertEntityType;
  relatedEntityId: string;
  relatedEntityLabel: string;
  assignedTo: string;
  assignedRole: string;
  status: FleetTaskStatus;
  dueAt: string;
  createdAt: string;
  updatedAt: string;
  sourceId: string;
  sourceType: 'Alert' | 'Dispatch' | 'WorkOrder' | 'Inventory';
  audit: FleetTaskAudit;
}

export interface FleetTaskOverride {
  assignedBy?: string;
  assignedTo?: string;
  assignedRole?: string;
  completedAt?: string;
  completedBy?: string;
  status?: FleetTaskStatus;
  updatedAt?: string;
}

export interface AlertRule {
  id: string;
  name: string;
  module: 'Compliance' | 'Fuel' | 'Maintenance' | 'Dispatch' | 'Telematics';
  severity: AlertPriority;
  status: AlertRuleStatus;
  condition: string;
  recipient: string;
  channel: string;
  cooldownMinutes: number;
  createdAt: string;
}

export interface PartInventoryItem {
  id: string;
  partId?: string;
  partName: string;
  partNumber: string;
  category?: string;
  unit?: string;
  minimumStockLevel?: number;
  currentStock?: number;
  partStatus?: PartStatus;
  vendorId?: string;
  vendorName?: string;
  unitCost?: number;
  stockOnHand: number;
  reorderPoint: number;
  status: PartStockStatus;
  linkedWorkOrderId?: string;
  urgency?: 'Normal' | 'Urgent';
}

export interface Part {
  partId: string;
  partName: string;
  category: string;
  unit: string;
  minimumStockLevel: number;
  currentStock: number;
  status: PartStatus;
  partNumber?: string;
  unitCost?: number;
  vendorId?: string;
  vendorName?: string;
}

export interface InventoryTransaction {
  transactionId: string;
  partId: string;
  quantity: number;
  type: InventoryTransactionType;
  referenceType: InventoryReferenceType;
  referenceId?: string;
  performedBy: string;
  timestamp: string;
  remarks?: string;
}

export interface VendorLedgerEntry {
  id: string;
  vendorId: string;
  vendorName: string;
  invoiceNo: string;
  invoiceDate: string;
  amount: number;
  paidAmount: number;
  status: 'Open' | 'Part Paid' | 'Paid' | 'Disputed';
  category: 'Parts' | 'Fuel' | 'Tyre' | 'Maintenance';
}

export interface CostHealthDrilldown {
  id: string;
  metricId: string;
  title: string;
  costCenter: string;
  amount: number;
  variancePercent: number;
  status: 'Healthy' | 'Watch' | 'Critical';
  recommendation: string;
}

export interface TelematicsSignal {
  id: string;
  vehicleId: string;
  vehicleRegistration: string;
  location: string;
  speedKmph: number;
  ignition: 'On' | 'Off';
  fuelLevelPercent: number;
  deviceStatus: 'Online' | 'Fault' | 'Offline';
  lastPingSeconds: number;
  routeDeviationKm: number;
}

export interface FleetReportMetric {
  id: string;
  label: string;
  value: string;
  trend: string;
  exportFormats: Array<'Excel' | 'PDF' | 'CSV'>;
}

export interface OperationalDataState {
  vehicles: Vehicle[];
  drivers: FleetDriver[];
  workOrders: MaintenanceWorkOrder[];
  fuelEvents: FuelEvent[];
  tyreInventory: TyreInventoryItem[];
  tyreInspections: TyreInspection[];
  tyreJobCards: TyreJobCard[];
  batteries: BatteryAsset[];
  dispatchAssignments: DispatchAssignment[];
  alerts: FleetAlert[];
  alertRules: AlertRule[];
  partsInventory: PartInventoryItem[];
  inventoryTransactions: InventoryTransaction[];
  vendorLedger: VendorLedgerEntry[];
  costDrilldowns: CostHealthDrilldown[];
  telematics: TelematicsSignal[];
  reportMetrics: FleetReportMetric[];
  tasks: FleetTask[];
  loading: boolean;
  error: string | null;
}
