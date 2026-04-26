# 密码重置指南

## 问题：账号密码错误

如果清除浏览器数据后无法登录，有以下几种解决方案：

---

## 方案 1：在 Supabase Dashboard 手动重置（推荐）

### 步骤：

1. **登录 Supabase Dashboard**
   - 访问 https://supabase.com/dashboard
   - 选择你的项目

2. **进入用户管理**
   - 左侧菜单 → **Authentication**
   - 点击 **Users**

3. **重置密码**
   - 找到用户（如 `test@gaokao.com` 或 `admin@gaokao.com`）
   - 点击用户邮箱进入详情页
   - 点击 **Reset Password** 按钮
   - 输入新密码（如 `Test@2026`）
   - 保存

4. **用新密码登录**
   - 访问 http://localhost:5173/login
   - 使用新密码登录

---

## 方案 2：使用重置脚本（推荐给开发/运维）

### 前置条件：获取 Service Role Key

1. Supabase Dashboard → **Project Settings** → **API**
2. 复制 **service_role (secret)** 密钥
3. 添加到项目的 `.env` 文件：
   ```
   SUPABASE_SERVICE_ROLE_KEY=你的密钥
   ```

### 运行重置脚本：

```bash
# 重置 test@gaokao.com 密码为 Test@2026
node scripts/reset-password.js test@gaokao.com Test@2026

# 重置 admin@gaokao.com 密码为 Admin@2026
node scripts/reset-password.js admin@gaokao.com Admin@2026
```

---

## 方案 3：使用 SQL 重置（高级用户）

在 **Supabase Dashboard → SQL Editor** 中执行：

```sql
-- 注意: Supabase Auth 密码需要通过 Admin API 修改
-- SQL 无法直接修改 auth.users 的密码
-- 请使用方案 1 或方案 2
```

---

## 推荐的测试账号密码

| 邮箱 | 密码 | 说明 |
|------|------|------|
| admin@gaokao.com | Admin@2026 | 管理员账号 |
| test@gaokao.com | Test@2026 | 测试账号 |

---

## 常见问题

### Q: 为什么清除浏览器数据后无法登录？
A: 清除浏览器数据会删除本地存储的 session，但不会影响 Supabase Auth 中的用户凭据。如果无法登录，说明：
- 输入的密码不正确
- 或者在 Supabase 中没有这个用户
- 或者当前网络到 Supabase 不通，请求在浏览器里直接 `Failed to fetch`

### Q: 如何确认用户是否存在？
A: 在 Supabase Dashboard → Authentication → Users 中查看用户列表

### Q: 如何创建新用户？
A:
1. Supabase Dashboard → Authentication → Users
2. 点击 **Add user** → **Create new user**
3. 输入邮箱和密码
4. 勾选 **Auto Confirm User**
5. 点击 **Create user**

---

## 快速检查清单

- [ ] 确认用户在 Supabase Auth 中存在
- [ ] 确认输入的密码正确
- [ ] 尝试在 Supabase Dashboard 重置密码
- [ ] 使用新密码重新登录
- [ ] 检查浏览器控制台是否有错误（F12 → Console）
- [ ] 如果请求直接 `Failed to fetch`，先检查代理/VPN/DNS，或换网络重试

---

## 安全说明

- `admin-reset-password` Edge Function 现已视为受限运维接口，不再作为公开密码重置方案。
- 日常密码重置请优先使用 **Supabase Dashboard** 或本地 `node scripts/reset-password.js`。
