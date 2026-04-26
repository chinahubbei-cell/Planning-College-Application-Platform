-- Allow users to create their own profile row as a fallback path
-- Date: 2026-03-30

alter table public.user_profiles enable row level security;

drop policy if exists "user_profiles_insert_own" on public.user_profiles;
create policy "user_profiles_insert_own"
on public.user_profiles for insert
with check (auth.uid() = id);
