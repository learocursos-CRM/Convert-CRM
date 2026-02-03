import React, { useState } from 'react';
import { useCRM } from '../context/CRMContext';
import { Users, Filter, Tags, Building, Shield } from 'lucide-react';

// Seções de Configuração
import ProfileSettings from '../components/settings/ProfileSettings';
import GeneralSettings from '../components/settings/GeneralSettings';
import UserSettings from '../components/settings/UserSettings';
import FunnelSettings from '../components/settings/FunnelSettings';
import SourcesSettings from '../components/settings/SourcesSettings';

const Settings = () => {
    const { currentUser } = useCRM();
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

export default Settings;