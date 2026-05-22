
import { 
  Vehicle, Driver, Trip, VehicleType, AxleConfiguration, VehicleStatus, DriverStatus, TripStatus,
  MaintenanceSchedule, WorkOrder, FuelEvent, CostEvent,
  MaintenanceType, WorkOrderStatus, ConfidenceFlag, CostCategory,
  TelemetryEvent, VehicleDocument, DriverBehaviorEvent, VehicleLiveStatus,
  DocumentType, DocumentStatus, BehaviorEventType, BehaviorSeverity, DerivedVehicleStatus,
  OpsException, ExceptionSeverity, ExceptionStatus, VehicleConfidence, OpsKPIs,
  DataCoverageStatus, CoverageStatus, ReconciliationRecord, ReconciliationStatus, HumanActionLog,
  VehicleComponent, ComponentType, ComponentStatus, OwnershipType, FuelType,
  DriverLicense, DriverSkill, DriverType, LicenseType, DriverDocument, DriverDocumentType,
  BulkValidationResult, MaintenanceTemplate, MaintenanceTemplateItem, VehicleMaintenanceItem, ComponentHistoryRecord,
  WorkOrderType, WorkshopType, IssueSource, MaintenanceHealthStatus, VehicleMaintenanceHealth, MaintenanceKPIs,
  TyreHealthSignal, TyreEventSignal, TyreSignalType, AdBlueEvent, EmissionStandard,
  EnergyAnomaly, EnergyAnomalyType, EnergyMetrics, EnergyMaintenanceSignal, EnergyMaintenanceSignalType, EnergySyncSummary,
  SparePart, InventoryStock, InventoryMovement, PartCategory, MovementType, WorkOrderPart, WorkOrderPartStatus, ReorderAlert, ReorderStatus,
  VehicleTrackingDevice, TrackerProtocol, TrackerPowerSource, TrackerStatus, TrackerDeviceKind,
  MarketplaceProvider
} from '../types';

// --- SEED DATA ---

const SEED_VEHICLES: Vehicle[] = [
  {
    vehicle_id: 'v1',
    registration_number: 'MH-46-BM-2849', 
    vehicle_type: VehicleType.TRUCK,
    axle_configuration: AxleConfiguration.AXLE_6X4,
    capacity_tons: 12.5,
    status: VehicleStatus.ACTIVE,
    assigned_driver_id: 'd1',
    created_at: new Date().toISOString(),
    chassis_number: 'MA123456789ABC',
    engine_number: 'E987654321',
    make: 'Tata Motors',
    model: 'Prima 2825.K',
    manufacturing_year: 2022,
    ownership_type: OwnershipType.OWNED,
    fuel_type: FuelType.DIESEL,
    emission_standard: EmissionStandard.BS6,
    gvw_tons: 28,
    body_type: 'Box Body',
    maintenance_template_id: 'mt1'
  },
  {
    vehicle_id: 'v2',
    registration_number: 'KA-51-HA-9231',
    vehicle_type: VehicleType.TRUCK,
    axle_configuration: AxleConfiguration.AXLE_4X2,
    capacity_tons: 8.0,
    status: VehicleStatus.MAINTENANCE,
    assigned_driver_id: null,
    created_at: new Date().toISOString(),
    chassis_number: 'KA987654321XYZ',
    engine_number: 'E123456789',
    make: 'Ashok Leyland',
    model: 'Ecomet 1215',
    manufacturing_year: 2019,
    ownership_type: OwnershipType.LEASED,
    marketplace_provider_id: 'mp-004',
    fuel_type: FuelType.DIESEL,
    emission_standard: EmissionStandard.BS4,
    gvw_tons: 12,
    body_type: 'Open Body',
    maintenance_template_id: 'mt1'
  },
  {
    vehicle_id: 'v3',
    registration_number: 'DL-1L-XY-5544',
    vehicle_type: VehicleType.CONTAINER,
    axle_configuration: AxleConfiguration.AXLE_6X4,
    capacity_tons: 24.0,
    status: VehicleStatus.ACTIVE,
    assigned_driver_id: 'd2',
    created_at: new Date().toISOString(),
    chassis_number: 'DL456789123PQR',
    engine_number: 'E456123789',
    make: 'BharatBenz',
    model: '5528TT',
    manufacturing_year: 2023,
    ownership_type: OwnershipType.OWNED,
    fuel_type: FuelType.DIESEL,
    emission_standard: EmissionStandard.BS6,
    gvw_tons: 55,
    body_type: 'Container',
    maintenance_template_id: 'mt1'
  },
    {
  vehicle_id: 'v4',
  registration_number: 'MH-12-KL-9087',
  vehicle_type: VehicleType.TRUCK,
  axle_configuration: AxleConfiguration.AXLE_6X2,
  capacity_tons: 18,
  status: VehicleStatus.ACTIVE,
  assigned_driver_id: 'd3',
  created_at: new Date().toISOString(),
  chassis_number: 'MH6X2CHASSIS9087',
  engine_number: 'ENG90871234',
  make: 'Ashok Leyland',
  model: '1616',
  manufacturing_year: 2021,
  ownership_type: OwnershipType.OWNED,
  fuel_type: FuelType.DIESEL,
  emission_standard: EmissionStandard.BS6,
  gvw_tons: 16,
  body_type: 'Closed',
  maintenance_template_id: 'mt1'
},
{
  vehicle_id: 'v5',
  registration_number: 'MH-14-BG-2234',
  vehicle_type: VehicleType.TRUCK,
  axle_configuration: AxleConfiguration.AXLE_4X2,
  capacity_tons: 14,
  status: VehicleStatus.ACTIVE,
  assigned_driver_id: 'd1',
  created_at: new Date().toISOString(),
  chassis_number: 'MH4X2CHASSIS2234',
  engine_number: 'ENG22345678',
  make: 'Tata Motors',
  model: 'Ultra 1518',
  manufacturing_year: 2020,
  ownership_type: OwnershipType.RENTED,
  marketplace_provider_id: 'mp-001',
  fuel_type: FuelType.DIESEL,
  emission_standard: EmissionStandard.BS6,
  gvw_tons: 15,
  body_type: 'Open',
  maintenance_template_id: 'mt1'
},
{
  vehicle_id: 'v6',
  registration_number: 'KA-01-ZX-9911',
  vehicle_type: VehicleType.TRUCK,
  axle_configuration: AxleConfiguration.AXLE_6X4,
  capacity_tons: 25,
  status: VehicleStatus.ACTIVE,
  assigned_driver_id: 'd2',
  created_at: new Date().toISOString(),
  chassis_number: 'KA6X4CHASSIS9911',
  engine_number: 'ENG99111234',
  make: 'Volvo',
  model: 'FM 420',
  manufacturing_year: 2019,
  ownership_type: OwnershipType.LEASED,
  marketplace_provider_id: 'mp-003',
  fuel_type: FuelType.DIESEL,
  emission_standard: EmissionStandard.BS4,
  gvw_tons: 35,
  body_type: 'Container',
  maintenance_template_id: 'mt2'
},
{
  vehicle_id: 'v7',
  registration_number: 'DL-01-AA-7821',
  vehicle_type: VehicleType.TRUCK,
  axle_configuration: AxleConfiguration.AXLE_4X2,
  capacity_tons: 12,
  status: VehicleStatus.ACTIVE,
  assigned_driver_id: 'd4',
  created_at: new Date().toISOString(),
  chassis_number: 'DL4X2CHASSIS7821',
  engine_number: 'ENG78214567',
  make: 'Eicher',
  model: 'Pro 3015',
  manufacturing_year: 2022,
  ownership_type: OwnershipType.OWNED,
  fuel_type: FuelType.DIESEL,
  emission_standard: EmissionStandard.BS6,
  gvw_tons: 14,
  body_type: 'Closed',
  maintenance_template_id: 'mt1'
},
{
  vehicle_id: 'v8',
  registration_number: 'GJ-05-HJ-4455',
  vehicle_type: VehicleType.TRUCK,
  axle_configuration: AxleConfiguration.AXLE_6X2,
  capacity_tons: 19,
  status: VehicleStatus.ACTIVE,
  assigned_driver_id: 'd5',
  created_at: new Date().toISOString(),
  chassis_number: 'GJ6X2CHASSIS4455',
  engine_number: 'ENG44551234',
  make: 'BharatBenz',
  model: '3528CM',
  manufacturing_year: 2021,
  ownership_type: OwnershipType.OWNED,
  fuel_type: FuelType.DIESEL,
  emission_standard: EmissionStandard.BS6,
  gvw_tons: 31,
  body_type: 'Tipper',
  maintenance_template_id: 'mt2'
},
{
  vehicle_id: 'v9',
  registration_number: 'TN-10-MM-6677',
  vehicle_type: VehicleType.TRUCK,
  axle_configuration: AxleConfiguration.AXLE_4X2,
  capacity_tons: 10,
  status: VehicleStatus.MAINTENANCE,
  assigned_driver_id: 'd6',
  created_at: new Date().toISOString(),
  chassis_number: 'TN4X2CHASSIS6677',
  engine_number: 'ENG66773456',
  make: 'Ashok Leyland',
  model: 'Partner 1200',
  manufacturing_year: 2018,
  ownership_type: OwnershipType.RENTED,
  marketplace_provider_id: 'mp-006',
  fuel_type: FuelType.DIESEL,
  emission_standard: EmissionStandard.BS4,
  gvw_tons: 12,
  body_type: 'Open',
  maintenance_template_id: 'mt3'
},
{
  vehicle_id: 'v10',
  registration_number: 'RJ-19-PP-3344',
  vehicle_type: VehicleType.TRUCK,
  axle_configuration: AxleConfiguration.AXLE_6X4,
  capacity_tons: 28,
  status: VehicleStatus.ACTIVE,
  assigned_driver_id: 'd7',
  created_at: new Date().toISOString(),
  chassis_number: 'RJ6X4CHASSIS3344',
  engine_number: 'ENG33447890',
  make: 'Scania',
  model: 'G410',
  manufacturing_year: 2020,
  ownership_type: OwnershipType.LEASED,
  marketplace_provider_id: 'mp-003',
  fuel_type: FuelType.DIESEL,
  emission_standard: EmissionStandard.BS6,
  gvw_tons: 40,
  body_type: 'Container',
  maintenance_template_id: 'mt2'
},
{
  vehicle_id: 'v11',
  registration_number: 'UP-16-QW-5566',
  vehicle_type: VehicleType.TRUCK,
  axle_configuration: AxleConfiguration.AXLE_4X2,
  capacity_tons: 11,
  status: VehicleStatus.ACTIVE,
  assigned_driver_id: 'd8',
  created_at: new Date().toISOString(),
  chassis_number: 'UP4X2CHASSIS5566',
  engine_number: 'ENG55661234',
  make: 'Tata Motors',
  model: 'LPT 1109',
  manufacturing_year: 2019,
  ownership_type: OwnershipType.OWNED,
  fuel_type: FuelType.DIESEL,
  emission_standard: EmissionStandard.BS4,
  gvw_tons: 11,
  body_type: 'Closed',
  maintenance_template_id: 'mt1'
},
{
  vehicle_id: 'v12',
  registration_number: 'HR-38-YT-8899',
  vehicle_type: VehicleType.TRUCK,
  axle_configuration: AxleConfiguration.AXLE_6X2,
  capacity_tons: 20,
  status: VehicleStatus.ACTIVE,
  assigned_driver_id: 'd9',
  created_at: new Date().toISOString(),
  chassis_number: 'HR6X2CHASSIS8899',
  engine_number: 'ENG88994567',
  make: 'Mahindra',
  model: 'Blazo X 28',
  manufacturing_year: 2022,
  ownership_type: OwnershipType.OWNED,
  fuel_type: FuelType.DIESEL,
  emission_standard: EmissionStandard.BS6,
  gvw_tons: 28,
  body_type: 'Trailer',
  maintenance_template_id: 'mt2'
},
{
  vehicle_id: 'v13',
  registration_number: 'MP-09-CC-1122',
  vehicle_type: VehicleType.TRUCK,
  axle_configuration: AxleConfiguration.AXLE_4X2,
  capacity_tons: 9,
  status: VehicleStatus.RETIRED,
  assigned_driver_id: 'd10',
  created_at: new Date().toISOString(),
  chassis_number: 'MP4X2CHASSIS1122',
  engine_number: 'ENG11229876',
  make: 'Eicher',
  model: 'Canter',
  manufacturing_year: 2015,
  ownership_type: OwnershipType.OWNED,
  fuel_type: FuelType.DIESEL,
  emission_standard: EmissionStandard.BS3,
  gvw_tons: 9,
  body_type: 'Open',
  maintenance_template_id: 'mt3'
}

];

