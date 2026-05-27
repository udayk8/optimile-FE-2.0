import {
  alertRulesSeed,
  customerVisibilityRulesSeed,
  dataRetentionRulesSeed,
  featureAccessConfigSeed,
  slaRulesSeed,
  trackingRulesSeed,
} from '../store/settingsMockData'
import type {
  AlertRule,
  CustomerVisibilityRules,
  DataRetentionRules,
  FeatureAccessConfig,
  SlaRules,
  TrackingRules,
} from '../types/settings.types'

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function resolveAfter<T>(value: T, ms = 120): Promise<T> {
  return new Promise((resolve) => window.setTimeout(() => resolve(clone(value)), ms))
}

let trackingRulesDb = clone(trackingRulesSeed)
let slaRulesDb = clone(slaRulesSeed)
let alertRulesDb = clone(alertRulesSeed)
let customerVisibilityRulesDb = clone(customerVisibilityRulesSeed)
let dataRetentionRulesDb = clone(dataRetentionRulesSeed)
let featureAccessDb = clone(featureAccessConfigSeed)

export async function getTrackingRules(): Promise<TrackingRules> {
  return resolveAfter(trackingRulesDb)
}

export async function updateTrackingRules(payload: TrackingRules) {
  trackingRulesDb = clone(payload)
  return resolveAfter(trackingRulesDb)
}

export async function getSlaRules(): Promise<SlaRules> {
  return resolveAfter(slaRulesDb)
}

export async function updateSlaRules(payload: SlaRules) {
  slaRulesDb = clone(payload)
  return resolveAfter(slaRulesDb)
}

export async function getAlertRules(): Promise<AlertRule[]> {
  return resolveAfter(alertRulesDb)
}

export async function updateAlertRule(ruleId: string, payload: AlertRule) {
  alertRulesDb = alertRulesDb.map((rule) => (rule.id === ruleId ? clone(payload) : rule))
  return resolveAfter(payload)
}

export async function getCustomerVisibilityRules(): Promise<CustomerVisibilityRules> {
  return resolveAfter(customerVisibilityRulesDb)
}

export async function updateCustomerVisibilityRules(payload: CustomerVisibilityRules) {
  customerVisibilityRulesDb = clone(payload)
  return resolveAfter(customerVisibilityRulesDb)
}

export async function getDataRetentionRules(): Promise<DataRetentionRules> {
  return resolveAfter(dataRetentionRulesDb)
}

export async function updateDataRetentionRules(payload: DataRetentionRules) {
  dataRetentionRulesDb = clone(payload)
  return resolveAfter(dataRetentionRulesDb)
}

export async function getFeatureAccessConfig(): Promise<FeatureAccessConfig> {
  return resolveAfter(featureAccessDb)
}

export async function updateFeatureAccessConfig(payload: FeatureAccessConfig) {
  featureAccessDb = clone(payload)
  return resolveAfter(featureAccessDb)
}
