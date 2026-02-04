import React from 'react';
import { X, Edit3, Lock, Briefcase, ArrowRight, Clock, MessageSquare } from 'lucide-react';
import { supabase } from '../../services/supabase';
import { Lead, Activity } from '../../types';

interface LeadDetailsModalProps {
    lead: Lead | null;
    onClose: () => void;
    isEditing: boolean;
    setIsEditing: (val: boolean) => void;
    editData: Partial<Lead>;
    setEditData: (data: any) => void;
    onUpdate: (e: React.FormEvent) => void;
    isAdmin: boolean;
    availableSources: string[];
    pipelineStatus: any;
    activities: Activity[];
    newNote: string;
    setNewNote: (val: string) => void;
    onAddNote: () => Promise<boolean>;
    onNavigateToDeals: () => void;
    getClassificationColor: (c?: string) => string;
}

const LeadDetailsModal = ({
    lead, onClose, isEditing, setIsEditing, editData, setEditData, onUpdate,
    isAdmin, availableSources, pipelineStatus, activities, newNote, setNewNote,
    onAddNote, onNavigateToDeals, getClassificationColor
}: LeadDetailsModalProps) => {
    const [localActivities, setLocalActivities] = React.useState<Activity[]>([]);
    const [isLoadingActivities, setIsLoadingActivities] = React.useState(false);

    React.useEffect(() => {
        if (lead) {
            setIsLoadingActivities(true);
            supabase.from('activities')
                .select('*')
                .eq('lead_id', lead.id)
                .order('timestamp', { ascending: false })
                .then(({ data }) => {
                    if (data) setLocalActivities(data as any);
                    setIsLoadingActivities(false);
                });
        }
    }, [lead]);

    const handleAddNoteLocal = async () => {
        if (!lead || !newNote.trim()) return;

        // Optimistic update
        const tempActivity: any = {
            id: 'temp-' + Date.now(),
            leadId: lead.id,
            content: newNote,
            type: 'note',
            performer: 'Você',
            timestamp: new Date().toISOString()
        };
        setLocalActivities(prev => [tempActivity, ...prev]);

        // Call parent handler (which saves to DB)
        const success = await onAddNote();

        if (!success) {
            // Rollback optimistic update on failure
            setLocalActivities(prev => prev.filter(a => a.id !== tempActivity.id));
            alert("Erro ao salvar atividade. Tente novamente.");
            return;
        }

        // Re-fetch to ensure sync (optional but safer)
        supabase.from('activities')
            .select('*')
            .eq('lead_id', lead.id)
            .order('timestamp', { ascending: false })
            .then(({ data }) => {
                if (data) setLocalActivities(data as any);
            });
    };

    if (!lead) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4 sm:p-0">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                    <div>
                        {!isEditing ? (
                            <>
                                <h2 className="text-xl font-bold">{lead.name}</h2>
                                <div className="flex flex-col sm:flex-row sm:items-center gap-2 mt-1">
                                    <p className="text-gray-500 text-sm">{lead.company}</p>
                                    {lead.classification && (
                                        <span className={`text-xs px-2 py-0.5 rounded-full w-fit ${getClassificationColor(lead.classification)}`}>
                                            {lead.classification}
                                        </span>
                                    )}
                                </div>
                            </>
                        ) : (
                            <h2 className="text-xl font-bold text-indigo-700">Editando Lead</h2>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        {!isEditing && (
                            <button
                                onClick={() => setIsEditing(true)}
                                className="p-2 text-gray-400 hover:text-indigo-600 rounded-full hover:bg-indigo-50 transition"
                            >
                                <Edit3 size={20} />
                            </button>
                        )}
                        <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600">
                            <X size={24} />
                        </button>
                    </div>
                </div>

                <div className="p-6">
                    {isEditing ? (
                        <form onSubmit={onUpdate} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                                    <input
                                        type="text"
                                        className="w-full border rounded px-3 py-2"
                                        value={editData.name || ''}
                                        onChange={e => setEditData({ ...editData, name: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Empresa</label>
                                    <input
                                        type="text"
                                        className="w-full border rounded px-3 py-2"
                                        value={editData.company || ''}
                                        onChange={e => setEditData({ ...editData, company: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                    <input
                                        type="email"
                                        className="w-full border rounded px-3 py-2"
                                        value={editData.email || ''}
                                        onChange={e => setEditData({ ...editData, email: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
                                    <input
                                        type="text"
                                        className="w-full border rounded px-3 py-2"
                                        value={editData.phone || ''}
                                        onChange={e => setEditData({ ...editData, phone: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                                <h4 className="text-xs font-bold text-gray-500 uppercase mb-3 flex items-center gap-1">
                                    {!isAdmin && <Lock size={12} />} Dados de Classificação
                                </h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Classificação {!isAdmin && '(Bloqueado)'}
                                        </label>
                                        <select
                                            disabled={!isAdmin}
                                            className={`w-full border rounded px-3 py-2 text-sm ${!isAdmin ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''}`}
                                            value={editData.classification || ''}
                                            onChange={e => setEditData({ ...editData, classification: e.target.value })}
                                        >
                                            <option value="Comunidade">Comunidade</option>
                                            <option value="Trabalhador vinculado à empresa do transporte">Trabalhador vinculado</option>
                                            <option value="Dependente de trabalhador vinculado à empresa do transporte">Dependente</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Curso {!isAdmin && '(Bloqueado)'}
                                        </label>
                                        <input
                                            type="text"
                                            disabled={!isAdmin}
                                            className={`w-full border rounded px-3 py-2 ${!isAdmin ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''}`}
                                            value={editData.desiredCourse || ''}
                                            onChange={e => setEditData({ ...editData, desiredCourse: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Origem {!isAdmin && '(Bloqueado)'}
                                        </label>
                                        <select
                                            disabled={!isAdmin}
                                            className={`w-full border rounded px-3 py-2 text-sm ${!isAdmin ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''}`}
                                            value={editData.source || ''}
                                            onChange={e => setEditData({ ...editData, source: e.target.value })}
                                        >
                                            {availableSources.map(s => (
                                                <option key={s} value={s}>{s}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setIsEditing(false)}
                                    className="flex-1 py-2 border rounded hover:bg-gray-50"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
                                >
                                    Salvar Alterações
                                </button>
                            </div>
                        </form>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div>
                                <h4 className="font-semibold text-gray-900 mb-2">Dados de Contato</h4>
                                <div className="space-y-2 text-sm">
                                    <p><span className="text-gray-500">Email:</span> {lead.email}</p>
                                    <p><span className="text-gray-500">Telefone:</span> {lead.phone}</p>
                                    <p><span className="text-gray-500">Curso:</span> {lead.desiredCourse}</p>
                                    <p><span className="text-gray-500">Origem:</span> {lead.source}</p>
                                    <p><span className="text-gray-500">Criado em:</span> {new Date(lead.createdAt).toLocaleDateString()}</p>
                                    {lead.lostReason && (
                                        <p className="text-red-500 bg-red-50 p-2 rounded">
                                            <span className="font-bold">Motivo da Perda:</span> {lead.lostReason}
                                        </p>
                                    )}
                                </div>
                                <div className="mt-6">
                                    <h4 className="font-semibold text-gray-900 mb-2">Ações Rápidas</h4>
                                    {pipelineStatus.isLinked ? (
                                        <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-3">
                                            <p className="text-xs text-indigo-800 font-medium mb-2 flex items-center gap-1">
                                                <Briefcase size={12} /> Gerenciado no Pipeline
                                            </p>
                                            <div className="mb-3 p-2 bg-white rounded border border-indigo-100 text-xs">
                                                <span className="text-gray-500">Status Atual: </span>
                                                <span className="font-bold text-indigo-700">{pipelineStatus.label}</span>
                                            </div>
                                            <button
                                                onClick={onNavigateToDeals}
                                                className="w-full bg-white border border-indigo-200 text-indigo-600 px-3 py-2 rounded text-sm font-semibold hover:bg-indigo-600 hover:text-white transition flex items-center justify-center gap-2"
                                            >
                                                Ver no Pipeline <ArrowRight size={14} />
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="flex flex-wrap gap-2 text-xs text-gray-400 italic">
                                            Aguardando dados completos para gerar Matrícula...
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="bg-gray-50 p-4 rounded-lg flex flex-col h-full">
                                <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                    <Clock size={16} /> Histórico (Atividades)
                                </h4>
                                <div className="flex-1 overflow-y-auto mb-4 space-y-3 custom-scrollbar pr-2 max-h-48">
                                    {isLoadingActivities ? (
                                        <p className="text-xs text-center text-gray-500 py-4">Carregando histórico...</p>
                                    ) : localActivities.length > 0 ? (
                                        localActivities.map(act => (
                                            <div key={act.id} className="text-xs bg-white p-2 rounded border border-gray-100 shadow-sm">
                                                <p className="font-bold text-gray-700 mb-0.5">{act.performer}</p>
                                                <p className="text-gray-600 mb-1">{act.content}</p>
                                                <p className="text-[10px] text-gray-400 text-right">
                                                    {new Date(act.timestamp).toLocaleDateString()} {new Date(act.timestamp).toLocaleTimeString()}
                                                </p>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-xs text-gray-400 italic text-center">Nenhuma atividade registrada.</p>
                                    )}
                                </div>
                                <div className="mt-auto border-t border-gray-200 pt-3">
                                    <p className="text-xs text-gray-500 mb-2">Registrar Atividade (Zera SLA)</p>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            placeholder="Ex: Liguei para o aluno..."
                                            className="flex-1 text-xs border border-gray-300 rounded px-2 py-1.5 outline-none focus:border-indigo-500"
                                            value={newNote}
                                            onChange={(e) => setNewNote(e.target.value)}
                                        />
                                        <button
                                            onClick={handleAddNoteLocal}
                                            className="bg-indigo-600 text-white p-1.5 rounded hover:bg-indigo-700"
                                            title="Salvar Nota"
                                        >
                                            <MessageSquare size={16} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default LeadDetailsModal;
