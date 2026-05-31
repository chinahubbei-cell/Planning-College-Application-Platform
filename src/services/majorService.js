import supabase from './supabase';
import { createAppError, normalizeAppError } from './appError';
import { assertSupabaseConfig } from './supabaseConfig';

function normalizeMajorError(error, fallbackMessage) {
    const normalizedError = normalizeAppError(error, {
        fallbackMessage,
        networkMessage: '专业数据服务连接失败，请检查网络后重试',
        timeoutMessage: '专业数据请求超时，请检查网络或代理设置后重试',
        unauthorizedMessage: '当前登录状态已失效，请重新登录后再查看专业数据',
        configMessage: '专业数据服务配置缺失，请联系管理员检查环境变量',
    });
    const message = normalizedError.message.toLowerCase();
    if (message.includes('majors') || message.includes('relation')) {
        return createAppError('MAJOR_SCHEMA_MISSING', '专业数据表尚未初始化，请确认 Supabase 中已创建 majors 表');
    }
    return normalizedError;
}

/**
 * 获取专业列表（支持搜索、筛选、分页）
 * 优化: 仅选取列表需要的字段
 */
export async function getMajors({
    search = '',
    category = '',
    page = 1,
    pageSize = 20,
} = {}) {
    try {
        assertSupabaseConfig('专业数据服务');

        let query = supabase
            .from('majors')
            .select('id, name, category, degree, duration, description, universities(id, name, level, province)', { count: 'exact' });

        if (search) {
            query = query.ilike('name', `%${search}%`);
        }
        if (category) {
            query = query.eq('category', category);
        }

        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;

        const { data, error, count } = await query
            .order('category')
            .order('name')
            .range(from, to);

        if (error) throw error;
        return { data, count, page, pageSize, totalPages: Math.max(1, Math.ceil((count || 0) / pageSize)) };
    } catch (error) {
        throw normalizeMajorError(error, '获取专业列表失败');
    }
}

/**
 * 获取专业详情
 */
export async function getMajorById(id) {
    try {
        assertSupabaseConfig('专业数据服务');
        const { data, error } = await supabase
            .from('majors')
            .select('*, universities(id, name, level, province, city)')
            .eq('id', id)
            .single();
        if (error) throw error;
        return data;
    } catch (error) {
        throw normalizeMajorError(error, '获取专业详情失败');
    }
}

/**
 * 获取专业分类列表
 * 优化: 使用 DISTINCT 代替拉取全表再去重
 */
export async function getMajorCategories() {
    try {
        assertSupabaseConfig('专业数据服务');
        const { data, error } = await supabase
            .rpc('get_distinct_major_categories');

        if (error) {
            // Fallback: 如果 RPC 不存在，使用传统方式但只取 category 列
            const { data: fallbackData, error: fallbackError } = await supabase
                .from('majors')
                .select('category')
                .order('category');
            if (fallbackError) throw fallbackError;
            return [...new Set((fallbackData || []).map(d => d.category).filter(Boolean))];
        }

        return (data || []).map(d => d.category).filter(Boolean);
    } catch (error) {
        throw normalizeMajorError(error, '获取专业分类失败');
    }
}
