-- Run in Supabase SQL Editor BEFORE using the admin confirmation button.
-- This function is atomic: any error rolls back the booking and payment changes.
-- Existing calendar entries are never silently replaced.
create table if not exists public.geneius_confirmed_offer_bookings (
  offer_id uuid primary key references public.geneius_booking_offers(id) on delete restrict,
  booking_id uuid not null unique references public.bookings(id) on delete restrict,
  confirmed_by uuid not null,
  confirmed_at timestamptz not null default now()
);
alter table public.geneius_confirmed_offer_bookings enable row level security;
revoke all on public.geneius_confirmed_offer_bookings from anon, authenticated;

create or replace function public.geneius_admin_verify_payment_and_confirm(p_offer_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_offer record;
  v_enquiry record;
  v_booking uuid;
  v_slot text;
  v_start time;
  v_end time;
  v_next boolean;
  v_title text;
  v_count integer;
begin
  if auth.uid() is null or public.is_booking_admin() is distinct from true then
    raise exception 'Administrator access required';
  end if;

  select * into v_offer from public.geneius_booking_offers
  where id = p_offer_id for update;
  if not found then raise exception 'Offer not found'; end if;
  if v_offer.status <> 'payment_pending' then
    raise exception 'Only payment declarations awaiting verification can be confirmed';
  end if;
  if exists(select 1 from public.geneius_confirmed_offer_bookings where offer_id=p_offer_id) then
    raise exception 'This offer already has a confirmed calendar booking';
  end if;
  select * into v_enquiry from public.agency_enquiries where id=v_offer.enquiry_id for update;
  if not found or v_enquiry.act_id is null or v_enquiry.event_date is null then
    raise exception 'Enquiry needs an act and event date';
  end if;
  if not exists(select 1 from public.act_members where act_id=v_enquiry.act_id) then
    raise exception 'The act has no linked performers';
  end if;
  if exists(
    select 1 from public.geneius_confirmed_offer_bookings cb
    join public.geneius_booking_offers other_offer on other_offer.id=cb.offer_id
    where other_offer.enquiry_id=v_offer.enquiry_id
  ) then
    raise exception 'This enquiry already has a confirmed calendar booking';
  end if;

  -- Serialise confirmation attempts on the same date, including different offers.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtext('geneius-confirm-date:' || v_enquiry.event_date::text)
  );
  v_start := nullif(v_offer.start_time::text,'')::time;
  v_end := nullif(v_offer.end_time::text,'')::time;
  if (v_start is null) <> (v_end is null) then
    raise exception 'Both start and end times must be specified';
  end if;
  v_next := v_start is not null and v_end <= v_start;
  v_slot := case when v_start is null then 'all_day'
    when v_start < time '17:00' then 'daytime'
    else 'evening' end;

  -- Be conservative: any blocking booking for a shared performer on this date
  -- requires manual conflict resolution. This includes provisional holds.
  if exists(
    select 1 from public.bookings b
    join public.booking_performers bp on bp.booking_id=b.id
    join public.act_members am on am.performer_id=bp.performer_id
    where am.act_id=v_enquiry.act_id
      and b.event_date=v_enquiry.event_date::date
      and b.status in ('confirmed','provisional','awaiting_deposit','checking')
  ) or exists(
    select 1 from public.bookings b
    join public.act_members am on am.act_id=b.act_id
    join public.act_members target_am on target_am.performer_id=am.performer_id
    where target_am.act_id=v_enquiry.act_id
      and b.event_date=v_enquiry.event_date::date
      and b.status in ('confirmed','provisional','awaiting_deposit','checking')
  ) then
    raise exception 'Calendar conflict: a performer is booked or on hold on this date';
  end if;

  select name into v_title from public.acts where id=v_enquiry.act_id;
  insert into public.bookings(event_date,act_id,slot,status,start_time,end_time,ends_next_day,title,notes)
  values (
    v_enquiry.event_date::date, v_enquiry.act_id, v_slot, 'confirmed',
    v_start,v_end,v_next,
    coalesce(v_title,'Performance') || ' — ' || coalesce(v_enquiry.customer_name,'Customer'),
    'Confirmed from Geneius booking offer ' || p_offer_id::text
  ) returning id into v_booking;

  insert into public.booking_performers(booking_id,performer_id)
  select v_booking,am.performer_id from public.act_members am
  where am.act_id=v_enquiry.act_id;

  insert into public.geneius_confirmed_offer_bookings(offer_id,booking_id,confirmed_by)
  values(p_offer_id,v_booking,auth.uid());

  update public.geneius_booking_offers set status='confirmed' where id=p_offer_id;
  return v_booking;
end $$;

revoke all on function public.geneius_admin_verify_payment_and_confirm(uuid) from public;
grant execute on function public.geneius_admin_verify_payment_and_confirm(uuid) to authenticated;
