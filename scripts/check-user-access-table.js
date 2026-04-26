/**
 * 检查并修复 user_access 表和 RLS 策略
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY;

console.log('🔍 检查 user_access 表和 RLS 策略...\n');

async function checkTableAndPolicies() {
  const supabase = createClient(supabaseUrl, anonKey);

  // 先用 admin 登录
  const { data: adminData, error: adminError } = await supabase.auth.signInWithPassword({
    email: 'admin@gaokao.com',
    password: 'Admin@2026'
  });

  if (adminError) {
    console.error('❌ 管理员登录失败，请先确保管理员账号正常');
    console.error('错误:', adminError.message);
    console.log('\n💡 或者使用密码重置工具重置管理员密码');
    return;
  }

  console.log('✅ 管理员登录成功\n');

  // 检查 user_access 表是否存在
  console.log('1️⃣ 检查 user_access 表...');

  const { data: tableData, error: tableError } = await supabase
    .from('user_access')
    .select('*')
    .limit(1);

  if (tableError) {
    if (tableError.message.includes('does not exist')) {
      console.error('   ❌ user_access 表不存在');
      console.log('\n💡 解决方案: 在 Supabase Dashboard SQL Editor 中执行以下 SQL:\n');
      console.log('---');
      console.log(`-- 创建 user_access 表
create table if not exists public.user_access (
  user_id uuid primary key,
  is_paid boolean not null default false,
  expires_at timestamptz,
  updated_at timestamptz default now()
);

-- 启用 RLS
alter table public.user_access enable row level security;

-- 用户可以查看自己的权限
create policy "user_access_select_own" on public.user_access
  for select using (auth.uid() = user_id);

-- 用户可以插入自己的权限（通过 trigger）
create policy "user_access_insert_own" on public.user_access
  for insert with check (auth.uid() = user_id);

-- 用户可以更新自己的权限
create policy "user_access_update_own" on public.user_access
  for update using (auth.uid() = user_id);`);
      console.log('---');
    } else {
      console.error('   ❌ 查询失败:', tableError.message);
      console.log('   错误代码:', tableError.code);
      console.log('   错误详情:', tableError.hint);
    }
  } else {
    console.log('   ✅ user_access 表存在');
  }

  // 检查 test 用户的记录
  console.log('\n2️⃣ 检查 test@gaokao.com 的 user_access 记录...');

  // 登录 test 用户
  const { data: testData, error: testError } = await supabase.auth.signInWithPassword({
    email: 'test@gaokao.com',
    password: 'Test@2026'
  });

  if (testError) {
    console.error('   ❌ test 用户登录失败:', testError.message);
    console.log('\n💡 请先用密码重置工具重置 test 用户密码');
    await supabase.auth.signOut();
    return;
  }

  console.log('   ✅ test 用户登录成功');
  console.log('   User ID:', testData.user.id);

  // 尝试查询 user_access
  const { data: accessData, error: accessError } = await supabase
    .from('user_access')
    .select('*')
    .eq('user_id', testData.user.id)
    .maybeSingle();

  if (accessError) {
    console.error('   ❌ 查询 user_access 失败:', accessError.message);
    console.log('   错误代码:', accessError.code);
    console.log('   错误详情:', accessError.hint);

    console.log('\n💡 可能的原因:');
    console.log('   1. RLS 策略配置不正确');
    console.log('   2. user_access 表不存在');
    console.log('   3. 用户没有相应的权限');
  } else if (!accessData) {
    console.log('   ⚠️  user_access 记录不存在');
    console.log('\n💡 正在创建 user_access 记录...');

    const { error: insertError } = await supabase
      .from('user_access')
      .insert({
        user_id: testData.user.id,
        is_paid: true,
        expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()
      });

    if (insertError) {
      console.error('   ❌ 创建失败:', insertError.message);
      console.log('\n💡 请在 Supabase Dashboard SQL Editor 中执行:');
      console.log('---');
      console.log(`insert into public.user_access (user_id, is_paid, expires_at)
values ('${testData.user.id}', true, now() + interval '90 days');`);
      console.log('---');
    } else {
      console.log('   ✅ user_access 记录创建成功');
    }
  } else {
    console.log('   ✅ user_access 记录存在');
    console.log('   is_paid:', accessData.is_paid);
    console.log('   expires_at:', accessData.expires_at);
  }

  // 退出登录
  await supabase.auth.signOut();

  console.log('\n' + '='.repeat(60));
  console.log('📋 检查完成');
  console.log('='.repeat(60));
  console.log('\n💡 如果问题仍然存在，请刷新浏览器页面（Ctrl+Shift+R）');
  console.log('💡 并在浏览器控制台（F12）查看详细错误信息');
}

checkTableAndPolicies().catch(console.error);
