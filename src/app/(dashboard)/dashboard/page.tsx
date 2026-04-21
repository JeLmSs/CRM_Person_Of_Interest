'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Contact, Interaction, FollowUp } from '@/lib/types/database'
import { tierConfig, getRelationshipColor, getDaysUntilFollowUp, getFollowUpUrgency, formatRelativeDate, getInitials } from '@/lib/utils'
import { Users, Clock, MessageSquare, TrendingUp, Plus, ChevronRight, Phone, Mail, ExternalLink, Calendar, ArrowUpRight, Zap } from 'lucide-react'
import Link from 'next/link'
import { loadContacts, loadInteractions } from '@/lib/supabase/data-loaders'

const demoContacts: (Contact & { _followUpDays?: number })[] = [
  { id: '1', user_id: '', first_name: 'Carlos', last_name: 'Mendoza', email: 'carlos@empresa.com', phone: '+34 612 345 678', company: 'Iberdrola', job_title: 'Director de Innovación', linkedin_url: null, linkedin_profile_data: null, avatar_url: null, tier: 'S', status: 'active', follow_up_frequency: 'weekly', custom_follow_up_days: null, last_contact_date: new Date(Date.now() - 3 * 86400000).toISOString(), next_follow_up_date: new Date(Date.now() - 1 * 86400000).toISOString(), relationship_score: 92, city: 'Madrid', country: 'España', referred_by: null, notes: null, created_at: '', updated_at: '', _followUpDays: -1 },
  { id: '2', user_id: '', first_name: 'Laura', last_name: 'Fernández', email: 'laura@consulting.com', phone: '+34 623 456 789', company: 'McKinsey', job_title: 'Senior Partner', linkedin_url: null, linkedin_profile_data: null, avatar_url: null, tier: 'S', status: 'active', follow_up_frequency: 'biweekly', custom_follow_up_days: null, last_contact_date: new Date(Date.now() - 10 * 86400000).toISOString(), next_follow_up_date: new Date(Date.now() + 4 * 86400000).toISOString(), relationship_score: 85, city: 'Barcelona', country: 'España', referred_by: null, notes: null, created_at: '', updated_at: '', _followUpDays: 4 },
  { id: '3', user_id: '', first_name: 'Javier', last_name: 'Ruiz', email: 'javier@tech.es', phone: '+34 634 567 890', company: 'Telefónica', job_title: 'CTO', linkedin_url: null, linkedin_profile_data: null, avatar_url: null, tier: 'A', status: 'active', follow_up_frequency: 'monthly', custom_follow_up_days: null, last_contact_date: new Date(Date.now() - 20 * 86400000).toISOString(), next_follow_up_date: new Date(Date.now() - 3 * 86400000).toISOString(), relationship_score: 71, city: 'Madrid', country: 'España', referred_by: null, notes: null, created_at: '', updated_at: '', _followUpDays: -3 },
  { id: '4', user_id: '', first_name: 'Ana', last_name: 'García', email: 'ana@venture.com', phone: '+34 645 678 901', company: 'Seaya Ventures', job_title: 'Managing Director', linkedin_url: null, linkedin_profile_data: null, avatar_url: null, tier: 'A', status: 'active', follow_up_frequency: 'biweekly', custom_follow_up_days: null, last_contact_date: new Date(Date.now() - 5 * 86400000).toISOString(), next_follow_up_date: new Date(Date.now() + 9 * 86400000).toISOString(), relationship_score: 78, city: 'Madrid', country: 'España', referred_by: null, notes: null, created_at: '', updated_at: '', _followUpDays: 9 },
  { id: '5', user_id: '', first_name: 'Miguel', last_name: 'Torres', email: 'miguel@coach.es', phone: '+34 656 789 012', company: 'Executive Coaching Spain', job_title: 'Executive Coach', linkedin_url: null, linkedin_profile_data: null, avatar_url: null, tier: 'B', status: 'active', follow_up_frequency: 'weekly', custom_follow_up_days: null, last_contact_date: new Date(Date.now() - 8 * 86400000).toISOString(), next_follow_up_date: new Date(Date.now() + 1 * 86400000).toISOString(), relationship_score: 65, city: 'Valencia', country: 'España', referred_by: null, notes: null, created_at: '', updated_at: '', _followUpDays: 1 },
  { id: '6', user_id: '', first_name: 'Patricia', last_name: 'López', email: 'patricia@banco.com', phone: '+34 667 890 123', company: 'BBVA', job_title: 'Directora de RRHH', linkedin_url: null, linkedin_profile_data: null, avatar_url: null, tier: 'B', status: 'active', follow_up_frequency: 'monthly', custom_follow_up_days: null, last_contact_date: new Date(Date.now() - 15 * 86400000).toISOString(), next_follow_up_date: new Date(Date.now() + 15 * 86400000).toISOString(), relationship_score: 58, city: 'Bilbao', country: 'España', referred_by: null, notes: null, created_at: '', updated_at: '', _followUpDays: 15 },
  { id: '7', user_id: '', first_name: 'Roberto', last_name: 'Sánchez', email: 'roberto@indra.com', phone: '+34 678 901 234', company: 'Indra', job_title: 'VP de Estrategia', linkedin_url: null, linkedin_profile_data: null, avatar_url: null, tier: 'C', status: 'active', follow_up_frequency: 'monthly', custom_follow_up_days: null, last_contact_date: new Date(Date.now() - 30 * 86400000).toISOString(), next_follow_up_date: new Date(Date.now() + 0 * 86400000).toISOString(), relationship_score: 42, city: 'Madrid', country: 'España', referred_by: null, notes: null, created_at: '', updated_at: '', _followUpDays: 0 },
  { id: '8', user_id: '', first_name: 'Elena', last_name: 'Martín', email: 'elena@startup.io', phone: '+34 689 012 345', company: 'Glovo', job_title: 'COO', linkedin_url: null, linkedin_profile_data: null, avatar_url: null, tier: 'A', status: 'active', follow_up_frequency: 'biweekly', custom_follow_up_days: null, last_contact_date: new Date(Date.now() - 7 * 86400000).toISOString(), next_follow_up_date: new Date(Date.now() + 7 * 86400000).toISOString(), relationship_score: 74, city: 'Barcelona', country: 'España', referred_by: null, notes: null, created_at: '', updated_at: '', _followUpDays: 7 },
]

