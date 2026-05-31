import supabase from './supabase';
import { createAppError } from './appError';

async function getCurrentUserId() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw createAppError('UNAUTHORIZED', '请先登录');
    return user.id;
}

/**
 * 获取用户的所有方案
 */
export async function getPlans() {
    const { data, error } = await supabase
        .from('plans')
        .select('*, plan_items(count)')
        .order('updated_at', { ascending: false });
    if (error) throw error;
    return data;
}

/**
 * 获取方案详情(含条目)
 */
export async function getPlanById(planId) {
    const { data, error } = await supabase
        .from('plans')
        .select(`
      *,
      plan_items (
        *,
        universities (id, name, code, province, city, level, type, is_985, is_211),
        majors (id, name, code, category)
      )
    `)
        .eq('id', planId)
        .single();
    if (error) throw error;
    // Sort items
    if (data?.plan_items) {
        data.plan_items.sort((a, b) => a.sort_order - b.sort_order);
    }
    return data;
}

/**
 * 创建方案
 */
export async function createPlan({ name, score, province, subjectType, year }) {
    const userId = await getCurrentUserId();

    const { data, error } = await supabase
        .from('plans')
        .insert({
            user_id: userId,
            name: name || '我的方案',
            score,
            province,
            subject_type: subjectType,
            year,
        })
        .select()
        .single();
    if (error) throw error;
    return data;
}

async function verifyPlanOwnership(planId) {
    const userId = await getCurrentUserId();
    const { data, error } = await supabase
        .from('plans')
        .select('id')
        .eq('id', planId)
        .eq('user_id', userId)
        .maybeSingle();
    if (error) throw error;
    if (!data) throw createAppError('NOT_FOUND', '方案不存在或无权操作');
    return userId;
}

async function verifyPlanItemOwnership(itemId) {
    const userId = await getCurrentUserId();
    const { data, error } = await supabase
        .from('plan_items')
        .select('id, plans!inner(user_id)')
        .eq('id', itemId)
        .single();
    if (error) throw error;
    if (!data || data.plans?.user_id !== userId) {
        throw createAppError('NOT_FOUND', '志愿条目不存在或无权操作');
    }
    return userId;
}

/**
 * 更新方案
 */
export async function updatePlan(planId, updates) {
    await verifyPlanOwnership(planId);
    const { data, error } = await supabase
        .from('plans')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', planId)
        .select()
        .single();
    if (error) throw error;
    return data;
}

/**
 * 删除方案
 */
export async function deletePlan(planId) {
    await verifyPlanOwnership(planId);
    const { error } = await supabase.from('plans').delete().eq('id', planId);
    if (error) throw error;
}

/**
 * 添加方案条目
 */
export async function addPlanItem(planId, { universityId, majorId, riskLevel, sortOrder, notes }) {
    await verifyPlanOwnership(planId);
    const { data, error } = await supabase
        .from('plan_items')
        .insert({
            plan_id: planId,
            university_id: universityId,
            major_id: majorId,
            risk_level: riskLevel,
            sort_order: sortOrder || 0,
            notes,
        })
        .select(`
      *,
      universities (id, name, code, province, level, type, is_985, is_211),
      majors (id, name, code, category)
    `)
        .single();
    if (error) throw error;
    return data;
}

/**
 * 删除方案条目
 */
export async function removePlanItem(itemId) {
    await verifyPlanItemOwnership(itemId);
    const { error } = await supabase.from('plan_items').delete().eq('id', itemId);
    if (error) throw error;
}

/**
 * 更新条目排序
 */
export async function reorderPlanItems(items) {
    for (const item of items) {
        await verifyPlanItemOwnership(item.id);
    }
    const updates = items.map((item, index) =>
        supabase.from('plan_items').update({ sort_order: index }).eq('id', item.id)
    );
    await Promise.all(updates);
}
