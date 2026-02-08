import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Manually load env
const envPath = path.resolve(process.cwd(), '.env');
let supabaseUrl = process.env.VITE_SUPABASE_URL;
let supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (fs.existsSync(envPath)) {
    const envFile = fs.readFileSync(envPath, 'utf8');
    envFile.split('\n').forEach(line => {
        const [key, ...value] = line.split('=');
        if (key && value) {
            const val = value.join('=').trim().replace(/^["']|["']$/g, '');
            if (key.trim() === 'VITE_SUPABASE_URL') supabaseUrl = val;
            if (key.trim() === 'VITE_SUPABASE_ANON_KEY') supabaseKey = val;
        }
    });
}

const supabase = createClient(supabaseUrl!, supabaseKey!);

const auditDeals = async () => {
    console.log('Starting Deals Audit...');

    // 1. Fetch All Deals
    const { data: allDeals, error: dealsError } = await supabase.from('deals').select('*');
    if (dealsError) throw dealsError;

    // 2. Fetch All Leads (Include owner_id, name)
    const { data: allLeads, error: leadsError } = await supabase.from('leads').select('id, owner_id, name');
    if (leadsError) throw leadsError;

    // 3. Fetch Waiting List
    const { data: waitingList, error: waitingError } = await supabase.from('waiting_list').select('id, lead_id');
    if (waitingError) throw waitingError;

    const leadsMap = new Map(allLeads?.map(l => [l.id, l]));
    const dealLeadIds = new Set(allDeals.map(d => d.lead_id));

    const dealsWithoutLead: any[] = [];
    const leadsWithoutDeal: any[] = [];
    const dealsWithInvalidStage: any[] = [];
    const ownerMismatches: any[] = [];
    const emptyNames: any[] = [];

    // Calculations
    const waitingListCount = waitingList?.length || 0;
    const wonDeals = allDeals.filter(d => d.stage === 'Matrícula Confirmada').length; // Check precise enum string from DB if possible, but assuming standard here
    // Actually, enum in DB might be 'won'. Let's check typical values.
    // Based on previous outputs, let's categorize by checking if NOT won/lost.
    // We will list raw stage distribution.
    const stageCounts: Record<string, number> = {};
    allDeals.forEach(d => {
        stageCounts[d.stage] = (stageCounts[d.stage] || 0) + 1;
    });

    const lostDeals = stageCounts['Perdido'] || 0 + stageCounts['lost'] || 0; // Handle both potential cases
    const wonCount = stageCounts['Matrícula Confirmada'] || 0 + stageCounts['won'] || 0;

    // Active = Total - Won - Lost
    const activeDeals = allDeals.length - lostDeals - wonCount;

    // Check Leads without Deals
    allLeads.forEach(lead => {
        if (!dealLeadIds.has(lead.id)) {
            leadsWithoutDeal.push(lead);
        }
    });

    // Check Deals integrity
    const validStages = ['Novo Lead / Interesse', 'Contato Realizado', 'Elegível / Qualificado', 'Proposta de Matrícula', 'Em Decisão', 'Matrícula Confirmada', 'Perdido'];

    allDeals.forEach(deal => {
        const lead = leadsMap.get(deal.lead_id);

        if (!deal.lead_id || !lead) {
            dealsWithoutLead.push(deal);
        } else {
            // Check Ownership Mismatch
            if (deal.owner_id !== lead.owner_id) {
                ownerMismatches.push({
                    dealId: deal.id,
                    dealTitle: deal.title,
                    dealOwner: deal.owner_id,
                    leadId: lead.id,
                    leadOwner: lead.owner_id,
                    leadName: lead.name
                });
            }
            // Check Empty Name
            if (!lead.name || lead.name.trim() === '') {
                emptyNames.push({ dealId: deal.id, leadId: lead.id, dealOwner: deal.owner_id });
            }
        }

        if (!validStages.includes(deal.stage)) {
            dealsWithInvalidStage.push(deal);
        }
    });

    console.log(`\n=== AUDIT REPORT ===`);
    console.log(`Total Leads: ${allLeads.length}`);
    console.log(`Total Deals: ${allDeals.length}`);
    console.log(`Total Waiting List: ${waitingListCount}`);
    console.log(`-------------------------------------------`);
    console.log(`METRICS BREAKDOWN:`);
    Object.entries(stageCounts).forEach(([stage, count]) => {
        console.log(`- Stage "${stage}": ${count}`);
    });
    console.log(`-------------------------------------------`);
    console.log(`Calculated Metrics:`);
    console.log(`- Won: ${wonCount}`);
    console.log(`- Lost: ${lostDeals}`);
    console.log(`- Active Deals (Pipeline): ${activeDeals}`);
    console.log(`- Dashboard "Active Leads" Estimate (Active Deals + Waiting): ${activeDeals + waitingListCount}`);
    console.log(`-------------------------------------------`);
    console.log(`Mismatch (Leads - Deals): ${allLeads.length - allDeals.length}`);
    console.log(`Leads WITHOUT Deals (Orphans): ${leadsWithoutDeal.length}`);
    console.log(`Deals with Owner Mismatch: ${ownerMismatches.length}`);
    console.log(`Deals with Empty/Null Lead Name: ${emptyNames.length}`);
    console.log(`Deals without Valid Lead (DB Integrity): ${dealsWithoutLead.length}`);

    if (leadsWithoutDeal.length > 0) {
        console.log('\n--- Leads WITHOUT Deals (Missing form Pipeline) ---');
        leadsWithoutDeal.forEach(l => console.log(`Lead: "${l.name}" (ID: ${l.id})`));
    }
};

auditDeals();
