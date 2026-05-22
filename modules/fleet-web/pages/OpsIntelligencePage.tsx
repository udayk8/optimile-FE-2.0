import React, { useState, useEffect } from 'react';
import { OpsKPIs } from '../types';
import { OpsAPI } from '../services/mockDatabase';
import { IconChart, IconAlert, IconCheck, IconShield, IconTruck, IconTrendUp, IconZap } from '../components/Icons';

export const OpsIntelligencePage: React.FC = () => {
    const [kpis, setKpis] = useState<OpsKPIs | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            const data = await OpsAPI.getKPIs();
            setKpis(data);
            setIsLoading(false);
        };
        load();
    }, []);

    if (isLoading) return <div className="p-8 text-center text-gray-500">Calculating Fleet Metrics...</div>;
    if (!kpis) return <div className="p-8 text-center text-red-500">Failed to load metrics.</div>;

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                 <div>
                     <h1 className="text-2xl font-bold text-gray-900">Operations Intelligence</h1>
                     <p className="text-sm text-gray-500 mt-1">Strategic view of fleet efficiency, risk, and operational health.</p>
                 </div>
                 <div className="text-right text-xs text-gray-400">
                     Data refreshed: {new Date().toLocaleTimeString()}
                 </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {/* Fleet Availability */}
                <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200">
                    <div className="flex items-center justify-between mb-4">
                        <div className="text-sm font-medium text-gray-500">Fleet Availability</div>
                        <IconTruck className="w-5 h-5 text-blue-500" />
                    </div>
                    <div className="flex items-baseline">
                        <span className="text-3xl font-bold text-gray-900">{kpis.fleet_availability}%</span>
                        <span className="ml-2 text-sm font-medium text-gray-500">Utilization</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5 mt-4">
                        <div className={`h-1.5 rounded-full ${kpis.fleet_availability > 80 ? 'bg-green-500' : 'bg-yellow-500'}`} style={{ width: `${kpis.fleet_availability}%` }}></div>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">{kpis.active_vehicles} vehicles active on duty</p>
                </div>

                {/* Compliance Rate */}
                <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200">
                    <div className="flex items-center justify-between mb-4">
                        <div className="text-sm font-medium text-gray-500">Compliance Rate</div>
                        <IconShield className="w-5 h-5 text-purple-500" />
                    </div>
                    <div className="flex items-baseline">
                        <span className="text-3xl font-bold text-gray-900">{kpis.compliance_rate}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5 mt-4">
                        <div className={`h-1.5 rounded-full ${kpis.compliance_rate < 90 ? 'bg-red-500' : 'bg-green-500'}`} style={{ width: `${kpis.compliance_rate}%` }}></div>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">Based on document expiry status</p>
                </div>

                {/* Critical Exceptions */}
                <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200">
                    <div className="flex items-center justify-between mb-4">
                        <div className="text-sm font-medium text-gray-500">Critical Exceptions</div>
                        <IconAlert className="w-5 h-5 text-red-500" />
                    </div>
                    <div className="flex items-baseline">
                        <span className={`text-3xl font-bold ${kpis.open_critical_exceptions > 0 ? 'text-red-600' : 'text-green-600'}`}>{kpis.open_critical_exceptions}</span>
                        <span className="ml-2 text-sm text-gray-500">Open</span>
                    </div>
                    <p className="text-xs text-red-500 mt-2 font-medium">Requires immediate Ops attention</p>
                </div>

                {/* Cost Signal Quality */}
                 <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200">
                    <div className="flex items-center justify-between mb-4">
                        <div className="text-sm font-medium text-gray-500">Cost Confidence</div>
                        <IconChart className="w-5 h-5 text-green-500" />
                    </div>
                    <div className="flex items-baseline">
                        <span className="text-3xl font-bold text-gray-900">{kpis.cost_confidence}%</span>
                        <span className="ml-2 text-sm text-gray-500">High Conf.</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5 mt-4">
                        <div className={`h-1.5 rounded-full ${kpis.cost_confidence > 80 ? 'bg-green-500' : 'bg-yellow-500'}`} style={{ width: `${kpis.cost_confidence}%` }}></div>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">Data accuracy for financial reporting</p>
                </div>
            </div>

            {/* Mock Charts Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <h3 className="text-lg font-medium text-gray-900 mb-6 flex items-center">
                        <IconTrendUp className="w-5 h-5 mr-2 text-gray-500" />
                        Fleet Efficiency Trend (7 Days)
                    </h3>
                    <div className="h-48 flex items-end space-x-4">
                        {[65, 70, 68, 74, 72, 80, 78].map((h, i) => (
                            <div key={i} className="flex-1 flex flex-col items-center group">
                                <div 
                                    className="w-full bg-blue-100 rounded-t-sm group-hover:bg-blue-200 transition-all relative"
                                    style={{ height: `${h}%` }}
                                >
                                     <div className="opacity-0 group-hover:opacity-100 absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded shadow-lg transition-opacity">
                                        {h}%
                                     </div>
                                </div>
                                <span className="text-xs text-gray-500 mt-2 font-mono">D-{7-i}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                     <h3 className="text-lg font-medium text-gray-900 mb-6 flex items-center">
                        <IconZap className="w-5 h-5 mr-2 text-gray-500" />
                        Asset State Distribution
                     </h3>
                     <div className="space-y-6">
                        <div>
                            <div className="flex justify-between text-sm mb-1">
                                <span className="text-gray-600">Active / On Trip</span>
                                <span className="font-medium text-gray-900">45%</span>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-2">
                                <div className="bg-green-500 h-2 rounded-full" style={{ width: '45%' }}></div>
                            </div>
                        </div>
                        <div>
                            <div className="flex justify-between text-sm mb-1">
                                <span className="text-gray-600">Available (Idle)</span>
                                <span className="font-medium text-gray-900">30%</span>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-2">
                                <div className="bg-blue-400 h-2 rounded-full" style={{ width: '30%' }}></div>
                            </div>
                        </div>
                         <div>
                            <div className="flex justify-between text-sm mb-1">
                                <span className="text-gray-600">Maintenance / Breakdown</span>
                                <span className="font-medium text-gray-900">15%</span>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-2">
                                <div className="bg-red-400 h-2 rounded-full" style={{ width: '15%' }}></div>
                            </div>
                        </div>
                         <div>
                            <div className="flex justify-between text-sm mb-1">
                                <span className="text-gray-600">Non-Compliant / Parked</span>
                                <span className="font-medium text-gray-900">10%</span>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-2">
                                <div className="bg-gray-400 h-2 rounded-full" style={{ width: '10%' }}></div>
                            </div>
                        </div>
                     </div>
                </div>
            </div>
        </div>
    );
};