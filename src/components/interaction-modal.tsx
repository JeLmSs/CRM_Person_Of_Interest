'use client'

import { useState } from 'react'
import { X, Download } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { InteractionType, InteractionSentiment, Contact } from '@/lib/types/database'
import { useUser } from '@/lib/supabase/hooks'

const typeLabels: Record<string, string> = { meeting:'Reunión', call:'Llamada', email:'Email', coffee:'Café', lunch:'Comida', event:'Evento', linkedin:'LinkedIn', whatsapp:'WhatsApp', other:'Otro' }
const sentimentOpts = [
  { v:'very_positive', l:'Excelente' },
  { v:'positive', l:'Bien' },
  { v:'neutral', l:'Neutral' },
  { v:'negative', l:'Mal' },
]

export function downloadInteractionICS(title: string, contactName: string, date: string, startTime: string, endTime: string, description?: string | null) {
  const pad = (n: number) => String(n).padStart(2, '0')
  const escape = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n')
  const now = new Date()
  const dtstamp = `${now.getUTCFullYear()}${pad(now.getUTCMonth()+1)}${pad(now.getUTCDate())}T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}Z`
  const [y, mo, d] = date.split('-')
  const [sh, sm] = startTime.split(':')
  const [eh, em] = endTime.split(':')
  const lines = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Sphere CRM//ES', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:sphere-${Date.now()}@sphere-crm`,
    `DTSTAMP:${dtstamp}`,
    `DTSTART;TZID=Europe/Madrid:${y}${mo}${d}T${sh}${sm}00`,
    `DTEND;TZID=Europe/Madrid:${y}${mo}${d}T${eh}${em}00`,
    `SUMMARY:${escape(`${title} — ${contactName}`)}`,
    ...(description ? [`DESCRIPTION:${escape(description)}`] : []),
    'END:VEVENT', 'END:VCALENDAR', '',
  ]
  const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `interaccion-${contactName.replace(/\s+/g, '-').toLowerCase()}.ics`
  a.click()
  URL.revokeObjectURL(url)
}

interface InteractionModalProps {
  isOpen: boolean
  onClose: () => void
  contactId?: string
  contactName?: string
  contacts?: Contact[]
  defaultDate?: string
  /** Pass existing interaction to enable edit mode */
  existing?: any
  onSaved?: () => void
}

function durToEnd(start: string, dur: number) {
  const [h, m] = start.split(':').map(Number)
  const end = h * 60 + m + dur
  return `${String(Math.floor(end / 60)).padStart(2,'0')}:${String(end % 60).padStart(2,'0')}`
}

