'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Contact, ContactTier, ContactStatus } from '@/lib/types/database'
import { tierConfig, getRelationshipColor, getDaysUntilFollowUp, getFollowUpUrgency, getInitials, formatRelativeDate } from '@/lib/utils'
import { Plus, Search, LayoutGrid, List, X, Users, Phone, Mail, ExternalLink, ChevronDown, ArrowUpDown, BookUser } from 'lucide-react'
import Link from 'next/link'
import { loadContacts } from '@/lib/supabase/data-loaders'

const demoContacts: Contact[] = [
  { id: '1', user_id: '', first_name: 'Carlos', last_name: 'Mendoza', email: 'carlos@iberdrola.com', phone: '+34 612 345 678', company: 'Iberdrola', job_title: 'Director de Innovación', linkedin_url: 'https://linkedin.com/in/carlosmendoza', linkedin_profile_data: null, avatar_url: null, tier: 'S', status: 'active', follow_up_frequency: 'weekly', custom_follow_up_days: null, last_contact_date: new Date(Date.now() - 3 * 86400000).toISOString(), next_follow_up_date: new Date(Date.now() - 1 * 86400000).toISOString(), relationship_score: 92, city: 'Madrid', country: 'España', referred_by: null, notes: 'Contacto clave en energía renovable', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: '2', user_id: '', first_name: 'Laura', last_name: 'Fernández', email: 'laura@mckinsey.com', phone: '+34 623 456 789', company: 'McKinsey', job_title: 'Senior Partner', linkedin_url: null, linkedin_profile_data: null, avatar_url: null, tier: 'S', status: 'active', follow_up_frequency: 'biweekly', custom_follow_up_days: null, last_contact_date: new Date(Date.now() - 10 * 86400000).toISOString(), next_follow_up_date: new Date(Date.now() + 4 * 86400000).toISOString(), relationship_score: 85, city: 'Barcelona', country: 'España', referred_by: null, notes: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: '3', user_id: '', first_name: 'Javier', last_name: 'Ruiz', email: 'javier@telefonica.com', phone: '+34 634 567 890', company: 'Telefónica', job_title: 'CTO', linkedin_url: null, linkedin_profile_data: null, avatar_url: null, tier: 'A', status: 'active', follow_up_frequency: 'monthly', custom_follow_up_days: null, last_contact_date: new Date(Date.now() - 20 * 86400000).toISOString(), next_follow_up_date: new Date(Date.now() - 3 * 86400000).toISOString(), relationship_score: 71, city: 'Madrid', country: 'España', referred_by: null, notes: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: '4', user_id: '', first_name: 'Ana', last_name: 'García', email: 'ana@seaya.vc', phone: '+34 645 678 901', company: 'Seaya Ventures', job_title: 'Managing Director', linkedin_url: null, linkedin_profile_data: null, avatar_url: null, tier: 'A', status: 'active', follow_up_frequency: 'biweekly', custom_follow_up_days: null, last_contact_date: new Date(Date.now() - 5 * 86400000).toISOString(), next_follow_up_date: new Date(Date.now() + 9 * 86400000).toISOString(), relationship_score: 78, city: 'Madrid', country: 'España', referred_by: null, notes: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: '5', user_id: '', first_name: 'Miguel', last_name: 'Torres', email: 'miguel@coaching.es', phone: '+34 656 789 012', company: 'Executive Coaching Spain', job_title: 'Executive Coach', linkedin_url: null, linkedin_profile_data: null, avatar_url: null, tier: 'B', status: 'active', follow_up_frequency: 'weekly', custom_follow_up_days: null, last_contact_date: new Date(Date.now() - 8 * 86400000).toISOString(), next_follow_up_date: new Date(Date.now() + 1 * 86400000).toISOString(), relationship_score: 65, city: 'Valencia', country: 'España', referred_by: null, notes: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: '6', user_id: '', first_name: 'Patricia', last_name: 'López', email: 'patricia@bbva.com', phone: '+34 667 890 123', company: 'BBVA', job_title: 'Directora de RRHH', linkedin_url: null, linkedin_profile_data: null, avatar_url: null, tier: 'B', status: 'active', follow_up_frequency: 'monthly', custom_follow_up_days: null, last_contact_date: new Date(Date.now() - 15 * 86400000).toISOString(), next_follow_up_date: new Date(Date.now() + 15 * 86400000).toISOString(), relationship_score: 58, city: 'Bilbao', country: 'España', referred_by: null, notes: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: '7', user_id: '', first_name: 'Roberto', last_name: 'Sánchez', email: 'roberto@indra.com', phone: '+34 678 901 234', company: 'Indra', job_title: 'VP de Estrategia', linkedin_url: null, linkedin_profile_data: null, avatar_url: null, tier: 'C', status: 'active', follow_up_frequency: 'monthly', custom_follow_up_days: null, last_contact_date: new Date(Date.now() - 30 * 86400000).toISOString(), next_follow_up_date: new Date(Date.now()).toISOString(), relationship_score: 42, city: 'Madrid', country: 'España', referred_by: null, notes: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: '8', user_id: '', first_name: 'Elena', last_name: 'Martín', email: 'elena@glovo.com', phone: '+34 689 012 345', company: 'Glovo', job_title: 'COO', linkedin_url: null, linkedin_profile_data: null, avatar_url: null, tier: 'A', status: 'active', follow_up_frequency: 'biweekly', custom_follow_up_days: null, last_contact_date: new Date(Date.now() - 7 * 86400000).toISOString(), next_follow_up_date: new Date(Date.now() + 7 * 86400000).toISOString(), relationship_score: 74, city: 'Barcelona', country: 'España', referred_by: null, notes: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: '9', user_id: '', first_name: 'Fernando', last_name: 'Díaz', email: 'fernando@cepsa.com', phone: '+34 690 123 456', company: 'Cepsa', job_title: 'Director General', linkedin_url: null, linkedin_profile_data: null, avatar_url: null, tier: 'C', status: 'dormant', follow_up_frequency: 'quarterly', custom_follow_up_days: null, last_contact_date: new Date(Date.now() - 60 * 86400000).toISOString(), next_follow_up_date: new Date(Date.now() + 30 * 86400000).toISOString(), relationship_score: 30, city: 'Madrid', country: 'España', referred_by: null, notes: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: '10', user_id: '', first_name: 'Isabel', last_name: 'Navarro', email: 'isabel@accenture.com', phone: '+34 601 234 567', company: 'Accenture', job_title: 'Managing Director', linkedin_url: null, linkedin_profile_data: null, avatar_url: null, tier: 'D', status: 'active', follow_up_frequency: 'quarterly', custom_follow_up_days: null, last_contact_date: new Date(Date.now() - 45 * 86400000).toISOString(), next_follow_up_date: new Date(Date.now() + 45 * 86400000).toISOString(), relationship_score: 25, city: 'Madrid', country: 'España', referred_by: null, notes: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
]

const tierOrder: ContactTier[] = ['S', 'A', 'B', 'C', 'D']
const frequencyOptions = [
  { value: 'daily', label: 'Diario' }, { value: 'weekly', label: 'Semanal' }, { value: 'biweekly', label: 'Quincenal' },
  { value: 'monthly', label: 'Mensual' }, { value: 'quarterly', label: 'Trimestral' },
  { value: 'annually', label: 'Anual (ej. felicitar Navidad)' },
]

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [tierFilter, setTierFilter] = useState<ContactTier | 'all'>('all')
  const [statusFilter, setStatusFilter] = useState<ContactStatus | 'all'>('active')
  const [sortBy, setSortBy] = useState<'name' | 'tier' | 'score' | 'last_contact' | 'next_followup'>('tier')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [showModal, setShowModal] = useState(false)
  const [formData, setFormData] = useState({ first_name: '', last_name: '', email: '', phone: '', company: '', job_title: '', linkedin_url: '', tier: 'B' as ContactTier, follow_up_frequency: 'monthly', city: '', country: '', notes: '' })
  const [saving, setSaving] = useState(false)
  const [pendingWork, setPendingWork] = useState<{ company: string; job_title: string; start_date: string; end_date: string; is_current: boolean }[]>([])
  const [showWorkForm, setShowWorkForm] = useState(false)
  const [newWork, setNewWork] = useState({ company: '', job_title: '', start_date: '', end_date: '', is_current: false })

  useEffect(() => {
    const fetchContacts = async () => {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          // Use new data loader that checks demo mode
          const data = await loadContacts(user.id)
          if (data && data.length > 0) {
            setContacts(data)
          }
        }
      } catch (error) {
        console.error('Error loading contacts:', error)
      }
      setLoading(false)
    }
    fetchContacts()
  }, [])

  const filtered = useMemo(() => {
    let result = contacts.filter(c => {
      const matchesSearch = search === '' || `${c.first_name} ${c.last_name} ${c.company} ${c.email}`.toLowerCase().includes(search.toLowerCase())
      const matchesTier = tierFilter === 'all' || c.tier === tierFilter
      const matchesStatus = statusFilter === 'all' || c.status === statusFilter
      return matchesSearch && matchesTier && matchesStatus
    })
    result.sort((a, b) => {
      switch (sortBy) {
        case 'name': return `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`)
        case 'tier': return tierOrder.indexOf(a.tier) - tierOrder.indexOf(b.tier)
        case 'score': return b.relationship_score - a.relationship_score
        case 'last_contact': return new Date(b.last_contact_date || 0).getTime() - new Date(a.last_contact_date || 0).getTime()
        case 'next_followup': return new Date(a.next_follow_up_date || '9999').getTime() - new Date(b.next_follow_up_date || '9999').getTime()
        default: return 0
      }
    })
    return result
  }, [contacts, search, tierFilter, statusFilter, sortBy])

  const handleImportFromContacts = async () => {
    const nav = navigator as Navigator & { contacts?: { select: (props: string[], opts?: { multiple?: boolean }) => Promise<Array<{ name?: string[]; email?: string[]; tel?: string[] }>> } }
    if (!nav.contacts) return
    try {
      const results = await nav.contacts.select(['name', 'email', 'tel'], { multiple: false })
      if (!results || results.length === 0) return
      const c = results[0]
      const fullName = c.name?.[0] ?? ''
      const parts = fullName.trim().split(/\s+/)
      const first = parts[0] ?? ''
      const last = parts.slice(1).join(' ')
      setFormData(p => ({
        ...p,
        first_name: first || p.first_name,
        last_name: last || p.last_name,
        email: c.email?.[0] ?? p.email,
        phone: c.tel?.[0] ?? p.phone,
      }))
    } catch {
      // user cancelled or permission denied
    }
  }

  const handleSaveContact = async () => {
    if (!formData.first_name.trim()) return alert('El nombre es obligatorio')
    setSaving(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data } = await supabase.from('contacts').insert({
          user_id: user.id, first_name: formData.first_name, last_name: formData.last_name || null,
          email: formData.email || null, phone: formData.phone || null, company: formData.company || null,
          job_title: formData.job_title || null, linkedin_url: formData.linkedin_url || null,
          tier: formData.tier, follow_up_frequency: formData.follow_up_frequency,
          city: formData.city || null, country: formData.country || null, notes: formData.notes || null,
        }).select().single()
        if (data) {
          setContacts(prev => [data as Contact, ...prev])
          // Save pending work history entries
          if (pendingWork.length > 0) {
            await supabase.from('work_history').insert(
              pendingWork.map(w => ({
                user_id: user.id,
                contact_id: (data as Contact).id,
                company: w.company,
                job_title: w.job_title || null,
                start_date: w.start_date || null,
                end_date: w.is_current ? null : (w.end_date || null),
                is_current: w.is_current,
              }))
            )
          }
        }
      }
    } catch { /* handle error */ }
    setSaving(false)
    setShowModal(false)
    setFormData({ first_name: '', last_name: '', email: '', phone: '', company: '', job_title: '', linkedin_url: '', tier: 'B', follow_up_frequency: 'monthly', city: '', country: '', notes: '' })
    setPendingWork([])
    setShowWorkForm(false)
    setNewWork({ company: '', job_title: '', start_date: '', end_date: '', is_current: false })
  }

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="h-10 w-48 bg-zinc-800 rounded-lg animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[1,2,3,4,5,6,7,8].map(i => <div key={i} className="h-56 bg-zinc-800/50 rounded-xl animate-pulse" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white">Contactos</h1>
          <p className="text-zinc-400 mt-1">{filtered.length} de {contacts.length} contactos</p>
        </div>
        <button onClick={() => setShowModal(true)} className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium transition-colors">
          <Plus className="w-4 h-4" /> Añadir contacto
        </button>
      </div>

      {/* Filters */}
      <div className="space-y-3 md:space-y-0 md:flex md:flex-wrap md:items-center md:gap-3">
        <div className="relative flex-1 min-w-full md:min-w-[200px] md:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input type="text" placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-zinc-900/50 border border-zinc-800 rounded-lg text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50" />
        </div>
        <select value={tierFilter} onChange={e => setTierFilter(e.target.value as ContactTier | 'all')}
          className="w-full md:w-auto px-3 py-2 bg-zinc-900/50 border border-zinc-800 rounded-lg text-sm text-zinc-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/50">
          <option value="all">Todos los tiers</option>
          {tierOrder.map(t => <option key={t} value={t}>Tier {t}</option>)}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as ContactStatus | 'all')}
          className="w-full md:w-auto px-3 py-2 bg-zinc-900/50 border border-zinc-800 rounded-lg text-sm text-zinc-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/50">
          <option value="all">Todos</option>
          <option value="active">Activos</option>
          <option value="dormant">Dormidos</option>
          <option value="archived">Archivados</option>
        </select>
        <select value={sortBy} onChange={e => setSortBy(e.target.value as typeof sortBy)}
          className="w-full md:w-auto px-3 py-2 bg-zinc-900/50 border border-zinc-800 rounded-lg text-sm text-zinc-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/50">
          <option value="tier">Ordenar: Tier</option>
          <option value="name">Ordenar: Nombre</option>
          <option value="score">Ordenar: Score</option>
          <option value="last_contact">Último contacto</option>
          <option value="next_followup">Próximo seguimiento</option>
        </select>
        <div className="flex items-center border border-zinc-800 rounded-lg overflow-hidden">
          <button onClick={() => setViewMode('grid')} className={`p-2 ${viewMode === 'grid' ? 'bg-indigo-600 text-white' : 'bg-zinc-900/50 text-zinc-400 hover:text-white'} transition-colors`}>
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button onClick={() => setViewMode('list')} className={`p-2 ${viewMode === 'list' ? 'bg-indigo-600 text-white' : 'bg-zinc-900/50 text-zinc-400 hover:text-white'} transition-colors`}>
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Empty State */}
      {filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20">
          <Users className="w-16 h-16 text-zinc-600 mb-4" />
          <h3 className="text-lg font-semibold text-zinc-400">No se encontraron contactos</h3>
          <p className="text-sm text-zinc-500 mt-1">{search ? 'Prueba con otros términos de búsqueda' : 'Añade tu primer contacto para empezar'}</p>
          {!search && <button onClick={() => setShowModal(true)} className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors">Añadir contacto</button>}
        </div>
      )}

      {/* Grid View */}
      {viewMode === 'grid' && filtered.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(contact => {
            const days = getDaysUntilFollowUp(contact.next_follow_up_date)
            const urgency = getFollowUpUrgency(days)
            const dotColor = { overdue: 'bg-red-400', urgent: 'bg-orange-400', soon: 'bg-yellow-400', ok: 'bg-emerald-400', none: 'bg-zinc-500' }
            return (
              <Link key={contact.id} href={`/contacts/${contact.id}`}
                className="bg-[#0f0f14] border border-zinc-800/50 rounded-xl p-5 hover:border-indigo-500/30 hover:shadow-lg hover:shadow-indigo-500/5 transition-all group cursor-pointer">
                <div className="flex items-start justify-between mb-3">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold ${tierConfig[contact.tier].bgColor} ${tierConfig[contact.tier].color} border`}>
                    {getInitials(contact.first_name, contact.last_name)}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${dotColor[urgency]}`} />
                    <span className={`text-xs px-2 py-0.5 rounded font-bold ${tierConfig[contact.tier].bgColor} ${tierConfig[contact.tier].color} border`}>{contact.tier}</span>
                  </div>
                </div>
                <h3 className="text-sm font-semibold text-white group-hover:text-indigo-300 transition-colors">{contact.first_name} {contact.last_name}</h3>
                <p className="text-xs text-zinc-400 mt-0.5 truncate">{contact.job_title}</p>
                <p className="text-xs text-zinc-500 truncate">{contact.company}</p>
                <div className="mt-3 flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${contact.relationship_score >= 80 ? 'bg-gradient-to-r from-green-500 to-emerald-400' : contact.relationship_score >= 60 ? 'bg-gradient-to-r from-emerald-500 to-teal-400' : contact.relationship_score >= 40 ? 'bg-gradient-to-r from-yellow-500 to-amber-400' : 'bg-gradient-to-r from-red-500 to-orange-400'}`}
                      style={{ width: `${contact.relationship_score}%` }} />
                  </div>
                  <span className={`text-xs font-bold ${getRelationshipColor(contact.relationship_score)}`}>{contact.relationship_score}</span>
                </div>
                {contact.next_follow_up_date && (
                  <p className={`text-xs mt-2 ${urgency === 'overdue' ? 'text-red-400' : urgency === 'urgent' ? 'text-orange-400' : 'text-zinc-500'}`}>
                    {urgency === 'overdue' ? `${Math.abs(days!)}d atrasado` : urgency === 'urgent' ? 'Hoy / Mañana' : `Seguimiento en ${days}d`}
                  </p>
                )}
                <div className="flex items-center gap-1 mt-3 pt-3 border-t border-zinc-800/50">
                  {contact.email && <span className="p-1.5 rounded-md hover:bg-zinc-800 text-zinc-500 hover:text-white transition-colors"><Mail className="w-3.5 h-3.5" /></span>}
                  {contact.phone && <span className="p-1.5 rounded-md hover:bg-zinc-800 text-zinc-500 hover:text-white transition-colors"><Phone className="w-3.5 h-3.5" /></span>}
                  {contact.linkedin_url && <span className="p-1.5 rounded-md hover:bg-zinc-800 text-zinc-500 hover:text-blue-400 transition-colors"><ExternalLink className="w-3.5 h-3.5" /></span>}
                </div>
              </Link>
            )
          })}
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && filtered.length > 0 && (
        <div className="bg-[#0f0f14] border border-zinc-800/50 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-800/50">
                  {['Nombre', 'Empresa', 'Tier', 'Score', 'Último contacto', 'Próximo seguimiento'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/30">
                {filtered.map(contact => {
                  const days = getDaysUntilFollowUp(contact.next_follow_up_date)
                  const urgency = getFollowUpUrgency(days)
                  return (
                    <tr key={contact.id} className="hover:bg-zinc-800/20 transition-colors cursor-pointer" onClick={() => window.location.href = `/contacts/${contact.id}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${tierConfig[contact.tier].bgColor} ${tierConfig[contact.tier].color} border`}>
                            {getInitials(contact.first_name, contact.last_name)}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-white">{contact.first_name} {contact.last_name}</p>
                            <p className="text-xs text-zinc-500">{contact.job_title}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-zinc-300">{contact.company}</td>
                      <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded font-bold ${tierConfig[contact.tier].bgColor} ${tierConfig[contact.tier].color} border`}>{contact.tier}</span></td>
                      <td className="px-4 py-3"><span className={`text-sm font-bold ${getRelationshipColor(contact.relationship_score)}`}>{contact.relationship_score}</span></td>
                      <td className="px-4 py-3 text-sm text-zinc-400">{contact.last_contact_date ? formatRelativeDate(contact.last_contact_date) : '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`text-sm ${urgency === 'overdue' ? 'text-red-400 font-medium' : urgency === 'urgent' ? 'text-orange-400' : 'text-zinc-400'}`}>
                          {days !== null ? (days < 0 ? `${Math.abs(days)}d atrasado` : days === 0 ? 'Hoy' : `En ${days}d`) : '—'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Contact Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative bg-[#0f0f14] border border-zinc-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-4 md:p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">Nuevo contacto</h2>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
            </div>
            {'contacts' in navigator ? (
              <div className="mb-4">
                <button
                  onClick={handleImportFromContacts}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-indigo-600/10 hover:bg-indigo-600/20 border border-indigo-500/20 hover:border-indigo-500/40 text-indigo-400 hover:text-indigo-300 rounded-xl text-sm font-medium transition-colors"
                >
                  <BookUser className="w-4 h-4" />
                  Importar desde agenda del móvil
                </button>
              </div>
            ) : (
              <div className="mb-4 flex items-start gap-2 px-3 py-2.5 bg-zinc-900/50 border border-zinc-800 rounded-xl">
                <BookUser className="w-4 h-4 text-zinc-500 shrink-0 mt-0.5" />
                <p className="text-xs text-zinc-500">
                  <span className="text-zinc-400 font-medium">Importar desde agenda</span> — disponible en{' '}
                  <span className="text-zinc-300">Chrome Android</span> y{' '}
                  <span className="text-zinc-300">Safari iOS 14.5+</span>.{' '}
                  No compatible con Brave, Firefox ni navegadores de escritorio.
                </p>
              </div>
            )}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1">Nombre *</label>
                  <input type="text" value={formData.first_name} onChange={e => setFormData(p => ({ ...p, first_name: e.target.value }))}
                    className="w-full px-3 py-2 bg-zinc-900/50 border border-zinc-800 rounded-lg text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50" placeholder="Carlos" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1">Apellido</label>
                  <input type="text" value={formData.last_name} onChange={e => setFormData(p => ({ ...p, last_name: e.target.value }))}
                    className="w-full px-3 py-2 bg-zinc-900/50 border border-zinc-800 rounded-lg text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50" placeholder="Mendoza" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1">Email</label>
                  <input type="email" value={formData.email} onChange={e => setFormData(p => ({ ...p, email: e.target.value }))}
                    className="w-full px-3 py-2 bg-zinc-900/50 border border-zinc-800 rounded-lg text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50" placeholder="carlos@empresa.com" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1">Teléfono</label>
                  <input type="tel" value={formData.phone} onChange={e => setFormData(p => ({ ...p, phone: e.target.value }))}
                    className="w-full px-3 py-2 bg-zinc-900/50 border border-zinc-800 rounded-lg text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50" placeholder="+34 600 000 000" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1">Empresa</label>
                  <input type="text" value={formData.company} onChange={e => setFormData(p => ({ ...p, company: e.target.value }))}
                    className="w-full px-3 py-2 bg-zinc-900/50 border border-zinc-800 rounded-lg text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50" placeholder="Iberdrola" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1">Cargo</label>
                  <input type="text" value={formData.job_title} onChange={e => setFormData(p => ({ ...p, job_title: e.target.value }))}
                    className="w-full px-3 py-2 bg-zinc-900/50 border border-zinc-800 rounded-lg text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50" placeholder="Director de Innovación" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">LinkedIn URL</label>
                <input type="url" value={formData.linkedin_url} onChange={e => setFormData(p => ({ ...p, linkedin_url: e.target.value }))}
                  className="w-full px-3 py-2 bg-zinc-900/50 border border-zinc-800 rounded-lg text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50" placeholder="https://linkedin.com/in/..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1">Tier</label>
                  <select value={formData.tier} onChange={e => setFormData(p => ({ ...p, tier: e.target.value as ContactTier }))}
                    className="w-full px-3 py-2 bg-zinc-900/50 border border-zinc-800 rounded-lg text-sm text-zinc-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/50">
                    {tierOrder.map(t => <option key={t} value={t}>{tierConfig[t].label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1">Frecuencia</label>
                  <select value={formData.follow_up_frequency} onChange={e => setFormData(p => ({ ...p, follow_up_frequency: e.target.value }))}
                    className="w-full px-3 py-2 bg-zinc-900/50 border border-zinc-800 rounded-lg text-sm text-zinc-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/50">
                    {frequencyOptions.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1">Ciudad</label>
                  <input type="text" value={formData.city} onChange={e => setFormData(p => ({ ...p, city: e.target.value }))}
                    className="w-full px-3 py-2 bg-zinc-900/50 border border-zinc-800 rounded-lg text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50" placeholder="Madrid" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1">País</label>
                  <input type="text" value={formData.country} onChange={e => setFormData(p => ({ ...p, country: e.target.value }))}
                    className="w-full px-3 py-2 bg-zinc-900/50 border border-zinc-800 rounded-lg text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50" placeholder="España" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">Notas</label>
                <textarea value={formData.notes} onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))} rows={3}
                  className="w-full px-3 py-2 bg-zinc-900/50 border border-zinc-800 rounded-lg text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none" placeholder="Notas sobre este contacto..." />
              </div>

              {/* Work History */}
              <div className="border-t border-zinc-800 pt-3">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-zinc-300">Empresas anteriores</label>
                  <button type="button" onClick={() => setShowWorkForm(p => !p)}
                    className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
                    {showWorkForm ? 'Cancelar' : '+ Añadir'}
                  </button>
                </div>
                {pendingWork.length > 0 && (
                  <div className="space-y-1.5 mb-2">
                    {pendingWork.map((w, i) => (
                      <div key={i} className="flex items-center justify-between px-3 py-2 bg-zinc-900/40 rounded-lg text-xs">
                        <div>
                          <span className="text-zinc-200 font-medium">{w.job_title || '—'}</span>
                          <span className="text-zinc-500"> en {w.company}</span>
                          {w.start_date && <span className="text-zinc-600 ml-1">({new Date(w.start_date).getFullYear()}{w.is_current ? '→hoy' : w.end_date ? `→${new Date(w.end_date).getFullYear()}` : ''})</span>}
                        </div>
                        <button type="button" onClick={() => setPendingWork(p => p.filter((_, j) => j !== i))} className="text-zinc-600 hover:text-red-400 ml-2">✕</button>
                      </div>
                    ))}
                  </div>
                )}
                {showWorkForm && (
                  <div className="space-y-2 p-3 bg-zinc-900/40 rounded-lg border border-zinc-800">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs text-zinc-400 mb-1">Empresa *</label>
                        <input value={newWork.company} onChange={e => setNewWork(p => ({ ...p, company: e.target.value }))}
                          className="w-full px-2 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500/50" placeholder="Empresa" />
                      </div>
                      <div>
                        <label className="block text-xs text-zinc-400 mb-1">Cargo</label>
                        <input value={newWork.job_title} onChange={e => setNewWork(p => ({ ...p, job_title: e.target.value }))}
                          className="w-full px-2 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500/50" placeholder="Cargo" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs text-zinc-400 mb-1">Inicio</label>
                        <input type="date" value={newWork.start_date} onChange={e => setNewWork(p => ({ ...p, start_date: e.target.value }))}
                          className="w-full px-2 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500/50" />
                      </div>
                      <div>
                        <label className="block text-xs text-zinc-400 mb-1">Fin</label>
                        <input type="date" value={newWork.end_date} onChange={e => setNewWork(p => ({ ...p, end_date: e.target.value }))} disabled={newWork.is_current}
                          className="w-full px-2 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500/50 disabled:opacity-40" />
                      </div>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={newWork.is_current} onChange={e => setNewWork(p => ({ ...p, is_current: e.target.checked, end_date: e.target.checked ? '' : p.end_date }))} className="w-3.5 h-3.5" />
                      <span className="text-xs text-zinc-400">Trabajo actual</span>
                    </label>
                    <button type="button" onClick={() => {
                      if (!newWork.company.trim()) return
                      setPendingWork(p => [...p, { ...newWork }])
                      setNewWork({ company: '', job_title: '', start_date: '', end_date: '', is_current: false })
                      setShowWorkForm(false)
                    }} className="w-full py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-400 rounded-lg text-xs font-medium transition-colors">
                      Añadir empresa
                    </button>
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-zinc-400 hover:text-white transition-colors">Cancelar</button>
              <button onClick={handleSaveContact} disabled={!formData.first_name || saving}
                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors">
                {saving ? 'Guardando...' : 'Guardar contacto'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