const demoInteractions: (Interaction & { _contactName: string })[] = [
  { id: '1', user_id: '', contact_id: '1', type: 'coffee', title: 'Café en el Retiro', description: 'Hablamos sobre oportunidades en renovables', sentiment: 'very_positive', date: new Date(Date.now() - 3 * 86400000).toISOString(), duration_minutes: 45, location: 'Café del Retiro', key_takeaways: ['Interesado en perfiles de innovación'], action_items: ['Enviar CV actualizado'], created_at: '', updated_at: '', _contactName: 'Carlos Mendoza' },
  { id: '2', user_id: '', contact_id: '2', type: 'call', title: 'Llamada de seguimiento', description: 'Revisamos el progreso del networking', sentiment: 'positive', date: new Date(Date.now() - 5 * 86400000).toISOString(), duration_minutes: 30, location: null, key_takeaways: ['Tiene contacto en Repsol'], action_items: ['Preparar elevator pitch'], created_at: '', updated_at: '', _contactName: 'Laura Fernández' },
  { id: '3', user_id: '', contact_id: '4', type: 'meeting', title: 'Reunión en oficinas Seaya', description: 'Presentación sobre el ecosistema startup', sentiment: 'positive', date: new Date(Date.now() - 7 * 86400000).toISOString(), duration_minutes: 60, location: 'Seaya Ventures, Madrid', key_takeaways: ['Portfolio companies buscan directivos'], action_items: ['Revisar portfolio Seaya'], created_at: '', updated_at: '', _contactName: 'Ana García' },
  { id: '4', user_id: '', contact_id: '5', type: 'linkedin', title: 'Mensaje LinkedIn', description: 'Compartió artículo sobre liderazgo', sentiment: 'neutral', date: new Date(Date.now() - 8 * 86400000).toISOString(), duration_minutes: 5, location: null, key_takeaways: null, action_items: null, created_at: '', updated_at: '', _contactName: 'Miguel Torres' },
  { id: '5', user_id: '', contact_id: '3', type: 'lunch', title: 'Comida en La Barraca', description: 'Almuerzo informal para hablar del sector tech', sentiment: 'very_positive', date: new Date(Date.now() - 12 * 86400000).toISOString(), duration_minutes: 90, location: 'La Barraca, Madrid', key_takeaways: ['Telefónica busca Director de Transformación Digital'], action_items: ['Enviar propuesta de valor'], created_at: '', updated_at: '', _contactName: 'Javier Ruiz' },
]

const interactionIcons: Record<string, string> = {
  meeting: '🤝', call: '📞', email: '📧', coffee: '☕', lunch: '🍽️', event: '🎫', linkedin: '💼', whatsapp: '💬', other: '📌'
}

const sentimentColors: Record<string, string> = {
  very_positive: 'bg-green-500/20 text-green-400', positive: 'bg-emerald-500/20 text-emerald-400', neutral: 'bg-zinc-500/20 text-zinc-400', negative: 'bg-orange-500/20 text-orange-400', very_negative: 'bg-red-500/20 text-red-400'
}

