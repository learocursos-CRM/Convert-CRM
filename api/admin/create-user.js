import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
    // Only allow POST
    if (req.method !== 'POST') {
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

        // Get user data from request body
        const { email, password, name, role } = req.body;

        if (!email || !password || !name || !role) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Create admin client with service role key
        const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseServiceRoleKey) {
            console.error('Missing SUPABASE_SERVICE_ROLE_KEY');
            return res.status(500).json({ error: 'Server configuration error: Missing Admin Key' });
        }

        const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        });

        // Create the user in Supabase Auth
        const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
            email,
            password,
            email_confirm: true, // Auto-confirm email
            user_metadata: {
                name,
                role
            }
        });

        if (createError) {
            console.error('Error creating user:', createError);
            return res.status(400).json({ error: createError.message });
        }

        // Create profile in public.profiles (Use upsert to handle cases where trigger might have already created it)
        const { error: profileCreateError } = await adminClient
            .from('profiles')
            .upsert({
                id: newUser.user.id,
                email,
                name,
                role,
                active: true,
                must_change_password: true,
                created_by: user.id
            });

        if (profileCreateError) {
            console.error('Error creating profile:', profileCreateError);
            // Try to delete the auth user if profile creation failed to avoid ghost users
            await adminClient.auth.admin.deleteUser(newUser.user.id);
            return res.status(500).json({
                error: 'Failed to create user profile: ' + (profileCreateError.message || JSON.stringify(profileCreateError))
            });
        }

        // Create audit log entry
        await adminClient
            .from('user_audit_log')
            .insert({
                user_id: newUser.user.id,
                action: 'created',
                performed_by: user.id,
                details: { email, name, role }
            });

        return res.status(200).json({
            success: true,
            user: {
                id: newUser.user.id,
                email,
                name,
                role
            }
        });

    } catch (error) {
        console.error('Unexpected error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
