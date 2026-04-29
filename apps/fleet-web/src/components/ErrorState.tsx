import { AlertTriangle } from 'lucide-react';

export function ErrorState({ message, title = 'Something went wrong' }: { message?: string; title?: string }) {
  return (
    <div className="rounded-xl border border-danger/20 bg-danger/10 p-5">
      <div className="flex gap-3">
        <AlertTriangle className="h-5 w-5 shrink-0 text-danger" />
        <div>
          <p className="font-bold text-danger">{title}</p>
          {message && <p className="mt-1 text-sm text-danger">{message}</p>}
        </div>
      </div>
    </div>
  );
}
