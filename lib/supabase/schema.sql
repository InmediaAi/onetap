-- OneTap Atelier — Supabase schema (delivered per spec; not wired in MVP).
-- The MVP runs on local mock data + a persisted Zustand store. To go live,
-- create these tables and add a Supabase data adapter behind the same shapes
-- used by lib/data/products.ts and lib/store.ts.

create extension if not exists "pgcrypto";

-- Curated luxury catalog.
create table if not exists products (
  id          text primary key,
  brand       text not null,
  name        text not null,
  price       text not null,
  image_url   text not null,
  mono        text,            -- editorial monogram placeholder (derived from brand)
  source_url  text,            -- retailer URL the listing was imported from
  created_at  timestamptz not null default now()
);

-- If the table already exists from an earlier deploy, add the new columns.
alter table products add column if not exists mono text;
alter table products add column if not exists source_url text;

create index if not exists products_created_idx on products (created_at desc);

-- Public read for the catalog grid; writes go through the service role only
-- (no insert/update/delete policy → anon key cannot mutate).
alter table products enable row level security;

drop policy if exists "public read products" on products;
create policy "public read products"
  on products for select
  using (true);

-- Generated looks (try-on image / 360 spin / social video).
create table if not exists generated_looks (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid,
  product_id      text references products (id),
  kind            text not null check (kind in ('tryon', 'spin', 'video')),
  input_image     text,        -- portrait used as input
  generated_image text,        -- result image (Photo Try-On)
  video_url       text,        -- result video (360 Spin / Social Video)
  created_at      timestamptz not null default now()
);

create index if not exists generated_looks_user_idx on generated_looks (user_id);
create index if not exists generated_looks_created_idx on generated_looks (created_at desc);

-- Public read for shared /look/[id] pages; writes via service role only.
alter table generated_looks enable row level security;

drop policy if exists "public read looks" on generated_looks;
create policy "public read looks"
  on generated_looks for select
  using (true);

-- ───────────────────────────────────────────────────────────────────────────
-- Credits (PREP — not enforced at runtime yet).
-- The app currently runs a CLIENT-SIDE credit ledger (lib/store.ts +
-- lib/credits.ts, persisted in localStorage). These objects make credits
-- server-authoritative once real Supabase Auth replaces the mock sign-in and
-- the generation routes call spend_credits() server-side.
-- Keep the numbers in sync with lib/credits.ts:
--   STARTING_CREDITS = 20 ; costs Try-On 5 / 360° 20 / Film 20.
-- ───────────────────────────────────────────────────────────────────────────

