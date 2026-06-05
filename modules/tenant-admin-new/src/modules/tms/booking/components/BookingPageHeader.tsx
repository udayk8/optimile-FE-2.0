import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

/**
 * Compact, consistent header shared across the booking flow
 * (Create → Assign → Documents). Replaces the tall workspace hero so the
 * working area starts higher. UI only — no business logic.
 *
 * Typography contract:
 *  - title    24px (text-2xl)
 *  - subtitle 13px
 *  - back     12px
 */
export function BookingPageHeader({
  backTo,
  backLabel = "Back",
  onBack,
  eyebrow,
  title,
  subtitle,
  actions,
  summary,
}: {
  backTo?: string;
  backLabel?: string;
  onBack?: () => void;
  eyebrow?: string;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  summary?: ReactNode;
}) {
  const backInner = (
    <>
      <ArrowLeft className="h-3.5 w-3.5" />
      {backLabel}
    </>
  );
  return (
    <header className="rounded-xl border border-slate-300 bg-gradient-to-r from-slate-100 to-white px-4 py-2.5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          {backTo ? (
            <Link
              to={backTo}
              className="mb-1 inline-flex items-center gap-1 text-[12px] font-medium text-gray-500 transition-colors hover:text-primary"
            >
              {backInner}
            </Link>
          ) : onBack ? (
            <button
              type="button"
              onClick={onBack}
              className="mb-1 inline-flex items-center gap-1 text-[12px] font-medium text-gray-500 transition-colors hover:text-primary"
            >
              {backInner}
            </button>
          ) : null}
          {eyebrow ? (
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-primary">{eyebrow}</p>
          ) : null}
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">{title}</h1>
          {subtitle ? <p className="mt-0.5 text-[13px] leading-snug text-gray-500">{subtitle}</p> : null}
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
      {summary ? <div className="mt-3 border-t border-gray-100 pt-3">{summary}</div> : null}
    </header>
  );
}

/**
 * Compact horizontal key/value strip used for the booking summary row on the
 * Assign and Documents pages (Booking No | Customer | Route | Freight | Status).
 */
export function BookingSummaryStrip({ items }: { items: Array<{ label: string; value: ReactNode }> }) {
  return (
    <dl className="flex flex-wrap items-center gap-x-6 gap-y-2">
      {items.map((item, index) => (
        <div key={index} className="flex min-w-0 flex-col">
          <dt className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">{item.label}</dt>
          <dd className="truncate text-[13px] font-semibold text-gray-900">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
