import { useEffect, useMemo, useState, type ReactNode } from "react";
import { AlertTriangle, ArrowRightLeft, FileClock, Package } from "lucide-react";
import { PageHeader } from "@/shared/components/common/page-header";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Select } from "@/shared/components/ui/select";
import { Tabs } from "@/shared/components/ui/tabs";
import { Textarea } from "@/shared/components/ui/textarea";
import {
  TenantEmptyState,
  TenantFilterBar,
  TenantPanel,
  TenantSummaryCard,
} from "@/modules/tenant-admin/components/tenant-primitives";
import { useManualLrContext } from "@/modules/tenant-admin/hooks/useManualLrContext";
import { useTenantLrManagementService } from "@/modules/tenant-admin/hooks/useTenantLrManagementService";
import { useTenantOrgTypes } from "@/modules/tenant-admin/hooks/useTenantOrgTypes";
import { useTenantOrgUnits } from "@/modules/tenant-admin/hooks/useTenantOrgUnits";
import { useTenantRouteContext } from "@/modules/tenant-admin/hooks/useTenantRouteContext";
import {
  buildManualLrNumber,
  buildManualLrPreview,
  buildManualLrRegex,
  getManualLrStatusTone,
  getManualLrUiStatus,
  getNextManualLrSequence,
  manualLrTabDefinitions,
  parseManualLrInput,
  resolveManualLrFormat,
  resolveManualLrFormatForOrgUnit,
} from "@/modules/tenant-admin/lib/manual-lr";
import { useSessionContext } from "@/shared/auth/session-context";
import { useAppStore } from "@/shared/store/useAppStore";
import type {
  TenantLrAllocationRequestRecord,
  TenantLrPoolRecord,
  TenantLrPoolType,
} from "@/modules/tms/booking/types";
import type { OrgUnit } from "@/types/access";

type UploadMode = "RANGE" | "BULK" | "SINGLE";

