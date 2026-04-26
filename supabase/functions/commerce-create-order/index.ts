import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function genOrderNo() {
  const n = Date.now()
  const r = Math.random().toString(36).slice(2, 8).toUpperCase()
  return `OD${n}${r}`
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
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    if (req.method !== 'POST') {
      return errorResponse('Method not allowed', 405, 'METHOD_NOT_ALLOWED')
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
    if (!supabaseUrl || !supabaseAnonKey) {
      return errorResponse('Missing Supabase env', 500, 'CONFIG_MISSING')
    }

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return errorResponse('Unauthorized', 401, 'UNAUTHORIZED')
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    })

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return errorResponse('Unauthorized', 401, 'UNAUTHORIZED')
    }

    const body = await req.json().catch(() => ({}))
    const channel = body.channel || 'wechat'

    const orderNo = genOrderNo()
    const amountCents = 29900

    const { data: order, error: insertError } = await supabase
      .from('orders')
      .insert({
        user_id: user.id,
        order_no: orderNo,
        amount_cents: amountCents,
        channel,
        status: 'pending',
      })
      .select('*')
      .single()

    if (insertError) {
      return errorResponse(insertError.message, 500, 'ORDER_INSERT_FAILED')
    }

    // MVP：先返回订单信息，支付回调由后端/测试脚本触发
    return jsonResponse({
      order_no: orderNo,
      amount_cents: amountCents,
      pay_params: {
        mode: 'mvp_manual_callback',
        message: 'MVP阶段：请通过 commerce-payment-webhook 完成支付回调',
      },
      order,
    })
  } catch (error) {
    return errorResponse(error.message, 500, 'UNKNOWN_ERROR')
  }
})
