'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Contact } from '@/lib/types/database'
import { tierConfig, getInitials } from '@/lib/utils'
import { Sparkles, ChevronDown, X } from 'lucide-react'
import ContactAIChat from '@/components/contact-ai-chat'
import { loadContacts } from '@/lib/supabase/data-loaders'

export default function PreparePage() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
  const [showSelector, setShowSelector] = useState(false)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

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

  const filtered = contacts.filter(c =>
    search === '' ||
    `${c.first_name} ${c.last_name} ${c.company}`.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] p-4 md:p-6 gap-4 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-indigo-400" />
            Preparar
          </h1>
          <p className="text-zinc-400 text-sm mt-0.5">
            Prepara entrevistas, reuniones y conversaciones con ayuda de IA
          </p>
        </div>

        {/* Contact selector */}
        <div className="relative">
          <button
            onClick={() => setShowSelector(p => !p)}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#0f0f14] border border-zinc-800 hover:border-zinc-700 rounded-xl text-sm transition-colors min-w-[220px] justify-between"
          >
            {selectedContact ? (
              <div className="flex items-center gap-2 min-w-0">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${tierConfig[selectedContact.tier].bgColor} ${tierConfig[selectedContact.tier].color} border`}>
                  {getInitials(selectedContact.first_name, selectedContact.last_name)}
                </div>
                <span className="text-white truncate">{selectedContact.first_name} {selectedContact.last_name}</span>
              </div>
            ) : (
              <span className="text-zinc-400">Modo general (sin contacto)</span>
            )}
            <ChevronDown className="w-4 h-4 text-zinc-500 shrink-0" />
          </button>

          {showSelector && (
            <div className="absolute right-0 top-full mt-1 z-50 w-80 bg-[#0f0f14] border border-zinc-800 rounded-xl shadow-xl overflow-hidden">
              <div className="p-2 border-b border-zinc-800">
                <input
                  autoFocus
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Buscar contacto..."
                  className="w-full px-3 py-1.5 bg-zinc-900/60 border border-zinc-800 rounded-lg text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                />
              </div>
              <div className="max-h-64 overflow-y-auto">
                {/* General mode option */}
                <button
                  onClick={() => { setSelectedContact(null); setShowSelector(false); setSearch('') }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 hover:bg-zinc-800/50 transition-colors text-left ${!selectedContact ? 'bg-indigo-600/10' : ''}`}
                >
                  <div className="w-7 h-7 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                  </div>
                  <div>
                    <p className="text-sm text-white">Modo general</p>
                    <p className="text-xs text-zinc-500">Sin contacto — entrevistas, networking libre</p>
                  </div>
                </button>

                {loading ? (
                  <div className="px-4 py-3 text-xs text-zinc-500">Cargando contactos...</div>
                ) : filtered.length === 0 ? (
                  <div className="px-4 py-3 text-xs text-zinc-500">Sin resultados</div>
                ) : (
                  filtered.map(c => (
                    <button
                      key={c.id}
                      onClick={() => { setSelectedContact(c); setShowSelector(false); setSearch('') }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 hover:bg-zinc-800/50 transition-colors text-left ${selectedContact?.id === c.id ? 'bg-indigo-600/10' : ''}`}
                    >
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${tierConfig[c.tier].bgColor} ${tierConfig[c.tier].color} border`}>
                        {getInitials(c.first_name, c.last_name)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm text-white truncate">{c.first_name} {c.last_name}</p>
                        <p className="text-xs text-zinc-500 truncate">{c.job_title} · {c.company}</p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Backdrop to close selector */}
          {showSelector && (
            <div className="fixed inset-0 z-40" onClick={() => { setShowSelector(false); setSearch('') }} />
          )}
        </div>
      </div>

      {/* Context pill when contact is selected */}
      {selectedContact && (
        <div className="flex items-center gap-2 shrink-0">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium ${tierConfig[selectedContact.tier].bgColor} ${tierConfig[selectedContact.tier].color}`}>
            <span>Contexto cargado:</span>
            <span className="font-bold">{selectedContact.first_name} {selectedContact.last_name}</span>
            {selectedContact.company && <span className="opacity-70">· {selectedContact.company}</span>}
            <button onClick={() => setSelectedContact(null)} className="ml-1 hover:opacity-70 transition-opacity">
              <X className="w-3 h-3" />
            </button>
          </div>
          <span className="text-xs text-zinc-500">Perfil, interacciones y notas incluidos en el contexto</span>
        </div>
      )}

      {/* Chat — takes remaining height */}
      <div className="flex-1 min-h-0">
        <ContactAIChat
          key={selectedContact?.id ?? 'general'}
          contactId={selectedContact?.id ?? null}
          contactName={selectedContact ? `${selectedContact.first_name} ${selectedContact.last_name || ''}`.trim() : null}
        />
      </div>
    </div>
  )
}
