-- Correct unsafe uniqueness assumptions from 20260330_legacy_app_schema_compat.sql.
-- Date: 2026-03-31
--
-- Why this exists:
-- 1. `public.universities.name` is not globally unique in the live dataset because
--    legacy rows and Gaokao-synced rows can coexist before cleanup.
-- 2. `public.majors.code` is intentionally reused across universities, so a
--    global unique index on `code` is invalid for the current data model.
--
-- This migration keeps the lookup indexes we need, while replacing the invalid
-- unique constraints with safer indexes that match the real schema semantics.

drop index if exists public.idx_universities_name_unique;
create index if not exists idx_universities_name_lookup
  on public.universities(name);

create unique index if not exists idx_universities_code_unique
  on public.universities(code)
  where code is not null;

alter table public.majors add column if not exists sub_category text;
alter table public.majors add column if not exists subcategory text;
alter table public.majors add column if not exists updated_at timestamptz default now();
alter table public.admission_scores add column if not exists updated_at timestamptz default now();

update public.majors
set sub_category = subcategory
where sub_category is null
  and subcategory is not null;

update public.majors
set subcategory = sub_category
where subcategory is null
  and sub_category is not null;

update public.admission_scores
set updated_at = created_at
where updated_at is null
  and created_at is not null;

create or replace function public.sync_major_subcategory_columns()
returns trigger as $$
begin
  if new.subcategory is null then
    new.subcategory := new.sub_category;
  end if;

  if new.sub_category is null then
    new.sub_category := new.subcategory;
  end if;

  return new;
end;
$$ language plpgsql;

drop trigger if exists majors_sync_subcategory_columns on public.majors;
create trigger majors_sync_subcategory_columns
before insert or update on public.majors
for each row execute procedure public.sync_major_subcategory_columns();

drop index if exists public.idx_majors_code_unique;
create index if not exists idx_majors_code_lookup
  on public.majors(code)
  where code is not null;

create unique index if not exists idx_majors_university_code_unique
  on public.majors(university_id, code)
  where university_id is not null
    and code is not null;

create index if not exists idx_admission_scores_lookup
  on public.admission_scores(province, subject_type, year, min_score desc);

create index if not exists idx_admission_scores_university
  on public.admission_scores(university_id, year desc);

create index if not exists idx_plans_user_updated
  on public.plans(user_id, updated_at desc);

create index if not exists idx_plan_items_plan_sort
  on public.plan_items(plan_id, sort_order asc, created_at asc);

create index if not exists idx_favorites_user_created
  on public.favorites(user_id, created_at desc);

create index if not exists idx_data_sync_logs_created
  on public.data_sync_logs(created_at desc);

create index if not exists idx_data_sync_logs_task_status
  on public.data_sync_logs(task_type, status);
