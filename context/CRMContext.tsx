import React, { createContext, useContext, useState, ReactNode, useMemo, useEffect } from 'react';
import { Lead, Deal, Activity, User, DealStage, LeadSource, CompanySettings, WaitingListItem } from '../types';
import { MOCK_LEADS, MOCK_DEALS, MOCK_ACTIVITIES, MOCK_USERS, MOCK_WAITING_LIST } from '../services/mockData';

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
  currentUser: User | null; // Null if not logged in
  companySettings: CompanySettings;
  availableSources: string[];
  lossReasons: string[];
  waitingReasons: string[];
  globalSearch: string;
  setGlobalSearch: (term: string) => void;

  // Auth Actions
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  changeMyPassword: (newPassword: string, oldPassword: string) => boolean; // Updated signature
  updateMyProfile: (data: Partial<User>) => void;
  adminResetPassword: (userId: string, newPassword: string) => void;

  // Actions
  addLead: (lead: Omit<Lead, 'id' | 'createdAt'>) => boolean; // Return success status
  bulkAddLeads: (leads: Omit<Lead, 'id' | 'createdAt'>[]) => void;
  // updateLeadStatus REMOVED
  updateLeadData: (id: string, data: Partial<Lead>) => void;
  assignLead: (leadId: string, userId: string) => void;
  addDeal: (deal: Omit<Deal, 'id'>) => void;
  updateDealStage: (id: string, stage: DealStage) => void;
  updateDeal: (id: string, data: Partial<Deal>) => void;
  deleteDeal: (id: string) => void;
  moveToWaitingList: (dealId: string, reason: string, notes?: string) => void;
  restoreFromWaitingList: (itemId: string) => void;
  updateWaitingListItem: (id: string, data: Partial<WaitingListItem>) => void;
  addActivity: (activity: Omit<Activity, 'id' | 'timestamp'>) => void;
  getLeadActivities: (leadId: string) => Activity[];
  updateCompanySettings: (settings: CompanySettings) => void;
  addSource: (source: string) => void;
  removeSource: (source: string) => void;
  addUser: (user: Omit<User, 'id' | 'avatar'>) => void;
  updateUser: (id: string, data: Partial<User>) => void;
  deleteUser: (id: string) => void;

  // Helpers
  getLeadSLA: (lead: Lead) => SLAData;
  getLeadPipelineStatus: (lead: Lead) => PipelineStatusData;
  runAutoArchiving: () => number;
  normalizeClassification: (input: string) => string | null;
}

const CRMContext = createContext<CRMContextType | undefined>(undefined);

// --- PERSISTENCE HELPERS ---
const loadState = <T,>(key: string, fallback: T): T => {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : fallback;
  } catch (e) {
    console.error(`Error loading ${key}`, e);
    return fallback;
  }
};

