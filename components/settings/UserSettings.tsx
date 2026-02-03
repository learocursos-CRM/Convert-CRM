import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import { User } from '../../types';
import { Plus, Edit2, KeyRound, Trash2, Shield } from 'lucide-react';
import UserManagementModal from '../UserManagementModal';
import PasswordResetModal from '../PasswordResetModal';

const UserSettings = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isPasswordResetOpen, setIsPasswordResetOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [resetUser, setResetUser] = useState<User | null>(null);

    const fetchUsers = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            const response = await fetch('/api/admin/users', {
                headers: {
                    'Authorization': `Bearer ${session.access_token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                setUsers(data.users || []);
            } else {
                console.error('Failed to fetch users');
            }
        } catch (error) {
            console.error('Error fetching users:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleCreateUser = async (userData: any) => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('Not authenticated');

        const response = await fetch('/api/admin/create-user', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`
            },
            body: JSON.stringify(userData)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to create user');
        }

        await fetchUsers();
        alert('Usuário criado com sucesso!');
    };

    const handleUpdateUser = async (userData: any) => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('Not authenticated');

        const response = await fetch(`/api/admin/users/${userData.id}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`
            },
            body: JSON.stringify({
                name: userData.name,
                role: userData.role,
                active: userData.active
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to update user');
        }

        await fetchUsers();
        alert('Usuário atualizado com sucesso!');
    };

    const handleResetPassword = async (password: string) => {
        if (!resetUser) return;

        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('Not authenticated');

        const response = await fetch(`/api/admin/users/${resetUser.id}/reset-password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`
            },
            body: JSON.stringify({ password })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to reset password');
        }

        alert('Senha resetada com sucesso! O usuário será forçado a trocá-la no próximo login.');
    };

    const handleDeleteUser = async (user: User) => {
        if (!window.confirm(`Tem certeza que deseja EXCLUIR permanentemente o usuário ${user.name}?\n\nEsta ação NÃO pode ser desfeita!`)) return;

        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const response = await fetch(`/api/admin/users/${user.id}/delete`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${session.access_token}`
            }
        });

        if (response.ok) {
            await fetchUsers();
            alert('Usuário excluído com sucesso!');
        } else {
            const error = await response.json();
            alert('Erro ao excluir usuário: ' + (error.error || 'Erro desconhecido'));
        }
    };

    const handleToggleActive = async (user: User) => {
        if (!window.confirm(`Deseja ${user.active ? 'desativar' : 'ativar'} ${user.name}?`)) return;

        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const response = await fetch(`/api/admin/users/${user.id}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`
            },
            body: JSON.stringify({ active: !user.active })
        });

        if (response.ok) {
            await fetchUsers();
            alert(`Usuário ${!user.active ? 'ativado' : 'desativado'} com sucesso!`);
        }
    };

    const formatDate = (dateString: string) => {
        if (!dateString) return 'Nunca';
        return new Date(dateString).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Usuários e Permissões</h2>
                    <p className="text-gray-500 text-sm">Gerencie usuários e controle de acesso do sistema</p>
                </div>
                <button
                    onClick={() => {
                        setSelectedUser(null);
                        setIsModalOpen(true);
                    }}
                    className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 font-medium shadow-lg transition"
                >
                    <Plus size={18} /> Criar Usuário
                </button>
            </div>

            {loading ? (
                <div className="text-center py-12">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                    <p className="text-gray-500 mt-2">Carregando usuários...</p>
                </div>
            ) : (
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-3">Usuário</th>
                                <th className="px-6 py-3">Perfil</th>
                                <th className="px-6 py-3">Status</th>
                                <th className="px-6 py-3">Criado em</th>
                                <th className="px-6 py-3">Último acesso</th>
                                <th className="px-6 py-3 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {users.map(user => (
                                <tr key={user.id} className="hover:bg-gray-50 transition">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-bold">
                                                {user.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <div className="font-medium text-gray-900">{user.name}</div>
                                                <div className="text-gray-500 text-xs">{user.email}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${user.role === 'admin'
                                            ? 'bg-purple-100 text-purple-700'
                                            : 'bg-blue-100 text-blue-700'
                                            }`}>
                                            {user.role === 'admin' ? 'Administrador' : 'Vendedor'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <button
                                            onClick={() => handleToggleActive(user)}
                                            className={`px-3 py-1 rounded-full text-xs font-semibold transition ${user.active
                                                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                                : 'bg-red-100 text-red-700 hover:bg-red-200'
                                                }`}
                                        >
                                            {user.active ? 'Ativo' : 'Inativo'}
                                        </button>
                                    </td>
                                    <td className="px-6 py-4 text-gray-600 text-xs">
                                        {formatDate(user.createdAt)}
                                    </td>
                                    <td className="px-6 py-4 text-gray-600 text-xs">
                                        {formatDate((user as any).last_login)}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex justify-end gap-2">
                                            <button
                                                onClick={() => {
                                                    setSelectedUser(user);
                                                    setIsModalOpen(true);
                                                }}
                                                title="Editar usuário"
                                                className="text-gray-400 hover:text-indigo-600 transition p-2 hover:bg-indigo-50 rounded"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setResetUser(user);
                                                    setIsPasswordResetOpen(true);
                                                }}
                                                title="Resetar senha"
                                                className="text-gray-400 hover:text-amber-600 transition p-2 hover:bg-amber-50 rounded"
                                            >
                                                <KeyRound size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteUser(user)}
                                                title="Excluir usuário"
                                                className="text-gray-400 hover:text-red-600 transition p-2 hover:bg-red-50 rounded"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {users.length === 0 && (
                        <div className="text-center py-12 text-gray-500">
                            <Shield size={48} className="mx-auto mb-4 opacity-20" />
                            <p>Nenhum usuário encontrado</p>
                        </div>
                    )}
                </div>
            )}

            {isModalOpen && (
                <UserManagementModal
                    isOpen={isModalOpen}
                    onClose={() => {
                        setIsModalOpen(false);
                        setSelectedUser(null);
                    }}
                    onSubmit={selectedUser ? handleUpdateUser : handleCreateUser}
                    user={selectedUser}
                />
            )}

            {isPasswordResetOpen && resetUser && (
                <PasswordResetModal
                    isOpen={isPasswordResetOpen}
                    onClose={() => {
                        setIsPasswordResetOpen(false);
                        setResetUser(null);
                    }}
                    onSubmit={handleResetPassword}
                    userName={resetUser.name}
                />
            )}
        </div>
    );
};

export default UserSettings;