const SEED_DRIVERS: Driver[] = [
  {
    driver_id: 'd1',
    name: 'Ramesh Kumar',
    phone: '+91 98765 43210',
    license_number: 'MH14 20180000123',
    license_expiry_date: '2025-10-15',
    status: DriverStatus.ACTIVE,
    assigned_vehicle_id: 'v1',
    created_at: new Date().toISOString(),
    driver_type: DriverType.PERMANENT,
    home_location: 'Pune, MH'
  },
  {
    driver_id: 'd2',
    name: 'Suresh Singh',
    phone: '+91 98123 45678',
    license_number: 'DL04 20190000456',
    license_expiry_date: '2024-05-20',
    status: DriverStatus.ACTIVE,
    assigned_vehicle_id: 'v3',
    created_at: new Date().toISOString(),
    driver_type: DriverType.CONTRACT,
    home_location: 'Delhi, DL'
  },
{
  driver_id: 'd3',
  name: 'Mahesh Patil',
  phone: '+91 98230 77881',
  license_number: 'MH12 20170000987',
  license_expiry_date: '2026-01-10',
  status: DriverStatus.ACTIVE,
  assigned_vehicle_id: 'v4',
  created_at: new Date().toISOString(),
  driver_type: DriverType.PERMANENT,
  home_location: 'Mumbai, MH'
},
{
  driver_id: 'd4',
  name: 'Anil Yadav',
  phone: '+91 99301 22334',
  license_number: 'UP16 20160000444',
  license_expiry_date: '2024-11-05',
  status: DriverStatus.ACTIVE,
  assigned_vehicle_id: 'v5',
  created_at: new Date().toISOString(),
  driver_type: DriverType.CONTRACT,
  home_location: 'Noida, UP'
},
{
  driver_id: 'd5',
  name: 'Ravindra Jadhav',
  phone: '+91 97654 88990',
  license_number: 'MH20 20150000678',
  license_expiry_date: '2025-08-18',
  status: DriverStatus.ACTIVE,
  assigned_vehicle_id: 'v6',
  created_at: new Date().toISOString(),
  driver_type: DriverType.PERMANENT,
  home_location: 'Nashik, MH'
},
{
  driver_id: 'd6',
  name: 'Sunil Chauhan',
  phone: '+91 98987 55443',
  license_number: 'GJ05 20180000321',
  license_expiry_date: '2026-03-30',
  status: DriverStatus.ACTIVE,
  assigned_vehicle_id: 'v7',
  created_at: new Date().toISOString(),
  driver_type: DriverType.CONTRACT,
  home_location: 'Ahmedabad, GJ'
},
{
  driver_id: 'd7',
  name: 'Balwant Singh',
  phone: '+91 94678 11223',
  license_number: 'PB10 20140000888',
  license_expiry_date: '2024-07-12',
  status: DriverStatus.ACTIVE,
  assigned_vehicle_id: 'v8',
  created_at: new Date().toISOString(),
  driver_type: DriverType.PERMANENT,
  home_location: 'Ludhiana, PB'
},
{
  driver_id: 'd8',
  name: 'Kiran Rao',
  phone: '+91 98450 66778',
  license_number: 'KA01 20190000111',
  license_expiry_date: '2025-12-01',
  status: DriverStatus.ACTIVE,
  assigned_vehicle_id: 'v9',
  created_at: new Date().toISOString(),
  driver_type: DriverType.CONTRACT,
  home_location: 'Bengaluru, KA'
},
{
  driver_id: 'd9',
  name: 'Prakash Meena',
  phone: '+91 99822 33445',
  license_number: 'RJ19 20160000555',
  license_expiry_date: '2026-06-22',
  status: DriverStatus.ACTIVE,
  assigned_vehicle_id: 'v10',
  created_at: new Date().toISOString(),
  driver_type: DriverType.PERMANENT,
  home_location: 'Jaipur, RJ'
},
{
  driver_id: 'd10',
  name: 'Dinesh Solanki',
  phone: '+91 99041 77889',
  license_number: 'MP09 20130000999',
  license_expiry_date: '2024-04-14',
  status: DriverStatus.ACTIVE,
  assigned_vehicle_id: 'v11',
  created_at: new Date().toISOString(),
  driver_type: DriverType.CONTRACT,
  home_location: 'Indore, MP'
},
{
  driver_id: 'd11',
  name: 'Arjun Nair',
  phone: '+91 94472 55667',
  license_number: 'KL07 20170000222',
  license_expiry_date: '2025-09-09',
  status: DriverStatus.ACTIVE,
  assigned_vehicle_id: 'v12',
  created_at: new Date().toISOString(),
  driver_type: DriverType.PERMANENT,
  home_location: 'Kochi, KL'
},
{
  driver_id: 'd12',
  name: 'Vijay Kumar',
  phone: '+91 93041 99887',
  license_number: 'BR01 20180000777',
  license_expiry_date: '2026-02-17',
  status: DriverStatus.ACTIVE,
  assigned_vehicle_id: 'v13',
  created_at: new Date().toISOString(),
  driver_type: DriverType.CONTRACT,
  home_location: 'Patna, BR'
},
{
  driver_id: 'd13',
  name: 'Santosh Pawar',
  phone: '+91 98221 33456',
  license_number: 'MH11 20140000135',
  license_expiry_date: '2024-10-28',
  status: DriverStatus.ACTIVE,
  assigned_vehicle_id: 'v2',
  created_at: new Date().toISOString(),
  driver_type: DriverType.PERMANENT,
  home_location: 'Satara, MH'
},
{
  driver_id: 'd14',
  name: 'Imran Khan',
  phone: '+91 98910 44321',
  license_number: 'DL01 20190000876',
  license_expiry_date: '2025-07-19',
  status: DriverStatus.ACTIVE,
  assigned_vehicle_id: 'v6',
  created_at: new Date().toISOString(),
  driver_type: DriverType.CONTRACT,
  home_location: 'Ghaziabad, UP'
},
{
  driver_id: 'd15',
  name: 'Rohit Deshmukh',
  phone: '+91 97666 11223',
  license_number: 'MH31 20200000421',
  license_expiry_date: '2027-01-03',
  status: DriverStatus.ACTIVE,
  assigned_vehicle_id: 'v4',
  created_at: new Date().toISOString(),
  driver_type: DriverType.PERMANENT,
  home_location: 'Aurangabad, MH'
}
];

const SEED_BEHAVIOR_EVENTS: DriverBehaviorEvent[] = [
  {
    event_id: 'be1',
    driver_id: 'd1',
    vehicle_id: 'v1',
    event_type: BehaviorEventType.HARSH_BRAKING,
    event_timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(), // 45 mins ago
    severity: BehaviorSeverity.HIGH,
    source: 'Telematics',
    details: 'Deceleration > 3.5m/s² detected at highway exit ramp.'
  },
  {
    event_id: 'be2',
    driver_id: 'd2',
    vehicle_id: 'v3',
    event_type: BehaviorEventType.OVERSPEED,
    event_timestamp: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(), // 3 hours ago
    severity: BehaviorSeverity.MEDIUM,
    source: 'Telematics',
    details: 'Sustained speed 85 km/h in 60 km/h zone for 45s.'
  },
  {
    event_id: 'be3',
    driver_id: 'd1',
    vehicle_id: 'v1',
    event_type: BehaviorEventType.EXCESSIVE_IDLING,
    event_timestamp: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
    severity: BehaviorSeverity.LOW,
    source: 'Telematics',
    details: 'Engine idle > 15 mins at unmapped location.'
  },
  {
    event_id: 'be4',
    driver_id: 'd2',
    vehicle_id: 'v3',
    event_type: BehaviorEventType.NIGHT_DRIVING,
    event_timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // Yesterday
    severity: BehaviorSeverity.LOW,
    source: 'Telematics',
    details: 'Continuous driving between 02:00 AM and 04:00 AM.'
  },
  {
    event_id: 'be5',
    driver_id: 'd2',
    vehicle_id: 'v3',
    event_type: BehaviorEventType.ROUTE_DEVIATION,
    event_timestamp: new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString(),
    severity: BehaviorSeverity.MEDIUM,
    source: 'Telematics',
    details: 'Deviated 5km from planned geo-corridor.'
  }
];

const SEED_MAINTENANCE_TEMPLATES: MaintenanceTemplate[] = [
  {
    template_id: 'mt1',
    name: 'Heavy Truck - Standard Diesel',
    applicable_vehicle_type: VehicleType.TRUCK,
    items: [
      {
        item_id: 'mti1',
        name: 'Engine Oil Change',
        item_type: 'Service',
        component_type: ComponentType.ENGINE,
        frequency_km: 20000,
        criticality: 'High'
      },
      {
        item_id: 'mti2',
        name: 'Brake Inspection',
        item_type: 'Inspection',
        frequency_km: 10000,
        criticality: 'High'
      }
    ]
  }
];

const SEED_WORK_ORDERS: WorkOrder[] = [
  {
    work_order_id: 'wo1',
    vehicle_id: 'v2',
    issue_type: 'Brake Pad Replacement',
    type: WorkOrderType.REPAIR,
    odometer_reading: 97500,
    workshop_name: 'City Garage Services',
    workshop_type: WorkshopType.THIRD_PARTY,
    start_date: '2024-02-10',
    status: WorkOrderStatus.IN_PROGRESS,
    reported_by: IssueSource.OPS,
    parts_cost_signal: 4500,
    labour_cost_signal: 1200,
    confidence_flag: ConfidenceFlag.ACTUAL
  },
  {
    work_order_id: 'wo2',
    vehicle_id: 'v1',
    issue_type: 'Engine Overheat - Breakdown',
    type: WorkOrderType.BREAKDOWN,
    odometer_reading: 145200,
    workshop_name: 'Highway Rescue 24x7',
    workshop_type: WorkshopType.ROADSIDE,
    start_date: '2024-02-18',
    status: WorkOrderStatus.OPEN,
    reported_by: IssueSource.DRIVER,
    location: 'NH48, Near Satara',
    is_immobilized: true,
    towing_required: true,
    confidence_flag: ConfidenceFlag.ESTIMATED
  }
];

const SEED_COMPONENTS: VehicleComponent[] = [
  {
    component_id: 'c1',
    vehicle_id: 'v1',
    component_type: ComponentType.ENGINE,
    serial_number: 'E987654321',
    make: 'Cummins',
    model: 'ISBe 6.7',
    installation_date: '2022-01-15',
    status: ComponentStatus.ACTIVE,
    remarks: 'OEM Installed'
  }
];

const SEED_ADBLUE_EVENTS: AdBlueEvent[] = [
    { adblue_event_id: 'ae1', vehicle_id: 'v1', event_date: '2024-02-15T10:00:00', quantity_liters: 20, odometer_reading: 25000, vendor_name: 'IOCL Highway', source_type: 'Actual', confidence_flag: ConfidenceFlag.ACTUAL },
    { adblue_event_id: 'ae2', vehicle_id: 'v3', event_date: '2024-02-18T14:00:00', quantity_liters: 5, odometer_reading: 15500, vendor_name: 'Shell', source_type: 'Actual', confidence_flag: ConfidenceFlag.ACTUAL }
];

const SEED_FUEL_EVENTS: FuelEvent[] = [
    { fuel_event_id: 'fe1', vehicle_id: 'v1', event_date: '2024-02-15T10:05:00', fuel_type: FuelType.DIESEL, fuel_quantity_liters: 200, odometer_reading: 25000, fuel_source: 'Pump', vendor_name: 'IOCL Highway', location: 'Pune', total_cost_signal: 19000, confidence_flag: ConfidenceFlag.ACTUAL, source_type: 'Actual' },
    { fuel_event_id: 'fe2', vehicle_id: 'v1', event_date: '2024-02-12T08:00:00', fuel_type: FuelType.DIESEL, fuel_quantity_liters: 180, odometer_reading: 24300, fuel_source: 'Fuel Card', vendor_name: 'HPCL', location: 'Mumbai', total_cost_signal: 17100, confidence_flag: ConfidenceFlag.ACTUAL, source_type: 'Actual' },
    { fuel_event_id: 'fe3', vehicle_id: 'v3', event_date: '2024-02-18T14:05:00', fuel_type: FuelType.DIESEL, fuel_quantity_liters: 300, odometer_reading: 15500, fuel_source: 'Pump', vendor_name: 'Shell', location: 'Gurgaon', total_cost_signal: 28500, confidence_flag: ConfidenceFlag.ACTUAL, source_type: 'Actual' },
    { fuel_event_id: 'fe4', vehicle_id: 'v3', event_date: '2024-02-14T09:00:00', fuel_type: FuelType.DIESEL, fuel_quantity_liters: 280, odometer_reading: 14500, fuel_source: 'Pump', vendor_name: 'Shell', location: 'Jaipur', total_cost_signal: 26600, confidence_flag: ConfidenceFlag.ACTUAL, source_type: 'Actual' }
];

const SEED_TYRE_HEALTH_SIGNALS: TyreHealthSignal[] = [
  { signal_id: 'ths1', vehicle_id: 'v2', tyre_id: 't1', position: 'L1', tread_depth: 3.5, abnormal_wear: true, generated_at: new Date().toISOString() },
  { signal_id: 'ths2', vehicle_id: 'v2', tyre_id: 't2', position: 'R1', tread_depth: 3.2, abnormal_wear: true, generated_at: new Date().toISOString() },
];

const SEED_TYRE_EVENT_SIGNALS: TyreEventSignal[] = [
  { signal_id: 'tes1', event_type: TyreSignalType.BURST, vehicle_id: 'v3', tyre_id: 't9', position: 'R2', severity: 'High', event_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), description: 'Tyre burst on highway' },
];

const SEED_ENERGY_ANOMALIES: EnergyAnomaly[] = [
    {
        anomaly_id: 'ea1',
        vehicle_id: 'v3',
        anomaly_type: EnergyAnomalyType.ADBLUE_UNDER_CONSUMPTION,
        description: 'AdBlue consumption ratio (1.6%) is significantly below target (3-6%) for BS6 vehicle.',
        severity: 'High',
        detected_at: new Date().toISOString(),
        confidence_flag: ConfidenceFlag.HIGH
    }
];

const SEED_ENERGY_MAINTENANCE_SIGNALS: EnergyMaintenanceSignal[] = [
    {
        signal_id: 'ems1',
        vehicle_id: 'v3',
        signal_type: EnergyMaintenanceSignalType.ADBLUE_SYSTEM_CHECK,
        severity: 'High',
        detected_at: new Date().toISOString(),
        description: 'Consistent AdBlue under-consumption detected.',
        recommendation: 'Inspect SCR system and dosing unit for blockages or tampering.',
        linked_exception_id: 'ea1'
    }
];

const SEED_SPARE_PARTS: SparePart[] = [
  { part_id: 'p1', part_name: '15W40 Engine Oil', part_category: PartCategory.FLUID, part_code: 'OIL-15W40-20L', unit_of_measure: 'Liters', is_consumable: true, compatible_vehicle_types: ['Truck', 'Container'], status: 'Active' },
  { part_id: 'p2', part_name: 'Air Filter Type A', part_category: PartCategory.FILTER, part_code: 'FLT-AIR-A', unit_of_measure: 'Nos', is_consumable: true, compatible_vehicle_types: ['Truck'], status: 'Active' },
  { part_id: 'p3', part_name: 'Brake Pad Set (Front)', part_category: PartCategory.BRAKE, part_code: 'BRK-PAD-F', unit_of_measure: 'Set', is_consumable: false, compatible_vehicle_types: ['Truck', 'Trailer'], status: 'Active' },
  { part_id: 'p4', part_name: 'Fuel Filter Primary', part_category: PartCategory.FILTER, part_code: 'FLT-FUEL-P', unit_of_measure: 'Nos', is_consumable: true, compatible_vehicle_types: ['Container'], status: 'Active' },
  { part_id: 'p5', part_name: 'Oil Filter Standard', part_category: PartCategory.FILTER, part_code: 'FLT-OIL-STD', unit_of_measure: 'Nos', is_consumable: true, compatible_vehicle_types: ['Truck'], status: 'Active' },
{ part_id: 'p6', part_name: 'Clutch Plate Assembly', part_category: PartCategory.CLUTCH, part_code: 'CLT-PLT-ASM', unit_of_measure: 'Set', is_consumable: false, compatible_vehicle_types: ['Truck', 'Trailer'], status: 'Active' },
{ part_id: 'p7', part_name: 'Gearbox Oil 80W90', part_category: PartCategory.FLUID, part_code: 'OIL-GBX-80W90', unit_of_measure: 'Liters', is_consumable: true, compatible_vehicle_types: ['Truck'], status: 'Active' },
{ part_id: 'p8', part_name: 'Radiator Coolant', part_category: PartCategory.FLUID, part_code: 'CLT-RAD-20L', unit_of_measure: 'Liters', is_consumable: true, compatible_vehicle_types: ['Truck', 'Container'], status: 'Active' },
{ part_id: 'p9', part_name: 'Alternator Belt', part_category: PartCategory.BELT, part_code: 'BLT-ALT-01', unit_of_measure: 'Nos', is_consumable: false, compatible_vehicle_types: ['Truck'], status: 'Active' },
{ part_id: 'p10', part_name: 'Rear Brake Shoe Set', part_category: PartCategory.BRAKE, part_code: 'BRK-SHOE-R', unit_of_measure: 'Set', is_consumable: false, compatible_vehicle_types: ['Truck', 'Trailer'], status: 'Active' },
{ part_id: 'p11', part_name: 'Hydraulic Oil ISO 68', part_category: PartCategory.FLUID, part_code: 'OIL-HYD-68', unit_of_measure: 'Liters', is_consumable: true, compatible_vehicle_types: ['Trailer'], status: 'Active' },
{ part_id: 'p12', part_name: 'Power Steering Pump', part_category: PartCategory.STEERING, part_code: 'STR-PMP-01', unit_of_measure: 'Nos', is_consumable: false, compatible_vehicle_types: ['Truck'], status: 'Active' },
{ part_id: 'p13', part_name: 'Wheel Bearing Kit', part_category: PartCategory.SUSPENSION, part_code: 'SUS-WHL-BRG', unit_of_measure: 'Set', is_consumable: false, compatible_vehicle_types: ['Truck', 'Trailer'], status: 'Active' },
{ part_id: 'p14', part_name: 'Starter Motor Assembly', part_category: PartCategory.ELECTRICAL, part_code: 'ELC-STR-MTR', unit_of_measure: 'Nos', is_consumable: false, compatible_vehicle_types: ['Truck', 'Container'], status: 'Active' }

];

