export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL?.trim() || '';
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() || '';

export function hasSupabaseConfig() {
    return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

export function getSupabaseConfigError(serviceName = '当前服务') {
    const error = new Error(`${serviceName} 配置缺失，请联系管理员检查环境变量`);
    error.code = 'CONFIG_MISSING';
    return error;
}

export function assertSupabaseConfig(serviceName = '当前服务') {
    if (!hasSupabaseConfig()) {
        throw getSupabaseConfigError(serviceName);
    }
}
