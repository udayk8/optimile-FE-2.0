import React from 'react';
import { TyreAppProvider, useTyreApp } from '../tyre-intelligence/App';
import { FleetAnalytics } from '../tyre-intelligence/components/FleetAnalytics';

const TyreAnalyticsContent: React.FC = () => {
  const { tyres, inspections, repairs, retreads, setSelectedTyreId } = useTyreApp();

  const handleViewTyre = (tyreId: string) => {
    setSelectedTyreId(tyreId);
  };

  const handleNavigate = (view: string) => {
    console.log('Navigate to:', view);
  };

  return (
    <div className="min-h-screen bg-gray-50">
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

export const TyreAnalyticsPage: React.FC = () => {
  return (
    <TyreAppProvider>
      <TyreAnalyticsContent />
    </TyreAppProvider>
  );
};
