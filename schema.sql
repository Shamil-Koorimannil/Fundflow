-- Fund Management Web Application PostgreSQL Database Schema
-- Designed for Supabase / Postgres

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. Profiles Table (Users & Roles)
create table if not exists public.profiles (
    id uuid primary key default gen_random_uuid(),
    email text unique not null,
    name text not null,
    role text not null check (role in ('Admin', 'Accountant')),
    created_at timestamptz default now()
);

-- Enable RLS on Profiles
alter table public.profiles enable row level security;

-- 2. Categories Table
create table if not exists public.categories (
    id uuid primary key default gen_random_uuid(),
    name text unique not null,
    description text,
    allocated_amount numeric(15, 2) not null default 0.00,
    current_balance numeric(15, 2) not null default 0.00,
    spent_amount numeric(15, 2) not null default 0.00,
    threshold numeric(5, 2) not null default 20.00, -- percent alert threshold (e.g. 20%)
    is_archived boolean not null default false,
    created_by text not null,
    created_at timestamptz default now()
);

-- Enable RLS on Categories
alter table public.categories enable row level security;

-- 3. Expenses Table
create table if not exists public.expenses (
    id uuid primary key default gen_random_uuid(),
    title text not null,
    amount numeric(15, 2) not null,
    category_id uuid not null references public.categories(id) on delete cascade,
    date date not null default current_date,
    notes text,
    created_by text not null,
    last_modified_by text,
    last_modified_date timestamptz
);

-- Enable RLS on Expenses
alter table public.expenses enable row level security;

-- 4. Funds Log Table
create table if not exists public.funds_log (
    id uuid primary key default gen_random_uuid(),
    category_id uuid not null references public.categories(id) on delete cascade,
    amount numeric(15, 2) not null, -- positive for additions, negative for deductions
    added_by text not null,
    reason text not null,
    date date not null default current_date
);

-- Enable RLS on Funds Log
alter table public.funds_log enable row level security;

-- 5. Recurring Expenses Table
create table if not exists public.recurring_expenses (
    id uuid primary key default gen_random_uuid(),
    title text not null,
    amount numeric(15, 2) not null,
    category_id uuid not null references public.categories(id) on delete cascade,
    frequency text not null check (frequency in ('Daily', 'Weekly', 'Monthly', 'Quarterly', 'Yearly')),
    notes text,
    is_paused boolean not null default false,
    next_due_date date not null,
    created_by text not null,
    created_at timestamptz default now()
);

-- Enable RLS on Recurring Expenses
alter table public.recurring_expenses enable row level security;

-- 6. Audit Logs Table
create table if not exists public.audit_logs (
    id uuid primary key default gen_random_uuid(),
    action text not null,
    user_email text not null,
    timestamp timestamptz not null default now(),
    prev_value jsonb,
    new_value jsonb,
    notes text
);

-- Enable RLS on Audit Logs
alter table public.audit_logs enable row level security;

-- 7. Notifications Table
create table if not exists public.notifications (
    id uuid primary key default gen_random_uuid(),
    type text not null check (type in ('low_balance', 'negative_balance', 'recurring_generated', 'new_funds', 'large_expense')),
    message text not null,
    read boolean not null default false,
    category_id uuid references public.categories(id) on delete cascade,
    created_at timestamptz default now()
);

-- Enable RLS on Notifications
alter table public.notifications enable row level security;


-- ==================== INDEXES FOR PERFORMANCE ====================
create index if not exists idx_expenses_category on public.expenses(category_id);
create index if not exists idx_expenses_date on public.expenses(date);
create index if not exists idx_funds_log_category on public.funds_log(category_id);
create index if not exists idx_recurring_expenses_due on public.recurring_expenses(next_due_date) where is_paused = false;
create index if not exists idx_audit_logs_timestamp on public.audit_logs(timestamp desc);
create index if not exists idx_notifications_unread on public.notifications(read) where read = false;


