import { Inbox } from 'lucide-react';
import { ReactNode } from 'react';

export function EmptyState({ action, description, title }: { action?: ReactNode; description?: string; title: string }) {
  return (
    <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 text-gray-500">
        <Inbox className="h-6 w-6" />
      </div>
      <h3 className="mt-4 text-base font-bold text-text">{title}</h3>
      {description && <p className="mt-2 text-sm text-gray-500">{description}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}
