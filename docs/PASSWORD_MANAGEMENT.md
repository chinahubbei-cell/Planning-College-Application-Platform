# 密码管理文档

## 测试账号凭据（请妥善保存）

| 邮箱 | 密码 | 角色 | 说明 |
|------|------|------|------|
| admin@gaokao.com | **Admin@2026** | 管理员 | 系统管理员 |
| test@gaokao.com | **Test@2026** | 测试用户 | 普通用户 |

---

## 常见登录问题及原因

### ❌ 问题 1: "账号密码错误"

**原因：**
- 密码输入错误（大小写、特殊字符）
- Supabase Auth 中的密码与文档不符
- 用户未创建或已被删除

**解决：**
1. 在 Supabase Dashboard → Authentication → Users → Reset Password
2. 或使用本地脚本 `node scripts/reset-password.js <email> <new-password>`

---

### ❌ 问题 2: 清除浏览器数据后无法登录

**根本原因分析：**

清除浏览器数据会删除：
- ❌ LocalStorage 中的 session token
- ❌ Cookies 中的认证信息

但**不应该影响**：
- ✅ Supabase Auth 中的用户凭据
- ✅ 用户的密码

**如果清除后无法登录，说明：**
1. 之前使用的是"记住的登录状态"而非真实密码
2. Supabase Auth 中的密码与记忆中的不符
3. 用户可能根本没有在 Supabase Auth 中创建

---

## 永久解决方案

### 方案 1: 保存正确的凭据

**步骤：**
1. 使用 Supabase Dashboard 或本地脚本重置密码
2. 将密码保存在密码管理器（如 1Password、Bitwarden）
3. 在项目 README 中明确记录测试账号

### 方案 2: 创建用户管理页面

为管理员添加一个用户管理界面，可以：
- 查看所有用户
- 重置用户密码
- 查看用户状态

### 方案 3: 环境变量存储默认密码

在 `.env` 中明确记录：
```env
# 测试账号密码（请勿在生产环境使用）
ADMIN_EMAIL=admin@gaokao.com
ADMIN_PASSWORD=Admin@2026
TEST_EMAIL=test@gaokao.com
TEST_PASSWORD=Test@2026
```

---

## 密码重置方法汇总

### 方法 1: Supabase Dashboard
```
Dashboard → Authentication → Users → 选择用户 → Reset Password
```

### 方法 2: 使用脚本
```bash
node scripts/reset-password.js test@gaokao.com Test@2026
```

---

## 最佳实践

### ✅ DO - 应该做的
1. **首次设置**: 使用 Dashboard 或本地脚本设置明确的密码
2. **记录凭据**: 在项目文档中明确记录测试账号
3. **使用密码管理器**: 保存测试账号密码
4. **定期验证**: 每次部署后验证测试账号可登录

### ❌ DON'T - 不要做
1. ❌ 不要依赖浏览器"记住密码"
2. ❌ 不要在不同环境使用不同密码
3. ❌ 不要在代码中硬编码密码
4. ❌ 不要随意更改测试账号密码

---

## 紧急恢复流程

如果所有账号都无法登录：

1. **检查 Supabase 项目是否正确**
   - 确认 `.env` 中的 `VITE_SUPABASE_URL` 是否正确
   - 确认 `VITE_SUPABASE_ANON_KEY` 是否有效

2. **检查用户是否存在**
   ```sql
   -- 在 Supabase SQL Editor 中执行
   select id, email, email_confirmed_at, created_at
   from auth.users
   where email in ('admin@gaokao.com', 'test@gaokao.com');
   ```

3. **如果用户不存在，重新创建**
   - Dashboard → Authentication → Users → Add user
   - 设置邮箱和密码
   - ✅ Auto Confirm User

4. **重置密码**
   - 使用 `node scripts/reset-password.js` 或 Dashboard 手动重置

5. **如果浏览器直接报 `Failed to fetch`**
   - 优先检查当前网络是否能连通 Supabase
   - 检查代理/VPN/DNS 是否拦截了 `*.supabase.co`
   - 先换手机热点或关闭代理再试

---

## 安全说明

- 公开密码重置接口不再是推荐方案，默认应视为受限运维接口。
- 日常密码管理请统一走 **Supabase Dashboard** 或本地脚本，不再依赖公开 Web 工具。

---

## 更新日志

- 2026-03-05: 创建密码管理文档
- 2026-03-05: 创建密码重置工具
