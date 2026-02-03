import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../types';
import { supabase } from '../services/supabase';

interface AuthContextType {
    currentUser: User | null;
    users: User[];
    isLoading: boolean;
    login: (email: string, password: string) => Promise<boolean>;
    logout: () => Promise<void>;
    changeMyPassword: (newPassword: string, oldPassword: string) => Promise<boolean>;
    updateMyProfile: (data: Partial<User>) => Promise<void>;
    addUser: (userData: Omit<User, 'id' | 'avatar'>) => Promise<void>;
    updateUser: (id: string, data: Partial<User>) => void;
    deleteUser: (id: string) => void;
    adminResetPassword: (userId: string, newPassword: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchUsers = async () => {
        try {
            const { data: profilesRes } = await supabase.from('profiles').select('*');
            if (profilesRes) {
                setUsers(profilesRes.map(p => ({
                    ...p,
                    id: p.id ?? p.Id,
                    name: p.name ?? p.Name ?? 'Usuário',
                    email: p.email ?? p.Email,
                    role: p.role ?? p.Role ?? 'viewer',
                    mustChangePassword: p.must_change_password ?? p.mustChangePassword ?? false
                } as User)));
            }
        } catch (error) {
            console.error('[AUTH] Error fetching users:', error);
        }
    };

    const fetchSession = async () => {
        setIsLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', session.user.id)
                    .single();

                if (profile) {
                    setCurrentUser({
                        ...profile,
                        id: profile.id || profile.Id,
                        name: profile.name || profile.Name,
                        email: profile.email || profile.Email,
                        role: profile.role || profile.Role,
                        mustChangePassword: profile.must_change_password || profile.mustChangePassword
                    } as User);
                }
            }
            await fetchUsers();
        } catch (error) {
            console.error('[AUTH] Critical Error during session fetch:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchSession();

        const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_IN' && session?.user) {
                const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
                if (profile) {
                    setCurrentUser({
                        ...profile,
                        mustChangePassword: profile.must_change_password
                    } as User);
                }
                fetchUsers();
            } else if (event === 'SIGNED_OUT') {
                setCurrentUser(null);
                setUsers([]);
            }
        });

        return () => {
            authListener.subscription.unsubscribe();
        };
    }, []);

    const login = async (email: string, password: string): Promise<boolean> => {
        try {
            const { error, data } = await supabase.auth.signInWithPassword({ email, password });
            if (error) {
                alert('Erro ao fazer login: ' + error.message);
                return false;
            }

            if (data.session?.user) {
                const { data: profile, error: profileError } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', data.session.user.id)
                    .single();

                if (profileError || !profile) {
                    alert("Login bem-sucedido, mas erro ao carregar perfil. Contate o suporte.");
                    await supabase.auth.signOut();
                    return false;
                }

                setCurrentUser({
                    ...profile,
                    mustChangePassword: profile.must_change_password
                } as User);
            }
            return true;
        } catch (e: any) {
            alert('Erro inesperado: ' + (e.message || e));
            return false;
        }
    };

    const logout = async () => {
        try {
            await supabase.auth.signOut();

            setCurrentUser(null);
            setUsers([]);

            // Cache clearing
            const supabaseKeys = Object.keys(localStorage).filter(key => key.startsWith('sb-'));
            const supabaseAuthValues: { [key: string]: string } = {};
            supabaseKeys.forEach(key => {
                const value = localStorage.getItem(key);
                if (value) supabaseAuthValues[key] = value;
            });

            localStorage.clear();
            for (const key in supabaseAuthValues) {
                localStorage.setItem(key, supabaseAuthValues[key]);
            }
            sessionStorage.clear();

            try {
                const databases = await window.indexedDB.databases();
                databases.forEach(db => { if (db.name) window.indexedDB.deleteDatabase(db.name); });
            } catch (e) {
                console.warn('Could not clear IndexedDB:', e);
            }

            window.location.href = '/#/login';
        } catch (error) {
            console.error('Logout error:', error);
            window.location.href = '/#/login';
        }
    };

    const changeMyPassword = async (newPwd: string, oldPwd: string): Promise<boolean> => {
        if (!currentUser) return false;
        try {
            const { error: updateError } = await supabase.auth.updateUser({ password: newPwd });
            if (updateError) {
                alert("Erro ao atualizar senha: " + updateError.message);
                return false;
            }

            await supabase.from('profiles').update({ must_change_password: false }).eq('id', currentUser.id);
            setCurrentUser({ ...currentUser, mustChangePassword: false });
            alert("Senha alterada com sucesso!");
            return true;
        } catch (e: any) {
            alert("Erro inesperado: " + (e.message || e));
            return false;
        }
    };

    const updateMyProfile = async (data: Partial<User>) => {
        if (!currentUser) return;
        try {
            const updateData: any = {};
            if (data.avatar !== undefined) updateData.avatar = data.avatar;
            if (data.name !== undefined) updateData.name = data.name;
            if (data.email !== undefined) updateData.email = data.email;
            if (data.role !== undefined) updateData.role = data.role;
            if (data.active !== undefined) updateData.active = data.active;
            if (data.mustChangePassword !== undefined) updateData.must_change_password = data.mustChangePassword;

            const { error } = await supabase.from('profiles').update(updateData).eq('id', currentUser.id);
            if (error) {
                alert('Erro ao atualizar perfil: ' + error.message);
                return;
            }

            const updatedUser = { ...currentUser, ...data };
            setUsers(prev => prev.map(u => u.id === currentUser.id ? updatedUser : u));
            setCurrentUser(updatedUser);
        } catch (error: any) {
            alert('Erro ao atualizar perfil: ' + error.message);
        }
    };

    const addUser = async (userData: Omit<User, 'id' | 'avatar'>) => {
        if (currentUser?.role !== 'admin') {
            alert("ACESSO NEGADO: Apenas administradores podem adicionar usuários.");
            return;
        }

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) { alert('Sessão expirada. Faça login novamente.'); return; }

            const response = await fetch('/api/admin/create-user', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                },
                body: JSON.stringify({
                    email: userData.email, password: userData.password, name: userData.name, role: userData.role
                })
            });

            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'Erro ao criar usuário');

            const newUser: User = {
                id: result.user.id,
                name: result.user.name,
                email: result.user.email,
                role: result.user.role,
                avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(result.user.name)}&background=random`,
                active: true
            };

            setUsers(prev => [...prev, newUser]);
            alert(`Usuário ${newUser.name} criado com sucesso!`);
        } catch (error: any) {
            alert(`Erro ao criar usuário: ${error.message}`);
        }
    };

    const updateUser = (id: string, data: Partial<User>) => {
        // Implement database update if needed
    };

    const deleteUser = (id: string) => {
        alert("Para excluir usuários, use o Painel do Supabase.");
    };

    const adminResetPassword = (userId: string, newPassword: string) => {
        if (currentUser?.role !== 'admin') {
            alert("ACESSO NEGADO");
            return;
        }
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, mustChangePassword: true } : u));
    };

    return (
        <AuthContext.Provider value={{
            currentUser, users, isLoading,
            login, logout, changeMyPassword, updateMyProfile, addUser, updateUser, deleteUser, adminResetPassword
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within an AuthProvider');
    return context;
};
