-- 生日精確到日（選填、向後相容）。
-- 既有 birth_year_month 保留不動；當 birth_date 有值時，App 以它算精確年齡，
-- 否則退回 birth_year_month。child_profiles 既有 RLS 涵蓋此新欄位，無需新增政策。
alter table public.child_profiles
  add column if not exists birth_date date;

comment on column public.child_profiles.birth_date is
  '孩子完整出生日期（選填）。有值時優先用於精確年齡；無值則退回 birth_year_month。';
