import React, { useState, useEffect } from 'react';
import { VehicleDocument, DocumentStatus, Vehicle } from '../types';
import { ComplianceAPI, VehicleAPI } from '../services/mockDatabase';
import { IconFile, IconAlert, IconCheck, IconSearch, IconArrowRight } from '../components/Icons';
import { Badge } from '../components/UI';

export const CompliancePage: React.FC = () => {
    const [documents, setDocuments] = useState<VehicleDocument[]>([]);
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filter, setFilter] = useState<'ALL' | 'EXPIRED' | 'WARNING'>('ALL');

    // Update document modal state
    const [updateDoc, setUpdateDoc] = useState<VehicleDocument | null>(null);
    const [newDocNumber, setNewDocNumber] = useState('');
    const [newExpiryDate, setNewExpiryDate] = useState('');
    const [newDocFile, setNewDocFile] = useState('');

    const handleOpenUpdate = (doc: VehicleDocument) => {
        setUpdateDoc(doc);
        setNewDocNumber(doc.document_number);
        setNewExpiryDate(doc.expiry_date);
        setNewDocFile('');
    };

    const handleSubmitUpdate = () => {
        if (!updateDoc) return;
        const today = new Date();
        const expiry = new Date(newExpiryDate);
        const daysLeft = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        const newStatus = daysLeft < 0 ? DocumentStatus.EXPIRED : daysLeft < 30 ? DocumentStatus.EXPIRING_SOON : DocumentStatus.VALID;
        setDocuments(prev => prev.map(d =>
            d.document_id === updateDoc.document_id
                ? { ...d, document_number: newDocNumber, expiry_date: newExpiryDate, status: newStatus }
                : d
        ));
        setUpdateDoc(null);
    };

    useEffect(() => {
        const load = async () => {
            setIsLoading(true);
            const [d, v] = await Promise.all([ComplianceAPI.getAllDocuments(), VehicleAPI.getAll()]);
            setDocuments(d);
            setVehicles(v);
            setIsLoading(false);
        };
        load();
    }, []);

    const getVehicleReg = (id: string) => vehicles.find(v => v.vehicle_id === id)?.registration_number || id;

    const stats = {
        total: documents.length,
        expired: documents.filter(d => d.status === DocumentStatus.EXPIRED).length,
        warning: documents.filter(d => d.status === DocumentStatus.EXPIRING_SOON).length,
        valid: documents.filter(d => d.status === DocumentStatus.VALID).length
    };

    const filteredDocs = documents.filter(d => {
        if (filter === 'EXPIRED') return d.status === DocumentStatus.EXPIRED;
        if (filter === 'WARNING') return d.status === DocumentStatus.EXPIRING_SOON;
        return true;
    });

    const getDaysRemaining = (dateStr: string) => {
        const today = new Date();
        const expiry = new Date(dateStr);
        const diffTime = expiry.getTime() - today.getTime();
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
    };

    return (
        <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-6">Compliance & Documentation</h1>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <div 
                    onClick={() => setFilter('ALL')}
                    className={`bg-white p-4 rounded-lg shadow border cursor-pointer transition-all ${filter === 'ALL' ? 'ring-2 ring-primary-500' : 'border-gray-200'}`}
                >
                    <div className="text-sm font-medium text-gray-500">Total Documents</div>
                    <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
                </div>
                <div 
                    onClick={() => setFilter('EXPIRED')}
                    className={`bg-red-50 p-4 rounded-lg shadow border cursor-pointer transition-all ${filter === 'EXPIRED' ? 'ring-2 ring-red-500' : 'border-red-100'}`}
                >
                    <div className="text-sm font-medium text-red-600 flex items-center"><IconAlert className="w-4 h-4 mr-1"/> Expired</div>
                    <div className="text-2xl font-bold text-red-900">{stats.expired}</div>
                </div>
                <div 
                    onClick={() => setFilter('WARNING')}
                    className={`bg-yellow-50 p-4 rounded-lg shadow border cursor-pointer transition-all ${filter === 'WARNING' ? 'ring-2 ring-yellow-500' : 'border-yellow-100'}`}
                >
                    <div className="text-sm font-medium text-yellow-600">Expiring Soon</div>
                    <div className="text-2xl font-bold text-yellow-900">{stats.warning}</div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg shadow border border-green-100">
                    <div className="text-sm font-medium text-green-600">Valid</div>
                    <div className="text-2xl font-bold text-green-900">{stats.valid}</div>
                </div>
            </div>

            {/* Document List */}
            <div className="bg-white shadow rounded-lg border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                    <h3 className="text-lg font-medium text-gray-900">Vehicle Compliance Status</h3>
                    <div className="text-sm text-gray-500">Showing {filteredDocs.length} documents</div>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-white">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vehicle</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Document</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expiry</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredDocs.map(doc => {
                                const days = getDaysRemaining(doc.expiry_date);
                                return (
                                    <tr key={doc.document_id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{getVehicleReg(doc.vehicle_id)}</td>
                                        <td className="px-6 py-4 text-sm text-gray-500">
                                            <div className="flex items-center">
                                                <IconFile className="w-4 h-4 mr-2 text-gray-400" />
                                                <div className="flex flex-col">
                                                    <span>{doc.document_type}</span>
                                                    <span className="text-xs text-gray-400">{doc.document_number}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm text-gray-900">{doc.expiry_date}</div>
                                            <div className={`text-xs ${days < 0 ? 'text-red-600' : days < 30 ? 'text-yellow-600' : 'text-green-600'}`}>
                                                {days < 0 ? `${Math.abs(days)} days overdue` : `${days} days left`}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <Badge color={doc.status === DocumentStatus.VALID ? 'green' : doc.status === DocumentStatus.EXPIRED ? 'red' : 'yellow'}>
                                                {doc.status}
                                            </Badge>
                                        </td>
                                        <td className="px-6 py-4 text-right text-sm font-medium">
                                            <button onClick={() => handleOpenUpdate(doc)} className="text-primary-600 hover:text-primary-900 flex items-center justify-end w-full">
                                                Update
                                                <IconArrowRight className="w-3 h-3 ml-1" />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    {filteredDocs.length === 0 && <div className="p-8 text-center text-gray-500">No documents found matching filter.</div>}
                </div>
            </div>

            {/* Update Document Modal */}
            {updateDoc && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col max-h-[90vh]">
                        {/* Modal Header */}
                        <div className="flex justify-between items-center px-8 pt-8 pb-4 shrink-0">
                            <div>
                                <h2 className="text-lg font-bold text-gray-900">Update Document</h2>
                                <p className="text-sm text-gray-500 mt-0.5">{updateDoc.document_type} · {getVehicleReg(updateDoc.vehicle_id)}</p>
                            </div>
                            <button onClick={() => setUpdateDoc(null)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 text-sm">✕</button>
                        </div>
                        {/* Modal Body */}
                        <div className="overflow-y-auto px-8 pb-2 space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Document Number</label>
                                <input
                                    type="text"
                                    value={newDocNumber}
                                    onChange={e => setNewDocNumber(e.target.value)}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">New Expiry Date</label>
                                <input
                                    type="date"
                                    value={newExpiryDate}
                                    onChange={e => setNewExpiryDate(e.target.value)}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Upload Document (optional)</label>
                                <input
                                    type="file"
                                    accept=".pdf,.jpg,.jpeg,.png"
                                    onChange={e => setNewDocFile(e.target.files?.[0]?.name || '')}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                                />
                                {newDocFile && <p className="text-xs text-green-600 mt-1">Selected: {newDocFile}</p>}
                            </div>
                        </div>
                        {/* Modal Footer — always visible */}
                        <div className="flex gap-3 px-8 py-6 shrink-0 border-t border-gray-100 mt-2">
                            <button
                                onClick={() => setUpdateDoc(null)}
                                className="flex-1 py-2.5 border border-gray-300 bg-white text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSubmitUpdate}
                                disabled={!newDocNumber || !newExpiryDate}
                                className="flex-1 py-2.5 rounded-lg bg-primary-600 text-sm font-medium text-white shadow-sm transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:bg-primary-300"
                            >
                                Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
