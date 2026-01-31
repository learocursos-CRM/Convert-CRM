import React, { useState, useMemo } from 'react';
import { useCRM } from '../context/CRMContext';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { DollarSign, Users, TrendingUp, AlertCircle, Calendar } from 'lucide-react';
import { DealStage } from '../types';

const Dashboard = () => {
  const { leads, deals, getLeadPipelineStatus } = useCRM();
  const [dateRange, setDateRange] = useState('THIS_MONTH');

  // --- Generate Previous Months Options (Last 6 months) ---
  const monthOptions = useMemo(() => {
    const options = [];
    const today = new Date();
    // Generate current + 5 previous months
    for (let i = 0; i < 6; i++) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      // Format label (e.g., "Outubro 2023")
      const label = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
      // Capitalize first letter
      const formattedLabel = label.charAt(0).toUpperCase() + label.slice(1);
      options.push({ value, label: formattedLabel });
    }
    return options;
  }, []);

  // --- Filtering Logic ---

  const checkDateRange = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();

    // Check for "YYYY-MM" specific month format
    if (dateRange.match(/^\d{4}-\d{2}$/)) {
      const [year, month] = dateRange.split('-').map(Number);
      return date.getFullYear() === year && (date.getMonth() + 1) === month;
    }

    switch (dateRange) {
      case 'THIS_MONTH':
        return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
      case 'LAST_MONTH':
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        return date.getMonth() === lastMonth.getMonth() && date.getFullYear() === lastMonth.getFullYear();
      case 'LAST_3_MONTHS':
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(now.getMonth() - 3);
        return date >= threeMonthsAgo;
      case 'THIS_YEAR':
        return date.getFullYear() === now.getFullYear();
      case 'ALL':
        return true;
      default:
        return true;
    }
  };

  const filteredLeads = useMemo(() => {
    return leads.filter(l => checkDateRange(l.createdAt));
  }, [leads, dateRange]);

  const filteredDeals = useMemo(() => {
    return deals.filter(d => checkDateRange(d.expectedCloseDate));
  }, [deals, dateRange]);

  // --- Metrics Calculation based on Filtered Data ---

  const totalActiveLeads = filteredLeads.filter(l => {
    const st = getLeadPipelineStatus(l).label;
    return st !== 'Convertido' && st !== 'Perdido';
  }).length;

  const convertedLeads = filteredLeads.filter(l => getLeadPipelineStatus(l).label === 'Convertido' || getLeadPipelineStatus(l).label === 'Perdido').length;
  const conversions = filteredLeads.filter(l => getLeadPipelineStatus(l).label === 'Convertido').length;
  const conversionRate = convertedLeads > 0 ? ((conversions / convertedLeads) * 100).toFixed(1) : '0.0';

  // Revenue Metrics
  const totalRevenue = filteredDeals.reduce((acc, deal) => acc + (deal.stage === DealStage.WON ? deal.value : 0), 0);
  const potentialRevenue = filteredDeals.reduce((acc, deal) => acc + (deal.stage !== DealStage.LOST && deal.stage !== DealStage.WON ? deal.value : 0), 0);

  // Chart Data Preparation
  // Chart Data Preparation - Funnel based on Derived Status Labels
  const funnelData = [
    { name: 'Novos', value: filteredLeads.filter(l => getLeadPipelineStatus(l).label === 'Novo Lead').length },
    { name: 'Em Andamento', value: filteredLeads.filter(l => ['Em Atendimento', 'Qualificado'].includes(getLeadPipelineStatus(l).label)).length },
    { name: 'Processados', value: filteredLeads.filter(l => ['Proposta Enviada', 'Em Negociação'].includes(getLeadPipelineStatus(l).label)).length },
    { name: 'Convertidos', value: filteredLeads.filter(l => getLeadPipelineStatus(l).label === 'Convertido').length },
  ];

  const sourceCounts = filteredLeads.reduce((acc, lead) => {
    acc[lead.source] = (acc[lead.source] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const sourceData = Object.keys(sourceCounts).map(source => ({
    name: source,
    value: sourceCounts[source]
  }));

  const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b'];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-800">Visão Geral</h2>
          <p className="text-gray-500">Acompanhe as métricas vitais da operação de matrículas.</p>
        </div>

        {/* Date Filter Dropdown */}
        <div className="relative">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="appearance-none bg-white border border-gray-200 text-gray-700 py-2 pl-4 pr-10 rounded-lg shadow-sm outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer font-medium text-sm w-48"
          >
            <optgroup label="Períodos Relativos">
              <option value="THIS_MONTH">Este Mês</option>
              <option value="LAST_MONTH">Mês Passado</option>
              <option value="LAST_3_MONTHS">Últimos 3 Meses</option>
              <option value="THIS_YEAR">Este Ano</option>
              <option value="ALL">Todo o Período</option>
            </optgroup>
            <optgroup label="Meses Anteriores">
              {monthOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </optgroup>
          </select>
          <Calendar className="absolute right-3 top-2.5 text-gray-400 pointer-events-none" size={16} />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KpiCard
          title="Leads Ativos"
          value={totalActiveLeads.toString()}
          icon={<Users size={24} className="text-blue-600" />}
          trend="No período selecionado"
          color="bg-blue-50 border-blue-100"
        />
        <KpiCard
          title="Taxa de Conversão"
          value={`${conversionRate}%`}
          icon={<TrendingUp size={24} className="text-green-600" />}
          trend="Conversão efetiva"
          color="bg-green-50 border-green-100"
        />
        <KpiCard
          title="Receita Confirmada"
          value={`R$ ${totalRevenue.toLocaleString('pt-BR')}`}
          icon={<DollarSign size={24} className="text-indigo-600" />}
          trend="Matrículas ganhas"
          color="bg-indigo-50 border-indigo-100"
        />
        <KpiCard
          title="Pipeline Aberto"
          value={`R$ ${potentialRevenue.toLocaleString('pt-BR')}`}
          icon={<AlertCircle size={24} className="text-amber-600" />}
          trend="Potencial de matrícula"
          color="bg-amber-50 border-amber-100"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Funnel Chart */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-lg font-bold text-gray-800 mb-6">Funil de Leads (Quantidade)</h3>
          <div className="h-80">
            {funnelData.reduce((acc, item) => acc + item.value, 0) > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={funnelData}
                  margin={{ top: 20, right: 30, left: 40, bottom: 5 }}
                >
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12 }} />
                  <Tooltip cursor={{ fill: 'transparent' }} />
                  <Bar dataKey="value" fill="#4f46e5" radius={[0, 4, 4, 0]} barSize={32} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400 text-sm">
                Sem dados para o período selecionado
              </div>
            )}
          </div>
        </div>

        {/* Source Chart */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-lg font-bold text-gray-800 mb-6">Origem dos Leads</h3>
          <div className="h-80">
            {sourceData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={sourceData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    fill="#8884d8"
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {sourceData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400 text-sm">
                Sem dados para o período selecionado
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const KpiCard = ({ title, value, icon, trend, color }: { title: string; value: string; icon: React.ReactNode; trend: string; color: string }) => (
  <div className={`p-6 rounded-xl border ${color} transition-all hover:shadow-md`}>
    <div className="flex justify-between items-start mb-4">
      <div>
        <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
        <h3 className="text-2xl font-bold text-gray-900">{value}</h3>
      </div>
      <div className="p-2 bg-white rounded-lg shadow-sm">
        {icon}
      </div>
    </div>
    <div className="flex items-center text-xs font-medium text-gray-500">
      <span>{trend}</span>
    </div>
  </div>
);

export default Dashboard;