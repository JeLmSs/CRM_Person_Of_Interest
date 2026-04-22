'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { LayoutDashboard, Shield, Users, BarChart3, ChevronLeft, ChevronRight } from 'lucide-react'

interface AdminSidebarProps {
  displayName: string
}

export default function AdminSidebar({ displayName }: AdminSidebarProps) {
  const [collapsed, setCollapsed] = useState(false)
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const activeTab = searchParams.get('tab')

  const isMetrics = pathname === '/admin' && activeTab !== 'users'
  const isUsers = pathname === '/admin' && activeTab === 'users'

  return (
    <aside
      className={`${collapsed ? 'w-16' : 'w-56'} shrink-0 bg-[#0c0c10] border-r border-zinc-800/60 flex flex-col transition-all duration-200`}
    >
      <div className="flex items-center gap-2 h-16 px-4 border-b border-zinc-800/60">
        <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center shrink-0">
          <Shield className="w-4 h-4 text-white" />
        </div>
        {!collapsed && <span className="font-bold text-white text-sm">Panel Admin</span>}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="ml-auto text-zinc-500 hover:text-white transition-colors"
          aria-label={collapsed ? 'Expandir' : 'Colapsar'}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        <Link
          href="/admin"
          title="Métricas"
          className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
            isMetrics
              ? 'bg-indigo-600/20 text-indigo-300'
              : 'text-zinc-300 hover:text-white hover:bg-zinc-800/60'
          }`}
        >
          <BarChart3 className="w-4 h-4 shrink-0" />
          {!collapsed && 'Métricas'}
        </Link>
        <Link
          href="/admin?tab=users"
          title="Usuarios"
          className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
            isUsers
              ? 'bg-indigo-600/20 text-indigo-300'
              : 'text-zinc-300 hover:text-white hover:bg-zinc-800/60'
          }`}
        >
          <Users className="w-4 h-4 shrink-0" />
          {!collapsed && 'Usuarios'}
        </Link>
        <div className="border-t border-zinc-800/60 my-2" />
        <Link
          href="/dashboard"
          title="Ir a la app"
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-zinc-400 hover:text-white hover:bg-zinc-800/60 transition-colors"
        >
          <LayoutDashboard className="w-4 h-4 shrink-0" />
          {!collapsed && 'Ir a la app'}
        </Link>
      </nav>

      <div className="p-3 border-t border-zinc-800/60">
        <div className="flex items-center gap-2 px-2 py-1.5">
          <div className="w-7 h-7 rounded-full bg-indigo-600/30 border border-indigo-500/30 flex items-center justify-center text-xs font-bold text-indigo-400 shrink-0">
            {displayName.charAt(0).toUpperCase()}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-white truncate">{displayName}</p>
              <p className="text-[10px] text-indigo-400">Administrador</p>
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}
