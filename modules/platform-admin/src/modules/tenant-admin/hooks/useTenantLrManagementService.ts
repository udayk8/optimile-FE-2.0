import { useMemo } from "react";
import type {
  TenantLrAllocationRequestRecord,
  TenantLrPoolRecord,
  TenantLrTransferRecord,
} from "@/modules/tms/booking/types";
import {
  lrManagementApi,
  type CreateLrRequestInput,
  type CreateLrTransferInput,
} from "@/modules/tenant-admin/services/lr-management.api";
import { useMockStore } from "@/shared/store/mock-store";

type AppendAuditInput = {
  actor: string;
  action: string;
  entityType: string;
  entityName: string;
  tenantId: string;
  result: "success" | "warning" | "danger";
};

type TenantLrManagementService = {
  upsertPools: (records: TenantLrPoolRecord[]) => Promise<TenantLrPoolRecord[]>;
  createRequest: (input: CreateLrRequestInput) => Promise<TenantLrAllocationRequestRecord>;
  approveRequest: (
    requestId: string,
    approvedCount: number,
    actor: string,
    note?: string,
  ) => Promise<TenantLrAllocationRequestRecord>;
  rejectRequest: (
    requestId: string,
    actor: string,
    note?: string,
  ) => Promise<TenantLrAllocationRequestRecord>;
  createTransfer: (input: CreateLrTransferInput) => Promise<TenantLrTransferRecord>;
  appendAuditLog: (input: AppendAuditInput) => Promise<unknown>;
};

function normalizeAuditResult(result: AppendAuditInput["result"]) {
  return result === "danger" ? "denied" : result;
}

export function useTenantLrManagementService() {
  const store = useMockStore();
  const useApi = import.meta.env.VITE_LR_MANAGEMENT_API === "true";

  return useMemo<TenantLrManagementService>(() => {
    if (useApi) {
      return {
        upsertPools: (records: TenantLrPoolRecord[]) => lrManagementApi.upsertPools(records),
        createRequest: (input: CreateLrRequestInput) => lrManagementApi.createRequest(input),
        approveRequest: (
          requestId: string,
          approvedCount: number,
          actor: string,
          note?: string,
        ) => lrManagementApi.approveRequest(requestId, approvedCount, actor, note),
        rejectRequest: (requestId: string, actor: string, note?: string) =>
          lrManagementApi.rejectRequest(requestId, actor, note),
        createTransfer: (input: CreateLrTransferInput) => lrManagementApi.createTransfer(input),
        appendAuditLog: (input: AppendAuditInput) =>
          lrManagementApi.appendAuditLog({
            ...input,
            result: normalizeAuditResult(input.result),
          }),
      };
    }

    return {
      upsertPools: async (records: TenantLrPoolRecord[]) => store.upsertTenantLrPools(records),
      createRequest: async (input: CreateLrRequestInput) => store.createTenantLrRequest(input),
      approveRequest: async (
        requestId: string,
        approvedCount: number,
        actor: string,
        note?: string,
      ) => store.approveTenantLrRequest(requestId, approvedCount, actor, note),
      rejectRequest: async (requestId: string, actor: string, note?: string) =>
        store.rejectTenantLrRequest(requestId, actor, note),
      createTransfer: async (input: CreateLrTransferInput) => store.createTenantLrTransfer(input),
      appendAuditLog: async (input: AppendAuditInput) =>
        store.appendPlatformAuditLog({
          ...input,
          result: normalizeAuditResult(input.result),
        }),
    };
  }, [store, useApi]);
}