export function TenantManualLrOperationsPage() {
  const { tenant } = useTenantRouteContext();
  const {
    access,
    activeConfig,
    currentRole,
    currentUser,
    assignedLevel,
    assignedOrgUnits,
    availableActiveOrgUnits,
    activeOrgUnit,
    managedLevelId,
    currentLevelGovernanceRule,
    managedChildGovernanceRule,
    consumablePoolContext,
    setActiveOrgUnit,
    canRunWorkflowAction,
  } = useManualLrContext();
  const { session } = useSessionContext();
  const { data: hierarchyLevels } = useTenantOrgTypes(tenant.id);
  const { data: orgUnits } = useTenantOrgUnits(tenant.id);
  const store = useAppStore(tenant.id);
  const lrManagement = useTenantLrManagementService();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [inventoryView, setInventoryView] = useState<"ACTIVE_PLACE" | "ASSIGNED_SCOPE">("ASSIGNED_SCOPE");
  const [uploadMode, setUploadMode] = useState<UploadMode>("RANGE");
  const [rangeStart, setRangeStart] = useState("1");
  const [rangeEnd, setRangeEnd] = useState("25");
  const [bulkNumbers, setBulkNumbers] = useState("");
  const [singleNumber, setSingleNumber] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [selectedPoolType, setSelectedPoolType] = useState<TenantLrPoolType>("GENERAL");
  const [allocationPoolType, setAllocationPoolType] = useState<TenantLrPoolType>("GENERAL");
  const [allocationDestinationId, setAllocationDestinationId] = useState("");
  const [allocationCount, setAllocationCount] = useState("10");
  const [requestCount, setRequestCount] = useState("50");
  const [requestReason, setRequestReason] = useState("");
  const [transferDestinationId, setTransferDestinationId] = useState("");
  const [transferCount, setTransferCount] = useState("10");
  const [transferReason, setTransferReason] = useState("");
  const [voidPoolId, setVoidPoolId] = useState("");
  const [voidStatus, setVoidStatus] = useState<"VOID" | "LOST" | "DAMAGED">("VOID");
  const [voidReason, setVoidReason] = useState("");
  const [inventoryPoolTypeFilter, setInventoryPoolTypeFilter] = useState<"ALL" | TenantLrPoolType>("ALL");
  const [inventoryCustomerFilter, setInventoryCustomerFilter] = useState("ALL");
  const [inventoryPlaceFilter, setInventoryPlaceFilter] = useState("ALL");
  const [inventoryStatusFilter, setInventoryStatusFilter] = useState("ALL");
  const [reservedCustomerId, setReservedCustomerId] = useState("");
  const [reservedDestinationId, setReservedDestinationId] = useState("");
  const [reservedStartPoolId, setReservedStartPoolId] = useState("");
  const [reservedEndPoolId, setReservedEndPoolId] = useState("");

  const ownershipLevelName =
    activeConfig?.ownershipLevelId
      ? hierarchyLevels.find((level) => level.id === activeConfig.ownershipLevelId)?.name ?? activeConfig.ownershipLevelId
      : null;
  const orgUnitMap = useMemo(() => new Map(orgUnits.map((item) => [item.id, item])), [orgUnits]);
  const ownershipOrgUnits = useMemo(
    () =>
      activeConfig?.ownershipLevelId
        ? orgUnits.filter((unit) => unit.hierarchyLevelId === activeConfig.ownershipLevelId)
        : [],
    [activeConfig?.ownershipLevelId, orgUnits],
  );
  const managedDestinationOrgUnits = useMemo(() => {
    if (!managedLevelId) {
      return ownershipOrgUnits;
    }
    if (!activeOrgUnit) {
      return orgUnits.filter((unit) => unit.hierarchyLevelId === managedLevelId);
    }
    return orgUnits.filter(
      (unit) => unit.hierarchyLevelId === managedLevelId && unit.parentOrgUnitId === activeOrgUnit.id,
    );
  }, [activeOrgUnit, managedLevelId, orgUnits, ownershipOrgUnits]);
  // Pre-generated / Customer LR place governance (isolated — does NOT affect the
  // Manual allocation/transfer dropdowns, which keep using managedDestinationOrgUnits).
  // Scope = the user's active place + ALL its child places (descendants). Never a
  // parent or unrelated place. Company Root / no active place => every place.
  const reservedDestinationOptions = useMemo(() => {
    const childrenOf = new Map<string, OrgUnit[]>();
    orgUnits.forEach((unit) => {
      if (!unit.parentOrgUnitId) return;
      const list = childrenOf.get(unit.parentOrgUnitId) ?? [];
      list.push(unit);
      childrenOf.set(unit.parentOrgUnitId, list);
    });
    let scopedIds: Set<string>;
    if (activeOrgUnit) {
      scopedIds = new Set<string>();
      const queue = [activeOrgUnit.id];
      while (queue.length) {
        const id = queue.shift();
        if (!id || scopedIds.has(id)) continue;
        scopedIds.add(id);
        (childrenOf.get(id) ?? []).forEach((child) => queue.push(child.id));
      }
    } else {
      scopedIds = new Set(orgUnits.map((unit) => unit.id));
    }
    return orgUnits
      .filter((unit) => unit.status !== "planned" && scopedIds.has(unit.id))
      .slice()
      .sort((left, right) => left.name.localeCompare(right.name))
      .map((unit) => ({ id: unit.id, name: unit.name }));
  }, [activeOrgUnit, orgUnits]);
  const visibleTabs = manualLrTabDefinitions.filter((tab) => {
    if (!["inventory", "reserved", "allocation", "requests", "transfer"].includes(tab.key)) {
      return false;
    }
    if (tab.key === "allocation") {
      return canRunWorkflowAction("ALLOCATE_LR");
    }
    if (tab.key === "transfer") {
      return canRunWorkflowAction("TRANSFER_LR");
    }
    if (!tab.action) {
      return access.canViewPage("LR_DASHBOARD");
    }
    return canRunWorkflowAction(tab.action);
  });
  const canSubmitRequest = Boolean(assignedLevel && currentLevelGovernanceRule?.childCanRequestLr);
  const canProcessRequests = Boolean(
    canRunWorkflowAction("ALLOCATE_LR") || canRunWorkflowAction("APPROVE_LR"),
  );
  const canActOnRequest = (request: TenantLrAllocationRequestRecord) => {
    if (!canProcessRequests || request.status !== "PENDING") {
      return false;
    }
    if (!activeOrgUnit) {
      return !request.targetOrgUnitId;
    }
    return request.targetOrgUnitId === activeOrgUnit.id;
  };
  const selectedTab = visibleTabs.find((tab) => tab.key === activeTab) ?? visibleTabs[0] ?? null;
  const requiresExplicitPlace = availableActiveOrgUnits.length > 1 && !session.activeTenantOrgUnitId;
  const assignedOrgUnitIds = assignedOrgUnits.map((orgUnit) => orgUnit.id);
  // Visible-ownership expansion: a parent sees every pool owned by its
  // descendants too. South-Region sees its own pools AND every pool owned
  // by Bangalore-Branch / Hub / sub-branch below it. Company Root sees
  // every pool in the tenant. Branch users still see only their own
  // pools because they have no descendants.
  const visibleOwnershipOrgUnitIds = useMemo(() => {
    if (!assignedOrgUnitIds.length) return [] as string[];
    const childrenOf = new Map<string, OrgUnit[]>();
    orgUnits.forEach((unit) => {
      if (!unit.parentOrgUnitId) return;
      const list = childrenOf.get(unit.parentOrgUnitId) ?? [];
      list.push(unit);
      childrenOf.set(unit.parentOrgUnitId, list);
    });
    const seen = new Set<string>();
    const queue = [...assignedOrgUnitIds];
    while (queue.length) {
      const id = queue.shift();
      if (!id || seen.has(id)) continue;
      seen.add(id);
      (childrenOf.get(id) ?? []).forEach((child) => queue.push(child.id));
    }
    return Array.from(seen);
  }, [assignedOrgUnitIds, orgUnits]);

  const scopedManualPools = useMemo(
    () => {
      const result = store.lrPools.filter(
        (pool) =>
          pool.configId === activeConfig?.id &&
          (!visibleOwnershipOrgUnitIds.length ||
            pool.ownerLevelId == null ||
            visibleOwnershipOrgUnitIds.includes(pool.ownerLevelId)),
      );
      if (!result.length && store.lrPools.length > 0) {
        // eslint-disable-next-line no-console
        console.warn("[LR INVENTORY] Pools exist in store but filtered out", {
          activeConfigId: activeConfig?.id ?? null,
          assignedOrgUnitIds,
          visibleOwnershipOrgUnitIds,
          activeOrgUnitId: activeOrgUnit?.id ?? null,
          totalPoolsInStore: store.lrPools.length,
          sampleStorePool: store.lrPools[0] && {
            configId: store.lrPools[0].configId,
            ownerLevelId: store.lrPools[0].ownerLevelId,
            currentPlaceId: store.lrPools[0].currentPlaceId,
            tenantId: store.lrPools[0].tenantId,
            lrNumber: store.lrPools[0].lrNumber,
          },
        });
      }
      return result;
    },
    [activeConfig?.id, assignedOrgUnitIds, visibleOwnershipOrgUnitIds, store.lrPools, activeOrgUnit?.id],
  );
  const manualPools = useMemo(
    () =>
      scopedManualPools.filter(
        (pool) =>
          (!activeOrgUnit || (pool.currentPlaceId ?? pool.ownerPlaceId ?? pool.ownerLevelId) === activeOrgUnit.id || (pool.currentPlaceId ?? pool.ownerPlaceId ?? pool.ownerLevelId) == null),
      ),
    [activeOrgUnit, scopedManualPools],
  );
  const allManualPools = useMemo(
    () => store.lrPools.filter((pool) => pool.configId === activeConfig?.id),
    [activeConfig?.id, store.lrPools],
  );
  const availablePools = manualPools.filter((pool) => ["AVAILABLE", "ALLOCATED"].includes(pool.status));
  const availablePoolsForSelection = availablePools.filter((pool) => {
    const poolType = pool.poolType ?? (pool.customerId ? "CUSTOMER_RESERVED" : "GENERAL");
    if (poolType !== allocationPoolType) {
      return false;
    }
    if (allocationPoolType === "CUSTOMER_RESERVED") {
      return pool.customerId === (selectedCustomerId || null);
    }
    return !pool.customerId;
  });
  // Start LR / End LR for Customer-reserved creation follow the SELECTED
  // "Place / Owning Place" — show that place's own GENERAL manual LR stock
  // (sourced from the in-scope pools, so a child branch's stock is included).
  // Falls back to the active place when no place is explicitly selected.
  const reservedPlaceId = reservedDestinationId || activeOrgUnit?.id || "";
  const availableGeneralPoolsAtActivePlace = scopedManualPools
    .filter(
      (pool) =>
        ["AVAILABLE", "ALLOCATED"].includes(pool.status) &&
        (pool.poolType ?? (pool.customerId ? "CUSTOMER_RESERVED" : "GENERAL")) === "GENERAL" &&
        !pool.customerId &&
        (pool.currentPlaceId ?? pool.ownerPlaceId ?? pool.ownerLevelId) === reservedPlaceId,
    )
    .sort((left, right) => left.lrNumber.localeCompare(right.lrNumber));
  // Reset the Start/End LR selection when the owning place changes, so stale
  // picks from a different place don't linger in the dropdowns.
  useEffect(() => {
    setReservedStartPoolId("");
    setReservedEndPoolId("");
  }, [reservedPlaceId]);
  const reservedStartIndex = availableGeneralPoolsAtActivePlace.findIndex((pool) => pool.id === reservedStartPoolId);
  const reservedEndIndex = availableGeneralPoolsAtActivePlace.findIndex((pool) => pool.id === reservedEndPoolId);
  const reservedSelectedCount =
    reservedStartIndex >= 0 && reservedEndIndex >= 0 && reservedEndIndex >= reservedStartIndex
      ? reservedEndIndex - reservedStartIndex + 1
      : 0;
  const inventoryPools = inventoryView === "ACTIVE_PLACE" ? manualPools : scopedManualPools;
  const consumedPools = inventoryPools.filter((pool) => pool.status === "USED");
  const filteredPools = inventoryPools.filter((pool) => {
    const poolType = pool.poolType ?? (pool.customerId ? "CUSTOMER_RESERVED" : "GENERAL");
    const currentPlaceId = pool.currentPlaceId ?? pool.ownerPlaceId ?? pool.ownerLevelId ?? "";
    if (inventoryPoolTypeFilter !== "ALL" && poolType !== inventoryPoolTypeFilter) {
      return false;
    }
    if (inventoryCustomerFilter !== "ALL" && (pool.customerId ?? "") !== inventoryCustomerFilter) {
      return false;
    }
    if (inventoryPlaceFilter !== "ALL" && currentPlaceId !== inventoryPlaceFilter) {
      return false;
    }
    if (inventoryStatusFilter !== "ALL" && pool.status !== inventoryStatusFilter) {
      return false;
    }
    const query = search.trim().toLowerCase();
    if (!query) {
      return true;
    }
    return [
      pool.lrNumber,
      poolType,
      orgUnitMap.get(currentPlaceId)?.name ?? "",
      pool.createdBy ?? "",
      pool.bookingId ?? "",
      pool.deliveryId ?? "",
      pool.customerId ?? "",
      pool.status,
    ]
      .join(" ")
      .toLowerCase()
      .includes(query);
  });
  const relevantRequests = store.lrRequests.filter(
    (request) =>
      request.configId === activeConfig?.id &&
      (!activeOrgUnit ||
        request.sourceOrgUnitId === activeOrgUnit.id ||
        request.targetOrgUnitId === activeOrgUnit.id),
  );
  // Hierarchy context for the current view — parent unit + immediate
  // children of the active place. Used by the context strip and the
  // parent-side allocation summary so users can see where they sit in
  // the chain without leaving the LR page.
  const parentOrgUnit = useMemo(
    () => (activeOrgUnit?.parentOrgUnitId ? orgUnitMap.get(activeOrgUnit.parentOrgUnitId) ?? null : null),
    [activeOrgUnit, orgUnitMap],
  );
  const childOrgUnits = useMemo(
    () => (activeOrgUnit ? orgUnits.filter((unit) => unit.parentOrgUnitId === activeOrgUnit.id) : []),
    [activeOrgUnit, orgUnits],
  );
  // Per-child allocation roll-up so a parent user sees "Bangalore Branch ·
  // 50 approved · 50 available · 0 consumed" at a glance. Counts source
  // from store.lrPools so they stay live with every approve/transfer/use.
  const childAllocationSummary = useMemo(() => {
    if (!childOrgUnits.length) return [];
    return childOrgUnits
      .map((child) => {
        const childPools = allManualPools.filter(
          (pool) => (pool.currentPlaceId ?? pool.ownerPlaceId ?? pool.ownerLevelId) === child.id,
        );
        return {
          unit: child,
          allocated: childPools.length,
          available: childPools.filter((pool) => pool.status === "AVAILABLE").length,
          consumed: childPools.filter((pool) => pool.status === "USED").length,
          pendingRequests: store.lrRequests.filter(
            (request) =>
              request.configId === activeConfig?.id &&
              request.sourceOrgUnitId === child.id &&
              request.status === "PENDING",
          ).length,
        };
      })
      .sort((left, right) => left.unit.name.localeCompare(right.unit.name));
  }, [activeConfig?.id, allManualPools, childOrgUnits, store.lrRequests]);
  // Read approval/allocation provenance off the pool's audit trail. The
  // store appends REQUEST_APPROVED_ALLOCATION / REQUEST_APPROVED_GENERATED
  // when a request flips to APPROVED — that's the source of truth for
  // "Approved by / Approved at / From parent place".
  function getPoolApprovalContext(pool: TenantLrPoolRecord) {
    const events = pool.auditEvents ?? [];
    const approval = [...events]
      .reverse()
      .find(
        (event) =>
          event.action === "REQUEST_APPROVED_ALLOCATION" ||
          event.action === "REQUEST_APPROVED_GENERATED",
      );
    if (!approval) return null;
    return {
      approvedBy: approval.actor ?? null,
      approvedAt: approval.timestamp ?? null,
      fromPlaceName: approval.fromPlaceId
        ? orgUnitMap.get(approval.fromPlaceId)?.name ?? approval.fromPlaceId
        : null,
      requestId: approval.note ?? null,
    };
  }
  const recentAudit = store.auditLogs.filter(
    (entry) =>
      entry.entityType.includes("lr") ||
      entry.action.toLowerCase().includes("lr"),
  );
  const lowStockUnits = ownershipOrgUnits
    .map((unit) => ({
      unit,
      count: allManualPools.filter(
        (pool) => (pool.currentPlaceId ?? pool.ownerPlaceId ?? pool.ownerLevelId) === unit.id && pool.status === "AVAILABLE",
      ).length,
    }))
    .filter((item) => item.count <= 5);
  useEffect(() => {
    if (!activeConfig) {
      return;
    }
    const repairablePools = store.lrPools.filter(
      (pool) =>
        pool.configId === activeConfig.id &&
        pool.ownerLevelId &&
        pool.status === "AVAILABLE",
    );
    const repairs = repairablePools.flatMap((pool) => {
      const ownerFormat = resolveManualLrFormatForOrgUnit(activeConfig, pool.ownerLevelId, orgUnits);
      const ownerRegex = buildManualLrRegex(ownerFormat);
      if (ownerRegex.test(pool.lrNumber)) {
        return [];
      }
      const ownerPools = repairablePools
        .filter((candidate) => candidate.ownerLevelId === pool.ownerLevelId)
        .sort((left, right) => left.createdAt.localeCompare(right.createdAt));
      const ownerIndex = ownerPools.findIndex((candidate) => candidate.id === pool.id);
      return [{
        ...pool,
        lrNumber: buildManualLrNumber(ownerFormat, ownerIndex + 1),
        updatedAt: new Date().toISOString(),
      }];
    });
    if (!repairs.length) {
      return;
    }
    void lrManagement.upsertPools(repairs);
  }, [activeConfig, lrManagement, store.lrPools]);

  if (!activeConfig) {
    return (
      <TenantEmptyState
        title="Manual LR configuration is required"
        description="Set up the manual LR rules first in Administration > LR Config. The current active UI hides Auto and Pre-generated LR until future support is enabled."
      />
    );
  }
  const manualConfig = activeConfig;
  const activePlaceFormat = resolveManualLrFormatForOrgUnit(manualConfig, activeOrgUnit?.id ?? null, orgUnits);

  async function handleUpload() {
    if (!canRunWorkflowAction("UPLOAD_LR")) {
      setMessage("You do not have permission to perform this LR action.");
      return;
    }
    if (requiresExplicitPlace || !activeOrgUnit) {
      setMessage("Select the active place before uploading LR inventory.");
      return;
    }

    const previewRegex =
      activePlaceFormat.numberingPolicy === "STRICT_FORMAT"
        ? buildManualLrRegex(activePlaceFormat)
        : null;
    const existingNumbers = new Set(store.lrPools.map((pool) => pool.lrNumber.toUpperCase()));
    let values: string[] = [];

    if (uploadMode === "RANGE") {
      const start = Number(rangeStart);
      const end = Number(rangeEnd);
      if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) {
        setMessage("Enter a valid LR range.");
        return;
      }
      values = Array.from({ length: end - start + 1 }, (_, index) =>
        buildManualLrNumber(activePlaceFormat, start + index),
      );
    } else if (uploadMode === "SINGLE") {
      values = [singleNumber.trim()];
    } else {
      values = parseManualLrInput(bulkNumbers);
    }

    if (!values.length) {
      setMessage("No LR numbers were prepared for upload.");
      return;
    }
    if (selectedPoolType === "CUSTOMER_RESERVED" && !selectedCustomerId) {
      setMessage("Customer is required for customer reserved LR.");
      return;
    }

    const validRows: string[] = [];
    let duplicateCount = 0;
    let invalidFormatCount = 0;

    values.forEach((value) => {
      const normalized = value.trim().toUpperCase();
      if (!normalized) {
        return;
      }
      if (existingNumbers.has(normalized)) {
        duplicateCount += 1;
        return;
      }
      if (
        activePlaceFormat.numberingPolicy === "STRICT_FORMAT" &&
        previewRegex &&
        !previewRegex.test(normalized)
      ) {
        invalidFormatCount += 1;
        return;
      }
      existingNumbers.add(normalized);
      validRows.push(normalized);
    });

    const now = new Date().toISOString();
    const nextSequence = getNextManualLrSequence(store.lrPools.filter((pool) => pool.configId === manualConfig.id));
    const records: TenantLrPoolRecord[] = validRows.map((lrNumber, index) => ({
      id: `lr-pool-${Math.random().toString(36).slice(2, 9)}`,
      lrNumberId: `lr-pool-${Math.random().toString(36).slice(2, 9)}`,
      tenantId: tenant.id,
      configId: manualConfig.id,
      lrNumber:
        uploadMode === "RANGE"
          ? buildManualLrNumber(activePlaceFormat, Number(rangeStart) + index)
          : activePlaceFormat.numberingPolicy === "FLEXIBLE_PHYSICAL_BOOK"
            ? lrNumber
            : buildManualLrNumber(activePlaceFormat, nextSequence + index + 1),
      poolType: selectedPoolType,
      status: "AVAILABLE",
      customerId: selectedPoolType === "CUSTOMER_RESERVED" ? selectedCustomerId || null : null,
      vendorId: null,
      ownerPlaceId: activeOrgUnit.id,
      currentPlaceId: activeOrgUnit.id,
      ownerLevelId: activeOrgUnit.id,
      ownerUserId: currentUser?.id ?? null,
      bookingId: null,
      deliveryId: null,
      usedAt: null,
      voidReason: null,
      createdBy: currentUser?.name ?? currentRole?.name ?? "Tenant User",
      auditEvents: [{
        id: `lr-audit-${Math.random().toString(36).slice(2, 9)}`,
        action: "CREATED",
        poolType: selectedPoolType,
        customerId: selectedPoolType === "CUSTOMER_RESERVED" ? selectedCustomerId || null : null,
        fromPlaceId: null,
        toPlaceId: activeOrgUnit.id,
        actor: currentUser?.name ?? currentRole?.name ?? "Tenant User",
        role: currentRole?.name ?? "Tenant User",
        timestamp: now,
        note: "Upload / create",
      }],
      createdAt: now,
      updatedAt: now,
    }));

    await lrManagement.upsertPools(records);
    await lrManagement.appendAuditLog({
      actor: currentUser?.name ?? currentRole?.name ?? "Tenant User",
      action: "uploaded manual LR inventory",
      entityType: "lr_pool",
      entityName: `${records.length} LR numbers`,
      tenantId: tenant.id,
      result: "success",
    });
    setMessage(
      `Upload summary: total ${values.length}, valid ${validRows.length}, duplicate ${duplicateCount}, invalid format ${invalidFormatCount}, uploaded successfully ${records.length}.`,
    );
  }

  async function handleAllocate() {
    if (!activeOrgUnit || !allocationDestinationId) {
      setMessage("Select source active place and destination place for allocation.");
      return;
    }
    if (allocationPoolType === "CUSTOMER_RESERVED" && !selectedCustomerId) {
      setMessage("Select customer for customer reserved LR allocation.");
      return;
    }
    const count = Number(allocationCount);
    if (!Number.isFinite(count) || count <= 0) {
      setMessage("Enter a valid allocation quantity.");
      return;
    }
    const selected = availablePoolsForSelection.slice(0, count);
    if (selected.length < count) {
      setMessage(
        canRunWorkflowAction("REQUEST_LR")
          ? "Insufficient manual LR stock for this active place. Request LR from parent first."
          : "Insufficient manual LR stock for this active place.",
      );
      return;
    }
    const destinationFormat = resolveManualLrFormatForOrgUnit(manualConfig, allocationDestinationId, orgUnits);
    const destinationExisting = store.lrPools.filter(
      (pool) => pool.configId === manualConfig.id && pool.ownerLevelId === allocationDestinationId,
    );
    let destinationSequence = getNextManualLrSequence(destinationExisting) + 1;
    await lrManagement.upsertPools(
      selected.map((pool) => ({
        ...pool,
        lrNumber: buildManualLrNumber(destinationFormat, destinationSequence++),
        poolType: allocationPoolType,
        customerId: allocationPoolType === "CUSTOMER_RESERVED" ? selectedCustomerId || pool.customerId || null : null,
        ownerPlaceId: allocationDestinationId,
        currentPlaceId: allocationDestinationId,
        ownerLevelId: allocationDestinationId,
        auditEvents: [
          ...(pool.auditEvents ?? []),
          {
            id: `lr-audit-${Math.random().toString(36).slice(2, 9)}`,
            action: "ALLOCATED",
            poolType: allocationPoolType,
            customerId: allocationPoolType === "CUSTOMER_RESERVED" ? selectedCustomerId || pool.customerId || null : null,
            fromPlaceId: pool.currentPlaceId ?? pool.ownerPlaceId ?? pool.ownerLevelId ?? null,
            toPlaceId: allocationDestinationId,
            actor: currentUser?.name ?? currentRole?.name ?? "Tenant User",
            role: currentRole?.name ?? "Tenant User",
            timestamp: new Date().toISOString(),
            note: "Manual allocation",
          },
        ],
        updatedAt: new Date().toISOString(),
      })),
    );
    await lrManagement.appendAuditLog({
      actor: currentUser?.name ?? currentRole?.name ?? "Tenant User",
      action: "allocated manual LR stock",
      entityType: "lr_allocation",
      entityName: `${count} LR`,
      tenantId: tenant.id,
      result: "success",
    });
    setMessage(`Allocated ${count} LR numbers to ${orgUnitMap.get(allocationDestinationId)?.name ?? "destination"}.`);
  }

  async function handleCreateReservedCustomerLr() {
    // Customer LR uses its own "Place / Owning Place" selector, so it does not
    // require a manual active place (e.g. a Tenant Admin at Company Root can pick
    // any in-scope place directly).
    const destinationPlaceId = reservedDestinationId || activeOrgUnit?.id || "";
    if (!destinationPlaceId) {
      setMessage("Select a place / owning place first.");
      return;
    }
    if (!reservedCustomerId) {
      setMessage("Select customer.");
      return;
    }
    if (reservedStartIndex < 0 || reservedEndIndex < 0 || reservedEndIndex < reservedStartIndex) {
      setMessage("Select valid start LR and end LR from available stock.");
      return;
    }
    const now = new Date().toISOString();
    const selectedPools = availableGeneralPoolsAtActivePlace.slice(reservedStartIndex, reservedEndIndex + 1);
    const destinationFormat = resolveManualLrFormatForOrgUnit(manualConfig, destinationPlaceId, orgUnits);
    const destinationExisting = store.lrPools.filter(
      (pool) => pool.configId === manualConfig.id && (pool.currentPlaceId ?? pool.ownerPlaceId ?? pool.ownerLevelId) === destinationPlaceId,
    );
    let destinationSequence = getNextManualLrSequence(destinationExisting) + 1;
    const records: TenantLrPoolRecord[] = selectedPools.map((pool) => ({
      ...pool,
      lrNumber: buildManualLrNumber(destinationFormat, destinationSequence++),
      poolType: "CUSTOMER_RESERVED",
      customerId: reservedCustomerId,
      ownerPlaceId: destinationPlaceId,
      currentPlaceId: destinationPlaceId,
      ownerLevelId: destinationPlaceId,
      updatedAt: now,
      auditEvents: [
        ...(pool.auditEvents ?? []),
        {
          id: `lr-audit-${Math.random().toString(36).slice(2, 9)}`,
          action: "CUSTOMER_RESERVED_ALLOCATED",
          poolType: "CUSTOMER_RESERVED",
          customerId: reservedCustomerId,
          fromPlaceId: pool.currentPlaceId ?? pool.ownerPlaceId ?? pool.ownerLevelId ?? null,
          toPlaceId: destinationPlaceId,
          actor: currentUser?.name ?? currentRole?.name ?? "Tenant User",
          role: currentRole?.name ?? "Tenant User",
          timestamp: now,
          note: "Reserved from manual stock",
        },
      ],
    }));
    if (!records.length) {
      setMessage("No LR numbers available to reserve.");
      return;
    }
    await lrManagement.upsertPools(records);
    setMessage(`Reserved ${records.length} LR numbers for ${store.customerMap.get(reservedCustomerId)?.name ?? "customer"} at ${orgUnitMap.get(destinationPlaceId)?.name ?? "selected place"}.`);
  }

  async function handleRequest() {
    if (!activeOrgUnit) {
      setMessage("Select the active place before creating an LR request.");
      return;
    }
    const quantity = Number(requestCount);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      setMessage("Enter a valid requested quantity.");
      return;
    }
    const parentUnit = orgUnitMap.get(activeOrgUnit.parentOrgUnitId ?? "");
    await lrManagement.createRequest({
      tenantId: tenant.id,
      sourceLevelId: activeOrgUnit.hierarchyLevelId,
      targetLevelId: parentUnit?.hierarchyLevelId ?? activeOrgUnit.hierarchyLevelId,
      requestedCount: quantity,
      approvedCount: 0,
      status: "PENDING",
      note: requestReason || null,
      sourceOrgUnitId: activeOrgUnit.id,
      targetOrgUnitId: parentUnit?.id ?? null,
      sourceUserId: currentUser?.id ?? null,
      targetUserId: null,
      lrType: "MANUAL",
      configId: manualConfig.id,
      customerId: selectedCustomerId || null,
      branchName: activeOrgUnit.name,
      branchCode: activeOrgUnit.id.toUpperCase(),
      lastSequenceNumber: null,
      rejectionReason: null,
    });
    setMessage(`LR request created for ${quantity} numbers from ${activeOrgUnit.name}.`);
  }

  async function handleRequestAllocation(requestId: string) {
    const request = relevantRequests.find((item) => item.id === requestId && item.status === "PENDING");
    if (!request) {
      setMessage("Select a pending LR request.");
      return;
    }
    const isTenantRootRequest = !request.targetOrgUnitId;
    const availableForParent = availablePools.filter(
      (pool) =>
        !request.targetOrgUnitId ||
        pool.ownerLevelId == null ||
        pool.ownerLevelId === request.targetOrgUnitId,
    );
    const lrType = activeConfig?.lrType ?? null;
    const canGenerateOnApproval = lrType === "MANUAL" || lrType === "PRE_GENERATED";
    if (
      !isTenantRootRequest &&
      !canGenerateOnApproval &&
      availableForParent.length < request.requestedCount
    ) {
      setMessage(
        `Insufficient manual LR stock at this place. Have ${availableForParent.length}, need ${request.requestedCount}.`,
      );
      return;
    }
    try {
      const updated = await lrManagement.approveRequest(
        request.id,
        request.requestedCount,
        currentUser?.name ?? currentRole?.name ?? "Tenant User",
        "Allocated from request queue.",
      );
      setMessage(`Allocated ${updated.approvedCount} LR numbers to ${orgUnitMap.get(request.sourceOrgUnitId ?? "")?.name ?? "requester"}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Allocation failed.");
    }
  }

  async function handleInlineRequestDecision(requestId: string, approve: boolean) {
    const request = relevantRequests.find((item) => item.id === requestId && item.status === "PENDING");
    if (!request) {
      setMessage("Select a pending LR request.");
      return;
    }
    if (approve) {
      const isTenantRootRequest = !request.targetOrgUnitId;
      const availableForParent = availablePools.filter(
        (pool) =>
          !request.targetOrgUnitId ||
          pool.ownerLevelId == null ||
          pool.ownerLevelId === request.targetOrgUnitId,
      );
      // The store will allocate existing AVAILABLE pools first and then
      // generate new pools for the unmatched count when the config is
      // MANUAL or PRE_GENERATED. Only block here when neither path can
      // satisfy the request — i.e. AUTO config AND no available pools.
      const lrType = activeConfig?.lrType ?? null;
      const canGenerateOnApproval = lrType === "MANUAL" || lrType === "PRE_GENERATED";
      if (
        !isTenantRootRequest &&
        !canGenerateOnApproval &&
        availableForParent.length < request.requestedCount
      ) {
        setMessage(
          `Insufficient manual LR stock at the approver place. Have ${availableForParent.length}, need ${request.requestedCount}. Upload more or transfer in before approving.`,
        );
        return;
      }
      try {
        const updated = await lrManagement.approveRequest(
          request.id,
          request.requestedCount,
          currentUser?.name ?? currentRole?.name ?? "Tenant User",
          "Approved from request list.",
        );
        // Approval now always generates fresh LR numbers at the requesting
        // place using its configured format — see store approveTenantLrRequest.
        setMessage(
          `Approved ${updated.approvedCount} LR numbers — generated at ${orgUnitMap.get(request.sourceOrgUnitId ?? "")?.name ?? "requester"} using its configured format.`,
        );
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Approve failed.");
      }
      return;
    }
    try {
      await lrManagement.rejectRequest(
        request.id,
        currentUser?.name ?? currentRole?.name ?? "Tenant User",
        "Rejected from request list.",
      );
      setMessage("LR request rejected.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Reject failed.");
    }
  }

  async function handleTransfer() {
    if (!activeOrgUnit || !transferDestinationId) {
      setMessage("Select the active place and transfer destination.");
      return;
    }
    const count = Number(transferCount);
    if (!Number.isFinite(count) || count <= 0) {
      setMessage("Enter a valid transfer quantity.");
      return;
    }
    const selected = availablePools.slice(0, count);
    if (selected.length < count) {
      setMessage("Insufficient available LR numbers for transfer.");
      return;
    }
    await lrManagement.createTransfer({
      tenantId: tenant.id,
      fromLevelId: activeOrgUnit.hierarchyLevelId,
      toLevelId: orgUnitMap.get(transferDestinationId)?.hierarchyLevelId ?? activeOrgUnit.hierarchyLevelId,
      lrIds: selected.map((pool) => pool.id),
      status: "COMPLETED",
      note: transferReason || null,
      fromOrgUnitId: activeOrgUnit.id,
      toOrgUnitId: transferDestinationId,
      fromUserId: currentUser?.id ?? null,
      toUserId: null,
      lrType: "MANUAL",
      customerId: selectedCustomerId || null,
      configId: manualConfig.id,
      completedAt: new Date().toISOString(),
    });
    setMessage(`Transferred ${count} LR numbers to ${orgUnitMap.get(transferDestinationId)?.name ?? "destination"}.`);
  }

  async function handleVoid() {
    const pool = allManualPools.find((item) => item.id === voidPoolId);
    if (!pool) {
      setMessage("Select an LR number to update.");
      return;
    }
    if (!voidReason.trim()) {
      setMessage("Reason is required.");
      return;
    }
    await lrManagement.upsertPools([
      {
        ...pool,
        status: voidStatus,
        voidReason,
        auditEvents: [
          ...(pool.auditEvents ?? []),
          {
            id: `lr-audit-${Math.random().toString(36).slice(2, 9)}`,
            action: voidStatus,
            poolType: pool.poolType ?? (pool.customerId ? "CUSTOMER_RESERVED" : "GENERAL"),
            customerId: pool.customerId ?? null,
            fromPlaceId: pool.currentPlaceId ?? pool.ownerPlaceId ?? pool.ownerLevelId ?? null,
            toPlaceId: pool.currentPlaceId ?? pool.ownerPlaceId ?? pool.ownerLevelId ?? null,
            actor: currentUser?.name ?? currentRole?.name ?? "Tenant User",
            role: currentRole?.name ?? "Tenant User",
            timestamp: new Date().toISOString(),
            note: voidReason,
          },
        ],
        updatedAt: new Date().toISOString(),
      },
    ]);
    await lrManagement.appendAuditLog({
      actor: currentUser?.name ?? currentRole?.name ?? "Tenant User",
      action: voidStatus === "VOID" ? "voided LR number" : voidStatus === "LOST" ? "marked LR lost" : "marked LR damaged",
      entityType: "lr_pool",
      entityName: pool.lrNumber,
      tenantId: tenant.id,
      result: "warning",
    });
    setMessage(`LR ${pool.lrNumber} marked as ${voidStatus}.`);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="LR"
        title="Manual LR"
        description=""
      />
      <div className="rounded-2xl border bg-slate-50 px-4 py-3 text-sm text-slate-700">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <span><span className="font-medium">User:</span> {currentUser?.name ?? "—"}</span>
          <span><span className="font-medium">Role:</span> {currentRole?.name ?? access.activeRole?.name ?? "No role"}</span>
          <span><span className="font-medium">Active place:</span> {activeOrgUnit?.name ?? "Not selected"}</span>
          <span>
            <span className="font-medium">Parent:</span>{" "}
            {parentOrgUnit?.name ?? (activeOrgUnit ? "Company Root" : "—")}
          </span>
          <span>
            <span className="font-medium">Children:</span>{" "}
            {childOrgUnits.length
              ? `${childOrgUnits.length} place${childOrgUnits.length === 1 ? "" : "s"}`
              : "—"}
          </span>
          <span><span className="font-medium">Visible LR:</span> {availablePools.length}</span>
          <div className="min-w-[220px]">
            <Select value={activeOrgUnit?.id ?? ""} onChange={(event) => setActiveOrgUnit(event.target.value || null)}>
              <option value="">{availableActiveOrgUnits.length > 1 ? "Select active place" : activeOrgUnit?.name ?? "No place"}</option>
              {availableActiveOrgUnits.map((option) => (
                <option key={option.id} value={option.id}>{option.name}</option>
              ))}
            </Select>
          </div>
        </div>
      </div>

      {requiresExplicitPlace ? (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Select the active place before upload, allocation, request, transfer, consumption, or void actions.
        </div>
      ) : null}

      {message ? (
        <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
          {message}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-4">
        <TenantSummaryCard label="Total LR stock" value={String(allManualPools.length)} helper="Manual LR numbers in this tenant config" />
        <TenantSummaryCard label="Available" value={String(availablePools.length)} helper={activeOrgUnit ? `Visible for ${activeOrgUnit.name}` : "Select active place"} />
        <TenantSummaryCard label="Pending approvals" value={String(relevantRequests.filter((request) => request.status === "PENDING").length)} helper="Open LR requests waiting for action" />
        <TenantSummaryCard label="Consumed" value={String(consumedPools.length)} helper="Already linked to booking assignments" />
      </div>

      {childAllocationSummary.length ? (
        <TenantPanel
          title="Allocated to child places"
          description={`Per-child stock owned by ${activeOrgUnit?.name ?? "this place"}. Counts refresh after every approve / allocate / transfer / consume.`}
        >
          <div className="overflow-x-auto rounded-2xl border">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  {["Child place", "Allocated", "Available", "Consumed", "Pending requests"].map((label) => (
                    <th key={label} className="px-4 py-2.5 text-left font-medium text-slate-600">{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {childAllocationSummary.map((row) => (
                  <tr key={row.unit.id}>
                    <td className="px-4 py-2.5 font-medium text-slate-900">{row.unit.name}</td>
                    <td className="px-4 py-2.5">{row.allocated}</td>
                    <td className="px-4 py-2.5">{row.available}</td>
                    <td className="px-4 py-2.5">{row.consumed}</td>
                    <td className="px-4 py-2.5">
                      {row.pendingRequests
                        ? <Badge variant="warning">{row.pendingRequests} pending</Badge>
                        : <span className="text-slate-500">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TenantPanel>
      ) : null}

      {!visibleTabs.length ? (
        <TenantEmptyState
          title="No LR pages are available for this role"
          description="This role does not currently have LR page visibility or workflow action access."
        />
      ) : (
        <>
          <Tabs tabs={visibleTabs.map((tab) => tab.label)} active={selectedTab?.label ?? ""} onChange={(tabLabel) => setActiveTab(visibleTabs.find((tab) => tab.label === tabLabel)?.key ?? "dashboard")} />

          {selectedTab?.key === "dashboard" ? (
            <TenantPanel title="Manual LR Dashboard" description="Low stock, pending approvals, recent usage, and operational context for the current place scope.">
              <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
                <div className="space-y-4">
                  <InfoList
                    title="Current rules"
                    rows={[
                      ["Configuration mode", manualConfig.scopeType === "HIERARCHY" ? "Hierarchy Level" : "Tenant Level"],
                      ["Ownership level", ownershipLevelName ?? "Tenant"],
                      ["Numbering policy", manualConfig.numberingPolicy ?? "STRICT_FORMAT"],
                      ["Customer LR policy", manualConfig.customerLrPolicy ?? "NOT_CUSTOMER_SPECIFIC"],
                      ["Format preview", buildManualLrPreview(activePlaceFormat)],
                    ]}
                  />
                  <InfoList
                    title="Workflow role control"
                    rows={[
                      ["Upload LR", canRunWorkflowAction("UPLOAD_LR") ? "Allowed" : "Restricted"],
                      ["Allocate LR", canRunWorkflowAction("ALLOCATE_LR") ? "Allowed" : "Restricted"],
                      ["Request LR", canRunWorkflowAction("REQUEST_LR") ? "Allowed" : "Restricted"],
                      ["Approve LR", canRunWorkflowAction("APPROVE_LR") ? "Allowed" : "Restricted"],
                      ["Transfer LR", canRunWorkflowAction("TRANSFER_LR") ? "Allowed" : "Restricted"],
                      ["Consume LR", canRunWorkflowAction("CONSUME_LR") ? "Allowed" : "Restricted"],
                    ]}
                  />
                </div>
                <div className="space-y-4">
                  <LowStockPanel items={lowStockUnits} />
                  <RecentAuditPanel items={recentAudit.slice(0, 6)} />
                </div>
              </div>
            </TenantPanel>
          ) : null}

          {selectedTab?.key === "inventory" ? (
            <TenantPanel title="LR Inventory / Number List" description="">
              <TenantFilterBar
                searchValue={search}
                searchPlaceholder="Search LR number, booking, owner, or status"
                onSearchChange={setSearch}
                trailing={
                  <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                    <Select value={inventoryPoolTypeFilter} onChange={(event) => setInventoryPoolTypeFilter(event.target.value as "ALL" | TenantLrPoolType)}>
                      <option value="ALL">All pool types</option>
                      <option value="GENERAL">General</option>
                      <option value="CUSTOMER_RESERVED">Customer Reserved</option>
                    </Select>
                    <Select value={inventoryCustomerFilter} onChange={(event) => setInventoryCustomerFilter(event.target.value)}>
                      <option value="ALL">All customers</option>
                      {store.customers.map((customer) => (
                        <option key={customer.id} value={customer.id}>{customer.name}</option>
                      ))}
                    </Select>
                    <Select value={inventoryPlaceFilter} onChange={(event) => setInventoryPlaceFilter(event.target.value)}>
                      <option value="ALL">All places</option>
                      {/* List every place inside the user's visible scope
                          (assigned + descendants) so a Region user can
                          drill into a specific Branch / Hub. Branch users
                          still see only their own place here. */}
                      {orgUnits
                        .filter((unit) => visibleOwnershipOrgUnitIds.includes(unit.id))
                        .map((orgUnit) => (
                          <option key={orgUnit.id} value={orgUnit.id}>{orgUnit.name}</option>
                        ))}
                    </Select>
                    <Select value={inventoryStatusFilter} onChange={(event) => setInventoryStatusFilter(event.target.value)}>
                      <option value="ALL">All statuses</option>
                      {["AVAILABLE", "ALLOCATED", "USED", "VOID", "LOST", "DAMAGED", "TRANSFERRED"].map((status) => (
                        <option key={status} value={status}>{status}</option>
                      ))}
                    </Select>
                    <Select value={inventoryView} onChange={(event) => setInventoryView(event.target.value as "ACTIVE_PLACE" | "ASSIGNED_SCOPE")}>
                      <option value="ASSIGNED_SCOPE">All assigned places</option>
                      <option value="ACTIVE_PLACE">Active place only</option>
                    </Select>
                    <div>{filteredPools.length} records shown</div>
                  </div>
                }
              />
              <div className="mt-4 rounded-2xl border bg-slate-50 px-4 py-3 text-sm text-slate-700">
                <span className="font-medium">Visible LR scope:</span>{" "}
                {inventoryView === "ACTIVE_PLACE"
                  ? `Only ${activeOrgUnit?.name ?? "the active place"}`
                  : assignedOrgUnits.length
                    ? (() => {
                        // List every visible place (assigned + descendants)
                        // so the user knows which child places they're
                        // seeing inventory for.
                        const visibleNames = orgUnits
                          .filter((unit) => visibleOwnershipOrgUnitIds.includes(unit.id))
                          .map((unit) => unit.name);
                        const directNames = assignedOrgUnits.map((unit) => unit.name);
                        const descendantNames = visibleNames.filter((name) => !directNames.includes(name));
                        return descendantNames.length
                          ? `${currentRole?.name ?? "This role"} sees ${directNames.join(", ")} and ${descendantNames.length} descendant place${descendantNames.length === 1 ? "" : "s"} (${descendantNames.join(", ")}).`
                          : `${currentRole?.name ?? "This role"} sees ${directNames.join(", ")}.`;
                      })()
                    : "No org-unit scope assigned to this user."}
              </div>
              <div className="mt-4 overflow-x-auto rounded-2xl border">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      {[
                        "LR Number",
                        "Pool Type",
                        "Customer",
                        "Owning Place",
                        "Current Place",
                        "Status",
                        "Booking ID",
                        "Approved From",
                        "Approved By",
                        "Approved At",
                        "Updated",
                      ].map((label) => (
                        <th key={label} className="px-4 py-3 text-left font-medium text-slate-600">{label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {filteredPools.map((pool) => {
                      const approval = getPoolApprovalContext(pool);
                      const owningPlaceName = orgUnitMap.get(pool.ownerPlaceId ?? pool.ownerLevelId ?? "")?.name ?? "Tenant Pool";
                      const currentPlaceName = orgUnitMap.get(pool.currentPlaceId ?? pool.ownerPlaceId ?? pool.ownerLevelId ?? "")?.name ?? "Tenant Pool";
                      return (
                        <tr key={pool.id}>
                          {/* Hierarchy-aware LR rendering — show owning place
                              prefix so "Bangalore Branch · BLSRBLR-2026-000001"
                              reads as one identifier instead of an orphan
                              number. */}
                          <td className="px-4 py-3 font-mono">
                            <span className="text-[11px] text-slate-500">{owningPlaceName} · </span>
                            <span>{pool.lrNumber}</span>
                          </td>
                          <td className="px-4 py-3">{(pool.poolType ?? (pool.customerId ? "CUSTOMER_RESERVED" : "GENERAL")).replace("_", " ")}</td>
                          <td className="px-4 py-3">{store.customerMap.get(pool.customerId ?? "")?.name ?? "--"}</td>
                          <td className="px-4 py-3">{owningPlaceName}</td>
                          <td className="px-4 py-3">{currentPlaceName}</td>
                          <td className="px-4 py-3">
                            <Badge variant={getManualLrStatusTone(getManualLrUiStatus(pool)) as never}>
                              {getManualLrUiStatus(pool)}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">{pool.bookingId ?? "--"}</td>
                          <td className="px-4 py-3">{approval?.fromPlaceName ?? "--"}</td>
                          <td className="px-4 py-3">{approval?.approvedBy ?? pool.createdBy ?? "--"}</td>
                          <td className="px-4 py-3">
                            {approval?.approvedAt ? new Date(approval.approvedAt).toLocaleString() : "--"}
                          </td>
                          <td className="px-4 py-3">{new Date(pool.updatedAt).toLocaleString()}</td>
                        </tr>
                      );
                    })}
                    {!filteredPools.length ? (
                      <tr>
                        <td colSpan={11} className="px-4 py-10 text-center text-muted-foreground">
                          No LR inventory is visible for the selected role scope and place view.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </TenantPanel>
          ) : null}

          {selectedTab?.key === "reserved" ? (
            <TenantPanel title="Pre-generated LR / Customer LR" description="">
              <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
                <div className="rounded-2xl border bg-white p-4">
                  <div className="grid gap-3 md:grid-cols-2">
                    <Field label="Customer">
                      <Select value={reservedCustomerId} onChange={(event) => setReservedCustomerId(event.target.value)}>
                        <option value="">Select customer</option>
                        {store.customers.map((customer) => (
                          <option key={customer.id} value={customer.id}>{customer.name}</option>
                        ))}
                      </Select>
                    </Field>
                    <Field label="Place / Owning Place">
                      <Select value={reservedDestinationId || activeOrgUnit?.id || ""} onChange={(event) => setReservedDestinationId(event.target.value)}>
                        {reservedDestinationOptions.map((option) => (
                          <option key={option.id} value={option.id}>{option.name}</option>
                        ))}
                      </Select>
                      {(() => {
                        const placeId = reservedDestinationId || activeOrgUnit?.id || "";
                        const path: string[] = [];
                        let cursor = placeId ? orgUnitMap.get(placeId) : undefined;
                        let guard = 0;
                        while (cursor && guard < 12) {
                          path.unshift(cursor.name);
                          cursor = cursor.parentOrgUnitId ? orgUnitMap.get(cursor.parentOrgUnitId) : undefined;
                          guard += 1;
                        }
                        return path.length ? (
                          <p className="mt-1 text-xs font-medium text-slate-600">Selected place: {path.join(" → ")}</p>
                        ) : null;
                      })()}
                      <p className="mt-1 text-xs text-muted-foreground">
                        Customer LR will be available only for bookings of this customer within the selected place scope.
                      </p>
                    </Field>
                    <Field label="Start LR">
                      <Select value={reservedStartPoolId} onChange={(event) => setReservedStartPoolId(event.target.value)}>
                        <option value="">Select start LR</option>
                        {availableGeneralPoolsAtActivePlace.map((pool) => (
                          <option key={pool.id} value={pool.id}>{pool.lrNumber}</option>
                        ))}
                      </Select>
                    </Field>
                    <Field label="End LR">
                      <Select value={reservedEndPoolId} onChange={(event) => setReservedEndPoolId(event.target.value)}>
                        <option value="">Select end LR</option>
                        {availableGeneralPoolsAtActivePlace.map((pool) => (
                          <option key={pool.id} value={pool.id}>{pool.lrNumber}</option>
                        ))}
                      </Select>
                    </Field>
                    <Field label="Count">
                      <Input value={String(reservedSelectedCount)} disabled />
                    </Field>
                  </div>
                  <div className="mt-4">
                    <Button onClick={handleCreateReservedCustomerLr} disabled={!canRunWorkflowAction("UPLOAD_LR") || !(reservedDestinationId || activeOrgUnit?.id)}>
                      Create Customer LR
                    </Button>
                  </div>
                </div>
                <div className="overflow-x-auto rounded-2xl border">
                  <table className="min-w-full divide-y divide-slate-200 text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        {["LR Number", "Customer", "Place", "Status"].map((label) => (
                          <th key={label} className="px-4 py-3 text-left font-medium text-slate-600">{label}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {allManualPools
                        .filter((pool) => (pool.poolType ?? (pool.customerId ? "CUSTOMER_RESERVED" : "GENERAL")) === "CUSTOMER_RESERVED")
                        .filter((pool) => !reservedCustomerId || pool.customerId === reservedCustomerId)
                        .map((pool) => (
                          <tr key={pool.id}>
                            <td className="px-4 py-3 font-mono">{pool.lrNumber}</td>
                            <td className="px-4 py-3">{store.customerMap.get(pool.customerId ?? "")?.name ?? "--"}</td>
                            <td className="px-4 py-3">{orgUnitMap.get(pool.currentPlaceId ?? pool.ownerPlaceId ?? pool.ownerLevelId ?? "")?.name ?? "Tenant Pool"}</td>
                            <td className="px-4 py-3">{pool.status}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </TenantPanel>
          ) : null}

          {selectedTab?.key === "requests" ? (
            <ActionCard
              title="Requests"
              description=""
              icon={<FileClock className="size-4" />}
            >
              {canSubmitRequest ? (
                <>
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Requesting org unit"><Input value={activeOrgUnit?.name ?? "Not selected"} disabled /></Field>
                    <Field label="Requested quantity">
                      <Input value={requestCount} onChange={(event) => setRequestCount(event.target.value)} />
                    </Field>
                  </div>
                  <Field label="Reason / remarks" className="mt-4">
                    <Textarea value={requestReason} onChange={(event) => setRequestReason(event.target.value)} className="min-h-[100px]" />
                  </Field>
                  <div className="mt-4">
                    <Button onClick={handleRequest} disabled={!canSubmitRequest || requiresExplicitPlace}>
                      Submit LR Request
                    </Button>
                  </div>
                </>
              ) : null}
              <RequestTable
                requests={relevantRequests}
                orgUnitMap={orgUnitMap}
                orgUnitsForRequestTable={orgUnits}
                config={activeConfig}
                customerMap={store.customerMap}
                canProcessRequests={canProcessRequests}
                canApproveRequests={canRunWorkflowAction("APPROVE_LR")}
                canAllocateRequests={canRunWorkflowAction("ALLOCATE_LR")}
                canActOnRequest={canActOnRequest}
                onAllocate={handleRequestAllocation}
                onApprove={(requestId) => handleInlineRequestDecision(requestId, true)}
                onReject={(requestId) => handleInlineRequestDecision(requestId, false)}
              />
            </ActionCard>
          ) : null}

            {selectedTab?.key === "allocation" ? (
              <ActionCard
                title="Allocate LR"
                description=""
                icon={<ArrowRightLeft className="size-4" />}
              >
                <div className="grid gap-4 md:grid-cols-4">
                  <Field label="Pool type">
                    <Select
                      value={allocationPoolType}
                      onChange={(event) =>
                        setAllocationPoolType(event.target.value as TenantLrPoolType)
                      }
                    >
                      <option value="GENERAL">General LR</option>
                      <option value="CUSTOMER_RESERVED">Customer Reserved LR</option>
                    </Select>
                  </Field>
                  {allocationPoolType === "CUSTOMER_RESERVED" ? (
                    <Field label="Customer">
                      <Select
                        value={selectedCustomerId}
                        onChange={(event) => setSelectedCustomerId(event.target.value)}
                      >
                        <option value="">Select customer</option>
                        {store.customers.map((customer) => (
                          <option key={customer.id} value={customer.id}>
                            {customer.name}
                          </option>
                        ))}
                      </Select>
                    </Field>
                  ) : (
                    <div />
                  )}
                  <Field label="Child place">
                    <Select
                      value={allocationDestinationId}
                      onChange={(event) => setAllocationDestinationId(event.target.value)}
                    >
                      <option value="">Select child place</option>
                      {managedDestinationOrgUnits
                        .filter((unit) => unit.id !== activeOrgUnit?.id)
                        .map((unit) => (
                          <option key={unit.id} value={unit.id}>
                            {unit.name}
                          </option>
                        ))}
                    </Select>
                  </Field>
                  <Field label="Quantity">
                    <Input
                      value={allocationCount}
                      onChange={(event) => setAllocationCount(event.target.value)}
                    />
                  </Field>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <Button
                    onClick={handleAllocate}
                    disabled={
                      !canRunWorkflowAction("ALLOCATE_LR") ||
                      requiresExplicitPlace ||
                      !managedDestinationOrgUnits.filter((unit) => unit.id !== activeOrgUnit?.id).length
                    }
                  >
                    Allocate LR
                  </Button>
                  {!managedDestinationOrgUnits.filter((unit) => unit.id !== activeOrgUnit?.id).length ? (
                    <span className="text-sm text-muted-foreground">
                      No child places available for allocation.
                    </span>
                  ) : null}
                </div>
              </ActionCard>
            ) : null}

            {selectedTab?.key === "transfer" ? (
              <ActionCard
                title="Transfer"
                description=""
                icon={<ArrowRightLeft className="size-4" />}
              >
                <div className="grid gap-4 md:grid-cols-3">
                  <Field label="From org unit"><Input value={activeOrgUnit?.name ?? "Not selected"} disabled /></Field>
                  <Field label="To org unit">
                    <Select value={transferDestinationId} onChange={(event) => setTransferDestinationId(event.target.value)}>
                      <option value="">Select destination</option>
                      {managedDestinationOrgUnits.filter((unit) => unit.id !== activeOrgUnit?.id).map((unit) => (
                        <option key={unit.id} value={unit.id}>{unit.name}</option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Quantity">
                    <Input value={transferCount} onChange={(event) => setTransferCount(event.target.value)} />
                  </Field>
                </div>
                <Field label="Reason / remarks" className="mt-4">
                  <Textarea value={transferReason} onChange={(event) => setTransferReason(event.target.value)} className="min-h-[90px]" />
                </Field>
                <div className="mt-4">
                  <Button onClick={handleTransfer} disabled={!canRunWorkflowAction("TRANSFER_LR") || requiresExplicitPlace}>
                    Transfer LR
                  </Button>
                </div>
              </ActionCard>
            ) : null}

          {selectedTab?.key === "consumption" ? (
            <TenantPanel title="Consumption / Booking Usage" description="Manual LR is consumed during vehicle assignment. Booking assignment now uses the current active place and manual LR stock only.">
              <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
                <InfoList
                  title="Consumption rules"
                  rows={[
                    ["Active place", activeOrgUnit?.name ?? "Not selected"],
                    ["Available LR count", String(availablePools.length)],
                    ["Booking assignment", "Manual LR only"],
                    ["Insufficient stock behavior", "Assignment is blocked and the user is asked to request or allocate LR first"],
                  ]}
                />
                <div className="overflow-x-auto rounded-2xl border">
                  <table className="min-w-full divide-y divide-slate-200 text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        {["Booking", "Delivery", "LR Number", "Belongs To", "Consumed At"].map((label) => (
                          <th key={label} className="px-4 py-3 text-left font-medium text-slate-600">{label}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {consumedPools.map((pool) => (
                        <tr key={pool.id}>
                          <td className="px-4 py-3">{pool.bookingId ?? "--"}</td>
                          <td className="px-4 py-3">{pool.deliveryId ?? "--"}</td>
                          <td className="px-4 py-3 font-mono">{pool.lrNumber}</td>
                          <td className="px-4 py-3">{orgUnitMap.get(pool.ownerLevelId ?? "")?.name ?? "Tenant Pool"}</td>
                          <td className="px-4 py-3">{pool.usedAt ? new Date(pool.usedAt).toLocaleString() : "--"}</td>
                        </tr>
                      ))}
                      {!consumedPools.length ? (
                        <tr>
                          <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                            No consumed LR records are visible for this role scope yet.
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </div>
            </TenantPanel>
          ) : null}

          {selectedTab?.key === "void" ? (
            <ActionCard
              title="Void / Damaged / Lost"
              description="Consumed LR cannot be voided here. Use this page for stock-level control of unused LR numbers only."
              icon={<AlertTriangle className="size-4" />}
            >
              <div className="grid gap-4 md:grid-cols-3">
                <Field label="LR number">
                  <Select value={voidPoolId} onChange={(event) => setVoidPoolId(event.target.value)}>
                    <option value="">Select LR number</option>
                    {availablePools.map((pool) => (
                      <option key={pool.id} value={pool.id}>{pool.lrNumber}</option>
                    ))}
                  </Select>
                </Field>
                <Field label="Status">
                  <Select value={voidStatus} onChange={(event) => setVoidStatus(event.target.value as typeof voidStatus)}>
                    <option value="VOID">Void</option>
                    <option value="LOST">Lost</option>
                    <option value="DAMAGED">Damaged</option>
                  </Select>
                </Field>
                <Field label="Reason">
                  <Input value={voidReason} onChange={(event) => setVoidReason(event.target.value)} />
                </Field>
              </div>
              <div className="mt-4">
                <Button onClick={handleVoid} disabled={!canRunWorkflowAction("VOID_LR")}>
                  Update LR Status
                </Button>
              </div>
              <div className="mt-6 grid gap-3 md:grid-cols-3">
                <TenantSummaryCard label="Void" value={String(allManualPools.filter((pool) => pool.status === "VOID").length)} />
                <TenantSummaryCard label="Lost" value={String(allManualPools.filter((pool) => pool.status === "LOST").length)} />
                <TenantSummaryCard label="Damaged" value={String(allManualPools.filter((pool) => pool.status === "DAMAGED").length)} />
              </div>
            </ActionCard>
          ) : null}

          {selectedTab?.key === "audit" ? (
            <TenantPanel title="Audit Trail" description="Every LR activity writes to the mock audit stream. Use this tab to inspect recent inventory, request, transfer, and booking-consumption events.">
              <RecentAuditPanel items={recentAudit} full />
            </TenantPanel>
          ) : null}
        </>
      )}
    </div>
  );
}

function CurrentContextPanel({
  tenantName,
  roleName,
  scopeLevel,
  assignedOrgUnits,
  activeOrgUnitId,
  activeOrgUnitName,
  consumablePools,
  options,
  onSelect,
}: {
  tenantName: string;
  roleName: string;
  scopeLevel: string;
  assignedOrgUnits: string[];
  activeOrgUnitId: string;
  activeOrgUnitName: string;
  consumablePools: string[];
  options: Array<{ id: string; name: string }>;
  onSelect: (orgUnitId: string | null) => void;
}) {
  return (
    <TenantPanel title="Current LR Context" description="Every manual LR page shows who the user is, where they stand in the hierarchy, and which active place is currently in use.">
      <div className="grid gap-4 lg:grid-cols-[1fr_1fr_1fr_1fr_1.15fr_1.15fr]">
        <ContextChip label="Tenant" value={tenantName} />
        <ContextChip label="Role" value={roleName} />
        <ContextChip label="Scope Level" value={scopeLevel} />
        <ContextChip label="Assigned Places" value={assignedOrgUnits.join(", ") || "None"} />
        <ContextChip label="Consumable LR Pools" value={consumablePools.join(", ") || "None resolved"} />
        <div className="grid gap-2">
          <label className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">Active Place</label>
          <Select value={activeOrgUnitId} onChange={(event) => onSelect(event.target.value || null)}>
            <option value="">{options.length > 1 ? "Select active place" : activeOrgUnitName}</option>
            {options.map((option) => (
              <option key={option.id} value={option.id}>{option.name}</option>
            ))}
          </Select>
        </div>
      </div>
    </TenantPanel>
  );
}

function LrWorkflowGuidePanel({
  ownershipLevelName,
  activePlaceName,
  distributionStrategy,
  workflowMode,
}: {
  ownershipLevelName: string;
  activePlaceName: string;
  distributionStrategy: string;
  workflowMode: string;
}) {
  return (
    <TenantPanel
      title="LR Flow Diagram"
      description="Use this as the operating sequence for LR visibility and booking assignment."
    >
      <div className="grid gap-4 lg:grid-cols-4">
        <FlowStepCard
          title="1. Upload Stock"
          body={`Tenant Admin or the configured upload role creates LR stock in the ${ownershipLevelName} pool. Strategy: ${distributionStrategy}.`}
        />
        <FlowStepCard
          title="2. Request / Approve"
          body={`Operations or Dispatch raises LR request. Regional / approval roles review it when workflow mode is ${workflowMode}.`}
        />
        <FlowStepCard
          title="3. Allocate / Transfer"
          body="Regional or allocation roles move LR stock to the operating place that should actually consume it."
        />
        <FlowStepCard
          title="4. Consume in Booking"
          body={`During assignment, only LR numbers available for the active LR place (${activePlaceName}) are shown.`}
        />
      </div>
    </TenantPanel>
  );
}

function ContextChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border bg-slate-50/80 px-4 py-3">
      <div className="text-xs uppercase tracking-[0.12em] text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm font-medium text-slate-950">{value}</div>
    </div>
  );
}

function FlowStepCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border bg-slate-50/80 px-4 py-4">
      <div className="text-sm font-semibold text-slate-950">{title}</div>
      <div className="mt-2 text-sm text-slate-700">{body}</div>
    </div>
  );
}

function hierarchyLevelLabelFromOptions(value: string | null) {
  return value && value.trim() ? value : "Tenant";
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`grid gap-2 ${className ?? ""}`}>
      <label className="text-sm font-medium">{label}</label>
      {children}
    </div>
  );
}

function ActionCard({
  title,
  description,
  icon,
  children,
}: {
  title: string;
  description: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <TenantPanel
      title={title}
      description={description}
      action={<div className="flex items-center gap-2 text-sm text-muted-foreground">{icon}</div>}
    >
      {children}
    </TenantPanel>
  );
}

function InfoList({ title, rows }: { title: string; rows: Array<[string, string]> }) {
  return (
    <div className="rounded-2xl border bg-white p-4">
      <div className="text-sm font-semibold">{title}</div>
      <div className="mt-4 space-y-3">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-start justify-between gap-4 border-b pb-3 last:border-b-0 last:pb-0">
            <div className="text-sm text-muted-foreground">{label}</div>
            <div className="text-right text-sm font-medium text-slate-950">{value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function LowStockPanel({
  items,
}: {
  items: Array<{ unit: { id: string; name: string }; count: number }>;
}) {
  return (
    <div className="rounded-2xl border bg-white p-4">
      <div className="text-sm font-semibold">Low stock alerts by org unit</div>
      <div className="mt-4 space-y-3">
        {items.length ? (
          items.map((item) => (
            <div key={item.unit.id} className="flex items-center justify-between rounded-2xl border bg-amber-50 px-4 py-3">
              <div className="text-sm font-medium text-amber-900">{item.unit.name}</div>
              <Badge variant="warning">{item.count} available</Badge>
            </div>
          ))
        ) : (
          <div className="text-sm text-muted-foreground">No low-stock alerts for the current manual LR pool.</div>
        )}
      </div>
    </div>
  );
}

function RequestTable({
  requests,
  orgUnitMap,
  orgUnitsForRequestTable,
  config,
  customerMap,
  canProcessRequests,
  canApproveRequests,
  canAllocateRequests,
  canActOnRequest,
  onAllocate,
  onApprove,
  onReject,
}: {
  requests: TenantLrAllocationRequestRecord[];
  orgUnitMap: Map<string, { name: string }>;
  orgUnitsForRequestTable: OrgUnit[];
  config: ReturnType<typeof useManualLrContext>["activeConfig"];
  customerMap: Map<string, { name: string }>;
  canProcessRequests: boolean;
  canApproveRequests: boolean;
  canAllocateRequests: boolean;
  canActOnRequest: (request: TenantLrAllocationRequestRecord) => boolean;
  onAllocate: (requestId: string) => void;
  onApprove: (requestId: string) => void;
  onReject: (requestId: string) => void;
}) {
  return (
    <div className="mt-6 overflow-x-auto rounded-2xl border">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50">
          <tr>
            {["Requester", "Type", "Customer", "Format", "Approver place", "Requested", "Approved", "Status", "Updated", ...(canProcessRequests ? ["Action"] : [])].map((label) => (
              <th key={label} className="px-4 py-3 text-left font-medium text-slate-600">{label}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {requests.map((request) => (
            <tr key={request.id}>
              <td className="px-4 py-3">{orgUnitMap.get(request.sourceOrgUnitId ?? "")?.name ?? request.branchName ?? "--"}</td>
              <td className="px-4 py-3">{request.customerId ? "Customer Reserved" : "General"}</td>
              <td className="px-4 py-3">{customerMap.get(request.customerId ?? "")?.name ?? "--"}</td>
              <td className="px-4 py-3 font-mono text-xs">
                {request.sourceOrgUnitId && config ? buildManualLrPreview(resolveManualLrFormatForOrgUnit(config, request.sourceOrgUnitId, orgUnitsForRequestTable)) : "--"}
              </td>
              <td className="px-4 py-3">{orgUnitMap.get(request.targetOrgUnitId ?? "")?.name ?? "Tenant / Company Level"}</td>
              <td className="px-4 py-3">{request.requestedCount}</td>
              <td className="px-4 py-3">{request.approvedCount}</td>
              <td className="px-4 py-3"><Badge variant={request.status === "APPROVED" ? "accent" : request.status === "PENDING" ? "warning" : "secondary"}>{request.status}</Badge></td>
              <td className="px-4 py-3">{new Date(request.updatedAt).toLocaleString()}</td>
              {canProcessRequests ? (
                <td className="px-4 py-3">
                  {canActOnRequest(request) ? (
                    <div className="flex flex-wrap gap-2">
                      {canApproveRequests ? (
                        <>
                          <Button size="sm" onClick={() => onApprove(request.id)}>Approve</Button>
                          <Button size="sm" variant="outline" onClick={() => onReject(request.id)}>Reject</Button>
                        </>
                      ) : canAllocateRequests ? (
                        <Button size="sm" onClick={() => onAllocate(request.id)}>Allocate</Button>
                      ) : null}
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      {request.status === "PENDING" ? "Waiting for upper level" : "Done"}
                    </span>
                  )}
                </td>
              ) : null}
            </tr>
          ))}
          {!requests.length ? (
            <tr>
              <td colSpan={canProcessRequests ? 10 : 9} className="px-4 py-8 text-center text-muted-foreground">No LR requests found for the current scope.</td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}

function RecentAuditPanel({
  items,
  full = false,
}: {
  items: Array<{
    id: string;
    actor: string;
    action: string;
    entityName: string;
    timestamp: string;
    result: string;
  }>;
  full?: boolean;
}) {
  return (
    <div className="rounded-2xl border bg-white p-4">
      <div className="text-sm font-semibold">{full ? "Recent LR audit events" : "Recent audit events"}</div>
      <div className="mt-4 space-y-3">
        {items.length ? (
          items.map((item) => (
            <div key={item.id} className="rounded-2xl border bg-slate-50/70 px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-medium text-slate-950">{item.action}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{item.actor} | {item.entityName}</div>
                </div>
                <Badge variant={item.result === "success" ? "accent" : item.result === "warning" ? "warning" : "danger"}>
                  {item.result}
                </Badge>
              </div>
              <div className="mt-2 text-xs text-muted-foreground">{new Date(item.timestamp).toLocaleString()}</div>
            </div>
          ))
        ) : (
          <div className="text-sm text-muted-foreground">No LR audit events found yet.</div>
        )}
      </div>
    </div>
  );
}
