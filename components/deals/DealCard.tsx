import React, { useState, useRef, useEffect } from 'react';
import { Deal, Lead, DealStage } from '../../types';
import { MoreHorizontal, Edit2, ArrowLeft, ArrowRight, PauseCircle, CheckCircle, XCircle, Trash2, GraduationCap, AlertCircle, DollarSign, Calendar } from 'lucide-react';

interface DealCardProps {
    deal: Deal;
    lead?: Lead;
    stage: DealStage;
    onMove: (id: string, s: DealStage | null) => void;
    onWait: (id: string) => void;
    onEdit: (d: Deal) => void;
    onDelete: (id: string) => void;
    nextStage: DealStage | null;
    prevStage: DealStage | null;
}

const DealCard: React.FC<DealCardProps> = ({
    deal, lead, stage, onMove, onWait, onEdit, onDelete, nextStage, prevStage
}) => {
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
    };

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

                            {prevStage && (
                                <button
                                    onClick={() => handleAction(() => onMove(deal.id, prevStage))}
                                    className="px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                >
                                    <ArrowLeft size={16} className="text-gray-400" />
                                    Voltar para {prevStage.split(' ')[0]}...
                                </button>
                            )}

                            {nextStage && (
                                <button
                                    onClick={() => handleAction(() => onMove(deal.id, nextStage))}
                                    className="px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                >
                                    <ArrowRight size={16} className="text-gray-400" />
                                    Avançar para {nextStage.split(' ')[0]}...
                                </button>
                            )}

                            <div className="border-t border-gray-100 my-1"></div>

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
                                onClick={() => handleAction(() => { if (window.confirm('Tem certeza?')) onDelete(deal.id) })}
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

            <div className="mt-3 flex gap-2">
                {stage === DealStage.DECISION && (
                    <button
                        onClick={(e) => { e.stopPropagation(); onMove(deal.id, DealStage.WON); }}
                        className="flex-1 bg-green-600 text-white text-xs font-bold py-2 rounded hover:bg-green-700 transition flex items-center justify-center gap-1 shadow-sm"
                    >
                        <CheckCircle size={12} /> Matricular
                    </button>
                )}

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

export default DealCard;
