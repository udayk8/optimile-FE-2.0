// AUTO-GENERATED — DO NOT EDIT BY HAND.
// Real Bluedart (tenant-bl001) tenant snapshot recovered from the working
// browser localStorage (Chrome Profile 9, origin http://127.0.0.1:3000) and
// baked into the seed so a fresh load reproduces the full tenant exactly:
// 13 roles, 12 users, role-permissions + matrix, hierarchy, org units,
// LR configs/records/requests, vendors, customers, vehicles, drivers,
// materials, UOM, bookings, vendor indents, and invoices.
import type {
  HierarchyLevel,
  OrgUnit,
  RoleDefinition,
  RolePermission,
  UserRecord,
} from "@/types/access";
import type {
  TenantCustomer,
  TenantCustomerAddress,
  TenantCustomerRateCard,
} from "@/types/customer";
import type {
  BookingRecord,
  TenantInvoiceRecord,
  TenantLrAllocationRequestRecord,
  TenantLrPoolRecord,
  TenantLrRecord,
  TenantLrTransferRecord,
} from "@/modules/tms/booking/types";
import type {
  TenantLRConfig,
  TenantMaterial,
  TenantUOMDefinition,
  TenantUOMMapping,
  TenantVehicleType,
} from "@/types/master-data";
import type { TenantDriver, TenantVehicle } from "@/types/fleet";
import type { TenantVendor, TenantVendorRateCard } from "@/types/vendor";
import type { BookingVendorIndent } from "@/types/booking-indent";

export const BL001_TENANT_ID = "tenant-bl001";