const SEED_INVENTORY_STOCK: InventoryStock[] = [
  { stock_id: 's1', part_id: 'p1', hub_id: 'Pune Hub', available_quantity: 150, reserved_quantity: 20, minimum_quantity: 50, reorder_quantity: 100, last_updated_at: new Date().toISOString() },
  { stock_id: 's2', part_id: 'p2', hub_id: 'Pune Hub', available_quantity: 8, reserved_quantity: 2, minimum_quantity: 10, reorder_quantity: 20, last_updated_at: new Date().toISOString() },
  { stock_id: 's3', part_id: 'p3', hub_id: 'Pune Hub', available_quantity: 25, reserved_quantity: 0, minimum_quantity: 5, reorder_quantity: 10, last_updated_at: new Date().toISOString() },
  { stock_id: 's4', part_id: 'p4', hub_id: 'Pune Hub', available_quantity: 60, reserved_quantity: 5, minimum_quantity: 20, reorder_quantity: 40, last_updated_at: new Date().toISOString() },
{ stock_id: 's5', part_id: 'p5', hub_id: 'Pune Hub', available_quantity: 12, reserved_quantity: 3, minimum_quantity: 15, reorder_quantity: 30, last_updated_at: new Date().toISOString() },
{ stock_id: 's6', part_id: 'p6', hub_id: 'Pune Hub', available_quantity: 90, reserved_quantity: 10, minimum_quantity: 30, reorder_quantity: 60, last_updated_at: new Date().toISOString() },
{ stock_id: 's7', part_id: 'p7', hub_id: 'Pune Hub', available_quantity: 4, reserved_quantity: 1, minimum_quantity: 10, reorder_quantity: 25, last_updated_at: new Date().toISOString() },
{ stock_id: 's8', part_id: 'p8', hub_id: 'Pune Hub', available_quantity: 200, reserved_quantity: 35, minimum_quantity: 80, reorder_quantity: 150, last_updated_at: new Date().toISOString() },
{ stock_id: 's9', part_id: 'p9', hub_id: 'Pune Hub', available_quantity: 18, reserved_quantity: 4, minimum_quantity: 20, reorder_quantity: 40, last_updated_at: new Date().toISOString() },
{ stock_id: 's10', part_id: 'p10', hub_id: 'Pune Hub', available_quantity: 55, reserved_quantity: 5, minimum_quantity: 25, reorder_quantity: 50, last_updated_at: new Date().toISOString() },
{ stock_id: 's11', part_id: 'p11', hub_id: 'Pune Hub', available_quantity: 7, reserved_quantity: 2, minimum_quantity: 10, reorder_quantity: 20, last_updated_at: new Date().toISOString() },
{ stock_id: 's12', part_id: 'p12', hub_id: 'Pune Hub', available_quantity: 130, reserved_quantity: 15, minimum_quantity: 60, reorder_quantity: 120, last_updated_at: new Date().toISOString() },
{ stock_id: 's13', part_id: 'p13', hub_id: 'Pune Hub', available_quantity: 22, reserved_quantity: 0, minimum_quantity: 8, reorder_quantity: 16, last_updated_at: new Date().toISOString() }

];

const SEED_WORK_ORDER_PARTS: WorkOrderPart[] = [
    { wo_part_id: 'wop1', work_order_id: 'wo1', part_id: 'p3', quantity_required: 1, quantity_issued: 1, quantity_consumed: 0, status: WorkOrderPartStatus.ISSUED, hub_id: 'Pune Hub' }
];

const SEED_REORDER_ALERTS: ReorderAlert[] = [
    { 
        alert_id: 'ra1', 
        part_id: 'p2', 
        hub_id: 'Pune Hub', 
        current_quantity: 8, 
        minimum_quantity: 10, 
        suggested_reorder_quantity: 20, 
        status: ReorderStatus.OPEN, 
        created_at: new Date().toISOString() 
    }
];

const SEED_RECONCILIATION_RECORDS: ReconciliationRecord[] = [
    {
        reconciliation_id: 'rec1',
        vehicle_id: 'v1',
        period_start: '2024-02-01',
        period_end: '2024-02-29',
        total_cost_events: 12,
        estimated_events_count: 3,
        variance_amount: 4500,
        confidence_score: 'Medium',
        status: ReconciliationStatus.OPEN,
        notes: 'Variance in fuel costs vs estimated mileage.'
    },
    {
        reconciliation_id: 'rec2',
        vehicle_id: 'v3',
        period_start: '2024-02-01',
        period_end: '2024-02-29',
        total_cost_events: 8,
        estimated_events_count: 0,
        variance_amount: 0,
        confidence_score: 'High',
        status: ReconciliationStatus.RECONCILED,
        reconciled_by: 'System Auto-Match',
        reconciled_at: '2024-03-01T09:00:00Z'
    }
];

const SEED_DOCUMENTS: VehicleDocument[] = [
    { document_id: 'doc1', vehicle_id: 'v1', document_type: DocumentType.RC, document_number: 'MH46BM2849', issue_date: '2022-01-15', expiry_date: '2037-01-14', status: DocumentStatus.VALID, uploaded_by: 'System' },
    { document_id: 'doc2', vehicle_id: 'v1', document_type: DocumentType.INSURANCE, document_number: 'POL-123456789', issue_date: '2023-05-20', expiry_date: '2024-05-19', status: DocumentStatus.VALID, uploaded_by: 'System' },
    { document_id: 'doc3', vehicle_id: 'v1', document_type: DocumentType.PUC, document_number: 'PUC-98765', issue_date: '2023-11-10', expiry_date: '2024-05-10', status: DocumentStatus.VALID, uploaded_by: 'System' },
    { document_id: 'doc4', vehicle_id: 'v2', document_type: DocumentType.FITNESS, document_number: 'FIT-554433', issue_date: '2022-06-01', expiry_date: '2024-01-01', status: DocumentStatus.EXPIRED, uploaded_by: 'System' },
    { document_id: 'doc5', vehicle_id: 'v3', document_type: DocumentType.PERMIT, document_number: 'NP-112233', issue_date: '2023-01-01', expiry_date: '2028-01-01', status: DocumentStatus.VALID, uploaded_by: 'System' },
];

const SEED_TELEMETRY: TelemetryEvent[] = [
    { event_id: 't1', vehicle_id: 'v1', tracker_id: 'trk-v1', event_timestamp: new Date().toISOString(), latitude: 18.5204, longitude: 73.8567, speed: 45, ignition_status: true },
    { event_id: 't2', vehicle_id: 'v1', tracker_id: 'trk-v1', event_timestamp: new Date(Date.now() - 300000).toISOString(), latitude: 18.5100, longitude: 73.8500, speed: 40, ignition_status: true },
    { event_id: 't3', vehicle_id: 'v1', tracker_id: 'trk-v1', event_timestamp: new Date(Date.now() - 600000).toISOString(), latitude: 18.5000, longitude: 73.8400, speed: 0, ignition_status: false },
    { event_id: 't4', vehicle_id: 'v3', tracker_id: 'trk-v3', event_timestamp: new Date().toISOString(), latitude: 28.7041, longitude: 77.1025, speed: 60, ignition_status: true },
    { event_id: 't5', vehicle_id: 'v3', tracker_id: 'trk-v3', event_timestamp: new Date(Date.now() - 300000).toISOString(), latitude: 28.6895, longitude: 77.0892, speed: 44, ignition_status: true },
    { event_id: 't6', vehicle_id: 'v3', tracker_id: 'trk-v3', event_timestamp: new Date(Date.now() - 600000).toISOString(), latitude: 28.6741, longitude: 77.0741, speed: 18, ignition_status: true },
    { event_id: 't7', vehicle_id: 'v4', tracker_id: 'trk-v4', event_timestamp: new Date().toISOString(), latitude: 12.9716, longitude: 77.5946, speed: 2, ignition_status: true },
    { event_id: 't8', vehicle_id: 'v4', tracker_id: 'trk-v4', event_timestamp: new Date(Date.now() - 300000).toISOString(), latitude: 12.9698, longitude: 77.5894, speed: 7, ignition_status: true },
    { event_id: 't9', vehicle_id: 'v4', tracker_id: 'trk-v4', event_timestamp: new Date(Date.now() - 600000).toISOString(), latitude: 12.9681, longitude: 77.5841, speed: 14, ignition_status: true },
    { event_id: 't10', vehicle_id: 'v7', tracker_id: 'trk-v7', event_timestamp: new Date().toISOString(), latitude: 19.2183, longitude: 72.9781, speed: 0, ignition_status: false },
    { event_id: 't11', vehicle_id: 'v7', tracker_id: 'trk-v7', event_timestamp: new Date(Date.now() - 300000).toISOString(), latitude: 19.2214, longitude: 72.9868, speed: 28, ignition_status: true },
    { event_id: 't12', vehicle_id: 'v7', tracker_id: 'trk-v7', event_timestamp: new Date(Date.now() - 600000).toISOString(), latitude: 19.2262, longitude: 72.9952, speed: 36, ignition_status: true },
    // v2 — IN_TRANSIT trip-002 (Delhi → Mumbai, NH48). 5 pings ~2h apart showing ~430 km tracked so far.
    // Delhi → Mathura → Agra → Gwalior → Jhansi (current position ~30% of 1409 km route)
    { event_id: 't13', vehicle_id: 'v2', tracker_id: 'trk-v2', event_timestamp: new Date(Date.now() - 36000000).toISOString(), latitude: 28.6139, longitude: 77.2090, speed: 0,  ignition_status: false },
    { event_id: 't14', vehicle_id: 'v2', tracker_id: 'trk-v2', event_timestamp: new Date(Date.now() - 28800000).toISOString(), latitude: 27.4924, longitude: 77.6737, speed: 72, ignition_status: true  },
    { event_id: 't15', vehicle_id: 'v2', tracker_id: 'trk-v2', event_timestamp: new Date(Date.now() - 21600000).toISOString(), latitude: 27.1767, longitude: 78.0081, speed: 68, ignition_status: true  },
    { event_id: 't16', vehicle_id: 'v2', tracker_id: 'trk-v2', event_timestamp: new Date(Date.now() - 14400000).toISOString(), latitude: 26.2183, longitude: 78.1828, speed: 65, ignition_status: true  },
    { event_id: 't17', vehicle_id: 'v2', tracker_id: 'trk-v2', event_timestamp: new Date(Date.now() -  7200000).toISOString(), latitude: 25.4484, longitude: 78.5685, speed: 60, ignition_status: true  },
];

