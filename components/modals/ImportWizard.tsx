import React, { useState, useRef } from 'react';
import { X, UploadCloud, FileSpreadsheet, Download, CheckCircle, ArrowRight, AlertCircle } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Lead } from '../../types';

interface ImportWizardProps {
    onClose: () => void;
    onImport: (data: any[]) => void;
    availableSources: string[];
    currentUser: any;
    leads: Lead[];
    normalizeClassification: (input: string) => string | null;
}

const ImportWizard = ({
    onClose, onImport, availableSources, currentUser, leads, normalizeClassification
}: ImportWizardProps) => {
    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [fileData, setFileData] = useState<any[]>([]);
    const [headers, setHeaders] = useState<string[]>([]);
    const [mapping, setMapping] = useState<Record<string, string>>({});

    const isSales = currentUser?.role === 'sales';
    const [source, setSource] = useState(isSales ? 'Importação - Vendedor' : 'Importado');

    const [previewData, setPreviewData] = useState<any[]>([]);
    const [errors, setErrors] = useState<any[]>([]);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const crmFields = [
        { key: 'name', label: 'Nome Completo (Obrigatório)', required: true },
        { key: 'email', label: 'E-mail (Opcional)', required: false },
        { key: 'phone', label: 'Telefone (Opcional)', required: false },
        { key: 'company', label: 'Empresa', required: false },
        { key: 'desiredCourse', label: 'Curso Desejado (Obrigatório para Pipeline)', required: true },
        { key: 'classification', label: 'Classificação (Obrigatório para Pipeline)', required: true },
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
                    const lower = String(h).toLowerCase();
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

            const rawClass = lead.classification ? String(lead.classification) : '';
            const normalizedClass = normalizeClassification(rawClass);

            if (!normalizedClass) {
                hasError = true;
                errorMsg = `Classificação inválida ou desconhecida: "${rawClass || 'Vazio'}".`;
            } else {
                lead.classification = normalizedClass;
            }

            const isEmailValid = lead.email && lead.email.includes('@');
            const isPhoneValid = lead.phone && lead.phone.replace(/\D/g, '').length >= 8;

            if (!lead.name) {
                hasError = true; errorMsg = 'Nome é obrigatório.';
            } else if (!lead.desiredCourse) {
                hasError = true; errorMsg = 'Curso Desejado é obrigatório para gerar Matrícula.';
            } else if (!isEmailValid && !isPhoneValid) {
                hasError = true;
                errorMsg = lead.email || lead.phone ? 'Contatos inválidos (E-mail s/ @ ou Tel < 8 dígitos).' : 'Pelo menos um contato necessário.';
            } else if (isEmailValid && existingEmails.has(String(lead.email))) {
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
        onImport(previewData);
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
                                <UploadCloud size={48} className="text-indigo-400 mb-4" />
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
                                        <select className="border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none w-full" value={mapping[field.key] || ''} onChange={(e) => setMapping({ ...mapping, [field.key]: e.target.value })}>
                                            <option value="">-- Ignorar --</option>
                                            {headers.map((h, i) => <option key={i} value={i}>{h}</option>)}
                                        </select>
                                    </div>
                                ))}
                                <div className="grid grid-cols-2 gap-4 items-center pt-4 border-t border-gray-100">
                                    <label className="text-sm font-medium text-gray-700">Fonte Padrão</label>
                                    <select
                                        disabled={isSales}
                                        className={`border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none w-full ${isSales ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''}`}
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
                                    <div className="bg-red-50 px-4 py-2 border-b border-red-200 text-xs font-bold text-red-700 uppercase flex items-center gap-2"><AlertCircle size={14} /> Relatório de Erros</div>
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
                                        <tbody>{previewData.slice(0, 5).map((row, i) => (<tr key={i} className="border-b border-gray-100"><td className="px-4 py-2 font-medium">{row.name}</td><td className="px-4 py-2 text-gray-500">{row.email || '-'}</td><td className="px-4 py-2 text-gray-500">{row.classification}</td></tr>))}</tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="p-6 border-t border-gray-100 flex justify-between">
                    <button onClick={() => step > 1 ? setStep(prev => (prev - 1) as 1 | 2 | 3) : onClose()} className="px-4 py-2 text-gray-600 hover:text-gray-900 text-sm font-medium">
                        {step > 1 ? 'Voltar' : 'Cancelar'}
                    </button>
                    {step === 2 && <button onClick={processData} className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium flex items-center gap-2">Validar Dados <ArrowRight size={16} /></button>}
                    {step === 3 && <button onClick={handleConfirm} disabled={previewData.length === 0} className={`px-6 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${previewData.length > 0 ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-gray-200 text-gray-400 font-medium'}`}><CheckCircle size={16} /> Confirmar Importação</button>}
                </div>
            </div>
        </div>
    );
};

export default ImportWizard;
