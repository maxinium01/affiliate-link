import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE!; // server only

export const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false }
});
