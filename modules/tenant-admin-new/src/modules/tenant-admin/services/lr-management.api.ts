import type {
  TenantLrAllocationRequestRecord,
  TenantLrPoolRecord,
  TenantLrTransferRecord,
} from "@/modules/tms/booking/types";

export type CreateLrRequestInput = Omit<
  TenantLrAllocationRequestRecord,
  "id" | "createdAt" | "updatedAt"
> & { tenantId: string };

export type CreateLrTransferInput = Omit<
  TenantLrTransferRecord,
  "id" | "createdAt" | "updatedAt"
> & { tenantId: string };

export const lrManagementApi = {
  async upsertPools(_records: TenantLrPoolRecord[]) {
    throw new Error("lrManagementApi.upsertPools is not implemented");
  },
  async createRequest(_input: CreateLrRequestInput) {
    throw new Error("lrManagementApi.createRequest is not implemented");
  },
  async approveRequest(
    _requestId: string,
    _approvedCount: number,
    _actor: string,
    _note?: string,
  ) {
    throw new Error("lrManagementApi.approveRequest is not implemented");
  },
  async allocateRequest(
    _requestId: string,
    _allocateCount: number,
    _actor: string,
    _note?: string,
  ) {
    throw new Error("lrManagementApi.allocateRequest is not implemented");
  },
  async escalateRequest(_requestId: string, _actor: string, _note?: string) {
    throw new Error("lrManagementApi.escalateRequest is not implemented");
  },
  async approveRequestWithSource(
    _requestId: string,
    _source: { useAvailableCount?: number; generateCount?: number },
    _actor: string,
    _note?: string,
  ) {
    throw new Error("lrManagementApi.approveRequestWithSource is not implemented");
  },
  async rejectRequest(_requestId: string, _actor: string, _note?: string) {
    throw new Error("lrManagementApi.rejectRequest is not implemented");
  },
  async createTransfer(_input: CreateLrTransferInput) {
    throw new Error("lrManagementApi.createTransfer is not implemented");
  },
  async appendAuditLog(
    _input: {
      actor: string;
      action: string;
      entityType: string;
      entityName: string;
      tenantId: string;
      result: "success" | "warning" | "denied";
    },
  ) {
    throw new Error("lrManagementApi.appendAuditLog is not implemented");
  },
};
