'use client'

import { createClient } from './client'
import { Contact, Interaction, FollowUp, Tag, Outcome, ConversationTopic } from '../types/database'
import { generateFullDemoDataSet } from '../demo-data'

export async function getDemoModeState(userId: string): Promise<{ demo_mode: boolean; demo_seed: number | null }> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('profiles')
    .select('demo_mode, demo_seed')
    .eq('id', userId)
    .single()

  if (error || !data) {
    return { demo_mode: false, demo_seed: null }
  }

  return { demo_mode: data.demo_mode || false, demo_seed: data.demo_seed || null }
}

export async function loadContacts(userId: string): Promise<Contact[]> {
  const { demo_mode, demo_seed } = await getDemoModeState(userId)

  if (demo_mode && demo_seed) {
    const demoData = generateFullDemoDataSet(demo_seed, userId)
    return demoData.contacts
  }

  const supabase = createClient()
  const { data, error } = await supabase
    .from('contacts')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error loading contacts:', error)
    return []
  }

  return data || []
}

export async function loadInteractions(userId: string): Promise<Interaction[]> {
  const { demo_mode, demo_seed } = await getDemoModeState(userId)

  if (demo_mode && demo_seed) {
    const demoData = generateFullDemoDataSet(demo_seed, userId)
    return demoData.interactions
  }

  const supabase = createClient()
  const { data, error } = await supabase
    .from('interactions')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false })

  if (error) {
    console.error('Error loading interactions:', error)
    return []
  }

  return data || []
}

export async function loadFollowUps(userId: string): Promise<FollowUp[]> {
  const { demo_mode, demo_seed } = await getDemoModeState(userId)

  if (demo_mode && demo_seed) {
    const demoData = generateFullDemoDataSet(demo_seed, userId)
    return demoData.followUps
  }

  const supabase = createClient()
  const { data, error } = await supabase
    .from('follow_ups')
    .select('*')
    .eq('user_id', userId)
    .order('due_date', { ascending: true })

  if (error) {
    console.error('Error loading follow-ups:', error)
    return []
  }

  return data || []
}

export async function loadTags(userId: string): Promise<Tag[]> {
  const { demo_mode, demo_seed } = await getDemoModeState(userId)

  if (demo_mode && demo_seed) {
    const demoData = generateFullDemoDataSet(demo_seed, userId)
    return demoData.tags
  }

  const supabase = createClient()
  const { data, error } = await supabase
    .from('tags')
    .select('*')
    .eq('user_id', userId)

  if (error) {
    console.error('Error loading tags:', error)
    return []
  }

  return data || []
}

export async function loadOutcomes(userId: string): Promise<Outcome[]> {
  const { demo_mode, demo_seed } = await getDemoModeState(userId)

  if (demo_mode && demo_seed) {
    const demoData = generateFullDemoDataSet(demo_seed, userId)
    return demoData.outcomes
  }

  const supabase = createClient()
  const { data, error } = await supabase
    .from('outcomes')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error loading outcomes:', error)
    return []
  }

  return data || []
}

export async function loadConversationTopics(userId: string): Promise<ConversationTopic[]> {
  const { demo_mode, demo_seed } = await getDemoModeState(userId)

  if (demo_mode && demo_seed) {
    const demoData = generateFullDemoDataSet(demo_seed, userId)
    return demoData.topics
  }

  const supabase = createClient()
  const { data, error } = await supabase
    .from('conversation_topics')
    .select('*')
    .eq('user_id', userId)

  if (error) {
    console.error('Error loading conversation topics:', error)
    return []
  }

  return data || []
}

export async function setDemoMode(userId: string, enabled: boolean): Promise<boolean> {
  const supabase = createClient()
  const demo_seed = enabled ? Date.now() : null

  const { error } = await supabase
    .from('profiles')
    .update({ demo_mode: enabled, demo_seed })
    .eq('id', userId)

  if (error) {
    console.error('Error updating demo mode:', error)
    return false
  }

  return true
}
