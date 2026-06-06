import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import { FileDown, Pencil, PencilLine, Plus, Trash2 } from "lucide-react";
import { z } from "zod";
import { DataTable } from "@/shared/components/common/data-table";
import { PageHeader } from "@/shared/components/common/page-header";
import {
  TenantEmptyState,
  TenantFilterBar,
  TenantPanel,
  TenantSummaryCard,
} from "@/modules/tenant-admin/components/tenant-primitives";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Dialog } from "@/shared/components/ui/dialog";
import { Input } from "@/shared/components/ui/input";
import { Select } from "@/shared/components/ui/select";
import { Switch } from "@/shared/components/ui/switch";
import { Tabs } from "@/shared/components/ui/tabs";
import { Textarea } from "@/shared/components/ui/textarea";
import {
  downloadCustomerAddressTemplateWorkbook,
  parseCustomerAddressFile,
} from "@/shared/lib/customer-address-import";
import {
  downloadRateCardTemplateWorkbook,
  parseRateCardFile,
} from "@/shared/lib/customer-rate-card-import";
import {
  RATE_MATCHING_FIELDS,
  describeRateMatchingConfig,
  getRateCardTemplateColumns,
  getRateMatchingColumns,
  normalizeRateMatchingConfig,
  rateMatchingConfigToBasis,
  resolveCustomerRateCalculationStrategy,
  resolveCustomerRateMatchingConfig,
  type RateCardDimensionField,
} from "@/shared/lib/rate-matching-config";
import { useTenantCustomers } from "@/modules/tenant-admin/hooks/useTenantCustomers";
import {
  useTenantMaterials,
  useTenantUOMConfigurations,
  useTenantVehicleTypes,
} from "@/modules/tenant-admin/hooks/useTenantMasterData";
import { useTenantRouteContext } from "@/modules/tenant-admin/hooks/useTenantRouteContext";
import type {
  AddressImportResult,
  CustomerAddressMasterEntry,
  CustomerAddressTag,
  CustomerOperationalAddressType,
  CustomerSetupProgress,
  CustomerSetupStatus,
  CustomerUOMOverride,
  RateMatchingConfig,
  RateMatchingFieldKey,
  TenantCustomer,
  TenantCustomerAddress,
  TenantCustomerAddressInput,
  TenantCustomerInput,
  TenantCustomerRateCard,
  TenantCustomerRateCardInput,
} from "@/types/customer";

const customerSchema = z.object({
  name: z.string().trim().min(2, "Customer name is required."),
  legalName: z.string().optional(),
  tier: z.string().optional(),
  code: z.string().optional(),
  billingAddress: z.string().optional(),
  relationshipManager: z.string().optional(),
  internalAccountOwner: z.string().optional(),
  gstin: z.string().optional(),
  pan: z.string().optional(),
  status: z.enum(["active", "inactive"]),
});

const contactsSchema = z.object({
  primaryContactName: z.string().trim().min(2, "Primary contact name is required."),
  primaryContactEmail: z.string().optional(),
  primaryContactPhone: z.string().optional(),
  primaryContactDesignation: z.string().optional(),
  accountsContactName: z.string().optional(),
  accountsContactEmail: z.string().optional(),
  accountsContactPhone: z.string().optional(),
  accountsContactDesignation: z.string().optional(),
  logisticsContactName: z.string().optional(),
  logisticsContactEmail: z.string().optional(),
  logisticsContactPhone: z.string().optional(),
  logisticsContactDesignation: z.string().optional(),
});

const vehicleTypeOptions = [
  "20FT",
  "32FT",
  "Trailer",
  "Container",
  "LCV",
  "Tanker",
  "Open Body",
  "Other",
] as const;

const initialCustomerForm: TenantCustomerInput = {
  name: "",
  legalName: "",
  tier: "Standard",
  code: "",
  billingAddress: "",
  relationshipManager: "",
  internalAccountOwner: "",
  gstin: "",
  gstNumber: "",
  pan: "",
  primaryContactName: "",
  primaryContactEmail: "",
  primaryContactPhone: "",
  primaryContactDesignation: "",
  accountsContactName: "",
  accountsContactEmail: "",
  accountsContactPhone: "",
  accountsContactDesignation: "",
  logisticsContactName: "",
  logisticsContactEmail: "",
  logisticsContactPhone: "",
  logisticsContactDesignation: "",
  creditLimit: null,
  creditDays: null,
  currentOutstanding: 0,
  gstChargeType: "Forward Charge (12% GST on Transport)",
  tdsApplicable: false,
  invoiceFormat: "",
  preferredVehicleTypes: [],
  communicationChannel: "Email",
  defaultPaymentMode: "Bank Transfer",
  allowAutoBooking: false,
  rateMatchingBasis: "CITY_TO_CITY",
  rateMatchingConfig: ["CITY_PAIR", "VEHICLE_TYPE"],
  rateCalculationStrategy: [],
  addresses: [],
  uomOverrides: [],
  setupStatus: "BASIC_COMPLETED",
  setupProgress: {
    basicDetailsCompleted: false,
    contactsCompleted: false,
    creditBillingCompleted: false,
    contractsCompleted: false,
    preferencesCompleted: false,
  },
  status: "active",
};

const initialRateCardForm = {
  fromCity: "",
  toCity: "",
  fromLocation: "",
  toLocation: "",
  sourcePincode: "",
  destinationPincode: "",
  rateType: "PER_TRIP" as TenantCustomerRateCardInput["rateType"],
  vehicleType: "",
  material: "",
  serviceType: "",
  weightSlab: "",
  quantitySlab: "",
  customerGroup: "",
  uom: "",
  rate: "",
  underloadRate: "",
  overloadRate: "",
  tat: "",
  effectiveFromDate: "",
  effectiveToDate: "",
  remarks: "",
  status: "active" as TenantCustomerRateCardInput["status"],
};

type EditableCustomerRateCard = TenantCustomerRateCardInput & {
  id: string;
  createdAt?: string;
  updatedAt?: string;
};

/** Read the display value for a rate-card dimension column. */
function readRateCardColumnValue(
  rateCard: EditableCustomerRateCard,
  field: RateCardDimensionField,
): string {
  const value = (rateCard as unknown as Record<string, unknown>)[field];
  return value != null && value !== "" ? String(value) : "-";
}

type CustomerFlowStep =
  | "Basic Details"
  | "Addresses"
  | "Contacts"
  | "Credit & Billing"
  | "Contracts"
  | "Preferences";

const customerFlowSteps: CustomerFlowStep[] = [
  "Basic Details",
  "Addresses",
  "Credit & Billing",
  "Contracts",
  "Preferences",
];

const customerFlowLabels: Record<CustomerFlowStep, string> = {
  "Basic Details": "Basic Details & Contact",
  Addresses: "Addresses",
  Contacts: "Customer Contact",
  "Credit & Billing": "Credit & Billing",
  Contracts: "Contracts (Rate Card)",
  Preferences: "Preferences",
};

