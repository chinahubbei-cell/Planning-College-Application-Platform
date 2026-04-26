# 套餐订阅验证指南

## 已修复的问题

### Pricing 页面问题
**问题**: Pricing 页面没有检查用户付费状态，无论是否订阅都显示"立即开通"

**已修复**:
- 添加了 `getMyAccess()` 调用来获取用户付费状态
- 根据状态显示不同内容：
  - ✅ 已订阅：显示订阅信息和有效期
  - ❌ 未订阅：显示"立即开通"按钮

## 测试步骤

### 1. 确保数据库有 user_access 记录

在 **Supabase Dashboard → SQL Editor** 中执行以下 SQL：

```sql
-- 为 test@gaokao.com 创建付费记录
insert into public.user_access (user_id, is_paid, expires_at)
values (
  (select id from auth.users where email = 'test@gaokao.com'),
  true,
  now() + interval '90 days'
)
on conflict (user_id) do update
set is_paid = true, expires_at = now() + interval '90 days';

-- 为 admin@gaokao.com 创建付费记录（可选）
insert into public.user_access (user_id, is_paid, expires_at)
values (
  (select id from auth.users where email = 'admin@gaokao.com'),
  true,
  now() + interval '90 days'
)
on conflict (user_id) do update
set is_paid = true, expires_at = now() + interval '90 days';
```

### 2. 验证逻辑

1. 登录 test@gaokao.com
2. 访问 http://localhost:5173/pricing
3. 应该显示：
   - ✅ **已订阅**
   - 有效期至: [90天后的日期]

### 3. 验证未订阅状态

如果想测试未订阅状态，执行：

```sql
-- 取消订阅状态
update public.user_access
set is_paid = false
where user_id = (select id from auth.users where email = 'test@gaokao.com');
```

刷新页面后应该显示：
- 立即开通（299 元）按钮

### 4. 恢复订阅状态

```sql
-- 恢复订阅
update public.user_access
set is_paid = true, expires_at = now() + interval '90 days'
where user_id = (select id from auth.users where email = 'test@gaokao.com');
```

## 预期结果

| 状态 | 显示内容 |
|------|---------|
| 加载中 | 正在检查订阅状态... |
| 已订阅 | ✅ 已订阅 + 有效期 |
| 未订阅 | 立即开通（299 元）按钮 |

## 故障排查

### 如果页面仍然显示"立即订阅"

1. **检查浏览器控制台** (F12 → Console)
   - 查看是否有错误信息

2. **检查 Network 请求** (F12 → Network)
   - 找到对 `/rest/v1/user_access` 的请求
   - 查看响应数据

3. **刷新页面**
   - 按 Ctrl+Shift+R (或 Cmd+Shift+R) 硬性刷新

4. **检查数据库记录**
   ```sql
   select * from public.user_access;
   ```

5. **如果直接报 `Failed to fetch` 或请求卡住**
   - 优先检查当前网络到 Supabase 是否可达
   - 检查代理/VPN/DNS 是否拦截 `*.supabase.co`
   - 换网络后再验证订阅逻辑

### 常见错误

**错误**: `relation "user_access" does not exist`
**解决**: 运行 migration `20260305_mvp_commerce_light.sql`

**错误**: `JWT` 或 `RLS` 相关错误
**解决**: 检查 user_access 表的 RLS 策略是否正确设置

**错误**: `Unauthorized` / `请先登录后再开通套餐`
**解决**: 先确认当前会话仍有效，再触发下单

**错误**: `订阅功能尚未初始化`
**解决**: 执行 `20260305_mvp_commerce_light.sql` migration 后刷新页面
