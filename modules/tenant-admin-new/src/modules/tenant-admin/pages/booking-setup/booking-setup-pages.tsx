import type { ComponentType, ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  Boxes,
  Building2,
  ClipboardList,
  FileDigit,
  MapPin,
  Package,
  ScrollText,
  Settings2,
  Truck,
  Users,
} from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Select } from "@/shared/components/ui/select";
import { useTenantRouteContext } from "@/modules/tenant-admin/hooks/useTenantRouteContext";
import { useTenantCustomers } from "@/modules/tenant-admin/hooks/useTenantCustomers";
import { useTenantVendors } from "@/modules/tenant-admin/hooks/useTenantVendors";
import { useTenantPaths } from "@platform-admin/hooks/useTenantPaths";

// --- localStorage-backed setup config storage ------------------------------

const SETUP_STORAGE_KEY = "optimile.tenant.bookingSetup";

interface AssignmentRulesConfig {
  assignmentMode: "AUTO" | "CONTROLLED" | "MANUAL";
  vendorSelectionRule: "BEST_RATE" | "MANUAL" | "ROUND_ROBIN";
  vehicleRequirementRule: "STRICT" | "FLEXIBLE";
  driverAssignmentRule: "AUTO" | "VENDOR_MANAGED" | "MANUAL";
}

interface DocumentRulesConfig {
  invoiceRequired: boolean;
  ewaybillRequired: boolean;
  podRequired: boolean;
  uploadTiming: "BEFORE_DISPATCH" | "AFTER_DISPATCH" | "ON_POD";
}

interface PodRulesConfig {
  otpRequired: boolean;
  signatureRequired: boolean;
  photoRequired: boolean;
  recipientNameRequired: boolean;
}

interface TenantBookingSetupConfig {
  addresses: Array<{
    id: string;
    name: string;
    type: "CONSIGNOR" | "CONSIGNEE" | "BOTH";
    city: string;
    state: string;
    pincode: string;
    linkedCustomerId: string;
    status: "active" | "inactive";
  }>;
  assignmentRules?: AssignmentRulesConfig;
  documentRules?: DocumentRulesConfig;
  podRules?: PodRulesConfig;
}

const DEFAULT_SETUP: TenantBookingSetupConfig = {
  addresses: [],
  assignmentRules: { assignmentMode: "MANUAL", vendorSelectionRule: "MANUAL", vehicleRequirementRule: "FLEXIBLE", driverAssignmentRule: "VENDOR_MANAGED" },
  documentRules: { invoiceRequired: true, ewaybillRequired: true, podRequired: true, uploadTiming: "BEFORE_DISPATCH" },
  podRules: { otpRequired: false, signatureRequired: true, photoRequired: true, recipientNameRequired: true },
};

