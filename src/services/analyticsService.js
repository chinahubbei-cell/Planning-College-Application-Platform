import supabase from './supabase';
import { normalizeAppError } from './appError';
import { assertSupabaseConfig } from './supabaseConfig';

function normalizeAnalyticsError(error, fallbackMessage) {
    return normalizeAppError(error, {
        fallbackMessage,
        networkMessage: '数据分析服务连接失败，请检查网络后重试',
        timeoutMessage: '数据分析请求超时，请检查网络或代理设置后重试',
        unauthorizedMessage: '当前登录状态已失效，请重新登录后再查看数据分析',
        configMessage: '数据分析服务配置缺失，请联系管理员检查环境变量',
    });
}

/**
 * 获取院校统计数据 (via RPC)
 */
export async function getUniversityStats() {
    try {
        assertSupabaseConfig('数据分析服务');
        const { data, error } = await supabase.rpc('get_university_stats');
        if (error) throw error;
        return data;
    } catch (error) {
        throw normalizeAnalyticsError(error, '获取院校统计失败');
    }
}

/**
 * 获取分数线统计数据 (via RPC)
 */
export async function getScoreStats(province = '湖北') {
    try {
        assertSupabaseConfig('数据分析服务');
        const { data, error } = await supabase.rpc('get_score_stats', { p_province: province });
        if (error) throw error;
        return data;
    } catch (error) {
        throw normalizeAnalyticsError(error, '获取分数线统计失败');
    }
}

/**
 * 获取专业统计 (via RPC)
 */
export async function getMajorStats() {
    try {
        assertSupabaseConfig('数据分析服务');
        const { data, error } = await supabase.rpc('get_major_stats');
        if (error) throw error;
        return data;
    } catch (error) {
        throw normalizeAnalyticsError(error, '获取专业统计失败');
    }
}
