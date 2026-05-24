import { cn } from "@/shared/lib/utils";

export function BookingStepper({
  steps,
  activeStep,
  onChange,
}: {
  steps: string[];
  activeStep: string;
  onChange: (step: string) => void;
}) {
  return (
    <div className="grid gap-3 md:grid-cols-4 xl:grid-cols-8">
      {steps.map((step, index) => (
        <button
          key={step}
          type="button"
          onClick={() => onChange(step)}
          className={cn(
            "rounded-2xl border px-4 py-3 text-left transition",
            activeStep === step
              ? "border-primary/40 bg-primary/5"
              : "border-slate-200 bg-slate-50 hover:border-primary/25 hover:bg-primary/[0.04]",
          )}
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Step {index + 1}
          </p>
          <p className="mt-1 text-sm font-semibold">{step}</p>
        </button>
      ))}
    </div>
  );
}
