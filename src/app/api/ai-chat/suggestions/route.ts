import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { buildContactSuggestions, buildGeneralSuggestions } from '@/lib/ai/suggestions'
import { loadGeneralCtx } from '@/lib/ai/chat-context'

export async function GET(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ suggestions: [] })

  const contactId = req.nextUrl.searchParams.get('contact_id')

  if (contactId) {
    const [contactRes, interactionsRes, tagsRes] = await Promise.all([
      supabase.from('contacts')
        .select('first_name, last_name, job_title, company, next_follow_up_date, last_contact_date, tier')
        .eq('id', contactId).eq('user_id', user.id).single(),
      supabase.from('interactions')
        .select('date, title, sentiment')
        .eq('contact_id', contactId)
        .order('date', { ascending: false })
        .limit(5),
      supabase.from('contact_tags')
        .select('is_positive, tags(name)')
        .eq('contact_id', contactId),
    ])

    if (!contactRes.data) return NextResponse.json({ suggestions: [] })
    const tags = (tagsRes.data || []) as unknown as Parameters<typeof buildContactSuggestions>[2]
    const suggestions = buildContactSuggestions(contactRes.data, interactionsRes.data || [], tags)
    return NextResponse.json({ suggestions })
  }

  const ctx = await loadGeneralCtx(supabase, user.id)
  const suggestions = buildGeneralSuggestions({
    totalActive: ctx.totalActive,
    tierCounts: ctx.tierCounts,
    staleCount: ctx.staleCount,
    pendingFollowUpsThisWeek: ctx.pendingFollowUpsThisWeek,
    recentInteractions30d: ctx.recentInteractions30d,
    topInterests: ctx.topInterests,
    topCompanies: ctx.topCompanies,
  })
  return NextResponse.json({ suggestions })
}