const SEED_TRACKING_DEVICES: VehicleTrackingDevice[] = [
    {
        tracker_id: 'trk-v1',
        vehicle_id: 'v1',
        device_kind: TrackerDeviceKind.GPS_TRACKING,
        is_primary: true,
        manufacturer: 'Teltonika',
        model: 'FMB920',
        serial_number: 'TLT-FMB920-001234',
        imei: '356307041234567',
        sim_iccid: '8991101200003204541',
        mobile_number: '+919876543210',
        protocol: TrackerProtocol.TELTONIKA,
        install_date: '2024-01-15',
        installer_vendor: 'Trackmate Solutions',
        mounting_location: 'Under Dashboard',
        power_source: TrackerPowerSource.DIRECT,
        ignition_wired: true,
        odometer_at_install: 42000,
        server_host: 'track.optimile.in',
        server_port: '5027',
        apn: 'airtelgprs.com',
        reporting_interval_sec: 30,
        idle_interval_sec: 300,
        heartbeat_interval_sec: 120,
        timezone: 'Asia/Kolkata',
        status: TrackerStatus.ACTIVE,
        last_ping: new Date(Date.now() - 45000).toISOString(),
    },
    {
        tracker_id: 'trk-v3',
        vehicle_id: 'v3',
        device_kind: TrackerDeviceKind.GPS_TRACKING,
        is_primary: true,
        manufacturer: 'Queclink',
        model: 'GV300W',
        serial_number: 'QUE-GV300W-003871',
        imei: '868683041122334',
        sim_iccid: '8991101200003204543',
        mobile_number: '+919910001122',
        protocol: TrackerProtocol.OTHER,
        install_date: '2024-02-08',
        installer_vendor: 'North Fleet Systems',
        mounting_location: 'Cabin Console',
        power_source: TrackerPowerSource.DIRECT,
        ignition_wired: true,
        odometer_at_install: 18200,
        server_host: 'track.optimile.in',
        server_port: '5027',
        apn: 'jionet',
        reporting_interval_sec: 20,
        idle_interval_sec: 180,
        heartbeat_interval_sec: 120,
        timezone: 'Asia/Kolkata',
        status: TrackerStatus.ACTIVE,
        last_ping: new Date(Date.now() - 20000).toISOString(),
    },
    {
        tracker_id: 'trk-v4',
        vehicle_id: 'v4',
        device_kind: TrackerDeviceKind.GPS_TRACKING,
        is_primary: true,
        manufacturer: 'Teltonika',
        model: 'FMC130',
        serial_number: 'TLT-FMC130-000774',
        imei: '356307049998111',
        sim_iccid: '8991101200003204544',
        mobile_number: '+919845670012',
        protocol: TrackerProtocol.TELTONIKA,
        install_date: '2024-02-24',
        installer_vendor: 'South Mobility Tech',
        mounting_location: 'Fuse Box Harness',
        power_source: TrackerPowerSource.DIRECT,
        ignition_wired: true,
        odometer_at_install: 26540,
        server_host: 'track.optimile.in',
        server_port: '5027',
        apn: 'airtelgprs.com',
        reporting_interval_sec: 30,
        idle_interval_sec: 240,
        heartbeat_interval_sec: 120,
        timezone: 'Asia/Kolkata',
        status: TrackerStatus.ACTIVE,
        last_ping: new Date(Date.now() - 90000).toISOString(),
    },
    {
        tracker_id: 'trk-v7',
        vehicle_id: 'v7',
        device_kind: TrackerDeviceKind.GPS_TRACKING,
        is_primary: true,
        manufacturer: 'Ruptela',
        model: 'FM-Pro4',
        serial_number: 'RUP-FMPRO4-001903',
        imei: '359632101234567',
        sim_iccid: '8991101200003204545',
        mobile_number: '+919867540099',
        protocol: TrackerProtocol.OTHER,
        install_date: '2024-03-02',
        installer_vendor: 'West Corridor Telematics',
        mounting_location: 'Dashboard Lower Fascia',
        power_source: TrackerPowerSource.DIRECT,
        ignition_wired: true,
        odometer_at_install: 11890,
        server_host: 'track.optimile.in',
        server_port: '5027',
        apn: 'viinternet',
        reporting_interval_sec: 25,
        idle_interval_sec: 180,
        heartbeat_interval_sec: 120,
        timezone: 'Asia/Kolkata',
        status: TrackerStatus.ACTIVE,
        last_ping: new Date(Date.now() - 150000).toISOString(),
    },
    {
        tracker_id: 'trk-v1-driver-app',
        vehicle_id: 'v1',
        device_kind: TrackerDeviceKind.DRIVER_APP,
        is_primary: false,
        manufacturer: 'Optimile',
        model: 'Driver App',
        serial_number: 'DRV-APP-v1-d1',
        imei: 'APP-V1-D1',
        mobile_number: '+919876543210',
        protocol: TrackerProtocol.OTHER,
        install_date: '2024-03-10',
        installer_vendor: 'Self Activated',
        mounting_location: 'Driver Smartphone',
        power_source: TrackerPowerSource.BATTERY_PACK,
        ignition_wired: false,
        odometer_at_install: 46850,
        server_host: 'track.optimile.in',
        server_port: '443',
        apn: 'mobile-data',
        reporting_interval_sec: 60,
        idle_interval_sec: 600,
        heartbeat_interval_sec: 180,
        timezone: 'Asia/Kolkata',
        status: TrackerStatus.ACTIVE,
        last_ping: new Date(Date.now() - 120000).toISOString(),
    },
];

const mergeSeedRecords = <T,>(
  existing: T[],
  seeds: T[],
  getKey: (record: T) => string
) => {
  const existingKeys = new Set(existing.map(getKey));
  const missingSeeds = seeds.filter((record) => !existingKeys.has(getKey(record)));
  return missingSeeds.length ? [...existing, ...missingSeeds] : existing;
};

// Helper to simulate network delay
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const getTrackerComponentRemarks = (tracker: Pick<VehicleTrackingDevice, 'tracker_id' | 'device_kind' | 'imei'>) =>
  `Tracker ID: ${tracker.tracker_id} | Kind: ${tracker.device_kind} | IMEI: ${tracker.imei}`;

const buildTrackingComponent = (tracker: VehicleTrackingDevice): VehicleComponent => ({
  component_id: `comp-trk-${tracker.tracker_id}`,
  vehicle_id: tracker.vehicle_id,
  component_type: ComponentType.TRACKING_DEVICE,
  serial_number: tracker.serial_number,
  make: tracker.manufacturer,
  model: tracker.model,
  installation_date: tracker.install_date,
  status:
    tracker.status === TrackerStatus.REMOVED
      ? ComponentStatus.REMOVED
      : tracker.status === TrackerStatus.ACTIVE
        ? ComponentStatus.ACTIVE
        : ComponentStatus.INACTIVE,
  remarks: getTrackerComponentRemarks(tracker),
});

const syncTrackingComponents = (components: VehicleComponent[], trackers: VehicleTrackingDevice[]) => {
  const nonTrackerComponents = components.filter((component) => component.component_type !== ComponentType.TRACKING_DEVICE);
  const trackerComponents = trackers.map(buildTrackingComponent);
  return [...nonTrackerComponents, ...trackerComponents];
};

const createSyntheticTelemetry = (vehicleId: string, tracker: VehicleTrackingDevice): TelemetryEvent[] => {
  const now = Date.now();
  const baseLatitude = tracker.device_kind === TrackerDeviceKind.DRIVER_APP ? 19.076 : 18.5204;
  const baseLongitude = tracker.device_kind === TrackerDeviceKind.DRIVER_APP ? 72.8777 : 73.8567;

  return [
    {
      event_id: `tel-${crypto.randomUUID()}`,
      vehicle_id: vehicleId,
      tracker_id: tracker.tracker_id,
      event_timestamp: tracker.last_ping || new Date(now).toISOString(),
      latitude: baseLatitude,
      longitude: baseLongitude,
      speed: tracker.device_kind === TrackerDeviceKind.MANUAL ? 0 : 42,
      ignition_status: tracker.device_kind !== TrackerDeviceKind.MANUAL,
    },
    {
      event_id: `tel-${crypto.randomUUID()}`,
      vehicle_id: vehicleId,
      tracker_id: tracker.tracker_id,
      event_timestamp: new Date(now - 300000).toISOString(),
      latitude: baseLatitude - 0.0104,
      longitude: baseLongitude - 0.0067,
      speed: tracker.device_kind === TrackerDeviceKind.MANUAL ? 0 : 28,
      ignition_status: tracker.device_kind !== TrackerDeviceKind.MANUAL,
    },
    {
      event_id: `tel-${crypto.randomUUID()}`,
      vehicle_id: vehicleId,
      tracker_id: tracker.tracker_id,
      event_timestamp: new Date(now - 600000).toISOString(),
      latitude: baseLatitude - 0.018,
      longitude: baseLongitude - 0.014,
      speed: 0,
      ignition_status: false,
    },
  ];
};

const validateVehiclePayload = (vehicle: any) => {
  if (!vehicle.registration_number?.trim()) throw new Error('Registration number is required.');
  if (!vehicle.vehicle_type) throw new Error('Vehicle type is required.');
  if (!Number.isFinite(vehicle.capacity_tons) || vehicle.capacity_tons <= 0) {
    throw new Error('Payload capacity must be greater than zero.');
  }

  if (vehicle.status === VehicleStatus.ACTIVE) {
    const requiredFields = [
      ['chassis_number', 'Chassis Number (VIN)'],
      ['engine_number', 'Engine Number'],
      ['make', 'Make'],
      ['model', 'Model'],
      ['manufacturing_year', 'Manufacturing Year'],
      ['ownership_type', 'Ownership'],
      ['fuel_type', 'Fuel Type'],
      ['emission_standard', 'Emission Standard'],
      ['body_type', 'Body Type'],
    ] as const;
    const missing = requiredFields.find(([key]) => !vehicle[key]);
    if (missing) throw new Error(`${missing[1]} is required before activating a vehicle.`);
  }
};

class MockDatabase {
  constructor() {
    this.init();
  }

  private init() {
    if (!localStorage.getItem('optimile_vehicles')) localStorage.setItem('optimile_vehicles', JSON.stringify(SEED_VEHICLES));
    if (!localStorage.getItem('optimile_drivers')) localStorage.setItem('optimile_drivers', JSON.stringify(SEED_DRIVERS));
    if (!localStorage.getItem('optimile_work_orders')) localStorage.setItem('optimile_work_orders', JSON.stringify(SEED_WORK_ORDERS));
    if (!localStorage.getItem('optimile_templates')) localStorage.setItem('optimile_templates', JSON.stringify(SEED_MAINTENANCE_TEMPLATES));
    if (!localStorage.getItem('optimile_components')) localStorage.setItem('optimile_components', JSON.stringify(SEED_COMPONENTS));
    if (!localStorage.getItem('optimile_fuel_events')) localStorage.setItem('optimile_fuel_events', JSON.stringify(SEED_FUEL_EVENTS));
    if (!localStorage.getItem('optimile_adblue_events')) localStorage.setItem('optimile_adblue_events', JSON.stringify(SEED_ADBLUE_EVENTS));
    if (!localStorage.getItem('optimile_tyre_health')) localStorage.setItem('optimile_tyre_health', JSON.stringify(SEED_TYRE_HEALTH_SIGNALS));
    if (!localStorage.getItem('optimile_tyre_events')) localStorage.setItem('optimile_tyre_events', JSON.stringify(SEED_TYRE_EVENT_SIGNALS));
    if (!localStorage.getItem('optimile_exceptions')) localStorage.setItem('optimile_exceptions', JSON.stringify([]));
    if (!localStorage.getItem('optimile_energy_anomalies')) localStorage.setItem('optimile_energy_anomalies', JSON.stringify(SEED_ENERGY_ANOMALIES));
    if (!localStorage.getItem('optimile_energy_maintenance_signals')) localStorage.setItem('optimile_energy_maintenance_signals', JSON.stringify(SEED_ENERGY_MAINTENANCE_SIGNALS));
    if (!localStorage.getItem('optimile_spare_parts')) localStorage.setItem('optimile_spare_parts', JSON.stringify(SEED_SPARE_PARTS));
    if (!localStorage.getItem('optimile_inventory_stock')) localStorage.setItem('optimile_inventory_stock', JSON.stringify(SEED_INVENTORY_STOCK));
    if (!localStorage.getItem('optimile_inventory_movements')) localStorage.setItem('optimile_inventory_movements', JSON.stringify([]));
    if (!localStorage.getItem('optimile_work_order_parts')) localStorage.setItem('optimile_work_order_parts', JSON.stringify(SEED_WORK_ORDER_PARTS));
    if (!localStorage.getItem('optimile_reorder_alerts')) localStorage.setItem('optimile_reorder_alerts', JSON.stringify(SEED_REORDER_ALERTS));
    // Seed behavior events
    if (!localStorage.getItem('optimile_behavior_events')) localStorage.setItem('optimile_behavior_events', JSON.stringify(SEED_BEHAVIOR_EVENTS));
    // Seed reconciliation records
    if (!localStorage.getItem('optimile_reconciliation')) localStorage.setItem('optimile_reconciliation', JSON.stringify(SEED_RECONCILIATION_RECORDS));
    // Seed documents
    if (!localStorage.getItem('optimile_documents')) localStorage.setItem('optimile_documents', JSON.stringify(SEED_DOCUMENTS));
    // Seed telemetry
    if (!localStorage.getItem('optimile_telemetry')) localStorage.setItem('optimile_telemetry', JSON.stringify(SEED_TELEMETRY));
    // Seed tracking devices
    if (!localStorage.getItem('optimile_tracking_devices')) localStorage.setItem('optimile_tracking_devices', JSON.stringify(SEED_TRACKING_DEVICES));

    const mergedTrackers = mergeSeedRecords(
      JSON.parse(localStorage.getItem('optimile_tracking_devices') || '[]') as VehicleTrackingDevice[],
      SEED_TRACKING_DEVICES,
      (tracker) => tracker.tracker_id
    );
    localStorage.setItem('optimile_tracking_devices', JSON.stringify(mergedTrackers));

    const mergedTelemetry = mergeSeedRecords(
      JSON.parse(localStorage.getItem('optimile_telemetry') || '[]') as TelemetryEvent[],
      SEED_TELEMETRY,
      (event) => event.event_id
    );
    localStorage.setItem('optimile_telemetry', JSON.stringify(mergedTelemetry));
  }

  // --- Getters ---
  getVehicles(): Vehicle[] { return JSON.parse(localStorage.getItem('optimile_vehicles') || '[]'); }
  getDrivers(): Driver[] { return JSON.parse(localStorage.getItem('optimile_drivers') || '[]'); }
  getTrips(): Trip[] { return JSON.parse(localStorage.getItem('optimile_trips') || 'null') ?? []; }
  saveTrips(data: Trip[]) { localStorage.setItem('optimile_trips', JSON.stringify(data)); }
  getWorkOrders(): WorkOrder[] { return JSON.parse(localStorage.getItem('optimile_work_orders') || '[]'); }
  getTemplates(): MaintenanceTemplate[] { return JSON.parse(localStorage.getItem('optimile_templates') || '[]'); }
  getComponents(): VehicleComponent[] {
    const rawComponents = JSON.parse(localStorage.getItem('optimile_components') || '[]') as VehicleComponent[];
    const syncedComponents = syncTrackingComponents(rawComponents, this.getTrackingDevices());
    if (JSON.stringify(rawComponents) !== JSON.stringify(syncedComponents)) {
      this.saveComponents(syncedComponents);
    }
    return syncedComponents;
  }
  getFuelEvents(): FuelEvent[] { return JSON.parse(localStorage.getItem('optimile_fuel_events') || '[]'); }
  getAdBlueEvents(): AdBlueEvent[] { return JSON.parse(localStorage.getItem('optimile_adblue_events') || '[]'); }
  getTyreHealthSignals(): TyreHealthSignal[] { return JSON.parse(localStorage.getItem('optimile_tyre_health') || '[]'); }
  getTyreEventSignals(): TyreEventSignal[] { return JSON.parse(localStorage.getItem('optimile_tyre_events') || '[]'); }
  getExceptions(): OpsException[] { return JSON.parse(localStorage.getItem('optimile_exceptions') || '[]'); }
  getEnergyAnomalies(): EnergyAnomaly[] { return JSON.parse(localStorage.getItem('optimile_energy_anomalies') || '[]'); }
  getEnergyMaintenanceSignals(): EnergyMaintenanceSignal[] { return JSON.parse(localStorage.getItem('optimile_energy_maintenance_signals') || '[]'); }
  getSpareParts(): SparePart[] { return JSON.parse(localStorage.getItem('optimile_spare_parts') || '[]'); }
  getInventoryStock(): InventoryStock[] { return JSON.parse(localStorage.getItem('optimile_inventory_stock') || '[]'); }
  getInventoryMovements(): InventoryMovement[] { return JSON.parse(localStorage.getItem('optimile_inventory_movements') || '[]'); }
  getWorkOrderParts(): WorkOrderPart[] { return JSON.parse(localStorage.getItem('optimile_work_order_parts') || '[]'); }
  getReorderAlerts(): ReorderAlert[] { return JSON.parse(localStorage.getItem('optimile_reorder_alerts') || '[]'); }
  getBehaviorEvents(): DriverBehaviorEvent[] { return JSON.parse(localStorage.getItem('optimile_behavior_events') || '[]'); }
  getReconciliationRecords(): ReconciliationRecord[] { return JSON.parse(localStorage.getItem('optimile_reconciliation') || '[]'); }
  getDocuments(): VehicleDocument[] {
    const rawDocuments = JSON.parse(localStorage.getItem('optimile_documents') || '[]') as VehicleDocument[];
    const hydratedDocuments = rawDocuments.map((doc) => ({
      ...doc,
      status: getComputedDocumentStatus(doc.expiry_date),
      history: doc.history?.map((entry) => ({
        ...entry,
        status: getComputedDocumentStatus(entry.expiry_date),
      })),
    }));
    if (JSON.stringify(rawDocuments) !== JSON.stringify(hydratedDocuments)) {
      this.saveDocuments(hydratedDocuments);
    }
    return hydratedDocuments;
  }
  getDriverDocuments(): DriverDocument[] { return JSON.parse(localStorage.getItem('optimile_driver_documents') || '[]'); }
  getTelemetry(): TelemetryEvent[] {
    const rawTelemetry = JSON.parse(localStorage.getItem('optimile_telemetry') || '[]') as TelemetryEvent[];
    const trackers = this.getTrackingDevices();
    const primaryByVehicle = new Map(
      trackers
        .filter((tracker) => tracker.status !== TrackerStatus.REMOVED)
        .map((tracker) => [tracker.vehicle_id, tracker] as const)
    );
    const hydratedTelemetry = rawTelemetry.map((event) => {
      if (event.tracker_id) return event;
      const primaryTracker = primaryByVehicle.get(event.vehicle_id);
      return primaryTracker ? { ...event, tracker_id: primaryTracker.tracker_id } : event;
    });
    if (JSON.stringify(rawTelemetry) !== JSON.stringify(hydratedTelemetry)) {
      this.saveTelemetry(hydratedTelemetry);
    }
    return hydratedTelemetry;
  }