-- Per-user wallet, keyed to Supabase Auth.
create table if not exists profiles (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  credits    integer not null default 20 check (credits >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table profiles enable row level security;

-- A user may read only their own wallet. There is NO client insert/update/delete
-- policy → balances change only via the SECURITY DEFINER functions / service role.
drop policy if exists "read own profile" on profiles;
create policy "read own profile"
  on profiles for select
  using (auth.uid() = user_id);

-- Append-only ledger of every credit movement (audit + idempotency).
create table if not exists credit_transactions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  delta      integer not null,        -- + topup/signup, − spend
  reason     text not null,           -- 'signup' | 'topup' | 'spend:tryon' | 'spend:spin' | 'spend:video'
  ref        text,                    -- look id / stripe session / package id
  created_at timestamptz not null default now()
);

create index if not exists credit_tx_user_idx
  on credit_transactions (user_id, created_at desc);

alter table credit_transactions enable row level security;

drop policy if exists "read own transactions" on credit_transactions;
create policy "read own transactions"
  on credit_transactions for select
  using (auth.uid() = user_id);

-- Seed a wallet (starter balance) + signup ledger row for every new auth user.
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into profiles (user_id, credits)
    values (new.id, 20)
    on conflict (user_id) do nothing;
  insert into credit_transactions (user_id, delta, reason)
    values (new.id, 20, 'signup');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Authoritative deduction for the signed-in user. Atomic (no negative / no race).
-- Returns the new balance, or NULL when the balance is insufficient / no wallet.
-- Generation routes will call this server-side, replacing the client-side check.
create or replace function spend_credits(
  p_amount integer,
  p_reason text,
  p_ref    text default null
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  new_balance integer;
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'p_amount must be a positive integer';
  end if;

  update profiles
     set credits = credits - p_amount,
         updated_at = now()
   where user_id = auth.uid()
     and credits >= p_amount
   returning credits into new_balance;

  if new_balance is null then
    return null; -- insufficient credits or no wallet
  end if;

  insert into credit_transactions (user_id, delta, reason, ref)
    values (auth.uid(), -p_amount, p_reason, p_ref);

  return new_balance;
end;
$$;

-- Top-up. Intended for the SERVICE ROLE / Stripe webhook only — takes an explicit
-- user id and is not exposed to end users (execute revoked below).
create or replace function grant_credits(
  p_user   uuid,
  p_amount integer,
  p_reason text,
  p_ref    text default null
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  new_balance integer;
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'p_amount must be a positive integer';
  end if;

  insert into profiles (user_id, credits)
    values (p_user, p_amount)
    on conflict (user_id)
    do update set credits = profiles.credits + excluded.credits,
                  updated_at = now()
    returning credits into new_balance;

  insert into credit_transactions (user_id, delta, reason, ref)
    values (p_user, p_amount, p_reason, p_ref);

  return new_balance;
end;
$$;

-- End users must never self-grant credits.
revoke all on function grant_credits(uuid, integer, text, text) from anon, authenticated;

-- ───────────────────────────────────────────────────────────────────────────
-- Generation logs — the exact prompt sent for each image/video generation.
-- Written by the generation routes via the service role (lib/ai/logGeneration.ts).
-- Browse in the Supabase Table Editor. No data-URL images are stored.
-- ───────────────────────────────────────────────────────────────────────────
create table if not exists generation_logs (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  kind        text,            -- 'tryon' | 'spin' | 'video'
  provider    text,            -- 'grok' | 'kling' | 'mock'
  model       text,
  prompt      text,            -- the exact prompt sent
  product_id  text,
  image_ref   text,            -- product/source image URL, or 'data-url' for portraits
  status      text,            -- 'ok' | 'error'
  duration_ms integer,
  error       text
);

create index if not exists generation_logs_created_idx
  on generation_logs (created_at desc);

-- Service-role writes only; no public policy (RLS on, no policy → no anon access).
alter table generation_logs enable row level security;

-- ═══════════════════════════════════════════════════════════════════════════
-- MIGRATION: credits → subscriptions + real profiles  (idempotent; run as-is).
-- Replaces the client-side credit ledger with server-authoritative video
-- quotas. A "video" = a 360 spin OR a film; photo try-on is free/unlimited.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Profiles: drop credits, add identity + free-trial counter ──────────────
alter table profiles drop column if exists credits;
alter table profiles add column if not exists username text unique;
alter table profiles add column if not exists email text;
alter table profiles add column if not exists favorite_brands text[] not null default '{}';
alter table profiles add column if not exists selfie_url text;  -- storage path
alter table profiles add column if not exists body_url text;    -- storage path
alter table profiles add column if not exists free_trial_used integer not null default 0
  check (free_trial_used >= 0);

-- Users may now UPDATE their own profile (brands + image paths). username and
-- free_trial_used are protected: set username via set_username() RPC, and never
-- expose free_trial_used to client writes (only the SECURITY DEFINER RPCs touch it).
drop policy if exists "update own profile" on profiles;
create policy "update own profile"
  on profiles for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Validated, unique username setter (client can't set username column directly
-- in a trustworthy way; route it through here).
create or replace function set_username(p_username text)
returns text language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); clean text;
begin
  if uid is null then raise exception 'unauthenticated'; end if;
  clean := lower(trim(p_username));
  if clean !~ '^[a-z0-9_]{3,24}$' then
    raise exception 'username must be 3-24 chars: a-z, 0-9, underscore';
  end if;
  update profiles set username = clean, updated_at = now() where user_id = uid;
  return clean;
end; $$;

-- Rewrite the signup trigger: seed a profile (no credits).
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (user_id, email)
    values (new.id, new.email)
    on conflict (user_id) do nothing;
  return new;
end; $$;

-- ── Drop the credit machinery ──────────────────────────────────────────────
drop function if exists spend_credits(integer, text, text);
drop function if exists grant_credits(uuid, integer, text, text);
drop table if exists credit_transactions;

-- ── Subscriptions ──────────────────────────────────────────────────────────
create table if not exists subscriptions (
  user_id                  uuid primary key references auth.users (id) on delete cascade,
  plan                     text not null check (plan in ('starter', 'pro')),
  status                   text not null,            -- created | active | halted | cancelled
  razorpay_subscription_id text unique,
  current_period_start     timestamptz,
  current_period_end       timestamptz,
  videos_used              integer not null default 0 check (videos_used >= 0),
  updated_at               timestamptz not null default now()
);

alter table subscriptions enable row level security;

-- Users read their own subscription. NO client write policy: only the service
-- role (Razorpay webhook) and the SECURITY DEFINER RPCs below mutate it.
drop policy if exists "read own subscription" on subscriptions;
create policy "read own subscription"
  on subscriptions for select
  using (auth.uid() = user_id);

-- Plan → monthly video limit (keep in sync with lib/pricing/plans.ts).
create or replace function plan_video_limit(p text)
returns integer language sql immutable as $$
  select case p when 'starter' then 10 when 'pro' then 30 else 0 end
$$;

-- ── Atomic video consume / refund ──────────────────────────────────────────
-- Reserves ONE video for the signed-in user. Row-locks to serialize concurrent
-- generations. Active subscription path (with monthly period reset) first, then
-- the one-time free trial (FREE_VIDEO_TRIAL = 2). Returns:
--   { ok:true,  source:'subscription'|'trial', remaining:int }
--   { ok:false, reason:'limit_reached'|'unauthenticated', source? }
create or replace function consume_video()
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  s   subscriptions%rowtype;
  lim int;
  tr  int;
  uid uuid := auth.uid();
begin
  if uid is null then
    return jsonb_build_object('ok', false, 'reason', 'unauthenticated');
  end if;

  -- 1) Active subscription
  select * into s from subscriptions where user_id = uid for update;
  if found and s.status = 'active' then
    if s.current_period_end is not null and now() >= s.current_period_end then
      update subscriptions
         set videos_used = 0,
             current_period_start = s.current_period_end,
             current_period_end   = s.current_period_end + interval '1 month',
             updated_at = now()
       where user_id = uid
      returning * into s;
    end if;
    lim := plan_video_limit(s.plan);
    if s.videos_used < lim then
      update subscriptions set videos_used = videos_used + 1, updated_at = now()
       where user_id = uid;
      return jsonb_build_object('ok', true, 'source', 'subscription',
                                'remaining', lim - s.videos_used - 1);
    end if;
    return jsonb_build_object('ok', false, 'reason', 'limit_reached', 'source', 'subscription');
  end if;

  -- 2) Free trial (one-time)
  select free_trial_used into tr from profiles where user_id = uid for update;
  if tr is null then tr := 0; end if;
  if tr < 2 then
    update profiles set free_trial_used = tr + 1, updated_at = now() where user_id = uid;
    return jsonb_build_object('ok', true, 'source', 'trial', 'remaining', 2 - tr - 1);
  end if;

  return jsonb_build_object('ok', false, 'reason', 'limit_reached', 'source', 'trial');
