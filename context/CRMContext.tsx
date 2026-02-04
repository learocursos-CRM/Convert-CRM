import React, { createContext, useContext, useState, ReactNode, useMemo } from 'react';
import { AuthProvider, useAuth } from './AuthContext';
import { LeadsProvider, useLeads } from './LeadsContext';
import { DealsProvider, useDeals } from './DealsContext';
import { WaitingListProvider, useWaitingList } from './WaitingListContext';
import { Lead, Deal, Activity, User, DealStage, CompanySettings, WaitingListItem } from '../types';

interface CRMContextType {
  // States
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
  isLoading: boolean;

  // Actions
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  changeMyPassword: (newPassword: string, oldPassword: string) => Promise<boolean>;
  updateMyProfile: (data: Partial<User>) => Promise<void>;
  adminResetPassword: (userId: string, newPassword: string) => void;

  addLead: (lead: Omit<Lead, 'id' | 'createdAt'>) => Promise<boolean>;
  bulkAddLeads: (leads: Omit<Lead, 'id' | 'createdAt'>[]) => Promise<void>;
  updateLeadData: (id: string, data: Partial<Lead>) => Promise<void>;
  assignLead: (leadId: string, userId: string) => Promise<void>;
  deleteLead: (id: string) => Promise<void>;

  addDeal: (deal: Omit<Deal, 'id'>) => Promise<void>;
  updateDealStage: (id: string, stage: DealStage) => Promise<void>;
  updateDeal: (id: string, data: Partial<Deal>) => Promise<void>;
  deleteDeal: (id: string) => Promise<void>;

  moveToWaitingList: (dealId: string, reason: string, notes?: string) => Promise<void>;
  restoreFromWaitingList: (itemId: string) => Promise<void>;
  updateWaitingListItem: (id: string, data: Partial<WaitingListItem>) => Promise<void>;

  addActivity: (activity: Omit<Activity, 'id' | 'timestamp'>) => Promise<void>;
  getLeadActivities: (leadId: string) => Activity[];

  // Helpers
  getLeadSLA: (lead: Lead) => any;
  getLeadPipelineStatus: (lead: Lead) => any;
  runAutoArchiving: () => number;
  normalizeClassification: (input: string) => string | null;

  // Settings (Legacy/Placeholder)
  updateCompanySettings: (settings: CompanySettings) => void;
  addSource: (source: string) => void;
  removeSource: (source: string) => void;
  addUser: (user: Omit<User, 'id' | 'avatar'>) => void;
  updateUser: (id: string, data: Partial<User>) => void;
  deleteUser: (id: string) => void;
  switchUser: (userId: string) => void;
}

const CRMContext = createContext<CRMContextType | undefined>(undefined);