  // --- Savers ---
  saveVehicles(data: Vehicle[]) { localStorage.setItem('optimile_vehicles', JSON.stringify(data)); }
  saveDrivers(data: Driver[]) { localStorage.setItem('optimile_drivers', JSON.stringify(data)); }
  saveWorkOrders(data: WorkOrder[]) { localStorage.setItem('optimile_work_orders', JSON.stringify(data)); }
  saveTemplates(data: MaintenanceTemplate[]) { localStorage.setItem('optimile_templates', JSON.stringify(data)); }
  saveFuelEvents(data: FuelEvent[]) { localStorage.setItem('optimile_fuel_events', JSON.stringify(data)); }
  saveAdBlueEvents(data: AdBlueEvent[]) { localStorage.setItem('optimile_adblue_events', JSON.stringify(data)); }
  saveExceptions(data: OpsException[]) { localStorage.setItem('optimile_exceptions', JSON.stringify(data)); }
  saveEnergyAnomalies(data: EnergyAnomaly[]) { localStorage.setItem('optimile_energy_anomalies', JSON.stringify(data)); }
  saveEnergyMaintenanceSignals(data: EnergyMaintenanceSignal[]) { localStorage.setItem('optimile_energy_maintenance_signals', JSON.stringify(data)); }
  saveSpareParts(data: SparePart[]) { localStorage.setItem('optimile_spare_parts', JSON.stringify(data)); }
  saveInventoryStock(data: InventoryStock[]) { localStorage.setItem('optimile_inventory_stock', JSON.stringify(data)); }
  saveInventoryMovements(data: InventoryMovement[]) { localStorage.setItem('optimile_inventory_movements', JSON.stringify(data)); }
  saveWorkOrderParts(data: WorkOrderPart[]) { localStorage.setItem('optimile_work_order_parts', JSON.stringify(data)); }
  saveReorderAlerts(data: ReorderAlert[]) { localStorage.setItem('optimile_reorder_alerts', JSON.stringify(data)); }
  saveBehaviorEvents(data: DriverBehaviorEvent[]) { localStorage.setItem('optimile_behavior_events', JSON.stringify(data)); }
  saveReconciliationRecords(data: ReconciliationRecord[]) { localStorage.setItem('optimile_reconciliation', JSON.stringify(data)); }
  saveDocuments(data: VehicleDocument[]) { localStorage.setItem('optimile_documents', JSON.stringify(data)); }
  saveDriverDocuments(data: DriverDocument[]) { localStorage.setItem('optimile_driver_documents', JSON.stringify(data)); }
  saveTelemetry(data: TelemetryEvent[]) { localStorage.setItem('optimile_telemetry', JSON.stringify(data)); }
  getTrackingDevices(): VehicleTrackingDevice[] {
    const trackers = JSON.parse(localStorage.getItem('optimile_tracking_devices') || '[]') as Partial<VehicleTrackingDevice>[];
    const activeByVehicle = new Set<string>();
    const normalizeDeviceKind = (kind?: string): TrackerDeviceKind => {
      switch (kind) {
        case TrackerDeviceKind.GPS_TRACKING:
        case 'Hardwired GPS':
        case 'OBD Tracker':
          return TrackerDeviceKind.GPS_TRACKING;
        case TrackerDeviceKind.SIM_TRACKING:
          return TrackerDeviceKind.SIM_TRACKING;
        case TrackerDeviceKind.MANUAL:
          return TrackerDeviceKind.MANUAL;
        case TrackerDeviceKind.DRIVER_APP:
          return TrackerDeviceKind.DRIVER_APP;
        default:
          return TrackerDeviceKind.GPS_TRACKING;
      }
    };
    return trackers.map((tracker) => {
      const vehicleId = tracker.vehicle_id || '';
      const isPrimary = typeof tracker.is_primary === 'boolean' ? tracker.is_primary : !activeByVehicle.has(vehicleId);
      if (vehicleId && tracker.status !== TrackerStatus.REMOVED && isPrimary) {
        activeByVehicle.add(vehicleId);
      }
      return {
        device_kind: normalizeDeviceKind(tracker.device_kind),
        is_primary: isPrimary,
        manufacturer: tracker.manufacturer || 'Unknown',
        model: tracker.model || 'Device',
        serial_number: tracker.serial_number || '',
        imei: tracker.imei || '',
        protocol: tracker.protocol || TrackerProtocol.OTHER,
        install_date: tracker.install_date || new Date().toISOString().split('T')[0],
        installer_vendor: tracker.installer_vendor || 'Unknown',
        mounting_location: tracker.mounting_location || 'Unknown',
        power_source: tracker.power_source || TrackerPowerSource.DIRECT,
        ignition_wired: tracker.ignition_wired ?? false,
        odometer_at_install: tracker.odometer_at_install ?? 0,
        server_host: tracker.server_host || '',
        server_port: tracker.server_port || '',
        apn: tracker.apn || '',
        reporting_interval_sec: tracker.reporting_interval_sec ?? 0,
        idle_interval_sec: tracker.idle_interval_sec ?? 0,
        heartbeat_interval_sec: tracker.heartbeat_interval_sec ?? 0,
        timezone: tracker.timezone || 'Asia/Kolkata',
        status: tracker.status || TrackerStatus.ACTIVE,
        tracker_id: tracker.tracker_id || `trk-${crypto.randomUUID()}`,
        vehicle_id: vehicleId,
        sim_iccid: tracker.sim_iccid,
        mobile_number: tracker.mobile_number,
        last_ping: tracker.last_ping,
      };
    });
  }
  saveTrackingDevices(data: VehicleTrackingDevice[]) { localStorage.setItem('optimile_tracking_devices', JSON.stringify(data)); }
  saveComponents(data: VehicleComponent[]) { localStorage.setItem('optimile_components', JSON.stringify(data)); }
}

const db = new MockDatabase();

// ... [Existing APIs]

export const InventoryAPI = {
    getParts: async (): Promise<SparePart[]> => {
        await delay(400);
        return db.getSpareParts();
    },
    createPart: async (part: any) => {
        await delay(500);
        const newPart = { ...part, part_id: crypto.randomUUID() };
        const all = db.getSpareParts();
        db.saveSpareParts([...all, newPart]);
        return newPart;
    },
    getStock: async (hubId?: string): Promise<InventoryStock[]> => {
        await delay(400);
        const stock = db.getInventoryStock();
        return hubId ? stock.filter(s => s.hub_id === hubId) : stock;
    },
    getMovements: async (partId?: string, hubId?: string): Promise<InventoryMovement[]> => {
        await delay(400);
        let movs = db.getInventoryMovements();
        if (partId) movs = movs.filter(m => m.part_id === partId);
        if (hubId) movs = movs.filter(m => m.hub_id === hubId);
        return movs.sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    },
    getReorderAlerts: async (hubId?: string): Promise<ReorderAlert[]> => {
        await delay(300);
        let alerts = db.getReorderAlerts();
        if (hubId) alerts = alerts.filter(a => a.hub_id === hubId);
        return alerts.sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    },
    updateAlertStatus: async (alertId: string, status: ReorderStatus) => {
        await delay(300);
        const all = db.getReorderAlerts();
        const idx = all.findIndex(a => a.alert_id === alertId);
        if (idx !== -1) {
            all[idx].status = status;
            db.saveReorderAlerts(all);
        }
    },
    runReorderScan: async () => {
        // Internal Logic to check stock vs min and generate alerts + exceptions
        const stock = db.getInventoryStock();
        const parts = db.getSpareParts();
        const existingAlerts = db.getReorderAlerts();
        const exceptions = db.getExceptions();
        const newAlerts: ReorderAlert[] = [];
        
        let alertsChanged = false;
        let exceptionsChanged = false;

        stock.forEach(item => {
            if (item.available_quantity <= item.minimum_quantity) {
                // Check if alert exists
                const existing = existingAlerts.find(a => a.part_id === item.part_id && a.hub_id === item.hub_id && a.status !== ReorderStatus.ORDERED);
                
                if (!existing) {
                    // Create new alert
                    const newAlert: ReorderAlert = {
                        alert_id: crypto.randomUUID(),
                        part_id: item.part_id,
                        hub_id: item.hub_id,
                        current_quantity: item.available_quantity,
                        minimum_quantity: item.minimum_quantity,
                        suggested_reorder_quantity: item.reorder_quantity,
                        status: ReorderStatus.OPEN,
                        created_at: new Date().toISOString()
                    };
                    existingAlerts.push(newAlert);
                    newAlerts.push(newAlert);
                    alertsChanged = true;

                    // Raise Exception
                    const partName = parts.find(p => p.part_id === item.part_id)?.part_name || 'Unknown Part';
                    const exception: OpsException = {
                        exception_id: crypto.randomUUID(),
                        exception_type: 'SPARE_PART_SHORTAGE',
                        entity_type: 'Inventory',
                        entity_id: item.part_id,
                        severity: ExceptionSeverity.HIGH,
                        detected_at: new Date().toISOString(),
                        status: ExceptionStatus.OPEN,
                        source_module: 'Inventory',
                        description: `Low Stock: ${partName} at ${item.hub_id}. Available: ${item.available_quantity}, Min: ${item.minimum_quantity}.`,
                        recommendation: `Procure ${item.reorder_quantity} units immediately to avoid maintenance delays.`
                    };
                    exceptions.push(exception);
                    exceptionsChanged = true;
                }
            }
        });

        if (alertsChanged) db.saveReorderAlerts(existingAlerts);
        if (exceptionsChanged) db.saveExceptions(exceptions);
        
        return newAlerts;
    },
    adjustStock: async (data: { 
        part_id: string, 
        hub_id: string, 
        type: MovementType, 
        quantity: number, 
        reference_type: 'WorkOrder' | 'Manual' | 'Vendor', 
        reference_id: string, 
        performed_by: string,
        reason?: string
    }) => {
        await delay(600);
        const stock = db.getInventoryStock();
        let item = stock.find(s => s.part_id === data.part_id && s.hub_id === data.hub_id);

        if (!item) {
            // Allow creation for IN/Manual, but not OUT
            if (data.type === MovementType.OUT || data.type === MovementType.RESERVE) {
                throw new Error("Cannot transact. Part not found in this Hub.");
            }
            item = {
                stock_id: crypto.randomUUID(),
                part_id: data.part_id,
                hub_id: data.hub_id,
                available_quantity: 0,
                reserved_quantity: 0,
                minimum_quantity: 0,
                reorder_quantity: 0,
                last_updated_at: new Date().toISOString()
            };
            stock.push(item);
        }

        // Transaction Logic
        if (data.type === MovementType.OUT) {
            if (item.available_quantity < data.quantity) {
                throw new Error(`Insufficient stock. Available: ${item.available_quantity}`);
            }
            item.available_quantity -= data.quantity;
        } else if (data.type === MovementType.IN) {
            item.available_quantity += data.quantity;
        } else if (data.type === MovementType.ADJUSTMENT) {
            item.available_quantity += data.quantity; 
            if(item.available_quantity < 0) item.available_quantity = 0; 
        } else if (data.type === MovementType.RESERVE) {
            // Issue: Available -> Reserved
            if (item.available_quantity < data.quantity) {
                throw new Error(`Insufficient available stock to reserve. Available: ${item.available_quantity}`);
            }
            item.available_quantity -= data.quantity;
            item.reserved_quantity += data.quantity;
        } else if (data.type === MovementType.CONSUME_RESERVED) {
            // Consume: Reserved -> Gone
            if (item.reserved_quantity < data.quantity) {
                throw new Error(`Not enough reserved stock to consume. Reserved: ${item.reserved_quantity}`);
            }
            item.reserved_quantity -= data.quantity;
        }

        item.last_updated_at = new Date().toISOString();
        db.saveInventoryStock(stock);

        // Log Movement
        const mov: InventoryMovement = {
            movement_id: crypto.randomUUID(),
            part_id: data.part_id,
            hub_id: data.hub_id,
            movement_type: data.type,
            quantity: data.quantity,
            reference_type: data.reference_type,
            reference_id: data.reference_id,
            performed_by: data.performed_by,
            timestamp: new Date().toISOString(),
            reason: data.reason
        };
        const allMovs = db.getInventoryMovements();
        db.saveInventoryMovements([mov, ...allMovs]);

        // TRIGGER REORDER SCAN if stock reduced
        if ([MovementType.OUT, MovementType.RESERVE, MovementType.CONSUME_RESERVED, MovementType.ADJUSTMENT].includes(data.type)) {
            await InventoryAPI.runReorderScan();
        }
    }
};

