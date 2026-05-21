/**
 * 一次性密码重定脚本 - 通过 Supabase Management API
 *
 * 使用方法：
 * 1. 从 Supabase Dashboard 获取 Service Role Key
 * 2. 写入 .env 中的 SUPABASE_SERVICE_ROLE_KEY
 * 3. 运行 node scripts/reset-password.js <email> <new-password>
 *
 * 或者：使用 Supabase Dashboard 手动重置（最简单）
 */

import { createClient } from '@supabase/supabase-js';

// 获取命令行参数
const args = process.argv.slice(2);
const email = args[0];
const newPassword = args[1];

console.log('='.repeat(60));
console.log('🔧 密码重置工具');
console.log('='.repeat(60));
console.log('');
console.log('⚠️  这个脚本需要 SUPABASE_SERVICE_ROLE_KEY');
console.log('💡 最简单的方法：在 Supabase Dashboard 手动重置');
console.log('');
console.log('步骤：');
console.log('1. 访问 https://supabase.com/dashboard');
console.log('2. 选择项目 → Authentication → Users');
console.log('3. 找到用户 → 点击邮箱 → Reset Password');
console.log('4. 设置新密码');
console.log('5. 保存后登录 http://localhost:5173/login');
console.log('');
console.log('='.repeat(60));
console.log('');

if (email && newPassword) {
  console.log(`📋 要重置的用户: ${email}`);
  console.log(`🔑 新密码: ${newPassword}`);
  console.log('');
  console.log('请在 Supabase Dashboard 中按上述步骤手动重置。');
} else {
  console.log('💡 请使用具体密码运行: node scripts/reset-password.js <email> <new-password>');
  console.log('   例如: node scripts/reset-password.js test@gaokao.com YourSecurePassword');
}
