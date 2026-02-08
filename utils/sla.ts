import { Lead, Activity, DealStage } from '../types.ts';

export type SLAStatus = 'normal' | 'warning' | 'overdue' | 'handled' | 'waiting';

export interface SLAData {
    status: SLAStatus;
    hoursDiff: number;
    label: string;
}

export const calculateSLA = (
    lead: Lead,
    activities: Activity[],
    deals: { leadId: string, stage: DealStage }[],
    waitingList: { leadId: string }[]
): SLAData => {
    // 1. Check if Deal is Finished or Waiting
    const deal = deals.find(d => d.leadId === lead.id);
    if (deal && (deal.stage === DealStage.WON || deal.stage === DealStage.LOST)) {
        return { status: 'handled', hoursDiff: 0, label: 'Finalizado' };
    }
    if (waitingList.some(w => w.leadId === lead.id)) {
        return { status: 'waiting', hoursDiff: 0, label: 'Lista de Espera' };
    }

    // 2. Find Last Valid Activity (Call, Email, Meeting, Note)
    const validActivities = activities
        .filter(a => a.leadId === lead.id && ['call', 'email', 'meeting', 'note'].includes(a.type))
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    const lastActivityTime = validActivities.length > 0
        ? new Date(validActivities[0].timestamp)
        : new Date(lead.createdAt);

    // 3. Calculate Time Difference
    const now = new Date();
    const diffMs = now.getTime() - lastActivityTime.getTime();
    const hoursDiff = Math.floor(diffMs / (1000 * 60 * 60));

    // 4. Determine Status
    if (hoursDiff > 12) {
        return { status: 'overdue', hoursDiff, label: 'Atrasado' };
    }
    if (hoursDiff === 12) {
        return { status: 'warning', hoursDiff, label: 'Atenção' };
    }

    return { status: 'normal', hoursDiff, label: 'No prazo' };
};
