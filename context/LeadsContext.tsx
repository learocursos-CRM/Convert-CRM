import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react';
import { Lead, Activity, DealStage } from '../types';
import { supabase } from '../services/supabase';
import { useAuth } from './AuthContext';

export type SLAStatus = 'normal' | 'warning' | 'overdue' | 'handled';

export interface SLAData {
    status: SLAStatus;
    hoursDiff: number;
    label: string;
}

interface LeadsContextType {
    leads: Lead[];
    allLeads: Lead[];
    activities: Activity[];
    addLead: (lead: Omit<Lead, 'id' | 'createdAt'>) => Promise<Lead | null>;
    updateLeadData: (id: string, data: Partial<Lead>) => Promise<void>;
    assignLead: (leadId: string, userId: string, activeDeals: { id: string, stage: DealStage }[]) => Promise<void>;
    deleteLead: (id: string) => Promise<void>;
    addActivity: (activity: Omit<Activity, 'id' | 'timestamp'>) => Promise<boolean>;
    getLeadActivities: (leadId: string) => Activity[];
    getLeadSLA: (lead: Lead, deals: { leadId: string, stage: DealStage }[], waitingList: { leadId: string }[]) => SLAData;
    normalizeClassification: (input: string) => string | null;
    refreshLeads: () => Promise<void>;
}

const LeadsContext = createContext<LeadsContextType | undefined>(undefined);

