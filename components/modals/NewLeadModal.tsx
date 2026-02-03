import React from 'react';
import { X, Plus } from 'lucide-react';

interface NewLeadModalProps {
    show: boolean;
    onClose: () => void;
    formData: {
        name: string;
        company: string;
        email: string;
        phone: string;
        source: string;
        classification: string;
        desiredCourse: string;
    };
    setFormData: (data: any) => void;
    onSubmit: (e: React.FormEvent) => void;
    availableSources: string[];
}

const NewLeadModal = ({ show, onClose, formData, setFormData, onSubmit, availableSources }: NewLeadModalProps) => {
    if (!show) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-gray-900">Novo Lead</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X size={24} />
                    </button>
                </div>
                <form onSubmit={onSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nome Completo</label>
                        <input
                            required
                            type="text"
                            className="w-full border border-gray-300 rounded-lg px-3 py-2"
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Empresa</label>
                        <input
                            required
                            type="text"
                            className="w-full border border-gray-300 rounded-lg px-3 py-2"
                            value={formData.company}
                            onChange={e => setFormData({ ...formData, company: e.target.value })}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                            <input
                                required
                                type="email"
                                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                                value={formData.email}
                                onChange={e => setFormData({ ...formData, email: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
                            <input
                                required
                                type="tel"
                                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                                value={formData.phone}
                                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Classificação</label>
                            <select
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                                value={formData.classification}
                                onChange={e => setFormData({ ...formData, classification: e.target.value })}
                            >
                                <option value="Comunidade">Comunidade</option>
                                <option value="Trabalhador vinculado à empresa do transporte">Trabalhador vinculado</option>
                                <option value="Dependente de trabalhador vinculado à empresa do transporte">Dependente</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Curso Desejado <span className="text-red-500">*</span>
                            </label>
                            <input
                                required
                                type="text"
                                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                                value={formData.desiredCourse}
                                onChange={e => setFormData({ ...formData, desiredCourse: e.target.value })}
                                placeholder="Ex: Logística (Obrigatório)"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Origem</label>
                        <select
                            className="w-full border border-gray-300 rounded-lg px-3 py-2"
                            value={formData.source}
                            onChange={e => setFormData({ ...formData, source: e.target.value })}
                        >
                            {availableSources.map(s => (
                                <option key={s} value={s}>{s}</option>
                            ))}
                        </select>
                    </div>
                    <div className="pt-4 flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="flex-1 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow-md"
                        >
                            Criar Lead
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default NewLeadModal;
