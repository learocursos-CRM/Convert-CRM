import React, { useState } from 'react';
import { useCRM } from '../../context/CRMContext';
import { Plus, X } from 'lucide-react';

const SourcesSettings = () => {
    const { availableSources, addSource, removeSource } = useCRM();
    const [newSource, setNewSource] = useState('');

    const handleAdd = (e: React.FormEvent) => {
        e.preventDefault();
        if (newSource.trim()) {
            addSource(newSource.trim());
            setNewSource('');
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div>
                <h2 className="text-xl font-bold text-gray-800 mb-4">Fontes de Leads</h2>
                <form onSubmit={handleAdd} className="flex gap-2 mb-4">
                    <input
                        type="text"
                        placeholder="Nova fonte"
                        className="flex-1 border rounded px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
                        value={newSource}
                        onChange={e => setNewSource(e.target.value)}
                    />
                    <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded">
                        <Plus size={18} />
                    </button>
                </form>
                <div className="bg-white border rounded divide-y">
                    {availableSources.map((source, idx) => (
                        <div key={idx} className="p-3 flex justify-between hover:bg-gray-50 items-center">
                            <span className="text-gray-700">{source}</span>
                            <button onClick={() => removeSource(source)} className="text-gray-400 hover:text-red-500 p-1">
                                <X size={16} />
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default SourcesSettings;
