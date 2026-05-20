import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import { FileDown, PencilLine, Plus } from "lucide-react";
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
import { useTenantCustomers } from "@/modules/tenant-admin/hooks/useTenantCustomers";
import { useTenantUOMConfigurations } from "@/modules/tenant-admin/hooks/useTenantMasterData";
import { useTenantRouteContext } from "@/modules/tenant-admin/hooks/useTenantRouteContext";
import type {
  AddressImportResult,
  CustomerAddressMasterEntry,
  CustomerAddressTag,
  CustomerOperationalAddressType,
  CustomerRateMatchingBasis,
  CustomerSetupProgress,
  CustomerSetupStatus,
  CustomerUOMOverride,
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
  rateMatchingBasis: "LANE_TO_LANE",
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
  lanes: "",
  fromCity: "",
  toCity: "",
  fromLocation: "",
  toLocation: "",
  sourcePincode: "",
  destinationPincode: "",
  rateType: "PER_TRIP" as TenantCustomerRateCardInput["rateType"],
  vehicleType: "",
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
  "Contacts",
  "Credit & Billing",
  "Contracts",
  "Preferences",
];

const customerFlowLabels: Record<CustomerFlowStep, string> = {
  "Basic Details": "Basic Details",
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
    <div className="space-y-6">
      <PageHeader
        eyebrow="Tenant Admin"
        title="Customers"
        description="Create and manage tenant-owned customers inside a guided enterprise workflow."
        action={
          <Button onClick={openCreate}>
            <Plus className="size-4" />
            Add Customer
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-4">
        <TenantSummaryCard label="Customers" value={String(rows.length)} helper="Tenant-level customer masters" />
        <TenantSummaryCard label="Fully Configured" value={String(fullyConfiguredCount)} helper="All five pages completed" />
        <TenantSummaryCard label="Incomplete Setup" value={String(rows.length - fullyConfiguredCount)} helper="Missing one or more guided pages" />
        <TenantSummaryCard label="Active" value={String(rows.filter((customer) => customer.status === "active").length)} helper="Currently active customer records" />
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
          description="Customer setup remains flexible, but missing pages stay clearly visible until completed."
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

      <Dialog
        open={open}
        onOpenChange={setOpen}
        title={editingCustomer ? "Edit Customer" : "Add Customer"}
        description="Keep the five-page flow intact. Complete everything now, or save and finish the remaining pages later."
        widthClassName="max-w-5xl"
        footer={
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm text-muted-foreground">
              {editingCustomer
                ? "Update fields on the mapped page only."
                : "You can skip later pages and complete them from the customer workspace."}
            </div>
            <div className="flex flex-wrap gap-3">
              {editingCustomer ? (
                <>
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (
                        currentDialogSectionDirty &&
                        !window.confirm(
                          `Discard changes in ${getCustomerFlowLabel(activeStep)} and exit edit mode?`,
                        )
                      ) {
                        return;
                      }
                      setOpen(false);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button variant="outline" onClick={() => void saveEditSection(activeStep)}>
                    Save
                  </Button>
                  <Button
                    onClick={() => {
                      if (saveEditSection(activeStep) && activeStep !== "Preferences") {
                        setActiveStep(nextFlowStep(activeStep));
                      }
                    }}
                    disabled={activeStep === "Preferences"}
                  >
                    Save & Next
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="outline" onClick={() => setOpen(false)}>
                    Cancel
                  </Button>
                <Button
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
                  Create And Finish Later
                </Button>
                  {activeStep !== "Basic Details" ? (
                    <Button variant="outline" onClick={() => setActiveStep(previousFlowStep(activeStep))}>
                      Back
                    </Button>
                  ) : null}
                  {activeStep !== "Preferences" ? (
                    <Button onClick={() => moveToStep(nextFlowStep(activeStep))}>Continue</Button>
                  ) : null}
                  {activeStep === "Preferences" ? (
                <Button
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
                  ) : null}
                </>
              )}
            </div>
          </div>
        }
      >
        <div className="grid gap-4">
          {error ? (
            <div className="rounded-2xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          ) : null}

          <CustomerFlowStepper
            activeStep={activeStep}
            form={form}
            onStepChange={editingCustomer ? handleEditStepChange : undefined}
          />

          {activeStep === "Basic Details" ? (
            <BasicDetailsStep form={form} setForm={setForm} />
          ) : null}

          {activeStep === "Addresses" ? (
            <AddressesStep form={form} setForm={setForm} />
          ) : null}

          {activeStep === "Contacts" ? (
            <ContactsStep form={form} setForm={setForm} />
          ) : null}

          {activeStep === "Credit & Billing" ? (
            <CreditBillingStep form={form} setForm={setForm} />
          ) : null}

          {activeStep === "Contracts" ? (
            <TenantCustomerContractsSection
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
              helperNote="You can upload via Excel or add manually. This step can be completed later and does not block customer creation."
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
      </Dialog>
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
    <div className="space-y-6">
      <PageHeader
        eyebrow="Tenant Admin"
        title={tenantCustomer.name}
        description="Follow the mapped customer pages exactly and complete any missing sections here."
        action={
          <div className="flex flex-wrap gap-3">
            {missingSteps.length ? (
              <Button onClick={() => handleTabChange(getCustomerFlowLabel(missingSteps[0]))}>Complete Setup</Button>
            ) : null}
            <Button asChild variant="outline">
              <Link to={`/tenant/${tenant.id}/customers`}>Back to customers</Link>
            </Button>
          </div>
        }
      />

      {message ? (
        <div className="rounded-2xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {message}
        </div>
      ) : null}

      {missingSteps.length ? (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-900">Customer setup is incomplete</p>
          <p className="mt-1 text-sm text-amber-800">
            Complete the remaining mapped pages to finish setup for this customer.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {missingSteps.map((step) => (
              <Badge key={step} variant="warning">Missing {getCustomerFlowLabel(step)}</Badge>
            ))}
          </div>
        </div>
      ) : null}

      {!draftAddresses.length ? (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-900">Address Pending</p>
          <p className="mt-1 text-sm text-amber-800">
            This customer does not have any reusable address master entries yet. Add an address from the Addresses tab to use it later in booking, LR generation, and billing flows.
          </p>
          <div className="mt-3">
            <Button onClick={() => handleTabChange(getCustomerFlowLabel("Addresses"))}>Add Address</Button>
          </div>
        </div>
      ) : null}

      {!detailRateCards.length ? (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-900">Rate Card Pending</p>
          <p className="mt-1 text-sm text-amber-800">
            No rate card has been configured for this customer yet. Add it from the Contracts (Rate Card) tab now or complete it later.
          </p>
          <div className="mt-3">
            <Button onClick={() => handleTabChange(getCustomerFlowLabel("Contracts"))}>Add Rate Card</Button>
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-5">
        <TenantSummaryCard label="Status" value={tenantCustomer.status} helper="Tenant-owned customer state" />
        <TenantSummaryCard label="Setup" value={missingSteps.length ? "Incomplete" : "Complete"} helper="Guided page completion" />
        <TenantSummaryCard label="Credit Limit" value={formatCurrency(detailForm.creditLimit ?? 0)} helper="Configured customer credit limit" />
        <TenantSummaryCard label="Outstanding" value={formatCurrency(detailForm.currentOutstanding ?? 0)} helper="Current outstanding value" />
        <TenantSummaryCard label="Contracts (Rate Card)" value={String(detailRateCards.length)} helper="Existing contract/rate-card records" />
      </div>

      <TenantPanel
        title="Customer workspace"
        description="Keep field placement fixed to the mapped customer pages."
        action={
          <Tabs
            tabs={customerFlowSteps.map((step) => getCustomerFlowLabel(step))}
            active={getCustomerFlowLabel(activeTab)}
            onChange={handleTabChange}
          />
        }
      >
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/70 bg-slate-50/70 px-4 py-3">
          <div>
            <p className="text-sm font-semibold">{getCustomerFlowLabel(activeTab)}</p>
            <p className="mt-1 text-xs text-muted-foreground">Last Updated: {formatLastUpdated(lastUpdatedValue)}</p>
          </div>
          <Badge variant={currentSectionDirty ? "warning" : "outline"}>
            {currentSectionDirty ? "Unsaved Changes" : "All Changes Saved"}
          </Badge>
        </div>

        <CustomerFlowStepper activeStep={activeTab} form={detailForm} />

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
            helperNote={
              progress.contractsCompleted
                ? undefined
                : "You can upload via Excel or add manually. This step can be completed later."
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
    rateMatchingBasis: customer.rateMatchingBasis ?? "LANE_TO_LANE",
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
    lanes: deriveRateCardLane(rateCard),
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
      lanes: deriveRateCardLane(rateCard),
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
    rateMatchingBasis: form.rateMatchingBasis ?? "LANE_TO_LANE",
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

function deriveRateCardLane(input: {
  lanes?: string;
  fromLocation?: string;
  toLocation?: string;
}) {
  const explicitLane = input.lanes?.trim();
  if (explicitLane) {
    return explicitLane;
  }
  const from = input.fromLocation?.trim();
  const to = input.toLocation?.trim();
  if (from && to) {
    return `${from}-${to}`.toUpperCase().replace(/\s+/g, "");
  }
  return "";
}

function cloneCustomerForm(form: TenantCustomerInput): TenantCustomerInput {
  return {
    ...form,
    addresses: (form.addresses ?? []).map((address) => normalizeCustomerAddressDraft(address)),
    uomOverrides: (form.uomOverrides ?? []).map((override) => normalizeCustomerUOMOverrideDraft(override)),
    preferredVehicleTypes: [...(form.preferredVehicleTypes ?? [])],
    rateMatchingBasis: form.rateMatchingBasis ?? "LANE_TO_LANE",
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
      lanes: deriveRateCardLane(rateCard),
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
    rateMatchingBasis: form.rateMatchingBasis ?? "LANE_TO_LANE",
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
      rateMatchingBasis: source.rateMatchingBasis ?? "LANE_TO_LANE",
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
}: {
  activeStep: CustomerFlowStep;
  form: TenantCustomerInput;
  onStepChange?: (step: CustomerFlowStep) => void;
}) {
  const progress = normalizeSetupProgress(form.setupProgress);
  const items: Array<{ step: CustomerFlowStep; helper: string; complete: boolean }> = [
    {
      step: "Basic Details",
      helper: "Identity, ownership, tax",
      complete: Boolean(form.name.trim()),
    },
    {
      step: "Addresses",
      helper: "Consignee, consignor, warehouse",
      complete: Boolean(deriveCustomerMasterAddresses(form).length),
    },
    {
      step: "Contacts",
      helper: "Primary, accounts, logistics",
      complete: Boolean(form.primaryContactName?.trim() || progress.contactsCompleted),
    },
    {
      step: "Credit & Billing",
      helper: "Credit, tax, invoicing",
      complete: Boolean(progress.creditBillingCompleted),
    },
    {
      step: "Contracts",
      helper: "Existing contract logic",
      complete: Boolean(progress.contractsCompleted),
    },
    {
      step: "Preferences",
      helper: "Vehicles and booking",
      complete: Boolean(progress.preferencesCompleted),
    },
  ];

  return (
    <div className="grid gap-3 md:grid-cols-6">
      {items.map((item) => (
        <button
          key={item.step}
          type="button"
          onClick={() => onStepChange?.(item.step)}
          className={`rounded-2xl border px-4 py-3 ${
            activeStep === item.step
              ? "border-primary/40 bg-primary/5"
              : item.complete
                ? "border-emerald-300 bg-emerald-50"
                : "border-slate-200 bg-slate-50"
          } ${onStepChange ? "cursor-pointer text-left transition hover:border-primary/30 hover:bg-primary/5" : "cursor-default text-left"}`}
        >
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold">{getCustomerFlowLabel(item.step)}</p>
            <span className="text-xs text-muted-foreground">
              {item.complete ? "Done" : activeStep === item.step ? "Current" : "Pending"}
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{item.helper}</p>
        </button>
      ))}
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
  return (
    <div className="grid gap-6">
      <SectionBlock title="Identity Section">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Customer Name *">
            <Input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
          </Field>
          <Field label="Legal Name" helper="As per GST registration">
            <Input value={form.legalName ?? ""} onChange={(event) => setForm((current) => ({ ...current, legalName: event.target.value }))} />
          </Field>
          <Field label="Tier">
            <Select value={form.tier ?? "Standard"} onChange={(event) => setForm((current) => ({ ...current, tier: event.target.value }))}>
              <option value="Standard">Standard</option>
              <option value="Premium">Premium</option>
              <option value="Enterprise">Enterprise</option>
            </Select>
          </Field>
          <Field label="Status">
            <Select value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as TenantCustomerInput["status"] }))}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </Select>
          </Field>
        </div>
      </SectionBlock>

      <SectionBlock title="Address & Ownership">
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="Billing Address">
            <Textarea value={form.billingAddress ?? ""} onChange={(event) => setForm((current) => ({ ...current, billingAddress: event.target.value }))} className="min-h-[112px]" />
          </Field>
          <Field label="Relationship Manager">
            <Input value={form.relationshipManager ?? ""} onChange={(event) => setForm((current) => ({ ...current, relationshipManager: event.target.value }))} />
          </Field>
          <Field label="Internal Account Owner">
            <Input value={form.internalAccountOwner ?? ""} onChange={(event) => setForm((current) => ({ ...current, internalAccountOwner: event.target.value }))} />
          </Field>
        </div>
      </SectionBlock>

      <SectionBlock title="Tax Information Section">
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
    setDraft(emptyCustomerAddressDraft());
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
    const normalized = normalizeCustomerAddressDraft(
      draft.isTemporary
        ? {
            ...draft,
            type: ["Consignee"],
            operationalAddressType: draft.operationalAddressType ?? "ADDITIONAL",
            name: draft.name?.trim() || `${draft.consigneeName || "Consignee"} Temporary Address`,
            addressLabel: draft.addressLabel?.trim() || "Temporary Address",
          }
        : draft,
    );
    if (!normalized.type.length) {
      setError("Select at least one address type.");
      return;
    }
    if (normalized.type.includes("Consignee") && !normalized.consigneeName?.trim()) {
      setError("Consignee name is required for consignee delivery addresses.");
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
      setError("Contact person name, phone, address line 1, pincode, country, state, and city are required.");
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">Address Section</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Add reusable customer address master entries for booking, LR generation, and billing. Address creation is optional here and can be completed later.
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            You can upload addresses in bulk using Excel. This step can be completed later.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={downloadTemplate}>
            <FileDown className="size-4" />
            Download Template
          </Button>
          <Button size="sm" variant="outline" onClick={openCreate}>
            + Add Address
          </Button>
          <Button size="sm" variant="outline" onClick={() => openCreateForOperationalType("ADDITIONAL")}>
            Add Additional Address
          </Button>
          <Button size="sm" variant="outline" onClick={() => openCreateForOperationalType("EMERGENCY")}>
            Add Emergency Address
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border bg-muted/20 px-4 py-3">
        <p className="text-sm font-medium">{addresses.length} address{addresses.length === 1 ? "" : "es"} configured</p>
        <p className="mt-1 text-xs text-muted-foreground">{primaryCount} primary | {additionalCount} additional | {emergencyCount} emergency</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {temporaryCount} temporary operational address{temporaryCount === 1 ? "" : "es"}
        </p>
      </div>

      {!addresses.length ? (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-4">
          <p className="text-sm font-semibold text-amber-900">Address Pending</p>
          <p className="mt-1 text-sm text-amber-800">
            No reusable customer addresses have been added yet. You can skip this for now and use Add Address later from the customer view.
          </p>
          <div className="mt-3">
            <Button size="sm" onClick={openCreate}>
              Add Address
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid gap-5 xl:grid-cols-[1.05fr_1.25fr]">
          <div className="overflow-hidden rounded-[26px] border bg-background/90 shadow-sm">
            <div className="grid grid-cols-[minmax(0,2.2fr)_minmax(0,1fr)_minmax(0,1.1fr)_auto] gap-4 border-b bg-muted/20 px-5 py-4 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              <span>Consignee</span>
              <span>Primary</span>
              <span>Location</span>
              <span>Addresses</span>
            </div>
            <div className="divide-y">
              {consigneeRows.map((row) => {
                const isSelected = selectedConsigneeKey === row.key;
                const address = row.primaryAddress;
                return (
                  <button
                    key={row.key}
                    type="button"
                    onClick={() => setSelectedAddressId(address.id)}
                    className={`grid w-full grid-cols-[minmax(0,2.2fr)_minmax(0,1fr)_minmax(0,1.1fr)_auto] gap-4 px-5 py-4 text-left transition ${
                      isSelected ? "bg-amber-50/80 ring-1 ring-inset ring-amber-300" : "hover:bg-muted/30"
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-semibold">{address.consigneeName || address.name}</p>
                        {row.temporaryCount ? <Badge variant="warning">{row.temporaryCount} TEMP</Badge> : null}
                      </div>
                      <p className="mt-1 truncate text-xs text-muted-foreground">
                        {address.contactPerson || "No contact"}{address.contactNumber ? ` | ${address.contactNumber}` : ""}
                      </p>
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{address.addressLabel || address.line1}</p>
                      <p className="mt-1 text-xs text-muted-foreground">Primary Address</p>
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm">{address.city}</p>
                      <p className="mt-1 truncate text-xs text-muted-foreground">
                        {[address.state, address.pincode].filter(Boolean).join(" | ")}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge variant={address.isActive === false ? "outline" : "success"}>{address.isActive === false ? "INACTIVE" : "ACTIVE"}</Badge>
                      <span className="text-xs text-muted-foreground">{1 + row.secondaryCount} total</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-[26px] border bg-background/90 px-5 py-5 shadow-sm">
            {selectedPrimaryAddress ? (
              <div className="space-y-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-base font-semibold">{selectedPrimaryAddress.consigneeName || selectedPrimaryAddress.name}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Primary address and temporary addresses remain under the same consignee record.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <Badge variant="success">PRIMARY ADDRESS</Badge>
                    {selectedTemporaryAddresses.length ? <Badge variant="warning">{selectedTemporaryAddresses.length} TEMPORARY</Badge> : null}
                  </div>
                </div>

                <div className="rounded-2xl border bg-muted/20 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Existing Address</p>
                  <p className="mt-1 text-sm font-medium">
                    {selectedPrimaryAddress.fullAddress ||
                      [selectedPrimaryAddress.line1, selectedPrimaryAddress.line2, selectedPrimaryAddress.city, selectedPrimaryAddress.state, selectedPrimaryAddress.pincode]
                        .filter(Boolean)
                        .join(", ")}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {[selectedPrimaryAddress.city, selectedPrimaryAddress.state, selectedPrimaryAddress.pincode].filter(Boolean).join(" | ")}
                  </p>
                  {selectedPrimaryAddress.consigneeId ? (
                    <p className="mt-1 text-xs text-muted-foreground">Consignee ID: {selectedPrimaryAddress.consigneeId}</p>
                  ) : null}
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold">Temporary Address</p>
                      <p className="text-xs text-muted-foreground">Add one more address for the same consignee. Primary address does not change.</p>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => openCreateTemporaryForConsignee(selectedPrimaryAddress)}>
                      + Add Temporary Address
                    </Button>
                  </div>
                  {selectedTemporaryAddresses.length ? (
                    <div className="grid gap-3">
                      {selectedTemporaryAddresses.map((address) => (
                        <button
                          key={address.id}
                          type="button"
                          onClick={() => openEdit(address)}
                          className="rounded-2xl border border-amber-200 bg-amber-50/70 px-4 py-4 text-left transition hover:border-amber-300"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-sm font-semibold">{address.addressLabel || address.name}</p>
                                {address.isTemporary ? <Badge variant="warning">TEMPORARY ADDRESS</Badge> : null}
                              </div>
                              <p className="mt-1 text-sm text-muted-foreground">
                                {address.fullAddress ||
                                  [address.line1, address.line2, address.city, address.state, address.pincode].filter(Boolean).join(", ")}
                              </p>
                              <p className="mt-2 text-xs text-muted-foreground">
                                {[address.city, address.state, address.pincode].filter(Boolean).join(" | ")}
                              </p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <Button size="sm" variant="ghost" onClick={(event) => { event.stopPropagation(); openEdit(address); }}>
                                Edit
                              </Button>
                              <Button size="sm" variant="outline" onClick={(event) => { event.stopPropagation(); deleteDraftAddress(address.id); }}>
                                Delete
                              </Button>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed bg-muted/10 px-4 py-4 text-sm text-muted-foreground">
                      No temporary address added yet for this consignee.
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="ghost" onClick={() => openEdit(selectedPrimaryAddress)}>
                    Edit Primary Address
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      <div className="rounded-2xl border bg-muted/20 p-4">
        <p className="text-sm font-semibold">Bulk Upload</p>
        <div className="mt-4 grid gap-4">
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" onClick={downloadTemplate}>
              <FileDown className="size-4" />
              Download Template
            </Button>
            <label className="inline-flex cursor-pointer items-center rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
              Bulk Upload (Excel)
              <input
                type="file"
                accept=".xlsx,.csv"
                className="hidden"
                onChange={(event) => void handleUpload(event.target.files?.[0] ?? null)}
              />
            </label>
          </div>
          <p className="text-xs text-muted-foreground">
            Accepted formats: `.xlsx`, `.csv`. Mandatory fields, address types, and phone format are validated before import.
          </p>
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

      <Dialog
        open={addressDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            closeAddressDialog();
          }
        }}
        title={editingId ? (draft.isTemporary ? "Edit Temporary Address" : "Edit Address") : (draft.isTemporary ? "Add Temporary Address" : "Add Address")}
        description={draft.isTemporary ? "Temporary operational address editor. This record will appear automatically in destination change review after saving." : "Manage customer address master details in a separate workspace."}
        widthClassName="max-w-6xl"
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
          <div className="grid gap-4 lg:grid-cols-3">
            <Field label="Address Type">
              <Select
                value={draft.type[0] ?? ""}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    type: event.target.value ? [event.target.value as CustomerAddressTag] : [],
                  }))
                }
              >
                <option value="">Select address type</option>
                {customerAddressTagOptions.map((tag) => (
                  <option key={tag} value={tag}>
                    {tag}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Operational Address Type">
              <Select
                value={draft.operationalAddressType ?? "PRIMARY"}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    operationalAddressType: event.target.value as CustomerOperationalAddressType,
                  }))
                }
              >
                {operationalAddressTypeOptions.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Address Status">
              <Select
                value={draft.isActive === false ? "inactive" : "active"}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    isActive: event.target.value === "active",
                  }))
                }
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </Select>
            </Field>
          </div>
          {draft.isTemporary && draft.consigneeName ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50/70 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-900">Temporary Address For</p>
              <p className="mt-1 text-sm font-medium text-amber-950">{draft.consigneeName}</p>
              {draft.consigneeId ? (
                <p className="mt-1 text-xs text-amber-800">Consignee ID: {draft.consigneeId}</p>
              ) : null}
            </div>
          ) : null}
          <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
            {!draft.isTemporary ? (
              <>
                <Field label="Consignee ID">
                  <Input value={draft.consigneeId ?? ""} onChange={(event) => setDraft((current) => ({ ...current, consigneeId: event.target.value }))} placeholder="Auto-generated if blank" />
                </Field>
                <Field label="Consignee Name">
                  <Input value={draft.consigneeName ?? ""} onChange={(event) => setDraft((current) => ({ ...current, consigneeName: event.target.value }))} placeholder="Sharma Traders" />
                </Field>
              </>
            ) : null}
            <Field label="Address Label">
              <Input value={draft.addressLabel ?? ""} onChange={(event) => setDraft((current) => ({ ...current, addressLabel: event.target.value }))} placeholder="Main plant gate / Yard 2 / Emergency yard" />
            </Field>
            <Field label="Contact Code*" helper="Auto-generated as ADDR-0001 if left blank">
              <Input value={draft.contactCode ?? ""} onChange={(event) => setDraft((current) => ({ ...current, contactCode: event.target.value }))} placeholder="Enter or leave blank" />
            </Field>
            <Field label="Contact person name*">
              <Input value={draft.contactPerson ?? ""} onChange={(event) => setDraft((current) => ({ ...current, contactPerson: event.target.value }))} placeholder="Enter" />
            </Field>
            <Field label="Phone*">
              <Input value={draft.contactNumber ?? ""} onChange={(event) => setDraft((current) => ({ ...current, contactNumber: event.target.value }))} placeholder="+91 00000 00000" />
            </Field>
            <Field label="Email ID">
              <Input value={draft.emailId ?? ""} onChange={(event) => setDraft((current) => ({ ...current, emailId: event.target.value }))} placeholder="Enter" />
            </Field>
          </div>
          <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
            <Field label="Address Name">
              <Input value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} placeholder="Bangalore Warehouse" />
            </Field>
            <div className="grid gap-4">
              <Field label="Address Line 1*">
                <Input value={draft.line1} onChange={(event) => setDraft((current) => ({ ...current, line1: event.target.value }))} placeholder="Address" />
              </Field>
              <Field label="Address Line 2">
                <Input value={draft.line2 ?? ""} onChange={(event) => setDraft((current) => ({ ...current, line2: event.target.value }))} />
              </Field>
              <Field label="Full Address">
                <Textarea value={draft.fullAddress ?? ""} onChange={(event) => setDraft((current) => ({ ...current, fullAddress: event.target.value }))} className="min-h-[120px]" placeholder="Operational display address used in review workspaces" />
              </Field>
            </div>
          </div>
          <div className="grid gap-4 lg:grid-cols-4 xl:grid-cols-7">
            <Field label="Pincode*">
              <Input value={draft.pincode} onChange={(event) => setDraft((current) => ({ ...current, pincode: event.target.value }))} />
            </Field>
            <Field label="Country">
              <Input value={draft.country ?? ""} onChange={(event) => setDraft((current) => ({ ...current, country: event.target.value }))} />
            </Field>
            <Field label="State*">
              <Input value={draft.state} onChange={(event) => setDraft((current) => ({ ...current, state: event.target.value }))} />
            </Field>
            <Field label="City*">
              <Input value={draft.city} onChange={(event) => setDraft((current) => ({ ...current, city: event.target.value }))} />
            </Field>
            <Field label="GSTIN">
              <Input value={draft.gstin ?? ""} onChange={(event) => setDraft((current) => ({ ...current, gstin: event.target.value }))} />
            </Field>
            <Field label="Latitude">
              <Input value={draft.latitude != null ? String(draft.latitude) : ""} onChange={(event) => setDraft((current) => ({ ...current, latitude: event.target.value ? Number(event.target.value) : null }))} placeholder="28.4595" />
            </Field>
            <Field label="Longitude">
              <Input value={draft.longitude != null ? String(draft.longitude) : ""} onChange={(event) => setDraft((current) => ({ ...current, longitude: event.target.value ? Number(event.target.value) : null }))} placeholder="77.0266" />
            </Field>
          </div>
          <Field label="Operational Remarks">
            <Textarea value={draft.remarks ?? ""} onChange={(event) => setDraft((current) => ({ ...current, remarks: event.target.value }))} className="min-h-[84px]" placeholder="Emergency unloading, alternate unloading point, rerouting notes, etc." />
          </Field>
          {draft.type.includes("Consignee") ? (
            <div className="flex justify-start">
              <Button variant="outline" onClick={() => openCreateTemporaryForConsignee()}>
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
    <div className="grid gap-6">
      <SectionBlock title="Primary Contact (Mandatory)">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Name *">
            <Input value={form.primaryContactName ?? ""} onChange={(event) => setForm((current) => ({ ...current, primaryContactName: event.target.value }))} />
          </Field>
          <Field label="Email">
            <Input value={form.primaryContactEmail ?? ""} onChange={(event) => setForm((current) => ({ ...current, primaryContactEmail: event.target.value }))} />
          </Field>
          <Field label="Phone">
            <Input value={form.primaryContactPhone ?? ""} onChange={(event) => setForm((current) => ({ ...current, primaryContactPhone: event.target.value }))} />
          </Field>
          <Field label="Designation">
            <Input placeholder="e.g., Logistics Head" value={form.primaryContactDesignation ?? ""} onChange={(event) => setForm((current) => ({ ...current, primaryContactDesignation: event.target.value }))} />
          </Field>
        </div>
      </SectionBlock>

      <SectionBlock title="Accounts Contact (Optional)">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Name">
            <Input value={form.accountsContactName ?? ""} onChange={(event) => setForm((current) => ({ ...current, accountsContactName: event.target.value }))} />
          </Field>
          <Field label="Email">
            <Input value={form.accountsContactEmail ?? ""} onChange={(event) => setForm((current) => ({ ...current, accountsContactEmail: event.target.value }))} />
          </Field>
          <Field label="Phone">
            <Input value={form.accountsContactPhone ?? ""} onChange={(event) => setForm((current) => ({ ...current, accountsContactPhone: event.target.value }))} />
          </Field>
          <Field label="Designation">
            <Input value={form.accountsContactDesignation ?? ""} onChange={(event) => setForm((current) => ({ ...current, accountsContactDesignation: event.target.value }))} />
          </Field>
        </div>
      </SectionBlock>

      <SectionBlock title="Logistics Contact (Optional)">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Name">
            <Input value={form.logisticsContactName ?? ""} onChange={(event) => setForm((current) => ({ ...current, logisticsContactName: event.target.value }))} />
          </Field>
          <Field label="Email">
            <Input value={form.logisticsContactEmail ?? ""} onChange={(event) => setForm((current) => ({ ...current, logisticsContactEmail: event.target.value }))} />
          </Field>
          <Field label="Phone">
            <Input value={form.logisticsContactPhone ?? ""} onChange={(event) => setForm((current) => ({ ...current, logisticsContactPhone: event.target.value }))} />
          </Field>
          <Field label="Designation">
            <Input value={form.logisticsContactDesignation ?? ""} onChange={(event) => setForm((current) => ({ ...current, logisticsContactDesignation: event.target.value }))} />
          </Field>
        </div>
      </SectionBlock>
    </div>
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

  return (
    <div className="grid gap-6">
      <SectionBlock title="Credit Health (Display Section)">
        <div className="grid gap-4 md:grid-cols-2">
          <SummaryCard title={`Outstanding: ${formatCurrency(outstanding)} / ${formatCurrency(creditLimit)}`} helper="Current exposure against configured credit limit" />
          <SummaryCard title={`Utilization % (${utilization.toFixed(1)}%)`} helper="Derived from current outstanding and credit limit" />
        </div>
      </SectionBlock>

      <SectionBlock title="Input Fields">
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="Credit Limit (â‚¹)">
            <Input type="number" value={String(form.creditLimit ?? "")} onChange={(event) => setForm((current) => ({ ...current, creditLimit: Number(event.target.value || 0) }))} />
          </Field>
          <Field label="Credit Days">
            <Input type="number" value={String(form.creditDays ?? "")} onChange={(event) => setForm((current) => ({ ...current, creditDays: Number(event.target.value || 0) }))} />
          </Field>
          <Field label="Current Outstanding (â‚¹)">
            <Input type="number" value={String(form.currentOutstanding ?? "")} onChange={(event) => setForm((current) => ({ ...current, currentOutstanding: Number(event.target.value || 0) }))} />
          </Field>
        </div>
      </SectionBlock>

      <SectionBlock title="Tax & Finance">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="GST Charge Type">
            <Select value={form.gstChargeType ?? "Forward Charge (12% GST on Transport)"} onChange={(event) => setForm((current) => ({ ...current, gstChargeType: event.target.value }))}>
              <option value="Forward Charge (12% GST on Transport)">Forward Charge (12% GST on Transport)</option>
              <option value="Reverse Charge">Reverse Charge</option>
            </Select>
          </Field>
          <Field label="Invoice Format">
            <Input value={form.invoiceFormat ?? ""} onChange={(event) => setForm((current) => ({ ...current, invoiceFormat: event.target.value }))} />
          </Field>
        </div>
        <div className="rounded-2xl border bg-muted/20 p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">TDS Configuration</p>
              <p className="mt-1 text-xs text-muted-foreground">Toggle TDS Applicable</p>
            </div>
            <Switch checked={Boolean(form.tdsApplicable)} onCheckedChange={(checked) => setForm((current) => ({ ...current, tdsApplicable: checked }))} />
          </div>
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

  return (
    <div className="grid gap-6">
      <SectionBlock title="Preferred Vehicle Types (Multi-select)">
        <div className="grid gap-3 md:grid-cols-4">
          {vehicleTypeOptions.map((vehicleType) => (
            <label
              key={vehicleType}
              className={`flex items-start gap-3 rounded-2xl border px-4 py-3 transition ${
                form.preferredVehicleTypes?.includes(vehicleType)
                  ? "border-primary/40 bg-primary/5"
                  : "bg-background/80 hover:border-primary/20"
              }`}
            >
              <input
                type="checkbox"
                checked={form.preferredVehicleTypes?.includes(vehicleType) ?? false}
                onChange={() => toggleVehicle(vehicleType)}
                className="mt-1"
              />
              <span className="text-sm font-medium">{vehicleType}</span>
            </label>
          ))}
        </div>
      </SectionBlock>

      <SectionBlock title="Other Preferences">
        <div className="grid gap-4 md:grid-cols-2">
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
          <Field label="Rate Matching Basis">
            <Select
              value={form.rateMatchingBasis ?? "LANE_TO_LANE"}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  rateMatchingBasis: event.target.value as CustomerRateMatchingBasis,
                }))
              }
            >
              <option value="LANE_TO_LANE">Lane to Lane</option>
              <option value="CITY_TO_CITY">City to City</option>
              <option value="PINCODE_TO_PINCODE">Pincode to Pincode</option>
              <option value="ADDRESS_TO_ADDRESS">Address to Address</option>
            </Select>
          </Field>
        </div>
        <div className="rounded-2xl border bg-muted/20 p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">Allow Auto-Booking (API)</p>
              <p className="mt-1 text-xs text-muted-foreground">Toggle API-driven booking enablement for this customer.</p>
            </div>
            <Switch checked={Boolean(form.allowAutoBooking)} onCheckedChange={(checked) => setForm((current) => ({ ...current, allowAutoBooking: checked }))} />
          </div>
        </div>
      </SectionBlock>

      <SectionBlock title="Customer-wise UOM Mapping">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-muted/20 p-4">
            <div>
              <p className="text-sm font-medium">Customer-specific conversion overrides</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Use this only when the customer conversion differs from the tenant default. Booking will prefer these overrides first.
              </p>
            </div>
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
            <div className="rounded-2xl border bg-background/80 px-4 py-4 text-sm text-muted-foreground">
              No customer-specific overrides configured. Booking will use the global tenant UOM mapping by default.
            </div>
          )}
        </div>
      </SectionBlock>
    </div>
  );
}

function TenantCustomerContractsSection({
  rateCards,
  onCreate,
  onUpdate,
  onDelete,
  onReplaceAll,
  helperNote,
}: {
  rateCards: EditableCustomerRateCard[];
  onCreate: (input: TenantCustomerRateCardInput) => void;
  onUpdate: (rateCardId: string, updates: Partial<TenantCustomerRateCardInput>) => void;
  onDelete: (rateCardId: string) => void;
  onReplaceAll?: (rows: TenantCustomerRateCardInput[]) => void;
  helperNote?: string;
}) {
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

  const filteredRateCards = rateCards.filter((rateCard) => {
    const normalizedSearch = search.trim().toLowerCase();
    if (
      normalizedSearch &&
      !`${deriveRateCardLane(rateCard)} ${rateCard.fromLocation ?? ""} ${rateCard.toLocation ?? ""} ${rateCard.sourcePincode ?? ""} ${rateCard.destinationPincode ?? ""} ${rateCard.vehicleType ?? ""} ${rateCard.remarks ?? ""}`
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
      lanes: deriveRateCardLane(rateCard),
      fromCity: rateCard.fromCity ?? rateCard.fromLocation ?? "",
      toCity: rateCard.toCity ?? rateCard.toLocation ?? "",
      fromLocation: rateCard.fromLocation ?? "",
      toLocation: rateCard.toLocation ?? "",
      sourcePincode: rateCard.sourcePincode,
      destinationPincode: rateCard.destinationPincode,
      rateType: rateCard.rateType,
      vehicleType: rateCard.vehicleType ?? "",
      underloadRate: String(rateCard.underloadRate ?? rateCard.baseRate ?? rateCard.rate),
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
    const parsed = z
      .object({
        lanes: z.string().trim().min(2, "Lane is required."),
        fromCity: z.string().trim().min(2, "From City is required."),
        toCity: z.string().trim().min(2, "To City is required."),
        fromLocation: z.string().trim().min(2, "From Location is required."),
        toLocation: z.string().trim().min(2, "To Location is required."),
        sourcePincode: z.string().trim().refine((value) => !value || /^\d{6}$/.test(value), {
          message: "From Pincode must be a 6-digit number.",
        }),
        destinationPincode: z.string().trim().refine((value) => !value || /^\d{6}$/.test(value), {
          message: "To Pincode must be a 6-digit number.",
        }),
        rateType: z.enum(["PER_KM", "PER_MT", "PER_TRIP"]),
        vehicleType: z.string().trim().min(1, "Vehicle Type is required."),
        underloadRate: z.number().positive("Underload Rate must be greater than zero."),
        overloadRate: z.number().nullable(),
        tat: z.string().optional(),
        effectiveFromDate: z.string().trim().min(1, "Effective From Date is required."),
        effectiveToDate: z.string().trim().min(1, "Effective To Date is required."),
        remarks: z.string().optional(),
        status: z.enum(["active", "inactive"]),
      })
      .superRefine((value, context) => {
        if (value.overloadRate !== null && value.overloadRate <= 0) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Overload Rate must be greater than zero.",
            path: ["overloadRate"],
          });
        }
        const fromDate = new Date(value.effectiveFromDate);
        const toDate = new Date(value.effectiveToDate);
        if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Effective dates must be valid.",
            path: ["effectiveFromDate"],
          });
        } else if (toDate < fromDate) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Effective To Date must be on or after Effective From Date.",
            path: ["effectiveToDate"],
          });
        }
      })
      .safeParse({
        lanes: form.lanes,
        fromCity: form.fromCity,
        toCity: form.toCity,
        fromLocation: form.fromLocation,
        toLocation: form.toLocation,
        sourcePincode: form.sourcePincode,
        destinationPincode: form.destinationPincode,
        rateType: form.rateType,
        vehicleType: form.vehicleType.trim(),
        underloadRate: Number(form.underloadRate),
        overloadRate: form.overloadRate ? Number(form.overloadRate) : null,
        tat: form.tat.trim() || undefined,
        effectiveFromDate: form.effectiveFromDate,
        effectiveToDate: form.effectiveToDate,
        remarks: form.remarks.trim() || undefined,
        status: form.status,
      });

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Fix the rate card form errors.");
      return;
    }

    const payload: TenantCustomerRateCardInput = {
      lanes: parsed.data.lanes,
      fromCity: parsed.data.fromCity,
      toCity: parsed.data.toCity,
      fromLocation: parsed.data.fromLocation,
      toLocation: parsed.data.toLocation,
      sourcePincode: parsed.data.sourcePincode,
      destinationPincode: parsed.data.destinationPincode,
      rateType: parsed.data.rateType,
      vehicleType: parsed.data.vehicleType,
      underloadRate: parsed.data.underloadRate,
      overloadRate: parsed.data.overloadRate,
      tat: parsed.data.tat,
      baseRate: parsed.data.underloadRate,
      rate: parsed.data.underloadRate,
      effectiveFromDate: parsed.data.effectiveFromDate,
      effectiveToDate: parsed.data.effectiveToDate,
      remarks: parsed.data.remarks,
      status: parsed.data.status,
    };

    if (editingRateCard) {
      onUpdate(editingRateCard.id, payload);
    } else {
      onCreate(payload);
    }
    setOpen(false);
  }

  function downloadTemplate() {
    downloadRateCardTemplateWorkbook();
  }

  async function handleUpload(file: File | null) {
    if (!file) {
      return;
    }
    setImporting(true);
    setImportError("");
    try {
      const summary = await parseRateCardFile(file);
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
      <TenantFilterBar
        searchValue={search}
        searchPlaceholder="Search by lane, location, vehicle type, or remarks"
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
          <div className="flex flex-wrap gap-2">
            <Button onClick={openCreate}>Add Rate Manually</Button>
          </div>
        }
      />
      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <SectionBlock title="Rate Card Upload">
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              You can upload via Excel or add manually. This step can be completed later.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button variant="outline" onClick={downloadTemplate}>
                <FileDown className="size-4" />
                Download Template
              </Button>
              <label className="inline-flex cursor-pointer items-center rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
                Upload Rate Card
                <input
                  type="file"
                  accept=".xlsx,.csv"
                  className="hidden"
                  onChange={(event) => void handleUpload(event.target.files?.[0] ?? null)}
                />
              </label>
            </div>
            <p className="text-xs text-muted-foreground">
              Accepted formats: `.xlsx`, `.csv`. Template columns are validated strictly before rows are saved.
            </p>
            {importing ? <p className="text-sm text-muted-foreground">Validating uploaded file...</p> : null}
            {uploadedFileName ? <p className="text-sm font-medium">{uploadedFileName}</p> : null}
            {importError ? (
              <div className="rounded-2xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {importError}
              </div>
            ) : null}
            {importSummary ? (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-emerald-300 bg-emerald-50 p-4">
                  <p className="font-medium text-emerald-900">Valid rows</p>
                  <p className="mt-1 text-sm text-emerald-800">{importSummary.validRows.length} rows ready to import.</p>
                </div>
                <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4">
                  <p className="font-medium text-amber-900">Invalid rows</p>
                  <p className="mt-1 text-sm text-amber-800">{importSummary.invalidRows.length} rows need correction.</p>
                </div>
                {importSummary.invalidRows.length ? (
                  <div className="md:col-span-2 rounded-2xl border border-amber-300 bg-amber-50 p-4">
                    <p className="font-medium text-amber-900">Validation errors</p>
                    <div className="mt-3 space-y-3">
                      {importSummary.invalidRows.slice(0, 5).map((row) => (
                        <div key={`invalid-${row.rowNumber}`} className="rounded-xl border border-amber-200 bg-white/70 px-3 py-3 text-sm text-amber-900">
                          <p className="font-medium">Row {row.rowNumber}</p>
                          <p className="mt-1">{row.errors.join(" ")}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
                <div className="md:col-span-2 flex justify-end">
                  <Button onClick={applyValidRows} disabled={!importSummary.validRows.length}>
                    Import Valid Rows
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        </SectionBlock>
        <SectionBlock title="Rate Card Status">
          <div className="space-y-4">
            <SummaryCard title={`${rateCards.length} row${rateCards.length === 1 ? "" : "s"} configured`} helper="Uploaded and manually added rate card rows" />
            <div className="rounded-2xl border bg-muted/20 p-4">
              <p className="text-sm font-medium">Optional step</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Customer creation is not blocked if you skip rate cards now. You can return later from the customer workspace and add them.
              </p>
            </div>
          </div>
        </SectionBlock>
      </div>
      <DataTable
        title="Rate Card Preview"
        description="Uploaded rows and manual rows are previewed here before downstream booking and billing use them."
        headers={[
          "Lane",
          "From City",
          "To City",
          "From Location",
          "To Location",
          "From Pincode",
          "To Pincode",
          "Vehicle Type",
          "Rate Type",
          "Underload Rate",
          "Overload Rate",
          "TAT",
          "Effective From",
          "Effective To",
          "Remarks",
          "Status",
          "Updated",
          "Actions",
        ]}
        rows={filteredRateCards.map((rateCard) => [
          <div key={`${rateCard.id}-lane`} className="min-w-[180px]">
            <p className="font-medium">{deriveRateCardLane(rateCard) || `${rateCard.fromLocation} -> ${rateCard.toLocation}`}</p>
          </div>,
          rateCard.fromCity || "-",
          rateCard.toCity || "-",
          rateCard.fromLocation || "-",
          rateCard.toLocation || "-",
          rateCard.sourcePincode || "-",
          rateCard.destinationPincode || "-",
          rateCard.vehicleType || "-",
          <Badge key={`${rateCard.id}-type`} variant="outline">{formatRateType(rateCard.rateType)}</Badge>,
          `${(rateCard.underloadRate ?? rateCard.baseRate ?? rateCard.rate).toLocaleString()}`,
          rateCard.overloadRate != null ? String(rateCard.overloadRate) : "-",
          rateCard.tat || rateCard.transitTime || "-",
          rateCard.effectiveFromDate ?? "-",
          rateCard.effectiveToDate ?? "-",
          rateCard.remarks || "-",
          <Badge key={`${rateCard.id}-status`} variant={rateCard.status === "active" ? "success" : "warning"}>{rateCard.status}</Badge>,
          rateCard.updatedAt ? new Date(rateCard.updatedAt).toLocaleDateString() : "-",
          <div key={`${rateCard.id}-actions`} className="flex flex-wrap gap-2">
            <Button size="sm" variant="ghost" onClick={() => openEdit(rateCard)}>Edit</Button>
            <Button size="sm" variant="outline" onClick={() => onDelete(rateCard.id)}>Delete</Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                onUpdate(rateCard.id, {
                  status: rateCard.status === "active" ? "inactive" : "active",
                })
              }
            >
              {rateCard.status === "active" ? "Deactivate" : "Activate"}
            </Button>
          </div>,
        ])}
        emptyMessage="No rate cards added yet. Upload a template or add rows manually."
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
          <Field label="Lane">
            <Input value={form.lanes} onChange={(event) => setForm((current) => ({ ...current, lanes: event.target.value }))} placeholder="BLR-CHE" />
          </Field>
          <Field label="From City">
            <Input value={form.fromCity} onChange={(event) => setForm((current) => ({ ...current, fromCity: event.target.value }))} />
          </Field>
          <Field label="To City">
            <Input value={form.toCity} onChange={(event) => setForm((current) => ({ ...current, toCity: event.target.value }))} />
          </Field>
          <Field label="From Location">
            <Input value={form.fromLocation} onChange={(event) => setForm((current) => ({ ...current, fromLocation: event.target.value }))} />
          </Field>
          <Field label="To Location">
            <Input value={form.toLocation} onChange={(event) => setForm((current) => ({ ...current, toLocation: event.target.value }))} />
          </Field>
          <Field label="From Pincode">
            <Input value={form.sourcePincode} onChange={(event) => setForm((current) => ({ ...current, sourcePincode: event.target.value }))} placeholder="560037" />
          </Field>
          <Field label="To Pincode">
            <Input value={form.destinationPincode} onChange={(event) => setForm((current) => ({ ...current, destinationPincode: event.target.value }))} placeholder="600001" />
          </Field>
          <Field label="Vehicle Type">
            <Input value={form.vehicleType} onChange={(event) => setForm((current) => ({ ...current, vehicleType: event.target.value }))} />
          </Field>
          <Field label="Rate Type">
            <Select value={form.rateType} onChange={(event) => setForm((current) => ({ ...current, rateType: event.target.value as TenantCustomerRateCardInput["rateType"] }))}>
              <option value="PER_KM">Per KM</option>
              <option value="PER_MT">Per MT</option>
              <option value="PER_TRIP">Per Trip</option>
            </Select>
          </Field>
          <Field label="Underload Rate">
            <Input value={form.underloadRate} onChange={(event) => setForm((current) => ({ ...current, underloadRate: event.target.value }))} />
          </Field>
          <Field label="Overload Rate (Optional)">
            <Input value={form.overloadRate} onChange={(event) => setForm((current) => ({ ...current, overloadRate: event.target.value }))} />
          </Field>
          <Field label="TAT (Optional)">
            <Input value={form.tat} onChange={(event) => setForm((current) => ({ ...current, tat: event.target.value }))} />
          </Field>
          <Field label="Effective From Date">
            <Input type="date" value={form.effectiveFromDate} onChange={(event) => setForm((current) => ({ ...current, effectiveFromDate: event.target.value }))} />
          </Field>
          <Field label="Effective To Date">
            <Input type="date" value={form.effectiveToDate} onChange={(event) => setForm((current) => ({ ...current, effectiveToDate: event.target.value }))} />
          </Field>
          <div className="md:col-span-2">
            <Field label="Remarks (Optional)">
              <Textarea value={form.remarks} onChange={(event) => setForm((current) => ({ ...current, remarks: event.target.value }))} className="min-h-[96px]" />
            </Field>
          </div>
          <Field label="Status">
            <Select value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as TenantCustomerRateCardInput["status"] }))}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </Select>
          </Field>
        </div>
      </Dialog>
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


