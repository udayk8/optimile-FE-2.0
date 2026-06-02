import { useEffect, useMemo, useState } from "react";
import { Layers3, Plus, Repeat, Search, Shuffle, ShieldCheck, Upload, XCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { useSessionContext } from "@/shared/auth/session-context";
import { PageHeader } from "@/shared/components/common/page-header";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Dialog } from "@/shared/components/ui/dialog";
import { Input } from "@/shared/components/ui/input";
import { Select } from "@/shared/components/ui/select";
import {
  TenantEmptyState,
  TenantFilterBar,
  TenantPanel,
  TenantSummaryCard,
} from "@/modules/tenant-admin/components/tenant-primitives";
import { useTenantLRConfigs } from "@/modules/tenant-admin/hooks/useTenantMasterData";
import { useTenantOrgTypes } from "@/modules/tenant-admin/hooks/useTenantOrgTypes";
import { useTenantOrgUnits } from "@/modules/tenant-admin/hooks/useTenantOrgUnits";
import { useTenantLrManagementService } from "@/modules/tenant-admin/hooks/useTenantLrManagementService";
import { useTenantRouteContext } from "@/modules/tenant-admin/hooks/useTenantRouteContext";
import { useTenantUsers } from "@/modules/tenant-admin/hooks/useTenantUsers";
import { useTenantRoles } from "@/modules/tenant-admin/hooks/useTenantRoles";
import { useTenantRolePermissions } from "@/modules/tenant-admin/hooks/useTenantRolePermissions";
import { resolveSessionRoleContext } from "@/shared/lib/tenant-rbac";
import { computeEffectiveUserScope } from "@/modules/tenant-admin/lib/user-scope";
import { useAppStore } from "@/shared/store/useAppStore";
import type { OrgUnit } from "@/types/access";
import type {
  LRAllocationFlowLevel,
  LRConsumptionLevel,
  LRType,
  TenantLRConfig,
} from "@/types/master-data";
import type {
  TenantLrAllocationRequestRecord,
  TenantLrGenerationType,
  TenantLrPoolRecord,
  TenantLrPoolStatus,
} from "@/modules/tms/booking/types";

type ManagementTab =
  | "overview"
  | "numbers"
  | "pool"
  | "allocation"
  | "requests"
  | "approvals"
  | "transfers"
  | "audit";

type PoolFormState = {
  mode: "RANGE" | "CSV" | "LIST";
  customerId: string;
  ownerOrgUnitId: string;
  rangeStart: string;
  rangeEnd: string;
  poolEntries: string;
  remarks: string;
};

type AllocationFormState = {
  mode: "COUNT" | "SPECIFIC";
  sourceOrgUnitId: string;
  targetOrgUnitId: string;
  customerId: string;
  count: string;
  lrNumbers: string;
  remarks: string;
};

type RequestFormState = {
  sourceOrgUnitId: string;
  customerId: string;
  requestedCount: string;
  remarks: string;
};

type ApprovalFormState = {
  requestId: string;
  approvedCount: string;
  remarks: string;
};

type TransferFormState = {
  mode: "COUNT" | "SPECIFIC";
  sourceOrgUnitId: string;
  targetOrgUnitId: string;
  customerId: string;
  count: string;
  lrNumbers: string;
  remarks: string;
};

type VoidFormState = {
  lrPoolId: string;
  reason: string;
};

type RequestStatusOverride = {
  status: TenantLrAllocationRequestRecord["status"];
  approvedCount: number;
  updatedAt: string;
  decidedAt?: string | null;
};

type NumberRow = {
  id: string;
  lrNumber: string;
  lrType: LRType;
  status: TenantLrPoolStatus;
  customerId: string | null;
  ownerOrgUnitId: string | null;
  bookingId: string | null;
  deliveryId: string | null;
  createdAt: string;
  usedAt: string | null;
  voidReason: string | null;
  source: "POOL" | "AUTO";
};

function isHierarchyConfig(config: TenantLRConfig | null) {
  return Boolean(
    config &&
      (config.scopeType === "HIERARCHY" ||
        config.allocationStrategy === "HIERARCHICAL" ||
        config.allocationFlow?.mode === "HIERARCHY"),
  );
}

function requiresPool(config: TenantLRConfig | null) {
  return Boolean(config && config.lrType !== "AUTO");
}

function formatPreview(config: Pick<TenantLRConfig, "prefix" | "yearFormat" | "numberSeparator" | "zeroPaddingLength">) {
  const separator = config.numberSeparator || "/";
  const parts = [config.prefix.trim().toUpperCase() || "LR"];
  if (config.yearFormat === "YY") {
    parts.push("26");
  } else if (config.yearFormat === "YYYY") {
    parts.push("2026");
  }
  parts.push("1".padStart(Math.max(config.zeroPaddingLength || 1, 1), "0"));
  return parts.join(separator);
}

function buildFormatRegex(config: Pick<TenantLRConfig, "prefix" | "yearFormat" | "numberSeparator" | "zeroPaddingLength">) {
  const escape = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const prefix = escape(config.prefix.trim().toUpperCase());
  const separator = escape(config.numberSeparator || "/");
  const yearPart =
    config.yearFormat === "YY"
      ? `${separator}\\d{2}`
      : config.yearFormat === "YYYY"
        ? `${separator}\\d{4}`
        : "";
  return new RegExp(`^${prefix}${yearPart}${separator}\\d{${Math.max(config.zeroPaddingLength || 1, 1)}}$`, "i");
}

function buildRangeValues(config: Pick<TenantLRConfig, "prefix" | "yearFormat" | "numberSeparator" | "zeroPaddingLength">, start: number, end: number) {
  const separator = config.numberSeparator || "/";
  const yearToken = config.yearFormat === "YY" ? "26" : config.yearFormat === "YYYY" ? "2026" : "";
  return Array.from({ length: end - start + 1 }, (_, index) => {
    const parts = [config.prefix.trim().toUpperCase() || "LR"];
    if (yearToken) {
      parts.push(yearToken);
    }
    parts.push(String(start + index).padStart(Math.max(config.zeroPaddingLength || 1, 1), "0"));
    return parts.join(separator);
  });
}

function getLastSequenceValue(lrNumber: string) {
  const match = lrNumber.match(/(\d+)(?!.*\d)/);
  return match ? Number(match[1]) : 0;
}

function parseEntries(value: string) {
  return value
    .split(/[\r\n,]+/)
    .map((entry) => entry.trim())
    .filter(Boolean)
    .filter((entry, index, entries) => entries.indexOf(entry) === index);
}

function getLrTypeLabel(lrType: LRType) {
  return lrType === "PRE_GENERATED" ? "Pre-generated" : lrType.charAt(0) + lrType.slice(1).toLowerCase();
}

function getModeLabel(config: TenantLRConfig | null) {
  return isHierarchyConfig(config) ? "Hierarchy Level" : "Tenant Level";
}

function getGenerationType(lrType: LRType): TenantLrGenerationType {
  return lrType === "PRE_GENERATED" ? "PREGENERATED" : lrType === "MANUAL" ? "MANUAL" : "AUTO";
}

function requestStatusBadge(status: TenantLrAllocationRequestRecord["status"]) {
  if (status === "APPROVED") {
    return "success";
  }
  if (status === "PARTIALLY_APPROVED") {
    return "warning";
  }
  if (status === "REJECTED" || status === "CANCELLED") {
    return "destructive";
  }
  return "secondary";
}

function getTabLabel(tab: ManagementTab, lrType: LRType | undefined) {
  if (tab === "overview") {
    return "Dashboard";
  }
  if (tab === "pool") {
    if (lrType === "MANUAL") {
      return "Generate Manual LR Numbers";
    }
    if (lrType === "PRE_GENERATED") {
      return "Upload Pre-generated LR Pool";
    }
    return "Generate / Upload LR Numbers";
  }
  if (tab === "numbers") {
    return "LR Number List";
  }
  if (tab === "transfers") {
    return "Transfer";
  }
  if (tab === "audit") {
    return "Used / Void / Audit";
  }
  return tab.charAt(0).toUpperCase() + tab.slice(1);
}

function getOwnerLevelName(ownerOrgUnitId: string | null, orgUnitMap: Map<string, OrgUnit>, hierarchyLevelMap: Map<string, { name: string }>) {
  if (!ownerOrgUnitId) {
    return "Tenant";
  }
  const orgUnit = orgUnitMap.get(ownerOrgUnitId) ?? null;
  if (!orgUnit) {
    return ownerOrgUnitId;
  }
  return hierarchyLevelMap.get(orgUnit.hierarchyLevelId)?.name ?? orgUnit.hierarchyLevelId;
}

function getRelevantTabs(config: TenantLRConfig | null, flowLevels: LRAllocationFlowLevel[]) {
  if (!config) {
    return ["overview", "numbers", "audit"] as ManagementTab[];
  }
  const tabs: ManagementTab[] = ["overview", "numbers"];
  if (requiresPool(config)) {
    tabs.push("pool");
  }
  if (requiresPool(config) && (config.customerOwnershipEnabled || isHierarchyConfig(config))) {
    tabs.push("allocation");
  }
  if (requiresPool(config) && isHierarchyConfig(config) && flowLevels.some((level) => level.canRequestQuota)) {
    tabs.push("requests");
  }
  if (requiresPool(config) && isHierarchyConfig(config) && flowLevels.some((level) => level.canApproveRequests)) {
    tabs.push("approvals");
  }
  if (requiresPool(config) && (config.customerOwnershipEnabled || isHierarchyConfig(config))) {
    tabs.push("transfers");
  }
  tabs.push("audit");
  return tabs;
}

function getRelevantTabsForHierarchy(
  config: TenantLRConfig | null,
  selectedLevel: LRAllocationFlowLevel | null,
  hasSelectedHierarchy: boolean,
) {
  if (!config) {
    return ["overview", "numbers", "audit"] as ManagementTab[];
  }
  if (!isHierarchyConfig(config) || !hasSelectedHierarchy) {
    return getRelevantTabs(config, config.allocationFlow?.levels ?? []);
  }
  const tabs: ManagementTab[] = ["overview", "numbers"];
  if (requiresPool(config) && (selectedLevel?.canAllocateQuota || !selectedLevel)) {
    tabs.push("pool");
  }
  if (requiresPool(config) && (selectedLevel?.canAllocateQuota || selectedLevel?.canAllocateToCustomer)) {
    tabs.push("allocation");
    tabs.push("transfers");
  }
  if (requiresPool(config) && selectedLevel?.canRequestQuota) {
    tabs.push("requests");
  }
  if (requiresPool(config) && selectedLevel?.canApproveRequests) {
    tabs.push("approvals");
  }
  tabs.push("audit");
  return tabs;
}