function loadAllSetup(): Record<string, TenantBookingSetupConfig> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(SETUP_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function loadTenantSetup(tenantId: string): TenantBookingSetupConfig {
  const all = loadAllSetup();
  return { ...DEFAULT_SETUP, ...all[tenantId] };
}

function saveTenantSetup(tenantId: string, config: TenantBookingSetupConfig) {
  if (typeof window === "undefined") return;
  const all = loadAllSetup();
  all[tenantId] = config;
  window.localStorage.setItem(SETUP_STORAGE_KEY, JSON.stringify(all));
}

// --- Booking Setup Overview ------------------------------------------------

export function BookingSetupOverviewPage() {
  const { tenantId, tenant } = useTenantRouteContext();
  const paths = useTenantPaths();
  const { data: customers } = useTenantCustomers(tenantId);
  const { data: vendors } = useTenantVendors(tenantId);
  const setup = loadTenantSetup(tenantId);

  const cards: Array<{
    title: string;
    icon: ComponentType<{ className?: string }>;
    count?: number;
    status: "configured" | "pending";
    to: string;
  }> = [
    { title: "Customers", icon: Users, count: customers.length, status: customers.length ? "configured" : "pending", to: paths.customers },
    { title: "Vendors", icon: Truck, count: vendors.length, status: vendors.length ? "configured" : "pending", to: paths.vendors },
    { title: "Vehicle Types", icon: Truck, status: "pending", to: paths.vehicleTypes },
    { title: "Materials", icon: Package, status: "pending", to: paths.materials },
    { title: "UOM", icon: Boxes, status: "pending", to: paths.uomConfig },
    { title: "Address Book", icon: MapPin, count: setup.addresses.length, status: setup.addresses.length ? "configured" : "pending", to: paths.addressBook },
    { title: "LR Configuration", icon: FileDigit, status: "pending", to: paths.lrConfig },
    { title: "Assignment Rules", icon: ClipboardList, status: setup.assignmentRules ? "configured" : "pending", to: paths.assignmentRules },
    { title: "Document Rules", icon: ScrollText, status: setup.documentRules ? "configured" : "pending", to: paths.documentRules },
    { title: "POD Rules", icon: Settings2, status: setup.podRules ? "configured" : "pending", to: paths.podRules },
  ];

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-200/80 pb-3">
        <div>
          <h1 className="text-[18px] font-semibold tracking-[-0.01em] text-slate-900">Booking Setup</h1>
          <p className="mt-0.5 text-[12px] text-slate-500">
            Configure master data and rules required by the Booking module for {tenant.name}.
          </p>
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <SetupCard key={card.title} {...card} />
        ))}
      </div>
    </div>
  );
}

