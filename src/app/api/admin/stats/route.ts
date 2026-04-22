import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  try {
    // Verify caller is an admin
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
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString()
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString()

    // Run all queries in parallel
    const [
      profilesRes,
      newThisMonthRes,
      totalInteractionsRes,
      totalContactsRes,
      recentInteractionsRes,
      pageViewsRes,
      activeUsersRes,
    ] = await Promise.all([
      // Total users
      admin.from('profiles').select('id', { count: 'exact', head: true }),

      // New this month
      admin.from('profiles').select('id', { count: 'exact', head: true })
        .gte('created_at', startOfMonth),

      // Total interactions
      admin.from('interactions').select('id', { count: 'exact', head: true }),

      // Total contacts
      admin.from('contacts').select('id', { count: 'exact', head: true }),

      // Daily interactions (last 30 days) — for active users chart
      admin.from('interactions')
        .select('user_id, date')
        .gte('date', thirtyDaysAgo)
        .order('date', { ascending: true }),

      // Page views by path (last 30 days)
      admin.from('page_views')
        .select('path')
        .gte('created_at', thirtyDaysAgo),

      // Active users last 7 days (via page_views)
      admin.from('page_views')
        .select('user_id')
        .gte('created_at', sevenDaysAgo),
    ])

    // New users per day (last 30 days)
    const { data: newUsersRaw } = await admin
      .from('profiles')
      .select('created_at')
      .gte('created_at', thirtyDaysAgo)
      .order('created_at', { ascending: true })

    // Build daily new users map
    const newUsersPerDay: Record<string, number> = {}
    for (let i = 29; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000)
      newUsersPerDay[d.toISOString().slice(0, 10)] = 0
    }
    for (const row of newUsersRaw || []) {
      const day = row.created_at.slice(0, 10)
      if (day in newUsersPerDay) newUsersPerDay[day]++
    }

    // Build daily active users map (distinct users per day from interactions)
    const dauPerDay: Record<string, Set<string>> = {}
    for (let i = 29; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000)
      dauPerDay[d.toISOString().slice(0, 10)] = new Set()
    }
    for (const row of recentInteractionsRes.data || []) {
      const day = (row.date as string).slice(0, 10)
      if (day in dauPerDay) dauPerDay[day].add(row.user_id as string)
    }

    // Top pages
    const pathCounts: Record<string, number> = {}
    for (const row of pageViewsRes.data || []) {
      pathCounts[row.path] = (pathCounts[row.path] || 0) + 1
    }
    const topPages = Object.entries(pathCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([path, views]) => ({ path, views }))

    // Active users last 7 days (distinct)
    const activeUserIds = new Set((activeUsersRes.data || []).map((r) => r.user_id))

    return NextResponse.json({
      totalUsers: profilesRes.count ?? 0,
      newThisMonth: newThisMonthRes.count ?? 0,
      activeUsers7d: activeUserIds.size,
      totalInteractions: totalInteractionsRes.count ?? 0,
      totalContacts: totalContactsRes.count ?? 0,
      newUsersPerDay: Object.entries(newUsersPerDay).map(([date, count]) => ({ date, count })),
      dauPerDay: Object.entries(dauPerDay).map(([date, set]) => ({ date, count: set.size })),
      topPages,
    })
  } catch (err) {
    console.error('Admin stats error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
