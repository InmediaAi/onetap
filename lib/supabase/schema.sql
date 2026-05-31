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
