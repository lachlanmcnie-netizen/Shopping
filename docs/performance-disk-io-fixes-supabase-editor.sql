-- Supabase SQL Editor-safe version of the Disk IO performance fixes.
--
-- Use this file if the SQL Editor reports:
-- "CREATE INDEX CONCURRENTLY cannot run inside a transaction block".
--
-- This version omits `concurrently`, so Supabase can run it as one script.
-- Index creation may briefly block writes to the indexed tables while each
-- index is built. For this small household app, that is usually an acceptable
-- tradeoff when the database is already under Disk IO pressure.

create index if not exists shopping_items_household_active_created_idx
on public.shopping_items (household_id, is_purchased, created_at desc);

create index if not exists shopping_items_household_purchased_at_idx
on public.shopping_items (household_id, purchased_at desc)
where is_purchased = true;

create index if not exists shopping_notifications_household_created_idx
on public.shopping_notifications (household_id, created_at desc);

create index if not exists shopping_household_members_user_created_idx
on public.shopping_household_members (user_id, created_at desc);

create index if not exists shopping_household_members_household_user_idx
on public.shopping_household_members (household_id, user_id);

create index if not exists shopping_households_invite_code_idx
on public.shopping_households (invite_code);

create index if not exists shopping_temp_lists_household_created_idx
on public.shopping_temp_lists (household_id, created_at desc);

create index if not exists shopping_temp_list_items_household_created_idx
on public.shopping_temp_list_items (household_id, created_at);

create index if not exists shopping_temp_list_items_list_created_idx
on public.shopping_temp_list_items (list_id, created_at);

create index if not exists shopping_memberships_household_shop_idx
on public.shopping_memberships (household_id, shop_name);

create index if not exists shopping_recipes_household_created_idx
on public.shopping_recipes (household_id, created_at desc);

create index if not exists shopping_receipts_household_receipt_date_idx
on public.shopping_receipts (household_id, receipt_date desc);

create index if not exists shopping_receipt_items_receipt_id_idx
on public.shopping_receipt_items (receipt_id);

create index if not exists shopping_receipt_items_household_receipt_date_idx
on public.shopping_receipt_items (household_id, receipt_date desc);

create index if not exists shopping_tracked_lists_household_created_idx
on public.shopping_tracked_lists (household_id, created_at desc);

create index if not exists shopping_tracked_list_items_list_created_idx
on public.shopping_tracked_list_items (tracked_list_id, created_at desc);

create index if not exists shopping_tracked_list_items_receipt_item_idx
on public.shopping_tracked_list_items (receipt_item_id)
where receipt_item_id is not null;

create index if not exists shopping_personal_notes_created_idx
on public.shopping_personal_notes (created_at desc);

analyze public.shopping_items;
analyze public.shopping_notifications;
analyze public.shopping_household_members;
analyze public.shopping_temp_lists;
analyze public.shopping_temp_list_items;
analyze public.shopping_memberships;
analyze public.shopping_recipes;
analyze public.shopping_receipts;
analyze public.shopping_receipt_items;
analyze public.shopping_tracked_lists;
analyze public.shopping_tracked_list_items;
analyze public.shopping_personal_notes;
