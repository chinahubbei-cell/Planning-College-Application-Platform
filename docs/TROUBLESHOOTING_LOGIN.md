# 登录问题排查指南

## admin@gaokao.com 无法登录的修复步骤

### 问题诊断

1. **缺失 user_profiles 表** - 导致用户资料相关功能报错
2. **管理员账户不存在** - Supabase Auth 中没有该账户
3. **网络无法连通 Supabase** - 浏览器或脚本直接报 `Failed to fetch`

### 修复步骤

#### 步骤 1: 运行数据库 Migration

```bash
# 在项目根目录执行
cd "/Users/tianxingjian/Aisoftware/Planning College Application Platform"

# 如果使用 Supabase CLI
supabase db push

# 或者手动在 Supabase Dashboard 的 SQL Editor 中执行:
# 打开 supabase/migrations/20260305_create_user_profiles.sql
# 复制全部内容到 SQL Editor 执行
```

#### 步骤 2: 创建管理员账户

**方法 A: 使用脚本创建 (推荐)**

首先确保已安装 dotenv 包:
```bash
npm install dotenv
```

然后运行创建脚本:
```bash
node scripts/create-admin-user.js
```

**方法 B: 手动在 Supabase Dashboard 创建**

1. 登录 [Supabase Dashboard](https://supabase.com/dashboard)
2. 选择你的项目
3. 进入 Authentication → Users
4. 点击 "Add user" → "Create new user"
5. 填写信息:
   - Email: `admin@gaokao.com`
   - Password: (设置强密码)
   - Auto Confirm User: ✅
6. 创建后，进入 SQL Editor
7. 执行以下 SQL 设置管理员角色:
```sql
update public.user_profiles
set role = 'admin'
where id = (select id from auth.users where email = 'admin@gaokao.com');
```

#### 步骤 3: 验证修复

1. 启动开发服务器:
```bash
npm run dev
```

2. 访问登录页面: http://localhost:5173/login

3. 使用以下凭据登录:
- Email: `admin@gaokao.com`
- Password: (你设置的密码)

### 常见错误及解决方案

#### 错误 1: "Invalid login credentials"
**原因**: 用户不存在或密码错误
**解决**:
- 检查 Supabase Dashboard → Authentication → Users 中是否存在该用户
- 重新设置密码

#### 错误 2: "profile not found" 或 "relation user_profiles does not exist"
**原因**: user_profiles 表未创建
**解决**:
- 运行步骤 1 的 migration
- 确认额外执行 `20260330_user_profiles_insert_policy.sql`，保证缺失 profile 的用户可以补建资料

#### 错误 3: CORS 或网络错误
**原因**: Supabase 配置问题
**解决**:
- 检查 `.env` 文件中的 `VITE_SUPABASE_URL` 是否正确
- 确认 `VITE_SUPABASE_ANON_KEY` 有效
- 如果浏览器直接显示 `Failed to fetch`，优先检查代理/VPN/DNS 或换网络
- 确认 Supabase 项目本身仍可访问

### 其他登录问题

如果以上步骤无法解决问题，请检查:

1. **浏览器控制台错误** (F12 → Console)
2. **Network 请求** (F12 → Network) 查看 API 请求状态
3. **Supabase Dashboard Logs** 查看服务端日志
4. **直接访问健康检查**
   - 打开 `https://<你的项目>.supabase.co/auth/v1/health`
   - 如果这里都打不开，优先排查网络而不是账号密码
