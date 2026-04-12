'use client'

import { useState, useEffect } from 'react'
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Clock, Plus, Edit2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn, tierConfig, getInitials } from '@/lib/utils'
import { Contact } from '@/lib/types/database'
import InteractionModal from '@/components/interaction-modal'

interface CalendarInteraction {
  id: string
  contact_id: string
  type: string
  title: string
  description: string | null
  sentiment: string
  date: string
  duration_minutes: number | null
}

interface CalendarFollowUp {
  id: string
  contact_id: string
  due_date: string
  status: string
  notes: string | null
  suggested_topics: string[] | null
  contact?: Contact
}

const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
const dayNames = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

function getCalendarDays(year: number, month: number): (Date | null)[] {
  const first = new Date(year, month, 1)
  let startOffset = first.getDay() - 1
  if (startOffset < 0) startOffset = 6
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: (Date | null)[] = []
  for (let i = 0; i < startOffset; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d))
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}

function parseDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function dateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

export default function CalendarPage() {
  const today = new Date()
  const [loading, setLoading] = useState(true)
  const [contacts, setContacts] = useState<Contact[]>([])
  const [interactions, setInteractions] = useState<CalendarInteraction[]>([])
  const [followUps, setFollowUps] = useState<CalendarFollowUp[]>([])
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())
  const [selectedDate, setSelectedDate] = useState(today)
  const [showModal, setShowModal] = useState(false)
  const [editingInteraction, setEditingInteraction] = useState<CalendarInteraction | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        console.log('Calendar: User logged in?', !!user, user?.id)

        if (user) {
          // Load contacts
          const { data: contactsData, error: contactsError } = await supabase.from('contacts').select('*').eq('status', 'active')
          console.log('Calendar: Contacts loaded', contactsData?.length || 0, contactsError)
          if (contactsData) setContacts(contactsData as Contact[])

          // Load interactions
          const { data: interactionsData, error: interactionsError } = await supabase.from('interactions').select('*').order('date', { ascending: false })
          console.log('Calendar: Interactions loaded', interactionsData?.length || 0, interactionsError)
          console.log('Calendar: Interactions raw data:', interactionsData)
          if (interactionsData) setInteractions(interactionsData as CalendarInteraction[])

          // Load follow-ups
          const { data: followUpsData, error: followUpsError } = await supabase.from('follow_ups').select('*').not('status', 'in', '("completed","skipped")')
          console.log('Calendar: Follow-ups loaded', followUpsData?.length || 0, followUpsError)
          if (followUpsData) {
            const enriched = (followUpsData as any[]).map(fu => ({
              ...fu,
              contact: contactsData?.find(c => c.id === fu.contact_id)
            }))
            setFollowUps(enriched)
          }
        }
      } catch (e) {
        console.error('Calendar load error:', e)
      }
      setLoading(false)
    }
    load()
  }, [])

  const calendarDays = getCalendarDays(viewYear, viewMonth)
  const interactionsByDate = interactions.reduce((acc, i) => {
    if (!acc[i.date]) acc[i.date] = []
    acc[i.date].push(i)
    return acc
  }, {} as Record<string, CalendarInteraction[]>)

  const followUpsByDate = followUps.reduce((acc, fu) => {
    if (!acc[fu.due_date]) acc[fu.due_date] = []
    acc[fu.due_date].push(fu)
    return acc
  }, {} as Record<string, CalendarFollowUp[]>)

  const selectedDateStr = dateKey(selectedDate)
  const dayInteractions = interactionsByDate[selectedDateStr] || []
  const dayFollowUps = followUpsByDate[selectedDateStr] || []

  const upcomingStart = new Date(today)
  upcomingStart.setHours(0, 0, 0, 0)
  const upcomingEnd = new Date(today)
  upcomingEnd.setDate(upcomingEnd.getDate() + 7)

  const upcomingInteractions = interactions.filter(i => {
    const d = parseDate(i.date)
    return d >= upcomingStart && d <= upcomingEnd
  }).sort((a, b) => a.date.localeCompare(b.date))

  const upcomingFollowUps = followUps.filter(fu => {
    const d = parseDate(fu.due_date)
    return d >= upcomingStart && d <= upcomingEnd
  }).sort((a, b) => a.due_date.localeCompare(b.due_date))

  const getContactInfo = (contactId: string) => contacts.find(c => c.id === contactId)

  const handleTestCreateInteraction = async () => {
    try {
      if (contacts.length === 0) {
        alert('No hay contactos disponibles para probar')
        return
      }
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        alert('No hay sesión')
        return
      }

      const testPayload = {
        user_id: user.id,
        contact_id: contacts[0].id,
        type: 'meeting' as const,
        title: 'TEST - ' + new Date().toISOString(),
        date: dateKey(today),
        sentiment: 'neutral' as const,
        description: 'Test interaction from debug panel',
        duration_minutes: 30
      }

      console.log('Test: Attempting to insert:', testPayload)
      const { data, error } = await supabase.from('interactions').insert([testPayload])

      if (error) {
        console.error('Test: Insert error:', error)
        alert('ERROR AL GUARDAR:\n\nCódigo: ' + error.code + '\nMensaje: ' + error.message + '\n\nRevisa la consola para más detalles')
      } else {
        console.log('Test: Insert success:', data)
        alert('SUCCESS! La interacción se guardó. Recarga la página para verla en el calendario.')
        // Reload interactions
        const { data: newInteractions } = await supabase.from('interactions').select('*').order('date', { ascending: false })
        if (newInteractions) setInteractions(newInteractions as CalendarInteraction[])
      }
    } catch (e) {
      console.error('Test: Exception:', e)
      alert('EXCEPCIÓN: ' + (e instanceof Error ? e.message : String(e)))
    }
  }

  if (loading) return <div className="animate-pulse space-y-6"><div className="h-96 bg-zinc-800/50 rounded-xl" /></div>

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-indigo-500/10">
          <CalendarIcon className="w-5 h-5 text-indigo-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Calendario</h1>
          <p className="text-sm text-zinc-400">Seguimientos (ámbar) e Interacciones (azul)</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-[#0f0f14] border border-zinc-800/50 rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <button onClick={() => { if (viewMonth === 0) { setViewYear(viewYear - 1); setViewMonth(11) } else setViewMonth(viewMonth - 1) }} className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-semibold text-white">{months[viewMonth]} {viewYear}</h2>
            <button onClick={() => { if (viewMonth === 11) { setViewYear(viewYear + 1); setViewMonth(0) } else setViewMonth(viewMonth + 1) }} className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-7 mb-2 gap-1">
            {dayNames.map(d => <div key={d} className="text-center text-xs font-medium text-zinc-500 py-2">{d}</div>)}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((date, idx) => {
              if (!date) return <div key={`e${idx}`} className="aspect-square" />
              const key = dateKey(date)
              const ints = interactionsByDate[key] || []
              const fus = followUpsByDate[key] || []
              const isToday = isSameDay(date, today)
              const isSelected = isSameDay(date, selectedDate)
              const isCurrentMonth = date.getMonth() === viewMonth

              return (
                <button
                  key={key}
                  onClick={() => setSelectedDate(date)}
                  className={cn('aspect-square rounded-lg flex flex-col items-center justify-center gap-1 text-sm font-medium transition-all', isCurrentMonth ? 'text-zinc-300' : 'text-zinc-600', isToday && 'ring-2 ring-indigo-500 ring-offset-1 ring-offset-[#0f0f14]', isSelected && !isToday && 'bg-indigo-500/20', !isSelected && 'hover:bg-zinc-800/40')}
                >
                  <span className="text-xs">{date.getDate()}</span>
                  {(ints.length > 0 || fus.length > 0) && (
                    <div className="flex gap-0.5">
                      {fus.slice(0, 2).map((_, i) => <span key={`fu${i}`} className="w-1.5 h-1.5 rounded-full bg-amber-400" />)}
                      {ints.slice(0, 2).map((_, i) => <span key={`int${i}`} className="w-1.5 h-1.5 rounded-full bg-indigo-400" />)}
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        <div className="bg-[#0f0f14] border border-zinc-800/50 rounded-xl p-6 max-h-[600px] overflow-y-auto">
          <h3 className="text-sm font-semibold text-zinc-400 mb-2">EVENTOS PARA</h3>
          <p className="text-white font-semibold mb-4">{selectedDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
          {dayInteractions.length === 0 && dayFollowUps.length === 0 ? (
            <p className="text-zinc-500 text-sm text-center py-8">Sin eventos</p>
          ) : (
            <div className="space-y-3">
              {dayInteractions.map(i => {
                const contact = getContactInfo(i.contact_id)
                return (
                  <div key={i.id} className="rounded-lg border border-indigo-800/30 bg-indigo-900/10 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium text-sm truncate">{i.title}</p>
                        <p className="text-xs text-zinc-400">{contact?.first_name} {contact?.last_name}</p>
                      </div>
                      <button onClick={() => { setEditingInteraction(i); setShowModal(true) }} className="p-1 text-zinc-400 hover:text-indigo-300 shrink-0">
                        <Edit2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                )
              })}
              {dayFollowUps.map(fu => {
                const contact = fu.contact
                return (
                  <div key={fu.id} className="rounded-lg border border-amber-800/30 bg-amber-900/10 p-3">
                    <div className={cn('w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold', tierConfig[contact?.tier || 'C'].bgColor, tierConfig[contact?.tier || 'C'].color)}>
                      {getInitials(contact?.first_name || '', contact?.last_name || '')}
                    </div>
                    <p className="text-white font-medium text-sm mt-2">{contact?.first_name} {contact?.last_name}</p>
                    <p className="text-xs text-zinc-400">{contact?.company}</p>
                    {fu.notes && <p className="text-xs text-zinc-500 mt-1">{fu.notes}</p>}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      <div className="bg-[#0f0f14] border border-zinc-800/50 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Clock className="w-5 h-5 text-indigo-400" />Próximos 7 días
          </h2>
          <button onClick={() => { setEditingInteraction(null); setShowModal(true) }} className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-indigo-600 hover:bg-indigo-500 rounded-lg">
            <Plus className="w-3 h-3" />Registrar
          </button>
        </div>
        {upcomingInteractions.length === 0 && upcomingFollowUps.length === 0 ? (
          <p className="text-zinc-500 text-sm">No hay eventos próximos</p>
        ) : (
          <div className="space-y-4">
            {upcomingInteractions.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-indigo-400 mb-2 uppercase">Interacciones</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {upcomingInteractions.map(i => {
                    const contact = getContactInfo(i.contact_id)
                    return (
                      <div key={i.id} className="flex items-start gap-2 rounded-lg border border-indigo-800/30 bg-indigo-900/10 p-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold bg-indigo-500/20 text-indigo-300 shrink-0">
                          {getInitials(contact?.first_name || '', contact?.last_name || '')}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm font-medium truncate">{i.title}</p>
                          <p className="text-xs text-zinc-400">{contact?.first_name}</p>
                          <p className="text-[10px] text-zinc-500">{i.date}</p>
                        </div>
                        <button onClick={() => { setEditingInteraction(i); setShowModal(true) }} className="p-1 text-zinc-400 hover:text-indigo-300 shrink-0">
                          <Edit2 className="w-3 h-3" />
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
            {upcomingFollowUps.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-amber-400 mb-2 uppercase">Seguimientos</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {upcomingFollowUps.map(fu => {
                    const contact = fu.contact
                    return (
                      <div key={fu.id} className="flex items-start gap-2 rounded-lg border border-amber-800/30 bg-amber-900/10 p-3">
                        <div className={cn('w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0', tierConfig[contact?.tier || 'C'].bgColor, tierConfig[contact?.tier || 'C'].color)}>
                          {getInitials(contact?.first_name || '', contact?.last_name || '')}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm font-medium">{contact?.first_name} {contact?.last_name}</p>
                          <p className="text-xs text-zinc-400">{contact?.company}</p>
                          <p className="text-[10px] text-zinc-500">{fu.due_date}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <InteractionModal isOpen={showModal} onClose={() => { setShowModal(false); setEditingInteraction(null) }} contacts={contacts} contactId={editingInteraction?.contact_id} defaultDate={editingInteraction?.date || dateKey(selectedDate)} existing={editingInteraction} onSaved={() => { setShowModal(false); setEditingInteraction(null) }} />

      {/* Debug info */}
      <div className="bg-zinc-900/50 border border-zinc-700/50 rounded-lg p-4 space-y-2">
        <div className="text-xs text-zinc-400 font-mono">
          <p>Contactos={contacts.length} | Interacciones={interactions.length} | Seguimientos={followUps.length}</p>
          {interactions.length > 0 && <p>Primera interacción: {interactions[0].date} - {interactions[0].title}</p>}
        </div>
        <button onClick={handleTestCreateInteraction} className="w-full px-3 py-2 text-xs bg-red-600 hover:bg-red-500 text-white rounded-lg font-medium">
          🧪 TEST: Crear interacción de prueba
        </button>
      </div>
    </div>
  )
}
