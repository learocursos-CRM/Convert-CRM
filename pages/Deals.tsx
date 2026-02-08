import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useCRM } from '../context/CRMContext';
import { Deal, DealStage } from '../types';
import { LayoutIcon, List } from 'lucide-react';
import KanbanColumn from '../components/deals/KanbanColumn';
import WaitingListView from '../components/deals/WaitingListView';
import EditDealModal from '../components/modals/EditDealModal';
import LossReasonModal from '../components/modals/LossReasonModal';
import MoveToWaitingListModal from '../components/modals/MoveToWaitingListModal';
import { useDealFilters } from '../hooks/useDealFilters';

const Deals = () => {
    const {
        deals, leads, allLeads, waitingList, updateDealStage, updateDeal, deleteDeal,
        moveToWaitingList, restoreFromWaitingList, removePermanent, lossReasons, waitingReasons,
    } = useCRM();

    // Hook Filters
    const { getDealsByStage, setSearchTerm, searchTerm } = useDealFilters({ deals, leads });

    const navigate = useNavigate();
    const location = useLocation();

    // Estados de UI e Controle de Modais
    const viewMode = location.pathname.includes('waiting-list') ? 'waiting' : 'pipeline';
    const [editingDeal, setEditingDeal] = useState<Deal | null>(null);
    const [dealIdToLose, setDealIdToLose] = useState<string | null>(null);
    const [dealIdToWait, setDealIdToWait] = useState<string | null>(null);
    const [waitingReason, setWaitingReason] = useState(waitingReasons[0]);
    const [waitingNotes, setWaitingNotes] = useState('');

    const pipelineStages = [
        DealStage.NEW,
        DealStage.CONTACT,
        DealStage.QUALIFIED,
        DealStage.PROPOSAL,
        DealStage.DECISION,
        DealStage.WON,
        DealStage.LOST
    ];

    const getLead = (id: string) => allLeads.find(l => l.id === id);

    // getDealsByStage is provided by the hook now

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
        if (nextStage === DealStage.LOST) {
            setDealIdToLose(dealId);
        } else {
            updateDealStage(dealId, nextStage);
        }
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
                        className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition ${viewMode === 'pipeline' ? 'bg-indigo-50 text-indigo-600' : 'text-gray-500 hover:bg-gray-50'}`}
                    >
                        <LayoutIcon size={16} /> Pipeline
                    </button>
                    <button
                        onClick={() => navigate('/waiting-list')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition ${viewMode === 'waiting' ? 'bg-indigo-50 text-indigo-600' : 'text-gray-500 hover:bg-gray-50'}`}
                    >
                        <List size={16} /> Lista de Espera
                        <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs ml-1">{waitingList.length}</span>
                    </button>
                </div>
            </div>

            {viewMode === 'pipeline' ? (
                <div className="flex-1 overflow-x-auto">
                    <div className="flex gap-4 min-w-[2100px] h-full pb-4 px-1">
                        {pipelineStages.map(stage => (
                            <KanbanColumn
                                key={stage}
                                stage={stage}
                                deals={getDealsByStage(stage)}
                                getLead={getLead}
                                onMove={handleMoveStage}
                                onWait={setDealIdToWait}
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
                    onDelete={removePermanent}
                />
            )}

            <EditDealModal
                deal={editingDeal}
                onClose={() => setEditingDeal(null)}
                onUpdate={handleUpdateDeal}
                setEditingDeal={setEditingDeal}
            />

            <LossReasonModal
                dealId={dealIdToLose}
                lossReasons={lossReasons}
                onClose={() => setDealIdToLose(null)}
                onConfirm={handleConfirmLoss}
            />

            <MoveToWaitingListModal
                dealId={dealIdToWait}
                waitingReasons={waitingReasons}
                waitingReason={waitingReason}
                setWaitingReason={setWaitingReason}
                waitingNotes={waitingNotes}
                setWaitingNotes={setWaitingNotes}
                onClose={() => setDealIdToWait(null)}
                onConfirm={handleConfirmWait}
            />
        </div>
    );
};

export default Deals;