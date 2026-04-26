/**
 * 检查 test@gaokao.com 用户的付费状态
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUserAccess() {
  const testEmail = 'test@gaokao.com';

  console.log('🔍 检查用户付费状态...\n');

  // 1. 登录获取用户
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email: testEmail,
    password: 'Test@2026'
  });

  if (signInError) {
    console.error('❌ 登录失败:', signInError.message);
    return;
  }

  console.log('✅ 登录成功');
  console.log('   User ID:', signInData.user.id);

  // 2. 检查 user_access 记录
  console.log('\n2️⃣ 检查 user_access 记录...');

  const { data: access, error: accessError } = await supabase
    .from('user_access')
    .select('*')
    .eq('user_id', signInData.user.id)
    .maybeSingle();

  if (accessError) {
    console.error('   ❌ 查询失败:', accessError.message);
    return;
  }

  if (!access) {
    console.log('   ⚠️  user_access 记录不存在');
    console.log('\n💡 正在创建 user_access 记录...');

    const { error: insertError } = await supabase
      .from('user_access')
      .insert({
        user_id: signInData.user.id,
        is_paid: true,  // 测试用户默认付费
        expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString() // 90天后
      });

    if (insertError) {
      console.error('   ❌ 创建失败:', insertError.message);
      console.log('\n请在 Supabase Dashboard SQL Editor 中执行:');
      console.log('---');
      console.log(`insert into public.user_access (user_id, is_paid, expires_at)
values ('${signInData.user.id}', true, now() + interval '90 days')
on conflict (user_id) do update set is_paid = true, expires_at = now() + interval '90 days';`);
      console.log('---');
    } else {
      console.log('   ✅ user_access 记录创建成功');
    }
    return;
  }

  console.log('   ✅ user_access 记录存在');
  console.log('   is_paid:', access.is_paid);
  console.log('   expires_at:', access.expires_at);

  // 检查是否过期
  const expired = access.expires_at ? new Date(access.expires_at) < new Date() : false;
  console.log('   expired:', expired);

  if (!access.is_paid || expired) {
    console.log('\n⚠️  用户未付费或已过期');
    console.log('\n💡 正在激活用户...');

    const { error: updateError } = await supabase
      .from('user_access')
      .update({
        is_paid: true,
        expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()
      })
      .eq('user_id', signInData.user.id);

    if (updateError) {
      console.error('   ❌ 更新失败:', updateError.message);
      console.log('\n请在 Supabase Dashboard SQL Editor 中执行:');
      console.log(`update public.user_access
set is_paid = true, expires_at = now() + interval '90 days'
where user_id = '${signInData.user.id}';`);
    } else {
      console.log('   ✅ 用户已激活');
    }
  } else {
    console.log('\n✅ 用户状态正常: 已付费且未过期');
  }

  // 退出登录
  await supabase.auth.signOut();
}

checkUserAccess().catch(console.error);
