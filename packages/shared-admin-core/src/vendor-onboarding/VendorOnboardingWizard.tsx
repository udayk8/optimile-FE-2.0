import { useMemo, useState, type ReactNode } from "react";
import {
  Building2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FileBadge2,
  Wallet,
} from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Select } from "@/shared/components/ui/select";
import {
  emptyVendorOnboardingDraft,
  mergeVendorOnboardingDraft,
  type VendorOnboardingDraft,
} from "./types";

export type VendorOnboardingWizardProps = {
  initialDraft?: Partial<VendorOnboardingDraft>;
  onSubmit: (draft: VendorOnboardingDraft) => void;
  onChange?: (draft: VendorOnboardingDraft) => void;
  submitLabel?: string;
  header?: ReactNode;
  extraReviewContent?: ReactNode;
  chrome?: boolean;
  lockCompanyName?: boolean;
  lockPrimaryContactPhone?: boolean;
};

const steps = ["Company", "Coverage", "Bank", "Review"] as const;

export function VendorOnboardingWizard({
  initialDraft,
  onSubmit,
  onChange,
  submitLabel = "Submit for review",
  header,
  extraReviewContent,
  chrome = true,
  lockCompanyName = false,
  lockPrimaryContactPhone = false,
}: VendorOnboardingWizardProps) {
  const [draft, setDraft] = useState<VendorOnboardingDraft>(() => ({
    ...emptyVendorOnboardingDraft,
    ...initialDraft,
    registeredAddress: {
      ...emptyVendorOnboardingDraft.registeredAddress,
      ...initialDraft?.registeredAddress,
    },
    primaryContact: {
      ...emptyVendorOnboardingDraft.primaryContact,
      ...initialDraft?.primaryContact,
    },
  }));
  const [step, setStep] = useState(0);

  const update = (patch: Partial<VendorOnboardingDraft>) => {
    setDraft((current) => {
      const next = mergeVendorOnboardingDraft(current, patch);
      onChange?.(next);
      return next;
    });
  };

  const progress = useMemo(
    () => Math.round(((step + 1) / steps.length) * 100),
    [step],
  );

  const next = () => setStep((s) => Math.min(s + 1, steps.length - 1));
  const back = () => setStep((s) => Math.max(s - 1, 0));
  const finish = () => onSubmit(draft);

  const body = (
    <>
      <div className="mb-6 rounded-full bg-primary/10 p-1">
        <div
          className="h-2 rounded-full bg-primary transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {steps.map((label, index) => (
          <button
            key={label}
            type="button"
            onClick={() => setStep(index)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
              step === index
                ? "bg-primary text-primary-foreground shadow-sm"
                : "border border-border bg-card text-muted-foreground hover:bg-muted hover:text-primary"
            }`}
          >
            {index + 1}. {label}
          </button>
        ))}
      </div>

      <Card className="shadow-sm">
        <CardContent className="p-6 md:p-8">
          {step === 0 && (
            <div className="space-y-5">
              <div className="flex items-center gap-3">
                <Building2 className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-extrabold">Company details</h2>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Trading name">
                  <Input
                    value={draft.companyName}
                    onChange={(e) => update({ companyName: e.target.value })}
                    disabled={lockCompanyName}
                    readOnly={lockCompanyName}
                  />
                </Field>
                <Field label="Legal name">
                  <Input
                    value={draft.legalName}
                    onChange={(e) => update({ legalName: e.target.value })}
                  />
                </Field>
                <Field label="GSTIN">
                  <Input
                    value={draft.gstin}
                    onChange={(e) =>
                      update({ gstin: e.target.value.toUpperCase() })
                    }
                    className="font-mono"
                  />
                </Field>
                <Field label="PAN">
                  <Input
                    value={draft.pan}
                    onChange={(e) =>
                      update({ pan: e.target.value.toUpperCase() })
                    }
                    className="font-mono"
                  />
                </Field>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Contact person">
                  <Input
                    value={draft.primaryContact.name}
                    onChange={(e) =>
                      update({
                        primaryContact: {
                          ...draft.primaryContact,
                          name: e.target.value,
                        },
                      })
                    }
                  />
                </Field>
                <Field label="Phone">
                  <Input
                    value={draft.primaryContact.phone}
                    onChange={(e) =>
                      update({
                        primaryContact: {
                          ...draft.primaryContact,
                          phone: e.target.value,
                        },
                      })
                    }
                    disabled={lockPrimaryContactPhone}
                    readOnly={lockPrimaryContactPhone}
                  />
                </Field>
                <Field label="Email">
                  <Input
                    value={draft.primaryContact.email}
                    onChange={(e) =>
                      update({
                        primaryContact: {
                          ...draft.primaryContact,
                          email: e.target.value,
                        },
                      })
                    }
                  />
                </Field>
              </div>
              <div className="grid gap-4 md:grid-cols-4">
                <Field label="Street">
                  <Input
                    value={draft.registeredAddress.street}
                    onChange={(e) =>
                      update({
                        registeredAddress: {
                          ...draft.registeredAddress,
                          street: e.target.value,
                        },
                      })
                    }
                  />
                </Field>
                <Field label="City">
                  <Input
                    value={draft.registeredAddress.city}
                    onChange={(e) =>
                      update({
                        registeredAddress: {
                          ...draft.registeredAddress,
                          city: e.target.value,
                        },
                      })
                    }
                  />
                </Field>
                <Field label="State">
                  <Input
                    value={draft.registeredAddress.state}
                    onChange={(e) =>
                      update({
                        registeredAddress: {
                          ...draft.registeredAddress,
                          state: e.target.value,
                        },
                      })
                    }
                  />
                </Field>
                <Field label="Pincode">
                  <Input
                    value={draft.registeredAddress.pincode}
                    onChange={(e) =>
                      update({
                        registeredAddress: {
                          ...draft.registeredAddress,
                          pincode: e.target.value,
                        },
                      })
                    }
                  />
                </Field>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-5">
              <div className="flex items-center gap-3">
                <FileBadge2 className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-extrabold">Service coverage</h2>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <Field
                  label="Service regions"
                  helper="Comma-separated (e.g. KA, TN, AP)"
                >
                  <Input
                    value={draft.serviceRegions.join(", ")}
                    onChange={(e) =>
                      update({
                        serviceRegions: e.target.value
                          .split(",")
                          .map((v) => v.trim())
                          .filter(Boolean),
                      })
                    }
                  />
                </Field>
                <Field
                  label="Supported vehicle types"
                  helper="Comma-separated (e.g. LCV, MCV, HCV)"
                >
                  <Input
                    value={draft.supportedVehicleTypes.join(", ")}
                    onChange={(e) =>
                      update({
                        supportedVehicleTypes: e.target.value
                          .split(",")
                          .map((v) => v.trim())
                          .filter(Boolean),
                      })
                    }
                  />
                </Field>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <div className="flex items-center gap-3">
                <Wallet className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-extrabold">Bank details</h2>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Bank name">
                  <Input
                    value={draft.bankName}
                    onChange={(e) => update({ bankName: e.target.value })}
                  />
                </Field>
                <Field label="Branch">
                  <Input
                    value={draft.branch}
                    onChange={(e) => update({ branch: e.target.value })}
                  />
                </Field>
                <Field label="Account number">
                  <Input
                    value={draft.accountNumber}
                    onChange={(e) => update({ accountNumber: e.target.value })}
                    className="font-mono"
                  />
                </Field>
                <Field label="IFSC code">
                  <Input
                    value={draft.ifscCode}
                    onChange={(e) =>
                      update({ ifscCode: e.target.value.toUpperCase() })
                    }
                    className="font-mono"
                  />
                </Field>
                <Field label="Account type">
                  <Select
                    value={draft.accountType}
                    onChange={(e) =>
                      update({
                        accountType: e.target
                          .value as VendorOnboardingDraft["accountType"],
                      })
                    }
                  >
                    <option value="SAVINGS">Savings</option>
                    <option value="CURRENT">Current</option>
                  </Select>
                </Field>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                <h2 className="text-lg font-extrabold">Review and submit</h2>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <ReviewCard label="Company" primary={draft.companyName}>
                  <div className="text-xs text-muted-foreground">Coverage</div>
                  <div className="text-sm">
                    {draft.serviceRegions.join(", ") || "—"}
                  </div>
                </ReviewCard>
                <ReviewCard label="Bank" primary={draft.bankName}>
                  <div className="text-xs text-muted-foreground">Account</div>
                  <div className="font-mono text-sm">
                    ****
                    {draft.accountNumber.slice(-4) || "—"}
                  </div>
                </ReviewCard>
              </div>
              {extraReviewContent}
            </div>
          )}

          <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm text-muted-foreground">
              Step {step + 1} of {steps.length}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={back} disabled={step === 0}>
                <ChevronLeft className="mr-1 h-4 w-4" /> Back
              </Button>
              {step < steps.length - 1 ? (
                <Button onClick={next}>
                  Next <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              ) : (
                <Button onClick={finish}>{submitLabel}</Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );

  if (!chrome) {
    return (
      <div className="space-y-4">
        {header}
        {body}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-4 py-8">
      <div className="mx-auto max-w-5xl">
        {header}
        {body}
      </div>
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
      <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </label>
      {children}
      {helper ? (
        <p className="text-xs text-muted-foreground">{helper}</p>
      ) : null}
    </div>
  );
}

function ReviewCard({
  label,
  primary,
  children,
}: {
  label: string;
  primary: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-xl border bg-muted/30 p-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 text-sm font-bold">{primary || "—"}</div>
      <div className="mt-3 space-y-1">{children}</div>
    </div>
  );
}
