import React, { useState } from 'react';
import { useCRM } from '../../context/CRMContext';
import { PlayCircle } from 'lucide-react';

const GeneralSettings = () => {
    const { companySettings, updateCompanySettings, addLead } = useCRM();
    const [form, setForm] = useState(companySettings);

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        updateCompanySettings(form);
        alert('Configurações salvas com sucesso!');
    };

    const handleSimulateData = () => {
        if (!confirm("Isso criará 3 leads de teste para validar a automação do pipeline. Continuar?")) return;

        addLead({
            name: "Simulação Comunidade",
            email: "teste1@simulacao.com",
            phone: "11999999991",
            company: "Particular",
            classification: "Comunidade",
            desiredCourse: "Excel Avançado",
            source: "Simulação"
        });
        addLead({
            name: "Simulação Trabalhador",
            email: "teste2@simulacao.com",
            phone: "11999999992",
            company: "TransLog S.A.",
            classification: "Trabalhador vinculado à empresa do transporte",
            desiredCourse: "Gestão de Frotas",
            source: "Simulação"
        });
        addLead({
            name: "Simulação Inválido",
            email: "teste3@simulacao.com",
            phone: "11999999993",
            company: "Indeciso Ltda",
            classification: "Comunidade",
            desiredCourse: "",
            source: "Simulação"
        });

        alert("✅ Simulação concluída!");
    };

    return (
        <div className="max-w-2xl space-y-8">
            <div>
                <h2 className="text-2xl font-bold text-gray-800 mb-6">Dados da Empresa</h2>
                <form onSubmit={handleSave} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nome da Empresa</label>
                        <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full border rounded px-3 py-2" />
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Moeda</label>
                            <select value={form.currency} onChange={e => setForm({ ...form, currency: e.target.value })} className="w-full border rounded px-3 py-2">
                                <option value="BRL">Real (BRL)</option>
                                <option value="USD">Dólar (USD)</option>
                            </select>
                        </div>
                    </div>
                    <div className="pt-4"><button type="submit" className="bg-indigo-600 text-white px-6 py-2 rounded hover:bg-indigo-700">Salvar</button></div>
                </form>
            </div>
            <div className="border-t pt-8">
                <h3 className="text-lg font-bold text-gray-800 mb-4">Área de Testes</h3>
                <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-6 flex justify-between items-center">
                    <div><h4 className="font-bold text-indigo-900">Gerar Massa de Dados</h4><p className="text-sm text-indigo-700">Cria leads de teste.</p></div>
                    <button onClick={handleSimulateData} className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 flex gap-2"><PlayCircle size={18} /> Simular</button>
                </div>
            </div>
        </div>
    );
};

export default GeneralSettings;
