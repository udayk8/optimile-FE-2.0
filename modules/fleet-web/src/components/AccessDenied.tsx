import { LockKeyhole } from 'lucide-react';
import { AppPage } from '../app/navigation';
import { Button } from '../components/Button';
import { useFleetAuth } from '@shared-auth';

export function AccessDenied({ onNavigate }: { onNavigate: (page: AppPage) => void }) {
  const { user } = useFleetAuth();

  return (
    <section className="mx-auto mt-16 max-w-xl rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-danger/10 text-danger">
        <LockKeyhole className="h-7 w-7" />
      </div>
      <h1 className="mt-5 text-2xl font-extrabold text-text">Access denied</h1>
      <p className="mt-3 text-sm leading-6 text-gray-600">
        Your current role, {user.role}, does not have permission to open this page.
      </p>
      <Button className="mt-6" onClick={() => onNavigate('dashboard')} variant="primary">
        Go to dashboard
      </Button>
    </section>
  );
}
