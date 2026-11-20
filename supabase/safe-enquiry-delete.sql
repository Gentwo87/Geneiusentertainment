-- Run in Supabase SQL editor before merging the website change.
-- Deletes ONLY an untouched new enquiry, never an offer/booking/payment/contract.
-- Checks all direct FK references, including ON DELETE CASCADE, before deletion.
create or replace function public.geneius_admin_delete_unused_enquiry(p_enquiry_id uuid)
returns boolean language plpgsql security definer set search_path='' as $$
declare v_status text; v_ref record; v_exists boolean; v_col text;
begin
 if auth.uid() is null or public.is_booking_admin() is distinct from true then
   raise exception 'Administrator access required';
 end if;
 select e.status into v_status
 from public.agency_enquiries e where e.id=p_enquiry_id for update;
 if not found then raise exception 'Enquiry not found'; end if;
 if v_status is distinct from 'new' then
   raise exception 'Only untouched new enquiries can be deleted. Archive progressed records instead.';
 end if;
 if exists(select 1 from public.geneius_booking_offers o where o.enquiry_id=p_enquiry_id) then
   raise exception 'Cannot delete an enquiry with an offer or contract record.';
 end if;
 -- Refuse to delete when ANY referencing record exists, even if its FK would cascade.
 for v_ref in
   select c.conrelid, a.attname as column_name
   from pg_catalog.pg_constraint c
   join pg_catalog.pg_attribute a on a.attrelid=c.conrelid and a.attnum=c.conkey[1]
   where c.contype='f' and c.confrelid='public.agency_enquiries'::regclass
     and array_length(c.conkey,1)=1
 loop
   execute format('select exists(select 1 from %s where %I=$1)',v_ref.conrelid::regclass,v_ref.column_name)
     into v_exists using p_enquiry_id;
   if v_exists then raise exception 'Enquiry has related records and cannot be deleted safely.'; end if;
 end loop;
 -- Composite FKs are unusual for enquiry IDs; block deletion if any exist.
 if exists(select 1 from pg_catalog.pg_constraint c
   where c.contype='f' and c.confrelid='public.agency_enquiries'::regclass
   and array_length(c.conkey,1)<>1) then
   raise exception 'Complex enquiry references exist; manual review required.';
 end if;
 delete from public.agency_enquiries e where e.id=p_enquiry_id and e.status='new';
 return found;
end $$;
revoke all on function public.geneius_admin_delete_unused_enquiry(uuid) from public;
grant execute on function public.geneius_admin_delete_unused_enquiry(uuid) to authenticated;
