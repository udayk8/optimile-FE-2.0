
export enum VehicleType {
  TRUCK = 'Truck',
  CONTAINER = 'Container',
  TRAILER = 'Trailer',
  TANKER = 'Tanker'
}

export enum AxleConfiguration {
  AXLE_4X2 = '4x2',
  AXLE_6X2 = '6x2',
  AXLE_6X4 = '6x4',
  AXLE_MULTI = 'Multi-Axle'
}

export enum VehicleStatus {
  ACTIVE = 'Active',
  MAINTENANCE = 'Maintenance',
  INACTIVE = 'Inactive',
  DRAFT = 'Draft',
  RETIRED = 'Retired'
}

export enum OwnershipType {
  OWNED = 'Owned',
  LEASED = 'Leased',
  RENTED = 'Rented'
}

export enum FuelType {
  DIESEL = 'Diesel',
  CNG = 'CNG',
  ELECTRIC = 'Electric'
}

export enum EmissionStandard {
  BS4 = 'BS4',
  BS6 = 'BS6',
  BS3 = 'BS3'
}

export interface Vehicle {
  vehicle_id: string;
  registration_number: string;
  vehicle_type: VehicleType;
  axle_configuration: AxleConfiguration;
  capacity_tons: number;
  status: VehicleStatus;
  assigned_driver_id: string | null;
  created_at: string;
  chassis_number?: string;
  engine_number?: string;
  make?: string;
  model?: string;
  manufacturing_year?: number;
  ownership_type?: OwnershipType;
  fuel_type?: FuelType;
  emission_standard?: EmissionStandard;
  gvw_tons?: number;
  body_type?: string;
  maintenance_template_id?: string;
  marketplace_provider_id?: string; // Set when ownership is Rented or Leased
}

export type MarketplaceProviderCategory = 'Rental' | 'Leasing' | 'Contract';

export interface MarketplaceProvider {
  provider_id: string;
  name: string;
  category: MarketplaceProviderCategory;
  contact_name: string;
  phone: string;
  email?: string;
  city: string;
  status: 'Active' | 'Inactive';
  created_at: string;
  // Extended vendor details
  gstin?: string;
  pan?: string;
  address?: string;
  website?: string;
  fleet_size?: number;
  lease_term_months?: number;
  contract_start_date?: string;
  contract_end_date?: string;
  account_manager?: string;
  account_manager_phone?: string;
}

export enum DriverStatus {
  ACTIVE = 'Active',
  INACTIVE = 'Inactive',
  SUSPENDED = 'Suspended',
  ON_LEAVE = 'On Leave',
  DRAFT = 'Draft'
}

export enum DriverType {
  PERMANENT = 'Permanent',
  CONTRACT = 'Contract',
  TEMPORARY = 'Temporary'
}

export interface Driver {
  driver_id: string;
  name: string;
  phone: string;
  alternate_phone?: string;
  license_number: string;
  license_expiry_date: string;
  status: DriverStatus;
  assigned_vehicle_id: string | null;
  created_at: string;
  driver_type: DriverType;
  home_location?: string;
  employment_start_date?: string;
  profile_picture_url?: string;
  assigned_hub?: string;
  preferred_routes?: string;
}

export enum TripStatus {
  PLANNED = 'Planned',
  DISPATCHED = 'Dispatched',
  IN_TRANSIT = 'In Transit',
  COMPLETED = 'Completed',
  CANCELLED = 'Cancelled'
}

export interface Trip {
  trip_id: string;
  booking_reference: string;
  origin: string;
  destination: string;
  scheduled_start_time: string;
  status: TripStatus;
  vehicle_id: string | null;
  driver_id: string | null;
  created_at: string;
  estimated_distance_km?: number; // Planned route distance — seeded per trip
}

export enum MaintenanceType {
  SERVICE = 'Service',
  REPAIR = 'Repair',
  INSPECTION = 'Inspection'
}

export interface MaintenanceSchedule {
  schedule_id: string;
  vehicle_id: string;
  maintenance_type: MaintenanceType;
  next_due_km: number;
  next_due_date: string;
  status: 'Upcoming' | 'Due' | 'Overdue';
}

export enum WorkOrderStatus {
  OPEN = 'Open',
  IN_PROGRESS = 'In Progress',
  COMPLETED = 'Completed',
  CLOSED = 'Closed'
}