end; $$;

-- Reverse one reserved unit when a generation fails AFTER reserving.
create or replace function refund_video(p_source text)
returns void language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid();
begin
  if uid is null then return; end if;
  if p_source = 'subscription' then
    update subscriptions set videos_used = greatest(videos_used - 1, 0), updated_at = now()
     where user_id = uid;
  else
    update profiles set free_trial_used = greatest(free_trial_used - 1, 0), updated_at = now()
     where user_id = uid;
  end if;
end; $$;

-- ── Storage: private avatars bucket (selfie + full body), own-folder RLS ────
insert into storage.buckets (id, name, public)
  values ('avatars', 'avatars', false)
  on conflict (id) do nothing;

drop policy if exists "avatars read own" on storage.objects;
create policy "avatars read own" on storage.objects for select
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- Users may write ONLY the uploaded identity kinds (face, full body, both side
-- looks, back). The derived `model` sheet is system-generated (service role) and
-- must NOT be user-writable, so it is deliberately excluded from this allowlist.
drop policy if exists "avatars insert own" on storage.objects;
create policy "avatars insert own" on storage.objects for insert
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
    and storage.filename(name) in ('selfie', 'body', 'left', 'right', 'back')
  );

drop policy if exists "avatars update own" on storage.objects;
create policy "avatars update own" on storage.objects for update
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
    and storage.filename(name) in ('selfie', 'body', 'left', 'right', 'back')
  );

-- ═══════════════════════════════════════════════════════════════════════════
-- MIGRATION: piece filter metadata + price(amount,currency) + profile taste.
-- Idempotent — run as-is. Keep vocabularies in sync with lib/data/vocab.ts.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Products: amount+currency price, filter tags, internal score ────────────
alter table products add column if not exists price_amount  numeric;
alter table products add column if not exists currency      text;        -- USD|EUR|GBP|INR
alter table products add column if not exists type          text;        -- one UPLOADABLE_TYPE
alter table products add column if not exists colours       text[];      -- COLOUR_NAMES
alter table products add column if not exists occasions     text[];      -- OCCASIONS
alter table products add column if not exists dropped_at    date;        -- "New in" computed from this
alter table products add column if not exists description   text;
alter table products add column if not exists stylist_note  text;
alter table products add column if not exists source_site   text;        -- derived from source_url host
alter table products add column if not exists one_tap_score integer;     -- 0–100, internal only
alter table products add column if not exists images        text[];      -- image variants (image_url = images[0])
alter table products add column if not exists category      text;        -- PRODUCT_CATEGORIES (supersedes legacy `type`)
alter table products add column if not exists style         text[];      -- PRODUCT_STYLES
alter table products add column if not exists buy_url       text;        -- outbound purchase link (retailer product page)
-- legacy `price` text becomes optional once price_amount is populated.
alter table products alter column price drop not null;

-- ── Profiles: photos (side/back), height, taste + scene preferences ─────────
alter table profiles add column if not exists side_url      text;        -- legacy single side (superseded by left_url/right_url)
alter table profiles add column if not exists left_url      text;        -- storage path {uid}/left  (left side look)
alter table profiles add column if not exists right_url     text;        -- storage path {uid}/right (right side look)
alter table profiles add column if not exists back_url      text;        -- storage path {uid}/back
alter table profiles add column if not exists model_url     text;        -- {uid}/model — system-derived combined avatar (read-only)
-- Carry any previously captured single "side" over to the left look.
update profiles set left_url = side_url where left_url is null and side_url is not null;
alter table profiles add column if not exists height_inches integer;     -- 56–76
alter table profiles add column if not exists style         text[] not null default '{}';
alter table profiles add column if not exists categories    text[] not null default '{}';
alter table profiles add column if not exists goals         text[] not null default '{}';
alter table profiles add column if not exists scene_mood    text[] not null default '{}';
alter table profiles add column if not exists scene_setting text[] not null default '{}';
-- First-run signup vs returning sign-in: set true when onboarding completes.
alter table profiles add column if not exists onboarded     boolean not null default false;

