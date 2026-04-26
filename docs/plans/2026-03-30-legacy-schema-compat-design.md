# 旧版应用 Schema 兼容层设计

日期: 2026-03-30

## 背景

当前仓库里的前端页面、收藏/方案服务、管理员同步任务，仍然直接依赖旧对象:

- `universities`
- `majors`
- `admission_scores`
- `plans`
- `plan_items`
- `favorites`
- `data_sync_logs`
- `get_university_stats`
- `get_score_stats`
- `get_major_stats`
- `get_distinct_major_categories`

但现有 migration 主要定义的是 V2 国标数据表，例如 `university_master`、`major_master`、`admission_records`。这会造成两个实际问题:

1. 新环境初始化后，前端能连上 Supabase，但依赖的旧表和 RPC 不存在，页面直接报 relation/function 不存在。
2. `sync-data` Edge Function 不只是读取旧表，还会直接向 `universities`、`majors`、`admission_scores`、`data_sync_logs` 写入数据，因此单纯补只读 view 不够。

## 目标

补一层“最小可写兼容 schema”，让当前应用和同步任务在新环境中能完整跑通，同时不改动现有前端接口语义。

## 方案对比

### 方案 A：只补兼容 view

优点:

- 对 V2 表侵入最小

缺点:

- `sync-data` 直接 `upsert` 旧表，view 无法满足写入需求
- 方案、收藏、同步日志本身就是业务表，不适合映射成 view

### 方案 B：补最小旧兼容表 + RLS + RPC

优点:

- 同时满足前端读取和 Edge Function 写入
- 可以在不重写前端的前提下恢复当前产品链路
- 对部署环境最友好，新项目执行 migration 后即可初始化

缺点:

- 会同时存在 V2 表和旧兼容表，后续仍需要统一收敛

### 结论

采用方案 B。本轮先恢复运行稳定性，后续再考虑把前端服务逐步迁移到 V2 schema。

## 设计范围

### 兼容表

- `public.universities`
- `public.majors`
- `public.admission_scores`
- `public.plans`
- `public.plan_items`
- `public.favorites`
- `public.data_sync_logs`

### 兼容 RPC

- `public.get_university_stats()`
- `public.get_score_stats(p_province text)`
- `public.get_major_stats()`
- `public.get_distinct_major_categories()`

## 关键设计

### 为什么旧对象要用真实表而不是 view

- `sync-data/tasks/universities.ts` 会向 `universities` 批量 `upsert`
- `sync-data/tasks/majors.ts` 会向 `majors` 批量 `upsert`
- `sync-data/tasks/scores.ts` 会向 `admission_scores` 批量 `upsert`
- `sync-data/index.ts` 会向 `data_sync_logs` 插入和更新执行日志

这些路径都要求兼容对象必须可写。

### 权限策略

- `universities`、`majors`、`admission_scores`：公开只读，匿名和登录用户都可查询
- `plans`、`plan_items`、`favorites`：仅用户本人可读写
- `data_sync_logs`：仅管理员可读，写入继续交给 service role 的 Edge Function

### 专业子分类兼容

仓库里同时出现了 `subcategory` 和 `sub_category` 两种字段名:

- 管理端同步任务写 `sub_category`
- 专业详情页读取 `subcategory`

因此兼容表需要同时保留这两个字段，并在数据库层同步它们，避免前端和同步脚本各写各的。

## 验收标准

- 新环境执行 migration 后，不再因为缺少旧表或 RPC 直接报 `relation does not exist`
- `universities` / `majors` / `admission_scores` 可被前端正常查询
- `plans` / `plan_items` / `favorites` 具备最小业务读写能力
- `data_sync_logs` 可被管理员页面读取，并可被同步函数写入
- analytics 页面依赖的 3 个 RPC 与专业分类 RPC 可正常调用

## 已知限制

- 本轮没有把旧兼容表与 V2 国标表做双向同步
- AI 助手对应的 `ai-chat` Edge Function 仍不在仓库内，不属于本设计解决范围
- 如果网络到 Supabase 项目子域名仍然不通，应用依然无法访问后端；本方案只解决 schema 缺口
