/**
 * Supabase 客户端初始化
 */
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from './supabaseConfig';
import { timedFetch } from './network';

export const supabase = createClient(
    SUPABASE_URL || 'https://placeholder.supabase.co',
    SUPABASE_ANON_KEY || 'placeholder-key',
    {
        global: {
            fetch: timedFetch,
        },
    },
);

export default supabase;
