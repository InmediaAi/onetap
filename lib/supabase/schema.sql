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
