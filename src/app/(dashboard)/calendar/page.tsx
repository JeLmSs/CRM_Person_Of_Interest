'use client'

import { useState, useMemo, useEffect } from 'react'
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Check, Clock, SkipForward, Building2, MessageSquare, Download, Plus, Edit2, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn, tierConfig, getInitials } from '@/lib/utils'
import { ContactTier, FollowUpStatus, Contact } from '@/lib/types/database'
import InteractionModal from '@/components/interaction-modal'

interface DemoFollowUp {
  id: string
  contact_id?: string
  contactName: string
  contactLastName: string
  company: string
  tier: ContactTier
  dueDate: Date
  status: FollowUpStatus
  notes: string | null
  suggestedTopics: string[]
}

interface CalendarInteraction {
  id: string
  contact_id: string
  type: string
  title: string
  description: string | null
  sentiment: string
  date: string
  duration_minutes: number | null
  contactName: string
  contactCompany: string
}

const DAY_NAMES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function formatSpanishDate(date: Date) {
  const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
  return `${date.getDate()} de ${months[date.getMonth()]} de ${date.getFullYear()}`
}

function getMonthLabel(year: number, month: number) {
  const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
  return `${months[month]} ${year}`
}

function getCalendarDays(year: number, month: number): (Date | null)[] {
  const firstDay = new Date(year, month, 1)
  let startOffset = firstDay.getDay() - 1
  if (startOffset < 0) startOffset = 6
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: (Date | null)[] = []
  for (let i = 0; i < startOffset; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d))
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}

function tierDotColor(tier: ContactTier): string {
  const map: Record<ContactTier, string> = { S: 'bg-amber-400', A: 'bg-violet-400', B: 'bg-blue-400', C: 'bg-emerald-400', D: 'bg-zinc-400' }
  return map[tier]
}

