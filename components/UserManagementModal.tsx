import React, { useState } from 'react';
import { X } from 'lucide-react';
import { User } from '../types';

interface UserManagementModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (userData: any) => Promise<void>;
    user?: User | null; // If provided, edit mode; otherwise create mode
}

const UserManagementModal: React.FC<UserManagementModalProps> = ({ isOpen, onClose, onSubmit, user }) => {
    const [formData, setFormData] = useState({
        name: user?.name || '',
        email: user?.email || '',
        password: '',
        role: user?.role || 'sales' as 'admin' | 'sales',
        active: user?.active ?? true
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const isEditMode = !!user;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        // Validation
        if (!formData.name.trim()) {
            setError('Nome é obrigatório');
            return;
        }

        if (!formData.email.trim()) {
            setError('E-mail é obrigatório');
            return;
        }

        if (!isEditMode && (!formData.password || formData.password.length < 6)) {
            setError('Senha deve ter no mínimo 6 caracteres');
            return;
        }

        setLoading(true);
        try {
            await onSubmit(isEditMode ? {
                id: user!.id,
                name: formData.name,
                role: formData.role,
                active: formData.active
            } : formData);

            onClose();
            // Reset form
            setFormData({
                name: '',
                email: '',
                password: '',
                role: 'sales',
                active: true
            });
        } catch (err: any) {
            setError(err.message || 'Erro ao salvar usuário');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b">
                    <h2 className="text-2xl font-bold text-gray-800">
                        {isEditMode ? 'Editar Usuário' : 'Criar Novo Usuário'}
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 transition"
                        type="button"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && (
                        <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm border border-red-100">
                            {error}
                        </div>
                    )}

                    {/* Name */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                            Nome Completo *
                        </label>
                        <input
                            type="text"
                            required
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-indigo-500 transition"
                            placeholder="Nome do usuário"
                        />
                    </div>

                    {/* Email (disabled in edit mode) */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                            E-mail (Login) *
                        </label>
                        <input
                            type="email"
                            required
                            disabled={isEditMode}
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            className={`w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-indigo-500 transition ${isEditMode ? 'bg-gray-100 cursor-not-allowed' : ''
                                }`}
                            placeholder="usuario@email.com"
                        />
                        {isEditMode && (
                            <p className="text-xs text-gray-500 mt-1">
                                O e-mail não pode ser alterado
                            </p>
                        )}
                    </div>

                    {/* Password (only in create mode) */}
                    {!isEditMode && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                Senha Inicial *
                            </label>
                            <input
                                type="password"
                                required
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-indigo-500 transition"
                                placeholder="Mínimo 6 caracteres"
                                minLength={6}
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                O usuário será forçado a trocar a senha no primeiro login
                            </p>
                        </div>
                    )}

                    {/* Role */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                            Perfil *
                        </label>
                        <select
                            value={formData.role}
                            onChange={(e) => setFormData({ ...formData, role: e.target.value as 'admin' | 'sales' })}
                            className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-indigo-500 transition"
                        >
                            <option value="sales">Vendedor</option>
                            <option value="admin">Administrador</option>
                        </select>
                    </div>

                    {/* Active (only in edit mode) */}
                    {isEditMode && (
                        <div className="flex items-center gap-3">
                            <input
                                type="checkbox"
                                id="active"
                                checked={formData.active}
                                onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                                className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                            />
                            <label htmlFor="active" className="text-sm font-medium text-gray-700">
                                Usuário Ativo
                            </label>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Salvando...' : isEditMode ? 'Salvar Alterações' : 'Criar Usuário'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default UserManagementModal;
