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

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: { message: 'Method not allowed' } }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
    if (!supabaseUrl || !supabaseAnonKey) throw new Error('Missing Supabase env')

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: { message: 'Unauthorized' } }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    })

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return new Response(JSON.stringify({ error: { message: 'Unauthorized' } }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
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

    if (insertError) throw insertError

    // MVP：先返回订单信息，支付回调由后端/测试脚本触发
    return new Response(JSON.stringify({
      order_no: orderNo,
      amount_cents: amountCents,
      pay_params: {
        mode: 'mvp_manual_callback',
        message: 'MVP阶段：请通过 commerce-payment-webhook 完成支付回调',
      },
      order,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: { message: error.message } }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
