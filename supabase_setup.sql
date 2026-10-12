-- Oracle Atlas account progress sync (Supabase SQL Editor)
-- Run this once in your Supabase project's SQL Editor.
create table if not exists public.atlas_progress (
  user_id uuid primary key references auth.users(id) on delete cascade,
  state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.atlas_progress enable row level security;

drop policy if exists "Users can read their own Atlas progress" on public.atlas_progress;
create policy "Users can read their own Atlas progress"
  on public.atlas_progress for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own Atlas progress" on public.atlas_progress;
create policy "Users can insert their own Atlas progress"
  on public.atlas_progress for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own Atlas progress" on public.atlas_progress;
create policy "Users can update their own Atlas progress"
  on public.atlas_progress for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
