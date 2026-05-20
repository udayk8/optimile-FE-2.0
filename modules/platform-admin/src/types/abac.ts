export type PolicyEffect = "allow" | "deny";
export type PolicyStatus = "active" | "inactive";
export type RuleLogic = "AND" | "OR";
export type ConditionCategory = "subject" | "resource" | "environment";
export type Operator =
  | "equals"
  | "not equals"
  | "contains"
  | "in"
  | "not in"
  | "starts with"
  | "greater than"
  | "less than"
  | "path prefix match";
export type AccessScope = "SELF" | "ASSIGNED_NODE" | "NODE_AND_DESCENDANTS" | "ALL";

export interface Capability {
  id: string;
  moduleCode: string;
  code: string;
  name: string;
  description: string;
  actions: string[];
  status: "active" | "pilot";
}

export interface PolicyCondition {
  id: string;
  type: "condition";
  category: ConditionCategory;
  attribute: string;
  operator: Operator;
  value: string | string[] | boolean | number;
}

export interface PolicyGroup {
  id: string;
  type: "group";
  logic: RuleLogic;
  children: PolicyNode[];
}

export type PolicyNode = PolicyCondition | PolicyGroup;

export interface PolicyRecord {
  id: string;
  name: string;
  tenantId: string;
  description: string;
  effect: PolicyEffect;
  resourceType: string;
  capabilityCode: string;
  action: string;
  priority: number;
  status: PolicyStatus;
  lastUpdated: string;
  tags: string[];
  references: {
    roleIds: string[];
  };
  scope: AccessScope;
  rule: PolicyGroup;
}

export interface AuditLogRecord {
  id: string;
  actor: string;
  tenantId: string;
  action: string;
  entityType: string;
  entityName: string;
  timestamp: string;
  changeType: string;
  result: "success" | "denied" | "warning";
  summary: string;
}

export interface SimulationInput {
  tenantId: string;
  userId: string;
  resourceType: string;
  capabilityCode: string;
  action: string;
  orgUnitId: string;
  resourceStatus: string;
  isSensitive: boolean;
  channel: string;
  envCountry: string;
  currentTime: string;
}
