import supabase from './supabase';

/**
 * 获取用户收藏列表
 */
export async function getFavorites(type = null) {
    let query = supabase
        .from('favorites')
        .select(`
      *,
      universities (id, name, code, province, city, level, type, is_985, is_211, is_double_first_class),
      majors (id, name, code, category, degree, duration)
    `)
        .order('created_at', { ascending: false });

    if (type) query = query.eq('type', type);

    const { data, error } = await query;
    if (error) throw error;
    return data;
}

/**
 * 添加收藏
 */
export async function addFavorite({ universityId, majorId, type }) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('请先登录');

    const { data, error } = await supabase
        .from('favorites')
        .insert({
            user_id: user.id,
            university_id: universityId || null,
            major_id: majorId || null,
            type,
        })
        .select()
        .single();
    if (error) throw error;
    return data;
}

/**
 * 取消收藏
 */
export async function removeFavorite(favoriteId) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('请先登录');

    const { error } = await supabase
        .from('favorites')
        .delete()
        .eq('id', favoriteId)
        .eq('user_id', user.id);
    if (error) throw error;
}

/**
 * 检查是否已收藏
 */
export async function checkFavorite({ universityId, majorId, type }) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    let query = supabase
        .from('favorites')
        .select('id')
        .eq('user_id', user.id)
        .eq('type', type);

    if (universityId) query = query.eq('university_id', universityId);
    if (majorId) query = query.eq('major_id', majorId);

    const { data } = await query.maybeSingle();
    return data ? data.id : null;
}
