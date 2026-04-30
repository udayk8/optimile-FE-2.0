import {
  mockModules,
  mockPlans,
  mockPlatformAuditLogs,
  mockPlatformTenants,
} from "@/services/mock/data";

export const platformServiceMock = {
  async listTenants() {
    return mockPlatformTenants;
  },
  async getTenantById(tenantId: string) {
    return mockPlatformTenants.find((tenant) => tenant.id === tenantId) ?? null;
  },
  async listModules() {
    return mockModules;
  },
  async listPlans() {
    return mockPlans;
  },
  async listPlatformAuditLogs() {
    return mockPlatformAuditLogs;
  },
};
