import { ReactNode } from 'react';

export function InfoGrid({ children, columns = 'sm:grid-cols-2 xl:grid-cols-4' }: { children: ReactNode; columns?: string }) {
  return <dl className={`grid gap-4 ${columns}`}>{children}</dl>;
}

export function InfoItem({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</dt>
      <dd className="mt-1 text-sm font-bold text-text">{value}</dd>
    </div>
  );
}
