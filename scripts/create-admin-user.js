/**
 * 创建管理员账户脚本
 * 使用方法: node scripts/create-admin-user.js
 *
 * 前提条件:
 * 1. 确保已运行数据库 migrations 创建 user_profiles 表
 * 2. 确保已设置 .env 中的 Supabase 配置
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// 加载 .env
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  console.error('❌ 错误: 未找到 VITE_SUPABASE_URL 环境变量');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createAdminUser() {
  const adminEmail = 'admin@gaokao.com';
  const adminPassword = 'Admin@2026'; // 请在生产环境中修改此密码

  console.log('🔧 开始创建管理员账户...');

  try {
    // 1. 检查用户是否已存在
    const { data: existingUser, error: checkError } = await supabase.auth.admin.listUsers();

    if (checkError) {
      console.error('❌ 检查用户失败:', checkError.message);
      process.exit(1);
    }

    const existing = existingUser.users.find(u => u.email === adminEmail);

    if (existing) {
      console.log('⚠️  管理员账户已存在:', adminEmail);

      // 更新为管理员角色
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({ role: 'admin' })
        .eq('id', existing.id);

      if (updateError) {
        console.error('❌ 更新管理员角色失败:', updateError.message);
      } else {
        console.log('✅ 已更新为管理员角色');
      }

      console.log('\n登录信息:');
      console.log('📧 邮箱:', adminEmail);
      console.log('🔑 密码: (请使用已设置的密码)');
      return;
    }

    // 2. 创建新用户
    const { data, error } = await supabase.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
      user_metadata: {
        name: '管理员'
      }
    });

    if (error) {
      console.error('❌ 创建用户失败:', error.message);
      process.exit(1);
    }

    console.log('✅ 用户创建成功:', data.user.id);

    // 3. 更新为管理员角色
    const { error: roleError } = await supabase
      .from('user_profiles')
      .update({ role: 'admin' })
      .eq('id', data.user.id);

    if (roleError) {
      console.error('❌ 设置管理员角色失败:', roleError.message);
      console.log('⚠️  请手动设置用户 role 为 admin');
    } else {
      console.log('✅ 已设置为管理员角色');
    }

    console.log('\n🎉 管理员账户创建完成!');
    console.log('\n登录信息:');
    console.log('📧 邮箱:', adminEmail);
    console.log('🔑 密码:', adminPassword);
    console.log('\n⚠️  请在生产环境中立即修改此密码!');

  } catch (err) {
    console.error('❌ 发生错误:', err.message);
    process.exit(1);
  }
}

createAdminUser();
