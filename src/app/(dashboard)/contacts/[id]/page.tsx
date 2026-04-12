'use client'
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Mail, Phone, ExternalLink, MapPin, Building, Star, Plus, X, Calendar, Clock, MessageSquare, Award, FileText, ChevronRight, Download } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { tierConfig, getRelationshipColor, getInitials } from '@/lib/utils'
import { ContactTier, InteractionType, InteractionSentiment, Contact } from '@/lib/types/database'

const typeLabels: Record<string, string> = { meeting:'Reunión', call:'Llamada', email:'Email', coffee:'Café', lunch:'Comida', event:'Evento', linkedin:'LinkedIn', whatsapp:'WhatsApp', other:'Otro' }
const typeIcons: Record<string, string> = { meeting:'🤝', call:'📞', email:'📧', coffee:'☕', lunch:'🍽️', event:'🎫', linkedin:'💼', whatsapp:'💬', other:'📌' }
const sentimentOpts = [{ v:'very_positive', l:'Excelente', c:'bg-green-500/20 text-green-400' },{ v:'positive', l:'Bien', c:'bg-emerald-500/20 text-emerald-400' },{ v:'neutral', l:'Neutral', c:'bg-zinc-500/20 text-zinc-400' },{ v:'negative', l:'Mal', c:'bg-orange-500/20 text-orange-400' }]
const outcomeTypes = [{ v:'job_lead', l:'Oportunidad laboral' },{ v:'introduction', l:'Presentación' },{ v:'advice', l:'Consejo' },{ v:'collaboration', l:'Colaboración' },{ v:'referral', l:'Referencia' },{ v:'information', l:'Información' },{ v:'opportunity', l:'Oportunidad' }]

function downloadFollowUpICS(contactName: string, company: string, jobTitle: string, dueDate: Date, notes?: string | null) {
  const pad = (n: number) => String(n).padStart(2, '0')
  const escape = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n')

  const dateStr = `${dueDate.getFullYear()}${pad(dueDate.getMonth() + 1)}${pad(dueDate.getDate())}`
  const nextDay = new Date(dueDate)
  nextDay.setDate(nextDay.getDate() + 1)
  const nextDayStr = `${nextDay.getFullYear()}${pad(nextDay.getMonth() + 1)}${pad(nextDay.getDate())}`

  const now = new Date()
  const dtstamp = `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}Z`

  const descParts = [jobTitle && `${jobTitle} · ${company}`, notes].filter(Boolean) as string[]
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Sphere CRM//ES',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:sphere-${Date.now()}@sphere-crm`,
    `DTSTAMP:${dtstamp}`,
    `DTSTART;VALUE=DATE:${dateStr}`,
    `DTEND;VALUE=DATE:${nextDayStr}`,
    `SUMMARY:${escape(`Seguimiento con ${contactName} (${company})`)}`,
    ...(descParts.length > 0 ? [`DESCRIPTION:${escape(descParts.join('\n'))}`] : []),
    'END:VEVENT',
    'END:VCALENDAR',
    '',
  ]
  const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `seguimiento-${contactName.replace(/\s+/g, '-').toLowerCase()}.ics`
  a.click()
  URL.revokeObjectURL(url)
}

