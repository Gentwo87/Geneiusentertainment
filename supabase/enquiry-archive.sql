-- Geneius non-destructive enquiry archiving.
-- Run in Supabase SQL editor before merging the corresponding UI change.
create table if not exists public.geneius_enquiry_archives (
  enquiry_id uuid primary key references public.agency_enquiries(id) on delete cascade,
  archived_at timestamptz not null default now(),
  archived_by uuid not null,
  reason text
);
alter table public.geneius_enquiry_archives enable row level security;
revoke all on public.geneius_enquiry_archives from anon,authenticated;
create or replace function public.geneius_admin_list_archives()
returns table(enquiry_id uuid,archived_at timestamptz,reason text)
language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or public.is_booking_admin() is distinct from true then
   raise exception 'Administrator access required';
 end if;
 return query select a.enquiry_id,a.archived_at,a.reason
 from public.geneius_enquiry_archives a order by a.archived_at desc;
end $$;
create or replace function public.geneius_admin_set_enquiry_archive(
 p_enquiry_id uuid,p_archived boolean,p_reason text default null
) returns boolean language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or public.is_booking_admin() is distinct from true then
   raise exception 'Administrator access required';
 end if;
 if not exists(select 1 from public.agency_enquiries e where e.id=p_enquiry_id) then
   raise exception 'Enquiry not found';
 end if;
 if p_archived then
   insert into public.geneius_enquiry_archives(enquiry_id,archived_by,reason)
   values(p_enquiry_id,auth.uid(),left(coalesce(p_reason,''),1000))
   on conflict(enquiry_id) do update
   set archived_at=now(),archived_by=excluded.archived_by,reason=excluded.reason;
 else
   delete from public.geneius_enquiry_archives a where a.enquiry_id=p_enquiry_id;
 end if;
 return true;
end $$;
revoke all on function public.geneius_admin_list_archives() from public;
revoke all on function public.geneius_admin_set_enquiry_archive(uuid,boolean,text) from public;
grant execute on function public.geneius_admin_list_archives(),
 public.geneius_admin_set_enquiry_archive(uuid,boolean,text) to authenticated;
