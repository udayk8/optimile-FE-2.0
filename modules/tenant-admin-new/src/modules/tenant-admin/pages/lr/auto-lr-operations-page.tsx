import { useMemo, useState, type ReactNode } from "react";
import { ShieldCheck } from "lucide-react";
import { PageHeader } from "@/shared/components/common/page-header";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Select } from "@/shared/components/ui/select";
import { Textarea } from "@/shared/components/ui/textarea";
import { TenantEmptyState, TenantPanel, TenantSummaryCard } from "@/modules/tenant-admin/components/tenant-primitives";
import { useSessionContext } from "@/shared/auth/session-context";
import { useTenantLRConfigs } from "@/modules/tenant-admin/hooks/useTenantMasterData";
import { useTenantOrgTypes } from "@/modules/tenant-admin/hooks/useTenantOrgTypes";
import { useTenantOrgUnits } from "@/modules/tenant-admin/hooks/useTenantOrgUnits";
import { useTenantRouteContext } from "@/modules/tenant-admin/hooks/useTenantRouteContext";
import { useTenantUsers } from "@/modules/tenant-admin/hooks/useTenantUsers";
import { useTenantLrManagementService } from "@/modules/tenant-admin/hooks/useTenantLrManagementService";
import { useAppStore } from "@/shared/store/useAppStore";
import { autoLrTabDefinitions, type AutoLrTabKey, buildAutoLrRuntimePreview, computeAutoLrPlaceInventory } from "@/modules/tenant-admin/lib/auto-lr";
import { buildManualLrPreview, resolveManualLrFormatForOrgUnit } from "@/modules/tenant-admin/lib/manual-lr";
import type { TenantLrAllocationRequestRecord } from "@/modules/tms/booking/types";
import type { OrgUnit } from "@/types/access";

