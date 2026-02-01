import React, { useState, useRef } from 'react';
import { useCRM } from '../context/CRMContext';
import { LeadSource, Lead, DealStage } from '../types';
import { Plus, Search, Filter, Phone, Mail, Clock, AlertTriangle, ChevronRight, X, UploadCloud, FileSpreadsheet, CheckCircle, ArrowRight, AlertCircle, Download, Lock, Edit3, MessageSquare, Briefcase, Archive, Layers, PauseCircle, Trash2, Eye } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useNavigate } from 'react-router-dom';

const Leads = () => {
    const navigate = useNavigate();
    // Destructure context
    const { leads, addLead, bulkAddLeads, updateLeadData, assignLead, users, addDeal, availableSources, currentUser, globalSearch, setGlobalSearch, getLeadSLA, getLeadPipelineStatus, addActivity, getLeadActivities, normalizeClassification, isLoading } = useCRM();

    // Show loading state while data is being fetched
    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Carregando leads...</p>
                </div>
            </div>
        );
    }

    // UI State
    const [showModal, setShowModal] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);

    // VIEW MODE: 'queue' (Default, active leads) vs 'history' (Converted/Lost)
    const [viewMode, setViewMode] = useState<'queue' | 'history'>('queue');

    const [filterStatus, setFilterStatus] = useState<string>('ALL');
    const [showOnlySLA, setShowOnlySLA] = useState(false);

    const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
    const [isEditing, setIsEditing] = useState(false);

    // Quick Activity State
    const [newNote, setNewNote] = useState('');

    // Form State
    const [formData, setFormData] = useState({
        name: '', company: '', email: '', phone: '',
        source: availableSources[0] || '', classification: 'Comunidade', desiredCourse: ''
    });

    const [editData, setEditData] = useState<Partial<Lead>>({});

    // --- FILTER LOGIC ---
    // --- FILTER LOGIC ---
    const filteredLeads = leads.filter(lead => {
        const { label } = getLeadPipelineStatus(lead);
        const isFinished = label === 'Convertido' || label === 'Perdido';

        if (viewMode === 'queue' && isFinished) return false;
        if (viewMode === 'history' && !isFinished) return false;

        // Filter Status 'ALL' or specific derived label
        const matchesStatus = filterStatus === 'ALL' || label === filterStatus;

        const term = globalSearch.toLowerCase();
        const matchesSearch = lead.name.toLowerCase().includes(term) || lead.company.toLowerCase().includes(term);
        const sla = getLeadSLA(lead);
        const matchesSLA = !showOnlySLA || (sla.status === 'overdue' || sla.status === 'warning');

        // IMPORTANT: We do NOT filter out 'Incompleto (Sem Negócio)' anymore
        // We want to see them to debug/fix them instead of hiding them
        return matchesStatus && matchesSearch && matchesSLA;
    }).sort((a, b) => {
        if (showOnlySLA) return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    // --- HANDLERS ---

    const handleCreateLead = (e: React.FormEvent) => {
        e.preventDefault();

        // Strict Validation for Manual Creation
        if (addLead(formData)) {
            setShowModal(false);
            setFormData({
                name: '', company: '', email: '', phone: '',
                source: availableSources[0] || '', classification: 'Comunidade', desiredCourse: ''
            });
        }
    };

    const handleUpdateLead = (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedLead) {
            updateLeadData(selectedLead.id, editData);
            setIsEditing(false);
            setSelectedLead(prev => prev ? { ...prev, ...editData } as Lead : null);
        }
    };

    const handleAddNote = () => {
        if (!selectedLead || !newNote.trim()) return;
        addActivity({ type: 'note', content: newNote, leadId: selectedLead.id, performer: currentUser.name });
        setNewNote('');
    };

    const handleDeleteLead = async (leadId: string, leadName: string, e: React.MouseEvent) => {
        e.stopPropagation();

        if (!window.confirm(`Excluir permanentemente o lead "${leadName}"?\n\nTodos os negócios associados serão removidos. Esta ação NÃO pode ser desfeita!`)) {
            return;
        }

        const { supabase } = await import('../services/supabase');
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const response = await fetch(`/api/leads/${leadId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${session.access_token}` }
        });

        if (response.ok) {
            const result = await response.json();
            alert(`Lead excluído com sucesso!${result.deals_removed > 0 ? `\n${result.deals_removed} negócio(s) removido(s).` : ''}`);
            window.location.reload();
        } else {
            const error = await response.json();
            alert(`Erro: ${error.error || 'Falha ao excluir lead'}`);
        }
    };

    const startEditing = () => {
        if (selectedLead) {
            setEditData({
                name: selectedLead.name, company: selectedLead.company, email: selectedLead.email, phone: selectedLead.phone,
                desiredCourse: selectedLead.desiredCourse, classification: selectedLead.classification, source: selectedLead.source
            });
            setIsEditing(true);
        }
    };

    const getClassificationColor = (classification?: string) => {
        if (!classification) return 'bg-gray-100 text-gray-700';
        if (classification.includes('Trabalhador vinculado')) return 'bg-green-100 text-green-800';
        if (classification.includes('Dependente')) return 'bg-blue-100 text-blue-800';
        return 'bg-gray-100 text-gray-700';
    };

    const isAdmin = currentUser.role === 'admin';

    return (
        <div className="space-y-6">
            {/* HEADER & TABS */}
            <div className="flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <h2 className="text-3xl font-bold text-gray-800">Gestão de Leads</h2>
                    <div className="flex gap-2">
                        <button onClick={() => setShowImportModal(true)} className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-gray-50 transition">
                            <UploadCloud size={18} /> Importar
                        </button>
                        <button onClick={() => { setFormData({ ...formData, source: availableSources[0] }); setShowModal(true); }} className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-indigo-700 transition shadow-lg shadow-indigo-200">
                            <Plus size={18} /> Novo Lead
                        </button>
                    </div>
                </div>

                {/* VIEW MODE TABS */}
                <div className="flex border-b border-gray-200">
                    <button onClick={() => { setViewMode('queue'); setFilterStatus('ALL'); }} className={`flex items-center gap-2 px-6 py-3 font-medium text-sm transition-all border-b-2 ${viewMode === 'queue' ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}>
                        <Layers size={18} /> Fila de Trabalho
                        <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs">{leads.filter(l => {
                            const st = getLeadPipelineStatus(l).label;
                            return st !== 'Convertido' && st !== 'Perdido' && (isAdmin || l.ownerId === currentUser.id);
                        }).length}</span>
                    </button>
                    <button onClick={() => { setViewMode('history'); setFilterStatus('ALL'); }} className={`flex items-center gap-2 px-6 py-3 font-medium text-sm transition-all border-b-2 ${viewMode === 'history' ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}>
                        <Archive size={18} /> Histórico / Arquivo
                    </button>
                </div>
            </div>

            {/* FILTERS TOOLBAR */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-wrap gap-4 items-center">
                <div className="flex items-center bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 w-full sm:w-64">
                    <Search size={18} className="text-gray-400 mr-2" />
                    <input type="text" placeholder="Buscar por nome ou empresa" className="bg-transparent border-none outline-none text-sm w-full" value={globalSearch} onChange={e => setGlobalSearch(e.target.value)} />
                </div>

                <div className="flex items-center gap-2">
                    <Filter size={18} className="text-gray-500" />
                    <select className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                        <option value="ALL">Todos os Status</option>
                        {viewMode === 'queue' ? (
                            <>
                                <option value="Novo Lead">Novo Lead</option>
                                <option value="Em Atendimento">Em Atendimento</option>
                                <option value="Qualificado">Qualificado</option>
                                <option value="Proposta Enviada">Proposta Enviada</option>
                                <option value="Em Negociação">Em Negociação</option>
                            </>
                        ) : (
                            <>
                                <option value="Convertido">Convertido</option>
                                <option value="Perdido">Perdido</option>
                            </>
                        )}               </select>
                </div>

                {viewMode === 'queue' && (
                    <button onClick={() => setShowOnlySLA(!showOnlySLA)} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${showOnlySLA ? 'bg-red-50 border-red-200 text-red-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                        <AlertTriangle size={16} className={showOnlySLA ? 'text-red-600' : 'text-gray-400'} />
                        Focar em Atrasados (SLA)
                    </button>
                )}
            </div>

            {/* FILTER DROPDOWN: Mapped to Derived Labels */}
            {viewMode === 'queue' && (
                <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-2">
                    {['ALL', 'Novo Lead', 'Em Atendimento', 'Qualificado', 'Proposta Enviada', 'Em Negociação'].map(st => (
                        <button
                            key={st}
                            onClick={() => setFilterStatus(st)}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${filterStatus === st ? 'bg-indigo-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                        >
                            {st === 'ALL' ? 'Todos' : st}
                        </button>
                    ))}
                </div>
            )}
            {/* DATA TABLE */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-200 text-xs uppercase text-gray-500 font-semibold">
                                <th className="p-4">Lead / Aluno</th>
                                <th className="p-4">Tempo / SLA</th>
                                <th className="p-4">Contato</th>
                                <th className="p-4">Status (Pipeline)</th>
                                <th className="p-4">Responsável</th>
                                <th className="p-4 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredLeads.length > 0 ? (
                                filteredLeads.map(lead => {
                                    const sla = getLeadSLA(lead);
                                    const pipelineStatus = getLeadPipelineStatus(lead);
                                    return (
                                        <tr key={lead.id} className="border-b border-gray-100 hover:bg-gray-50 transition cursor-pointer" onClick={() => setSelectedLead(lead)}>
                                            <td className="p-4">
                                                <div className="flex items-start gap-3">
                                                    <div className="mt-1" title={sla.label}>
                                                        {sla.status === 'overdue' && <AlertTriangle size={18} className="text-red-500 animate-pulse" />}
                                                        {sla.status === 'warning' && <Clock size={18} className="text-yellow-500" />}
                                                        {sla.status === 'handled' && <CheckCircle size={18} className="text-green-500" />}
                                                        {sla.status === 'normal' && <div className="w-4 h-4 rounded-full bg-gray-200"></div>}
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-gray-900">{lead.name}</p>
                                                        <p className="text-xs text-gray-500">{lead.company}</p>
                                                        <div className="mt-1 flex gap-2">
                                                            <span className={`text-[10px] px-1.5 py-0.5 rounded border ${pipelineStatus.colorClass}`}>
                                                                {pipelineStatus.label}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex flex-col gap-1">
                                                    <span className={`text-xs font-bold px-2 py-0.5 rounded w-fit ${sla.status === 'overdue' ? 'bg-red-100 text-red-700' : sla.status === 'warning' ? 'bg-yellow-100 text-yellow-800' : sla.status === 'handled' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                                        {sla.status === 'overdue' ? `+${sla.hoursDiff}h (Atrasado)` : sla.status === 'warning' ? `${sla.hoursDiff}h (Atenção)` : sla.status === 'handled' ? 'Atendido' : `${sla.hoursDiff}h`}
                                                    </span>
                                                    <span className="text-[10px] text-gray-400">Criado: {new Date(lead.createdAt).toLocaleDateString()}</span>
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex flex-col gap-1">
                                                    <div className="flex items-center text-xs text-gray-600"><Mail size={12} className="mr-1" /> {lead.email}</div>
                                                    <div className="flex items-center text-xs text-gray-600"><Phone size={12} className="mr-1" /> {lead.phone}</div>
                                                </div>
                                            </td>
                                            <td className="p-4"><span className={`px-2 py-1 rounded-full text-xs font-semibold ${pipelineStatus.colorClass}`}>{pipelineStatus.label}</span></td>
                                            <td className="p-4" onClick={e => e.stopPropagation()}>
                                                {isAdmin ? (
                                                    <div className="flex items-center gap-2 relative group w-full max-w-[140px]">
                                                        {lead.ownerId && <img src={users.find(u => u.id === lead.ownerId)?.avatar} className="w-6 h-6 rounded-full border border-gray-200 shrink-0" alt="Owner" />}
                                                        <select value={lead.ownerId || ""} onChange={(e) => assignLead(lead.id, e.target.value)} className="text-xs border-none bg-transparent hover:bg-gray-100 rounded px-1 py-1 cursor-pointer outline-none focus:ring-2 focus:ring-indigo-100 w-full text-gray-700 font-medium">
                                                            <option value="" disabled className="text-gray-400">Atribuir...</option>
                                                            {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                                                        </select>
                                                    </div>
                                                ) : (
                                                    lead.ownerId ? <div className="flex items-center gap-2"><img src={users.find(u => u.id === lead.ownerId)?.avatar} className="w-6 h-6 rounded-full" alt="Owner" /><span className="text-sm text-gray-700">{users.find(u => u.id === lead.ownerId)?.name.split(' ')[0]}</span></div> : <span className="text-xs text-gray-400">Não atribuído</span>
                                                )}
                                            </td>
                                            <td className="p-4 text-right" onClick={e => e.stopPropagation()}>
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => setSelectedLead(lead)}
                                                        title="Visualizar"
                                                        className="text-gray-400 hover:text-indigo-600 transition p-2"
                                                    >
                                                        <Eye size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => { setSelectedLead(lead); startEditing(); }}
                                                        title="Editar"
                                                        className="text-gray-400 hover:text-blue-600 transition p-2"
                                                    >
                                                        <Edit3 size={16} />
                                                    </button>
                                                    {isAdmin && (
                                                        <button
                                                            onClick={(e) => handleDeleteLead(lead.id, lead.name, e)}
                                                            title="Excluir lead"
                                                            className="text-gray-400 hover:text-red-600 transition p-2"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })
                            ) : (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center text-gray-400">
                                        {viewMode === 'queue' ? <div className="flex flex-col items-center"><CheckCircle size={48} className="text-green-100 mb-2" /><p>Tudo limpo! Nenhuma pendência na fila de trabalho.</p></div> : <p>Nenhum histórico encontrado com os filtros atuais.</p>}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* New Lead Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-gray-900">Novo Lead</h3>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
                        </div>
                        <form onSubmit={handleCreateLead} className="space-y-4">
                            <div><label className="block text-sm font-medium text-gray-700 mb-1">Nome Completo</label><input required type="text" className="w-full border border-gray-300 rounded-lg px-3 py-2" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} /></div>
                            <div><label className="block text-sm font-medium text-gray-700 mb-1">Empresa</label><input required type="text" className="w-full border border-gray-300 rounded-lg px-3 py-2" value={formData.company} onChange={e => setFormData({ ...formData, company: e.target.value })} /></div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="block text-sm font-medium text-gray-700 mb-1">Email</label><input required type="email" className="w-full border border-gray-300 rounded-lg px-3 py-2" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} /></div>
                                <div><label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label><input required type="tel" className="w-full border border-gray-300 rounded-lg px-3 py-2" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} /></div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Classificação</label>
                                    <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" value={formData.classification} onChange={e => setFormData({ ...formData, classification: e.target.value })}>
                                        <option value="Comunidade">Comunidade</option>
                                        <option value="Trabalhador vinculado à empresa do transporte">Trabalhador vinculado</option>
                                        <option value="Dependente de trabalhador vinculado à empresa do transporte">Dependente</option>
                                    </select>
                                </div>
                                <div><label className="block text-sm font-medium text-gray-700 mb-1">Curso Desejado <span className="text-red-500">*</span></label><input required type="text" className="w-full border border-gray-300 rounded-lg px-3 py-2" value={formData.desiredCourse} onChange={e => setFormData({ ...formData, desiredCourse: e.target.value })} placeholder="Ex: Logística (Obrigatório)" /></div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Origem</label>
                                <select className="w-full border border-gray-300 rounded-lg px-3 py-2" value={formData.source} onChange={e => setFormData({ ...formData, source: e.target.value })}>
                                    {availableSources.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                            <div className="pt-4 flex gap-3">
                                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">Cancelar</button>
                                <button type="submit" className="flex-1 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Criar Lead</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Details / Edit Modal with RBAC */}
            {selectedLead && (
                <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4 sm:p-0">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                            <div>
                                {!isEditing ? (
                                    <>
                                        <h2 className="text-xl font-bold">{selectedLead.name}</h2>
                                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 mt-1">
                                            <p className="text-gray-500 text-sm">{selectedLead.company}</p>
                                            {selectedLead.classification && <span className={`text-xs px-2 py-0.5 rounded-full w-fit ${getClassificationColor(selectedLead.classification)}`}>{selectedLead.classification}</span>}
                                        </div>
                                    </>
                                ) : (<h2 className="text-xl font-bold text-indigo-700">Editando Lead</h2>)}
                            </div>
                            <div className="flex items-center gap-2">
                                {!isEditing && <button onClick={startEditing} className="p-2 text-gray-400 hover:text-indigo-600 rounded-full hover:bg-indigo-50 transition"><Edit3 size={20} /></button>}
                                <button onClick={() => { setSelectedLead(null); setIsEditing(false); }} className="p-2 text-gray-400 hover:text-gray-600"><X size={24} /></button>
                            </div>
                        </div>

                        <div className="p-6">
                            {isEditing ? (
                                <form onSubmit={handleUpdateLead} className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div><label className="block text-sm font-medium text-gray-700 mb-1">Nome</label><input type="text" className="w-full border rounded px-3 py-2" value={editData.name} onChange={e => setEditData({ ...editData, name: e.target.value })} /></div>
                                        <div><label className="block text-sm font-medium text-gray-700 mb-1">Empresa</label><input type="text" className="w-full border rounded px-3 py-2" value={editData.company} onChange={e => setEditData({ ...editData, company: e.target.value })} /></div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div><label className="block text-sm font-medium text-gray-700 mb-1">Email</label><input type="email" className="w-full border rounded px-3 py-2" value={editData.email} onChange={e => setEditData({ ...editData, email: e.target.value })} /></div>
                                        <div><label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label><input type="text" className="w-full border rounded px-3 py-2" value={editData.phone} onChange={e => setEditData({ ...editData, phone: e.target.value })} /></div>
                                    </div>
                                    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                                        <h4 className="text-xs font-bold text-gray-500 uppercase mb-3 flex items-center gap-1">{!isAdmin && <Lock size={12} />} Dados de Classificação</h4>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Classificação {!isAdmin && '(Bloqueado)'}</label>
                                                <select disabled={!isAdmin} className={`w-full border rounded px-3 py-2 text-sm ${!isAdmin ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''}`} value={editData.classification} onChange={e => setEditData({ ...editData, classification: e.target.value })}>
                                                    <option value="Comunidade">Comunidade</option>
                                                    <option value="Trabalhador vinculado à empresa do transporte">Trabalhador vinculado</option>
                                                    <option value="Dependente de trabalhador vinculado à empresa do transporte">Dependente</option>
                                                </select>
                                            </div>
                                            <div><label className="block text-sm font-medium text-gray-700 mb-1">Curso {!isAdmin && '(Bloqueado)'}</label><input type="text" disabled={!isAdmin} className={`w-full border rounded px-3 py-2 ${!isAdmin ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''}`} value={editData.desiredCourse} onChange={e => setEditData({ ...editData, desiredCourse: e.target.value })} /></div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Origem {!isAdmin && '(Bloqueado)'}</label>
                                                <select disabled={!isAdmin} className={`w-full border rounded px-3 py-2 text-sm ${!isAdmin ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''}`} value={editData.source} onChange={e => setEditData({ ...editData, source: e.target.value })}>
                                                    {availableSources.map(s => <option key={s} value={s}>{s}</option>)}
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex gap-3 pt-2">
                                        <button type="button" onClick={() => setIsEditing(false)} className="flex-1 py-2 border rounded hover:bg-gray-50">Cancelar</button>
                                        <button type="submit" className="flex-1 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700">Salvar Alterações</button>
                                    </div>
                                </form>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    <div>
                                        <h4 className="font-semibold text-gray-900 mb-2">Dados de Contato</h4>
                                        <div className="space-y-2 text-sm">
                                            <p><span className="text-gray-500">Email:</span> {selectedLead.email}</p>
                                            <p><span className="text-gray-500">Telefone:</span> {selectedLead.phone}</p>
                                            <p><span className="text-gray-500">Curso:</span> {selectedLead.desiredCourse}</p>
                                            <p><span className="text-gray-500">Origem:</span> {selectedLead.source}</p>
                                            <p><span className="text-gray-500">Criado em:</span> {new Date(selectedLead.createdAt).toLocaleDateString()}</p>
                                            {selectedLead.lostReason && <p className="text-red-500 bg-red-50 p-2 rounded"><span className="font-bold">Motivo da Perda:</span> {selectedLead.lostReason}</p>}
                                        </div>
                                        <div className="mt-6">
                                            <h4 className="font-semibold text-gray-900 mb-2">Ações Rápidas</h4>
                                            {getLeadPipelineStatus(selectedLead).isLinked ? (
                                                <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-3">
                                                    <>
                                                        <p className="text-xs text-indigo-800 font-medium mb-2 flex items-center gap-1"><Briefcase size={12} /> Gerenciado no Pipeline</p>
                                                        <div className="mb-3 p-2 bg-white rounded border border-indigo-100 text-xs"><span className="text-gray-500">Status Atual: </span><span className="font-bold text-indigo-700">{getLeadPipelineStatus(selectedLead).label}</span></div>
                                                        <button onClick={() => navigate('/deals')} className="w-full bg-white border border-indigo-200 text-indigo-600 px-3 py-2 rounded text-sm font-semibold hover:bg-indigo-600 hover:text-white transition flex items-center justify-center gap-2">Ver no Pipeline <ArrowRight size={14} /></button>
                                                    </>
                                                </div>
                                            ) : (
                                                <div className="flex flex-wrap gap-2">
                                                    {/* STRICT RULE: No manual button allowed. Deal creation is fully automated. */}
                                                    <span className="text-xs text-gray-400 italic">Aguardando dados completos para gerar Matrícula...</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="bg-gray-50 p-4 rounded-lg flex flex-col h-full">
                                        <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2"><Clock size={16} /> Histórico (SLA)</h4>
                                        <div className="flex-1 overflow-y-auto mb-4 space-y-3 custom-scrollbar pr-2 max-h-48">
                                            {getLeadActivities(selectedLead.id).map(act => (
                                                <div key={act.id} className="text-xs bg-white p-2 rounded border border-gray-100 shadow-sm">
                                                    <p className="font-bold text-gray-700 mb-0.5">{act.performer}</p>
                                                    <p className="text-gray-600 mb-1">{act.content}</p>
                                                    <p className="text-[10px] text-gray-400 text-right">{new Date(act.timestamp).toLocaleDateString()} {new Date(act.timestamp).toLocaleTimeString()}</p>
                                                </div>
                                            ))}
                                            {getLeadActivities(selectedLead.id).length === 0 && <p className="text-xs text-gray-400 italic text-center">Nenhuma atividade registrada.</p>}
                                        </div>
                                        <div className="mt-auto border-t border-gray-200 pt-3">
                                            <p className="text-xs text-gray-500 mb-2">Registrar Atividade (Zera SLA)</p>
                                            <div className="flex gap-2">
                                                <input type="text" placeholder="Ex: Liguei para o aluno..." className="flex-1 text-xs border border-gray-300 rounded px-2 py-1.5 outline-none focus:border-indigo-500" value={newNote} onChange={(e) => setNewNote(e.target.value)} />
                                                <button onClick={handleAddNote} className="bg-indigo-600 text-white p-1.5 rounded hover:bg-indigo-700" title="Salvar Nota"><MessageSquare size={16} /></button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Import Modal */}
            {showImportModal && <ImportWizard onClose={() => setShowImportModal(false)} />}
        </div>
    );
};

const ImportWizard = ({ onClose }: { onClose: () => void }) => {
    const { leads, bulkAddLeads, availableSources, normalizeClassification, currentUser } = useCRM();
    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [fileData, setFileData] = useState<any[]>([]);
    const [headers, setHeaders] = useState<string[]>([]);
    const [mapping, setMapping] = useState<Record<string, string>>({});

    // SALES FORCE SOURCE: 'Importação - Vendedor'
    const isSales = currentUser.role === 'sales';
    const [source, setSource] = useState(isSales ? 'Importação - Vendedor' : 'Importado');

    const [previewData, setPreviewData] = useState<any[]>([]);
    const [errors, setErrors] = useState<any[]>([]);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const crmFields = [
        { key: 'name', label: 'Nome Completo (Obrigatório)', required: true },
        { key: 'email', label: 'E-mail (Opcional)', required: false },
        { key: 'phone', label: 'Telefone (Opcional)', required: false },
        { key: 'company', label: 'Empresa', required: false },
        { key: 'desiredCourse', label: 'Curso Desejado (Obrigatório para Pipeline)', required: true }, // CHANGED TO TRUE
        { key: 'classification', label: 'Classificação (Obrigatório para Pipeline)', required: true }, // CHANGED TO TRUE
    ];

    const handleDownloadTemplate = () => {
        const ws = XLSX.utils.json_to_sheet([
            { "Nome Completo": "Exemplo Silva", "Email": "exemplo@empresa.com", "Telefone": "11999999999", "Empresa": "Empresa Teste", "Curso Desejado": "Administração", "Classificação": "Comunidade" },
            { "Nome Completo": "Maria Souza", "Email": "maria@loja.com", "Telefone": "21988888888", "Empresa": "Transporte Legal", "Curso Desejado": "Logística", "Classificação": "Trabalhador vinculado à empresa do transporte" }
        ]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Modelo de Importação");
        XLSX.writeFile(wb, "modelo_leads_nexus.xlsx");
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (evt) => {
            const bstr = evt.target?.result;
            if (typeof bstr !== 'string') return;
            const wb = XLSX.read(bstr, { type: 'binary' });
            const wsname = wb.SheetNames[0];
            const ws = wb.Sheets[wsname];
            const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
            if (data.length > 0) {
                const headerRow = data[0] as string[];
                const rows = data.slice(1) as any[];
                setHeaders(headerRow);
                setFileData(rows);
                const autoMap: Record<string, string> = {};
                headerRow.forEach((h, idx) => {
                    const lower = h.toLowerCase();
                    if (lower.includes('nome')) autoMap['name'] = idx.toString();
                    else if (lower.includes('mail')) autoMap['email'] = idx.toString();
                    else if (lower.includes('tel') || lower.includes('cel') || lower.includes('fone')) autoMap['phone'] = idx.toString();
                    else if (lower.includes('empresa') || lower.includes('company')) autoMap['company'] = idx.toString();
                    else if (lower.includes('curso')) autoMap['desiredCourse'] = idx.toString();
                    else if (lower.includes('class')) autoMap['classification'] = idx.toString();
                });
                setMapping(autoMap);
                setStep(2);
            }
        };
        reader.readAsBinaryString(file);
    };

    const processData = () => {
        const processed = [];
        const errs = [];
        const existingEmails = new Set(leads.map(l => l.email));
        const existingPhones = new Set(leads.map(l => l.phone));

        for (let i = 0; i < fileData.length; i++) {
            const row = fileData[i];
            const lead: any = { source: source };
            let hasError = false;
            let errorMsg = '';

            for (const [field, colIdx] of Object.entries(mapping)) {
                if (colIdx !== '') lead[field] = row[parseInt(String(colIdx))];
            }

            lead.name = lead.name ? String(lead.name).trim() : '';
            lead.email = lead.email ? String(lead.email).trim() : '';
            lead.phone = lead.phone ? String(lead.phone).trim() : '';
            lead.company = lead.company ? String(lead.company).trim() : '';
            lead.desiredCourse = lead.desiredCourse ? String(lead.desiredCourse).trim() : '';

            // STRICT CLASSIFICATION VALIDATION
            const rawClass = lead.classification ? String(lead.classification) : '';
            const normalizedClass = normalizeClassification(rawClass);

            if (!normalizedClass) {
                hasError = true;
                errorMsg = `Classificação inválida ou desconhecida: "${rawClass || 'Vazio'}".`;
            } else {
                lead.classification = normalizedClass;
            }

            // AT LEAST ONE CONTACT METHOD CHECK (OR condition)
            const isEmailValid = lead.email && lead.email.includes('@');
            const isPhoneValid = lead.phone && lead.phone.replace(/\D/g, '').length >= 8;

            if (!lead.name) {
                hasError = true; errorMsg = 'Nome é obrigatório.';
            } else if (!lead.desiredCourse) {
                hasError = true; errorMsg = 'Curso Desejado é obrigatório para gerar Matrícula.';
            } else if (!isEmailValid && !isPhoneValid) {
                // Both are invalid or missing
                hasError = true;
                if (lead.email || lead.phone) {
                    errorMsg = 'Contatos inválidos (E-mail s/ @ ou Tel < 8 dígitos).';
                } else {
                    errorMsg = 'Pelo menos um contato (E-mail ou Telefone) é necessário.';
                }
            }
            // Duplication Checks (Only run if the specific field is valid)
            else if (isEmailValid && existingEmails.has(String(lead.email))) {
                hasError = true; errorMsg = 'E-mail duplicado no sistema.';
            } else if (isPhoneValid && existingPhones.has(String(lead.phone))) {
                hasError = true; errorMsg = 'Telefone duplicado no sistema.';
            }

            if (hasError) {
                errs.push({ row: i + 2, name: lead.name || 'Desconhecido', error: errorMsg });
            } else {
                processed.push(lead);
            }
        }

        setPreviewData(processed);
        setErrors(errs);
        setStep(3);
    };

    const handleConfirm = () => {
        bulkAddLeads(previewData);
        alert(`${previewData.length} leads importados com sucesso!`);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl h-[80vh] flex flex-col">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                    <h3 className="text-xl font-bold text-gray-900">Importar Leads (Excel/CSV)</h3>
                    <button onClick={onClose}><X size={24} className="text-gray-400 hover:text-gray-600" /></button>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    <div className="flex items-center justify-between mb-8 px-12">
                        {[1, 2, 3].map(s => (
                            <div key={s} className="flex flex-col items-center gap-2">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${step >= s ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-400'}`}>{s}</div>
                                <span className="text-xs text-gray-500 font-medium">{s === 1 ? 'Upload' : s === 2 ? 'Mapeamento' : 'Validação'}</span>
                            </div>
                        ))}
                    </div>

                    {step === 1 && (
                        <div className="flex flex-col gap-4 h-full">
                            <div className="flex flex-col items-center justify-center flex-1 border-2 border-dashed border-gray-300 rounded-xl bg-gray-50 p-8 text-center cursor-pointer hover:bg-indigo-50 hover:border-indigo-300 transition" onClick={() => fileInputRef.current?.click()}>
                                <FileSpreadsheet size={48} className="text-indigo-400 mb-4" />
                                <p className="text-gray-700 font-medium mb-1">Clique para selecionar ou arraste sua planilha</p>
                                <p className="text-sm text-gray-500">Suporta .xlsx ou .csv</p>
                                <input type="file" accept=".csv, .xlsx, .xls" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
                            </div>
                            <div className="text-center"><button onClick={handleDownloadTemplate} className="text-indigo-600 text-sm font-medium hover:underline flex items-center justify-center gap-2 mx-auto"><Download size={16} /> Baixar modelo de planilha</button></div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-6">
                            <div className="bg-blue-50 border border-blue-100 p-4 rounded-lg text-sm text-blue-800"><p>Relacione as colunas do seu arquivo com os campos do CRM.</p></div>
                            <div className="space-y-4">
                                {crmFields.map(field => (
                                    <div key={field.key} className="grid grid-cols-2 gap-4 items-center">
                                        <label className="text-sm font-medium text-gray-700">{field.label}</label>
                                        <select className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" value={mapping[field.key] || ''} onChange={(e) => setMapping({ ...mapping, [field.key]: e.target.value })}>
                                            <option value="">-- Ignorar --</option>
                                            {headers.map((h, i) => <option key={i} value={i}>{h}</option>)}
                                        </select>
                                    </div>
                                ))}
                                <div className="grid grid-cols-2 gap-4 items-center pt-4 border-t border-gray-100">
                                    <label className="text-sm font-medium text-gray-700">Fonte Padrão</label>
                                    <select
                                        disabled={isSales}
                                        className={`border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none ${isSales ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''}`}
                                        value={source}
                                        onChange={(e) => setSource(e.target.value)}
                                    >
                                        <option value="Importado">Importado (Padrão)</option>
                                        {availableSources.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-3 gap-4">
                                <div className="p-4 bg-green-50 border border-green-100 rounded-lg text-center"><h4 className="text-2xl font-bold text-green-600">{previewData.length}</h4><p className="text-xs text-green-800 font-medium">Leads Válidos</p></div>
                                <div className="p-4 bg-red-50 border border-red-100 rounded-lg text-center"><h4 className="text-2xl font-bold text-red-600">{errors.length}</h4><p className="text-xs text-red-800 font-medium">Erros / Rejeitados</p></div>
                                <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg text-center"><h4 className="text-2xl font-bold text-gray-600">{fileData.length}</h4><p className="text-xs text-gray-600 font-medium">Total de Linhas</p></div>
                            </div>

                            {errors.length > 0 && (
                                <div className="border border-red-200 rounded-lg overflow-hidden">
                                    <div className="bg-red-50 px-4 py-2 border-b border-red-200 text-xs font-bold text-red-700 uppercase flex items-center gap-2"><AlertCircle size={14} /> Relatório de Erros (Estes leads serão ignorados)</div>
                                    <div className="max-h-48 overflow-y-auto">
                                        <table className="w-full text-xs text-left">
                                            <thead className="bg-gray-50 text-gray-500"><tr><th className="px-4 py-2">Linha</th><th className="px-4 py-2">Nome</th><th className="px-4 py-2">Motivo</th></tr></thead>
                                            <tbody>{errors.map((err, i) => (<tr key={i} className="border-b border-gray-100 last:border-0"><td className="px-4 py-2 text-gray-500">#{err.row}</td><td className="px-4 py-2 font-medium">{err.name}</td><td className="px-4 py-2 text-red-600">{err.error}</td></tr>))}</tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {previewData.length > 0 && (
                                <div className="border border-gray-200 rounded-lg overflow-hidden">
                                    <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 text-xs font-bold text-gray-700 uppercase">Preview (Primeiros 5 registros)</div>
                                    <table className="w-full text-xs text-left">
                                        <thead className="bg-gray-50 text-gray-500"><tr><th className="px-4 py-2">Nome</th><th className="px-4 py-2">Email</th><th className="px-4 py-2">Classificação</th></tr></thead>
                                        <tbody>{previewData.slice(0, 5).map((row, i) => (<tr key={i} className="border-b border-gray-100 last:border-0"><td className="px-4 py-2 font-medium">{row.name}</td><td className="px-4 py-2 text-gray-500">{row.email || '-'}</td><td className="px-4 py-2 text-gray-500">{row.classification}</td></tr>))}</tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="p-6 border-t border-gray-100 flex justify-between">
                    {step > 1 ? <button onClick={() => setStep(prev => (prev > 1 ? prev - 1 : 1) as 1 | 2 | 3)} className="px-4 py-2 text-gray-600 hover:text-gray-900 text-sm font-medium">Voltar</button> : <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:text-gray-900 text-sm font-medium">Cancelar</button>}
                    {step === 1 && <button disabled className="px-6 py-2 bg-gray-200 text-gray-400 rounded-lg text-sm font-medium cursor-not-allowed">Selecione um arquivo</button>}
                    {step === 2 && <button onClick={processData} className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium flex items-center gap-2">Validar Dados <ArrowRight size={16} /></button>}
                    {step === 3 && <button onClick={handleConfirm} disabled={previewData.length === 0} className={`px-6 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${previewData.length > 0 ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}><CheckCircle size={16} /> Confirmar Importação</button>}
                </div>
            </div>
        </div>
    );
};

export default Leads;