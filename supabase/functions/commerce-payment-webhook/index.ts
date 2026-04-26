import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-signature',
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
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!supabaseUrl || !serviceRoleKey) {
      return errorResponse('Missing service role env', 500, 'CONFIG_MISSING')
    }

    const admin = createClient(supabaseUrl, serviceRoleKey)

    // MVP：简化验签（正式上线需替换为真实支付验签）
    const { order_no, provider_trade_no, provider = 'wechat', pay_status = 'SUCCESS' } = await req.json()
    if (!order_no || !provider_trade_no) {
      return errorResponse('Missing order_no/provider_trade_no', 400, 'BAD_REQUEST')
    }

    if (pay_status !== 'SUCCESS') {
      return jsonResponse({ ok: true, ignored: true })
    }

    const { data: order, error: orderError } = await admin
      .from('orders')
      .select('*')
      .eq('order_no', order_no)
      .single()

    if (orderError || !order) {
      return errorResponse('Order not found', 404, 'ORDER_NOT_FOUND')
    }

    // 幂等：已支付直接返回
    if (order.status === 'paid') {
      return jsonResponse({ ok: true, idempotent: true })
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
      return errorResponse(payError.message, 500, 'PAYMENT_LOG_FAILED')
    }

    // 更新订单状态
    const { error: updateOrderError } = await admin
      .from('orders')
      .update({ status: 'paid', paid_at: new Date().toISOString() })
      .eq('id', order.id)
    if (updateOrderError) {
      return errorResponse(updateOrderError.message, 500, 'ORDER_UPDATE_FAILED')
    }

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

    if (accessError) {
      return errorResponse(accessError.message, 500, 'ACCESS_UPSERT_FAILED')
    }

    return jsonResponse({ ok: true })
  } catch (error) {
    return errorResponse(error.message, 500, 'UNKNOWN_ERROR')
  }
})
