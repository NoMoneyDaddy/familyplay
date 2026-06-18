-- 帳號刪除級聯補洞：handoff_summaries.child_id 原為 NO ACTION。
--
-- 刪除帳號的級聯鏈：auth.users → user_profiles(CASCADE) → households(CASCADE)
--   → child_profiles(CASCADE) → 其子表。child_profiles 的子表中，
--   child_capability_profiles 與 companion_logs 皆已 CASCADE，唯獨
--   handoff_summaries.child_id 是 NO ACTION——雖然同一個 household 的 handoff
--   通常也會被 households CASCADE 一併刪掉而僥倖通過，但這依賴級聯順序、不穩健。
--   明確改為 CASCADE，讓「刪孩子→刪交接摘要」的意圖不再隱含於刪 household 的副作用。
--
-- 其餘指向 user_profiles / households 的 FK 經查皆已是 CASCADE（或 used_by 的 SET NULL），
-- 不需更動。

ALTER TABLE public.handoff_summaries
  DROP CONSTRAINT handoff_summaries_child_id_fkey,
  ADD CONSTRAINT handoff_summaries_child_id_fkey
    FOREIGN KEY (child_id) REFERENCES public.child_profiles(id) ON DELETE CASCADE;
