import React from 'react';
import { TyreAppProvider, useTyreApp } from '../tyre-intelligence/App';
import { VehicleMaster } from '../tyre-intelligence/components/VehicleMaster';
import { VehicleType } from '../tyre-intelligence/types';

const VehicleMasterContent: React.FC = () => {
    const { vehicleTypes, setVehicleTypes } = useTyreApp();

    const handleAddType = (type: VehicleType) => {
        setVehicleTypes(prev => [...prev, type]);
    };

    const handleDeleteType = (id: string) => {
        setVehicleTypes(prev => prev.filter(t => t.id !== id));
    };

    return (
        <VehicleMaster
            vehicleTypes={vehicleTypes}
            onAddType={handleAddType}
            onDeleteType={handleDeleteType}
        />
    );
};

export const VehicleMasterPage: React.FC = () => {
    return (
        <TyreAppProvider>
            <VehicleMasterContent />
        </TyreAppProvider>
    );
};
