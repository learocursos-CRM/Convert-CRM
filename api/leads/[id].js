import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
    // Only allow DELETE
    if (req.method !== 'DELETE') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { id: leadId } = req.query;

    if (!leadId) {
        return res.status(400).json({ error: 'Lead ID is required' });
    }

    try {
        // Get the authorization header
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const token = authHeader.replace('Bearer ', '');

        // Verify the user is authenticated and is an admin
        const supabaseUrl = process.env.VITE_SUPABASE_URL;
        const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
        const supabase = createClient(supabaseUrl, supabaseAnonKey);

        const { data: { user }, error: authError } = await supabase.auth.getUser(token);

        if (authError || !user) {
            return res.status(401).json({ error: 'Invalid token' });
        }

        // Check if user is admin
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (profileError || profile?.role !== 'admin') {
            return res.status(403).json({ error: 'Forbidden: Admin access required' });
        }

        // Get service role client for admin operations
        const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseServiceRoleKey) {
            console.error('Missing SUPABASE_SERVICE_ROLE_KEY');
            return res.status(500).json({ error: 'Server configuration error' });
        }

        const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey);

        // Get lead info for audit log
        const { data: lead, error: leadError } = await adminClient
            .from('leads')
            .select('*')
            .eq('id', leadId)
            .single();

        if (leadError || !lead) {
            return res.status(404).json({ error: 'Lead not found' });
        }

        // Get all deals associated with this lead
        const { data: deals, error: dealsError } = await adminClient
            .from('deals')
            .select('id, title, stage, value')
            .eq('lead_id', leadId);

        if (dealsError) {
            console.error('Error fetching deals:', dealsError);
        }

        const dealCount = deals?.length || 0;

        // Delete all associated deals
        if (dealCount > 0) {
            const { error: deleteDealsError } = await adminClient
                .from('deals')
                .delete()
                .eq('lead_id', leadId);

            if (deleteDealsError) {
                console.error('Error deleting deals:', deleteDealsError);
                return res.status(500).json({ error: 'Failed to delete associated deals' });
            }
        }

        // Delete the lead
        const { error: deleteLeadError } = await adminClient
            .from('leads')
            .delete()
            .eq('id', leadId);

        if (deleteLeadError) {
            console.error('Error deleting lead:', deleteLeadError);
            return res.status(500).json({ error: 'Failed to delete lead' });
        }

        // Create audit log
        const { error: auditError } = await adminClient
            .from('lead_audit_log')
            .insert({
                lead_id: leadId,
                action: 'deleted',
                performed_by: user.id,
                details: {
                    lead_data: {
                        name: lead.name,
                        email: lead.email,
                        company: lead.company,
                        phone: lead.phone
                    },
                    deals_affected: dealCount,
                    deals: deals || []
                }
            });

        if (auditError) {
            console.error('Audit log error:', auditError);
            // Don't fail if audit log fails
        }

        return res.status(200).json({
            success: true,
            message: 'Lead deleted successfully',
            deals_removed: dealCount
        });

    } catch (error) {
        console.error('Unexpected error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