export enum WorkOrderType {
  REPAIR = 'Repair',
  BREAKDOWN = 'Breakdown',
  SERVICE = 'Service'
}

export enum WorkshopType {
  INTERNAL = 'Internal',
  THIRD_PARTY = 'Third Party',
  ROADSIDE = 'Roadside'
}

export enum IssueSource {
  DRIVER = 'Driver',
  OPS = 'Ops',
  TELEMATICS = 'Telematics',
  SYSTEM = 'System'
}

export enum ConfidenceFlag {
  ACTUAL = 'Actual',
  ESTIMATED = 'Estimated',
  HIGH = 'High',
  MEDIUM = 'Medium',
  LOW = 'Low'
}

export interface WorkOrder {
  work_order_id: string;
  vehicle_id: string;
  issue_type: string;
  type: WorkOrderType;
  odometer_reading: number;
  workshop_name: string;
  workshop_type: WorkshopType;
  start_date: string;
  status: WorkOrderStatus;
  reported_by: IssueSource;
  location?: string;
  is_immobilized?: boolean;
  towing_required?: boolean;
  parts_cost_signal?: number;
  labour_cost_signal?: number;
  downtime_hours?: number;
  confidence_flag: ConfidenceFlag;
  remarks?: string;
  visit_id?: string;
}

export enum CostCategory {
  FUEL = 'Fuel',
  MAINTENANCE = 'Maintenance',
  TOLL = 'Toll',
  OTHER = 'Other'
}

export interface CostEvent {
  cost_event_id: string;
  vehicle_id: string;
  event_date: string;
  cost_category: CostCategory;
  cost_signal?: number;
  confidence_flag: ConfidenceFlag;
  source: string;
}

export interface FuelEvent {
  fuel_event_id: string;
  vehicle_id: string;
  event_date: string;
  fuel_type: FuelType;
  fuel_quantity_liters: number;
  odometer_reading: number;
  fuel_source: 'Pump' | 'Fuel Card' | 'Browser';
  vendor_name?: string;
  location?: string;
  total_cost_signal?: number;
  confidence_flag: ConfidenceFlag;
  source_type: string;
}

export interface AdBlueEvent {
  adblue_event_id: string;
  vehicle_id: string;
  event_date: string;
  quantity_liters: number;
  odometer_reading: number;
  vendor_name?: string;
  source_type: string;
  confidence_flag: ConfidenceFlag;
}

export interface TelemetryEvent {
  event_id: string;
  vehicle_id: string;
  tracker_id?: string;
  event_timestamp: string;
  latitude: number;
  longitude: number;
  speed: number;
  ignition_status: boolean;
}

export enum DocumentType {
  RC = 'RC',
  INSURANCE = 'Insurance',
  PUC = 'PUC',
  PERMIT = 'Permit',
  FITNESS = 'Fitness'
}

export enum DocumentStatus {
  VALID = 'Valid',
  EXPIRED = 'Expired',
  EXPIRING_SOON = 'Expiring Soon',
  MISSING = 'Missing'
}

export interface VehicleDocument {
  document_id: string;
  vehicle_id: string;
  document_type: DocumentType;
  document_number: string;
  issue_date: string;
  expiry_date: string;
  status: DocumentStatus;
  document_url?: string;
  uploaded_by?: string;
  history?: VehicleDocumentHistoryEntry[];
}

export interface VehicleDocumentHistoryEntry {
  entry_id: string;
  action: 'Uploaded' | 'Updated';
  changed_at: string;
  document_number: string;
  issue_date: string;
  expiry_date: string;
  status: DocumentStatus;
  document_url?: string;
  uploaded_by?: string;
}

export enum BehaviorEventType {
  HARSH_BRAKING = 'Harsh Braking',
  HARSH_ACCELERATION = 'Harsh Acceleration',
  OVERSPEED = 'Overspeed',
  EXCESSIVE_IDLING = 'Excessive Idling',
  NIGHT_DRIVING = 'Night Driving',
  ROUTE_DEVIATION = 'Route Deviation'
}

export enum BehaviorSeverity {
  HIGH = 'High',
  MEDIUM = 'Medium',
  LOW = 'Low'
}

