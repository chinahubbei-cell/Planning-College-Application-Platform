import { getSupabaseConfigError } from './supabaseConfig';

export function createAppError(code, message, extra = {}) {
    const error = new Error(message);
    error.code = code;
    Object.assign(error, extra);
    return error;
}

function getNestedMessage(error) {
    if (!error) return '';
    if (typeof error === 'string') return error;
    if (typeof error?.error === 'string') return error.error;
    if (error?.error?.message) return error.error.message;
    if (error?.message) return error.message;
    return '';
}

function inferErrorCode(error, message, status) {
    if (error?.code === 'CONFIG_MISSING') return 'CONFIG_MISSING';
    if (error?.code === 'TIMEOUT') return 'TIMEOUT';
    if (status === 401) return 'UNAUTHORIZED';
    if (status === 403) return 'FORBIDDEN';
    if (status === 404) return 'NOT_FOUND';
    if (status === 400) return 'BAD_REQUEST';
    if (message.includes('failed to fetch') || message.includes('fetch failed') || message.includes('networkerror')) {
        return 'NETWORK_ERROR';
    }
    return error?.code || 'UNKNOWN_ERROR';
}

export function normalizeAppError(error, {
    fallbackMessage = '请求失败，请稍后重试',
    networkMessage = '服务连接失败，请检查网络后重试',
    timeoutMessage = '服务响应超时，请检查网络后重试',
    unauthorizedMessage = '登录状态已失效，请重新登录',
    forbiddenMessage = '当前账号没有执行此操作的权限',
    configMessage,
} = {}) {
    if (error?.code === 'CONFIG_MISSING') {
        return configMessage
            ? createAppError('CONFIG_MISSING', configMessage, { cause: error })
            : error;
    }

    const rawMessage = getNestedMessage(error);
    const message = rawMessage.toLowerCase();
    const status = error?.status ?? error?.response?.status;
    const code = inferErrorCode(error, message, status);

    if (message.includes('placeholder.supabase.co') || message.includes('placeholder-key')) {
        return configMessage
            ? createAppError('CONFIG_MISSING', configMessage, { cause: error })
            : getSupabaseConfigError('当前服务');
    }

    if (code === 'NETWORK_ERROR') {
        return createAppError(code, networkMessage, { cause: error, status });
    }

    if (code === 'TIMEOUT') {
        return createAppError(code, timeoutMessage, { cause: error, status });
    }

    if (code === 'CONFIG_MISSING') {
        return configMessage
            ? createAppError(code, configMessage, { cause: error, status })
            : getSupabaseConfigError('当前服务');
    }

    if (code === 'UNAUTHORIZED') {
        return createAppError(code, unauthorizedMessage, { cause: error, status });
    }

    if (code === 'FORBIDDEN') {
        return createAppError(code, forbiddenMessage, { cause: error, status });
    }

    return createAppError(code, rawMessage || fallbackMessage, { cause: error, status });
}

export async function parseEdgeFunctionResponse(response, fallbackMessage = '请求失败') {
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        const errorPayload = data?.error;
        const message = typeof errorPayload === 'string'
            ? errorPayload
            : errorPayload?.message || data?.message || fallbackMessage;
        const code = typeof errorPayload === 'object' && errorPayload?.code
            ? errorPayload.code
            : inferErrorCode(errorPayload, String(message).toLowerCase(), response.status);

        throw createAppError(code, message, { status: response.status, data });
    }
    return data;
}
