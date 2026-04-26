# 志愿填报平台

基于 React + Vite + Supabase 的高考志愿填报智能推荐系统。

## 快速开始

### 安装依赖
```bash
npm install
```

### 启动开发服务器
```bash
npm run dev
```

访问 http://localhost:5173

### 构建生产版本
```bash
npm run build
```

## 测试账号

| 邮箱 | 密码 | 角色 |
|------|------|------|
| admin@gaokao.com | Admin@2026 | 管理员 |
| test@gaokao.com | Test@2026 | 普通用户 |

> ⚠️ **重要**: 如果无法登录，请优先使用 **Supabase Dashboard** 或 `node scripts/reset-password.js` 重置密码
> 
> 现在推荐优先使用 **Supabase Dashboard** 或 `node scripts/reset-password.js`，不要依赖公开密码重置接口。

## 功能特性

- 🎯 智能志愿推荐
- 📊 历年数据分析
- 📋 志愿方案管理
- 💳 套餐订阅系统
- 🤖 AI 智能助手

## 技术栈

- **前端**: React 19, Vite, React Router
- **后端**: Supabase (Auth + Database + Edge Functions)
- **状态管理**: Zustand
- **图表**: ECharts
- **样式**: CSS

## 项目结构

```
src/
├── components/     # 可复用组件
├── pages/          # 页面组件
├── services/       # API 服务
├── stores/         # 状态管理
├── hooks/          # 自定义 Hooks
└── utils/          # 工具函数
```

## 密码管理

### 重置密码方法

**方法 1: Supabase Dashboard（推荐）**
1. 访问 https://supabase.com/dashboard
2. Authentication → Users → 选择用户 → Reset Password

**方法 2: 使用脚本**
```bash
node scripts/reset-password.js admin@gaokao.com Admin@2026
```

### 常见问题

详见 `docs/PASSWORD_MANAGEMENT.md` 和 `docs/RESET_PASSWORD.md`

## 数据库

### 初始化

在 Supabase Dashboard → SQL Editor 中执行 migrations:

1. `supabase/migrations/20260305_create_user_profiles.sql`
2. `supabase/migrations/20260330_user_profiles_insert_policy.sql`
3. `supabase/migrations/20260305_mvp_commerce_light.sql`
4. `supabase/migrations/20260302_national_data_expansion.sql`
5. `supabase/migrations/20260330_legacy_app_schema_compat.sql`
6. `supabase/migrations/20260331_fix_legacy_compat_indexes.sql`

### 数据表

- `auth.users` - 用户认证
- `public.user_profiles` - 用户资料
- `public.user_access` - 付费权限
- `public.orders` - 订单记录
- `public.universities` - 当前前端使用的院校表（兼容层）
- `public.majors` - 当前前端使用的专业表（兼容层）
- `public.admission_scores` - 当前前端使用的分数线表（兼容层）
- `public.plans` / `public.plan_items` - 志愿方案
- `public.favorites` - 收藏
- `public.data_sync_logs` - 管理员同步日志
- `public.university_master` - 高校信息
- `public.major_master` - 专业信息
- `public.admission_records` - 录取记录

> 如果院校、专业、方案、收藏或管理员同步页面提示 `relation does not exist` / `function does not exist`，
> 说明当前数据库只执行了 V2 数据迁移，还没有执行 `20260330_legacy_app_schema_compat.sql`。
>
> 如果管理员同步里出现 `ON CONFLICT` 相关错误，或 `majors.sub_category` 缺失，
> 说明还需要继续执行 `20260331_fix_legacy_compat_indexes.sql`，把兼容层索引与字段修正到当前真实数据模型。

## 开发

### 可用脚本

```bash
npm run dev          # 启动开发服务器
npm run build        # 构建生产版本
npm run preview      # 预览生产构建
npm run lint         # 代码检查
npm run create-admin # 创建管理员账号
```

## 故障排查

### 登录问题
- 查看 `docs/RESET_PASSWORD.md`
- 使用 Supabase Dashboard 或 `node scripts/reset-password.js` 重置密码

### 套餐订阅问题
- 查看 `docs/TROUBLESHOOTING_SUBSCRIPTION.md`

### 其他问题
- 检查浏览器控制台 (F12)
- 检查 Supabase Dashboard 日志
- 如果浏览器报 `Failed to fetch`、Network 中请求一直 `pending` 或直接失败，通常是当前网络无法连通 Supabase，请先检查代理/VPN/DNS 或换网络重试

## License

MIT