export interface DriverBehaviorEvent {
  event_id: string;
  driver_id: string;
  vehicle_id: string;
  event_type: BehaviorEventType;
  event_timestamp: string;
  severity: BehaviorSeverity;
  source: string;
  details: string;
}

export enum DerivedVehicleStatus {
  MOVING = 'Moving',
  IDLE = 'Idle',
  LONG_IDLE = 'Long Idle',
  OFFLINE = 'Offline',
  MAINTENANCE = 'Maintenance'
}

export interface VehicleLiveStatus {
  vehicle_id: string;
  current_status: DerivedVehicleStatus;
  last_location?: { lat: number; lng: number };
  current_speed?: number;
  last_updated: string;
  document_compliance: 'Compliant' | 'Non-Compliant';
}

export enum ExceptionSeverity {
  CRITICAL = 'Critical',
  HIGH = 'High',
  MEDIUM = 'Medium',
  LOW = 'Low'
}

export enum ExceptionStatus {
  OPEN = 'Open',
  ACKNOWLEDGED = 'Acknowledged',
  RESOLVED = 'Resolved'
}

export interface OpsException {
  exception_id: string;
  exception_type: string;
  entity_type: 'Vehicle' | 'Driver' | 'Inventory';
  entity_id: string;
  severity: ExceptionSeverity;
  detected_at: string;
  status: ExceptionStatus;
  source_module: string;
  description: string;
  recommendation?: string;
  owner_id?: string;
  resolution_notes?: string;
  age_hours?: number;
}

export interface VehicleConfidence {
  vehicle_id: string;
  score: 'High' | 'Medium' | 'Low';
  details: string[];
}

export interface OpsKPIs {
  fleet_availability: number;
  compliance_rate: number;
  open_critical_exceptions: number;
  cost_confidence: number;
  active_vehicles: number;
}

export interface DataCoverageStatus {
  vehicle_id: string;
  overall_status: 'Good' | 'Warning' | 'Poor';
  fuel_coverage_pct: number;
  telematics_uptime_pct: number;
  maintenance_compliance_pct: number;
  document_completeness_pct: number;
}

export interface ReconciliationRecord {
  reconciliation_id: string;
  vehicle_id: string;
  period_start: string;
  period_end: string;
  total_cost_events: number;
  estimated_events_count: number;
  variance_amount: number;
  confidence_score: 'High' | 'Medium' | 'Low';
  status: ReconciliationStatus;
  notes?: string;
  reconciled_by?: string;
  reconciled_at?: string;
}

export enum ReconciliationStatus {
  OPEN = 'Open',
  REVIEWED = 'Reviewed',
  RECONCILED = 'Reconciled'
}

export interface HumanActionLog {
  log_id: string;
  entity_type: string;
  entity_id: string;
  action_type: string;
  reason: string;
  user_id: string;
  timestamp: string;
}

export enum ComponentType {
  ENGINE = 'Engine',
  TRANSMISSION = 'Transmission',
  AXLE = 'Axle',
  BATTERY = 'Battery',
  TYRE = 'Tyre',
  TRACKING_DEVICE = 'Tracking Device',
  OTHER = 'Other'
}

export enum TrackerProtocol {
  GT06 = 'GT06',
  TELTONIKA = 'Teltonika',
  CONCOX = 'Concox',
  QUECLINK = 'Queclink',
  OTHER = 'Other'
}

export enum TrackerDeviceKind {
  GPS_TRACKING = 'GPS Tracking',
  SIM_TRACKING = 'SIM Tracking',
  MANUAL = 'Manual',
  DRIVER_APP = 'Driver App',
  OTHER = 'Other',
}

export enum TrackerPowerSource {
  OBD = 'OBD Port',
  DIRECT = 'Direct Wire',
  BATTERY_PACK = 'Internal Battery Pack'
}

export enum TrackerStatus {
  ACTIVE = 'Active',
  INACTIVE = 'Inactive',
  FAULT = 'Fault',
  REMOVED = 'Removed'
}