export function TenantAutoLrOperationsPage() {
  const { tenant } = useTenantRouteContext();
  const { session } = useSessionContext();
  const { data: users } = useTenantUsers(tenant.id);
  const { data: lrConfigs } = useTenantLRConfigs(tenant.id);
  const { data: hierarchyLevels } = useTenantOrgTypes(tenant.id);
  const { data: orgUnits } = useTenantOrgUnits(tenant.id);
  const store = useAppStore(tenant.id);
  const lrManagement = useTenantLrManagementService();
  const [activeTab, setActiveTab] = useState<AutoLrTabKey>("governance");
  const [requestCount, setRequestCount] = useState("25");
  const [requestReason, setRequestReason] = useState("");
  const [message, setMessage] = useState("");

  const autoConfig =
    lrConfigs.find((config) => config.lrType === "AUTO" && config.status === "active") ??
    lrConfigs.find((config) => config.lrType === "AUTO") ??
    null;
  const currentUser = useMemo(
    () => users.find((user) => user.name === session.actorName || user.email === session.actorName) ?? null,
    [session.actorName, users],
  );
  const orgUnitMap = useMemo(() => new Map(orgUnits.map((orgUnit) => [orgUnit.id, orgUnit])), [orgUnits]);
  const hierarchyLevelMap = useMemo(() => new Map(hierarchyLevels.map((level) => [level.id, level])), [hierarchyLevels]);
  const activeOrgUnit = useMemo(() => {
    if (!currentUser?.orgUnitIds?.length) {
      return null;
    }
    return (
      orgUnits.find((orgUnit) => orgUnit.id === session.activeTenantOrgUnitId && currentUser.orgUnitIds.includes(orgUnit.id)) ??
      orgUnits.find((orgUnit) => currentUser.orgUnitIds.includes(orgUnit.id)) ??
      null
    );
  }, [currentUser?.orgUnitIds, orgUnits, session.activeTenantOrgUnitId]);
  const currentLevel = activeOrgUnit ? hierarchyLevelMap.get(activeOrgUnit.hierarchyLevelId) ?? null : null;
  const currentRule =
    currentLevel && autoConfig
      ? autoConfig.childGovernanceRules?.find((rule) => rule.childLevelId === currentLevel.id) ?? null
      : null;
  const childLevel =
    currentLevel
      ? hierarchyLevels.filter((level) => level.active && level.order > currentLevel.order).sort((a, b) => a.order - b.order)[0] ?? null
      : hierarchyLevels.filter((level) => level.active).sort((a, b) => a.order - b.order)[0] ?? null;
  const childRule =
    childLevel && autoConfig
      ? autoConfig.childGovernanceRules?.find((rule) => rule.childLevelId === childLevel.id) ?? null
      : null;
  const generatedRecords = store.lrs.filter((record) => record.configId === autoConfig?.id);
  const relevantRequests = store.lrRequests.filter(
    (request) =>
      request.configId === autoConfig?.id &&
      (!activeOrgUnit || request.sourceOrgUnitId === activeOrgUnit.id || request.targetOrgUnitId === activeOrgUnit.id),
  );
  const runtimePreview = autoConfig
    ? buildAutoLrRuntimePreview({
        config: autoConfig,
        orgUnitId: activeOrgUnit?.id ?? null,
        orgUnits,
        generatedRecords,
      })
    : null;
  const activeFormat = autoConfig
    ? resolveManualLrFormatForOrgUnit(autoConfig, activeOrgUnit?.id ?? null, orgUnits)
    : null;
  // Count/quota inventory across the user's place scope (active place + child
  // places; all places when at Company Root / no active place).
  const autoConfigRequests = autoConfig ? store.lrRequests.filter((request) => request.configId === autoConfig.id) : [];
  const autoScopedPlaceIds = useMemo(() => {
    if (!activeOrgUnit) return orgUnits.map((unit) => unit.id);
    const childrenOf = new Map<string, typeof orgUnits>();
    orgUnits.forEach((unit) => {
      if (!unit.parentOrgUnitId) return;
      const list = childrenOf.get(unit.parentOrgUnitId) ?? [];
      list.push(unit);
      childrenOf.set(unit.parentOrgUnitId, list);
    });
    const seen = new Set<string>();
    const queue = [activeOrgUnit.id];
    while (queue.length) {
      const id = queue.shift();
      if (!id || seen.has(id)) continue;
      seen.add(id);
      (childrenOf.get(id) ?? []).forEach((child) => queue.push(child.id));
    }
    return Array.from(seen);
  }, [activeOrgUnit, orgUnits]);
  const autoInventoryRows = autoConfig
    ? autoScopedPlaceIds
        .map((placeId) => ({
          placeId,
          placeName: orgUnitMap.get(placeId)?.name ?? placeId,
          inventory: computeAutoLrPlaceInventory({
            config: autoConfig,
            placeId,
            orgUnits,
            requests: autoConfigRequests,
            generatedRecords,
          }),
        }))
        .filter((row) => row.inventory.approvedCount > 0 || row.inventory.generatedCount > 0)
    : [];
  const canSubmitRequest = Boolean(currentLevel && currentRule?.childCanRequestLr);
  const canApprove = Boolean(childRule?.canApproveChildRequests);
  const canAllocate = Boolean(childRule?.parentCanGenerateLr);
  const canActOnRequest = (request: TenantLrAllocationRequestRecord) => {
    if (request.status !== "PENDING") {
      return false;
    }
    if (!activeOrgUnit) {
      return !request.targetOrgUnitId;
    }
    return request.targetOrgUnitId === activeOrgUnit.id;
  };

  if (!autoConfig) {
    return (
      <TenantEmptyState
        title="Auto LR configuration is required"
        description="Open Auto LR configuration first. Auto LR uses runtime sequence generation and does not maintain physical inventory."
      />
    );
  }
  const resolvedAutoConfig = autoConfig;

  async function handleRequest() {
    if (!activeOrgUnit) {
      setMessage("Select the active place before requesting Auto LR generation rights.");
      return;
    }
    const quantity = Number(requestCount);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      setMessage("Enter a valid request count.");
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
      note: requestReason || "Auto LR generation rights request",
      sourceOrgUnitId: activeOrgUnit.id,
      targetOrgUnitId: parentUnit?.id ?? null,
      sourceUserId: currentUser?.id ?? null,
      targetUserId: null,
      lrType: "AUTO",
      configId: resolvedAutoConfig.id,
      customerId: null,
      branchName: activeOrgUnit.name,
      branchCode: activeOrgUnit.id.toUpperCase(),
      lastSequenceNumber: null,
      rejectionReason: null,
    });
    setMessage(`Auto LR request created for ${quantity} runtime generation rights.`);
  }

  async function handleRequestDecision(requestId: string, approve: boolean) {
    const request = relevantRequests.find((item) => item.id === requestId && item.status === "PENDING");
    if (!request) {
      setMessage("Request not found.");
      return;
    }
    if (approve) {
      await lrManagement.approveRequest(request.id, request.requestedCount, currentUser?.name ?? "Tenant User", "Auto LR runtime access approved.");
      setMessage("Auto LR request approved.");
      return;
    }
    await lrManagement.rejectRequest(request.id, currentUser?.name ?? "Tenant User", "Auto LR runtime access rejected.");
    setMessage("Auto LR request rejected.");
  }

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Operations" title="Auto LR" description="" />
      {message ? <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">{message}</div> : null}

      <div className="flex flex-wrap gap-2">
        {autoLrTabDefinitions.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`rounded-full border px-3 py-1.5 text-sm ${activeTab === tab.key ? "border-sky-300 bg-sky-100 text-sky-900" : "border-slate-200 bg-white text-slate-600"}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "governance" ? (
        <TenantPanel title="Governance" description="">
          <div className="grid gap-3 lg:grid-cols-4">
            <TenantSummaryCard label="Workspace" value={activeOrgUnit?.name ?? "Tenant / Company Level"} />
            <TenantSummaryCard label="Current Level" value={currentLevel?.name ?? "Tenant / Company Level"} />
            <TenantSummaryCard label="Child Level" value={childLevel?.name ?? "No child"} />
            <TenantSummaryCard label="Resolved Pattern" value={runtimePreview?.formatPreview ?? buildManualLrPreview(activeFormat ?? autoConfig)} />
          </div>
        </TenantPanel>
      ) : null}

      {activeTab === "sequence" ? (
        <TenantPanel title="Sequence Rules" description="">
          <InfoRows
            rows={[
              ["Prefix", activeFormat?.prefix ?? autoConfig.prefix],
              ["Year", activeFormat?.yearFormat ?? autoConfig.yearFormat ?? "NONE"],
              ["Separator", activeFormat?.numberSeparator ?? autoConfig.numberSeparator ?? "-"],
              ["Padding", String(activeFormat?.zeroPaddingLength ?? autoConfig.zeroPaddingLength ?? 6)],
            ]}
          />
        </TenantPanel>
      ) : null}

      {activeTab === "allocation" ? (
        <TenantPanel title="Allocation Rights" description="">
          <div className="grid gap-3 lg:grid-cols-4">
            <TenantSummaryCard
              label={`${currentLevel?.name ?? "Current level"} generate`}
              value={currentRule?.canConsumeParentLr ? "Yes" : "No"}
            />
            <TenantSummaryCard
              label={`${childLevel?.name ?? "Child level"} generate`}
              value={childRule?.parentCanGenerateLr ? "Allowed" : "Blocked"}
            />
            <TenantSummaryCard
              label={`${childLevel?.name ?? "Child level"} request`}
              value={childRule?.childCanRequestLr ? "Allowed" : "Blocked"}
            />
            <TenantSummaryCard
              label={`${childLevel?.name ?? "Child level"} approval`}
              value={childRule?.canApproveChildRequests ? "Required" : "Direct"}
            />
          </div>
        </TenantPanel>
      ) : null}

      {activeTab === "requests" ? (
        <TenantPanel title="Requests" description="">
          {canSubmitRequest ? (
            <div className="grid gap-4 rounded-2xl border bg-slate-50/70 p-4 md:grid-cols-[1fr_160px]">
              <Field label="Requesting org unit">
                <Input value={activeOrgUnit?.name ?? "Select active place"} disabled />
              </Field>
              <Field label="Requested count">
                <Input value={requestCount} onChange={(event) => setRequestCount(event.target.value)} />
              </Field>
              <Field label="Reason / remarks" className="md:col-span-2">
                <Textarea value={requestReason} onChange={(event) => setRequestReason(event.target.value)} className="min-h-[90px]" />
              </Field>
              <div className="md:col-span-2">
                <Button onClick={handleRequest}>Submit Request</Button>
              </div>
            </div>
          ) : null}
          <AutoRequestTable
            requests={relevantRequests}
            orgUnitMap={orgUnitMap}
            config={resolvedAutoConfig}
            orgUnits={orgUnits}
            canApprove={canApprove}
            canAllocate={canAllocate}
            canActOnRequest={canActOnRequest}
            onApprove={(requestId) => handleRequestDecision(requestId, true)}
            onReject={(requestId) => handleRequestDecision(requestId, false)}
          />
        </TenantPanel>
      ) : null}

      {activeTab === "audit" ? (
        <TenantPanel title="Generation Audit" description="">
          <div className="overflow-x-auto rounded-2xl border">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  {["LR Number", "Booking", "Delivery", "Generated At", "Status"].map((label) => (
                    <th key={label} className="px-4 py-3 text-left font-medium text-slate-600">{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {generatedRecords.map((record) => (
                  <tr key={record.id}>
                    <td className="px-4 py-3 font-mono">{record.lrNumber}</td>
                    <td className="px-4 py-3">{record.bookingId}</td>
                    <td className="px-4 py-3">{record.deliveryId}</td>
                    <td className="px-4 py-3">{new Date(record.createdAt).toLocaleString()}</td>
                    <td className="px-4 py-3"><Badge variant="accent">{record.status}</Badge></td>
                  </tr>
                ))}
                {!generatedRecords.length ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No Auto LR has been generated yet.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </TenantPanel>
      ) : null}

      {activeTab === "runtime" ? (
        <TenantPanel title="Runtime Preview & Auto LR Inventory" description="">
          <div className="grid gap-3 lg:grid-cols-3">
            <TenantSummaryCard label="Current Context" value={activeOrgUnit?.name ?? "Tenant / Company Level"} />
            <TenantSummaryCard label="Resolved Pattern" value={runtimePreview?.formatPreview ?? buildManualLrPreview(activeFormat ?? autoConfig)} />
            <TenantSummaryCard label="Next Generated Number" value={runtimePreview?.nextNumber ?? buildManualLrPreview(activeFormat ?? autoConfig)} />
          </div>
          <div className="mt-4 overflow-x-auto rounded-2xl border">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  {["Place", "Series / Format", "Approved", "Available", "Generated", "Next LR", "Last Generated", "Approved From", "Status"].map((label) => (
                    <th key={label} className="px-4 py-3 text-left font-medium text-slate-600">{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {autoInventoryRows.length ? (
                  autoInventoryRows.map((row) => (
                    <tr key={row.placeId}>
                      <td className="px-4 py-3 font-medium text-slate-800">{row.placeName}</td>
                      <td className="px-4 py-3 font-mono text-xs">{row.inventory.formatPreview}</td>
                      <td className="px-4 py-3">{row.inventory.approvedCount}</td>
                      <td className="px-4 py-3 font-semibold text-slate-900">{row.inventory.availableCount}</td>
                      <td className="px-4 py-3">{row.inventory.generatedCount}</td>
                      <td className="px-4 py-3 font-mono text-xs">{row.inventory.nextNumber}</td>
                      <td className="px-4 py-3 font-mono text-xs">{row.inventory.lastGenerated ?? "—"}</td>
                      <td className="px-4 py-3">{row.inventory.approverOrgUnitId ? orgUnitMap.get(row.inventory.approverOrgUnitId)?.name ?? "—" : "—"}</td>
                      <td className="px-4 py-3">
                        {row.inventory.availableCount > 0 ? "Available" : row.inventory.approvedCount > 0 ? "Exhausted" : "No quota"}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-slate-500">
                      No Auto LR quota in this scope yet. Approve an Auto LR request to create available count.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </TenantPanel>
      ) : null}
    </div>
  );
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

function InfoRows({ rows }: { rows: Array<[string, string]> }) {
  return (
    <div className="rounded-2xl border bg-white p-4">
      <div className="space-y-3">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between gap-4 border-b pb-3 last:border-b-0 last:pb-0">
            <div className="text-sm text-muted-foreground">{label}</div>
            <div className="font-mono text-sm text-slate-950">{value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AutoRequestTable({
  requests,
  orgUnitMap,
  config,
  orgUnits,
  canApprove,
  canAllocate,
  canActOnRequest,
  onApprove,
  onReject,
}: {
  requests: TenantLrAllocationRequestRecord[];
  orgUnitMap: Map<string, OrgUnit>;
  config: NonNullable<ReturnType<typeof useTenantLRConfigs>["data"][number]>;
  orgUnits: OrgUnit[];
  canApprove: boolean;
  canAllocate: boolean;
  canActOnRequest: (request: TenantLrAllocationRequestRecord) => boolean;
  onApprove: (requestId: string) => void;
  onReject: (requestId: string) => void;
}) {
  return (
    <div className="mt-6 overflow-x-auto rounded-2xl border">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50">
          <tr>
            {["Requester", "Format", "Approver place", "Requested", "Approved", "Status", "Updated", "Action"].map((label) => (
              <th key={label} className="px-4 py-3 text-left font-medium text-slate-600">{label}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {requests.map((request) => (
            <tr key={request.id}>
              <td className="px-4 py-3">{orgUnitMap.get(request.sourceOrgUnitId ?? "")?.name ?? request.branchName ?? "--"}</td>
              <td className="px-4 py-3 font-mono text-xs">{request.sourceOrgUnitId ? buildManualLrPreview(resolveManualLrFormatForOrgUnit(config, request.sourceOrgUnitId, orgUnits)) : "--"}</td>
              <td className="px-4 py-3">{orgUnitMap.get(request.targetOrgUnitId ?? "")?.name ?? "Tenant / Company Level"}</td>
              <td className="px-4 py-3">{request.requestedCount}</td>
              <td className="px-4 py-3">{request.approvedCount}</td>
              <td className="px-4 py-3"><Badge variant={request.status === "APPROVED" ? "accent" : request.status === "PENDING" ? "warning" : "secondary"}>{request.status}</Badge></td>
              <td className="px-4 py-3">{new Date(request.updatedAt).toLocaleString()}</td>
              <td className="px-4 py-3">
                {canActOnRequest(request) ? (
                  <div className="flex flex-wrap gap-2">
                    {(canApprove || canAllocate) ? <Button size="sm" onClick={() => onApprove(request.id)}>Approve</Button> : null}
                    {canApprove ? <Button size="sm" variant="outline" onClick={() => onReject(request.id)}>Reject</Button> : null}
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground">{request.status === "PENDING" ? "Waiting for upper level" : "Done"}</span>
                )}
              </td>
            </tr>
          ))}
          {!requests.length ? (
            <tr>
              <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">No Auto LR requests found for this scope.</td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}
