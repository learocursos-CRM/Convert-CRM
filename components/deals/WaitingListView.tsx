import React, { useMemo, useState } from 'react';
import { useCRM } from '../../context/CRMContext';
import { WaitingListItem } from '../../types';
import { Filter, FileText, GraduationCap, Clock, PauseCircle, Undo2 } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface WaitingListViewProps {
    waitingList: WaitingListItem[];
    onRestore: (id: string) => void;
}

const WaitingListView: React.FC<WaitingListViewProps> = ({ waitingList, onRestore }) => {
    const { leads } = useCRM();
    const getLead = (id: string) => leads.find(l => l.id === id);

    const [selectedCourse, setSelectedCourse] = useState('ALL');

    const courses = useMemo(() => {
        const unique = new Set(waitingList.map(item => item.course));
        return ['ALL', ...Array.from(unique)];
    }, [waitingList]);

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
        if (selectedCourse !== 'ALL') doc.text(`Filtro de Curso: ${selectedCourse}`, 14, 36);

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
            headStyles: { fillColor: [79, 70, 229] }
        });

        doc.save('lista_de_espera.pdf');
    };

    return (
        <div className="flex flex-col gap-4">
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
                                            <div className="font-medium text-gray-900">{item.leadName}</div>
                                            <div className="text-[10px] text-gray-400 font-mono mt-1">{item.leadId}</div>
                                            <div className="text-xs text-gray-500">{lead?.company}</div>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex flex-col gap-1.5 text-xs text-gray-600">
                                                {item.leadPhone && (
                                                    <span className="flex items-center gap-1">
                                                        📞 {item.leadPhone}
                                                    </span>
                                                )}
                                                {item.leadEmail && (
                                                    <span className="flex items-center gap-1">
                                                        📧 {item.leadEmail}
                                                    </span>
                                                )}
                                                {!item.leadPhone && !item.leadEmail && (
                                                    <span className="text-gray-400 italic">Sem contato</span>
                                                )}
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

export default WaitingListView;
