import { AlertPriority, AlertRule, AlertRuleStatus, FleetAlert } from '../../../types';

export interface AlertRuleFormValues {
  channel: string;
  condition: string;
  cooldownMinutes: string;
  module: AlertRule['module'];
  name: string;
  recipient: string;
  severity: AlertPriority;
  status: AlertRuleStatus;
}

export type AlertRuleFormErrors = Partial<Record<keyof AlertRuleFormValues, string>>;

export function valuesFromRule(rule?: AlertRule): AlertRuleFormValues {
  return {
    channel: rule?.channel ?? 'In-app + Email',
    condition: rule?.condition ?? '',
    cooldownMinutes: rule?.cooldownMinutes.toString() ?? '60',
    module: rule?.module ?? 'Compliance',
    name: rule?.name ?? '',
    recipient: rule?.recipient ?? '',
    severity: rule?.severity ?? 'High',
    status: rule?.status ?? 'Draft',
  };
}

export function validateAlertRule(values: AlertRuleFormValues): AlertRuleFormErrors {
  const errors: AlertRuleFormErrors = {};
  if (!values.name.trim()) errors.name = 'Rule name is required.';
  if (!values.condition.trim()) errors.condition = 'Condition is required.';
  if (!values.recipient.trim()) errors.recipient = 'Recipient is required.';
  if (!values.channel.trim()) errors.channel = 'Channel is required.';
  if (Number(values.cooldownMinutes) < 0) errors.cooldownMinutes = 'Cooldown cannot be negative.';
  return errors;
}

export function toAlertRule(values: AlertRuleFormValues, existing?: AlertRule): AlertRule {
  return {
    id: existing?.id ?? `rule-${Date.now()}`,
    channel: values.channel.trim(),
    condition: values.condition.trim(),
    cooldownMinutes: Number(values.cooldownMinutes || 0),
    createdAt: existing?.createdAt ?? new Date().toISOString().slice(0, 10),
    module: values.module,
    name: values.name.trim(),
    recipient: values.recipient.trim(),
    severity: values.severity,
    status: values.status,
  };
}

export function severityTone(priority: AlertPriority) {
  if (priority === 'Critical') return 'danger';
  if (priority === 'High') return 'warning';
  return 'primary';
}

export function exceptionStatusTone(status?: FleetAlert['status']) {
  if (status === 'Resolved') return 'success';
  return 'danger';
}

export function ruleStatusTone(status: AlertRuleStatus) {
  if (status === 'Active') return 'success';
  if (status === 'Paused') return 'warning';
  return 'neutral';
}