export interface VehicleTrackingDevice {
  tracker_id: string;
  vehicle_id: string;
  device_kind: TrackerDeviceKind;
  is_primary: boolean;
  // Device details
  manufacturer: string;
  model: string;
  serial_number: string;
  imei: string;
  sim_iccid?: string;
  mobile_number?: string;
  protocol: TrackerProtocol;
  // Installation
  install_date: string;
  installer_vendor: string;
  mounting_location: string;
  power_source: TrackerPowerSource;
  ignition_wired: boolean;
  odometer_at_install: number;
  // Configuration
  server_host: string;
  server_port: string;
  apn: string;
  reporting_interval_sec: number;
  idle_interval_sec: number;
  heartbeat_interval_sec: number;
  timezone: string;
  status: TrackerStatus;
  last_ping?: string;
}

export enum ComponentStatus {
  ACTIVE = 'Active',
  INACTIVE = 'Inactive',
  REMOVED = 'Removed'
}

export interface VehicleComponent {
  component_id: string;
  vehicle_id: string;
  component_type: ComponentType;
  serial_number: string;
  make: string;
  model: string;
  installation_date: string;
  status: ComponentStatus;
  remarks?: string;
}

export enum LicenseType {
  LMV = 'LMV',
  HMV = 'HMV',
  MCWG = 'MCWG',
  HAZMAT = 'HAZMAT'
}

export interface DriverLicense {
  license_id: string;
  driver_id: string;
  license_number: string;
  license_type: LicenseType;
  issue_date: string;
  expiry_date: string;
  issuing_authority: string;
}

export interface DriverSkill {
  skill_id: string;
  driver_id: string;
  skill_type: string;
  certified: boolean;
  certification_expiry?: string;
}

export enum DriverDocumentType {
  AADHAAR = 'Aadhaar',
  PAN = 'PAN',
  MEDICAL = 'Medical Certificate',
  POLICE_VERIFICATION = 'Police Verification'
}

export interface DriverDocument {
  document_id: string;
  driver_id: string;
  document_type: DriverDocumentType;
  document_number: string;
  issue_date: string;
  expiry_date?: string;
  status: DocumentStatus;
  document_url?: string;
  uploaded_by?: string;
}

export interface BulkValidationResult {
  validCount: number;
  errorCount: number;
  warningCount: number;
  errors: { row: number; column: string; type: 'Error' | 'Warning'; message: string }[];
  parsedData: any[];
}

export interface MaintenanceTemplateItem {
  item_id: string;
  name: string;
  item_type: 'Service' | 'Inspection' | 'Replacement';
  component_type?: ComponentType;
  frequency_km: number;
  criticality: 'High' | 'Medium' | 'Low';
}

export interface MaintenanceTemplate {
  template_id: string;
  name: string;
  applicable_vehicle_type: VehicleType;
  items: MaintenanceTemplateItem[];
}

export interface VehicleMaintenanceItem extends MaintenanceTemplateItem {
  last_performed_date?: string;
  last_performed_km?: number;
  next_due_date?: string;
  next_due_km?: number;
  status: 'Ok' | 'Due' | 'Overdue';
}

export interface ComponentHistoryRecord {
  record_id: string;
  vehicle_id: string;
  component_id: string;
  work_order_id: string;
  service_date: string;
  description: string;
  odometer: number;
}

export enum MaintenanceHealthStatus {
  GOOD = 'Good',
  WATCH = 'Watch',
  CRITICAL = 'Critical'
}

export interface VehicleMaintenanceHealth {
  vehicle_id: string;
  health_status: MaintenanceHealthStatus;
  contributing_factors: string[];
  calculated_at: string;
}

export interface MaintenanceKPIs {
  overdue_services_count: number;
  avg_downtime_hours: number;
  breakdowns_last_7_days: number;
  breakdowns_last_30_days: number;
  chronic_vehicles: { vehicle_id: string; breakdown_count: number; total_downtime: number }[];
}

export enum TyreSignalType {
  PRESSURE_LOW = 'Pressure Low',
  PRESSURE_HIGH = 'Pressure High',
  TEMP_HIGH = 'Temperature High',
  PUNCTURE = 'Puncture',
  BURST = 'Burst',
  WEAR_LIMIT = 'Wear Limit'
}

export interface TyreHealthSignal {
  signal_id: string;
  vehicle_id: string;
  tyre_id: string;
  position: string;
  tread_depth: number;
  abnormal_wear: boolean;
  generated_at: string;
}

export interface TyreEventSignal {
  signal_id: string;
  vehicle_id: string;
  tyre_id: string;
  position: string;
  event_type: TyreSignalType;
  severity: 'High' | 'Medium' | 'Low';
  event_date: string;
  description: string;
}

