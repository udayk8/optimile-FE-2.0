import type { ReactNode } from "react";

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="workspace-hero flex flex-col gap-4 px-6 py-6 lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-primary">{eyebrow}</p>
        <h1 className="mt-2 text-[2rem] font-semibold tracking-[-0.04em] text-slate-950">{title}</h1>
        <p className="mt-2 max-w-3xl text-[14px] leading-7 text-slate-600">{description}</p>
      </div>
      {action ? <div className="shrink-0 self-start lg:self-end">{action}</div> : null}
    </div>
  );
}
