import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"
import { syncUniversities } from "./tasks/universities.ts"
import { syncUniversityDetails } from "./tasks/university_details.ts"
import { syncMajors } from "./tasks/majors.ts"
import { syncScores } from "./tasks/scores.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function jsonResponse(payload: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function errorResponse(message: string, status: number, code?: string) {
  return jsonResponse({ error: { message, ...(code ? { code } : {}) } }, status)
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')

    // We need service_role key to bypass RLS for inserting raw data
    // Fallback to anon key for local dev if service role is missing
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || supabaseAnonKey

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
      return errorResponse('Supabase URL or Key is missing.', 500, 'CONFIG_MISSING')
    }

    // 1. Validate Admin User
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return errorResponse('Missing Authorization header', 401, 'UNAUTHORIZED')
    }

    const accessToken = authHeader.replace(/^Bearer\s+/i, '').trim()
    if (!accessToken) {
      return errorResponse('Missing Bearer token', 401, 'UNAUTHORIZED')
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
    const adminClient = createClient(supabaseUrl, supabaseServiceKey)

    const { data: { user }, error: userError } = await userClient.auth.getUser(accessToken)
    if (userError || !user) {
      return errorResponse('Unauthorized', 401, 'UNAUTHORIZED')
    }

    // Check if user is admin (Assuming user_profiles table has role field)
    const { data: profile, error: profileError } = await adminClient
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError) {
      throw new Error(`Failed to load admin profile: ${profileError.message}`)
    }

    if (profile?.role !== 'admin') {
      return errorResponse('Admin access required', 403, 'FORBIDDEN')
    }

    // 2. Parse Request
    const { task_type, executed_by } = await req.json()

    if (!['UNIVERSITIES', 'UNIVERSITY_DETAILS', 'MAJORS', 'SCORES'].includes(task_type)) {
      return errorResponse('Invalid task_type', 400, 'BAD_REQUEST')
    }

    // 3. Create RUNNING Log Entry
    const { data: logEntry, error: logError } = await adminClient
      .from('data_sync_logs')
      .insert({
        task_type,
        status: 'RUNNING',
        executed_by: executed_by || user.email || 'admin',
        message: 'Sync started'
      })
      .select()
      .single()

    if (logError || !logEntry) {
      throw new Error(`Failed to create sync log: ${logError?.message}`)
    }

    // 4. Run Task Asynchronously (Fire and Forget)
      // Using an IIFE to background the work
      ; (async () => {
        try {
          let recordsAdded = 0;
          let message = 'Sync completed successfully';

          console.log(`Starting background task: ${task_type}`);

          switch (task_type) {
            case 'UNIVERSITIES':
              const uniResult = await syncUniversities(adminClient);
              recordsAdded = uniResult.recordsAdded;
              if (uniResult.message) message = uniResult.message;
              break;
            case 'UNIVERSITY_DETAILS':
              const detailResult = await syncUniversityDetails(adminClient);
              recordsAdded = detailResult.recordsAdded;
              if (detailResult.message) message = detailResult.message;
              break;
            case 'MAJORS':
              const majorResult = await syncMajors(adminClient);
              recordsAdded = majorResult.recordsAdded;
              if (majorResult.message) message = majorResult.message;
              break;
            case 'SCORES':
              const scoreResult = await syncScores(adminClient);
              recordsAdded = scoreResult.recordsAdded;
              if (scoreResult.message) message = scoreResult.message;
              break;
          }

          // Update Log to SUCCESS
          await adminClient
            .from('data_sync_logs')
            .update({
              status: 'SUCCESS',
              records_added: recordsAdded,
              finished_at: new Date().toISOString(),
              message
            })
            .eq('id', logEntry.id)

          console.log(`Task ${task_type} completed. Added: ${recordsAdded}`);

        } catch (err) {
          console.error(`Error in background task ${task_type}:`, err);
          // Update Log to FAILED
          await adminClient
            .from('data_sync_logs')
            .update({
              status: 'FAILED',
              finished_at: new Date().toISOString(),
              message: err.message || String(err)
            })
            .eq('id', logEntry.id)
        }
      })();

    // 5. Return Success Immediately
    return jsonResponse({
      message: 'Sync task started',
      log_id: logEntry.id
    })

  } catch (error) {
    return errorResponse(error.message, 500, 'UNKNOWN_ERROR')
  }
})
