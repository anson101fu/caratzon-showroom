-- Run in Supabase SQL Editor. Customers cannot read orders. Admin access through Supabase Studio.
create table if not exists public.caratzon_orders (
 id uuid primary key default gen_random_uuid(),
 created_at timestamptz not null default now(),
 customer_name text not null,
 contact text not null,
 notes text,
 items jsonb not null,
 total_rub numeric not null,
 exchange_rate numeric not null,
 status text not null default 'new' check(status in ('new','contacted','confirmed','completed','cancelled'))
);
alter table public.caratzon_orders enable row level security;
-- No anonymous policies. Writes must go through a secured server function.
