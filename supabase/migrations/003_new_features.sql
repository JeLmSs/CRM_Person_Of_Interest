-- Migration 003: New features
-- 1. 'annually' follow-up frequency
-- 2. Relationship score starts at 0, progressive formula
-- 3. work_history table
-- 4. ai_conversations table

-- ============================================
-- 1. ADD 'annually' TO follow_up_frequency ENUM
-- ============================================
alter type follow_up_frequency add value if not exists 'annually';

-- ============================================
-- 2. SCORE STARTS AT 0 FOR NEW CONTACTS
-- ============================================
alter table public.contacts alter column relationship_score set default 0;

-- ============================================
-- 3. UPDATE calculate_next_follow_up FOR annually
-- ============================================
create or replace function public.calculate_next_follow_up(
  p_frequency follow_up_frequency,
  p_custom_days integer default null,
  p_from_date timestamptz default now()
)
returns timestamptz as $$
begin
  return case p_frequency
    when 'daily'     then p_from_date + interval '1 day'
    when 'weekly'    then p_from_date + interval '7 days'
    when 'biweekly'  then p_from_date + interval '14 days'
    when 'monthly'   then p_from_date + interval '1 month'
    when 'quarterly' then p_from_date + interval '3 months'
    when 'annually'  then p_from_date + interval '1 year'
    when 'custom'    then p_from_date + (coalesce(p_custom_days, 30) || ' days')::interval
  end;
end;
$$ language plpgsql;

-- ============================================
-- 4. NEW PROGRESSIVE SCORE FORMULA
-- Profile (0-25) + Interactions (0-75) = max 100
-- Starts at 0, grows with profile completeness and interactions
-- ============================================
create or replace function public.recalculate_contact_score(p_contact_id uuid)
returns void as $$
declare
  v_profile_score  integer := 0;
  v_freq_score     integer := 0;
  v_recency_score  integer := 0;
  v_sentiment_score integer := 0;
  v_interaction_count_90d integer := 0;
  v_positive_count integer := 0;
  v_days_since_last integer;
  v_total integer;
begin
  -- Profile completeness (max 25)
  select
    (case when email is not null then 5 else 0 end) +
    (case when phone is not null then 4 else 0 end) +
    (case when company is not null then 5 else 0 end) +
    (case when job_title is not null then 3 else 0 end) +
    (case when linkedin_url is not null then 5 else 0 end) +
    (case when city is not null or country is not null then 3 else 0 end)
  into v_profile_score
  from public.contacts
  where id = p_contact_id;

  -- Interactions in last 90 days and positive count
  select
    count(*),
    count(*) filter (where sentiment in ('positive', 'very_positive'))
  into v_interaction_count_90d, v_positive_count
  from public.interactions
  where contact_id = p_contact_id
    and date > now() - interval '90 days';

  -- Days since last interaction ever
  select extract(day from now() - max(date))::integer
  into v_days_since_last
  from public.interactions
  where contact_id = p_contact_id;

  -- Interaction frequency score (0-35): 7 pts each, max 5 interactions
  v_freq_score := least(35, v_interaction_count_90d * 7);

  -- Recency score (0-25)
  v_recency_score := case
    when v_days_since_last is null then 0
    when v_days_since_last <= 7  then 25
    when v_days_since_last <= 14 then 20
    when v_days_since_last <= 30 then 12
    when v_days_since_last <= 60 then 5
    else 0
  end;

  -- Sentiment score (0-15): 2 pts per positive interaction in last 90d
  v_sentiment_score := least(15, v_positive_count * 2);

  v_total := least(100, greatest(0,
    coalesce(v_profile_score, 0) +
    v_freq_score +
    v_recency_score +
    v_sentiment_score
  ));

  update public.contacts
  set relationship_score = v_total
  where id = p_contact_id;
end;
$$ language plpgsql security definer;

-- Update interaction trigger to use new shared function
create or replace function public.update_relationship_score()
returns trigger as $$
begin
  update public.contacts
  set last_contact_date = new.date,
      next_follow_up_date = public.calculate_next_follow_up(
        follow_up_frequency, custom_follow_up_days, new.date
      )
  where id = new.contact_id;

  perform public.recalculate_contact_score(new.contact_id);
  return new;
end;
$$ language plpgsql security definer;

-- Trigger: recalculate score when relevant profile fields change
create or replace function public.update_score_on_contact_profile_change()
returns trigger as $$
begin
  -- Prevent recursive trigger from score update itself
  if pg_trigger_depth() > 1 then return new; end if;
  perform public.recalculate_contact_score(new.id);
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists contacts_score_update on public.contacts;
create trigger contacts_score_update
  after update of email, phone, company, job_title, linkedin_url, city, country
  on public.contacts
  for each row execute procedure public.update_score_on_contact_profile_change();

-- ============================================
-- 5. WORK HISTORY TABLE
-- ============================================
create table if not exists public.work_history (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  contact_id uuid references public.contacts(id) on delete cascade not null,
  company text not null,
  job_title text,
  start_date date,
  end_date date,
  is_current boolean default false,
  notes text,
  created_at timestamptz default now() not null
);

alter table public.work_history enable row level security;

create policy "Users can manage own work history"
  on public.work_history for all
  using (auth.uid() = user_id);

create index if not exists idx_work_history_contact on public.work_history(contact_id, created_at desc);

-- ============================================
-- 6. AI CONVERSATIONS TABLE
-- ============================================
create table if not exists public.ai_conversations (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  contact_id uuid references public.contacts(id) on delete cascade not null,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz default now() not null
);

alter table public.ai_conversations enable row level security;

create policy "Users can manage own ai conversations"
  on public.ai_conversations for all
  using (auth.uid() = user_id);

create index if not exists idx_ai_conversations_contact on public.ai_conversations(contact_id, created_at asc);
