import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, Briefcase, BarChart2, Settings, LogOut, List } from 'lucide-react';
import { useCRM } from '../context/CRMContext';
import { NotificationCenter } from './NotificationCenter';

const Layout = () => {
  const { currentUser, logout, globalSearch, setGlobalSearch } = useCRM();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!currentUser) return null; // Should be handled by router, but failsafe

  return (
    <div className="flex h-screen bg-gray-50 font-sans text-gray-900">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col shadow-xl">
        <div className="p-6 border-b border-slate-700">
          <h1 className="text-2xl font-bold tracking-tight text-indigo-400">Convert CRM</h1>
          <p className="text-xs text-slate-400 mt-1">Gestão de Alta Performance</p>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2">
          <NavItem to="/" icon={<LayoutDashboard size={20} />} label="Dashboard" />
          <NavItem to="/leads" icon={<Users size={20} />} label="Leads" />
          <NavItem to="/deals" icon={<Briefcase size={20} />} label="Negócios" />
          <NavItem to="/waiting-list" icon={<List size={20} />} label="Lista de Espera" />
          <NavItem to="/reports" icon={<BarChart2 size={20} />} label="Relatórios" />
        </nav>

        <div className="p-4 border-t border-slate-700 space-y-2">
          <NavItem to="/settings" icon={<Settings size={20} />} label="Configurações" />

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-red-400 hover:bg-slate-800 hover:text-red-300 mt-2"
          >
            <LogOut size={20} />
            <span className="font-medium text-sm">Sair</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8 shadow-sm">


          <div className="flex items-center gap-6">
            <NotificationCenter />
            <div className="flex items-center gap-3 pl-6 border-l border-gray-200">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-gray-900">{currentUser.name}</p>
                <p className="text-xs text-gray-500 capitalize">{currentUser.role === 'admin' ? 'Gestor (Admin)' : 'Vendedor'}</p>
              </div>
              <img
                src={currentUser.avatar}
                alt="Profile"
                className="w-10 h-10 rounded-full border-2 border-indigo-100 object-cover"
              />
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

const NavItem = ({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) => (
  <NavLink
    to={to}
    className={({ isActive }) =>
      `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive
        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50'
        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
      }`
    }
  >
    {icon}
    <span className="font-medium text-sm">{label}</span>
  </NavLink>
);

export default Layout;