// Internal Proxy Hook to consolidate all specialized hooks
const CRMProxyProvider = ({ children }: { children: ReactNode }) => {
  const auth = useAuth();
  const leadsCtx = useLeads();
  const dealsCtx = useDeals();
  const waitingCtx = useWaitingList();

  const [globalSearch, setGlobalSearch] = useState('');
  const [companySettings, setCompanySettings] = useState<CompanySettings>({
    name: 'Minha Empresa', logoUrl: '', primaryColor: '#4f46e5', currency: 'BRL', timezone: 'America/Sao_Paulo'
  });

  // Derived States
  const visibleLeads = useMemo(() => {
    if (!auth.currentUser) return [];
    const waitingIds = waitingCtx.waitingList.map(w => w.leadId);
    const active = leadsCtx.leads.filter(l => !waitingIds.includes(l.id));
    return auth.currentUser.role === 'admin' ? active : active.filter(l => l.ownerId === auth.currentUser?.id);
  }, [leadsCtx.leads, waitingCtx.waitingList, auth.currentUser]);

  const visibleDeals = useMemo(() => {
    if (!auth.currentUser) return [];
    return auth.currentUser.role === 'admin' ? dealsCtx.deals : dealsCtx.deals.filter(d => d.ownerId === auth.currentUser?.id);
  }, [dealsCtx.deals, auth.currentUser]);

  const visibleWaitingList = useMemo(() => {
    if (!auth.currentUser) return [];
    return auth.currentUser.role === 'admin' ? waitingCtx.waitingList : waitingCtx.waitingList.filter(w => w.ownerId === auth.currentUser?.id);
  }, [waitingCtx.waitingList, auth.currentUser]);

  const getLeadPipelineStatus = (lead: Lead) => {
    const isWaiting = waitingCtx.waitingList.some(w => w.leadId === lead.id);
    if (isWaiting) return { label: 'Em Lista de Espera', colorClass: 'bg-amber-100 text-amber-800 border border-amber-200', isLinked: true, stageChangedAt: undefined };
    const deal = dealsCtx.deals.find(d => d.leadId === lead.id && d.stage !== DealStage.LOST) || dealsCtx.deals.find(d => d.leadId === lead.id);
    if (!deal) return { label: 'Incompleto (Sem Negócio)', colorClass: 'bg-gray-100 text-gray-600', isLinked: false, stageChangedAt: undefined };

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
    return { label, colorClass, isLinked: true, dealId: deal.id, stageChangedAt: deal.stageChangedAt };
  };

  const value: CRMContextType = {
    // States
    allLeads: leadsCtx.allLeads,
    leads: visibleLeads,
    deals: visibleDeals,
    waitingList: visibleWaitingList,
    activities: leadsCtx.activities,
    users: auth.users,
    currentUser: auth.currentUser,
    companySettings,
    availableSources: dealsCtx.availableSources,
    lossReasons: dealsCtx.lossReasons,
    waitingReasons: waitingCtx.waitingReasons,
    globalSearch,
    setGlobalSearch,
    isLoading: auth.isLoading,

    // Actions
    login: auth.login,
    logout: auth.logout,
    changeMyPassword: auth.changeMyPassword,
    updateMyProfile: auth.updateMyProfile,
    adminResetPassword: auth.adminResetPassword,

    addLead: async (leadData) => {
      const newLead = await leadsCtx.addLead(leadData);
      if (newLead) {
        const dealSuccess = await dealsCtx.addDeal({
          leadId: newLead.id,
          title: 'Oportunidade: ' + newLead.name,
          value: 0,
          stage: DealStage.NEW,
          probability: 10,
          ownerId: newLead.ownerId || auth.currentUser?.id || '',
          lossReason: '',
          expectedCloseDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        });
        if (!dealSuccess) {
          // TODO: Consider rolling back lead creation here if strict atomicity is required by DB constraints, 
          // but for now we warn and return false so UI doesn't clear form blindly.
          alert("Atenção: O Lead foi salvo, mas houve erro ao criar o Negócio. Verifique o Pipeline.");
          return false;
        }
        return true;
      }
      return false;
    },
    bulkAddLeads: async (leads) => { for (const l of leads) await leadsCtx.addLead(l); },
    updateLeadData: leadsCtx.updateLeadData,
    assignLead: (lId, uId) => leadsCtx.assignLead(lId, uId, dealsCtx.deals.filter(d => d.leadId === lId)),
    deleteLead: leadsCtx.deleteLead,

    addDeal: dealsCtx.addDeal,
    updateDealStage: dealsCtx.updateDealStage,
    updateDeal: dealsCtx.updateDeal,
    deleteDeal: dealsCtx.deleteDeal,

    moveToWaitingList: waitingCtx.moveToWaitingList,
    restoreFromWaitingList: waitingCtx.restoreFromWaitingList,
    updateWaitingListItem: waitingCtx.updateWaitingListItem,

    addActivity: leadsCtx.addActivity,
    getLeadActivities: leadsCtx.getLeadActivities,

    // Helpers
    getLeadSLA: (lead) => leadsCtx.getLeadSLA(lead, dealsCtx.deals, waitingCtx.waitingList),
    getLeadPipelineStatus,
    runAutoArchiving: () => dealsCtx.runAutoArchiving(leadsCtx.leads, waitingCtx.waitingList),
    normalizeClassification: leadsCtx.normalizeClassification,

    // Legacy/Settings placeholders
    updateCompanySettings: setCompanySettings,
    addSource: (s) => { }, // Not implemented in Supabase yet
    removeSource: (s) => { },
    addUser: auth.addUser,
    updateUser: auth.updateUser,
    deleteUser: auth.deleteUser,
    switchUser: (id) => { },
  };

  return <CRMContext.Provider value={value}>{children}</CRMContext.Provider>;
};

// Global Provider that wraps everything
export const CRMProvider = ({ children }: { children: ReactNode }) => {
  return (
    <AuthProvider>
      <LeadsProvider>
        <DealsProvider>
          <WaitingListProvider>
            <CRMProxyProvider>
              {children}
            </CRMProxyProvider>
          </WaitingListProvider>
        </DealsProvider>
      </LeadsProvider>
    </AuthProvider>
  );
};

export const useCRM = () => {
  const context = useContext(CRMContext);
  if (!context) throw new Error('useCRM must be used within a CRMProvider');
  return context;
};