import { SUPABASE_ANON_KEY, SUPABASE_URL, assertSupabaseConfig } from './supabaseConfig';
import { normalizeAppError, parseEdgeFunctionResponse } from './appError';
import { timedFetch } from './network';

export async function callEdgeFunction(name, {
    method = 'POST',
    body,
    headers = {},
    accessToken,
    fallbackMessage = '服务请求失败，请稍后重试',
    serviceName = '当前服务',
} = {}) {
    assertSupabaseConfig(serviceName);

    try {
        const response = await timedFetch(`${SUPABASE_URL}/functions/v1/${name}`, {
            method,
            headers: {
                apikey: SUPABASE_ANON_KEY,
                ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
                ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
                ...headers,
            },
            ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
        });

        return await parseEdgeFunctionResponse(response, fallbackMessage);
    } catch (error) {
        throw normalizeAppError(error, { fallbackMessage });
    }
}
