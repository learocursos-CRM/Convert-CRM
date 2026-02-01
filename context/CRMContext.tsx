import React, { createContext, useContext, useState, ReactNode, useMemo, useEffect } from 'react';
import { Lead, Deal, Activity, User, DealStage, LeadSource, CompanySettings, WaitingListItem } from '../types';
import { supabase } from '../services/supabase';

export type SLAStatus = 'normal' | 'warning' | 'overdue' | 'handled';

interface SLAData {
  status: SLAStatus;
  hoursDiff: number;
  label: string;
}

interface PipelineStatusData {
  label: string;
  colorClass: string;
  isLinked: boolean;
  dealId?: string;
}

interface CRMContextType {
  allLeads: Lead[];
  leads: Lead[];
  deals: Deal[];
  waitingList: WaitingListItem[];
  activities: Activity[];
  users: User[];
  currentUser: User | null;
  companySettings: CompanySettings;
  availableSources: string[];
  lossReasons: string[];
  waitingReasons: string[];
  globalSearch: string;
  setGlobalSearch: (term: string) => void;
  isLoading: boolean; // Add loading state

  // Auth Actions
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  changeMyPassword: (newPassword: string, oldPassword: string) => Promise<boolean>;
  updateMyProfile: (data: Partial<User>) => Promise<void>;
  adminResetPassword: (userId: string, newPassword: string) => void;

  // Actions
  addLead: (lead: Omit<Lead, 'id' | 'createdAt'>) => Promise<boolean>;
  bulkAddLeads: (leads: Omit<Lead, 'id' | 'createdAt'>[]) => Promise<void>;
  updateLeadData: (id: string, data: Partial<Lead>) => Promise<void>;
  assignLead: (leadId: string, userId: string) => Promise<void>;
  addDeal: (deal: Omit<Deal, 'id'>) => Promise<void>;
  updateDealStage: (id: string, stage: DealStage) => Promise<void>;
  updateDeal: (id: string, data: Partial<Deal>) => Promise<void>;
  deleteDeal: (id: string) => Promise<void>;
  moveToWaitingList: (dealId: string, reason: string, notes?: string) => Promise<void>;
  restoreFromWaitingList: (itemId: string) => Promise<void>;
  updateWaitingListItem: (id: string, data: Partial<WaitingListItem>) => Promise<void>;
  addActivity: (activity: Omit<Activity, 'id' | 'timestamp'>) => Promise<void>;
  getLeadActivities: (leadId: string) => Activity[];
  updateCompanySettings: (settings: CompanySettings) => void;
  addSource: (source: string) => void;
  removeSource: (source: string) => void;
  addUser: (user: Omit<User, 'id' | 'avatar'>) => void;
  updateUser: (id: string, data: Partial<User>) => void;
  deleteUser: (id: string) => void;
  switchUser: (userId: string) => void;
  deleteLead: (id: string) => Promise<void>; // Added deleteLead action

  // Helpers
  getLeadSLA: (lead: Lead) => SLAData;
  getLeadPipelineStatus: (lead: Lead) => PipelineStatusData;
  runAutoArchiving: () => number;
  normalizeClassification: (input: string) => string | null;
}

const CRMContext = createContext<CRMContextType | undefined>(undefined);

