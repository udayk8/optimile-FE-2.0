import { Loader2 } from 'lucide-react';

export function LoadingState({ label = 'Loading data' }: { label?: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
      <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
      <p className="mt-3 text-sm font-semibold text-gray-600">{label}</p>
    </div>
  );
}
