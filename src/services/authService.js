import supabase from './supabase';
import { normalizeAppError } from './appError';
import { assertSupabaseConfig } from './supabaseConfig';

function normalizeAuthError(error, fallbackMessage) {
    const normalizedError = normalizeAppError(error, {
        fallbackMessage,
        networkMessage: '认证服务连接失败，请检查网络后重试',
        unauthorizedMessage: '登录状态已失效，请重新登录',
        configMessage: '认证服务配置缺失，请联系管理员检查环境变量',
    });
    const message = normalizedError.message.toLowerCase();
    if (message.includes('user_profiles') || message.includes('relation')) {
        const migrationError = new Error('用户资料功能尚未初始化，请先执行 20260305_create_user_profiles.sql 和 20260330_user_profiles_insert_policy.sql');
        migrationError.code = 'PROFILE_SCHEMA_MISSING';
        return migrationError;
    }
    return normalizedError;
}

/**
 * 邮箱密码注册
 */
export async function signUp({ email, password, name }) {
    try {
        assertSupabaseConfig('认证服务');
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: { name },
            },
        });
        if (error) throw error;
        return data;
    } catch (error) {
        throw normalizeAuthError(error, '注册失败');
    }
}

/**
 * 邮箱密码登录
 */
export async function signIn({ email, password }) {
    try {
        assertSupabaseConfig('认证服务');
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });
        if (error) throw error;
        return data;
    } catch (error) {
        throw normalizeAuthError(error, '登录失败');
    }
}

/**
 * 退出登录
 */
export async function signOut() {
    try {
        assertSupabaseConfig('认证服务');
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
    } catch (error) {
        throw normalizeAuthError(error, '退出登录失败');
    }
}

/**
 * 获取当前用户
 */
export async function getCurrentUser() {
    try {
        assertSupabaseConfig('认证服务');
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error) throw error;
        return user;
    } catch (error) {
        throw normalizeAuthError(error, '获取当前用户失败');
    }
}

/**
 * 获取当前 session
 */
export async function getSession() {
    try {
        assertSupabaseConfig('认证服务');
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        return session;
    } catch (error) {
        throw normalizeAuthError(error, '获取登录态失败');
    }
}

/**
 * 获取用户资料
 */
export async function getUserProfile(userId) {
    try {
        assertSupabaseConfig('用户资料服务');
        const { data, error } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', userId)
            .maybeSingle();
        if (error) throw error;
        return data;
    } catch (error) {
        throw normalizeAppError(error, {
            fallbackMessage: '获取用户资料失败',
            networkMessage: '用户资料服务连接失败，请检查网络后重试',
            unauthorizedMessage: '登录状态已失效，请重新登录',
            configMessage: '用户资料服务配置缺失，请联系管理员检查环境变量',
        });
    }
}

/**
 * 更新用户资料
 */
export async function updateUserProfile(userId, updates) {
    try {
        assertSupabaseConfig('用户资料服务');
        const payload = {
            id: userId,
            ...updates,
            updated_at: new Date().toISOString(),
        };

        const { data, error } = await supabase
            .from('user_profiles')
            .upsert(payload, { onConflict: 'id' })
            .select()
            .single();
        if (error) throw error;
        return data;
    } catch (error) {
        throw normalizeAppError(error, {
            fallbackMessage: '保存个人资料失败',
            networkMessage: '用户资料服务连接失败，请检查网络后重试',
            unauthorizedMessage: '登录状态已失效，请重新登录',
            configMessage: '用户资料服务配置缺失，请联系管理员检查环境变量',
        });
    }
}

/**
 * 监听认证状态变化
 */
export function onAuthStateChange(callback) {
    return supabase.auth.onAuthStateChange(callback);
}