function matchesTargetLevel(sourceLevel: LRAllocationFlowLevel | null, targetHierarchyLevelId: string) {
  if (!sourceLevel?.canAllocateQuota) {
    return false;
  }
  return (sourceLevel.allocateToLevelIds ?? []).includes(targetHierarchyLevelId);
}

function findFlowLevelForOrgUnit(config: TenantLRConfig | null, orgUnitId: string, orgUnitMap: Map<string, OrgUnit>) {
  const orgUnit = orgUnitMap.get(orgUnitId) ?? null;
  if (!orgUnit || !config?.allocationFlow) {
    return null;
  }
  return config.allocationFlow.levels.find((level) => level.levelId === orgUnit.hierarchyLevelId) ?? null;
}

function capabilitySummary(level: LRAllocationFlowLevel) {
  const entries = [
    level.canAllocateQuota ? "Allocate" : null,
    level.canAllocateToCustomer ? "Allocate to Customer" : null,
    level.canApproveRequests ? "Approve" : null,
    level.canRequestQuota ? "Request" : null,
    level.canConsumeLR ? "Consume" : null,
  ].filter(Boolean);
  return entries.length ? entries.join(", ") : "No actions";
}

function isTopHierarchyFlowLevel(
  flowLevels: LRAllocationFlowLevel[],
  selectedLevelId: string,
  hierarchyLevelMap: Map<string, { order: number }>,
) {
  if (!selectedLevelId) {
    return false;
  }
  const ordered = flowLevels
    .slice()
    .sort(
      (left, right) =>
        (hierarchyLevelMap.get(left.levelId)?.order ?? Number.MAX_SAFE_INTEGER) -
        (hierarchyLevelMap.get(right.levelId)?.order ?? Number.MAX_SAFE_INTEGER),
    );
  return ordered[0]?.levelId === selectedLevelId;
}