export default function InteractionModal({ isOpen, onClose, contactId, contactName, contacts, defaultDate, existing, onSaved }: InteractionModalProps) {
  const { user } = useUser()
  const [saving, setSaving] = useState(false)
  const [savedData, setSavedData] = useState<{ contactName: string; title: string; date: string; startTime: string; endTime: string; description: string } | null>(null)
  const [selectedContactId, setSelectedContactId] = useState(contactId || '')
  const [form, setForm] = useState({
    type: (existing?.type || 'meeting') as InteractionType,
    title: existing?.title || '',
    date: existing?.date || defaultDate || new Date().toISOString().split('T')[0],
    sentiment: (existing?.sentiment || 'neutral') as InteractionSentiment,
    startTime: '09:00',
    endTime: existing?.duration_minutes ? durToEnd('09:00', existing.duration_minutes) : '10:00',
    description: existing?.description || '',
  })

  if (!isOpen) return null

  function reset() {
    setForm({ type:'meeting', title:'', date: new Date().toISOString().split('T')[0], sentiment:'neutral', startTime:'09:00', endTime:'10:00', description:'' })
    setSelectedContactId(contactId || '')
    setSavedData(null)
  }

  function handleClose() { reset(); onClose() }

  async function handleSave() {
    const cid = contactId || selectedContactId
    if (!cid && !existing) return alert('Selecciona un contacto')
    if (!form.title.trim()) return alert('Título requerido')
    if (!user) return alert('Sesión no encontrada, recarga la página')
    setSaving(true)
    try {
      const supabase = createClient()
      const [sh, sm] = form.startTime.split(':').map(Number)
      const [eh, em] = form.endTime.split(':').map(Number)
      const duration = Math.max(15, (eh * 60 + em) - (sh * 60 + sm))
      const payload = { type: form.type, title: form.title, date: form.date, sentiment: form.sentiment, description: form.description || null, duration_minutes: duration }
      let error
      if (existing) {
        ;({ error } = await supabase.from('interactions').update(payload).eq('id', existing.id))
      } else {
        ;({ error } = await supabase.from('interactions').insert({ user_id: user.id, contact_id: cid!, ...payload }))
      }
      if (error) throw error
      const resolvedContact = contacts?.find(c => c.id === cid)
      const resolvedName = contactName || (resolvedContact ? `${resolvedContact.first_name} ${resolvedContact.last_name || ''}`.trim() : '')
      setSavedData({ contactName: resolvedName, title: form.title, date: form.date, startTime: form.startTime, endTime: form.endTime, description: form.description })
      onSaved?.()
    } catch (e) {
      alert('Error al guardar: ' + (e instanceof Error ? e.message : 'Intenta de nuevo'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />
      <div className="relative bg-[#0f0f14] border border-zinc-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white">{savedData ? (existing ? 'Interacción actualizada' : 'Interacción guardada') : (existing ? 'Editar interacción' : 'Registrar interacción')}</h2>
          <button onClick={handleClose} className="p-1 hover:bg-zinc-800 rounded-lg text-zinc-400"><X className="w-5 h-5" /></button>
        </div>

        {savedData ? (
          <div className="space-y-4">
            <p className="text-sm text-zinc-300">
              La interacción <strong className="text-white">{savedData.title}</strong>
              {savedData.contactName && <> con <strong className="text-white">{savedData.contactName}</strong></>} ha sido guardada.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => downloadInteractionICS(savedData.title, savedData.contactName, savedData.date, savedData.startTime, savedData.endTime, savedData.description)}
                className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-lg text-sm font-medium transition-colors"
              >
                <Download className="w-4 h-4" /> Exportar .ics
              </button>
              <button onClick={handleClose} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium">Cerrar</button>
            </div>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {!contactId && contacts && (
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">Contacto</label>
                  <select value={selectedContactId} onChange={e => setSelectedContactId(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-900/50 border border-zinc-800 rounded-lg text-sm text-zinc-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/50">
                    <option value="">Selecciona un contacto</option>
                    {contacts.map(c => <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>)}
                  </select>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">Tipo</label>
                  <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value as InteractionType }))}
                    className="w-full px-3 py-2 bg-zinc-900/50 border border-zinc-800 rounded-lg text-sm text-zinc-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/50">
                    {Object.entries(typeLabels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">Sentimiento</label>
                  <select value={form.sentiment} onChange={e => setForm(p => ({ ...p, sentiment: e.target.value as InteractionSentiment }))}
                    className="w-full px-3 py-2 bg-zinc-900/50 border border-zinc-800 rounded-lg text-sm text-zinc-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/50">
                    {sentimentOpts.map(s => <option key={s.v} value={s.v}>{s.l}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Título</label>
                <input type="text" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                  className="w-full px-3 py-2 bg-zinc-900/50 border border-zinc-800 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50" placeholder="Café en el Retiro" />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Fecha</label>
                <input type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
                  className="w-full px-3 py-2 bg-zinc-900/50 border border-zinc-800 rounded-lg text-sm text-zinc-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/50" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">Hora inicio</label>
                  <input type="time" value={form.startTime} onChange={e => setForm(p => ({ ...p, startTime: e.target.value }))}
                    className="w-full px-3 py-2 bg-zinc-900/50 border border-zinc-800 rounded-lg text-sm text-zinc-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/50" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">Hora fin</label>
                  <input type="time" value={form.endTime} onChange={e => setForm(p => ({ ...p, endTime: e.target.value }))}
                    className="w-full px-3 py-2 bg-zinc-900/50 border border-zinc-800 rounded-lg text-sm text-zinc-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/50" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Descripción</label>
                <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={3}
                  className="w-full px-3 py-2 bg-zinc-900/50 border border-zinc-800 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none" />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-4">
              <button onClick={handleClose} className="px-4 py-2 text-sm text-zinc-400 hover:text-white">Cancelar</button>
              <button onClick={handleSave} disabled={saving} className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium">{saving ? 'Guardando...' : 'Guardar'}</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