-- Campaign attribution (FIRST-TOUCH): set once at signup, never overwritten.
alter table profiles add column if not exists utm_campaign     text;
alter table profiles add column if not exists utm_source       text;
alter table profiles add column if not exists utm_medium       text;
alter table profiles add column if not exists campaign_product text;   -- product id the deeplink targeted
alter table profiles add column if not exists attributed_at    timestamptz;

-- Per-look campaign tag (which campaign produced this try-on/360/film).
alter table generated_looks add column if not exists utm_campaign text;

-- ═══════════════════════════════════════════════════════════════════════════
-- MIGRATION: persist generated looks (images/360/film) in a public bucket.
-- Idempotent — run as-is. Generated outputs are re-hosted server-side (service
-- role) into the public `looks` bucket so shared /look/[id] links are durable
-- and CDN-cacheable. Profile photos stay in the private `avatars` bucket.
-- ═══════════════════════════════════════════════════════════════════════════

-- Public read bucket for generated looks (unguessable paths; service-role writes).
insert into storage.buckets (id, name, public)
  values ('looks', 'looks', true)
  on conflict (id) do nothing;

drop policy if exists "looks public read" on storage.objects;
create policy "looks public read" on storage.objects for select
  using (bucket_id = 'looks');
-- No insert/update/delete policy → only the service role can write.

-- Public read bucket for re-hosted product images. Admin save captures each
-- retailer image (with browser headers) into here so try-on generation pulls a
-- stable Supabase URL instead of a hotlink-protected CDN (which 403s server-side).
insert into storage.buckets (id, name, public)
  values ('product-images', 'product-images', true)
  on conflict (id) do nothing;

drop policy if exists "product images public read" on storage.objects;
create policy "product images public read" on storage.objects for select
  using (bucket_id = 'product-images');
-- No insert/update/delete policy → only the service role can write.

-- Poster frame for video looks (still image shown before play).
alter table generated_looks add column if not exists poster_url text;

-- product_id may be a synthetic source (e.g. 'tryon-360', 'creator-upload'),
-- not a catalogue id — drop the FK so persistence never fails on those.
alter table generated_looks drop constraint if exists generated_looks_product_id_fkey;

-- ═══════════════════════════════════════════════════════════════════════════
-- MIGRATION: admin-configurable subscription packages + roll-over top-ups.
-- Idempotent — run as-is. Plan prices/limits/features become DB-editable (admin)
-- with lib/pricing/plans.ts as the seed/fallback. A "try-on" = one 360°/film
-- VIDEO (the intermediate image is internal & free). Free tier = one-time count.
-- NOTE: a Razorpay subscription's actual charge is fixed by its Razorpay plan
-- (RAZORPAY_PLAN_*); monthly_price here is DISPLAY-ONLY. The top-up unit price IS
-- enforced by us (we compute the one-time order amount), so it is fully editable.
-- ═══════════════════════════════════════════════════════════════════════════

-- Admin-editable tiers. id is fixed: 'free' | 'starter' | 'pro'.
-- For 'free', video_limit is the ONE-TIME trial count (not monthly).
create table if not exists billing_plans (
  id            text primary key,
  name          text not null,
  tagline       text,
  monthly_price numeric not null default 0,   -- USD/mo, display-only (see note)
  currency      text not null default 'USD',
  video_limit   integer not null default 0 check (video_limit >= 0),
  features      text[] not null default '{}',
  most_popular  boolean not null default false,
  active        boolean not null default true,
  sort_order    integer not null default 0,
  updated_at    timestamptz not null default now()
);

alter table billing_plans enable row level security;
drop policy if exists "public read plans" on billing_plans;
create policy "public read plans" on billing_plans for select using (true);
-- No client write policy → only the service role (admin route) mutates plans.

insert into billing_plans (id, name, tagline, monthly_price, video_limit, features, most_popular, active, sort_order) values
  ('free',    'Free',    'A first try-on, on the house.',                 0,  1,
     array['1 try-on (360°) — one time', 'Photo composition included'], false, true, 0),
  ('starter', 'Starter', 'For creators getting started with AI video.',  20, 10,
     array['10 try-ons (360° or film) / month', 'Standard generation queue'], false, true, 1),
  ('pro',     'Pro',     'For creators publishing at a steady pace.',     49, 30,
     array['30 try-ons (360° or film) / month', 'Priority generation queue', 'Early access to new formats'], true, true, 2),
  ('maison',  'Maison',  'For studios and brands producing at scale.',    129, 100,
     array['100 try-ons (360° or film) / month', 'Priority generation queue', 'Early access to new formats', 'Commercial usage rights', 'Concierge onboarding'], false, true, 3),
  ('gold',    'Gold Test', 'Small-amount live payment test.',             1,   5,
     array['Live payment test tier', '5 try-ons / month'], false, true, 4)
on conflict (id) do nothing;

-- Global billing settings (singleton row).
create table if not exists billing_config (
  id               text primary key default 'default',
  topup_unit_price numeric not null default 2,      -- USD per extra video
  topup_currency   text not null default 'USD',
  topup_enabled    boolean not null default true,
  updated_at       timestamptz not null default now()
);

