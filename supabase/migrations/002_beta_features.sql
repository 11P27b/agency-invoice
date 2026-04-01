-- ============================================================
-- 002_beta_features.sql
-- Adds welcome email tracking and beta feedback responses
-- ============================================================

-- Track whether the welcome email has been sent for each user
alter table public.users
  add column if not exists welcome_email_sent boolean not null default false;

-- ============================================================
-- feedback_responses
-- Stores beta customer feedback (NPS + qualitative)
-- ============================================================
create table public.feedback_responses (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  nps_score integer not null check (nps_score between 1 and 10),
  what_works_well text,
  what_is_frustrating text,
  what_would_drive_referral text,
  created_at timestamptz not null default now()
);

alter table public.feedback_responses enable row level security;
create policy "Users can insert own feedback" on public.feedback_responses
  for insert with check (auth.uid() = user_id);
create policy "Users can read own feedback" on public.feedback_responses
  for select using (auth.uid() = user_id);