export function TenantLRManagementPage() {
  const { tenant } = useTenantRouteContext();
  const { session } = useSessionContext();
  const { data: lrConfigs } = useTenantLRConfigs(tenant.id);
  const { data: orgUnits } = useTenantOrgUnits(tenant.id);
  const { data: hierarchyLevels } = useTenantOrgTypes(tenant.id);
  const lrManagementService = useTenantLrManagementService();
  const {
    customers,
    lrPools,
    lrs,
    lrRequests,
    lrTransfers,
    auditLogs,
  } = useAppStore(tenant.id);

  const [selectedConfigId, setSelectedConfigId] = useState("");
  const [selectedHierarchyLevelId, setSelectedHierarchyLevelId] = useState("");
  const [activeTab, setActiveTab] = useState<ManagementTab>("overview");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "AVAILABLE" | "USED" | "VOID">("ALL");
  const [customerFilter, setCustomerFilter] = useState("ALL");
  const [ownerFilter, setOwnerFilter] = useState("ALL");
  const [message, setMessage] = useState("");
  const [poolOpen, setPoolOpen] = useState(false);
  const [allocationOpen, setAllocationOpen] = useState(false);
  const [requestOpen, setRequestOpen] = useState(false);
  const [approvalOpen, setApprovalOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [voidOpen, setVoidOpen] = useState(false);
  const [numberPage, setNumberPage] = useState(1);
  const [requestPage, setRequestPage] = useState(1);
  const [approvalPage, setApprovalPage] = useState(1);
  const [transferPage, setTransferPage] = useState(1);
  const [poolForm, setPoolForm] = useState<PoolFormState>({
    mode: "RANGE",
    customerId: "",
    ownerOrgUnitId: "",
    rangeStart: "",
    rangeEnd: "",
    poolEntries: "",
    remarks: "",
  });
  const [allocationForm, setAllocationForm] = useState<AllocationFormState>({
    mode: "COUNT",
    sourceOrgUnitId: "",
    targetOrgUnitId: "",
    customerId: "",
    count: "1",
    lrNumbers: "",
    remarks: "",
  });
  const [requestForm, setRequestForm] = useState<RequestFormState>({
    sourceOrgUnitId: "",
    customerId: "",
    requestedCount: "1",
    remarks: "",
  });
  const [approvalForm, setApprovalForm] = useState<ApprovalFormState>({
    requestId: "",
    approvedCount: "1",
    remarks: "",
  });
  const [transferForm, setTransferForm] = useState<TransferFormState>({
    mode: "COUNT",
    sourceOrgUnitId: "",
    targetOrgUnitId: "",
    customerId: "",
    count: "1",
    lrNumbers: "",
    remarks: "",
  });
  const [voidForm, setVoidForm] = useState<VoidFormState>({
    lrPoolId: "",
    reason: "",
  });
  const [requestOverrides, setRequestOverrides] = useState<Record<string, RequestStatusOverride>>({});

  const orgUnitMap = useMemo(() => new Map(orgUnits.map((item) => [item.id, item])), [orgUnits]);
  const customerMap = useMemo(() => new Map(customers.map((item) => [item.id, item])), [customers]);
  const hierarchyLevelMap = useMemo(() => new Map(hierarchyLevels.map((item) => [item.id, item])), [hierarchyLevels]);

  // --- Customer / Pre-generated LR place governance (ISOLATED) ---
  // Reuses the app's hierarchy scope model so the customer/pre-generated LR
  // place selector only offers the logged-in user's active place + its child
  // places (Company Root sees all). Does NOT affect Manual LR lists/flows.
  const { data: scopeUsers } = useTenantUsers(tenant.id);
  const { data: scopeRoles } = useTenantRoles(tenant.id);
  const { data: scopeRolePermissions } = useTenantRolePermissions(tenant.id);
  const { currentTenantUser: scopeUser, activeRole: scopeRole } = resolveSessionRoleContext({
    tenant,
    session,
    users: scopeUsers,
    roles: scopeRoles,
    rolePermissions: scopeRolePermissions,
  });
  const allowedPlaceIds = useMemo(
    () => computeEffectiveUserScope(scopeUser, scopeRole, orgUnits).allowedOrgUnitIds,
    [scopeUser, scopeRole, orgUnits],
  );
  const customerLrPlaceOptions = useMemo(
    () =>
      orgUnits
        .filter((unit) => unit.status !== "planned" && allowedPlaceIds.has(unit.id))
        .slice()
        .sort(
          (left, right) =>
            (hierarchyLevelMap.get(left.hierarchyLevelId)?.order ?? 0) -
              (hierarchyLevelMap.get(right.hierarchyLevelId)?.order ?? 0) || left.name.localeCompare(right.name),
        ),
    [allowedPlaceIds, hierarchyLevelMap, orgUnits],
  );
  const buildPlacePath = (orgUnitId: string | null | undefined): string[] => {
    const path: string[] = [];
    let cursor = orgUnitId ? orgUnitMap.get(orgUnitId) : undefined;
    let guard = 0;
    while (cursor && guard < 12) {
      path.unshift(cursor.name);
      cursor = cursor.parentOrgUnitId ? orgUnitMap.get(cursor.parentOrgUnitId) : undefined;
      guard += 1;
    }
    return path.length ? path : [];
  };

  const activeConfigs = useMemo(
    () => [...lrConfigs].sort((left, right) => Number(right.status === "active") - Number(left.status === "active")),
    [lrConfigs],
  );
  const selectedConfig = useMemo(
    () => activeConfigs.find((config) => config.id === selectedConfigId) ?? activeConfigs[0] ?? null,
    [activeConfigs, selectedConfigId],
  );
  // Customer / Pre-generated LR uses the governed place selector + scoped visibility.
  const isCustomerLrConfig = selectedConfig?.lrType === "PRE_GENERATED";
  const selectedConfigFlowLevels = useMemo(
    () =>
      selectedConfig?.allocationFlow?.levels?.slice().sort(
        (left, right) => (hierarchyLevelMap.get(left.levelId)?.order ?? 0) - (hierarchyLevelMap.get(right.levelId)?.order ?? 0),
      ) ?? [],
    [hierarchyLevelMap, selectedConfig],
  );
  const selectedHierarchyFlowLevel = useMemo(
    () =>
      selectedHierarchyLevelId
        ? selectedConfigFlowLevels.find((level) => level.levelId === selectedHierarchyLevelId) ?? null
        : null,
    [selectedConfigFlowLevels, selectedHierarchyLevelId],
  );
  const scopedHierarchyOrgUnitIds = useMemo(() => {
    if (!selectedHierarchyLevelId) {
      return [];
    }
    const selectedLevelOrder = hierarchyLevelMap.get(selectedHierarchyLevelId)?.order ?? Number.MAX_SAFE_INTEGER;
    const visibleLevelIds = hierarchyLevels
      .filter((level) => level.order >= selectedLevelOrder)
      .map((level) => level.id);
    return orgUnits
      .filter((orgUnit) => visibleLevelIds.includes(orgUnit.hierarchyLevelId))
      .map((orgUnit) => orgUnit.id);
  }, [hierarchyLevelMap, hierarchyLevels, orgUnits, selectedHierarchyLevelId]);
  const visibleTabs = useMemo(
    () => getRelevantTabsForHierarchy(selectedConfig, selectedHierarchyFlowLevel, Boolean(selectedHierarchyLevelId)),
    [selectedConfig, selectedHierarchyFlowLevel, selectedHierarchyLevelId],
  );

  useEffect(() => {
    if (!selectedConfigId && activeConfigs[0]) {
      setSelectedConfigId(activeConfigs[0].id);
    }
  }, [activeConfigs, selectedConfigId]);

  useEffect(() => {
    if (!visibleTabs.includes(activeTab)) {
      setActiveTab(visibleTabs[0] ?? "overview");
    }
  }, [activeTab, visibleTabs]);

  useEffect(() => {
    setNumberPage(1);
    setRequestPage(1);
    setApprovalPage(1);
    setTransferPage(1);
  }, [selectedConfigId, selectedHierarchyLevelId, search, statusFilter, customerFilter, ownerFilter]);

  const selectedPools = useMemo(
    () =>
      selectedConfig
        ? lrPools.filter(
            (pool) =>
              pool.configId === selectedConfig.id &&
              (!selectedHierarchyLevelId ||
                !isHierarchyConfig(selectedConfig) ||
                !pool.ownerLevelId ||
                scopedHierarchyOrgUnitIds.includes(pool.ownerLevelId)) &&
              // Customer/Pre-generated LR: only show pools owned by the user's
              // place scope (self + child places). Manual LR is unaffected.
              (!isCustomerLrConfig || !pool.ownerLevelId || allowedPlaceIds.has(pool.ownerLevelId)),
          )
        : [],
    [lrPools, scopedHierarchyOrgUnitIds, selectedConfig, selectedHierarchyLevelId, isCustomerLrConfig, allowedPlaceIds],
  );
  const selectedLrs = useMemo(
    () => (selectedConfig ? lrs.filter((record) => record.configId === selectedConfig.id) : []),
    [lrs, selectedConfig],
  );

  const totalCount = selectedConfig?.lrType === "AUTO" ? selectedLrs.length : selectedPools.length;
  const availableCount = selectedConfig?.lrType === "AUTO" ? 0 : selectedPools.filter((pool) => pool.status === "AVAILABLE").length;
  const usedCount = selectedConfig?.lrType === "AUTO" ? selectedLrs.length : selectedPools.filter((pool) => pool.status === "USED").length;
  const voidCount = selectedConfig?.lrType === "AUTO" ? 0 : selectedPools.filter((pool) => pool.status === "VOID").length;

  const numberRows = useMemo<NumberRow[]>(() => {
    if (!selectedConfig) {
      return [];
    }
    if (selectedConfig.lrType === "AUTO") {
      return selectedLrs.map((record) => ({
        id: record.id,
        lrNumber: record.lrNumber,
        lrType: "AUTO",
        status: record.status === "VOID" ? "VOID" : "USED",
        customerId: record.customerId,
        ownerOrgUnitId: null,
        bookingId: record.bookingId,
        deliveryId: record.deliveryId,
        createdAt: record.createdAt,
        usedAt: record.updatedAt,
        voidReason: null,
        source: "AUTO",
      }));
    }
    return selectedPools.map((pool) => ({
      id: pool.id,
      lrNumber: pool.lrNumber,
      lrType: selectedConfig.lrType,
      status: pool.status,
      customerId: pool.customerId ?? null,
      ownerOrgUnitId: pool.ownerLevelId ?? null,
      bookingId: pool.bookingId ?? null,
      deliveryId: pool.deliveryId ?? null,
      createdAt: pool.createdAt,
      usedAt: pool.usedAt ?? null,
      voidReason: pool.voidReason ?? null,
      source: "POOL",
    }));
  }, [selectedConfig, selectedLrs, selectedPools]);

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return numberRows.filter((row) => {
      if (statusFilter !== "ALL" && row.status !== statusFilter) {
        return false;
      }
      if (customerFilter !== "ALL" && (row.customerId ?? "") !== customerFilter) {
        return false;
      }
      const ownerKey = row.ownerOrgUnitId ? `ORG:${row.ownerOrgUnitId}` : "TENANT";
      if (ownerFilter !== "ALL" && ownerKey !== ownerFilter) {
        return false;
      }
      if (!query) {
        return true;
      }
      return [
        row.lrNumber,
        row.status,
        customerMap.get(row.customerId ?? "")?.name ?? "",
        orgUnitMap.get(row.ownerOrgUnitId ?? "")?.name ?? "",
        row.bookingId ?? "",
        row.deliveryId ?? "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [customerFilter, customerMap, numberRows, orgUnitMap, ownerFilter, search, statusFilter]);
  const numberPageSize = 10;
  const pagedRows = useMemo(
    () => filteredRows.slice((numberPage - 1) * numberPageSize, numberPage * numberPageSize),
    [filteredRows, numberPage],
  );
  const requestPageSize = 10;
  const effectiveRequests = useMemo(
    () =>
      lrRequests.map((request) => {
        const override = requestOverrides[request.id];
        return override ? { ...request, ...override } : request;
      }),
    [lrRequests, requestOverrides],
  );
  const configRequests = useMemo(
    () =>
      effectiveRequests.filter(
        (request) =>
          request.configId === selectedConfig?.id &&
          (!selectedHierarchyLevelId || !isHierarchyConfig(selectedConfig) || request.sourceLevelId === selectedHierarchyLevelId),
      ),
    [effectiveRequests, selectedConfig, selectedHierarchyLevelId],
  );
  const pagedRequests = useMemo(
    () => configRequests.slice((requestPage - 1) * requestPageSize, requestPage * requestPageSize),
    [configRequests, requestPage],
  );
  const pendingRequests = useMemo(
    () =>
      effectiveRequests.filter(
        (request) =>
          request.configId === selectedConfig?.id &&
          request.status === "PENDING" &&
          (!selectedHierarchyLevelId || !isHierarchyConfig(selectedConfig) || request.targetLevelId === selectedHierarchyLevelId),
      ),
    [effectiveRequests, selectedConfig, selectedHierarchyLevelId],
  );
  const selectedApprovalRequest = useMemo(
    () => pendingRequests.find((item) => item.id === approvalForm.requestId) ?? null,
    [approvalForm.requestId, pendingRequests],
  );

  useEffect(() => {
    console.log("[LR Management] selectedConfig", selectedConfig);
  }, [selectedConfig]);
  const nextAutoNumber = useMemo(() => {
    if (!selectedConfig || selectedConfig.lrType !== "AUTO") {
      return null;
    }
    const values = selectedLrs
      .map((record) => {
        const match = record.lrNumber.match(/(\d+)(?!.*\d)/);
        return match ? Number(match[1]) : 0;
      })
      .filter((value) => Number.isFinite(value));
    const nextSequence = Math.max(selectedConfig.locationCounter ?? 0, ...values, 0) + 1;
    return buildRangeValues(selectedConfig, nextSequence, nextSequence)[0] ?? formatPreview(selectedConfig);
  }, [selectedConfig, selectedLrs]);

  const matchingAudit = useMemo(
    () =>
      auditLogs.filter(
        (entry) =>
          entry.entityType.startsWith("lr_") ||
          entry.action.toLowerCase().includes("lr") ||
          entry.action.toLowerCase().includes("booking"),
      ),
    [auditLogs],
  );

  const approvalQueue = useMemo(
    () =>
      effectiveRequests.filter(
        (request) =>
          request.configId === selectedConfig?.id &&
          request.status === "PENDING" &&
          (!selectedHierarchyLevelId || !isHierarchyConfig(selectedConfig) || request.targetLevelId === selectedHierarchyLevelId),
      ),
    [effectiveRequests, selectedConfig, selectedHierarchyLevelId],
  );

  const approvedAssignmentRequests = useMemo(
    () =>
      effectiveRequests.filter(
        (request) =>
          request.configId === selectedConfig?.id &&
          (request.status === "APPROVED" || request.status === "PARTIALLY_APPROVED") &&
          (!selectedHierarchyLevelId || !isHierarchyConfig(selectedConfig) || request.targetLevelId === selectedHierarchyLevelId),
      ),
    [effectiveRequests, selectedConfig, selectedHierarchyLevelId],
  );

  const scopedTransfers = useMemo(
    () =>
      lrTransfers.filter(
        (transfer) =>
          transfer.configId === selectedConfig?.id &&
          (!selectedHierarchyLevelId ||
            !isHierarchyConfig(selectedConfig) ||
            transfer.fromLevelId === selectedHierarchyLevelId ||
            transfer.toLevelId === selectedHierarchyLevelId),
      ),
    [lrTransfers, selectedConfig, selectedHierarchyLevelId],
  );

  const hierarchyOwners = useMemo(
    () =>
      orgUnits
        .slice()
        .sort(
          (left, right) =>
            (hierarchyLevelMap.get(left.hierarchyLevelId)?.order ?? 0) - (hierarchyLevelMap.get(right.hierarchyLevelId)?.order ?? 0) ||
            left.name.localeCompare(right.name),
        ),
    [hierarchyLevelMap, orgUnits],
  );

  useEffect(() => {
    if (!selectedConfig || !isHierarchyConfig(selectedConfig)) {
      if (selectedHierarchyLevelId) {
        setSelectedHierarchyLevelId("");
      }
      return;
    }
    const scopedLevels = selectedConfigFlowLevels.filter(
      (level) =>
        hierarchyOwners.some((orgUnit) => orgUnit.hierarchyLevelId === level.levelId),
    );
    if (!selectedHierarchyLevelId || !scopedLevels.some((level) => level.levelId === selectedHierarchyLevelId)) {
      setSelectedHierarchyLevelId(scopedLevels[0]?.levelId ?? "");
    }
  }, [hierarchyOwners, selectedConfig, selectedConfigFlowLevels, selectedHierarchyLevelId]);

  const approvalPageSize = 10;
  const pagedApprovals = useMemo(
    () => approvalQueue.slice((approvalPage - 1) * approvalPageSize, approvalPage * approvalPageSize),
    [approvalQueue, approvalPage],
  );
  const transferPageSize = 10;
  const pagedTransfers = useMemo(
    () => scopedTransfers.slice((transferPage - 1) * transferPageSize, transferPage * transferPageSize),
    [scopedTransfers, transferPage],
  );

  const availableSourcePools = useMemo(() => {
    if (!selectedConfig) {
      return [] as TenantLrPoolRecord[];
    }
    return selectedPools.filter((pool) => pool.status === "AVAILABLE");
  }, [selectedConfig, selectedPools]);

  const defaultOrgUnitForSelectedHierarchy = useMemo(
    () => hierarchyOwners.find((orgUnit) => orgUnit.hierarchyLevelId === selectedHierarchyLevelId)?.id ?? "",
    [hierarchyOwners, selectedHierarchyLevelId],
  );
  const topHierarchyApprover = useMemo(
    () => isTopHierarchyFlowLevel(selectedConfigFlowLevels, selectedHierarchyLevelId, hierarchyLevelMap),
    [hierarchyLevelMap, selectedConfigFlowLevels, selectedHierarchyLevelId],
  );

  useEffect(() => {
    console.log("[LR Management] counts", {
      pools: selectedPools.length,
      requests: configRequests.length,
      approvals: approvalQueue.length,
      transfers: scopedTransfers.length,
      selectedHierarchyLevelId,
    });
  }, [approvalQueue.length, configRequests.length, scopedTransfers.length, selectedHierarchyLevelId, selectedPools.length]);

  function resetPoolForm() {
    setPoolForm({
      mode: "RANGE",
      customerId: "",
      ownerOrgUnitId: "",
      rangeStart: "",
      rangeEnd: "",
      poolEntries: "",
      remarks: "",
    });
  }

  function openApprovalDialog(request: TenantLrAllocationRequestRecord | null) {
    if (!request) {
      setMessage("Select a valid request.");
      return;
    }
    setApprovalForm({
      requestId: request.id,
      approvedCount: String(request.requestedCount),
      remarks: request.note ?? "",
    });
    setApprovalOpen(true);
  }

  function selectPoolOwner(config: TenantLRConfig) {
    // Customer/Pre-generated LR is always owned by the chosen place (governed).
    if (config.lrType === "PRE_GENERATED") {
      return { ownerOrgUnitId: poolForm.ownerOrgUnitId || null };
    }
    if (!isHierarchyConfig(config)) {
      return { ownerOrgUnitId: null as string | null };
    }
    return {
      ownerOrgUnitId: poolForm.ownerOrgUnitId || null,
    };
  }

  async function createPool() {
    if (!selectedConfig) {
      setMessage("Select an LR configuration first.");
      return;
    }
    if (!requiresPool(selectedConfig)) {
      setMessage("AUTO LR does not require pool creation.");
      return;
    }

    if (selectedConfig.customerOwnershipEnabled && !poolForm.customerId) {
      setMessage("Select a customer because this configuration enables customer ownership.");
      return;
    }

    const { ownerOrgUnitId } = selectPoolOwner(selectedConfig);
    if (isHierarchyConfig(selectedConfig)) {
      if (!ownerOrgUnitId) {
        setMessage("Select the hierarchy node that should own this LR pool.");
        return;
      }
    }
    // Customer/Pre-generated LR place governance: a place is required, and it
    // must be the user's active place or a child place — never a parent/unrelated.
    if (isCustomerLrConfig && !ownerOrgUnitId) {
      setMessage("Select the place that should own this customer LR.");
      return;
    }
    if (isCustomerLrConfig && ownerOrgUnitId && !allowedPlaceIds.has(ownerOrgUnitId)) {
      setMessage("You can only create customer LR for your active place or its child places.");
      return;
    }

    let lrNumbers: string[] = [];
    if (poolForm.mode === "RANGE") {
      const start = Number(poolForm.rangeStart);
      const end = Number(poolForm.rangeEnd);
      if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) {
        setMessage("Enter a valid sequence range.");
        return;
      }
      lrNumbers = buildRangeValues(selectedConfig, start, end);
    } else {
      lrNumbers = parseEntries(poolForm.poolEntries).map((entry) => entry.toUpperCase());
      if (!lrNumbers.length) {
        setMessage("Add one or more LR numbers.");
        return;
      }
    }

    const formatRegex = buildFormatRegex(selectedConfig);
    const invalid = lrNumbers.find((value) => !formatRegex.test(value));
    if (invalid) {
      setMessage(`LR number ${invalid} does not match ${formatPreview(selectedConfig)}.`);
      return;
    }

    const allTenantNumbers = new Set(lrPools.filter((pool) => pool.tenantId === tenant.id).map((pool) => pool.lrNumber.toUpperCase()));
    const duplicate = lrNumbers.find((value, index) => lrNumbers.indexOf(value) !== index || allTenantNumbers.has(value));
    if (duplicate) {
      setMessage(`LR number ${duplicate} already exists.`);
      return;
    }

    const now = new Date().toISOString();
    const records = lrNumbers.map((lrNumber) => ({
      id: `lr-pool-${Math.random().toString(36).slice(2, 9)}`,
      tenantId: tenant.id,
      configId: selectedConfig.id,
      lrNumber,
      status: "AVAILABLE" as TenantLrPoolStatus,
      customerId: selectedConfig.customerOwnershipEnabled ? poolForm.customerId || null : null,
      vendorId: selectedConfig.vendorId ?? null,
      ownerLevelId: ownerOrgUnitId,
      ownerUserId: null,
      bookingId: null,
      deliveryId: null,
      usedAt: null,
      voidReason: null,
      createdBy: session.actorName,
      createdAt: now,
      updatedAt: now,
    }));
    try {
      await lrManagementService.upsertPools(records);
      await lrManagementService.appendAuditLog({
        actor: session.actorName,
        action: poolForm.mode === "RANGE" ? "created LR pool" : "uploaded LR pool",
        entityType: "lr_pool",
        entityName: selectedConfig.prefix || selectedConfig.id,
        tenantId: tenant.id,
        result: "success",
      });
      setMessage(`Created ${records.length} LR number(s).`);
      setPoolOpen(false);
      resetPoolForm();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Pool save failed.");
    }
  }

  function getSourceLevel(orgUnitId: string) {
    return findFlowLevelForOrgUnit(selectedConfig, orgUnitId, orgUnitMap);
  }

  function selectAllocatablePools(form: AllocationFormState | TransferFormState) {
    const explicitNumbers = parseEntries(form.lrNumbers).map((value) => value.toUpperCase());
    const desiredCount = Math.max(1, Number(form.count || 0));
    const pools = availableSourcePools.filter((pool) => {
      if (form.sourceOrgUnitId) {
        return pool.ownerLevelId === form.sourceOrgUnitId;
      }
      return !pool.ownerLevelId;
    });
    if (form.mode === "SPECIFIC") {
      return pools.filter((pool) => explicitNumbers.includes(pool.lrNumber.toUpperCase()));
    }
    return pools.slice(0, desiredCount);
  }

  async function allocatePool(action: "allocation" | "transfer") {
    if (!selectedConfig) {
      setMessage("Select an LR configuration first.");
      return;
    }
    const form = action === "allocation" ? allocationForm : transferForm;
    const sourceOrgUnitId = form.sourceOrgUnitId || "";
    const sourceLevel = sourceOrgUnitId ? getSourceLevel(sourceOrgUnitId) : null;
    const targetOrgUnit = form.targetOrgUnitId ? orgUnitMap.get(form.targetOrgUnitId) ?? null : null;
    const targetLevelId = targetOrgUnit?.hierarchyLevelId ?? "";

    if (isHierarchyConfig(selectedConfig) && sourceOrgUnitId && form.targetOrgUnitId) {
      if (!matchesTargetLevel(sourceLevel, targetLevelId)) {
        setMessage("Allocation is not permitted to the selected hierarchy target.");
        return;
      }
    }

    if (
      selectedConfig.customerOwnershipEnabled &&
      form.customerId &&
      !form.targetOrgUnitId &&
      !sourceLevel?.canAllocateToCustomer &&
      isHierarchyConfig(selectedConfig)
    ) {
      setMessage("This node cannot allocate LR to customers.");
      return;
    }

    const pools = selectAllocatablePools(form);
    console.log("[LR Management] allocation selection", {
      action,
      sourceOrgUnitId,
      targetOrgUnitId: form.targetOrgUnitId || null,
      customerId: form.customerId || null,
      selectedPoolCount: pools.length,
    });
    if (!pools.length) {
      setMessage("No AVAILABLE LR numbers match the selected source and input.");
      return;
    }

    const now = new Date().toISOString();
    const updatedRecords = pools.map((pool) => ({
      ...pool,
      ownerLevelId: selectedConfig.customerOwnershipEnabled && form.customerId && !form.targetOrgUnitId ? pool.ownerLevelId : form.targetOrgUnitId || pool.ownerLevelId || null,
      ownerUserId: null,
      customerId: selectedConfig.customerOwnershipEnabled ? form.customerId || pool.customerId || null : null,
      updatedAt: now,
    }));
    try {
      await lrManagementService.upsertPools(updatedRecords);
      await lrManagementService.createTransfer({
        tenantId: tenant.id,
        fromLevelId: sourceOrgUnitId ? orgUnitMap.get(sourceOrgUnitId)?.hierarchyLevelId ?? "" : "",
        toLevelId: form.targetOrgUnitId ? orgUnitMap.get(form.targetOrgUnitId)?.hierarchyLevelId ?? "" : "",
        fromOrgUnitId: form.sourceOrgUnitId || null,
        toOrgUnitId: form.targetOrgUnitId || null,
        fromUserId: null,
        toUserId: null,
        lrType: getGenerationType(selectedConfig.lrType),
        customerId: selectedConfig.customerOwnershipEnabled ? form.customerId || null : null,
        configId: selectedConfig.id,
        lrIds: pools.map((pool) => pool.id),
        status: "COMPLETED",
        completedAt: now,
        note: form.remarks.trim() || null,
      });
      await lrManagementService.appendAuditLog({
        actor: session.actorName,
        action: action === "allocation" ? "allocated LR" : "transferred LR",
        entityType: action === "allocation" ? "lr_allocation" : "lr_transfer",
        entityName: selectedConfig.prefix || selectedConfig.id,
        tenantId: tenant.id,
        result: "success",
      });
      setMessage(`${action === "allocation" ? "Allocated" : "Transferred"} ${pools.length} LR number(s).`);
      console.log("[LR Management] allocation result", {
        action,
        movedCount: pools.length,
        sourceOrgUnitId,
        targetOrgUnitId: form.targetOrgUnitId || null,
        customerId: form.customerId || null,
      });
      if (action === "allocation") {
        setAllocationOpen(false);
      } else {
        setTransferOpen(false);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : `${action} failed.`);
    }
  }

  async function submitRequest() {
    if (!selectedConfig) {
      setMessage("Select an LR configuration first.");
      return;
    }
    if (!isHierarchyConfig(selectedConfig)) {
      setMessage("LR requests are available only for hierarchy-managed configurations.");
      return;
    }
    const sourceOrgUnit = orgUnitMap.get(requestForm.sourceOrgUnitId) ?? null;
    if (!sourceOrgUnit) {
      setMessage("Select the requesting hierarchy node.");
      return;
    }
    const sourceFlowLevel = getSourceLevel(sourceOrgUnit.id);
    if (!sourceFlowLevel?.canRequestQuota) {
      setMessage("The selected node cannot request LR.");
      return;
    }
    const parentOrgUnit = orgUnits.find((unit) => unit.id === sourceOrgUnit.parentOrgUnitId) ?? null;
    if (!parentOrgUnit) {
      setMessage("No parent node is available for this request.");
      return;
    }
    if (selectedConfig.customerOwnershipEnabled && !requestForm.customerId) {
      setMessage("Select a customer for this request.");
      return;
    }
    const requestedCount = Math.max(1, Number(requestForm.requestedCount || 0));
    try {
      await lrManagementService.createRequest({
        tenantId: tenant.id,
        sourceLevelId: sourceOrgUnit.hierarchyLevelId,
        targetLevelId: parentOrgUnit.hierarchyLevelId,
        requestedCount,
        approvedCount: 0,
        status: "PENDING",
        sourceOrgUnitId: sourceOrgUnit.id,
        targetOrgUnitId: parentOrgUnit.id,
        sourceUserId: null,
        targetUserId: null,
        lrType: getGenerationType(selectedConfig.lrType),
        configId: selectedConfig.id,
        customerId: selectedConfig.customerOwnershipEnabled ? requestForm.customerId || null : null,
        branchName: sourceOrgUnit.name,
        branchCode: sourceOrgUnit.id,
        lastSequenceNumber: null,
        note: requestForm.remarks.trim() || null,
        rejectionReason: null,
      });
      setMessage(`Requested ${requestedCount} LR number(s).`);
      setRequestOpen(false);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Request creation failed.");
    }
  }

  async function submitApproval() {
    const request = selectedApprovalRequest;
    if (!request || !selectedConfig) {
      setMessage("Open a valid request from the approval list.");
      return;
    }
    const matchingTargetPools = selectedPools.filter((pool) => {
      if (pool.status !== "AVAILABLE") {
        return false;
      }
      if (
        request.targetOrgUnitId &&
        pool.ownerLevelId &&
        pool.ownerLevelId !== request.targetOrgUnitId
      ) {
        return false;
      }
      if (request.targetUserId && pool.ownerUserId !== request.targetUserId) {
        return false;
      }
      if (
        request.customerId &&
        selectedConfig.lrType === "PRE_GENERATED" &&
        pool.customerId &&
        pool.customerId !== request.customerId
      ) {
        return false;
      }
      if (
        request.customerId &&
        selectedConfig.lrType !== "PRE_GENERATED" &&
        pool.customerId !== request.customerId
      ) {
        return false;
      }
      return true;
    });
    const targetAvailable = matchingTargetPools.length;
    const approvedCount = Math.max(0, Number(approvalForm.approvedCount || 0));
    if (approvedCount < 1) {
      setMessage("Enter an approved count greater than zero.");
      return;
    }
    if (approvedCount > targetAvailable && selectedConfig.lrType !== "MANUAL" && !topHierarchyApprover) {
      setMessage("Approver does not have enough AVAILABLE LR numbers.");
      return;
    }
    console.log("[LR Management] approval attempt", {
      requestId: request.id,
      approvedCount,
      targetAvailable,
      requester: request.sourceOrgUnitId,
      approver: request.targetOrgUnitId,
      customerId: request.customerId,
    });
    try {
      await lrManagementService.approveRequest(
        request.id,
        approvedCount,
        session.actorName,
        approvalForm.remarks.trim() || undefined,
      );
      setRequestOverrides((current) => ({
        ...current,
        [request.id]: {
          status: approvedCount < request.requestedCount ? "PARTIALLY_APPROVED" : "APPROVED",
          approvedCount,
          updatedAt: new Date().toISOString(),
          decidedAt: new Date().toISOString(),
        },
      }));
      setMessage(`Approved ${approvedCount} LR number(s).`);
      setApprovalForm({
        requestId: "",
        approvedCount: "1",
        remarks: "",
      });
      console.log("[LR Management] approval result", {
        requestId: request.id,
        approvedCount,
        status: "success",
      });
      setApprovalOpen(false);
    } catch (error) {
      console.log("[LR Management] approval result", {
        requestId: request.id,
        approvedCount,
        status: "error",
        error,
      });
      setMessage(error instanceof Error ? error.message : "Approval failed.");
    }
  }

  async function rejectPendingRequest(requestId: string) {
    try {
      await lrManagementService.rejectRequest(
        requestId,
        session.actorName,
        "Rejected from LR Management approval queue.",
      );
      setRequestOverrides((current) => ({
        ...current,
        [requestId]: {
          status: "REJECTED",
          approvedCount: 0,
          updatedAt: new Date().toISOString(),
          decidedAt: new Date().toISOString(),
        },
      }));
      setMessage("Request rejected.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Request rejection failed.");
    }
  }

  async function approvePendingRequest(request: TenantLrAllocationRequestRecord) {
    if (!selectedConfig) {
      setMessage("Select an LR configuration first.");
      return;
    }

    const matchingTargetPools = selectedPools.filter((pool) => {
      if (pool.status !== "AVAILABLE") {
        return false;
      }
      if (
        request.targetOrgUnitId &&
        pool.ownerLevelId &&
        pool.ownerLevelId !== request.targetOrgUnitId
      ) {
        return false;
      }
      if (request.targetUserId && pool.ownerUserId !== request.targetUserId) {
        return false;
      }
      if (
        request.customerId &&
        selectedConfig.lrType === "PRE_GENERATED" &&
        pool.customerId &&
        pool.customerId !== request.customerId
      ) {
        return false;
      }
      if (
        request.customerId &&
        selectedConfig.lrType !== "PRE_GENERATED" &&
        pool.customerId !== request.customerId
      ) {
        return false;
      }
      return true;
    });

    const approvedCount = request.requestedCount;
    const targetAvailable = matchingTargetPools.length;

    if (approvedCount > targetAvailable && selectedConfig.lrType !== "MANUAL" && !topHierarchyApprover) {
      setMessage("Approver does not have enough AVAILABLE LR numbers.");
      return;
    }

    console.log("[LR Management] inline approval attempt", {
      requestId: request.id,
      approvedCount,
      targetAvailable,
      requester: request.sourceOrgUnitId,
      approver: request.targetOrgUnitId,
      customerId: request.customerId,
    });

    try {
      await lrManagementService.approveRequest(
        request.id,
        approvedCount,
        session.actorName,
        request.note ?? undefined,
      );
      setRequestOverrides((current) => ({
        ...current,
        [request.id]: {
          status: approvedCount < request.requestedCount ? "PARTIALLY_APPROVED" : "APPROVED",
          approvedCount,
          updatedAt: new Date().toISOString(),
          decidedAt: new Date().toISOString(),
        },
      }));
      setMessage(`Approved ${approvedCount} LR number(s).`);
      console.log("[LR Management] inline approval result", {
        requestId: request.id,
        approvedCount,
        status: "success",
      });
    } catch (error) {
      console.log("[LR Management] inline approval result", {
        requestId: request.id,
        approvedCount,
        status: "error",
        error,
      });
      setMessage(error instanceof Error ? error.message : "Approval failed.");
    }
  }

  async function voidNumber() {
    const record = selectedPools.find((pool) => pool.id === voidForm.lrPoolId) ?? null;
    if (!record) {
      setMessage("Select a valid LR number to void.");
      return;
    }
    if (record.status !== "AVAILABLE") {
      setMessage("Only AVAILABLE LR numbers can be voided.");
      return;
    }
    if (!voidForm.reason.trim()) {
      setMessage("Enter a void reason.");
      return;
    }
    try {
      await lrManagementService.upsertPools([
        {
          ...record,
          status: "VOID",
          voidReason: voidForm.reason.trim(),
          updatedAt: new Date().toISOString(),
        },
      ]);
      await lrManagementService.appendAuditLog({
        actor: session.actorName,
        action: "voided LR",
        entityType: "lr_pool",
        entityName: record.lrNumber,
        tenantId: tenant.id,
        result: "warning",
      });
      setMessage(`Voided ${record.lrNumber}.`);
      setVoidOpen(false);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Void action failed.");
    }
  }

  if (!activeConfigs.length) {
    return (
      <TenantEmptyState
        title="No LR configuration found"
        description="Create an LR configuration first. LR Management derives every action from the saved LR setup."
        action={
          <Button asChild>
            <Link to={`/tenant/${tenant.id}/lr-config`}>Open LR Configuration</Link>
          </Button>
        }
      />
    );
  }

  const canCreatePool = requiresPool(selectedConfig);
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Administration"
        title="LR Management"
        description="Config-driven LR execution for pool creation, allocation, request flow, approvals, transfers, and number tracking."
        action={
          <Button asChild variant="outline">
            <Link to={`/tenant/${tenant.id}/lr-config`}>Open LR Configuration</Link>
          </Button>
        }
      />

      {message ? (
        <div className="rounded-2xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div>
      ) : null}

      <TenantPanel title="Active LR Configuration" description="Read-only setup reference for the LR operations below.">
        <div className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
            <div className="rounded-2xl border bg-slate-50/70 p-4">
              <p className="text-sm font-semibold">Selected Config</p>
              <div className="mt-3 grid gap-3">
                <div className="grid gap-2">
                  <label className="text-sm font-medium">Active LR Configuration</label>
                  <Select value={selectedConfigId} onChange={(event) => setSelectedConfigId(event.target.value)}>
                    {activeConfigs.map((config) => (
                      <option key={config.id} value={config.id}>
                        {getLrTypeLabel(config.lrType)} - {config.prefix || config.id} - {config.status}
                      </option>
                    ))}
                  </Select>
                </div>
                <p className="text-sm text-muted-foreground">
                  {getLrTypeLabel(selectedConfig?.lrType ?? "AUTO")} | {getModeLabel(selectedConfig)} | {selectedConfig ? formatPreview(selectedConfig) : "--"}
                </p>
                <p className="text-sm text-muted-foreground">
                  Customer ownership: {selectedConfig?.customerOwnershipEnabled ? "Enabled" : "Disabled"} | Consumption: {selectedConfig?.allocationFlow?.consumptionLevel ?? "TENANT"}
                </p>
                {isHierarchyConfig(selectedConfig) ? (
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">Selected Hierarchy</label>
                    <Select value={selectedHierarchyLevelId} onChange={(event) => setSelectedHierarchyLevelId(event.target.value)}>
                      {selectedConfigFlowLevels
                        .filter((level) => hierarchyOwners.some((orgUnit) => orgUnit.hierarchyLevelId === level.levelId))
                        .map((level) => (
                          <option key={level.levelId} value={level.levelId}>
                            {hierarchyLevelMap.get(level.levelId)?.name ?? level.levelId}
                          </option>
                        ))}
                    </Select>
                    <p className="text-sm text-muted-foreground">
                      Authority: {selectedHierarchyFlowLevel ? capabilitySummary(selectedHierarchyFlowLevel) : "No configured authority"}
                    </p>
                  </div>
                ) : null}
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <TenantSummaryCard label="Status" value={selectedConfig?.status === "active" ? "Active" : "Inactive"} helper="From LR Configuration" />
              <TenantSummaryCard
                label={isHierarchyConfig(selectedConfig) ? "Active Hierarchy" : "Next Auto LR"}
                value={
                  isHierarchyConfig(selectedConfig)
                    ? (hierarchyLevelMap.get(selectedHierarchyLevelId)?.name ?? "Select hierarchy")
                    : selectedConfig?.lrType === "AUTO"
                      ? nextAutoNumber ?? "--"
                      : "N/A"
                }
                helper={
                  isHierarchyConfig(selectedConfig)
                    ? `${scopedHierarchyOrgUnitIds.length} place(s) under this hierarchy`
                    : selectedConfig?.lrType === "AUTO"
                      ? `Counter ${selectedConfig.locationCounter ?? 0}`
                      : "Only for AUTO"
                }
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {visibleTabs.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={[
                  "rounded-2xl border px-4 py-2 text-sm transition",
                  activeTab === tab ? "border-sky-300 bg-sky-50 text-sky-900" : "border-slate-200 bg-white text-slate-700",
                ].join(" ")}
              >
                {getTabLabel(tab, selectedConfig?.lrType)}
              </button>
            ))}
          </div>
        </div>
      </TenantPanel>

      {activeTab === "overview" ? (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <TenantSummaryCard label="Total LR Numbers" value={String(totalCount)} helper={selectedConfig?.lrType === "AUTO" ? "Generated at vehicle assignment" : "Generated / uploaded pool"} />
            <TenantSummaryCard label="Available" value={String(availableCount)} helper={selectedConfig?.lrType === "AUTO" ? "AUTO does not keep manual pool balance" : "Ready for allocation or booking"} />
            <TenantSummaryCard label="Used" value={String(usedCount)} helper="Consumed in booking vehicle assignment" />
            <TenantSummaryCard label="Void" value={String(voidCount)} helper="Marked unavailable with reason" />
            <TenantSummaryCard label="Pending Requests" value={String(configRequests.filter((request) => request.status === "PENDING").length)} helper="Requests created from this place" />
            <TenantSummaryCard label="Pending Approvals" value={String(approvalQueue.length)} helper="Requests waiting on this place" />
          </div>

          {!totalCount ? (
            <TenantEmptyState
              title="No LR numbers generated yet"
              description="Start by creating or uploading LR numbers from the Generate / Upload tab."
              action={
                canCreatePool ? (
                  <Button onClick={() => { resetPoolForm(); setPoolOpen(true); }}>
                    <Upload className="mr-2 size-4" />
                    {getTabLabel("pool", selectedConfig?.lrType)}
                  </Button>
                ) : undefined
              }
            />
          ) : null}
        </div>
      ) : null}

      {activeTab === "numbers" ? (
        <TenantPanel title="LR Number List" description="Available, used, and void LR numbers for the selected configuration.">
          <div className="space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="text-sm text-muted-foreground">
              Search and filter actual LR numbers.
            </div>
            <div className="flex flex-wrap gap-2">
              {canCreatePool ? (
                <Button onClick={() => { resetPoolForm(); setPoolOpen(true); }}>
                  <Upload className="mr-2 size-4" />
                  Create / Upload Pool
                </Button>
              ) : null}
            </div>
          </div>
          <TenantFilterBar
            searchValue={search}
            searchPlaceholder="LR number, customer, owner, booking"
            onSearchChange={setSearch}
            filters={
              <>
                <Select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}>
                  <option value="ALL">All Status</option>
                  <option value="AVAILABLE">Available</option>
                  <option value="USED">Used</option>
                  <option value="VOID">Void</option>
                </Select>
                <Select value={customerFilter} onChange={(event) => setCustomerFilter(event.target.value)}>
                  <option value="ALL">All Customers</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>{customer.name}</option>
                  ))}
                </Select>
                <Select value={ownerFilter} onChange={(event) => setOwnerFilter(event.target.value)}>
                  <option value="ALL">All Owners</option>
                  <option value="TENANT">Tenant Pool</option>
                  {hierarchyOwners.map((orgUnit) => (
                    <option key={`ORG:${orgUnit.id}`} value={`ORG:${orgUnit.id}`}>{orgUnit.name}</option>
                  ))}
                </Select>
              </>
            }
          />
          {!totalCount ? (
            <TenantEmptyState
              title="No LR numbers generated yet"
              description="Start by creating or uploading LR numbers. Once created, they will appear here with AVAILABLE, USED, or VOID status."
              action={
                canCreatePool ? (
                  <Button onClick={() => { resetPoolForm(); setPoolOpen(true); }}>
                    <Upload className="mr-2 size-4" />
                    {getTabLabel("pool", selectedConfig?.lrType)}
                  </Button>
                ) : undefined
              }
            />
          ) : null}
          {totalCount ? (
            <>
              <div className="overflow-x-auto rounded-2xl border">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium text-slate-600">LR Number</th>
                      <th className="px-4 py-3 text-left font-medium text-slate-600">Status</th>
                      <th className="px-4 py-3 text-left font-medium text-slate-600">Customer</th>
                      <th className="px-4 py-3 text-left font-medium text-slate-600">Owner Level</th>
                      <th className="px-4 py-3 text-left font-medium text-slate-600">Owner</th>
                      <th className="px-4 py-3 text-left font-medium text-slate-600">Booking</th>
                      <th className="px-4 py-3 text-left font-medium text-slate-600">Delivery</th>
                      <th className="px-4 py-3 text-left font-medium text-slate-600">Created</th>
                      <th className="px-4 py-3 text-left font-medium text-slate-600">Used</th>
                      <th className="px-4 py-3 text-left font-medium text-slate-600">Void Reason</th>
                      <th className="px-4 py-3 text-left font-medium text-slate-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {pagedRows.map((row) => (
                      <tr key={row.id}>
                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-800">{row.lrNumber}</div>
                          <div className="text-xs text-muted-foreground">{row.lrType}</div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={row.status === "AVAILABLE" ? "accent" : row.status === "USED" ? "secondary" : "danger"}>{row.status}</Badge>
                        </td>
                        <td className="px-4 py-3">{customerMap.get(row.customerId ?? "")?.name ?? "--"}</td>
                        <td className="px-4 py-3">{getOwnerLevelName(row.ownerOrgUnitId, orgUnitMap, hierarchyLevelMap)}</td>
                        <td className="px-4 py-3">
                          {row.ownerOrgUnitId ? orgUnitMap.get(row.ownerOrgUnitId)?.name ?? row.ownerOrgUnitId : "Tenant Pool"}
                        </td>
                        <td className="px-4 py-3">
                          {row.bookingId ?? "--"}
                        </td>
                        <td className="px-4 py-3">{row.deliveryId ?? "--"}</td>
                        <td className="px-4 py-3">{new Date(row.createdAt).toLocaleDateString()}</td>
                        <td className="px-4 py-3">{row.usedAt ? new Date(row.usedAt).toLocaleDateString() : "--"}</td>
                        <td className="px-4 py-3">{row.voidReason ?? "--"}</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-2">
                            {row.source === "POOL" && row.status === "AVAILABLE" ? (
                              <>
                                <Button variant="outline" size="sm" onClick={() => { setVoidForm({ lrPoolId: row.id, reason: "" }); setVoidOpen(true); }}>
                                  Void
                                </Button>
                                {visibleTabs.includes("transfers") ? (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setTransferForm((current) => ({
                                        ...current,
                                        mode: "SPECIFIC",
                                        lrNumbers: row.lrNumber,
                                        sourceOrgUnitId: row.ownerOrgUnitId ?? "",
                                      }));
                                      setTransferOpen(true);
                                    }}
                                  >
                                    Transfer
                                  </Button>
                                ) : null}
                              </>
                            ) : (
                              <span className="text-xs text-muted-foreground">{row.voidReason ?? "View only"}</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {!filteredRows.length ? (
                      <tr>
                        <td colSpan={11} className="px-4 py-10 text-center text-sm text-muted-foreground">
                          No LR numbers match the current filter.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
              {filteredRows.length ? (
                <PaginationControls
                  page={numberPage}
                  pageSize={numberPageSize}
                  total={filteredRows.length}
                  onPageChange={setNumberPage}
                />
              ) : null}
              {selectedConfig?.lrType === "PRE_GENERATED" ? (
                <div className="space-y-3 rounded-2xl border bg-slate-50/60 p-4">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">Approved Assignments</h3>
                    <p className="text-sm text-muted-foreground">Shows what was assigned under this hierarchy and why.</p>
                  </div>
                  <div className="overflow-x-auto rounded-2xl border bg-white">
                    <table className="min-w-full divide-y divide-slate-200 text-sm">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-4 py-3 text-left font-medium text-slate-600">Assigned To</th>
                          <th className="px-4 py-3 text-left font-medium text-slate-600">Customer</th>
                          <th className="px-4 py-3 text-left font-medium text-slate-600">Approved</th>
                          <th className="px-4 py-3 text-left font-medium text-slate-600">Why Assigned</th>
                          <th className="px-4 py-3 text-left font-medium text-slate-600">Updated</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {approvedAssignmentRequests.map((request) => (
                          <tr key={`assignment-${request.id}`}>
                            <td className="px-4 py-3">{orgUnitMap.get(request.sourceOrgUnitId ?? "")?.name ?? request.branchName ?? "--"}</td>
                            <td className="px-4 py-3">{customerMap.get(request.customerId ?? "")?.name ?? "--"}</td>
                            <td className="px-4 py-3">{request.approvedCount}</td>
                            <td className="px-4 py-3">{request.note?.trim() || "--"}</td>
                            <td className="px-4 py-3">{new Date(request.updatedAt).toLocaleDateString()}</td>
                          </tr>
                        ))}
                        {!approvedAssignmentRequests.length ? (
                          <tr>
                            <td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">
                              No approved assignments found for this hierarchy yet.
                            </td>
                          </tr>
                        ) : null}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}
            </>
          ) : null}
          </div>
        </TenantPanel>
      ) : null}

      {activeTab === "pool" ? (
        <TenantPanel title={getTabLabel("pool", selectedConfig?.lrType)} description="Create, generate, or upload operational LR numbers here.">
          <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="text-sm text-muted-foreground">
              {selectedConfig?.lrType === "MANUAL"
                ? "Use range, CSV, or pasted list to create manual LR numbers."
                : "Use range, CSV, or pasted list to upload pre-generated LR numbers."}
            </div>
            <Button onClick={() => { resetPoolForm(); setPoolOpen(true); }}>
              <Plus className="mr-2 size-4" />
              New Pool
            </Button>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <TenantSummaryCard label="Input Modes" value="Range / CSV / List" helper="Numbers are validated against saved format" />
            <TenantSummaryCard label="Duplicates" value="Blocked" helper="Existing LR numbers cannot be created again" />
            <TenantSummaryCard label="Owner Binding" value={isHierarchyConfig(selectedConfig) ? "Node / User" : "Tenant"} helper={selectedConfig?.customerOwnershipEnabled ? "Customer link required when enabled" : "No customer link required"} />
          </div>
        </div>
      </TenantPanel>
      ) : null}

      {activeTab === "allocation" ? (
        <TenantPanel title="Allocation" description="Move AVAILABLE LR numbers to a permitted target owner or customer-linked pool.">
          <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="text-sm text-muted-foreground">Allocate AVAILABLE LR numbers from one place to another.</div>
            <Button onClick={() => {
              setAllocationForm((current) => ({
                ...current,
                sourceOrgUnitId: defaultOrgUnitForSelectedHierarchy || current.sourceOrgUnitId,
              }));
              setAllocationOpen(true);
            }}>
              <Shuffle className="mr-2 size-4" />
              Allocate LR
            </Button>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <TenantSummaryCard label="Available to Allocate" value={String(availableCount)} helper="USED and VOID LR cannot move" />
            <TenantSummaryCard label="Customer Ownership" value={selectedConfig?.customerOwnershipEnabled ? "Enabled" : "Disabled"} helper="Customer field appears only when allowed" />
            <TenantSummaryCard label="Hierarchy Rule" value={isHierarchyConfig(selectedConfig) ? "Enforced" : "Tenant Pool"} helper="Target must match configured child levels" />
          </div>
          </div>
        </TenantPanel>
      ) : null}

      {activeTab === "requests" ? (
        <TenantPanel title="Requests" description="Create and track LR requests from lower nodes to their parent owner.">
          <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="text-sm text-muted-foreground">Create a request when a place needs more LR numbers from its parent.</div>
            <Button onClick={() => {
              setRequestForm((current) => ({
                ...current,
                sourceOrgUnitId: defaultOrgUnitForSelectedHierarchy || current.sourceOrgUnitId,
              }));
              setRequestOpen(true);
            }}>
              <Plus className="mr-2 size-4" />
              New Request
            </Button>
          </div>
          <div className="overflow-x-auto rounded-2xl border">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Requester</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Parent</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Customer</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Requested</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Approved</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {pagedRequests.map((request) => (
                  <tr key={request.id}>
                    <td className="px-4 py-3">{orgUnitMap.get(request.sourceOrgUnitId ?? "")?.name ?? request.branchName ?? "--"}</td>
                    <td className="px-4 py-3">{orgUnitMap.get(request.targetOrgUnitId ?? "")?.name ?? "--"}</td>
                    <td className="px-4 py-3">{customerMap.get(request.customerId ?? "")?.name ?? "--"}</td>
                    <td className="px-4 py-3">{request.requestedCount}</td>
                    <td className="px-4 py-3">{request.approvedCount}</td>
                    <td className="px-4 py-3"><Badge variant={requestStatusBadge(request.status) as "success" | "warning" | "secondary" | "danger"}>{request.status}</Badge></td>
                    <td className="px-4 py-3">{new Date(request.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {configRequests.length ? (
            <PaginationControls
              page={requestPage}
              pageSize={requestPageSize}
              total={configRequests.length}
              onPageChange={setRequestPage}
            />
          ) : null}
          </div>
        </TenantPanel>
      ) : null}

      {activeTab === "approvals" ? (
        <TenantPanel title="Approvals" description="Approve full or partial requests from the parent owner pool.">
          <div className="space-y-4">
          <div className="text-sm text-muted-foreground">Open a request, review it, then approve or reject it.</div>
          <div className="overflow-x-auto rounded-2xl border">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Requester</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Requested</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Customer</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {pagedApprovals.map((request) => (
                  <tr key={request.id}>
                    <td className="px-4 py-3">{orgUnitMap.get(request.sourceOrgUnitId ?? "")?.name ?? request.branchName ?? "--"}</td>
                    <td className="px-4 py-3">{request.requestedCount}</td>
                    <td className="px-4 py-3">{customerMap.get(request.customerId ?? "")?.name ?? "--"}</td>
                    <td className="px-4 py-3"><Badge variant="warning">{request.status}</Badge></td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <Button variant="outline" size="sm" onClick={() => openApprovalDialog(request)}>
                          Approve
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => rejectPendingRequest(request.id)}>
                          Reject
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!approvalQueue.length ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-sm text-muted-foreground">
                      No pending approvals for this configuration.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
          {approvalQueue.length ? (
            <PaginationControls
              page={approvalPage}
              pageSize={approvalPageSize}
              total={approvalQueue.length}
              onPageChange={setApprovalPage}
            />
          ) : null}
          </div>
        </TenantPanel>
      ) : null}

      {activeTab === "transfers" ? (
        <TenantPanel title="Transfers" description="Transfer AVAILABLE LR numbers while preserving ownership history.">
          <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="text-sm text-muted-foreground">Transfer AVAILABLE LR numbers between places.</div>
            <Button onClick={() => {
              setTransferForm((current) => ({
                ...current,
                sourceOrgUnitId: defaultOrgUnitForSelectedHierarchy || current.sourceOrgUnitId,
              }));
              setTransferOpen(true);
            }}>
              <Repeat className="mr-2 size-4" />
              Transfer LR
            </Button>
          </div>
          <div className="overflow-x-auto rounded-2xl border">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">From</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">To</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Customer</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Count</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Completed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {pagedTransfers.map((transfer) => (
                  <tr key={transfer.id}>
                    <td className="px-4 py-3">{orgUnitMap.get(transfer.fromOrgUnitId ?? "")?.name ?? "--"}</td>
                    <td className="px-4 py-3">{orgUnitMap.get(transfer.toOrgUnitId ?? "")?.name ?? "--"}</td>
                    <td className="px-4 py-3">{customerMap.get(transfer.customerId ?? "")?.name ?? "--"}</td>
                    <td className="px-4 py-3">{transfer.lrIds.length}</td>
                    <td className="px-4 py-3"><Badge variant={transfer.status === "COMPLETED" ? "accent" : "secondary"}>{transfer.status}</Badge></td>
                    <td className="px-4 py-3">{transfer.completedAt ? new Date(transfer.completedAt).toLocaleDateString() : "--"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {scopedTransfers.length ? (
            <PaginationControls
              page={transferPage}
              pageSize={transferPageSize}
              total={scopedTransfers.length}
              onPageChange={setTransferPage}
            />
          ) : null}
          </div>
        </TenantPanel>
      ) : null}

      {activeTab === "audit" ? (
        <TenantPanel title="Used / Void / Audit" description="Operational closure view for consumed LR, voided LR, and audit activity.">
          <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <TenantSummaryCard label="Used LR" value={String(usedCount)} helper="Linked to booking and delivery" />
            <TenantSummaryCard label="Void LR" value={String(voidCount)} helper="Blocked from booking consumption" />
            <TenantSummaryCard label="Audit Events" value={String(matchingAudit.length)} helper="Pool, allocation, request, transfer, booking usage" />
          </div>
          <div className="overflow-x-auto rounded-2xl border">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Action</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Actor</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Entity</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Result</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {matchingAudit.map((entry) => (
                  <tr key={entry.id}>
                    <td className="px-4 py-3">{entry.action}</td>
                    <td className="px-4 py-3">{entry.actor}</td>
                    <td className="px-4 py-3">{entry.entityName}</td>
                    <td className="px-4 py-3"><Badge variant={entry.result === "success" ? "accent" : entry.result === "warning" ? "warning" : "danger"}>{entry.result}</Badge></td>
                    <td className="px-4 py-3">{new Date(entry.timestamp).toLocaleString()}</td>
                  </tr>
                ))}
                {!matchingAudit.length ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-sm text-muted-foreground">
                      No LR audit entries found yet.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
          </div>
        </TenantPanel>
      ) : null}

      <Dialog
        open={poolOpen}
        onOpenChange={setPoolOpen}
        title="Create / Upload LR Pool"
        description="Use the saved LR format and ownership rules from the selected configuration."
        widthClassName="max-w-3xl"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setPoolOpen(false)}>Cancel</Button>
            <Button onClick={createPool}>{isCustomerLrConfig ? "Create Customer Reserved LR" : "Save Pool"}</Button>
          </div>
        }
      >
        <div className="grid gap-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Input Mode">
              <Select value={poolForm.mode} onChange={(event) => setPoolForm((current) => ({ ...current, mode: event.target.value as PoolFormState["mode"] }))}>
                <option value="RANGE">Range</option>
                <option value="CSV">CSV Upload / Paste</option>
                <option value="LIST">Paste List</option>
              </Select>
            </Field>
            {selectedConfig?.customerOwnershipEnabled ? (
              <Field label="Customer">
                <Select value={poolForm.customerId} onChange={(event) => setPoolForm((current) => ({ ...current, customerId: event.target.value }))}>
                  <option value="">Select customer</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>{customer.name}</option>
                  ))}
                </Select>
              </Field>
            ) : null}
            {isCustomerLrConfig ? (
              <Field label="Place / Owning Place">
                <Select value={poolForm.ownerOrgUnitId} onChange={(event) => setPoolForm((current) => ({ ...current, ownerOrgUnitId: event.target.value }))}>
                  <option value="">Select place</option>
                  {customerLrPlaceOptions.map((orgUnit) => (
                    <option key={orgUnit.id} value={orgUnit.id}>
                      {orgUnit.name}
                      {hierarchyLevelMap.get(orgUnit.hierarchyLevelId)?.name ? ` · ${hierarchyLevelMap.get(orgUnit.hierarchyLevelId)?.name}` : ""}
                    </option>
                  ))}
                </Select>
                {poolForm.ownerOrgUnitId ? (
                  <p className="mt-1 text-xs font-medium text-slate-600">
                    Selected Place: {buildPlacePath(poolForm.ownerOrgUnitId).join(" → ") || "—"}
                  </p>
                ) : null}
                <p className="mt-1 text-xs text-muted-foreground">
                  Customer LR will be available only for bookings of this customer within the selected place scope.
                </p>
              </Field>
            ) : isHierarchyConfig(selectedConfig) ? (
              <Field label="Owner Node">
                <Select value={poolForm.ownerOrgUnitId} onChange={(event) => setPoolForm((current) => ({ ...current, ownerOrgUnitId: event.target.value }))}>
                  <option value="">Select owner node</option>
                  {hierarchyOwners
                    .filter((orgUnit) => !selectedHierarchyLevelId || orgUnit.hierarchyLevelId === selectedHierarchyLevelId)
                    .map((orgUnit) => (
                    <option key={orgUnit.id} value={orgUnit.id}>{orgUnit.name}</option>
                  ))}
                </Select>
              </Field>
            ) : null}
            {isCustomerLrConfig ? (
              <Field label="Pool Type">
                <Input value="Customer Reserved" disabled />
              </Field>
            ) : null}
          </div>
          {poolForm.mode === "RANGE" ? (
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Sequence Start">
                <Input value={poolForm.rangeStart} onChange={(event) => setPoolForm((current) => ({ ...current, rangeStart: event.target.value }))} />
              </Field>
              <Field label="Sequence End">
                <Input value={poolForm.rangeEnd} onChange={(event) => setPoolForm((current) => ({ ...current, rangeEnd: event.target.value }))} />
              </Field>
            </div>
          ) : (
            <Field label={poolForm.mode === "CSV" ? "CSV / Text Values" : "LR Number List"}>
              <textarea
                className="min-h-[180px] rounded-2xl border bg-white px-3 py-2 text-sm outline-none transition focus:border-sky-300"
                value={poolForm.poolEntries}
                onChange={(event) => setPoolForm((current) => ({ ...current, poolEntries: event.target.value }))}
              />
            </Field>
          )}
          <Field label="Remarks">
            <Input value={poolForm.remarks} onChange={(event) => setPoolForm((current) => ({ ...current, remarks: event.target.value }))} />
          </Field>
          {isCustomerLrConfig ? (() => {
            const start = Number(poolForm.rangeStart);
            const end = Number(poolForm.rangeEnd);
            const validRange =
              poolForm.mode === "RANGE" && Number.isFinite(start) && Number.isFinite(end) && end >= start && Boolean(selectedConfig);
            const range = validRange && selectedConfig ? buildRangeValues(selectedConfig, start, end) : [];
            const customerName = customers.find((customer) => customer.id === poolForm.customerId)?.name ?? "—";
            const placeName = poolForm.ownerOrgUnitId ? orgUnitMap.get(poolForm.ownerOrgUnitId)?.name ?? "—" : "—";
            const ready = Boolean(poolForm.customerId && poolForm.ownerOrgUnitId && range.length);
            return (
              <div className="rounded-2xl border border-sky-200 bg-sky-50/60 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-sky-700">Customer Reserved LR — Preview</p>
                <div className="mt-2 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
                  <div><p className="text-slate-500">Customer</p><p className="font-semibold text-slate-800">{customerName}</p></div>
                  <div><p className="text-slate-500">Place</p><p className="font-semibold text-slate-800">{placeName}</p></div>
                  <div><p className="text-slate-500">Pool Type</p><p className="font-semibold text-slate-800">Customer Reserved</p></div>
                  <div><p className="text-slate-500">LR Range</p><p className="font-semibold text-slate-800">{range.length ? `${range[0]} → ${range[range.length - 1]}` : "—"}</p></div>
                  <div><p className="text-slate-500">Count</p><p className="font-semibold text-slate-800">{range.length || "—"}</p></div>
                  <div><p className="text-slate-500">Status</p><p className={`font-semibold ${ready ? "text-emerald-600" : "text-slate-500"}`}>{ready ? "Ready to create" : "Incomplete"}</p></div>
                </div>
              </div>
            );
          })() : null}
          <div className="rounded-2xl border bg-slate-50/70 p-4 text-sm text-muted-foreground">
            Format preview: {selectedConfig ? formatPreview(selectedConfig) : "--"}
          </div>
        </div>
      </Dialog>

      <Dialog
        open={allocationOpen}
        onOpenChange={setAllocationOpen}
        title="Allocate LR"
        description="Move AVAILABLE LR numbers to a permitted target owner or customer."
        widthClassName="max-w-3xl"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setAllocationOpen(false)}>Cancel</Button>
            <Button onClick={() => allocatePool("allocation")}>Allocate</Button>
          </div>
        }
      >
        <AllocationFields
          config={selectedConfig}
          form={allocationForm}
          setForm={setAllocationForm}
          hierarchyOwners={hierarchyOwners}
          selectedHierarchyLevelId={selectedHierarchyLevelId}
          customers={customers}
        />
      </Dialog>

      <Dialog
        open={requestOpen}
        onOpenChange={setRequestOpen}
        title="Create LR Request"
        description="Raise an LR request from the selected node to its parent owner."
        widthClassName="max-w-2xl"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setRequestOpen(false)}>Cancel</Button>
            <Button onClick={submitRequest}>Create Request</Button>
          </div>
        }
      >
        <div className="grid gap-4">
          <Field label="Requester Node">
            <Select value={requestForm.sourceOrgUnitId} onChange={(event) => setRequestForm((current) => ({ ...current, sourceOrgUnitId: event.target.value }))}>
              <option value="">Select requester node</option>
              {hierarchyOwners.filter((orgUnit) => (!selectedHierarchyLevelId || orgUnit.hierarchyLevelId === selectedHierarchyLevelId)).map((orgUnit) => {
                const flowLevel = getSourceLevel(orgUnit.id);
                return flowLevel?.canRequestQuota ? (
                  <option key={orgUnit.id} value={orgUnit.id}>{orgUnit.name}</option>
                ) : null;
              })}
            </Select>
          </Field>
          {selectedConfig?.customerOwnershipEnabled ? (
            <Field label="Customer">
              <Select value={requestForm.customerId} onChange={(event) => setRequestForm((current) => ({ ...current, customerId: event.target.value }))}>
                <option value="">Select customer</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>{customer.name}</option>
                ))}
              </Select>
            </Field>
          ) : null}
          <Field label="Requested Count">
            <Input value={requestForm.requestedCount} onChange={(event) => setRequestForm((current) => ({ ...current, requestedCount: event.target.value }))} />
          </Field>
          <Field label="Remarks">
            <Input value={requestForm.remarks} onChange={(event) => setRequestForm((current) => ({ ...current, remarks: event.target.value }))} />
          </Field>
        </div>
      </Dialog>

      <Dialog
        open={approvalOpen}
        onOpenChange={setApprovalOpen}
        title="Approve LR Request"
        description="Approve full or partial LR volume from the parent owner pool."
        widthClassName="max-w-2xl"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setApprovalOpen(false)}>Cancel</Button>
            <Button onClick={submitApproval}>Approve</Button>
          </div>
        }
      >
        <div className="grid gap-4">
          <Field label="Requester">
            <div className="rounded-2xl border bg-slate-50 px-3 py-2 text-sm">
              {orgUnitMap.get(selectedApprovalRequest?.sourceOrgUnitId ?? "")?.name ?? selectedApprovalRequest?.branchName ?? "--"}
            </div>
          </Field>
          <Field label="Parent">
            <div className="rounded-2xl border bg-slate-50 px-3 py-2 text-sm">
              {orgUnitMap.get(selectedApprovalRequest?.targetOrgUnitId ?? "")?.name ?? "--"}
            </div>
          </Field>
          <Field label="Requested">
            <div className="rounded-2xl border bg-slate-50 px-3 py-2 text-sm">
              {selectedApprovalRequest?.requestedCount ?? "--"}
            </div>
          </Field>
          <Field label="Approved Count">
            <Input
              value={approvalForm.approvedCount}
              onChange={(event) => setApprovalForm((current) => ({ ...current, approvedCount: event.target.value }))}
            />
          </Field>
          <Field label="Remarks">
            <Input
              value={approvalForm.remarks}
              onChange={(event) => setApprovalForm((current) => ({ ...current, remarks: event.target.value }))}
            />
          </Field>
        </div>
      </Dialog>

      <Dialog
        open={transferOpen}
        onOpenChange={setTransferOpen}
        title="Transfer LR"
        description="Transfer AVAILABLE LR numbers between permitted owners while preserving audit history."
        widthClassName="max-w-3xl"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setTransferOpen(false)}>Cancel</Button>
            <Button onClick={() => allocatePool("transfer")}>Transfer</Button>
          </div>
        }
      >
        <AllocationFields
          config={selectedConfig}
          form={transferForm}
          setForm={setTransferForm}
          hierarchyOwners={hierarchyOwners}
          selectedHierarchyLevelId={selectedHierarchyLevelId}
          customers={customers}
        />
      </Dialog>

      <Dialog
        open={voidOpen}
        onOpenChange={setVoidOpen}
        title="Void LR Number"
        description="Only AVAILABLE LR numbers can be voided."
        widthClassName="max-w-xl"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setVoidOpen(false)}>Cancel</Button>
            <Button variant="outline" onClick={voidNumber}>Void LR</Button>
          </div>
        }
      >
        <div className="grid gap-4">
          <Field label="Void Reason">
            <Input value={voidForm.reason} onChange={(event) => setVoidForm((current) => ({ ...current, reason: event.target.value }))} />
          </Field>
        </div>
      </Dialog>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-2">
      <label className="text-sm font-medium">{label}</label>
      {children}
    </div>
  );
}

