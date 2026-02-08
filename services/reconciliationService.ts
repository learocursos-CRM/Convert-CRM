import { supabase } from './supabase';
import { Lead, Deal, DealStage } from '../types';

/**
 * Ensures that for every visible Lead, there is an active Deal.
 * If a Lead is an orphan (no Deal), a new Deal is silently created.
 * 
 * @param leads List of leads currently loaded in the context
 * @param user Current logged in user (used as 'performer' for logs)
 * @returns A promise that resolves when reconciliation is complete.
 */
export const ensureDealsForLeads = async (leads: Lead[], user: { id: string, name: string }) => {
    if (!leads || leads.length === 0) return;

    const leadIds = leads.map(l => l.id);

    // 1. Fetch all deals associated with these leads
    const { data: existingDeals, error } = await supabase
        .from('deals')
        .select('lead_id, id, stage')
        .in('lead_id', leadIds);

    if (error) {
        console.error('[RECONCILIATION] Failed to fetch deals for check', error);
        return;
    }

    // 2. Identify Orphans and Invalid Deals
    const validStages = Object.values(DealStage);
    const dealsSet = new Map(existingDeals?.map(d => [d.lead_id, d]));

    const orphans = [];
    const invalidDeals = [];

    leads.forEach(l => {
        const deal = dealsSet.get(l.id);
        if (!deal) {
            orphans.push(l);
        } else if (!validStages.includes(deal.stage as DealStage)) {
            // Deal exists but has invalid stage (Zombie)
            invalidDeals.push(deal);
        }
    });

    if (orphans.length === 0 && invalidDeals.length === 0) return new Set(leadIds);

    console.log(`[RECONCILIATION] Found ${orphans.length} orphans and ${invalidDeals.length} invalid deals.`);

    // 3. Auto-correct Orphans (Insert)
    const dealsToCreate = orphans.map(lead => ({
        lead_id: lead.id,
        title: 'Novo Lead / Interesse', // Default title
        value: 0,
        stage: DealStage.NEW,
        probability: 10,
        expected_close_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        owner_id: lead.ownerId || user.id,
        loss_reason: null,
        stage_changed_at: new Date().toISOString()
    }));

    // 4. Auto-correct Invalid Deals (Update)
    // We can't batch update simply with different IDs, so we might need individual updates or a special RPC.
    // For simplicity/safety, we'll iterate updates for now (usually low volume of errors).
    // Or just update them all to NEW stage if that's the safe fallback.

    // Batch Insert
    let insertSuccess = true;
    if (dealsToCreate.length > 0) {
        const { error: insertError } = await supabase.from('deals').insert(dealsToCreate);
        if (insertError) {
            console.error('[RECONCILIATION] Failed to create deals', insertError);
            insertSuccess = false;
        }
    }

    // Repair Invalid Deals (Set to NEW)
    let updateSuccess = true;
    if (invalidDeals.length > 0) {
        const invalidIds = invalidDeals.map(d => d.id);
        const { error: updateError } = await supabase
            .from('deals')
            .update({
                stage: DealStage.NEW,
                stage_changed_at: new Date().toISOString()
            })
            .in('id', invalidIds); // Bulk update all invalids to NEW

        if (updateError) {
            console.error('[RECONCILIATION] Failed to repair invalid deals', updateError);
            updateSuccess = false;
        }
    }

    // Construct Valid Set
    const validLeadIds = new Set(leadIds);

    // If Insert Failed, remove orphans from valid
    if (!insertSuccess) {
        orphans.forEach(o => validLeadIds.delete(o.id));
    }

    // If Update Failed, remove invalid deals from valid (they are still broken)
    if (!updateSuccess) {
        invalidDeals.forEach(d => validLeadIds.delete(d.lead_id));
    }

    return validLeadIds;
};
