import React, { useState } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Leads from './pages/Leads';
import Deals from './pages/Deals';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import LoginPage from './pages/LoginPage';
import { useCRM } from './context/CRMContext';
import { Lock } from 'lucide-react';

// --- ROUTE GUARD COMPONENT ---
const ProtectedRoute = ({ children }: { children?: React.ReactNode }) => {
    const { currentUser } = useCRM();
    const location = useLocation();

    if (!currentUser) {
        return <Navigate to="/login" replace state={{ from: location }} />;
    }

    if (currentUser.mustChangePassword) {
        return <ForcePasswordChange />;
    }

    return <>{children}</>;
};

// --- FORCE PASSWORD CHANGE SCREEN ---
const ForcePasswordChange = () => {
    const { changeMyPassword, currentUser } = useCRM();
    const [oldPwd, setOldPwd] = useState('');
    const [p1, setP1] = useState('');
    const [p2, setP2] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (p1.length < 6) return alert("Senha muito curta.");
        if (p1 !== p2) return alert("Senhas não conferem.");

        setLoading(true);
        try {
            const success = await changeMyPassword(p1, oldPwd);
            if (!success) {
                alert("A senha atual informada está incorreta.");
            }
        } catch (error) {
            console.error("Error changing password:", error);
            alert("Erro ao trocar senha. Tente novamente.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
            <div className="bg-white p-8 rounded-xl shadow-xl max-w-md w-full">
                <div className="flex flex-col items-center mb-6">
                    <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center text-amber-600 mb-3">
                        <Lock size={24} />
                    </div>
                    <h2 className="text-xl font-bold text-gray-800">Troca de Senha Obrigatória</h2>
                    <p className="text-center text-sm text-gray-500 mt-2">
                        Olá, <strong>{currentUser?.name}</strong>. Por segurança, você precisa definir uma nova senha antes de continuar.
                    </p>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Senha Atual (Temporária)</label>
                        <input type="password" required className="w-full border rounded p-2" value={oldPwd} onChange={e => setOldPwd(e.target.value)} />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Nova Senha</label>
                        <input type="password" required className="w-full border rounded p-2" value={p1} onChange={e => setP1(e.target.value)} />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Confirmar Senha</label>
                        <input type="password" required className="w-full border rounded p-2" value={p2} onChange={e => setP2(e.target.value)} />
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-indigo-600 text-white py-2 rounded font-bold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Alterando senha...' : 'Definir Senha e Entrar'}
                    </button>
                </form>
            </div>
        </div>
    );
};

// --- MAIN APP ---

const App = () => {
    const { isLoading } = useCRM();

    if (isLoading) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center">
                <div className="flex flex-col items-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mb-4"></div>
                    <p className="text-gray-400 text-sm">Validando sessão...</p>
                </div>
            </div>
        );
    }

    return (
        <HashRouter>
            <Routes>
                <Route path="/login" element={<LoginPage />} />

                <Route path="/" element={
                    <ProtectedRoute>
                        <Layout />
                    </ProtectedRoute>
                }>
                    <Route index element={<Dashboard />} />
                    <Route path="leads" element={<Leads />} />
                    <Route path="deals" element={<Deals />} />
                    <Route path="waiting-list" element={<Deals />} />
                    <Route path="reports" element={<Reports />} />
                    <Route path="settings" element={<Settings />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Route>
            </Routes>
        </HashRouter>
    );
};

export default App;