import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
    // Only allow DELETE
    if (req.method !== 'DELETE') {
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

        // Prevent self-deletion
        if (userId === user.id) {
            return res.status(400).json({ error: 'Cannot delete your own account' });
        }

        // Get service role client
        const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseServiceRoleKey) {
            console.error('Missing SUPABASE_SERVICE_ROLE_KEY');
            return res.status(500).json({ error: 'Server configuration error' });
        }

        const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey);

        // Get user info before deletion for audit log
        const { data: userToDelete } = await adminClient
            .from('profiles')
            .select('name, email, role')
            .eq('id', userId)
            .single();

        // Delete user from Supabase Auth (this will cascade delete the profile due to FK)
        const { error: deleteAuthError } = await adminClient.auth.admin.deleteUser(userId);

        if (deleteAuthError) {
            console.error('Error deleting user from auth:', deleteAuthError);
            return res.status(500).json({ error: 'Failed to delete user: ' + deleteAuthError.message });
        }

        // Create audit log entry
        await adminClient
            .from('user_audit_log')
            .insert({
                user_id: userId,
                action: 'deleted',
                performed_by: user.id,
                details: {
                    deleted_user: userToDelete
                }
            });

        return res.status(200).json({
            success: true,
            message: 'User deleted successfully'
        });

    } catch (error) {
        console.error('Unexpected error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