const demo = {
  contact: { id:'1', first_name:'Carlos', last_name:'Mendoza', email:'carlos@iberdrola.com', phone:'+34 612 345 678', company:'Iberdrola', job_title:'Director de Innovación', tier:'S' as ContactTier, relationship_score:92, city:'Madrid', country:'España', linkedin_url:'https://linkedin.com/in/carlosmendoza', follow_up_frequency:'weekly', next_follow_up_date: new Date(Date.now()+2*86400000).toISOString(), notes:'Contacto clave en energía renovable. Interesado en transformación digital y sostenibilidad.' },
  interactions: [
    { id:'1', type:'coffee' as InteractionType, title:'Café en el Retiro', date: new Date(Date.now()-3*86400000).toISOString(), sentiment:'very_positive' as InteractionSentiment, description:'Hablamos sobre oportunidades en renovables. Muy receptivo a mi perfil.', duration_minutes:45, key_takeaways:['Interesado en perfiles de innovación','Buscan director de transformación digital'] },
    { id:'2', type:'call' as InteractionType, title:'Llamada de seguimiento', date: new Date(Date.now()-15*86400000).toISOString(), sentiment:'positive' as InteractionSentiment, description:'Revisamos opciones. Me presentará a su CHRO.', duration_minutes:20, key_takeaways:['Presentación con CHRO pendiente'] },
    { id:'3', type:'meeting' as InteractionType, title:'Reunión formal en oficinas', date: new Date(Date.now()-30*86400000).toISOString(), sentiment:'positive' as InteractionSentiment, description:'Primera reunión formal. Muy buena conexión.', duration_minutes:60, key_takeaways:['Alineamiento en valores','Interés en mi experiencia en digital'] },
    { id:'4', type:'linkedin' as InteractionType, title:'Conexión LinkedIn', date: new Date(Date.now()-45*86400000).toISOString(), sentiment:'neutral' as InteractionSentiment, description:'Conectamos por LinkedIn tras evento de networking.', duration_minutes:5, key_takeaways:[] },
  ],
  interests: [
    { id:'1', name:'Energía Renovable', positive:true },{ id:'2', name:'Transformación Digital', positive:true },{ id:'3', name:'Sostenibilidad', positive:true },
    { id:'4', name:'Innovación Abierta', positive:true },{ id:'5', name:'Política', positive:false },{ id:'6', name:'Criptomonedas', positive:false },
  ],
  outcomes: [
    { id:'1', type:'introduction', title:'Presentación con CHRO de Iberdrola', description:'Me presentó a María López, CHRO', rating:5, date: new Date(Date.now()-10*86400000).toISOString() },
    { id:'2', type:'information', title:'Info sobre proceso de selección interno', description:'Compartió detalles del proceso para Director de Innovación', rating:4, date: new Date(Date.now()-20*86400000).toISOString() },
  ],
  topics: ['Preguntarle por el proyecto de hidrógeno verde','Compartir artículo sobre IA en energía','Invitarle al evento de IESE'],
}