export default function CalendarPage() {
  const today = new Date()
  const [loading, setLoading] = useState(true)
  const [followUps, setFollowUps] = useState<DemoFollowUp[]>([])
  const [interactions, setInteractions] = useState<CalendarInteraction[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())
  const [selectedDate, setSelectedDate] = useState<Date>(today)
  const [showNewInteraction, setShowNewInteraction] = useState(false)
  const [editingInteraction, setEditingInteraction] = useState<CalendarInteraction | null>(null)
  const [planFollowUp, setPlanFollowUp] = useState<DemoFollowUp | null>(null)

  // Load all data
  useEffect(() => {
    const loadData = async () => {
      try {
        const supabase = createClient()
        const [contactsRes, interactionsRes, followUpsRes] = await Promise.all([
          supabase.from('contacts').select('*').eq('status', 'active').limit(100),
          supabase.from('interactions').select('*').order('date', { ascending: false }),
          supabase.from('follow_ups').select('*, contacts(first_name, last_name, company, tier)').not('status', 'in', '("completed","skipped")')
        ])

        if (contactsRes.data) setContacts(contactsRes.data as Contact[])

        // Process interactions
        if (interactionsRes.data && contactsRes.data) {
          const enriched: CalendarInteraction[] = interactionsRes.data.map((i: any) => {
            const contact = (contactsRes.data as Contact[]).find(c => c.id === i.contact_id)
            return {
              id: i.id,
              contact_id: i.contact_id,
              type: i.type,
              title: i.title,
              description: i.description,
              sentiment: i.sentiment,
              date: i.date,
              duration_minutes: i.duration_minutes,
              contactName: contact ? `${contact.first_name} ${contact.last_name || ''}`.trim() : 'Contacto',
              contactCompany: contact?.company || '',
            }
          })
          setInteractions(enriched)
        }

        // Process follow-ups
        if (followUpsRes.data) {
          const realFU: DemoFollowUp[] = followUpsRes.data.map((fu: any) => ({
            id: fu.id,
            contact_id: fu.contact_id,
            contactName: fu.contacts?.first_name || '',
            contactLastName: fu.contacts?.last_name || '',
            company: fu.contacts?.company || '',
            tier: (fu.contacts?.tier || 'C') as ContactTier,
            dueDate: new Date(fu.due_date + 'T12:00:00'),
            status: fu.status as FollowUpStatus,
            notes: fu.notes,
            suggestedTopics: fu.suggested_topics || [],
          }))

          // Add virtual follow-ups from contacts
          const virtualFU: DemoFollowUp[] = (contactsRes.data || [])
            .filter((c: any) => c.next_follow_up_date && !realFU.some(f => f.contact_id === c.id))
            .map((c: any) => ({
              id: 'vfu-' + c.id,
              contact_id: c.id,
              contactName: c.first_name,
              contactLastName: c.last_name || '',
              company: c.company || '',
              tier: c.tier as ContactTier,
              dueDate: new Date(c.next_follow_up_date + 'T12:00:00'),
              status: 'pending' as FollowUpStatus,
              notes: null,
              suggestedTopics: [],
            }))

          setFollowUps([...realFU, ...virtualFU])
        }
      } catch (e) {
        console.error('Calendar load error:', e)
      }
      setLoading(false)
    }

    loadData()
  }, [])

  // Memoized data structures
  const followUpsByDate = useMemo(() => {
    const map: Record<string, DemoFollowUp[]> = {}
    followUps.forEach((fu) => {
      const key = fu.dueDate.toDateString()
      if (!map[key]) map[key] = []
      map[key].push(fu)
    })
    return map
  }, [followUps])

  const interactionsByDate = useMemo(() => {
    const map: Record<string, CalendarInteraction[]> = {}
    interactions.forEach((i) => {
      const [y, m, d] = i.date.split('-').map(Number)
      const key = new Date(y, m - 1, d).toDateString()
      if (!map[key]) map[key] = []
      map[key].push(i)
    })
    return map
  }, [interactions])

  const calendarDays = useMemo(() => getCalendarDays(viewYear, viewMonth), [viewYear, viewMonth])

  const selectedDayFollowUps = useMemo(() => followUpsByDate[selectedDate.toDateString()] || [], [followUpsByDate, selectedDate])
  const selectedDayInteractions = useMemo(() => interactionsByDate[selectedDate.toDateString()] || [], [interactionsByDate, selectedDate])

  // Upcoming 7 days
  const upcoming = useMemo(() => {
    const start = new Date(today)
    start.setHours(0, 0, 0, 0)
    const end = new Date(today)
    end.setDate(end.getDate() + 7)
    end.setHours(23, 59, 59, 999)

    const upcomingFU = followUps.filter(fu => fu.dueDate >= start && fu.dueDate <= end && fu.status !== 'completed' && fu.status !== 'skipped')
    const upcomingInt = interactions.filter(i => {
      const [y, m, d] = i.date.split('-').map(Number)
      const iDate = new Date(y, m - 1, d)
      return iDate >= start && iDate <= end
    })

    return { followUps: upcomingFU, interactions: upcomingInt }
  }, [followUps, interactions, today])

  const upcomingGroupedFU = useMemo(() => {
    const groups: { date: Date; items: DemoFollowUp[] }[] = []
    const map = new Map<string, DemoFollowUp[]>()
    upcoming.followUps.forEach((fu) => {
      const key = fu.dueDate.toDateString()
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(fu)
    })
    map.forEach((items, key) => {
      groups.push({ date: new Date(key), items })
    })
    groups.sort((a, b) => a.date.getTime() - b.date.getTime())
    return groups
  }, [upcoming.followUps])

  const upcomingGroupedInt = useMemo(() => {
    const groups: { date: Date; items: CalendarInteraction[] }[] = []
    const map = new Map<string, CalendarInteraction[]>()
    upcoming.interactions.forEach((i) => {
      const [y, m, d] = i.date.split('-').map(Number)
      const key = new Date(y, m - 1, d).toDateString()
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(i)
    })
    map.forEach((items, key) => {
      groups.push({ date: new Date(key), items })
    })
    groups.sort((a, b) => a.date.getTime() - b.date.getTime())
    return groups
  }, [upcoming.interactions])

  // Navigation
  function prevMonth() {
    if (viewMonth === 0) { setViewYear(viewYear - 1); setViewMonth(11) }
    else setViewMonth(viewMonth - 1)
  }

  function nextMonth() {
    if (viewMonth === 11) { setViewYear(viewYear + 1); setViewMonth(0) }
    else setViewMonth(viewMonth + 1)
  }

  function handleCompleteFollowUp(id: string) {
    setFollowUps(prev => prev.map(fu => fu.id === id ? { ...fu, status: 'completed' } : fu))
  }

  function handlePostponeFollowUp(id: string) {
    setFollowUps(prev => prev.map(fu => {
      if (fu.id !== id) return fu
      const newDate = new Date(fu.dueDate)
      newDate.setDate(newDate.getDate() + 7)
      return { ...fu, dueDate: newDate }
    }))
  }

  function handleSkipFollowUp(id: string) {
    setFollowUps(prev => prev.map(fu => fu.id === id ? { ...fu, status: 'skipped' } : fu))
  }

  function handleDeleteInteraction(id: string) {
    setInteractions(prev => prev.filter(i => i.id !== id))
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-64 rounded-lg bg-zinc-800/60" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-96 rounded-xl bg-zinc-800/40" />
          <div className="h-96 rounded-xl bg-zinc-800/40" />
        </div>
        <div className="h-48 rounded-xl bg-zinc-800/40" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-indigo-500/10">
          <CalendarIcon className="w-5 h-5 text-indigo-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Calendario de Seguimientos e Interacciones</h1>
          <p className="text-sm text-zinc-400">Seguimientos en color, interacciones en azul</p>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-2 bg-[#0f0f14] border border-zinc-800/50 rounded-xl p-6">
          {/* Month nav */}
          <div className="flex items-center justify-between mb-4">
            <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-zinc-800 transition-colors text-zinc-400 hover:text-white">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-semibold text-white">{getMonthLabel(viewYear, viewMonth)}</h2>
            <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-zinc-800 transition-colors text-zinc-400 hover:text-white">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Day names */}
          <div className="grid grid-cols-7 mb-2">
            {DAY_NAMES.map((d) => (
              <div key={d} className="text-center text-xs font-medium text-zinc-500 py-1">{d}</div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((date, idx) => {
              if (!date) return <div key={`empty-${idx}`} className="aspect-square" />

              const key = date.toDateString()
              const fus = followUpsByDate[key] || []
              const ints = interactionsByDate[key] || []
              const isToday = isSameDay(date, today)
              const isSelected = isSameDay(date, selectedDate)
              const isCurrentMonth = date.getMonth() === viewMonth

              return (
                <button
                  key={key}
                  onClick={() => setSelectedDate(date)}
                  className={cn(
                    'aspect-square rounded-lg flex flex-col items-center justify-center gap-1 text-sm transition-all',
                    isCurrentMonth ? 'text-zinc-300' : 'text-zinc-600',
                    isToday && 'ring-2 ring-indigo-500 ring-offset-1 ring-offset-[#0f0f14]',
                    isSelected && !isToday && 'bg-indigo-500/20 text-indigo-300',
                    !isSelected && 'hover:bg-zinc-800/60',
                  )}
                >
                  <span className="font-medium text-xs">{date.getDate()}</span>
                  {(fus.length > 0 || ints.length > 0) && (
                    <div className="flex gap-0.5">
                      {fus.slice(0, 2).map((fu, i) => (
                        <span key={`fu-${i}`} className={cn('w-1.5 h-1.5 rounded-full', tierDotColor(fu.tier))} />
                      ))}
                      {ints.slice(0, 2).map((_, i) => (
                        <span key={`int-${i}`} className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                      ))}
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Side panel */}
        <div className="bg-[#0f0f14] border border-zinc-800/50 rounded-xl p-6 max-h-[600px] overflow-y-auto">
          <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide mb-1">Eventos para</h3>
          <p className="text-white font-semibold mb-4">{formatSpanishDate(selectedDate)}</p>

          {selectedDayFollowUps.length === 0 && selectedDayInteractions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <CalendarIcon className="w-10 h-10 text-zinc-700 mb-3" />
              <p className="text-zinc-500 text-sm">Sin eventos para este día</p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Interacciones */}
              {selectedDayInteractions.map((i) => (
                <div key={i.id} className="rounded-lg border border-indigo-800/30 bg-indigo-900/10 p-3">
                  <div className="flex items-start gap-2 mb-2">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold bg-indigo-500/20 text-indigo-300 shrink-0">
                      {getInitials(i.contactName)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium text-sm truncate">{i.title}</p>
                      <p className="text-xs text-zinc-400">{i.contactName} • {i.contactCompany}</p>
                    </div>
                    <button onClick={() => setEditingInteraction(i)} className="p-1 text-zinc-400 hover:text-indigo-300 transition-colors">
                      <Edit2 className="w-3 h-3" />
                    </button>
                  </div>
                  {i.description && <p className="text-xs text-zinc-400 mb-2">{i.description}</p>}
                </div>
              ))}

              {/* Follow-ups */}
              {selectedDayFollowUps.map((fu) => (
                <div key={fu.id} className={cn('rounded-lg border p-3', fu.status === 'completed' ? 'bg-emerald-900/10 border-emerald-800/30' : 'bg-zinc-900/50 border-zinc-800/50')}>
                  <div className="flex items-start gap-3 mb-2">
                    <div className={cn('w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0', tierConfig[fu.tier].bgColor, tierConfig[fu.tier].color)}>
                      {getInitials(fu.contactName, fu.contactLastName)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium text-sm">{fu.contactName} {fu.contactLastName}</p>
                      <div className="flex items-center gap-2 text-xs text-zinc-500">
                        <Building2 className="w-3 h-3" />
                        <span className="truncate">{fu.company}</span>
                      </div>
                    </div>
                  </div>
                  {fu.notes && <p className="text-xs text-zinc-400 mb-2 pl-10">{fu.notes}</p>}
                  {(fu.status === 'pending' || fu.status === 'overdue') && (
                    <div className="flex flex-wrap gap-1.5 pl-10">
                      <button onClick={() => handleCompleteFollowUp(fu.id)} className="text-[10px] px-2 py-1 rounded bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors">
                        <Check className="w-3 h-3 inline mr-1" />Completar
                      </button>
                      <button onClick={() => handlePostponeFollowUp(fu.id)} className="text-[10px] px-2 py-1 rounded bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-colors">
                        <Clock className="w-3 h-3 inline mr-1" />+7 días
                      </button>
                      <button onClick={() => handleSkipFollowUp(fu.id)} className="text-[10px] px-2 py-1 rounded bg-zinc-500/10 text-zinc-400 hover:bg-zinc-500/20 transition-colors">
                        <SkipForward className="w-3 h-3 inline mr-1" />Saltar
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Próximos 7 días */}
      <div className="bg-[#0f0f14] border border-zinc-800/50 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-5 h-5 text-indigo-400" />
          <h2 className="text-lg font-semibold text-white">Próximos 7 días</h2>
          <button onClick={() => setShowNewInteraction(true)} className="ml-auto flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors">
            <Plus className="w-3 h-3" />Registrar
          </button>
        </div>

        {upcomingGroupedInt.length === 0 && upcomingGroupedFU.length === 0 ? (
          <p className="text-zinc-500 text-sm">No hay eventos en los próximos 7 días.</p>
        ) : (
          <div className="space-y-5">
            {/* Interacciones */}
            {upcomingGroupedInt.map((group) => (
              <div key={`int-${group.date.toDateString()}`}>
                <h3 className="text-xs font-semibold text-indigo-400 uppercase tracking-wide mb-2">
                  {isSameDay(group.date, today) ? 'Hoy - Interacciones' : `${group.date.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })} - Interacciones`}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {group.items.map((i) => (
                    <div key={i.id} className="flex items-start gap-2 rounded-lg border border-indigo-800/30 bg-indigo-900/10 p-3 hover:border-indigo-700/50 transition-colors">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold bg-indigo-500/20 text-indigo-300 shrink-0">
                        {getInitials(i.contactName)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium truncate">{i.title}</p>
                        <p className="text-xs text-zinc-400 truncate">{i.contactName}</p>
                      </div>
                      <button onClick={() => setEditingInteraction(i)} className="p-1 text-zinc-400 hover:text-indigo-300 transition-colors shrink-0">
                        <Edit2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* Follow-ups */}
            {upcomingGroupedFU.map((group) => (
              <div key={`fu-${group.date.toDateString()}`}>
                <h3 className="text-xs font-semibold text-amber-400 uppercase tracking-wide mb-2">
                  {isSameDay(group.date, today) ? 'Hoy - Seguimientos' : `${group.date.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })} - Seguimientos`}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {group.items.map((fu) => (
                    <div key={fu.id} className="flex items-start gap-2 rounded-lg border border-amber-800/30 bg-amber-900/10 p-3 hover:border-amber-700/50 transition-colors">
                      <div className={cn('w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0', tierConfig[fu.tier].bgColor, tierConfig[fu.tier].color)}>
                        {getInitials(fu.contactName, fu.contactLastName)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium truncate">{fu.contactName} {fu.contactLastName}</p>
                        <p className="text-xs text-zinc-400 truncate">{fu.company}</p>
                      </div>
                      <button onClick={() => { setPlanFollowUp(fu); setShowNewInteraction(true) }} className="p-1 text-zinc-400 hover:text-amber-300 transition-colors shrink-0">
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modales */}
      <InteractionModal
        isOpen={showNewInteraction}
        onClose={() => { setShowNewInteraction(false); setPlanFollowUp(null); setEditingInteraction(null) }}
        contacts={contacts}
        contactId={planFollowUp?.contact_id || editingInteraction?.contact_id}
        contactName={planFollowUp ? `${planFollowUp.contactName} ${planFollowUp.contactLastName}`.trim() : editingInteraction?.contactName}
        defaultDate={planFollowUp ? planFollowUp.dueDate.toISOString().split('T')[0] : editingInteraction?.date || selectedDate.toISOString().split('T')[0]}
        existing={editingInteraction}
        onSaved={() => { setShowNewInteraction(false); setPlanFollowUp(null); setEditingInteraction(null) }}
      />
    </div>
  )
}
