import React from 'react';
import { Deal, Lead, DealStage } from '../../types';
import DealCard from './DealCard';

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

const KanbanColumn: React.FC<KanbanColumnProps> = ({
    stage, deals, getLead, onMove, onWait, onEdit, onDelete, getNextStage, getPrevStage
}) => {
    const totalValue = deals.reduce((acc, d) => acc + (Number(d.value) || 0), 0);

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

export default KanbanColumn;
