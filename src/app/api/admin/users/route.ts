import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    if (!profile?.is_admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const admin = createAdminClient()

    // Fetch all profiles
    const { data: profiles } = await admin
      .from('profiles')
      .select('id, email, full_name, created_at, is_admin')
      .order('created_at', { ascending: false })
      .limit(100)

    if (!profiles?.length) {
      return NextResponse.json({ users: [] })
    }

    const userIds = profiles.map((p) => p.id)

    // Fetch counts and last activity in parallel
    const [contactsRes, interactionsRes, aiChatsRes, pageViewsRes] = await Promise.all([
      admin.from('contacts').select('user_id').in('user_id', userIds),
      admin.from('interactions').select('user_id, created_at').in('user_id', userIds),
      admin.from('ai_conversations').select('user_id').in('user_id', userIds),
      admin.from('page_views').select('user_id, created_at').in('user_id', userIds).order('created_at', { ascending: false }),
    ])

    // Aggregate per user
    const contactsCount: Record<string, number> = {}
    for (const row of contactsRes.data || []) {
      contactsCount[row.user_id] = (contactsCount[row.user_id] || 0) + 1
    }

    const interactionsCount: Record<string, number> = {}
    const lastInteraction: Record<string, string> = {}
    for (const row of interactionsRes.data || []) {
      interactionsCount[row.user_id] = (interactionsCount[row.user_id] || 0) + 1
      if (!lastInteraction[row.user_id] || row.created_at > lastInteraction[row.user_id]) {
        lastInteraction[row.user_id] = row.created_at
      }
    }

    const aiChatsCount: Record<string, number> = {}
    for (const row of aiChatsRes.data || []) {
      aiChatsCount[row.user_id] = (aiChatsCount[row.user_id] || 0) + 1
    }

    const lastPageView: Record<string, string> = {}
    for (const row of pageViewsRes.data || []) {
      if (!lastPageView[row.user_id]) lastPageView[row.user_id] = row.created_at
    }

    const users = profiles.map((p) => ({
      id: p.id,
      email: p.email,
      full_name: p.full_name,
      created_at: p.created_at,
      is_admin: p.is_admin,
      contacts_count: contactsCount[p.id] || 0,
      interactions_count: interactionsCount[p.id] || 0,
      ai_chats_count: aiChatsCount[p.id] || 0,
      last_activity: lastPageView[p.id] || lastInteraction[p.id] || p.created_at,
    }))

    return NextResponse.json({ users })
  } catch (err) {
    console.error('Admin users error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
