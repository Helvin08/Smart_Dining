-- Run this in Supabase SQL Editor

create table if not exists public.orders (
    id text primary key,
    type text not null default 'Dine-In',
    members integer not null default 1,
    items jsonb not null default '[]'::jsonb,
    total integer not null default 0,
    method text not null default 'Cash',
    status text not null default 'Pending',
    order_time text not null default '',
    queue_token text,
    table_number integer,
    created_at timestamptz not null default now()
);

create table if not exists public.queues (
    token text primary key,
    name text not null,
    phone text not null,
    guests integer not null default 1,
    status text not null default 'Waiting',
    created_at timestamptz not null default now()
);

create table if not exists public.reservations (
    id text primary key,
    name text not null,
    booking_date text not null,
    booking_time text not null,
    guests integer not null default 1,
    table_number integer,
    status text not null default 'Confirmed',
    created_at timestamptz not null default now()
);

create index if not exists idx_orders_created_at on public.orders (created_at);
create index if not exists idx_queues_created_at on public.queues (created_at);
create index if not exists idx_reservations_created_at on public.reservations (created_at);

create table if not exists public.users (
    phone text primary key,
    last_login timestamptz not null default now(),
    created_at timestamptz not null default now()
);

-- ==========================================
-- ENABLE REALTIME REPLICATION FOR SYNCING
-- Run these in your Supabase SQL Editor:
-- ==========================================
-- alter publication supabase_realtime add table public.orders;
-- alter publication supabase_realtime add table public.queues;
-- alter publication supabase_realtime add table public.reservations;

-- ==========================================
-- UPGRADE RUNNING DB MIGRATION:
-- Run this in your Supabase SQL Editor if upgrading an existing setup:
-- ==========================================
-- alter table public.reservations add column if not exists table_number integer;
-- alter table public.orders add column if not exists queue_token text;
-- alter table public.orders add column if not exists table_number integer;