export const CRMProvider = ({ children }: { children?: ReactNode }) => {
  // Initialize state from LocalStorage or Mock Data
  const [leads, setLeads] = useState<Lead[]>(() => loadState('crm_leads', MOCK_LEADS));
  const [deals, setDeals] = useState<Deal[]>(() => loadState('crm_deals', MOCK_DEALS));
  const [waitingList, setWaitingList] = useState<WaitingListItem[]>(() => loadState('crm_waitingList', MOCK_WAITING_LIST));
  const [activities, setActivities] = useState<Activity[]>(() => loadState('crm_activities', MOCK_ACTIVITIES));
  const [users, setUsers] = useState<User[]>(() => loadState('crm_users', MOCK_USERS));
  const [currentUser, setCurrentUser] = useState<User | null>(() => loadState('crm_session', null));

  const [globalSearch, setGlobalSearch] = useState('');
  const [companySettings, setCompanySettings] = useState<CompanySettings>(() => loadState('crm_settings', {
    name: 'Minha Empresa',
    logoUrl: '',
    primaryColor: '#4f46e5',
    currency: 'BRL',
    timezone: 'America/Sao_Paulo'
  }));
  const [availableSources, setAvailableSources] = useState<string[]>([
    ...Object.values(LeadSource), 'Forms', 'Balcão', 'Telefone', 'Importação - Vendedor', 'Importado'
  ]);
  const [lossReasons, setLossReasons] = useState<string[]>([
    'Não elegível', 'Preço', 'Desistência', 'Sem retorno', 'Perda de prazo', 'Arquivamento Automático por Inatividade'
  ]);
  const waitingReasons = [
    'Turma Fechada / Lotada', 'Curso Indisponível no Momento', 'Aguardando Abertura de Edital', 'Aguardando Formação de Turma', 'Aluno Solicitou Pausa'
  ];

  // --- PERSISTENCE EFFECTS ---
  useEffect(() => { localStorage.setItem('crm_leads', JSON.stringify(leads)); }, [leads]);
  useEffect(() => { localStorage.setItem('crm_deals', JSON.stringify(deals)); }, [deals]);
  useEffect(() => { localStorage.setItem('crm_waitingList', JSON.stringify(waitingList)); }, [waitingList]);
  useEffect(() => { localStorage.setItem('crm_activities', JSON.stringify(activities)); }, [activities]);
  useEffect(() => { localStorage.setItem('crm_users', JSON.stringify(users)); }, [users]);
  useEffect(() => { localStorage.setItem('crm_settings', JSON.stringify(companySettings)); }, [companySettings]);
  useEffect(() => {
    if (currentUser) localStorage.setItem('crm_session', JSON.stringify(currentUser));
    else localStorage.removeItem('crm_session');
  }, [currentUser]);


  // --- AUTHENTICATION ---
  const login = async (email: string, password: string): Promise<boolean> => {
    await new Promise(resolve => setTimeout(resolve, 500)); // Simulating delay

    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());

    if (!user) return false;
    if (!user.active) {
      alert('Este usuário foi desativado. Contate o administrador.');
      return false;
    }

    if (user.password === password) {
      setCurrentUser(user);
      return true;
    }
    return false;
  };

  const logout = () => {
    setCurrentUser(null);
  };

  const changeMyPassword = (newPassword: string, oldPassword: string): boolean => {
    if (!currentUser) return false;

    if (currentUser.password !== oldPassword) {
      return false; // Password mismatch
    }

    const updatedUser = { ...currentUser, password: newPassword, mustChangePassword: false };

    // Update in users list
    setUsers(prev => prev.map(u =>
      u.id === currentUser.id
        ? updatedUser
        : u
    ));

    // Update session
    setCurrentUser(updatedUser);
    return true;
  };

  const updateMyProfile = (data: Partial<User>) => {
    if (!currentUser) return;

    const updatedUser = { ...currentUser, ...data };

    // Update in users list
    setUsers(prev => prev.map(u =>
      u.id === currentUser.id
        ? updatedUser
        : u
    ));

    // Update session
    setCurrentUser(updatedUser);
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

  const addActivity = (activity: Omit<Activity, 'id' | 'timestamp'>) => {
    const newActivity: Activity = { ...activity, id: Math.random().toString(36).substr(2, 9), timestamp: new Date().toISOString() };
    setActivities(prev => [newActivity, ...prev]);
    if (activity.leadId) setLeads(prev => prev.map(l => l.id === activity.leadId ? { ...l, lastInteraction: newActivity.timestamp } : l));
  };

  // const _internalUpdateLeadStatus = Removed

  const addLead = (leadData: Omit<Lead, 'id' | 'createdAt'>) => {
    if (!currentUser) return false;
    const ownerId = currentUser.role === 'admin' ? (leadData.ownerId || currentUser.id) : currentUser.id;

    const safeClassification = normalizeClassification(leadData.classification || '');
    if (!safeClassification) {
      alert("Erro de Validação: Classificação inválida.");
      return false;
    }

    const newLead: Lead = {
      ...leadData,
      classification: safeClassification,
      id: Math.random().toString(36).substr(2, 9),
      // status: LeadStatus.NEW, // Removed
      createdAt: new Date().toISOString(),
      ownerId: ownerId,
      lastInteraction: new Date().toISOString()
    };

    let createdDeal: Deal | undefined = undefined;
    if (checkEligibilityForAutoDeal(newLead)) {
      const hasActiveDeal = deals.some(d => d.leadId === newLead.id && d.title.includes(newLead.desiredCourse || '###') && d.stage !== DealStage.WON && d.stage !== DealStage.LOST);
      if (!hasActiveDeal) {
        createdDeal = createDealObject(newLead, ownerId);
        // newLead.status = ... REMOVED
      }
    }

    setLeads(prev => [newLead, ...prev]);
    addActivity({ type: 'status_change', content: 'Lead criado no sistema', leadId: newLead.id, performer: currentUser.name });

    if (createdDeal) {
      setDeals(prev => [...prev, createdDeal as Deal]);
      addActivity({ type: 'status_change', content: `Matrícula criada automaticamente: ${createdDeal.title}`, leadId: newLead.id, dealId: createdDeal.id, performer: 'Sistema (Automação)' });
    }
    return true;
  };

  const bulkAddLeads = (newLeadsData: Omit<Lead, 'id' | 'createdAt'>[]) => {
    if (!currentUser) return;
    const timestamp = new Date().toISOString();
    const newDeals: Deal[] = [];
    const createdLeads: Lead[] = [];

    newLeadsData.forEach(data => {
      const safeClassification = normalizeClassification(data.classification || '');
      if (!safeClassification) return;

      const lead: Lead = {
        ...data,
        classification: safeClassification,
        id: Math.random().toString(36).substr(2, 9),
        // status: LeadStatus.NEW, // Removed
        createdAt: timestamp,
        ownerId: currentUser.id,
        lastInteraction: timestamp
      };

      if (checkEligibilityForAutoDeal(lead)) {
        const newDeal = createDealObject(lead, currentUser.id);
        newDeals.push(newDeal);
        // lead.status = ... REMOVED
      }
      createdLeads.push(lead);
    });

    if (createdLeads.length > 0) {
      setLeads(prev => [...createdLeads, ...prev]);
      if (newDeals.length > 0) setDeals(prev => [...prev, ...newDeals]);
      addActivity({ type: 'status_change', content: `Importação em massa: ${createdLeads.length} leads adicionados. ${newDeals.length} matrículas geradas automaticamente.`, leadId: 'SYSTEM', performer: currentUser.name });
    }
  };

  // updateLeadStatus REMOVED completely

  const updateLeadData = (id: string, data: Partial<Lead>) => {
    if (!currentUser) return;
    const lead = leads.find(l => l.id === id);
    if (!lead) return;
    checkOwnership(lead.ownerId, 'editar dados do lead');

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
      if (!normalized) {
        alert("Erro: Classificação inválida.");
        return;
      }
      data.classification = normalized;
    }

    // AUTO-DEAL CHECK ON EDIT
    // Per requirement: "Todo Lead válido → cria Negócio automaticamente"
    const updatedLead = { ...lead, ...data };

    // Check if it NOW qualifies (and didn't before, or just check general eligibility)
    if (checkEligibilityForAutoDeal(updatedLead)) {
      const hasActiveDeal = deals.some(d => d.leadId === id && d.stage !== DealStage.WON && d.stage !== DealStage.LOST);
      if (!hasActiveDeal) {
        const newDeal = createDealObject(updatedLead as Lead, updatedLead.ownerId || currentUser.id);
        addDeal(newDeal); // This will also update the status via 'addDeal' logic
        // But we need to make sure the Lead Object in state is updated first/correctly
        // effectively 'addDeal' calls setDeals and updateLeadStatus(internal).
        // We are inside updateLeadData, so let's allow setLeads to happen below, then fire the deal creation?
        // Actually, createDealObject needs the lead data.

        // We'll update the lead locally first
        setLeads(prev => prev.map(l => l.id === id ? { ...l, ...data } : l));
        // Status update via derivation doesn't need explicit setLeads
      } else {
        setLeads(prev => prev.map(l => l.id === id ? { ...l, ...data } : l));
      }
    } else {
      setLeads(prev => prev.map(l => l.id === id ? { ...l, ...data } : l));
    }
  };

  const assignLead = (leadId: string, userId: string) => {
    if (!currentUser) return;
    checkAdmin('reatribuir leads');

    const user = users.find(u => u.id === userId);

    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, ownerId: userId } : l));

    const dealsToTransfer = deals.filter(d =>
      d.leadId === leadId && d.stage !== DealStage.WON && d.stage !== DealStage.LOST
    );

    if (dealsToTransfer.length > 0) {
      setDeals(prev => prev.map(d => {
        if (d.leadId === leadId && d.stage !== DealStage.WON && d.stage !== DealStage.LOST) {
          return { ...d, ownerId: userId };
        }
        return d;
      }));
    }

    addActivity({
      type: 'status_change',
      content: `Atribuído para responsável: ${user?.name}. ${dealsToTransfer.length > 0 ? `${dealsToTransfer.length} negócios ativos transferidos automaticamente.` : ''}`,
      leadId: leadId,
      performer: currentUser.name
    });
  };

  const addDeal = (dealData: Omit<Deal, 'id'>) => {
    if (!currentUser) return;
    if (currentUser.role !== 'admin') {
      const lead = leads.find(l => l.id === dealData.leadId);
      if (lead && lead.ownerId !== currentUser.id) throw new Error("Cannot create deal for lead you don't own");
    }
    const newDeal: Deal = { ...dealData, id: Math.random().toString(36).substr(2, 9) };
    setDeals(prev => [...prev, newDeal]);
    // Status update removed
    // _internalUpdateLeadStatus(dealData.leadId, newLeadStatus);
    addActivity({ type: 'status_change', content: `Negócio criado: ${dealData.title}`, leadId: dealData.leadId, dealId: newDeal.id, performer: currentUser.name });
  };

  const updateDealStage = (id: string, stage: DealStage) => {
    if (!currentUser) return;
    const deal = deals.find(d => d.id === id);
    if (!deal) return;
    checkOwnership(deal.ownerId, 'mover negócio no pipeline');
    setDeals(prev => prev.map(d => d.id === id ? { ...d, stage } : d));
    // Status update removed
    // const newLeadStatus = mapStageToLeadStatus(stage);
    // _internalUpdateLeadStatus(deal.leadId, newLeadStatus);
    addActivity({ type: 'status_change', content: `Negócio avançou para fase: ${stage}`, dealId: id, leadId: deal.leadId, performer: currentUser.name });
  };

  const updateDeal = (id: string, data: Partial<Deal>) => {
    if (!currentUser) return;
    const deal = deals.find(d => d.id === id);
    if (!deal) return;
    checkOwnership(deal.ownerId, 'editar negócio');
    setDeals(prev => prev.map(d => d.id === id ? { ...d, ...data } : d));
    if (data.value !== undefined) addActivity({ type: 'status_change', content: `Valor do negócio atualizado para R$ ${data.value}`, dealId: id, performer: currentUser.name });
  };

  const deleteDeal = (id: string) => { checkAdmin('excluir negócios'); setDeals(prev => prev.filter(d => d.id !== id)); };

  const moveToWaitingList = (dealId: string, reason: string, notes?: string) => {
    if (!currentUser) return;
    const deal = deals.find(d => d.id === dealId);
    if (!deal) return;
    const lead = leads.find(l => l.id === deal.leadId);
    if (!lead) return;
    checkOwnership(deal.ownerId, 'mover para lista de espera');
    const newItem: WaitingListItem = { id: Math.random().toString(36).substr(2, 9), leadId: lead.id, course: lead.desiredCourse || 'Curso não informado', reason: reason, notes: notes, ownerId: deal.ownerId, createdAt: new Date().toISOString(), originalDealValue: deal.value };
    setWaitingList(prev => [newItem, ...prev]);
    setDeals(prev => prev.filter(d => d.id !== dealId));
    // STRICT RULE: No Status Change to "WAITING". Lead is simply effectively removed from active views by being in waitingList.
    addActivity({ type: 'status_change', content: `Movido para Lista de Espera. Motivo: ${reason}`, leadId: lead.id, performer: currentUser.name });
  };

  const restoreFromWaitingList = (itemId: string) => {
    if (!currentUser) return;
    const item = waitingList.find(w => w.id === itemId);
    if (!item) return;
    const lead = leads.find(l => l.id === item.leadId);
    if (!lead) return;
    checkOwnership(item.ownerId, 'retomar da lista de espera');
    const newDeal: Deal = { id: Math.random().toString(36).substr(2, 9), leadId: lead.id, title: `Matrícula: ${lead.name}`, value: item.originalDealValue || 0, stage: DealStage.NEW, probability: 10, expectedCloseDate: new Date(Date.now() + 30 * 86400000).toISOString(), ownerId: item.ownerId };
    setDeals(prev => [...prev, newDeal]);
    setWaitingList(prev => prev.filter(w => w.id !== itemId));
    // No status update
    // _internalUpdateLeadStatus(lead.id, LeadStatus.NEW);
    addActivity({ type: 'status_change', content: `Retomado da Lista de Espera para o Pipeline.`, leadId: lead.id, dealId: newDeal.id, performer: currentUser.name });
  };

  const updateWaitingListItem = (id: string, data: Partial<WaitingListItem>) => { setWaitingList(prev => prev.map(item => item.id === id ? { ...item, ...data } : item)); };

  const getLeadActivities = (leadId: string) => {
    const lead = leads.find(l => l.id === leadId);
    if (!lead) return [];
    if (currentUser?.role !== 'admin' && lead.ownerId !== currentUser?.id) return [];
    return activities.filter(a => a.leadId === leadId).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  };

  const updateCompanySettings = (settings: CompanySettings) => { checkAdmin('alterar configurações da empresa'); setCompanySettings(settings); };
  const addSource = (source: string) => { checkAdmin('adicionar fontes'); if (!availableSources.includes(source)) setAvailableSources(prev => [...prev, source]); };
  const removeSource = (source: string) => { checkAdmin('remover fontes'); setAvailableSources(prev => prev.filter(s => s !== source)); };

  const addUser = (userData: Omit<User, 'id' | 'avatar'>) => {
    checkAdmin('adicionar usuários');
    const newUser: User = {
      ...userData,
      id: Math.random().toString(36).substr(2, 9),
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.name)}&background=random`,
      active: true,
      mustChangePassword: true // Default for new users
    };
    setUsers(prev => [...prev, newUser]);
  };

  const updateUser = (id: string, data: Partial<User>) => { checkAdmin('editar usuários'); setUsers(prev => prev.map(u => u.id === id ? { ...u, ...data } : u)); };
  const deleteUser = (id: string) => { checkAdmin('excluir usuários'); setUsers(prev => prev.filter(u => u.id !== id)); };
  const switchUser = (userId: string) => { const user = users.find(u => u.id === userId); if (user) setCurrentUser(user); };

  return (
    <CRMContext.Provider value={{
      allLeads: leads, leads: visibleLeads, deals: visibleDeals, waitingList: visibleWaitingList, activities, users, currentUser, companySettings, availableSources, lossReasons, waitingReasons, globalSearch, setGlobalSearch,
      login, logout, changeMyPassword, updateMyProfile, adminResetPassword,
      addLead, bulkAddLeads, updateLeadData, assignLead, addDeal, updateDealStage, updateDeal, deleteDeal,
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