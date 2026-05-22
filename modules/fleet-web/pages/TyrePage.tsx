import React from 'react';
import { useNavigate } from 'react-router-dom';
import { TyreAppProvider, useTyreApp } from '../tyre-intelligence/App';
import { FleetAnalytics } from '../tyre-intelligence/components/FleetAnalytics';

const TyrePageContent: React.FC = () => {
  const navigate = useNavigate();
  const {
    tyres,
    repairs,
    retreads,
    inspections,
  } = useTyreApp();

  const handleViewTyre = (tyreId: string) => {
    navigate(`/fleet/tyres/${tyreId}`);
  };

  const handleNavigate = (view: string) => {
    if (view === 'inventory') navigate('/fleet/tyres/inventory');
    else if (view === 'history') navigate('/fleet/tyres/jobs');
    else navigate(`/fleet/tyres/${view}`);
  };

  return (
    <div className="w-full h-screen">
      <FleetAnalytics
        tyres={tyres}
        repairs={repairs}
        retreads={retreads}
        inspections={inspections}
        onViewTyre={handleViewTyre}
        onNavigate={handleNavigate}
      />
    </div>
  );
};

export const TyrePage: React.FC = () => {
  return (
    <TyreAppProvider>
      <TyrePageContent />
    </TyreAppProvider>
  );
};