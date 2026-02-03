import React from 'react';
import { PauseCircle } from 'lucide-react';

interface MoveToWaitingListModalProps {
    dealId: string | null;
    waitingReasons: string[];
    waitingReason: string;
    setWaitingReason: (reason: string) => void;
    waitingNotes: string;
    setWaitingNotes: (notes: string) => void;
    onClose: () => void;
    onConfirm: (e: React.FormEvent) => void;
}

const MoveToWaitingListModal: React.FC<MoveToWaitingListModalProps> = ({
    dealId, waitingReasons, waitingReason, setWaitingReason,
    waitingNotes, setWaitingNotes, onClose, onConfirm
}) => {
    if (!dealId) return null;

    return (
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

                <form onSubmit={onConfirm} className="space-y-4">
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
                            onClick={onClose}
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
    );
};

export default MoveToWaitingListModal;
