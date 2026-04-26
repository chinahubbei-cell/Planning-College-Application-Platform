# 创建未订阅测试账户指南

## 方案 1：在 Supabase Dashboard 创建（推荐）

### 步骤：

1. **访问 Supabase Dashboard**
   - 登录 https://supabase.com/dashboard
   - 选择你的项目

2. **创建新用户**
   - 左侧菜单 → **Authentication** → **Users**
   - 点击右上角 **"Add user"** → **"Create new user"**
   - 填写信息：
     - **Email**: `free@gaokao.com` (或其他未使用的邮箱)
     - **Password**: `Free@2026`
     - ✅ **Auto Confirm User** (勾选)
   - 点击 **"Create user"**

3. **创建 user_profiles 记录**（可选，但建议）
   - 进入 **SQL Editor**
   - 执行以下 SQL：
   ```sql
   insert into public.user_profiles (id, name, role)
   values (
     (select id from auth.users where email = 'free@gaokao.com'),
     '免费用户',
     'user'
   );
   ```

4. **不创建 user_access 记录**
   - 用户将自动处于未订阅状态
   - 访问 `/pricing` 会显示"立即开通"按钮

---

## 方案 2：使用本地脚本创建/重置密码

1. **配置 Service Role Key**
   ```bash
   # 在 .env 中添加
   SUPABASE_SERVICE_ROLE_KEY=你的密钥
   ```

2. **重置或设置新用户密码**
   ```bash
   node scripts/reset-password.js free@gaokao.com Free@2026
   ```

3. **在 SQL Editor 中配置**
   ```sql
   -- 创建 user_profiles（如果需要）
   insert into public.user_profiles (id, name, role)
   values (
     (select id from auth.users where email = 'free@gaokao.com'),
     '免费用户',
     'user'
   );

   -- 不创建 user_access，保持未订阅状态
   ```

---

## 测试账户总结

| 邮箱 | 密码 | 订阅状态 | 用途 |
|------|------|----------|------|
| admin@gaokao.com | Admin@2026 | 已付费 | 管理员，测试付费功能 |
| test@gaokao.com | Test@2026 | 已付费 | 普通用户，测试付费功能 |
| free@gaokao.com | Free@2026 | **未订阅** | 测试未订阅状态显示 |

---

## 验证未订阅状态

创建后：

1. **登录新账户**
   - 访问 http://localhost:5173/login
   - 使用 `free@gaokao.com` / `Free@2026` 登录

2. **访问套餐订阅页面**
   - 访问 http://localhost:5173/pricing
   - 应该显示：
     - ❌ "立即开通（299 元）" 按钮
     - 不显示"已订阅"绿色提示

3. **测试订阅流程**
   - 点击"立即开通"按钮
   - 查看是否成功创建订单

---

## 浏览器控制台验证

登录 `free@gaokao.com` 后，在控制台运行：

```javascript
// 检查用户状态
const { data: { user } } = await supabase.auth.getUser();
console.log('用户 ID:', user.id);

// 检查 user_access（应该为 null）
const { data: access } = await supabase
  .from('user_access')
  .select('*')
  .eq('user_id', user.id)
  .maybeSingle();
console.log('user_access:', access); // 应该是 null

// 检查 getMyAccess 返回值
const { data: accessData } = await supabase
  .from('user_access')
  .select('is_paid, expires_at')
  .eq('user_id', user.id)
  .maybeSingle();
console.log('is_paid:', accessData?.is_paid || false); // 应该是 false 或 undefined
```

---

## 快速创建 SQL

在 **Supabase Dashboard → SQL Editor** 中一次性执行：

```sql
-- 1. 创建新用户（需要通过 Dashboard 界面创建，SQL 无法直接创建 auth.users）

-- 2. 创建 user_profiles
insert into public.user_profiles (id, name, role)
values (
  (select id from auth.users where email = 'free@gaokao.com'),
  '免费用户',
  'user'
)
on conflict (id) do nothing;

-- 3. 不创建 user_access，保持未订阅状态
-- 或者创建 is_paid = false 的记录
-- insert into public.user_access (user_id, is_paid)
-- values (
--   (select id from auth.users where email = 'free@gaokao.com'),
--   false
-- );

-- 4. 验证
select
  u.email,
  u.id as user_id,
  up.name,
  up.role,
  ua.is_paid,
  ua.expires_at
from auth.users u
left join public.user_profiles up on up.id = u.id
left join public.user_access ua on ua.user_id = u.id
where u.email = 'free@gaokao.com';
```

---

## 切换订阅状态（测试用）

### 设置为已订阅：
```sql
insert into public.user_access (user_id, is_paid, expires_at)
values (
  (select id from auth.users where email = 'free@gaokao.com'),
  true,
  now() + interval '90 days'
)
on conflict (user_id) do update
set is_paid = true, expires_at = now() + interval '90 days';
```

### 设置为未订阅：
```sql
update public.user_access
set is_paid = false
where user_id = (select id from auth.users where email = 'free@gaokao.com');

-- 或删除记录
delete from public.user_access
where user_id = (select id from auth.users where email = 'free@gaokao.com');
```