function SetupCard({
  title,
  icon: Icon,
  count,
  status,
  to,
}: {
  title: string;
  icon: ComponentType<{ className?: string }>;
  count?: number;
  status: "configured" | "pending";
  to: string;
}) {
  return (
    <Link
      to={to}
      className="group flex flex-col gap-3 rounded-xl border bg-card p-4 transition hover:border-primary/40 hover:shadow-sm"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon className="size-4" />
          </div>
          <p className="text-[14px] font-semibold text-slate-900">{title}</p>
        </div>
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.06em] ${
            status === "configured" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
          }`}
        >
          {status === "configured" ? "Set" : "Pending"}
        </span>
      </div>
      {count !== undefined ? (
        <p className="text-[22px] font-semibold tracking-[-0.02em] text-slate-900">{count}</p>
      ) : null}
      <div className="mt-auto inline-flex items-center gap-1 text-[12px] font-medium text-primary">
        Setup
        <ArrowUpRight className="size-3.5" />
      </div>
    </Link>
  );
}

// --- Address Book -----------------------------------------------------------

export function TenantAddressBookPage() {
  const { tenantId } = useTenantRouteContext();
  const { data: customers } = useTenantCustomers(tenantId);
  const [setup, setSetup] = useState(() => loadTenantSetup(tenantId));
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    type: "CONSIGNEE" as "CONSIGNOR" | "CONSIGNEE" | "BOTH",
    city: "",
    state: "",
    pincode: "",
    linkedCustomerId: "",
    status: "active" as "active" | "inactive",
  });

  useEffect(() => {
    if (!feedback) return;
    const timer = window.setTimeout(() => setFeedback(""), 2500);
    return () => window.clearTimeout(timer);
  }, [feedback]);

  function openCreate() {
    setEditingId(null);
    setError("");
    setForm({ name: "", type: "CONSIGNEE", city: "", state: "", pincode: "", linkedCustomerId: "", status: "active" });
    setOpen(true);
  }

  function openEdit(id: string) {
    const entry = setup.addresses.find((address) => address.id === id);
    if (!entry) return;
    setEditingId(entry.id);
    setError("");
    setForm({
      name: entry.name,
      type: entry.type,
      city: entry.city,
      state: entry.state,
      pincode: entry.pincode,
      linkedCustomerId: entry.linkedCustomerId,
      status: entry.status,
    });
    setOpen(true);
  }

  function save() {
    if (form.name.trim().length < 2) { setError("Name is required."); return; }
    const entry = {
      id: editingId ?? `addr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: form.name.trim(),
      type: form.type,
      city: form.city.trim(),
      state: form.state.trim(),
      pincode: form.pincode.trim(),
      linkedCustomerId: form.linkedCustomerId,
      status: form.status,
    };
    const nextAddresses = editingId
      ? setup.addresses.map((address) => (address.id === editingId ? entry : address))
      : [entry, ...setup.addresses];
    const next = { ...setup, addresses: nextAddresses };
    setSetup(next);
    saveTenantSetup(tenantId, next);
    setOpen(false);
    setFeedback(editingId ? "Address updated." : "Address added.");
  }

  function remove(id: string) {
    const next = { ...setup, addresses: setup.addresses.filter((address) => address.id !== id) };
    setSetup(next);
    saveTenantSetup(tenantId, next);
    setFeedback("Address removed.");
  }

  const customerMap = new Map(customers.map((customer) => [customer.id, customer.name]));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[20px] font-semibold tracking-[-0.01em] text-slate-900">Address Book</h1>
          <p className="mt-0.5 text-[13px] text-slate-500">Consignor / consignee addresses linked to customers.</p>
        </div>
        <Button size="sm" onClick={openCreate}>Add Address</Button>
      </div>

      {feedback ? (
        <div className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-[12px] text-emerald-800">{feedback}</div>
      ) : null}

      <div className="overflow-hidden rounded-xl border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b bg-slate-50/60 text-left text-[11px] font-medium uppercase tracking-[0.08em] text-slate-500">
                <th className="px-4 py-2.5">Name</th>
                <th className="px-4 py-2.5">Type</th>
                <th className="px-4 py-2.5">City</th>
                <th className="px-4 py-2.5">State</th>
                <th className="px-4 py-2.5">Pincode</th>
                <th className="px-4 py-2.5">Linked Customer</th>
                <th className="px-4 py-2.5">Status</th>
                <th className="px-4 py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {setup.addresses.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-10 text-center text-[13px] text-slate-500">No addresses added yet.</td></tr>
              ) : (
                setup.addresses.map((entry) => (
                  <tr key={entry.id} className="border-b last:border-0 hover:bg-slate-50/60">
                    <td className="px-4 py-2.5 font-medium text-slate-900">{entry.name}</td>
                    <td className="px-4 py-2.5 text-slate-700">{entry.type === "BOTH" ? "Both" : entry.type === "CONSIGNOR" ? "Consignor" : "Consignee"}</td>
                    <td className="px-4 py-2.5 text-slate-700">{entry.city || "—"}</td>
                    <td className="px-4 py-2.5 text-slate-700">{entry.state || "—"}</td>
                    <td className="px-4 py-2.5 text-slate-700">{entry.pincode || "—"}</td>
                    <td className="px-4 py-2.5 text-slate-700">{customerMap.get(entry.linkedCustomerId) ?? "—"}</td>
                    <td className="px-4 py-2.5 text-slate-700">{entry.status}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="ghost" className="h-7 px-2 text-[11px]" onClick={() => openEdit(entry.id)}>Edit</Button>
                        <Button size="sm" variant="ghost" className="h-7 px-2 text-[11px]" onClick={() => remove(entry.id)}>Delete</Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
          <div className="w-full max-w-lg rounded-2xl border bg-card shadow-xl">
            <div className="border-b px-5 py-4">
              <h2 className="text-[15px] font-semibold text-slate-900">{editingId ? "Edit Address" : "Add Address"}</h2>
            </div>
            <div className="grid gap-3 p-5 md:grid-cols-2">
              {error ? <div className="md:col-span-2 rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-[12px] text-rose-700">{error}</div> : null}
              <SetupField label="Name"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></SetupField>
              <SetupField label="Type">
                <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as typeof form.type })}>
                  <option value="CONSIGNOR">Consignor</option>
                  <option value="CONSIGNEE">Consignee</option>
                  <option value="BOTH">Both</option>
                </Select>
              </SetupField>
              <SetupField label="City"><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></SetupField>
              <SetupField label="State"><Input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} /></SetupField>
              <SetupField label="Pincode"><Input value={form.pincode} onChange={(e) => setForm({ ...form, pincode: e.target.value })} /></SetupField>
              <SetupField label="Linked Customer">
                <Select value={form.linkedCustomerId} onChange={(e) => setForm({ ...form, linkedCustomerId: e.target.value })}>
                  <option value="">None</option>
                  {customers.map((customer) => (<option key={customer.id} value={customer.id}>{customer.name}</option>))}
                </Select>
              </SetupField>
              <SetupField label="Status">
                <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as typeof form.status })}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </Select>
              </SetupField>
            </div>
            <div className="flex justify-end gap-2 border-t px-5 py-3">
              <Button size="sm" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button size="sm" onClick={save}>Save</Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

