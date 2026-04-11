'use client'

import { useState, useMemo, useEffect } from 'react'
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Check,
  Clock,
  SkipForward,
  User,
  Building2,
  MessageSquare,
} from 'lucide-react'
import { cn, tierConfig, getInitials } from '@/lib/utils'
import { ContactTier, FollowUpStatus } from '@/lib/types/database'

// ---------- Types ----------
interface DemoFollowUp {
  id: string
  contactName: string
  contactLastName: string
  company: string
  tier: ContactTier
  dueDate: Date
  status: FollowUpStatus
  notes: string | null
  suggestedTopics: string[]
}

// ---------- Demo data helpers ----------
function buildDemoData(): DemoFollowUp[] {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth()

  const contacts: Omit<DemoFollowUp, 'id' | 'dueDate' | 'status' | 'notes' | 'suggestedTopics'>[] = [
    { contactName: 'Carlos', contactLastName: 'Mendoza', company: 'TechVentures MX', tier: 'S' },
    { contactName: 'Ana', contactLastName: 'Gutierrez', company: 'Fintech Solutions', tier: 'A' },
    { contactName: 'Roberto', contactLastName: 'Salinas', company: 'Global Consulting', tier: 'B' },
    { contactName: 'Maria', contactLastName: 'Torres', company: 'StartupHub', tier: 'S' },
    { contactName: 'Javier', contactLastName: 'Ruiz', company: 'DataSync Labs', tier: 'A' },
    { contactName: 'Lucia', contactLastName: 'Fernandez', company: 'Creative Agency', tier: 'C' },
    { contactName: 'Diego', contactLastName: 'Herrera', company: 'Blockchain MX', tier: 'B' },
    { contactName: 'Sofia', contactLastName: 'Castillo', company: 'EduTech', tier: 'A' },
    { contactName: 'Pablo', contactLastName: 'Navarro', company: 'CloudFirst', tier: 'C' },
    { contactName: 'Elena', contactLastName: 'Morales', company: 'HealthPlus', tier: 'D' },
  ]

  const topics = [
    ['Proyecto de IA', 'Revisión trimestral'],
    ['Propuesta de inversión', 'Due diligence'],
    ['Actualización de contrato', 'Networking event'],
    ['Demo de producto', 'Feedback sobre MVP'],
    ['Colaboración técnica', 'Integración API'],
    ['Campaña de marca', 'Diseño de UX'],
    ['Tokenización', 'Regulación cripto'],
    ['Programa educativo', 'Alianza universitaria'],
    ['Migración a cloud', 'Seguridad'],
    ['Telemedicina', 'Datos de pacientes'],
  ]

  const notes = [
    'Confirmar agenda antes del miércoles',
    'Preparar presentación de avances',
    'Enviar resumen ejecutivo previo',
    null,
    'Compartir documentación técnica',
    'Revisar portafolio actualizado',
    null,
    'Coordinar con equipo académico',
    'Revisar SLA propuesto',
    null,
  ]

  // Spread follow-ups across the month — some past, some today, some future
  const dayOffsets = [-5, -2, 0, 0, 1, 2, 3, 5, 6, 10]

  return contacts.map((c, i) => {
    const date = new Date(y, m, now.getDate() + dayOffsets[i])
    return {
      id: `fu-${i + 1}`,
      ...c,
      dueDate: date,
      status: dayOffsets[i] < 0 ? 'overdue' as FollowUpStatus : 'pending' as FollowUpStatus,
      notes: notes[i],
      suggestedTopics: topics[i],
    }
  })
}

// ---------- Helpers ----------
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
  // Monday-based: 0 = Mon … 6 = Sun
  let startOffset = firstDay.getDay() - 1
  if (startOffset < 0) startOffset = 6

  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: (Date | null)[] = []

  for (let i = 0; i < startOffset; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d))
  // fill trailing
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}

function tierDotColor(tier: ContactTier): string {
  const map: Record<ContactTier, string> = {
    S: 'bg-amber-400',
    A: 'bg-violet-400',
    B: 'bg-blue-400',
    C: 'bg-emerald-400',
    D: 'bg-zinc-400',
  }
  return map[tier]
}

