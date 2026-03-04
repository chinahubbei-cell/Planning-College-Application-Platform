import supabase from './supabase';

/**
 * 获取当前用户付费权限（MVP：仅 is_paid）
 */
export async function getMyAccess() {
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
}

/**
 * 创建订单（调用 Edge Function）
 */
export async function createOrder({ channel = 'wechat' } = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/commerce-create-order`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
      Authorization: `Bearer ${session?.access_token || ''}`,
    },
    body: JSON.stringify({ channel }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || '创建订单失败');
  return data;
}
