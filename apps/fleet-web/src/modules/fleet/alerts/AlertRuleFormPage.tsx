import { Save } from 'lucide-react';
import { FormEvent, ReactNode, useState } from 'react';
import { Button } from '../../../components/Button';
import { ErrorState } from '../../../components/ErrorState';
import { PageHeader } from '../../../components/PageHeader';
import { AlertPriority, AlertRule, AlertRuleStatus } from '../../../types';
import { AlertRuleFormErrors, AlertRuleFormValues, toAlertRule, validateAlertRule, valuesFromRule } from './alertValidation';

const modules: AlertRule['module'][] = ['Compliance', 'Fuel', 'Maintenance', 'Dispatch', 'Telematics'];
const severities: AlertPriority[] = ['Medium', 'High', 'Critical'];
const statuses: AlertRuleStatus[] = ['Active', 'Paused', 'Draft'];

export function AlertRuleFormPage({ mode, onCancel, onSubmit, rule }: { mode: 'create' | 'edit'; onCancel: () => void; onSubmit: (rule: AlertRule) => Promise<void>; rule?: AlertRule }) {
  const [values, setValues] = useState<AlertRuleFormValues>(() => valuesFromRule(rule));
  const [errors, setErrors] = useState<AlertRuleFormErrors>({});
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const update = (field: keyof AlertRuleFormValues, value: string) => { setValues((current) => ({ ...current, [field]: value })); setErrors((current) => ({ ...current, [field]: undefined })); };
  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const nextErrors = validateAlertRule(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    try { setSaving(true); await onSubmit(toAlertRule(values, rule)); } catch (error) { setSubmitError(error instanceof Error ? error.message : 'Unable to save alert rule.'); } finally { setSaving(false); }
  };
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <PageHeader actions={<Button onClick={onCancel} variant="outline">Cancel</Button>} subtitle="Configure exception triggers, severity, recipients, channels, and cooldowns." title={mode === 'create' ? 'Create Alert Rule' : 'Edit Alert Rule'} />
      {submitError && <ErrorState message={submitError} title="Save failed" />}
      <form className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm" onSubmit={handleSubmit}>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Field error={errors.name} label="Rule Name" onChange={(value) => update('name', value)} value={values.name} />
          <Select label="Module" onChange={(value) => update('module', value)} value={values.module}>{modules.map((item) => <option key={item}>{item}</option>)}</Select>
          <Select label="Severity" onChange={(value) => update('severity', value)} value={values.severity}>{severities.map((item) => <option key={item}>{item}</option>)}</Select>
          <Select label="Status" onChange={(value) => update('status', value)} value={values.status}>{statuses.map((item) => <option key={item}>{item}</option>)}</Select>
          <Field error={errors.recipient} label="Recipient" onChange={(value) => update('recipient', value)} value={values.recipient} />
          <Field error={errors.channel} label="Channel" onChange={(value) => update('channel', value)} value={values.channel} />
          <Field error={errors.cooldownMinutes} label="Cooldown Minutes" onChange={(value) => update('cooldownMinutes', value)} type="number" value={values.cooldownMinutes} />
          <Field error={errors.condition} label="Condition" onChange={(value) => update('condition', value)} value={values.condition} />
        </div>
        <div className="mt-6 flex justify-end gap-2"><Button onClick={onCancel} variant="outline">Cancel</Button><Button disabled={saving} icon={<Save className="h-4 w-4" />} type="submit" variant="accent">{saving ? 'Saving...' : 'Save Rule'}</Button></div>
      </form>
    </div>
  );
}

function Field({ error, label, onChange, type = 'text', value }: { error?: string; label: string; onChange: (value: string) => void; type?: string; value: string }) {
  return <label className="space-y-1"><span className="text-sm font-semibold text-gray-700">{label}</span><input className={`h-10 w-full rounded-lg border bg-white px-3 text-sm outline-none ring-primary/20 focus:border-primary focus:ring-4 ${error ? 'border-danger' : 'border-gray-300'}`} onChange={(event) => onChange(event.target.value)} type={type} value={value} />{error && <span className="text-xs font-semibold text-danger">{error}</span>}</label>;
}

function Select({ children, label, onChange, value }: { children: ReactNode; label: string; onChange: (value: string) => void; value: string }) {
  return <label className="space-y-1"><span className="text-sm font-semibold text-gray-700">{label}</span><select className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm outline-none ring-primary/20 focus:border-primary focus:ring-4" onChange={(event) => onChange(event.target.value)} value={value}>{children}</select></label>;
}
