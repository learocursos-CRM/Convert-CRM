import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
    // Only allow PATCH
    if (req.method !== 'PATCH') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { id: userId } = req.query;

    if (!userId) {
        return res.status(400).json({ error: 'User ID is required' });
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

        // Get update data from request body
        const { name, role, active } = req.body;

        // Validate inputs
        if (!name && role === undefined && active === undefined) {
            return res.status(400).json({ error: 'At least one field (name, role, active) must be provided' });
        }

        if (role && !['admin', 'sales'].includes(role)) {
            return res.status(400).json({ error: 'Invalid role. Must be admin or sales' });
        }

        // Get service role client
        const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseServiceRoleKey) {
            console.error('Missing SUPABASE_SERVICE_ROLE_KEY');
            return res.status(500).json({ error: 'Server configuration error' });
        }

        const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey);

        // Build update object (only include fields that were provided)
        const updateData = {};
        if (name !== undefined) updateData.name = name;
        if (role !== undefined) updateData.role = role;
        if (active !== undefined) updateData.active = active;

        // Update user profile
        const { data: updatedUser, error: updateError } = await adminClient
            .from('profiles')
            .update(updateData)
            .eq('id', userId)
            .select()
            .single();

        if (updateError) {
            console.error('Error updating user:', updateError);
            return res.status(500).json({ error: 'Failed to update user: ' + updateError.message });
        }

        // Create audit log entry
        const auditDetails = {
            updated_fields: updateData,
            user_id: userId
        };

        await adminClient
            .from('user_audit_log')
            .insert({
                user_id: userId,
                action: 'edited',
                performed_by: user.id,
                details: auditDetails
            });

        return res.status(200).json({
            success: true,
            user: updatedUser
        });

    } catch (error) {
        console.error('Unexpected error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
