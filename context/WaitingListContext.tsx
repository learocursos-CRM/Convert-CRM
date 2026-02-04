import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { WaitingListItem, Lead, Deal, DealStage } from '../types';
import { supabase } from '../services/supabase';
import { useAuth } from './AuthContext';
import { useLeads } from './LeadsContext';
import { useDeals } from './DealsContext';

interface WaitingListContextType {
    waitingList: WaitingListItem[];
    waitingReasons: string[];
    moveToWaitingList: (dealId: string, reason: string, notes?: string) => Promise<void>;
    restoreFromWaitingList: (itemId: string) => Promise<void>;
    updateWaitingListItem: (id: string, data: Partial<WaitingListItem>) => Promise<void>;
    refreshWaitingList: () => Promise<void>;
}

const WaitingListContext = createContext<WaitingListContextType | undefined>(undefined);

export const WaitingListProvider = ({ children }: { children: ReactNode }) => {
    const { currentUser } = useAuth();
    const { leads, addActivity } = useLeads();
    const { deals, refreshDeals } = useDeals();
    const [waitingList, setWaitingList] = useState<WaitingListItem[]>([]);

    const waitingReasons = [
        'Turma Fechada / Lotada', 'Curso Indisponível no Momento', 'Aguardando Abertura de Edital', 'Aguardando Formação de Turma', 'Aluno Solicitou Pausa'
    ];

    const mapWaitingListFromDB = (db: any, allLeads: Lead[], allDeals: Deal[]): WaitingListItem => {
        const lId = db.lead_id || db.Lead_id || db.leadId;

        // Prioritize JOINED lead data, fallback to context cache
        const dbLead = db.leads;
        const memoryLead = allLeads.find(l => String(l.id).toLowerCase() === String(lId).toLowerCase());

        return {
            id: db.id || db.Id,
            leadId: lId,
            leadName: dbLead?.name || memoryLead?.name || 'Desconhecido',
            leadPhone: dbLead?.phone || memoryLead?.phone,
            leadEmail: dbLead?.email || memoryLead?.email,
            // Regra: Curso deve vir do Lead (dbLead.desired_course)
            course: dbLead?.desired_course || memoryLead?.desiredCourse || (db.course && !db.course.startsWith('Matrícula:') ? db.course : 'Curso não informado'),
            reason: db.reason,
            notes: db.notes,
            ownerId: db.owner_id,
            createdAt: db.created_at,
            originalDealValue: db.original_deal_value
        };
    };

    const refreshWaitingList = async () => {
        try {
            // Join with leads table to ensure we have contact info for PDF even if lead isn't in current context memory
            const { data } = await supabase
                .from('waiting_list')
                .select('*, leads (name, phone, email, desired_course)');

            if (data) {
                setWaitingList(data.map(w => mapWaitingListFromDB(w, leads, deals)));
            }
        } catch (error) {
            console.error('[WAITING] Error refreshing waiting list:', error);
        }
    };

    useEffect(() => {
        if (currentUser && leads.length > 0) {
            refreshWaitingList();
        } else {
            setWaitingList([]);
        }
    }, [currentUser, leads, deals]);

    const moveToWaitingList = async (dealId: string, reason: string, notes?: string) => {
        if (!currentUser) return;
        const deal = deals.find(d => d.id === dealId);
        if (!deal) return;
        const lead = leads.find(l => l.id === deal.leadId);
        if (!lead) return;

        try {
            await supabase.from('deals').update({
                stage: 'waiting_list',
                closed_at: new Date().toISOString(),
                closed_reason: 'Movido para Lista de Espera'
            }).eq('id', dealId);

            const { data: wlData, error: wlError } = await supabase.from('waiting_list').insert({
                lead_id: lead.id,
                deal_id: deal.id,
                created_by: currentUser.id,
                course: lead.desiredCourse || 'Curso não informado',
                reason: reason,
                notes: notes,
                owner_id: deal.ownerId,
                original_deal_value: deal.value
            }).select().single();

            if (wlError) throw wlError;

            const newItem = mapWaitingListFromDB(wlData, leads, deals);
            setWaitingList(prev => [newItem, ...prev]);
            refreshDeals();

            addActivity({
                type: 'status_change',
                content: `Movido para Lista de Espera. Motivo: ${reason}`,
                leadId: lead.id,
                performer: currentUser.name
            });
        } catch (e: any) {
            alert('Erro ao mover para lista de espera: ' + e.message);
        }
    };

    const restoreFromWaitingList = async (itemId: string) => {
        if (!currentUser) return;
        const item = waitingList.find(w => w.id === itemId);
        if (!item) return;

        try {
            await supabase.from('deals').update({
                stage: DealStage.NEW,
                closed_at: null,
                closed_reason: null
            }).eq('id', item.id); // In waiting list, item structure has both ids.

            await supabase.from('waiting_list').delete().eq('id', itemId);
            setWaitingList(prev => prev.filter(w => w.id !== itemId));
            refreshDeals();

            addActivity({
                type: 'status_change',
                content: `Retomado da Lista de Espera para o Pipeline.`,
                leadId: item.leadId,
                performer: currentUser.name
            });
        } catch (e: any) {
            alert('Erro ao restaurar: ' + e.message);
        }
    };

    const updateWaitingListItem = async (id: string, data: Partial<WaitingListItem>) => {
        try {
            const dbUpdate: any = {};
            if (data.notes) dbUpdate.notes = data.notes;
            if (data.reason) dbUpdate.reason = data.reason;

            await supabase.from('waiting_list').update(dbUpdate).eq('id', id);
            setWaitingList(prev => prev.map(item => item.id === id ? { ...item, ...data } : item));
        } catch (e) { console.error(e); }
    };

    return (
        <WaitingListContext.Provider value={{
            waitingList, waitingReasons, moveToWaitingList, restoreFromWaitingList, updateWaitingListItem, refreshWaitingList
        }}>
            {children}
        </WaitingListContext.Provider>
    );
};

export const useWaitingList = () => {
    const context = useContext(WaitingListContext);
    if (!context) throw new Error('useWaitingList must be used within a WaitingListProvider');
    return context;
};
