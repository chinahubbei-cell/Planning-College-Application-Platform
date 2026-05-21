/**
 * 检查并创建 test@gaokao.com 的必要数据记录
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, anonKey);

async function checkAndFixTestUser() {
  const testEmail = process.env.TEST_USER_EMAIL || 'test@gaokao.com';
  const testPassword = process.env.TEST_USER_PASSWORD;

  if (!testPassword) {
    console.error('❌ 请通过环境变量 TEST_USER_PASSWORD 设置测试用户密码');
    return;
  }

  console.log(`🔍 检查 ${testEmail} 数据记录...\n`);

  // 1. 登录
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email: testEmail,
    password: testPassword
  });

  if (signInError) {
    console.error('❌ 登录失败:', signInError.message);
    return;
  }

  console.log('✅ 登录成功');
  console.log('   User ID:', signInData.user.id);
  console.log('   Email:', signInData.user.email);

  // 2. 检查 user_profiles 记录
  console.log('\n2️⃣ 检查 user_profiles 记录...');

  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', signInData.user.id)
    .maybeSingle();

  if (profileError) {
    console.error('   ❌ 查询失败:', profileError.message);
    console.log('\n💡 可能原因: user_profiles 表不存在');
    console.log('   请先运行 migration: 20260305_create_user_profiles.sql');
    await supabase.auth.signOut();
    return;
  }

  if (!profile) {
    console.log('   ⚠️  user_profiles 记录不存在');
    console.log('   正在创建...');

    const { error: insertError } = await supabase
      .from('user_profiles')
      .insert({
        id: signInData.user.id,
        name: '测试用户',
        role: 'user'
      });

    if (insertError) {
      console.error('   ❌ 创建失败:', insertError.message);
      console.log('\n请在 Supabase Dashboard SQL Editor 中执行:');
      console.log('---');
      console.log(`insert into public.user_profiles (id, name, role)
values ('${signInData.user.id}', '测试用户', 'user');`);
      console.log('---');
    } else {
      console.log('   ✅ user_profiles 创建成功');
    }
  } else {
    console.log('   ✅ user_profiles 存在');
    console.log('   Name:', profile.name);
    console.log('   Role:', profile.role);
  }

  // 3. 检查 user_access 记录
  console.log('\n3️⃣ 检查 user_access 记录...');

  const { data: access, error: accessError } = await supabase
    .from('user_access')
    .select('*')
    .eq('user_id', signInData.user.id)
    .maybeSingle();

  if (accessError) {
    console.error('   ❌ 查询失败:', accessError.message);
    await supabase.auth.signOut();
    return;
  }

  if (!access) {
    console.log('   ⚠️  user_access 记录不存在');
    console.log('   正在创建（设置为已付费状态）...');

    const { error: insertError } = await supabase
      .from('user_access')
      .insert({
        user_id: signInData.user.id,
        is_paid: true,
        expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()
      });

    if (insertError) {
      console.error('   ❌ 创建失败:', insertError.message);
      console.log('\n请在 Supabase Dashboard SQL Editor 中执行:');
      console.log('---');
      console.log(`insert into public.user_access (user_id, is_paid, expires_at)
values ('${signInData.user.id}', true, now() + interval '90 days');`);
      console.log('---');
    } else {
      console.log('   ✅ user_access 创建成功（已付费）');
    }
  } else {
    console.log('   ✅ user_access 存在');
    console.log('   is_paid:', access.is_paid);
    console.log('   expires_at:', access.expires_at);

    const expired = access.expires_at ? new Date(access.expires_at) < new Date() : false;
    if (expired) {
      console.log('   ⚠️  已过期，正在续费...');
      await supabase
        .from('user_access')
        .update({
          is_paid: true,
          expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()
        })
        .eq('user_id', signInData.user.id);
      console.log('   ✅ 已续费');
    } else if (!access.is_paid) {
      console.log('   ⚠️  未付费，正在激活...');
      await supabase
        .from('user_access')
        .update({ is_paid: true })
        .eq('user_id', signInData.user.id);
      console.log('   ✅ 已激活');
    }
  }

  // 4. 验证 getMyAccess 调用
  console.log('\n4️⃣ 验证 getMyAccess 调用...');

  // 重新获取用户
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    console.log('   ⚠️  无法获取用户信息（可能 session 未刷新）');
  } else {
    console.log('   ✅ 用户信息获取成功');

    const { data: accessData, error: getError } = await supabase
      .from('user_access')
      .select('is_paid, expires_at')
      .eq('user_id', user.id)
      .maybeSingle();

    if (getError) {
      console.error('   ❌ 获取 user_access 失败:', getError.message);
    } else if (!accessData) {
      console.log('   ⚠️  user_access 记录不存在');
    } else {
      const expired = accessData.expires_at ? new Date(accessData.expires_at) < new Date() : false;
      const isPaid = !!accessData.is_paid && !expired;
      console.log('   ✅ getMyAccess 结果:');
      console.log('      is_paid:', isPaid);
      console.log('      expires_at:', accessData.expires_at);

      if (isPaid) {
        console.log('\n🎉 所有检查通过！套餐订阅应该显示"已订阅"状态');
      } else {
        console.log('\n⚠️  用户未付费或已过期，套餐订阅将显示"立即开通"');
      }
    }
  }

  // 退出登录
  await supabase.auth.signOut();

  console.log('\n' + '='.repeat(60));
  console.log('📋 检查完成');
  console.log('='.repeat(60));
  console.log('\n💡 请刷新套餐订阅页面（按 Ctrl+Shift+R 或 Cmd+Shift+R）');
}

checkAndFixTestUser().catch(console.error);
