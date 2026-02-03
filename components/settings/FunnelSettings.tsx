import React from 'react';
import { DealStage } from '../../types';

const FunnelSettings = () => {
    const steps = Object.values(DealStage);
    return (
        <div className="max-w-3xl">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Etapas do Funil</h2>
            <div className="space-y-3">
                {steps.map((step, index) => (
                    <div key={index} className="flex items-center gap-4 bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                        <div className="bg-gray-100 text-gray-500 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm">
                            {index + 1}
                        </div>
                        <div className="flex-1 font-medium text-gray-700">{step}</div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default FunnelSettings;
