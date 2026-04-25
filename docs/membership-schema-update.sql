create table if not exists public.shopping_memberships (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.shopping_households(id) on delete cascade,
  shop_name text not null,
  image_path text not null,
  image_filename text,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists shopping_memberships_set_updated_at on public.shopping_memberships;
create trigger shopping_memberships_set_updated_at
before update on public.shopping_memberships
for each row
execute function public.set_shopping_updated_at();

alter table public.shopping_memberships enable row level security;

drop policy if exists "members can read memberships" on public.shopping_memberships;
create policy "members can read memberships"
on public.shopping_memberships
for select
using (public.is_household_member(household_id));

drop policy if exists "members can add memberships" on public.shopping_memberships;
create policy "members can add memberships"
on public.shopping_memberships
for insert
to authenticated
with check (
  public.is_household_member(household_id)
  and created_by = auth.uid()
);

drop policy if exists "members can update memberships" on public.shopping_memberships;
create policy "members can update memberships"
on public.shopping_memberships
for update
to authenticated
using (public.is_household_member(household_id))
with check (public.is_household_member(household_id));

drop policy if exists "members can delete memberships" on public.shopping_memberships;
create policy "members can delete memberships"
on public.shopping_memberships
for delete
to authenticated
using (public.is_household_member(household_id));

insert into storage.buckets (id, name, public)
values ('membership-barcodes', 'membership-barcodes', false)
on conflict (id) do nothing;

drop policy if exists "household members can read membership barcodes" on storage.objects;
create policy "household members can read membership barcodes"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'membership-barcodes'
  and public.is_household_member(((storage.foldername(name))[1])::uuid)
);

drop policy if exists "household members can upload membership barcodes" on storage.objects;
create policy "household members can upload membership barcodes"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'membership-barcodes'
  and public.is_household_member(((storage.foldername(name))[1])::uuid)
);

drop policy if exists "household members can update membership barcodes" on storage.objects;
create policy "household members can update membership barcodes"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'membership-barcodes'
  and public.is_household_member(((storage.foldername(name))[1])::uuid)
)
with check (
  bucket_id = 'membership-barcodes'
  and public.is_household_member(((storage.foldername(name))[1])::uuid)
);

drop policy if exists "household members can delete membership barcodes" on storage.objects;
create policy "household members can delete membership barcodes"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'membership-barcodes'
  and public.is_household_member(((storage.foldername(name))[1])::uuid)
);
