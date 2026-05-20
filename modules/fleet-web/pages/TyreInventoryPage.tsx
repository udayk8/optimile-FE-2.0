import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TyreAppProvider, useTyreApp } from '../tyre-intelligence/App';
import { TyreInventory } from '../tyre-intelligence/components/TyreInventory';
import { IndentRequestModal } from '../tyre-intelligence/components/IndentRequestModal';

const TyreInventoryContent: React.FC = () => {
    const navigate = useNavigate();
    const {
        tyres,
        vehicles,
        inspections,
        locations,
        currentUser,
        createIndent
    } = useTyreApp();

    const [isIndentModalOpen, setIsIndentModalOpen] = useState(false);

    const handleViewDetails = (tyreId: string) => {
        navigate(`/fleet/tyres/${tyreId}`);
    };

    return (
        <div className="w-full h-screen">
            <TyreInventory
                tyres={tyres}
                locations={locations}
                onViewDetails={handleViewDetails}
                onReceiveRequest={() => console.log('Receive stock request')}
                onTransferRequest={(loc) => console.log('Transfer from:', loc)}
                onSellScrapRequest={(ids) => console.log('Sell scrap:', ids)}
                onIndentRequest={() => setIsIndentModalOpen(true)}
                userRole={currentUser.role}
                vehicles={vehicles}
                inspections={inspections}
            />

            {isIndentModalOpen && (
                <IndentRequestModal
                    onClose={() => setIsIndentModalOpen(false)}
                    onSubmit={(indent: any) => {
                        createIndent(indent);
                        setIsIndentModalOpen(false);
                    }}
                    locations={locations}
                    currentUser={currentUser}
                />
            )}
        </div>
    );
};

export const TyreInventoryPage: React.FC = () => {
    return (
        <TyreAppProvider>
            <TyreInventoryContent />
        </TyreAppProvider>
    );
};
