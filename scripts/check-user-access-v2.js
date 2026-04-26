/**
 * 检查所有用户的 user_access 状态
 * 使用 service role key 直接查询数据库
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
// 使用 service role key 绕过 RLS
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function checkAllUsersAccess() {
  console.log('🔍 检查所有用户的 user_access 记录...\n');

  // 1. 获取所有用户
  const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();

  if (usersError) {
    console.error('❌ 获取用户列表失败:', usersError.message);
    return;
  }

  console.log(`📋 找到 ${users.length} 个用户\n`);

  // 2. 检查每个 user_access 记录
  for (const user of users) {
    console.log(`👤 用户: ${user.email}`);
    console.log(`   ID: ${user.id}`);

    const { data: access, error: accessError } = await supabase
      .from('user_access')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (accessError) {
      console.error(`   ❌ 查询失败: ${accessError.message}`);
      continue;
    }

    if (!access) {
      console.log('   ⚠️  无 user_access 记录');
      console.log('   正在创建...');

      const { error: insertError } = await supabase
        .from('user_access')
        .insert({
          user_id: user.id,
          is_paid: user.email.includes('admin') || user.email.includes('test'), // admin 和 test 用户默认付费
          expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()
        });

      if (insertError) {
        console.error(`   ❌ 创建失败: ${insertError.message}`);
      } else {
        console.log('   ✅ 已创建 (is_paid = true)');
      }
    } else {
      console.log('   ✅ user_access 存在');
      console.log(`   is_paid: ${access.is_paid}`);
      console.log(`   expires_at: ${access.expires_at}`);

      const expired = access.expires_at ? new Date(access.expires_at) < new Date() : false;
      if (expired) {
        console.log('   ⚠️  已过期');
      } else if (access.is_paid) {
        console.log('   ✅ 已付费且未过期');
      }
    }

    console.log();
  }

  console.log('='.repeat(50));
  console.log('💡 如果 Pricing 页面仍显示"立即订阅"，请刷新页面或清除缓存');
  console.log('='.repeat(50));
}

checkAllUsersAccess().catch(console.error);