alter table billing_config enable row level security;
drop policy if exists "public read config" on billing_config;
create policy "public read config" on billing_config for select using (true);

insert into billing_config (id) values ('default') on conflict (id) do nothing;

-- Roll-over top-up balance (paid extra videos, consumed AFTER the monthly
-- allowance; never reset by the billing-cycle reset).
alter table subscriptions add column if not exists topup_balance integer not null default 0
  check (topup_balance >= 0);

-- Scheduled cancellation: set true when the user cancels at cycle end. The plan
-- stays active until current_period_end, then lapses (never auto-renews). Cleared
-- on (re)activation and on the terminal subscription.cancelled/completed webhook.
alter table subscriptions add column if not exists cancel_at_period_end boolean not null default false;

-- One-time top-up payments — idempotency + audit (service role writes only).
create table if not exists topup_payments (
  payment_id text primary key,
  user_id    uuid not null references auth.users (id) on delete cascade,
  quantity   integer not null check (quantity > 0),
  amount     numeric,
  currency   text,
  created_at timestamptz not null default now()
);

alter table topup_payments enable row level security;
drop policy if exists "read own topups" on topup_payments;
create policy "read own topups" on topup_payments for select using (auth.uid() = user_id);

-- ── Re-define quota fns to read limits from billing_plans (DB source of truth) ─
-- Plan → monthly video limit (reads billing_plans).
create or replace function plan_video_limit(p text)
returns integer language sql stable as $$
  select coalesce((select video_limit from billing_plans where id = p), 0)
$$;

-- Reserve ONE video for the signed-in user. Subscription monthly allowance first,
-- then roll-over top-up balance, then the one-time free trial. Returns:
--   { ok:true,  source:'subscription'|'topup'|'trial', remaining:int }
--   { ok:false, reason:'limit_reached'|'unauthenticated', source? }
create or replace function consume_video()
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  s   subscriptions%rowtype;
  lim int;
  tr  int;
  free_lim int := coalesce((select video_limit from billing_plans where id = 'free'), 0);
  uid uuid := auth.uid();
begin
  if uid is null then
    return jsonb_build_object('ok', false, 'reason', 'unauthenticated');
  end if;

  -- 1) Active subscription: monthly allowance, then roll-over top-ups.
  select * into s from subscriptions where user_id = uid for update;
  if found and s.status = 'active' then
    if s.current_period_end is not null and now() >= s.current_period_end then
      if s.cancel_at_period_end then
        -- Scheduled cancellation reached its cycle end → lapse, do NOT renew.
        update subscriptions set status = 'cancelled', updated_at = now()
         where user_id = uid
        returning * into s;
      else
        update subscriptions
           set videos_used = 0,
               current_period_start = s.current_period_end,
               current_period_end   = s.current_period_end + interval '1 month',
               updated_at = now()
         where user_id = uid
        returning * into s;
      end if;
    end if;
    -- Skip the subscription grant if it just lapsed above (falls to free trial).
    if s.status = 'active' then
      lim := plan_video_limit(s.plan);
      if s.videos_used < lim then
        update subscriptions set videos_used = videos_used + 1, updated_at = now()
         where user_id = uid;
        return jsonb_build_object('ok', true, 'source', 'subscription',
                                  'remaining', lim - s.videos_used - 1);
      elsif s.topup_balance > 0 then
        update subscriptions set topup_balance = topup_balance - 1, updated_at = now()
         where user_id = uid;
        return jsonb_build_object('ok', true, 'source', 'topup',
                                  'remaining', s.topup_balance - 1);
      end if;
      return jsonb_build_object('ok', false, 'reason', 'limit_reached', 'source', 'subscription');
    end if;
  end if;

  -- 2) Free trial (one-time; count from billing_plans 'free').
  select free_trial_used into tr from profiles where user_id = uid for update;
  if tr is null then tr := 0; end if;
  if tr < free_lim then
    update profiles set free_trial_used = tr + 1, updated_at = now() where user_id = uid;
    return jsonb_build_object('ok', true, 'source', 'trial', 'remaining', free_lim - tr - 1);
  end if;

  return jsonb_build_object('ok', false, 'reason', 'limit_reached', 'source', 'trial');
end; $$;

-- Reverse one reserved unit when a generation fails AFTER reserving.
create or replace function refund_video(p_source text)
returns void language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid();
begin
  if uid is null then return; end if;
  if p_source = 'subscription' then
    update subscriptions set videos_used = greatest(videos_used - 1, 0), updated_at = now()
     where user_id = uid;
  elsif p_source = 'topup' then
    update subscriptions set topup_balance = topup_balance + 1, updated_at = now()
     where user_id = uid;
  else
    update profiles set free_trial_used = greatest(free_trial_used - 1, 0), updated_at = now()
     where user_id = uid;
  end if;
end; $$;

-- Atomically add purchased top-up units (called by the webhook, service role).
create or replace function add_topup_balance(p_user uuid, p_qty integer)
returns void language plpgsql security definer set search_path = public as $$
begin
  update subscriptions
     set topup_balance = topup_balance + greatest(p_qty, 0), updated_at = now()
   where user_id = p_user;
