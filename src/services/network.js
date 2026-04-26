import { createAppError } from './appError';

const DEFAULT_TIMEOUT_MS = 12000;

export async function timedFetch(input, init = {}, timeoutMs = DEFAULT_TIMEOUT_MS) {
    const controller = new AbortController();
    const upstreamSignal = init.signal;

    const cleanupUpstream = upstreamSignal
        ? () => upstreamSignal.removeEventListener('abort', handleAbort)
        : () => {};

    function handleAbort() {
        controller.abort(upstreamSignal?.reason);
    }

    if (upstreamSignal) {
        if (upstreamSignal.aborted) {
            controller.abort(upstreamSignal.reason);
        } else {
            upstreamSignal.addEventListener('abort', handleAbort);
        }
    }

    const timeoutId = window.setTimeout(() => {
        controller.abort(createAppError('TIMEOUT', '请求超时，请检查网络后重试'));
    }, timeoutMs);

    try {
        return await fetch(input, {
            ...init,
            signal: controller.signal,
        });
    } catch (error) {
        if (error?.name === 'AbortError' && controller.signal.reason?.code === 'TIMEOUT') {
            throw controller.signal.reason;
        }
        throw error;
    } finally {
        window.clearTimeout(timeoutId);
        cleanupUpstream();
    }
}
