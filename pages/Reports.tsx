import React, { useState, useMemo, useEffect } from 'react';
import { useCRM } from '../context/CRMContext';
import {
  PieChart, Pie, Cell, Legend, ResponsiveContainer, Tooltip,
  FunnelChart, Funnel, LabelList
} from 'recharts';
import {
  Download, Calendar, Users, Target,
  TrendingUp, AlertTriangle, Clock
} from 'lucide-react';
// import { LeadStatus } from '../types'; // Removed

const Reports = () => {
  const { leads, users, currentUser, getLeadPipelineStatus } = useCRM(); // 'leads' here is already filtered by RBAC

  // --- State for Filters ---
  const [dateRange, setDateRange] = useState('30_DAYS');
  const [selectedOwner, setSelectedOwner] = useState('ALL');
  const [selectedSource, setSelectedSource] = useState('ALL');

  // RBAC: Force owner selection for Sales
  useEffect(() => {
    if (currentUser.role !== 'admin') {
      setSelectedOwner(currentUser.id);
    }
  }, [currentUser]);

  // --- Aggregation & Logic ---
  const filteredLeads = useMemo(() => {
    const now = new Date();
    return leads.filter(lead => {
      // 1. Date Filter
      const leadDate = new Date(lead.createdAt);
      let dateMatch = true;
      if (dateRange === '7_DAYS') {
        dateMatch = (now.getTime() - leadDate.getTime()) / (1000 * 3600 * 24) <= 7;
      } else if (dateRange === '30_DAYS') {
        dateMatch = (now.getTime() - leadDate.getTime()) / (1000 * 3600 * 24) <= 30;
      } else if (dateRange === '90_DAYS') {
        dateMatch = (now.getTime() - leadDate.getTime()) / (1000 * 3600 * 24) <= 90;
      }

      // 2. Owner Filter (Safety check, though 'leads' is already filtered from context)
      const ownerMatch = selectedOwner === 'ALL' || lead.ownerId === selectedOwner;
      const sourceMatch = selectedSource === 'ALL' || lead.source === selectedSource;

      return dateMatch && ownerMatch && sourceMatch;
    });
  }, [leads, dateRange, selectedOwner, selectedSource]);

  // KPI Calculations
  const totalLeads = filteredLeads.length;
  const convertedLeads = filteredLeads.filter(l => getLeadPipelineStatus(l).label === 'Convertido').length;
  const conversionRate = totalLeads > 0 ? ((convertedLeads / totalLeads) * 100).toFixed(1) : '0.0';
  const lostLeads = filteredLeads.filter(l => getLeadPipelineStatus(l).label === 'Perdido').length;

  // 1. Funnel Data
  const funnelData = useMemo(() => {
    const counts: Record<string, number> = {
      'Novo Lead': 0,
      'Em Atendimento': 0, // Maps to IN_PROGRESS
      'Qualificado': 0, // Maps to IN_PROGRESS (grouped?) or separate? Let's treat them as progress.
      'Proposta Enviada': 0,
      'Em Negociação': 0,
      'Convertido': 0,
    };

    // Simplification for the chart: Grouping stages into the main 4 status buckets
    const bucketCounts = {
      'Novos': 0,
      'Em Andamento': 0,
      'Processados': 0,
      'Convertidos': 0
    };

    filteredLeads.forEach(l => {
      const label = getLeadPipelineStatus(l).label;
      if (label === 'Novo Lead') bucketCounts['Novos']++;
      else if (['Em Atendimento', 'Qualificado'].includes(label)) bucketCounts['Em Andamento']++;
      else if (['Proposta Enviada', 'Em Negociação'].includes(label)) bucketCounts['Processados']++;
      else if (label === 'Convertido') bucketCounts['Convertidos']++;
    });

    return [
      { id: 'new', name: 'Novos', value: bucketCounts['Novos'], fill: '#ef4444', label: `Novos: ${bucketCounts['Novos']}` },
      { id: 'progress', name: 'Em Andamento', value: bucketCounts['Em Andamento'], fill: '#f97316', label: `Em Andamento: ${bucketCounts['Em Andamento']}` },
      { id: 'processed', name: 'Processados', value: bucketCounts['Processados'], fill: '#eab308', label: `Processados: ${bucketCounts['Processados']}` },
      { id: 'converted', name: 'Convertidos', value: bucketCounts['Convertidos'], fill: '#22c55e', label: `Convertidos: ${bucketCounts['Convertidos']}` },
    ].filter(item => item.value > 0);
  }, [filteredLeads, getLeadPipelineStatus]);

  // 2. Source Data
  const sourceData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredLeads.forEach(l => {
      counts[l.source] = (counts[l.source] || 0) + 1;
    });
    return Object.keys(counts).map((key, index) => ({
      name: key, value: counts[key]
    })).sort((a, b) => b.value - a.value);
  }, [filteredLeads]);

  const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b', '#3b82f6'];

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-800">Relatórios de Performance</h2>
          <p className="text-gray-500">
            {currentUser.role === 'admin' ? 'Visão global da operação.' : 'Acompanhe seus resultados individuais.'}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <div className="relative">
            <select
              value={dateRange}
              onChange={e => setDateRange(e.target.value)}
              className="appearance-none bg-white border border-gray-200 text-gray-700 py-2 pl-4 pr-8 rounded-lg shadow-sm outline-none"
            >
              <option value="7_DAYS">Últimos 7 dias</option>
              <option value="30_DAYS">Últimos 30 dias</option>
              <option value="90_DAYS">Últimos 3 meses</option>
              <option value="ALL">Todo o período</option>
            </select>
            <Calendar className="absolute right-2 top-2.5 text-gray-400 pointer-events-none" size={16} />
          </div>

          <div className="relative">
            <select
              value={selectedOwner}
              onChange={e => setSelectedOwner(e.target.value)}
              disabled={currentUser.role !== 'admin'}
              className={`appearance-none bg-white border border-gray-200 text-gray-700 py-2 pl-4 pr-8 rounded-lg shadow-sm outline-none ${currentUser.role !== 'admin' ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : ''
                }`}
            >
              <option value="ALL">Todos os Vendedores</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
            <Users className="absolute right-2 top-2.5 text-gray-400 pointer-events-none" size={16} />
          </div>

          {currentUser.role === 'admin' && (
            <button className="flex items-center gap-2 bg-indigo-50 text-indigo-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-100 transition">
              <Download size={16} /> Exportar
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <ReportCard
          title="Total de Leads"
          value={totalLeads}
          icon={<Target size={24} className="text-blue-600" />}
          bg="bg-blue-50"
          subtext="no período"
        />
        <ReportCard
          title="Conversões"
          value={convertedLeads}
          icon={<TrendingUp size={24} className="text-green-600" />}
          bg="bg-green-50"
          subtext={`${conversionRate}% de conversão`}
        />
        <ReportCard
          title="Perdidos"
          value={lostLeads}
          icon={<AlertTriangle size={24} className="text-red-600" />}
          bg="bg-red-50"
          subtext="Leads não convertidos"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-lg font-bold text-gray-800 mb-6">Funil de Vendas</h3>
          <div className="h-80 w-full flex justify-center">
            {funnelData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <FunnelChart>
                  <Tooltip />
                  <Funnel dataKey="value" data={funnelData} isAnimationActive>
                    <LabelList position="right" fill="#374151" stroke="none" dataKey="label" />
                  </Funnel>
                </FunnelChart>
              </ResponsiveContainer>
            ) : <div className="text-gray-400 m-auto">Sem dados</div>}
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-lg font-bold text-gray-800 mb-6">Origem</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={sourceData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                  {sourceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

const ReportCard = ({ title, value, icon, bg, subtext }: any) => (
  <div className={`p-6 rounded-xl border border-gray-200 bg-white shadow-sm flex flex-col justify-between`}>
    <div className="flex justify-between items-start mb-4">
      <div>
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <h3 className="text-3xl font-bold text-gray-900 mt-1">{value}</h3>
      </div>
      <div className={`p-3 rounded-lg ${bg}`}>
        {icon}
      </div>
    </div>
    <p className={`text-xs text-gray-400`}>{subtext}</p>
  </div>
);

export default Reports;