export default function ContactDetailPage() {
  const { id } = useParams()
  const [tab, setTab] = useState<'timeline'|'interests'|'outcomes'|'notes'>('timeline')
  const [showInteractionModal, setShowInteractionModal] = useState(false)
  const [showOutcomeModal, setShowOutcomeModal] = useState(false)
  const [contact, setContact] = useState<Contact | null>(null)
  const [interactions, setInteractions] = useState<any[]>([])
  const [outcomes, setOutcomes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [notes, setNotes] = useState('')
  const [newInteraction, setNewInteraction] = useState({ type:'meeting' as InteractionType, title:'', date: new Date().toISOString().split('T')[0], sentiment:'neutral' as InteractionSentiment, description:'', duration_minutes:30 })
  const [newOutcome, setNewOutcome] = useState({ type:'introduction', title:'', description:'', rating:3 })

  useEffect(() => {
    const fetchData = async () => {
      try {
        const supabase = createClient()
        const [contactRes, interactionsRes, outcomesRes] = await Promise.all([
          supabase.from('contacts').select('*').eq('id', id).single(),
          supabase.from('interactions').select('*').eq('contact_id', id).order('date', { ascending: false }),
          supabase.from('outcomes').select('*').eq('contact_id', id).order('date', { ascending: false })
        ])

        if (contactRes.data) {
          setContact(contactRes.data as Contact)
          setNotes(contactRes.data.notes || '')
        }
        if (interactionsRes.data) setInteractions(interactionsRes.data)
        if (outcomesRes.data) setOutcomes(outcomesRes.data)
      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setLoading(false)
      }
    }
    if (id) fetchData()
  }, [id])

  const c = contact || demo.contact

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border border-zinc-800 border-t-indigo-500" />
      </div>
    )
  }

  if (!contact) {
    return (
      <div className="p-6">
        <p className="text-zinc-400">Contacto no encontrado</p>
      </div>
    )
  }
  const tabs = [{ k:'timeline', l:'Timeline', icon: MessageSquare },{ k:'interests', l:'Intereses', icon: Star },{ k:'outcomes', l:'Resultados', icon: Award },{ k:'notes', l:'Notas', icon: FileText }]

  return (
    <div className="p-4 md:p-6 animate-fade-in">
      <Link href="/contacts" className="inline-flex items-center gap-1 text-sm text-zinc-400 hover:text-white mb-4 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Volver a contactos
      </Link>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <div className="bg-[#0f0f14] border border-zinc-800/50 rounded-xl p-6">
          <div className="flex flex-col items-center text-center mb-6">
            <div className={`w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold ${tierConfig[c.tier].bgColor} ${tierConfig[c.tier].color} border-2 mb-3`}>
              {getInitials(c.first_name, c.last_name)}
            </div>
            <h1 className="text-xl font-bold text-white">{c.first_name} {c.last_name}</h1>
            <p className="text-sm text-zinc-400">{c.job_title}</p>
            <p className="text-sm text-zinc-500 flex items-center gap-1 mt-0.5"><Building className="w-3 h-3" />{c.company}</p>
            <span className={`mt-2 text-xs px-3 py-1 rounded-full font-bold ${tierConfig[c.tier].bgColor} ${tierConfig[c.tier].color} border`}>Tier {c.tier} — {c.tier === 'S' ? 'Strategic' : c.tier === 'A' ? 'High Priority' : 'Important'}</span>
          </div>
          <div className="mb-6">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-zinc-400">Relationship Score</span>
              <span className={`text-sm font-bold ${getRelationshipColor(c.relationship_score)}`}>{c.relationship_score}/100</span>
            </div>
            <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500" style={{ width: `${c.relationship_score}%` }} />
            </div>
          </div>
          <div className="space-y-3 text-sm">
            {c.email && <a href={`mailto:${c.email}`} className="flex items-center gap-2 text-zinc-300 hover:text-indigo-400 transition-colors"><Mail className="w-4 h-4 text-zinc-500" />{c.email}</a>}
            {c.phone && <a href={`tel:${c.phone}`} className="flex items-center gap-2 text-zinc-300 hover:text-indigo-400 transition-colors"><Phone className="w-4 h-4 text-zinc-500" />{c.phone}</a>}
            {c.linkedin_url && <a href={c.linkedin_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-zinc-300 hover:text-blue-400 transition-colors"><ExternalLink className="w-4 h-4 text-zinc-500" />LinkedIn</a>}
            <div className="flex items-center gap-2 text-zinc-400"><MapPin className="w-4 h-4 text-zinc-500" />{c.city}, {c.country}</div>
            <div className="flex items-center gap-2 text-zinc-400"><Clock className="w-4 h-4 text-zinc-500" />Seguimiento: {c.follow_up_frequency === 'weekly' ? 'Semanal' : 'Mensual'}</div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-zinc-400"><Calendar className="w-4 h-4 text-zinc-500" />Próximo: {new Date(c.next_follow_up_date).toLocaleDateString('es-ES')}</div>
              <button
                onClick={() => downloadFollowUpICS(`${c.first_name} ${c.last_name}`, c.company, c.job_title, new Date(c.next_follow_up_date), c.notes)}
                title="Descargar cita (.ics)"
                className="p-1 rounded-md hover:bg-zinc-800 text-zinc-500 hover:text-indigo-400 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          <div className="flex gap-2 mt-6">
            {c.phone && (
              <a href={`tel:${c.phone}`} className="flex-1 flex items-center justify-center gap-1 py-2 bg-zinc-800/50 hover:bg-zinc-800 text-zinc-300 hover:text-white rounded-lg text-xs font-medium transition-colors">
                <Phone className="w-3.5 h-3.5" /> Llamar
              </a>
            )}
            {c.email && (
              <a href={`mailto:${c.email}`} className="flex-1 flex items-center justify-center gap-1 py-2 bg-zinc-800/50 hover:bg-zinc-800 text-zinc-300 hover:text-white rounded-lg text-xs font-medium transition-colors">
                <Mail className="w-3.5 h-3.5" /> Email
              </a>
            )}
            {c.linkedin_url && (
              <a href={c.linkedin_url} target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center justify-center gap-1 py-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 hover:text-blue-300 rounded-lg text-xs font-medium transition-colors">
                <ExternalLink className="w-3.5 h-3.5" /> LinkedIn
              </a>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-2">
          <div className="flex items-center gap-1 bg-[#0f0f14] border border-zinc-800/50 rounded-xl p-1 mb-4">
            {tabs.map(t => (
              <button key={t.k} onClick={() => setTab(t.k as typeof tab)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t.k ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'}`}>
                <t.icon className="w-4 h-4" />{t.l}
              </button>
            ))}
          </div>

          {/* Timeline Tab */}
          {tab === 'timeline' && (
            <div className="space-y-4">
              <button onClick={() => setShowInteractionModal(true)} className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600/10 hover:bg-indigo-600/20 border border-indigo-500/20 text-indigo-400 rounded-xl text-sm font-medium transition-colors">
                <Plus className="w-4 h-4" /> Registrar interacción
              </button>
              {interactions.length > 0 ? (
                interactions.map(i => (
                  <div key={i.id} className="bg-[#0f0f14] border border-zinc-800/50 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      <div className="text-2xl mt-0.5">{typeIcons[i.type] || '📌'}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm font-semibold text-white">{i.title}</h3>
                          {i.sentiment && <span className={`text-xs px-2 py-0.5 rounded-full ${sentimentOpts.find(s => s.v === i.sentiment)?.c}`}>
                            {sentimentOpts.find(s => s.v === i.sentiment)?.l}
                          </span>}
                        </div>
                        <p className="text-xs text-zinc-500 mt-0.5">{typeLabels[i.type] || i.type} · {new Date(i.date).toLocaleDateString('es-ES', { day:'numeric', month:'short', year:'numeric' })} {i.duration_minutes && `· ${i.duration_minutes}min`}</p>
                        {i.description && <p className="text-sm text-zinc-300 mt-2">{i.description}</p>}
                        {i.key_takeaways && i.key_takeaways.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {i.key_takeaways.map((t: string, idx: number) => (
                              <div key={idx} className="flex items-center gap-1.5 text-xs text-zinc-400">
                                <ChevronRight className="w-3 h-3 text-indigo-400" />{t}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="bg-[#0f0f14] border border-zinc-800/50 rounded-xl p-8 text-center">
                  <p className="text-zinc-400 text-sm">No hay interacciones registradas</p>
                </div>
              )}
            </div>
          )}

          {/* Interests Tab */}
          {tab === 'interests' && (
            <div className="space-y-6">
              <div className="bg-[#0f0f14] border border-zinc-800/50 rounded-xl p-5">
                <h3 className="text-sm font-semibold text-emerald-400 mb-3">Le interesa</h3>
                <div className="flex flex-wrap gap-2">
                  {c.interests?.filter((i: any) => i.positive).map((i: any) => (
                    <span key={i.id} className="px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full text-xs font-medium">{i.name}</span>
                  )) || <span className="text-xs text-zinc-500">Sin datos</span>}
                  <button className="px-3 py-1.5 border border-dashed border-zinc-700 text-zinc-500 hover:text-white hover:border-zinc-500 rounded-full text-xs transition-colors">+ Añadir</button>
                </div>
              </div>
              <div className="bg-[#0f0f14] border border-zinc-800/50 rounded-xl p-5">
                <h3 className="text-sm font-semibold text-red-400 mb-3">No le interesa</h3>
                <div className="flex flex-wrap gap-2">
                  {c.interests?.filter((i: any) => !i.positive).map((i: any) => (
                    <span key={i.id} className="px-3 py-1.5 bg-red-500/10 border border-red-500/20 text-red-400 rounded-full text-xs font-medium">{i.name}</span>
                  )) || <span className="text-xs text-zinc-500">Sin datos</span>}
                  <button className="px-3 py-1.5 border border-dashed border-zinc-700 text-zinc-500 hover:text-white hover:border-zinc-500 rounded-full text-xs transition-colors">+ Añadir</button>
                </div>
              </div>
            </div>
          )}

          {/* Outcomes Tab */}
          {tab === 'outcomes' && (
            <div className="space-y-4">
              <button onClick={() => setShowOutcomeModal(true)} className="w-full flex items-center justify-center gap-2 py-3 bg-amber-600/10 hover:bg-amber-600/20 border border-amber-500/20 text-amber-400 rounded-xl text-sm font-medium transition-colors">
                <Plus className="w-4 h-4" /> Añadir resultado
              </button>
              {outcomes.length > 0 ? (
                outcomes.map(o => (
                  <div key={o.id} className="bg-[#0f0f14] border border-zinc-800/50 rounded-xl p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-xs px-2 py-0.5 bg-violet-500/10 text-violet-400 rounded-full">{outcomeTypes.find(ot => ot.v === o.type)?.l}</span>
                        <h3 className="text-sm font-semibold text-white mt-1.5">{o.title}</h3>
                        <p className="text-xs text-zinc-400 mt-1">{o.description}</p>
                        <p className="text-xs text-zinc-500 mt-1">{new Date(o.date).toLocaleDateString('es-ES')}</p>
                      </div>
                      <div className="flex gap-0.5">{[1,2,3,4,5].map(s => <Star key={s} className={`w-4 h-4 ${s <= (o.rating || 0) ? 'text-amber-400 fill-amber-400' : 'text-zinc-700'}`} />)}</div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="bg-[#0f0f14] border border-zinc-800/50 rounded-xl p-8 text-center">
                  <p className="text-zinc-400 text-sm">No hay resultados registrados</p>
                </div>
              )}
            </div>
          )}

          {/* Notes Tab */}
          {tab === 'notes' && (
            <div className="bg-[#0f0f14] border border-zinc-800/50 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-white mb-3">Notas generales</h3>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={10}
                className="w-full px-3 py-2 bg-zinc-900/50 border border-zinc-800 rounded-lg text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none" placeholder="Escribe notas sobre este contacto..." />
              <button onClick={async () => {
                try {
                  const supabase = createClient()
                  await supabase.from('contacts').update({ notes }).eq('id', c.id)
                } catch (e) { console.error(e) }
              }} className="mt-3 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors">Guardar notas</button>
            </div>
          )}
        </div>
      </div>

      {/* Add Interaction Modal */}
      {showInteractionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowInteractionModal(false)} />
          <div className="relative bg-[#0f0f14] border border-zinc-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white">Nueva interacción</h2>
              <button onClick={() => setShowInteractionModal(false)} className="p-1 hover:bg-zinc-800 rounded-lg text-zinc-400"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Tipo</label>
                <select value={newInteraction.type} onChange={e => setNewInteraction(p => ({ ...p, type: e.target.value as InteractionType }))}
                  className="w-full px-3 py-2 bg-zinc-900/50 border border-zinc-800 rounded-lg text-sm text-zinc-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/50">
                  {Object.entries(typeLabels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Título</label>
                <input type="text" value={newInteraction.title} onChange={e => setNewInteraction(p => ({ ...p, title: e.target.value }))}
                  className="w-full px-3 py-2 bg-zinc-900/50 border border-zinc-800 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50" placeholder="Café en el Retiro" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">Fecha</label>
                  <input type="date" value={newInteraction.date} onChange={e => setNewInteraction(p => ({ ...p, date: e.target.value }))}
                    className="w-full px-3 py-2 bg-zinc-900/50 border border-zinc-800 rounded-lg text-sm text-zinc-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/50" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">Sentimiento</label>
                  <select value={newInteraction.sentiment} onChange={e => setNewInteraction(p => ({ ...p, sentiment: e.target.value as InteractionSentiment }))}
                    className="w-full px-3 py-2 bg-zinc-900/50 border border-zinc-800 rounded-lg text-sm text-zinc-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/50">
                    {sentimentOpts.map(s => <option key={s.v} value={s.v}>{s.l}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Descripción</label>
                <textarea value={newInteraction.description} onChange={e => setNewInteraction(p => ({ ...p, description: e.target.value }))} rows={3}
                  className="w-full px-3 py-2 bg-zinc-900/50 border border-zinc-800 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none" />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-4">
              <button onClick={() => setShowInteractionModal(false)} className="px-4 py-2 text-sm text-zinc-400 hover:text-white">Cancelar</button>
              <button onClick={async () => {
                try {
                  const supabase = createClient()
                  const { data } = await supabase.from('interactions').insert({
                    contact_id: c.id, type: newInteraction.type, title: newInteraction.title,
                    date: newInteraction.date, sentiment: newInteraction.sentiment,
                    description: newInteraction.description, duration_minutes: newInteraction.duration_minutes
                  }).select().single()
                  if (data) setInteractions(prev => [data, ...prev])
                  setShowInteractionModal(false)
                  setNewInteraction({ type:'meeting' as InteractionType, title:'', date: new Date().toISOString().split('T')[0], sentiment:'neutral' as InteractionSentiment, description:'', duration_minutes:30 })
                } catch (e) { console.error(e) }
              }} className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium">Guardar</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Outcome Modal */}
      {showOutcomeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowOutcomeModal(false)} />
          <div className="relative bg-[#0f0f14] border border-zinc-800 rounded-2xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white">Nuevo resultado</h2>
              <button onClick={() => setShowOutcomeModal(false)} className="p-1 hover:bg-zinc-800 rounded-lg text-zinc-400"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Tipo</label>
                <select value={newOutcome.type} onChange={e => setNewOutcome(p => ({ ...p, type: e.target.value }))}
                  className="w-full px-3 py-2 bg-zinc-900/50 border border-zinc-800 rounded-lg text-sm text-zinc-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/50">
                  {outcomeTypes.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Título</label>
                <input type="text" value={newOutcome.title} onChange={e => setNewOutcome(p => ({ ...p, title: e.target.value }))}
                  className="w-full px-3 py-2 bg-zinc-900/50 border border-zinc-800 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50" />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Valoración</label>
                <div className="flex gap-1">{[1,2,3,4,5].map(s => <button key={s} onClick={() => setNewOutcome(p => ({ ...p, rating: s }))} className="p-1"><Star className={`w-6 h-6 ${s <= newOutcome.rating ? 'text-amber-400 fill-amber-400' : 'text-zinc-700'}`} /></button>)}</div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-4">
              <button onClick={() => setShowOutcomeModal(false)} className="px-4 py-2 text-sm text-zinc-400 hover:text-white">Cancelar</button>
              <button onClick={async () => {
                try {
                  const supabase = createClient()
                  const { data } = await supabase.from('outcomes').insert({
                    contact_id: c.id, type: newOutcome.type, title: newOutcome.title,
                    description: newOutcome.description, rating: newOutcome.rating, date: new Date().toISOString()
                  }).select().single()
                  if (data) setOutcomes(prev => [data, ...prev])
                  setShowOutcomeModal(false)
                  setNewOutcome({ type:'introduction', title:'', description:'', rating:3 })
                } catch (e) { console.error(e) }
              }} className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium">Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
