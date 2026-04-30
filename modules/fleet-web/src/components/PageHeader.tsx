import { ReactNode } from 'react';

interface PageHeaderProps {
  actions?: ReactNode;
  eyebrow?: string;
  subtitle?: string;
  title: string;
}

export function PageHeader({ actions, eyebrow = 'Optimile Fleet', subtitle, title }: PageHeaderProps) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-wide text-accent">{eyebrow}</p>
          <h1 className="mt-1 text-2xl font-extrabold text-text">{title}</h1>
          {subtitle && <p className="mt-2 max-w-4xl text-sm text-gray-600">{subtitle}</p>}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
    </section>
  );
}
