'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  Globe,
  LayoutDashboard,
  Users,
  Calendar,
  Link as LinkIcon,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/lib/supabase/hooks'

const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard, href: '/dashboard', badge: '3' },
  { label: 'Contactos', icon: Users, href: '/contacts' },
  { label: 'Calendario', icon: Calendar, href: '/calendar' },
  { label: 'LinkedIn', icon: LinkIcon, href: '/linkedin' },
  { label: 'Configuracion', icon: Settings, href: '/settings' },
]

interface SidebarProps {
  open: boolean
  onClose: () => void
}

export default function Sidebar({ open, onClose }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const { user } = useUser()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const displayName =
    user?.user_metadata?.full_name ||
    user?.email?.split('@')[0] ||
    'Usuario'

  const avatarInitial = displayName.charAt(0).toUpperCase()

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden transition-opacity duration-300"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 z-50 h-full bg-[#0c0c10] border-r border-zinc-800/60
          flex flex-col transition-all duration-300 ease-in-out
          ${collapsed ? 'lg:w-[72px]' : 'lg:w-64'}
          ${open ? 'w-64 translate-x-0' : '-translate-x-full'}
          lg:translate-x-0 lg:static lg:z-auto
        `}
      >
        {/* Logo / Branding */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-zinc-800/60 shrink-0">
          <Link href="/dashboard" className="flex items-center gap-3 overflow-hidden">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-600 shrink-0">
              <Globe className="w-4.5 h-4.5 text-white" />
            </div>
            <span
              className={`
                text-lg font-semibold text-white whitespace-nowrap
                transition-opacity duration-200
                ${collapsed ? 'lg:opacity-0 lg:w-0' : 'opacity-100'}
              `}
            >
              Sphere
            </span>
          </Link>

          {/* Collapse toggle (desktop only) */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:flex items-center justify-center w-7 h-7 rounded-md
              text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors duration-150"
            aria-label={collapsed ? 'Expandir barra lateral' : 'Colapsar barra lateral'}
          >
            {collapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== '/dashboard' && pathname.startsWith(item.href))
            const Icon = item.icon

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => onClose()}
                className={`
                  group relative flex items-center gap-3 px-3 py-2.5 rounded-lg
                  text-sm font-medium transition-all duration-150
                  ${
                    isActive
                      ? 'bg-indigo-500/15 text-white'
                      : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
                  }
                `}
              >
                {/* Active indicator bar */}
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-indigo-500" />
                )}

                <Icon
                  className={`w-5 h-5 shrink-0 transition-colors duration-150 ${
                    isActive ? 'text-indigo-400' : 'text-zinc-500 group-hover:text-zinc-300'
                  }`}
                />

                <span
                  className={`
                    whitespace-nowrap transition-opacity duration-200
                    ${collapsed ? 'lg:opacity-0 lg:w-0 lg:overflow-hidden' : 'opacity-100'}
                  `}
                >
                  {item.label}
                </span>

                {/* Badge */}
                {item.badge && (
                  <span
                    className={`
                      ml-auto flex items-center justify-center h-5 min-w-[20px] px-1.5
                      rounded-full bg-indigo-500 text-[11px] font-semibold text-white
                      transition-opacity duration-200
                      ${collapsed ? 'lg:absolute lg:top-0.5 lg:right-0.5 lg:ml-0 lg:h-4 lg:min-w-[16px] lg:px-1 lg:text-[9px]' : ''}
                    `}
                  >
                    {item.badge}
                  </span>
                )}

                {/* Tooltip for collapsed state */}
                {collapsed && (
                  <span
                    className="
                      hidden lg:block absolute left-full ml-3 px-2.5 py-1.5 rounded-md
                      bg-zinc-800 text-white text-xs font-medium whitespace-nowrap
                      opacity-0 group-hover:opacity-100 pointer-events-none
                      transition-opacity duration-150 shadow-lg border border-zinc-700/50
                      z-[60]
                    "
                  >
                    {item.label}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>

        {/* Bottom section - User info + Logout */}
        <div className="shrink-0 border-t border-zinc-800/60 p-3">
          <div
            className={`
              flex items-center gap-3 px-3 py-2.5 rounded-lg
              transition-all duration-200
              ${collapsed ? 'lg:justify-center lg:px-0' : ''}
            `}
          >
            {/* Avatar */}
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-600 shrink-0">
              <span className="text-sm font-semibold text-white">{avatarInitial}</span>
            </div>

            {/* User info */}
            <div
              className={`
                flex-1 min-w-0 transition-opacity duration-200
                ${collapsed ? 'lg:hidden' : ''}
              `}
            >
              <p className="text-sm font-medium text-white truncate">{displayName}</p>
              <p className="text-xs text-zinc-500 truncate">{user?.email || ''}</p>
            </div>

            {/* Logout */}
            <button
              onClick={handleLogout}
              className={`
                flex items-center justify-center w-8 h-8 rounded-md shrink-0
                text-zinc-500 hover:text-red-400 hover:bg-zinc-800
                transition-colors duration-150
                ${collapsed ? 'lg:hidden' : ''}
              `}
              aria-label="Cerrar sesion"
              title="Cerrar sesion"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

          {/* Collapsed logout button */}
          {collapsed && (
            <button
              onClick={handleLogout}
              className="
                hidden lg:flex items-center justify-center w-full mt-2 py-2.5 rounded-lg
                text-zinc-500 hover:text-red-400 hover:bg-zinc-800
                transition-colors duration-150 group relative
              "
              aria-label="Cerrar sesion"
            >
              <LogOut className="w-4.5 h-4.5" />
              <span
                className="
                  absolute left-full ml-3 px-2.5 py-1.5 rounded-md
                  bg-zinc-800 text-white text-xs font-medium whitespace-nowrap
                  opacity-0 group-hover:opacity-100 pointer-events-none
                  transition-opacity duration-150 shadow-lg border border-zinc-700/50
                "
              >
                Cerrar sesion
              </span>
            </button>
          )}
        </div>
      </aside>
    </>
  )
}
