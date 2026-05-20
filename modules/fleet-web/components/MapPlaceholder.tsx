import React from 'react';
import { IconMap } from './Icons';

interface MapPlaceholderProps {
    origin: string;
    destination: string;
    className?: string;
}

export const MapPlaceholder: React.FC<MapPlaceholderProps> = ({ origin, destination, className = '' }) => {
    return (
        <div className={`bg-gray-100 rounded-lg overflow-hidden relative flex items-center justify-center border border-gray-200 ${className}`} style={{ minHeight: '300px' }}>
            <div className="absolute inset-0 opacity-10" style={{ 
                backgroundImage: 'radial-gradient(#9ca3af 1px, transparent 1px)',
                backgroundSize: '20px 20px' 
            }}></div>
            
            {/* Mock Route Visualization */}
            <div className="relative z-10 w-full max-w-md p-6">
                <div className="flex items-center justify-between text-gray-800">
                    <div className="flex flex-col items-center">
                        <div className="w-8 h-8 rounded-full bg-white border-4 border-primary-600 flex items-center justify-center shadow-lg">
                            <div className="w-2 h-2 bg-primary-600 rounded-full"></div>
                        </div>
                        <div className="mt-2 bg-white px-2 py-1 rounded shadow text-xs font-semibold max-w-[120px] text-center truncate">{origin}</div>
                    </div>
                    
                    <div className="flex-1 mx-4 h-1 bg-gray-300 relative rounded-full">
                        <div className="absolute top-1/2 left-0 right-0 transform -translate-y-1/2 h-1 bg-primary-500 w-1/2 rounded-full"></div>
                        <div className="absolute top-1/2 left-1/2 transform -translate-y-1/2 -translate-x-1/2 w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center shadow-lg animate-pulse">
                            <IconMap className="text-white w-4 h-4" />
                        </div>
                    </div>
                    
                    <div className="flex flex-col items-center">
                        <div className="w-8 h-8 rounded-full bg-white border-4 border-gray-400 flex items-center justify-center shadow-lg">
                            <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                        </div>
                        <div className="mt-2 bg-white px-2 py-1 rounded shadow text-xs font-semibold max-w-[120px] text-center truncate">{destination}</div>
                    </div>
                </div>
                <div className="mt-8 text-center">
                    <span className="bg-white/80 backdrop-blur px-3 py-1 rounded-full text-xs font-mono text-gray-500 border border-gray-200">
                        Map Data Simulation
                    </span>
                </div>
            </div>
        </div>
    );
};