// --- Assignment Rules -------------------------------------------------------

export function TenantAssignmentRulesPage() {
  const { tenantId } = useTenantRouteContext();
  const [setup, setSetup] = useState(() => loadTenantSetup(tenantId));
  const rules = setup.assignmentRules ?? DEFAULT_SETUP.assignmentRules!;
  const [feedback, setFeedback] = useState("");

  function update<K extends keyof AssignmentRulesConfig>(key: K, value: AssignmentRulesConfig[K]) {
    const next = { ...setup, assignmentRules: { ...rules, [key]: value } };
    setSetup(next);
    saveTenantSetup(tenantId, next);
    setFeedback("Saved.");
  }

  useEffect(() => {
    if (!feedback) return;
    const timer = window.setTimeout(() => setFeedback(""), 1800);
    return () => window.clearTimeout(timer);
  }, [feedback]);

  return (
    <ConfigShell
      title="Assignment Rules"
      subtitle="How bookings are assigned to vendors, vehicles, and drivers."
      feedback={feedback}
    >
      <ConfigRow label="Assignment Mode" hint="Auto routes a booking, Controlled queues for review, Manual requires explicit assignment.">
        <Select value={rules.assignmentMode} onChange={(e) => update("assignmentMode", e.target.value as AssignmentRulesConfig["assignmentMode"])}>
          <option value="AUTO">Auto</option>
          <option value="CONTROLLED">Controlled</option>
          <option value="MANUAL">Manual</option>
        </Select>
      </ConfigRow>
      <ConfigRow label="Vendor Selection Rule">
        <Select value={rules.vendorSelectionRule} onChange={(e) => update("vendorSelectionRule", e.target.value as AssignmentRulesConfig["vendorSelectionRule"])}>
          <option value="BEST_RATE">Best Rate</option>
          <option value="ROUND_ROBIN">Round Robin</option>
          <option value="MANUAL">Manual</option>
        </Select>
      </ConfigRow>
      <ConfigRow label="Vehicle Requirement Rule">
        <Select value={rules.vehicleRequirementRule} onChange={(e) => update("vehicleRequirementRule", e.target.value as AssignmentRulesConfig["vehicleRequirementRule"])}>
          <option value="STRICT">Strict (exact vehicle type)</option>
          <option value="FLEXIBLE">Flexible (equivalent capacity)</option>
        </Select>
      </ConfigRow>
      <ConfigRow label="Driver Assignment Rule">
        <Select value={rules.driverAssignmentRule} onChange={(e) => update("driverAssignmentRule", e.target.value as AssignmentRulesConfig["driverAssignmentRule"])}>
          <option value="AUTO">Auto</option>
          <option value="VENDOR_MANAGED">Vendor Managed</option>
          <option value="MANUAL">Manual</option>
        </Select>
      </ConfigRow>
    </ConfigShell>
  );
}

// --- Document Rules ---------------------------------------------------------

