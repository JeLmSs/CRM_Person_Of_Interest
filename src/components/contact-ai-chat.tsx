'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { AiConversation } from '@/lib/types/database'
import { Send, Trash2, Sparkles, Loader2 } from 'lucide-react'

// Suggestions when a specific person is loaded as context
const CONTACT_SUGGESTIONS = [
  '¿Cómo rompo el hielo en la próxima sesión con esta persona?',
  '¿Qué sectores encajan con su perfil profesional?',
  'Redacta un mensaje de seguimiento tras nuestra última reunión',
  '¿Qué recursos o formaciones le recomendaría?',
  '¿Cómo valoro el estado de su búsqueda de empleo?',
  'Sugiere preguntas para la próxima entrevista de orientación',
]

// Suggestions for general career-advisor mode (no contact selected)
const GENERAL_SUGGESTIONS = [
  '¿Cómo motivo a alguien que lleva meses sin encontrar trabajo?',
  '¿Qué técnicas de búsqueda de empleo funcionan mejor hoy en día?',
  'Ayúdame a preparar un taller de LinkedIn para mis candidatos',
  '¿Cómo detecto si un candidato está saboteando su propia búsqueda?',
  '¿Cómo preparo a alguien para una entrevista por competencias?',
  'Dame un guión para una primera sesión de orientación laboral',
]

interface Props {
  contactId?: string | null
  contactName?: string | null
  /** When true: no inner header, integrates flush into parent layout */
  embedded?: boolean
}

