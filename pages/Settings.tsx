import React, { useState, useRef, useEffect } from 'react';
import { useCRM } from '../context/CRMContext';
import {
    Settings as SettingsIcon, Users, Filter, Tags, Building,
    Trash2, Plus, Edit2, Check, X, Shield, PlayCircle, Lock, KeyRound, Camera
} from 'lucide-react';
import { User, DealStage } from '../types';
import { supabase } from '../services/supabase';
import UserManagementModal from '../components/UserManagementModal';
import PasswordResetModal from '../components/PasswordResetModal';

const Settings = () => {
    const { currentUser } = useCRM();
    // Default to 'profile' for everyone (safe), 'general' for admin
    const [activeTab, setActiveTab] = useState<'general' | 'users' | 'funnel' | 'sources' | 'profile'>('profile');

    return (
        <div className="flex h-[calc(100vh-8rem)] bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            {/* Sidebar */}
            <div className="w-64 bg-gray-50 border-r border-gray-200 p-4 space-y-2">
                <h3 className="text-xs font-bold text-gray-400 uppercase mb-4 px-3">Configurações</h3>

                <TabButton
                    active={activeTab === 'profile'}
                    onClick={() => setActiveTab('profile')}
                    icon={<Shield size={18} />}
                    label="Meu Perfil & Segurança"
                />

                {currentUser?.role === 'admin' && (
                    <>
                        <div className="my-2 border-t border-gray-200"></div>
                        <TabButton
                            active={activeTab === 'general'}
                            onClick={() => setActiveTab('general')}
                            icon={<Building size={18} />}
                            label="Geral & Testes"
                        />
                        <TabButton
                            active={activeTab === 'users'}
                            onClick={() => setActiveTab('users')}
                            icon={<Users size={18} />}
                            label="Usuários e Permissões"
                        />
                        <TabButton
                            active={activeTab === 'funnel'}
                            onClick={() => setActiveTab('funnel')}
                            icon={<Filter size={18} />}
                            label="Funil de Vendas"
                        />
                        <TabButton
                            active={activeTab === 'sources'}
                            onClick={() => setActiveTab('sources')}
                            icon={<Tags size={18} />}
                            label="Fontes e Motivos"
                        />
                    </>
                )}
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-8">
                {activeTab === 'profile' && <ProfileSettings />}
                {currentUser?.role === 'admin' && (
                    <>
                        {activeTab === 'general' && <GeneralSettings />}
                        {activeTab === 'users' && <UserSettings />}
                        {activeTab === 'funnel' && <FunnelSettings />}
                        {activeTab === 'sources' && <SourcesSettings />}
                    </>
                )}
            </div>
        </div>
    );
};

const TabButton = ({ active, onClick, icon, label }: any) => (
    <button
        onClick={onClick}
        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${active ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-100'
            }`}
    >
        {icon}
        {label}
    </button>
);

// --- Sub-components ---

const ProfileSettings = () => {
    const { currentUser, changeMyPassword, updateMyProfile } = useCRM();
    const [oldPwd, setOldPwd] = useState('');
    const [p1, setP1] = useState('');
    const [p2, setP2] = useState('');
    const [msg, setMsg] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setMsg('');

        if (p1.length < 6) return setMsg("Erro: A senha deve ter no mínimo 6 caracteres.");
        if (p1 !== p2) return setMsg("Erro: As novas senhas não conferem.");

        const success = changeMyPassword(p1, oldPwd);

        if (success) {
            setMsg("Sucesso: Senha alterada!");
            setOldPwd('');
            setP1('');
            setP2('');
        } else {
            setMsg("Erro: A senha atual está incorreta.");
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                if (reader.result) {
                    updateMyProfile({ avatar: reader.result as string });
                }
            };
            reader.readAsDataURL(file);
        }
    };

    return (
        <div className="max-w-xl">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Meu Perfil</h2>

            <div className="flex items-center gap-6 mb-8 bg-gray-50 p-6 rounded-xl border border-gray-100">
                <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                    <img src={currentUser?.avatar} className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-sm" alt="Avatar" />
                    <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Camera className="text-white" size={24} />
                    </div>
                    <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept="image/*"
                        onChange={handleFileChange}
                    />
                </div>

                <div>
                    <h3 className="font-bold text-xl text-gray-900">{currentUser?.name}</h3>
                    <p className="text-gray-500 mb-2">{currentUser?.email}</p>
                    <span className="text-xs bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full uppercase font-bold tracking-wide">
                        {currentUser?.role === 'admin' ? 'Administrador' : 'Vendedor'}
                    </span>
                    <p className="text-xs text-gray-400 mt-2">Clique na foto para alterar</p>
                </div>
            </div>

            <div className="border-t border-gray-200 pt-6">
                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <KeyRound size={20} /> Alterar Senha
                </h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                    {msg && <div className={`p-3 rounded text-sm ${msg.startsWith('Sucesso') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{msg}</div>}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Senha Atual</label>
                        <input type="password" required className="w-full border rounded px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500" value={oldPwd} onChange={e => setOldPwd(e.target.value)} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nova Senha</label>
                        <input type="password" required className="w-full border rounded px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500" value={p1} onChange={e => setP1(e.target.value)} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar Nova Senha</label>
                        <input type="password" required className="w-full border rounded px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500" value={p2} onChange={e => setP2(e.target.value)} />
                    </div>
                    <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 font-medium">
                        Atualizar Senha
                    </button>
                </form>
            </div>
        </div>
    );
};