export function TenantCustomersPage() {
  const { tenant } = useTenantRouteContext();
  const { definitions: uomDefinitions } = useTenantUOMConfigurations(tenant.id);
  const {
    data,
    createCustomer,
    updateTenantCustomer,
    listAddresses,
    createAddress,
    updateAddress,
    deleteAddress,
    listRateCards,
    createRateCard,
    updateRateCard,
    deleteRateCard,
  } = useTenantCustomers(tenant.id);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [editingCustomer, setEditingCustomer] = useState<TenantCustomer | null>(null);
  const [form, setForm] = useState<TenantCustomerInput>(initialCustomerForm);
  const [savedForm, setSavedForm] = useState<TenantCustomerInput>(initialCustomerForm);
  const [draftRateCards, setDraftRateCards] = useState<EditableCustomerRateCard[]>([]);
  const [savedDraftRateCards, setSavedDraftRateCards] = useState<EditableCustomerRateCard[]>([]);
  const [activeStep, setActiveStep] = useState<CustomerFlowStep>("Basic Details");
  const quantityUOMOptions = useMemo(
    () =>
      uomDefinitions
        .filter((definition) => definition.category === "QUANTITY" && definition.status === "active")
        .map((definition) => definition.code),
    [uomDefinitions],
  );
  const weightUOMOptions = useMemo(
    () =>
      uomDefinitions
        .filter((definition) => definition.category === "WEIGHT" && definition.status === "active")
        .map((definition) => definition.code),
    [uomDefinitions],
  );

  const rows = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return data.filter((customer) => {
      if (!normalizedSearch) {
        return true;
      }
      return `${customer.name} ${customer.code ?? ""} ${customer.gstin ?? customer.gstNumber ?? ""}`
        .toLowerCase()
        .includes(normalizedSearch);
    });
  }, [data, search]);

  function openCreate() {
    setEditingCustomer(null);
    setForm(initialCustomerForm);
    setSavedForm(initialCustomerForm);
    setDraftRateCards([]);
    setSavedDraftRateCards([]);
    setActiveStep("Basic Details");
    setError("");
    setOpen(true);
  }

  function openEdit(customer: TenantCustomer) {
    const nextForm = cloneCustomerForm(buildCustomerForm(customer));
    const nextRateCards = cloneEditableRateCards(
      listRateCards(customer.id).map((rateCard) => buildEditableRateCard(rateCard)),
    );
    setEditingCustomer(customer);
    setForm(nextForm);
    setSavedForm(nextForm);
    setDraftRateCards(nextRateCards);
    setSavedDraftRateCards(nextRateCards);
    setActiveStep("Basic Details");
    setError("");
    setOpen(true);
  }

  function validateBasicDetails() {
    const parsed = customerSchema.safeParse(form);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Complete the required customer fields.");
      return null;
    }
    return parsed.data;
  }

  function validateContactsForProgression() {
    const parsed = contactsSchema.safeParse(form);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Primary contact name is required.");
      return false;
    }
    return true;
  }

  function moveToStep(step: CustomerFlowStep) {
    if (step !== "Basic Details" && !validateBasicDetails()) {
      return;
    }
    if (
      (step === "Credit & Billing" || step === "Contracts" || step === "Preferences") &&
      !validateContactsForProgression()
    ) {
      return;
    }
    setError("");
    setActiveStep(step);
  }

  const currentDialogSectionDirty =
    JSON.stringify(getSectionSnapshot(activeStep, form, draftRateCards)) !==
    JSON.stringify(getSectionSnapshot(activeStep, savedForm, savedDraftRateCards));

  function resetDialogSection(step: CustomerFlowStep) {
    if (step === "Contracts") {
      setDraftRateCards(cloneEditableRateCards(savedDraftRateCards));
      return;
    }
    setForm((current) => mergeSectionState(current, savedForm, step));
  }

  function saveEditSection(step: CustomerFlowStep) {
    if (!editingCustomer) {
      return false;
    }

    try {
      if (step === "Basic Details") {
        const sectionDraft = buildSectionDraft(step, savedForm, form);
        const parsed = customerSchema.safeParse(sectionDraft);
        if (!parsed.success) {
          setError(parsed.error.issues[0]?.message ?? "Complete the required customer fields.");
          return false;
        }
        const nextProgress = normalizeSetupProgress({
          ...savedForm.setupProgress,
          basicDetailsCompleted: true,
        });
        const payload = buildCustomerPayload(
          sectionDraft,
          nextProgress,
          deriveCustomerMasterAddresses(savedForm).length,
          savedDraftRateCards.length,
        );
        updateTenantCustomer(editingCustomer.id, payload);
        const normalized = cloneCustomerForm(payload);
        setForm(normalized);
        setSavedForm(normalized);
        setMessage("Basic details updated successfully.");
        setError("");
        return true;
      }

      if (step === "Addresses") {
        const sectionDraft = buildSectionDraft(step, savedForm, form);
        const nextAddresses = deriveCustomerMasterAddresses(sectionDraft);
        const nextProgress = normalizeSetupProgress(savedForm.setupProgress);
        const payload = buildCustomerPayload(
          sectionDraft,
          nextProgress,
          nextAddresses.length,
          savedDraftRateCards.length,
        );
        updateTenantCustomer(editingCustomer.id, payload);
        persistCustomerAddresses(
          editingCustomer.id,
          listAddresses(editingCustomer.id),
          nextAddresses,
          createAddress,
          updateAddress,
          deleteAddress,
        );
        const normalized = cloneCustomerForm(payload);
        setForm(normalized);
        setSavedForm(normalized);
        setMessage("Addresses updated successfully.");
        setError("");
        return true;
      }

      if (step === "Contacts") {
        const sectionDraft = buildSectionDraft(step, savedForm, form);
        if (!validatePrimaryContact(sectionDraft)) {
          setError("Primary contact name is required.");
          return false;
        }
        const nextProgress = normalizeSetupProgress({
          ...savedForm.setupProgress,
          contactsCompleted: true,
        });
        const payload = buildCustomerPayload(
          sectionDraft,
          nextProgress,
          deriveCustomerMasterAddresses(savedForm).length,
          savedDraftRateCards.length,
        );
        updateTenantCustomer(editingCustomer.id, payload);
        const normalized = cloneCustomerForm(payload);
        setForm(normalized);
        setSavedForm(normalized);
        setMessage("Customer contact updated successfully.");
        setError("");
        return true;
      }

      if (step === "Credit & Billing") {
        const sectionDraft = buildSectionDraft(step, savedForm, form);
        const nextProgress = normalizeSetupProgress({
          ...savedForm.setupProgress,
          creditBillingCompleted: true,
        });
        const payload = buildCustomerPayload(
          sectionDraft,
          nextProgress,
          deriveCustomerMasterAddresses(savedForm).length,
          savedDraftRateCards.length,
        );
        updateTenantCustomer(editingCustomer.id, payload);
        const normalized = cloneCustomerForm(payload);
        setForm(normalized);
        setSavedForm(normalized);
        setMessage("Credit and billing updated successfully.");
        setError("");
        return true;
      }

      if (step === "Contracts") {
        const nextProgress = normalizeSetupProgress({
          ...savedForm.setupProgress,
          contractsCompleted: draftRateCards.length ? true : savedForm.setupProgress?.contractsCompleted ?? false,
        });
        persistCustomerRateCards(
          editingCustomer.id,
          listRateCards(editingCustomer.id),
          draftRateCards,
          createRateCard,
          updateRateCard,
          deleteRateCard,
        );
        const payload = buildCustomerPayload(
          savedForm,
          nextProgress,
          deriveCustomerMasterAddresses(savedForm).length,
          draftRateCards.length,
        );
        updateTenantCustomer(editingCustomer.id, payload);
        const normalized = cloneCustomerForm(payload);
        const nextRateCards = cloneEditableRateCards(draftRateCards);
        setForm(normalized);
        setSavedForm(normalized);
        setDraftRateCards(nextRateCards);
        setSavedDraftRateCards(nextRateCards);
        setMessage("Rate card updated successfully.");
        setError("");
        return true;
      }

      const sectionDraft = buildSectionDraft(step, savedForm, form);
      const nextProgress = normalizeSetupProgress({
        ...savedForm.setupProgress,
        preferencesCompleted: true,
      });
      const payload = buildCustomerPayload(
        sectionDraft,
        nextProgress,
        deriveCustomerMasterAddresses(savedForm).length,
        savedDraftRateCards.length,
      );
      updateTenantCustomer(editingCustomer.id, payload);
      const normalized = cloneCustomerForm(payload);
      setForm(normalized);
      setSavedForm(normalized);
      setMessage("Preferences updated successfully.");
      setError("");
      return true;
    } catch (submissionError) {
      setError(
        submissionError instanceof Error ? submissionError.message : "Customer section could not be saved.",
      );
      return false;
    }
  }

  function handleEditStepChange(step: CustomerFlowStep) {
    if (step === activeStep) {
      return;
    }
    if (
      currentDialogSectionDirty &&
      !window.confirm(
        `Unsaved changes are present in ${getCustomerFlowLabel(activeStep)}. Click OK to discard them and switch sections.`,
      )
    ) {
      return;
    }
    if (currentDialogSectionDirty) {
      resetDialogSection(activeStep);
    }
    setError("");
    setActiveStep(step);
  }

  function submitCustomer(progressOverrides?: Partial<CustomerSetupProgress>) {
    const parsed = validateBasicDetails();
    if (!parsed) {
      return;
    }

    try {
      const nextAddresses = deriveCustomerMasterAddresses(form);
      const nextProgress = normalizeSetupProgress({
        ...form.setupProgress,
        basicDetailsCompleted: true,
        ...progressOverrides,
      });
      const nextRateCardCount = draftRateCards.length;
      const payload = buildCustomerPayload(form, nextProgress, nextAddresses.length, nextRateCardCount);

      if (editingCustomer) {
        updateTenantCustomer(editingCustomer.id, payload);
        persistCustomerAddresses(
          editingCustomer.id,
          listAddresses(editingCustomer.id),
          nextAddresses,
          createAddress,
          updateAddress,
          deleteAddress,
        );
        persistCustomerRateCards(
          editingCustomer.id,
          listRateCards(editingCustomer.id),
          draftRateCards,
          createRateCard,
          updateRateCard,
          deleteRateCard,
        );
        setMessage("Customer updated successfully.");
      } else {
        const created = createCustomer(payload);
        persistCustomerAddresses(
          created.id,
          [],
          nextAddresses,
          createAddress,
          updateAddress,
          deleteAddress,
        );
        persistCustomerRateCards(
          created.id,
          [],
          draftRateCards,
          createRateCard,
          updateRateCard,
          deleteRateCard,
        );
        setMessage(
          isFullyConfigured(nextProgress)
            ? "Customer created successfully."
            : "Customer created. Complete the remaining steps later from the customer workspace.",
        );
      }

      setOpen(false);
      setError("");
    } catch (submissionError) {
      setError(
        submissionError instanceof Error ? submissionError.message : "Customer could not be saved.",
      );
    }
  }

  const fullyConfiguredCount = rows.filter((customer) =>
    isFullyConfigured(normalizeSetupProgress(customer.setupProgress)),
  ).length;

  return (
    <div className="space-y-4">
      {!open ? (
      <>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-xl border border-border/70 bg-gradient-to-r from-slate-100 to-white px-4 py-2.5 shadow-sm">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h1 className="text-xl font-semibold tracking-tight">Customers</h1>
          <span className="text-[12px] text-muted-foreground">
            {rows.length} total · {fullyConfiguredCount} configured · {rows.length - fullyConfiguredCount} pending · {rows.filter((customer) => customer.status === "active").length} active
          </span>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="size-4" />
          Add Customer
        </Button>
      </div>

      {message ? (
        <div className="rounded-2xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {message}
        </div>
      ) : null}

      <TenantFilterBar
        searchValue={search}
        searchPlaceholder="Search tenant customers by name, code, or GSTIN"
        onSearchChange={setSearch}
        trailing={<div className="text-sm text-muted-foreground">{rows.length} customers shown</div>}
      />

      {rows.length ? (
        <DataTable
          title="Tenant customers"
          headers={["Customer", "Code", "GSTIN", "Setup", "Status", "Updated", "Actions"]}
          rows={rows.map((customer) => {
            const progress = normalizeSetupProgress(customer.setupProgress);
            const missingSteps = getMissingSetupSteps(progress);
            const addressCount = getResolvedCustomerAddresses(customer).length;

            return [
              <div key={`${customer.id}-customer`} className="min-w-[180px]">
                <p className="font-semibold">{customer.name}</p>
                <p className="mt-1 text-sm text-muted-foreground">{customer.legalName ?? "-"}</p>
              </div>,
              customer.code ? <Badge key={`${customer.id}-code`} variant="outline">{customer.code}</Badge> : "-",
              customer.gstin ?? customer.gstNumber ?? "-",
              <div key={`${customer.id}-setup`} className="flex flex-wrap gap-1.5">
                <Badge variant={isFullyConfigured(progress) ? "success" : "warning"}>
                  {isFullyConfigured(progress) ? "Fully Configured" : "Setup Pending"}
                </Badge>
                {!addressCount ? (
                  <Badge variant="warning">Address Pending</Badge>
                ) : (
                  <Badge variant="accent">{addressCount} Address{addressCount > 1 ? "es" : ""}</Badge>
                )}
                {missingSteps.slice(0, 2).map((step) => (
                  <Badge key={`${customer.id}-${step}`} variant="warning">
                    Missing {step}
                  </Badge>
                ))}
              </div>,
              <Badge key={`${customer.id}-status`} variant={customer.status === "active" ? "success" : "warning"}>
                {customer.status}
              </Badge>,
              new Date(customer.updatedAt).toLocaleDateString(),
              <div key={`${customer.id}-actions`} className="flex flex-wrap gap-2">
                <Button asChild size="sm" variant="ghost">
                  <Link to={`/tenant/${tenant.id}/customers/${customer.id}`}>View Details</Link>
                </Button>
                <Button size="sm" variant="ghost" onClick={() => openEdit(customer)}>
                  <PencilLine className="size-4" />
                  Edit
                </Button>
                {!isFullyConfigured(progress) ? (
                  <Button asChild size="sm" variant="outline">
                    <Link to={`/tenant/${tenant.id}/customers/${customer.id}`}>Complete Setup</Link>
                  </Button>
                ) : null}
                {!addressCount ? (
                  <Button asChild size="sm" variant="outline">
                    <Link to={`/tenant/${tenant.id}/customers/${customer.id}`}>Add Address</Link>
                  </Button>
                ) : null}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    updateTenantCustomer(customer.id, {
                      status: customer.status === "active" ? "inactive" : "active",
                    });
                    setMessage(`${customer.name} marked as ${customer.status === "active" ? "inactive" : "active"}.`);
                  }}
                >
                  {customer.status === "active" ? "Deactivate" : "Activate"}
                </Button>
              </div>,
            ];
          })}
          emptyMessage="No tenant customers found."
        />
      ) : (
        <TenantEmptyState
          title="No tenant customers found"
          description="Create the first customer to start the guided setup flow."
          action={<Button onClick={openCreate}>Add Customer</Button>}
        />
      )}

      </>
      ) : null}

      {open ? (
        <div className="space-y-4">
          {/* Compact single-row header (operations screen, not a wizard essay). */}
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 rounded-xl border border-border/70 bg-gradient-to-r from-slate-100 to-white px-4 py-2.5 shadow-sm">
            <div className="flex min-w-0 items-center gap-2.5">
              <button type="button" onClick={() => setOpen(false)} className="inline-flex items-center gap-1 text-[12px] font-medium text-muted-foreground transition hover:text-primary">
                ← Customers
              </button>
              <span className="text-slate-300">|</span>
              <h1 className="truncate text-xl font-semibold tracking-tight">
                {editingCustomer ? form.name?.trim() || "Edit Customer" : form.name?.trim() || "New Customer"}
              </h1>
            </div>
            {!editingCustomer ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  submitCustomer({
                    basicDetailsCompleted: true,
                    contactsCompleted: false,
                    creditBillingCompleted: false,
                    contractsCompleted: false,
                    preferencesCompleted: false,
                  })
                }
              >
                Save Draft
              </Button>
            ) : null}
          </div>

          {error ? (
            <div className="rounded-2xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
          ) : null}

          <CustomerFlowStepper
            activeStep={activeStep}
            form={form}
            rateCardCount={draftRateCards.length}
            onStepChange={editingCustomer ? handleEditStepChange : moveToStep}
          />

          <div className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm sm:p-6">
            {activeStep === "Basic Details" ? (
              <div className="space-y-5">
                <BasicDetailsStep form={form} setForm={setForm} />
                <ContactsStep form={form} setForm={setForm} />
              </div>
            ) : null}
            {activeStep === "Addresses" ? <AddressesStep form={form} setForm={setForm} /> : null}
            {activeStep === "Credit & Billing" ? <CreditBillingStep form={form} setForm={setForm} /> : null}
            {activeStep === "Contracts" ? (
              <TenantCustomerContractsSection
                tenantId={tenant.id}
                rateMatchingConfig={resolveCustomerRateMatchingConfig(form)}
                onConfigChange={(next) => setForm((current) => ({ ...current, rateMatchingConfig: next }))}
                rateCards={draftRateCards}
                onCreate={(input) =>
                  setDraftRateCards((current) => [
                    buildEditableRateCard({
                      ...input,
                      id: createDraftRateCardId(),
                      tenantId: tenant.id,
                      tenantCustomerId: editingCustomer?.id ?? "draft-customer",
                      createdAt: new Date().toISOString(),
                      updatedAt: new Date().toISOString(),
                    }),
                    ...current,
                  ])
                }
                onUpdate={(rateCardId, updates) =>
                  setDraftRateCards((current) =>
                    current.map((rateCard) =>
                      rateCard.id === rateCardId ? { ...rateCard, ...updates } : rateCard,
                    ),
                  )
                }
                onReplaceAll={(rows) =>
                  setDraftRateCards(
                    rows.map((row) =>
                      buildEditableRateCard({
                        ...row,
                        id: createDraftRateCardId(),
                        tenantId: tenant.id,
                        tenantCustomerId: editingCustomer?.id ?? "draft-customer",
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString(),
                      }),
                    ),
                  )
                }
                onDelete={(rateCardId) =>
                  setDraftRateCards((current) => current.filter((rateCard) => rateCard.id !== rateCardId))
                }
              />
            ) : null}
            {activeStep === "Preferences" ? (
              <PreferencesStep
                form={form}
                setForm={setForm}
                quantityUOMOptions={quantityUOMOptions}
                weightUOMOptions={weightUOMOptions}
              />
            ) : null}
          </div>

          <div className="sticky bottom-0 z-20 flex flex-wrap items-center justify-end gap-2 rounded-xl border border-border/70 bg-card/95 px-4 py-2.5 shadow-sm backdrop-blur">
            {activeStep !== "Basic Details" ? (
              <Button size="sm" variant="outline" onClick={() => setActiveStep(previousFlowStep(activeStep))}>Back</Button>
            ) : null}
            {activeStep !== "Preferences" ? (
              <Button size="sm" variant="outline" onClick={() => moveToStep(nextFlowStep(activeStep))}>Continue</Button>
            ) : null}
            {editingCustomer ? (
              <Button
                size="sm"
                onClick={() =>
                  submitCustomer({
                    basicDetailsCompleted: true,
                    contactsCompleted: Boolean(form.primaryContactName?.trim()),
                    creditBillingCompleted: true,
                    contractsCompleted: true,
                    preferencesCompleted: true,
                  })
                }
              >
                Save Changes
              </Button>
            ) : (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    submitCustomer({
                      basicDetailsCompleted: true,
                      contactsCompleted: false,
                      creditBillingCompleted: false,
                      contractsCompleted: false,
                      preferencesCompleted: false,
                    })
                  }
                >
                  Save Draft
                </Button>
                <Button
                  size="sm"
                  onClick={() =>
                    submitCustomer({
                      basicDetailsCompleted: true,
                      contactsCompleted: Boolean(form.primaryContactName?.trim()),
                      creditBillingCompleted: true,
                      contractsCompleted: true,
                      preferencesCompleted: true,
                    })
                  }
                >
                  Finish Setup
                </Button>
              </>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function TenantCustomerDetailPage() {
  const { tenant } = useTenantRouteContext();
  const { definitions: uomDefinitions } = useTenantUOMConfigurations(tenant.id);
  const { tenantCustomerId = "" } = useParams();
  const {
    getTenantCustomerById,
    listAddresses,
    createAddress,
    updateAddress,
    deleteAddress,
    listRateCards,
    createRateCard,
    updateRateCard,
    deleteRateCard,
    updateTenantCustomer,
  } = useTenantCustomers(tenant.id);
  const tenantCustomer = getTenantCustomerById(tenantCustomerId);
  const [activeTab, setActiveTab] = useState<CustomerFlowStep>("Basic Details");
  const [message, setMessage] = useState("");
  const [detailForm, setDetailForm] = useState<TenantCustomerInput>(initialCustomerForm);
  const [savedDetailForm, setSavedDetailForm] = useState<TenantCustomerInput>(initialCustomerForm);
  const [detailRateCards, setDetailRateCards] = useState<EditableCustomerRateCard[]>([]);
  const [savedDetailRateCards, setSavedDetailRateCards] = useState<EditableCustomerRateCard[]>([]);
  const quantityUOMOptions = useMemo(
    () =>
      uomDefinitions
        .filter((definition) => definition.category === "QUANTITY" && definition.status === "active")
        .map((definition) => definition.code),
    [uomDefinitions],
  );
  const weightUOMOptions = useMemo(
    () =>
      uomDefinitions
        .filter((definition) => definition.category === "WEIGHT" && definition.status === "active")
        .map((definition) => definition.code),
    [uomDefinitions],
  );

  useEffect(() => {
    if (tenantCustomer) {
      const nextForm = cloneCustomerForm(buildCustomerForm(tenantCustomer));
      const nextRateCards = cloneEditableRateCards(
        listRateCards(tenantCustomer.id).map((rateCard) => buildEditableRateCard(rateCard)),
      );
      setDetailForm(nextForm);
      setSavedDetailForm(nextForm);
      setDetailRateCards(nextRateCards);
      setSavedDetailRateCards(nextRateCards);
    }
  }, [tenantCustomer]);

  if (!tenantCustomer) {
    return (
      <TenantEmptyState
        title="Customer not found"
        description="This tenant customer record is not available for the current tenant."
        action={
          <Button asChild>
            <Link to={`/tenant/${tenant.id}/customers`}>Back to customers</Link>
          </Button>
        }
      />
    );
  }

  const addressRecords = listAddresses(tenantCustomer.id);
  const progress = normalizeSetupProgress(detailForm.setupProgress);
  const missingSteps = getMissingSetupSteps(progress);
  const customerId = tenantCustomer.id;
  const draftAddresses = deriveCustomerMasterAddresses(detailForm);
  const savedAddressCount = deriveCustomerMasterAddresses(savedDetailForm).length;
  const currentSectionDirty =
    JSON.stringify(getSectionSnapshot(activeTab, detailForm, detailRateCards)) !==
    JSON.stringify(getSectionSnapshot(activeTab, savedDetailForm, savedDetailRateCards));
  const lastUpdatedValue =
    activeTab === "Contracts"
      ? [...savedDetailRateCards]
          .map((rateCard) => rateCard.updatedAt)
          .filter((value): value is string => Boolean(value))
          .sort()
          .at(-1)
      : activeTab === "Addresses"
        ? [...addressRecords]
            .map((address) => address.updatedAt)
            .filter((value): value is string => Boolean(value))
            .sort()
            .at(-1) ?? tenantCustomer.updatedAt
        : tenantCustomer.updatedAt;

  function resetCurrentSection(step: CustomerFlowStep) {
    if (step === "Contracts") {
      setDetailRateCards(cloneEditableRateCards(savedDetailRateCards));
      return;
    }
    setDetailForm((current) => mergeSectionState(current, savedDetailForm, step));
  }

  function commitSavedForm(nextForm: TenantCustomerInput) {
    const normalizedForm = cloneCustomerForm(nextForm);
    setDetailForm(normalizedForm);
    setSavedDetailForm(normalizedForm);
  }

  function saveSection(step: CustomerFlowStep) {
    try {
      if (step === "Basic Details") {
        const sectionDraft = buildSectionDraft(step, savedDetailForm, detailForm);
        const parsed = customerSchema.safeParse(sectionDraft);
        if (!parsed.success) {
          setMessage(parsed.error.issues[0]?.message ?? "Complete the required customer fields.");
          return false;
        }
        const nextProgress = normalizeSetupProgress({
          ...savedDetailForm.setupProgress,
          basicDetailsCompleted: true,
        });
        const payload = buildCustomerPayload(sectionDraft, nextProgress, savedAddressCount, savedDetailRateCards.length);
        updateTenantCustomer(customerId, payload);
        commitSavedForm(payload);
        setMessage("Basic details updated successfully.");
        return true;
      }

      if (step === "Addresses") {
        const sectionDraft = buildSectionDraft(step, savedDetailForm, detailForm);
        const nextAddresses = deriveCustomerMasterAddresses(sectionDraft);
        const nextProgress = normalizeSetupProgress(savedDetailForm.setupProgress);
        const payload = buildCustomerPayload(sectionDraft, nextProgress, nextAddresses.length, savedDetailRateCards.length);
        updateTenantCustomer(customerId, payload);
        persistCustomerAddresses(
          customerId,
          addressRecords,
          nextAddresses,
          createAddress,
          updateAddress,
          deleteAddress,
        );
        commitSavedForm(payload);
        setMessage("Addresses updated successfully.");
        return true;
      }

      if (step === "Contacts") {
        const sectionDraft = buildSectionDraft(step, savedDetailForm, detailForm);
        if (!validatePrimaryContact(sectionDraft)) {
          setMessage("Primary contact name is required.");
          return false;
        }
        const nextProgress = normalizeSetupProgress({
          ...savedDetailForm.setupProgress,
          contactsCompleted: true,
        });
        const payload = buildCustomerPayload(sectionDraft, nextProgress, savedAddressCount, savedDetailRateCards.length);
        updateTenantCustomer(customerId, payload);
        commitSavedForm(payload);
        setMessage("Customer contact updated successfully.");
        return true;
      }

      if (step === "Credit & Billing") {
        const sectionDraft = buildSectionDraft(step, savedDetailForm, detailForm);
        const nextProgress = normalizeSetupProgress({
          ...savedDetailForm.setupProgress,
          creditBillingCompleted: true,
        });
        const payload = buildCustomerPayload(sectionDraft, nextProgress, savedAddressCount, savedDetailRateCards.length);
        updateTenantCustomer(customerId, payload);
        commitSavedForm(payload);
        setMessage("Credit and billing updated successfully.");
        return true;
      }

      if (step === "Contracts") {
        const nextProgress = normalizeSetupProgress({
          ...savedDetailForm.setupProgress,
          contractsCompleted: detailRateCards.length ? true : savedDetailForm.setupProgress?.contractsCompleted ?? false,
        });
        persistCustomerRateCards(
          customerId,
          listRateCards(customerId),
          detailRateCards,
          createRateCard,
          updateRateCard,
          deleteRateCard,
        );
        const payload = buildCustomerPayload(savedDetailForm, nextProgress, savedAddressCount, detailRateCards.length);
        updateTenantCustomer(customerId, payload);
        commitSavedForm(payload);
        const nextRateCards = cloneEditableRateCards(detailRateCards);
        setDetailRateCards(nextRateCards);
        setSavedDetailRateCards(nextRateCards);
        setMessage(detailRateCards.length ? "Rate cards updated successfully." : "No rate card rows were added. This customer remains marked as Rate Card Pending.");
        return true;
      }

      const sectionDraft = buildSectionDraft(step, savedDetailForm, detailForm);
      const nextProgress = normalizeSetupProgress({
        ...savedDetailForm.setupProgress,
        preferencesCompleted: true,
      });
      const payload = buildCustomerPayload(sectionDraft, nextProgress, savedAddressCount, savedDetailRateCards.length);
      updateTenantCustomer(customerId, payload);
      commitSavedForm(payload);
      setMessage("Preferences updated successfully.");
      return true;
    } catch (submissionError) {
      setMessage(submissionError instanceof Error ? submissionError.message : "Customer section could not be saved.");
      return false;
    }
  }

  function handleTabChange(nextTabLabel: string) {
    const nextTab = getCustomerFlowStepFromLabel(nextTabLabel);
    if (nextTab === activeTab) {
      return;
    }
    if (
      currentSectionDirty &&
      !window.confirm(
        `Unsaved changes are present in ${getCustomerFlowLabel(activeTab)}. Click OK to discard them and switch sections.`,
      )
    ) {
      return;
    }
    if (currentSectionDirty) {
      resetCurrentSection(activeTab);
    }
    setMessage("");
    setActiveTab(nextTab);
  }

  function handleSaveAndNext() {
    if (saveSection(activeTab) && activeTab !== "Preferences") {
      setActiveTab(nextFlowStep(activeTab));
    }
  }

  function handleCancel() {
    if (currentSectionDirty) {
      resetCurrentSection(activeTab);
      setMessage(`${getCustomerFlowLabel(activeTab)} changes were discarded.`);
      return;
    }
    setMessage("");
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 rounded-xl border border-border/70 bg-gradient-to-r from-slate-100 to-white px-4 py-2.5 shadow-sm">
        <div className="flex min-w-0 items-center gap-2.5">
          <Link to={`/tenant/${tenant.id}/customers`} className="inline-flex items-center gap-1 text-[12px] font-medium text-muted-foreground transition hover:text-primary">← Customers</Link>
          <span className="text-slate-300">|</span>
          <h1 className="truncate text-xl font-semibold tracking-tight">{tenantCustomer.name}</h1>
          <Badge variant={tenantCustomer.status === "active" ? "success" : "warning"}>{tenantCustomer.status}</Badge>
        </div>
        {missingSteps.length ? (
          <Button size="sm" onClick={() => handleTabChange(getCustomerFlowLabel(missingSteps[0]))}>Complete Setup</Button>
        ) : null}
      </div>

      {message ? (
        <div className="rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</div>
      ) : null}

      {/* Compact stat strip — values only, no helper essays. */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 rounded-xl border border-border/70 bg-card px-4 py-2.5 text-[12px] text-muted-foreground shadow-sm">
        <span>Setup <span className="font-semibold text-foreground">{missingSteps.length ? "Incomplete" : "Complete"}</span></span>
        <span>Credit Limit <span className="font-semibold text-foreground">{formatCurrency(detailForm.creditLimit ?? 0)}</span></span>
        <span>Outstanding <span className="font-semibold text-foreground">{formatCurrency(detailForm.currentOutstanding ?? 0)}</span></span>
        <span>Addresses <span className="font-semibold text-foreground">{draftAddresses.length}</span></span>
        <span>Rate Cards <span className="font-semibold text-foreground">{detailRateCards.length}</span></span>
        {!draftAddresses.length ? (
          <Button size="sm" variant="outline" onClick={() => handleTabChange(getCustomerFlowLabel("Addresses"))}>+ Address</Button>
        ) : null}
        {!detailRateCards.length ? (
          <Button size="sm" variant="outline" onClick={() => handleTabChange(getCustomerFlowLabel("Contracts"))}>+ Rate Card</Button>
        ) : null}
      </div>

      <TenantPanel
        title={getCustomerFlowLabel(activeTab)}
        action={
          <Tabs
            tabs={customerFlowSteps.map((step) => getCustomerFlowLabel(step))}
            active={getCustomerFlowLabel(activeTab)}
            onChange={handleTabChange}
          />
        }
      >
        <div className="mb-3 flex items-center justify-end">
          <Badge variant={currentSectionDirty ? "warning" : "outline"}>
            {currentSectionDirty ? "Unsaved Changes" : "All Changes Saved"}
          </Badge>
        </div>

        {activeTab === "Basic Details" ? (
          <div className="grid gap-4">
            <BasicDetailsStep form={detailForm} setForm={setDetailForm} />
          </div>
        ) : null}

        {activeTab === "Addresses" ? (
          <div className="grid gap-4">
            <AddressesStep form={detailForm} setForm={setDetailForm} />
          </div>
        ) : null}

        {activeTab === "Contacts" ? (
          <div className="grid gap-4">
            <ContactsStep form={detailForm} setForm={setDetailForm} />
          </div>
        ) : null}

        {activeTab === "Credit & Billing" ? (
          <div className="grid gap-4">
            <CreditBillingStep form={detailForm} setForm={setDetailForm} />
          </div>
        ) : null}

        {activeTab === "Contracts" ? (
          <TenantCustomerContractsSection
            tenantId={tenant.id}
            rateMatchingConfig={resolveCustomerRateMatchingConfig(detailForm)}
            onConfigChange={(next) => {
              setDetailForm((current) => ({ ...current, rateMatchingConfig: next }));
              const payload = buildCustomerPayload(
                { ...savedDetailForm, rateMatchingConfig: next },
                normalizeSetupProgress(savedDetailForm.setupProgress),
                savedAddressCount,
                savedDetailRateCards.length,
              );
              updateTenantCustomer(customerId, payload);
              commitSavedForm(payload);
              setMessage("Rate card structure updated.");
            }}
            rateCards={detailRateCards}
            onCreate={(input) =>
              setDetailRateCards((current) => [
                buildEditableRateCard({
                  ...input,
                  id: createDraftRateCardId(),
                  tenantId: tenant.id,
                  tenantCustomerId: customerId,
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                }),
                ...current,
              ])
            }
            onUpdate={(rateCardId, updates) =>
              setDetailRateCards((current) =>
                current.map((rateCard) =>
                  rateCard.id === rateCardId
                    ? { ...rateCard, ...updates, updatedAt: new Date().toISOString() }
                    : rateCard,
                ),
              )
            }
            onReplaceAll={(rows) =>
              setDetailRateCards(
                rows.map((row) =>
                  buildEditableRateCard({
                    ...row,
                    id: createDraftRateCardId(),
                    tenantId: tenant.id,
                    tenantCustomerId: customerId,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                  }),
                ),
              )
            }
            onDelete={(rateCardId) =>
              setDetailRateCards((current) => current.filter((rateCard) => rateCard.id !== rateCardId))
            }
          />
        ) : null}

        {activeTab === "Preferences" ? (
          <div className="grid gap-4">
            <PreferencesStep
              form={detailForm}
              setForm={setDetailForm}
              quantityUOMOptions={quantityUOMOptions}
              weightUOMOptions={weightUOMOptions}
            />
          </div>
        ) : null}

        <SectionEditActions
          currentStep={activeTab}
          onCancel={handleCancel}
          onSave={() => {
            void saveSection(activeTab);
          }}
          onSaveAndNext={handleSaveAndNext}
        />
      </TenantPanel>
    </div>
  );
}

function buildCustomerForm(customer: TenantCustomer): TenantCustomerInput {
  return {
    name: customer.name,
    legalName: customer.legalName ?? "",
    tier: customer.tier ?? "Standard",
    code: customer.code ?? "",
    billingAddress: customer.billingAddress ?? "",
    relationshipManager: customer.relationshipManager ?? "",
    internalAccountOwner: customer.internalAccountOwner ?? "",
    gstin: customer.gstin ?? customer.gstNumber ?? "",
    gstNumber: customer.gstNumber ?? customer.gstin ?? "",
    pan: customer.pan ?? "",
    primaryContactName: customer.primaryContactName ?? "",
    primaryContactEmail: customer.primaryContactEmail ?? "",
    primaryContactPhone: customer.primaryContactPhone ?? "",
    primaryContactDesignation: customer.primaryContactDesignation ?? "",
    accountsContactName: customer.accountsContactName ?? "",
    accountsContactEmail: customer.accountsContactEmail ?? "",
    accountsContactPhone: customer.accountsContactPhone ?? "",
    accountsContactDesignation: customer.accountsContactDesignation ?? "",
    logisticsContactName: customer.logisticsContactName ?? "",
    logisticsContactEmail: customer.logisticsContactEmail ?? "",
    logisticsContactPhone: customer.logisticsContactPhone ?? "",
    logisticsContactDesignation: customer.logisticsContactDesignation ?? "",
    creditLimit: customer.creditLimit ?? null,
    creditDays: customer.creditDays ?? null,
    currentOutstanding: customer.currentOutstanding ?? 0,
    gstChargeType: customer.gstChargeType ?? "Forward Charge (12% GST on Transport)",
    tdsApplicable: customer.tdsApplicable ?? false,
    invoiceFormat: customer.invoiceFormat ?? "",
    preferredVehicleTypes: customer.preferredVehicleTypes ?? [],
    communicationChannel: customer.communicationChannel ?? "Email",
    defaultPaymentMode: customer.defaultPaymentMode ?? "Bank Transfer",
    allowAutoBooking: customer.allowAutoBooking ?? false,
    rateMatchingBasis: customer.rateMatchingBasis ?? "CITY_TO_CITY",
    rateMatchingConfig: resolveCustomerRateMatchingConfig(customer),
    rateCalculationStrategy: customer.rateCalculationStrategy ?? [],
    addresses: getResolvedCustomerAddresses(customer),
    uomOverrides: (customer.uomOverrides ?? []).map((override) =>
      normalizeCustomerUOMOverrideDraft(override),
    ),
    setupStatus: customer.setupStatus ?? "BASIC_COMPLETED",
    setupProgress: normalizeSetupProgress(customer.setupProgress),
    status: customer.status,
  };
}

function normalizeSetupProgress(progress?: CustomerSetupProgress): CustomerSetupProgress {
  return {
    basicDetailsCompleted: progress?.basicDetailsCompleted ?? true,
    contactsCompleted: progress?.contactsCompleted ?? false,
    creditBillingCompleted: progress?.creditBillingCompleted ?? false,
    contractsCompleted: progress?.contractsCompleted ?? false,
    preferencesCompleted: progress?.preferencesCompleted ?? false,
  };
}

function getResolvedCustomerAddresses(customer: TenantCustomer): CustomerAddressMasterEntry[] {
  if (customer.addresses?.length) {
    return customer.addresses.map((address) => normalizeCustomerAddressDraft(address));
  }
  if (!customer.billingAddress?.trim()) {
    return [];
  }
  return [
    normalizeCustomerAddressDraft({
      id: `legacy-billing-${customer.id}`,
      addressCode: "CUSTADDR-0001",
      type: ["Billing"],
      name: `${customer.name} Billing Address`,
      line1: customer.billingAddress,
      line2: "",
      city: "Pending",
      state: "Pending",
      pincode: "000000",
      gstin: customer.gstin ?? customer.gstNumber,
      contactPerson: customer.primaryContactName,
      contactNumber: customer.primaryContactPhone,
    }),
  ];
}

function normalizeCustomerAddressDraft(address: CustomerAddressMasterEntry): CustomerAddressMasterEntry {
  const line1 = address.line1?.trim() ?? "";
  const line2 = address.line2?.trim() ?? "";
  const city = address.city?.trim() ?? "";
  const state = address.state?.trim() ?? "";
  const pincode = address.pincode?.trim() ?? "";
  const fullAddress = address.fullAddress?.trim() ?? [line1, line2, city, state, pincode].filter(Boolean).join(", ");
  return {
    id: address.id,
    addressCode: address.addressCode?.trim() ?? "",
    type: Array.from(new Set((address.type ?? []).filter(Boolean))),
    consigneeId: address.consigneeId?.trim() ?? "",
    consigneeName: address.consigneeName?.trim() ?? "",
    operationalAddressType: address.operationalAddressType ?? "PRIMARY",
    addressUsage: address.addressUsage ?? "BOTH",
    contactCode: address.contactCode?.trim() ?? "",
    name: address.name?.trim() ?? "",
    addressLabel: address.addressLabel?.trim() ?? "",
    fullAddress,
    line1,
    line2,
    city,
    state,
    country: address.country?.trim() ?? "India",
    pincode,
    latitude: address.latitude ?? null,
    longitude: address.longitude ?? null,
    gstin: address.gstin?.trim().toUpperCase() ?? "",
    contactPerson: address.contactPerson?.trim() ?? "",
    contactNumber: address.contactNumber?.trim() ?? "",
    emailId: address.emailId?.trim().toLowerCase() ?? "",
    isActive: address.isActive ?? true,
    isTemporary: address.isTemporary ?? false,
    remarks: address.remarks?.trim() ?? "",
  };
}

function normalizeCustomerUOMOverrideDraft(override: CustomerUOMOverride): CustomerUOMOverride {
  return {
    id: override.id,
    quantityUOM: override.quantityUOM?.trim().toUpperCase() ?? "",
    weightUOM: override.weightUOM?.trim().toUpperCase() ?? "",
    conversionValue: Number(override.conversionValue) || 0,
    status: override.status ?? "active",
  };
}

function buildBillingFallbackAddress(form: TenantCustomerInput): CustomerAddressMasterEntry[] {
  if (!form.billingAddress?.trim()) {
    return [];
  }
  return [
    normalizeCustomerAddressDraft({
      id: `draft-billing-${form.code?.trim() || form.name.trim().toLowerCase().replace(/\s+/g, "-") || "customer"}`,
      addressCode: "CUSTADDR-0001",
      type: ["Billing"],
      contactCode: "",
      name: `${form.name.trim() || "Customer"} Billing Address`,
      line1: form.billingAddress,
      line2: "",
      city: "Pending",
      state: "Pending",
      country: "India",
      pincode: "000000",
      gstin: form.gstin ?? form.gstNumber ?? "",
      contactPerson: form.primaryContactName ?? "",
      contactNumber: form.primaryContactPhone ?? "",
      emailId: form.primaryContactEmail ?? "",
    }),
  ];
}

function deriveCustomerMasterAddresses(form: TenantCustomerInput): CustomerAddressMasterEntry[] {
  const addresses = (form.addresses ?? []).map((address) => normalizeCustomerAddressDraft(address));
  return addresses.length ? addresses : buildBillingFallbackAddress(form);
}

function getPrimaryCustomerAddressType(address: CustomerAddressMasterEntry) {
  return address.type[0] ?? "Consignee";
}

function getHighestAddressSequence(addresses: CustomerAddressMasterEntry[]) {
  const sequences = addresses.flatMap((address) => {
    const values = [address.addressCode, address.contactCode];
    return values
      .map((value) => {
        const match = value?.match(/(\d+)$/);
        return match ? Number(match[1]) : 0;
      })
      .filter((value) => Number.isFinite(value));
  });
  return sequences.length ? Math.max(...sequences) : 0;
}

function formatGeneratedCode(prefix: string, sequence: number) {
  return `${prefix}-${String(sequence).padStart(4, "0")}`;
}

function isValidCustomerAddressPhone(value: string) {
  const digits = value.replace(/[^\d]/g, "");
  return digits.length >= 10 && digits.length <= 15;
}

function getResolvedCustomerAddressName(address: CustomerAddressMasterEntry) {
  const primaryType = getPrimaryCustomerAddressType(address);
  const operationalLabel = address.operationalAddressType
    ? `${address.operationalAddressType.charAt(0)}${address.operationalAddressType.slice(1).toLowerCase()}`
    : primaryType;
  return address.name?.trim() || address.addressLabel?.trim() || `${address.city || "Customer"} ${operationalLabel} Address`;
}

function prepareCustomerAddressDraft(
  draft: CustomerAddressMasterEntry,
  existingAddresses: CustomerAddressMasterEntry[],
): CustomerAddressMasterEntry {
  const normalized = normalizeCustomerAddressDraft(draft);
  const highestSequence = getHighestAddressSequence(
    existingAddresses.filter((address) => address.id !== normalized.id),
  );
  const nextSequence = highestSequence + 1;

  return {
    ...normalized,
    addressCode: normalized.addressCode || formatGeneratedCode("CUSTADDR", nextSequence),
    contactCode: normalized.contactCode || formatGeneratedCode("ADDR", nextSequence),
    consigneeId:
      normalized.consigneeId ||
      `consignee-${((normalized.consigneeName ?? "") || normalized.name || normalized.city || "customer")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")}`,
    addressLabel: normalized.addressLabel || normalized.name || normalized.addressLabel || normalized.operationalAddressType || "Address",
    fullAddress:
      normalized.fullAddress ||
      [normalized.line1, normalized.line2, normalized.city, normalized.state, normalized.pincode]
        .filter(Boolean)
        .join(", "),
    name: getResolvedCustomerAddressName(normalized),
  };
}

function deriveLegacyAddressType(addressTypes: CustomerAddressTag[]): TenantCustomerAddress["addressType"] {
  const typeSet = new Set(addressTypes);
  if (typeSet.has("Consignor") && typeSet.has("Consignee")) {
    return "both";
  }
  if (typeSet.has("Consignee")) {
    return "consignee";
  }
  return "consignor";
}

function deriveAddressUsage(address: CustomerAddressMasterEntry): NonNullable<TenantCustomerAddress["addressUsage"]> {
  if (address.addressUsage) {
    return address.addressUsage;
  }
  const typeSet = new Set(address.type);
  if (typeSet.has("Consignor") && typeSet.has("Consignee")) {
    return "BOTH";
  }
  if (typeSet.has("Consignee")) {
    return "DESTINATION";
  }
  if (typeSet.has("Consignor")) {
    return "ORIGIN";
  }
  return "BOTH";
}

function buildCustomerAddressPayload(
  address: CustomerAddressMasterEntry,
  existingAddress?: TenantCustomerAddress,
  index?: number,
): TenantCustomerAddressInput {
  return {
    addressCode: address.addressCode || existingAddress?.addressCode,
    addressType: deriveLegacyAddressType(address.type),
    addressTypes: address.type,
    consigneeId: address.consigneeId || undefined,
    consigneeName: address.consigneeName || undefined,
    operationalAddressType: address.operationalAddressType ?? "PRIMARY",
    addressUsage: deriveAddressUsage(address),
    addressName: address.name,
    addressLabel: address.addressLabel || address.name,
    fullAddress: address.fullAddress || [address.line1, address.line2, address.city, address.state, address.pincode].filter(Boolean).join(", "),
    contactCode: address.contactCode || undefined,
    gstin: address.gstin || undefined,
    contactPerson: address.contactPerson || undefined,
    contactNumber: address.contactNumber || undefined,
    emailId: address.emailId || undefined,
    addressLine1: address.line1,
    addressLine2: address.line2 || undefined,
    landmark: existingAddress?.landmark ?? "",
    city: address.city,
    state: address.state,
    country: address.country || existingAddress?.country || "India",
    pincode: address.pincode,
    latitude: address.latitude ?? null,
    longitude: address.longitude ?? null,
    isDefault: existingAddress?.isDefault ?? index === 0,
    status: existingAddress?.status ?? "active",
    isTemporary: address.isTemporary ?? false,
    remarks: address.remarks || undefined,
  };
}

function persistCustomerAddresses(
  customerId: string,
  existingAddresses: TenantCustomerAddress[],
  nextAddresses: CustomerAddressMasterEntry[],
  createAddress: (tenantCustomerId: string, input: TenantCustomerAddressInput) => TenantCustomerAddress,
  updateAddress: (addressId: string, updates: Partial<TenantCustomerAddressInput>) => TenantCustomerAddress,
  deleteAddress: (addressId: string) => boolean,
) {
  const existingMap = new Map(existingAddresses.map((address) => [address.id, address]));
  const retainedIds = new Set<string>();

  nextAddresses.forEach((address, index) => {
    const existingAddress = existingMap.get(address.id);
    const payload = buildCustomerAddressPayload(address, existingAddress, index);
    if (existingAddress) {
      updateAddress(address.id, payload);
      retainedIds.add(address.id);
      return;
    }
    createAddress(customerId, payload);
  });

  existingAddresses.forEach((address) => {
    if (!retainedIds.has(address.id) && !nextAddresses.some((item) => item.id === address.id)) {
      deleteAddress(address.id);
    }
  });
}

function buildEditableRateCard(
  rateCard: TenantCustomerRateCard | EditableCustomerRateCard,
): EditableCustomerRateCard {
  return {
    ...rateCard,
    fromCity: rateCard.fromCity ?? rateCard.fromLocation ?? "",
    toCity: rateCard.toCity ?? rateCard.toLocation ?? "",
    sourcePincode: rateCard.sourcePincode ?? "",
    destinationPincode: rateCard.destinationPincode ?? "",
    fromLocation: rateCard.fromLocation ?? "",
    toLocation: rateCard.toLocation ?? "",
    vehicleType: rateCard.vehicleType ?? "",
    underloadRate: rateCard.underloadRate ?? rateCard.baseRate ?? rateCard.rate,
    overloadRate: rateCard.overloadRate ?? null,
    rate: rateCard.rate,
    tat: rateCard.tat ?? rateCard.transitTime ?? "",
    effectiveFromDate: rateCard.effectiveFromDate ?? "",
    effectiveToDate: rateCard.effectiveToDate ?? "",
    remarks: rateCard.remarks ?? "",
  };
}

function persistCustomerRateCards(
  customerId: string,
  existingRateCards: TenantCustomerRateCard[],
  nextRateCards: EditableCustomerRateCard[],
  createRateCard: (tenantCustomerId: string, input: TenantCustomerRateCardInput) => TenantCustomerRateCard,
  updateRateCard: (rateCardId: string, updates: Partial<TenantCustomerRateCardInput>) => TenantCustomerRateCard,
  deleteRateCard: (rateCardId: string) => boolean,
) {
  const existingMap = new Map(existingRateCards.map((rateCard) => [rateCard.id, rateCard]));
  const retainedIds = new Set<string>();

  nextRateCards.forEach((rateCard) => {
    const payload: TenantCustomerRateCardInput = {
      fromCity: rateCard.fromCity,
      toCity: rateCard.toCity,
      fromLocation: rateCard.fromLocation,
      toLocation: rateCard.toLocation,
      sourcePincode: rateCard.sourcePincode || "",
      destinationPincode: rateCard.destinationPincode || "",
      rateType: rateCard.rateType,
      vehicleType: rateCard.vehicleType || null,
      underloadRate: Number(rateCard.underloadRate ?? rateCard.rate),
      overloadRate: rateCard.overloadRate ?? null,
      tat: rateCard.tat || undefined,
      baseRate: Number(rateCard.underloadRate ?? rateCard.rate),
      rate: Number(rateCard.underloadRate ?? rateCard.rate),
      effectiveFromDate: rateCard.effectiveFromDate || undefined,
      effectiveToDate: rateCard.effectiveToDate || undefined,
      remarks: rateCard.remarks || undefined,
      status: rateCard.status,
    };

    if (existingMap.has(rateCard.id)) {
      updateRateCard(rateCard.id, payload);
      retainedIds.add(rateCard.id);
      return;
    }
    createRateCard(customerId, payload);
  });

  existingRateCards.forEach((rateCard) => {
    if (!retainedIds.has(rateCard.id) && !nextRateCards.some((item) => item.id === rateCard.id)) {
      deleteRateCard(rateCard.id);
    }
  });
}

function deriveSetupStatusFromProgress(
  progress: CustomerSetupProgress,
  addressCount: number,
  rateCardCount: number,
): CustomerSetupStatus {
  if (!addressCount) {
    return "ADDRESS_PENDING";
  }
  if (!rateCardCount) {
    return isFullyConfigured(progress) ? "RATE_CARD_PENDING" : "RATE_CARD_PENDING";
  }
  return isFullyConfigured(progress) ? "FULLY_CONFIGURED" : "RATE_CARD_PENDING";
}

function isFullyConfigured(progress: CustomerSetupProgress) {
  return Boolean(
    progress.basicDetailsCompleted &&
      progress.contactsCompleted &&
      progress.creditBillingCompleted &&
      progress.contractsCompleted &&
      progress.preferencesCompleted,
  );
}

function getMissingSetupSteps(progress: CustomerSetupProgress) {
  const steps: CustomerFlowStep[] = [];
  if (!progress.basicDetailsCompleted) {
    steps.push("Basic Details");
  }
  if (!progress.contactsCompleted) {
    steps.push("Contacts");
  }
  if (!progress.creditBillingCompleted) {
    steps.push("Credit & Billing");
  }
  if (!progress.contractsCompleted) {
    steps.push("Contracts");
  }
  if (!progress.preferencesCompleted) {
    steps.push("Preferences");
  }
  return steps;
}

function buildCustomerPayload(
  form: TenantCustomerInput,
  progress: CustomerSetupProgress,
  addressCount: number,
  rateCardCount: number,
): TenantCustomerInput {
  const nextAddresses = deriveCustomerMasterAddresses(form);
  return {
    ...form,
    tier: form.tier?.trim() || "Standard",
    code: form.code?.trim() || "",
    billingAddress: form.billingAddress?.trim() || "",
    relationshipManager: form.relationshipManager?.trim() || "",
    internalAccountOwner: form.internalAccountOwner?.trim() || "",
    gstin: form.gstin?.trim().toUpperCase() || "",
    gstNumber: form.gstin?.trim().toUpperCase() || "",
    pan: form.pan?.trim().toUpperCase() || "",
    primaryContactName: form.primaryContactName?.trim() || "",
    primaryContactEmail: form.primaryContactEmail?.trim() || "",
    primaryContactPhone: form.primaryContactPhone?.trim() || "",
    primaryContactDesignation: form.primaryContactDesignation?.trim() || "",
    accountsContactName: form.accountsContactName?.trim() || "",
    accountsContactEmail: form.accountsContactEmail?.trim() || "",
    accountsContactPhone: form.accountsContactPhone?.trim() || "",
    accountsContactDesignation: form.accountsContactDesignation?.trim() || "",
    logisticsContactName: form.logisticsContactName?.trim() || "",
    logisticsContactEmail: form.logisticsContactEmail?.trim() || "",
    logisticsContactPhone: form.logisticsContactPhone?.trim() || "",
    logisticsContactDesignation: form.logisticsContactDesignation?.trim() || "",
    creditLimit: form.creditLimit ?? null,
    creditDays: form.creditDays ?? null,
    currentOutstanding: form.currentOutstanding ?? 0,
    gstChargeType: form.gstChargeType || "Forward Charge (12% GST on Transport)",
    tdsApplicable: form.tdsApplicable ?? false,
    invoiceFormat: form.invoiceFormat?.trim() || "",
    preferredVehicleTypes: Array.from(new Set(form.preferredVehicleTypes ?? [])),
    communicationChannel: form.communicationChannel || "Email",
    defaultPaymentMode: form.defaultPaymentMode || "Bank Transfer",
    allowAutoBooking: form.allowAutoBooking ?? false,
    rateMatchingConfig: normalizeRateMatchingConfig(form.rateMatchingConfig),
    rateMatchingBasis: rateMatchingConfigToBasis(normalizeRateMatchingConfig(form.rateMatchingConfig)),
    rateCalculationStrategy: resolveCustomerRateCalculationStrategy(form),
    addresses: nextAddresses,
    uomOverrides: (form.uomOverrides ?? [])
      .map((override) => normalizeCustomerUOMOverrideDraft(override))
      .filter((override) => override.quantityUOM && override.weightUOM && override.conversionValue > 0),
    setupProgress: progress,
    setupStatus: deriveSetupStatusFromProgress(progress, addressCount, rateCardCount),
  };
}

function validatePrimaryContact(form: TenantCustomerInput) {
  return Boolean(form.primaryContactName?.trim());
}

function getCustomerFlowLabel(step: CustomerFlowStep) {
  return customerFlowLabels[step];
}

function getCustomerFlowStepFromLabel(label: string): CustomerFlowStep {
  return (
    customerFlowSteps.find((step) => customerFlowLabels[step] === label) ??
    (label as CustomerFlowStep)
  );
}

function createDraftRateCardId() {
  return `draft-rate-card-${Math.random().toString(36).slice(2, 9)}`;
}

function cloneCustomerForm(form: TenantCustomerInput): TenantCustomerInput {
  return {
    ...form,
    addresses: (form.addresses ?? []).map((address) => normalizeCustomerAddressDraft(address)),
    uomOverrides: (form.uomOverrides ?? []).map((override) => normalizeCustomerUOMOverrideDraft(override)),
    preferredVehicleTypes: [...(form.preferredVehicleTypes ?? [])],
    rateMatchingBasis: form.rateMatchingBasis ?? "CITY_TO_CITY",
    setupProgress: normalizeSetupProgress(form.setupProgress),
  };
}

function cloneEditableRateCards(rateCards: EditableCustomerRateCard[]) {
  return rateCards.map((rateCard) => buildEditableRateCard(rateCard));
}

function getSectionSnapshot(
  step: CustomerFlowStep,
  form: TenantCustomerInput,
  rateCards: EditableCustomerRateCard[],
) {
  if (step === "Basic Details") {
    return {
      name: form.name,
      legalName: form.legalName,
      tier: form.tier,
      code: form.code,
      billingAddress: form.billingAddress,
      relationshipManager: form.relationshipManager,
      internalAccountOwner: form.internalAccountOwner,
      gstin: form.gstin,
      gstNumber: form.gstNumber,
      pan: form.pan,
      status: form.status,
    };
  }
  if (step === "Addresses") {
    return deriveCustomerMasterAddresses(form).map((address) => normalizeCustomerAddressDraft(address));
  }
  if (step === "Contacts") {
    return {
      primaryContactName: form.primaryContactName,
      primaryContactEmail: form.primaryContactEmail,
      primaryContactPhone: form.primaryContactPhone,
      primaryContactDesignation: form.primaryContactDesignation,
      accountsContactName: form.accountsContactName,
      accountsContactEmail: form.accountsContactEmail,
      accountsContactPhone: form.accountsContactPhone,
      accountsContactDesignation: form.accountsContactDesignation,
      logisticsContactName: form.logisticsContactName,
      logisticsContactEmail: form.logisticsContactEmail,
      logisticsContactPhone: form.logisticsContactPhone,
      logisticsContactDesignation: form.logisticsContactDesignation,
    };
  }
  if (step === "Credit & Billing") {
    return {
      creditLimit: form.creditLimit,
      creditDays: form.creditDays,
      currentOutstanding: form.currentOutstanding,
      gstChargeType: form.gstChargeType,
      tdsApplicable: form.tdsApplicable,
      invoiceFormat: form.invoiceFormat,
    };
  }
  if (step === "Contracts") {
    return rateCards.map((rateCard) => ({
      id: rateCard.id,
      fromCity: rateCard.fromCity ?? rateCard.fromLocation ?? "",
      toCity: rateCard.toCity ?? rateCard.toLocation ?? "",
      fromLocation: rateCard.fromLocation ?? "",
      toLocation: rateCard.toLocation ?? "",
      sourcePincode: rateCard.sourcePincode ?? "",
      destinationPincode: rateCard.destinationPincode ?? "",
      vehicleType: rateCard.vehicleType ?? "",
      rateType: rateCard.rateType,
      underloadRate: rateCard.underloadRate ?? rateCard.baseRate ?? rateCard.rate,
      overloadRate: rateCard.overloadRate ?? null,
      tat: rateCard.tat ?? rateCard.transitTime ?? "",
      effectiveFromDate: rateCard.effectiveFromDate ?? "",
      effectiveToDate: rateCard.effectiveToDate ?? "",
      remarks: rateCard.remarks ?? "",
      status: rateCard.status,
    }));
  }
  return {
    preferredVehicleTypes: [...(form.preferredVehicleTypes ?? [])].sort(),
    communicationChannel: form.communicationChannel,
    defaultPaymentMode: form.defaultPaymentMode,
    allowAutoBooking: form.allowAutoBooking,
    rateMatchingConfig: normalizeRateMatchingConfig(form.rateMatchingConfig),
    rateCalculationStrategy: resolveCustomerRateCalculationStrategy(form),
    uomOverrides: (form.uomOverrides ?? [])
      .map((override) => normalizeCustomerUOMOverrideDraft(override))
      .sort((left, right) => left.quantityUOM.localeCompare(right.quantityUOM)),
  };
}

function mergeSectionState(
  target: TenantCustomerInput,
  source: TenantCustomerInput,
  step: CustomerFlowStep,
): TenantCustomerInput {
  if (step === "Basic Details") {
    return {
      ...target,
      name: source.name,
      legalName: source.legalName,
      tier: source.tier,
      code: source.code,
      billingAddress: source.billingAddress,
      relationshipManager: source.relationshipManager,
      internalAccountOwner: source.internalAccountOwner,
      gstin: source.gstin,
      gstNumber: source.gstNumber,
      pan: source.pan,
      status: source.status,
    };
  }
  if (step === "Addresses") {
    return {
      ...target,
      addresses: (source.addresses ?? []).map((address) => normalizeCustomerAddressDraft(address)),
    };
  }
  if (step === "Contacts") {
    return {
      ...target,
      primaryContactName: source.primaryContactName,
      primaryContactEmail: source.primaryContactEmail,
      primaryContactPhone: source.primaryContactPhone,
      primaryContactDesignation: source.primaryContactDesignation,
      accountsContactName: source.accountsContactName,
      accountsContactEmail: source.accountsContactEmail,
      accountsContactPhone: source.accountsContactPhone,
      accountsContactDesignation: source.accountsContactDesignation,
      logisticsContactName: source.logisticsContactName,
      logisticsContactEmail: source.logisticsContactEmail,
      logisticsContactPhone: source.logisticsContactPhone,
      logisticsContactDesignation: source.logisticsContactDesignation,
    };
  }
  if (step === "Credit & Billing") {
    return {
      ...target,
      creditLimit: source.creditLimit,
      creditDays: source.creditDays,
      currentOutstanding: source.currentOutstanding,
      gstChargeType: source.gstChargeType,
      tdsApplicable: source.tdsApplicable,
      invoiceFormat: source.invoiceFormat,
    };
  }
  if (step === "Preferences") {
    return {
      ...target,
      preferredVehicleTypes: [...(source.preferredVehicleTypes ?? [])],
      communicationChannel: source.communicationChannel,
      defaultPaymentMode: source.defaultPaymentMode,
      allowAutoBooking: source.allowAutoBooking,
      rateMatchingBasis: source.rateMatchingBasis ?? "CITY_TO_CITY",
      rateMatchingConfig: source.rateMatchingConfig,
      rateCalculationStrategy: source.rateCalculationStrategy,
      uomOverrides: (source.uomOverrides ?? []).map((override) => normalizeCustomerUOMOverrideDraft(override)),
    };
  }
  return target;
}

function buildSectionDraft(
  step: CustomerFlowStep,
  savedForm: TenantCustomerInput,
  currentForm: TenantCustomerInput,
) {
  return cloneCustomerForm(mergeSectionState(savedForm, currentForm, step));
}

function formatLastUpdated(value?: string) {
  if (!value) {
    return "Not updated yet";
  }
  return new Date(value).toLocaleString();
}

function nextFlowStep(step: CustomerFlowStep): CustomerFlowStep {
  if (step === "Basic Details") {
    return "Addresses";
  }
  if (step === "Addresses") {
    return "Contacts";
  }
  if (step === "Contacts") {
    return "Credit & Billing";
  }
  if (step === "Credit & Billing") {
    return "Contracts";
  }
  return "Preferences";
}

function previousFlowStep(step: CustomerFlowStep): CustomerFlowStep {
  if (step === "Preferences") {
    return "Contracts";
  }
  if (step === "Contracts") {
    return "Credit & Billing";
  }
  if (step === "Credit & Billing") {
    return "Contacts";
  }
  if (step === "Contacts") {
    return "Addresses";
  }
  if (step === "Addresses") {
    return "Basic Details";
  }
  return "Basic Details";
}

function CustomerFlowStepper({
  activeStep,
  form,
  onStepChange,
  rateCardCount = 0,
}: {
  activeStep: CustomerFlowStep;
  form: TenantCustomerInput;
  onStepChange?: (step: CustomerFlowStep) => void;
  rateCardCount?: number;
}) {
  // Chips go green only when that step actually has data (not on saved
  // progress flags), so nothing shows complete before data is entered.
  const items: Array<{ step: CustomerFlowStep; helper: string; complete: boolean }> = [
    {
      step: "Basic Details",
      helper: "Identity, tax, primary contact",
      complete: Boolean(form.name?.trim()),
    },
    {
      step: "Addresses",
      helper: "Consignee, consignor, warehouse",
      complete: (form.addresses?.length ?? 0) > 0,
    },
    {
      step: "Credit & Billing",
      helper: "Credit, tax, invoicing",
      complete: Number(form.creditLimit ?? 0) > 0 || Number(form.creditDays ?? 0) > 0,
    },
    {
      step: "Contracts",
      helper: "Existing contract logic",
      complete: rateCardCount > 0,
    },
    {
      step: "Preferences",
      helper: "Vehicles and booking",
      complete: (form.preferredVehicleTypes?.length ?? 0) > 0,
    },
  ];

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {items.map((item, index) => {
        const active = activeStep === item.step;
        return (
          <button
            key={item.step}
            type="button"
            onClick={() => onStepChange?.(item.step)}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-medium transition ${
              active
                ? "border-primary bg-primary text-primary-foreground shadow-sm"
                : item.complete
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                  : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
            } ${onStepChange ? "cursor-pointer" : "cursor-default"}`}
          >
            <span
              className={`flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold ${
                active ? "bg-white/25 text-white" : item.complete ? "bg-emerald-600 text-white" : "bg-slate-300 text-white"
              }`}
            >
              {item.complete && !active ? "✓" : index + 1}
            </span>
            {getCustomerFlowLabel(item.step)}
          </button>
        );
      })}
    </div>
  );
}

function BasicDetailsStep({
  form,
  setForm,
}: {
  form: TenantCustomerInput;
  setForm: React.Dispatch<React.SetStateAction<TenantCustomerInput>>;
}) {
  // Status defaults to active; tier and ownership (Billing Address /
  // Relationship Manager / Internal Account Owner) are deferred to the
  // customer detail page once the customer record exists. Keeping this step
  // minimal — identity + tax — so the user gets to the addresses step fast.
  return (
    <div className="grid gap-6">
      <SectionBlock title="Identity">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Customer Name *">
            <Input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
          </Field>
          <Field label="Legal Name" helper="As per GST registration">
            <Input value={form.legalName ?? ""} onChange={(event) => setForm((current) => ({ ...current, legalName: event.target.value }))} />
          </Field>
        </div>
      </SectionBlock>

      <SectionBlock title="Tax Information">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="GSTIN">
            <Input
              placeholder="29AAAAA0000A1Z5"
              value={form.gstin ?? ""}
              onChange={(event) => setForm((current) => ({ ...current, gstin: event.target.value }))}
            />
          </Field>
          <Field label="PAN">
            <Input
              placeholder="AAAAA0000A"
              value={form.pan ?? ""}
              onChange={(event) => setForm((current) => ({ ...current, pan: event.target.value }))}
            />
          </Field>
        </div>
      </SectionBlock>
    </div>
  );
}

function AddressesStep({
  form,
  setForm,
}: {
  form: TenantCustomerInput;
  setForm: React.Dispatch<React.SetStateAction<TenantCustomerInput>>;
}) {
  return (
    <SectionBlock title="Addresses">
      <CustomerAddressManagementSection
        addresses={form.addresses ?? []}
        onChange={(addresses) => setForm((current) => ({ ...current, addresses }))}
      />
    </SectionBlock>
  );
}

const customerAddressTagOptions: CustomerAddressTag[] = [
  "Billing",
  "Warehouse",
  "Consignor",
  "Consignee",
];

const operationalAddressTypeOptions: CustomerOperationalAddressType[] = [
  "PRIMARY",
  "ADDITIONAL",
  "EMERGENCY",
];

const emptyCustomerAddressDraft = (): CustomerAddressMasterEntry => ({
  id: `draft-address-${Math.random().toString(36).slice(2, 9)}`,
  addressCode: "",
  type: [],
  consigneeId: "",
  consigneeName: "",
  operationalAddressType: "PRIMARY",
  contactCode: "",
  name: "",
  addressLabel: "",
  fullAddress: "",
  line1: "",
  line2: "",
  city: "",
  state: "",
  country: "India",
  pincode: "",
  latitude: null,
  longitude: null,
  gstin: "",
  contactPerson: "",
  contactNumber: "",
  emailId: "",
  isActive: true,
  isTemporary: false,
  remarks: "",
});

function CustomerAddressManagementSection({
  addresses,
  onChange,
}: {
  addresses: CustomerAddressMasterEntry[];
  onChange: (addresses: CustomerAddressMasterEntry[]) => void;
}) {
  const [addressDialogOpen, setAddressDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [draft, setDraft] = useState<CustomerAddressMasterEntry>(() => emptyCustomerAddressDraft());
  const [error, setError] = useState("");
  const [importSummary, setImportSummary] = useState<AddressImportResult | null>(null);
  const [importError, setImportError] = useState("");
  const [importing, setImporting] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState("");
  // Pagination for the address table. Default 10 rows / page — same as the
  // booking list — keeps the page short when a customer has 100s of addresses.
  const ADDRESS_PAGE_SIZE = 10;
  const [addressPage, setAddressPage] = useState(1);

  useEffect(() => {
    if (!addresses.length) {
      setSelectedAddressId(null);
      return;
    }
    setSelectedAddressId((current) =>
      current && addresses.some((address) => address.id === current) ? current : addresses[0]?.id ?? null,
    );
  }, [addresses]);

  function openCreate() {
    setEditingId(null);
    // The compact dialog no longer surfaces the type picker. Default the
    // tag to "Consignee" (the booking-relevant one) so saveAddress passes
    // its `type.length` check without the user having to choose.
    setDraft({ ...emptyCustomerAddressDraft(), type: ["Consignee"] });
    setError("");
    setAddressDialogOpen(true);
  }

  function openCreateForOperationalType(type: CustomerOperationalAddressType, isTemporary = false) {
    setEditingId(null);
    setDraft({
      ...emptyCustomerAddressDraft(),
      operationalAddressType: type,
      type: ["Consignee"],
      isTemporary,
    });
    setError("");
    setAddressDialogOpen(true);
  }

  function openCreateTemporaryForConsignee(source?: CustomerAddressMasterEntry | null) {
    const normalizedSource = source ? normalizeCustomerAddressDraft(source) : normalizeCustomerAddressDraft(draft);
    setEditingId(null);
    setDraft({
      ...emptyCustomerAddressDraft(),
      type: ["Consignee"],
      consigneeId: normalizedSource.consigneeId ?? "",
      consigneeName: normalizedSource.consigneeName ?? "",
      contactPerson: normalizedSource.contactPerson ?? "",
      contactNumber: normalizedSource.contactNumber ?? "",
      emailId: normalizedSource.emailId ?? "",
      country: normalizedSource.country ?? "India",
      operationalAddressType: "ADDITIONAL",
      addressLabel: normalizedSource.addressLabel ? `${normalizedSource.addressLabel} Temporary` : "Temporary Address",
      name: normalizedSource.consigneeName
        ? `${normalizedSource.consigneeName} Temporary Address`
        : "Temporary Address",
      isTemporary: true,
    });
    setError("");
    setAddressDialogOpen(true);
  }

  function openEdit(address: CustomerAddressMasterEntry) {
    setSelectedAddressId(address.id);
    setEditingId(address.id);
    setDraft(normalizeCustomerAddressDraft(address));
    setError("");
    setAddressDialogOpen(true);
  }

  function closeAddressDialog() {
    setAddressDialogOpen(false);
    setEditingId(null);
    setDraft(emptyCustomerAddressDraft());
    setError("");
  }

  function saveAddress() {
    // Consignee Name and Address Label are no longer asked for in the
    // compact dialog. Fall back to `name` for both so downstream consumers
    // (booking/LR/billing) and the existing list view (which display
    // consigneeName / addressLabel) keep working unchanged.
    const filledDraft: CustomerAddressMasterEntry = {
      ...draft,
      consigneeName: draft.consigneeName?.trim() || draft.name?.trim() || "",
      addressLabel: draft.addressLabel?.trim() || draft.name?.trim() || "",
    };
    const normalized = normalizeCustomerAddressDraft(
      filledDraft.isTemporary
        ? {
            ...filledDraft,
            type: ["Consignee"],
            operationalAddressType: filledDraft.operationalAddressType ?? "ADDITIONAL",
            name: filledDraft.name?.trim() || `${filledDraft.consigneeName || "Consignee"} Temporary Address`,
            addressLabel: filledDraft.addressLabel?.trim() || "Temporary Address",
          }
        : filledDraft,
    );
    if (!normalized.type.length) {
      // Should never trigger from the UI — openCreate seeds type with
      // ["Consignee"]. Kept as a safety net for legacy drafts.
      setError("Address type is missing.");
      return;
    }
    if (!normalized.name?.trim()) {
      setError("Address name is required.");
      return;
    }
    if (
      !normalized.contactPerson ||
      !normalized.contactNumber ||
      !normalized.line1 ||
      !normalized.city ||
      !normalized.state ||
      !normalized.country ||
      !normalized.pincode
    ) {
      setError("Contact person, phone, address line 1, pincode, country, state, and city are required.");
      return;
    }
    if (!isValidCustomerAddressPhone(normalized.contactNumber)) {
      setError("Phone must contain 10 to 15 digits.");
      return;
    }
    if (normalized.emailId && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized.emailId)) {
      setError("Email ID must be a valid email address.");
      return;
    }

    const prepared = prepareCustomerAddressDraft(normalized, addresses);
    setSelectedAddressId(prepared.id);

    onChange(
      editingId
        ? addresses.map((address) => (address.id === editingId ? prepared : address))
        : [...addresses, prepared],
    );
    closeAddressDialog();
  }

  function deleteDraftAddress(addressId: string) {
    onChange(addresses.filter((address) => address.id !== addressId));
    setSelectedAddressId((current) => (current === addressId ? null : current));
    if (editingId === addressId) {
      openCreate();
    }
  }

  async function handleUpload(file: File | null) {
    if (!file) {
      return;
    }
    setImporting(true);
    setImportError("");
    try {
      const summary = await parseCustomerAddressFile(file);
      setImportSummary(summary);
      setUploadedFileName(file.name);
    } catch (uploadError) {
      setImportSummary(null);
      setImportError(uploadError instanceof Error ? uploadError.message : "Address file could not be parsed.");
    } finally {
      setImporting(false);
    }
  }

  function applyValidImportedAddresses() {
    if (!importSummary?.validRows.length) {
      return;
    }
    const nextAddresses = [...addresses];
    importSummary.validRows.forEach((row) => {
      nextAddresses.push(
        prepareCustomerAddressDraft(
          {
            ...row,
            id: `bulk-address-${Math.random().toString(36).slice(2, 9)}`,
          },
          nextAddresses,
        ),
      );
    });
    onChange(nextAddresses);
    setImportSummary(null);
    setImportError("");
    setUploadedFileName("");
  }

  function downloadTemplate() {
    downloadCustomerAddressTemplateWorkbook();
  }

  const selectedAddress =
    addresses.find((address) => address.id === selectedAddressId) ??
    addresses[0] ??
    null;
  const selectedConsigneeKey =
    selectedAddress?.consigneeId?.trim().toLowerCase() ||
    selectedAddress?.consigneeName?.trim().toLowerCase() ||
    selectedAddress?.id ||
    "";
  const groupedConsigneeAddresses = addresses
    .filter((address) => address.type.includes("Consignee"))
    .reduce<Map<string, CustomerAddressMasterEntry[]>>((groups, address) => {
      const key =
        address.consigneeId?.trim().toLowerCase() ||
        address.consigneeName?.trim().toLowerCase() ||
        address.id;
      const existing = groups.get(key) ?? [];
      existing.push(address);
      groups.set(key, existing);
      return groups;
    }, new Map());
  const selectedConsigneeAddresses = (groupedConsigneeAddresses.get(selectedConsigneeKey) ?? [selectedAddress]).filter(
    Boolean,
  ) as CustomerAddressMasterEntry[];
  const selectedPrimaryAddress =
    selectedConsigneeAddresses.find((address) => !address.isTemporary && (address.operationalAddressType ?? "PRIMARY") === "PRIMARY") ??
    selectedConsigneeAddresses.find((address) => !address.isTemporary) ??
    selectedAddress;
  const selectedTemporaryAddresses = selectedConsigneeAddresses.filter(
    (address) => address.id !== selectedPrimaryAddress?.id,
  );
  const consigneeRows = Array.from(groupedConsigneeAddresses.values())
    .map((group) => {
      const primaryAddress =
        group.find((address) => !address.isTemporary && (address.operationalAddressType ?? "PRIMARY") === "PRIMARY") ??
        group[0];
      return {
        key:
          primaryAddress.consigneeId?.trim().toLowerCase() ||
          primaryAddress.consigneeName?.trim().toLowerCase() ||
          primaryAddress.id,
        primaryAddress,
        temporaryCount: group.filter((address) => address.isTemporary).length,
        secondaryCount: Math.max(group.length - 1, 0),
      };
    })
    .sort((left, right) => left.primaryAddress.name.localeCompare(right.primaryAddress.name));
  const primaryCount = addresses.filter((address) => address.operationalAddressType === "PRIMARY").length;
  const additionalCount = addresses.filter((address) => address.operationalAddressType === "ADDITIONAL").length;
  const emergencyCount = addresses.filter((address) => address.operationalAddressType === "EMERGENCY").length;
  const temporaryCount = addresses.filter((address) => address.isTemporary).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button size="sm" onClick={openCreate}>+ Add Address</Button>
        <Button size="sm" variant="outline" onClick={downloadTemplate} title="Download Template">
          <FileDown className="size-4" />
          Template
        </Button>
        <label className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md border border-input bg-background px-3 text-[13px] font-medium transition hover:bg-muted" title="Bulk Upload (.xlsx / .csv)">
          <FileDown className="size-4 -rotate-90" />
          Bulk Upload
          <input type="file" accept=".xlsx,.csv" className="hidden" onChange={(event) => void handleUpload(event.target.files?.[0] ?? null)} />
        </label>
      </div>

      {/* Removed: redundant configured-summary block (X primary / additional /
          emergency / temporary) and the "Address Pending" amber panel. The
          empty list state below already communicates "nothing added yet"
          without restating it twice. Bulk upload + Download Template now
          live inside the address dialog footer instead of the top toolbar. */}

      {!addresses.length ? (
        <div className="rounded-xl border border-dashed bg-muted/10 px-4 py-4 text-center text-xs text-muted-foreground">
          No addresses yet — use “+ Add Address” or “Bulk Upload” above.
        </div>
      ) : (
        (() => {
          // Flat paginated table. Replaces the previous consignee-grouped
          // 2-pane layout which broke down once a customer had more than a
          // handful of addresses. Each row is the address; click → edit.
          const totalPages = Math.max(1, Math.ceil(addresses.length / ADDRESS_PAGE_SIZE));
          const pageIndex = Math.min(addressPage, totalPages);
          const pagedAddresses = addresses.slice((pageIndex - 1) * ADDRESS_PAGE_SIZE, pageIndex * ADDRESS_PAGE_SIZE);
          return (
            <div className="overflow-hidden rounded-xl border bg-card">
              <div className="overflow-x-auto">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="border-b bg-slate-50/60 text-left text-[11px] font-medium uppercase tracking-[0.08em] text-slate-500">
                      <th className="px-4 py-2.5">Address Name</th>
                      <th className="px-4 py-2.5">Contact</th>
                      <th className="px-4 py-2.5">Location</th>
                      <th className="px-4 py-2.5">Status</th>
                      <th className="px-4 py-2.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedAddresses.map((address) => (
                      <tr
                        key={address.id}
                        onClick={() => openEdit(address)}
                        className="cursor-pointer border-b last:border-0 hover:bg-slate-50/60"
                      >
                        <td className="px-4 py-2.5">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="font-medium text-slate-900">{address.name || address.addressLabel || "—"}</span>
                            {address.isTemporary ? <Badge variant="warning">TEMP</Badge> : null}
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-slate-700">
                          {address.contactPerson || "—"}
                          {address.contactNumber ? <span className="ml-1 text-slate-500">· {address.contactNumber}</span> : null}
                        </td>
                        <td className="px-4 py-2.5 text-slate-700">
                          {[address.city, address.state, address.pincode].filter(Boolean).join(" · ") || "—"}
                        </td>
                        <td className="px-4 py-2.5">
                          <Badge variant={address.isActive === false ? "outline" : "success"}>
                            {address.isActive === false ? "INACTIVE" : "ACTIVE"}
                          </Badge>
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Edit" onClick={(event) => { event.stopPropagation(); openEdit(address); }}>
                              <Pencil className="size-4" />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Delete" onClick={(event) => { event.stopPropagation(); deleteDraftAddress(address.id); }}>
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {totalPages > 1 ? (
                <div className="flex items-center justify-between gap-3 border-t px-4 py-2.5 text-[12px] text-slate-600">
                  <span>Page {pageIndex} of {totalPages} · {addresses.length} addresses</span>
                  <div className="flex items-center gap-1">
                    <Button variant="outline" size="sm" disabled={pageIndex <= 1} onClick={() => setAddressPage((current) => Math.max(1, current - 1))}>
                      Previous
                    </Button>
                    <Button variant="outline" size="sm" disabled={pageIndex >= totalPages} onClick={() => setAddressPage((current) => Math.min(totalPages, current + 1))}>
                      Next
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>
          );
        })()
      )}

      {importing || uploadedFileName || importError || importSummary ? (
      <div className="rounded-xl border bg-muted/20 p-3">
        <div className="grid gap-4">
          {importing ? <p className="text-sm text-muted-foreground">Validating uploaded file...</p> : null}
          {uploadedFileName ? <p className="text-sm font-medium">{uploadedFileName}</p> : null}
          {importError ? (
            <div className="rounded-2xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {importError}
            </div>
          ) : null}
          {importSummary ? (
            <div className="grid gap-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-emerald-300 bg-emerald-50 p-4">
                  <p className="font-medium text-emerald-900">Valid rows</p>
                  <p className="mt-1 text-sm text-emerald-800">{importSummary.validRows.length} rows ready to import.</p>
                </div>
                <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4">
                  <p className="font-medium text-amber-900">Invalid rows</p>
                  <p className="mt-1 text-sm text-amber-800">{importSummary.invalidRows.length} rows need correction.</p>
                </div>
              </div>
              {importSummary.validRows.length ? (
                <div className="rounded-2xl border bg-background/80 p-4">
                  <p className="text-sm font-semibold">Preview</p>
                  <div className="mt-3 grid gap-3">
                    {importSummary.validRows.slice(0, 5).map((address, index) => (
                      <div key={`preview-address-${index}`} className="rounded-xl border px-3 py-3">
                        <p className="text-sm font-medium">
                          {address.name} ({address.type.join(", ")})
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {[address.line1, address.line2, address.city, address.state, address.pincode]
                            .filter(Boolean)
                            .join(", ")}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Contact: {[address.contactPerson, address.contactNumber].filter(Boolean).join(" | ")}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
              {importSummary.invalidRows.length ? (
                <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4">
                  <p className="font-medium text-amber-900">Invalid rows</p>
                  <div className="mt-3 space-y-3">
                    {importSummary.invalidRows.slice(0, 5).map((row) => (
                      <div key={`invalid-address-${row.rowNumber}`} className="rounded-xl border border-amber-200 bg-white/70 px-3 py-3 text-sm text-amber-900">
                        <p className="font-medium">Row {row.rowNumber}</p>
                        <p className="mt-1">{row.errors.join(" ")}</p>
                      </div>
                    ))}
                  </div>
                  <p className="mt-3 text-xs text-amber-800">Fix and re-upload, or skip the invalid rows and import only the valid ones.</p>
                </div>
              ) : null}
              <div className="flex justify-end">
                <Button onClick={applyValidImportedAddresses} disabled={!importSummary.validRows.length}>
                  Import Valid Rows
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
      ) : null}

      <Dialog
        open={addressDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            closeAddressDialog();
          }
        }}
        title={editingId ? (draft.isTemporary ? "Edit Temporary Address" : "Edit Address") : (draft.isTemporary ? "Add Temporary Address" : "Add Address")}
        description={draft.isTemporary ? "Saved temporary addresses surface automatically in destination-change review." : undefined}
        widthClassName="max-w-3xl"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={closeAddressDialog}>Cancel</Button>
            <Button onClick={saveAddress}>{editingId ? "Save Address" : "Create Address"}</Button>
          </div>
        }
      >
        <div className="grid gap-5">
          {draft.isTemporary ? (
            <div className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">
              Temporary Address
            </div>
          ) : null}
          {draft.isTemporary && selectedPrimaryAddress ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Existing Address</p>
              <p className="mt-2 text-sm font-medium text-slate-900">
                {selectedPrimaryAddress.fullAddress ||
                  [selectedPrimaryAddress.line1, selectedPrimaryAddress.line2, selectedPrimaryAddress.city, selectedPrimaryAddress.state, selectedPrimaryAddress.pincode]
                    .filter(Boolean)
                    .join(", ")}
              </p>
              <p className="mt-2 text-xs text-slate-600">
                {[selectedPrimaryAddress.city, selectedPrimaryAddress.state, selectedPrimaryAddress.pincode].filter(Boolean).join(" | ")}
              </p>
            </div>
          ) : null}
          {error ? (
            <div className="rounded-2xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          ) : null}
          {/* Removed surface: Address Type / Operational Address Type /
              Address Status / Consignee ID / Contact Code / Latitude /
              Longitude. They were either auto-derivable or operational
              metadata that bloated the form. The draft still carries the
              same fields under the hood — `type` defaults to ["Consignee"]
              (the booking-relevant tag), `operationalAddressType` defaults
              to PRIMARY, `isActive` to true, and `consigneeId` /
              `contactCode` are generated by prepareCustomerAddressDraft
              when blank. This keeps every downstream consumer (booking, LR,
              billing) reading the same shape. */}
          {draft.isTemporary && draft.consigneeName ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50/70 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-900">Temporary Address For</p>
              <p className="mt-1 text-sm font-medium text-amber-950">{draft.consigneeName}</p>
            </div>
          ) : null}
          {/* Address Name is the human identifier for this address (e.g.
              "Bangalore Warehouse"). Consignee / Consignor / Billing role
              is assigned at booking creation, not here — so the dialog no
              longer asks for Consignee Name or Address Label. */}
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Address Name *">
              <Input value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} placeholder="Bangalore Warehouse" />
            </Field>
            <Field label="Contact Person *">
              <Input value={draft.contactPerson ?? ""} onChange={(event) => setDraft((current) => ({ ...current, contactPerson: event.target.value }))} />
            </Field>
            <Field label="Phone *">
              <Input
                type="tel"
                inputMode="numeric"
                maxLength={10}
                autoComplete="off"
                placeholder="10-digit mobile number"
                value={draft.contactNumber ?? ""}
                onChange={(event) => {
                  const digitsOnly = event.target.value.replace(/\D/g, "").slice(0, 10);
                  setDraft((current) => ({ ...current, contactNumber: digitsOnly }));
                }}
              />
            </Field>
            <Field label="Email">
              <Input type="email" value={draft.emailId ?? ""} onChange={(event) => setDraft((current) => ({ ...current, emailId: event.target.value }))} />
            </Field>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Address Line 1 *">
              <Input value={draft.line1} onChange={(event) => setDraft((current) => ({ ...current, line1: event.target.value }))} />
            </Field>
            <Field label="Address Line 2">
              <Input value={draft.line2 ?? ""} onChange={(event) => setDraft((current) => ({ ...current, line2: event.target.value }))} />
            </Field>
          </div>
          <div className="grid gap-4 md:grid-cols-4">
            <Field label="Pincode *">
              <Input value={draft.pincode} onChange={(event) => setDraft((current) => ({ ...current, pincode: event.target.value }))} />
            </Field>
            <Field label="City *">
              <Input value={draft.city} onChange={(event) => setDraft((current) => ({ ...current, city: event.target.value }))} />
            </Field>
            <Field label="State *">
              <Input value={draft.state} onChange={(event) => setDraft((current) => ({ ...current, state: event.target.value }))} />
            </Field>
            <Field label="Country">
              <Input value={draft.country ?? ""} onChange={(event) => setDraft((current) => ({ ...current, country: event.target.value }))} />
            </Field>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="GSTIN">
              <Input value={draft.gstin ?? ""} onChange={(event) => setDraft((current) => ({ ...current, gstin: event.target.value }))} placeholder="29AAAAA0000A1Z5" />
            </Field>
            <Field label="Remarks">
              <Input value={draft.remarks ?? ""} onChange={(event) => setDraft((current) => ({ ...current, remarks: event.target.value }))} placeholder="Notes (optional)" />
            </Field>
          </div>
          {draft.type.includes("Consignee") && !draft.isTemporary ? (
            <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
              <Button variant="outline" size="sm" onClick={() => openCreateTemporaryForConsignee()}>
                + Add Temporary Address
              </Button>
            </div>
          ) : null}
        </div>
      </Dialog>
    </div>
  );
}
function ContactsStep({
  form,
  setForm,
}: {
  form: TenantCustomerInput;
  setForm: React.Dispatch<React.SetStateAction<TenantCustomerInput>>;
}) {
  return (
    <SectionBlock title="Primary Contact">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Field label="Name *">
          <Input value={form.primaryContactName ?? ""} onChange={(event) => setForm((current) => ({ ...current, primaryContactName: event.target.value }))} />
        </Field>
        <Field label="Phone">
          <Input value={form.primaryContactPhone ?? ""} onChange={(event) => setForm((current) => ({ ...current, primaryContactPhone: event.target.value }))} />
        </Field>
        <Field label="Email">
          <Input value={form.primaryContactEmail ?? ""} onChange={(event) => setForm((current) => ({ ...current, primaryContactEmail: event.target.value }))} />
        </Field>
        <Field label="Designation">
          <Input placeholder="e.g., Logistics Head" value={form.primaryContactDesignation ?? ""} onChange={(event) => setForm((current) => ({ ...current, primaryContactDesignation: event.target.value }))} />
        </Field>
      </div>
    </SectionBlock>
  );
}

function CreditBillingStep({
  form,
  setForm,
}: {
  form: TenantCustomerInput;
  setForm: React.Dispatch<React.SetStateAction<TenantCustomerInput>>;
}) {
  const creditLimit = form.creditLimit ?? 100000;
  const outstanding = form.currentOutstanding ?? 0;
  const utilization = creditLimit > 0 ? (outstanding / creditLimit) * 100 : 0;

  // Credit & Billing — minimal set. The previous version had three "Display
  // Section / Input Fields / Tax & Finance" headings that wasted space and a
  // mojibake'd ₹ in the labels. Now: one row of inputs + one row of utility
  // summaries + a compact GST/TDS strip.
  return (
    <div className="space-y-4">
      <SectionBlock title="Credit">
        <div className="grid items-end gap-3 md:grid-cols-4">
          <Field label="Credit Limit (₹)">
            <Input type="number" value={String(form.creditLimit ?? "")} onChange={(event) => setForm((current) => ({ ...current, creditLimit: Number(event.target.value || 0) }))} />
          </Field>
          <Field label="Credit Days">
            <Input type="number" value={String(form.creditDays ?? "")} onChange={(event) => setForm((current) => ({ ...current, creditDays: Number(event.target.value || 0) }))} />
          </Field>
          <Field label="Outstanding (₹)">
            <Input type="number" value={String(form.currentOutstanding ?? "")} onChange={(event) => setForm((current) => ({ ...current, currentOutstanding: Number(event.target.value || 0) }))} />
          </Field>
          <div className="space-y-2">
            <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Utilization</label>
            <div className="rounded-lg border bg-muted/20 px-3 py-2 text-sm font-semibold">
              {utilization.toFixed(1)}% <span className="text-[11px] font-normal text-muted-foreground">({formatCurrency(outstanding)} / {formatCurrency(creditLimit)})</span>
            </div>
          </div>
        </div>
      </SectionBlock>

      <SectionBlock title="Tax & Invoicing">
        <div className="grid items-end gap-3 md:grid-cols-3">
          <Field label="GST Charge Type">
            <Select value={form.gstChargeType ?? "Forward Charge (12% GST on Transport)"} onChange={(event) => setForm((current) => ({ ...current, gstChargeType: event.target.value }))}>
              <option value="Forward Charge (12% GST on Transport)">Forward Charge (12% GST on Transport)</option>
              <option value="Reverse Charge">Reverse Charge</option>
            </Select>
          </Field>
          <Field label="Invoice Format">
            <Input value={form.invoiceFormat ?? ""} onChange={(event) => setForm((current) => ({ ...current, invoiceFormat: event.target.value }))} />
          </Field>
          <label className="flex h-[42px] cursor-pointer items-center justify-between gap-3 rounded-lg border bg-muted/10 px-3">
            <span className="text-sm font-medium">TDS applicable</span>
            <Switch checked={Boolean(form.tdsApplicable)} onCheckedChange={(checked) => setForm((current) => ({ ...current, tdsApplicable: checked }))} />
          </label>
        </div>
      </SectionBlock>
    </div>
  );
}

function ContractsPlaceholderStep() {
  return (
    <div className="rounded-2xl border bg-slate-50/80 px-4 py-4">
      <p className="text-sm font-semibold">Step 4: Contracts Page</p>
      <p className="mt-1 text-sm text-muted-foreground">
        Existing contract logic remains unchanged. The requested columns are visible from the customer workspace after creation.
      </p>
    </div>
  );
}

function PreferencesStep({
  form,
  setForm,
  quantityUOMOptions,
  weightUOMOptions,
}: {
  form: TenantCustomerInput;
  setForm: React.Dispatch<React.SetStateAction<TenantCustomerInput>>;
  quantityUOMOptions: string[];
  weightUOMOptions: string[];
}) {
  function toggleVehicle(vehicleType: string) {
    setForm((current) => ({
      ...current,
      preferredVehicleTypes: current.preferredVehicleTypes?.includes(vehicleType)
        ? current.preferredVehicleTypes.filter((item) => item !== vehicleType)
        : [...(current.preferredVehicleTypes ?? []), vehicleType],
    }));
  }

  function updateOverride(
    overrideId: string,
    field: keyof CustomerUOMOverride,
    value: string | number,
  ) {
    setForm((current) => ({
      ...current,
      uomOverrides: (current.uomOverrides ?? []).map((override) =>
        override.id === overrideId
          ? normalizeCustomerUOMOverrideDraft({
              ...override,
              [field]: value,
            } as CustomerUOMOverride)
          : normalizeCustomerUOMOverrideDraft(override),
      ),
    }));
  }

  function addOverride() {
    setForm((current) => ({
      ...current,
      uomOverrides: [
        ...(current.uomOverrides ?? []),
        {
          id: `draft-uom-override-${Math.random().toString(36).slice(2, 9)}`,
          quantityUOM: quantityUOMOptions[0] ?? "",
          weightUOM: weightUOMOptions[0] ?? "",
          conversionValue: 0,
          status: "active",
        },
      ],
    }));
  }

  function deleteOverride(overrideId: string) {
    setForm((current) => ({
      ...current,
      uomOverrides: (current.uomOverrides ?? []).filter((override) => override.id !== overrideId),
    }));
  }

  // RATE CALCULATION STRATEGY: booking searches on this subset of the rate card
  // structure. The available checkboxes come from the structure (Contracts →
  // Configure Rate Card); selecting nothing means "match on all columns".
  const rateStructure = resolveCustomerRateMatchingConfig(form);
  const rateStrategy = resolveCustomerRateCalculationStrategy(form);
  function toggleStrategyDimension(key: RateMatchingFieldKey) {
    const selected = new Set(rateStrategy);
    if (selected.has(key)) {
      selected.delete(key);
    } else {
      selected.add(key);
    }
    // Keep at least one dimension and preserve the structure's canonical order.
    const next = rateStructure.filter((item) => selected.has(item));
    if (!next.length) {
      return;
    }
    setForm((current) => ({ ...current, rateCalculationStrategy: next }));
  }

  return (
    <div className="space-y-4">
      <SectionBlock title="Rate Calculation Strategy">
        <p className="text-sm text-muted-foreground">
          Choose which of this customer&apos;s rate card columns booking should search on to
          auto-calculate freight. Only columns defined in the rate card structure
          (Contracts → Configure Rate Card) are available here.
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {rateStructure.map((key) => {
            const field = RATE_MATCHING_FIELDS.find((item) => item.key === key);
            const checked = rateStrategy.includes(key);
            return (
              <label
                key={key}
                className={`flex cursor-pointer items-start gap-2 rounded-lg border px-3 py-2 text-sm transition ${
                  checked
                    ? "border-primary/40 bg-primary/5 font-medium"
                    : "bg-background/80 hover:border-primary/20"
                }`}
              >
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={checked}
                  onChange={() => toggleStrategyDimension(key)}
                />
                <span>
                  {field?.label ?? key}
                  {field?.description ? (
                    <span className="block text-xs font-normal text-muted-foreground">
                      {field.description}
                    </span>
                  ) : null}
                </span>
              </label>
            );
          })}
        </div>
        <p className="mt-3 rounded-lg bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
          Booking will search the rate card using:{" "}
          <span className="font-medium text-foreground">{describeRateMatchingConfig(rateStrategy)}</span>
        </p>
      </SectionBlock>

      <SectionBlock title="Vehicle Preferences">
        <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {vehicleTypeOptions.map((vehicleType) => (
            <label
              key={vehicleType}
              className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition ${
                form.preferredVehicleTypes?.includes(vehicleType)
                  ? "border-primary/40 bg-primary/5 font-medium"
                  : "bg-background/80 hover:border-primary/20"
              }`}
            >
              <input
                type="checkbox"
                checked={form.preferredVehicleTypes?.includes(vehicleType) ?? false}
                onChange={() => toggleVehicle(vehicleType)}
              />
              {vehicleType}
            </label>
          ))}
        </div>
      </SectionBlock>

      <SectionBlock title="Communication & Payment">
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Communication Channel">
            <Select value={form.communicationChannel ?? "Email"} onChange={(event) => setForm((current) => ({ ...current, communicationChannel: event.target.value }))}>
              <option value="Email">Email</option>
              <option value="Phone">Phone</option>
              <option value="WhatsApp">WhatsApp</option>
            </Select>
          </Field>
          <Field label="Default Payment Mode">
            <Select value={form.defaultPaymentMode ?? "Bank Transfer"} onChange={(event) => setForm((current) => ({ ...current, defaultPaymentMode: event.target.value }))}>
              <option value="Bank Transfer">Bank Transfer</option>
              <option value="Cheque">Cheque</option>
              <option value="UPI">UPI</option>
            </Select>
          </Field>
        </div>
        <label className="mt-3 flex cursor-pointer items-center justify-between gap-3 rounded-lg border bg-muted/10 px-3 py-2">
          <span className="text-sm font-medium">Allow Auto-Booking (API)</span>
          <Switch checked={Boolean(form.allowAutoBooking)} onCheckedChange={(checked) => setForm((current) => ({ ...current, allowAutoBooking: checked }))} />
        </label>
      </SectionBlock>

      <details className="rounded-2xl border border-border/70 bg-card">
        <summary className="cursor-pointer px-4 py-3 text-sm font-semibold">Customer UOM Overrides</summary>
        <div className="space-y-3 border-t px-4 py-3">
          <div className="flex justify-end">
            <Button size="sm" variant="outline" onClick={addOverride} disabled={!quantityUOMOptions.length || !weightUOMOptions.length}>
              + Add UOM Override
            </Button>
          </div>

          {(form.uomOverrides ?? []).length ? (
            <div className="overflow-x-auto rounded-2xl border">
              <table className="min-w-full divide-y divide-border text-sm">
                <thead className="bg-muted/20">
                  <tr className="text-left text-muted-foreground">
                    <th className="px-3 py-3 font-medium">Quantity UOM</th>
                    <th className="px-3 py-3 font-medium">Weight UOM</th>
                    <th className="px-3 py-3 font-medium">Conversion</th>
                    <th className="px-3 py-3 font-medium">Status</th>
                    <th className="px-3 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/70">
                  {(form.uomOverrides ?? []).map((override) => (
                    <tr key={override.id}>
                      <td className="px-3 py-3">
                        <Select value={override.quantityUOM} onChange={(event) => updateOverride(override.id, "quantityUOM", event.target.value)}>
                          <option value="">Select quantity UOM</option>
                          {quantityUOMOptions.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </Select>
                      </td>
                      <td className="px-3 py-3">
                        <Select value={override.weightUOM} onChange={(event) => updateOverride(override.id, "weightUOM", event.target.value)}>
                          <option value="">Select weight UOM</option>
                          {weightUOMOptions.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </Select>
                      </td>
                      <td className="px-3 py-3">
                        <Input
                          type="number"
                          min="0"
                          step="0.0001"
                          value={override.conversionValue ? String(override.conversionValue) : ""}
                          onChange={(event) => updateOverride(override.id, "conversionValue", Number(event.target.value))}
                        />
                      </td>
                      <td className="px-3 py-3">
                        <Select value={override.status ?? "active"} onChange={(event) => updateOverride(override.id, "status", event.target.value)}>
                          <option value="active">Active</option>
                          <option value="inactive">Inactive</option>
                        </Select>
                      </td>
                      <td className="px-3 py-3">
                        <Button size="sm" variant="ghost" onClick={() => deleteOverride(override.id)}>
                          Delete
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No overrides — booking uses the tenant default UOM mapping.</p>
          )}
        </div>
      </details>
    </div>
  );
}

function TenantCustomerContractsSection({
  tenantId,
  rateCards,
  onCreate,
  onUpdate,
  onDelete,
  onReplaceAll,
  helperNote,
  rateMatchingConfig,
  onConfigChange,
}: {
  tenantId: string;
  rateCards: EditableCustomerRateCard[];
  onCreate: (input: TenantCustomerRateCardInput) => void;
  onUpdate: (rateCardId: string, updates: Partial<TenantCustomerRateCardInput>) => void;
  onDelete: (rateCardId: string) => void;
  onReplaceAll?: (rows: TenantCustomerRateCardInput[]) => void;
  helperNote?: string;
  rateMatchingConfig?: RateMatchingConfig;
  onConfigChange?: (config: RateMatchingConfig) => void;
}) {
  // The customer's rate card STRUCTURE drives the grid, add-rate form, template
  // and upload validation — which columns exist. How booking SEARCHES these
  // columns is a separate choice (Preferences → Rate Calculation Strategy).
  const config = normalizeRateMatchingConfig(rateMatchingConfig);
  const columns = getRateMatchingColumns(config);

  // Dimension dropdowns reuse existing tenant master data where it exists.
  const { data: vehicleTypeData } = useTenantVehicleTypes(tenantId);
  const { data: materialData } = useTenantMaterials(tenantId);
  const { definitions: uomDefinitions } = useTenantUOMConfigurations(tenantId);
  const vehicleSelectOptions = vehicleTypeData.length
    ? vehicleTypeData.map((vehicleType) => vehicleType.typeCode)
    : [...vehicleTypeOptions];
  const materialSelectOptions = materialData
    .filter((material) => material.status === "active")
    .map((material) => material.materialCode);
  const uomSelectOptions = uomDefinitions
    .filter((definition) => definition.status === "active")
    .map((definition) => definition.code);
  const selectOptionsByField: Partial<Record<RateCardDimensionField, string[]>> = {
    vehicleType: vehicleSelectOptions,
    ...(materialSelectOptions.length ? { material: materialSelectOptions } : {}),
    ...(uomSelectOptions.length ? { uom: uomSelectOptions } : {}),
  };

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [editingRateCard, setEditingRateCard] = useState<EditableCustomerRateCard | null>(null);
  const [error, setError] = useState("");
  const [importSummary, setImportSummary] = useState<Awaited<ReturnType<typeof parseRateCardFile>> | null>(null);
  const [importError, setImportError] = useState("");
  const [importing, setImporting] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState("");
  const [form, setForm] = useState(initialRateCardForm);

  // "Configure Rate Card" modal — selecting dimensions regenerates the grid,
  // add-rate form, template and upload validation for this customer.
  const [configOpen, setConfigOpen] = useState(false);
  const [draftConfig, setDraftConfig] = useState<RateMatchingConfig>(config);
  function toggleDraftConfig(key: RateMatchingFieldKey) {
    setDraftConfig((current) =>
      current.includes(key) ? current.filter((item) => item !== key) : [...current, key],
    );
  }
  function openConfig() {
    setDraftConfig(config);
    setConfigOpen(true);
  }
  function saveConfig() {
    if (!draftConfig.length) {
      return;
    }
    onConfigChange?.(normalizeRateMatchingConfig(draftConfig));
    setConfigOpen(false);
  }

  const filteredRateCards = rateCards.filter((rateCard) => {
    const normalizedSearch = search.trim().toLowerCase();
    if (
      normalizedSearch &&
      !`${rateCard.fromCity ?? ""} ${rateCard.toCity ?? ""} ${rateCard.fromLocation ?? ""} ${rateCard.toLocation ?? ""} ${rateCard.sourcePincode ?? ""} ${rateCard.destinationPincode ?? ""} ${rateCard.vehicleType ?? ""} ${rateCard.remarks ?? ""}`
        .toLowerCase()
        .includes(normalizedSearch)
    ) {
      return false;
    }
    if (typeFilter !== "all" && rateCard.rateType !== typeFilter) {
      return false;
    }
    return true;
  });

  function openCreate() {
    setEditingRateCard(null);
    setForm(initialRateCardForm);
    setError("");
    setOpen(true);
  }

  function openEdit(rateCard: EditableCustomerRateCard) {
    setEditingRateCard(rateCard);
    setForm({
      fromCity: rateCard.fromCity ?? "",
      toCity: rateCard.toCity ?? "",
      fromLocation: rateCard.fromLocation ?? "",
      toLocation: rateCard.toLocation ?? "",
      sourcePincode: rateCard.sourcePincode ?? "",
      destinationPincode: rateCard.destinationPincode ?? "",
      rateType: rateCard.rateType,
      vehicleType: rateCard.vehicleType ?? "",
      material: rateCard.material ?? "",
      serviceType: rateCard.serviceType ?? "",
      weightSlab: rateCard.weightSlab ?? "",
      quantitySlab: rateCard.quantitySlab ?? "",
      customerGroup: rateCard.customerGroup ?? "",
      uom: rateCard.uom ?? "",
      rate: String(rateCard.rate ?? rateCard.underloadRate ?? rateCard.baseRate ?? ""),
      underloadRate: String(rateCard.underloadRate ?? rateCard.baseRate ?? rateCard.rate ?? ""),
      overloadRate: rateCard.overloadRate != null ? String(rateCard.overloadRate) : "",
      tat: rateCard.tat ?? rateCard.transitTime ?? "",
      effectiveFromDate: rateCard.effectiveFromDate ?? "",
      effectiveToDate: rateCard.effectiveToDate ?? "",
      remarks: rateCard.remarks ?? "",
      status: rateCard.status,
    });
    setError("");
    setOpen(true);
  }

  function submit() {
    setError("");
    const readField = (field: RateCardDimensionField) =>
      ((form as Record<string, string>)[field] ?? "").trim();

    // Validate only the configured dimension columns.
    for (const column of columns) {
      const value = readField(column.field);
      // Vehicle Type is mandatory only for Per Trip; optional for other rate types.
      if (column.field === "vehicleType" && form.rateType !== "PER_TRIP") {
        continue;
      }
      if (column.field === "sourcePincode" || column.field === "destinationPincode") {
        if (!/^\d{6}$/.test(value)) {
          setError(`${column.label} must be a 6-digit number.`);
          return;
        }
      } else if (!value) {
        setError(`${column.label} is required.`);
        return;
      }
    }

    const rate = Number(form.rate);
    if (!form.rate || Number.isNaN(rate) || rate <= 0) {
      setError("Rate must be greater than zero.");
      return;
    }

    // Persist only the configured dimensions; unconfigured ones stay empty.
    const configuredFields = new Set(columns.map((column) => column.field));
    const dim = (field: RateCardDimensionField) =>
      configuredFields.has(field) ? readField(field) || undefined : undefined;

    const payload: TenantCustomerRateCardInput = {
      fromCity: dim("fromCity"),
      toCity: dim("toCity"),
      fromLocation: dim("fromLocation"),
      toLocation: dim("toLocation"),
      sourcePincode: dim("sourcePincode") ?? "",
      destinationPincode: dim("destinationPincode") ?? "",
      rateType: form.rateType,
      vehicleType: dim("vehicleType") ?? null,
      material: dim("material"),
      serviceType: dim("serviceType"),
      weightSlab: dim("weightSlab"),
      quantitySlab: dim("quantitySlab"),
      customerGroup: dim("customerGroup"),
      uom: dim("uom"),
      // A single Rate drives the value side; mirror it to the legacy rate
      // fields the booking engine reads.
      underloadRate: rate,
      overloadRate: null,
      baseRate: rate,
      rate,
      status: editingRateCard?.status ?? "active",
    };

    if (editingRateCard) {
      onUpdate(editingRateCard.id, payload);
    } else {
      onCreate(payload);
    }
    setOpen(false);
  }

  function downloadTemplate() {
    downloadRateCardTemplateWorkbook(getRateCardTemplateColumns(config));
  }

  async function handleUpload(file: File | null) {
    if (!file) {
      return;
    }
    setImporting(true);
    setImportError("");
    try {
      const summary = await parseRateCardFile(file, config);
      setImportSummary(summary);
      setUploadedFileName(file.name);
    } catch (uploadError) {
      setImportSummary(null);
      setImportError(uploadError instanceof Error ? uploadError.message : "Rate card file could not be parsed.");
    } finally {
      setImporting(false);
    }
  }

  function applyValidRows() {
    if (!importSummary?.validRows.length) {
      return;
    }
    if (rateCards.length && onReplaceAll) {
      const shouldReplace = window.confirm(
        "Existing rate card rows are already present. Click OK to replace them with the uploaded rows. Click Cancel to keep current rows and add the uploaded rows instead.",
      );
      if (shouldReplace) {
        onReplaceAll(importSummary.validRows);
        setImportSummary(null);
        setUploadedFileName("");
        return;
      }
    }
    importSummary.validRows.forEach((row) => onCreate(row));
    setImportSummary(null);
    setUploadedFileName("");
  }

  return (
    <div className="space-y-5">
      {helperNote ? (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {helperNote}
        </div>
      ) : null}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/70 bg-card px-4 py-3 shadow-sm">
        <div>
          <p className="text-sm font-semibold">Rate Card Structure</p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Choose which columns this customer's rate card has. This regenerates the grid,
            add-rate form, template and upload validation. How booking searches these columns
            is set in Preferences → Rate Calculation Strategy.
          </p>
        </div>
        <Button onClick={openConfig}>Configure Rate Card</Button>
      </div>
      <TenantFilterBar
        searchValue={search}
        searchPlaceholder="Search by city, location, vehicle type, or remarks"
        onSearchChange={setSearch}
        filters={
          <Select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
            <option value="all">All rate types</option>
            <option value="PER_KM">Per KM</option>
            <option value="PER_MT">Per MT</option>
            <option value="PER_TRIP">Per Trip</option>
          </Select>
        }
        trailing={
          <div className="flex flex-wrap items-center gap-2">
            <span className="hidden text-[12px] text-muted-foreground sm:inline">{rateCards.length} row{rateCards.length === 1 ? "" : "s"} configured</span>
            <Button size="sm" onClick={openCreate}>Add Rate</Button>
            <label className="inline-flex cursor-pointer items-center rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground">
              Upload Rate Card
              <input type="file" accept=".xlsx,.csv" className="hidden" onChange={(event) => void handleUpload(event.target.files?.[0] ?? null)} />
            </label>
            <Button size="sm" variant="outline" onClick={downloadTemplate}>
              <FileDown className="size-4" />
              Download Template
            </Button>
          </div>
        }
      />
      {importing || uploadedFileName || importError || importSummary ? (
        <div className="space-y-3 rounded-xl border border-border/60 bg-muted/10 p-3">
          {importing ? <p className="text-sm text-muted-foreground">Validating uploaded file...</p> : null}
          {uploadedFileName ? <p className="text-sm font-medium">{uploadedFileName}</p> : null}
          {importError ? (
            <div className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-700">{importError}</div>
          ) : null}
          {importSummary ? (
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-3">
                <p className="font-medium text-emerald-900">Valid rows</p>
                <p className="mt-1 text-sm text-emerald-800">{importSummary.validRows.length} rows ready to import.</p>
              </div>
              <div className="rounded-xl border border-amber-300 bg-amber-50 p-3">
                <p className="font-medium text-amber-900">Invalid rows</p>
                <p className="mt-1 text-sm text-amber-800">{importSummary.invalidRows.length} rows need correction.</p>
              </div>
              {importSummary.invalidRows.length ? (
                <div className="md:col-span-2 rounded-xl border border-amber-300 bg-amber-50 p-3">
                  <p className="font-medium text-amber-900">Validation errors</p>
                  <div className="mt-2 space-y-2">
                    {importSummary.invalidRows.slice(0, 5).map((row) => (
                      <div key={`invalid-${row.rowNumber}`} className="rounded-lg border border-amber-200 bg-white/70 px-3 py-2 text-sm text-amber-900">
                        <p className="font-medium">Row {row.rowNumber}</p>
                        <p className="mt-1">{row.errors.join(" ")}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
              <div className="md:col-span-2 flex justify-end">
                <Button onClick={applyValidRows} disabled={!importSummary.validRows.length}>Import Valid Rows</Button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
      <DataTable
        title="Rate Card Preview"
        description="Rate rows for this customer."
        headers={[
          ...columns.map((column) => column.label),
          "Rate Type",
          "Rate",
          "Actions",
        ]}
        rows={filteredRateCards.map((rateCard) => [
          ...columns.map((column, columnIndex) => (
            <span key={`${rateCard.id}-dim-${columnIndex}`} className="font-medium">
              {readRateCardColumnValue(rateCard, column.field)}
            </span>
          )),
          <Badge key={`${rateCard.id}-type`} variant="outline">{formatRateType(rateCard.rateType)}</Badge>,
          `${(rateCard.rate ?? rateCard.underloadRate ?? rateCard.baseRate ?? 0).toLocaleString()}`,
          <div key={`${rateCard.id}-actions`} className="flex flex-wrap gap-2">
            <Button size="sm" variant="ghost" onClick={() => openEdit(rateCard)}>Edit</Button>
            <Button size="sm" variant="outline" onClick={() => onDelete(rateCard.id)}>Delete</Button>
          </div>,
        ])}
        emptyMessage="No rate cards yet. Configure the structure, then add rows or upload a template."
      />

      <Dialog
        open={open}
        onOpenChange={setOpen}
        title={editingRateCard ? "Edit Rate Card" : "Add Rate Manually"}
        description="Manual entry is best for a small number of rows. Upload remains the primary method for bulk setup."
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={submit}>{editingRateCard ? "Save Changes" : "Save Rate Card"}</Button>
          </div>
        }
      >
        <div className="grid gap-4 md:grid-cols-2">
          {error ? (
            <div className="md:col-span-2 rounded-2xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          ) : null}
          {/* Rate Type comes first — it drives whether Vehicle Type is required
              (mandatory for Per Trip, optional for Per MT / Per KM). */}
          <Field label="Rate Type *">
            <Select value={form.rateType} onChange={(event) => setForm((current) => ({ ...current, rateType: event.target.value as TenantCustomerRateCardInput["rateType"] }))}>
              <option value="PER_KM">Per KM</option>
              <option value="PER_MT">Per MT</option>
              <option value="PER_TRIP">Per Trip</option>
            </Select>
          </Field>
          {/* Dimension fields are driven by the customer's rate matching configuration. */}
          {columns.map((column) => {
            const value = (form as Record<string, string>)[column.field] ?? "";
            const options = selectOptionsByField[column.field];
            const setValue = (next: string) =>
              setForm((current) => ({ ...current, [column.field]: next }));
            // Vehicle Type is only mandatory for Per Trip; optional otherwise.
            const vehicleOptional = column.field === "vehicleType" && form.rateType !== "PER_TRIP";
            const labelText = vehicleOptional ? `${column.label} (optional)` : `${column.label} *`;
            return (
              <Field key={column.field} label={labelText}>
                {options ? (
                  <Select value={value} onChange={(event) => setValue(event.target.value)}>
                    <option value="">Select {column.label}</option>
                    {value && !options.includes(value) ? <option value={value}>{value}</option> : null}
                    {options.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </Select>
                ) : (
                  <Input
                    value={value}
                    onChange={(event) => setValue(event.target.value)}
                    placeholder={column.placeholder}
                  />
                )}
              </Field>
            );
          })}
          <Field label="Rate *">
            <Input
              type="number"
              value={form.rate}
              onChange={(event) => setForm((current) => ({ ...current, rate: event.target.value }))}
              placeholder="18000"
            />
          </Field>
        </div>
      </Dialog>

      <Dialog
        open={configOpen}
        onOpenChange={setConfigOpen}
        title="Configure Rate Card"
        description="Select which columns this customer's rate card has. Columns regenerate immediately. Booking's search columns are chosen separately in Preferences."
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setConfigOpen(false)}>Cancel</Button>
            <Button onClick={saveConfig} disabled={!draftConfig.length}>Save Configuration</Button>
          </div>
        }
      >
        <div className="space-y-5">
          <RateCardConfigGroup
            title="Origin → Destination columns"
            hint="Pick at least one origin → destination basis."
            keys={["CITY_PAIR", "LOCATION_PAIR", "PINCODE_PAIR"]}
            labels={{ CITY_PAIR: "City Pair", LOCATION_PAIR: "Location Pair", PINCODE_PAIR: "Pincode Pair" }}
            selected={draftConfig}
            onToggle={toggleDraftConfig}
          />
          <RateCardConfigGroup
            title="Additional parameters"
            hint="Optional dimensions that further narrow the rate."
            keys={["VEHICLE_TYPE", "MATERIAL", "SERVICE_TYPE", "WEIGHT_SLAB", "QUANTITY_SLAB"]}
            selected={draftConfig}
            onToggle={toggleDraftConfig}
          />
          {!draftConfig.length ? (
            <p className="text-sm text-rose-600">Select at least one parameter.</p>
          ) : null}
        </div>
      </Dialog>
    </div>
  );
}

/** A labelled group of rate-card dimension checkboxes inside the config modal. */
function RateCardConfigGroup({
  title,
  hint,
  keys,
  labels,
  selected,
  onToggle,
}: {
  title: string;
  hint?: string;
  keys: RateMatchingFieldKey[];
  labels?: Partial<Record<RateMatchingFieldKey, string>>;
  selected: RateMatchingConfig;
  onToggle: (key: RateMatchingFieldKey) => void;
}) {
  return (
    <div>
      <p className="text-sm font-semibold">{title}</p>
      {hint ? <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p> : null}
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        {keys.map((key) => {
          const field = RATE_MATCHING_FIELDS.find((item) => item.key === key);
          const label = labels?.[key] ?? field?.label ?? key;
          const checked = selected.includes(key);
          return (
            <label
              key={key}
              className={`flex cursor-pointer items-start gap-2 rounded-lg border px-3 py-2 text-sm transition ${
                checked ? "border-primary/40 bg-primary/5 font-medium" : "bg-background/80 hover:border-primary/20"
              }`}
            >
              <input type="checkbox" className="mt-0.5" checked={checked} onChange={() => onToggle(key)} />
              <span>
                {label}
                {field?.description ? (
                  <span className="block text-xs font-normal text-muted-foreground">{field.description}</span>
                ) : null}
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

function SectionBlock({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-2xl border bg-card/95 p-5 shadow-panel">
      <p className="text-sm font-semibold">{title}</p>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function SectionEditActions({
  currentStep,
  onCancel,
  onSave,
  onSaveAndNext,
}: {
  currentStep: CustomerFlowStep;
  onCancel: () => void;
  onSave: () => void;
  onSaveAndNext: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-3 border-t border-border/70 pt-4">
      <Button variant="outline" onClick={onCancel}>
        Cancel
      </Button>
      <Button variant="outline" onClick={onSave}>
        Save
      </Button>
      <Button onClick={onSaveAndNext} disabled={currentStep === "Preferences"}>
        Save & Next
      </Button>
    </div>
  );
}

function SummaryCard({ title, helper }: { title: string; helper: string }) {
  return (
    <div className="rounded-2xl border bg-muted/20 px-4 py-4">
      <p className="text-sm font-semibold">{title}</p>
      <p className="mt-1 text-xs text-muted-foreground">{helper}</p>
    </div>
  );
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatRateType(rateType: TenantCustomerRateCard["rateType"]) {
  if (rateType === "PER_KM") {
    return "Per KM";
  }
  if (rateType === "PER_TON" || rateType === "PER_MT") {
    return "Per MT";
  }
  if (rateType === "FIXED" || rateType === "PER_TRIP") {
    return "Per Trip";
  }
  return rateType;
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 rounded-2xl border border-border/70 bg-muted/10 px-3 py-3">
      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className="text-sm text-foreground">{value}</span>
    </div>
  );
}
function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-border/70 bg-background/80 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}

function Field({
  label,
  helper,
  children,
}: {
  label: string;
  helper?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      {children}
      {helper ? <p className="text-xs text-muted-foreground">{helper}</p> : null}
    </div>
  );
}