export function TenantDocumentRulesPage() {
  const { tenantId } = useTenantRouteContext();
  const [setup, setSetup] = useState(() => loadTenantSetup(tenantId));
  const rules = setup.documentRules ?? DEFAULT_SETUP.documentRules!;
  const [feedback, setFeedback] = useState("");

  function update<K extends keyof DocumentRulesConfig>(key: K, value: DocumentRulesConfig[K]) {
    const next = { ...setup, documentRules: { ...rules, [key]: value } };
    setSetup(next);
    saveTenantSetup(tenantId, next);
    setFeedback("Saved.");
  }

  useEffect(() => {
    if (!feedback) return;
    const timer = window.setTimeout(() => setFeedback(""), 1800);
    return () => window.clearTimeout(timer);
  }, [feedback]);

  return (
    <ConfigShell title="Document Rules" subtitle="What documents are required for every booking." feedback={feedback}>
      <ConfigToggleRow label="Invoice Required" checked={rules.invoiceRequired} onChange={(value) => update("invoiceRequired", value)} />
      <ConfigToggleRow label="E-waybill Required" checked={rules.ewaybillRequired} onChange={(value) => update("ewaybillRequired", value)} />
      <ConfigToggleRow label="POD Required" checked={rules.podRequired} onChange={(value) => update("podRequired", value)} />
      <ConfigRow label="Upload Timing">
        <Select value={rules.uploadTiming} onChange={(e) => update("uploadTiming", e.target.value as DocumentRulesConfig["uploadTiming"])}>
          <option value="BEFORE_DISPATCH">Before Dispatch</option>
          <option value="AFTER_DISPATCH">After Dispatch</option>
          <option value="ON_POD">On POD</option>
        </Select>
      </ConfigRow>
    </ConfigShell>
  );
}

// --- POD Rules --------------------------------------------------------------

export function TenantPodRulesPage() {
  const { tenantId } = useTenantRouteContext();
  const [setup, setSetup] = useState(() => loadTenantSetup(tenantId));
  const rules = setup.podRules ?? DEFAULT_SETUP.podRules!;
  const [feedback, setFeedback] = useState("");

  function update<K extends keyof PodRulesConfig>(key: K, value: PodRulesConfig[K]) {
    const next = { ...setup, podRules: { ...rules, [key]: value } };
    setSetup(next);
    saveTenantSetup(tenantId, next);
    setFeedback("Saved.");
  }

  useEffect(() => {
    if (!feedback) return;
    const timer = window.setTimeout(() => setFeedback(""), 1800);
    return () => window.clearTimeout(timer);
  }, [feedback]);

  return (
    <ConfigShell title="POD Rules" subtitle="What's captured at proof-of-delivery." feedback={feedback}>
      <ConfigToggleRow label="OTP Required" checked={rules.otpRequired} onChange={(value) => update("otpRequired", value)} />
      <ConfigToggleRow label="Signature Required" checked={rules.signatureRequired} onChange={(value) => update("signatureRequired", value)} />
      <ConfigToggleRow label="Photo Required" checked={rules.photoRequired} onChange={(value) => update("photoRequired", value)} />
      <ConfigToggleRow label="Recipient Name Required" checked={rules.recipientNameRequired} onChange={(value) => update("recipientNameRequired", value)} />
    </ConfigShell>
  );
}

// --- Shared helpers ---------------------------------------------------------

function ConfigShell({ title, subtitle, feedback, children }: { title: string; subtitle: string; feedback: string; children: ReactNode }) {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[20px] font-semibold tracking-[-0.01em] text-slate-900">{title}</h1>
        <p className="mt-0.5 text-[13px] text-slate-500">{subtitle}</p>
      </div>
      {feedback ? (
        <div className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-[12px] text-emerald-800">{feedback}</div>
      ) : null}
      <div className="rounded-xl border bg-card divide-y">
        {children}
      </div>
    </div>
  );
}

function ConfigRow({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="grid gap-2 px-4 py-3 sm:grid-cols-[1fr_220px] sm:items-center">
      <div>
        <p className="text-[13px] font-medium text-slate-900">{label}</p>
        {hint ? <p className="mt-0.5 text-[11px] text-slate-500">{hint}</p> : null}
      </div>
      <div>{children}</div>
    </div>
  );
}

function ConfigToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-between px-4 py-3">
      <span className="text-[13px] font-medium text-slate-900">{label}</span>
      <input type="checkbox" className="size-4 accent-primary" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    </label>
  );
}

function SetupField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[12px] font-medium text-slate-700">{label}</label>
      {children}
    </div>
  );
}

// Silence unused-icon warnings (referenced via component refs from this module
// or sibling pages later).
void Building2;
