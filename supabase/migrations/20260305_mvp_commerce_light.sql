-- MVP 商业化最小闭环（轻量版）
-- 目标：单套餐299，单通道支付，单权限 is_paid

create extension if not exists pgcrypto;

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  order_no text unique not null,
  amount_cents int not null,
  channel text not null default 'wechat',
  status text not null default 'pending', -- pending/paid/closed
  created_at timestamptz default now(),
  paid_at timestamptz
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  provider text not null default 'wechat',
  provider_trade_no text not null,
  status text not null default 'success',
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz default now(),
  unique(provider_trade_no)
);

create table if not exists public.user_access (
  user_id uuid primary key,
  is_paid boolean not null default false,
  expires_at timestamptz,
  updated_at timestamptz default now()
);

create index if not exists idx_orders_user on public.orders(user_id);
create index if not exists idx_orders_status on public.orders(status);

-- RLS
alter table public.orders enable row level security;
alter table public.payments enable row level security;
alter table public.user_access enable row level security;

-- orders: 用户仅看自己的订单
drop policy if exists "orders_select_own" on public.orders;
create policy "orders_select_own"
on public.orders for select
using (auth.uid() = user_id);

drop policy if exists "orders_insert_own" on public.orders;
create policy "orders_insert_own"
on public.orders for insert
with check (auth.uid() = user_id);

-- payments: 用户仅可查看自己的支付记录（通过订单关联）
drop policy if exists "payments_select_own" on public.payments;
create policy "payments_select_own"
on public.payments for select
using (
  exists (
    select 1 from public.orders o
    where o.id = payments.order_id
      and o.user_id = auth.uid()
  )
);

-- user_access: 用户仅查看自己的权限
drop policy if exists "user_access_select_own" on public.user_access;
create policy "user_access_select_own"
on public.user_access for select
using (auth.uid() = user_id);