// ---------- Component ----------
export default function CalendarPage() {
  const [loading, setLoading] = useState(true)
  const [followUps, setFollowUps] = useState<DemoFollowUp[]>([])
  const today = useMemo(() => new Date(), [])
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())
  const [selectedDate, setSelectedDate] = useState<Date>(today)

  // Simulate loading
  useEffect(() => {
    const t = setTimeout(() => {
      setFollowUps(buildDemoData())
      setLoading(false)
    }, 600)
    return () => clearTimeout(t)
  }, [])

  // Calendar grid
  const calendarDays = useMemo(() => getCalendarDays(viewYear, viewMonth), [viewYear, viewMonth])

  // Follow-ups indexed by date string
  const followUpsByDate = useMemo(() => {
    const map: Record<string, DemoFollowUp[]> = {}
    followUps.forEach((fu) => {
      const key = fu.dueDate.toDateString()
      if (!map[key]) map[key] = []
      map[key].push(fu)
    })
    return map
  }, [followUps])

  // Selected day follow-ups
  const selectedFollowUps = useMemo(
    () => followUpsByDate[selectedDate.toDateString()] || [],
    [followUpsByDate, selectedDate],
  )

  // Upcoming 7 days
  const upcoming7 = useMemo(() => {
    const start = new Date(today)
    start.setHours(0, 0, 0, 0)
    const end = new Date(today)
    end.setDate(end.getDate() + 7)
    end.setHours(23, 59, 59, 999)
    return followUps
      .filter((fu) => fu.dueDate >= start && fu.dueDate <= end && fu.status !== 'completed' && fu.status !== 'skipped')
      .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())
  }, [followUps, today])

  // Group upcoming by day
  const upcomingGrouped = useMemo(() => {
    const groups: { date: Date; items: DemoFollowUp[] }[] = []
    const map = new Map<string, DemoFollowUp[]>()
    upcoming7.forEach((fu) => {
      const key = fu.dueDate.toDateString()
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(fu)
    })
    map.forEach((items, key) => {
      groups.push({ date: new Date(key), items })
    })
    groups.sort((a, b) => a.date.getTime() - b.date.getTime())
    return groups
  }, [upcoming7])

  // Nav
  function prevMonth() {
    if (viewMonth === 0) { setViewYear(viewYear - 1); setViewMonth(11) }
    else setViewMonth(viewMonth - 1)
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewYear(viewYear + 1); setViewMonth(0) }
    else setViewMonth(viewMonth + 1)
  }

  // Actions
  function handleComplete(id: string) {
    setFollowUps((prev) => prev.map((fu) => fu.id === id ? { ...fu, status: 'completed' as FollowUpStatus } : fu))
  }
  function handlePostpone(id: string) {
    setFollowUps((prev) =>
      prev.map((fu) => {
        if (fu.id !== id) return fu
        const newDate = new Date(fu.dueDate)
        newDate.setDate(newDate.getDate() + 7)
        return { ...fu, dueDate: newDate }
      }),
    )
  }
  function handleSkip(id: string) {
    setFollowUps((prev) => prev.map((fu) => fu.id === id ? { ...fu, status: 'skipped' as FollowUpStatus } : fu))
  }

  // ---------- Loading skeleton ----------
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
          <h1 className="text-2xl font-bold text-white">Calendario de Seguimientos</h1>
          <p className="text-sm text-zinc-400">Visualiza y gestiona tus seguimientos programados</p>
        </div>
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-2 bg-[#0f0f14] border border-zinc-800/50 rounded-xl p-4 md:p-6">
          {/* Month nav */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={prevMonth}
              className="p-2 rounded-lg hover:bg-zinc-800 transition-colors text-zinc-400 hover:text-white"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-semibold text-white">{getMonthLabel(viewYear, viewMonth)}</h2>
            <button
              onClick={nextMonth}
              className="p-2 rounded-lg hover:bg-zinc-800 transition-colors text-zinc-400 hover:text-white"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Day names */}
          <div className="grid grid-cols-7 mb-2">
            {DAY_NAMES.map((d) => (
              <div key={d} className="text-center text-xs font-medium text-zinc-500 py-1">{d}</div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((date, idx) => {
              if (!date) {
                return <div key={`empty-${idx}`} className="aspect-square" />
              }
              const key = date.toDateString()
              const fus = followUpsByDate[key] || []
              const isToday = isSameDay(date, today)
              const isSelected = isSameDay(date, selectedDate)
              const isCurrentMonth = date.getMonth() === viewMonth

              return (
                <button
                  key={key}
                  onClick={() => setSelectedDate(date)}
                  className={cn(
                    'aspect-square rounded-lg flex flex-col items-center justify-center gap-1 text-sm transition-all duration-200 relative',
                    isCurrentMonth ? 'text-zinc-300' : 'text-zinc-600',
                    isToday && 'ring-2 ring-indigo-500 ring-offset-1 ring-offset-[#0f0f14]',
                    isSelected && !isToday && 'bg-indigo-500/20 text-indigo-300',
                    isSelected && isToday && 'bg-indigo-500/20',
                    !isSelected && 'hover:bg-zinc-800/60',
                  )}
                >
                  <span className="font-medium">{date.getDate()}</span>
                  {fus.length > 0 && (
                    <div className="flex gap-0.5">
                      {fus.slice(0, 3).map((fu, i) => (
                        <span key={i} className={cn('w-1.5 h-1.5 rounded-full', tierDotColor(fu.tier))} />
                      ))}
                      {fus.length > 3 && (
                        <span className="text-[8px] text-zinc-500">+{fus.length - 3}</span>
                      )}
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Side panel */}
        <div className="bg-[#0f0f14] border border-zinc-800/50 rounded-xl p-4 md:p-6 max-h-[500px] overflow-y-auto">
          <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide mb-1">
            Seguimientos para
          </h3>
          <p className="text-white font-semibold mb-4">{formatSpanishDate(selectedDate)}</p>

          {selectedFollowUps.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <CalendarIcon className="w-10 h-10 text-zinc-700 mb-3" />
              <p className="text-zinc-500 text-sm">Sin seguimientos para este dia</p>
            </div>
          ) : (
            <div className="space-y-3">
              {selectedFollowUps.map((fu) => (
                <div
                  key={fu.id}
                  className={cn(
                    'rounded-lg border p-3 transition-all duration-300',
                    fu.status === 'completed'
                      ? 'bg-emerald-900/10 border-emerald-800/30 opacity-60'
                      : fu.status === 'skipped'
                        ? 'bg-zinc-800/20 border-zinc-700/30 opacity-50'
                        : 'bg-zinc-900/50 border-zinc-800/50',
                  )}
                >
                  {/* Contact info */}
                  <div className="flex items-start gap-3 mb-2">
                    <div className={cn(
                      'w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0',
                      tierConfig[fu.tier].bgColor,
                      tierConfig[fu.tier].color,
                    )}>
                      {getInitials(fu.contactName, fu.contactLastName)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-white font-medium text-sm truncate">
                        {fu.contactName} {fu.contactLastName}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-zinc-500">
                        <Building2 className="w-3 h-3" />
                        <span className="truncate">{fu.company}</span>
                      </div>
                    </div>
                    <span className={cn(
                      'text-[10px] font-bold px-1.5 py-0.5 rounded border shrink-0',
                      tierConfig[fu.tier].bgColor,
                      tierConfig[fu.tier].color,
                    )}>
                      {fu.tier}
                    </span>
                  </div>

                  {/* Notes */}
                  {fu.notes && (
                    <div className="flex items-start gap-2 mb-2 pl-12">
                      <MessageSquare className="w-3 h-3 text-zinc-600 mt-0.5 shrink-0" />
                      <p className="text-xs text-zinc-400">{fu.notes}</p>
                    </div>
                  )}

                  {/* Actions */}
                  {fu.status === 'pending' || fu.status === 'overdue' ? (
                    <div className="flex gap-2 pl-12 mt-2">
                      <button
                        onClick={() => handleComplete(fu.id)}
                        className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-md bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors border border-emerald-500/20"
                      >
                        <Check className="w-3 h-3" /> Completar
                      </button>
                      <button
                        onClick={() => handlePostpone(fu.id)}
                        className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-md bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-colors border border-amber-500/20"
                      >
                        <Clock className="w-3 h-3" /> Posponer 1 semana
                      </button>
                      <button
                        onClick={() => handleSkip(fu.id)}
                        className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-md bg-zinc-500/10 text-zinc-400 hover:bg-zinc-500/20 transition-colors border border-zinc-500/20"
                      >
                        <SkipForward className="w-3 h-3" /> Saltar
                      </button>
                    </div>
                  ) : (
                    <div className="pl-12 mt-1">
                      <span className={cn(
                        'text-[11px] font-medium px-2 py-0.5 rounded',
                        fu.status === 'completed' ? 'text-emerald-400 bg-emerald-400/10' : 'text-zinc-500 bg-zinc-800/50',
                      )}>
                        {fu.status === 'completed' ? 'Completado' : 'Saltado'}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Upcoming 7 days */}
      <div className="bg-[#0f0f14] border border-zinc-800/50 rounded-xl p-4 md:p-6">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-5 h-5 text-indigo-400" />
          <h2 className="text-lg font-semibold text-white">Proximos 7 dias</h2>
        </div>

        {upcomingGrouped.length === 0 ? (
          <p className="text-zinc-500 text-sm py-4">No hay seguimientos pendientes en los proximos 7 dias.</p>
        ) : (
          <div className="space-y-5">
            {upcomingGrouped.map((group) => (
              <div key={group.date.toDateString()}>
                <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2">
                  {isSameDay(group.date, today) ? 'Hoy' : formatSpanishDate(group.date)}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                  {group.items.map((fu) => (
                    <div
                      key={fu.id}
                      className="flex items-start gap-3 rounded-lg border border-zinc-800/50 bg-zinc-900/40 p-3 hover:border-zinc-700/60 transition-colors"
                    >
                      <div className={cn(
                        'w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0',
                        tierConfig[fu.tier].bgColor,
                        tierConfig[fu.tier].color,
                      )}>
                        {getInitials(fu.contactName, fu.contactLastName)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-white text-sm font-medium truncate">
                            {fu.contactName} {fu.contactLastName}
                          </p>
                          <span className={cn(
                            'text-[10px] font-bold px-1.5 py-0.5 rounded border shrink-0',
                            tierConfig[fu.tier].bgColor,
                            tierConfig[fu.tier].color,
                          )}>
                            {fu.tier}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-500 truncate">{fu.company}</p>
                        {fu.suggestedTopics.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {fu.suggestedTopics.map((t, i) => (
                              <span
                                key={i}
                                className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20"
                              >
                                {t}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
