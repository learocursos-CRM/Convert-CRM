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

const fixOwnership = async () => {
    console.log('Starting Ownership Fix...');

    // 1. Fetch mismatched data
    const { data: allDeals } = await supabase.from('deals').select('*');
    const { data: allLeads } = await supabase.from('leads').select('id, owner_id');

    if (!allDeals || !allLeads) return;

    const leadsMap = new Map(allLeads.map(l => [l.id, l]));
    const mismatchedDeals = [];

    allDeals.forEach(deal => {
        const lead = leadsMap.get(deal.lead_id);
        if (lead && deal.owner_id !== lead.owner_id) {
            mismatchedDeals.push({
                dealId: deal.id,
                correctOwnerId: lead.owner_id,
                currentOwnerId: deal.owner_id
            });
        }
    });

    console.log(`Found ${mismatchedDeals.length} mismatched deals.`);

    for (const item of mismatchedDeals) {
        const { error } = await supabase
            .from('deals')
            .update({ owner_id: item.correctOwnerId })
            .eq('id', item.dealId);

        if (error) {
            console.error(`Failed to update Deal ${item.dealId}:`, error);
        } else {
            console.log(`Fixed Deal ${item.dealId}: Owner set to ${item.correctOwnerId}`);
        }
    }
};

fixOwnership();