-- ==================== RLS POLICIES ====================

-- 1. Profiles Policies
create policy "Allow all users to read profiles" on public.profiles
    for select using (true);

create policy "Allow admin to manage profiles" on public.profiles
    for all using (
        exists (
            select 1 from public.profiles 
            where email = auth.jwt()->>'email' and role = 'Admin'
        )
    );

-- 2. Categories Policies
create policy "Allow authenticated users to read categories" on public.categories
    for select using (true);

create policy "Allow Admin and Accountant to manage categories" on public.categories
    for all using (
        exists (
            select 1 from public.profiles
            where email = auth.jwt()->>'email' and role in ('Admin', 'Accountant')
        )
    );

-- 3. Expenses Policies
create policy "Allow authenticated users to read expenses" on public.expenses
    for select using (true);

create policy "Allow Admin and Accountant to manage expenses" on public.expenses
    for all using (
        exists (
            select 1 from public.profiles
            where email = auth.jwt()->>'email' and role in ('Admin', 'Accountant')
        )
    );

-- 4. Funds Log Policies
create policy "Allow authenticated users to read funds log" on public.funds_log
    for select using (true);

create policy "Allow Admin and Accountant to manage funds log" on public.funds_log
    for all using (
        exists (
            select 1 from public.profiles
            where email = auth.jwt()->>'email' and role in ('Admin', 'Accountant')
        )
    );

-- 5. Recurring Expenses Policies
create policy "Allow authenticated users to read recurring" on public.recurring_expenses
    for select using (true);

create policy "Allow Admin to manage recurring" on public.recurring_expenses
    for all using (
        exists (
            select 1 from public.profiles
            where email = auth.jwt()->>'email' and role = 'Admin'
        )
    );

-- 6. Audit Logs Policies
create policy "Allow authenticated users to read audit logs" on public.audit_logs
    for select using (true);

create policy "Allow authenticated users to insert audit logs" on public.audit_logs
    for insert with check (true);

-- 7. Notifications Policies
create policy "Allow authenticated users to manage notifications" on public.notifications
    for all using (true);


-- ==================== SEED INITIAL DATA ====================

-- Seed Profiles
insert into public.profiles (email, name, role) values
('zywo.in@gmail.com', 'System Admin', 'Admin'),
('muhammedshamil251@gmail.com', 'Finance Accountant', 'Accountant')
on conflict (email) do update set role = excluded.role, name = excluded.name;

-- Seed Categories
insert into public.categories (name, description, allocated_amount, current_balance, spent_amount, threshold, created_by) values
('Shooting', 'Video production and shooting costs', 13140.00, 13140.00, 0.00, 20.00, 'zywo.in@gmail.com'),
('Rent', 'Monthly office rent payment', 4500.00, 4500.00, 0.00, 20.00, 'zywo.in@gmail.com'),
('Wifi', 'Office internet subscription', 850.00, 850.00, 0.00, 20.00, 'zywo.in@gmail.com'),
('Current Bill', 'Electricity utility bills', 3000.00, 3000.00, 0.00, 20.00, 'zywo.in@gmail.com'),
('Ad Budget', 'Marketing and advertising budget', 8000.00, 8000.00, 0.00, 20.00, 'zywo.in@gmail.com'),
('Zoho', 'Zoho Books and Suite subscription', 1060.82, 1060.82, 0.00, 20.00, 'zywo.in@gmail.com'),
('Water', 'Drinking water supplier delivery charges', 160.00, 160.00, 0.00, 20.00, 'zywo.in@gmail.com'),
('Cleaning', 'Office janitorial and cleaning supplies', 350.00, 350.00, 0.00, 20.00, 'zywo.in@gmail.com'),
('Client Meeting', 'Business meals and client engagements', 3000.00, 3000.00, 0.00, 20.00, 'zywo.in@gmail.com')
on conflict (name) do nothing;
