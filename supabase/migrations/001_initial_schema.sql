-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================
-- users (extends auth.users)
-- ============================================================
create table public.users (
  id uuid references auth.users(id) on delete cascade primary key,
  email text not null,
  name text,
  company_name text,
  stripe_customer_id text,
  plan text not null default 'trial' check (plan in ('trial','early_access','standard','cancelled')),
  trial_ends_at timestamptz default (now() + interval '7 days'),
  created_at timestamptz not null default now()
);

alter table public.users enable row level security;
create policy "Users can read own record" on public.users for select using (auth.uid() = id);
create policy "Users can update own record" on public.users for update using (auth.uid() = id);

-- ============================================================
-- workspaces
-- ============================================================
create table public.workspaces (
  id uuid primary key default uuid_generate_v4(),
  owner_user_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

alter table public.workspaces enable row level security;
create policy "Owner can access workspace" on public.workspaces for all using (auth.uid() = owner_user_id);

-- ============================================================
-- clients
-- ============================================================
create table public.clients (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  email text not null,
  phone text,
  company text,
  created_at timestamptz not null default now()
);

alter table public.clients enable row level security;
create policy "Workspace owner can access clients" on public.clients for all
  using (exists (select 1 from public.workspaces w where w.id = workspace_id and w.owner_user_id = auth.uid()));

-- ============================================================
-- invoices
-- ============================================================
create table public.invoices (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete restrict,
  invoice_number text not null,
  amount_cents integer not null check (amount_cents > 0),
  currency text not null default 'USD',
  due_date date not null,
  status text not null default 'sent' check (status in ('draft','sent','overdue','partial','paid','cancelled')),
  source text not null default 'manual' check (source in ('manual','quickbooks','freshbooks')),
  source_id text,
  notes text,
  follow_up_paused boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(workspace_id, source, source_id)
);

alter table public.invoices enable row level security;
create policy "Workspace owner can access invoices" on public.invoices for all
  using (exists (select 1 from public.workspaces w where w.id = workspace_id and w.owner_user_id = auth.uid()));

-- Auto-update updated_at
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;
create trigger invoices_updated_at before update on public.invoices
  for each row execute function update_updated_at();

-- ============================================================
-- follow_up_sequences
-- ============================================================
create table public.follow_up_sequences (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.follow_up_sequences enable row level security;
create policy "Workspace owner can access sequences" on public.follow_up_sequences for all
  using (exists (select 1 from public.workspaces w where w.id = workspace_id and w.owner_user_id = auth.uid()));

-- ============================================================
-- follow_up_steps
-- ============================================================
create table public.follow_up_steps (
  id uuid primary key default uuid_generate_v4(),
  sequence_id uuid not null references public.follow_up_sequences(id) on delete cascade,
  step_order integer not null,
  days_after_due integer not null check (days_after_due >= 0),
  tone text not null check (tone in ('friendly','firm','final')),
  subject_template text not null,
  body_template text not null,
  unique(sequence_id, step_order)
);

alter table public.follow_up_steps enable row level security;
create policy "Workspace owner can access steps" on public.follow_up_steps for all
  using (exists (
    select 1 from public.follow_up_sequences s
    join public.workspaces w on w.id = s.workspace_id
    where s.id = sequence_id and w.owner_user_id = auth.uid()
  ));

-- ============================================================
-- follow_up_attempts
-- ============================================================
create table public.follow_up_attempts (
  id uuid primary key default uuid_generate_v4(),
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  step_id uuid not null references public.follow_up_steps(id) on delete restrict,
  scheduled_at timestamptz not null,
  sent_at timestamptz,
  status text not null default 'scheduled'
    check (status in ('scheduled','sent','delivered','opened','clicked','failed','skipped')),
  resend_message_id text,
  error text,
  created_at timestamptz not null default now()
);

alter table public.follow_up_attempts enable row level security;
create policy "Workspace owner can access attempts" on public.follow_up_attempts for all
  using (exists (
    select 1 from public.invoices i
    join public.workspaces w on w.id = i.workspace_id
    where i.id = invoice_id and w.owner_user_id = auth.uid()
  ));

-- ============================================================
-- integrations
-- ============================================================
create table public.integrations (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  provider text not null check (provider in ('quickbooks','freshbooks')),
  access_token_encrypted text not null,
  refresh_token_encrypted text not null,
  token_expires_at timestamptz,
  realm_id text,
  last_synced_at timestamptz,
  status text not null default 'active' check (status in ('active','expired','disconnected')),
  created_at timestamptz not null default now(),
  unique(workspace_id, provider)
);

alter table public.integrations enable row level security;
create policy "Workspace owner can access integrations" on public.integrations for all
  using (exists (select 1 from public.workspaces w where w.id = workspace_id and w.owner_user_id = auth.uid()));

-- ============================================================
-- Function: auto-create user + workspace + default sequence on signup
-- ============================================================
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
declare
  workspace_id uuid;
  sequence_id uuid;
begin
  -- Create user record
  insert into public.users (id, email, name)
  values (new.id, new.email, new.raw_user_meta_data->>'name');

  -- Create default workspace
  insert into public.workspaces (owner_user_id, name)
  values (new.id, coalesce(new.raw_user_meta_data->>'company_name', 'My Business'))
  returning id into workspace_id;

  -- Create default follow-up sequence
  insert into public.follow_up_sequences (workspace_id, name, is_default)
  values (workspace_id, 'Default Sequence', true)
  returning id into sequence_id;

  -- Pre-load 3 default steps (CEO-approved: Day 1 friendly, Day 7 firm, Day 14 final)
  insert into public.follow_up_steps (sequence_id, step_order, days_after_due, tone, subject_template, body_template) values
  (sequence_id, 1, 1, 'friendly',
   'Friendly reminder: Invoice {{invoice_number}} due',
   'Hi {{client_name}},

Just a friendly reminder that invoice {{invoice_number}} for {{amount}} was due on {{due_date}}.

If you''ve already sent payment, please disregard this message. Otherwise, you can pay at your earliest convenience.

Thank you,
{{sender_name}}'),

  (sequence_id, 2, 7, 'firm',
   'Invoice {{invoice_number}} is now 7 days past due',
   'Hi {{client_name}},

Invoice {{invoice_number}} for {{amount}} is now 7 days overdue (due date: {{due_date}}).

We''d appreciate prompt payment to keep your account in good standing. Please let us know if you have any questions.

Best,
{{sender_name}}'),

  (sequence_id, 3, 14, 'final',
   'FINAL NOTICE: Invoice {{invoice_number}} — action required',
   'Hi {{client_name}},

This is a final notice regarding invoice {{invoice_number}} for {{amount}}, which is now {{days_overdue}} days past due.

Please arrange payment immediately to avoid further action. If you''re experiencing difficulties, please contact us directly to discuss options.

{{sender_name}}');

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
