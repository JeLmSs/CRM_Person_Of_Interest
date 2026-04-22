import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import AdminSidebar from './admin-sidebar'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin, full_name, email')
    .eq('id', user.id)
    .single()

  if (!profile?.is_admin) {
    redirect('/dashboard')
  }

  const displayName = profile.full_name || profile.email || 'Admin'

  return (
    <div className="flex h-screen overflow-hidden bg-[#09090b]">
      <Suspense fallback={
        <aside className="w-56 shrink-0 bg-[#0c0c10] border-r border-zinc-800/60" />
      }>
        <AdminSidebar displayName={displayName} />
      </Suspense>

      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