export enum EnergyAnomalyType {
  THEFT = 'Theft',
  SUDDEN_DROP = 'Sudden Drop',
  ABNORMAL_CONSUMPTION = 'Abnormal Consumption',
  ADBLUE_UNDER_CONSUMPTION = 'AdBlue Under Consumption'
}

export interface EnergyAnomaly {
  anomaly_id: string;
  vehicle_id: string;
  anomaly_type: EnergyAnomalyType;
  description: string;
  severity: 'High' | 'Medium' | 'Low';
  detected_at: string;
  confidence_flag: ConfidenceFlag;
}

export interface EnergyMetrics {
  vehicle_id: string;
  avg_km_per_liter: number;
  adblue_to_fuel_ratio_pct: number;
  fuel_cost_per_km: number;
  last_calculated_at: string;
}

export enum EnergyMaintenanceSignalType {
  ADBLUE_SYSTEM_CHECK = 'AdBlue System Check',
  FUEL_SYSTEM_CHECK = 'Fuel System Check',
  ENGINE_TUNING = 'Engine Tuning'
}

export interface EnergyMaintenanceSignal {
  signal_id: string;
  vehicle_id: string;
  signal_type: EnergyMaintenanceSignalType;
  severity: 'High' | 'Medium' | 'Low';
  detected_at: string;
  description: string;
  recommendation: string;
  linked_exception_id?: string;
}

export interface EnergySyncSummary {
  vehicle_id: string;
  avg_kpl: number;
  adblue_compliance_status: 'Compliant' | 'Non-Compliant';
  active_anomalies_count: number;
}

export enum PartCategory {
  FILTER = 'Filter',
  FLUID = 'Fluid',
  BRAKE = 'Brake',
  CLUTCH = 'Clutch',
  ELECTRICAL = 'Electrical',
  SUSPENSION = 'Suspension',
  ENGINE_PART = 'Engine Part',
  BODY_PART = 'Body Part',
  TYRE = 'Tyre',
  BELT = 'Belt',
  STEERING = 'Steering',
  OTHER = 'Other'
}

export interface SparePart {
  part_id: string;
  part_name: string;
  part_category: PartCategory;
  part_code: string;
  unit_of_measure: string;
  is_consumable: boolean;
  compatible_vehicle_types: string[];
  status: 'Active' | 'Inactive';
  standard_cost?: number;
  gst_rate?: number;
  hsn_code?: string;
}

export interface InventoryStock {
  stock_id: string;
  part_id: string;
  hub_id: string;
  available_quantity: number;
  reserved_quantity: number;
  minimum_quantity: number;
  reorder_quantity: number;
  last_updated_at: string;
  average_cost?: number;
  inventory_value?: number;
}

export enum MovementType {
  IN = 'In',
  OUT = 'Out',
  RESERVE = 'Reserve',
  CONSUME_RESERVED = 'Consume Reserved',
  ADJUSTMENT = 'Adjustment',
  RETURN = 'Return'
}

export interface InventoryMovement {
  movement_id: string;
  part_id: string;
  hub_id: string;
  movement_type: MovementType;
  quantity: number;
  reference_type: 'WorkOrder' | 'Manual' | 'Vendor' | 'PurchaseOrder';
  reference_id: string;
  performed_by: string;
  timestamp: string;
  reason?: string;
  unit_cost?: number;
  total_cost?: number;
  gst_rate?: number;
}

export enum WorkOrderPartStatus {
  PLANNED = 'Planned',
  ISSUED = 'Issued',
  CONSUMED = 'Consumed',
  RETURNED = 'Returned'
}

export interface WorkOrderPart {
  wo_part_id: string;
  work_order_id: string;
  part_id: string;
  quantity_required: number;
  quantity_issued: number;
  quantity_consumed: number;
  status: WorkOrderPartStatus;
  hub_id?: string;
}

export enum ReorderStatus {
  OPEN = 'Open',
  ACKNOWLEDGED = 'Acknowledged',
  ORDERED = 'Ordered'
}

export interface ReorderAlert {
  alert_id: string;
  part_id: string;
  hub_id: string;
  current_quantity: number;
  minimum_quantity: number;
  suggested_reorder_quantity: number;
  status: ReorderStatus;
  created_at: string;
}