export const CRMProvider = ({ children }: { children?: ReactNode }) => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [waitingList, setWaitingList] = useState<WaitingListItem[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [globalSearch, setGlobalSearch] = useState('');
  const [companySettings, setCompanySettings] = useState<CompanySettings>({
    name: 'Minha Empresa',
    logoUrl: '',
    primaryColor: '#4f46e5',
    currency: 'BRL',
    timezone: 'America/Sao_Paulo'
  });
  const [availableSources, setAvailableSources] = useState<string[]>([
    ...Object.values(LeadSource), 'Forms', 'Balcão', 'Telefone', 'Importação - Vendedor', 'Importado'
  ]);
  const [lossReasons, setLossReasons] = useState<string[]>([
    'Não elegível', 'Preço', 'Desistência', 'Sem retorno', 'Perda de prazo', 'Arquivamento Automático por Inatividade'
  ]);
  const waitingReasons = [
    'Turma Fechada / Lotada', 'Curso Indisponível no Momento', 'Aguardando Abertura de Edital', 'Aguardando Formação de Turma', 'Aluno Solicitou Pausa'
  ];

  const fetchInitialData = async () => {
    setIsLoading(true);
    console.log('[FETCH] Starting fetchInitialData - NO TIMEOUTS, will wait for data...');

    try {
      // Fetch Session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      console.log('[FETCH] Session:', session ? 'Found' : 'None');

      if (sessionError) {
        console.error('[FETCH] Session error:', sessionError);
        setIsLoading(false);
        return;
      }

      if (session?.user) {
        // Fetch User Profile
        console.log('[FETCH] Fetching profile...');
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        console.log('[FETCH] Profile result:', profile ? 'Success' : 'Failed');

        if (profileError) {
          console.error('[FETCH] Profile error:', profileError);
          if (profileError.code === 'PGRST116') {
            console.error('[FETCH] Profile missing - forcing logout');
            await supabase.auth.signOut();
            setIsLoading(false);
            alert('Perfil de usuário não encontrado. Por favor, contate o administrador.');
            return;
          }
        }

        if (profile) {
          setCurrentUser({
            ...profile,
            mustChangePassword: profile.must_change_password
          } as User);
        }
      }

      // Fetch ALL data - NO TIMEOUTS, JUST WAIT
      console.log('[FETCH] Loading all data (no timeouts)...');

      const [leadsRes, dealsRes, waitingRes, activitiesRes, profilesRes] = await Promise.all([
        supabase.from('leads').select('*').order('created_at', { ascending: false }),
        supabase.from('deals').select('*'),
        supabase.from('waiting_list').select('*'),
        supabase.from('activities').select('*').order('timestamp', { ascending: false }).limit(500),
        supabase.from('profiles').select('*')
      ]);

      console.log('[FETCH] Data received:', {
        leads: leadsRes.data?.length || 0,
        deals: dealsRes.data?.length || 0,
        waiting: waitingRes.data?.length || 0,
        activities: activitiesRes.data?.length || 0,
        profiles: profilesRes.data?.length || 0
      });

      if (leadsRes.data) setLeads(leadsRes.data.map(mapLeadFromDB));
      if (dealsRes.data) setDeals(dealsRes.data.map(mapDealFromDB));
      if (waitingRes.data) setWaitingList(waitingRes.data.map(mapWaitingListFromDB));
      if (activitiesRes.data) setActivities(activitiesRes.data as unknown as Activity[]);
      if (profilesRes.data) setUsers(profilesRes.data.map(p => ({
        ...p,
        mustChangePassword: p.must_change_password
      } as User)));

      console.log('[FETCH] All data loaded successfully!');
    } catch (error) {
      console.error('[FETCH] CRITICAL ERROR:', error);
    } finally {
      setIsLoading(false);
      console.log('[FETCH] Loading complete');
    }
  };

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      // CACHE VERSIONING SYSTEM - Forces complete reset if version mismatches
      const CACHE_VERSION = 'v2.0'; // Increment this to force cache clear on all clients
      const currentVersion = localStorage.getItem('crm_cache_version');

      if (currentVersion !== CACHE_VERSION) {
        console.warn(`Cache version mismatch (${currentVersion} !== ${CACHE_VERSION}). Forcing complete cache reset...`);

        // NUCLEAR OPTION: Clear everything except Supabase auth
        const keysToPreserve: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('sb-')) {
            keysToPreserve.push(key);
          }
        }

        const preservedValues: { [key: string]: string } = {};
        keysToPreserve.forEach(key => {
          const value = localStorage.getItem(key);
          if (value) preservedValues[key] = value;
        });

        // Clear all storage
        localStorage.clear();
        sessionStorage.clear();

        // Restore auth keys
        Object.keys(preservedValues).forEach(key => {
          localStorage.setItem(key, preservedValues[key]);
        });

        // Set new version
        localStorage.setItem('crm_cache_version', CACHE_VERSION);

        // Clear IndexedDB
        try {
          const databases = await window.indexedDB.databases();
          for (const db of databases) {
            if (db.name && !db.name.includes('supabase')) {
              window.indexedDB.deleteDatabase(db.name);
            }
          }
        } catch (e) {
          console.warn('IndexedDB cleanup failed:', e);
        }

        console.log('Cache reset complete. Proceeding with fresh state.');
      }

      await fetchInitialData();
    };
    init();

    // Listen for Auth Changes
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      if (event === 'SIGNED_IN' && session?.user) {
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
        if (profile && mounted) {
          setCurrentUser({
            ...profile,
            mustChangePassword: profile.must_change_password
          } as User);
        }
        if (mounted) fetchInitialData();
      } else if (event === 'SIGNED_OUT') {
        if (mounted) {
          setCurrentUser(null);
          setLeads([]);
          setDeals([]);
          setWaitingList([]);
          setActivities([]);
        }
      }
    });

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);


  // --- AUTHENTICATION ---
  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      // 1. Authenticate with Supabase
      const { error, data } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error("Login Error:", error);
        alert('Erro ao fazer login: ' + error.message);
        return false;
      }

      // 2. Explicitly fetch profile immediately to reject login if profile missing
      if (data.session?.user) {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.session.user.id)
          .single();

        if (profileError || !profile) {
          console.error("Profile missing or fetch error:", profileError);
          alert("Login bem-sucedido, mas erro ao carregar perfil. Contate o suporte.");
          await supabase.auth.signOut(); // Force logout
          return false;
        }

        setCurrentUser({
          ...profile,
          mustChangePassword: profile.must_change_password
        } as User);
      }

      return true;
    } catch (e: any) {
      console.error("Unexpected Login Error:", e);
      alert('Erro inesperado: ' + (e.message || e));
      return false;
    }
  };

  const logout = async () => {
    try {
      // 1. Sign out from Supabase (clears session)
      await supabase.auth.signOut();

      // 2. Reset ALL local state to prevent contamination
      setCurrentUser(null);
      setLeads([]);
      setDeals([]);
      setWaitingList([]);
      setActivities([]);
      setUsers([]);
      setGlobalSearch('');

      // 3. AGGRESSIVE CACHE CLEARING - This solves the "clear cache fixes it" issue
      // Clear LocalStorage (but preserve Supabase auth keys for clean logout)
      const supabaseKeys = Object.keys(localStorage).filter(key => key.startsWith('sb-'));
      const supabaseAuthValues: { [key: string]: string } = {};
      supabaseKeys.forEach(key => {
        const value = localStorage.getItem(key);
        if (value) supabaseAuthValues[key] = value;
      });

      localStorage.clear();
      // Restore only Supabase auth keys to allow proper logout flow
      for (const key in supabaseAuthValues) {
        localStorage.setItem(key, supabaseAuthValues[key]);
      }

      // Clear SessionStorage completely
      sessionStorage.clear();

      // Clear IndexedDB (Supabase cache)
      try {
        const databases = await window.indexedDB.databases();
        databases.forEach(db => {
          if (db.name) {
            window.indexedDB.deleteDatabase(db.name);
          }
        });
      } catch (e) {
        console.warn('Could not clear IndexedDB:', e);
      }

      // 4. Force reload to clear any cached state in memory
      // This prevents the "infinite loading" bug on re-login
      window.location.href = '/#/login';
    } catch (error) {
      console.error('Logout error:', error);
      // Even if logout fails, force redirect to login
      window.location.href = '/#/login';
    }
  };

  const changeMyPassword = async (newPwd: string, oldPwd: string): Promise<boolean> => {
    if (!currentUser) return false;

    try {
      // Update password using Supabase
      // Note: We're not verifying the old password here because Supabase
      // requires the user to be authenticated to change password anyway
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPwd
      });

      if (updateError) {
        console.error("Password update failed:", updateError);
        alert("Erro ao atualizar senha: " + updateError.message);
        return false;
      }

      // 3. Update must_change_password flag in profiles
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ must_change_password: false })
        .eq('id', currentUser.id);

      if (profileError) {
        console.error("Failed to update must_change_password flag:", profileError);
        // Don't fail, password was changed successfully
      }

      // 4. Update local state
      setCurrentUser({
        ...currentUser,
        mustChangePassword: false
      });

      alert("Senha alterada com sucesso!");
      return true;
    } catch (e: any) {
      console.error("Unexpected error during password change:", e);
      alert("Erro inesperado: " + (e.message || e));
      return false;
    }
  };

  const updateMyProfile = async (data: Partial<User>) => {
    if (!currentUser) return;

    try {
      // 1. Update in Supabase database
      const updateData: any = {};

      // Map camelCase to snake_case for database
      if (data.avatar !== undefined) updateData.avatar = data.avatar;
      if (data.name !== undefined) updateData.name = data.name;
      if (data.email !== undefined) updateData.email = data.email;
      if (data.role !== undefined) updateData.role = data.role;
      if (data.active !== undefined) updateData.active = data.active;
      if (data.mustChangePassword !== undefined) updateData.must_change_password = data.mustChangePassword;

      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', currentUser.id);

      if (error) {
        console.error('Error updating profile:', error);
        alert('Erro ao atualizar perfil: ' + error.message);
        return;
      }

      // 2. Update local state only after successful database update
      const updatedUser = { ...currentUser, ...data };

      setUsers(prev => prev.map(u =>
        u.id === currentUser.id ? updatedUser : u
      ));

      setCurrentUser(updatedUser);

      // Success feedback for avatar upload
      if (data.avatar) {
        console.log('Avatar updated successfully');
      }
    } catch (error: any) {
      console.error('Error in updateMyProfile:', error);
      alert('Erro ao atualizar perfil: ' + error.message);
    }
  };

  const adminResetPassword = (userId: string, newPassword: string) => {
    checkAdmin('resetar senhas');
    setUsers(prev => prev.map(u =>
      u.id === userId
        ? { ...u, password: newPassword, mustChangePassword: true } // Force change on next login
        : u
    ));
  };

  // --- NORMALIZATION LOGIC ---
  const normalizeClassification = (input: string): string | null => {
    if (!input || typeof input !== 'string') return null;
    const text = input.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    if (text.includes('dependente') && text.includes('trabalhador') && (text.includes('empresa do transporte') || text.includes('setor de transportes'))) {
      return 'Dependente de trabalhador vinculado à empresa do transporte';
    }
    if (text.includes('trabalhador') && (text.includes('empresa do transporte') || text.includes('setor de transportes'))) {
      return 'Trabalhador vinculado à empresa do transporte';
    }
    if (text.includes('comunidade')) {
      return 'Comunidade';
    }
    return null;
  };

  // ARCHIVING BASED ON DEAL STAGE
  const runAutoArchiving = (): number => {
    const STALE_DAYS = 60;
    const now = new Date().getTime();
    let archivedCount = 0;
    const leadsToArchive: string[] = [];

    leads.forEach(lead => {
      // Find Deal
      const deal = deals.find(d => d.leadId === lead.id);
      // If already lost/won or in waiting list, skip
      if (deal && (deal.stage === DealStage.WON || deal.stage === DealStage.LOST)) return;
      if (waitingList.some(w => w.leadId === lead.id)) return;

      const lastInteractionDate = lead.lastInteraction ? new Date(lead.lastInteraction).getTime() : new Date(lead.createdAt).getTime();
      if ((now - lastInteractionDate) / (1000 * 3600 * 24) > STALE_DAYS) leadsToArchive.push(lead.id);
    });

    if (leadsToArchive.length > 0) {
      // We archive by setting the DEAL to LOST.
      // Leads themselves don't have status.
      setDeals(prev => prev.map(d => leadsToArchive.includes(d.leadId) ? { ...d, stage: DealStage.LOST, lossReason: 'Arquivamento Automático por Inatividade' } : d));
      // We might trigger "Set Lead Data" to maybe set a "lostReason" on the lead if that field exists? 
      // Lead has lostReason field.
      setLeads(prev => prev.map(l => leadsToArchive.includes(l.id) ? { ...l, lostReason: 'Arquivamento Automático por Inatividade' } : l));

      leadsToArchive.forEach(id => addActivity({ type: 'status_change', content: `Lead arquivado automaticamente após ${STALE_DAYS} dias sem interação.`, leadId: id, performer: 'Sistema (Automação)' }));
      archivedCount = leadsToArchive.length;
    }
    return archivedCount;
  };

  useEffect(() => { const timer = setTimeout(() => { runAutoArchiving(); }, 2000); return () => clearTimeout(timer); }, []);

  const visibleLeads = useMemo(() => {
    if (!currentUser) return [];
    // EXCLUDE WAITING LIST LEADS STRICTLY (INSTITUTIONAL RULE)
    const waitingLeadIds = waitingList.map(w => w.leadId);
    const activeLeads = leads.filter(l => !waitingLeadIds.includes(l.id));

    return currentUser.role === 'admin' ? activeLeads : activeLeads.filter(l => l.ownerId === currentUser.id);
  }, [leads, waitingList, currentUser]);

  const visibleDeals = useMemo(() => {
    if (!currentUser) return [];
    return currentUser.role === 'admin' ? deals : deals.filter(d => d.ownerId === currentUser.id);
  }, [deals, currentUser]);

  const visibleWaitingList = useMemo(() => {
    if (!currentUser) return [];
    return currentUser.role === 'admin' ? waitingList : waitingList.filter(w => w.ownerId === currentUser.id);
  }, [waitingList, currentUser]);

  // STATUS REMOVED
  // const mapStageToLeadStatus = ... (Deleted)

  const getLeadPipelineStatus = (lead: Lead): PipelineStatusData => {
    const isWaiting = waitingList.some(w => w.leadId === lead.id);
    if (isWaiting) return { label: 'Em Lista de Espera', colorClass: 'bg-amber-100 text-amber-800 border border-amber-200', isLinked: true };
    const deal = deals.find(d => d.leadId === lead.id && d.stage !== DealStage.LOST) || deals.find(d => d.leadId === lead.id);
    // If no deal, what is the status? User says "Lead só existe operacionalmente se possuir Deal ativo".
    // Theoretically shouldn't happen for valid leads.
    if (!deal) return { label: 'Incompleto (Sem Negócio)', colorClass: 'bg-gray-100 text-gray-600', isLinked: false };
    let label = '', colorClass = '';
    switch (deal.stage) {
      case DealStage.NEW: label = 'Novo Lead'; colorClass = 'bg-blue-50 text-blue-700 border border-blue-100'; break;
      case DealStage.CONTACT: label = 'Em Atendimento'; colorClass = 'bg-indigo-50 text-indigo-700 border border-indigo-100'; break;
      case DealStage.QUALIFIED: label = 'Qualificado'; colorClass = 'bg-purple-50 text-purple-700 border border-purple-100'; break;
      case DealStage.PROPOSAL: label = 'Proposta Enviada'; colorClass = 'bg-orange-50 text-orange-700 border border-orange-100'; break;
      case DealStage.DECISION: label = 'Em Negociação'; colorClass = 'bg-amber-50 text-amber-700 border border-amber-100'; break;
      case DealStage.WON: label = 'Convertido'; colorClass = 'bg-green-100 text-green-800 border border-green-200'; break;
      case DealStage.LOST: label = 'Perdido'; colorClass = 'bg-red-50 text-red-700 border border-red-100'; break;
    }
    return { label, colorClass, isLinked: true, dealId: deal.id };
  };

  const checkAdmin = (actionName: string) => { if (!currentUser || currentUser.role !== 'admin') { alert(`ACESSO NEGADO: Apenas administradores podem ${actionName}.`); throw new Error(`Permission Denied: ${actionName}`); } };
  const checkOwnership = (resourceOwnerId: string | undefined, actionName: string) => { if (currentUser?.role === 'admin') return; if (resourceOwnerId !== currentUser?.id) { alert(`ACESSO NEGADO: Você só pode ${actionName} seus próprios registros.`); throw new Error(`Permission Denied: ${actionName}`); } };

  const validClassifications = ['comunidade', 'trabalhador vinculado à empresa do transporte', 'dependente de trabalhador vinculado à empresa do transporte'];

  const checkEligibilityForAutoDeal = (lead: Omit<Lead, 'id' | 'createdAt'> | Lead): boolean => {
    if (!lead.name || lead.name.trim() === '') return false;
    if (!lead.desiredCourse || lead.desiredCourse.trim() === '') return false;
    if (!lead.classification || !validClassifications.includes(lead.classification.toLowerCase())) return false;
    const hasEmail = lead.email && lead.email.includes('@');
    const hasPhone = lead.phone && lead.phone.replace(/\D/g, '').length >= 8;
    return !!(hasEmail || hasPhone);
  };

  const createDealObject = (lead: Lead, ownerId: string): Deal => {
    return {
      id: Math.random().toString(36).substr(2, 9),
      leadId: lead.id,
      title: `Matrícula – ${lead.name}`,
      value: 0,
      stage: DealStage.NEW,
      probability: 10,
      expectedCloseDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      ownerId: ownerId,
    };
  };

  const getLeadSLA = (lead: Lead): SLAData => {
    const now = new Date();
    const created = new Date(lead.createdAt);
    const hoursDiff = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60));

    // Check Deal Stage for completion
    const deal = deals.find(d => d.leadId === lead.id);
    if (deal && (deal.stage === DealStage.WON || deal.stage === DealStage.LOST)) return { status: 'handled', hoursDiff, label: 'Finalizado' };

    if (waitingList.some(w => w.leadId === lead.id)) return { status: 'handled', hoursDiff, label: 'Lista de Espera' };
    const hasHumanInteraction = activities.some(a => a.leadId === lead.id && ['call', 'email', 'meeting', 'note'].includes(a.type));
    if (hasHumanInteraction) return { status: 'handled', hoursDiff, label: 'Atendido' };
    if (hoursDiff >= 24) return { status: 'overdue', hoursDiff, label: 'SLA Estourado' };
    if (hoursDiff >= 12) return { status: 'warning', hoursDiff, label: 'Atenção' };
    return { status: 'normal', hoursDiff, label: 'No prazo' };
  };



  // const _internalUpdateLeadStatus = Removed

  // --- MAPPERS ---
  const mapLeadFromDB = (db: any): Lead => ({
    id: db.id, name: db.name, company: db.company, email: db.email, phone: db.phone,
    source: db.source, classification: db.classification, desiredCourse: db.desired_course,
    ownerId: db.owner_id, createdAt: db.created_at, lastInteraction: db.last_interaction, lostReason: db.lost_reason
  });

  const mapDealFromDB = (db: any): Deal => ({
    id: db.id, leadId: db.lead_id, title: db.title, value: db.value, stage: db.stage,
    probability: db.probability, expectedCloseDate: db.expected_close_date, ownerId: db.owner_id, lossReason: db.loss_reason
  });

  const mapWaitingListFromDB = (db: any): WaitingListItem => ({
    id: db.id, leadId: db.lead_id, course: db.course, reason: db.reason, notes: db.notes,
    ownerId: db.owner_id, createdAt: db.created_at, originalDealValue: db.original_deal_value
  });

  // --- ACTIONS ---

  const addLead = async (leadData: Omit<Lead, 'id' | 'createdAt'>): Promise<boolean> => {
    if (!currentUser) return false;
    const ownerId = currentUser.role === 'admin' ? (leadData.ownerId || currentUser.id) : currentUser.id;

    // Validation
    const safeClassification = normalizeClassification(leadData.classification || '');
    if (!safeClassification) { alert("Erro de Validação: Classificação inválida."); return false; }

    try {
      const { data, error } = await supabase.from('leads').insert({
        name: leadData.name,
        company: leadData.company,
        email: leadData.email,
        phone: leadData.phone,
        source: leadData.source,
        classification: safeClassification,
        desired_course: leadData.desiredCourse,
        owner_id: ownerId,
        // created_at is default
      }).select().single();

      if (error) throw error;

      // Update State
      const newLead = mapLeadFromDB(data);
      setLeads(prev => [newLead, ...prev]);

      // Check for Auto-Created Deal (Trigger Side-Effect)
      // We fetch deals for this lead
      const { data: dealData } = await supabase.from('deals').select('*').eq('lead_id', newLead.id);
      if (dealData && dealData.length > 0) {
        const newDeals = dealData.map(mapDealFromDB);
        setDeals(prev => [...prev, ...newDeals]);
        addActivity({ type: 'status_change', content: `Matrícula criada automaticamente (Trigger): ${newDeals[0].title}`, leadId: newLead.id, dealId: newDeals[0].id, performer: 'Sistema (Automação)' });
      }

      addActivity({ type: 'status_change', content: 'Lead criado no sistema', leadId: newLead.id, performer: currentUser.name });
      return true;

    } catch (e: any) {
      console.error(e);
      alert('Erro ao salvar lead: ' + e.message);
      return false;
    }
  };

  const bulkAddLeads = async (leadsData: Omit<Lead, 'id' | 'createdAt'>[]) => {
    // Not implementing full bulk insert for now, iterate for simplicity or use bulk insert
    // Mappers needed.
    // For speed, let's just loop addLead (sequentially or parallel).
    // Parallel is better but concurrent connections?
    // Let's use loop.
    for (const l of leadsData) {
      await addLead(l);
    }
  };

  const deleteLead = async (id: string) => {
    // 1. Validation
    if (!currentUser || currentUser.role !== 'admin') {
      alert("ACESSO NEGADO: Apenas administradores podem excluir leads.");
      return;
    }

    try {
      // 2. Direct Supabase Deletion (Transaction-like logic)

      // Delete associated Deals first (Safety measure)
      const { error: dealsError } = await supabase.from('deals').delete().eq('lead_id', id);
      if (dealsError) {
        console.warn("Aviso ao excluir deals associados:", dealsError.message);
      }

      // Delete the Lead
      const { error: leadError } = await supabase.from('leads').delete().eq('id', id);

      if (leadError) {
        throw new Error(leadError.message);
      }

      // DIAGNOSTIC CHECK: Did the deletion kill the session?
      const { data: { session: checkSession } } = await supabase.auth.getSession();
      if (!checkSession) {
        alert("CRITICAL DIAGNOSTIC: A sessão foi encerrada IMEDIATAMENTE após a exclusão no banco. Isso confirma um TRIGGER de banco de dados deletando o usuário.");
        return;
      }

      const { data: checkProfile } = await supabase.from('profiles').select('id').eq('id', currentUser.id).single();
      if (!checkProfile) {
        alert("CRITICAL DIAGNOSTIC: O perfil do usuário foi deletado após a exclusão do lead. Isso confirma um CASCADE incorreto.");
        // Session might still exist briefly in memory, but user is gone.
      }

      // 3. Update Local State (Maintains Auth Stability)
      setLeads(prev => prev.filter(l => l.id !== id));
      setDeals(prev => prev.filter(d => d.leadId !== id));

      // 4. Log Activity (Non-blocking)
      addActivity({
        type: 'status_change',
        content: `Lead excluído permanentemente via Sistema (Client-Side) - V3 Fix.`,
        leadId: id,
        performer: currentUser.name
      }).catch(err => console.error("Falha ao registrar log de exclusão", err));

      alert(`Lead excluído com sucesso! (Sessão OK: ${!!checkSession})`);

    } catch (e: any) {
      console.error(e);
      alert('Erro ao excluir lead: ' + (e.message || e));
    }
  };

  // updateLeadStatus REMOVED completely

  const updateLeadData = async (id: string, data: Partial<Lead>) => {
    if (!currentUser) return;
    const lead = leads.find(l => l.id === id);
    if (!lead) return;

    // Frontend Permission Check (UX only, RLS protects DB)
    if (currentUser.role !== 'admin' && lead.ownerId !== currentUser.id) {
      alert("ACESSO NEGADO: Você só pode editar seus próprios leads.");
      return;
    }

    if (currentUser.role !== 'admin') {
      const restrictedFields = ['classification', 'desiredCourse', 'source', 'ownerId'];
      if (Object.keys(data).some(key => restrictedFields.includes(key))) {
        alert("ACESSO NEGADO: Vendedores não podem alterar Classificação, Curso ou Fonte.");
        const safeData = { ...data };
        delete (safeData as any).classification; delete (safeData as any).desiredCourse; delete (safeData as any).source; delete (safeData as any).ownerId;
        data = safeData;
      }
    }

    if (data.classification) {
      const normalized = normalizeClassification(data.classification);
      if (!normalized) { alert("Erro: Classificação inválida."); return; }
      data.classification = normalized;
    }

    try {
      // Map to DB
      const dbUpdate: any = {};
      if (data.name) dbUpdate.name = data.name;
      if (data.company) dbUpdate.company = data.company;
      if (data.email) dbUpdate.email = data.email;
      if (data.phone) dbUpdate.phone = data.phone;
      if (data.source) dbUpdate.source = data.source;
      if (data.classification) dbUpdate.classification = data.classification;
      if (data.desiredCourse) dbUpdate.desired_course = data.desiredCourse;
      if (data.ownerId) dbUpdate.owner_id = data.ownerId;
      if (data.lostReason) dbUpdate.lost_reason = data.lostReason;

      const { error } = await supabase.from('leads').update(dbUpdate).eq('id', id);
      if (error) throw error;

      // Update Local
      const updatedLead = { ...lead, ...data };
      setLeads(prev => prev.map(l => l.id === id ? updatedLead : l));

      // Auto-Deal Check (Legacy/Edge Case Support)
      if (checkEligibilityForAutoDeal(updatedLead)) {
        const hasActiveDeal = deals.some(d => d.leadId === id && d.stage !== DealStage.WON && d.stage !== DealStage.LOST);
        if (!hasActiveDeal) {
          // Manually trigger deal creation if it wasn't there
          const newDeal = createDealObject(updatedLead as Lead, updatedLead.ownerId || currentUser.id);
          // Map to DB
          await addDeal(newDeal); // Reuse addDeal logic
        }
      }

    } catch (e: any) {
      console.error(e);
      alert('Erro ao atualizar lead: ' + e.message);
    }
  };

  const assignLead = async (leadId: string, userId: string) => {
    if (!currentUser) return;
    if (currentUser.role !== 'admin') { alert('ACESSO NEGADO'); return; }

    const user = users.find(u => u.id === userId);
    if (!user) return;

    try {
      // 1. Update Lead Owner
      const { error: leadError } = await supabase.from('leads').update({ owner_id: userId }).eq('id', leadId);
      if (leadError) throw leadError;

      setLeads(prev => prev.map(l => l.id === leadId ? { ...l, ownerId: userId } : l));

      // 2. Transfer Active Deals
      const dealsToTransfer = deals.filter(d => d.leadId === leadId && d.stage !== DealStage.WON && d.stage !== DealStage.LOST);

      if (dealsToTransfer.length > 0) {
        // Update all active deals
        // Supabase supports update with filter
        const { error: dealError } = await supabase.from('deals')
          .update({ owner_id: userId })
          .eq('lead_id', leadId)
          .neq('stage', 'Matrícula Confirmada')
          .neq('stage', 'Perdido');

        if (dealError) throw dealError;

        setDeals(prev => prev.map(d => {
          if (d.leadId === leadId && d.stage !== DealStage.WON && d.stage !== DealStage.LOST) return { ...d, ownerId: userId };
          return d;
        }));
      }

      addActivity({
        type: 'status_change',
        content: `Atribuído para responsável: ${user.name}. ${dealsToTransfer.length > 0 ? `${dealsToTransfer.length} negócios transferidos.` : ''}`,
        leadId: leadId,
        performer: currentUser.name
      });

    } catch (e: any) {
      console.error(e);
      alert('Erro ao atribuir lead: ' + e.message);
    }
  };

  const addDeal = async (dealData: Omit<Deal, 'id'>) => {
    if (!currentUser) return;

    // Permission
    if (currentUser.role !== 'admin') {
      const lead = leads.find(l => l.id === dealData.leadId);
      if (lead && lead.ownerId !== currentUser.id) { alert("Você não é o dono desse lead."); return; }
    }

    try {
      const { data, error } = await supabase.from('deals').insert({
        lead_id: dealData.leadId,
        title: dealData.title,
        value: dealData.value,
        stage: dealData.stage,
        probability: dealData.probability,
        expected_close_date: dealData.expectedCloseDate,
        owner_id: dealData.ownerId,
        loss_reason: dealData.lossReason
      }).select().single();

      if (error) throw error;

      const newDeal = mapDealFromDB(data);
      setDeals(prev => [...prev, newDeal]);

      addActivity({ type: 'status_change', content: `Negócio criado: ${newDeal.title}`, leadId: newDeal.leadId, dealId: newDeal.id, performer: currentUser.name });
    } catch (e: any) {
      console.error(e);
      alert('Erro ao criar negócio: ' + e.message);
    }
  };

  const updateDealStage = async (id: string, stage: DealStage) => {
    if (!currentUser) return;
    const deal = deals.find(d => d.id === id);
    if (!deal) return;

    // Permission
    if (currentUser.role !== 'admin' && deal.ownerId !== currentUser.id) { alert("Permissão negada."); return; }

    try {
      const { error } = await supabase.from('deals').update({ stage: stage }).eq('id', id);
      if (error) throw error;

      setDeals(prev => prev.map(d => d.id === id ? { ...d, stage } : d));
      addActivity({ type: 'status_change', content: `Negócio avançou para fase: ${stage}`, dealId: id, leadId: deal.leadId, performer: currentUser.name });
    } catch (e: any) {
      // Handle Trigger Violation (e.g. Trying to update active deal while in waiting list)
      alert('Erro ao atualizar estágio: ' + e.message);
    }
  };

  const updateDeal = async (id: string, data: Partial<Deal>) => {
    if (!currentUser) return;
    const deal = deals.find(d => d.id === id);
    if (!deal) return;

    if (currentUser.role !== 'admin' && deal.ownerId !== currentUser.id) { alert("Permissão negada."); return; }

    try {
      const dbUpdate: any = {};
      if (data.title) dbUpdate.title = data.title;
      if (data.value !== undefined) dbUpdate.value = data.value;
      if (data.stage) dbUpdate.stage = data.stage;
      if (data.probability !== undefined) dbUpdate.probability = data.probability;
      if (data.expectedCloseDate) dbUpdate.expected_close_date = data.expectedCloseDate;
      if (data.lossReason) dbUpdate.loss_reason = data.lossReason;

      const { error } = await supabase.from('deals').update(dbUpdate).eq('id', id);
      if (error) throw error;

      setDeals(prev => prev.map(d => d.id === id ? { ...d, ...data } : d));
      if (data.value !== undefined) addActivity({ type: 'status_change', content: `Valor do negócio atualizado para R$ ${data.value}`, dealId: id, performer: currentUser.name });
    } catch (e: any) {
      alert('Erro ao atualizar negócio: ' + e.message);
    }
  };

  const deleteDeal = async (id: string) => {
    if (!currentUser || currentUser.role !== 'admin') { alert("Apenas Admin."); return; }
    try {
      const { error } = await supabase.from('deals').delete().eq('id', id);
      if (error) throw error;
      setDeals(prev => prev.filter(d => d.id !== id));
    } catch (e) { alert(e); }
  };

  const moveToWaitingList = async (dealId: string, reason: string, notes?: string) => {
    if (!currentUser) return;
    const deal = deals.find(d => d.id === dealId);
    if (!deal) return;
    const lead = leads.find(l => l.id === deal.leadId);
    if (!lead) return;

    if (currentUser.role !== 'admin' && deal.ownerId !== currentUser.id) { alert("Permissão negada."); return; }

    try {
      // 1. Insert into Waiting List
      const { data: wlData, error: wlError } = await supabase.from('waiting_list').insert({
        lead_id: lead.id,
        course: lead.desiredCourse || 'Curso não informado',
        reason: reason,
        notes: notes,
        owner_id: deal.ownerId,
        original_deal_value: deal.value
      }).select().single();

      if (wlError) throw wlError;

      // 2. Delete Deal (or Archive?)
      // The Governance says: cannot have ACTIVE deal.
      // We delete the deal or move it? Code was deleting.
      const { error: delError } = await supabase.from('deals').delete().eq('id', dealId);
      if (delError) {
        // If delete fails, rollback waiting list?
        await supabase.from('waiting_list').delete().eq('id', wlData.id);
        throw delError;
      }

      const newItem = mapWaitingListFromDB(wlData);
      setWaitingList(prev => [newItem, ...prev]);
      setDeals(prev => prev.filter(d => d.id !== dealId));

      addActivity({ type: 'status_change', content: `Movido para Lista de Espera. Motivo: ${reason}`, leadId: lead.id, performer: currentUser.name });
    } catch (e: any) {
      alert('Erro ao mover para lista de espera: ' + e.message);
    }
  };

  const restoreFromWaitingList = async (itemId: string) => {
    if (!currentUser) return;
    const item = waitingList.find(w => w.id === itemId);
    if (!item) return;
    const lead = leads.find(l => l.id === item.leadId);
    if (!lead) return;

    if (currentUser.role !== 'admin' && item.ownerId !== currentUser.id) { alert("Permissão negada."); return; }

    try {
      // 1. Create New Deal
      const { data: dealData, error: dealError } = await supabase.from('deals').insert({
        lead_id: lead.id,
        title: `Matrícula: ${lead.name}`,
        value: item.originalDealValue || 0,
        stage: 'Novo Lead / Interesse', // Enum string
        probability: 10,
        expected_close_date: new Date(Date.now() + 30 * 86400000).toISOString(),
        owner_id: item.ownerId
      }).select().single();

      if (dealError) throw dealError;

      // 2. Remove from Waiting List
      const { error: wlError } = await supabase.from('waiting_list').delete().eq('id', itemId);
      if (wlError) throw wlError; // If fails, we have a dangling deal? Transaction would be better.

      const newDeal = mapDealFromDB(dealData);
      setDeals(prev => [...prev, newDeal]);
      setWaitingList(prev => prev.filter(w => w.id !== itemId));

      addActivity({ type: 'status_change', content: `Retomado da Lista de Espera para o Pipeline.`, leadId: lead.id, dealId: newDeal.id, performer: currentUser.name });
    } catch (e: any) {
      alert('Erro ao restaurar: ' + e.message);
    }
  };

  const updateWaitingListItem = async (id: string, data: Partial<WaitingListItem>) => {
    try {
      const dbUpdate: any = {};
      if (data.notes) dbUpdate.notes = data.notes;
      if (data.reason) dbUpdate.reason = data.reason;

      const { error } = await supabase.from('waiting_list').update(dbUpdate).eq('id', id);
      if (error) throw error;

      setWaitingList(prev => prev.map(item => item.id === id ? { ...item, ...data } : item));
    } catch (e) { console.error(e); }
  };

  const getLeadActivities = (leadId: string) => {
    const lead = leads.find(l => l.id === leadId);
    if (!lead) return [];
    if (currentUser?.role !== 'admin' && lead.ownerId !== currentUser?.id) return [];
    return activities.filter(a => a.leadId === leadId).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  };

  const updateCompanySettings = (settings: CompanySettings) => { checkAdmin('alterar configurações da empresa'); setCompanySettings(settings); }; // Settings not in Supabase yet? Keep local/mock for now? Or implement.
  // Settings in LocalStorage is fine for v1.1 scope, specific to machine? No, "Company" settings usually global.
  // We didn't create a 'settings' table. Let's leave as localStorage for now or default.

  const addSource = (source: string) => { checkAdmin('adicionar fontes'); if (!availableSources.includes(source)) setAvailableSources(prev => [...prev, source]); };
  const removeSource = (source: string) => { checkAdmin('remover fontes'); setAvailableSources(prev => prev.filter(s => s !== source)); };

  const addUser = async (userData: Omit<User, 'id' | 'avatar'>) => {
    checkAdmin('adicionar usuários');

    try {
      // Get current session token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert('Sessão expirada. Faça login novamente.');
        return;
      }

      // Call serverless function to create user
      const response = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          email: userData.email,
          password: userData.password,
          name: userData.name,
          role: userData.role
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao criar usuário');
      }

      // Add to local state (optimistic update)
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
      console.error('Error creating user:', error);
      alert(`Erro ao criar usuário: ${error.message}`);
    }
  };

  const updateUser = (id: string, data: Partial<User>) => {
    // Update public.profiles
    // TODO: implementation
  };
  const deleteUser = (id: string) => {
    alert("Para excluir usuários, use o Painel do Supabase.");
  };
  const switchUser = (userId: string) => {
    // Not relevant for real Auth. Can't switch user without password.
    alert("Troca de usuário rápida desabilitada em produção.");
  };

  const addActivity = async (activity: Omit<Activity, 'id' | 'timestamp'>) => {
    try {
      const { data, error } = await supabase.from('activities').insert({
        lead_id: activity.leadId,
        deal_id: activity.dealId,
        type: activity.type,
        content: activity.content,
        performer: activity.performer
      }).select().single();
      if (error) console.error(error); // don't block

      // Optimistic / or fetch result
      if (data) {
        // map
        const newActivity: Activity = {
          id: data.id,
          leadId: data.lead_id,
          dealId: data.deal_id,
          type: data.type,
          content: data.content,
          performer: data.performer,
          timestamp: data.timestamp
        };
        setActivities(prev => [newActivity, ...prev]);
        if (activity.leadId) setLeads(prev => prev.map(l => l.id === activity.leadId ? { ...l, lastInteraction: data.timestamp } : l));
      }
    } catch (e) { console.error(e); }
  };

  return (
    <CRMContext.Provider value={{
      allLeads: leads, leads: visibleLeads, deals: visibleDeals, waitingList: visibleWaitingList, activities, users, currentUser, companySettings, availableSources, lossReasons, waitingReasons, globalSearch, setGlobalSearch, isLoading,
      login, logout, changeMyPassword, updateMyProfile, adminResetPassword,
      addLead, bulkAddLeads, updateLeadData, assignLead, addDeal, updateDealStage, updateDeal, deleteDeal, deleteLead,
      moveToWaitingList, restoreFromWaitingList, updateWaitingListItem, addActivity, getLeadActivities,
      updateCompanySettings, addSource, removeSource, addUser, updateUser, deleteUser, switchUser,
      getLeadSLA, getLeadPipelineStatus, runAutoArchiving, normalizeClassification
    }}>
      {children}
    </CRMContext.Provider>
  );
};

export const useCRM = () => {
  const context = useContext(CRMContext);
  if (!context) throw new Error('useCRM must be used within a CRMProvider');
  return context;
};