// ... [Existing APIs]

export const MaintenanceAPI = { 
    getSchedules: async () => {
        await delay(400);
        const vehicles = db.getVehicles();
        return vehicles.map((v, i) => ({
            schedule_id: `sch_${v.vehicle_id}`,
            vehicle_id: v.vehicle_id,
            maintenance_type: MaintenanceType.SERVICE,
            next_due_km: (i + 1) * 5000,
            next_due_date: i === 1 ? new Date(Date.now() - 5 * 86400000).toISOString() : 
                           i === 2 ? new Date(Date.now() + 3 * 86400000).toISOString() : 
                           new Date(Date.now() + 60 * 86400000).toISOString(),
            status: i === 1 ? 'Overdue' : 'Upcoming'
        } as MaintenanceSchedule));
    }, 
    getWorkOrders: async () => { await delay(500); return db.getWorkOrders(); }, 
    createWorkOrder: async (wo: any) => { 
        await delay(600); 
        const newWo = { ...wo, work_order_id: crypto.randomUUID() }; 
        const all = db.getWorkOrders(); 
        db.saveWorkOrders([newWo, ...all]);
        return newWo;
    }, 
    updateWorkOrder: async (id: string, updates: any) => { 
        await delay(400); 
        const all = db.getWorkOrders(); 
        const index = all.findIndex(w => w.work_order_id === id); 
        if (index === -1) throw new Error("Work Order not found"); 
        
        const updated = { ...all[index], ...updates }; 
        all[index] = updated; 
        db.saveWorkOrders(all); 
        return updated;
    }, 
    getTemplates: async () => { await delay(400); return db.getTemplates(); }, 
    createTemplate: async (template: any) => { 
        await delay(500);
        const newTemplate = { ...template, template_id: crypto.randomUUID() };
        const all = db.getTemplates();
        db.saveTemplates([...all, newTemplate]);
        return newTemplate;
    }, 
    getVehicleSchedule: async (vehicleId: string) => {
        await delay(300);
        const vehicle = db.getVehicles().find(v => v.vehicle_id === vehicleId);
        if (!vehicle || !vehicle.maintenance_template_id) return [];
        const template = db.getTemplates().find(t => t.template_id === vehicle.maintenance_template_id);
        if (!template) return [];
        
        return template.items.map((item, index) => ({
            ...item,
            last_performed_date: new Date(Date.now() - (index + 1) * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            last_performed_km: 10000 * (index + 1),
            next_due_date: new Date(Date.now() + (index + 1) * 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            next_due_km: 10000 * (index + 1) + item.frequency_km,
            status: index === 0 ? 'Due' : 'Ok'
        })) as VehicleMaintenanceItem[];
    }, 
    getComponentHistory: async (vehicleId: string) => {
        await delay(300);
        const wos = db.getWorkOrders().filter(w => w.vehicle_id === vehicleId && (w.status === WorkOrderStatus.CLOSED || w.status === WorkOrderStatus.COMPLETED));
        return wos.map(w => ({
            record_id: w.work_order_id,
            vehicle_id: w.vehicle_id,
            component_id: 'generic', 
            work_order_id: w.work_order_id,
            service_date: w.start_date,
            description: w.issue_type,
            odometer: w.odometer_reading
        }));
    }, 
    getVehicleHealth: async (vehicleId: string) => { 
        await delay(300);
        const workOrders = db.getWorkOrders().filter(w => w.vehicle_id === vehicleId);
        
        const now = new Date();
        const last30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const breakdowns30 = workOrders.filter(w => w.type === WorkOrderType.BREAKDOWN && new Date(w.start_date) >= last30);
        
        let status = MaintenanceHealthStatus.GOOD;
        const factors: string[] = [];

        if (breakdowns30.length > 0) {
            status = MaintenanceHealthStatus.CRITICAL;
            factors.push(`${breakdowns30.length} breakdown(s) in last 30 days`);
        }

        if (factors.length === 0) factors.push('Routine maintenance on track');

        return {
            vehicle_id: vehicleId,
            health_status: status,
            contributing_factors: factors,
            calculated_at: new Date().toISOString()
        };
    }, 
    getDashboardKPIs: async () => { 
        await delay(600);
        const vehicles = db.getVehicles();
        const workOrders = db.getWorkOrders();
        
        const overdueCount = 1; 
        
        const closedWOs = workOrders.filter(w => w.downtime_hours !== undefined);
        const totalDowntime = closedWOs.reduce((sum, w) => sum + (w.downtime_hours || 0), 0);
        const avgDowntime = closedWOs.length > 0 ? totalDowntime / closedWOs.length : 0;

        const now = new Date();
        const last30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const breakdowns30 = workOrders.filter(w => w.type === WorkOrderType.BREAKDOWN && new Date(w.start_date) >= last30).length;

        const vehicleStats = vehicles.map(v => {
            const vWos = workOrders.filter(w => w.vehicle_id === v.vehicle_id && w.type === WorkOrderType.BREAKDOWN);
            return {
                vehicle_id: v.vehicle_id,
                breakdown_count: vWos.length,
                total_downtime: vWos.reduce((sum, w) => sum + (w.downtime_hours || 0), 0)
            };
        }).sort((a,b) => b.breakdown_count - a.breakdown_count).slice(0, 5).filter(v => v.breakdown_count > 0);

        return {
            overdue_services_count: overdueCount,
            avg_downtime_hours: Math.round(avgDowntime * 10) / 10,
            breakdowns_last_7_days: 0, 
            breakdowns_last_30_days: breakdowns30,
            chronic_vehicles: vehicleStats
        };
    },
    // Parts Integration
    getParts: async (workOrderId: string): Promise<WorkOrderPart[]> => {
        await delay(300);
        return db.getWorkOrderParts().filter(p => p.work_order_id === workOrderId);
    },
    addPart: async (data: Omit<WorkOrderPart, 'wo_part_id' | 'status' | 'quantity_issued' | 'quantity_consumed'>) => {
        await delay(400);
        const newPart: WorkOrderPart = {
            ...data,
            wo_part_id: crypto.randomUUID(),
            status: WorkOrderPartStatus.PLANNED,
            quantity_issued: 0,
            quantity_consumed: 0
        };
        const all = db.getWorkOrderParts();
        db.saveWorkOrderParts([...all, newPart]);
        return newPart;
    },
    issuePart: async (woPartId: string) => {
        await delay(500);
        const all = db.getWorkOrderParts();
        const partIndex = all.findIndex(p => p.wo_part_id === woPartId);
        if (partIndex === -1) throw new Error("Part not found in WO");
        const part = all[partIndex];

        if (part.status !== WorkOrderPartStatus.PLANNED) throw new Error("Part already issued or consumed");

        // Reserve Stock
        await InventoryAPI.adjustStock({
            part_id: part.part_id,
            hub_id: part.hub_id || 'Pune Hub',
            type: MovementType.RESERVE,
            quantity: part.quantity_required,
            reference_type: 'WorkOrder',
            reference_id: part.work_order_id,
            performed_by: 'Current User',
            reason: 'Issued to WO'
        });

        part.status = WorkOrderPartStatus.ISSUED;
        part.quantity_issued = part.quantity_required;
        db.saveWorkOrderParts(all);
        return part;
    },
    consumePart: async (woPartId: string) => {
        await delay(500);
        const all = db.getWorkOrderParts();
        const partIndex = all.findIndex(p => p.wo_part_id === woPartId);
        if (partIndex === -1) throw new Error("Part not found in WO");
        const part = all[partIndex];

        if (part.status !== WorkOrderPartStatus.ISSUED) throw new Error("Part must be issued before consumption");

        // Consume Reserved Stock
        await InventoryAPI.adjustStock({
            part_id: part.part_id,
            hub_id: part.hub_id || 'Pune Hub',
            type: MovementType.CONSUME_RESERVED,
            quantity: part.quantity_issued,
            reference_type: 'WorkOrder',
            reference_id: part.work_order_id,
            performed_by: 'Current User',
            reason: 'Consumed in WO'
        });

        part.status = WorkOrderPartStatus.CONSUMED;
        part.quantity_consumed = part.quantity_issued;
        db.saveWorkOrderParts(all);
        return part;
    }
};

export const VehicleAPI = {
    getAll: async (): Promise<Vehicle[]> => {
        await delay(500);
        const vehicles = db.getVehicles();
        // Reseed if any LEASED/RENTED vehicle is missing its marketplace_provider_id (stale localStorage)
        const needsPatch = vehicles.some(
            v => (v.ownership_type === OwnershipType.LEASED || v.ownership_type === OwnershipType.RENTED)
                 && !v.marketplace_provider_id
        );
        if (needsPatch) {
            const SEED_IDS: Record<string, string> = {
                'v2': 'mp-004', 'v5': 'mp-001', 'v6': 'mp-003', 'v9': 'mp-006', 'v10': 'mp-003'
            };
            const patched = vehicles.map(v =>
                SEED_IDS[v.vehicle_id] ? { ...v, marketplace_provider_id: SEED_IDS[v.vehicle_id] } : v
            );
            db.saveVehicles(patched);
            return patched;
        }
        return vehicles;
    },
    getById: async (id: string): Promise<Vehicle | undefined> => { await delay(200); return db.getVehicles().find(v => v.vehicle_id === id); },
    create: async (vehicle: any) => { 
        await delay(500); 
        validateVehiclePayload(vehicle);
        const newVehicle = { ...vehicle, vehicle_id: crypto.randomUUID(), created_at: new Date().toISOString() };
        const all = db.getVehicles();
        db.saveVehicles([newVehicle, ...all]);
    },
    update: async (id: string, updates: Partial<Vehicle>) => { 
        await delay(500); 
        const all = db.getVehicles(); 
        const index = all.findIndex(v => v.vehicle_id === id); 
        if (index !== -1) { 
            const merged = { ...all[index], ...updates };
            validateVehiclePayload(merged);
            all[index] = merged; 
            db.saveVehicles(all); 
        } 
        return all[index];
    },
    delete: async (id: string) => { 
        await delay(500); 
        const all = db.getVehicles();
        db.saveVehicles(all.filter(v => v.vehicle_id !== id));
    },
    getBulkTemplate: async () => "#",
    validateBulkImport: async (file: File) => { await delay(1000); return { validCount: 1, errorCount: 0, warningCount: 0, errors: [], parsedData: [] }; },
    importBulk: async (data: any[]) => { await delay(1000); }
};

export const DriverAPI = { 
    getAll: async (): Promise<Driver[]> => { await delay(500); return db.getDrivers(); }, 
    getById: async (id: string): Promise<Driver | undefined> => { await delay(200); return db.getDrivers().find(d => d.driver_id === id); }, 
    create: async (data: any) => { 
        await delay(500); 
        const newDriver = { ...data, driver_id: crypto.randomUUID(), created_at: new Date().toISOString() };
        const all = db.getDrivers();
        db.saveDrivers([newDriver, ...all]);
        return newDriver;
    }, 
    update: async (id: string, updates: any) => { 
        await delay(500); 
        const all = db.getDrivers();
        const index = all.findIndex(d => d.driver_id === id);
        if (index !== -1) {
            all[index] = { ...all[index], ...updates };
            db.saveDrivers(all);
        }
        return all[index];
    }, 
    getBulkTemplate: async () => "#", 
    validateBulkImport: async (file: File) => { await delay(1000); return ({ validCount: 0, errorCount: 0, warningCount: 0, errors: [], parsedData: [] }); }, 
    importBulk: async (data: any[]) => { await delay(1000); } 
};

// Seed meaningful trips on first call using real vehicle/driver IDs from the db.
// Routes are realistic Indian long-haul logistics corridors.
const seedTrips = (): Trip[] => {
    const vehicles = db.getVehicles().filter(v => v.status === VehicleStatus.ACTIVE);
    const drivers  = db.getDrivers().filter(d => d.status === DriverStatus.ACTIVE);

    const vId = (i: number) => vehicles[i % vehicles.length]?.vehicle_id ?? null;
    const dId = (i: number) => drivers[i % drivers.length]?.driver_id ?? null;

    const dt = (daysOffset: number, hour = 8) => {
        const d = new Date();
        d.setDate(d.getDate() + daysOffset);
        d.setHours(hour, 0, 0, 0);
        return d.toISOString();
    };

    const trips: Trip[] = [
        { trip_id: 'trip-001', booking_reference: 'BK-2026-1001', origin: 'Bhiwandi MMLP, Mumbai', destination: 'Electronic City, Bengaluru', scheduled_start_time: dt(-2, 6), status: TripStatus.COMPLETED, vehicle_id: vId(0), driver_id: dId(0), created_at: dt(-3), estimated_distance_km: 980 },
        { trip_id: 'trip-002', booking_reference: 'BK-2026-1002', origin: 'Patparganj ICD, Delhi', destination: 'Nhava Sheva Port, Mumbai', scheduled_start_time: dt(-1, 7), status: TripStatus.IN_TRANSIT, vehicle_id: vId(1), driver_id: dId(1), created_at: dt(-2), estimated_distance_km: 1409 },
        { trip_id: 'trip-003', booking_reference: 'BK-2026-1003', origin: 'Kundli Industrial Area, Sonipat', destination: 'Mundra Port, Gujarat', scheduled_start_time: dt(0, 5), status: TripStatus.DISPATCHED, vehicle_id: vId(2), driver_id: dId(2), created_at: dt(-1), estimated_distance_km: 1180 },
        { trip_id: 'trip-004', booking_reference: 'BK-2026-1004', origin: 'Pune Chakan Logistics Hub', destination: 'Chennai Port Trust', scheduled_start_time: dt(0, 9), status: TripStatus.PLANNED, vehicle_id: vId(3), driver_id: dId(3), created_at: dt(-1), estimated_distance_km: 1140 },
        { trip_id: 'trip-005', booking_reference: 'BK-2026-1005', origin: 'Gurugram Sector 37, Haryana', destination: 'Kolkata Haldia Port', scheduled_start_time: dt(1, 6), status: TripStatus.PLANNED, vehicle_id: null, driver_id: null, created_at: dt(0), estimated_distance_km: 1520 },
        { trip_id: 'trip-006', booking_reference: 'BK-2026-1006', origin: 'Kandla Port, Gujarat', destination: 'Jaipur Distribution Centre', scheduled_start_time: dt(1, 8), status: TripStatus.PLANNED, vehicle_id: vId(4), driver_id: null, created_at: dt(0), estimated_distance_km: 620 },
        { trip_id: 'trip-007', booking_reference: 'BK-2026-1007', origin: 'Hosur Industrial Area, Tamil Nadu', destination: 'Hyderabad Outer Ring Road Hub', scheduled_start_time: dt(2, 7), status: TripStatus.PLANNED, vehicle_id: vId(5), driver_id: dId(5), created_at: dt(0), estimated_distance_km: 560 },
        { trip_id: 'trip-008', booking_reference: 'BK-2026-1008', origin: 'Ludhiana Textiles Hub, Punjab', destination: 'Surat Diamond Bourse, Gujarat', scheduled_start_time: dt(3, 5), status: TripStatus.PLANNED, vehicle_id: null, driver_id: null, created_at: dt(1), estimated_distance_km: 1260 },
        { trip_id: 'trip-009', booking_reference: 'BK-2026-1009', origin: 'Vizag Steel Plant, Andhra Pradesh', destination: 'Raipur Steel Hub, Chhattisgarh', scheduled_start_time: dt(-4, 5), status: TripStatus.COMPLETED, vehicle_id: vId(6), driver_id: dId(6), created_at: dt(-5), estimated_distance_km: 680 },
        {
            trip_id: 'trip-010',
            booking_reference: 'BK-2026-1010',
            origin: 'Kochi Port, Kerala',
            destination: 'Coimbatore Industrial Belt',
            scheduled_start_time: dt(-1, 4),
            status: TripStatus.COMPLETED,
            vehicle_id: vId(7),
            driver_id: dId(7),
            created_at: dt(-2),
            estimated_distance_km: 210,
        },
    ];
    return trips;
};

export const TripAPI = {
    getAll: async (): Promise<Trip[]> => {
        await delay(400);
        let trips = db.getTrips();
        // Seed if empty OR if existing data predates the estimated_distance_km field
        const needsReseed = trips.length === 0 || trips.some(t => t.estimated_distance_km === undefined);
        if (needsReseed) {
            trips = seedTrips();
            db.saveTrips(trips);
        }
        return trips.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    },
    getById: async (id: string): Promise<Trip | undefined> => {
        await delay(200);
        let trips = db.getTrips();
        if (trips.length === 0) { trips = seedTrips(); db.saveTrips(trips); }
        return trips.find(t => t.trip_id === id);
    },
    create: async (trip: any): Promise<Trip> => {
        await delay(500);
        const newTrip: Trip = {
            ...trip,
            trip_id: `trip-${Date.now()}`,
            created_at: new Date().toISOString(),
        };
        const all = db.getTrips();
        db.saveTrips([newTrip, ...all]);
        return newTrip;
    },
    update: async (id: string, updates: any): Promise<Trip> => {
        await delay(400);
        const all = db.getTrips();
        const idx = all.findIndex(t => t.trip_id === id);
        if (idx !== -1) {
            all[idx] = { ...all[idx], ...updates };
            db.saveTrips(all);
        }
        return all[idx];
    },
};

export const CostAPI = { getEvents: async () => [] };

// ── Marketplace Providers ────────────────────────────────────────────────────

const SEED_MARKETPLACE_PROVIDERS: MarketplaceProvider[] = [
    { provider_id: 'mp-001', name: 'Ola Corporate',          category: 'Rental',   contact_name: 'Rohit Sharma',    phone: '+91 98100 11001', email: 'corporate@ola.com',       city: 'Bengaluru',  status: 'Active',   created_at: '2024-01-10T00:00:00Z', gstin: '29AABCO1234A1Z5', pan: 'AABCO1234A', address: '3rd Floor, Ola Tower, Koramangala, Bengaluru – 560034', website: 'corporate.olacabs.com', fleet_size: 1200, lease_term_months: 12, contract_start_date: '2024-01-10', contract_end_date: '2025-01-09', account_manager: 'Kavitha Reddy', account_manager_phone: '+91 98100 99001' },
    { provider_id: 'mp-002', name: 'Zoomcar Business',        category: 'Rental',   contact_name: 'Priya Mehta',     phone: '+91 98200 22002', email: 'business@zoomcar.com',    city: 'Bengaluru',  status: 'Active',   created_at: '2024-02-14T00:00:00Z', gstin: '29AABCZ5678B1Z3', pan: 'AABCZ5678B', address: 'No. 14, Richmond Road, Bengaluru – 560025', website: 'business.zoomcar.com', fleet_size: 850, lease_term_months: 24, contract_start_date: '2024-02-14', contract_end_date: '2026-02-13', account_manager: 'Suresh Kumar', account_manager_phone: '+91 98200 99002' },
    { provider_id: 'mp-003', name: 'ORIX India Leasing',      category: 'Leasing',  contact_name: 'Anil Kapoor',     phone: '+91 98300 33003', email: 'fleet@orix.co.in',        city: 'Mumbai',     status: 'Active',   created_at: '2024-03-01T00:00:00Z', gstin: '27AABCO9012C1Z1', pan: 'AABCO9012C', address: 'ORIX House, BKC, Bandra East, Mumbai – 400051', website: 'orix.co.in', fleet_size: 3500, lease_term_months: 36, contract_start_date: '2024-03-01', contract_end_date: '2027-02-28', account_manager: 'Pooja Iyer', account_manager_phone: '+91 98300 99003' },
    { provider_id: 'mp-004', name: 'Myles Cars',              category: 'Leasing',  contact_name: 'Sunita Rao',      phone: '+91 98400 44004', email: 'sunita@mylescars.com',    city: 'Delhi',      status: 'Active',   created_at: '2024-04-05T00:00:00Z', gstin: '07AABCM3456D1Z9', pan: 'AABCM3456D', address: 'A-12, Sector 62, Noida, Delhi NCR – 201301', website: 'mylescars.com', fleet_size: 600, lease_term_months: 24, contract_start_date: '2024-04-05', contract_end_date: '2026-04-04', account_manager: 'Nikhil Sharma', account_manager_phone: '+91 98400 99004' },
    { provider_id: 'mp-005', name: 'Mahindra First Choice',   category: 'Contract', contact_name: 'Vikram Nair',     phone: '+91 98500 55005', email: 'fleet@mahindrafc.com',    city: 'Chennai',    status: 'Active',   created_at: '2024-05-20T00:00:00Z', gstin: '33AABCM7890E1Z7', pan: 'AABCM7890E', address: 'Mahindra Towers, Anna Salai, Chennai – 600002', website: 'mahindrafirstchoice.com', fleet_size: 2200, lease_term_months: 48, contract_start_date: '2024-05-20', contract_end_date: '2028-05-19', account_manager: 'Lakshmi Priya', account_manager_phone: '+91 98500 99005' },
    { provider_id: 'mp-006', name: 'Revv Fleet Solutions',    category: 'Rental',   contact_name: 'Deepa Singh',     phone: '+91 98600 66006', email: 'deepa@revv.co.in',        city: 'Hyderabad',  status: 'Active',   created_at: '2024-06-15T00:00:00Z', gstin: '36AABCR2345F1Z5', pan: 'AABCR2345F', address: '7th Floor, Cyber Towers, HITEC City, Hyderabad – 500081', website: 'revv.co.in', fleet_size: 430, lease_term_months: 12, contract_start_date: '2024-06-15', contract_end_date: '2025-06-14', account_manager: 'Arjun Menon', account_manager_phone: '+91 98600 99006' },
    { provider_id: 'mp-007', name: 'Tata Motors Leasing',     category: 'Leasing',  contact_name: 'Ramesh Patel',    phone: '+91 98700 77007', email: 'fleet.leasing@tata.com',  city: 'Pune',       status: 'Inactive', created_at: '2024-07-01T00:00:00Z', gstin: '27AABCT6789G1Z3', pan: 'AABCT6789G', address: 'Bombay House, 24 Homi Mody Street, Pune – 411001', website: 'tatamotors.com/fleet', fleet_size: 5000, lease_term_months: 60, contract_start_date: '2024-07-01', contract_end_date: '2029-06-30', account_manager: 'Sneha Joshi', account_manager_phone: '+91 98700 99007' },
];

export const MarketplaceAPI = {
    getAll: async (): Promise<MarketplaceProvider[]> => {
        await delay(300);
        const stored = localStorage.getItem('optimile_marketplace_providers');
        if (!stored) {
            localStorage.setItem('optimile_marketplace_providers', JSON.stringify(SEED_MARKETPLACE_PROVIDERS));
            return SEED_MARKETPLACE_PROVIDERS;
        }
        return JSON.parse(stored);
    },
    create: async (provider: Omit<MarketplaceProvider, 'provider_id' | 'created_at'>): Promise<MarketplaceProvider> => {
        await delay(400);
        const all: MarketplaceProvider[] = JSON.parse(localStorage.getItem('optimile_marketplace_providers') || '[]');
        const newProvider: MarketplaceProvider = {
            ...provider,
            provider_id: `mp-${Date.now()}`,
            created_at: new Date().toISOString(),
        };
        localStorage.setItem('optimile_marketplace_providers', JSON.stringify([...all, newProvider]));
        return newProvider;
    },
    update: async (id: string, updates: Partial<MarketplaceProvider>): Promise<MarketplaceProvider> => {
        await delay(300);
        const all: MarketplaceProvider[] = JSON.parse(localStorage.getItem('optimile_marketplace_providers') || '[]');
        const idx = all.findIndex(p => p.provider_id === id);
        if (idx !== -1) {
            all[idx] = { ...all[idx], ...updates };
            localStorage.setItem('optimile_marketplace_providers', JSON.stringify(all));
        }
        return all[idx];
    },
};

// Haversine formula — returns distance in km between two GPS coordinates
const haversineKm = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

export const TelematicsAPI = {
    getLatestEvents: async () => [],
    getHistory: async (vehicleId?: string, trackerId?: string) => {
        await delay(200);
        const history = db.getTelemetry();
        const scopedHistory = history.filter((event) => {
            if (vehicleId && event.vehicle_id !== vehicleId) return false;
            if (trackerId && event.tracker_id !== trackerId) return false;
            return true;
        });
        return [...scopedHistory].sort((a, b) => new Date(b.event_timestamp).getTime() - new Date(a.event_timestamp).getTime());
    },
    // Computes total distance traveled by a vehicle from its GPS telemetry pings.
    // For the dispatch trip detail page — shows "tracked by device" distance.
    getTripDistance: async (vehicleId: string): Promise<number> => {
        await delay(150);
        const events = db.getTelemetry()
            .filter(e => e.vehicle_id === vehicleId)
            .sort((a, b) => new Date(a.event_timestamp).getTime() - new Date(b.event_timestamp).getTime());
        let total = 0;
        for (let i = 1; i < events.length; i++) {
            total += haversineKm(
                events[i - 1].latitude, events[i - 1].longitude,
                events[i].latitude,     events[i].longitude
            );
        }
        return Math.round(total * 10) / 10;
    },
    getVehicleStatus: async (vehicleId: string) => null
};

const getComputedDocumentStatus = (expiryDate: string): DocumentStatus => {
    const today = new Date();
    const expiry = new Date(expiryDate);
    const daysLeft = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (daysLeft < 0) return DocumentStatus.EXPIRED;
    if (daysLeft < 30) return DocumentStatus.EXPIRING_SOON;
    return DocumentStatus.VALID;
};

const createVehicleDocumentHistoryEntry = (
    action: 'Uploaded' | 'Updated',
    data: {
        document_number: string;
        issue_date: string;
        expiry_date: string;
        status: DocumentStatus;
        document_url?: string;
        uploaded_by?: string;
    }
) => ({
    entry_id: crypto.randomUUID(),
    action,
    changed_at: new Date().toISOString(),
    document_number: data.document_number,
    issue_date: data.issue_date,
    expiry_date: data.expiry_date,
    status: data.status,
    document_url: data.document_url,
    uploaded_by: data.uploaded_by,
});

export const ComplianceAPI = { 
    getAllDocuments: async () => {
        await delay(300);
        return db.getDocuments();
    }, 
    getDocuments: async (vehicleId?: string) => {
        await delay(300);
        const docs = db.getDocuments();
        return vehicleId ? docs.filter(d => d.vehicle_id === vehicleId) : docs;
    }, 
    uploadDocument: async (data: any) => {
        await delay(400);
        const computedStatus = data.status ?? getComputedDocumentStatus(data.expiry_date);
        const newDoc = {
            ...data,
            document_id: crypto.randomUUID(),
            status: computedStatus,
            history: [
                createVehicleDocumentHistoryEntry('Uploaded', {
                    document_number: data.document_number,
                    issue_date: data.issue_date,
                    expiry_date: data.expiry_date,
                    status: computedStatus,
                    document_url: data.document_url,
                    uploaded_by: data.uploaded_by,
                }),
            ],
        };
        const all = db.getDocuments();
        db.saveDocuments([...all, newDoc]);
        return newDoc;
    },
    updateDocument: async (documentId: string, updates: any) => {
        await delay(400);
        const all = db.getDocuments();
        const next = all.map((doc) => {
            if (doc.document_id !== documentId) return doc;
            const status = updates.status ?? getComputedDocumentStatus(updates.expiry_date ?? doc.expiry_date);
            const merged = {
                ...doc,
                ...updates,
                status,
            };
            return {
                ...merged,
                history: [
                    ...(doc.history ?? []),
                    createVehicleDocumentHistoryEntry('Updated', {
                        document_number: merged.document_number,
                        issue_date: merged.issue_date,
                        expiry_date: merged.expiry_date,
                        status: merged.status,
                        document_url: merged.document_url,
                        uploaded_by: merged.uploaded_by,
                    }),
                ],
            };
        });
        db.saveDocuments(next);
        return next.find((doc) => doc.document_id === documentId);
    } 
};

export const DriverComplianceAPI = { 
    getAllDocuments: async (): Promise<DriverDocument[]> => {
        await delay(300);
        return db.getDriverDocuments();
    }, 
    getDocuments: async (driverId: string): Promise<DriverDocument[]> => {
        await delay(300);
        return db.getDriverDocuments().filter((doc) => doc.driver_id === driverId);
    }, 
    uploadDocument: async (
        data: Omit<DriverDocument, 'document_id' | 'status'> & Partial<Pick<DriverDocument, 'status'>>
    ): Promise<DriverDocument> => {
        await delay(400);
        const expiryDate = data.expiry_date || '2099-12-31';
        const newDoc: DriverDocument = {
            ...data,
            document_id: crypto.randomUUID(),
            status: data.status ?? getComputedDocumentStatus(expiryDate),
        };
        const all = db.getDriverDocuments();
        db.saveDriverDocuments([...all, newDoc]);
        return newDoc;
    } 
};

export const BehaviorAPI = { 
    getEvents: async (): Promise<DriverBehaviorEvent[]> => {
        await delay(400);
        return db.getBehaviorEvents().sort((a,b) => new Date(b.event_timestamp).getTime() - new Date(a.event_timestamp).getTime());
    } 
};

export const ExceptionAPI = { 
    getAll: async () => {
        await delay(500);
        return db.getExceptions();
    }, 
    updateStatus: async (id: string, status: string, notes?: string) => {
        const all = db.getExceptions();
        const idx = all.findIndex(e => e.exception_id === id);
        if (idx !== -1) {
            all[idx] = { ...all[idx], status: status as ExceptionStatus, resolution_notes: notes };
            db.saveExceptions(all);
        }
    }, 
    assignOwner: async (id: string, owner: string) => {} 
};

export const ConfidenceAPI = { 
    getVehicleConfidence: async (vehicleId: string) => ({ score: 'High' as any, details: [] } as any) 
};

export const OpsAPI = {
    getKPIs: async (): Promise<OpsKPIs> => {
        await delay(800);
        const vehicles = db.getVehicles();
        const exceptions = db.getExceptions();
        const fuelEvents = db.getFuelEvents(); // Needed for Cost Confidence proxy

        const totalVehicles = vehicles.length;
        const activeVehicles = vehicles.filter(v => v.status === VehicleStatus.ACTIVE).length;
        
        // Fleet Availability
        const availability = totalVehicles > 0 ? Math.round((activeVehicles / totalVehicles) * 100) : 0;

        // Compliance Rate (Mock: Assume 90% for now or calculate based on documents if available)
        const complianceRate = 92; 

        // Critical Exceptions
        const criticalExceptions = exceptions.filter(e => e.severity === ExceptionSeverity.CRITICAL && e.status === ExceptionStatus.OPEN).length;

        // Cost Confidence (Proxy: High confidence flags / total fuel events)
        const highConfEvents = fuelEvents.filter(e => e.confidence_flag === ConfidenceFlag.ACTUAL || e.confidence_flag === ConfidenceFlag.HIGH).length;
        const costConfidence = fuelEvents.length > 0 ? Math.round((highConfEvents / fuelEvents.length) * 100) : 85; // Default to 85 if no data

        return {
            fleet_availability: availability,
            compliance_rate: complianceRate,
            open_critical_exceptions: criticalExceptions,
            cost_confidence: costConfidence,
            active_vehicles: activeVehicles
        };
    } 
};

export const DataCoverageAPI = { getAll: async () => [] };

export const ReconciliationAPI = { 
    getAll: async () => {
        await delay(600);
        return db.getReconciliationRecords();
    }, 
    updateStatus: async (id: string, status: string, notes?: string) => {
        await delay(400);
        const all = db.getReconciliationRecords();
        const idx = all.findIndex(r => r.reconciliation_id === id);
        if (idx !== -1) {
            all[idx].status = status as ReconciliationStatus;
            if (notes) all[idx].notes = notes;
            if (status === ReconciliationStatus.RECONCILED) {
                all[idx].reconciled_at = new Date().toISOString();
                all[idx].reconciled_by = 'Current User';
            }
            db.saveReconciliationRecords(all);
        }
    } 
};

export const HumanReviewAPI = { 
    logAction: async (action: any) => {} 
};

export const ComponentAPI = {
    getByVehicleId: async (vehicleId: string) => db.getComponents().filter(c => c.vehicle_id === vehicleId),
    add: async (data: Omit<VehicleComponent, 'component_id'>) => {
        await delay(300);
        const newComponent: VehicleComponent = { ...data, component_id: `comp-${crypto.randomUUID()}` };
        const all = db.getComponents();
        all.push(newComponent);
        db.saveComponents(all);
        return newComponent;
    },
};

export const TrackingDeviceAPI = {
    getByVehicleId: async (vehicleId: string): Promise<VehicleTrackingDevice | null> => {
        await delay(200);
        const activeTrackers = db
            .getTrackingDevices()
            .filter((t) => t.vehicle_id === vehicleId && t.status !== TrackerStatus.REMOVED);
        return activeTrackers.find((t) => t.is_primary) ?? activeTrackers[0] ?? null;
    },
    getAllByVehicleId: async (vehicleId: string): Promise<VehicleTrackingDevice[]> => {
        await delay(200);
        return db
            .getTrackingDevices()
            .filter((t) => t.vehicle_id === vehicleId && t.status !== TrackerStatus.REMOVED)
            .sort((a, b) => Number(b.is_primary) - Number(a.is_primary));
    },
    install: async (data: Omit<VehicleTrackingDevice, 'tracker_id'>): Promise<VehicleTrackingDevice> => {
        await delay(400);
        const activeTrackers = db
            .getTrackingDevices()
            .filter((t) => t.vehicle_id === data.vehicle_id && t.status !== TrackerStatus.REMOVED);
        const shouldBePrimary = data.is_primary || activeTrackers.length === 0;
        const tracker: VehicleTrackingDevice = {
            ...data,
            is_primary: shouldBePrimary,
            tracker_id: `trk-${crypto.randomUUID()}`,
        };
        const all = db.getTrackingDevices();
        const updated = all.map((t) =>
            shouldBePrimary && t.vehicle_id === data.vehicle_id && t.status !== TrackerStatus.REMOVED
                ? { ...t, is_primary: false }
                : t
        );
        updated.push(tracker);
        db.saveTrackingDevices(updated);
        const comps = db.getComponents();
        const duplicateIndex = comps.findIndex(
            (component) =>
                component.component_type === ComponentType.TRACKING_DEVICE &&
                component.vehicle_id === tracker.vehicle_id &&
                component.serial_number === tracker.serial_number &&
                component.status !== ComponentStatus.REMOVED
        );
        if (duplicateIndex !== -1) {
            comps[duplicateIndex] = buildTrackingComponent(tracker);
        } else {
            comps.push(buildTrackingComponent(tracker));
        }
        db.saveComponents(syncTrackingComponents(comps, updated));
        const telemetry = db.getTelemetry();
        if (!telemetry.some((event) => event.tracker_id === tracker.tracker_id)) {
            db.saveTelemetry([...createSyntheticTelemetry(tracker.vehicle_id, tracker), ...telemetry]);
        }
        return tracker;
    },
    updateConfig: async (trackerId: string, updates: Partial<VehicleTrackingDevice>): Promise<VehicleTrackingDevice> => {
        await delay(300);
        const all = db.getTrackingDevices();
        const idx = all.findIndex(t => t.tracker_id === trackerId);
        if (idx === -1) throw new Error('Tracker not found');
        const existingTracker = all[idx];
        const targetVehicleId = existingTracker.vehicle_id;
        const otherActiveTrackers = all.filter(
            (tracker) =>
                tracker.vehicle_id === targetVehicleId &&
                tracker.tracker_id !== trackerId &&
                tracker.status !== TrackerStatus.REMOVED
        );
        const requestedPrimary = updates.is_primary;
        const shouldRemainPrimary =
            requestedPrimary === true ||
            (existingTracker.is_primary && requestedPrimary !== false) ||
            otherActiveTrackers.length === 0;

        for (let i = 0; i < all.length; i += 1) {
            if (all[i].vehicle_id === targetVehicleId && all[i].status !== TrackerStatus.REMOVED) {
                all[i] = {
                    ...all[i],
                    is_primary: all[i].tracker_id === trackerId ? shouldRemainPrimary : false,
                };
            }
        }
        if (!shouldRemainPrimary && otherActiveTrackers.length > 0) {
            const fallbackTrackerId = otherActiveTrackers[0].tracker_id;
            for (let i = 0; i < all.length; i += 1) {
                if (all[i].vehicle_id === targetVehicleId && all[i].status !== TrackerStatus.REMOVED) {
                    all[i] = {
                        ...all[i],
                        is_primary: all[i].tracker_id === fallbackTrackerId,
                    };
                }
            }
        }
        all[idx] = { ...all[idx], ...updates, is_primary: shouldRemainPrimary };
        db.saveTrackingDevices(all);
        db.saveComponents(syncTrackingComponents(db.getComponents(), all));
        return all[idx];
    },
    setPrimary: async (trackerId: string): Promise<VehicleTrackingDevice> => {
        await delay(250);
        const all = db.getTrackingDevices();
        const target = all.find((t) => t.tracker_id === trackerId);
        if (!target) throw new Error('Tracker not found');
        const updated = all.map((t) =>
            t.vehicle_id === target.vehicle_id && t.status !== TrackerStatus.REMOVED
                ? { ...t, is_primary: t.tracker_id === trackerId }
                : t
        );
        db.saveTrackingDevices(updated);
        const telemetry = db.getTelemetry();
        if (!telemetry.some((event) => event.tracker_id === trackerId)) {
            db.saveTelemetry([...createSyntheticTelemetry(target.vehicle_id, target), ...telemetry]);
        }
        return updated.find((t) => t.tracker_id === trackerId)!;
    },
    remove: async (trackerId: string): Promise<void> => {
        await delay(300);
        const existing = db.getTrackingDevices();
        const removedTracker = existing.find((t) => t.tracker_id === trackerId);
        if (!removedTracker) return;
        let updated = existing.map((t) =>
            t.tracker_id === trackerId ? { ...t, status: TrackerStatus.REMOVED, is_primary: false } : t
        );
        if (removedTracker.is_primary) {
            const fallback = updated.find(
                (t) => t.vehicle_id === removedTracker.vehicle_id && t.status !== TrackerStatus.REMOVED
            );
            if (fallback) {
                updated = updated.map((t) =>
                    t.vehicle_id === removedTracker.vehicle_id && t.status !== TrackerStatus.REMOVED
                        ? { ...t, is_primary: t.tracker_id === fallback.tracker_id }
                        : t
                );
            }
        }
        db.saveTrackingDevices(updated);
        db.saveComponents(syncTrackingComponents(db.getComponents(), updated));
    },
};

export const DriverLicenseAPI = { 
    getByDriverId: async (driverId: string) => [], 
    add: async (data: any) => ({}) as any 
};

export const DriverSkillAPI = { 
    getByDriverId: async (driverId: string) => [], 
    add: async (data: any) => ({}) as any 
};

export const TyreAPI = { 
    getHealthSignals: async (vehicleId?: string) => {
        await delay(300);
        const signals = db.getTyreHealthSignals();
        return vehicleId ? signals.filter(s => s.vehicle_id === vehicleId) : signals;
    }, 
    getEventSignals: async (vehicleId?: string) => {
        await delay(300);
        const signals = db.getTyreEventSignals();
        return vehicleId ? signals.filter(s => s.vehicle_id === vehicleId) : signals;
    } 
};

export const FuelAPI = {
    getEvents: async (): Promise<FuelEvent[]> => {
        await delay(400);
        return db.getFuelEvents();
    },
    addEvent: async (data: Omit<FuelEvent, 'fuel_event_id'>) => {
        await delay(500);
        const newEvent = { ...data, fuel_event_id: crypto.randomUUID() } as FuelEvent;
        const all = db.getFuelEvents();
        db.saveFuelEvents([newEvent, ...all]);
        return newEvent;
    }
};

export const AdBlueAPI = {
    getEvents: async (): Promise<AdBlueEvent[]> => {
        await delay(400);
        return db.getAdBlueEvents();
    },
    addEvent: async (data: Omit<AdBlueEvent, 'adblue_event_id'>) => {
        await delay(500);
        const newEvent = { ...data, adblue_event_id: crypto.randomUUID() } as AdBlueEvent;
        const all = db.getAdBlueEvents();
        db.saveAdBlueEvents([newEvent, ...all]);
        return newEvent;
    }
};

export const EnergyAPI = {
    getMetrics: async (vehicleId: string): Promise<EnergyMetrics> => {
        await delay(300);
        const fuelEvents = db.getFuelEvents().filter(e => e.vehicle_id === vehicleId);
        const adBlueEvents = db.getAdBlueEvents().filter(e => e.vehicle_id === vehicleId);
        
        const totalFuel = fuelEvents.reduce((acc, curr) => acc + curr.fuel_quantity_liters, 0);
        const totalAdBlue = adBlueEvents.reduce((acc, curr) => acc + curr.quantity_liters, 0);
        
        const avgKmpl = fuelEvents.length > 0 ? 3.5 : 0; // Simplified mock
        const ratio = totalFuel > 0 ? (totalAdBlue / totalFuel) * 100 : 0;

        return {
            vehicle_id: vehicleId,
            avg_km_per_liter: parseFloat(avgKmpl.toFixed(2)),
            adblue_to_fuel_ratio_pct: parseFloat(ratio.toFixed(2)),
            fuel_cost_per_km: 25.0,
            last_calculated_at: new Date().toISOString()
        };
    },
    getAnomalies: async (vehicleId?: string): Promise<EnergyAnomaly[]> => {
        await delay(400);
        const anomalies = db.getEnergyAnomalies();
        return vehicleId ? anomalies.filter(a => a.vehicle_id === vehicleId) : anomalies;
    },
    getMaintenanceSignals: async (): Promise<EnergyMaintenanceSignal[]> => {
        await delay(400);
        return db.getEnergyMaintenanceSignals();
    }
};

export const SyncAPI = { 
    getLiveStatus: async () => [], 
    getComplianceStatus: async () => [], 
    getBehaviorEvents: async () => [], 
    getExceptions: async () => [], 
    getOpsKPIs: async () => ({}), 
    getReconciliationData: async () => [], 
    getVehicleMaintenanceHealth: async () => [], 
    getMaintenanceEvents: async () => [], 
    getTyreMaintenanceSignals: async () => ({}) as any,
    
    // TMS Sync Read-Only
    getEnergySummary: async (): Promise<EnergySyncSummary[]> => {
        await delay(500);
        const vehicles = db.getVehicles();
        // Previously used a serial for...of loop with await inside:
        //   for (const v of vehicles) { await getMetrics(); await getAnomalies(); }
        // That serialised N×700ms calls (300ms metrics + 400ms anomalies per vehicle).
        // With 20 vehicles that was ~14.5 s; with 50 vehicles ~35.5 s.
        // Promise.all runs all vehicle fetches concurrently — total time is now
        // 500ms (base) + max(300ms, 400ms) = ~900ms regardless of fleet size.
        return Promise.all(
            vehicles.map(async (v) => {
                const [metrics, anomalies] = await Promise.all([
                    EnergyAPI.getMetrics(v.vehicle_id),
                    EnergyAPI.getAnomalies(v.vehicle_id),
                ]);
                return {
                    vehicle_id: v.vehicle_id,
                    avg_kpl: metrics.avg_km_per_liter,
                    adblue_compliance_status: anomalies.some(a => a.anomaly_type.includes('AdBlue')) ? 'Non-Compliant' : 'Compliant',
                    active_anomalies_count: anomalies.length,
                } as EnergySyncSummary;
            }),
        );
    },
    getEnergyAnomalies: async (): Promise<EnergyAnomaly[]> => {
        await delay(400);
        return db.getEnergyAnomalies();
    }
};
