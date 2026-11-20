-- Step 9: Safe test labels and unsent draft deletion.
-- Run in Supabase SQL editor BEFORE merging website changes.
-- Labels do not alter public availability, calendar, payments or offer status.
create table if not exists public.geneius_enquiry_test_labels (
 enquiry_id uuid primary key references public.agency_enquiries(id) on delete cascade,
 marked_by uuid not null,
 marked_at timestamptz not null default now()
);
alter table public.geneius_enquiry_test_labels enable row level security;
revoke all on public.geneius_enquiry_test_labels from anon,authenticated;
create or replace function public.geneius_admin_list_test_labels()
returns table(enquiry_id uuid)
language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or public.is_booking_admin() is distinct from true then raise exception 'Administrator access required'; end if;
 return query select t.enquiry_id from public.geneius_enquiry_test_labels t;
end $$;
create or replace function public.geneius_admin_mark_test(p_enquiry_id uuid,p_is_test boolean)
returns boolean language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or public.is_booking_admin() is distinct from true then raise exception 'Administrator access required'; end if;
 if not exists(select 1 from public.agency_enquiries e where e.id=p_enquiry_id) then raise exception 'Enquiry not found'; end if;
 if p_is_test then
   insert into public.geneius_enquiry_test_labels(enquiry_id,marked_by)
   values(p_enquiry_id,auth.uid()) on conflict(enquiry_id) do nothing;
 else
   delete from public.geneius_enquiry_test_labels t where t.enquiry_id=p_enquiry_id;
 end if;
 return true;
end $$;
create or replace function public.geneius_admin_delete_unsent_draft(p_offer_id uuid)
returns boolean language plpgsql security definer set search_path='' as $$
declare v_status text; v_ref record; v_exists boolean;
begin
 if auth.uid() is null or public.is_booking_admin() is distinct from true then raise exception 'Administrator access required'; end if;
 select o.status into v_status from public.geneius_booking_offers o where o.id=p_offer_id for update;
 if not found then raise exception 'Draft not found'; end if;
 if v_status is distinct from 'draft' then raise exception 'Only unsent drafts can be deleted'; end if;
 -- Refuse deletion if any table references this offer, including cascading FKs.
 for v_ref in
  select c.conrelid,a.attname column_name
  from pg_catalog.pg_constraint c
  join pg_catalog.pg_attribute a on a.attrelid=c.conrelid and a.attnum=c.conkey[1]
  where c.contype='f' and c.confrelid='public.geneius_booking_offers'::regclass
    and array_length(c.conkey,1)=1
 loop
  execute format('select exists(select 1 from %s where %I=$1)',v_ref.conrelid::regclass,v_ref.column_name)
  into v_exists using p_offer_id;
  if v_exists then raise exception 'Draft has linked records; archive instead'; end if;
 end loop;
 if exists(select 1 from pg_catalog.pg_constraint c where c.contype='f'
 and c.confrelid='public.geneius_booking_offers'::regclass and array_length(c.conkey,1)<>1) then
  raise exception 'Complex offer references require manual review';
 end if;
 delete from public.geneius_booking_offers o where o.id=p_offer_id and o.status='draft';
 return found;
end $$;
revoke all on function public.geneius_admin_list_test_labels() from public;
revoke all on function public.geneius_admin_mark_test(uuid,boolean) from public;
revoke all on function public.geneius_admin_delete_unsent_draft(uuid) from public;
grant execute on function public.geneius_admin_list_test_labels(),
public.geneius_admin_mark_test(uuid,boolean),public.geneius_admin_delete_unsent_draft(uuid) to authenticated;
