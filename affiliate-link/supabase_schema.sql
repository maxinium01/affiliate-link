create extension if not exists pgcrypto;

create table if not exists links (
  id text primary key,
  platform text not null check (platform in ('lazada','shopee')),
  original_url text not null,
  affiliate_url text not null,
  created_at timestamptz not null default now()
);

create table if not exists click_logs (
  id uuid primary key default gen_random_uuid(),
  link_id text not null references links(id) on delete cascade,
  platform text not null,
  target_url text not null,
  ip text,
  referrer text,
  user_agent text,
  created_at timestamptz not null default now()
);

alter table links enable row level security;
alter table click_logs enable row level security;

create policy "service can do anything on links" on links
  for all to service_role using (true) with check (true);

create policy "service can do anything on click_logs" on click_logs
  for all to service_role using (true) with check (true);
