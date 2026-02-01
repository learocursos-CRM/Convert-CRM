import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
    // Only allow POST
    if (req.method !== 'POST') {
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

        // Get new password from request body
        const { password } = req.body;

        if (!password || password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }

        // Get service role client
        const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseServiceRoleKey) {
            console.error('Missing SUPABASE_SERVICE_ROLE_KEY');
            return res.status(500).json({ error: 'Server configuration error' });
        }

        const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey);

        // Update user password using admin API
        const { error: updatePasswordError } = await adminClient.auth.admin.updateUserById(
            userId,
            { password }
        );

        if (updatePasswordError) {
            console.error('Error updating password:', updatePasswordError);
            return res.status(500).json({ error: 'Failed to reset password: ' + updatePasswordError.message });
        }

        // Mark as must change password
        const { error: updateProfileError } = await adminClient
            .from('profiles')
            .update({ must_change_password: true })
            .eq('id', userId);

        if (updateProfileError) {
            console.error('Error updating must_change_password flag:', updateProfileError);
            // Don't fail the request, password was already changed
        }

        // Create audit log entry
        await adminClient
            .from('user_audit_log')
            .insert({
                user_id: userId,
                action: 'password_reset',
                performed_by: user.id,
                details: { reset_by_admin: true }
            });

        return res.status(200).json({
            success: true,
            message: 'Password reset successfully. User must change password on next login.'
        });

    } catch (error) {
        console.error('Unexpected error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
