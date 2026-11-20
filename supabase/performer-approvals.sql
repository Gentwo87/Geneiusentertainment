-- Geneius performer approval workflow, run once in Supabase SQL editor.
-- Approval is per performer. A public availability date is NOT an acceptance.
create table if not exists public.geneius_performer_approvals (
 id uuid primary key default gen_random_uuid(),
 enquiry_id uuid not null references public.agency_enquiries(id) on delete cascade,
 performer_id uuid not null references public.performers(id),
 act_id uuid not null references public.acts(id),
 status text not null default 'pending' check(status in ('pending','accepted','declined','discuss')),
 response_source text check(response_source in ('private_link','admin')),
 response_note text,
 token_hash text not null unique,
 expires_at timestamptz not null default (now()+interval '14 days'),
 responded_at timestamptz,
 created_at timestamptz not null default now(),
 unique(enquiry_id,performer_id)
);
create index if not exists ge_pa_enquiry_idx on public.geneius_performer_approvals(enquiry_id);
alter table public.geneius_performer_approvals enable row level security;
revoke all on public.geneius_performer_approvals from anon,authenticated;
-- All access is via tightly scoped RPCs; tokens are never exposed in list results.
create or replace function public.geneius_admin_prepare_approvals(p_enquiry_id uuid)
returns table(performer_id uuid, approval_id uuid, private_token text)
language plpgsql security definer set search_path='' as $$
declare v_act uuid; v_performer uuid; v_id uuid; v_token text;
begin
 if auth.uid() is null or public.is_booking_admin() is distinct from true then
   raise exception 'Administrator access required';
 end if;
 select e.act_id into v_act from public.agency_enquiries e where e.id=p_enquiry_id;
 if v_act is null then raise exception 'Enquiry has no selected act'; end if;
 if not exists(select 1 from public.act_members m where m.act_id=v_act) then
   raise exception 'This act has no performer membership configured';
 end if;
 for v_performer in select m.performer_id from public.act_members m where m.act_id=v_act loop
   if exists(select 1 from public.geneius_performer_approvals a where a.enquiry_id=p_enquiry_id and a.performer_id=v_performer) then
     continue;
   end if;
   v_token := gen_random_uuid()::text || gen_random_uuid()::text;
   insert into public.geneius_performer_approvals(enquiry_id,performer_id,act_id,token_hash)
   values(p_enquiry_id,v_performer,v_act,md5(v_token)) returning id into v_id;
   performer_id:=v_performer; approval_id:=v_id; private_token:=v_token;
   return next;
 end loop;
end $$;
create or replace function public.geneius_admin_list_approvals(p_enquiry_id uuid)
returns table(approval_id uuid, performer_id uuid, approval_status text, response_source text, response_note text, responded_at timestamptz, expires_at timestamptz)
language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or public.is_booking_admin() is distinct from true then raise exception 'Administrator access required'; end if;
 return query select a.id,a.performer_id,a.status,a.response_source,a.response_note,a.responded_at,a.expires_at
 from public.geneius_performer_approvals a where a.enquiry_id=p_enquiry_id order by a.created_at;
end $$;
create or replace function public.geneius_admin_record_approval(p_approval_id uuid,p_status text,p_note text default null)
returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or public.is_booking_admin() is distinct from true then raise exception 'Administrator access required'; end if;
 if p_status not in ('accepted','declined','discuss') then raise exception 'Invalid response'; end if;
 update public.geneius_performer_approvals a set status=p_status,response_source='admin',response_note=left(coalesce(p_note,''),2000),responded_at=now()
 where a.id=p_approval_id;
 if not found then raise exception 'Approval not found'; end if;
end $$;
create or replace function public.geneius_private_approval_details(p_token text)
returns table(event_date date, act_name text, venue text, event_notes text, response_status text, expires_at timestamptz)
language plpgsql security definer set search_path='' as $$
begin
 if length(coalesce(p_token,''))<>72 then raise exception 'Invalid link'; end if;
 return query
 select e.event_date::date, a.name::text, 'See enquiry details with the agency'::text,coalesce(e.notes::text,''),p.status,p.expires_at
 from public.geneius_performer_approvals p
 join public.agency_enquiries e on e.id=p.enquiry_id
 join public.acts a on a.id=p.act_id
 where p.token_hash=md5(p_token) and p.expires_at>now();
end $$;
create or replace function public.geneius_private_approval_respond(p_token text,p_status text,p_note text default null)
returns boolean language plpgsql security definer set search_path='' as $$
begin
 if length(coalesce(p_token,''))<>72 or p_status not in ('accepted','declined','discuss') then return false; end if;
 update public.geneius_performer_approvals p
 set status=p_status,response_source='private_link',response_note=left(coalesce(p_note,''),2000),responded_at=now()
 where p.token_hash=md5(p_token) and p.expires_at>now() and p.status in ('pending','discuss');
 return found;
end $$;
revoke all on function public.geneius_admin_prepare_approvals(uuid) from public;
revoke all on function public.geneius_admin_list_approvals(uuid) from public;
revoke all on function public.geneius_admin_record_approval(uuid,text,text) from public;
revoke all on function public.geneius_private_approval_details(text) from public;
revoke all on function public.geneius_private_approval_respond(text,text,text) from public;
grant execute on function public.geneius_admin_prepare_approvals(uuid),public.geneius_admin_list_approvals(uuid),public.geneius_admin_record_approval(uuid,text,text) to authenticated;
grant execute on function public.geneius_private_approval_details(text),public.geneius_private_approval_respond(text,text,text) to anon,authenticated;

-- Enforce approval before any NEW offer is sent. Drafts remain allowed.
-- Existing previously sent offers are not modified by this migration.
create or replace function public.geneius_require_performer_approval()
returns trigger language plpgsql security definer set search_path='' as $$
declare v_act uuid; v_total integer; v_accepted integer;
begin
 if new.status <> 'sent' or (tg_op='UPDATE' and old.status='sent') then return new; end if;
 select e.act_id into v_act from public.agency_enquiries e where e.id=new.enquiry_id;
 if v_act is null then raise exception 'Cannot send: no act selected for this enquiry'; end if;
 select count(*) into v_total from public.act_members m where m.act_id=v_act;
 if v_total=0 then raise exception 'Cannot send: act has no performers configured'; end if;
 select count(*) into v_accepted from public.act_members m
 join public.geneius_performer_approvals p on p.performer_id=m.performer_id and p.enquiry_id=new.enquiry_id
 where m.act_id=v_act and p.status='accepted';
 if v_accepted<>v_total then
   raise exception 'Cannot send offer: % of % performers approved',v_accepted,v_total;
 end if;
 return new;
end $$;
drop trigger if exists geneius_require_performer_approval on public.geneius_booking_offers;
create trigger geneius_require_performer_approval before insert or update of status
on public.geneius_booking_offers for each row
execute function public.geneius_require_performer_approval();