export const bl001HierarchyLevels = [
  {
    "id": "level-region",
    "tenantId": "tenant-bl001",
    "order": 1,
    "name": "Region",
    "active": true
  },
  {
    "id": "level-zone",
    "tenantId": "tenant-bl001",
    "order": 2,
    "name": "Branch",
    "active": true
  }
] as unknown as HierarchyLevel[];
export const bl001OrgUnits = [
  {
    "tenantId": "tenant-bl001",
    "name": "Bangalore-Branch",
    "hierarchyLevelId": "level-zone",
    "parentOrgUnitId": "ou-w7w26b4",
    "status": "active",
    "id": "ou-bqtfh2a"
  },
  {
    "tenantId": "tenant-bl001",
    "name": "South-Region",
    "hierarchyLevelId": "level-region",
    "parentOrgUnitId": null,
    "status": "active",
    "id": "ou-w7w26b4"
  }
] as unknown as OrgUnit[];
export const bl001Roles = [
  {
    "tenantId": "tenant-bl001",
    "name": "Finance-Admin",
    "description": "",
    "hierarchyLevelId": "level-region",
    "moduleCodes": [
      "FINANCE"
    ],
    "active": true,
    "dataScope": "ALL_TENANT",
    "id": "role-km3x2ow"
  },
  {
    "tenantId": "tenant-bl001",
    "name": "Operational-branch-manager",
    "description": "",
    "hierarchyLevelId": "level-zone",
    "moduleCodes": [
      "TMS",
      "AUCTION",
      "ADMIN"
    ],
    "active": true,
    "id": "role-0g3sbga"
  },
  {
    "tenantId": "tenant-bl001",
    "name": "Finance-User",
    "description": "",
    "hierarchyLevelId": "level-zone",
    "moduleCodes": [
      "FINANCE"
    ],
    "active": true,
    "id": "role-rcvzzi5"
  },
  {
    "tenantId": "tenant-bl001",
    "name": "Operational-Head",
    "description": "",
    "hierarchyLevelId": "level-region",
    "moduleCodes": [
      "TMS",
      "AUCTION",
      "TRACKING",
      "ADMIN"
    ],
    "active": true,
    "id": "role-4cl8or2"
  },
  {
    "tenantId": "tenant-bl001",
    "name": "Super-admin",
    "description": "",
    "hierarchyLevelId": "level-region",
    "moduleCodes": [
      "ADMIN",
      "TMS",
      "AUCTION"
    ],
    "active": true,
    "dataScope": "ALL_TENANT",
    "id": "role-u7aldfv"
  },
  {
    "tenantId": "tenant-bl001",
    "name": "CEO",
    "description": "Manages company level",
    "hierarchyLevelId": "level-region",
    "moduleCodes": [
      "TMS",
      "FLEET",
      "AUCTION",
      "CUSTOMER",
      "VENDOR",
      "TRACKING",
      "FINANCE"
    ],
    "active": true,
    "dataScope": "ALL_TENANT",
    "id": "role-mtbwabq"
  },
  {
    "id": "role-tenant-admin-tenant-bl001",
    "tenantId": "tenant-bl001",
    "name": "Tenant Admin",
    "description": "Bootstrap tenant administrator.",
    "hierarchyLevelId": "level-region",
    "moduleCodes": [
      "ADMIN",
      "TMS",
      "FLEET",
      "AUCTION",
      "CUSTOMER",
      "VENDOR",
      "TRACKING",
      "FINANCE"
    ],
    "active": true
  },
  {
    "id": "role-tenant-admin-tenant-bl001-tenant-admin",
    "tenantId": "tenant-bl001",
    "name": "Tenant Admin",
    "description": "Bootstrap tenant administrator.",
    "hierarchyLevelId": "level-region-bl001",
    "moduleCodes": [
      "ADMIN",
      "TMS",
      "FLEET",
      "AUCTION",
      "CUSTOMER",
      "VENDOR",
      "TRACKING",
      "FINANCE"
    ],
    "dataScope": "ALL_TENANT",
    "active": true
  },
  {
    "id": "role-bl001-system-coordinator",
    "tenantId": "tenant-bl001",
    "name": "System Coordinator",
    "description": "Cross-functional tenant coordination across operations and control.",
    "hierarchyLevelId": "level-region-bl001",
    "moduleCodes": [
      "ADMIN",
      "TMS",
      "FLEET",
      "CUSTOMER",
      "VENDOR",
      "TRACKING",
      "FINANCE"
    ],
    "dataScope": "ALL_TENANT",
    "active": true
  },
  {
    "id": "role-bl001-regional-manager",
    "tenantId": "tenant-bl001",
    "name": "Regional Manager",
    "description": "Regional visibility across booking, dispatch, tracking, and fleet.",
    "hierarchyLevelId": "level-region-bl001",
    "moduleCodes": [
      "TMS",
      "FLEET",
      "TRACKING"
    ],
    "dataScope": "OWN_RECORDS",
    "active": true
  },
  {
    "id": "role-bl001-operations-manager",
    "tenantId": "tenant-bl001",
    "name": "Operations Manager",
    "description": "Branch operations owner for booking and assignment workflows.",
    "hierarchyLevelId": "level-branch-bl001",
    "moduleCodes": [
      "TMS",
      "TRACKING"
    ],
    "dataScope": "OWN_RECORDS",
    "active": true
  },
  {
    "id": "role-bl001-dispatch-supervisor",
    "tenantId": "tenant-bl001",
    "name": "Dispatch Supervisor",
    "description": "Controls dispatch queue, LR handling, and trip release.",
    "hierarchyLevelId": "level-branch-bl001",
    "moduleCodes": [
      "TMS"
    ],
    "dataScope": "OWN_RECORDS",
    "active": true
  },
  {
    "id": "role-bl001-branch-head",
    "tenantId": "tenant-bl001",
    "name": "Branch Head",
    "description": "Branch oversight across admin, operations, and finance visibility.",
    "hierarchyLevelId": "level-branch-bl001",
    "moduleCodes": [
      "ADMIN",
      "TMS",
      "FLEET",
      "TRACKING",
      "FINANCE"
    ],
    "dataScope": "OWN_RECORDS",
    "active": true
  }
] as unknown as RoleDefinition[];
export const bl001RolePermissions = [
  {
    "id": "perm-tenant-bl001-admin-1-0",
    "tenantId": "tenant-bl001",
    "roleId": "role-tenant-admin-tenant-bl001",
    "moduleCode": "TMS",
    "featureCode": "bookings",
    "canView": true,
    "canCreate": true,
    "canEdit": true,
    "canDelete": true,
    "canApprove": true
  },
  {
    "id": "perm-tenant-bl001-admin-1-1",
    "tenantId": "tenant-bl001",
    "roleId": "role-tenant-admin-tenant-bl001",
    "moduleCode": "TMS",
    "featureCode": "dispatch",
    "canView": true,
    "canCreate": true,
    "canEdit": true,
    "canDelete": true,
    "canApprove": true
  },
  {
    "id": "perm-tenant-bl001-admin-2-0",
    "tenantId": "tenant-bl001",
    "roleId": "role-tenant-admin-tenant-bl001",
    "moduleCode": "FLEET",
    "featureCode": "dashboard",
    "canView": true,
    "canCreate": false,
    "canEdit": false,
    "canDelete": false,
    "canApprove": false
  },
  {
    "id": "perm-tenant-bl001-admin-2-1",
    "tenantId": "tenant-bl001",
    "roleId": "role-tenant-admin-tenant-bl001",
    "moduleCode": "FLEET",
    "featureCode": "vehicles",
    "canView": true,
    "canCreate": true,
    "canEdit": true,
    "canDelete": true,
    "canApprove": true
  },
  {
    "id": "perm-tenant-bl001-admin-3-0",
    "tenantId": "tenant-bl001",
    "roleId": "role-tenant-admin-tenant-bl001",
    "moduleCode": "AUCTION",
    "featureCode": "dashboard",
    "canView": true,
    "canCreate": false,
    "canEdit": false,
    "canDelete": false,
    "canApprove": false
  },
  {
    "id": "perm-tenant-bl001-admin-3-1",
    "tenantId": "tenant-bl001",
    "roleId": "role-tenant-admin-tenant-bl001",
    "moduleCode": "AUCTION",
    "featureCode": "sourcing",
    "canView": true,
    "canCreate": true,
    "canEdit": true,
    "canDelete": false,
    "canApprove": true
  },
  {
    "id": "perm-tenant-bl001-admin-4-0",
    "tenantId": "tenant-bl001",
    "roleId": "role-tenant-admin-tenant-bl001",
    "moduleCode": "CUSTOMER",
    "featureCode": "dashboard",
    "canView": true,
    "canCreate": false,
    "canEdit": false,
    "canDelete": false,
    "canApprove": false
  },
  {
    "id": "perm-tenant-bl001-admin-4-1",
    "tenantId": "tenant-bl001",
    "roleId": "role-tenant-admin-tenant-bl001",
    "moduleCode": "CUSTOMER",
    "featureCode": "bookings",
    "canView": true,
    "canCreate": true,
    "canEdit": false,
    "canDelete": false,
    "canApprove": false
  },
  {
    "id": "perm-tenant-bl001-admin-5-0",
    "tenantId": "tenant-bl001",
    "roleId": "role-tenant-admin-tenant-bl001",
    "moduleCode": "VENDOR",
    "featureCode": "dashboard",
    "canView": true,
    "canCreate": false,
    "canEdit": false,
    "canDelete": false,
    "canApprove": false
  },
  {
    "id": "perm-tenant-bl001-admin-5-1",
    "tenantId": "tenant-bl001",
    "roleId": "role-tenant-admin-tenant-bl001",
    "moduleCode": "VENDOR",
    "featureCode": "trips",
    "canView": true,
    "canCreate": false,
    "canEdit": false,
    "canDelete": false,
    "canApprove": true
  },
  {
    "id": "perm-tenant-bl001-admin-6-0",
    "tenantId": "tenant-bl001",
    "roleId": "role-tenant-admin-tenant-bl001",
    "moduleCode": "TRACKING",
    "featureCode": "dashboard",
    "canView": true,
    "canCreate": false,
    "canEdit": false,
    "canDelete": false,
    "canApprove": false
  },
  {
    "id": "perm-tenant-bl001-admin-6-1",
    "tenantId": "tenant-bl001",
    "roleId": "role-tenant-admin-tenant-bl001",
    "moduleCode": "TRACKING",
    "featureCode": "live_map",
    "canView": true,
    "canCreate": false,
    "canEdit": false,
    "canDelete": false,
    "canApprove": false
  },
  {
    "id": "perm-tenant-bl001-admin-7-0",
    "tenantId": "tenant-bl001",
    "roleId": "role-tenant-admin-tenant-bl001",
    "moduleCode": "FINANCE",
    "featureCode": "invoices",
    "canView": true,
    "canCreate": true,
    "canEdit": true,
    "canDelete": true,
    "canApprove": true
  },
  {
    "id": "perm-tenant-bl001-admin-7-1",
    "tenantId": "tenant-bl001",
    "roleId": "role-tenant-admin-tenant-bl001",
    "moduleCode": "FINANCE",
    "featureCode": "payables",
    "canView": true,
    "canCreate": true,
    "canEdit": true,
    "canDelete": false,
    "canApprove": true
  }
] as unknown as RolePermission[];
export const bl001Users = [
  {
    "tenantId": "tenant-bl001",
    "name": "Ronak",
    "email": "ronak@gmail.com",
    "userType": "INTERNAL",
    "roleId": "role-0g3sbga",
    "orgUnitIds": [
      "ou-bqtfh2a"
    ],
    "linkedVendorId": null,
    "linkedCustomerId": null,
    "linkedDriverId": null,
    "driverName": "",
    "driverCode": "",
    "status": "active",
    "phone": "2323233323",
    "password": "123456",
    "id": "user-wwdm1u8",
    "lastActive": "2026-05-30T19:19:48.025Z"
  },
  {
    "tenantId": "tenant-bl001",
    "name": "Neha",
    "email": "neha@gmail.com",
    "userType": "INTERNAL",
    "roleId": "role-rcvzzi5",
    "orgUnitIds": [
      "ou-bqtfh2a"
    ],
    "linkedVendorId": null,
    "linkedCustomerId": null,
    "linkedDriverId": null,
    "driverName": "",
    "driverCode": "",
    "status": "active",
    "phone": "1221212121",
    "password": "123456",
    "id": "user-zxc6f5h",
    "lastActive": "2026-05-30T19:18:27.582Z"
  },
  {
    "tenantId": "tenant-bl001",
    "name": "Raghav",
    "email": "raghav@gmail.com",
    "userType": "INTERNAL",
    "roleId": "role-km3x2ow",
    "orgUnitIds": [],
    "linkedVendorId": null,
    "linkedCustomerId": null,
    "linkedDriverId": null,
    "driverName": "",
    "driverCode": "",
    "status": "active",
    "phone": "2883283283",
    "password": "123456",
    "id": "user-10apacj",
    "lastActive": "2026-05-30T19:17:56.550Z"
  },
  {
    "tenantId": "tenant-bl001",
    "name": "Mahesh",
    "email": "mahesh@gmail.com",
    "userType": "INTERNAL",
    "roleId": "role-4cl8or2",
    "orgUnitIds": [
      "ou-w7w26b4"
    ],
    "linkedVendorId": null,
    "linkedCustomerId": null,
    "linkedDriverId": null,
    "driverName": "",
    "driverCode": "",
    "status": "active",
    "phone": "1212812818",
    "password": "123456",
    "id": "user-go5v8jg",
    "lastActive": "2026-05-30T19:17:09.466Z"
  },
  {
    "tenantId": "tenant-bl001",
    "name": "Dhruv",
    "email": "Dhruv@gmail.com",
    "userType": "INTERNAL",
    "roleId": "role-mtbwabq",
    "orgUnitIds": [],
    "linkedVendorId": null,
    "linkedCustomerId": null,
    "linkedDriverId": null,
    "driverName": "",
    "driverCode": "",
    "status": "active",
    "phone": "Dhruv@optimile.co",
    "password": "123456",
    "id": "user-xxbq10e",
    "lastActive": "2026-05-30T19:06:19.954Z"
  },
  {
    "tenantId": "tenant-bl001",
    "name": "Pai",
    "email": "pai@gmail.com",
    "userType": "INTERNAL",
    "roleId": "role-u7aldfv",
    "orgUnitIds": [],
    "linkedVendorId": null,
    "linkedCustomerId": null,
    "linkedDriverId": null,
    "driverName": "",
    "driverCode": "",
    "status": "active",
    "phone": "9090909090",
    "password": "123456",
    "id": "user-1tq92ya",
    "lastActive": "2026-05-30T19:04:03.589Z"
  },
  {
    "id": "user-bl001-admin",
    "tenantId": "tenant-bl001",
    "name": "Jack",
    "email": "jack@gmail.com",
    "userType": "INTERNAL",
    "roleId": "role-tenant-admin-tenant-bl001",
    "orgUnitIds": [],
    "linkedVendorId": null,
    "linkedCustomerId": null,
    "linkedDriverId": null,
    "driverName": "",
    "driverCode": "",
    "status": "active",
    "lastActive": "2026-05-30T18:17:02.591Z",
    "phone": "9090909090",
    "password": "123456"
  },
  {
    "id": "user-bl001-system-coordinator",
    "tenantId": "tenant-bl001",
    "name": "Ronak",
    "email": "ronak@gmail.com",
    "userType": "INTERNAL",
    "roleId": "role-bl001-system-coordinator",
    "orgUnitIds": [
      "ou-bl001-south-region"
    ],
    "status": "active",
    "lastActive": "2026-06-02T07:29:47.869Z",
    "password": "Admin@123",
    "linkedVendorId": null,
    "linkedCustomerId": null,
    "linkedDriverId": null,
    "driverName": "",
    "driverCode": ""
  },
  {
    "id": "user-bl001-regional-manager",
    "tenantId": "tenant-bl001",
    "name": "Priya Sharma",
    "email": "priya.sharma@bluedart.co",
    "userType": "INTERNAL",
    "roleId": "role-bl001-regional-manager",
    "orgUnitIds": [
      "ou-bl001-south-region"
    ],
    "status": "active",
    "lastActive": "2026-06-01T12:11:46.700Z",
    "password": "Admin@123",
    "linkedVendorId": null,
    "linkedCustomerId": null,
    "linkedDriverId": null,
    "driverName": "",
    "driverCode": ""
  },
  {
    "id": "user-bl001-operations-manager",
    "tenantId": "tenant-bl001",
    "name": "Neeraj Singh",
    "email": "neeraj.singh@bluedart.co",
    "userType": "INTERNAL",
    "roleId": "role-bl001-operations-manager",
    "orgUnitIds": [
      "ou-bl001-bangalore-branch"
    ],
    "status": "active",
    "lastActive": "2026-06-01T17:34:43.060Z",
    "password": "Admin@123",
    "linkedVendorId": null,
    "linkedCustomerId": null,
    "linkedDriverId": null,
    "driverName": "",
    "driverCode": ""
  },
  {
    "id": "user-bl001-dispatch-supervisor",
    "tenantId": "tenant-bl001",
    "name": "Farhan Ali",
    "email": "farhan.ali@bluedart.co",
    "userType": "INTERNAL",
    "roleId": "role-bl001-dispatch-supervisor",
    "orgUnitIds": [
      "ou-bl001-bangalore-branch"
    ],
    "status": "active",
    "lastActive": "2026-06-01T16:12:30.467Z",
    "password": "Admin@123",
    "linkedVendorId": null,
    "linkedCustomerId": null,
    "linkedDriverId": null,
    "driverName": "",
    "driverCode": ""
  },
  {
    "id": "user-bl001-branch-head",
    "tenantId": "tenant-bl001",
    "name": "Deepak Yadav",
    "email": "deepak.yadav@bluedart.co",
    "userType": "INTERNAL",
    "roleId": "role-bl001-branch-head",
    "orgUnitIds": [
      "ou-bl001-bangalore-branch"
    ],
    "status": "active",
    "lastActive": "2026-06-02T08:08:31.253Z",
    "password": "Admin@123",
    "linkedVendorId": null,
    "linkedCustomerId": null,
    "linkedDriverId": null,
    "driverName": "",
    "driverCode": ""
  }
] as unknown as UserRecord[];
export const bl001Customers = [
  {
    "id": "tenant-customer-o8kyr7u",
    "tenantId": "tenant-bl001",
    "name": "ACC cement",
    "legalName": "Acc cement",
    "tier": "Standard",
    "gstin": "GHST232323",
    "gstNumber": "GHST232323",
    "pan": "PAN",
    "primaryContactName": "Kanodia Cements",
    "primaryContactEmail": "kartikpawar391@gmail.com",
    "primaryContactPhone": "09900154373",
    "creditLimit": null,
    "creditDays": null,
    "currentOutstanding": 0,
    "gstChargeType": "Forward Charge (12% GST on Transport)",
    "tdsApplicable": false,
    "preferredVehicleTypes": [],
    "communicationChannel": "Email",
    "defaultPaymentMode": "Bank Transfer",
    "allowAutoBooking": false,
    "rateMatchingBasis": "LANE_TO_LANE",
    "addresses": [
      {
        "id": "customer-address-qfnxvlr",
        "addressCode": "CUSTADDR-0003",
        "type": [
          "Consignee"
        ],
        "consigneeId": "consignee-anil",
        "consigneeName": "Anil",
        "operationalAddressType": "PRIMARY",
        "addressUsage": "BOTH",
        "contactCode": "ADDR-0003",
        "name": "Uma Maheshwari Park, Banashankari Stage 2",
        "addressLabel": "MIN Gatw 13 ros",
        "fullAddress": "Uma Maheshwari Park, Banashankari Stage 2, Bengaluru, Karnataka, 560093",
        "line1": "Uma Maheshwari Park, Banashankari Stage 2",
        "city": "Bengaluru",
        "state": "Karnataka",
        "country": "India",
        "pincode": "560093",
        "latitude": null,
        "longitude": null,
        "gstin": "EWREWREW",
        "contactPerson": "Kartik Pawar",
        "contactNumber": "9900154373",
        "emailId": "kartik.p@optimile.co",
        "isActive": true,
        "isTemporary": false,
        "remarks": "eerrere"
      },
      {
        "id": "customer-address-rp12cy5",
        "addressCode": "CUSTADDR-0002",
        "type": [
          "Consignee"
        ],
        "consigneeId": "consignee-mahesh",
        "consigneeName": "mahesh",
        "operationalAddressType": "PRIMARY",
        "addressUsage": "BOTH",
        "contactCode": "ADDR-0002",
        "name": "Uma Maheshwari Park, Banashankari Stage 2",
        "addressLabel": "Uma Maheshwari Park, Banashankari Stage 2",
        "fullAddress": "Uma Maheshwari Park, Banashankari Stage 2, Bengaluru, Karnataka, 560070",
        "line1": "Uma Maheshwari Park, Banashankari Stage 2",
        "city": "Bengaluru",
        "state": "Karnataka",
        "country": "India",
        "pincode": "560070",
        "latitude": null,
        "longitude": null,
        "contactPerson": "Kartik Pawar",
        "contactNumber": "9900154373",
        "emailId": "kartik.p@optimile.co",
        "isActive": true,
        "isTemporary": false,
        "remarks": "HSas"
      },
      {
        "id": "customer-address-ykih6kv",
        "addressCode": "CUSTADDR-0001",
        "type": [
          "Consignor"
        ],
        "consigneeId": "JK001",
        "consigneeName": "Umesh",
        "operationalAddressType": "PRIMARY",
        "addressUsage": "BOTH",
        "contactCode": "ADDR-0001",
        "name": "GM palya Bengaluru",
        "addressLabel": "GM palya Bengaluru",
        "fullAddress": "GM palya Bengaluru",
        "line1": "GM palya Bengaluru",
        "city": "Bengaluru",
        "state": "Karnataka",
        "country": "India",
        "pincode": "560093",
        "latitude": null,
        "longitude": null,
        "gstin": "AWEWQEWQEWQE",
        "contactPerson": "Kartik Pawar",
        "contactNumber": "9900154373",
        "emailId": "kartikpawar391@gmail.com",
        "isActive": true,
        "isTemporary": false,
        "remarks": "wew"
      }
    ],
    "uomOverrides": [],
    "setupStatus": "RATE_CARD_PENDING",
    "setupProgress": {
      "basicDetailsCompleted": true,
      "contactsCompleted": true,
      "creditBillingCompleted": true,
      "contractsCompleted": false,
      "preferencesCompleted": false
    },
    "status": "active",
    "createdAt": "2026-05-30T19:35:35.510Z",
    "updatedAt": "2026-05-30T19:49:44.066Z"
  }
] as unknown as TenantCustomer[];
export const bl001CustomerAddresses = [
  {
    "tenantId": "tenant-bl001",
    "tenantCustomerId": "tenant-customer-o8kyr7u",
    "addressCode": "CUSTADDR-0003",
    "addressType": "consignee",
    "addressTypes": [
      "Consignee"
    ],
    "consigneeId": "consignee-anil",
    "consigneeName": "Anil",
    "operationalAddressType": "PRIMARY",
    "addressUsage": "BOTH",
    "addressName": "Uma Maheshwari Park, Banashankari Stage 2",
    "addressLabel": "MIN Gatw 13 ros",
    "fullAddress": "Uma Maheshwari Park, Banashankari Stage 2, Bengaluru, Karnataka, 560093",
    "contactCode": "ADDR-0003",
    "gstin": "EWREWREW",
    "contactPerson": "Kartik Pawar",
    "contactNumber": "9900154373",
    "emailId": "kartik.p@optimile.co",
    "addressLine1": "Uma Maheshwari Park, Banashankari Stage 2",
    "landmark": "",
    "city": "Bengaluru",
    "state": "Karnataka",
    "country": "India",
    "pincode": "560093",
    "latitude": null,
    "longitude": null,
    "isDefault": false,
    "status": "active",
    "isTemporary": false,
    "remarks": "eerrere",
    "customerId": "tenant-customer-o8kyr7u",
    "contactPersonName": "Kartik Pawar",
    "phone": "9900154373",
    "id": "customer-address-qfnxvlr",
    "email": "kartik.p@optimile.co",
    "createdAt": "2026-05-30T19:49:44.066Z",
    "updatedAt": "2026-05-30T19:49:44.066Z"
  },
  {
    "tenantId": "tenant-bl001",
    "tenantCustomerId": "tenant-customer-o8kyr7u",
    "addressCode": "CUSTADDR-0002",
    "addressType": "consignee",
    "addressTypes": [
      "Consignee"
    ],
    "consigneeId": "consignee-mahesh",
    "consigneeName": "mahesh",
    "operationalAddressType": "PRIMARY",
    "addressUsage": "BOTH",
    "addressName": "Uma Maheshwari Park, Banashankari Stage 2",
    "addressLabel": "Uma Maheshwari Park, Banashankari Stage 2",
    "fullAddress": "Uma Maheshwari Park, Banashankari Stage 2, Bengaluru, Karnataka, 560070",
    "contactCode": "ADDR-0002",
    "contactPerson": "Kartik Pawar",
    "contactNumber": "9900154373",
    "emailId": "kartik.p@optimile.co",
    "addressLine1": "Uma Maheshwari Park, Banashankari Stage 2",
    "landmark": "",
    "city": "Bengaluru",
    "state": "Karnataka",
    "country": "India",
    "pincode": "560070",
    "latitude": null,
    "longitude": null,
    "isDefault": false,
    "status": "active",
    "isTemporary": false,
    "remarks": "HSas",
    "customerId": "tenant-customer-o8kyr7u",
    "contactPersonName": "Kartik Pawar",
    "phone": "9900154373",
    "id": "customer-address-rp12cy5",
    "email": "kartik.p@optimile.co",
    "createdAt": "2026-05-30T19:49:44.065Z",
    "updatedAt": "2026-05-30T19:49:44.065Z"
  },
  {
    "tenantId": "tenant-bl001",
    "tenantCustomerId": "tenant-customer-o8kyr7u",
    "addressCode": "CUSTADDR-0001",
    "addressType": "consignor",
    "addressTypes": [
      "Consignor"
    ],
    "consigneeId": "JK001",
    "consigneeName": "Umesh",
    "operationalAddressType": "PRIMARY",
    "addressUsage": "BOTH",
    "addressName": "GM palya Bengaluru",
    "addressLabel": "GM palya Bengaluru",
    "fullAddress": "GM palya Bengaluru",
    "contactCode": "ADDR-0001",
    "gstin": "AWEWQEWQEWQE",
    "contactPerson": "Kartik Pawar",
    "contactNumber": "9900154373",
    "emailId": "kartikpawar391@gmail.com",
    "addressLine1": "GM palya Bengaluru",
    "landmark": "",
    "city": "Bengaluru",
    "state": "Karnataka",
    "country": "India",
    "pincode": "560093",
    "latitude": null,
    "longitude": null,
    "isDefault": true,
    "status": "active",
    "isTemporary": false,
    "remarks": "wew",
    "customerId": "tenant-customer-o8kyr7u",
    "contactPersonName": "Kartik Pawar",
    "phone": "9900154373",
    "id": "customer-address-ykih6kv",
    "email": "kartikpawar391@gmail.com",
    "createdAt": "2026-05-30T19:35:35.511Z",
    "updatedAt": "2026-05-30T19:49:44.065Z"
  }
] as unknown as TenantCustomerAddress[];
export const bl001CustomerRateCards = [] as unknown as TenantCustomerRateCard[];
export const bl001Vendors = [
  {
    "id": "tenant-vendor-hh8uo8c",
    "tenantId": "tenant-bl001",
    "name": "Mahesh Transport",
    "legalName": "Mahesh",
    "code": "VND-0003",
    "gstin": "GSTN000101",
    "gstNumber": "GSTN000101",
    "pan": "PAN88282",
    "address": "Uma Maheshwari Park, Banashankari Stage 2, Bengaluru, Karnataka, 560070",
    "contactPerson": "Harish",
    "phone": "7878787878",
    "contactNumber": "7878787878",
    "email": "harish@gmail.com",
    "serviceableLocations": [
      "KA"
    ],
    "supportedVehicleTypes": [
      "HGV"
    ],
    "status": "active",
    "createdAt": "2026-06-01T09:07:26.077Z",
    "updatedAt": "2026-06-01T09:07:26.077Z"
  },
  {
    "id": "tenant-vendor-nqup09r",
    "tenantId": "tenant-bl001",
    "name": "ABC transport",
    "legalName": "Mahesh",
    "code": "VND-0002",
    "gstin": "1232121",
    "gstNumber": "1232121",
    "pan": "PAN88121",
    "address": "GM palya Bengaluru, Bengaluru, Karnataka, 560093",
    "contactPerson": "Kartik Pawar",
    "phone": "8900154373",
    "contactNumber": "8900154373",
    "email": "kartikpawar391@gmail.com",
    "serviceableLocations": [
      "KA"
    ],
    "supportedVehicleTypes": [
      "HGVLGVMGV"
    ],
    "status": "active",
    "createdAt": "2026-05-31T14:34:10.910Z",
    "updatedAt": "2026-05-31T14:34:10.910Z"
  },
  {
    "id": "tenant-vendor-af8xr8p",
    "tenantId": "tenant-bl001",
    "name": "VRL transports",
    "legalName": "VRL",
    "code": "VND-0001",
    "gstin": "GSN623823",
    "gstNumber": "GSN623823",
    "pan": "PAN0010",
    "address": "Uma Maheshwari Park, Banashankari Stage 2, Bengaluru, Karnataka, 560070",
    "contactPerson": "Vijay",
    "phone": "9900154636",
    "contactNumber": "9900154636",
    "email": "virlp@vrl.co",
    "serviceableLocations": [
      "Karanataka"
    ],
    "supportedVehicleTypes": [
      "HGVLGVMGV"
    ],
    "status": "active",
    "createdAt": "2026-05-31T13:35:36.619Z",
    "updatedAt": "2026-05-31T13:35:36.619Z"
  }
] as unknown as TenantVendor[];
export const bl001VendorRateCards = [] as unknown as TenantVendorRateCard[];
export const bl001VehicleTypes = [
  {
    "tenantId": "tenant-bl001",
    "typeCode": "MGV",
    "capacity": "10MT",
    "dimensions": "32*4*4",
    "status": "active",
    "id": "vehicle-type-d29xwv3",
    "createdAt": "2026-05-31T13:29:38.469Z",
    "updatedAt": "2026-05-31T13:29:38.469Z"
  }
] as unknown as TenantVehicleType[];
export const bl001Vehicles = [
  {
    "tenantId": "tenant-bl001",
    "registrationNumber": "KA01JK1234",
    "make": "TATA",
    "model": "TATA",
    "year": "2012",
    "vehicleTypeId": "vehicle-type-d29xwv3",
    "fuelType": "DIESEL",
    "ownershipType": "VENDOR",
    "vendorId": "tenant-vendor-hh8uo8c",
    "chassisNo": "qewrwdewdew",
    "insurance": {
      "number": "",
      "expiry": "2027-06-01"
    },
    "fitness": {
      "number": "",
      "expiry": "2027-06-01"
    },
    "puc": {
      "number": "",
      "expiry": "2027-06-01"
    },
    "permit": {
      "type": "",
      "expiry": "2027-06-01"
    },
    "odometer": "",
    "engineNumber": "sefeffeqw",
    "capacityKg": "15000",
    "baseLocation": "KA",
    "operationalStatus": "ACTIVE",
    "complianceStatus": "COMPLIANT",
    "complianceDocuments": [
      {
        "id": "RC-1780310270567-e1tb4u5l6yq",
        "type": "RC",
        "referenceNo": "",
        "fileName": "6925_CONSIGNOR_COPY.pdf",
        "fileUrl": "/docs/6925_CONSIGNOR_COPY.pdf",
        "expiryDate": "2027-06-01",
        "status": "VALID",
        "uploadedAt": "2026-06-01T10:37:50.567Z"
      },
      {
        "id": "Insurance-1780310270567-z0gixiwd99",
        "type": "Insurance",
        "referenceNo": "",
        "fileName": "LR copy format for AI.pdf",
        "fileUrl": "/docs/LR copy format for AI.pdf",
        "expiryDate": "2027-06-01",
        "status": "VALID",
        "uploadedAt": "2026-06-01T10:37:50.567Z"
      },
      {
        "id": "PUC-1780310270567-b23lyufrg3e",
        "type": "PUC",
        "referenceNo": "",
        "fileName": "Bill Format Print File.pdf",
        "fileUrl": "/docs/Bill Format Print File.pdf",
        "expiryDate": "2027-06-01",
        "status": "VALID",
        "uploadedAt": "2026-06-01T10:37:50.567Z"
      },
      {
        "id": "FC-1780310270567-ckh0v3egyha",
        "type": "FC",
        "referenceNo": "",
        "fileName": "Bill Format Print File.pdf",
        "fileUrl": "/docs/Bill Format Print File.pdf",
        "expiryDate": "2027-06-01",
        "status": "VALID",
        "uploadedAt": "2026-06-01T10:37:50.567Z"
      },
      {
        "id": "NationalPermit-1780310270567-6iphwn6u9dr",
        "type": "NationalPermit",
        "referenceNo": "",
        "fileName": "Bill Format Print File.pdf",
        "fileUrl": "/docs/Bill Format Print File.pdf",
        "expiryDate": "2027-06-01",
        "status": "VALID",
        "uploadedAt": "2026-06-01T10:37:50.567Z"
      }
    ],
    "isActive": true,
    "vendorName": "Mahesh Transport",
    "source": "VENDOR_PORTAL",
    "createdByLoginType": "VENDOR",
    "createdByVendorId": "tenant-vendor-hh8uo8c",
    "id": "vehicle-zfnkh4z",
    "createdAt": "2026-06-01T10:37:50.568Z",
    "updatedAt": "2026-06-01T10:37:50.568Z"
  },
  {
    "tenantId": "tenant-bl001",
    "registrationNumber": "KA01JJ9012",
    "vehicleTypeId": "vehicle-type-d29xwv3",
    "make": "TATA",
    "model": "TATA",
    "year": "2011",
    "fuelType": "DIESEL",
    "engineNumber": "12121dscdsc",
    "chassisNo": "12321edwdewd",
    "capacityKg": "15000",
    "baseLocation": "KA",
    "operationalStatus": "ACTIVE",
    "ownershipType": "VENDOR",
    "vendorId": "tenant-vendor-nqup09r",
    "insurance": {
      "number": "hdsgsghg72332",
      "expiry": "2026-05-26"
    },
    "fitness": {
      "number": "jgf873687q2321",
      "expiry": "2026-05-26"
    },
    "puc": {
      "number": "dasfdsfdsf",
      "expiry": "2026-05-25"
    },
    "permit": {
      "type": "723nbdsjbs",
      "expiry": "2026-05-20"
    },
    "odometer": "",
    "complianceStatus": "EXPIRED",
    "complianceDocuments": [
      {
        "id": "RC-RC",
        "type": "RC",
        "referenceNo": "sdfdsfdsfdsf",
        "fileName": "LR_BKG-2026-0017_draft-delivery-1.pdf",
        "fileUrl": "/docs/LR_BKG-2026-0017_draft-delivery-1.pdf",
        "expiryDate": "2026-05-18",
        "status": "EXPIRED",
        "uploadedAt": "1970-01-01T00:00:00.000Z"
      },
      {
        "id": "Insurance-Insurance",
        "type": "Insurance",
        "referenceNo": "hdsgsghg72332",
        "fileName": "invoice 2.pdf",
        "fileUrl": "/docs/invoice 2.pdf",
        "expiryDate": "2026-05-26",
        "status": "EXPIRED",
        "uploadedAt": "1970-01-01T00:00:00.000Z"
      },
      {
        "id": "PUC-PUC",
        "type": "PUC",
        "referenceNo": "dasfdsfdsf",
        "fileName": "6925_CONSIGNOR_COPY.pdf",
        "fileUrl": "/docs/6925_CONSIGNOR_COPY.pdf",
        "expiryDate": "2026-05-25",
        "status": "EXPIRED",
        "uploadedAt": "1970-01-01T00:00:00.000Z"
      },
      {
        "id": "FC-FC",
        "type": "FC",
        "referenceNo": "jgf873687q2321",
        "fileName": "6925_CONSIGNOR_COPY.pdf",
        "fileUrl": "/docs/6925_CONSIGNOR_COPY.pdf",
        "expiryDate": "2026-05-26",
        "status": "EXPIRED",
        "uploadedAt": "1970-01-01T00:00:00.000Z"
      },
      {
        "id": "NationalPermit-NationalPermit",
        "type": "NationalPermit",
        "referenceNo": "723nbdsjbs",
        "fileName": "INV-20260504-0001.pdf",
        "fileUrl": "/docs/INV-20260504-0001.pdf",
        "expiryDate": "2026-05-20",
        "status": "EXPIRED",
        "uploadedAt": "1970-01-01T00:00:00.000Z"
      }
    ],
    "isActive": true,
    "id": "vehicle-5qgxchl",
    "createdAt": "2026-05-31T14:36:18.705Z",
    "updatedAt": "2026-05-31T16:10:04.609Z"
  },
  {
    "tenantId": "tenant-bl001",
    "registrationNumber": "KA01KK9900",
    "vehicleTypeId": "vehicle-type-d29xwv3",
    "make": "TATA",
    "model": "TATA",
    "year": "2021",
    "fuelType": "DIESEL",
    "engineNumber": "sdfdsfdfds",
    "chassisNo": "sdfdsfdsf",
    "capacityKg": "15000",
    "baseLocation": "Bangalore",
    "operationalStatus": "ACTIVE",
    "ownershipType": "VENDOR",
    "vendorId": "tenant-vendor-nqup09r",
    "insurance": {
      "number": "",
      "expiry": ""
    },
    "fitness": {
      "number": "",
      "expiry": ""
    },
    "puc": {
      "number": "",
      "expiry": ""
    },
    "permit": {
      "type": "",
      "expiry": ""
    },
    "odometer": "",
    "complianceStatus": "PENDING_DOCS",
    "complianceDocuments": [],
    "isActive": true,
    "id": "vehicle-xekotwe",
    "createdAt": "2026-05-31T13:36:46.028Z",
    "updatedAt": "2026-05-31T16:10:13.656Z"
  }
] as unknown as TenantVehicle[];
export const bl001Drivers = [
  {
    "tenantId": "tenant-bl001",
    "name": "Kartik Pawar",
    "dob": "2017-01-01",
    "photoUrl": null,
    "phone": "9900154373",
    "address": "KA",
    "bloodGroup": "",
    "licenseNumber": "DL002323",
    "licenseType": "HMV",
    "licenseExpiry": "2027-06-01",
    "medicalExpiry": "2027-06-01",
    "drugTestStatus": "CLEAR",
    "endorsements": [],
    "assignedVehicleId": null,
    "vendorId": "tenant-vendor-hh8uo8c",
    "email": "kartikpawar391@gmail.com",
    "gender": "MALE",
    "baseLocation": "KA",
    "aadhaarMasked": "21324832947324324",
    "licenseClasses": [
      "HMV"
    ],
    "currentStatus": "ACTIVE",
    "complianceStatus": "COMPLIANT",
    "complianceDocuments": [
      {
        "id": "DL-1780315857422-6thqjhk07h4",
        "type": "DL",
        "referenceNo": "",
        "fileName": "Bill Format Print File.pdf",
        "fileUrl": "/docs/Bill Format Print File.pdf",
        "expiryDate": "2027-06-01",
        "status": "VALID",
        "uploadedAt": "2026-06-01T12:10:57.422Z"
      },
      {
        "id": "MedicalCertificate-1780315857422-ego0dm5k75g",
        "type": "MedicalCertificate",
        "referenceNo": "",
        "fileName": "Bill Format Print File.pdf",
        "fileUrl": "/docs/Bill Format Print File.pdf",
        "expiryDate": "2027-06-01",
        "status": "VALID",
        "uploadedAt": "2026-06-01T12:10:57.422Z"
      }
    ],
    "mobile": "9900154373",
    "isActive": true,
    "vendorName": "Mahesh Transport",
    "source": "VENDOR_PORTAL",
    "createdByLoginType": "VENDOR",
    "createdByVendorId": "tenant-vendor-hh8uo8c",
    "id": "driver-wf1ilgl",
    "createdAt": "2026-06-01T12:10:57.422Z",
    "updatedAt": "2026-06-01T12:10:57.422Z"
  },
  {
    "tenantId": "tenant-bl001",
    "name": "Kartik Pawar",
    "dob": "",
    "photoUrl": null,
    "phone": "9900154373",
    "address": "KA",
    "bloodGroup": "",
    "licenseNumber": "DFDSFSDQ4Q3",
    "licenseType": "HMV",
    "licenseExpiry": "2027-02-17",
    "medicalExpiry": "2027-06-02",
    "drugTestStatus": "CLEAR",
    "endorsements": [],
    "assignedVehicleId": "vehicle-xekotwe",
    "vendorId": "tenant-vendor-nqup09r",
    "email": "wewew91@gmail.com",
    "gender": "MALE",
    "baseLocation": "KA",
    "aadhaarMasked": "dfshk3qh43q4q",
    "licenseClasses": [
      "HMV"
    ],
    "mobile": "9900154373",
    "complianceStatus": "COMPLIANT",
    "complianceDocuments": [
      {
        "id": "DL-DL",
        "type": "DL",
        "referenceNo": "dlhsakjfdhdsf34",
        "fileName": "LR copy format for AI.pdf",
        "fileUrl": "/docs/LR copy format for AI.pdf",
        "expiryDate": "2026-12-16",
        "status": "VALID",
        "uploadedAt": "1970-01-01T00:00:00.000Z"
      },
      {
        "id": "MedicalCertificate-MedicalCertificate",
        "type": "MedicalCertificate",
        "referenceNo": "zdfdsfsdfdf",
        "fileName": "LR copy format for AI.pdf",
        "fileUrl": "/docs/LR copy format for AI.pdf",
        "expiryDate": "2027-06-02",
        "status": "VALID",
        "uploadedAt": "1970-01-01T00:00:00.000Z"
      }
    ],
    "isActive": true,
    "id": "driver-9rkxf10",
    "createdAt": "2026-05-31T14:40:05.461Z",
    "updatedAt": "2026-05-31T16:10:23.988Z"
  },
  {
    "tenantId": "tenant-bl001",
    "name": "Ullas",
    "dob": "2026-06-01",
    "photoUrl": null,
    "phone": "9900161616",
    "address": "Bangalore",
    "bloodGroup": "",
    "licenseNumber": "DL001HN01201",
    "licenseType": "HMV",
    "licenseExpiry": "2026-05-27",
    "medicalExpiry": "",
    "drugTestStatus": "CLEAR",
    "endorsements": [],
    "assignedVehicleId": "vehicle-xekotwe",
    "vendorId": "tenant-vendor-nqup09r",
    "email": "kartikpawar391@gmail.com",
    "gender": "MALE",
    "baseLocation": "Bangalore",
    "aadhaarMasked": "2348726487326432",
    "licenseClasses": [
      "HMV"
    ],
    "mobile": "9900161616",
    "complianceStatus": "PENDING_DOCS",
    "complianceDocuments": [],
    "isActive": true,
    "id": "driver-44gjj1g",
    "createdAt": "2026-05-31T13:40:00.847Z",
    "updatedAt": "2026-05-31T16:10:31.701Z"
  }
] as unknown as TenantDriver[];
export const bl001Materials = [
  {
    "tenantId": "tenant-bl001",
    "materialCode": "CEMENT",
    "description": "Cement",
    "uom": "BAG",
    "defaultWeightUOM": "MT",
    "conversionValue": 0.05,
    "mappedCustomerIds": [
      "tenant-customer-o8kyr7u"
    ],
    "status": "active",
    "quantityUOM": "BAG",
    "id": "material-i8gm01l",
    "createdAt": "2026-05-31T13:31:41.452Z",
    "updatedAt": "2026-05-31T13:31:41.452Z"
  }
] as unknown as TenantMaterial[];
export const bl001UOMDefinitions = [
  {
    "tenantId": "tenant-bl001",
    "category": "WEIGHT",
    "code": "MT",
    "label": "MT",
    "isCustom": false,
    "status": "active",
    "id": "uom-definition-bemn7nd",
    "createdAt": "2026-05-31T13:30:21.301Z",
    "updatedAt": "2026-05-31T13:30:21.301Z"
  },
  {
    "tenantId": "tenant-bl001",
    "category": "QUANTITY",
    "code": "BAG",
    "label": "BAG",
    "isCustom": false,
    "status": "active",
    "id": "uom-definition-fpzvbt1",
    "createdAt": "2026-05-31T13:30:13.526Z",
    "updatedAt": "2026-05-31T13:30:13.526Z"
  }
] as unknown as TenantUOMDefinition[];
export const bl001UOMMappings = [
  {
    "tenantId": "tenant-bl001",
    "quantityUOM": "BAG",
    "weightUOM": "MT",
    "conversionValue": 0.05,
    "status": "active",
    "id": "uom-mapping-4q27flh",
    "createdAt": "2026-05-31T13:30:38.200Z",
    "updatedAt": "2026-05-31T13:30:38.200Z"
  }
] as unknown as TenantUOMMapping[];
export const bl001LRConfigs = [
  {
    "tenantId": "tenant-bl001",
    "scopeType": "HIERARCHY",
    "scopeOrgUnitIds": [],
    "poolOwnershipType": "TENANT",
    "customerId": null,
    "vendorId": null,
    "lrType": "AUTO",
    "allocationStrategy": "HIERARCHICAL",
    "prefix": "BD",
    "numberSeparator": "-",
    "yearFormat": "YYYY",
    "zeroPaddingLength": 6,
    "customerOwnershipEnabled": false,
    "poolSource": "LIST",
    "ownershipLevelId": "level-zone",
    "distributionStrategy": "DISTRIBUTED",
    "workflowMode": "APPROVAL_BASED",
    "numberingPolicy": "STRICT_FORMAT",
    "customerLrPolicy": "NOT_CUSTOMER_SPECIFIC",
    "allowCustomerFallback": true,
    "workflowPermissions": {
      "UPLOAD_LR": [],
      "ALLOCATE_LR": [],
      "REQUEST_LR": [],
      "APPROVE_LR": [],
      "TRANSFER_LR": [],
      "CONSUME_LR": [],
      "VOID_LR": [],
      "VIEW_AUDIT": []
    },
    "workflowPermissionScopes": [],
    "childGovernanceRules": [
      {
        "childLevelId": "level-region",
        "canConsumeParentLr": true,
        "childCanRequestLr": true,
        "childCanConsumeLr": true,
        "canMaintainOwnSequence": false,
        "canDefineChildFormat": true,
        "parentCanGenerateLr": true,
        "parentCanAllocateLrToChild": true,
        "canAllocateChildLr": true,
        "canApproveChildRequests": true,
        "canConfigureChildWorkflow": false,
        "canDelegateChildGovernance": false,
        "inheritParentFormat": true,
        "formatMode": "PARENT_PREFIX_CHILD_SUFFIX",
        "allocationRequired": true,
        "approvalRequired": true,
        "canTransferLr": false
      },
      {
        "childLevelId": "level-zone",
        "canConsumeParentLr": true,
        "childCanRequestLr": true,
        "childCanConsumeLr": true,
        "canMaintainOwnSequence": false,
        "canDefineChildFormat": true,
        "parentCanGenerateLr": true,
        "parentCanAllocateLrToChild": true,
        "canAllocateChildLr": true,
        "canApproveChildRequests": true,
        "canConfigureChildWorkflow": false,
        "canDelegateChildGovernance": false,
        "inheritParentFormat": true,
        "formatMode": "PARENT_PREFIX_CHILD_SUFFIX",
        "allocationRequired": true,
        "approvalRequired": true,
        "canTransferLr": false
      }
    ],
    "placeFormatOverrides": [
      {
        "orgUnitId": "ou-w7w26b4",
        "prefix": "SOU",
        "yearFormat": "YYYY",
        "numberSeparator": "-",
        "zeroPaddingLength": 6,
        "numberingPolicy": "STRICT_FORMAT"
      },
      {
        "orgUnitId": "ou-bqtfh2a",
        "prefix": "BN",
        "yearFormat": "YYYY",
        "numberSeparator": "-",
        "zeroPaddingLength": 6,
        "numberingPolicy": "STRICT_FORMAT"
      }
    ],
    "poolRangeStart": "",
    "poolRangeEnd": "",
    "poolEntries": "",
    "poolAvailableCount": 0,
    "poolUsedCount": 0,
    "locationOrgUnitId": "",
    "locationCounter": 0,
    "status": "active",
    "id": "lr-config-pgcnwuo",
    "createdAt": "2026-06-02T07:19:00.603Z",
    "updatedAt": "2026-06-02T07:19:42.741Z"
  },
  {
    "tenantId": "tenant-bl001",
    "scopeType": "TENANT",
    "scopeOrgUnitIds": [],
    "poolOwnershipType": "TENANT",
    "customerId": null,
    "vendorId": null,
    "lrType": "MANUAL",
    "allocationStrategy": "HIERARCHICAL",
    "prefix": "BL",
    "numberSeparator": "-",
    "yearFormat": "YYYY",
    "zeroPaddingLength": 6,
    "customerOwnershipEnabled": false,
    "poolSource": "LIST",
    "ownershipLevelId": null,
    "distributionStrategy": "DISTRIBUTED",
    "workflowMode": "APPROVAL_BASED",
    "numberingPolicy": "STRICT_FORMAT",
    "customerLrPolicy": "NOT_CUSTOMER_SPECIFIC",
    "allowCustomerFallback": true,
    "workflowPermissions": {
      "UPLOAD_LR": [],
      "ALLOCATE_LR": [],
      "REQUEST_LR": [],
      "APPROVE_LR": [],
      "TRANSFER_LR": [],
      "CONSUME_LR": [],
      "VOID_LR": [],
      "VIEW_AUDIT": []
    },
    "workflowPermissionScopes": [],
    "childGovernanceRules": [],
    "placeFormatOverrides": [
      {
        "orgUnitId": "ou-w7w26b4",
        "prefix": "SR",
        "yearFormat": "YYYY",
        "numberSeparator": "-",
        "zeroPaddingLength": 6,
        "numberingPolicy": "STRICT_FORMAT"
      },
      {
        "orgUnitId": "ou-bqtfh2a",
        "prefix": "BLR",
        "yearFormat": "YYYY",
        "numberSeparator": "-",
        "zeroPaddingLength": 6,
        "numberingPolicy": "STRICT_FORMAT"
      }
    ],
    "poolRangeStart": "",
    "poolRangeEnd": "",
    "poolEntries": "",
    "poolAvailableCount": 0,
    "poolUsedCount": 0,
    "locationOrgUnitId": "",
    "locationCounter": 0,
    "status": "active",
    "id": "lr-config-cmkldft",
    "createdAt": "2026-05-31T05:46:37.277Z",
    "updatedAt": "2026-06-02T06:20:18.727Z"
  }
] as unknown as TenantLRConfig[];
export const bl001LrPools = [] as unknown as TenantLrPoolRecord[];
export const bl001Lrs = [
  {
    "id": "lr-hixem6f",
    "tenantId": "tenant-bl001",
    "lrNumber": "BDSOUBN-2026-000002",
    "bookingId": "booking-tgmu56t",
    "deliveryId": "draft-delivery-1",
    "customerId": "tenant-customer-o8kyr7u",
    "vehicleNumber": "",
    "driverName": "",
    "status": "COMPLETED",
    "type": "AUTO",
    "configId": "lr-config-pgcnwuo",
    "orgUnitId": "ou-bqtfh2a",
    "createdAt": "2026-06-03T12:19:29.267Z",
    "updatedAt": "2026-06-03T12:25:10.510Z"
  },
  {
    "id": "lr-96qdcme",
    "tenantId": "tenant-bl001",
    "lrNumber": "BDSOU-2026-000001",
    "bookingId": "booking-o9zik9w",
    "deliveryId": "draft-delivery-1",
    "customerId": "tenant-customer-o8kyr7u",
    "vehicleNumber": "",
    "driverName": "",
    "status": "ASSIGNED",
    "type": "AUTO",
    "configId": "lr-config-pgcnwuo",
    "orgUnitId": "ou-w7w26b4",
    "createdAt": "2026-06-02T08:31:11.563Z",
    "updatedAt": "2026-06-02T08:31:11.563Z"
  },
  {
    "id": "lr-bge2yv0",
    "tenantId": "tenant-bl001",
    "lrNumber": "BDSOUBN-2026-000001",
    "bookingId": "booking-7p8of3m",
    "deliveryId": "draft-delivery-1",
    "customerId": "tenant-customer-o8kyr7u",
    "vehicleNumber": "",
    "driverName": "",
    "status": "ASSIGNED",
    "type": "AUTO",
    "configId": "lr-config-pgcnwuo",
    "orgUnitId": "ou-bqtfh2a",
    "createdAt": "2026-06-02T07:29:47.869Z",
    "updatedAt": "2026-06-02T07:29:47.869Z"
  },
  {
    "id": "lr-oqh3ems",
    "tenantId": "tenant-bl001",
    "lrNumber": "BD-2026-000001",
    "bookingId": "booking-dq1cgmp",
    "deliveryId": "draft-delivery-1",
    "customerId": "tenant-customer-o8kyr7u",
    "vehicleNumber": "",
    "driverName": "",
    "status": "ASSIGNED",
    "type": "AUTO",
    "configId": "lr-config-pgcnwuo",
    "orgUnitId": "ou-bqtfh2a",
    "createdAt": "2026-06-02T07:21:54.305Z",
    "updatedAt": "2026-06-02T07:21:54.305Z"
  },
  {
    "id": "lr-1jq6axy",
    "tenantId": "tenant-bl001",
    "lrNumber": "BLSRBLR-2026-000003",
    "bookingId": "booking-nywzsi8",
    "deliveryId": "draft-delivery-1",
    "customerId": "tenant-customer-o8kyr7u",
    "vehicleNumber": "",
    "driverName": "",
    "status": "ASSIGNED",
    "type": "MANUAL",
    "configId": "lr-config-cmkldft",
    "createdAt": "2026-06-01T17:35:22.944Z",
    "updatedAt": "2026-06-01T17:35:22.944Z"
  },
  {
    "id": "lr-gxr4ohi",
    "tenantId": "tenant-bl001",
    "lrNumber": "BLSRBLR-2026-000002",
    "bookingId": "booking-u7v5r26",
    "deliveryId": "draft-delivery-1",
    "customerId": "tenant-customer-o8kyr7u",
    "vehicleNumber": "",
    "driverName": "",
    "status": "ASSIGNED",
    "type": "MANUAL",
    "configId": "lr-config-cmkldft",
    "createdAt": "2026-06-01T12:11:46.705Z",
    "updatedAt": "2026-06-01T12:11:46.705Z"
  },
  {
    "id": "lr-k8suojl",
    "tenantId": "tenant-bl001",
    "lrNumber": "BLSRBLR-2026-000001",
    "bookingId": "booking-6f6dlkh",
    "deliveryId": "draft-delivery-1",
    "customerId": "tenant-customer-o8kyr7u",
    "vehicleNumber": "",
    "driverName": "",
    "status": "COMPLETED",
    "type": "MANUAL",
    "configId": "lr-config-cmkldft",
    "createdAt": "2026-05-31T16:11:12.939Z",
    "updatedAt": "2026-06-02T20:56:30.467Z"
  }
] as unknown as TenantLrRecord[];
export const bl001LrRequests = [
  {
    "tenantId": "tenant-bl001",
    "sourceLevelId": "level-region",
    "targetLevelId": "level-region",
    "requestedCount": 100,
    "approvedCount": 100,
    "status": "APPROVED",
    "note": "Auto LR runtime access approved.",
    "sourceOrgUnitId": "ou-w7w26b4",
    "targetOrgUnitId": null,
    "sourceUserId": "user-go5v8jg",
    "targetUserId": null,
    "lrType": "AUTO",
    "configId": "lr-config-pgcnwuo",
    "customerId": null,
    "branchName": "South-Region",
    "branchCode": "OU-W7W26B4",
    "lastSequenceNumber": null,
    "rejectionReason": null,
    "id": "lr-request-aq1clbm",
    "createdAt": "2026-06-02T08:30:00.081Z",
    "updatedAt": "2026-06-02T08:30:37.238Z",
    "decidedAt": "2026-06-02T08:30:37.238Z"
  },
  {
    "tenantId": "tenant-bl001",
    "sourceLevelId": "level-zone",
    "targetLevelId": "level-region",
    "requestedCount": 25,
    "approvedCount": 25,
    "status": "APPROVED",
    "note": "Auto LR runtime access approved.",
    "sourceOrgUnitId": "ou-bqtfh2a",
    "targetOrgUnitId": "ou-w7w26b4",
    "sourceUserId": "user-wwdm1u8",
    "targetUserId": null,
    "lrType": "AUTO",
    "configId": "lr-config-pgcnwuo",
    "customerId": null,
    "branchName": "Bangalore-Branch",
    "branchCode": "OU-BQTFH2A",
    "lastSequenceNumber": null,
    "rejectionReason": null,
    "id": "lr-request-rqlv9es",
    "createdAt": "2026-06-02T07:20:17.864Z",
    "updatedAt": "2026-06-02T07:20:47.606Z",
    "decidedAt": "2026-06-02T07:20:47.606Z"
  },
  {
    "tenantId": "tenant-bl001",
    "sourceLevelId": "level-region",
    "targetLevelId": "level-region",
    "requestedCount": 60,
    "approvedCount": 60,
    "status": "APPROVED",
    "note": "Approved from request list.",
    "sourceOrgUnitId": "ou-w7w26b4",
    "targetOrgUnitId": null,
    "sourceUserId": "user-go5v8jg",
    "targetUserId": null,
    "lrType": "MANUAL",
    "configId": "lr-config-cmkldft",
    "customerId": null,
    "branchName": "South-Region",
    "branchCode": "OU-W7W26B4",
    "lastSequenceNumber": null,
    "rejectionReason": null,
    "id": "lr-request-37adby2",
    "createdAt": "2026-05-31T13:22:54.569Z",
    "updatedAt": "2026-05-31T13:23:38.474Z",
    "decidedAt": "2026-05-31T13:23:38.474Z"
  },
  {
    "tenantId": "tenant-bl001",
    "sourceLevelId": "level-zone",
    "targetLevelId": "level-region",
    "requestedCount": 60,
    "approvedCount": 60,
    "status": "APPROVED",
    "note": "Approved from request list.",
    "sourceOrgUnitId": "ou-bqtfh2a",
    "targetOrgUnitId": "ou-w7w26b4",
    "sourceUserId": "user-wwdm1u8",
    "targetUserId": null,
    "lrType": "MANUAL",
    "configId": "lr-config-cmkldft",
    "customerId": null,
    "branchName": "Bangalore-Branch",
    "branchCode": "OU-BQTFH2A",
    "lastSequenceNumber": null,
    "rejectionReason": null,
    "id": "lr-request-7h4spw2",
    "createdAt": "2026-05-31T13:14:01.822Z",
    "updatedAt": "2026-05-31T13:14:23.162Z",
    "decidedAt": "2026-05-31T13:14:23.162Z"
  },
  {
    "tenantId": "tenant-bl001",
    "sourceLevelId": "level-zone",
    "targetLevelId": "level-region",
    "requestedCount": 10,
    "approvedCount": 0,
    "status": "PENDING",
    "note": null,
    "sourceOrgUnitId": "ou-bqtfh2a",
    "targetOrgUnitId": "ou-w7w26b4",
    "sourceUserId": "user-wwdm1u8",
    "targetUserId": null,
    "lrType": "MANUAL",
    "configId": "lr-config-cmkldft",
    "customerId": null,
    "branchName": "Bangalore-Branch",
    "branchCode": "OU-BQTFH2A",
    "lastSequenceNumber": null,
    "rejectionReason": null,
    "id": "lr-request-sztwo6s",
    "createdAt": "2026-05-31T13:08:47.455Z",
    "updatedAt": "2026-05-31T13:08:47.455Z",
    "decidedAt": null
  },
  {
    "tenantId": "tenant-bl001",
    "sourceLevelId": "level-zone",
    "targetLevelId": "level-region",
    "requestedCount": 50,
    "approvedCount": 0,
    "status": "PENDING",
    "note": null,
    "sourceOrgUnitId": "ou-bqtfh2a",
    "targetOrgUnitId": "ou-w7w26b4",
    "sourceUserId": "user-wwdm1u8",
    "targetUserId": null,
    "lrType": "MANUAL",
    "configId": "lr-config-cmkldft",
    "customerId": null,
    "branchName": "Bangalore-Branch",
    "branchCode": "OU-BQTFH2A",
    "lastSequenceNumber": null,
    "rejectionReason": null,
    "id": "lr-request-gmophnl",
    "createdAt": "2026-05-31T13:08:43.300Z",
    "updatedAt": "2026-05-31T13:08:43.300Z",
    "decidedAt": null
  },
  {
    "tenantId": "tenant-bl001",
    "sourceLevelId": "level-zone",
    "targetLevelId": "level-region",
    "requestedCount": 50,
    "approvedCount": 50,
    "status": "APPROVED",
    "note": "Approved from request list.",
    "sourceOrgUnitId": "ou-bqtfh2a",
    "targetOrgUnitId": "ou-w7w26b4",
    "sourceUserId": "user-wwdm1u8",
    "targetUserId": null,
    "lrType": "MANUAL",
    "configId": "lr-config-cmkldft",
    "customerId": null,
    "branchName": "Bangalore-Branch",
    "branchCode": "OU-BQTFH2A",
    "lastSequenceNumber": null,
    "rejectionReason": null,
    "id": "lr-request-ugpdlo3",
    "createdAt": "2026-05-31T13:04:09.248Z",
    "updatedAt": "2026-05-31T13:04:32.071Z",
    "decidedAt": "2026-05-31T13:04:32.071Z"
  },
  {
    "tenantId": "tenant-bl001",
    "sourceLevelId": "level-zone",
    "targetLevelId": "level-region",
    "requestedCount": 50,
    "approvedCount": 50,
    "status": "APPROVED",
    "note": "Approved from request list.",
    "sourceOrgUnitId": "ou-bqtfh2a",
    "targetOrgUnitId": "ou-w7w26b4",
    "sourceUserId": "user-wwdm1u8",
    "targetUserId": null,
    "lrType": "MANUAL",
    "configId": "lr-config-cmkldft",
    "customerId": null,
    "branchName": "Bangalore-Branch",
    "branchCode": "OU-BQTFH2A",
    "lastSequenceNumber": null,
    "rejectionReason": null,
    "id": "lr-request-367hs89",
    "createdAt": "2026-05-31T12:54:54.486Z",
    "updatedAt": "2026-05-31T12:56:08.011Z",
    "decidedAt": "2026-05-31T12:56:08.011Z"
  },
  {
    "tenantId": "tenant-bl001",
    "sourceLevelId": "level-zone",
    "targetLevelId": "level-region",
    "requestedCount": 50,
    "approvedCount": 50,
    "status": "APPROVED",
    "note": "Approved from request list.",
    "sourceOrgUnitId": "ou-bqtfh2a",
    "targetOrgUnitId": "ou-w7w26b4",
    "sourceUserId": "user-wwdm1u8",
    "targetUserId": null,
    "lrType": "MANUAL",
    "configId": "lr-config-cmkldft",
    "customerId": null,
    "branchName": "Bangalore-Branch",
    "branchCode": "OU-BQTFH2A",
    "lastSequenceNumber": null,
    "rejectionReason": null,
    "id": "lr-request-y3ahy1z",
    "createdAt": "2026-05-31T10:37:09.042Z",
    "updatedAt": "2026-05-31T10:37:30.153Z",
    "decidedAt": "2026-05-31T10:37:30.153Z"
  },
  {
    "tenantId": "tenant-bl001",
    "sourceLevelId": "level-zone",
    "targetLevelId": "level-region",
    "requestedCount": 50,
    "approvedCount": 50,
    "status": "APPROVED",
    "note": "Approved from request list.",
    "sourceOrgUnitId": "ou-bqtfh2a",
    "targetOrgUnitId": "ou-w7w26b4",
    "sourceUserId": "user-wwdm1u8",
    "targetUserId": null,
    "lrType": "MANUAL",
    "configId": "lr-config-cmkldft",
    "customerId": null,
    "branchName": "Bangalore-Branch",
    "branchCode": "OU-BQTFH2A",
    "lastSequenceNumber": null,
    "rejectionReason": null,
    "id": "lr-request-4ll1b6u",
    "createdAt": "2026-05-31T06:59:33.437Z",
    "updatedAt": "2026-05-31T07:20:41.107Z",
    "decidedAt": "2026-05-31T07:20:41.107Z"
  }
] as unknown as TenantLrAllocationRequestRecord[];
export const bl001LrTransfers = [] as unknown as TenantLrTransferRecord[];
export const bl001Bookings = [
  {
    "tenantId": "tenant-bl001",
    "modeOfTransport": "ROAD",
    "numberOfDeliveries": 1,
    "customerId": "tenant-customer-o8kyr7u",
    "materialIds": [
      "material-i8gm01l"
    ],
    "sourceAddressId": "customer-address-qfnxvlr",
    "destinationAddressId": "customer-address-ykih6kv",
    "consignorAddressId": "customer-address-qfnxvlr",
    "consigneeAddressId": "customer-address-ykih6kv",
    "laneKey": null,
    "laneFound": false,
    "poNumber": null,
    "doNumber": null,
    "ewayBillNumber": null,
    "pickupDate": "2026-06-03",
    "pickupTime": "17:48",
    "tat": null,
    "serviceType": "FTL",
    "commercialType": "SPOT",
    "pricing": {
      "rateType": "PER_TRIP",
      "contractRateCardId": null,
      "l1Rate": null,
      "enteredRate": 40000,
      "calculatedFreight": 40000,
      "distanceKm": null,
      "deviationPercent": 0,
      "approvalLevel": null,
      "deviationRemark": null,
      "isAutoApproved": true
    },
    "chargeType": null,
    "subBrand": null,
    "quantity": 400,
    "weight": 20,
    "uom": "BAG",
    "weightUom": "MT",
    "vehicleTypeId": "vehicle-type-d29xwv3",
    "lrType": "AUTO",
    "manualLrPoolPreference": "GENERAL",
    "status": "COMPLETED",
    "opsRemark": null,
    "pod": {
      "podDocument": "invoice.pdf",
      "podUploaded": true,
      "podUploadedAt": "2026-06-03T12:24:55.387Z",
      "photoName": "invoice.pdf",
      "consigneeName": "TEst",
      "podRemark": "testttt",
      "eSignRequested": false,
      "capturedAt": "2026-06-03T12:24:55.387Z"
    },
    "documents": [
      {
        "id": "BKG-2026-0008-draft-delivery-1-invoice-1",
        "type": "INVOICE",
        "fileName": "invoice.pdf",
        "uploadedAt": "2026-06-03T12:22:04.499Z",
        "uploadedBy": "Ops",
        "deliveryId": "draft-delivery-1"
      },
      {
        "id": "BKG-2026-0008-draft-delivery-1-eway",
        "type": "EWAY_BILL",
        "fileName": "invoice.pdf",
        "uploadedAt": "2026-06-03T12:22:16.980Z",
        "uploadedBy": "Ops",
        "deliveryId": "draft-delivery-1"
      }
    ],
    "expenses": [],
    "deliveries": [
      {
        "id": "draft-delivery-1",
        "deliveryNo": 1,
        "trackingId": "TRK-DRAFT-01",
        "originCity": "Bengaluru",
        "originAddressId": "customer-address-qfnxvlr",
        "destinationCity": "Chandausi",
        "destinationAddressId": "customer-address-ykih6kv",
        "destinationAddressSource": "SAVED_ADDRESS",
        "consigneeFinalizationStatus": "CONFIRMED",
        "materialId": "material-i8gm01l",
        "quantity": 400,
        "uom": "BAG",
        "weight": 20,
        "weightUom": "MT",
        "distanceKm": null,
        "status": "COMPLETED",
        "lrNumber": "BDSOUBN-2026-000002",
        "pod": {
          "podDocument": "invoice.pdf",
          "podUploaded": true,
          "podUploadedAt": "2026-06-03T12:24:55.387Z",
          "photoName": "invoice.pdf",
          "consigneeName": "TEst",
          "podRemark": "testttt",
          "eSignRequested": false,
          "capturedAt": "2026-06-03T12:24:55.387Z"
        },
        "lrId": "lr-hixem6f",
        "routeLabel": "Bengaluru -> Bengaluru",
        "eta": null,
        "deliverySequence": 1,
        "freightRate": 40000,
        "tripImpactSummary": "Base delivery record.",
        "contactPerson": null,
        "contactNumber": null,
        "unloadingNotes": null,
        "instructions": null,
        "activeRevisionId": null,
        "revisions": []
      }
    ],
    "createdBy": "Tenant Admin",
    "assignment": {
      "vendorId": "tenant-vendor-hh8uo8c",
      "vendorName": "Mahesh Transport",
      "vehicleId": "vehicle-zfnkh4z",
      "vehicleLabel": "KA01JK1234",
      "driverId": "driver-wf1ilgl",
      "driverName": "Kartik Pawar",
      "vendorFreight": 40000,
      "vendorRateCardId": null,
      "vendorRateType": null,
      "vendorContractSource": null,
      "customerFreight": 40000,
      "sellingRateLabel": null,
      "buyingRateLabel": null,
      "marginAmount": null,
      "assignedAt": "2026-06-03T12:19:29.267Z",
      "lrNumber": "BDSOUBN-2026-000002",
      "loadingStartedAt": "2026-06-03T12:21:35.723Z",
      "loadingCompletedAt": "2026-06-03T12:21:37.310Z"
    },
    "remarks": [
      {
        "id": "booking-remark-1780489169269",
        "timestamp": "2026-06-03T12:19:29.267Z",
        "actor": "Mahesh Transport",
        "type": "SYSTEM_REMARK",
        "message": "Assigned KA01JK1234 to Kartik Pawar under Mahesh Transport."
      },
      {
        "id": "booking-remark-1780489295731",
        "timestamp": "2026-06-03T12:21:35.731Z",
        "actor": "Dispatcher",
        "type": "SYSTEM_REMARK",
        "message": "Loading started."
      },
      {
        "id": "booking-remark-1780489297316",
        "timestamp": "2026-06-03T12:21:37.316Z",
        "actor": "Dispatcher",
        "type": "SYSTEM_REMARK",
        "message": "Loading completed."
      },
      {
        "id": "booking-remark-1780489365018",
        "timestamp": "2026-06-03T12:22:45.018Z",
        "actor": "System",
        "type": "SYSTEM_REMARK",
        "message": "All required execution checkpoints completed."
      },
      {
        "id": "booking-remark-1780489365018",
        "timestamp": "2026-06-03T12:22:45.018Z",
        "actor": "System",
        "type": "SYSTEM_REMARK",
        "message": "Dispatch flow advanced automatically."
      },
      {
        "id": "booking-remark-1780489365018",
        "timestamp": "2026-06-03T12:22:45.018Z",
        "actor": "System",
        "type": "SYSTEM_REMARK",
        "message": "Auto moved to transit after loading, invoice, E-Way Bill, and LR completion."
      },
      {
        "id": "booking-remark-1780489413416",
        "timestamp": "2026-06-03T12:23:33.416Z",
        "actor": "Ops",
        "type": "SYSTEM_REMARK",
        "message": "All deliveries physically completed. Waiting for POD collection."
      },
      {
        "id": "booking-remark-1780489510508",
        "timestamp": "2026-06-03T12:25:10.508Z",
        "actor": "Ops",
        "type": "SYSTEM_REMARK",
        "message": "All delivery PODs uploaded. Booking marked as completed."
      }
    ],
    "statusTimeline": [
      {
        "id": "booking-status-1780489101867-draft",
        "status": "DRAFT",
        "timestamp": "2026-06-03T12:18:21.867Z",
        "actor": "Tenant Admin",
        "note": "Booking created."
      },
      {
        "id": "booking-status-1780489101867-routed",
        "status": "PENDING_ASSIGNMENT",
        "timestamp": "2026-06-03T12:18:21.867Z",
        "actor": "System",
        "note": "Booking ready for assignment."
      },
      {
        "id": "booking-status-1780489111949-indent-sent",
        "status": "PENDING_ASSIGNMENT",
        "timestamp": "2026-06-03T12:18:31.947Z",
        "actor": "ronak@gmail.com",
        "eventLabel": "INDENT_SENT_TO_VENDORS",
        "note": "Indent sent to 3 vendor(s)"
      },
      {
        "id": "booking-status-1780489154481-vendor_accepted_indent",
        "status": "PENDING_ASSIGNMENT",
        "timestamp": "2026-06-03T12:19:14.478Z",
        "actor": "Mahesh Transport",
        "eventLabel": "VENDOR_ACCEPTED_INDENT",
        "note": "Vendor accepted the indent"
      },
      {
        "id": "booking-status-1780489169269-accepted",
        "status": "ACCEPTED",
        "timestamp": "2026-06-03T12:19:29.267Z",
        "actor": "Mahesh Transport",
        "note": "Booking accepted for allocation under Mahesh Transport."
      },
      {
        "id": "booking-status-1780489169269-vehicle",
        "status": "VEHICLE_ASSIGNED",
        "timestamp": "2026-06-03T12:19:29.267Z",
        "actor": "Mahesh Transport",
        "note": "Vehicle KA01JK1234 assigned under Mahesh Transport."
      },
      {
        "id": "booking-status-1780489295731",
        "status": "LOADING_STARTED",
        "timestamp": "2026-06-03T12:21:35.731Z",
        "actor": "Dispatcher",
        "note": "Loading started."
      },
      {
        "id": "booking-status-1780489297316",
        "status": "LOADING_COMPLETED",
        "timestamp": "2026-06-03T12:21:37.316Z",
        "actor": "Dispatcher",
        "note": "Loading completed."
      },
      {
        "id": "booking-status-1780489365018",
        "status": "READY_FOR_DISPATCH",
        "timestamp": "2026-06-03T12:22:45.018Z",
        "actor": "System",
        "note": "All required execution checkpoints completed."
      },
      {
        "id": "booking-status-1780489365018",
        "status": "DISPATCHED",
        "timestamp": "2026-06-03T12:22:45.018Z",
        "actor": "System",
        "note": "Dispatch flow advanced automatically."
      },
      {
        "id": "booking-status-1780489365018",
        "status": "IN_TRANSIT",
        "timestamp": "2026-06-03T12:22:45.018Z",
        "actor": "System",
        "note": "Auto moved to transit after loading, invoice, E-Way Bill, and LR completion."
      },
      {
        "id": "booking-status-1780489413416",
        "status": "POD_PENDING",
        "timestamp": "2026-06-03T12:23:33.416Z",
        "actor": "Ops",
        "note": "All deliveries physically completed. Waiting for POD collection."
      },
      {
        "id": "booking-status-1780489510508",
        "status": "COMPLETED",
        "timestamp": "2026-06-03T12:25:10.508Z",
        "actor": "Ops",
        "note": "All delivery PODs uploaded. Booking marked as completed."
      }
    ],
    "id": "booking-tgmu56t",
    "bookingId": "BKG-2026-0008",
    "destinationChangeRequests": [],
    "operationalFlags": [],
    "lrIds": [
      "lr-hixem6f"
    ],
    "createdAt": "2026-06-03T12:18:21.867Z",
    "updatedAt": "2026-06-03T12:25:35.035Z",
    "isInvoiced": true,
    "invoiceId": "INV-2026-0002",
    "shipmentDocuments": {
      "deliveries": [
        {
          "deliveryId": "draft-delivery-1",
          "invoices": [
            {
              "id": "invoice-1780489324499-4jb2lb",
              "uploadedAt": "2026-06-03T12:22:04.499Z",
              "fileName": "invoice.pdf",
              "invoiceNumber": "HBM/00253/25-26",
              "invoiceValue": 144000,
              "invoiceDate": "2025-05-06",
              "material": "Cement Ppc (Hbm) - Normal",
              "subBrand": null,
              "quantity": 400,
              "quantityUOM": "BAG",
              "weight": 20,
              "weightUOM": "MT",
              "consigneeName": "Akanksha Trading Company",
              "consigneeAddress": "CHANDAUSI, MAULAGARH, SAMBHAL ROAD, near by sambhal mode, CHANDAUSI, Sambhal : near by sambhal mode, CHANDAUSI,, Sambhal",
              "consigneeCity": "Chandausi",
              "consigneePincode": "244412",
              "consigneeGstin": "09ABEPK1515F3ZZ",
              "extractedAt": "2026-06-03T12:22:04.499Z"
            }
          ],
          "actuals": {
            "material": "Cement Ppc (Hbm) - Normal",
            "subBrand": null,
            "quantity": 400,
            "quantityUOM": "BAG",
            "weight": 20,
            "weightUOM": "MT"
          },
          "ewayBill": {
            "fileName": "invoice.pdf",
            "ewayBillNumber": "421564738220",
            "validFromDate": "2026-06-04",
            "validFromTime": null,
            "validToDate": "2026-06-03",
            "validToTime": null,
            "uploadedAt": "2026-06-03T12:22:16.980Z"
          },
          "freightRate": null,
          "freightMessage": null,
          "extractedConsignee": {
            "name": "Akanksha Trading Company",
            "addressLine": "CHANDAUSI, MAULAGARH, SAMBHAL ROAD, near by sambhal mode, CHANDAUSI, Sambhal : near by sambhal mode, CHANDAUSI,, Sambhal",
            "city": "Chandausi",
            "pincode": "244412",
            "gstin": "09ABEPK1515F3ZZ"
          },
          "finalConsigneeChoice": {
            "mode": "USE_INVOICE_ADDRESS",
            "selectedAddressId": "customer-address-ykih6kv",
            "comparison": {
              "matchStatus": "DIFFERENT",
              "confidence": 0,
              "reasons": [
                "City is different.",
                "Pincode is different.",
                "Important address tokens have low overlap."
              ]
            }
          }
        }
      ],
      "totalFreightRate": 40000,
      "freightStatus": "READY",
      "freightMessage": "Spot booking keeps the existing freight value.",
      "submittedAt": "2026-06-03T12:22:45.011Z",
      "lr": {
        "number": "BDSOUBN-2026-000002",
        "generatedAt": "2026-06-03T12:22:45.011Z",
        "viewMode": "COMBINED",
        "extraCharges": 0,
        "advance": 0
      }
    }
  },
  {
    "tenantId": "tenant-bl001",
    "modeOfTransport": "ROAD",
    "numberOfDeliveries": 1,
    "customerId": "tenant-customer-o8kyr7u",
    "materialIds": [
      "material-i8gm01l"
    ],
    "sourceAddressId": "customer-address-qfnxvlr",
    "destinationAddressId": "customer-address-ykih6kv",
    "consignorAddressId": "customer-address-qfnxvlr",
    "consigneeAddressId": "customer-address-ykih6kv",
    "laneKey": null,
    "laneFound": false,
    "poNumber": null,
    "doNumber": null,
    "ewayBillNumber": null,
    "pickupDate": "2026-06-03",
    "pickupTime": "11:27",
    "tat": null,
    "serviceType": "FTL",
    "commercialType": "SPOT",
    "pricing": {
      "rateType": "PER_TRIP",
      "contractRateCardId": null,
      "l1Rate": null,
      "enteredRate": 12000,
      "calculatedFreight": 12000,
      "distanceKm": null,
      "deviationPercent": 0,
      "approvalLevel": null,
      "deviationRemark": null,
      "isAutoApproved": true
    },
    "chargeType": null,
    "subBrand": null,
    "quantity": 100,
    "weight": 5,
    "uom": "BAG",
    "weightUom": "MT",
    "vehicleTypeId": "vehicle-type-d29xwv3",
    "lrType": "MANUAL",
    "manualLrPoolPreference": "GENERAL",
    "status": "PENDING_ASSIGNMENT",
    "opsRemark": null,
    "pod": null,
    "documents": [],
    "expenses": [],
    "deliveries": [
      {
        "id": "draft-delivery-1",
        "deliveryNo": 1,
        "trackingId": "TRK-DRAFT-01",
        "originCity": "Bengaluru",
        "originAddressId": "customer-address-qfnxvlr",
        "destinationCity": "Bengaluru",
        "destinationAddressId": "customer-address-ykih6kv",
        "destinationAddressSource": "SAVED_ADDRESS",
        "consigneeFinalizationStatus": "CONFIRMED",
        "materialId": "material-i8gm01l",
        "quantity": 100,
        "uom": "BAG",
        "weight": 5,
        "weightUom": "MT",
        "distanceKm": null,
        "status": "PENDING_ASSIGNMENT",
        "lrNumber": null,
        "pod": null,
        "lrId": null,
        "routeLabel": "Bengaluru -> Bengaluru",
        "eta": null,
        "deliverySequence": 1,
        "freightRate": 12000,
        "tripImpactSummary": "Base delivery record.",
        "contactPerson": null,
        "contactNumber": null,
        "unloadingNotes": null,
        "instructions": null,
        "activeRevisionId": null,
        "revisions": []
      }
    ],
    "createdBy": "Tenant Admin",
    "assignment": null,
    "remarks": [],
    "statusTimeline": [
      {
        "id": "booking-status-1780466236992-draft",
        "status": "DRAFT",
        "timestamp": "2026-06-03T05:57:16.992Z",
        "actor": "Tenant Admin",
        "note": "Booking created."
      },
      {
        "id": "booking-status-1780466236992-routed",
        "status": "PENDING_ASSIGNMENT",
        "timestamp": "2026-06-03T05:57:16.992Z",
        "actor": "System",
        "note": "Booking ready for assignment."
      },
      {
        "id": "booking-status-1780466241633-indent-sent",
        "status": "PENDING_ASSIGNMENT",
        "timestamp": "2026-06-03T05:57:21.630Z",
        "actor": "jack@gmail.com",
        "eventLabel": "INDENT_SENT_TO_VENDORS",
        "note": "Indent sent to 3 vendor(s)"
      }
    ],
    "id": "booking-89cttti",
    "bookingId": "BKG-2026-0007",
    "destinationChangeRequests": [],
    "operationalFlags": [],
    "lrIds": [],
    "createdAt": "2026-06-03T05:57:16.993Z",
    "updatedAt": "2026-06-03T05:57:21.630Z",
    "isInvoiced": false,
    "invoiceId": null,
    "shipmentDocuments": {
      "deliveries": [
        {
          "deliveryId": "draft-delivery-1",
          "invoices": [],
          "actuals": {
            "material": "",
            "subBrand": null,
            "quantity": 100,
            "quantityUOM": "BAG",
            "weight": 5,
            "weightUOM": "MT"
          },
          "ewayBill": null,
          "freightRate": null,
          "freightMessage": null,
          "extractedConsignee": null,
          "finalConsigneeChoice": null
        }
      ],
      "totalFreightRate": null,
      "freightStatus": "PENDING",
      "freightMessage": null,
      "submittedAt": null,
      "lr": null
    }
  },
  {
    "tenantId": "tenant-bl001",
    "modeOfTransport": "ROAD",
    "numberOfDeliveries": 1,
    "customerId": "tenant-customer-o8kyr7u",
    "materialIds": [
      "material-i8gm01l"
    ],
    "sourceAddressId": "customer-address-qfnxvlr",
    "destinationAddressId": "customer-address-ykih6kv",
    "consignorAddressId": "customer-address-qfnxvlr",
    "consigneeAddressId": "customer-address-ykih6kv",
    "laneKey": null,
    "laneFound": false,
    "poNumber": null,
    "doNumber": null,
    "ewayBillNumber": null,
    "pickupDate": "2026-06-02",
    "pickupTime": "13:09",
    "tat": null,
    "serviceType": "FTL",
    "commercialType": "SPOT",
    "pricing": {
      "rateType": "PER_TRIP",
      "contractRateCardId": null,
      "l1Rate": null,
      "enteredRate": 50000,
      "calculatedFreight": 50000,
      "distanceKm": null,
      "deviationPercent": 0,
      "approvalLevel": null,
      "deviationRemark": null,
      "isAutoApproved": true
    },
    "chargeType": null,
    "subBrand": null,
    "quantity": 400,
    "weight": 20,
    "uom": "BAG",
    "weightUom": "MT",
    "vehicleTypeId": "vehicle-type-d29xwv3",
    "lrType": "AUTO",
    "manualLrPoolPreference": "GENERAL",
    "status": "IN_TRANSIT",
    "opsRemark": null,
    "pod": null,
    "documents": [
      {
        "id": "BKG-2026-0006-draft-delivery-1-invoice-1",
        "type": "INVOICE",
        "fileName": "invoice.pdf",
        "uploadedAt": "2026-06-03T12:00:33.861Z",
        "uploadedBy": "Ops",
        "deliveryId": "draft-delivery-1"
      },
      {
        "id": "BKG-2026-0006-draft-delivery-1-eway",
        "type": "EWAY_BILL",
        "fileName": "Eway",
        "uploadedAt": "2026-06-03T12:00:40.700Z",
        "uploadedBy": "Ops",
        "deliveryId": "draft-delivery-1"
      }
    ],
    "expenses": [],
    "deliveries": [
      {
        "id": "draft-delivery-1",
        "deliveryNo": 1,
        "trackingId": "TRK-DRAFT-01",
        "originCity": "Bengaluru",
        "originAddressId": "customer-address-qfnxvlr",
        "destinationCity": "Chandausi",
        "destinationAddressId": "customer-address-ykih6kv",
        "destinationAddressSource": "SAVED_ADDRESS",
        "consigneeFinalizationStatus": "CONFIRMED",
        "materialId": "material-i8gm01l",
        "quantity": 400,
        "uom": "BAG",
        "weight": 20,
        "weightUom": "MT",
        "distanceKm": null,
        "status": "IN_TRANSIT",
        "lrNumber": "BDSOU-2026-000001",
        "pod": null,
        "lrId": "lr-96qdcme",
        "routeLabel": "Bengaluru -> Bengaluru",
        "eta": null,
        "deliverySequence": 1,
        "freightRate": 50000,
        "tripImpactSummary": "Base delivery record.",
        "contactPerson": null,
        "contactNumber": null,
        "unloadingNotes": null,
        "instructions": null,
        "activeRevisionId": null,
        "revisions": []
      }
    ],
    "createdBy": "Tenant Admin",
    "assignment": {
      "vendorId": "tenant-vendor-hh8uo8c",
      "vendorName": "Mahesh Transport",
      "vehicleId": "vehicle-zfnkh4z",
      "vehicleLabel": "KA01JK1234",
      "driverId": "driver-wf1ilgl",
      "driverName": "Kartik Pawar",
      "vendorFreight": 50000,
      "vendorRateCardId": null,
      "vendorRateType": null,
      "vendorContractSource": null,
      "customerFreight": 50000,
      "sellingRateLabel": null,
      "buyingRateLabel": null,
      "marginAmount": null,
      "assignedAt": "2026-06-02T08:31:11.563Z",
      "lrNumber": "BDSOU-2026-000001",
      "loadingStartedAt": "2026-06-03T12:00:23.086Z",
      "loadingCompletedAt": "2026-06-03T12:00:24.067Z"
    },
    "remarks": [
      {
        "id": "booking-remark-1780389071564",
        "timestamp": "2026-06-02T08:31:11.563Z",
        "actor": "Mahesh Transport",
        "type": "SYSTEM_REMARK",
        "message": "Assigned KA01JK1234 to Kartik Pawar under Mahesh Transport."
      },
      {
        "id": "booking-remark-1780488023090",
        "timestamp": "2026-06-03T12:00:23.090Z",
        "actor": "Dispatcher",
        "type": "SYSTEM_REMARK",
        "message": "Loading started."
      },
      {
        "id": "booking-remark-1780488024071",
        "timestamp": "2026-06-03T12:00:24.071Z",
        "actor": "Dispatcher",
        "type": "SYSTEM_REMARK",
        "message": "Loading completed."
      },
      {
        "id": "booking-remark-1780488057063",
        "timestamp": "2026-06-03T12:00:57.063Z",
        "actor": "System",
        "type": "SYSTEM_REMARK",
        "message": "All required execution checkpoints completed."
      },
      {
        "id": "booking-remark-1780488057063",
        "timestamp": "2026-06-03T12:00:57.063Z",
        "actor": "System",
        "type": "SYSTEM_REMARK",
        "message": "Dispatch flow advanced automatically."
      },
      {
        "id": "booking-remark-1780488057063",
        "timestamp": "2026-06-03T12:00:57.063Z",
        "actor": "System",
        "type": "SYSTEM_REMARK",
        "message": "Auto moved to transit after loading, invoice, E-Way Bill, and LR completion."
      }
    ],
    "statusTimeline": [
      {
        "id": "booking-status-1780385950255-draft",
        "status": "DRAFT",
        "timestamp": "2026-06-02T07:39:10.255Z",
        "actor": "Tenant Admin",
        "note": "Booking created."
      },
      {
        "id": "booking-status-1780385950255-routed",
        "status": "PENDING_ASSIGNMENT",
        "timestamp": "2026-06-02T07:39:10.255Z",
        "actor": "System",
        "note": "Booking ready for assignment."
      },
      {
        "id": "booking-status-1780387711260-indent-sent",
        "status": "PENDING_ASSIGNMENT",
        "timestamp": "2026-06-02T08:08:31.253Z",
        "actor": "mahesh@gmail.com",
        "eventLabel": "INDENT_SENT_TO_VENDORS",
        "note": "Indent sent to 3 vendor(s)"
      },
      {
        "id": "booking-status-1780387733180-vendor_accepted_indent",
        "status": "PENDING_ASSIGNMENT",
        "timestamp": "2026-06-02T08:08:53.175Z",
        "actor": "Mahesh Transport",
        "eventLabel": "VENDOR_ACCEPTED_INDENT",
        "note": "Vendor accepted the indent"
      },
      {
        "id": "booking-status-1780389071564-accepted",
        "status": "ACCEPTED",
        "timestamp": "2026-06-02T08:31:11.563Z",
        "actor": "Mahesh Transport",
        "note": "Booking accepted for allocation under Mahesh Transport."
      },
      {
        "id": "booking-status-1780389071564-vehicle",
        "status": "VEHICLE_ASSIGNED",
        "timestamp": "2026-06-02T08:31:11.563Z",
        "actor": "Mahesh Transport",
        "note": "Vehicle KA01JK1234 assigned under Mahesh Transport."
      },
      {
        "id": "booking-status-1780488023090",
        "status": "LOADING_STARTED",
        "timestamp": "2026-06-03T12:00:23.090Z",
        "actor": "Dispatcher",
        "note": "Loading started."
      },
      {
        "id": "booking-status-1780488024071",
        "status": "LOADING_COMPLETED",
        "timestamp": "2026-06-03T12:00:24.071Z",
        "actor": "Dispatcher",
        "note": "Loading completed."
      },
      {
        "id": "booking-status-1780488057063",
        "status": "READY_FOR_DISPATCH",
        "timestamp": "2026-06-03T12:00:57.063Z",
        "actor": "System",
        "note": "All required execution checkpoints completed."
      },
      {
        "id": "booking-status-1780488057063",
        "status": "DISPATCHED",
        "timestamp": "2026-06-03T12:00:57.063Z",
        "actor": "System",
        "note": "Dispatch flow advanced automatically."
      },
      {
        "id": "booking-status-1780488057063",
        "status": "IN_TRANSIT",
        "timestamp": "2026-06-03T12:00:57.063Z",
        "actor": "System",
        "note": "Auto moved to transit after loading, invoice, E-Way Bill, and LR completion."
      }
    ],
    "id": "booking-o9zik9w",
    "bookingId": "BKG-2026-0006",
    "destinationChangeRequests": [],
    "operationalFlags": [],
    "lrIds": [
      "lr-96qdcme"
    ],
    "createdAt": "2026-06-02T07:39:10.256Z",
    "updatedAt": "2026-06-03T12:00:57.063Z",
    "isInvoiced": false,
    "invoiceId": null,
    "shipmentDocuments": {
      "deliveries": [
        {
          "deliveryId": "draft-delivery-1",
          "invoices": [
            {
              "id": "invoice-1780488033861-kf1p47",
              "uploadedAt": "2026-06-03T12:00:33.861Z",
              "fileName": "invoice.pdf",
              "invoiceNumber": "HBM/00253/25-26",
              "invoiceValue": 144000,
              "invoiceDate": "2025-05-06",
              "material": "Cement Ppc (Hbm) - Normal",
              "subBrand": null,
              "quantity": 400,
              "quantityUOM": "BAG",
              "weight": 20,
              "weightUOM": "MT",
              "consigneeName": "Akanksha Trading Company",
              "consigneeAddress": "CHANDAUSI, MAULAGARH, SAMBHAL ROAD, near by sambhal mode, CHANDAUSI, Sambhal : near by sambhal mode, CHANDAUSI,, Sambhal",
              "consigneeCity": "Chandausi",
              "consigneePincode": "244412",
              "consigneeGstin": "09ABEPK1515F3ZZ",
              "extractedAt": "2026-06-03T12:00:33.861Z"
            }
          ],
          "actuals": {
            "material": "Cement Ppc (Hbm) - Normal",
            "subBrand": null,
            "quantity": 400,
            "quantityUOM": "BAG",
            "weight": 20,
            "weightUOM": "MT"
          },
          "ewayBill": {
            "fileName": "Eway",
            "ewayBillNumber": "Eway0010",
            "validFromDate": "2026-06-03",
            "validFromTime": null,
            "validToDate": "2026-06-03",
            "validToTime": null,
            "uploadedAt": "2026-06-03T12:00:40.700Z"
          },
          "freightRate": null,
          "freightMessage": null,
          "extractedConsignee": {
            "name": "Akanksha Trading Company",
            "addressLine": "CHANDAUSI, MAULAGARH, SAMBHAL ROAD, near by sambhal mode, CHANDAUSI, Sambhal : near by sambhal mode, CHANDAUSI,, Sambhal",
            "city": "Chandausi",
            "pincode": "244412",
            "gstin": "09ABEPK1515F3ZZ"
          },
          "finalConsigneeChoice": null
        }
      ],
      "totalFreightRate": 50000,
      "freightStatus": "READY",
      "freightMessage": "Spot booking keeps the existing freight value.",
      "submittedAt": "2026-06-03T12:00:57.059Z",
      "lr": {
        "number": "BDSOU-2026-000001",
        "generatedAt": "2026-06-03T12:00:57.059Z",
        "viewMode": "COMBINED",
        "extraCharges": 0,
        "advance": 0
      }
    }
  },
  {
    "tenantId": "tenant-bl001",
    "modeOfTransport": "ROAD",
    "numberOfDeliveries": 1,
    "customerId": "tenant-customer-o8kyr7u",
    "materialIds": [
      "material-i8gm01l"
    ],
    "sourceAddressId": "customer-address-rp12cy5",
    "destinationAddressId": "customer-address-ykih6kv",
    "consignorAddressId": "customer-address-rp12cy5",
    "consigneeAddressId": "customer-address-ykih6kv",
    "laneKey": null,
    "laneFound": false,
    "poNumber": null,
    "doNumber": null,
    "ewayBillNumber": null,
    "pickupDate": "2026-06-01",
    "pickupTime": "19:19",
    "tat": null,
    "serviceType": "FTL",
    "commercialType": "SPOT",
    "pricing": {
      "rateType": "PER_TRIP",
      "contractRateCardId": null,
      "l1Rate": null,
      "enteredRate": 43000,
      "calculatedFreight": 43000,
      "distanceKm": null,
      "deviationPercent": 0,
      "approvalLevel": null,
      "deviationRemark": null,
      "isAutoApproved": true
    },
    "chargeType": null,
    "subBrand": null,
    "quantity": 100,
    "weight": 5,
    "uom": "BAG",
    "weightUom": "MT",
    "vehicleTypeId": "vehicle-type-d29xwv3",
    "lrType": "MANUAL",
    "manualLrPoolPreference": "GENERAL",
    "status": "VEHICLE_ASSIGNED",
    "opsRemark": null,
    "pod": null,
    "documents": [],
    "expenses": [],
    "deliveries": [
      {
        "id": "draft-delivery-1",
        "deliveryNo": 1,
        "trackingId": "TRK-DRAFT-01",
        "originCity": "Bengaluru",
        "originAddressId": "customer-address-rp12cy5",
        "destinationCity": "Bengaluru",
        "destinationAddressId": "customer-address-ykih6kv",
        "destinationAddressSource": "SAVED_ADDRESS",
        "consigneeFinalizationStatus": "CONFIRMED",
        "materialId": "material-i8gm01l",
        "quantity": 100,
        "uom": "BAG",
        "weight": 5,
        "weightUom": "MT",
        "distanceKm": null,
        "status": "VEHICLE_ASSIGNED",
        "lrNumber": "BLSRBLR-2026-000003",
        "pod": null,
        "lrId": "lr-1jq6axy",
        "routeLabel": "Bengaluru -> Bengaluru",
        "eta": null,
        "deliverySequence": 1,
        "freightRate": 43000,
        "tripImpactSummary": "Base delivery record.",
        "contactPerson": null,
        "contactNumber": null,
        "unloadingNotes": null,
        "instructions": null,
        "activeRevisionId": null,
        "revisions": []
      }
    ],
    "createdBy": "Tenant Admin",
    "assignment": {
      "vendorId": "tenant-vendor-hh8uo8c",
      "vendorName": "Mahesh Transport",
      "vehicleId": "vehicle-zfnkh4z",
      "vehicleLabel": "KA01JK1234",
      "driverId": "driver-wf1ilgl",
      "driverName": "Kartik Pawar",
      "vendorFreight": 43000,
      "vendorRateCardId": null,
      "vendorRateType": null,
      "vendorContractSource": null,
      "customerFreight": 43000,
      "sellingRateLabel": null,
      "buyingRateLabel": null,
      "marginAmount": null,
      "assignedAt": "2026-06-01T17:35:22.944Z",
      "lrNumber": "BLSRBLR-2026-000003",
      "loadingStartedAt": null,
      "loadingCompletedAt": null
    },
    "remarks": [
      {
        "id": "booking-remark-1780335322947",
        "timestamp": "2026-06-01T17:35:22.944Z",
        "actor": "Mahesh Transport",
        "type": "SYSTEM_REMARK",
        "message": "Assigned KA01JK1234 to Kartik Pawar under Mahesh Transport."
      }
    ],
    "statusTimeline": [
      {
        "id": "booking-status-1780321764574-draft",
        "status": "DRAFT",
        "timestamp": "2026-06-01T13:49:24.574Z",
        "actor": "Tenant Admin",
        "note": "Booking created."
      },
      {
        "id": "booking-status-1780321764574-routed",
        "status": "PENDING_ASSIGNMENT",
        "timestamp": "2026-06-01T13:49:24.574Z",
        "actor": "System",
        "note": "Booking ready for assignment."
      },
      {
        "id": "booking-status-1780335283081-indent-sent",
        "status": "PENDING_ASSIGNMENT",
        "timestamp": "2026-06-01T17:34:43.063Z",
        "actor": "jack@gmail.com",
        "eventLabel": "INDENT_SENT_TO_VENDORS",
        "note": "Indent sent to 3 vendor(s)"
      },
      {
        "id": "booking-status-1780335313826-vendor_accepted_indent",
        "status": "PENDING_ASSIGNMENT",
        "timestamp": "2026-06-01T17:35:13.807Z",
        "actor": "Mahesh Transport",
        "eventLabel": "VENDOR_ACCEPTED_INDENT",
        "note": "Vendor accepted the indent"
      },
      {
        "id": "booking-status-1780335322947-accepted",
        "status": "ACCEPTED",
        "timestamp": "2026-06-01T17:35:22.944Z",
        "actor": "Mahesh Transport",
        "note": "Booking accepted for allocation under Mahesh Transport."
      },
      {
        "id": "booking-status-1780335322947-vehicle",
        "status": "VEHICLE_ASSIGNED",
        "timestamp": "2026-06-01T17:35:22.944Z",
        "actor": "Mahesh Transport",
        "note": "Vehicle KA01JK1234 assigned under Mahesh Transport."
      }
    ],
    "id": "booking-nywzsi8",
    "bookingId": "BKG-2026-0005",
    "destinationChangeRequests": [],
    "operationalFlags": [],
    "lrIds": [
      "lr-1jq6axy"
    ],
    "createdAt": "2026-06-01T13:49:24.574Z",
    "updatedAt": "2026-06-01T17:35:22.944Z",
    "isInvoiced": false,
    "invoiceId": null,
    "shipmentDocuments": {
      "deliveries": [
        {
          "deliveryId": "draft-delivery-1",
          "invoices": [],
          "actuals": {
            "material": "",
            "subBrand": null,
            "quantity": 100,
            "quantityUOM": "BAG",
            "weight": 5,
            "weightUOM": "MT"
          },
          "ewayBill": null,
          "freightRate": null,
          "freightMessage": null,
          "extractedConsignee": null,
          "finalConsigneeChoice": null
        }
      ],
      "totalFreightRate": null,
      "freightStatus": "PENDING",
      "freightMessage": null,
      "submittedAt": null,
      "lr": null
    }
  },
  {
    "tenantId": "tenant-bl001",
    "modeOfTransport": "ROAD",
    "numberOfDeliveries": 1,
    "customerId": "tenant-customer-o8kyr7u",
    "materialIds": [
      "material-i8gm01l"
    ],
    "sourceAddressId": "customer-address-qfnxvlr",
    "destinationAddressId": "customer-address-ykih6kv",
    "consignorAddressId": "customer-address-qfnxvlr",
    "consigneeAddressId": "customer-address-ykih6kv",
    "laneKey": null,
    "laneFound": false,
    "poNumber": null,
    "doNumber": null,
    "ewayBillNumber": null,
    "pickupDate": "2026-06-01",
    "pickupTime": "19:07",
    "tat": null,
    "serviceType": "FTL",
    "commercialType": "SPOT",
    "pricing": {
      "rateType": "PER_TRIP",
      "contractRateCardId": null,
      "l1Rate": null,
      "enteredRate": 32000,
      "calculatedFreight": 32000,
      "distanceKm": null,
      "deviationPercent": 0,
      "approvalLevel": null,
      "deviationRemark": null,
      "isAutoApproved": true
    },
    "chargeType": null,
    "subBrand": null,
    "quantity": 100,
    "weight": 5,
    "uom": "BAG",
    "weightUom": "MT",
    "vehicleTypeId": "vehicle-type-d29xwv3",
    "lrType": "AUTO",
    "manualLrPoolPreference": "GENERAL",
    "status": "VEHICLE_ASSIGNED",
    "opsRemark": null,
    "pod": null,
    "documents": [],
    "expenses": [],
    "deliveries": [
      {
        "id": "draft-delivery-1",
        "deliveryNo": 1,
        "trackingId": "TRK-DRAFT-01",
        "originCity": "Bengaluru",
        "originAddressId": "customer-address-qfnxvlr",
        "destinationCity": "Bengaluru",
        "destinationAddressId": "customer-address-ykih6kv",
        "destinationAddressSource": "SAVED_ADDRESS",
        "consigneeFinalizationStatus": "CONFIRMED",
        "materialId": "material-i8gm01l",
        "quantity": 100,
        "uom": "BAG",
        "weight": 5,
        "weightUom": "MT",
        "distanceKm": null,
        "status": "VEHICLE_ASSIGNED",
        "lrNumber": "BD-2026-000001",
        "pod": null,
        "lrId": "lr-oqh3ems",
        "routeLabel": "Bengaluru -> Bengaluru",
        "eta": null,
        "deliverySequence": 1,
        "freightRate": 32000,
        "tripImpactSummary": "Base delivery record.",
        "contactPerson": null,
        "contactNumber": null,
        "unloadingNotes": null,
        "instructions": null,
        "activeRevisionId": null,
        "revisions": []
      }
    ],
    "createdBy": "Tenant Admin",
    "assignment": {
      "vendorId": "tenant-vendor-hh8uo8c",
      "vendorName": "Mahesh Transport",
      "vehicleId": "vehicle-zfnkh4z",
      "vehicleLabel": "KA01JK1234 (Vendor: Mahesh Transport)",
      "driverId": "driver-wf1ilgl",
      "driverName": "Kartik Pawar",
      "vendorFreight": 30000,
      "vendorRateCardId": null,
      "vendorRateType": null,
      "vendorContractSource": "MANUAL",
      "customerFreight": 32000,
      "sellingRateLabel": "PER_TRIP @ 32,000",
      "buyingRateLabel": null,
      "marginAmount": 2000,
      "marginPercent": 6.25,
      "assignedAt": "2026-06-02T07:21:54.305Z",
      "lrNumber": "BD-2026-000001",
      "loadingStartedAt": null,
      "loadingCompletedAt": null
    },
    "remarks": [
      {
        "id": "booking-remark-1780384914306",
        "timestamp": "2026-06-02T07:21:54.305Z",
        "actor": "ronak@gmail.com",
        "type": "SYSTEM_REMARK",
        "message": "Assigned KA01JK1234 (Vendor: Mahesh Transport) to Kartik Pawar under Mahesh Transport."
      }
    ],
    "statusTimeline": [
      {
        "id": "booking-status-1780321033116-draft",
        "status": "DRAFT",
        "timestamp": "2026-06-01T13:37:13.116Z",
        "actor": "Tenant Admin",
        "note": "Booking created."
      },
      {
        "id": "booking-status-1780321033116-routed",
        "status": "PENDING_ASSIGNMENT",
        "timestamp": "2026-06-01T13:37:13.116Z",
        "actor": "System",
        "note": "Booking ready for assignment."
      },
      {
        "id": "booking-status-1780384914306-accepted",
        "status": "ACCEPTED",
        "timestamp": "2026-06-02T07:21:54.305Z",
        "actor": "ronak@gmail.com",
        "note": "Booking accepted for allocation under Mahesh Transport."
      },
      {
        "id": "booking-status-1780384914306-vehicle",
        "status": "VEHICLE_ASSIGNED",
        "timestamp": "2026-06-02T07:21:54.305Z",
        "actor": "ronak@gmail.com",
        "note": "Vehicle KA01JK1234 (Vendor: Mahesh Transport) assigned under Mahesh Transport."
      }
    ],
    "id": "booking-dq1cgmp",
    "bookingId": "BKG-2026-0004",
    "destinationChangeRequests": [],
    "operationalFlags": [],
    "lrIds": [
      "lr-oqh3ems"
    ],
    "createdAt": "2026-06-01T13:37:13.116Z",
    "updatedAt": "2026-06-02T07:21:54.305Z",
    "isInvoiced": false,
    "invoiceId": null,
    "shipmentDocuments": {
      "deliveries": [
        {
          "deliveryId": "draft-delivery-1",
          "invoices": [],
          "actuals": {
            "material": "",
            "subBrand": null,
            "quantity": 100,
            "quantityUOM": "BAG",
            "weight": 5,
            "weightUOM": "MT"
          },
          "ewayBill": null,
          "freightRate": null,
          "freightMessage": null,
          "extractedConsignee": null,
          "finalConsigneeChoice": null
        }
      ],
      "totalFreightRate": null,
      "freightStatus": "PENDING",
      "freightMessage": null,
      "submittedAt": null,
      "lr": null
    }
  },
  {
    "tenantId": "tenant-bl001",
    "modeOfTransport": "ROAD",
    "numberOfDeliveries": 1,
    "customerId": "tenant-customer-o8kyr7u",
    "materialIds": [
      "material-i8gm01l"
    ],
    "sourceAddressId": "customer-address-rp12cy5",
    "destinationAddressId": "customer-address-ykih6kv",
    "consignorAddressId": "customer-address-rp12cy5",
    "consigneeAddressId": "customer-address-ykih6kv",
    "laneKey": null,
    "laneFound": false,
    "poNumber": null,
    "doNumber": null,
    "ewayBillNumber": null,
    "pickupDate": "2026-06-01",
    "pickupTime": "18:24",
    "tat": null,
    "serviceType": "FTL",
    "commercialType": "SPOT",
    "pricing": {
      "rateType": "PER_TRIP",
      "contractRateCardId": null,
      "l1Rate": null,
      "enteredRate": 15000,
      "calculatedFreight": 15000,
      "distanceKm": null,
      "deviationPercent": 0,
      "approvalLevel": null,
      "deviationRemark": null,
      "isAutoApproved": true
    },
    "chargeType": null,
    "subBrand": null,
    "quantity": 100,
    "weight": 5,
    "uom": "BAG",
    "weightUom": "MT",
    "vehicleTypeId": "vehicle-type-d29xwv3",
    "lrType": "AUTO",
    "manualLrPoolPreference": "GENERAL",
    "status": "VEHICLE_ASSIGNED",
    "opsRemark": null,
    "pod": null,
    "documents": [],
    "expenses": [],
    "deliveries": [
      {
        "id": "draft-delivery-1",
        "deliveryNo": 1,
        "trackingId": "TRK-DRAFT-01",
        "originCity": "Bengaluru",
        "originAddressId": "customer-address-rp12cy5",
        "destinationCity": "Bengaluru",
        "destinationAddressId": "customer-address-ykih6kv",
        "destinationAddressSource": "SAVED_ADDRESS",
        "consigneeFinalizationStatus": "CONFIRMED",
        "materialId": "material-i8gm01l",
        "quantity": 100,
        "uom": "BAG",
        "weight": 5,
        "weightUom": "MT",
        "distanceKm": null,
        "status": "VEHICLE_ASSIGNED",
        "lrNumber": "BDSOUBN-2026-000001",
        "pod": null,
        "lrId": "lr-bge2yv0",
        "routeLabel": "Bengaluru -> Bengaluru",
        "eta": null,
        "deliverySequence": 1,
        "freightRate": 15000,
        "tripImpactSummary": "Base delivery record.",
        "contactPerson": null,
        "contactNumber": null,
        "unloadingNotes": null,
        "instructions": null,
        "activeRevisionId": null,
        "revisions": []
      }
    ],
    "createdBy": "Tenant Admin",
    "assignment": {
      "vendorId": "tenant-vendor-hh8uo8c",
      "vendorName": "Mahesh Transport",
      "vehicleId": "vehicle-zfnkh4z",
      "vehicleLabel": "KA01JK1234 (Vendor: Mahesh Transport)",
      "driverId": "driver-wf1ilgl",
      "driverName": "Kartik Pawar",
      "vendorFreight": 13000,
      "vendorRateCardId": null,
      "vendorRateType": null,
      "vendorContractSource": "MANUAL",
      "customerFreight": 15000,
      "sellingRateLabel": "PER_TRIP @ 15,000",
      "buyingRateLabel": null,
      "marginAmount": 2000,
      "marginPercent": 13.33,
      "assignedAt": "2026-06-02T07:29:47.869Z",
      "lrNumber": "BDSOUBN-2026-000001",
      "loadingStartedAt": null,
      "loadingCompletedAt": null
    },
    "remarks": [
      {
        "id": "booking-remark-1780385387870",
        "timestamp": "2026-06-02T07:29:47.869Z",
        "actor": "ronak@gmail.com",
        "type": "SYSTEM_REMARK",
        "message": "Assigned KA01JK1234 (Vendor: Mahesh Transport) to Kartik Pawar under Mahesh Transport."
      }
    ],
    "statusTimeline": [
      {
        "id": "booking-status-1780318454627-draft",
        "status": "DRAFT",
        "timestamp": "2026-06-01T12:54:14.627Z",
        "actor": "Tenant Admin",
        "note": "Booking created."
      },
      {
        "id": "booking-status-1780318454627-routed",
        "status": "PENDING_ASSIGNMENT",
        "timestamp": "2026-06-01T12:54:14.627Z",
        "actor": "System",
        "note": "Booking ready for assignment."
      },
      {
        "id": "booking-status-1780385387869-accepted",
        "status": "ACCEPTED",
        "timestamp": "2026-06-02T07:29:47.869Z",
        "actor": "ronak@gmail.com",
        "note": "Booking accepted for allocation under Mahesh Transport."
      },
      {
        "id": "booking-status-1780385387869-vehicle",
        "status": "VEHICLE_ASSIGNED",
        "timestamp": "2026-06-02T07:29:47.869Z",
        "actor": "ronak@gmail.com",
        "note": "Vehicle KA01JK1234 (Vendor: Mahesh Transport) assigned under Mahesh Transport."
      }
    ],
    "id": "booking-7p8of3m",
    "bookingId": "BKG-2026-0003",
    "destinationChangeRequests": [],
    "operationalFlags": [],
    "lrIds": [
      "lr-bge2yv0"
    ],
    "createdAt": "2026-06-01T12:54:14.627Z",
    "updatedAt": "2026-06-02T07:29:47.869Z",
    "isInvoiced": false,
    "invoiceId": null,
    "shipmentDocuments": {
      "deliveries": [
        {
          "deliveryId": "draft-delivery-1",
          "invoices": [],
          "actuals": {
            "material": "",
            "subBrand": null,
            "quantity": 100,
            "quantityUOM": "BAG",
            "weight": 5,
            "weightUOM": "MT"
          },
          "ewayBill": null,
          "freightRate": null,
          "freightMessage": null,
          "extractedConsignee": null,
          "finalConsigneeChoice": null
        }
      ],
      "totalFreightRate": null,
      "freightStatus": "PENDING",
      "freightMessage": null,
      "submittedAt": null,
      "lr": null
    }
  },
  {
    "tenantId": "tenant-bl001",
    "modeOfTransport": "ROAD",
    "numberOfDeliveries": 1,
    "customerId": "tenant-customer-o8kyr7u",
    "materialIds": [
      "material-i8gm01l"
    ],
    "sourceAddressId": "customer-address-qfnxvlr",
    "destinationAddressId": "customer-address-rp12cy5",
    "consignorAddressId": "customer-address-qfnxvlr",
    "consigneeAddressId": "customer-address-rp12cy5",
    "laneKey": null,
    "laneFound": false,
    "poNumber": null,
    "doNumber": null,
    "ewayBillNumber": null,
    "pickupDate": "2026-06-01",
    "pickupTime": "14:46",
    "tat": null,
    "serviceType": "FTL",
    "commercialType": "SPOT",
    "pricing": {
      "rateType": "PER_TRIP",
      "contractRateCardId": null,
      "l1Rate": null,
      "enteredRate": 23000,
      "calculatedFreight": 23000,
      "distanceKm": null,
      "deviationPercent": 0,
      "approvalLevel": null,
      "deviationRemark": null,
      "isAutoApproved": true
    },
    "chargeType": null,
    "subBrand": null,
    "quantity": 100,
    "weight": 5,
    "uom": "BAG",
    "weightUom": "MT",
    "vehicleTypeId": "vehicle-type-d29xwv3",
    "lrType": "MANUAL",
    "manualLrPoolPreference": "GENERAL",
    "status": "VEHICLE_ASSIGNED",
    "opsRemark": null,
    "pod": null,
    "documents": [],
    "expenses": [],
    "deliveries": [
      {
        "id": "draft-delivery-1",
        "deliveryNo": 1,
        "trackingId": "TRK-DRAFT-01",
        "originCity": "Bengaluru",
        "originAddressId": "customer-address-qfnxvlr",
        "destinationCity": "Bengaluru",
        "destinationAddressId": "customer-address-rp12cy5",
        "destinationAddressSource": "SAVED_ADDRESS",
        "consigneeFinalizationStatus": "CONFIRMED",
        "materialId": "material-i8gm01l",
        "quantity": 100,
        "uom": "BAG",
        "weight": 5,
        "weightUom": "MT",
        "distanceKm": null,
        "status": "VEHICLE_ASSIGNED",
        "lrNumber": "BLSRBLR-2026-000002",
        "pod": null,
        "lrId": "lr-gxr4ohi",
        "routeLabel": "Bengaluru -> Bengaluru",
        "eta": null,
        "deliverySequence": 1,
        "freightRate": 23000,
        "tripImpactSummary": "Base delivery record.",
        "contactPerson": null,
        "contactNumber": null,
        "unloadingNotes": null,
        "instructions": null,
        "activeRevisionId": null,
        "revisions": []
      }
    ],
    "createdBy": "Tenant Admin",
    "assignment": {
      "vendorId": "tenant-vendor-hh8uo8c",
      "vendorName": "Mahesh Transport",
      "vehicleId": "vehicle-zfnkh4z",
      "vehicleLabel": "KA01JK1234 (Vendor: Mahesh Transport)",
      "driverId": "driver-wf1ilgl",
      "driverName": "Kartik Pawar",
      "vendorFreight": 21000,
      "vendorRateCardId": null,
      "vendorRateType": null,
      "vendorContractSource": "MANUAL",
      "customerFreight": 23000,
      "sellingRateLabel": "PER_TRIP @ 23,000",
      "buyingRateLabel": null,
      "marginAmount": 2000,
      "marginPercent": 8.7,
      "assignedAt": "2026-06-01T12:11:46.705Z",
      "lrNumber": "BLSRBLR-2026-000002",
      "loadingStartedAt": null,
      "loadingCompletedAt": null
    },
    "remarks": [
      {
        "id": "booking-remark-1780315906706",
        "timestamp": "2026-06-01T12:11:46.705Z",
        "actor": "ronak@gmail.com",
        "type": "SYSTEM_REMARK",
        "message": "Assigned KA01JK1234 (Vendor: Mahesh Transport) to Kartik Pawar under Mahesh Transport."
      }
    ],
    "statusTimeline": [
      {
        "id": "booking-status-1780305373575-draft",
        "status": "DRAFT",
        "timestamp": "2026-06-01T09:16:13.575Z",
        "actor": "Tenant Admin",
        "note": "Booking created."
      },
      {
        "id": "booking-status-1780305373575-routed",
        "status": "PENDING_ASSIGNMENT",
        "timestamp": "2026-06-01T09:16:13.575Z",
        "actor": "System",
        "note": "Booking ready for assignment."
      },
      {
        "id": "booking-status-1780315906706-accepted",
        "status": "ACCEPTED",
        "timestamp": "2026-06-01T12:11:46.705Z",
        "actor": "ronak@gmail.com",
        "note": "Booking accepted for allocation under Mahesh Transport."
      },
      {
        "id": "booking-status-1780315906706-vehicle",
        "status": "VEHICLE_ASSIGNED",
        "timestamp": "2026-06-01T12:11:46.705Z",
        "actor": "ronak@gmail.com",
        "note": "Vehicle KA01JK1234 (Vendor: Mahesh Transport) assigned under Mahesh Transport."
      }
    ],
    "id": "booking-u7v5r26",
    "bookingId": "BKG-2026-0002",
    "destinationChangeRequests": [],
    "operationalFlags": [],
    "lrIds": [
      "lr-gxr4ohi"
    ],
    "createdAt": "2026-06-01T09:16:13.575Z",
    "updatedAt": "2026-06-01T12:11:46.705Z",
    "isInvoiced": false,
    "invoiceId": null,
    "shipmentDocuments": {
      "deliveries": [
        {
          "deliveryId": "draft-delivery-1",
          "invoices": [],
          "actuals": {
            "material": "",
            "subBrand": null,
            "quantity": 100,
            "quantityUOM": "BAG",
            "weight": 5,
            "weightUOM": "MT"
          },
          "ewayBill": null,
          "freightRate": null,
          "freightMessage": null,
          "extractedConsignee": null,
          "finalConsigneeChoice": null
        }
      ],
      "totalFreightRate": null,
      "freightStatus": "PENDING",
      "freightMessage": null,
      "submittedAt": null,
      "lr": null
    }
  },
  {
    "tenantId": "tenant-bl001",
    "modeOfTransport": "ROAD",
    "numberOfDeliveries": 1,
    "customerId": "tenant-customer-o8kyr7u",
    "materialIds": [
      "material-i8gm01l"
    ],
    "sourceAddressId": "customer-address-qfnxvlr",
    "destinationAddressId": "customer-address-ykih6kv",
    "consignorAddressId": "customer-address-qfnxvlr",
    "consigneeAddressId": "customer-address-ykih6kv",
    "laneKey": null,
    "laneFound": false,
    "poNumber": null,
    "doNumber": null,
    "ewayBillNumber": null,
    "pickupDate": "2026-05-31",
    "pickupTime": "19:02",
    "tat": null,
    "serviceType": "FTL",
    "commercialType": "SPOT",
    "pricing": {
      "rateType": "PER_TRIP",
      "contractRateCardId": null,
      "l1Rate": null,
      "enteredRate": 12000,
      "calculatedFreight": 12000,
      "distanceKm": null,
      "deviationPercent": 0,
      "approvalLevel": null,
      "deviationRemark": null,
      "isAutoApproved": true
    },
    "chargeType": null,
    "subBrand": null,
    "quantity": 800,
    "weight": 40,
    "uom": "BAG",
    "weightUom": "MT",
    "vehicleTypeId": "vehicle-type-d29xwv3",
    "lrType": "MANUAL",
    "manualLrPoolPreference": "GENERAL",
    "status": "COMPLETED",
    "opsRemark": null,
    "pod": {
      "podDocument": "invoice 2.pdf",
      "podUploaded": true,
      "podUploadedAt": "2026-06-02T20:56:23.713Z",
      "photoName": "invoice 2.pdf",
      "consigneeName": "ravi",
      "podRemark": "up",
      "eSignRequested": false,
      "capturedAt": "2026-06-02T20:56:23.713Z"
    },
    "documents": [
      {
        "id": "BKG-2026-0001-draft-delivery-1-invoice-1",
        "type": "INVOICE",
        "fileName": "invoice.pdf",
        "uploadedAt": "2026-05-31T17:20:47.994Z",
        "uploadedBy": "Ops",
        "deliveryId": "draft-delivery-1"
      },
      {
        "id": "BKG-2026-0001-draft-delivery-1-invoice-2",
        "type": "INVOICE",
        "fileName": "invoice.pdf",
        "uploadedAt": "2026-05-31T17:35:13.049Z",
        "uploadedBy": "Ops",
        "deliveryId": "draft-delivery-1"
      },
      {
        "id": "BKG-2026-0001-draft-delivery-1-eway",
        "type": "EWAY_BILL",
        "fileName": "invoice.pdf",
        "uploadedAt": "2026-05-31T17:35:39.021Z",
        "uploadedBy": "Ops",
        "deliveryId": "draft-delivery-1"
      }
    ],
    "expenses": [],
    "deliveries": [
      {
        "id": "draft-delivery-1",
        "deliveryNo": 1,
        "trackingId": "TRK-DRAFT-01",
        "originCity": "Bengaluru",
        "originAddressId": "customer-address-qfnxvlr",
        "destinationCity": "Chandausi",
        "destinationAddressId": "customer-address-ykih6kv",
        "destinationAddressSource": "SAVED_ADDRESS",
        "consigneeFinalizationStatus": "CONFIRMED",
        "materialId": "material-i8gm01l",
        "quantity": 800,
        "uom": "BAG",
        "weight": 40,
        "weightUom": "MT",
        "distanceKm": null,
        "status": "COMPLETED",
        "lrNumber": "BLSRBLR-2026-000001",
        "pod": {
          "podDocument": "invoice 2.pdf",
          "podUploaded": true,
          "podUploadedAt": "2026-06-02T20:56:23.713Z",
          "photoName": "invoice 2.pdf",
          "consigneeName": "ravi",
          "podRemark": "up",
          "eSignRequested": false,
          "capturedAt": "2026-06-02T20:56:23.713Z"
        },
        "lrId": "lr-k8suojl",
        "routeLabel": "Bengaluru -> Bengaluru",
        "eta": null,
        "deliverySequence": 1,
        "freightRate": 12000,
        "tripImpactSummary": "Base delivery record.",
        "contactPerson": null,
        "contactNumber": null,
        "unloadingNotes": null,
        "instructions": null,
        "activeRevisionId": null,
        "revisions": []
      }
    ],
    "createdBy": "Tenant Admin",
    "assignment": {
      "vendorId": "tenant-vendor-nqup09r",
      "vendorName": "ABC transport",
      "vehicleId": "vehicle-5qgxchl",
      "vehicleLabel": "KA01JJ9012 (Vendor: ABC transport)",
      "driverId": "driver-44gjj1g",
      "driverName": "Ullas",
      "vendorFreight": 11000,
      "vendorRateCardId": null,
      "vendorRateType": null,
      "vendorContractSource": "MANUAL",
      "customerFreight": 12000,
      "sellingRateLabel": "PER_TRIP @ 12,000",
      "buyingRateLabel": null,
      "marginAmount": 1000,
      "marginPercent": 8.33,
      "assignedAt": "2026-05-31T16:11:12.939Z",
      "lrNumber": "BLSRBLR-2026-000001",
      "loadingStartedAt": "2026-05-31T16:11:19.218Z",
      "loadingCompletedAt": "2026-05-31T16:37:25.140Z"
    },
    "remarks": [
      {
        "id": "booking-remark-1780243872940",
        "timestamp": "2026-05-31T16:11:12.939Z",
        "actor": "ronak@gmail.com",
        "type": "SYSTEM_REMARK",
        "message": "Assigned KA01JJ9012 (Vendor: ABC transport) to Ullas under ABC transport."
      },
      {
        "id": "booking-remark-1780243879222",
        "timestamp": "2026-05-31T16:11:19.222Z",
        "actor": "Dispatcher",
        "type": "SYSTEM_REMARK",
        "message": "Loading started."
      },
      {
        "id": "booking-remark-1780245445144",
        "timestamp": "2026-05-31T16:37:25.144Z",
        "actor": "Dispatcher",
        "type": "SYSTEM_REMARK",
        "message": "Loading completed."
      },
      {
        "id": "booking-remark-1780249007253",
        "timestamp": "2026-05-31T17:36:47.253Z",
        "actor": "System",
        "type": "SYSTEM_REMARK",
        "message": "All required execution checkpoints completed."
      },
      {
        "id": "booking-remark-1780249007253",
        "timestamp": "2026-05-31T17:36:47.253Z",
        "actor": "System",
        "type": "SYSTEM_REMARK",
        "message": "Dispatch flow advanced automatically."
      },
      {
        "id": "booking-remark-1780249007253",
        "timestamp": "2026-05-31T17:36:47.253Z",
        "actor": "System",
        "type": "SYSTEM_REMARK",
        "message": "Auto moved to transit after loading, invoice, E-Way Bill, and LR completion."
      },
      {
        "id": "booking-remark-1780433729502",
        "timestamp": "2026-06-02T20:55:29.502Z",
        "actor": "Ops",
        "type": "SYSTEM_REMARK",
        "message": "All deliveries physically completed. Waiting for POD collection."
      },
      {
        "id": "booking-remark-1780433790465",
        "timestamp": "2026-06-02T20:56:30.465Z",
        "actor": "Ops",
        "type": "SYSTEM_REMARK",
        "message": "All delivery PODs uploaded. Booking marked as completed."
      }
    ],
    "statusTimeline": [
      {
        "id": "booking-status-1780234378165-draft",
        "status": "DRAFT",
        "timestamp": "2026-05-31T13:32:58.165Z",
        "actor": "Tenant Admin",
        "note": "Booking created."
      },
      {
        "id": "booking-status-1780234378165-routed",
        "status": "PENDING_ASSIGNMENT",
        "timestamp": "2026-05-31T13:32:58.165Z",
        "actor": "System",
        "note": "Booking ready for assignment."
      },
      {
        "id": "booking-status-1780243872940-accepted",
        "status": "ACCEPTED",
        "timestamp": "2026-05-31T16:11:12.939Z",
        "actor": "ronak@gmail.com",
        "note": "Booking accepted for allocation under ABC transport."
      },
      {
        "id": "booking-status-1780243872940-vehicle",
        "status": "VEHICLE_ASSIGNED",
        "timestamp": "2026-05-31T16:11:12.939Z",
        "actor": "ronak@gmail.com",
        "note": "Vehicle KA01JJ9012 (Vendor: ABC transport) assigned under ABC transport."
      },
      {
        "id": "booking-status-1780243879222",
        "status": "LOADING_STARTED",
        "timestamp": "2026-05-31T16:11:19.222Z",
        "actor": "Dispatcher",
        "note": "Loading started."
      },
      {
        "id": "booking-status-1780245445144",
        "status": "LOADING_COMPLETED",
        "timestamp": "2026-05-31T16:37:25.144Z",
        "actor": "Dispatcher",
        "note": "Loading completed."
      },
      {
        "id": "booking-status-1780249007253",
        "status": "READY_FOR_DISPATCH",
        "timestamp": "2026-05-31T17:36:47.253Z",
        "actor": "System",
        "note": "All required execution checkpoints completed."
      },
      {
        "id": "booking-status-1780249007253",
        "status": "DISPATCHED",
        "timestamp": "2026-05-31T17:36:47.253Z",
        "actor": "System",
        "note": "Dispatch flow advanced automatically."
      },
      {
        "id": "booking-status-1780249007253",
        "status": "IN_TRANSIT",
        "timestamp": "2026-05-31T17:36:47.253Z",
        "actor": "System",
        "note": "Auto moved to transit after loading, invoice, E-Way Bill, and LR completion."
      },
      {
        "id": "booking-status-1780433729502",
        "status": "POD_PENDING",
        "timestamp": "2026-06-02T20:55:29.502Z",
        "actor": "Ops",
        "note": "All deliveries physically completed. Waiting for POD collection."
      },
      {
        "id": "booking-status-1780433790465",
        "status": "COMPLETED",
        "timestamp": "2026-06-02T20:56:30.465Z",
        "actor": "Ops",
        "note": "All delivery PODs uploaded. Booking marked as completed."
      }
    ],
    "id": "booking-6f6dlkh",
    "bookingId": "BKG-2026-0001",
    "destinationChangeRequests": [],
    "operationalFlags": [],
    "lrIds": [
      "lr-k8suojl"
    ],
    "createdAt": "2026-05-31T13:32:58.165Z",
    "updatedAt": "2026-06-02T20:56:50.672Z",
    "isInvoiced": true,
    "invoiceId": "INV-2026-0001",
    "shipmentDocuments": {
      "deliveries": [
        {
          "deliveryId": "draft-delivery-1",
          "invoices": [
            {
              "id": "invoice-1780248047993-o0ly7r",
              "uploadedAt": "2026-05-31T17:20:47.994Z",
              "fileName": "invoice.pdf",
              "invoiceNumber": "HBM/00253/25-26",
              "invoiceValue": 144000,
              "invoiceDate": "2025-05-06",
              "material": "Cement Ppc (Hbm) - Normal",
              "subBrand": null,
              "quantity": 400,
              "quantityUOM": "BAG",
              "weight": 20,
              "weightUOM": "MT",
              "consigneeName": "Akanksha Trading Company",
              "consigneeAddress": "CHANDAUSI, MAULAGARH, SAMBHAL ROAD, near by sambhal mode, CHANDAUSI, Sambhal : near by sambhal mode, CHANDAUSI,, Sambhal",
              "consigneeCity": "Chandausi",
              "consigneePincode": "244412",
              "consigneeGstin": "09ABEPK1515F3ZZ",
              "extractedAt": "2026-05-31T17:20:47.993Z"
            },
            {
              "id": "invoice-1780248913049-zacucy",
              "uploadedAt": "2026-05-31T17:35:13.049Z",
              "fileName": "invoice.pdf",
              "invoiceNumber": "HBM/00253/25-26",
              "invoiceValue": 144000,
              "invoiceDate": "2025-05-06",
              "material": "Cement Ppc (Hbm) - Normal",
              "subBrand": null,
              "quantity": 400,
              "quantityUOM": "BAG",
              "weight": 20,
              "weightUOM": "MT",
              "consigneeName": "Akanksha Trading Company",
              "consigneeAddress": "CHANDAUSI, MAULAGARH, SAMBHAL ROAD, near by sambhal mode, CHANDAUSI, Sambhal : near by sambhal mode, CHANDAUSI,, Sambhal",
              "consigneeCity": "Chandausi",
              "consigneePincode": "244412",
              "consigneeGstin": "09ABEPK1515F3ZZ",
              "extractedAt": "2026-05-31T17:35:13.049Z"
            }
          ],
          "actuals": {
            "material": "Cement Ppc (Hbm) - Normal",
            "subBrand": null,
            "quantity": 800,
            "quantityUOM": "BAG",
            "weight": 40,
            "weightUOM": "MT"
          },
          "ewayBill": {
            "fileName": "invoice.pdf",
            "ewayBillNumber": "421564738220",
            "validFromDate": "2026-05-18",
            "validFromTime": null,
            "validToDate": "2026-05-26",
            "validToTime": null,
            "uploadedAt": "2026-05-31T17:35:39.021Z"
          },
          "freightRate": null,
          "freightMessage": null,
          "extractedConsignee": {
            "name": "Akanksha Trading Company",
            "addressLine": "CHANDAUSI, MAULAGARH, SAMBHAL ROAD, near by sambhal mode, CHANDAUSI, Sambhal : near by sambhal mode, CHANDAUSI,, Sambhal",
            "city": "Chandausi",
            "pincode": "244412",
            "gstin": "09ABEPK1515F3ZZ"
          },
          "finalConsigneeChoice": null
        }
      ],
      "totalFreightRate": 12000,
      "freightStatus": "READY",
      "freightMessage": "Spot booking keeps the existing freight value.",
      "submittedAt": "2026-05-31T17:36:47.244Z",
      "lr": {
        "number": "BLSRBLR-2026-000001",
        "generatedAt": "2026-05-31T17:36:47.244Z",
        "viewMode": "COMBINED",
        "extraCharges": 0,
        "advance": 0
      }
    }
  }
] as unknown as BookingRecord[];
export const bl001BookingVendorIndents = [
  {
    "id": "indent-1780489111947-0-tbdt5",
    "tenantId": "tenant-bl001",
    "bookingId": "booking-tgmu56t",
    "bookingRef": "BKG-2026-0008",
    "vendorId": "tenant-vendor-hh8uo8c",
    "vendorName": "Mahesh Transport",
    "status": "ACCEPTED",
    "isWinner": true,
    "sentAt": "2026-06-03T12:18:31.947Z",
    "respondedAt": "2026-06-03T12:19:14.478Z",
    "rejectedReason": null,
    "lrModeForVendorAssignment": "AUTO",
    "lrPlaceId": "ou-bqtfh2a",
    "lrPlaceName": "Bangalore-Branch"
  },
  {
    "id": "indent-1780489111947-1-x8pjd",
    "tenantId": "tenant-bl001",
    "bookingId": "booking-tgmu56t",
    "bookingRef": "BKG-2026-0008",
    "vendorId": "tenant-vendor-nqup09r",
    "vendorName": "ABC transport",
    "status": "CLOSED",
    "isWinner": false,
    "sentAt": "2026-06-03T12:18:31.947Z",
    "respondedAt": "2026-06-03T12:19:14.478Z",
    "rejectedReason": null,
    "lrModeForVendorAssignment": "AUTO",
    "lrPlaceId": "ou-bqtfh2a",
    "lrPlaceName": "Bangalore-Branch"
  },
  {
    "id": "indent-1780489111947-2-vdsp3",
    "tenantId": "tenant-bl001",
    "bookingId": "booking-tgmu56t",
    "bookingRef": "BKG-2026-0008",
    "vendorId": "tenant-vendor-af8xr8p",
    "vendorName": "VRL transports",
    "status": "CLOSED",
    "isWinner": false,
    "sentAt": "2026-06-03T12:18:31.947Z",
    "respondedAt": "2026-06-03T12:19:14.478Z",
    "rejectedReason": null,
    "lrModeForVendorAssignment": "AUTO",
    "lrPlaceId": "ou-bqtfh2a",
    "lrPlaceName": "Bangalore-Branch"
  },
  {
    "id": "indent-1780466241630-0-w65o8",
    "tenantId": "tenant-bl001",
    "bookingId": "booking-89cttti",
    "bookingRef": "BKG-2026-0007",
    "vendorId": "tenant-vendor-hh8uo8c",
    "vendorName": "Mahesh Transport",
    "status": "PENDING",
    "isWinner": false,
    "sentAt": "2026-06-03T05:57:21.630Z",
    "respondedAt": null,
    "rejectedReason": null,
    "lrModeForVendorAssignment": "AUTO",
    "lrPlaceId": null,
    "lrPlaceName": null
  },
  {
    "id": "indent-1780466241630-1-thj5y",
    "tenantId": "tenant-bl001",
    "bookingId": "booking-89cttti",
    "bookingRef": "BKG-2026-0007",
    "vendorId": "tenant-vendor-nqup09r",
    "vendorName": "ABC transport",
    "status": "PENDING",
    "isWinner": false,
    "sentAt": "2026-06-03T05:57:21.630Z",
    "respondedAt": null,
    "rejectedReason": null,
    "lrModeForVendorAssignment": "AUTO",
    "lrPlaceId": null,
    "lrPlaceName": null
  },
  {
    "id": "indent-1780466241630-2-twr7b",
    "tenantId": "tenant-bl001",
    "bookingId": "booking-89cttti",
    "bookingRef": "BKG-2026-0007",
    "vendorId": "tenant-vendor-af8xr8p",
    "vendorName": "VRL transports",
    "status": "PENDING",
    "isWinner": false,
    "sentAt": "2026-06-03T05:57:21.630Z",
    "respondedAt": null,
    "rejectedReason": null,
    "lrModeForVendorAssignment": "AUTO",
    "lrPlaceId": null,
    "lrPlaceName": null
  },
  {
    "id": "indent-1780387711253-0-1mvh9",
    "tenantId": "tenant-bl001",
    "bookingId": "booking-o9zik9w",
    "bookingRef": "BKG-2026-0006",
    "vendorId": "tenant-vendor-hh8uo8c",
    "vendorName": "Mahesh Transport",
    "status": "ACCEPTED",
    "isWinner": true,
    "sentAt": "2026-06-02T08:08:31.253Z",
    "respondedAt": "2026-06-02T08:08:53.175Z",
    "rejectedReason": null,
    "lrModeForVendorAssignment": "AUTO",
    "lrPlaceId": "ou-w7w26b4",
    "lrPlaceName": "South-Region"
  },
  {
    "id": "indent-1780387711253-1-ucpd2",
    "tenantId": "tenant-bl001",
    "bookingId": "booking-o9zik9w",
    "bookingRef": "BKG-2026-0006",
    "vendorId": "tenant-vendor-nqup09r",
    "vendorName": "ABC transport",
    "status": "CLOSED",
    "isWinner": false,
    "sentAt": "2026-06-02T08:08:31.253Z",
    "respondedAt": "2026-06-02T08:08:53.175Z",
    "rejectedReason": null,
    "lrModeForVendorAssignment": "AUTO",
    "lrPlaceId": "ou-w7w26b4",
    "lrPlaceName": "South-Region"
  },
  {
    "id": "indent-1780387711253-2-w4rfn",
    "tenantId": "tenant-bl001",
    "bookingId": "booking-o9zik9w",
    "bookingRef": "BKG-2026-0006",
    "vendorId": "tenant-vendor-af8xr8p",
    "vendorName": "VRL transports",
    "status": "CLOSED",
    "isWinner": false,
    "sentAt": "2026-06-02T08:08:31.253Z",
    "respondedAt": "2026-06-02T08:08:53.175Z",
    "rejectedReason": null,
    "lrModeForVendorAssignment": "AUTO",
    "lrPlaceId": "ou-w7w26b4",
    "lrPlaceName": "South-Region"
  },
  {
    "id": "indent-1780335283064-0-nzfdv",
    "tenantId": "tenant-bl001",
    "bookingId": "booking-nywzsi8",
    "bookingRef": "BKG-2026-0005",
    "vendorId": "tenant-vendor-hh8uo8c",
    "vendorName": "Mahesh Transport",
    "status": "ACCEPTED",
    "isWinner": true,
    "sentAt": "2026-06-01T17:34:43.063Z",
    "respondedAt": "2026-06-01T17:35:13.807Z",
    "rejectedReason": null
  },
  {
    "id": "indent-1780335283064-1-w322a",
    "tenantId": "tenant-bl001",
    "bookingId": "booking-nywzsi8",
    "bookingRef": "BKG-2026-0005",
    "vendorId": "tenant-vendor-nqup09r",
    "vendorName": "ABC transport",
    "status": "CLOSED",
    "isWinner": false,
    "sentAt": "2026-06-01T17:34:43.063Z",
    "respondedAt": "2026-06-01T17:35:13.807Z",
    "rejectedReason": null
  },
  {
    "id": "indent-1780335283064-2-akmnd",
    "tenantId": "tenant-bl001",
    "bookingId": "booking-nywzsi8",
    "bookingRef": "BKG-2026-0005",
    "vendorId": "tenant-vendor-af8xr8p",
    "vendorName": "VRL transports",
    "status": "CLOSED",
    "isWinner": false,
    "sentAt": "2026-06-01T17:34:43.063Z",
    "respondedAt": "2026-06-01T17:35:13.807Z",
    "rejectedReason": null
  }
] as unknown as BookingVendorIndent[];
export const bl001Invoices = [
  {
    "invoiceId": "INV-2026-0002",
    "tenantId": "tenant-bl001",
    "customerId": "tenant-customer-o8kyr7u",
    "bookingIds": [
      "BKG-2026-0008"
    ],
    "subtotal": 40000,
    "cgst": 3600,
    "sgst": 3600,
    "total": 47200,
    "createdAt": "2026-06-03T12:25:35.029Z"
  },
  {
    "invoiceId": "INV-2026-0001",
    "tenantId": "tenant-bl001",
    "customerId": "tenant-customer-o8kyr7u",
    "bookingIds": [
      "BKG-2026-0001"
    ],
    "subtotal": 12000,
    "cgst": 1080,
    "sgst": 1080,
    "total": 14160,
    "createdAt": "2026-06-02T20:56:50.666Z"
  }
] as unknown as TenantInvoiceRecord[];
export const bl001RolePermissionMatrix: Record<string, Record<string, Record<string, Record<string, boolean>>>> = {
  "role-mtbwabq": {
    "TMS": {
      "BOOKING_DASHBOARD": {
        "view": true,
        "create": true,
        "edit": true,
        "delete": true,
        "approve": true,
        "export": true
      },
      "CUSTOMERS": {
        "view": true,
        "create": true,
        "edit": true,
        "delete": true,
        "approve": true,
        "export": true
      },
      "VENDORS": {
        "view": true,
        "create": true,
        "edit": true,
        "delete": true,
        "approve": true,
        "export": true
      },
      "VEHICLE_TYPES": {
        "view": true,
        "create": true,
        "edit": true,
        "delete": true,
        "approve": true,
        "export": true
      },
      "MATERIALS": {
        "view": true,
        "create": true,
        "edit": true,
        "delete": true,
        "approve": true,
        "export": true
      },
      "UOM": {
        "view": true,
        "create": true,
        "edit": true,
        "delete": true,
        "approve": true,
        "export": true
      },
      "ADDRESS_BOOK": {
        "view": true,
        "create": true,
        "edit": true,
        "delete": true,
        "approve": true,
        "export": true
      },
      "LR_CONFIGURATION": {
        "view": true,
        "create": true,
        "edit": true,
        "delete": true,
        "approve": true,
        "export": true
      },
      "LR_MANAGEMENT": {
        "view": true,
        "create": true,
        "edit": true,
        "delete": true,
        "approve": true,
        "export": true
      },
      "ASSIGNMENT_RULES": {
        "view": true,
        "create": true,
        "edit": true,
        "delete": true,
        "approve": true,
        "export": true
      },
      "DOCUMENT_RULES": {
        "view": true,
        "create": true,
        "edit": true,
        "delete": true,
        "approve": true,
        "export": true
      },
      "POD_RULES": {
        "view": true,
        "create": true,
        "edit": true,
        "delete": true,
        "approve": true,
        "export": true
      },
      "CREATE_BOOKING": {
        "view": true,
        "create": true,
        "edit": true,
        "delete": true,
        "approve": true,
        "export": true
      },
      "BOOKING_ASSIGNMENT": {
        "view": true,
        "create": true,
        "edit": true,
        "delete": true,
        "approve": true,
        "export": true
      },
      "SHIPMENT_DOCUMENTS": {
        "view": true,
        "create": true,
        "edit": true,
        "delete": true,
        "approve": true,
        "export": true
      },
      "POD": {
        "view": true,
        "create": true,
        "edit": true,
        "delete": true,
        "approve": true,
        "export": true
      },
      "BOOKING_REPORTS": {
        "view": true,
        "create": true,
        "edit": true,
        "delete": true,
        "approve": true,
        "export": true
      }
    },
    "FLEET": {
      "FLEET_DASHBOARD": {
        "view": true,
        "create": true,
        "edit": true,
        "delete": true,
        "approve": true,
        "export": true
      },
      "FLEET_OPS_INTEL": {
        "view": true,
        "create": true,
        "edit": true,
        "delete": true,
        "approve": true,
        "export": true
      },
      "FLEET_EXCEPTIONS": {
        "view": true,
        "create": true,
        "edit": true,
        "delete": true,
        "approve": true,
        "export": true
      },
      "FLEET_LIVE_MAP": {
        "view": true,
        "create": true,
        "edit": true,
        "delete": true,
        "approve": true,
        "export": true
      },
      "FLEET_DISPATCH": {
        "view": true,
        "create": true,
        "edit": true,
        "delete": true,
        "approve": true,
        "export": true
      },
      "FLEET_VEHICLES": {
        "view": true,
        "create": true,
        "edit": true,
        "delete": true,
        "approve": true,
        "export": true
      },
      "FLEET_DRIVERS": {
        "view": true,
        "create": true,
        "edit": true,
        "delete": true,
        "approve": true,
        "export": true
      },
      "FLEET_COMPLIANCE": {
        "view": true,
        "create": true,
        "edit": true,
        "delete": true,
        "approve": true,
        "export": true
      },
      "FLEET_MAINTENANCE": {
        "view": true,
        "create": true,
        "edit": true,
        "delete": true,
        "approve": true,
        "export": true
      },
      "FLEET_GARAGE": {
        "view": true,
        "create": true,
        "edit": true,
        "delete": true,
        "approve": true,
        "export": true
      },
      "FLEET_TYRES": {
        "view": true,
        "create": true,
        "edit": true,
        "delete": true,
        "approve": true,
        "export": true
      },
      "FLEET_FUEL": {
        "view": true,
        "create": true,
        "edit": true,
        "delete": true,
        "approve": true,
        "export": true
      },
      "FLEET_COST": {
        "view": true,
        "create": true,
        "edit": true,
        "delete": true,
        "approve": true,
        "export": true
      },
      "FLEET_SETTINGS": {
        "view": true,
        "create": true,
        "edit": true,
        "delete": true,
        "approve": true,
        "export": true
      }
    },
    "AUCTION": {
      "AUCTION_DASHBOARD": {
        "view": true,
        "create": true,
        "edit": true,
        "delete": true,
        "approve": true,
        "export": true
      },
      "AUCTION_CLIENT_HUB": {
        "view": true,
        "create": true,
        "edit": true,
        "delete": true,
        "approve": true,
        "export": true
      },
      "AUCTION_RFQ_RESPONSES": {
        "view": true,
        "create": true,
        "edit": true,
        "delete": true,
        "approve": true,
        "export": true
      },
      "AUCTION_AUCTIONS": {
        "view": true,
        "create": true,
        "edit": true,
        "delete": true,
        "approve": true,
        "export": true
      },
      "AUCTION_CONTRACTS": {
        "view": true,
        "create": true,
        "edit": true,
        "delete": true,
        "approve": true,
        "export": true
      },
      "CREATE_AUCTION": {
        "view": true,
        "create": true,
        "edit": true,
        "delete": true,
        "approve": true,
        "export": true
      },
      "CREATE_RFI": {
        "view": true,
        "create": true,
        "edit": true,
        "delete": true,
        "approve": true,
        "export": true
      },
      "CREATE_RFQ": {
        "view": true,
        "create": true,
        "edit": true,
        "delete": true,
        "approve": true,
        "export": true
      }
    },
    "CUSTOMER": {
      "CUSTOMER_DASHBOARD": {
        "view": true,
        "create": true,
        "edit": true,
        "delete": true,
        "approve": true,
        "export": true
      }
    },
    "VENDOR": {
      "VENDOR_DASHBOARD": {
        "view": true,
        "create": true,
        "edit": true,
        "delete": true,
        "approve": true,
        "export": true
      },
      "VENDOR_TRIPS": {
        "view": true,
        "create": true,
        "edit": true,
        "delete": true,
        "approve": true,
        "export": true
      },
      "VENDOR_SOURCING": {
        "view": true,
        "create": true,
        "edit": true,
        "delete": true,
        "approve": true,
        "export": true
      },
      "VENDOR_CONTRACTS": {
        "view": true,
        "create": true,
        "edit": true,
        "delete": true,
        "approve": true,
        "export": true
      },
      "VENDOR_INVOICES": {
        "view": true,
        "create": true,
        "edit": true,
        "delete": true,
        "approve": true,
        "export": true
      },
      "VENDOR_LEDGER": {
        "view": true,
        "create": true,
        "edit": true,
        "delete": true,
        "approve": true,
        "export": true
      },
      "VENDOR_PAYMENTS": {
        "view": true,
        "create": true,
        "edit": true,
        "delete": true,
        "approve": true,
        "export": true
      },
      "VENDOR_FLEET": {
        "view": true,
        "create": true,
        "edit": true,
        "delete": true,
        "approve": true,
        "export": true
      },
      "VENDOR_SUPPORT": {
        "view": true,
        "create": true,
        "edit": true,
        "delete": true,
        "approve": true,
        "export": true
      }
    },
    "TRACKING": {
      "TRACKING_DASHBOARD": {
        "view": true,
        "create": true,
        "edit": true,
        "delete": true,
        "approve": true,
        "export": true
      },
      "TRACKING_TRIPS": {
        "view": true,
        "create": true,
        "edit": true,
        "delete": true,
        "approve": true,
        "export": true
      },
      "TRACKING_LIVE_MAP": {
        "view": true,
        "create": true,
        "edit": true,
        "delete": true,
        "approve": true,
        "export": true
      },
      "TRACKING_ALERTS": {
        "view": true,
        "create": true,
        "edit": true,
        "delete": true,
        "approve": true,
        "export": true
      },
      "TRACKING_GEOFENCES": {
        "view": true,
        "create": true,
        "edit": true,
        "delete": true,
        "approve": true,
        "export": true
      },
      "TRACKING_ANALYTICS": {
        "view": true,
        "create": true,
        "edit": true,
        "delete": true,
        "approve": true,
        "export": true
      }
    },
    "FINANCE": {
      "FINANCE_DASHBOARD": {
        "view": true,
        "create": true,
        "edit": true,
        "delete": true,
        "approve": true,
        "export": true
      },
      "FINANCE_RECEIVABLES": {
        "view": true,
        "create": true,
        "edit": true,
        "delete": true,
        "approve": true,
        "export": true
      },
      "FINANCE_PAYABLES": {
        "view": true,
        "create": true,
        "edit": true,
        "delete": true,
        "approve": true,
        "export": true
      },
      "FINANCE_CONTROLS": {
        "view": true,
        "create": true,
        "edit": true,
        "delete": true,
        "approve": true,
        "export": true
      },
      "FINANCE_FLEET": {
        "view": true,
        "create": true,
        "edit": true,
        "delete": true,
        "approve": true,
        "export": true
      },
      "FINANCE_LEDGERS": {
        "view": true,
        "create": true,
        "edit": true,
        "delete": true,
        "approve": true,
        "export": true
      }
    }
  },
  "role-u7aldfv": {
    "ADMIN": {
      "ORG_UNITS": {
        "view": true,
        "create": true,
        "edit": true,
        "delete": true,
        "approve": true,
        "export": true
      },
      "USERS": {
        "view": true,
        "create": true,
        "edit": true,
        "delete": true,
        "approve": true,
        "export": true
      },
      "ROLES": {
        "view": true,
        "create": true,
        "edit": true,
        "delete": true,
        "approve": true,
        "export": true
      },
      "PERMISSIONS": {
        "view": true,
        "create": true,
        "edit": true,
        "delete": true,
        "approve": true,
        "export": true
      }
    },
    "TMS": {
      "BOOKING_DASHBOARD": {
        "view": true,
        "create": true,
        "edit": true,
        "delete": true,
        "approve": true,
        "export": true
      },
      "CUSTOMERS": {
        "view": true,
        "create": true,
        "edit": true,
        "delete": true,
        "approve": true,
        "export": true
      },
      "VENDORS": {
        "view": true,
        "create": true,
        "edit": true,
        "delete": true,
        "approve": true,
        "export": true
      },
      "VEHICLE_TYPES": {
        "view": true,
        "create": true,
        "edit": true,
        "delete": true,
        "approve": true,
        "export": true
      },
      "MATERIALS": {
        "view": true,
        "create": true,
        "edit": true,
        "delete": true,
        "approve": true,
        "export": true
      },
      "UOM": {
        "view": true,
        "create": true,
        "edit": true,
        "delete": true,
        "approve": true,
        "export": true
      },
      "ADDRESS_BOOK": {
        "view": true,
        "create": true,
        "edit": true,
        "delete": true,
        "approve": true,
        "export": true
      },
      "LR_CONFIGURATION": {
        "view": true,
        "create": true,
        "edit": true,
        "delete": true,
        "approve": true,
        "export": true
      },
      "LR_MANAGEMENT": {
        "view": true,
        "create": true,
        "edit": true,
        "delete": true,
        "approve": true,
        "export": true
      },
      "ASSIGNMENT_RULES": {
        "view": true,
        "create": true,
        "edit": true,
        "delete": true,
        "approve": true,
        "export": true
      },
      "DOCUMENT_RULES": {
        "view": true,
        "create": true,
        "edit": true,
        "delete": true,
        "approve": true,
        "export": true
      },
      "POD_RULES": {
        "view": true,
        "create": true,
        "edit": true,
        "delete": true,
        "approve": true,
        "export": true
      },
      "CREATE_BOOKING": {
        "view": true,
        "create": true,
        "edit": true,
        "delete": true,
        "approve": true,
        "export": true
      },
      "BOOKING_ASSIGNMENT": {
        "view": true,
        "create": true,
        "edit": true,
        "delete": true,
        "approve": true,
        "export": true
      },
      "SHIPMENT_DOCUMENTS": {
        "view": true,
        "create": true,
        "edit": true,
        "delete": true,
        "approve": true,
        "export": true
      },
      "POD": {
        "view": true,
        "create": true,
        "edit": true,
        "delete": true,
        "approve": true,
        "export": true
      },
      "BOOKING_REPORTS": {
        "view": true,
        "create": true,
        "edit": true,
        "delete": true,
        "approve": true,
        "export": true
      }
    },
    "AUCTION": {
      "AUCTION_DASHBOARD": {
        "view": true,
        "create": true,
        "edit": true,
        "delete": true,
        "approve": true,
        "export": true
      },
      "AUCTION_CLIENT_HUB": {
        "view": true,
        "create": true,
        "edit": true,
        "delete": true,
        "approve": true,
        "export": true
      },
      "AUCTION_RFQ_RESPONSES": {
        "view": true,
        "create": true,
        "edit": true,
        "delete": true,
        "approve": true,
        "export": true
      },
      "AUCTION_AUCTIONS": {
        "view": true,
        "create": true,
        "edit": true,
        "delete": true,
        "approve": true,
        "export": true
      },
      "AUCTION_CONTRACTS": {
        "view": true,
        "create": true,
        "edit": true,
        "delete": true,
        "approve": true,
        "export": true
      },
      "CREATE_AUCTION": {
        "view": true,
        "create": true,
        "edit": true,
        "delete": true,
        "approve": true,
        "export": true
      },
      "CREATE_RFI": {
        "view": true,
        "create": true,
        "edit": true,
        "delete": true,
        "approve": true,
        "export": true
      },
      "CREATE_RFQ": {
        "view": true,
        "create": true,
        "edit": true,
        "delete": true,
        "approve": true,
        "export": true
      }
    }
  },
  "role-rcvzzi5": {
    "FINANCE": {
      "FINANCE_DASHBOARD": {
        "view": true,
        "create": true,
        "edit": true,
        "delete": true,
        "approve": true,
        "export": true
      },
      "FINANCE_RECEIVABLES": {
        "view": true,
        "create": true,
        "edit": true,
        "delete": true,
        "approve": true,
        "export": true
      },
      "FINANCE_PAYABLES": {
        "view": true,
        "create": true,
        "edit": true,
        "delete": true,
        "approve": true,
        "export": true
      },
      "FINANCE_CONTROLS": {
        "view": true,
        "create": true,
        "edit": true,
        "delete": true,
        "approve": true,
        "export": true
      },
      "FINANCE_FLEET": {
        "view": true,
        "create": true,
        "edit": true,
        "delete": true,
        "approve": true,
        "export": true
      },
      "FINANCE_LEDGERS": {
        "view": true,
        "create": true,
        "edit": true,
        "delete": true,
        "approve": true,
        "export": true
      }
    }
  },
  "role-0g3sbga": {
    "TMS": {
      "BOOKING_DASHBOARD": {
        "view": true,
        "create": true,
        "edit": true,
        "delete": true,
        "approve": true,
        "export": true
      },
      "CUSTOMERS": {
        "view": false,
        "create": false,
        "edit": false,
        "delete": false,
        "approve": false,
        "export": false
      },
      "VENDORS": {
        "view": false,
        "create": false,
        "edit": false,
        "delete": false,
        "approve": false,
        "export": false
      },
      "VEHICLE_TYPES": {
        "view": false,
        "create": false,
        "edit": false,
        "delete": false,
        "approve": false,
        "export": false
      },
      "MATERIALS": {
        "view": false,
        "create": false,
        "edit": false,
        "delete": false,
        "approve": false,
        "export": false
      },
      "UOM": {
        "view": false,
        "create": false,
        "edit": false,
        "delete": false,
        "approve": false,
        "export": false
      },
      "ADDRESS_BOOK": {
        "view": false,
        "create": false,
        "edit": false,
        "delete": false,
        "approve": false,
        "export": false
      },
      "LR_CONFIGURATION": {
        "view": false,
        "create": false,
        "edit": false,
        "delete": false,
        "approve": false,
        "export": false
      },
      "LR_MANAGEMENT": {
        "view": true,
        "create": true,
        "edit": true,
        "delete": true,
        "approve": true,
        "export": true
      },
      "ASSIGNMENT_RULES": {
        "view": false,
        "create": false,
        "edit": false,
        "delete": false,
        "approve": false,
        "export": false
      },
      "DOCUMENT_RULES": {
        "view": false,
        "create": false,
        "edit": false,
        "delete": false,
        "approve": false,
        "export": false
      },
      "POD_RULES": {
        "view": false,
        "create": false,
        "edit": false,
        "delete": false,
        "approve": false,
        "export": false
      },
      "CREATE_BOOKING": {
        "view": true,
        "create": true,
        "edit": true,
        "delete": true,
        "approve": true,
        "export": true
      },
      "BOOKING_ASSIGNMENT": {
        "view": true,
        "create": true,
        "edit": true,
        "delete": true,
        "approve": true,
        "export": true
      },
      "SHIPMENT_DOCUMENTS": {
        "view": true,
        "create": true,
        "edit": true,
        "delete": true,
        "approve": true,
        "export": true
      },
      "POD": {
        "view": true,
        "create": true,
        "edit": true,
        "delete": true,
        "approve": true,
        "export": true
      },
      "BOOKING_REPORTS": {
        "view": true,
        "create": true,
        "edit": true,
        "delete": true,
        "approve": true,
        "export": true
      }
    },
    "AUCTION": {
      "AUCTION_DASHBOARD": {
        "view": false,
        "create": false,
        "edit": false,
        "delete": false,
        "approve": false,
        "export": false
      },
      "AUCTION_CLIENT_HUB": {
        "view": false,
        "create": false,
        "edit": false,
        "delete": false,
        "approve": false,
        "export": false
      },
      "AUCTION_RFQ_RESPONSES": {
        "view": false,
        "create": false,
        "edit": false,
        "delete": false,
        "approve": false,
        "export": false
      },
      "AUCTION_AUCTIONS": {
        "view": false,
        "create": false,
        "edit": false,
        "delete": false,
        "approve": false,
        "export": false
      },
      "AUCTION_CONTRACTS": {
        "view": false,
        "create": false,
        "edit": false,
        "delete": false,
        "approve": false,
        "export": false
      },
      "CREATE_AUCTION": {
        "view": false,
        "create": false,
        "edit": false,
        "delete": false,
        "approve": false,
        "export": false
      },
      "CREATE_RFI": {
        "view": false,
        "create": false,
        "edit": false,
        "delete": false,
        "approve": false,
        "export": false
      },
      "CREATE_RFQ": {
        "view": false,
        "create": false,
        "edit": false,
        "delete": false,
        "approve": false,
        "export": false
      }
    }
  },
  "role-km3x2ow": {
    "FINANCE": {
      "FINANCE_DASHBOARD": {
        "view": true,
        "create": true,
        "edit": true,
        "delete": true,
        "approve": true,
        "export": true
      },
      "FINANCE_RECEIVABLES": {
        "view": true,
        "create": true,
        "edit": true,
        "delete": true,
        "approve": true,
        "export": true
      },
      "FINANCE_PAYABLES": {
        "view": true,
        "create": true,
        "edit": true,
        "delete": true,
        "approve": true,
        "export": true
      },
      "FINANCE_CONTROLS": {
        "view": true,
        "create": true,
        "edit": true,
        "delete": true,
        "approve": true,
        "export": true
      },
      "FINANCE_FLEET": {
        "view": true,
        "create": true,
        "edit": true,
        "delete": true,
        "approve": true,
        "export": true
      },
      "FINANCE_LEDGERS": {
        "view": true,
        "create": true,
        "edit": true,
        "delete": true,
        "approve": true,
        "export": true
      }
    }
  },
  "role-4cl8or2": {
    "TMS": {
      "LR_MANAGEMENT": {
        "view": true,
        "create": true,
        "edit": true,
        "delete": true,
        "approve": true,
        "export": true
      },
      "BOOKING_DASHBOARD": {
        "view": true,
        "create": true,
        "edit": true,
        "delete": true,
        "approve": true,
        "export": true
      },
      "LR_CONFIGURATION": {
        "view": true,
        "create": true,
        "edit": true,
        "delete": true,
        "approve": true,
        "export": true
      },
      "CREATE_BOOKING": {
        "view": true,
        "create": true,
        "edit": true,
        "delete": true,
        "approve": true,
        "export": true
      },
      "BOOKING_ASSIGNMENT": {
        "view": true,
        "create": true,
        "edit": true,
        "delete": true,
        "approve": true,
        "export": true
      },
      "SHIPMENT_DOCUMENTS": {
        "view": true,
        "create": true,
        "edit": true,
        "delete": true,
        "approve": true,
        "export": true
      }
    }
  }
};
