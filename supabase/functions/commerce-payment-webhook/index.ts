import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-signature',
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
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!supabaseUrl || !serviceRoleKey) throw new Error('Missing service role env')

    const admin = createClient(supabaseUrl, serviceRoleKey)

    // MVP：简化验签（正式上线需替换为真实支付验签）
    const { order_no, provider_trade_no, provider = 'wechat', pay_status = 'SUCCESS' } = await req.json()
    if (!order_no || !provider_trade_no) {
      return new Response(JSON.stringify({ error: { message: 'Missing order_no/provider_trade_no' } }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (pay_status !== 'SUCCESS') {
      return new Response(JSON.stringify({ ok: true, ignored: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: order, error: orderError } = await admin
      .from('orders')
      .select('*')
      .eq('order_no', order_no)
      .single()

    if (orderError || !order) {
      return new Response(JSON.stringify({ error: { message: 'Order not found' } }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 幂等：已支付直接返回
    if (order.status === 'paid') {
      return new Response(JSON.stringify({ ok: true, idempotent: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 写支付日志（provider_trade_no 唯一）
    const { error: payError } = await admin
      .from('payments')
      .insert({
        order_id: order.id,
        provider,
        provider_trade_no,
        status: 'success',
        payload: { order_no, provider_trade_no, provider, pay_status },
      })

    if (payError && !String(payError.message || '').toLowerCase().includes('duplicate')) {
      throw payError
    }

    // 更新订单状态
    const { error: updateOrderError } = await admin
      .from('orders')
      .update({ status: 'paid', paid_at: new Date().toISOString() })
      .eq('id', order.id)
    if (updateOrderError) throw updateOrderError

    // 开通访问权限（90天）
    const expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()
    const { error: accessError } = await admin
      .from('user_access')
      .upsert({
        user_id: order.user_id,
        is_paid: true,
        expires_at: expiresAt,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' })

    if (accessError) throw accessError

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: { message: error.message } }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
