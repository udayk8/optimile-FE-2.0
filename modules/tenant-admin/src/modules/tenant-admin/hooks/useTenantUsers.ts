import { useMockStore } from "../../../store/mock-store";
import type { UserRecord } from "../../../types/access";

export function useTenantUsers(tenantId: string) {
  const { listTenantUsers, createTenantUser, updateTenantUser } = useMockStore();
  return {
    data: listTenantUsers(tenantId),
    createUser: (input: Omit<UserRecord, "id" | "lastActive">) => createTenantUser(input),
    updateUser: (
      userId: string,
      updates: Partial<
        Pick<
          UserRecord,
          | "name"
          | "email"
          | "userType"
          | "roleId"
          | "orgUnitIds"
          | "linkedVendorId"
          | "linkedCustomerId"
          | "driverName"
          | "driverCode"
          | "status"
        >
      >,
    ) => updateTenantUser(userId, updates),
  };
}
