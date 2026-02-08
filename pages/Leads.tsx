import React, { useState } from 'react';
import { useCRM } from '../context/CRMContext';
import { Lead } from '../types';
import { Plus, Search, Filter, Phone, Mail, Clock, AlertTriangle, CheckCircle, Edit3, Trash2, Eye, Layers, Archive, UploadCloud } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useLeadFilters } from '../hooks/useLeadFilters';
// VirtualList removed for build fix

// Modais extraídos
import NewLeadModal from '../components/modals/NewLeadModal';
import LeadDetailsModal from '../components/modals/LeadDetailsModal';
import ImportWizard from '../components/modals/ImportWizard';
// Virtualization imports removed for build stability



const Leads = () => {
    const navigate = useNavigate();
    const {
        leads, addLead, bulkAddLeads, updateLeadData, assignLead, users,
        availableSources, currentUser,
        getLeadSLA, getLeadPipelineStatus, addActivity, normalizeClassification,
        isLoading, deleteLead
    } = useCRM();

    // Hook de Filtros
    const {
        filteredLeads,
        filters,
        setSearchTerm,
        setStatusFilter,
        setViewMode,
        toggleSLA,
        availableCourses, // New
        setCourse // New
    } = useLeadFilters({
        leads,
        getPipelineStatus: getLeadPipelineStatus,
        getSLA: getLeadSLA
    });

    const [searchParams] = useSearchParams();

    // ... (keep states)
    const [showModal, setShowModal] = useState(false);

    // Auto-open lead from URL param (Notification click)
    React.useEffect(() => {
        const highlightId = searchParams.get('highlight');
        if (highlightId && leads.length > 0) {
            const found = leads.find(l => l.id === highlightId);
            if (found) {
                setSelectedLead(found);
            }
        }
    }, [searchParams, leads]);
    const [showImportModal, setShowImportModal] = useState(false);
    const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [newNote, setNewNote] = useState('');

    // Estados de Formulário e Handlers (MANTIDOS)
    const [formData, setFormData] = useState({
        name: '', company: '', email: '', phone: '',
        source: availableSources[0] || '', classification: 'Comunidade', desiredCourse: ''
    });
    const [editData, setEditData] = useState<Partial<Lead>>({});

    // ... (handlers keep existing logic)
    const handleCreateLead = async (e: React.FormEvent) => {
        e.preventDefault();
        const success = await addLead(formData);
        if (success) {
            setShowModal(false);
            setFormData({
                name: '', company: '', email: '', phone: '',
                source: availableSources[0] || '', classification: 'Comunidade', desiredCourse: ''
            });
        }
    };

    // ... (Update, Note, Delete handlers kept as is)
    const handleUpdateLead = async (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedLead) {
            await updateLeadData(selectedLead.id, editData);
            setIsEditing(false);
            setSelectedLead(prev => prev ? { ...prev, ...editData } as Lead : null);
        }
    };

    const handleAddNote = async () => {
        if (!selectedLead || !newNote.trim()) return false;
        const success = await addActivity({ type: 'note', content: newNote, leadId: selectedLead.id, performer: currentUser.name });
        if (success) setNewNote('');
        return success;
    };

    const handleDeleteLead = async (leadId: string, leadName: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!window.confirm(`Excluir permanentemente o lead "${leadName}"?`)) return;
        await deleteLead(leadId);
    };

    const startEditing = (lead: Lead) => {
        setEditData({
            name: lead.name, company: lead.company, email: lead.email, phone: lead.phone,
            desiredCourse: lead.desiredCourse, classification: lead.classification, source: lead.source
        });
        setSelectedLead(lead);
        setIsEditing(true);
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
            <div className="flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <h2 className="text-3xl font-bold text-gray-800">Gestão de Leads</h2>
                    <div className="flex gap-2">
                        <button onClick={() => setShowImportModal(true)} className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-gray-50 transition">
                            <UploadCloud size={18} /> Importar
                        </button>
                        <button onClick={() => { setFormData({ ...formData, source: availableSources[0] }); setShowModal(true); }} className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-indigo-700 transition shadow-lg">
                            <Plus size={18} /> Novo Lead
                        </button>
                    </div>
                </div>

                <div className="flex border-b border-gray-200">
                    <button onClick={() => { setViewMode('queue'); setStatusFilter('ALL'); }} className={`flex items-center gap-2 px-6 py-3 font-medium text-sm transition-all border-b-2 ${filters.viewMode === 'queue' ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}>
                        <Layers size={18} /> Fila de Trabalho
                    </button>
                    <button onClick={() => { setViewMode('history'); setStatusFilter('ALL'); }} className={`flex items-center gap-2 px-6 py-3 font-medium text-sm transition-all border-b-2 ${filters.viewMode === 'history' ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}>
                        <Archive size={18} /> Histórico / Arquivo
                    </button>
                </div>
            </div>

            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-wrap gap-4 items-center">
                <div className="flex items-center bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 w-full sm:w-64">
                    <Search size={18} className="text-gray-400 mr-2" />
                    <input type="text" placeholder="Buscar por nome ou empresa" className="bg-transparent border-none outline-none text-sm w-full" value={filters.searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                </div>

                {/* Filtro de Status */}
                <div className="flex items-center gap-2">
                    <Filter size={18} className="text-gray-500" />
                    <select className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500" value={filters.status} onChange={e => setStatusFilter(e.target.value)}>
                        <option value="ALL">Todos os Status</option>
                        {filters.viewMode === 'queue' ? (
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
                        )}
                    </select>
                </div>

                {/* Novo Filtro de Curso */}
                <div className="flex items-center gap-2 border-l border-gray-300 pl-4">
                    <span className="text-sm text-gray-500 font-medium">Curso:</span>
                    <select className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 max-w-[200px]" value={filters.course} onChange={e => setCourse(e.target.value)}>
                        <option value="">Todos os Cursos</option>
                        {availableCourses.map(course => (
                            <option key={course} value={course}>{course}</option>
                        ))}
                    </select>
                </div>

                {filters.viewMode === 'queue' && (
                    <button onClick={toggleSLA} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${filters.showOnlySLA ? 'bg-red-50 border-red-200 text-red-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                        <AlertTriangle size={16} className={filters.showOnlySLA ? 'text-red-600' : 'text-gray-400'} />
                        Focar em Atrasados (SLA)
                    </button>
                )}
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-[calc(100vh-280px)]">
                {/* Header */}
                <div className="grid grid-cols-12 gap-4 bg-gray-50 border-b border-gray-200 text-xs uppercase text-gray-500 font-semibold p-4 pr-6 shrink-0">
                    <div className="col-span-3">Lead / Aluno</div>
                    <div className="col-span-2">Tempo / SLA</div>
                    <div className="col-span-3">Contato</div>
                    <div className="col-span-2">Status</div>
                    <div className="col-span-1">Resp.</div>
                    <div className="col-span-1 text-right">Ações</div>
                </div>

                {/* Body */}
                <div className="flex-1 bg-white overflow-y-auto">
                    {filteredLeads.length > 0 ? (
                        <div>
                            {filteredLeads.map((lead) => {
                                const sla = getLeadSLA(lead);
                                const pipelineStatus = getLeadPipelineStatus(lead);
                                return (
                                    <div key={lead.id} className="grid grid-cols-12 gap-4 border-b border-gray-100 hover:bg-gray-50 transition cursor-pointer items-center p-4 h-[80px]" onClick={() => setSelectedLead(lead)}>
                                        <div className="col-span-3">
                                            <p className="font-medium text-gray-900 line-clamp-1">{lead.name}</p>
                                            <p className="text-xs text-gray-500 line-clamp-1">{lead.company}</p>
                                            {lead.desiredCourse && (
                                                <p className="text-[10px] text-indigo-600 font-medium bg-indigo-50 px-1.5 py-0.5 rounded w-fit mt-1 line-clamp-1">
                                                    {lead.desiredCourse}
                                                </p>
                                            )}
                                        </div>
                                        <div className="col-span-2 flex flex-col justify-center">
                                            <span className={`text-xs font-bold px-2 py-0.5 rounded w-fit ${sla.status === 'overdue' ? 'bg-red-100 text-red-700' : sla.status === 'warning' ? 'bg-yellow-100 text-yellow-800' : sla.status === 'waiting' ? 'bg-blue-100 text-blue-700' : sla.status === 'handled' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                                {sla.label}
                                            </span>
                                            <span className="text-[10px] text-gray-400 mt-1">Desde: {new Date(lead.createdAt).toLocaleDateString()}</span>
                                        </div>
                                        <div className="col-span-3 flex flex-col gap-1 text-xs text-gray-600 justify-center">
                                            <div className="flex items-center"><Mail size={12} className="mr-1 shrink-0" /> <span className="line-clamp-1">{lead.email}</span></div>
                                            <div className="flex items-center"><Phone size={12} className="mr-1 shrink-0" /> <span className="line-clamp-1">{lead.phone}</span></div>
                                        </div>
                                        <div className="col-span-2 flex flex-col justify-center">
                                            <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase w-fit ${pipelineStatus.colorClass}`}>
                                                {pipelineStatus.label}
                                            </span>
                                            {pipelineStatus.stageChangedAt && (
                                                <span className="text-[10px] text-gray-400 mt-1">Desde: {new Date(pipelineStatus.stageChangedAt).toLocaleDateString('pt-BR')}</span>
                                            )}
                                        </div>
                                        <div className="col-span-1 text-xs flex items-center" onClick={e => e.stopPropagation()}>
                                            {isAdmin ? (
                                                <select value={lead.ownerId || ""} onChange={(e) => assignLead(lead.id, e.target.value)} className="border-none bg-gray-50 rounded px-1 py-1 outline-none text-gray-700 font-medium w-full">
                                                    <option value="" disabled>...</option>
                                                    {users.map(u => <option key={u.id} value={u.id}>{u.name.split(' ')[0]}</option>)}
                                                </select>
                                            ) : (
                                                <span className="text-gray-700 truncate">{users.find(u => u.id === lead.ownerId)?.name.split(' ')[0] || '-'}</span>
                                            )}
                                        </div>
                                        <div className="col-span-1 flex items-center justify-end gap-1 text-gray-400" onClick={e => e.stopPropagation()}>
                                            <button onClick={() => setSelectedLead(lead)} className="hover:text-indigo-600 p-1"><Eye size={16} /></button>
                                            <button onClick={() => startEditing(lead)} className="hover:text-blue-600 p-1"><Edit3 size={16} /></button>
                                            {isAdmin && <button onClick={(e) => handleDeleteLead(lead.id, lead.name, e)} className="hover:text-red-600 p-1"><Trash2 size={16} /></button>}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-gray-400 p-12">
                            <Search size={48} className="mb-2 opacity-20" />
                            <p>Nenhum lead encontrado com estes filtros.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Modais */}
            <NewLeadModal
                show={showModal}
                onClose={() => setShowModal(false)}
                formData={formData}
                setFormData={setFormData}
                onSubmit={handleCreateLead}
                availableSources={availableSources}
            />

            <LeadDetailsModal
                lead={selectedLead}
                onClose={() => { setSelectedLead(null); setIsEditing(false); }}
                isEditing={isEditing}
                setIsEditing={setIsEditing}
                editData={editData}
                setEditData={setEditData}
                onUpdate={handleUpdateLead}
                isAdmin={isAdmin}
                availableSources={availableSources}
                pipelineStatus={selectedLead ? getLeadPipelineStatus(selectedLead) : {}}
                activities={selectedLead ? useCRM().getLeadActivities(selectedLead.id) : []}
                newNote={newNote}
                setNewNote={setNewNote}
                onAddNote={handleAddNote}
                onNavigateToDeals={() => navigate('/deals')}
                getClassificationColor={getClassificationColor}
            />

            {showImportModal && (
                <ImportWizard
                    onClose={() => setShowImportModal(false)}
                    onImport={bulkAddLeads}
                    availableSources={availableSources}
                    currentUser={currentUser}
                    leads={leads}
                    normalizeClassification={normalizeClassification}
                />
            )}
        </div>
    );
};

export default Leads;