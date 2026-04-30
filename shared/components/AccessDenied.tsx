import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldX } from 'lucide-react';

export const AccessDenied: React.FC = () => {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <ShieldX className="h-16 w-16 text-danger mb-4" />
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
      <p className="text-gray-500 mb-6 max-w-md">
        You don't have permission to access this section. Contact your administrator to request access.
      </p>
      <button
        onClick={() => navigate('/')}
        className="px-6 py-2.5 bg-primary text-white rounded-lg font-medium hover:bg-primary/90"
      >
        Go to Dashboard
      </button>
    </div>
  );
};
