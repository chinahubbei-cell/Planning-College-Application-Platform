import supabase from './supabase';
import { callEdgeFunction } from './edgeFunctionService';
import { createAppError, normalizeAppError } from './appError';
import { assertSupabaseConfig } from './supabaseConfig';

function normalizeCommerceError(error, fallbackMessage) {
  return normalizeAppError(error, {
    fallbackMessage,
    networkMessage: '付费服务暂时无法连接，请检查网络后重试',
    unauthorizedMessage: '请先登录后再使用订阅功能',
    configMessage: '订阅服务配置缺失，请联系管理员检查环境变量',
  });
}

/**
 * 获取当前用户付费权限（MVP：仅 is_paid）
 */
export async function getMyAccess() {
  try {
    assertSupabaseConfig('订阅服务');
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { is_paid: false, expires_at: null };

    const { data, error } = await supabase
      .from('user_access')
      .select('is_paid, expires_at')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) throw error;

    if (!data) return { is_paid: false, expires_at: null };

    const expired = data.expires_at ? new Date(data.expires_at) < new Date() : false;
    return {
      is_paid: !!data.is_paid && !expired,
      expires_at: data.expires_at,
    };
  } catch (error) {
    const normalizedError = normalizeCommerceError(error, '获取订阅状态失败');
    const message = normalizedError.message.toLowerCase();
    if (message.includes('user_access') || message.includes('relation')) {
      throw createAppError('SUBSCRIPTION_SCHEMA_MISSING', '订阅功能尚未初始化，请先执行 20260305_mvp_commerce_light.sql migration');
    }
    throw normalizedError;
  }
}

/**
 * 创建订单（调用 Edge Function）
 */
export async function createOrder({ channel = 'wechat' } = {}) {
  try {
    assertSupabaseConfig('订阅服务');
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      throw createAppError('UNAUTHORIZED', '请先登录后再开通套餐', { status: 401 });
    }

    return await callEdgeFunction('commerce-create-order', {
      accessToken: session.access_token,
      body: { channel },
      fallbackMessage: '创建订单失败',
      serviceName: '订阅服务',
    });
  } catch (error) {
    throw normalizeCommerceError(error, '创建订单失败');
  }
}