end; $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- MIGRATION: every user gets a 'free' subscription row at signup.
-- The free allowance is LIFETIME (no monthly reset): current_period_end stays
-- NULL, so consume_video() counts free usage on this row but never resets it.
-- Limit comes from billing_plans.free.video_limit (admin-editable). Upgrading to
-- a paid plan reuses the same row (webhook upsert on user_id).
-- ═══════════════════════════════════════════════════════════════════════════

-- Allow 'free' as a plan value (and the campaign 'fan' tier, so re-running this
-- cumulative script on a DB that already has 'fan' rows doesn't fail here before
-- the canonical constraint below). Kept in sync with the final constraint.
alter table subscriptions drop constraint if exists subscriptions_plan_check;
alter table subscriptions
  add constraint subscriptions_plan_check check (plan in ('free', 'starter', 'pro', 'maison', 'gold', 'fan'));

-- Seed a free subscription on signup (profile + free sub). Lifetime: end = NULL.
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (user_id, email)
    values (new.id, new.email)
    on conflict (user_id) do nothing;
  insert into subscriptions (user_id, plan, status, current_period_start)
    values (new.id, 'free', 'active', now())
    on conflict (user_id) do nothing;
  return new;
end; $$;

-- Backfill: give existing users (no subscription yet) a free row.
insert into subscriptions (user_id, plan, status, current_period_start)
  select p.user_id, 'free', 'active', now()
  from profiles p
  where not exists (select 1 from subscriptions s where s.user_id = p.user_id)
on conflict (user_id) do nothing;

-- ═══════════════════════════════════════════════════════════════════════════
-- MIGRATION: campaigns (e.g. the FIFA "Viral Fan" microsite). Idempotent.
-- Campaign jerseys are normal products flagged campaign_only so they stay out
-- of the main Curator. A campaign maps countries → jersey products (per kit) and
-- defines the film "moments". Adds an additive 'fan' membership tier.
-- ═══════════════════════════════════════════════════════════════════════════

-- Keep campaign jerseys out of the luxury Curator grid.
alter table products add column if not exists campaign_only boolean not null default false;

create table if not exists campaigns (
  id         text primary key,            -- 'fifa-worldcup'
  title      text not null,
  subtitle   text,
  accent     text,                        -- theme accent (hex)
  active     boolean not null default true,
  updated_at timestamptz not null default now()
);

-- One row per supported nation (colour/flag for the themed UI).
create table if not exists campaign_teams (
  id          uuid primary key default gen_random_uuid(),
  campaign_id text not null references campaigns (id) on delete cascade,
  country     text not null,
  accent      text,                        -- nation colour (hex)
  flag        text,                        -- emoji or image URL
  sort_order  integer not null default 0,
  unique (campaign_id, country)
);

-- A nation can have several jerseys (Home/Away/Authentic); each is a product.
create table if not exists campaign_jerseys (
  id          uuid primary key default gen_random_uuid(),
  campaign_id text not null references campaigns (id) on delete cascade,
  country     text not null,
  kit         text not null,               -- 'Home' | 'Home (Authentic)' | 'Away' | 'Away (Authentic)'
  product_id  text references products (id) on delete set null,
  sort_order  integer not null default 0
);

-- Film "moments" → admin-authored video prompts.
create table if not exists campaign_moments (
  id          uuid primary key default gen_random_uuid(),
  campaign_id text not null references campaigns (id) on delete cascade,
  label       text not null,
  prompt      text not null,
  sort_order  integer not null default 0
);
-- Each moment carries TWO prompts: `prompt` (the video/film scene, required) and
-- `image_prompt` (the still composed onto the try-on image — used later for
-- image generation). image_prompt is optional/nullable.
alter table campaign_moments add column if not exists image_prompt text;

-- Public read for the landing; service-role writes only (admin).
alter table campaigns        enable row level security;
alter table campaign_teams   enable row level security;
alter table campaign_jerseys enable row level security;
alter table campaign_moments enable row level security;
drop policy if exists "public read campaigns"        on campaigns;
drop policy if exists "public read campaign_teams"   on campaign_teams;
drop policy if exists "public read campaign_jerseys" on campaign_jerseys;
drop policy if exists "public read campaign_moments" on campaign_moments;
create policy "public read campaigns"        on campaigns        for select using (true);
create policy "public read campaign_teams"   on campaign_teams   for select using (true);
create policy "public read campaign_jerseys" on campaign_jerseys for select using (true);
create policy "public read campaign_moments" on campaign_moments for select using (true);

-- Additive 'fan' membership tier ($25 / 10 videos) — leaves free/starter/pro intact.
alter table subscriptions drop constraint if exists subscriptions_plan_check;
alter table subscriptions
  add constraint subscriptions_plan_check check (plan in ('free', 'starter', 'pro', 'maison', 'gold', 'fan'));

insert into billing_plans (id, name, tagline, monthly_price, video_limit, features, most_popular, active, sort_order) values
  ('fan', 'Fan Membership', 'Keep every fan video you make.', 25, 10,
     array['10 fan videos / month', 'Every nation & moment', 'HD, without the mark', 'Priority queue'],
     false, false, 5)
