import React, { useState, useEffect } from 'react';
import { ReconciliationRecord, ReconciliationStatus, Vehicle } from '../types';
import { ReconciliationAPI, VehicleAPI, HumanReviewAPI } from '../services/mockDatabase';
import { Button, Badge, Modal, Input } from '../components/UI';
import { IconClipboardCheck, IconCheck, IconAlert } from '../components/Icons';

export const ReconciliationPage: React.FC = () => {
    const [records, setRecords] = useState<ReconciliationRecord[]>([]);
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedRecord, setSelectedRecord] = useState<ReconciliationRecord | null>(null);
    const [notes, setNotes] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setIsLoading(true);
        const [r, v] = await Promise.all([ReconciliationAPI.getAll(), VehicleAPI.getAll()]);
        setRecords(r);
        setVehicles(v);
        setIsLoading(false);
    };

    const getVehicleReg = (id: string) => vehicles.find(v => v.vehicle_id === id)?.registration_number || id;

    const handleOpenReview = (record: ReconciliationRecord) => {
        setSelectedRecord(record);
        setNotes(record.notes || '');
    };

    const handleReconcile = async () => {
        if (!selectedRecord) return;
        setIsSubmitting(true);
        try {
            await ReconciliationAPI.updateStatus(selectedRecord.reconciliation_id, ReconciliationStatus.RECONCILED, notes);
            await HumanReviewAPI.logAction({
                entity_type: 'Reconciliation',
                entity_id: selectedRecord.reconciliation_id,
                action_type: 'Reconcile',
                reason: 'Manual review completed',
                user_id: 'current_user'
            });
            setIsSubmitting(false);
            setSelectedRecord(null);
            loadData();
        } catch (error) {
            console.error(error);
            setIsSubmitting(false);
        }
    };

    return (
        <div>
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Cost Reconciliation</h1>
                <p className="text-gray-500 mt-1">Review operational costs before final posting to TMS Ledger.</p>
            </div>

            <div className="grid grid-cols-1 gap-6">
                {records.map(record => (
                    <div key={record.reconciliation_id} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between">
                        <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                                <h3 className="text-lg font-medium text-gray-900">{getVehicleReg(record.vehicle_id)}</h3>
                                <Badge color={record.status === 'Reconciled' ? 'green' : record.status === 'Reviewed' ? 'yellow' : 'blue'}>
                                    {record.status}
                                </Badge>
                                {record.confidence_score === 'Low' && <Badge color="red">Low Confidence</Badge>}
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm text-gray-600 mt-3">
                                <div>
                                    <span className="block text-xs text-gray-400 uppercase">Period</span>
                                    <span className="font-medium">{record.period_start} - {record.period_end.slice(8)}</span>
                                </div>
                                <div>
                                    <span className="block text-xs text-gray-400 uppercase">Total Events</span>
                                    <span className="font-medium">{record.total_cost_events}</span>
                                </div>
                                <div>
                                    <span className="block text-xs text-gray-400 uppercase">Est. Events</span>
                                    <span className="font-medium">{record.estimated_events_count}</span>
                                </div>
                                <div>
                                    <span className="block text-xs text-gray-400 uppercase">Variance</span>
                                    <span className={`font-medium ${record.variance_amount > 1000 ? 'text-red-600' : 'text-green-600'}`}>
                                        ₹{record.variance_amount.toLocaleString()}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div className="mt-4 sm:mt-0 sm:ml-6 flex items-center space-x-3">
                            {record.status !== ReconciliationStatus.RECONCILED ? (
                                <Button onClick={() => handleOpenReview(record)}>Review & Reconcile</Button>
                            ) : (
                                <div className="text-right">
                                    <div className="text-xs text-gray-500">Reconciled by {record.reconciled_by}</div>
                                    <div className="text-xs text-gray-400">{new Date(record.reconciled_at!).toLocaleDateString()}</div>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            <Modal 
                isOpen={!!selectedRecord} 
                onClose={() => setSelectedRecord(null)} 
                title="Review Reconciliation"
            >
                {selectedRecord && (
                    <div className="space-y-4">
                        <div className="bg-gray-50 p-4 rounded-md text-sm text-gray-700">
                            <p className="mb-2"><strong>Vehicle:</strong> {getVehicleReg(selectedRecord.vehicle_id)}</p>
                            <p className="mb-2"><strong>Variance:</strong> ₹{selectedRecord.variance_amount}</p>
                            {selectedRecord.estimated_events_count > 0 && (
                                <div className="flex items-start text-yellow-700 bg-yellow-50 p-2 rounded mt-2">
                                    <IconAlert className="w-4 h-4 mr-2 mt-0.5" />
                                    <span>Contains {selectedRecord.estimated_events_count} estimated cost events. Please verify estimates before approval.</span>
                                </div>
                            )}
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Reconciliation Notes</label>
                            <textarea 
                                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm p-2 border"
                                rows={3}
                                value={notes}
                                onChange={e => setNotes(e.target.value)}
                                placeholder="Enter reason for variance or approval notes..."
                            />
                        </div>

                        <div className="flex justify-end space-x-3 mt-6">
                            <Button variant="secondary" onClick={() => setSelectedRecord(null)}>Cancel</Button>
                            <Button onClick={handleReconcile} isLoading={isSubmitting}>
                                <IconClipboardCheck className="w-4 h-4 mr-2" />
                                Mark as Reconciled
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};