import React, { useState, useEffect } from 'react';
import { OpsException, ExceptionStatus, ExceptionSeverity, Vehicle, Driver } from '../types';
import { ExceptionAPI, VehicleAPI, DriverAPI } from '../services/mockDatabase';
import { IconBell, IconCheck, IconFilter, IconArrowRight, IconAlert, IconUsers, IconClock, IconShield, IconFuel, IconWrench, IconTyre, IconClipboardCheck } from '../components/Icons';
import { Badge, Button, Modal, Input, Select } from '../components/UI';

export const ExceptionCenterPage: React.FC = () => {
    const [exceptions, setExceptions] = useState<OpsException[]>([]);
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [drivers, setDrivers] = useState<Driver[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    
    // Filters
    const [statusFilter, setStatusFilter] = useState<string>('Open'); // Default to Actionable items
    const [severityFilter, setSeverityFilter] = useState<string>('');

    // Modal
    const [selectedException, setSelectedException] = useState<OpsException | null>(null);
    const [isActioning, setIsActioning] = useState(false);
    
    // Resolution Form
    const [resolutionNote, setResolutionNote] = useState('');
    const [assignee, setAssignee] = useState('');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setIsLoading(true);
        const [e, v, d] = await Promise.all([
            ExceptionAPI.getAll(),
            VehicleAPI.getAll(),
            DriverAPI.getAll()
        ]);
        setExceptions(e);
        setVehicles(v);
        setDrivers(d);
        setIsLoading(false);
    };

    const getEntityName = (type: string, id: string) => {
        if (type === 'Vehicle') return vehicles.find(v => v.vehicle_id === id)?.registration_number || id;
        if (type === 'Driver') return drivers.find(d => d.driver_id === id)?.name || id;
        return id;
    };

    const handleUpdateStatus = async (id: string, status: ExceptionStatus, note?: string, owner?: string) => {
        setIsActioning(true);
        try {
            await ExceptionAPI.updateStatus(id, status, note);
            if (owner && status === ExceptionStatus.OPEN) {
                 await ExceptionAPI.assignOwner(id, owner);
            }
            setSelectedException(null);
            setResolutionNote('');
            setAssignee('');
            loadData();
        } catch (error) {
            console.error(error);
        } finally {
            setIsActioning(false);
        }
    };

    const handleQuickAssign = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        const owner = prompt("Enter owner name to assign:");
        if (owner) {
            await ExceptionAPI.assignOwner(id, owner);
            loadData();
        }
    };

    // --- 1. Priority Sorting Logic ---
    // Rule: Severity (Critical > High > Medium) -> Age (Oldest First)
    const severityRank = {
        [ExceptionSeverity.CRITICAL]: 0,
        [ExceptionSeverity.HIGH]: 1,
        [ExceptionSeverity.MEDIUM]: 2,
        [ExceptionSeverity.LOW]: 3
    };

    const sortedExceptions = [...exceptions].sort((a, b) => {
        // 1. Severity
        const sRankA = severityRank[a.severity] ?? 99;
        const sRankB = severityRank[b.severity] ?? 99;
        if (sRankA !== sRankB) return sRankA - sRankB;

        // 2. Age (Oldest first means smaller timestamp first)
        return new Date(a.detected_at).getTime() - new Date(b.detected_at).getTime();
    });

    const filteredExceptions = sortedExceptions.filter(e => {
        const matchesStatus = statusFilter ? (statusFilter === 'Open' ? (e.status === ExceptionStatus.OPEN || e.status === ExceptionStatus.ACKNOWLEDGED) : e.status === statusFilter) : true;
        const matchesSeverity = severityFilter ? e.severity === severityFilter : true;
        return matchesStatus && matchesSeverity;
    });

    // --- 2. Distribution Stats ---
    const stats = {
        critical: exceptions.filter(e => e.status !== ExceptionStatus.RESOLVED && e.severity === ExceptionSeverity.CRITICAL).length,
        unassigned: exceptions.filter(e => e.status !== ExceptionStatus.RESOLVED && !e.owner_id).length,
        aging24h: exceptions.filter(e => e.status !== ExceptionStatus.RESOLVED && (e.age_hours || 0) > 24).length,
        sourceBreakdown: {
            Fuel: exceptions.filter(e => e.status !== ExceptionStatus.RESOLVED && e.source_module === 'Fuel').length,
            Maintenance: exceptions.filter(e => e.status !== ExceptionStatus.RESOLVED && e.source_module === 'Maintenance').length,
            Compliance: exceptions.filter(e => e.status !== ExceptionStatus.RESOLVED && e.source_module === 'Compliance').length,
            Other: exceptions.filter(e => e.status !== ExceptionStatus.RESOLVED && !['Fuel', 'Maintenance', 'Compliance'].includes(e.source_module)).length
        }
    };

    const getSeverityStyles = (sev: ExceptionSeverity) => {
        switch(sev) {
            case ExceptionSeverity.CRITICAL: return { border: 'border-l-red-600', badge: 'bg-red-100 text-red-800', bg: 'bg-red-50' };
            case ExceptionSeverity.HIGH: return { border: 'border-l-orange-500', badge: 'bg-orange-100 text-orange-800', bg: 'bg-orange-50' };
            case ExceptionSeverity.MEDIUM: return { border: 'border-l-yellow-500', badge: 'bg-yellow-100 text-yellow-800', bg: 'bg-yellow-50' };
            case ExceptionSeverity.LOW: return { border: 'border-l-blue-500', badge: 'bg-blue-100 text-blue-800', bg: 'bg-blue-50' };
            default: return { border: 'border-l-gray-300', badge: 'bg-gray-100 text-gray-800', bg: 'bg-gray-50' };
        }
    };

    const getSourceIcon = (source: string) => {
        switch(source) {
            case 'Fuel': return <IconFuel className="w-4 h-4" />;
            case 'Maintenance': return <IconWrench className="w-4 h-4" />;
            case 'Compliance': return <IconShield className="w-4 h-4" />;
            case 'Tyre': return <IconTyre className="w-4 h-4" />;
            default: return <IconAlert className="w-4 h-4" />;
        }
    };

    if (isLoading) return <div className="p-8 text-center text-gray-500">Loading Exception Priorities...</div>;

    return (
        <div>
            <div className="flex justify-between items-end mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Ops Priority Panel</h1>
                    <p className="text-sm text-gray-500 mt-1">Act on critical exceptions. Oldest high-severity issues first.</p>
                </div>
                <div className="flex space-x-2">
                    <Select 
                        label=""
                        className="w-40"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        options={[
                            { label: 'Actionable (Open)', value: 'Open' },
                            { label: 'Resolved', value: 'Resolved' },
                            { label: 'All', value: '' }
                        ]}
                    />
                </div>
            </div>

            {/* 2. Exception Distribution View */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-white p-4 rounded-lg shadow-sm border border-red-100 relative overflow-hidden">
                    <div className="absolute right-0 top-0 p-3 opacity-10"><IconAlert className="w-16 h-16 text-red-600" /></div>
                    <div className="text-sm font-medium text-gray-500 uppercase">Critical Issues</div>
                    <div className="text-3xl font-bold text-red-600 mt-1">{stats.critical}</div>
                    <div className="text-xs text-red-500 mt-1 font-medium">Requires immediate action</div>
                </div>

                <div className="bg-white p-4 rounded-lg shadow-sm border border-orange-100 relative overflow-hidden">
                    <div className="absolute right-0 top-0 p-3 opacity-10"><IconClock className="w-16 h-16 text-orange-600" /></div>
                    <div className="text-sm font-medium text-gray-500 uppercase">Aging (&gt;24h)</div>
                    <div className="text-3xl font-bold text-orange-600 mt-1">{stats.aging24h}</div>
                    <div className="text-xs text-orange-500 mt-1 font-medium">Risk of SLA Breach</div>
                </div>

                <div className="bg-white p-4 rounded-lg shadow-sm border border-blue-100 relative overflow-hidden">
                    <div className="absolute right-0 top-0 p-3 opacity-10"><IconUsers className="w-16 h-16 text-blue-600" /></div>
                    <div className="text-sm font-medium text-gray-500 uppercase">Unassigned</div>
                    <div className="text-3xl font-bold text-blue-600 mt-1">{stats.unassigned}</div>
                    <div className="text-xs text-blue-500 mt-1 font-medium">Needs Ownership</div>
                </div>

                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                    <div className="text-sm font-medium text-gray-500 uppercase mb-3">Systemic Sources</div>
                    <div className="space-y-2">
                        <div className="flex justify-between text-xs items-center">
                            <span className="flex items-center text-gray-600"><IconFuel className="w-3 h-3 mr-1"/> Fuel</span>
                            <span className="font-bold bg-gray-100 px-2 py-0.5 rounded">{stats.sourceBreakdown.Fuel}</span>
                        </div>
                        <div className="flex justify-between text-xs items-center">
                            <span className="flex items-center text-gray-600"><IconWrench className="w-3 h-3 mr-1"/> Maint.</span>
                            <span className="font-bold bg-gray-100 px-2 py-0.5 rounded">{stats.sourceBreakdown.Maintenance}</span>
                        </div>
                        <div className="flex justify-between text-xs items-center">
                            <span className="flex items-center text-gray-600"><IconShield className="w-3 h-3 mr-1"/> Compl.</span>
                            <span className="font-bold bg-gray-100 px-2 py-0.5 rounded">{stats.sourceBreakdown.Compliance}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* 1. Priority Exception List */}
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                <IconClipboardCheck className="w-5 h-5 mr-2 text-gray-500" />
                Priority Worklist
                <span className="ml-2 bg-gray-100 text-gray-600 text-xs font-medium px-2.5 py-0.5 rounded-full">{filteredExceptions.length} Items</span>
            </h2>

            <div className="space-y-3">
                {filteredExceptions.length === 0 ? (
                    <div className="text-center p-12 bg-white rounded-lg border border-dashed border-gray-300">
                        <IconCheck className="w-12 h-12 text-green-400 mx-auto mb-3" />
                        <h3 className="text-lg font-medium text-gray-900">All Clear!</h3>
                        <p className="text-gray-500">No active exceptions matching your filters.</p>
                    </div>
                ) : (
                    filteredExceptions.map(exception => {
                        const styles = getSeverityStyles(exception.severity);
                        return (
                            <div 
                                key={exception.exception_id} 
                                className={`bg-white rounded-lg shadow-sm border border-gray-200 border-l-4 ${styles.border} p-4 hover:shadow-md transition-shadow cursor-pointer`}
                                onClick={() => {
                                    setSelectedException(exception);
                                    setAssignee(exception.owner_id || '');
                                    setResolutionNote(exception.resolution_notes || '');
                                }}
                            >
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    {/* Left: Info */}
                                    <div className="flex items-start space-x-4 flex-1">
                                        <div className={`p-2 rounded-full flex-shrink-0 ${styles.bg}`}>
                                            {getSourceIcon(exception.source_module)}
                                        </div>
                                        <div>
                                            <div className="flex items-center flex-wrap gap-2">
                                                <h3 className="text-base font-bold text-gray-900">{exception.exception_type}</h3>
                                                <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${styles.badge}`}>
                                                    {exception.severity}
                                                </span>
                                                {(exception.age_hours || 0) > 24 && (
                                                    <span className="px-2 py-0.5 rounded text-xs font-bold bg-red-50 text-red-600 border border-red-100 flex items-center">
                                                        <IconClock className="w-3 h-3 mr-1" />
                                                        {Math.floor((exception.age_hours || 0)/24)}d Overdue
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-sm text-gray-600 mt-1">{exception.description}</p>
                                            <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                                                <span className="font-medium text-gray-900 bg-gray-100 px-2 py-0.5 rounded">
                                                    {getEntityName(exception.entity_type, exception.entity_id)}
                                                </span>
                                                <span className="flex items-center">
                                                    <IconClock className="w-3 h-3 mr-1" />
                                                    Detected: {new Date(exception.detected_at).toLocaleString()}
                                                </span>
                                                {exception.owner_id ? (
                                                    <span className="flex items-center text-blue-600">
                                                        <IconUsers className="w-3 h-3 mr-1" />
                                                        {exception.owner_id}
                                                    </span>
                                                ) : (
                                                    <span className="flex items-center text-orange-500 font-bold">
                                                        <IconUsers className="w-3 h-3 mr-1" />
                                                        Unassigned
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right: Quick Actions */}
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        {!exception.owner_id && (
                                            <Button 
                                                size="sm" 
                                                variant="secondary"
                                                onClick={(e) => handleQuickAssign(e, exception.exception_id)}
                                            >
                                                Assign
                                            </Button>
                                        )}
                                        {exception.status === ExceptionStatus.OPEN && (
                                            <Button 
                                                size="sm" 
                                                variant="secondary" 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleUpdateStatus(exception.exception_id, ExceptionStatus.ACKNOWLEDGED);
                                                }}
                                            >
                                                Ack
                                            </Button>
                                        )}
                                        <button className="text-gray-400 hover:text-gray-600">
                                            <IconArrowRight className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Detail Modal */}
            <Modal 
                isOpen={!!selectedException} 
                onClose={() => setSelectedException(null)} 
                title={selectedException?.exception_type || 'Exception Details'}
            >
                {selectedException && (
                    <div className="space-y-6">
                        <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
                            <div className="flex justify-between items-start mb-2">
                                <h4 className="text-sm font-medium text-gray-700 uppercase tracking-wide">Context</h4>
                                <Badge color={selectedException.status === 'Resolved' ? 'green' : 'yellow'}>{selectedException.status}</Badge>
                            </div>
                            <p className="text-sm text-gray-900 font-medium">{selectedException.description}</p>
                            <div className="mt-3 text-xs text-gray-500 grid grid-cols-2 gap-2">
                                <div>Entity: <span className="font-medium text-gray-900">{getEntityName(selectedException.entity_type, selectedException.entity_id)}</span></div>
                                <div>Detected: <span className="font-medium text-gray-900">{new Date(selectedException.detected_at).toLocaleString()}</span></div>
                                {selectedException.age_hours !== undefined && (
                                    <div className="flex items-center">Age: <span className={`font-medium ml-1 ${selectedException.age_hours > 24 ? 'text-red-600' : 'text-gray-900'}`}>{selectedException.age_hours}h</span></div>
                                )}
                            </div>
                        </div>

                        {selectedException.recommendation && (
                            <div className="bg-blue-50 p-4 rounded-md border border-blue-100">
                                <h4 className="text-sm font-medium text-blue-800 uppercase tracking-wide mb-2 flex items-center">
                                    <IconBell className="w-4 h-4 mr-2" />
                                    Ops Playbook Recommendation
                                </h4>
                                <p className="text-sm text-blue-900">{selectedException.recommendation}</p>
                            </div>
                        )}

                        <div className="border-t border-gray-200 pt-4">
                            <h4 className="text-sm font-medium text-gray-900 mb-3">Resolution & Ownership</h4>
                            
                            <Input 
                                label="Assign To"
                                value={assignee}
                                onChange={e => setAssignee(e.target.value)}
                                placeholder="Enter Ops User Name"
                                disabled={selectedException.status === ExceptionStatus.RESOLVED}
                            />

                            <label className="block text-sm font-medium text-gray-700 mb-1">Resolution Notes</label>
                            <textarea 
                                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm p-2 border"
                                rows={3}
                                value={resolutionNote}
                                onChange={e => setResolutionNote(e.target.value)}
                                placeholder="Explain action taken..."
                                disabled={selectedException.status === ExceptionStatus.RESOLVED}
                            />
                        </div>

                        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
                            {selectedException.status === ExceptionStatus.OPEN && (
                                <Button 
                                    variant="secondary" 
                                    onClick={() => handleUpdateStatus(selectedException.exception_id, ExceptionStatus.ACKNOWLEDGED, undefined, assignee)}
                                    isLoading={isActioning}
                                >
                                    Acknowledge & Assign
                                </Button>
                            )}
                            {selectedException.status !== ExceptionStatus.RESOLVED && (
                                <Button 
                                    onClick={() => handleUpdateStatus(selectedException.exception_id, ExceptionStatus.RESOLVED, resolutionNote, assignee)}
                                    isLoading={isActioning}
                                    disabled={!resolutionNote}
                                >
                                    Resolve & Close
                                </Button>
                            )}
                             {selectedException.status === ExceptionStatus.RESOLVED && (
                                <span className="text-sm text-green-600 font-medium flex items-center px-4 py-2 border border-transparent">
                                    <IconCheck className="w-4 h-4 mr-1" />
                                    Resolved
                                </span>
                            )}
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};