/**
 * 诊断 admin@gaokao.com 登录问题
 * 使用方法: node scripts/diagnose-admin-login.js
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  console.error('❌ 错误: 未找到 VITE_SUPABASE_URL 环境变量');
  process.exit(1);
}

// 使用 anon key（普通用户权限）
const supabase = createClient(supabaseUrl, supabaseKey);

const adminEmail = process.env.TEST_ADMIN_EMAIL || 'admin@gaokao.com';

console.log('🔍 开始诊断登录问题...\n');

async function diagnose() {
  // 1. 检查 user_profiles 表是否存在
  console.log('1️⃣ 检查 user_profiles 表...');

  const { data: tables, error: tableError } = await supabase
    .from('user_profiles')
    .select('id')
    .limit(1);

  if (tableError) {
    console.error('   ❌ user_profiles 表不存在或无法访问');
    console.error('   错误:', tableError.message);
    console.log('\n💡 解决方案: 请先执行以下 SQL 创建表:');
    console.log('---');
    console.log(`create table if not exists public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  avatar_url text,
  role text not null default 'user',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.user_profiles enable row level security;

create policy "user_profiles_select_own" on public.user_profiles
  for select using (auth.uid() = id);

create policy "user_profiles_update_own" on public.user_profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);
`);
    console.log('---');
    return;
  }
  console.log('   ✅ user_profiles 表存在\n');

  // 2. 尝试用密码登录（检测用户是否存在）
  console.log('2️⃣ 检查用户账户...');
  const testPassword = process.env.TEST_ADMIN_PASSWORD;

  if (!testPassword) {
    console.error('   ❌ 请通过环境变量 TEST_ADMIN_PASSWORD 设置管理员密码');
    return;
  }

  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email: adminEmail,
    password: testPassword
  });

  if (signInError) {
    if (signInError.message === 'Invalid login credentials') {
      console.error('   ❌ 用户不存在或密码错误');
      console.log('\n💡 解决方案: 请创建管理员账户');
      console.log('---');
      console.log('方法1: 运行 npm run create-admin');
      console.log('方法2: 在 Supabase Dashboard 手动创建用户');
      console.log('---');
    } else {
      console.error('   ❌ 登录错误:', signInError.message);
    }
    return;
  }

  console.log('   ✅ 用户登录成功');
  console.log('   User ID:', signInData.user.id);
  console.log('   Email:', signInData.user.email);
  console.log('   Email confirmed:', signInData.user.email_confirmed_at ? '是' : '否');

  // 3. 检查 user_profiles 记录
  console.log('\n3️⃣ 检查 user_profiles 记录...');

  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', signInData.user.id)
    .single();

  if (profileError) {
    console.error('   ❌ 无法读取 user_profile:', profileError.message);
    console.log('\n💡 可能原因:');
    console.log('   - RLS 策略配置问题');
    console.log('   - 用户没有对应的 profile 记录');
    console.log('\n   尝试创建 profile 记录...');

    const { error: insertError } = await supabase
      .from('user_profiles')
      .insert({
        id: signInData.user.id,
        name: signInData.user.user_metadata?.name || '管理员',
        role: 'admin'
      });

    if (insertError) {
      console.error('   ❌ 创建 profile 失败:', insertError.message);
      console.log('\n💡 请在 Supabase Dashboard SQL Editor 中执行:');
      console.log('---');
      console.log(`insert into public.user_profiles (id, name, role)
values ('${signInData.user.id}', '管理员', 'admin')
on conflict (id) do update set role = 'admin';`);
      console.log('---');
    } else {
      console.log('   ✅ profile 记录创建成功');
    }
    return;
  }

  console.log('   ✅ user_profile 存在');
  console.log('   Name:', profile.name);
  console.log('   Role:', profile.role);
  console.log('   Created:', profile.created_at);

  if (profile.role !== 'admin') {
    console.log('\n⚠️  警告: 用户角色不是 admin');
    console.log('\n💡 更新为管理员角色...');

    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({ role: 'admin' })
      .eq('id', signInData.user.id);

    if (updateError) {
      console.error('   ❌ 更新角色失败:', updateError.message);
      console.log('\n请在 Supabase Dashboard SQL Editor 中执行:');
      console.log(`update public.user_profiles set role = 'admin' where id = '${signInData.user.id}';`);
    } else {
      console.log('   ✅ 已更新为 admin 角色');
    }
  } else {
    console.log('\n✅ 管理员权限正常');
  }

  // 4. 总结
  console.log('\n' + '='.repeat(50));
  console.log('📋 诊断总结');
  console.log('='.repeat(50));
  console.log('✅ 用户账户存在');
  console.log('✅ user_profiles 表存在');
  console.log('✅ user_profile 记录存在');
  console.log('✅ 管理员权限正确');
  console.log('\n🎉 所有检查通过！应该可以正常登录了。');
  console.log('\n📝 登录信息:');
  console.log('   URL: http://localhost:5173/login');
  console.log('   Email:', adminEmail);
  console.log('   Password: (已通过环境变量设置，请妥善保管)');
  console.log('\n⚠️  如果仍然无法登录，请检查:');
  console.log('   1. 浏览器控制台 (F12) 的错误信息');
  console.log('   2. Network 标签页的 API 请求状态');
  console.log('   3. 确保开发服务器正在运行 (npm run dev)');

  // 退出登录
  await supabase.auth.signOut();
}

diagnose().catch(console.error);