export default function DashboardPage() {
  const [contacts, setContacts] = useState<typeof demoContacts>([])
  const [interactions, setInteractions] = useState<typeof demoInteractions>([])
  const [loading, setLoading] = useState(true)
  const [userName, setUserName] = useState('Profesional')

  useEffect(() => {
    const fetchData = async () => {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single()
          if (profile?.full_name) setUserName(profile.full_name.split(' ')[0])

          // Use new data loaders that check demo mode
          const dbContacts = await loadContacts(user.id)
          const loadedInteractions = await loadInteractions(user.id)

          setContacts(dbContacts.filter(c => c.status === 'active') as typeof demoContacts)

          if (loadedInteractions && loadedInteractions.length > 0) {
            const enriched = loadedInteractions.slice(0, 5).map((i) => {
              const contact = dbContacts.find(c => c.id === i.contact_id)
              return { ...i, _contactName: contact ? `${contact.first_name} ${contact.last_name || ''}`.trim() : 'Contacto' }
            })
            setInteractions(enriched as typeof demoInteractions)
          }
        }
      } catch (error) {
        console.error('Error loading dashboard data:', error)
      }
      setLoading(false)
    }
    fetchData()
  }, [])

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Buenos días' : hour < 20 ? 'Buenas tardes' : 'Buenas noches'

  const totalActive = contacts.filter(c => c.status === 'active').length
  const overdueCount = contacts.filter(c => {
    const d = getDaysUntilFollowUp(c.next_follow_up_date)
    return d !== null && d < 0
  }).length
  const avgScore = contacts.length > 0 ? Math.round(contacts.reduce((sum, c) => sum + c.relationship_score, 0) / contacts.length) : 0

  const urgentFollowUps = [...contacts]
    .filter(c => c.next_follow_up_date)
    .sort((a, b) => new Date(a.next_follow_up_date!).getTime() - new Date(b.next_follow_up_date!).getTime())
    .slice(0, 5)

  const topContacts = [...contacts].sort((a, b) => b.relationship_score - a.relationship_score).slice(0, 5)

  const tierCounts = { S: 0, A: 0, B: 0, C: 0, D: 0 }
  contacts.forEach(c => { tierCounts[c.tier]++ })
  const maxTierCount = Math.max(...Object.values(tierCounts), 1)

  const tierBarColors: Record<string, string> = { S: 'bg-amber-400', A: 'bg-violet-400', B: 'bg-blue-400', C: 'bg-emerald-400', D: 'bg-zinc-400' }

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="h-10 w-72 bg-zinc-800 rounded-lg animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="h-28 bg-zinc-800/50 rounded-xl animate-pulse" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1,2,3,4].map(i => <div key={i} className="h-64 bg-zinc-800/50 rounded-xl animate-pulse" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white">{greeting}, {userName}</h1>
          <p className="text-zinc-400 mt-1">{new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
        <Link href="/contacts" className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium transition-colors">
          <Plus className="w-4 h-4" /> Nuevo contacto
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Contactos activos', value: totalActive, icon: Users, color: 'text-blue-400', bg: 'bg-blue-500/10', href: '/contacts' },
          { label: 'Seguimientos pendientes', value: overdueCount, icon: Clock, color: 'text-orange-400', bg: 'bg-orange-500/10', href: null },
          { label: 'Interacciones recientes', value: interactions.length, icon: MessageSquare, color: 'text-emerald-400', bg: 'bg-emerald-500/10', href: null },
          { label: 'Score medio', value: avgScore, icon: TrendingUp, color: 'text-violet-400', bg: 'bg-violet-500/10', href: null },
        ].map((stat) => {
          const card = (
            <div key={stat.label} className={`bg-[#0f0f14] border border-zinc-800/50 rounded-xl p-5 transition-colors ${stat.href ? 'hover:border-indigo-500/40 cursor-pointer' : 'hover:border-zinc-700/50'}`}>
              <div className="flex items-center justify-between">
                <div className={`p-2 rounded-lg ${stat.bg}`}>
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                {stat.label === 'Seguimientos pendientes' && overdueCount > 0 && (
                  <span className="px-2 py-0.5 text-xs font-medium bg-red-500/20 text-red-400 rounded-full">Urgente</span>
                )}
              </div>
              <p className="text-3xl font-bold text-white mt-3">{stat.value}</p>
              <p className="text-sm text-zinc-400 mt-1">{stat.label}</p>
            </div>
          )
          return stat.href
            ? <Link key={stat.label} href={stat.href}>{card}</Link>
            : card
        })}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Follow-up Alerts */}
        <div className="bg-[#0f0f14] border border-zinc-800/50 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-400" /> Seguimientos
            </h2>
            <Link href="/calendar" className="text-sm text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
              Ver todos <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="space-y-3">
            {urgentFollowUps.map(contact => {
              const days = getDaysUntilFollowUp(contact.next_follow_up_date)
              const urgency = getFollowUpUrgency(days)
              const urgencyColors = { overdue: 'border-l-red-500 bg-red-500/5', urgent: 'border-l-orange-500 bg-orange-500/5', soon: 'border-l-yellow-500 bg-yellow-500/5', ok: 'border-l-emerald-500', none: 'border-l-zinc-500' }
              const urgencyText = { overdue: `${Math.abs(days!)} días atrasado`, urgent: days === 0 ? 'Hoy' : `Mañana`, soon: `En ${days} días`, ok: `En ${days} días`, none: '' }

              return (
                <Link key={contact.id} href={`/contacts/${contact.id}`} className={`flex items-center gap-3 p-3 rounded-lg border-l-2 ${urgencyColors[urgency]} hover:bg-zinc-800/30 transition-colors`}>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${tierConfig[contact.tier].bgColor} ${tierConfig[contact.tier].color} border`}>
                    {getInitials(contact.first_name, contact.last_name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{contact.first_name} {contact.last_name}</p>
                    <p className="text-xs text-zinc-400 truncate">{contact.job_title} · {contact.company}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className={`text-xs font-medium ${urgency === 'overdue' ? 'text-red-400' : urgency === 'urgent' ? 'text-orange-400' : urgency === 'soon' ? 'text-yellow-400' : 'text-emerald-400'}`}>
                      {urgencyText[urgency]}
                    </span>
                    <span className={`ml-2 text-xs px-1.5 py-0.5 rounded font-bold ${tierConfig[contact.tier].bgColor} ${tierConfig[contact.tier].color} border`}>{contact.tier}</span>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>

        {/* Recent Interactions */}
        <div className="bg-[#0f0f14] border border-zinc-800/50 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-indigo-400" /> Actividad reciente
            </h2>
          </div>
          <div className="space-y-3">
            {interactions.map(interaction => (
              <div key={interaction.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-zinc-800/30 transition-colors">
                <div className="text-xl mt-0.5">{interactionIcons[interaction.type] || '📌'}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white">{interaction.title}</p>
                  <p className="text-xs text-zinc-400">{interaction._contactName} · {formatRelativeDate(interaction.date)}</p>
                  {interaction.description && <p className="text-xs text-zinc-500 mt-1 truncate">{interaction.description}</p>}
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${sentimentColors[interaction.sentiment]}`}>
                  {interaction.sentiment === 'very_positive' ? 'Excelente' : interaction.sentiment === 'positive' ? 'Bien' : interaction.sentiment === 'neutral' ? 'Neutral' : 'Mal'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Network Health */}
        <div className="bg-[#0f0f14] border border-zinc-800/50 rounded-xl p-5">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-400" /> Salud de la Red
          </h2>
          <div className="space-y-3">
            {(Object.entries(tierCounts) as [string, number][]).map(([tier, count]) => (
              <div key={tier} className="flex items-center gap-3">
                <span className={`text-sm font-bold w-6 ${tierConfig[tier as keyof typeof tierConfig].color}`}>{tier}</span>
                <div className="flex-1 h-6 bg-zinc-800/50 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${tierBarColors[tier]} transition-all duration-700`} style={{ width: `${(count / maxTierCount) * 100}%` }} />
                </div>
                <span className="text-sm text-zinc-400 w-8 text-right">{count}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-zinc-500 mt-4">Distribución de {totalActive} contactos activos por nivel de prioridad</p>
        </div>

        {/* Top Contacts */}
        <div className="bg-[#0f0f14] border border-zinc-800/50 rounded-xl p-5">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <ArrowUpRight className="w-5 h-5 text-amber-400" /> Top Contactos
          </h2>
          <div className="space-y-3">
            {topContacts.map((contact, index) => (
              <Link key={contact.id} href={`/contacts/${contact.id}`} className="flex items-center gap-3 p-2 rounded-lg hover:bg-zinc-800/30 transition-colors">
                <span className="text-xs font-bold text-zinc-500 w-4">#{index + 1}</span>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${tierConfig[contact.tier].bgColor} ${tierConfig[contact.tier].color} border`}>
                  {getInitials(contact.first_name, contact.last_name)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{contact.first_name} {contact.last_name}</p>
                  <p className="text-xs text-zinc-400 truncate">{contact.company}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="w-16 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${contact.relationship_score >= 80 ? 'bg-green-400' : contact.relationship_score >= 60 ? 'bg-emerald-400' : 'bg-yellow-400'}`} style={{ width: `${contact.relationship_score}%` }} />
                  </div>
                  <span className={`text-xs font-bold ${getRelationshipColor(contact.relationship_score)}`}>{contact.relationship_score}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