export const LeadsProvider = ({ children }: { children: ReactNode }) => {
    const { currentUser } = useAuth();
    const [leads, setLeads] = useState<Lead[]>([]);
    const [activities, setActivities] = useState<Activity[]>([]);

    const mapLeadFromDB = (db: any): Lead => {
        if (!db) return {} as Lead;
        return {
            id: db.id ?? db.Id,
            name: db.name ?? db.Name ?? 'Sem nome',
            company: db.company ?? db.Company,
            email: db.email ?? db.Email,
            phone: db.phone ?? db.Phone,
            source: db.source ?? db.Source,
            classification: db.classification ?? db.Classification,
            desiredCourse: db.desired_course ?? db.Desired_course ?? db.desiredCourse,
            ownerId: db.owner_id ?? db.ownerId ?? db.Owner_id,
            createdAt: db.created_at ?? db.createdAt ?? db.Created_at,
            lastInteraction: db.last_interaction ?? db.lastInteraction,
            lostReason: db.lost_reason ?? db.lostReason
        };
    };

    const refreshLeads = async () => {
        try {
            const [leadsRes, activitiesRes] = await Promise.all([
                supabase.from('leads').select('*').order('created_at', { ascending: false }),
                supabase.from('activities').select('*').order('timestamp', { ascending: false }).limit(500)
            ]);

            if (leadsRes.data) setLeads(leadsRes.data.map(mapLeadFromDB));
            if (activitiesRes.data) setActivities(activitiesRes.data as unknown as Activity[]);
        } catch (error) {
            console.error('[LEADS] Error refreshing leads:', error);
        }
    };

    useEffect(() => {
        if (currentUser) {
            refreshLeads();
        } else {
            setLeads([]);
            setActivities([]);
        }
    }, [currentUser]);

    const allLeads = useMemo(() => leads, [leads]);

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

    const addLead = async (leadData: Omit<Lead, 'id' | 'createdAt'>): Promise<Lead | null> => {
        if (!currentUser) return null;
        const safeClassification = normalizeClassification(leadData.classification || '');
        if (!safeClassification) { alert("Erro de Validação: Classificação inválida."); return null; }

        try {
            const { data, error } = await supabase.from('leads').insert({
                name: leadData.name,
                company: leadData.company,
                email: leadData.email,
                phone: leadData.phone,
                source: leadData.source,
                classification: safeClassification,
                desired_course: leadData.desiredCourse,
                owner_id: leadData.ownerId || currentUser.id,
            }).select().single();

            if (error) throw error;
            const newLead = mapLeadFromDB(data);
            setLeads(prev => [newLead, ...prev]);
            await addActivity({ type: 'status_change', content: 'Lead criado no sistema', leadId: newLead.id, performer: currentUser.name });
            return newLead;
        } catch (e: any) {
            alert('Erro ao salvar lead: ' + e.message);
            return null;
        }
    };

    const updateLeadData = async (id: string, data: Partial<Lead>) => {
        if (!currentUser) return;
        try {
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
            setLeads(prev => prev.map(l => l.id === id ? { ...l, ...data } : l));
        } catch (e: any) {
            alert('Erro ao atualizar lead: ' + e.message);
        }
    };

    const assignLead = async (leadId: string, userId: string, activeDeals: { id: string, stage: DealStage }[]) => {
        if (!currentUser || currentUser.role !== 'admin') return;
        try {
            await supabase.from('leads').update({ owner_id: userId }).eq('id', leadId);
            setLeads(prev => prev.map(l => l.id === leadId ? { ...l, ownerId: userId } : l));

            if (activeDeals.length > 0) {
                await supabase.from('deals')
                    .update({ owner_id: userId })
                    .eq('lead_id', leadId)
                    .neq('stage', 'Matrícula Confirmada')
                    .neq('stage', 'Perdido');
            }

            addActivity({
                type: 'status_change',
                content: `Atribuído para novo responsável.`,
                leadId: leadId,
                performer: currentUser.name
            });
        } catch (e: any) {
            alert('Erro ao atribuir lead: ' + e.message);
        }
    };

    const deleteLead = async (id: string) => {
        if (!currentUser || currentUser.role !== 'admin') return;
        try {
            await supabase.from('deals').delete().eq('lead_id', id);
            const { error } = await supabase.from('leads').delete().eq('id', id);
            if (error) throw error;
            setLeads(prev => prev.filter(l => l.id !== id));
        } catch (e: any) {
            alert('Erro ao excluir lead: ' + e.message);
        }
    };

    const addActivity = async (activity: Omit<Activity, 'id' | 'timestamp'>): Promise<boolean> => {
        try {
            const { data, error } = await supabase.from('activities').insert({
                lead_id: activity.leadId,
                deal_id: activity.dealId,
                type: activity.type,
                content: activity.content,
                performer: activity.performer
            }).select().single();
            if (data) {
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
                return true;
            }
            if (error) throw error;
            return false;
        } catch (e) {
            console.error(e);
            return false;
        }
    };

    const getLeadActivities = (leadId: string) => {
        return activities.filter(a => a.leadId === leadId).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    };

    const getLeadSLA = (lead: Lead, deals: { leadId: string, stage: DealStage }[], waitingList: { leadId: string }[]): SLAData => {
        const now = new Date();
        const created = new Date(lead.createdAt);
        const hoursDiff = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60));

        const deal = deals.find(d => d.leadId === lead.id);
        if (deal && (deal.stage === DealStage.WON || deal.stage === DealStage.LOST)) return { status: 'handled', hoursDiff, label: 'Finalizado' };
        if (waitingList.some(w => w.leadId === lead.id)) return { status: 'handled', hoursDiff, label: 'Lista de Espera' };

        const hasHumanInteraction = activities.some(a => a.leadId === lead.id && ['call', 'email', 'meeting', 'note'].includes(a.type));
        if (hasHumanInteraction) return { status: 'handled', hoursDiff, label: 'Atendido' };

        if (hoursDiff >= 24) return { status: 'overdue', hoursDiff, label: 'SLA Estourado' };
        if (hoursDiff >= 12) return { status: 'warning', hoursDiff, label: 'Atenção' };
        return { status: 'normal', hoursDiff, label: 'No prazo' };
    };

    return (
        <LeadsContext.Provider value={{
            leads, allLeads, activities, addLead, updateLeadData, assignLead, deleteLead, addActivity, getLeadActivities, getLeadSLA, normalizeClassification, refreshLeads
        }}>
            {children}
        </LeadsContext.Provider>
    );
};

export const useLeads = () => {
    const context = useContext(LeadsContext);
    if (!context) throw new Error('useLeads must be used within a LeadsProvider');
    return context;
};
