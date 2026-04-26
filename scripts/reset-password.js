/**
 * 重置用户密码脚本
 * 使用方法: node scripts/reset-password.js <email> [new-password]
 *
 * 注意: 需要 SUPABASE_SERVICE_ROLE_KEY 环境变量
 * 如果没有，可以在 Supabase Dashboard 中手动重置密码
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  console.error('❌ 错误: 未找到 VITE_SUPABASE_URL 环境变量');
  process.exit(1);
}

if (!serviceRoleKey) {
  console.error('❌ 错误: 未找到 SUPABASE_SERVICE_ROLE_KEY 环境变量');
  console.error('\n💡 解决方案:');
  console.error('1. 获取 Service Role Key:');
  console.error('   - 登录 Supabase Dashboard');
  console.error('   - 进入 Project Settings → API');
  console.error('   - 复制 service_role (secret) 密钥');
  console.error('2. 添加到 .env 文件:');
  console.error('   SUPABASE_SERVICE_ROLE_KEY=你的密钥');
  console.error('\n或者，直接在 Supabase Dashboard 手动重置密码（见下方说明）');
  console.error('---');
  console.error('手动重置步骤:');
  console.error('1. Supabase Dashboard → Authentication → Users');
  console.error('2. 找到用户 → 点击进入详情');
  console.error('3. 点击 "Reset Password" → 设置新密码');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const email = process.argv[2];
const newPassword = process.argv[3] || 'Test@2026'; // 默认密码

if (!email) {
  console.error('❌ 用法: node scripts/reset-password.js <email> [new-password]');
  console.error('   例如: node scripts/reset-password.js test@gaokao.com MyPassword123');
  process.exit(1);
}

async function resetPassword() {
  console.log(`🔧 重置用户密码: ${email}\n`);

  // 1. 获取用户列表
  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();

  if (listError) {
    console.error('❌ 获取用户列表失败:', listError.message);
    process.exit(1);
  }

  // 2. 查找目标用户
  const user = users.find(u => u.email === email);

  if (!user) {
    console.error(`❌ 用户不存在: ${email}`);
    console.error('\n可用的用户:');
    users.forEach(u => {
      console.error(`   - ${u.email}`);
    });
    process.exit(1);
  }

  console.log(`✅ 找到用户: ${user.email}`);
  console.log(`   ID: ${user.id}`);
  console.log(`   Email confirmed: ${user.email_confirmed_at ? '是' : '否'}`);

  // 3. 更新用户密码
  console.log(`\n🔄 正在重置密码为: ${newPassword}`);

  const { data, error } = await supabase.auth.admin.updateUserById(user.id, {
    password: newPassword,
    email_confirm: true
  });

  if (error) {
    console.error('❌ 重置密码失败:', error.message);
    process.exit(1);
  }

  console.log('✅ 密码重置成功!\n');

  // 4. 验证新密码
  console.log('🔍 验证新密码...');

  const testClient = createClient(supabaseUrl, process.env.VITE_SUPABASE_ANON_KEY);
  const { data: signInData, error: signInError } = await testClient.auth.signInWithPassword({
    email: email,
    password: newPassword
  });

  if (signInError) {
    console.error('❌ 验证失败，无法用新密码登录:', signInError.message);
    process.exit(1);
  }

  console.log('✅ 验证成功，新密码可用!\n');

  console.log('='.repeat(50));
  console.log('📋 重置完成');
  console.log('='.repeat(50));
  console.log(`📧 邮箱: ${email}`);
  console.log(`🔑 密码: ${newPassword}`);
  console.log(`🌐 登录地址: http://localhost:5173/login`);
  console.log('='.repeat(50));

  // 退出测试登录
  await testClient.auth.signOut();
}

resetPassword().catch(console.error);
