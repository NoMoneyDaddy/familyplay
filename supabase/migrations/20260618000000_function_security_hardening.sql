-- FamilyPlay — Function security hardening
-- Pin search_path on SECURITY DEFINER helpers to prevent search_path injection.
-- The initial migration omitted SET search_path on auth_profile_id() and
-- my_household_ids(); this migration recreates them with the fix.

CREATE OR REPLACE FUNCTION auth_profile_id()
RETURNS UUID AS $$
  SELECT id FROM public.user_profiles WHERE auth_user_id = auth.uid()
$$ LANGUAGE SQL SECURITY DEFINER STABLE SET search_path = public;

CREATE OR REPLACE FUNCTION my_household_ids()
RETURNS SETOF UUID AS $$
  SELECT household_id
  FROM public.household_members
  WHERE user_profile_id = auth_profile_id()
$$ LANGUAGE SQL SECURITY DEFINER STABLE SET search_path = public;

-- Also pin update_updated_at() (called by triggers on every UPDATE)
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER SET search_path = public;
