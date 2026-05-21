/**
 * 检查并修复 test@gaokao.com 用户
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY;

console.log('🔍 检查 test@gaokao.com 用户状态...\n');

// 1. 使用提供的环境变量或默认凭据（仅用于测试/开发）
const adminEmail = process.env.TEST_ADMIN_EMAIL || 'admin@gaokao.com';
const adminPassword = process.env.TEST_ADMIN_PASSWORD;
const testEmail = process.env.TEST_USER_EMAIL || 'test@gaokao.com';
const testPassword = process.env.TEST_USER_PASSWORD;

if (!adminPassword || !testPassword) {
  console.error('❌ 请通过环境变量设置凭据:');
  console.error('   export TEST_ADMIN_PASSWORD=<admin-password>');
  console.error('   export TEST_USER_PASSWORD=<test-password>');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, anonKey);

async function fixTestUser() {
  // 用 admin 登录获取 session
  const { data: adminData, error: adminError } = await supabase.auth.signInWithPassword({
    email: adminEmail,
    password: adminPassword
  });

  if (adminError) {
    console.error('❌ 管理员登录失败，请先确保管理员账号正常');
    console.error('错误:', adminError.message);
    return;
  }

  console.log('✅ 管理员登录成功');

  // 2. 检查 test 用户是否存在（通过尝试登录）
  console.log(`\n2️⃣ 检查 ${testEmail} 用户...`);

  const { data: testData, error: testError } = await supabase.auth.signInWithPassword({
    email: testEmail,
    password: testPassword
  });

  if (testError) {
    if (testError.message === 'Invalid login credentials') {
      console.log(`   ⚠️  ${testEmail} 不存在或密码错误`);
      console.log('\n💡 正在创建 test@gaokao.com 用户...');

      // 使用 service role 来创建用户（需要用户在 Web 工具中操作）
      console.log('\n❌ 无法通过脚本创建用户（需要 Service Role Key）');
      console.log('\n📋 请按以下步骤手动创建：');
      console.log('='.repeat(60));
      console.log('1. 访问 https://supabase.com/dashboard');
      console.log('2. 选择项目 → Authentication → Users');
      console.log('3. 点击 "Add user" → "Create new user"');
      console.log('4. 填写信息：');
      console.log('   - Email: test@gaokao.com');
      console.log('   - Password: 设置你的安全密码');
      console.log('   - ✅ Auto Confirm User');
      console.log('5. 点击 "Create user"');
      console.log('='.repeat(60));
      console.log('\n或者使用本地脚本重置密码：');
      console.log('1. 在 .env 中配置 SUPABASE_SERVICE_ROLE_KEY');
      console.log('2. 运行: node scripts/reset-password.js test@gaokao.com <new-password>');
      console.log('3. 再访问 http://localhost:5173/login 验证');
    } else {
      console.error('   ❌ 错误:', testError.message);
    }
  } else {
    console.log('   ✅ test@gaokao.com 用户存在');
    console.log('   User ID:', testData.user.id);
    console.log('   Email confirmed:', testData.user.email_confirmed_at ? '是' : '否');

    // 退出 test 登录
    await supabase.auth.signOut();

    console.log('\n✅ test@gaokao.com 可以正常登录！');
    console.log('\n📋 登录信息：');
    console.log('   URL: http://localhost:5173/login');
    console.log('   Email: test@gaokao.com');
    console.log('   Password: (已通过环境变量设置)');
  }

  // 退出 admin 登录
  await supabase.auth.signOut();
}

fixTestUser().catch(console.error);
