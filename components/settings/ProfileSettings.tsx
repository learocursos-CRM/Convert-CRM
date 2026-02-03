import React, { useState, useRef } from 'react';
import { useCRM } from '../../context/CRMContext';
import { Camera, KeyRound } from 'lucide-react';

const ProfileSettings = () => {
    const { currentUser, changeMyPassword, updateMyProfile } = useCRM();
    const [oldPwd, setOldPwd] = useState('');
    const [p1, setP1] = useState('');
    const [p2, setP2] = useState('');
    const [msg, setMsg] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setMsg('');

        if (p1.length < 6) return setMsg("Erro: A senha deve ter no mínimo 6 caracteres.");
        if (p1 !== p2) return setMsg("Erro: As novas senhas não conferem.");

        const success = changeMyPassword(p1, oldPwd);

        if (success) {
            setMsg("Sucesso: Senha alterada!");
            setOldPwd('');
            setP1('');
            setP2('');
        } else {
            setMsg("Erro: A senha atual está incorreta.");
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                if (reader.result) {
                    updateMyProfile({ avatar: reader.result as string });
                }
            };
            reader.readAsDataURL(file);
        }
    };

    return (
        <div className="max-w-xl">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Meu Perfil</h2>

            <div className="flex items-center gap-6 mb-8 bg-gray-50 p-6 rounded-xl border border-gray-100">
                <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                    <img src={currentUser?.avatar} className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-sm" alt="Avatar" />
                    <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Camera className="text-white" size={24} />
                    </div>
                    <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept="image/*"
                        onChange={handleFileChange}
                    />
                </div>

                <div>
                    <h3 className="font-bold text-xl text-gray-900">{currentUser?.name}</h3>
                    <p className="text-gray-500 mb-2">{currentUser?.email}</p>
                    <span className="text-xs bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full uppercase font-bold tracking-wide">
                        {currentUser?.role === 'admin' ? 'Administrador' : 'Vendedor'}
                    </span>
                    <p className="text-xs text-gray-400 mt-2">Clique na foto para alterar</p>
                </div>
            </div>

            <div className="border-t border-gray-200 pt-6">
                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <KeyRound size={20} /> Alterar Senha
                </h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                    {msg && <div className={`p-3 rounded text-sm ${msg.startsWith('Sucesso') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{msg}</div>}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Senha Atual</label>
                        <input type="password" required className="w-full border rounded px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500" value={oldPwd} onChange={e => setOldPwd(e.target.value)} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nova Senha</label>
                        <input type="password" required className="w-full border rounded px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500" value={p1} onChange={e => setP1(e.target.value)} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar Nova Senha</label>
                        <input type="password" required className="w-full border rounded px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500" value={p2} onChange={e => setP2(e.target.value)} />
                    </div>
                    <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 font-medium">
                        Atualizar Senha
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ProfileSettings;
