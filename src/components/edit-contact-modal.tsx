'use client'
import { useState } from 'react'
import { X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Contact, ContactTier, FollowUpFrequency } from '@/lib/types/database'

const tierOptions: ContactTier[] = ['S', 'A', 'B', 'C', 'D']
const freqOptions: { v: FollowUpFrequency; l: string }[] = [
  { v: 'daily', l: 'Diario' },
  { v: 'weekly', l: 'Semanal' },
  { v: 'biweekly', l: 'Quincenal' },
  { v: 'monthly', l: 'Mensual' },
  { v: 'quarterly', l: 'Trimestral' },
  { v: 'annually', l: 'Anual (ej. felicitar Navidad)' },
]

interface Props {
  contact: Contact
  isOpen: boolean
  onClose: () => void
  onSaved: (updated: Contact) => void
}

export default function EditContactModal({ contact, isOpen, onClose, onSaved }: Props) {
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    first_name: contact.first_name,
    last_name: contact.last_name || '',
    email: contact.email || '',
    phone: contact.phone || '',
    company: contact.company || '',
    job_title: contact.job_title || '',
    city: contact.city || '',
    country: contact.country || '',
    linkedin_url: contact.linkedin_url || '',
    tier: contact.tier,
    follow_up_frequency: contact.follow_up_frequency,
    next_follow_up_date: contact.next_follow_up_date ? contact.next_follow_up_date.split('T')[0] : '',
  })

  if (!isOpen) return null

  const f = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(p => ({ ...p, [field]: e.target.value }))

  async function handleSave() {
    if (!form.first_name.trim()) return alert('El nombre es obligatorio')
    setSaving(true)
    try {
      const supabase = createClient()
      const update = {
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim() || null,
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        company: form.company.trim() || null,
        job_title: form.job_title.trim() || null,
        city: form.city.trim() || null,
        country: form.country.trim() || null,
        linkedin_url: form.linkedin_url.trim() || null,
        tier: form.tier,
        follow_up_frequency: form.follow_up_frequency,
        next_follow_up_date: form.next_follow_up_date || null,
      }
      const { data, error } = await supabase.from('contacts').update(update).eq('id', contact.id).select().single()
      if (error) throw error
      onSaved(data as Contact)
      onClose()
    } catch (e) {
      alert('Error al guardar: ' + (e instanceof Error ? e.message : 'Intenta de nuevo'))
    } finally {
      setSaving(false)
    }
  }

  const inputCls = 'w-full px-3 py-2 bg-zinc-900/50 border border-zinc-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50'
  const labelCls = 'block text-xs font-medium text-zinc-400 mb-1'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#0f0f14] border border-zinc-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white">Editar contacto</h2>
          <button onClick={onClose} className="p-1 hover:bg-zinc-800 rounded-lg text-zinc-400"><X className="w-5 h-5" /></button>
        </div>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><label className={labelCls}>Nombre *</label><input value={form.first_name} onChange={f('first_name')} className={inputCls} /></div>
            <div><label className={labelCls}>Apellido</label><input value={form.last_name} onChange={f('last_name')} className={inputCls} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={labelCls}>Email</label><input type="email" value={form.email} onChange={f('email')} className={inputCls} /></div>
            <div><label className={labelCls}>Teléfono</label><input value={form.phone} onChange={f('phone')} className={inputCls} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={labelCls}>Empresa</label><input value={form.company} onChange={f('company')} className={inputCls} /></div>
            <div><label className={labelCls}>Cargo</label><input value={form.job_title} onChange={f('job_title')} className={inputCls} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={labelCls}>Ciudad</label><input value={form.city} onChange={f('city')} className={inputCls} /></div>
            <div><label className={labelCls}>País</label><input value={form.country} onChange={f('country')} className={inputCls} /></div>
          </div>
          <div><label className={labelCls}>LinkedIn URL</label><input value={form.linkedin_url} onChange={f('linkedin_url')} className={inputCls} placeholder="https://linkedin.com/in/..." /></div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Tier</label>
              <select value={form.tier} onChange={f('tier')} className={inputCls}>
                {tierOptions.map(t => <option key={t} value={t}>Tier {t}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Frecuencia seguimiento</label>
              <select value={form.follow_up_frequency} onChange={f('follow_up_frequency')} className={inputCls}>
                {freqOptions.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
              </select>
            </div>
          </div>
          <div><label className={labelCls}>Próximo seguimiento</label><input type="date" value={form.next_follow_up_date} onChange={f('next_follow_up_date')} className={inputCls} /></div>
        </div>
        <div className="flex justify-end gap-3 mt-5">
          <button onClick={onClose} className="px-4 py-2 text-sm text-zinc-400 hover:text-white">Cancelar</button>
          <button onClick={handleSave} disabled={saving} className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium">
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </div>
  )
}
