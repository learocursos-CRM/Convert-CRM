
import { createClient } from '@supabase/supabase-js';
// import { Database } from '../types_db';
// Or purely relying on our types.ts interfaces

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase URL and Anon Key are required in environment variables.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
