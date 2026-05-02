alter table public.shopping_recipes
add column if not exists taste_rating integer;

alter table public.shopping_recipes
add column if not exists ease_rating integer;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'shopping_recipes_taste_rating_range'
      and conrelid = 'public.shopping_recipes'::regclass
  ) then
    alter table public.shopping_recipes
    add constraint shopping_recipes_taste_rating_range
    check (taste_rating is null or taste_rating between 1 and 5);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'shopping_recipes_ease_rating_range'
      and conrelid = 'public.shopping_recipes'::regclass
  ) then
    alter table public.shopping_recipes
    add constraint shopping_recipes_ease_rating_range
    check (ease_rating is null or ease_rating between 1 and 5);
  end if;
end $$;

drop policy if exists "household members can update recipes" on public.shopping_recipes;
create policy "household members can update recipes"
on public.shopping_recipes
for update
to authenticated
using (public.is_household_member(household_id))
with check (public.is_household_member(household_id));
