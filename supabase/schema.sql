create table if not exists public.users (
  id text primary key,
  uid text not null,
  email text,
  display_name text,
  role text,
  created_at bigint,
  updated_at bigint,
  raw jsonb default '{}'::jsonb
);

create table if not exists public.expenses (
  id text primary key,
  user_id text,
  user_name text,
  amount numeric,
  currency text,
  category text,
  description text,
  expense_date text,
  month_key text,
  status text,
  rejection_reason text,
  receipt_data text,
  receipt_type text,
  branch_id text,
  route text,
  plate_number text,
  liter numeric,
  liter_price numeric,
  created_at bigint,
  updated_at bigint,
  raw jsonb default '{}'::jsonb
);

create table if not exists public.route_plans (
  id text primary key,
  title text,
  route_date text,
  start_location text,
  end_location text,
  stops text,
  assigned_user_id text,
  assigned_user_name text,
  status text,
  notes text,
  created_by_id text,
  created_by_name text,
  created_at bigint,
  updated_at bigint,
  raw jsonb default '{}'::jsonb
);

create table if not exists public.meeting_notes (
  id text primary key,
  title text,
  meeting_date text,
  attendees text,
  note text,
  created_by_id text,
  created_by_name text,
  created_at bigint,
  updated_at bigint,
  raw jsonb default '{}'::jsonb
);

create table if not exists public.promotions_campaigns (
  id text primary key,
  title text,
  type text,
  details text,
  start_date text,
  end_date text,
  target_audience text,
  budget numeric,
  discount_rate numeric,
  is_active boolean default false,
  created_by_id text,
  created_by_name text,
  created_at bigint,
  updated_at bigint,
  raw jsonb default '{}'::jsonb
);

create table if not exists public.personnel_targets (
  id text primary key,
  user_id text not null,
  user_name text,
  title text not null,
  description text,
  metric_unit text,
  target_value numeric not null,
  current_value numeric,
  start_date text not null,
  end_date text not null,
  is_active boolean default true,
  created_by_id text,
  created_by_name text,
  created_at bigint,
  updated_at bigint,
  raw jsonb default '{}'::jsonb
);

create table if not exists public.personnel_sales (
  id text primary key,
  user_id text not null,
  user_name text,
  sale_date text not null,
  amount numeric not null default 0,
  note text,
  created_at bigint,
  updated_at bigint,
  raw jsonb default '{}'::jsonb
);

create index if not exists idx_expenses_user_id on public.expenses (user_id);
create index if not exists idx_expenses_month_key on public.expenses (month_key);
create index if not exists idx_route_plans_assigned_user_id on public.route_plans (assigned_user_id);
create index if not exists idx_meeting_notes_meeting_date on public.meeting_notes (meeting_date);
create index if not exists idx_promotions_campaigns_is_active on public.promotions_campaigns (is_active);
create index if not exists idx_personnel_targets_user_id on public.personnel_targets (user_id);
create index if not exists idx_personnel_targets_is_active on public.personnel_targets (is_active);
create index if not exists idx_personnel_sales_user_id on public.personnel_sales (user_id);
create index if not exists idx_personnel_sales_sale_date on public.personnel_sales (sale_date);
create unique index if not exists uq_personnel_sales_user_date on public.personnel_sales (user_id, sale_date);