export default function ContactAIChat({ contactId, contactName, embedded }: Props) {
  const [messages, setMessages] = useState<AiConversation[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingHistory, setLoadingHistory] = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const isContactMode = !!contactId
  const suggestions = isContactMode ? CONTACT_SUGGESTIONS : GENERAL_SUGGESTIONS

  useEffect(() => {
    const supabase = createClient()
    const query = contactId
      ? supabase.from('ai_conversations').select('*').eq('contact_id', contactId).order('created_at', { ascending: true })
      : supabase.from('ai_conversations').select('*').is('contact_id', null).order('created_at', { ascending: true }).limit(60)

    query.then(({ data }) => {
      if (data) setMessages(data as AiConversation[])
      setLoadingHistory(false)
    })
  }, [contactId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function sendMessage(text: string) {
    const trimmed = text.trim()
    if (!trimmed || loading) return
    setInput('')
    setLoading(true)

    const optimisticId = `temp-${Date.now()}`
    const optimistic: AiConversation = {
      id: optimisticId,
      user_id: '',
      contact_id: contactId || '',
      role: 'user',
      content: trimmed,
      created_at: new Date().toISOString(),
    }
    setMessages(prev => [...prev, optimistic])

    try {
      const res = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contact_id: contactId || null, message: trimmed }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error desconocido')

      setMessages(prev => [...prev, {
        id: `temp-ai-${Date.now()}`,
        user_id: '',
        contact_id: contactId || '',
        role: 'assistant',
        content: data.reply,
        created_at: new Date().toISOString(),
      } as AiConversation])
    } catch (e) {
      // Show error as an assistant bubble so the chat never collapses back to
      // the suggestions screen — the user message stays visible
      const errMsg = e instanceof Error ? e.message : 'Error al contactar con Sphere AI'
      setMessages(prev => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          user_id: '',
          contact_id: contactId || '',
          role: 'assistant',
          content: `⚠️ ${errMsg}`,
          created_at: new Date().toISOString(),
        } as AiConversation,
      ])
    } finally {
      setLoading(false)
      textareaRef.current?.focus()
    }
  }

  async function clearConversation() {
    if (!confirm('¿Borrar toda la conversación?')) return
    const supabase = createClient()
    if (contactId) {
      await supabase.from('ai_conversations').delete().eq('contact_id', contactId)
    } else {
      await supabase.from('ai_conversations').delete().is('contact_id', null)
    }
    setMessages([])
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  const headerTitle = isContactMode
    ? `Contexto: ${contactName}`
    : 'Sphere AI · Modo general'

  const emptyHeading = isContactMode
    ? `¿En qué puedo ayudarte con ${contactName}?`
    : '¿En qué puedo ayudarte hoy?'

  const emptySubtext = isContactMode
    ? 'Tengo acceso a su perfil completo, historial de interacciones y notas.'
    : 'Soy tu asistente de orientación laboral. Selecciona un candidato o hazme una pregunta general.'

  const wrapperCls = embedded
    ? 'flex flex-col h-full'
    : 'flex flex-col h-full bg-[#0f0f14] border border-zinc-800/50 rounded-xl overflow-hidden'

  return (
    <div className={wrapperCls}>
      {/* Inner header — only when not embedded in a parent page */}
      {!embedded && (
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800/50 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <Sparkles className="w-4 h-4 text-indigo-400 shrink-0" />
            <span className="text-sm font-semibold text-white truncate">{headerTitle}</span>
          </div>
          {messages.length > 0 && (
            <button onClick={clearConversation} title="Borrar conversación"
              className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-red-400 transition-colors shrink-0 ml-2">
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
        {loadingHistory ? (
          <div className="flex justify-center pt-12">
            <Loader2 className="w-5 h-5 text-zinc-600 animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-5 px-4 pb-8 text-center">
            <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-indigo-600/15 border border-indigo-500/20">
              <Sparkles className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <p className="text-base font-semibold text-white">{emptyHeading}</p>
              <p className="text-sm text-zinc-500 mt-1 max-w-sm">{emptySubtext}</p>
            </div>
            {/* Horizontal scrollable suggestion chips */}
            <div className="w-full max-w-2xl overflow-x-auto pb-1">
              <div className="flex gap-2 w-max mx-auto">
                {suggestions.map((q, i) => (
                  <button key={i} onClick={() => sendMessage(q)}
                    className="shrink-0 px-3 py-2 rounded-xl bg-zinc-900/70 hover:bg-indigo-600/10 border border-zinc-800 hover:border-indigo-500/30 text-xs text-zinc-300 hover:text-indigo-300 transition-colors text-left max-w-[200px] whitespace-normal leading-relaxed">
                    {q}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'assistant' ? (
                  <div className="flex items-end gap-2 max-w-[85%]">
                    <div className="w-6 h-6 rounded-full bg-indigo-600/20 border border-indigo-500/20 flex items-center justify-center shrink-0 mb-0.5">
                      <Sparkles className="w-3 h-3 text-indigo-400" />
                    </div>
                    <div className={`px-4 py-2.5 rounded-2xl rounded-bl-sm text-sm leading-relaxed whitespace-pre-wrap ${
                      msg.content.startsWith('⚠️')
                        ? 'bg-red-500/10 border border-red-500/20 text-red-300'
                        : 'bg-zinc-800/70 text-zinc-200 border border-zinc-700/50'
                    }`}>
                      {msg.content}
                    </div>
                  </div>
                ) : (
                  <div className="max-w-[75%] px-4 py-2.5 rounded-2xl rounded-br-sm bg-indigo-600 text-white text-sm leading-relaxed whitespace-pre-wrap">
                    {msg.content}
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="flex items-end gap-2">
                  <div className="w-6 h-6 rounded-full bg-indigo-600/20 border border-indigo-500/20 flex items-center justify-center shrink-0">
                    <Sparkles className="w-3 h-3 text-indigo-400" />
                  </div>
                  <div className="px-4 py-3 rounded-2xl rounded-bl-sm bg-zinc-800/70 border border-zinc-700/50">
                    <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </>
        )}
      </div>

      {/* Quick chips when chat has content */}
      {messages.length > 0 && (
        <div className="px-3 pt-2 overflow-x-auto shrink-0">
          <div className="flex gap-1.5 w-max pb-1">
            {suggestions.slice(0, 4).map((q, i) => (
              <button key={i} onClick={() => sendMessage(q)}
                className="shrink-0 text-xs px-2.5 py-1.5 rounded-full bg-zinc-800/60 hover:bg-indigo-600/15 border border-zinc-700 hover:border-indigo-500/40 text-zinc-400 hover:text-indigo-400 transition-colors whitespace-nowrap max-w-[220px] truncate">
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-3 shrink-0">
        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            placeholder="Escribe tu pregunta… (Enter para enviar, Shift+Enter nueva línea)"
            className="flex-1 px-3 py-2 bg-zinc-900/60 border border-zinc-800 rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none"
            style={{ minHeight: '40px', maxHeight: '120px' }}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || loading}
            className="p-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl transition-colors shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <div className="flex justify-between items-center mt-1.5">
          <p className="text-xs text-zinc-600">Sphere AI · Solo orientación laboral y networking profesional</p>
          {embedded && messages.length > 0 && (
            <button onClick={clearConversation} className="text-xs text-zinc-600 hover:text-red-400 transition-colors flex items-center gap-1">
              <Trash2 className="w-3 h-3" />
              Borrar
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
