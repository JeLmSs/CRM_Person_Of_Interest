'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Contact } from '@/lib/types/database'
import { tierConfig, getInitials } from '@/lib/utils'
import { Sparkles, ChevronDown, Info, X } from 'lucide-react'
import ContactAIChat from '@/components/contact-ai-chat'
import { loadContacts } from '@/lib/supabase/data-loaders'

export default function PreparePage() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
  const [showSelector, setShowSelector] = useState(false)
  const [showInfo, setShowInfo] = useState(false)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const infoRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        loadContacts(user.id).then(data => {
          setContacts(data.filter(c => c.status === 'active'))
          setLoading(false)
        })
      } else {
        setLoading(false)
      }
    })
  }, [])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (infoRef.current && !infoRef.current.contains(e.target as Node)) {
        setShowInfo(false)
      }
    }
    if (showInfo) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showInfo])

  const filtered = contacts.filter(c =>
    search === '' ||
    `${c.first_name} ${c.last_name} ${c.company}`.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="flex flex-col h-[calc(100svh-3.5rem)] lg:h-svh overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center gap-2 px-3 h-11 border-b border-zinc-800/50 shrink-0 bg-[#09090b]">
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-7 h-7 rounded-lg bg-indigo-600/20 border border-indigo-500/20 flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          </div>
          <span className="text-sm font-semibold text-white whitespace-nowrap">Sphere AI</span>
        </div>

        <div className="flex-1" />

        {/* Info button */}
        <div ref={infoRef} className="relative">
          <button
            onClick={() => setShowInfo(p => !p)}
            className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/60 transition-colors"
            aria-label="Información"
          >
            <Info className="w-4 h-4" />
          </button>
          {showInfo && (
            <div className="absolute right-0 top-full mt-2 z-50 w-72 bg-[#0f0f14] border border-zinc-800 rounded-xl shadow-xl p-3 text-xs text-zinc-400 space-y-1.5">
              <p className="text-zinc-200 font-medium text-sm">Tu copiloto de relaciones</p>
              <p>Sphere AI te ayuda a ti: prepara tus encuentros, sugiere icebreakers basados en intereses, te dice cuál es el mejor momento del día para escribir y redacta mensajes listos para copiar. Selecciona un contacto para personalizar el contexto, o úsalo en modo general (con resumen de toda tu red).</p>
              <p className="text-zinc-500 border-t border-zinc-800 pt-1.5 mt-1.5">Activa el botón <span className="text-indigo-300">globo</span> en el chat para que busque información pública sobre la empresa o sector de la persona.</p>
            </div>
          )}
        </div>

        {/* Contact selector */}
        <div className="relative shrink-0">
          <button
            onClick={() => setShowSelector(p => !p)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-zinc-900 border border-zinc-700/60 hover:border-zinc-600 rounded-xl text-xs transition-colors max-w-[180px] sm:max-w-[220px]"
          >
            {selectedContact ? (
              <>
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${tierConfig[selectedContact.tier].bgColor} ${tierConfig[selectedContact.tier].color} border`}>
                  {getInitials(selectedContact.first_name, selectedContact.last_name)}
                </div>
                <span className="text-white truncate">{selectedContact.first_name} {selectedContact.last_name}</span>
                <button
                  onClick={e => { e.stopPropagation(); setSelectedContact(null) }}
                  className="text-zinc-500 hover:text-zinc-300 transition-colors shrink-0"
                >
                  <X className="w-3 h-3" />
                </button>
              </>
            ) : (
              <>
                <span className="text-zinc-400 whitespace-nowrap">Modo general</span>
                <ChevronDown className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
              </>
            )}
          </button>

          {showSelector && (
            <div className="absolute right-0 top-full mt-1 z-50 w-72 bg-[#0f0f14] border border-zinc-800 rounded-xl shadow-xl overflow-hidden">
              <div className="p-2 border-b border-zinc-800">
                <input
                  autoFocus
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Buscar contacto..."
                  className="w-full px-3 py-1.5 bg-zinc-900/60 border border-zinc-800 rounded-lg text-xs text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                />
              </div>
              <div className="max-h-60 overflow-y-auto">
                <button
                  onClick={() => { setSelectedContact(null); setShowSelector(false); setSearch('') }}
                  className={`w-full flex items-center gap-3 px-3 py-2 hover:bg-zinc-800/50 transition-colors text-left ${!selectedContact ? 'bg-indigo-600/10' : ''}`}
                >
                  <div className="w-6 h-6 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0">
                    <Sparkles className="w-3 h-3 text-indigo-400" />
                  </div>
                  <div>
                    <p className="text-xs text-white">Modo general</p>
                    <p className="text-[11px] text-zinc-500">Resumen de toda tu red</p>
                  </div>
                </button>

                {loading ? (
                  <div className="px-4 py-3 text-xs text-zinc-500">Cargando...</div>
                ) : filtered.length === 0 ? (
                  <div className="px-4 py-3 text-xs text-zinc-500">Sin resultados</div>
                ) : (
                  filtered.map(c => (
                    <button
                      key={c.id}
                      onClick={() => { setSelectedContact(c); setShowSelector(false); setSearch('') }}
                      className={`w-full flex items-center gap-3 px-3 py-2 hover:bg-zinc-800/50 transition-colors text-left ${selectedContact?.id === c.id ? 'bg-indigo-600/10' : ''}`}
                    >
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${tierConfig[c.tier].bgColor} ${tierConfig[c.tier].color} border`}>
                        {getInitials(c.first_name, c.last_name)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs text-white truncate">{c.first_name} {c.last_name}</p>
                        <p className="text-[11px] text-zinc-500 truncate">{c.job_title}{c.job_title && c.company ? ' · ' : ''}{c.company}</p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}

          {showSelector && (
            <div className="fixed inset-0 z-40" onClick={() => { setShowSelector(false); setSearch('') }} />
          )}
        </div>
      </div>

      {/* Chat — fills all remaining height */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <ContactAIChat
          key={selectedContact?.id ?? 'general'}
          contactId={selectedContact?.id ?? null}
          contactName={selectedContact ? `${selectedContact.first_name} ${selectedContact.last_name || ''}`.trim() : null}
          embedded
        />
      </div>
    </div>
  )
}
