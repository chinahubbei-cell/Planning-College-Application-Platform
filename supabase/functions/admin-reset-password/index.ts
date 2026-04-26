// Edge Function: Admin Reset Password
// 用于管理员重置用户密码的临时工具
// 注意: 生产环境应该移除或添加额外的安全验证

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-admin-reset-secret',
}

function jsonResponse(payload: Record<string, unknown>, status = 200) {
  return new Response(
    JSON.stringify(payload),
    { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

function errorResponse(message: string, status: number, code?: string) {
  return jsonResponse({ error: { message, ...(code ? { code } : {}) } }, status)
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (req.method !== 'POST') {
      return errorResponse('Method not allowed', 405, 'METHOD_NOT_ALLOWED')
    }

    const expectedSecret = Deno.env.get('ADMIN_RESET_PASSWORD_SECRET')
    const providedSecret = req.headers.get('x-admin-reset-secret')

    if (!expectedSecret || !providedSecret || providedSecret !== expectedSecret) {
      return errorResponse('Forbidden', 403, 'FORBIDDEN')
    }

    const { email, newPassword } = await req.json()

    if (!email) {
      return errorResponse('Email is required', 400, 'BAD_REQUEST')
    }

    // Create Supabase client with service role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!supabaseUrl || !supabaseServiceKey) {
      return errorResponse('Missing service role env', 500, 'CONFIG_MISSING')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // List users to find the target user
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers()

    if (listError) {
      return errorResponse(`Failed to list users: ${listError.message}`, 500, 'USER_LIST_FAILED')
    }

    // Find user by email
    const user = users.find(u => u.email === email)

    if (!user) {
      return errorResponse(`User not found: ${email}`, 404, 'USER_NOT_FOUND')
    }

    // Set default password if not provided
    const password = newPassword || 'Test@2026'

    // Update user password
    const { data, error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
      password: password,
      email_confirm: true
    })

    if (updateError) {
      return errorResponse(`Failed to reset password: ${updateError.message}`, 500, 'PASSWORD_RESET_FAILED')
    }

    return jsonResponse({
      success: true,
      message: 'Password reset successfully',
      email: email,
      newPassword: password
    })

  } catch (error) {
    return errorResponse(`Internal server error: ${error.message}`, 500, 'UNKNOWN_ERROR')
  }
})
