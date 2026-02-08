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

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const TARGET_DEAL_ID = 'aa02fdb5-a3aa-4e25-8feb-a58ae978986d';
const TARGET_STAGE = 'Novo Lead / Interesse';

const fixZombieDeal = async () => {
    console.log(`Starting targeted fix for Deal ID: ${TARGET_DEAL_ID}`);

    // 1. Verify existence and current state
    const { data: deal, error: fetchError } = await supabase
        .from('deals')
        .select('*')
        .eq('id', TARGET_DEAL_ID)
        .single();

    if (fetchError || !deal) {
        console.error('Error fetching deal or deal not found:', fetchError);
        return;
    }

    console.log(`Current Deal State: Title="${deal.title}", Stage="${deal.stage}"`);

    if (deal.stage === 'waiting_list') {
        // 2. Update Stage
        const { error: updateError } = await supabase
            .from('deals')
            .update({
                stage: TARGET_STAGE,
                stage_changed_at: new Date().toISOString()
            })
            .eq('id', TARGET_DEAL_ID);

        if (updateError) {
            console.error('Failed to update deal:', updateError);
        } else {
            console.log(`SUCCESS: Deal updated to stage "${TARGET_STAGE}".`);
        }
    } else {
        console.log('Skipping update: Deal is not in "waiting_list" stage.');
    }
};

fixZombieDeal();