on conflict (id) do nothing;

-- Seed the FIFA "Viral Fan" campaign + a starter set of nations + the moments.
-- Jerseys (per-kit products) are attached by admin after adding the jersey
-- products (Pieces tab, campaign_only) — see admin Campaigns.
insert into campaigns (id, title, subtitle, accent) values
  ('fifa-worldcup', 'Viral Fan', 'Be the fan the whole stadium watches', '#F37021')
on conflict (id) do nothing;

insert into campaign_teams (campaign_id, country, accent, flag, sort_order) values
  ('fifa-worldcup', 'USA', '#1F3A93', '🇺🇸', 0),
  ('fifa-worldcup', 'Mexico', '#006341', '🇲🇽', 1),
  ('fifa-worldcup', 'Argentina', '#75AADB', '🇦🇷', 2),
  ('fifa-worldcup', 'Brazil', '#009C3B', '🇧🇷', 3),
  ('fifa-worldcup', 'England', '#C8102E', '🏴', 4),
  ('fifa-worldcup', 'France', '#1A2B6D', '🇫🇷', 5),
  ('fifa-worldcup', 'Germany', '#1A1A1A', '🇩🇪', 6),
  ('fifa-worldcup', 'Spain', '#AA151B', '🇪🇸', 7)
on conflict (campaign_id, country) do nothing;

insert into campaign_moments (campaign_id, label, prompt, sort_order)
select 'fifa-worldcup', label, prompt, ord from (values
  ('Stadium fan cam', 'Stadium fan-cam moment: the subject, wearing the team jersey, jumps and cheers ecstatically in a packed World Cup stadium crowd, scarf raised, broadcast fan-cam look, floodlights, vivid team colours, slow-motion crowd around them.', 0),
  ('Goal celebration', 'Wild goal celebration: the subject in the team jersey roars and runs with arms wide, sliding on their knees on the pitch edge, confetti and floodlights, euphoric stadium crowd behind, cinematic broadcast slow motion.', 1),
  ('VIP box', 'VIP box at the stadium: the subject in the team jersey watches from a luxury hospitality box, glass and city lights behind, poised and proud, elegant broadcast b-roll, golden hour.', 2),
  ('Crowd reaction', 'Crowd reaction wave: the subject in the team jersey leaps up with the crowd in a tense match moment, hands on head then exploding into celebration, authentic fan emotion, stadium floodlights.', 3),
  ('Big screen feature', 'Big-screen feature: the subject in the team jersey appears larger-than-life on the stadium jumbotron as the fan of the match, crowd cheering up at the screen, confident wave, broadcast graphics energy.', 4)
) as m(label, prompt, ord)
where not exists (select 1 from campaign_moments cm where cm.campaign_id = 'fifa-worldcup');

-- De-genericize the subject so the video model preserves the user's identity
-- (a generic "the subject" invites a face swap). Idempotent — also fixes rows
-- seeded before this change. The hard identity-lock preamble is added in code
-- (withIdentityLock, lib/ai/prompts.ts); this just removes the conflicting wording.
update campaign_moments
   set prompt = replace(prompt, 'the subject', 'the person from the photo')
 where campaign_id = 'fifa-worldcup' and prompt like '%the subject%';

-- ═══════════════════════════════════════════════════════════════════════════
-- MIGRATION: admin-editable AI prompts. Idempotent — run as-is.
-- The two core system prompts (try-on image base + video identity-lock) become
-- DB-editable so they can be tuned without a deploy. Read SERVER-SIDE ONLY via
-- the service role (lib/ai/getPrompts.ts) — RLS on, NO policy → not client-
-- readable. Seeds equal the in-code SEED_PROMPTS (lib/ai/prompts.ts), so behavior
-- is unchanged until an admin edits. `{scene}` marks where the per-request scene
-- prompt is injected.
-- ═══════════════════════════════════════════════════════════════════════════
create table if not exists ai_prompts (
  id         text primary key,           -- 'tryon_image' | 'video_identity'
  label      text not null,
  content    text not null,
  updated_at timestamptz not null default now()
);

alter table ai_prompts enable row level security;
-- No select/insert/update/delete policy → only the service role reads/writes.

insert into ai_prompts (id, label, content) values
  ('tryon_image', 'Try-on image (garment placement + identity)',
   'The first image is the person. Every image after it is a reference view of the SAME garment (front/back/detail). Place that garment onto the person, using all the references together to reproduce its exact cut, colour, pattern and details, and preserving the person''s face, hair, body and proportions. Produce a single photorealistic image. {scene}'),
  ('video_identity', 'Video identity-lock (face preservation)',
   'Animate the real person shown in the provided image into a short video. CRITICAL — preserve their identity exactly: keep the same face, facial features, bone structure, skin tone and texture, hair, and body as in the image. Do NOT change, beautify, smooth, slim, restyle, age, swap, or replace the face, and do not alter the garment. Photorealistic and true to life — real skin texture, not airbrushed, plastic, or CGI — with natural, believable human motion and the identity perfectly consistent in every frame. Scene: {scene}'),
  ('spin_scene', '360° spin scene (motion for the turn)',
   'the person performs a 40-degree rotation in place: pausing precisely for 0.5 second, holding the pause with a natural, composed posture. then keep rotating 40-degree in the same direction, pause 0.5 seconds. then rotate back toward the camera and pause precisely for one full second. then they confidently walk to the left and leave off-screen from the side. in Paris Street')
