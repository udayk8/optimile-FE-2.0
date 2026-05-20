import React, { useState, useEffect } from 'react';
import { DataCoverageStatus, Vehicle } from '../types';
import { DataCoverageAPI, VehicleAPI } from '../services/mockDatabase';
import { Badge } from '../components/UI';
import { IconCheck, IconAlert } from '../components/Icons';

export const DataCoveragePage: React.FC = () => {
    const [coverageData, setCoverageData] = useState<DataCoverageStatus[]>([]);
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            const [c, v] = await Promise.all([DataCoverageAPI.getAll(), VehicleAPI.getAll()]);
            setCoverageData(c);
            setVehicles(v);
            setIsLoading(false);
        };
        load();
    }, []);

    const getVehicleReg = (id: string) => vehicles.find(v => v.vehicle_id === id)?.registration_number || id;

    const getStatusColor = (status: string) => {
        switch(status) {
            case 'Good': return 'green';
            case 'Warning': return 'yellow';
            case 'Poor': return 'red';
            default: return 'gray';
        }
    };

    const getBarColor = (pct: number) => {
        if (pct >= 90) return 'bg-green-500';
        if (pct >= 70) return 'bg-yellow-500';
        return 'bg-red-500';
    };

    if (isLoading) return <div className="p-8 text-center text-gray-500">Calculating Coverage Metrics...</div>;

    return (
        <div>
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Data Coverage & Completeness</h1>
                <p className="text-gray-500 mt-1">Monitor signal quality across fleet assets to ensure TMS data reliability.</p>
            </div>

            <div className="bg-white shadow overflow-hidden rounded-lg border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vehicle</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Overall Status</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase w-32">Fuel Coverage</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase w-32">Telematics</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase w-32">Compliance</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase w-32">Docs</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {coverageData.map((d) => (
                            <tr key={d.vehicle_id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                    {getVehicleReg(d.vehicle_id)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <Badge color={getStatusColor(d.overall_status)}>{d.overall_status}</Badge>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center">
                                        <div className="w-full bg-gray-200 rounded-full h-2 mr-2">
                                            <div className={`h-2 rounded-full ${getBarColor(d.fuel_coverage_pct)}`} style={{ width: `${d.fuel_coverage_pct}%` }}></div>
                                        </div>
                                        <span className="text-xs text-gray-500">{d.fuel_coverage_pct}%</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center">
                                        <div className="w-full bg-gray-200 rounded-full h-2 mr-2">
                                            <div className={`h-2 rounded-full ${getBarColor(d.telematics_uptime_pct)}`} style={{ width: `${d.telematics_uptime_pct}%` }}></div>
                                        </div>
                                        <span className="text-xs text-gray-500">{d.telematics_uptime_pct}%</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center">
                                        <div className="w-full bg-gray-200 rounded-full h-2 mr-2">
                                            <div className={`h-2 rounded-full ${getBarColor(d.maintenance_compliance_pct)}`} style={{ width: `${d.maintenance_compliance_pct}%` }}></div>
                                        </div>
                                        <span className="text-xs text-gray-500">{d.maintenance_compliance_pct}%</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center">
                                        <div className="w-full bg-gray-200 rounded-full h-2 mr-2">
                                            <div className={`h-2 rounded-full ${getBarColor(d.document_completeness_pct)}`} style={{ width: `${d.document_completeness_pct}%` }}></div>
                                        </div>
                                        <span className="text-xs text-gray-500">{d.document_completeness_pct}%</span>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};