export interface Vendor {
  vendor_id: string;
  vendor_name: string;
  gstin: string;
  address: string;
  service_categories: string[];
  status: 'Active' | 'Inactive';
}

export enum InvoiceStatus {
  SUBMITTED = 'Submitted',
  APPROVED = 'Approved',
  REJECTED = 'Rejected',
  PARTIALLY_PAID = 'Partially Paid',
  PAID = 'Paid'
}

export interface InvoiceLineItem {
  line_id: string;
  invoice_id: string;
  item_type: 'Part' | 'Labour' | 'Service';
  reference_id?: string; // Part ID or similar
  description: string;
  quantity: number;
  rate: number;
  amount: number;
  gst_rate: number;
}

export interface VendorInvoice {
  invoice_id: string;
  vendor_id: string;
  work_order_id?: string;
  visit_id?: string;
  invoice_number: string;
  invoice_date: string;
  subtotal_amount: number;
  gst_amount: number;
  total_amount: number;
  gst_breakup?: { cgst: number; sgst: number; igst: number };
  status: InvoiceStatus;
  created_at: string;
  amount_paid?: number;
  balance_amount?: number;
}

export enum PaymentStatus {
  PAID = 'Paid',
  PENDING = 'Pending',
  FAILED = 'Failed'
}

export enum PaymentMode {
  NEFT = 'NEFT',
  RTGS = 'RTGS',
  IMPS = 'IMPS',
  CHEQUE = 'Cheque',
  CASH = 'Cash',
  UPI = 'UPI'
}

export interface VendorPayment {
  payment_id: string;
  vendor_id: string;
  invoice_id: string;
  payment_date: string;
  payment_mode: PaymentMode;
  paid_amount: number;
  reference_number: string;
  status: PaymentStatus;
  created_at: string;
}

export interface VendorLedgerSummary {
  vendor_id: string;
  total_invoiced: number;
  total_paid: number;
  outstanding_amount: number;
  aging: { '0-30': number; '31-60': number; '60+': number };
}

export enum RequestStatus {
  PENDING = 'Pending',
  APPROVED = 'Approved',
  REJECTED = 'Rejected',
  ORDERED = 'Ordered'
}

export interface PurchaseRequest {
  request_id: string;
  part_id: string;
  hub_id: string;
  quantity: number;
  requested_by: string;
  request_date: string;
  status: RequestStatus;
  priority: 'Normal' | 'Urgent';
  notes?: string;
}

export enum GarageType {
  INTERNAL = 'Internal',
  EXTERNAL = 'External'
}

export interface Garage {
  garage_id: string;
  garage_name: string;
  garage_type: GarageType;
  location: string;
  supported_vehicle_types: string[];
  contact_details?: string;
  status: 'Active' | 'Inactive';
}

export enum GarageVisitStatus {
  CHECKED_IN = 'Checked In',
  IN_PROGRESS = 'In Progress',
  COMPLETED = 'Completed',
  CANCELLED = 'Cancelled'
}

export enum GarageClosureStatus {
  DRAFT = 'Draft',
  READY_FOR_APPROVAL = 'Ready for Approval',
  OPS_APPROVED = 'Ops Approved',
  FINANCE_APPROVED = 'Finance Approved',
  CLOSED = 'Closed',
  REJECTED = 'Rejected'
}

export enum VisitReason {
  SCHEDULED_SERVICE = 'Scheduled Service',
  BREAKDOWN = 'Breakdown',
  ACCIDENT = 'Accident',
  INSPECTION = 'Inspection',
  OTHER = 'Other'
}

export interface GarageVisitCostSummary {
  parts_cost: number;
  labour_cost: number;
  service_cost: number;
  gst_amount: number;
  total_cost: number;
  cost_confidence: 'Actual' | 'Estimated' | 'High';
}

export enum GarageApprovalLevel {
  OPS = 'Ops',
  FINANCE = 'Finance'
}

export interface GarageVisitApproval {
  approval_id: string;
  visit_id: string;
  approval_level: GarageApprovalLevel;
  approved_by: string;
  approved_at: string;
  status: 'Approved' | 'Rejected';
  remarks?: string;
}

