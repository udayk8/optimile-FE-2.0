import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { TyreAppProvider, useTyreApp } from '../tyre-intelligence/App';
import { TyreDetail } from '../tyre-intelligence/components/TyreDetail';

const TyreDetailContent: React.FC = () => {
    const { tyreId } = useParams<{ tyreId: string }>();
    const navigate = useNavigate();
    const {
        tyres,
        history,
        inspections,
        defects,
        repairs,
        retreads,
        vendors,
        vehicles,
        currentUser,
        onInspect,
        onSendForRetread,
        onCompleteRetread,
        onRejectRetread,
        onLogRepair,
        onFitTyre,
        onRemoveTyre,
        onScrapTyre,
        onCreateWorkOrder
    } = useTyreApp();

    const tyre = tyres.find(t => t.id === tyreId);

    if (!tyre) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight mb-2">Tyre Not Found</h2>
                    <p className="text-sm text-slate-500 mb-6">ID: {tyreId}</p>
                    <button
                        onClick={() => navigate('/fleet/tyres')}
                        className="px-6 py-3 bg-indigo-600 text-white text-xs font-bold uppercase rounded-xl"
                    >
                        Back to Inventory
                    </button>
                </div>
            </div>
        );
    }

    const tyreHistory = history.filter(h => h.tyreId === tyreId);
    const tyreInspections = inspections.filter(i => i.tyreId === tyreId);
    const tyreDefects = defects.filter(d => d.tyreId === tyreId);
    const tyreRepairs = repairs.filter(r => r.tyreId === tyreId);
    const tyreRetreads = retreads.filter(r => r.tyreId === tyreId);

    return (
        <div className="w-full h-screen overflow-y-auto bg-slate-50">
            <TyreDetail
                tyre={tyre}
                history={tyreHistory}
                inspections={tyreInspections}
                defects={tyreDefects}
                repairs={tyreRepairs}
                retreads={tyreRetreads}
                vendors={vendors}
                vehicles={vehicles}
                userRole={currentUser.role}
                onBack={() => navigate(-1)}
                onFit={onFitTyre}
                onRemove={onRemoveTyre}
                onInspect={onInspect}
                onScrap={onScrapTyre}
                onSendForRetread={onSendForRetread}
                onCompleteRetread={onCompleteRetread}
                onRejectRetread={onRejectRetread}
                onLogRepair={onLogRepair}
                allTyres={tyres}
                onCreateWorkOrder={onCreateWorkOrder}
            />
        </div>
    );
};

export const TyreDetailPage: React.FC = () => {
    return (
        <TyreAppProvider>
            <TyreDetailContent />
        </TyreAppProvider>
    );
};
