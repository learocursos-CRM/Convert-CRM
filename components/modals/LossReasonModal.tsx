import React from 'react';
import { AlertTriangle, ArrowRight } from 'lucide-react';

interface LossReasonModalProps {
    dealId: string | null;
    lossReasons: string[];
    onClose: () => void;
    onConfirm: (reason: string) => void;
}

const LossReasonModal: React.FC<LossReasonModalProps> = ({ dealId, lossReasons, onClose, onConfirm }) => {
    if (!dealId) return null;

    return (
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
                            onClick={() => onConfirm(reason)}
                            className="w-full text-left px-4 py-3 rounded-lg border border-gray-200 text-gray-700 hover:bg-red-50 hover:border-red-200 hover:text-red-800 transition flex items-center justify-between group"
                        >
                            <span className="font-medium">{reason}</span>
                            <ArrowRight size={16} className="opacity-0 group-hover:opacity-100 transition-opacity text-red-500" />
                        </button>
                    ))}
                </div>

                <div className="p-4 bg-gray-50 border-t border-gray-100">
                    <button
                        onClick={onClose}
                        className="w-full py-2.5 text-gray-500 font-medium hover:text-gray-800 transition"
                    >
                        Cancelar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LossReasonModal;
