-- Admin Dashboard Features
-- Adds is_admin flag to profiles and page_views tracking table

-- ============================================
-- ADMIN FLAG ON PROFILES
-- ============================================
alter table public.profiles
  add column if not exists is_admin boolean default false not null;

-- ============================================
-- PAGE VIEWS (for tracking visited pages)
-- ============================================
create table public.page_views (
  id         uuid default uuid_generate_v4() primary key,
  user_id    uuid references public.profiles(id) on delete set null,
  path       text not null,
  created_at timestamptz default now() not null
);

alter table public.page_views enable row level security;

-- Users can only insert their own page views (reads done server-side with service role)
create policy "Users can insert own page views"
  on public.page_views for insert
  with check (auth.uid() = user_id);

create index idx_page_views_created on public.page_views(created_at desc);
create index idx_page_views_path    on public.page_views(path);
create index idx_page_views_user    on public.page_views(user_id);
