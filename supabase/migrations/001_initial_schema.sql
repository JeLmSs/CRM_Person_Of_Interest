-- Sphere CRM - Initial Database Schema
-- Multi-user networking CRM for professional relationship management

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================
-- PROFILES (extends Supabase auth.users)
-- ============================================
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  full_name text,
  avatar_url text,
  job_title text,
  company text,
  linkedin_url text,
  timezone text default 'Europe/Madrid',
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- ============================================
-- CONTACTS
-- ============================================
create type contact_tier as enum ('S', 'A', 'B', 'C', 'D');
create type contact_status as enum ('active', 'dormant', 'archived');
create type follow_up_frequency as enum ('daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'custom');

create table public.contacts (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  first_name text not null,
  last_name text,
  email text,
  phone text,
  company text,
  job_title text,
  linkedin_url text,
  linkedin_profile_data jsonb,
  avatar_url text,
  tier contact_tier default 'B' not null,
  status contact_status default 'active' not null,
  follow_up_frequency follow_up_frequency default 'monthly',
  custom_follow_up_days integer,
  last_contact_date timestamptz,
  next_follow_up_date timestamptz,
  relationship_score integer default 50 check (relationship_score >= 0 and relationship_score <= 100),
  city text,
  country text,
  referred_by uuid references public.contacts(id) on delete set null,
  notes text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

alter table public.contacts enable row level security;

create policy "Users can view own contacts"
  on public.contacts for select
  using (auth.uid() = user_id);

create policy "Users can insert own contacts"
  on public.contacts for insert
  with check (auth.uid() = user_id);

create policy "Users can update own contacts"
  on public.contacts for update
  using (auth.uid() = user_id);

create policy "Users can delete own contacts"
  on public.contacts for delete
  using (auth.uid() = user_id);

-- Index for fast queries
create index idx_contacts_user_id on public.contacts(user_id);
create index idx_contacts_tier on public.contacts(user_id, tier);
create index idx_contacts_next_follow_up on public.contacts(user_id, next_follow_up_date);
create index idx_contacts_status on public.contacts(user_id, status);

-- ============================================
-- TAGS (interests, industries, topics)
-- ============================================
create type tag_category as enum ('interest', 'industry', 'skill', 'topic', 'custom');

create table public.tags (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  category tag_category default 'custom',
  color text default '#6366f1',
  created_at timestamptz default now() not null,
  unique(user_id, name)
);

alter table public.tags enable row level security;

create policy "Users can manage own tags"
  on public.tags for all
  using (auth.uid() = user_id);

-- ============================================
-- CONTACT_TAGS (many-to-many)
-- ============================================
create table public.contact_tags (
  contact_id uuid references public.contacts(id) on delete cascade,
  tag_id uuid references public.tags(id) on delete cascade,
  is_positive boolean default true, -- true = interest, false = dislike
  primary key (contact_id, tag_id)
);

alter table public.contact_tags enable row level security;

create policy "Users can manage contact tags"
  on public.contact_tags for all
  using (
    exists (
      select 1 from public.contacts
      where contacts.id = contact_tags.contact_id
      and contacts.user_id = auth.uid()
    )
  );

-- ============================================
-- INTERACTIONS (meetings, calls, emails, etc.)
-- ============================================
create type interaction_type as enum ('meeting', 'call', 'email', 'coffee', 'lunch', 'event', 'linkedin', 'whatsapp', 'other');
create type interaction_sentiment as enum ('very_positive', 'positive', 'neutral', 'negative', 'very_negative');

create table public.interactions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  contact_id uuid references public.contacts(id) on delete cascade not null,
  type interaction_type not null,
  title text not null,
  description text,
  sentiment interaction_sentiment default 'neutral',
  date timestamptz not null,
  duration_minutes integer,
  location text,
  key_takeaways text[],
  action_items text[],
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

alter table public.interactions enable row level security;

create policy "Users can manage own interactions"
  on public.interactions for all
  using (auth.uid() = user_id);

create index idx_interactions_contact on public.interactions(contact_id, date desc);
create index idx_interactions_user_date on public.interactions(user_id, date desc);

-- ============================================
-- FOLLOW_UPS (scheduled reminders)
-- ============================================
create type follow_up_status as enum ('pending', 'completed', 'skipped', 'overdue');

create table public.follow_ups (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  contact_id uuid references public.contacts(id) on delete cascade not null,
  due_date timestamptz not null,
  status follow_up_status default 'pending',
  suggested_topics text[],
  notes text,
  completed_at timestamptz,
  created_at timestamptz default now() not null
);

alter table public.follow_ups enable row level security;

create policy "Users can manage own follow ups"
  on public.follow_ups for all
  using (auth.uid() = user_id);

create index idx_follow_ups_user_date on public.follow_ups(user_id, due_date);
create index idx_follow_ups_status on public.follow_ups(user_id, status);

-- ============================================
-- OUTCOMES (what came from each relationship)
-- ============================================
create type outcome_type as enum ('job_lead', 'introduction', 'advice', 'collaboration', 'referral', 'information', 'opportunity', 'other');

create table public.outcomes (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  contact_id uuid references public.contacts(id) on delete cascade not null,
  interaction_id uuid references public.interactions(id) on delete set null,
  type outcome_type not null,
  title text not null,
  description text,
  value_rating integer check (value_rating >= 1 and value_rating <= 5),
  created_at timestamptz default now() not null
);

alter table public.outcomes enable row level security;

create policy "Users can manage own outcomes"
  on public.outcomes for all
  using (auth.uid() = user_id);

-- ============================================
-- CONVERSATION_TOPICS (suggested talking points)
-- ============================================
create table public.conversation_topics (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  contact_id uuid references public.contacts(id) on delete cascade not null,
  topic text not null,
  source text, -- 'linkedin', 'manual', 'ai_suggested'
  is_used boolean default false,
  created_at timestamptz default now() not null
);

alter table public.conversation_topics enable row level security;

create policy "Users can manage own topics"
  on public.conversation_topics for all
  using (auth.uid() = user_id);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Auto-update updated_at
create or replace function public.update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger contacts_updated_at
  before update on public.contacts
  for each row execute procedure public.update_updated_at();

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.update_updated_at();

create trigger interactions_updated_at
  before update on public.interactions
  for each row execute procedure public.update_updated_at();

-- Calculate next follow-up date
create or replace function public.calculate_next_follow_up(
  p_frequency follow_up_frequency,
  p_custom_days integer default null,
  p_from_date timestamptz default now()
)
returns timestamptz as $$
begin
  return case p_frequency
    when 'daily' then p_from_date + interval '1 day'
    when 'weekly' then p_from_date + interval '7 days'
    when 'biweekly' then p_from_date + interval '14 days'
    when 'monthly' then p_from_date + interval '1 month'
    when 'quarterly' then p_from_date + interval '3 months'
    when 'custom' then p_from_date + (coalesce(p_custom_days, 30) || ' days')::interval
  end;
end;
$$ language plpgsql;

-- Update relationship score based on interactions
create or replace function public.update_relationship_score()
returns trigger as $$
declare
  v_score integer;
  v_days_since_last integer;
  v_interaction_count integer;
  v_positive_count integer;
begin
  -- Count interactions in last 90 days
  select count(*), count(*) filter (where sentiment in ('positive', 'very_positive'))
  into v_interaction_count, v_positive_count
  from public.interactions
  where contact_id = new.contact_id
  and date > now() - interval '90 days';

  -- Days since last contact
  select extract(day from now() - max(date))::integer
  into v_days_since_last
  from public.interactions
  where contact_id = new.contact_id;

  -- Calculate score (0-100)
  v_score := least(100, greatest(0,
    (v_interaction_count * 10) +
    (v_positive_count * 5) -
    (coalesce(v_days_since_last, 90) / 2)
  ));

  -- Update contact
  update public.contacts
  set relationship_score = v_score,
      last_contact_date = new.date,
      next_follow_up_date = public.calculate_next_follow_up(
        follow_up_frequency, custom_follow_up_days, new.date
      )
  where id = new.contact_id;

  return new;
end;
$$ language plpgsql security definer;

create trigger after_interaction_insert
  after insert on public.interactions
  for each row execute procedure public.update_relationship_score();
