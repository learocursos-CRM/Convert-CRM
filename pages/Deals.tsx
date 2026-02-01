import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useCRM } from '../context/CRMContext';
import { DealStage, Deal, Lead, WaitingListItem } from '../types';
import { MoreHorizontal, DollarSign, Calendar, GraduationCap, AlertCircle, ArrowRight, ArrowLeft, Trash2, Edit2, X, CheckCircle, XCircle, PauseCircle, Clock, Undo2, AlertTriangle, List, Layout as LayoutIcon, Phone, Mail, Filter, FileText } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const Deals = () => {
    const { deals, leads, waitingList, updateDealStage, updateDeal, deleteDeal, moveToWaitingList, restoreFromWaitingList, lossReasons, waitingReasons, globalSearch } = useCRM();
    const [editingDeal, setEditingDeal] = useState<Deal | null>(null);

    const navigate = useNavigate();
    const location = useLocation();

    // Determine view mode based on URL
    const viewMode = location.pathname.includes('waiting-list') ? 'waiting' : 'pipeline';

    // States for Loss Modal
    const [dealIdToLose, setDealIdToLose] = useState<string | null>(null);

    // States for Waiting List Modal
    const [dealIdToWait, setDealIdToWait] = useState<string | null>(null);
    const [waitingReason, setWaitingReason] = useState(waitingReasons[0]);
    const [waitingNotes, setWaitingNotes] = useState('');

    // ORDEM RIGIDA DO PIPELINE
    const pipelineStages = [
        DealStage.NEW,
        DealStage.CONTACT,
        DealStage.QUALIFIED,
        DealStage.PROPOSAL,
        DealStage.DECISION,
        DealStage.WON,
        DealStage.LOST
    ];

    const getLead = (id: string) => leads.find(l => l.id === id);

    const getDealsByStage = (stage: DealStage) => {
        // Filter by stage first
        const stageDeals = deals.filter(d => d.stage === stage);

        // Apply Global Search filtering
        if (!globalSearch) return stageDeals;

        const term = globalSearch.toLowerCase();
        return stageDeals.filter(d => {
            const lead = getLead(d.leadId);
            return d.title.toLowerCase().includes(term) ||
                lead?.name.toLowerCase().includes(term) ||
                lead?.company.toLowerCase().includes(term);
        });
    };

    const getNextStage = (current: DealStage): DealStage | null => {
        const currentIndex = pipelineStages.indexOf(current);
        if (currentIndex === -1 || currentIndex >= pipelineStages.length - 2) return null;
        return pipelineStages[currentIndex + 1];
    };

    const getPrevStage = (current: DealStage): DealStage | null => {
        const currentIndex = pipelineStages.indexOf(current);
        if (currentIndex <= 0) return null;
        if (current === DealStage.WON || current === DealStage.LOST) return DealStage.DECISION;
        return pipelineStages[currentIndex - 1];
    };

    const handleMoveStage = (dealId: string, nextStage: DealStage | null) => {
        if (!nextStage) return;
        try {
            if (nextStage === DealStage.LOST) {
                setDealIdToLose(dealId);
            } else {
                updateDealStage(dealId, nextStage);
            }
        } catch (error) {
            console.error("Erro ao mover card:", error);
        }
    };

    const handleInitiateWait = (dealId: string) => {
        setDealIdToWait(dealId);
        setWaitingReason(waitingReasons[0]);
        setWaitingNotes('');
    };

    const handleConfirmWait = (e: React.FormEvent) => {
        e.preventDefault();
        if (dealIdToWait) {
            moveToWaitingList(dealIdToWait, waitingReason, waitingNotes);
            setDealIdToWait(null);
        }
    };

    const handleConfirmLoss = (reason: string) => {
        if (dealIdToLose) {
            updateDeal(dealIdToLose, { lossReason: reason });
            updateDealStage(dealIdToLose, DealStage.LOST);
            setDealIdToLose(null);
        }
    };

    const handleUpdateDeal = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingDeal) {
            updateDeal(editingDeal.id, {
                value: editingDeal.value || 0,
                title: editingDeal.title,
                probability: editingDeal.probability
            });
            setEditingDeal(null);
        }
    };

    return (
        <div className="h-full flex flex-col relative">
            <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-gray-800">
                        {viewMode === 'pipeline' ? 'Pipeline de Matrículas' : 'Lista de Espera'}
                    </h2>
                    <p className="text-gray-500">
                        {viewMode === 'pipeline'
                            ? 'Gerencie o fluxo de matrículas dos cursos.'
                            : 'Leads aguardando abertura de turmas ou vagas.'}
                    </p>
                </div>

                <div className="bg-white border border-gray-200 p-1 rounded-lg flex shadow-sm">
                    <button
                        onClick={() => navigate('/deals')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition ${viewMode === 'pipeline' ? 'bg-indigo-50 text-indigo-600' : 'text-gray-500 hover:bg-gray-50'
                            }`}
                    >
                        <LayoutIcon size={16} /> Pipeline
                    </button>
                    <button
                        onClick={() => navigate('/waiting-list')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition ${viewMode === 'waiting' ? 'bg-indigo-50 text-indigo-600' : 'text-gray-500 hover:bg-gray-50'
                            }`}
                    >
                        <List size={16} /> Lista de Espera
                        <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs">{waitingList.length}</span>
                    </button>
                </div>
            </div>

            {viewMode === 'pipeline' ? (
                <div className="flex-1 overflow-x-auto">
                    <div className="flex gap-4 min-w-[2400px] h-full pb-4 px-1">
                        {pipelineStages.map(stage => (
                            <KanbanColumn
                                key={stage}
                                stage={stage}
                                deals={getDealsByStage(stage)}
                                getLead={getLead}
                                onMove={handleMoveStage}
                                onWait={handleInitiateWait}
                                onEdit={setEditingDeal}
                                onDelete={deleteDeal}
                                getNextStage={getNextStage}
                                getPrevStage={getPrevStage}
                            />
                        ))}
                    </div>
                </div>
            ) : (
                <WaitingListView
                    waitingList={waitingList}
                    onRestore={restoreFromWaitingList}
                />
            )}

            {/* Edit Modal */}
            {editingDeal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-gray-900">Editar Negócio</h3>
                            <button onClick={() => setEditingDeal(null)}><X size={24} className="text-gray-400 hover:text-gray-600" /></button>
                        </div>
                        <form onSubmit={handleUpdateDeal} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Título</label>
                                <input type="text" className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
                                    value={editingDeal.title} onChange={e => setEditingDeal({ ...editingDeal, title: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Valor (R$)</label>
                                <input type="number" step="0.01" className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
                                    value={editingDeal.value}
                                    onChange={e => setEditingDeal({ ...editingDeal, value: parseFloat(e.target.value) })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Probabilidade (%)</label>
                                <input type="number" min="0" max="100" className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
                                    value={editingDeal.probability} onChange={e => setEditingDeal({ ...editingDeal, probability: parseInt(e.target.value) })} />
                            </div>
                            <div className="pt-4 flex gap-3">
                                <button type="button" onClick={() => setEditingDeal(null)} className="flex-1 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">Cancelar</button>
                                <button type="submit" className="flex-1 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Salvar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* LOSS REASON MODAL */}
            {dealIdToLose && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-0 overflow-hidden animate-fade-in">
                        <div className="bg-red-50 p-6 border-b border-red-100 flex flex-col items-center text-center">
                            <div className="bg-red-100 p-3 rounded-full mb-3">
                                <AlertTriangle className="text-red-600" size={32} />
                            </div>
                            <h3 className="text-xl font-bold text-red-900">Motivo da Perda</h3>
                            <p className="text-sm text-red-700 mt-1">
                                Por que este aluno não foi matriculado? <br />
                                <span className="font-semibold">Esta informação é obrigatória.</span>
                            </p>
                        </div>

                        <div className="p-4 space-y-2">
                            {lossReasons.map((reason, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => handleConfirmLoss(reason)}
                                    className="w-full text-left px-4 py-3 rounded-lg border border-gray-200 text-gray-700 hover:bg-red-50 hover:border-red-200 hover:text-red-800 transition flex items-center justify-between group"
                                >
                                    <span className="font-medium">{reason}</span>
                                    <ArrowRight size={16} className="opacity-0 group-hover:opacity-100 transition-opacity text-red-500" />
                                </button>
                            ))}
                        </div>

                        <div className="p-4 bg-gray-50 border-t border-gray-100">
                            <button
                                onClick={() => setDealIdToLose(null)}
                                className="w-full py-2.5 text-gray-500 font-medium hover:text-gray-800 transition"
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* WAITING LIST MODAL */}
            {dealIdToWait && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
                        <div className="flex flex-col items-center text-center mb-6">
                            <div className="bg-amber-100 p-3 rounded-full mb-3">
                                <PauseCircle className="text-amber-600" size={32} />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900">Mover para Lista de Espera</h3>
                            <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                                <p className="text-sm text-amber-900 font-medium">
                                    ⚠️ Este Lead possui um Negócio ativo.
                                </p>
                                <p className="text-xs text-amber-800 mt-2">
                                    Ao confirmar, o <strong>Negócio será encerrado automaticamente</strong> e o Lead será movido para a Lista de Espera.
                                    <br /><br />
                                    O Negócio sairá do Pipeline, SLA e Forecast, mas não será marcado como "Perdido".
                                </p>
                            </div>
                        </div>

                        <form onSubmit={handleConfirmWait} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Motivo da Espera</label>
                                <select
                                    required
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
                                    value={waitingReason}
                                    onChange={(e) => setWaitingReason(e.target.value)}
                                >
                                    {waitingReasons.map((r, i) => <option key={i} value={r}>{r}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Observações (Opcional)</label>
                                <textarea
                                    rows={3}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                                    placeholder="Ex: Aluno aguarda turma de sábado..."
                                    value={waitingNotes}
                                    onChange={(e) => setWaitingNotes(e.target.value)}
                                />
                            </div>

                            <div className="pt-2 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setDealIdToWait(null)}
                                    className="flex-1 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700"
                                >
                                    Confirmar Espera
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

const WaitingListView = ({ waitingList, onRestore }: { waitingList: WaitingListItem[], onRestore: any }) => {
    const { leads } = useCRM();
    const getLead = (id: string) => leads.find(l => l.id === id);

    const [selectedCourse, setSelectedCourse] = useState('ALL');

    // Extract unique courses for filter
    const courses = useMemo(() => {
        const unique = new Set(waitingList.map(item => item.course));
        return ['ALL', ...Array.from(unique)];
    }, [waitingList]);

    // Apply filters
    const filteredList = useMemo(() => {
        if (selectedCourse === 'ALL') return waitingList;
        return waitingList.filter(item => item.course === selectedCourse);
    }, [waitingList, selectedCourse]);

    const handleExportPDF = () => {
        const doc = new jsPDF();

        doc.setFontSize(18);
        doc.text('Lista de Espera - CRM Educacional', 14, 22);

        doc.setFontSize(11);
        doc.text(`Data de emissão: ${new Date().toLocaleDateString()}`, 14, 30);
        if (selectedCourse !== 'ALL') {
            doc.text(`Filtro de Curso: ${selectedCourse}`, 14, 36);
        }

        const tableBody = filteredList.map(item => {
            const lead = getLead(item.leadId);
            return [
                lead?.name || 'N/A',
                lead?.phone || '-',
                lead?.email || '-',
                item.course,
                item.reason,
                new Date(item.createdAt).toLocaleDateString()
            ];
        });

        autoTable(doc, {
            head: [['Lead', 'Telefone', 'Email', 'Curso Desejado', 'Motivo', 'Entrada']],
            body: tableBody,
            startY: selectedCourse !== 'ALL' ? 42 : 36,
            styles: { fontSize: 8 },
            headStyles: { fillColor: [79, 70, 229] } // Indigo 600
        });

        doc.save('lista_de_espera.pdf');
    };

    return (
        <div className="flex flex-col gap-4">
            {/* Toolbar */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex justify-between items-center flex-wrap gap-4">
                <div className="flex items-center gap-2">
                    <Filter size={18} className="text-gray-500" />
                    <select
                        value={selectedCourse}
                        onChange={(e) => setSelectedCourse(e.target.value)}
                        className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 min-w-[200px]"
                    >
                        <option value="ALL">Todos os Cursos</option>
                        {courses.map(course => (
                            course !== 'ALL' && <option key={course} value={course}>{course}</option>
                        ))}
                    </select>
                </div>

                <button
                    onClick={handleExportPDF}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium transition shadow-sm"
                >
                    <FileText size={16} className="text-red-600" /> Exportar PDF
                </button>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-gray-50 border-b border-gray-200 text-xs uppercase text-gray-500 font-semibold">
                        <tr>
                            <th className="p-4">Lead</th>
                            <th className="p-4">Contato</th>
                            <th className="p-4">Curso Desejado</th>
                            <th className="p-4">Motivo / Notas</th>
                            <th className="p-4">Data de Entrada</th>
                            <th className="p-4 text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredList.length > 0 ? (
                            filteredList.map(item => {
                                const lead = getLead(item.leadId);
                                return (
                                    <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50">
                                        <td className="p-4">
                                            <div className="font-medium text-gray-900">{lead?.name || 'Desconhecido'}</div>
                                            <div className="text-xs text-gray-500">{lead?.company}</div>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex flex-col gap-1.5">
                                                {lead?.phone && (
                                                    <a href={`tel:${lead.phone}`} className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-indigo-600 font-medium">
                                                        <Phone size={12} /> {lead.phone}
                                                    </a>
                                                )}
                                                {lead?.email && (
                                                    <a href={`mailto:${lead.email}`} className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-indigo-600">
                                                        <Mail size={12} /> {lead.email}
                                                    </a>
                                                )}
                                                {!lead?.phone && !lead?.email && <span className="text-xs text-gray-400">Sem contato</span>}
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-1.5 text-xs text-indigo-700 font-medium bg-indigo-50 p-1.5 rounded w-fit">
                                                <GraduationCap size={14} /> {item.course}
                                            </div>
                                        </td>
                                        <td className="p-4 max-w-xs">
                                            <div className="text-sm font-medium text-amber-700">{item.reason}</div>
                                            {item.notes && <div className="text-xs text-gray-500 mt-1 italic">"{item.notes}"</div>}
                                        </td>
                                        <td className="p-4 text-sm text-gray-600">
                                            <div className="flex items-center gap-1">
                                                <Clock size={14} /> {new Date(item.createdAt).toLocaleDateString()}
                                            </div>
                                        </td>
                                        <td className="p-4 text-right">
                                            <button
                                                onClick={() => onRestore(item.id)}
                                                className="text-xs bg-white border border-green-200 text-green-700 px-3 py-1.5 rounded hover:bg-green-50 hover:border-green-300 transition flex items-center gap-1 ml-auto font-medium"
                                            >
                                                <Undo2 size={14} /> Retomar
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })
                        ) : (
                            <tr>
                                <td colSpan={6} className="p-12 text-center text-gray-400">
                                    <PauseCircle size={48} className="mx-auto mb-2 opacity-50" />
                                    {waitingList.length === 0 ? "Ninguém na lista de espera no momento." : "Nenhum registro encontrado para este filtro."}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

interface KanbanColumnProps {
    stage: DealStage;
    deals: Deal[];
    getLead: (id: string) => Lead | undefined;
    onMove: (id: string, s: DealStage | null) => void;
    onWait: (id: string) => void;
    onEdit: (d: Deal) => void;
    onDelete: (id: string) => void;
    getNextStage: (s: DealStage) => DealStage | null;
    getPrevStage: (s: DealStage) => DealStage | null;
}

const KanbanColumn: React.FC<KanbanColumnProps> = ({ stage, deals, getLead, onMove, onWait, onEdit, onDelete, getNextStage, getPrevStage }) => {
    const totalValue = deals.reduce((acc, d) => acc + d.value, 0);

    const getStageColor = (s: DealStage) => {
        switch (s) {
            case DealStage.NEW: return 'border-t-4 border-gray-400';
            case DealStage.CONTACT: return 'border-t-4 border-blue-400';
            case DealStage.QUALIFIED: return 'border-t-4 border-indigo-400';
            case DealStage.PROPOSAL: return 'border-t-4 border-purple-400';
            case DealStage.DECISION: return 'border-t-4 border-orange-400';
            case DealStage.WON: return 'border-t-4 border-green-500 bg-green-50/30';
            case DealStage.LOST: return 'border-t-4 border-red-400 bg-red-50/30';
            default: return 'border-t-4 border-gray-200';
        }
    };

    return (
        <div className={`w-80 flex flex-col bg-gray-100 rounded-xl p-3 h-fit max-h-full transition-colors ${getStageColor(stage)}`}>
            <div className="flex justify-between items-center mb-3 px-1">
                <h3 className="font-bold text-gray-800 text-sm truncate uppercase tracking-tight" title={stage}>{stage}</h3>
                <span className="bg-white border border-gray-200 text-gray-600 px-2 py-0.5 rounded-full text-xs font-medium shadow-sm">{deals.length}</span>
            </div>

            <div className="mb-4 px-1 flex justify-between items-end border-b border-gray-200 pb-2">
                <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Total Previsto</p>
                    <p className="text-sm font-bold text-gray-900">R$ {totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}</p>
                </div>
            </div>

            <div className="space-y-3 overflow-y-auto custom-scrollbar flex-1 pr-1 min-h-[100px]">
                {deals.map(deal => (
                    <DealCard
                        key={deal.id}
                        deal={deal}
                        lead={getLead(deal.leadId)}
                        stage={stage}
                        onMove={onMove}
                        onWait={onWait}
                        onEdit={onEdit}
                        onDelete={onDelete}
                        nextStage={getNextStage(stage)}
                        prevStage={getPrevStage(stage)}
                    />
                ))}
            </div>
        </div>
    );
};

const DealCard = ({ deal, lead, stage, onMove, onWait, onEdit, onDelete, nextStage, prevStage }: any) => {
    const [showMenu, setShowMenu] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    let classificationColor = 'bg-gray-100 text-gray-600';
    const classLower = lead?.classification?.toLowerCase() || '';

    if (classLower.includes('trabalhador')) {
        classificationColor = 'bg-teal-50 text-teal-700 border border-teal-100';
    } else if (classLower.includes('dependente')) {
        classificationColor = 'bg-cyan-50 text-cyan-700 border border-cyan-100';
    } else if (classLower.includes('comunidade')) {
        classificationColor = 'bg-slate-50 text-slate-700 border border-slate-200';
    }

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setShowMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleAction = (action: () => void) => {
        action();
        setShowMenu(false);
    }

    return (
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition group relative flex flex-col gap-2">
            <div className="flex justify-between items-start relative">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${deal.probability >= 80 ? 'bg-green-100 text-green-700' :
                    deal.probability <= 30 ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                    }`}>
                    {deal.probability}% Prob.
                </span>

                <div className="relative" ref={menuRef}>
                    <button
                        onClick={() => setShowMenu(!showMenu)}
                        className="text-gray-300 hover:text-gray-600 p-1 rounded hover:bg-gray-100"
                    >
                        <MoreHorizontal size={16} />
                    </button>

                    {showMenu && (
                        <div className="absolute right-0 top-full mt-1 w-56 bg-white border border-gray-200 rounded-lg shadow-xl z-50 py-1 flex flex-col">
                            <button
                                onClick={() => handleAction(() => onEdit(deal))}
                                className="px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                            >
                                <Edit2 size={16} className="text-gray-400" /> Editar Dados
                            </button>

                            <div className="border-t border-gray-100 my-1"></div>

                            {/* VOLTAR ETAPA */}
                            {prevStage && (
                                <button
                                    onClick={() => handleAction(() => onMove(deal.id, prevStage))}
                                    className="px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                >
                                    <ArrowLeft size={16} className="text-gray-400" />
                                    Voltar para {prevStage.split(' ')[0]}...
                                </button>
                            )}

                            {/* AVANÇAR ETAPA (Generico) */}
                            {nextStage && (
                                <button
                                    onClick={() => handleAction(() => onMove(deal.id, nextStage))}
                                    className="px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                >
                                    <ArrowRight size={16} className="text-gray-400" />
                                    Avançar para {nextStage.split(' ')[0]}...
                                </button>
                            )}

                            {/* FORÇAR GANHO / PERDA / ESPERA */}
                            <div className="border-t border-gray-100 my-1"></div>

                            {/* Mover para Lista de Espera - Novo! */}
                            {stage !== DealStage.WON && stage !== DealStage.LOST && (
                                <button
                                    onClick={() => handleAction(() => onWait(deal.id))}
                                    className="px-4 py-2 text-left text-sm text-amber-600 hover:bg-amber-50 flex items-center gap-2"
                                >
                                    <PauseCircle size={16} /> Mover p/ Lista de Espera
                                </button>
                            )}

                            {stage !== DealStage.WON && (
                                <button
                                    onClick={() => handleAction(() => onMove(deal.id, DealStage.WON))}
                                    className="px-4 py-2 text-left text-sm text-green-700 hover:bg-green-50 flex items-center gap-2 font-semibold"
                                >
                                    <CheckCircle size={16} /> Confirmar Matrícula
                                </button>
                            )}

                            {stage !== DealStage.LOST && (
                                <button
                                    onClick={() => handleAction(() => onMove(deal.id, DealStage.LOST))}
                                    className="px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                                >
                                    <XCircle size={16} /> Marcar como Perdido
                                </button>
                            )}

                            <div className="border-t border-gray-100 my-1"></div>

                            <button
                                onClick={() => handleAction(() => { if (confirm('Tem certeza?')) onDelete(deal.id) })}
                                className="px-4 py-2 text-left text-sm text-gray-400 hover:bg-gray-50 hover:text-red-600 flex items-center gap-2"
                            >
                                <Trash2 size={16} /> Excluir
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <div>
                <h4 className="font-bold text-gray-900 text-sm leading-tight hover:text-indigo-600 cursor-pointer">{lead?.name || 'Lead Desconhecido'}</h4>
                {lead && (
                    <div className="flex flex-col gap-2 mt-2">
                        <div className="flex items-start gap-1.5 text-xs text-indigo-700 font-medium bg-indigo-50 p-1.5 rounded">
                            <GraduationCap size={14} className="mt-0.5 shrink-0" />
                            <span className="leading-tight line-clamp-2">{lead.desiredCourse || 'Curso não informado'}</span>
                        </div>

                        {lead.classification && (
                            <div className={`text-[10px] px-2 py-1 rounded w-fit ${classificationColor} font-medium leading-tight truncate max-w-full`} title={lead.classification}>
                                {lead.classification}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Exibir Motivo da Perda se houver */}
            {deal.lossReason && stage === DealStage.LOST && (
                <div className="mt-2 px-2 py-1.5 bg-red-50 border border-red-100 rounded text-xs text-red-700 flex items-start gap-1.5">
                    <AlertCircle size={13} className="mt-0.5 shrink-0" />
                    <span className="font-semibold leading-tight">Motivo: {deal.lossReason}</span>
                </div>
            )}

            <div className="flex items-center justify-between pt-3 border-t border-gray-100 mt-1">
                <button
                    onClick={() => onEdit(deal)}
                    title="Editar Valor"
                    className="flex items-center text-gray-900 text-sm font-bold hover:text-indigo-600 transition p-1 -ml-1 rounded hover:bg-gray-50"
                >
                    <DollarSign size={14} className="text-gray-400 mr-0.5" />
                    {deal.value.toLocaleString('pt-BR')}
                </button>
                <div className="flex items-center text-xs text-gray-400" title="Previsão de Matrícula">
                    <Calendar size={12} className="mr-1" />
                    {new Date(deal.expectedCloseDate).toLocaleDateString(undefined, { day: '2-digit', month: '2-digit' })}
                </div>
            </div>

            {/* BOTÕES DE AÇÃO DIRETA NO CARD (SEM MENU) */}
            <div className="mt-3 flex gap-2">
                {/* Se estiver em DECISÃO, mostra botão de Matricular */}
                {stage === DealStage.DECISION && (
                    <button
                        onClick={(e) => { e.stopPropagation(); onMove(deal.id, DealStage.WON); }}
                        className="flex-1 bg-green-600 text-white text-xs font-bold py-2 rounded hover:bg-green-700 transition flex items-center justify-center gap-1 shadow-sm"
                    >
                        <CheckCircle size={12} /> Matricular
                    </button>
                )}

                {/* Botão padrão de avançar para outras fases */}
                {nextStage && stage !== DealStage.DECISION && (
                    <button
                        onClick={(e) => { e.stopPropagation(); onMove(deal.id, nextStage); }}
                        className="w-full bg-gray-50 text-gray-600 border border-gray-200 text-xs font-semibold py-1.5 rounded hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition flex items-center justify-center gap-1"
                    >
                        Avançar <ArrowRight size={12} />
                    </button>
                )}
            </div>
        </div>
    );
};

export default Deals;