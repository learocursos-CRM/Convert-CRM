import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
    // Only allow GET
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
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

        // Get service role client to bypass RLS
        const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseServiceRoleKey) {
            console.error('Missing SUPABASE_SERVICE_ROLE_KEY');
            return res.status(500).json({ error: 'Server configuration error' });
        }

        const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey);

        // Fetch all users
        const { data: users, error: usersError } = await adminClient
            .from('profiles')
            .select('id, name, email, role, active, created_at, last_login, must_change_password')
            .order('created_at', { ascending: false });

        if (usersError) {
            console.error('Error fetching users:', usersError);
            return res.status(500).json({ error: 'Failed to fetch users: ' + usersError.message });
        }

        return res.status(200).json({ users });

    } catch (error) {
        console.error('Unexpected error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
