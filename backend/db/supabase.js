import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.warn(
    '[supabase] SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set — database calls will fail until .env is filled in.'
  );
}

export const supabase = createClient(supabaseUrl || 'http://localhost', serviceRoleKey || 'placeholder', {
  auth: { persistSession: false },
});