const GeneralSettings = () => {
    const { companySettings, updateCompanySettings, addLead } = useCRM();
    const [form, setForm] = useState(companySettings);

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        updateCompanySettings(form);
        alert('Configurações salvas com sucesso!');
    };

    const handleSimulateData = () => {
        if (!confirm("Isso criará 3 leads de teste para validar a automação do pipeline. Continuar?")) return;

        addLead({ name: "Simulação Comunidade", email: "teste1@simulacao.com", phone: "11999999991", company: "Particular", classification: "Comunidade", desiredCourse: "Excel Avançado", source: "Simulação" });
        addLead({ name: "Simulação Trabalhador", email: "teste2@simulacao.com", phone: "11999999992", company: "TransLog S.A.", classification: "Trabalhador vinculado à empresa do transporte", desiredCourse: "Gestão de Frotas", source: "Simulação" });
        addLead({ name: "Simulação Inválido", email: "teste3@simulacao.com", phone: "11999999993", company: "Indeciso Ltda", classification: "Comunidade", desiredCourse: "", source: "Simulação" });

        alert("✅ Simulação concluída!");
    };

    return (
        <div className="max-w-2xl space-y-8">
            <div>
                <h2 className="text-2xl font-bold text-gray-800 mb-6">Dados da Empresa</h2>
                <form onSubmit={handleSave} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nome da Empresa</label>
                        <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full border rounded px-3 py-2" />
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Moeda</label>
                            <select value={form.currency} onChange={e => setForm({ ...form, currency: e.target.value })} className="w-full border rounded px-3 py-2">
                                <option value="BRL">Real (BRL)</option>
                                <option value="USD">Dólar (USD)</option>
                            </select>
                        </div>
                    </div>
                    <div className="pt-4"><button type="submit" className="bg-indigo-600 text-white px-6 py-2 rounded hover:bg-indigo-700">Salvar</button></div>
                </form>
            </div>
            <div className="border-t pt-8">
                <h3 className="text-lg font-bold text-gray-800 mb-4">Área de Testes</h3>
                <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-6 flex justify-between items-center">
                    <div><h4 className="font-bold text-indigo-900">Gerar Massa de Dados</h4><p className="text-sm text-indigo-700">Cria leads de teste.</p></div>
                    <button onClick={handleSimulateData} className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 flex gap-2"><PlayCircle size={18} /> Simular</button>
                </div>
            </div>
        </div>
    );
};

const UserSettings = () => {
    const { currentUser } = useCRM();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isPasswordResetOpen, setIsPasswordResetOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [resetUser, setResetUser] = useState<User | null>(null);

    // Fetch users from API
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

    // Create user
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

        await fetchUsers(); // Refresh list
        alert('Usuário criado com sucesso!');
    };

    // Update user
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

        await fetchUsers(); // Refresh list
        alert('Usuário atualizado com sucesso!');
    };

    // Reset password
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

    // Toggle active status
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

            {/* Modals */}
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

const FunnelSettings = () => {
    const steps = Object.values(DealStage);
    return (
        <div className="max-w-3xl">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Etapas do Funil</h2>
            <div className="space-y-3">{steps.map((step, index) => (<div key={index} className="flex items-center gap-4 bg-white p-4 rounded-lg border border-gray-200 shadow-sm"><div className="bg-gray-100 text-gray-500 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm">{index + 1}</div><div className="flex-1 font-medium text-gray-700">{step}</div></div>))}</div>
        </div>
    );
};

const SourcesSettings = () => {
    const { availableSources, addSource, removeSource } = useCRM();
    const [newSource, setNewSource] = useState('');
    const handleAdd = (e: React.FormEvent) => { e.preventDefault(); if (newSource.trim()) { addSource(newSource.trim()); setNewSource(''); } };
    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div>
                <h2 className="text-xl font-bold text-gray-800 mb-4">Fontes de Leads</h2>
                <form onSubmit={handleAdd} className="flex gap-2 mb-4"><input type="text" placeholder="Nova fonte" className="flex-1 border rounded px-3 py-2" value={newSource} onChange={e => setNewSource(e.target.value)} /><button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded"><Plus size={18} /></button></form>
                <div className="bg-white border rounded divide-y">{availableSources.map((source, idx) => (<div key={idx} className="p-3 flex justify-between hover:bg-gray-50"><span className="text-gray-700">{source}</span><button onClick={() => removeSource(source)} className="text-gray-400 hover:text-red-500"><X size={16} /></button></div>))}</div>
            </div>
        </div>
    );
};

export default Settings;