import React from 'react';
import { X } from 'lucide-react';
import { Deal } from '../../types';

interface EditDealModalProps {
    deal: Deal | null;
    onClose: () => void;
    onUpdate: (e: React.FormEvent) => void;
    setEditingDeal: (deal: Deal | null) => void;
}

const EditDealModal: React.FC<EditDealModalProps> = ({ deal, onClose, onUpdate, setEditingDeal }) => {
    if (!deal) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-gray-900">Editar Negócio</h3>
                    <button onClick={onClose}><X size={24} className="text-gray-400 hover:text-gray-600" /></button>
                </div>
                <form onSubmit={onUpdate} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Título</label>
                        <input
                            type="text"
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
                            value={deal.title}
                            onChange={e => setEditingDeal({ ...deal, title: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Valor (R$)</label>
                        <input
                            type="number"
                            step="0.01"
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
                            value={deal.value}
                            onChange={e => setEditingDeal({ ...deal, value: parseFloat(e.target.value) })}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Probabilidade (%)</label>
                        <input
                            type="number"
                            min="0"
                            max="100"
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
                            value={deal.probability}
                            onChange={e => setEditingDeal({ ...deal, probability: parseInt(e.target.value) })}
                        />
                    </div>
                    <div className="pt-4 flex gap-3">
                        <button type="button" onClick={onClose} className="flex-1 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">Cancelar</button>
                        <button type="submit" className="flex-1 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Salvar</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditDealModal;
