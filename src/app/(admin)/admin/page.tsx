'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell
} from 'recharts'
import {
  Users, TrendingUp, Activity, MessageSquare,
  RefreshCw, Shield, Contact, Zap
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface StatsData {
  totalUsers: number
  newThisMonth: number
  activeUsers7d: number
  totalInteractions: number
  totalContacts: number
  newUsersPerDay: { date: string; count: number }[]
  dauPerDay: { date: string; count: number }[]
  topPages: { path: string; views: number }[]
}

interface UserRow {
  id: string
  email: string
  full_name: string | null
  created_at: string
  is_admin: boolean
  contacts_count: number
  interactions_count: number
  ai_chats_count: number
  last_activity: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(d: string) {
  return new Date(d).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })
}

function fmtRelative(d: string) {
  const diff = Date.now() - new Date(d).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `hace ${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `hace ${hrs}h`
  const days = Math.floor(hrs / 24)
  return `hace ${days}d`
}

function getInitials(name: string | null, email: string) {
  if (name) return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  return email.slice(0, 2).toUpperCase()
}

const PAGE_LABELS: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/contacts': 'Contactos',
  '/calendar': 'Calendario',
  '/prepare': 'Sphere AI',
  '/linkedin': 'LinkedIn',
  '/settings': 'Configuración',
  '/admin': 'Admin',
}

const PAGE_COLORS = ['#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#84cc16']

// ─── Sub-components ───────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, icon: Icon, color, bg }: {
  label: string; value: number | string; sub?: string
  icon: React.ElementType; color: string; bg: string
}) {
  return (
    <div className="bg-[#0f0f14] border border-zinc-800/50 rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <div className={`p-2 rounded-lg ${bg}`}>
          <Icon className={`w-5 h-5 ${color}`} />
        </div>
        {sub && <span className="text-xs text-zinc-500">{sub}</span>}
      </div>
      <p className="text-3xl font-bold text-white">{value}</p>
      <p className="text-sm text-zinc-400 mt-1">{label}</p>
    </div>
  )
}

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#1a1a24] border border-zinc-700 rounded-lg px-3 py-2 text-xs">
      <p className="text-zinc-400 mb-1">{label}</p>
      <p className="text-white font-semibold">{payload[0].value}</p>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

function AdminPageContent() {
  const searchParams = useSearchParams()
  const [stats, setStats] = useState<StatsData | null>(null)
  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'users'>(
    searchParams.get('tab') === 'users' ? 'users' : 'overview'
  )
  const [refreshing, setRefreshing] = useState(false)

  async function fetchData() {
    setRefreshing(true)
    try {
      const [statsRes, usersRes] = await Promise.all([
        fetch('/api/admin/stats').then(r => r.json()),
        fetch('/api/admin/users').then(r => r.json()),
      ])
      if (!statsRes.error) setStats(statsRes)
      if (!usersRes.error) setUsers(usersRes.users || [])
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
    setRefreshing(false)
  }

  useEffect(() => { fetchData() }, [])

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="h-8 w-56 bg-zinc-800 rounded-lg animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-28 bg-zinc-800/50 rounded-xl animate-pulse" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-56 bg-zinc-800/50 rounded-xl animate-pulse" />)}
        </div>
      </div>
    )
  }

  const sortedByActivity = [...users].sort(
    (a, b) => new Date(b.last_activity).getTime() - new Date(a.last_activity).getTime()
  )
  const recentUsers = [...users].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  ).slice(0, 10)
  const topUsers = [...users]
    .sort((a, b) => b.interactions_count - a.interactions_count)
    .slice(0, 10)

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-600/20 rounded-xl">
            <Shield className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Panel de Administración</h1>
            <p className="text-xs text-zinc-500">
              {new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
        </div>
        <button
          onClick={fetchData}
          disabled={refreshing}
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-zinc-400 hover:text-white border border-zinc-700 hover:border-zinc-500 rounded-lg transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          Actualizar
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-zinc-900 border border-zinc-800 rounded-lg p-1 w-fit">
        {(['overview', 'users'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-1.5 text-sm rounded-md font-medium transition-colors ${
              activeTab === tab
                ? 'bg-indigo-600 text-white'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            {tab === 'overview' ? 'Resumen' : 'Usuarios'}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && stats && (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              label="Usuarios registrados"
              value={stats.totalUsers}
              icon={Users}
              color="text-indigo-400"
              bg="bg-indigo-500/10"
            />
            <KpiCard
              label="Nuevos este mes"
              value={stats.newThisMonth}
              icon={TrendingUp}
              color="text-emerald-400"
              bg="bg-emerald-500/10"
            />
            <KpiCard
              label="Activos (últimos 7d)"
              value={stats.activeUsers7d}
              sub={`de ${stats.totalUsers} totales`}
              icon={Activity}
              color="text-amber-400"
              bg="bg-amber-500/10"
            />
            <KpiCard
              label="Interacciones totales"
              value={stats.totalInteractions}
              sub={`${stats.totalContacts} contactos`}
              icon={MessageSquare}
              color="text-violet-400"
              bg="bg-violet-500/10"
            />
          </div>

          {/* Charts row 1 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* New registrations per day */}
            <div className="bg-[#0f0f14] border border-zinc-800/50 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <Users className="w-4 h-4 text-indigo-400" />
                <h2 className="text-sm font-semibold text-white">Nuevos registros / día</h2>
                <span className="ml-auto text-xs text-zinc-500">Últimos 30 días</span>
              </div>
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={stats.newUsersPerDay} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="regGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis dataKey="date" tickFormatter={d => d.slice(5)} tick={{ fontSize: 10, fill: '#71717a' }} interval={6} />
                  <YAxis tick={{ fontSize: 10, fill: '#71717a' }} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={2} fill="url(#regGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Daily active users */}
            <div className="bg-[#0f0f14] border border-zinc-800/50 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <Activity className="w-4 h-4 text-emerald-400" />
                <h2 className="text-sm font-semibold text-white">Usuarios activos / día</h2>
                <span className="ml-auto text-xs text-zinc-500">Últimos 30 días</span>
              </div>
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={stats.dauPerDay} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="dauGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis dataKey="date" tickFormatter={d => d.slice(5)} tick={{ fontSize: 10, fill: '#71717a' }} interval={6} />
                  <YAxis tick={{ fontSize: 10, fill: '#71717a' }} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="count" stroke="#10b981" strokeWidth={2} fill="url(#dauGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Charts row 2 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top pages */}
            <div className="bg-[#0f0f14] border border-zinc-800/50 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <Zap className="w-4 h-4 text-amber-400" />
                <h2 className="text-sm font-semibold text-white">Páginas más visitadas</h2>
                <span className="ml-auto text-xs text-zinc-500">Últimos 30 días</span>
              </div>
              {stats.topPages.length === 0 ? (
                <div className="flex items-center justify-center h-40 text-zinc-600 text-sm">
                  Sin datos aún — las visitas se registrarán automáticamente
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart
                    data={stats.topPages.map(p => ({ ...p, label: PAGE_LABELS[p.path] || p.path }))}
                    layout="vertical"
                    margin={{ top: 0, right: 16, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 10, fill: '#71717a' }} />
                    <YAxis type="category" dataKey="label" tick={{ fontSize: 11, fill: '#a1a1aa' }} width={90} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="views" radius={[0, 4, 4, 0]}>
                      {stats.topPages.map((_, i) => (
                        <Cell key={i} fill={PAGE_COLORS[i % PAGE_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Platform usage breakdown */}
            <div className="bg-[#0f0f14] border border-zinc-800/50 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <Contact className="w-4 h-4 text-violet-400" />
                <h2 className="text-sm font-semibold text-white">Uso de la plataforma</h2>
                <span className="ml-auto text-xs text-zinc-500">Promedio por usuario</span>
              </div>
              {users.length === 0 ? (
                <div className="flex items-center justify-center h-40 text-zinc-600 text-sm">Sin usuarios</div>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={160}>
                    <BarChart
                      data={[
                        { name: 'Contactos', value: +(users.reduce((s, u) => s + u.contacts_count, 0) / users.length).toFixed(1) },
                        { name: 'Interacciones', value: +(users.reduce((s, u) => s + u.interactions_count, 0) / users.length).toFixed(1) },
                        { name: 'AI Chats', value: +(users.reduce((s, u) => s + u.ai_chats_count, 0) / users.length).toFixed(1) },
                      ]}
                      margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#a1a1aa' }} />
                      <YAxis tick={{ fontSize: 10, fill: '#71717a' }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                        <Cell fill="#6366f1" />
                        <Cell fill="#10b981" />
                        <Cell fill="#a78bfa" />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                  <div className="grid grid-cols-3 gap-2 mt-3">
                    {[
                      { label: 'Total contactos', value: stats.totalContacts, color: 'text-indigo-400' },
                      { label: 'Total interacciones', value: stats.totalInteractions, color: 'text-emerald-400' },
                      { label: 'Total AI chats', value: users.reduce((s, u) => s + u.ai_chats_count, 0), color: 'text-violet-400' },
                    ].map(m => (
                      <div key={m.label} className="bg-zinc-900/50 rounded-lg p-2.5 text-center">
                        <p className={`text-lg font-bold ${m.color}`}>{m.value}</p>
                        <p className="text-[10px] text-zinc-500 mt-0.5">{m.label}</p>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Recent users table */}
          <div className="bg-[#0f0f14] border border-zinc-800/50 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-4 h-4 text-indigo-400" />
              <h2 className="text-sm font-semibold text-white">Últimos usuarios registrados</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-800">
                    <th className="text-left text-xs font-medium text-zinc-500 pb-2 pr-4">Usuario</th>
                    <th className="text-left text-xs font-medium text-zinc-500 pb-2 pr-4">Registro</th>
                    <th className="text-right text-xs font-medium text-zinc-500 pb-2 pr-4">Contactos</th>
                    <th className="text-right text-xs font-medium text-zinc-500 pb-2 pr-4">Interacciones</th>
                    <th className="text-right text-xs font-medium text-zinc-500 pb-2">AI Chats</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50">
                  {recentUsers.map(u => (
                    <tr key={u.id} className="hover:bg-zinc-800/20 transition-colors">
                      <td className="py-2.5 pr-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-xs font-bold text-indigo-400 shrink-0">
                            {getInitials(u.full_name, u.email)}
                          </div>
                          <div className="min-w-0">
                            <p className="text-white font-medium truncate max-w-[140px]">{u.full_name || '—'}</p>
                            <p className="text-xs text-zinc-500 truncate max-w-[140px]">{u.email}</p>
                          </div>
                          {u.is_admin && (
                            <span className="px-1.5 py-0.5 text-[10px] bg-indigo-500/20 text-indigo-400 rounded-full border border-indigo-500/20 shrink-0">Admin</span>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 pr-4 text-xs text-zinc-400">{fmt(u.created_at)}</td>
                      <td className="py-2.5 pr-4 text-right text-zinc-300">{u.contacts_count}</td>
                      <td className="py-2.5 pr-4 text-right text-zinc-300">{u.interactions_count}</td>
                      <td className="py-2.5 text-right text-zinc-300">{u.ai_chats_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {activeTab === 'users' && (
        <div className="space-y-6">
          {/* Activity feed: users sorted by last activity */}
          <div className="bg-[#0f0f14] border border-zinc-800/50 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Activity className="w-4 h-4 text-emerald-400" />
              <h2 className="text-sm font-semibold text-white">Últimos usuarios con actividad</h2>
              <span className="ml-auto text-xs text-zinc-500">{users.length} usuarios totales</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-800">
                    <th className="text-left text-xs font-medium text-zinc-500 pb-2 pr-4">Usuario</th>
                    <th className="text-left text-xs font-medium text-zinc-500 pb-2 pr-4">Última actividad</th>
                    <th className="text-right text-xs font-medium text-zinc-500 pb-2 pr-4">Contactos</th>
                    <th className="text-right text-xs font-medium text-zinc-500 pb-2 pr-4">Interacciones</th>
                    <th className="text-right text-xs font-medium text-zinc-500 pb-2 pr-4">AI Chats</th>
                    <th className="text-left text-xs font-medium text-zinc-500 pb-2">Registro</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50">
                  {sortedByActivity.map(u => (
                    <tr key={u.id} className="hover:bg-zinc-800/20 transition-colors group">
                      <td className="py-2.5 pr-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-zinc-700/50 flex items-center justify-center text-xs font-bold text-zinc-300 shrink-0">
                            {getInitials(u.full_name, u.email)}
                          </div>
                          <div className="min-w-0">
                            <p className="text-white font-medium truncate max-w-[160px]">{u.full_name || '—'}</p>
                            <p className="text-xs text-zinc-500 truncate max-w-[160px]">{u.email}</p>
                          </div>
                          {u.is_admin && (
                            <span className="px-1.5 py-0.5 text-[10px] bg-indigo-500/20 text-indigo-400 rounded-full border border-indigo-500/20 shrink-0">Admin</span>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 pr-4">
                        <span className="text-xs text-emerald-400 font-medium">{fmtRelative(u.last_activity)}</span>
                      </td>
                      <td className="py-2.5 pr-4 text-right">
                        <span className={`text-sm font-medium ${u.contacts_count > 0 ? 'text-indigo-400' : 'text-zinc-600'}`}>
                          {u.contacts_count}
                        </span>
                      </td>
                      <td className="py-2.5 pr-4 text-right">
                        <span className={`text-sm font-medium ${u.interactions_count > 0 ? 'text-emerald-400' : 'text-zinc-600'}`}>
                          {u.interactions_count}
                        </span>
                      </td>
                      <td className="py-2.5 pr-4 text-right">
                        <span className={`text-sm font-medium ${u.ai_chats_count > 0 ? 'text-violet-400' : 'text-zinc-600'}`}>
                          {u.ai_chats_count}
                        </span>
                      </td>
                      <td className="py-2.5 text-xs text-zinc-500">{fmt(u.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Top users by interactions */}
          <div className="bg-[#0f0f14] border border-zinc-800/50 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-4 h-4 text-amber-400" />
              <h2 className="text-sm font-semibold text-white">Usuarios más activos</h2>
              <span className="ml-auto text-xs text-zinc-500">por interacciones</span>
            </div>
            <div className="space-y-2">
              {topUsers.map((u, i) => {
                const maxInteractions = topUsers[0]?.interactions_count || 1
                const pct = maxInteractions > 0 ? (u.interactions_count / maxInteractions) * 100 : 0
                return (
                  <div key={u.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-zinc-800/20 transition-colors">
                    <span className="text-xs font-bold text-zinc-600 w-5 shrink-0">#{i + 1}</span>
                    <div className="w-7 h-7 rounded-full bg-zinc-700/50 flex items-center justify-center text-xs font-bold text-zinc-300 shrink-0">
                      {getInitials(u.full_name, u.email)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm text-white font-medium truncate">{u.full_name || u.email}</p>
                        <span className="text-xs text-zinc-500 shrink-0">{u.interactions_count} interacciones</span>
                      </div>
                      <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-indigo-600 to-indigo-400 rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                    <div className="text-right shrink-0 text-xs text-zinc-500">
                      <p>{u.contacts_count} cont.</p>
                      <p>{u.ai_chats_count} AI</p>
                    </div>
                  </div>
                )
              })}
              {topUsers.length === 0 && (
                <p className="text-center text-zinc-600 text-sm py-8">Sin datos de usuarios aún</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function AdminPage() {
  return (
    <Suspense fallback={
      <div className="p-6 space-y-6">
        <div className="h-8 w-56 bg-zinc-800 rounded-lg animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-28 bg-zinc-800/50 rounded-xl animate-pulse" />)}
        </div>
      </div>
    }>
      <AdminPageContent />
    </Suspense>
  )
}
