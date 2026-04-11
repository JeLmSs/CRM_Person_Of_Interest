'use client'

import { Globe, Menu } from 'lucide-react'
import { useUser } from '@/lib/supabase/hooks'

interface TopBarProps {
  onMenuToggle: () => void
}

export default function TopBar({ onMenuToggle }: TopBarProps) {
  const { user } = useUser()

  const displayName =
    user?.user_metadata?.full_name ||
    user?.email?.split('@')[0] ||
    'U'

  const avatarInitial = displayName.charAt(0).toUpperCase()

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-14 px-4 bg-[#0c0c10] border-b border-zinc-800/60 lg:hidden">
      {/* Hamburger */}
      <button
        onClick={onMenuToggle}
        className="flex items-center justify-center w-9 h-9 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors duration-150"
        aria-label="Abrir menu"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Logo / Title */}
      <div className="flex items-center gap-2">
        <div className="flex items-center justify-center w-7 h-7 rounded-md bg-indigo-600">
          <Globe className="w-3.5 h-3.5 text-white" />
        </div>
        <span className="text-base font-semibold text-white">Sphere</span>
      </div>

      {/* User avatar */}
      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-600">
        <span className="text-xs font-semibold text-white">{avatarInitial}</span>
      </div>
    </header>
  )
}
