export type ContactTier = 'S' | 'A' | 'B' | 'C' | 'D'
export type ContactStatus = 'active' | 'dormant' | 'archived'
export type FollowUpFrequency = 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'custom'
export type InteractionType = 'meeting' | 'call' | 'email' | 'coffee' | 'lunch' | 'event' | 'linkedin' | 'whatsapp' | 'other'
export type InteractionSentiment = 'very_positive' | 'positive' | 'neutral' | 'negative' | 'very_negative'
export type FollowUpStatus = 'pending' | 'completed' | 'skipped' | 'overdue'
export type TagCategory = 'interest' | 'industry' | 'skill' | 'topic' | 'custom'
export type OutcomeType = 'job_lead' | 'introduction' | 'advice' | 'collaboration' | 'referral' | 'information' | 'opportunity' | 'other'

export interface Profile {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  job_title: string | null
  company: string | null
  linkedin_url: string | null
  timezone: string
  created_at: string
  updated_at: string
}

export interface Contact {
  id: string
  user_id: string
  first_name: string
  last_name: string | null
  email: string | null
  phone: string | null
  company: string | null
  job_title: string | null
  linkedin_url: string | null
  linkedin_profile_data: Record<string, unknown> | null
  avatar_url: string | null
  tier: ContactTier
  status: ContactStatus
  follow_up_frequency: FollowUpFrequency
  custom_follow_up_days: number | null
  last_contact_date: string | null
  next_follow_up_date: string | null
  relationship_score: number
  city: string | null
  country: string | null
  referred_by: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface Tag {
  id: string
  user_id: string
  name: string
  category: TagCategory
  color: string
  created_at: string
}

export interface ContactTag {
  contact_id: string
  tag_id: string
  is_positive: boolean
}

export interface Interaction {
  id: string
  user_id: string
  contact_id: string
  type: InteractionType
  title: string
  description: string | null
  sentiment: InteractionSentiment
  date: string
  duration_minutes: number | null
  location: string | null
  key_takeaways: string[] | null
  action_items: string[] | null
  created_at: string
  updated_at: string
}

export interface FollowUp {
  id: string
  user_id: string
  contact_id: string
  due_date: string
  status: FollowUpStatus
  suggested_topics: string[] | null
  notes: string | null
  completed_at: string | null
  created_at: string
}

export interface Outcome {
  id: string
  user_id: string
  contact_id: string
  interaction_id: string | null
  type: OutcomeType
  title: string
  description: string | null
  value_rating: number | null
  created_at: string
}

export interface ConversationTopic {
  id: string
  user_id: string
  contact_id: string
  topic: string
  source: string | null
  is_used: boolean
  created_at: string
}

// Supabase Database type
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: Partial<Profile> & { id: string; email: string }
        Update: Partial<Profile>
        Relationships: []
      }
      contacts: {
        Row: Contact
        Insert: Omit<Partial<Contact> & { user_id: string; first_name: string }, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Contact, 'id' | 'created_at' | 'updated_at'>>
        Relationships: []
      }
      tags: {
        Row: Tag
        Insert: Omit<Partial<Tag> & { user_id: string; name: string }, 'id' | 'created_at'>
        Update: Partial<Tag>
        Relationships: []
      }
      contact_tags: {
        Row: ContactTag
        Insert: ContactTag
        Update: Partial<ContactTag>
        Relationships: []
      }
      interactions: {
        Row: Interaction
        Insert: Omit<Partial<Interaction> & { user_id: string; contact_id: string; type: InteractionType; title: string; date: string }, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Interaction>
        Relationships: []
      }
      follow_ups: {
        Row: FollowUp
        Insert: Omit<Partial<FollowUp> & { user_id: string; contact_id: string; due_date: string }, 'id' | 'created_at'>
        Update: Partial<FollowUp>
        Relationships: []
      }
      outcomes: {
        Row: Outcome
        Insert: Omit<Partial<Outcome> & { user_id: string; contact_id: string; type: OutcomeType; title: string }, 'id' | 'created_at'>
        Update: Partial<Outcome>
        Relationships: []
      }
      conversation_topics: {
        Row: ConversationTopic
        Insert: Omit<Partial<ConversationTopic> & { user_id: string; contact_id: string; topic: string }, 'id' | 'created_at'>
        Update: Partial<ConversationTopic>
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
