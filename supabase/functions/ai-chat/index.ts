import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type ChatMessage = {
  role: 'system' | 'user' | 'assistant'
  content: string
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

function normalizeMessages(input: unknown): ChatMessage[] {
  if (!Array.isArray(input)) return []

  return input
    .filter((message): message is ChatMessage => {
      if (!message || typeof message !== 'object') return false
      const candidate = message as Record<string, unknown>
      return (
        ['system', 'user', 'assistant'].includes(String(candidate.role)) &&
        typeof candidate.content === 'string' &&
        candidate.content.trim().length > 0
      )
    })
    .slice(-10)
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    if (req.method !== 'POST') {
      return errorResponse('Method not allowed', 405, 'METHOD_NOT_ALLOWED')
    }

    const apiKey = Deno.env.get('ZHIPUAI_API_KEY') || Deno.env.get('ZHIPU_API_KEY')
    if (!apiKey) {
      return errorResponse('AI 服务缺少 ZHIPUAI_API_KEY 配置', 500, 'CONFIG_MISSING')
    }

    const body = await req.json().catch(() => ({}))
    const messages = normalizeMessages(body.messages)
    if (messages.length === 0) {
      return errorResponse('messages is required', 400, 'BAD_REQUEST')
    }

    const upstreamResponse = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: Deno.env.get('ZHIPUAI_MODEL') || 'glm-4-flash',
        messages: [
          {
            role: 'system',
            content: '你是高考志愿规划助手，回答要准确、克制、可操作。涉及录取概率时提醒用户以官方招生信息为准。',
          },
          ...messages,
        ],
        temperature: 0.7,
      }),
    })

    const data = await upstreamResponse.json().catch(() => ({}))
    if (!upstreamResponse.ok) {
      const message = data?.error?.message || data?.message || 'AI 服务调用失败'
      return errorResponse(message, upstreamResponse.status, data?.error?.code || 'AI_PROVIDER_ERROR')
    }

    const reply = data?.choices?.[0]?.message?.content
    if (!reply) {
      return errorResponse('AI 服务返回格式无效', 502, 'AI_RESPONSE_INVALID')
    }

    return jsonResponse({ reply })
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : String(error), 500, 'UNKNOWN_ERROR')
  }
})
