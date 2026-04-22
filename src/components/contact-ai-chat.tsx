'use client'
import React, { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { AiConversation } from '@/lib/types/database'
import { Send, Sparkles, Loader2, SquarePen, Globe, ArrowUp, ExternalLink } from 'lucide-react'

type Source = { uri: string; title: string }

type ChatMessage = AiConversation & {
  sources?: Source[] | null
  isDeep?: boolean
}

const SOURCES_MARKER = '__SOURCES__'

function extractSources(content: string): { text: string; sources: Source[] | null } {
  const idx = content.indexOf(SOURCES_MARKER)
  if (idx === -1) return { text: content, sources: null }
  const text = content.slice(0, idx).trim()
  try {
    const sources = JSON.parse(content.slice(idx + SOURCES_MARKER.length)) as Source[]
    return { text, sources: Array.isArray(sources) ? sources : null }
  } catch {
    return { text, sources: null }
  }
}

function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*\n]+\*\*|\*[^*\n]+\*|`[^`\n]+`)/)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**'))
      return <strong key={i} className="font-semibold text-white">{part.slice(2, -2)}</strong>
    if (part.startsWith('*') && part.endsWith('*') && !part.startsWith('**'))
      return <em key={i} className="italic text-zinc-300">{part.slice(1, -1)}</em>
    if (part.startsWith('`') && part.endsWith('`'))
      return <code key={i} className="px-1 py-0.5 bg-zinc-800 rounded text-[0.85em] font-mono text-indigo-300">{part.slice(1, -1)}</code>
    return part
  })
}

function AIContent({ text }: { text: string }) {
  if (text.startsWith('⚠️'))
    return <p className="text-red-400 text-sm leading-relaxed">{text}</p>

  const blocks = text.split(/\n{2,}/).filter(Boolean)
  return (
    <div className="space-y-2.5 text-[15px] sm:text-sm leading-[1.6] text-zinc-100">
      {blocks.map((block, bi) => {
        const lines = block.split('\n').filter(Boolean)
        if (/^(-{3,}|\*{3,}|_{3,})$/.test(block.trim()))
          return <hr key={bi} className="border-zinc-800 my-1" />
        if (lines.some(l => /^\d+\.\s/.test(l))) {
          return (
            <ol key={bi} className="space-y-1.5">
              {lines.filter(l => /^\d+\.\s/.test(l)).map((l, li) => (
                <li key={li} className="flex gap-2.5">
                  <span className="text-indigo-400 shrink-0 font-mono text-xs mt-1 w-4 text-right">{li + 1}.</span>
                  <span>{renderInline(l.replace(/^\d+\.\s/, ''))}</span>
                </li>
              ))}
            </ol>
          )
        }
        if (lines.some(l => /^[-*•]\s/.test(l))) {
          return (
            <ul key={bi} className="space-y-1.5">
              {lines.filter(l => /^[-*•]\s/.test(l)).map((l, li) => (
                <li key={li} className="flex gap-2.5">
                  <span className="text-indigo-400 shrink-0 mt-1.5 text-xs">▸</span>
                  <span>{renderInline(l.replace(/^[-*•]\s/, ''))}</span>
                </li>
              ))}
            </ul>
          )
        }
        const hMatch = lines[0]?.match(/^#{1,3}\s(.+)/)
        if (hMatch)
          return <p key={bi} className="font-semibold text-white text-[15px]">{renderInline(hMatch[1])}</p>
        return (
          <p key={bi}>
            {lines.map((l, li) => (
              <React.Fragment key={li}>
                {renderInline(l)}
                {li < lines.length - 1 && <br />}
              </React.Fragment>
            ))}
          </p>
        )
      })}
    </div>
  )
}

function SourcesBlock({ sources }: { sources: Source[] }) {
  return (
    <div className="mt-3 pt-3 border-t border-zinc-800/70">
      <p className="text-[10px] uppercase tracking-widest text-zinc-500 mb-1.5">Fuentes web</p>
      <ul className="space-y-1">
        {sources.map((s, i) => (
          <li key={i}>
            <a href={s.uri} target="_blank" rel="noreferrer noopener"
              className="inline-flex items-center gap-1.5 text-xs text-indigo-300 hover:text-indigo-200 hover:underline truncate max-w-full">
              <ExternalLink className="w-3 h-3 shrink-0" />
              <span className="truncate">{s.title}</span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}

function TypingDots({ label }: { label?: string }) {
  return (
    <div className="flex gap-2 items-center py-1">
      <div className="flex gap-1">
        {[0, 160, 320].map(d => (
          <span key={d} className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-bounce"
            style={{ animationDelay: `${d}ms`, animationDuration: '900ms' }} />
        ))}
      </div>
      {label && <span className="text-xs text-zinc-500">{label}</span>}
    </div>
  )
}

interface Props {
  contactId?: string | null
  contactName?: string | null
  embedded?: boolean
}

export default function ContactAIChat({ contactId, contactName, embedded }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingHistory, setLoadingHistory] = useState(true)
  const [deepMode, setDeepMode] = useState(false)
  const [suggestions, setSuggestions] = useState<string[] | null>(null)
  const messagesRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const stickToBottomRef = useRef(true)

  const isContactMode = !!contactId

  // Load history
  useEffect(() => {
    setLoadingHistory(true)
    setMessages([])
    const supabase = createClient()
    const query = contactId
      ? supabase.from('ai_conversations').select('*').eq('contact_id', contactId).order('created_at', { ascending: true })
      : supabase.from('ai_conversations').select('*').is('contact_id', null).order('created_at', { ascending: true }).limit(60)
    query.then(({ data }) => {
      const list = (data || []) as AiConversation[]
      const mapped: ChatMessage[] = list.map(m => {
        if (m.role === 'user') {
          const isDeep = m.content.startsWith('🔎')
          return { ...m, content: isDeep ? m.content.replace(/^🔎\s*/, '') : m.content, isDeep }
        }
        const { text, sources } = extractSources(m.content)
        return { ...m, content: text, sources, isDeep: !!sources }
      })
      setMessages(mapped)
      setLoadingHistory(false)
    })
  }, [contactId])

  // Load dynamic suggestions only when there's no conversation yet
  useEffect(() => {
    if (loadingHistory || messages.length > 0) return
    const url = contactId
      ? `/api/ai-chat/suggestions?contact_id=${encodeURIComponent(contactId)}`
      : '/api/ai-chat/suggestions'
    fetch(url).then(r => r.ok ? r.json() : { suggestions: [] }).then(d => {
      setSuggestions(Array.isArray(d.suggestions) ? d.suggestions : [])
    }).catch(() => setSuggestions([]))
  }, [contactId, loadingHistory, messages.length])

  // Track whether the user is at the bottom (for smart autoscroll)
  useEffect(() => {
    const el = messagesRef.current
    if (!el) return
    function onScroll() {
      const node = messagesRef.current
      if (!node) return
      const dist = node.scrollHeight - node.scrollTop - node.clientHeight
      stickToBottomRef.current = dist < 80
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [])

  // Auto-scroll only if user was already at the bottom
  useEffect(() => {
    if (!stickToBottomRef.current) return
    const el = messagesRef.current
    if (!el) return
    requestAnimationFrame(() => { el.scrollTop = el.scrollHeight })
  }, [messages, loading])

  function resizeTextarea() {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 140) + 'px'
  }

  const sendMessage = useCallback(async (text: string, deep: boolean) => {
    const trimmed = text.trim()
    if (!trimmed || loading) return
    setInput('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
    setLoading(true)
    stickToBottomRef.current = true

    const optimisticId = `temp-${Date.now()}`
    setMessages(prev => [...prev, {
      id: optimisticId, user_id: '', contact_id: contactId || '',
      role: 'user', content: trimmed, created_at: new Date().toISOString(), isDeep: deep,
    } as ChatMessage])

    try {
      const endpoint = deep ? '/api/ai-chat/deep' : '/api/ai-chat'
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contact_id: contactId || null, message: trimmed }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error desconocido')
      setMessages(prev => [...prev, {
        id: `ai-${Date.now()}`, user_id: '', contact_id: contactId || '',
        role: 'assistant', content: data.reply, created_at: new Date().toISOString(),
        sources: data.sources || null, isDeep: deep,
      } as ChatMessage])
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : 'Error al contactar con Sphere AI'
      setMessages(prev => [...prev, {
        id: `err-${Date.now()}`, user_id: '', contact_id: contactId || '',
        role: 'assistant', content: `⚠️ ${errMsg}`, created_at: new Date().toISOString(),
      } as ChatMessage])
    } finally {
      setLoading(false)
      textareaRef.current?.focus()
    }
  }, [contactId, loading])

  async function clearConversation() {
    if (!confirm('¿Empezar nueva conversación? Se borrará el historial.')) return
    const supabase = createClient()
    if (contactId) await supabase.from('ai_conversations').delete().eq('contact_id', contactId)
    else await supabase.from('ai_conversations').delete().is('contact_id', null)
    setMessages([])
    setSuggestions(null)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input, deepMode)
    }
  }

  const emptyHeading = isContactMode
    ? `Prepárate para ${contactName}`
    : '¿Por dónde empiezo hoy?'
  const emptySubtext = isContactMode
    ? `Te ayudo a planificar tu próximo encuentro con ${contactName}: mensajes, icebreakers, momento ideal y temas de conversación.`
    : 'Tu copiloto de relaciones profesionales. Decide a quién escribir, cuándo y cómo.'

  const containerClass = embedded
    ? 'flex flex-col h-full min-h-0 bg-[#09090b]'
    : 'flex flex-col h-full min-h-0 bg-[#0f0f14] border border-zinc-800/50 rounded-xl overflow-hidden'

  return (
    <div className={containerClass}>
      {!embedded && (
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800/50 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500/30 to-violet-600/20 border border-indigo-500/30 flex items-center justify-center shrink-0">
              <Sparkles className="w-3.5 h-3.5 text-indigo-300" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white truncate leading-tight">
                {isContactMode ? contactName : 'Sphere AI'}
              </p>
              <p className="text-[10px] text-zinc-500 leading-tight">
                {isContactMode ? 'Asistente para preparar tu encuentro' : 'Copiloto de relaciones'}
              </p>
            </div>
          </div>
          {messages.length > 0 && (
            <button onClick={clearConversation} title="Nuevo chat"
              className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-indigo-300 transition-colors shrink-0 ml-2">
              <SquarePen className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {/* Messages area */}
      <div ref={messagesRef} className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
        {loadingHistory ? (
          <div className="flex justify-center pt-16">
            <Loader2 className="w-5 h-5 text-zinc-600 animate-spin" />
          </div>

        ) : messages.length === 0 ? (
          /* Empty state — vertical, mobile-first, no horizontal scroll */
          <div className="min-h-full flex flex-col items-center justify-center px-5 py-8">
            <div className="w-full max-w-sm text-center">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500/25 via-violet-500/15 to-transparent border border-indigo-500/25 flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-6 h-6 text-indigo-300" />
              </div>
              <h2 className="text-lg font-semibold text-white leading-snug mb-1.5">{emptyHeading}</h2>
              <p className="text-[13px] text-zinc-400 leading-relaxed mb-6">{emptySubtext}</p>

              {suggestions === null ? (
                <div className="flex justify-center py-2">
                  <Loader2 className="w-4 h-4 text-zinc-700 animate-spin" />
                </div>
              ) : suggestions.length > 0 ? (
                <div className="flex flex-col gap-2">
                  {suggestions.map((q, i) => (
                    <button key={i}
                      onClick={() => sendMessage(q, false)}
                      className="group w-full text-left px-3.5 py-2.5 rounded-xl bg-zinc-900/70 hover:bg-indigo-600/15 active:bg-indigo-600/25 border border-zinc-800 hover:border-indigo-500/40 text-[13px] text-zinc-300 hover:text-white transition-colors leading-snug flex items-start gap-2.5">
                      <ArrowUp className="w-3.5 h-3.5 text-zinc-600 group-hover:text-indigo-300 mt-0.5 shrink-0 rotate-45" />
                      <span>{q}</span>
                    </button>
                  ))}
                </div>
              ) : null}

              <p className="mt-6 text-[11px] text-zinc-600 flex items-center justify-center gap-1.5">
                <Globe className="w-3 h-3" />
                Activa <span className="text-indigo-300">Análisis avanzado</span> para incluir info pública de la web
              </p>
            </div>
          </div>

        ) : (
          <div className="max-w-2xl mx-auto w-full px-3 sm:px-4 py-4 space-y-1">
            {messages.map(msg =>
              msg.role === 'user' ? (
                <div key={msg.id} className="flex justify-end py-1">
                  <div className="max-w-[85%] sm:max-w-[80%] px-3.5 py-2.5 rounded-2xl rounded-tr-md bg-indigo-600 text-white text-[15px] sm:text-sm leading-relaxed whitespace-pre-wrap break-words">
                    {msg.isDeep && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-indigo-200 bg-indigo-500/40 rounded-full px-1.5 py-0.5 mr-1.5 align-middle">
                        <Globe className="w-2.5 h-2.5" /> deep
                      </span>
                    )}
                    {msg.content}
                  </div>
                </div>
              ) : (
                <div key={msg.id} className="flex gap-2.5 sm:gap-3 py-3">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500/25 to-violet-600/15 border border-indigo-500/25 flex items-center justify-center shrink-0 mt-0.5">
                    <Sparkles className="w-3 h-3 text-indigo-300" />
                  </div>
                  <div className="flex-1 min-w-0 pt-0.5">
                    <p className="text-[10px] font-semibold text-zinc-500 mb-1.5 uppercase tracking-widest flex items-center gap-1.5">
                      Sphere AI
                      {msg.isDeep && (
                        <span className="inline-flex items-center gap-1 text-indigo-300 normal-case tracking-normal">
                          <Globe className="w-2.5 h-2.5" /> análisis avanzado
                        </span>
                      )}
                    </p>
                    <AIContent text={msg.content} />
                    {msg.sources && msg.sources.length > 0 && <SourcesBlock sources={msg.sources} />}
                  </div>
                </div>
              )
            )}
            {loading && (
              <div className="flex gap-2.5 sm:gap-3 py-3">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500/25 to-violet-600/15 border border-indigo-500/25 flex items-center justify-center shrink-0 mt-0.5">
                  <Sparkles className="w-3 h-3 text-indigo-300" />
                </div>
                <div className="flex-1 pt-2">
                  <TypingDots label={deepMode ? 'Buscando en la web…' : undefined} />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom bar */}
      <div className="shrink-0 border-t border-zinc-800/40 bg-[#09090b]"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        <div className="px-3 pt-2.5 pb-2.5">
          <div className="max-w-2xl mx-auto">
            <div className={`flex items-end bg-zinc-900 border rounded-2xl transition-colors ${
              deepMode
                ? 'border-indigo-500/60 ring-1 ring-indigo-500/20'
                : 'border-zinc-700/60 hover:border-zinc-600 focus-within:border-indigo-500/60 focus-within:ring-1 focus-within:ring-indigo-500/20'
            }`}>
              <button
                onClick={() => setDeepMode(d => !d)}
                title={deepMode ? 'Desactivar análisis avanzado' : 'Activar análisis avanzado (busca en la web)'}
                className={`m-1.5 p-2 rounded-xl transition-colors shrink-0 ${
                  deepMode
                    ? 'bg-indigo-500/25 text-indigo-200 hover:bg-indigo-500/35'
                    : 'text-zinc-500 hover:text-indigo-300 hover:bg-zinc-800'
                }`}
              >
                <Globe className="w-4 h-4" />
              </button>
              <textarea
                ref={textareaRef}
                value={input}
                onChange={e => { setInput(e.target.value); resizeTextarea() }}
                onKeyDown={handleKeyDown}
                rows={1}
                placeholder={deepMode
                  ? (isContactMode ? 'Pregunta con búsqueda web sobre su empresa o sector…' : 'Pregunta con búsqueda web…')
                  : (isContactMode ? `Sobre ${contactName?.split(' ')[0] || 'tu contacto'}…` : 'Escribe tu pregunta…')}
                className="flex-1 px-1 py-3 bg-transparent text-[15px] sm:text-sm text-white placeholder-zinc-500 focus:outline-none resize-none leading-relaxed min-w-0"
                style={{ minHeight: '46px', maxHeight: '140px' }}
              />
              <button
                onClick={() => sendMessage(input, deepMode)}
                disabled={!input.trim() || loading}
                className="m-1.5 p-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 disabled:cursor-not-allowed text-white rounded-xl transition-colors shrink-0"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </div>
            <div className="flex items-center justify-between mt-1.5 px-1">
              <p className="text-[10px] text-zinc-600">
                {deepMode
                  ? <>Análisis avanzado activo · <span className="text-zinc-500">tarda más</span></>
                  : <>Sphere AI · <span className="text-zinc-500">Globo = búsqueda web</span></>}
              </p>
              {messages.length > 0 && (
                <button onClick={clearConversation}
                  className="text-[10px] text-zinc-500 hover:text-indigo-300 transition-colors flex items-center gap-1">
                  <SquarePen className="w-2.5 h-2.5" />
                  Nuevo chat
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