export interface GarageVisit {
  visit_id: string;
  vehicle_id: string;
  garage_id: string;
  entry_datetime: string;
  odometer_in: number;
  reason_for_visit: VisitReason;
  linked_work_order_ids?: string[];
  visit_status: GarageVisitStatus;
  exit_datetime?: string;
  odometer_out?: number;
  remarks?: string;
  created_by: string;
  downtime_hours?: number;
  cost_summary?: GarageVisitCostSummary;
  invoice_ids?: string[];
  payment_status?: 'Pending' | 'Partial' | 'Paid';
  closure_status?: GarageClosureStatus;
  approvals?: GarageVisitApproval[];
}

export interface GarageRepairJob {
  job_id: string;
  visit_id: string;
  description: string;
  job_type: 'Repair' | 'Service' | 'Inspection';
  status: 'Planned' | 'In Progress' | 'Completed';
  technician_name?: string;
}

export interface GaragePartUsage {
  usage_id: string;
  visit_id: string;
  part_id: string;
  quantity: number;
  source: 'Inventory' | 'Ad-hoc Purchase';
  unit_cost: number;
}

export interface GarageLabour {
  labour_id: string;
  visit_id: string;
  labour_type: 'Mechanical' | 'Electrical' | 'Body' | 'General';
  hours: number;
  rate: number;
  total_amount: number;
}

export interface GarageKPIs {
  avg_downtime_hours: number;
  avg_cost_per_visit: number;
  total_maintenance_spend: number;
  repeat_repair_rate: number;
}

export interface GaragePerformanceStat {
  garage_id: string;
  garage_name: string;
  visit_count: number;
  avg_downtime: number;
  avg_cost: number;
  total_spend: number;
  performance_score: 'Excellent' | 'Good' | 'Poor';
}

export interface HighMaintenanceVehicle {
  vehicle_id: string;
  registration_number: string;
  visit_count: number;
  total_downtime: number;
  total_cost: number;
}

// Battery Management
export enum BatteryStatus {
  IN_STOCK = 'In Stock',
  INSTALLED = 'Installed',
  FAILED = 'Failed',
  SCRAPPED = 'Scrapped'
}

export enum BatteryType {
  STARTER = 'Starter',
  AUXILIARY = 'Auxiliary',
  REEFER = 'Reefer'
}

export interface Battery {
  battery_id: string;
  serial_number: string;
  battery_type: BatteryType;
  brand: string;
  model: string;
  capacity_ah: number;
  voltage: number; // 12V or 24V typically
  purchase_date: string;
  warranty_months: number;
  warranty_expiry_date: string;
  purchase_cost: number;
  status: BatteryStatus;
  current_vehicle_id?: string;
}

export interface BatteryInstallation {
  installation_id: string;
  battery_id: string;
  vehicle_id: string;
  installed_at: string;
  odometer_at_install: number;
  removed_at?: string;
  odometer_at_removal?: number;
  removal_reason?: string;
  visit_id?: string; // Integrated
  work_order_id?: string; // Integrated
  technician_name?: string;
}

export enum BatteryHealthStatus {
  GOOD = 'Good',
  WEAK = 'Weak',
  CRITICAL = 'Critical'
}

export interface BatteryHealthRecord {
  record_id: string;
  battery_id: string;
  health_status: BatteryHealthStatus;
  voltage_reading: number;
  inspection_date: string;
  remarks?: string;
}

export enum BatteryFailureType {
  SUDDEN = 'Sudden',
  GRADUAL = 'Gradual',
  NO_CRANK = 'No Crank',
  PHYSICAL_DAMAGE = 'Physical Damage',
  OTHER = 'Other'
}

export interface BatteryFailureEvent {
  failure_id: string;
  battery_id: string;
  vehicle_id: string;
  failure_date: string;
  odometer: number;
  failure_type: BatteryFailureType;
  within_warranty: boolean;
}

export interface BatteryCostEvent {
  cost_id: string;
  battery_id: string;
  vehicle_id?: string;
  visit_id?: string;
  work_order_id?: string;
  cost_amount: number;
  cost_type: 'Purchase' | 'Replacement';
  date: string;
}

export interface BatteryIntelligence {
  expiringWarranties: Battery[]; // < 30 days
  failuresInWarranty: number;
  brandFailureRates: { brand: string, total: number, failures: number, ratePct: number }[];
}

export type CoverageStatus = 'Good' | 'Warning' | 'Poor';
