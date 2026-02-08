import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react';
import { Deal, DealStage, Lead } from '../types';
import { supabase } from '../services/supabase';
import { useAuth } from './AuthContext';
import { useLeads } from './LeadsContext';

interface DealsContextType {
    deals: Deal[];
    availableSources: string[];
    lossReasons: string[];
    addDeal: (deal: Omit<Deal, 'id'>) => Promise<boolean>;
    updateDealStage: (id: string, stage: DealStage) => Promise<void>;
    updateDeal: (id: string, data: Partial<Deal>) => Promise<void>;
    deleteDeal: (id: string) => Promise<void>;
    runAutoArchiving: (leads: Lead[], waitingList: { leadId: string }[]) => number;
    refreshDeals: () => Promise<void>;
}

const DealsContext = createContext<DealsContextType | undefined>(undefined);

export const DealsProvider = ({ children }: { children: ReactNode }) => {
    const { currentUser } = useAuth();
    const { addActivity } = useLeads();
    const [deals, setDeals] = useState<Deal[]>([]);

    const [availableSources, setAvailableSources] = useState<string[]>([
        'Site', 'LinkedIn', 'Indicação', 'Cold Call', 'Evento', 'Forms', 'Balcão', 'Telefone', 'Importação - Vendedor', 'Importado'
    ]);
    const [lossReasons, setLossReasons] = useState<string[]>([
        'Não elegível', 'Preço', 'Desistência', 'Sem retorno', 'Perda de prazo', 'Arquivamento Automático por Inatividade'
    ]);

    const mapDealFromDB = (db: any): Deal => {
        if (!db) return {} as Deal;
        return {
            id: db.id ?? db.Id,
            leadId: db.lead_id ?? db.Lead_id ?? db.leadId,
            title: db.title ?? db.Title ?? 'Matrícula',
            value: db.value ?? db.Value ?? 0,
            stage: db.stage ?? db.Stage,
            probability: db.probability ?? db.Probability ?? 10,
            expectedCloseDate: db.expected_close_date ?? db.expectedCloseDate,
            ownerId: db.owner_id ?? db.ownerId,
            lossReason: db.loss_reason ?? db.lossReason,
            stageChangedAt: db.stage_changed_at ?? db.stageChangedAt
        };
    };

    const refreshDeals = async () => {
        try {
            // Fetch deals and leads (for validation)
            const [dealsRes, leadsRes] = await Promise.all([
                supabase.from('deals').select('*'),
                supabase.from('leads').select('id')
            ]);

            if (dealsRes.data) {
                const validLeadIds = new Set(leadsRes.data?.map(l => l.id) || []);
                const validDeals = dealsRes.data.filter(d =>
                    // Rule 1: Must have a valid Lead associated
                    d.lead_id && validLeadIds.has(d.lead_id)
                );

                // Note: We are strictly shielding. Only valid deals are set in state.
                setDeals(validDeals.map(mapDealFromDB));
            }
        } catch (error) {
            console.error('[DEALS] Error refreshing deals:', error);
        }
    };

    useEffect(() => {
        if (!currentUser) {
            setDeals([]);
            return;
        }

        refreshDeals();

        // Realtime Subscription (INSERT only)
        const channel = supabase
            .channel('deals-changes')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'deals' },
                async (payload) => {
                    const newDeal = mapDealFromDB(payload.new);

                    // Shielding: Verify Lead Exists before adding to UI
                    const { count } = await supabase.from('leads').select('id', { count: 'exact', head: true }).eq('id', newDeal.leadId);

                    if (count && count > 0) {
                        setDeals(prev => {
                            if (prev.some(d => d.id === newDeal.id)) return prev;
                            return [...prev, newDeal];
                        });
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [currentUser]);

    const addDeal = async (dealData: Omit<Deal, 'id'>): Promise<boolean> => {
        if (!currentUser) return false;
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
            return true;
        } catch (e: any) {
            alert('Erro ao criar negócio: ' + e.message);
            return false;
        }
    };

    const updateDealStage = async (id: string, stage: DealStage) => {
        if (!currentUser) return;
        const deal = deals.find(d => d.id === id);
        if (!deal) return;

        const now = new Date().toISOString();
        try {
            const { error } = await supabase.from('deals').update({
                stage: stage,
                stage_changed_at: now
            }).eq('id', id);
            if (error) throw error;
            setDeals(prev => prev.map(d => d.id === id ? { ...d, stage, stageChangedAt: now } : d));
            addActivity({ type: 'status_change', content: `Negócio avançou para fase: ${stage}`, dealId: id, leadId: deal.leadId, performer: currentUser.name });
        } catch (e: any) {
            alert('Erro ao atualizar estágio: ' + e.message);
        }
    };

    const updateDeal = async (id: string, data: Partial<Deal>) => {
        if (!currentUser) return;
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
        } catch (e: any) {
            alert('Erro ao atualizar negócio: ' + e.message);
        }
    };

    const deleteDeal = async (id: string) => {
        if (!currentUser || currentUser.role !== 'admin') return;
        try {
            await supabase.from('deals').delete().eq('id', id);
            setDeals(prev => prev.filter(d => d.id !== id));
        } catch (e) { alert(e); }
    };

    const runAutoArchiving = (leads: Lead[], waitingList: { leadId: string }[]): number => {
        const STALE_DAYS = 60;
        const now = new Date().getTime();
        const leadsToArchive: string[] = [];

        leads.forEach(lead => {
            const deal = deals.find(d => d.leadId === lead.id);
            if (deal && (deal.stage === DealStage.WON || deal.stage === DealStage.LOST)) return;
            if (waitingList.some(w => w.leadId === lead.id)) return;

            const lastInteractionDate = lead.lastInteraction ? new Date(lead.lastInteraction).getTime() : new Date(lead.createdAt).getTime();
            if ((now - lastInteractionDate) / (1000 * 3600 * 24) > STALE_DAYS) leadsToArchive.push(lead.id);
        });

        if (leadsToArchive.length > 0) {
            setDeals(prev => prev.map(d => leadsToArchive.includes(d.leadId) ? { ...d, stage: DealStage.LOST, lossReason: 'Arquivamento Automático por Inatividade' } : d));
            leadsToArchive.forEach(id => addActivity({ type: 'status_change', content: `Lead arquivado automaticamente após ${STALE_DAYS} dias sem interação.`, leadId: id, performer: 'Sistema (Automação)' }));
            return leadsToArchive.length;
        }
        return 0;
    };

    return (
        <DealsContext.Provider value={{
            deals, availableSources, lossReasons, addDeal, updateDealStage, updateDeal, deleteDeal, runAutoArchiving, refreshDeals
        }}>
            {children}
        </DealsContext.Provider>
    );
};

export const useDeals = () => {
    const context = useContext(DealsContext);
    if (!context) throw new Error('useDeals must be used within a DealsProvider');
    return context;
};