function PaginationControls({
  page,
  pageSize,
  total,
  onPageChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  return (
    <div className="flex items-center justify-between rounded-2xl border bg-white px-4 py-3 text-sm">
      <span className="text-muted-foreground">
        Page {page} of {pageCount} | Total {total}
      </span>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={() => onPageChange(Math.max(1, page - 1))} disabled={page <= 1}>
          Previous
        </Button>
        <Button variant="outline" size="sm" onClick={() => onPageChange(Math.min(pageCount, page + 1))} disabled={page >= pageCount}>
          Next
        </Button>
      </div>
    </div>
  );
}

function AllocationFields({
  config,
  form,
  setForm,
  hierarchyOwners,
  selectedHierarchyLevelId,
  customers,
}: {
  config: TenantLRConfig | null;
  form: AllocationFormState | TransferFormState;
  setForm: React.Dispatch<React.SetStateAction<AllocationFormState>> | React.Dispatch<React.SetStateAction<TransferFormState>>;
  hierarchyOwners: OrgUnit[];
  selectedHierarchyLevelId: string;
  customers: Array<{ id: string; name: string }>;
}) {
  return (
    <div className="grid gap-4">
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Selection Mode">
          <Select value={form.mode} onChange={(event) => setForm((current) => ({ ...current, mode: event.target.value as "COUNT" | "SPECIFIC" }))}>
            <option value="COUNT">Count</option>
            <option value="SPECIFIC">Specific LR Numbers</option>
          </Select>
        </Field>
        {config?.customerOwnershipEnabled ? (
          <Field label="Customer">
            <Select value={form.customerId} onChange={(event) => setForm((current) => ({ ...current, customerId: event.target.value }))}>
              <option value="">Select customer</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>{customer.name}</option>
              ))}
            </Select>
          </Field>
        ) : null}
        {isHierarchyConfig(config) ? (
          <>
            <Field label="From Owner Node">
              <Select value={form.sourceOrgUnitId} onChange={(event) => setForm((current) => ({ ...current, sourceOrgUnitId: event.target.value }))}>
                <option value="">Select source node</option>
                {hierarchyOwners.filter((orgUnit) => (!selectedHierarchyLevelId || orgUnit.hierarchyLevelId === selectedHierarchyLevelId)).map((orgUnit) => (
                  <option key={orgUnit.id} value={orgUnit.id}>{orgUnit.name}</option>
                ))}
              </Select>
            </Field>
            <Field label="To Owner Node">
              <Select value={form.targetOrgUnitId} onChange={(event) => setForm((current) => ({ ...current, targetOrgUnitId: event.target.value }))}>
                <option value="">Select target node</option>
                {hierarchyOwners.map((orgUnit) => (
                  <option key={orgUnit.id} value={orgUnit.id}>{orgUnit.name}</option>
                ))}
              </Select>
            </Field>
          </>
        ) : null}
      </div>
      {form.mode === "COUNT" ? (
        <Field label="Count">
          <Input value={form.count} onChange={(event) => setForm((current) => ({ ...current, count: event.target.value }))} />
        </Field>
      ) : (
        <Field label="LR Numbers">
          <textarea
            className="min-h-[140px] rounded-2xl border bg-white px-3 py-2 text-sm outline-none transition focus:border-sky-300"
            value={form.lrNumbers}
            onChange={(event) => setForm((current) => ({ ...current, lrNumbers: event.target.value }))}
          />
        </Field>
      )}
      <Field label="Remarks">
        <Input value={form.remarks} onChange={(event) => setForm((current) => ({ ...current, remarks: event.target.value }))} />
      </Field>
    </div>
  );
}