on conflict (id) do nothing;

-- ═══════════════════════════════════════════════════════════════════════════
-- Partner enquiries — brands submitting the "Partner with us" form (/partners).
-- Public INSERT (the form posts via /api/partners); NO select policy → only the
-- service role (admin API) can read them. View + manage under /admin.
-- ═══════════════════════════════════════════════════════════════════════════
create table if not exists partner_leads (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  email      text not null,
  company    text not null,
  message    text,
  status     text not null default 'new' check (status in ('new', 'contacted', 'closed')),
  source_url text,
  created_at timestamptz not null default now()
);

create index if not exists partner_leads_created_idx on partner_leads (created_at desc);

alter table partner_leads enable row level security;

drop policy if exists "public insert partner leads" on partner_leads;
create policy "public insert partner leads"
  on partner_leads for insert
  with check (true);

-- Admin-managed "See your pieces in action" showcase clips for /partners.
-- Singleton row; public read (the URLs render on the public page); writes via
-- the service role only (admin API).
create table if not exists partner_config (
  id            text primary key default 'default',
  showcase_urls text[] not null default '{}',
  updated_at    timestamptz not null default now()
);

insert into partner_config (id) values ('default') on conflict (id) do nothing;

alter table partner_config enable row level security;

drop policy if exists "public read partner config" on partner_config;
create policy "public read partner config"
  on partner_config for select
  using (true);

-- ═══════════════════════════════════════════════════════════════════════════
-- MIGRATION: admin-managed home-page module cards. Idempotent — run as-is.
-- The three "ways to try on yourself" cards (Curator / 360° Try-On / Atelier
-- Scenes) become editable: title, tag, blurb + a background video clip (+poster).
-- Public read (RLS on, select policy); writes via the service role (admin route).
-- Route (/curator, /tryon, /creator), index and CTA label stay code-defined.
-- ═══════════════════════════════════════════════════════════════════════════
create table if not exists home_modules (
  id          text primary key,        -- 'curator' | 'tryon' | 'creator'
  title       text not null,
  tag         text not null,
  blurb       text not null,
  video_url   text,                     -- hosted background clip (mp4)
  poster_url  text,                     -- poster/thumbnail (shown before/without video)
  sort_order  integer not null default 0,
  updated_at  timestamptz not null default now()
);

alter table home_modules enable row level security;
drop policy if exists "public read home modules" on home_modules;
create policy "public read home modules" on home_modules for select using (true);
-- No client write policy → only the service role (admin route) mutates rows.

insert into home_modules (id, title, tag, blurb, sort_order) values
  ('curator', 'OneTap Curator', 'OneTap Try-On',
     'Tap any piece from the houses you love and see it on your own body.', 0),
  ('tryon',   '360° Try-On',    'OneTap TryOn',
     'Upload anything you''re considering and see yourself in it, from every angle.', 1),
  ('creator', 'Atelier Scenes', 'OneTap Creator',
     'Place a piece in the world you''d wear it in — the film situates it in your life.', 2)
on conflict (id) do nothing;

-- ═══════════════════════════════════════════════════════════════════════════
-- MIGRATION: admin-managed home editorial (trending-occasion tiles + house
-- carousel). Idempotent. Singleton config; empty arrays = the home page falls
-- back to auto-derived defaults (occasion imagery from products; top houses by
-- depth). Public read (RLS on); writes via the service role (admin route).
--   occasion_tiles: [{ title, description, occasions, image }]  (occasions = CSV of facet values)
--   house_tiles:    [{ name, image }]  (up to 8; image can be any hosted URL)
-- ═══════════════════════════════════════════════════════════════════════════
create table if not exists home_config (
  id             text primary key default 'default',
  occasion_tiles jsonb not null default '[]'::jsonb,
  house_tiles    jsonb not null default '[]'::jsonb,
  updated_at     timestamptz not null default now()
);

alter table home_config enable row level security;
drop policy if exists "public read home config" on home_config;
create policy "public read home config" on home_config for select using (true);
-- No client write policy → only the service role (admin route) mutates it.

insert into home_config (id) values ('default') on conflict (id) do nothing;

-- ═══════════════════════════════════════════════════════════════════════════
-- MIGRATION: Mailchimp registered-audience once-guard. Idempotent.
-- Flips true the first time we add the user's email to the registered audience
-- (see app/auth/callback), so we don't re-call Mailchimp on every login.
-- ═══════════════════════════════════════════════════════════════════════════
alter table profiles add column if not exists mailchimp_registered boolean not null default false;

-- ═══════════════════════════════════════════════════════════════════════════
-- MIGRATION: free-form profile display name. Idempotent.
-- The profile "Name" field is a display name (spaces/capitals allowed), distinct
-- from the strict, unique `username` handle (set_username). Editable by the user
-- via the "update own profile" RLS policy.
-- ═══════════════════════════════════════════════════════════════════════════
alter table profiles add column if not exists display_name text;
